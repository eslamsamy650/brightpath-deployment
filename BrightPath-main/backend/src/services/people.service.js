const { getPrisma } = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');
const { toApiRole, toDbRole } = require('../utils/roles');
const {
  getUserContext,
  assertSchoolAccess,
  assertCanManageSchool,
  studentVisibilityWhere,
} = require('./access.service');
const { hashPassword } = require('./auth.service');
const AuditService = require('./audit.service');

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

function fullName(row) {
  if (!row) return null;
  return [row.firstNameEn || row.firstNameAr, row.lastNameEn || row.lastNameAr]
    .filter(Boolean)
    .join(' ');
}

function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    role: toApiRole(row.role),
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    staffProfile: row.staffProfile
      ? { ...row.staffProfile, name: fullName(row.staffProfile) }
      : undefined,
    studentProfile: row.student ? { ...row.student, name: fullName(row.student) } : undefined,
    parentProfile: row.guardian ? { ...row.guardian, name: fullName(row.guardian) } : undefined,
  };
}

function userSchoolFilter(ctx) {
  if (ctx.role === 'SUPER_ADMIN') return {};
  return {
    OR: [
      { staffProfile: { is: { schoolId: { in: ctx.schoolIds } } } },
      { student: { is: { schoolId: { in: ctx.schoolIds } } } },
      {
        guardian: {
          is: {
            studentGuardians: {
              some: { student: { is: { schoolId: { in: ctx.schoolIds } } } },
            },
          },
        },
      },
    ],
  };
}

const userInclude = {
  staffProfile: true,
  student: true,
  guardian: true,
};

async function listUsers(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = { AND: [userSchoolFilter(ctx)] };
  if (query.role) where.role = toDbRole(query.role);
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.q) {
    where.AND.push({
      OR: [
        { email: { contains: query.q, mode: 'insensitive' } },
        { phone: { contains: query.q, mode: 'insensitive' } },
        { staffProfile: { is: { firstNameEn: { contains: query.q, mode: 'insensitive' } } } },
        { student: { is: { firstNameEn: { contains: query.q, mode: 'insensitive' } } } },
        { guardian: { is: { firstNameEn: { contains: query.q, mode: 'insensitive' } } } },
      ],
    });
  }

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: userInclude,
    }),
  ]);
  return { data: rows.map(mapUser), meta: meta(total, page, limit) };
}

async function getUser(requesterId, targetUserId) {
  const ctx = await getUserContext(requesterId);
  const row = await prisma.user.findFirst({
    where: { id: targetUserId, ...userSchoolFilter(ctx) },
    include: userInclude,
  });
  if (!row) throw new AppError('User not found', 404);
  return mapUser(row);
}

async function createUser(requesterId, input) {
  const data = {
    email: input.email.toLowerCase(),
    phone: input.phone ?? null,
    role: toDbRole(input.role),
    passwordHash: await hashPassword(input.password),
    isActive: input.isActive ?? true,
  };
  const row = await prisma.user.create({ data, include: userInclude });
  await audit(requesterId, 'INSERT', 'users', row.id, null, row);
  return mapUser(row);
}

async function updateUser(requesterId, targetUserId, input) {
  const existing = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!existing) throw new AppError('User not found', 404);
  const data = {
    email: input.email?.toLowerCase(),
    phone: input.phone,
    role: input.role ? toDbRole(input.role) : undefined,
    isActive: input.isActive,
  };
  Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
  const row = await prisma.user.update({
    where: { id: targetUserId },
    data,
    include: userInclude,
  });
  await audit(requesterId, 'UPDATE', 'users', targetUserId, existing, row);
  return mapUser(row);
}

async function resetUserPassword(requesterId, targetUserId, password) {
  const existing = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!existing) throw new AppError('User not found', 404);
  await prisma.user.update({
    where: { id: targetUserId },
    data: { passwordHash: await hashPassword(password), failedLoginCount: 0, lockedUntil: null },
  });
  await audit(requesterId, 'UPDATE', 'users', targetUserId, { passwordReset: true }, null);
}

async function getMySettings(userId) {
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return settings;
}

async function updateMySettings(userId, input) {
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, ...input },
    update: input,
  });
  await audit(userId, 'UPDATE', 'user_settings', userId, null, settings);
  return settings;
}

