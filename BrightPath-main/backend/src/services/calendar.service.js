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

function mapEvent(row) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    classId: row.classId,
    authorId: row.authorId,
    title: row.titleEn || row.titleAr,
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    description: row.descriptionEn || row.descriptionAr,
    descriptionAr: row.descriptionAr,
    descriptionEn: row.descriptionEn,
    audience: row.audience,
    startAt: row.startAt,
    endAt: row.endAt,
    allDay: row.allDay,
    location: row.locationEn || row.locationAr,
    locationAr: row.locationAr,
    locationEn: row.locationEn,
    color: row.color,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: row.author
      ? { id: row.author.id, email: row.author.email, role: toApiRole(row.author.role) }
      : null,
    class: row.class
      ? { id: row.class.id, name: row.class.nameEn || row.class.nameAr }
      : null,
  };
}

const eventInclude = {
  author: { select: { id: true, email: true, role: true } },
  class: {
    include: {
      classSubjects: { select: { teacherId: true } },
    },
  },
};

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

function assertChronology(startAt, endAt) {
  if (startAt >= endAt) throw new AppError('endAt must be after startAt', 422);
}

async function listCalendarEvents(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = { AND: [visibilityWhere(ctx)] };

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
  if (query.from || query.to) {
    where.AND.push({
      ...(query.to ? { startAt: { lte: query.to } } : {}),
      ...(query.from ? { endAt: { gte: query.from } } : {}),
    });
  }

  const [total, rows] = await Promise.all([
    prisma.calendarEvent.count({ where }),
    prisma.calendarEvent.findMany({
      where,
      orderBy: [{ startAt: 'asc' }, { createdAt: 'desc' }],
      skip,
      take,
      include: eventInclude,
    }),
  ]);
  return { data: rows.map(mapEvent), meta: meta(total, page, limit) };
}

async function getCalendarEvent(userId, id) {
  const ctx = await getUserContext(userId);
  const row = await prisma.calendarEvent.findFirst({
    where: { AND: [{ id }, visibilityWhere(ctx)] },
    include: eventInclude,
  });
  if (!row) throw new AppError('Calendar event not found', 404);
  return mapEvent(row);
}

async function createCalendarEvent(userId, input) {
  if (input.audience === 'CLASS' && !input.classId) {
    throw new AppError('classId is required for class calendar events', 400);
  }
  assertChronology(input.startAt, input.endAt);
  const ctx = await getUserContext(userId);
  const scope = await resolveWriteScope(ctx, input);
  const row = await prisma.calendarEvent.create({
    data: {
      ...scope,
      authorId: userId,
      titleAr: input.titleAr ?? input.title,
      titleEn: input.titleEn ?? input.title ?? input.titleAr,
      descriptionAr: input.descriptionAr ?? input.description ?? null,
      descriptionEn: input.descriptionEn ?? input.description ?? input.descriptionAr ?? null,
      audience: input.audience,
      startAt: input.startAt,
      endAt: input.endAt,
      allDay: input.allDay ?? false,
      locationAr: input.locationAr ?? input.location ?? null,
      locationEn: input.locationEn ?? input.location ?? input.locationAr ?? null,
      color: input.color ?? null,
      metadata: input.metadata,
    },
    include: eventInclude,
  });
  await AuditService.writeAuditLog({
    userId,
    action: 'INSERT',
    tableName: 'calendar_events',
    recordId: row.id,
    oldValues: null,
    newValues: row,
  });
  return mapEvent(row);
}

async function updateCalendarEvent(userId, id, input) {
  const existing = await prisma.calendarEvent.findUnique({ where: { id }, include: eventInclude });
  if (!existing) throw new AppError('Calendar event not found', 404);
  const ctx = await getUserContext(userId);
  await resolveWriteScope(ctx, { schoolId: existing.schoolId, classId: existing.classId }, existing);

  const nextScope =
    input.schoolId !== undefined || input.classId !== undefined
      ? await resolveWriteScope(ctx, input, existing)
      : { schoolId: existing.schoolId, classId: existing.classId };
  if ((input.audience ?? existing.audience) === 'CLASS' && !nextScope.classId) {
    throw new AppError('classId is required for class calendar events', 400);
  }
  const startAt = input.startAt ?? existing.startAt;
  const endAt = input.endAt ?? existing.endAt;
  assertChronology(startAt, endAt);

  const data = {
    ...nextScope,
    titleAr: input.titleAr ?? input.title,
    titleEn: input.titleEn ?? input.title ?? input.titleAr,
    descriptionAr: input.descriptionAr ?? input.description,
    descriptionEn: input.descriptionEn ?? input.description ?? input.descriptionAr,
    audience: input.audience,
    startAt: input.startAt,
    endAt: input.endAt,
    allDay: input.allDay,
    locationAr: input.locationAr ?? input.location,
    locationEn: input.locationEn ?? input.location ?? input.locationAr,
    color: input.color,
    metadata: input.metadata,
  };
  Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

  const row = await prisma.calendarEvent.update({ where: { id }, data, include: eventInclude });
  await AuditService.writeAuditLog({
    userId,
    action: 'UPDATE',
    tableName: 'calendar_events',
    recordId: id,
    oldValues: existing,
    newValues: row,
  });
  return mapEvent(row);
}

async function deleteCalendarEvent(userId, id) {
  const existing = await prisma.calendarEvent.findUnique({ where: { id }, include: eventInclude });
  if (!existing) throw new AppError('Calendar event not found', 404);
  const ctx = await getUserContext(userId);
  await resolveWriteScope(ctx, { schoolId: existing.schoolId, classId: existing.classId }, existing);
  await prisma.calendarEvent.delete({ where: { id } });
  await AuditService.writeAuditLog({
    userId,
    action: 'DELETE',
    tableName: 'calendar_events',
    recordId: id,
    oldValues: existing,
    newValues: null,
  });
}

module.exports = {
  listCalendarEvents,
  getCalendarEvent,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
};
