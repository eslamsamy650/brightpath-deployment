const { getPrisma } = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');
const { toApiRole } = require('../utils/roles');

const prisma = getPrisma();

const SCHOOL_ADMIN_ROLES = ['ADMIN', 'REGISTRAR', 'ACCOUNTANT'];
const ACADEMIC_WRITE_ROLES = ['ADMIN', 'REGISTRAR'];

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

async function getUserContext(userId, tx = prisma) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      staffProfile: { select: { id: true, schoolId: true } },
      student: {
        select: {
          id: true,
          schoolId: true,
          enrollments: {
            where: { withdrawalDate: null },
            select: { classId: true },
          },
        },
      },
      guardian: {
        select: {
          id: true,
          studentGuardians: {
            select: {
              student: {
                select: {
                  id: true,
                  schoolId: true,
                  enrollments: {
                    where: { withdrawalDate: null },
                    select: { classId: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) throw new AppError('User not found or inactive', 401);

  const role = toApiRole(user.role);
  const linkedStudents = [
    ...(user.student ? [user.student] : []),
    ...(user.guardian?.studentGuardians ?? []).map(link => link.student).filter(Boolean),
  ];

  return {
    userId: user.id,
    email: user.email,
    role,
    dbRole: user.role,
    staffProfileId: user.staffProfile?.id ?? null,
    staffSchoolId: user.staffProfile?.schoolId ?? null,
    studentId: user.student?.id ?? null,
    guardianId: user.guardian?.id ?? null,
    schoolIds: uniq([
      user.staffProfile?.schoolId,
      user.student?.schoolId,
      ...linkedStudents.map(student => student.schoolId),
    ]),
    studentIds: uniq(linkedStudents.map(student => student.id)),
    classIds: uniq(
      linkedStudents.flatMap(student => student.enrollments.map(enrollment => enrollment.classId))
    ),
  };
}

function isSuperAdmin(ctx) {
  return ctx.role === 'SUPER_ADMIN';
}

function isSchoolAdmin(ctx) {
  return SCHOOL_ADMIN_ROLES.includes(ctx.role);
}

function canManageAcademics(ctx) {
  return isSuperAdmin(ctx) || ACADEMIC_WRITE_ROLES.includes(ctx.role);
}

function hasSchoolAccess(ctx, schoolId) {
  return isSuperAdmin(ctx) || ctx.schoolIds.includes(schoolId);
}

function assertSchoolAccess(ctx, schoolId) {
  if (!hasSchoolAccess(ctx, schoolId)) {
    throw new AppError('Resource not found', 404);
  }
}

function assertCanManageSchool(ctx, schoolId) {
  if (!canManageAcademics(ctx) || !hasSchoolAccess(ctx, schoolId)) {
    throw new AppError('You are not allowed to manage this school resource', 403);
  }
}

function schoolScopeWhere(ctx, requestedSchoolId) {
  if (requestedSchoolId) {
    assertSchoolAccess(ctx, requestedSchoolId);
    return { schoolId: requestedSchoolId };
  }
  if (isSuperAdmin(ctx)) return {};
  return { schoolId: { in: ctx.schoolIds } };
}

function canTeachClass(ctx, cls) {
  if (ctx.role !== 'TEACHER') return false;
  if (cls.homeroomTeacherId === ctx.userId) return true;
  return Boolean(
    ctx.staffProfileId &&
      cls.classSubjects?.some(classSubject => classSubject.teacherId === ctx.staffProfileId)
  );
}

function hasClassAccess(ctx, cls) {
  if (isSuperAdmin(ctx)) return true;
  if (isSchoolAdmin(ctx) && ctx.schoolIds.includes(cls.schoolId)) return true;
  if (canTeachClass(ctx, cls)) return true;
  return ctx.classIds.includes(cls.id);
}

function assertClassAccess(ctx, cls) {
  if (!hasClassAccess(ctx, cls)) {
    throw new AppError('Class not found', 404);
  }
}

function assertCanManageClass(ctx, cls) {
  if (canManageAcademics(ctx) && hasSchoolAccess(ctx, cls.schoolId)) return;
  if (canTeachClass(ctx, cls)) return;
  throw new AppError('You are not allowed to manage this class', 403);
}

function classVisibilityWhere(ctx) {
  if (isSuperAdmin(ctx)) return {};
  if (isSchoolAdmin(ctx)) return { schoolId: { in: ctx.schoolIds } };
  if (ctx.role === 'TEACHER') {
    return {
      OR: [
        { homeroomTeacherId: ctx.userId },
        ...(ctx.staffProfileId
          ? [{ classSubjects: { some: { teacherId: ctx.staffProfileId } } }]
          : []),
      ],
    };
  }
  return { id: { in: ctx.classIds } };
}

function studentVisibilityWhere(ctx) {
  if (isSuperAdmin(ctx)) return {};
  if (isSchoolAdmin(ctx)) return { schoolId: { in: ctx.schoolIds } };
  if (ctx.role === 'TEACHER') {
    return {
      enrollments: {
        some: {
          withdrawalDate: null,
          class: classVisibilityWhere(ctx),
        },
      },
    };
  }
  return { id: { in: ctx.studentIds } };
}

module.exports = {
  SCHOOL_ADMIN_ROLES,
  ACADEMIC_WRITE_ROLES,
  getUserContext,
  isSuperAdmin,
  isSchoolAdmin,
  canManageAcademics,
  hasSchoolAccess,
  assertSchoolAccess,
  assertCanManageSchool,
  schoolScopeWhere,
  canTeachClass,
  hasClassAccess,
  assertClassAccess,
  assertCanManageClass,
  classVisibilityWhere,
  studentVisibilityWhere,
};
