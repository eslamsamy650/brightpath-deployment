const { Router } = require('express');
const AttendanceController = require('../controllers/attendance.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(authenticate);

router.get(
  '/report',
  authorize('ADMIN', 'SUPER_ADMIN', 'REGISTRAR'),
  validate(AttendanceController.reportQuerySchema, 'query'),
  asyncHandler(AttendanceController.getAttendanceReport)
);

router.get(
  '/summary',
  authorize('ADMIN', 'SUPER_ADMIN', 'REGISTRAR'),
  validate(AttendanceController.summaryQuerySchema, 'query'),
  asyncHandler(AttendanceController.getAttendanceSummary)
);

router.get(
  '/',
  authorize('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  validate(AttendanceController.attendanceQuerySchema, 'query'),
  asyncHandler(AttendanceController.getClassAttendanceFromQuery)
);

router.post(
  '/',
  authorize('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  validate(AttendanceController.takeAttendanceSchema),
  asyncHandler(AttendanceController.takeAttendance)
);

router.post(
  '/bulk',
  authorize('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  validate(AttendanceController.takeAttendanceSchema),
  asyncHandler(AttendanceController.takeAttendance)
);

router.get(
  '/class/:classId',
  authorize('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  validate(AttendanceController.classAttendanceQuerySchema, 'query'),
  asyncHandler(AttendanceController.getClassAttendance)
);

router.get(
  '/student/:studentId',
  authorize('TEACHER', 'ADMIN', 'SUPER_ADMIN', 'PARENT', 'STUDENT'),
  validate(AttendanceController.studentRangeQuerySchema, 'query'),
  asyncHandler(AttendanceController.getStudentAttendanceRange)
);

router.get(
  '/student/:studentId/month',
  authorize('TEACHER', 'ADMIN', 'SUPER_ADMIN', 'PARENT', 'STUDENT'),
  validate(AttendanceController.monthQuerySchema, 'query'),
  asyncHandler(AttendanceController.getStudentMonthAttendance)
);

module.exports = router;
