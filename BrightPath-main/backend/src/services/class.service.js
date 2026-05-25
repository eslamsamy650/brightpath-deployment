const { getPrisma } = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');
const {
  getUserContext,
  classVisibilityWhere,
  assertClassAccess,
  assertCanManageSchool,
  assertCanManageClass,
} = require('./access.service');
const { mapStudentSummary } = require('../utils/serialize');
const { toApiRole } = require('../utils/roles');
const AuditService = require('./audit.service');

const prisma = getPrisma();

async function audit(userId, action, tableName, recordId, oldValues, newValues) {
  await AuditService.writeAuditLog({
    userId,
    action,
    tableName,
    recordId,
    oldValues,
    newValues,
  });
}

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

function mapTeacher(user) {
  if (!user) return null;
  const staff = user.staffProfile;
  return {
    id: user.id,
    email: user.email,
    role: toApiRole(user.role),
    name: staff
      ? [staff.firstNameEn || staff.firstNameAr, staff.lastNameEn || staff.lastNameAr]
          .filter(Boolean)
          .join(' ')
      : user.email,
  };
}

function mapClass(row) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    academicYearId: row.academicYearId,
    gradeLevelId: row.gradeLevelId,
    name: row.nameEn || row.nameAr,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    capacity: row.capacity,
    homeroomTeacherId: row.homeroomTeacherId,
    roomNumber: row.roomNumber,
    createdAt: row.createdAt,
    school: row.school
      ? { id: row.school.id, name: row.school.nameEn || row.school.nameAr }
      : undefined,
    academicYear: row.academicYear
      ? { id: row.academicYear.id, name: row.academicYear.nameEn || row.academicYear.nameAr }
      : undefined,
    gradeLevel: row.gradeLevel
      ? { id: row.gradeLevel.id, name: row.gradeLevel.nameEn || row.gradeLevel.nameAr }
      : undefined,
    homeroomTeacher: mapTeacher(row.homeroomTeacher),
    subjects: Array.isArray(row.classSubjects)
      ? row.classSubjects.map(classSubject => ({
          id: classSubject.id,
          subjectId: classSubject.subjectId,
          termId: classSubject.termId,
          teacherId: classSubject.teacherId,
          title: classSubject.subject?.titleEn || classSubject.subject?.titleAr,
          code: classSubject.subject?.code,
        }))
      : undefined,
    enrollmentCount: row._count?.enrollments,
  };
}

function buildListWhere(ctx, query) {
  const where = { AND: [classVisibilityWhere(ctx)] };
  if (query.schoolId) where.AND.push({ schoolId: query.schoolId });
  if (query.academicYearId) where.AND.push({ academicYearId: query.academicYearId });
  if (query.gradeLevelId) where.AND.push({ gradeLevelId: query.gradeLevelId });
  if (query.teacherId) {
    where.AND.push({
      OR: [
        { homeroomTeacherId: query.teacherId },
        { classSubjects: { some: { teacherId: query.teacherId } } },
      ],
    });
  }
  return where;
}

const classInclude = {
  school: { select: { id: true, nameAr: true, nameEn: true } },
  academicYear: { select: { id: true, nameAr: true, nameEn: true, isCurrent: true } },
  gradeLevel: { select: { id: true, nameAr: true, nameEn: true, orderIndex: true } },
  homeroomTeacher: {
    select: {
      id: true,
      email: true,
      role: true,
      staffProfile: {
        select: { firstNameAr: true, firstNameEn: true, lastNameAr: true, lastNameEn: true },
      },
    },
  },
  classSubjects: {
    select: {
      id: true,
      subjectId: true,
      teacherId: true,
      termId: true,
      subject: { select: { titleAr: true, titleEn: true, code: true } },
    },
  },
  _count: { select: { enrollments: true } },
};

async function listClasses(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = buildListWhere(ctx, query);

  const [total, classes] = await Promise.all([
    prisma.class.count({ where }),
    prisma.class.findMany({
      where,
      orderBy: [{ academicYear: { startDate: 'desc' } }, { nameEn: 'asc' }],
      skip,
      take,
      include: classInclude,
    }),
  ]);

  return {
    data: classes.map(mapClass),
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

async function getClass(userId, classId) {
  const ctx = await getUserContext(userId);
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: classInclude,
  });
  if (!cls) throw new AppError('Class not found', 404);
  assertClassAccess(ctx, cls);
  return mapClass(cls);
}