async function changeMyPassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);
  const bcrypt = require('bcryptjs');
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new AppError('Current password is incorrect', 401);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword), failedLoginCount: 0, lockedUntil: null },
  });
  await audit(userId, 'UPDATE', 'users', userId, { passwordChanged: true }, null);
}

function mapStaff(row) {
  return {
    ...row,
    name: fullName(row),
    user: row.user ? mapUser(row.user) : undefined,
  };
}

async function listStaff(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = {};
  if (query.schoolId) {
    assertSchoolAccess(ctx, query.schoolId);
    where.schoolId = query.schoolId;
  } else if (ctx.role !== 'SUPER_ADMIN') {
    where.schoolId = { in: ctx.schoolIds };
  }
  const [total, rows] = await Promise.all([
    prisma.staffProfile.count({ where }),
    prisma.staffProfile.findMany({
      where,
      orderBy: [{ lastNameEn: 'asc' }, { firstNameEn: 'asc' }],
      skip,
      take,
      include: { user: true },
    }),
  ]);
  return { data: rows.map(mapStaff), meta: meta(total, page, limit) };
}

async function upsertStaffProfile(userId, input) {
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, input.schoolId);
  const row = await prisma.staffProfile.upsert({
    where: { userId: input.userId },
    create: input,
    update: input,
    include: { user: true },
  });
  await audit(userId, 'UPDATE', 'staff_profiles', row.id, null, row);
  return mapStaff(row);
}

async function updateStaffProfile(userId, id, input) {
  const existing = await prisma.staffProfile.findUnique({ where: { id } });
  if (!existing) throw new AppError('Staff profile not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, existing.schoolId);
  const row = await prisma.staffProfile.update({
    where: { id },
    data: input,
    include: { user: true },
  });
  await audit(userId, 'UPDATE', 'staff_profiles', id, existing, row);
  return mapStaff(row);
}

function mapStudent(row) {
  return {
    ...row,
    name: fullName(row),
    user: row.user ? mapUser(row.user) : undefined,
  };
}

const studentInclude = {
  user: true,
  enrollments: {
    where: { withdrawalDate: null },
    orderBy: { enrollmentDate: 'desc' },
    take: 1,
    include: {
      class: {
        include: { gradeLevel: true, homeroomTeacher: true },
      },
      academicYear: true,
    },
  },
  guardians: {
    orderBy: [{ isPrimary: 'desc' }, { emergencyOrder: 'asc' }],
    include: { guardian: true },
  },
};

async function listStudents(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = studentVisibilityWhere(ctx);
  if (query.schoolId) {
    assertSchoolAccess(ctx, query.schoolId);
    where.schoolId = query.schoolId;
  }
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.gender) where.gender = query.gender;
  if (query.classId) {
    where.enrollments = { some: { classId: query.classId, withdrawalDate: null } };
  }
  const search = query.search || query.q;
  if (search) {
    where.OR = [
      { studentIdNumber: { contains: search, mode: 'insensitive' } },
      { firstNameAr: { contains: search, mode: 'insensitive' } },
      { lastNameAr: { contains: search, mode: 'insensitive' } },
      { firstNameEn: { contains: search, mode: 'insensitive' } },
      { lastNameEn: { contains: search, mode: 'insensitive' } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: [{ lastNameEn: 'asc' }, { firstNameEn: 'asc' }],
      skip,
      take,
      include: studentInclude,
    }),
  ]);
  return { data: rows.map(mapStudent), meta: meta(total, page, limit) };
}

async function getStudent(userId, id) {
  const ctx = await getUserContext(userId);
  const row = await prisma.student.findFirst({
    where: { AND: [{ id }, studentVisibilityWhere(ctx)] },
    include: studentInclude,
  });
  if (!row) throw new AppError('Student not found', 404);
  return mapStudent(row);
}

async function createStudent(userId, input) {
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, input.schoolId);
  const row = await prisma.student.create({ data: input, include: { user: true } });
  await audit(userId, 'INSERT', 'students', row.id, null, row);
  return mapStudent(row);
}

async function updateStudent(userId, id, input) {
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) throw new AppError('Student not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, existing.schoolId);
  const row = await prisma.student.update({ where: { id }, data: input, include: { user: true } });
  await audit(userId, 'UPDATE', 'students', id, existing, row);
  return mapStudent(row);
}

function mapGuardian(row) {
  return {
    ...row,
    name: fullName(row),
    user: row.user ? mapUser(row.user) : undefined,
  };
}

