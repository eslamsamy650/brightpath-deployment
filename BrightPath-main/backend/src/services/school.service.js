const { getPrisma } = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');
const { getUserContext, assertSchoolAccess, hasSchoolAccess } = require('./access.service');

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

function mapSchool(school) {
  return {
    id: school.id,
    name: school.nameEn || school.nameAr,
    nameAr: school.nameAr,
    nameEn: school.nameEn,
    licenseNumber: school.licenseNumber,
    addressAr: school.addressAr,
    addressEn: school.addressEn,
    governorateAr: school.governorateAr,
    governorateEn: school.governorateEn,
    phone: school.phone,
    email: school.email,
    logoUrl: school.logoUrl,
    isActive: school.isActive,
    createdAt: school.createdAt,
    updatedAt: school.updatedAt,
    counts: school._count
      ? {
          classes: school._count.classes,
          students: school._count.students,
          staff: school._count.staffProfiles,
        }
      : undefined,
  };
}

function listWhere(ctx, query) {
  const where = {};
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) {
    where.OR = [
      { nameEn: { contains: query.q, mode: 'insensitive' } },
      { nameAr: { contains: query.q, mode: 'insensitive' } },
      { licenseNumber: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  if (ctx.role !== 'SUPER_ADMIN') where.id = { in: ctx.schoolIds };
  return where;
}

async function listSchools(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = listWhere(ctx, query);

  const [total, schools] = await Promise.all([
    prisma.school.count({ where }),
    prisma.school.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { nameEn: 'asc' }],
      skip,
      take,
      include: {
        _count: { select: { classes: true, students: true, staffProfiles: true } },
      },
    }),
  ]);

  return {
    data: schools.map(mapSchool),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
}

async function getSchool(userId, schoolId) {
  const ctx = await getUserContext(userId);
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      _count: { select: { classes: true, students: true, staffProfiles: true } },
    },
  });
  if (!school || !hasSchoolAccess(ctx, school.id)) throw new AppError('School not found', 404);
  return mapSchool(school);
}

async function createSchool(input) {
  const school = await prisma.school.create({ data: input });
  return mapSchool(school);
}

async function updateSchool(userId, schoolId, input) {
  const ctx = await getUserContext(userId);
  const existing = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!existing) throw new AppError('School not found', 404);
  assertSchoolAccess(ctx, existing.id);

  const school = await prisma.school.update({
    where: { id: schoolId },
    data: input,
  });
  return mapSchool(school);
}

async function deactivateSchool(userId, schoolId) {
  const ctx = await getUserContext(userId);
  const existing = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!existing) throw new AppError('School not found', 404);
  assertSchoolAccess(ctx, existing.id);
  await prisma.school.update({ where: { id: schoolId }, data: { isActive: false } });
}

module.exports = {
  listSchools,
  getSchool,
  createSchool,
  updateSchool,
  deactivateSchool,
  mapSchool,
};