async function assertClassReferences(ctx, input) {
  const [school, academicYear, gradeLevel, teacher] = await Promise.all([
    prisma.school.findUnique({ where: { id: input.schoolId } }),
    prisma.academicYear.findUnique({ where: { id: input.academicYearId } }),
    prisma.gradeLevel.findUnique({ where: { id: input.gradeLevelId } }),
    input.homeroomTeacherId
      ? prisma.user.findUnique({
          where: { id: input.homeroomTeacherId },
          select: { id: true, role: true, staffProfile: { select: { schoolId: true } } },
        })
      : null,
  ]);

  if (!school) throw new AppError('School not found', 404);
  assertCanManageSchool(ctx, school.id);
  if (!academicYear || academicYear.schoolId !== school.id) {
    throw new AppError('Academic year not found for school', 404);
  }
  if (!gradeLevel || gradeLevel.schoolId !== school.id) {
    throw new AppError('Grade level not found for school', 404);
  }
  if (teacher) {
    if (toApiRole(teacher.role) !== 'TEACHER' || teacher.staffProfile?.schoolId !== school.id) {
      throw new AppError('Homeroom teacher must be a teacher in the same school', 422);
    }
  }
}

async function createClass(userId, input) {
  const ctx = await getUserContext(userId);
  await assertClassReferences(ctx, input);
  const cls = await prisma.class.create({
    data: input,
    include: classInclude,
  });
  await audit(userId, 'INSERT', 'classes', cls.id, null, cls);
  return mapClass(cls);
}

async function updateClass(userId, classId, input) {
  const ctx = await getUserContext(userId);
  const existing = await prisma.class.findUnique({
    where: { id: classId },
    include: { classSubjects: { select: { teacherId: true } } },
  });
  if (!existing) throw new AppError('Class not found', 404);
  assertCanManageClass(ctx, existing);

  const merged = { ...existing, ...input };
  await assertClassReferences(ctx, {
    schoolId: merged.schoolId,
    academicYearId: merged.academicYearId,
    gradeLevelId: merged.gradeLevelId,
    homeroomTeacherId: merged.homeroomTeacherId ?? undefined,
  });

  const cls = await prisma.class.update({
    where: { id: classId },
    data: input,
    include: classInclude,
  });
  await audit(userId, 'UPDATE', 'classes', classId, existing, cls);
  return mapClass(cls);
}

async function deleteClass(userId, classId) {
  const ctx = await getUserContext(userId);
  const existing = await prisma.class.findUnique({
    where: { id: classId },
    include: { classSubjects: { select: { teacherId: true } } },
  });
  if (!existing) throw new AppError('Class not found', 404);
  assertCanManageClass(ctx, existing);
  await prisma.class.delete({ where: { id: classId } });
  await audit(userId, 'DELETE', 'classes', classId, existing, null);
}

async function listClassStudents(userId, classId, query = {}) {
  const ctx = await getUserContext(userId);
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { classSubjects: { select: { teacherId: true } } },
  });
  if (!cls) throw new AppError('Class not found', 404);
  assertClassAccess(ctx, cls);

  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = { classId, withdrawalDate: null };
  const [total, enrollments] = await Promise.all([
    prisma.studentClassEnrollment.count({ where }),
    prisma.studentClassEnrollment.findMany({
      where,
      orderBy: { student: { firstNameEn: 'asc' } },
      skip,
      take,
      include: {
        student: {
          select: {
            id: true,
            firstNameAr: true,
            firstNameEn: true,
            lastNameAr: true,
            lastNameEn: true,
            studentIdNumber: true,
            photoUrl: true,
          },
        },
      },
    }),
  ]);

  return {
    data: enrollments.map(enrollment => mapStudentSummary(enrollment.student)),
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

module.exports = {
  listClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  listClassStudents,
  mapClass,
};
