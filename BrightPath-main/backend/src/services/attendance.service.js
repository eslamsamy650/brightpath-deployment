const { getPrisma } = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');
const { logger } = require('../config/logger');
const { attendanceToApi, mapStudentSummary } = require('../utils/serialize');
const NotificationService = require('./notification.service');
const {
  getUserContext,
  assertClassAccess,
  assertCanManageClass,
  classVisibilityWhere,
  studentVisibilityWhere,
} = require('./access.service');

const prisma = getPrisma();

/** @typedef {{ studentId: string, status: string, note?: string }} AttendanceRecord */

function normalizeAttendanceDate(d) {
  const x = new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
}

function dateRange(from, to) {
  const start = normalizeAttendanceDate(from);
  const end = normalizeAttendanceDate(to);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, endExclusive: end };
}

function statusToRecord(status, note) {
  switch (status) {
    case 'ABSENT':
      return { isPresent: false, isExcused: false, notesEn: note ?? null, notesAr: note ?? null };
    case 'EXCUSED':
      return { isPresent: false, isExcused: true, notesEn: note ?? null, notesAr: note ?? null };
    case 'LATE':
      return { isPresent: true, isExcused: false, notesEn: note ?? 'LATE', notesAr: note ?? 'LATE' };
    default:
      return { isPresent: true, isExcused: false, notesEn: note ?? null, notesAr: note ?? null };
  }
}

/**
 * @param {{
 *   classId: string;
 *   teacherUserId: string;
 *   date: Date;
 *   records: AttendanceRecord[];
 * }} input
 */
async function takeAttendance(input) {
  const { classId, requesterId, teacherUserId, date, records } = input;
  const normalizedDate = normalizeAttendanceDate(date);

  const ctx = await getUserContext(requesterId);
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { classSubjects: { select: { teacherId: true } } },
  });
  if (!cls) throw new AppError('Class not found', 404);
  assertCanManageClass(ctx, cls);
  await assertStudentsInClass(classId, records.map(record => record.studentId));

  const results = await prisma.$transaction(async tx => {
    /** @type {any[]} */
    const saved = [];
    for (const r of records) {
      const mapped = statusToRecord(r.status, r.note);
      const row = await tx.attendanceRecord.upsert({
        where: {
          studentId_classId_attendanceDate: {
            studentId: r.studentId,
            classId,
            attendanceDate: normalizedDate,
          },
        },
        create: {
          studentId: r.studentId,
          classId,
          attendanceDate: normalizedDate,
          recordedBy: teacherUserId,
          ...mapped,
        },
        update: {
          recordedBy: teacherUserId,
          recordedAt: new Date(),
          ...mapped,
        },
      });
      saved.push(row);
    }
    return saved;
  });

  const alertRows = results.filter(r => {
    const api = attendanceToApi(r);
    return api.status === 'ABSENT' || api.status === 'LATE';
  });

  if (alertRows.length > 0) {
    void notifyParentsOfAbsence(alertRows).catch(err =>
      logger.error('Failed to send absence notifications', {
        err: err instanceof Error ? err.message : String(err),
      })
    );
  }

  return results.map(attendanceToApi);
}

async function getClassAttendance(userId, classId, date) {
  const day = normalizeAttendanceDate(date || new Date());
  const ctx = await getUserContext(userId);
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { classSubjects: { select: { teacherId: true } } },
  });
  if (!cls) throw new AppError('Class not found', 404);
  assertClassAccess(ctx, cls);

  const rows = await prisma.attendanceRecord.findMany({
    where: { classId, attendanceDate: day },
    include: {
      student: {
        select: {
          id: true,
          firstNameEn: true,
          firstNameAr: true,
          lastNameEn: true,
          lastNameAr: true,
          studentIdNumber: true,
          photoUrl: true,
        },
      },
    },
  });

  rows.sort((a, b) => {
    const af = `${a.student?.firstNameEn ?? a.student?.firstNameAr ?? ''} ${a.student?.lastNameEn ?? a.student?.lastNameAr ?? ''}`.trim();
    const bf = `${b.student?.firstNameEn ?? b.student?.firstNameAr ?? ''} ${b.student?.lastNameEn ?? b.student?.lastNameAr ?? ''}`.trim();
    return af.localeCompare(bf);
  });

  return rows.map(row => ({
    ...attendanceToApi(row),
    student: mapStudentSummary(row.student),
  }));
}

async function getStudentAttendanceMonth(userId, studentId, year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const endExclusive = new Date(Date.UTC(year, month, 1));
  await assertStudentAttendanceAccess(userId, studentId);

  const records = await prisma.attendanceRecord.findMany({
    where: {
      studentId,
      attendanceDate: { gte: start, lt: endExclusive },
    },
    orderBy: { attendanceDate: 'asc' },
  });

  const apiRecords = records.map(attendanceToApi);
  const summary = apiRecords.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));

  return { records: apiRecords, summary };
}

