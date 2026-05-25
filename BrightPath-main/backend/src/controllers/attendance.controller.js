const { z } = require('zod');
const AttendanceService = require('../services/attendance.service');
const { getPrisma } = require('../lib/prisma');
const { sendSuccess } = require('../utils/response');
const { normalizeDoc } = require('../utils/serialize');
const { AppError } = require('../middleware/errorHandler');
const { isRoleAllowed } = require('../utils/roles');

const prisma = getPrisma();

const attendanceStatusEnum = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);

const takeAttendanceSchema = z.object({
  classId: z.string().uuid(),
  date: z.coerce.date(),
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: attendanceStatusEnum,
        note: z.string().optional(),
      })
    )
    .min(1),
});

const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const classAttendanceQuerySchema = z.object({
  date: z.coerce.date().optional(),
});
const attendanceQuerySchema = z.object({
  classId: z.string().uuid(),
  date: z.coerce.date().optional(),
});
const reportQuerySchema = z.object({
  classId: z.string().uuid(),
  from: z.coerce.date(),
  to: z.coerce.date(),
});
const studentRangeQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});
const summaryQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  classId: z.string().uuid().optional(),
});

async function resolveRecorderUserId(req, classId) {
  const staff = await prisma.staffProfile.findUnique({
    where: { userId: req.user.sub },
  });
  if (staff) return req.user.sub;

  if (isRoleAllowed(req.user.role, 'ADMIN', 'SUPER_ADMIN')) {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { homeroomTeacherId: true },
    });
    if (cls?.homeroomTeacherId) return cls.homeroomTeacherId;
  }

  throw new AppError('Teacher profile not found', 404);
}

async function takeAttendance(req, res, next) {
  try {
    const body = req.body;
    const teacherUserId = await resolveRecorderUserId(req, body.classId);

    const results = await AttendanceService.takeAttendance({
      ...body,
      requesterId: req.user.sub,
      teacherUserId,
    });
    sendSuccess(res, normalizeDoc(results), `Attendance saved for ${results.length} students`);
  } catch (err) {
    next(err);
  }
}

async function getClassAttendance(req, res, next) {
  try {
    const { classId } = req.params;
    const date = req.query.date ?? new Date();
    const records = await AttendanceService.getClassAttendance(req.user.sub, classId, date);
    sendSuccess(res, normalizeDoc(records));
  } catch (err) {
    next(err);
  }
}

async function getClassAttendanceFromQuery(req, res, next) {
  try {
    const { classId } = req.query;
    const date = req.query.date ?? new Date();
    const records = await AttendanceService.getClassAttendance(req.user.sub, classId, date);
    sendSuccess(res, normalizeDoc(records));
  } catch (err) {
    next(err);
  }
}

async function getStudentMonthAttendance(req, res, next) {
  try {
    const { studentId } = req.params;
    const q = req.query;
    const data = await AttendanceService.getStudentAttendanceMonth(
      req.user.sub,
      studentId,
      q.year,
      q.month
    );
    sendSuccess(res, normalizeDoc(data));
  } catch (err) {
    next(err);
  }
}

async function getAttendanceReport(req, res, next) {
  try {
    const data = await AttendanceService.getAttendanceReport(
      req.user.sub,
      req.query.classId,
      req.query.from,
      req.query.to
    );
    sendSuccess(res, normalizeDoc(data), 'Attendance report retrieved');
  } catch (err) {
    next(err);
  }
}

async function getStudentAttendanceRange(req, res, next) {
  try {
    const data = await AttendanceService.getStudentAttendanceRange(
      req.user.sub,
      req.params.studentId,
      req.query.from,
      req.query.to
    );
    sendSuccess(res, normalizeDoc(data), 'Student attendance retrieved');
  } catch (err) {
    next(err);
  }
}

async function getAttendanceSummary(req, res, next) {
  try {
    const data = await AttendanceService.getAttendanceSummary(
      req.user.sub,
      req.query.month,
      req.query.year,
      req.query.classId
    );
    sendSuccess(res, normalizeDoc(data), 'Attendance summary retrieved');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  takeAttendanceSchema,
  monthQuerySchema,
  classAttendanceQuerySchema,
  attendanceQuerySchema,
  reportQuerySchema,
  studentRangeQuerySchema,
  summaryQuerySchema,
  takeAttendance,
  getClassAttendance,
  getClassAttendanceFromQuery,
  getStudentMonthAttendance,
  getAttendanceReport,
  getStudentAttendanceRange,
  getAttendanceSummary,
};
