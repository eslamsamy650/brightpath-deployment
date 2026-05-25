const { getPrisma } = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');
const {
  getUserContext,
  isSuperAdmin,
  isSchoolAdmin,
  assertSchoolAccess,
  assertCanManageSchool,
  assertClassAccess,
  assertCanManageClass,
} = require('./access.service');
const AuditService = require('./audit.service');
const { toApiRole } = require('../utils/roles');

const prisma = getPrisma();

function clampPagination(page = 1, limit = 20) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

function meta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

function audienceForRole(role) {
  if (role === 'STUDENT') return 'STUDENTS';
  if (role === 'PARENT') return 'PARENTS';
  return 'TEACHERS';
}

function visibilityWhere(ctx) {
  if (isSuperAdmin(ctx)) return {};
  if (isSchoolAdmin(ctx)) return { schoolId: { in: ctx.schoolIds } };
  return {
    schoolId: { in: ctx.schoolIds },
    OR: [
      { audience: 'ALL' },
      { audience: audienceForRole(ctx.role) },
      ...(ctx.classIds.length > 0 ? [{ audience: 'CLASS', classId: { in: ctx.classIds } }] : []),
    ],
  };
}

const resourceInclude = {
  createdBy: { select: { id: true, email: true, role: true } },
  class: {
    include: {
      classSubjects: { select: { teacherId: true } },
    },
  },
};

function mapResource(row) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    classId: row.classId,
    createdById: row.createdById,
    title: row.titleEn || row.titleAr,
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    description: row.descriptionEn || row.descriptionAr,
    descriptionAr: row.descriptionAr,
    descriptionEn: row.descriptionEn,
    type: row.type,
    audience: row.audience,
    url: row.url,
    fileName: row.fileName,
    mimeType: row.mimeType,
    storagePath: row.storagePath,
    publishedAt: row.publishedAt,
    expiresAt: row.expiresAt,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy
      ? { id: row.createdBy.id, email: row.createdBy.email, role: toApiRole(row.createdBy.role) }
      : null,
    class: row.class
      ? { id: row.class.id, name: row.class.nameEn || row.class.nameAr }
      : null,
  };
}

async function getClassForScope(classId) {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { classSubjects: { select: { teacherId: true } } },
  });
  if (!cls) throw new AppError('Class not found', 404);
  return cls;
}

async function resolveWriteScope(ctx, input, existing = null) {
  if (input.classId) {
    const cls = await getClassForScope(input.classId);
    assertCanManageClass(ctx, cls);
    if (input.schoolId && input.schoolId !== cls.schoolId) {
      throw new AppError('classId does not belong to schoolId', 422);
    }
    return { schoolId: cls.schoolId, classId: cls.id };
  }

  if (input.classId === null) {
    const schoolId = input.schoolId ?? existing?.schoolId;
    if (!schoolId) throw new AppError('schoolId is required when clearing classId', 400);
    assertCanManageSchool(ctx, schoolId);
    return { schoolId, classId: null };
  }

  const schoolId = input.schoolId ?? existing?.schoolId ?? ctx.schoolIds[0];
  if (!schoolId) throw new AppError('schoolId is required', 400);
  assertCanManageSchool(ctx, schoolId);
  return { schoolId, classId: existing?.classId ?? null };
}

async function listResources(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const now = new Date();
  const where = {
    AND: [
      visibilityWhere(ctx),
      { OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    ],
  };

  if (query.schoolId) {
    assertSchoolAccess(ctx, query.schoolId);
    where.AND.push({ schoolId: query.schoolId });
  }
  if (query.classId) {
    const cls = await getClassForScope(query.classId);
    assertClassAccess(ctx, cls);
    where.AND.push({ classId: query.classId });
  }
  if (query.audience) where.AND.push({ audience: query.audience });
  if (query.type) where.AND.push({ type: query.type });
  if (query.q) {
    where.AND.push({
      OR: [
        { titleAr: { contains: query.q, mode: 'insensitive' } },
        { titleEn: { contains: query.q, mode: 'insensitive' } },
        { descriptionAr: { contains: query.q, mode: 'insensitive' } },
        { descriptionEn: { contains: query.q, mode: 'insensitive' } },
      ],
    });
  }

  const [total, rows] = await Promise.all([
    prisma.resource.count({ where }),
    prisma.resource.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
      include: resourceInclude,
    }),
  ]);
  return { data: rows.map(mapResource), meta: meta(total, page, limit) };
}