async function getAttendanceReport(userId, classId, from, to) {
  const ctx = await getUserContext(userId);
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { classSubjects: { select: { teacherId: true } } },
  });
  if (!cls) throw new AppError('Class not found', 404);
  assertClassAccess(ctx, cls);

  const { start, endExclusive } = dateRange(from, to);
  const [enrollments, rows] = await Promise.all([
    prisma.studentClassEnrollment.findMany({
      where: { classId, withdrawalDate: null },
      orderBy: { student: { firstNameAr: 'asc' } },
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
    prisma.attendanceRecord.findMany({
      where: { classId, attendanceDate: { gte: start, lt: endExclusive } },
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
      orderBy: [{ attendanceDate: 'asc' }],
    }),
  ]);

  const records = rows.map(row => ({ ...attendanceToApi(row), student: mapStudentSummary(row.student) }));
  const summary = records.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      acc.total += 1;
      return acc;
    },
    { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: 0 }
  );
  summary.presentPercent = summary.total ? Math.round((summary.PRESENT / summary.total) * 10000) / 100 : 0;

  return {
    classId,
    from: start,
    to: normalizeAttendanceDate(to),
    students: enrollments.map(enrollment => mapStudentSummary(enrollment.student)),
    records,
    summary,
  };
}

async function getStudentAttendanceRange(userId, studentId, from, to) {
  await assertStudentAttendanceAccess(userId, studentId);
  const { start, endExclusive } = dateRange(from, to);
  const rows = await prisma.attendanceRecord.findMany({
    where: { studentId, attendanceDate: { gte: start, lt: endExclusive } },
    orderBy: { attendanceDate: 'asc' },
    include: { class: true },
  });
  const records = rows.map(attendanceToApi);
  const summary = records.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  return { studentId, from: start, to: normalizeAttendanceDate(to), records, summary };
}

async function getAttendanceSummary(userId, month, year, classId) {
  const ctx = await getUserContext(userId);
  const start = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const endExclusive = new Date(Date.UTC(Number(year), Number(month), 1));
  const where = { attendanceDate: { gte: start, lt: endExclusive } };
  if (classId) {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: { classSubjects: { select: { teacherId: true } } },
    });
    if (!cls) throw new AppError('Class not found', 404);
    assertClassAccess(ctx, cls);
    where.classId = classId;
  } else {
    where.class = classVisibilityWhere(ctx);
  }
  const rows = await prisma.attendanceRecord.findMany({ where });
  const apiRows = rows.map(attendanceToApi);
  const summary = apiRows.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      acc.total += 1;
      return acc;
    },
    { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: 0 }
  );
  summary.presentPercent = summary.total ? Math.round((summary.PRESENT / summary.total) * 10000) / 100 : 0;
  return summary;
}

async function assertStudentsInClass(classId, studentIds) {
  const uniqueIds = [...new Set(studentIds)];
  const enrolled = await prisma.studentClassEnrollment.findMany({
    where: {
      classId,
      studentId: { in: uniqueIds },
      withdrawalDate: null,
    },
    select: { studentId: true },
  });
  const enrolledIds = new Set(enrolled.map(row => row.studentId));
  const missing = uniqueIds.filter(studentId => !enrolledIds.has(studentId));
  if (missing.length > 0) {
    throw new AppError('All attendance records must belong to active students in the class', 422);
  }
}

async function assertStudentAttendanceAccess(userId, studentId) {
  const ctx = await getUserContext(userId);
  const student = await prisma.student.findFirst({
    where: {
      AND: [{ id: studentId }, studentVisibilityWhere(ctx)],
    },
    select: { id: true },
  });
  if (!student) throw new AppError('Student not found', 404);
}

async function notifyParentsOfAbsence(attendanceRows) {
  for (const att of attendanceRows) {
    const student = await prisma.student.findUnique({
      where: { id: att.studentId },
      include: {
        guardians: {
          include: {
            guardian: true,
          },
        },
      },
    });
    if (!student) continue;

    const api = attendanceToApi(att);
    const firstName = student.firstNameEn || student.firstNameAr;

    for (const link of student.guardians) {
      const guardian = link.guardian;
      if (!guardian.userId) continue;

      const title = `Attendance Alert for ${firstName}`;
      const body =
        api.status === 'ABSENT'
          ? `${firstName} was marked absent today.`
          : `${firstName} arrived late today.`;

      await NotificationService.createNotification({
        schoolId: student.schoolId,
        targetUserId: guardian.userId,
        type: 'ATTENDANCE_ALERT',
        title,
        body,
        metadata: {
          studentId: student.id,
          attendanceId: att.id,
          status: api.status,
        },
      });
    }

    logger.info(`Absence notification queued for student ${firstName}`);
  }
}

module.exports = {
  takeAttendance,
  getClassAttendance,
  getAttendanceReport,
  getStudentAttendanceRange,
  getAttendanceSummary,
  getStudentAttendanceMonth,
  normalizeAttendanceDate,
  assertStudentsInClass,
  assertStudentAttendanceAccess,
};
