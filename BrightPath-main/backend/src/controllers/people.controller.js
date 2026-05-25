const { z } = require('zod');
const PeopleService = require('../services/people.service');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');
const { normalizeDoc } = require('../utils/serialize');

const uuidSchema = z.string().uuid();
const idParamsSchema = z.object({ id: uuidSchema });
const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
const userQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'ACCOUNTANT', 'TEACHER', 'STUDENT', 'PARENT']).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform(value => (value === undefined ? undefined : value === 'true')),
});
const userBodySchema = z.object({
  email: z.string().email(),
  phone: z.string().trim().max(20).optional().nullable(),
  password: z.string().min(8).max(128),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'ACCOUNTANT', 'TEACHER', 'STUDENT', 'PARENT']),
  isActive: z.boolean().optional(),
});
const updateUserSchema = userBodySchema
  .omit({ password: true })
  .partial()
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field is required' });
const resetPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
const settingsSchema = z.object({
  preferredLanguage: z.enum(['ar', 'en']).optional(),
  uiDirection: z.enum(['rtl', 'ltr']).optional(),
  timezone: z.string().trim().min(1).max(60).optional(),
  notificationsEmail: z.boolean().optional(),
  notificationsSms: z.boolean().optional(),
});

const staffQuerySchema = paginationQuerySchema.extend({ schoolId: uuidSchema.optional() });
const staffBodySchema = z.object({
  userId: uuidSchema,
  schoolId: uuidSchema,
  firstNameAr: z.string().trim().min(1).max(100),
  firstNameEn: z.string().trim().min(1).max(100),
  lastNameAr: z.string().trim().min(1).max(100),
  lastNameEn: z.string().trim().min(1).max(100),
  nationalId: z.string().trim().max(14).optional().nullable(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  hireDate: z.coerce.date().optional().nullable(),
  positionAr: z.string().trim().max(150).optional().nullable(),
  positionEn: z.string().trim().max(150).optional().nullable(),
  departmentAr: z.string().trim().max(150).optional().nullable(),
  departmentEn: z.string().trim().max(150).optional().nullable(),
});

const studentQuerySchema = paginationQuerySchema.extend({
  schoolId: uuidSchema.optional(),
  classId: uuidSchema.optional(),
  search: z.string().trim().max(100).optional(),
  q: z.string().trim().max(100).optional(),
  gender: z.enum(['male', 'female']).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform(value => (value === undefined ? undefined : value === 'true')),
});
const studentBodySchema = z.object({
  userId: uuidSchema.optional().nullable(),
  schoolId: uuidSchema,
  studentIdNumber: z.string().trim().min(1).max(30),
  firstNameAr: z.string().trim().min(1).max(100),
  firstNameEn: z.string().trim().max(100).optional().nullable(),
  lastNameAr: z.string().trim().min(1).max(100),
  lastNameEn: z.string().trim().max(100).optional().nullable(),
  gender: z.enum(['male', 'female']),
  dateOfBirth: z.coerce.date(),
  nationalId: z.string().trim().max(14).optional().nullable(),
  birthCertificateNo: z.string().trim().max(50).optional().nullable(),
  nationalityAr: z.string().trim().max(100).optional().nullable(),
  nationalityEn: z.string().trim().max(100).optional().nullable(),
  religionAr: z.string().trim().max(50).optional().nullable(),
  religionEn: z.string().trim().max(50).optional().nullable(),
  addressAr: z.string().trim().optional().nullable(),
  addressEn: z.string().trim().optional().nullable(),
  photoUrl: z.string().trim().url().optional().nullable(),
  enrollmentDate: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

const guardianQuerySchema = paginationQuerySchema.extend({ studentId: uuidSchema.optional() });
const guardianBodySchema = z.object({
  userId: uuidSchema.optional().nullable(),
  firstNameAr: z.string().trim().min(1).max(100),
  firstNameEn: z.string().trim().max(100).optional().nullable(),
  lastNameAr: z.string().trim().min(1).max(100),
  lastNameEn: z.string().trim().max(100).optional().nullable(),
  nationalIdEncrypted: z.string().trim().optional().nullable(),
  phonePrimary: z.string().trim().min(1).max(20),
  phoneSecondary: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  relationshipAr: z.string().trim().min(1).max(50),
  relationshipEn: z.string().trim().max(50).optional().nullable(),
  occupationAr: z.string().trim().max(150).optional().nullable(),
  occupationEn: z.string().trim().max(150).optional().nullable(),
  addressAr: z.string().trim().optional().nullable(),
  addressEn: z.string().trim().optional().nullable(),
});
const guardianLinkSchema = z.object({
  studentId: uuidSchema,
  guardianId: uuidSchema,
  isPrimary: z.boolean().optional(),
  canPickup: z.boolean().optional(),
  emergencyOrder: z.coerce.number().int().min(1).max(20).optional(),
});
const enrollmentBodySchema = z.object({
  studentId: uuidSchema,
  classId: uuidSchema,
  academicYearId: uuidSchema,
  enrollmentDate: z.coerce.date().optional(),
  withdrawalDate: z.coerce.date().optional().nullable(),
});

function partial(schema) {
  return schema.partial().refine(data => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });
}

async function listUsers(req, res) {
  const { data, meta } = await PeopleService.listUsers(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Users retrieved', 200, meta);
}

async function getUser(req, res) {
  const user = await PeopleService.getUser(req.user.sub, req.params.id);
  sendSuccess(res, normalizeDoc(user), 'User retrieved');
}

async function createUser(req, res) {
  const user = await PeopleService.createUser(req.user.sub, req.body);
  sendCreated(res, normalizeDoc(user), 'User created');
}

async function updateUser(req, res) {
  const user = await PeopleService.updateUser(req.user.sub, req.params.id, req.body);
  sendSuccess(res, normalizeDoc(user), 'User updated');
}

async function resetUserPassword(req, res) {
  await PeopleService.resetUserPassword(req.user.sub, req.params.id, req.body.password);
  sendNoContent(res);
}

async function getMySettings(req, res) {
  const settings = await PeopleService.getMySettings(req.user.sub);
  sendSuccess(res, normalizeDoc(settings), 'Settings retrieved');
}

async function updateMySettings(req, res) {
  const settings = await PeopleService.updateMySettings(req.user.sub, req.body);
  sendSuccess(res, normalizeDoc(settings), 'Settings updated');
}

async function changeMyPassword(req, res) {
  await PeopleService.changeMyPassword(
    req.user.sub,
    req.body.currentPassword,
    req.body.newPassword
  );
  sendNoContent(res);
}

async function listStaff(req, res) {
  const { data, meta } = await PeopleService.listStaff(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Staff retrieved', 200, meta);
}

async function createStaff(req, res) {
  const staff = await PeopleService.upsertStaffProfile(req.user.sub, req.body);
  sendCreated(res, normalizeDoc(staff), 'Staff profile saved');
}

async function updateStaff(req, res) {
  const staff = await PeopleService.updateStaffProfile(req.user.sub, req.params.id, req.body);
  sendSuccess(res, normalizeDoc(staff), 'Staff profile updated');
}

async function listStudents(req, res) {
  const { data, meta } = await PeopleService.listStudents(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Students retrieved', 200, meta);
}

async function getStudent(req, res) {
  const student = await PeopleService.getStudent(req.user.sub, req.params.id);
  sendSuccess(res, normalizeDoc(student), 'Student retrieved');
}

async function createStudent(req, res) {
  const student = await PeopleService.createStudent(req.user.sub, req.body);
  sendCreated(res, normalizeDoc(student), 'Student created');
}

async function updateStudent(req, res) {
  const student = await PeopleService.updateStudent(req.user.sub, req.params.id, req.body);
  sendSuccess(res, normalizeDoc(student), 'Student updated');
}

async function listGuardians(req, res) {
  const { data, meta } = await PeopleService.listGuardians(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Guardians retrieved', 200, meta);
}

async function getGuardian(req, res) {
  const guardian = await PeopleService.getGuardian(req.user.sub, req.params.id);
  sendSuccess(res, normalizeDoc(guardian), 'Guardian retrieved');
}

async function getGuardianStudents(req, res) {
  const students = await PeopleService.listGuardianStudents(req.user.sub, req.params.id);
  sendSuccess(res, normalizeDoc(students), 'Guardian students retrieved');
}

async function createGuardian(req, res) {
  const guardian = await PeopleService.createGuardian(req.user.sub, req.body);
  sendCreated(res, normalizeDoc(guardian), 'Guardian created');
}

async function updateGuardian(req, res) {
  const guardian = await PeopleService.updateGuardian(req.user.sub, req.params.id, req.body);
  sendSuccess(res, normalizeDoc(guardian), 'Guardian updated');
}

async function linkGuardian(req, res) {
  const link = await PeopleService.linkGuardian(req.user.sub, req.body);
  sendSuccess(res, normalizeDoc(link), 'Guardian linked to student');
}

async function createEnrollment(req, res) {
  const enrollment = await PeopleService.createEnrollment(req.user.sub, req.body);
  sendCreated(res, normalizeDoc(enrollment), 'Enrollment saved');
}

async function updateEnrollment(req, res) {
  const enrollment = await PeopleService.updateEnrollment(req.user.sub, req.params.id, req.body);
  sendSuccess(res, normalizeDoc(enrollment), 'Enrollment updated');
}

module.exports = {
  idParamsSchema,
  paginationQuerySchema,
  userQuerySchema,
  userBodySchema,
  updateUserSchema,
  resetPasswordSchema,
  changePasswordSchema,
  settingsSchema,
  staffQuerySchema,
  staffBodySchema,
  updateStaffSchema: partial(staffBodySchema.omit({ userId: true, schoolId: true })),
  studentQuerySchema,
  studentBodySchema,
  updateStudentSchema: partial(studentBodySchema.omit({ schoolId: true, studentIdNumber: true })),
  guardianQuerySchema,
  guardianBodySchema,
  updateGuardianSchema: partial(guardianBodySchema),
  guardianLinkSchema,
  enrollmentBodySchema,
  updateEnrollmentSchema: partial(enrollmentBodySchema),
  listUsers,
  getUser,
  createUser,
  updateUser,
  resetUserPassword,
  getMySettings,
  updateMySettings,
  changeMyPassword,
  listStaff,
  createStaff,
  updateStaff,
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  listGuardians,
  getGuardian,
  getGuardianStudents,
  createGuardian,
  updateGuardian,
  linkGuardian,
  createEnrollment,
  updateEnrollment,
};