const guardianInclude = {
  user: true,
  studentGuardians: {
    include: {
      student: {
        include: {
          enrollments: {
            where: { withdrawalDate: null },
            take: 1,
            include: { class: { include: { gradeLevel: true } } },
          },
        },
      },
    },
  },
};

async function listGuardians(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = {};
  if (query.studentId) where.studentGuardians = { some: { studentId: query.studentId } };
  if (ctx.role !== 'SUPER_ADMIN' && !query.studentId) {
    where.studentGuardians = {
      some: { student: { is: { schoolId: { in: ctx.schoolIds } } } },
    };
  }
  const [total, rows] = await Promise.all([
    prisma.guardian.count({ where }),
    prisma.guardian.findMany({
      where,
      orderBy: [{ lastNameEn: 'asc' }, { firstNameEn: 'asc' }],
      skip,
      take,
      include: guardianInclude,
    }),
  ]);
  return { data: rows.map(mapGuardian), meta: meta(total, page, limit) };
}

async function getGuardian(userId, id) {
  const ctx = await getUserContext(userId);
  const where = { id };
  if (ctx.role !== 'SUPER_ADMIN') {
    where.studentGuardians = {
      some: { student: { is: { schoolId: { in: ctx.schoolIds } } } },
    };
  }
  const row = await prisma.guardian.findFirst({
    where,
    include: guardianInclude,
  });
  if (!row) throw new AppError('Guardian not found', 404);
  return mapGuardian(row);
}

async function listGuardianStudents(userId, guardianId) {
  const ctx = await getUserContext(userId);
  const guardian = await prisma.guardian.findFirst({
    where: {
      id: guardianId,
      studentGuardians: {
        some: { student: { is: studentVisibilityWhere(ctx) } },
      },
    },
    include: guardianInclude,
  });
  if (!guardian) throw new AppError('Guardian not found', 404);
  return guardian.studentGuardians.map(link => mapStudent(link.student));
}

async function createGuardian(userId, input) {
  const row = await prisma.guardian.create({ data: input, include: { user: true } });
  await audit(userId, 'INSERT', 'guardians', row.id, null, row);
  return mapGuardian(row);
}

async function updateGuardian(userId, id, input) {
  const existing = await prisma.guardian.findUnique({ where: { id } });
  if (!existing) throw new AppError('Guardian not found', 404);
  const row = await prisma.guardian.update({ where: { id }, data: input, include: { user: true } });
  await audit(userId, 'UPDATE', 'guardians', id, existing, row);
  return mapGuardian(row);
}

async function linkGuardian(userId, input) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new AppError('Student not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, student.schoolId);
  const row = await prisma.studentGuardian.upsert({
    where: {
      studentId_guardianId: {
        studentId: input.studentId,
        guardianId: input.guardianId,
      },
    },
    create: input,
    update: input,
  });
  await audit(userId, 'UPDATE', 'student_guardians', input.studentId, null, row);
  return row;
}

async function createEnrollment(userId, input) {
  const [student, cls] = await Promise.all([
    prisma.student.findUnique({ where: { id: input.studentId } }),
    prisma.class.findUnique({ where: { id: input.classId } }),
  ]);
  if (!student) throw new AppError('Student not found', 404);
  if (!cls || cls.schoolId !== student.schoolId) throw new AppError('Class not found for student school', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, student.schoolId);
  const row = await prisma.studentClassEnrollment.upsert({
    where: {
      studentId_academicYearId: {
        studentId: input.studentId,
        academicYearId: input.academicYearId,
      },
    },
    create: input,
    update: input,
  });
  await audit(userId, 'UPDATE', 'student_class_enrollments', row.id, null, row);
  return row;
}

async function updateEnrollment(userId, id, input) {
  const existing = await prisma.studentClassEnrollment.findUnique({
    where: { id },
    include: { student: true },
  });
  if (!existing) throw new AppError('Enrollment not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, existing.student.schoolId);
  const row = await prisma.studentClassEnrollment.update({ where: { id }, data: input });
  await audit(userId, 'UPDATE', 'student_class_enrollments', id, existing, row);
  return row;
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  resetUserPassword,
  getMySettings,
  updateMySettings,
  changeMyPassword,
  listStaff,
  upsertStaffProfile,
  updateStaffProfile,
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  listGuardians,
  getGuardian,
  listGuardianStudents,
  createGuardian,
  updateGuardian,
  linkGuardian,
  createEnrollment,
  updateEnrollment,
};