async function getResource(userId, id) {
  const ctx = await getUserContext(userId);
  const row = await prisma.resource.findFirst({
    where: { AND: [{ id }, visibilityWhere(ctx)] },
    include: resourceInclude,
  });
  if (!row) throw new AppError('Resource not found', 404);
  return mapResource(row);
}

async function createResource(userId, input) {
  if (input.audience === 'CLASS' && !input.classId) {
    throw new AppError('classId is required for class resources', 400);
  }
  const ctx = await getUserContext(userId);
  const scope = await resolveWriteScope(ctx, input);
  const row = await prisma.resource.create({
    data: {
      ...scope,
      createdById: userId,
      titleAr: input.titleAr ?? input.title,
      titleEn: input.titleEn ?? input.title ?? input.titleAr,
      descriptionAr: input.descriptionAr ?? input.description ?? null,
      descriptionEn: input.descriptionEn ?? input.description ?? input.descriptionAr ?? null,
      type: input.type,
      audience: input.audience,
      url: input.url ?? null,
      fileName: input.fileName ?? null,
      mimeType: input.mimeType ?? null,
      storagePath: input.storagePath ?? null,
      publishedAt: input.publishedAt ?? new Date(),
      expiresAt: input.expiresAt ?? null,
      metadata: input.metadata,
    },
    include: resourceInclude,
  });
  await AuditService.writeAuditLog({
    userId,
    action: 'INSERT',
    tableName: 'resources',
    recordId: row.id,
    oldValues: null,
    newValues: row,
  });
  return mapResource(row);
}

async function updateResource(userId, id, input) {
  const existing = await prisma.resource.findUnique({ where: { id }, include: resourceInclude });
  if (!existing) throw new AppError('Resource not found', 404);
  const ctx = await getUserContext(userId);
  await resolveWriteScope(ctx, { schoolId: existing.schoolId, classId: existing.classId }, existing);

  const nextScope =
    input.schoolId !== undefined || input.classId !== undefined
      ? await resolveWriteScope(ctx, input, existing)
      : { schoolId: existing.schoolId, classId: existing.classId };
  if ((input.audience ?? existing.audience) === 'CLASS' && !nextScope.classId) {
    throw new AppError('classId is required for class resources', 400);
  }
  const data = {
    ...nextScope,
    titleAr: input.titleAr ?? input.title,
    titleEn: input.titleEn ?? input.title ?? input.titleAr,
    descriptionAr: input.descriptionAr ?? input.description,
    descriptionEn: input.descriptionEn ?? input.description ?? input.descriptionAr,
    type: input.type,
    audience: input.audience,
    url: input.url,
    fileName: input.fileName,
    mimeType: input.mimeType,
    storagePath: input.storagePath,
    publishedAt: input.publishedAt,
    expiresAt: input.expiresAt,
    metadata: input.metadata,
  };
  Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

  const row = await prisma.resource.update({ where: { id }, data, include: resourceInclude });
  await AuditService.writeAuditLog({
    userId,
    action: 'UPDATE',
    tableName: 'resources',
    recordId: id,
    oldValues: existing,
    newValues: row,
  });
  return mapResource(row);
}

async function deleteResource(userId, id) {
  const existing = await prisma.resource.findUnique({ where: { id }, include: resourceInclude });
  if (!existing) throw new AppError('Resource not found', 404);
  const ctx = await getUserContext(userId);
  await resolveWriteScope(ctx, { schoolId: existing.schoolId, classId: existing.classId }, existing);
  await prisma.resource.delete({ where: { id } });
  await AuditService.writeAuditLog({
    userId,
    action: 'DELETE',
    tableName: 'resources',
    recordId: id,
    oldValues: existing,
    newValues: null,
  });
}

module.exports = {
  listResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
};
