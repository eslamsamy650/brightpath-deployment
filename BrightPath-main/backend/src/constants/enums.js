/**
 * String enums aligned with the former Prisma schema.
 */

const Role = /** @type {const} */ ({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
});
const Roles = Object.values(Role);

const Gender = /** @type {const} */ ({
  MALE: 'MALE',
  FEMALE: 'FEMALE',
});
const Genders = Object.values(Gender);

const AttendanceStatus = /** @type {const} */ ({
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
});
const AttendanceStatuses = Object.values(AttendanceStatus);

const AssignmentStatus = /** @type {const} */ ({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
});

const SubmissionStatus = /** @type {const} */ ({
  SUBMITTED: 'SUBMITTED',
  GRADED: 'GRADED',
  LATE: 'LATE',
  MISSING: 'MISSING',
});

const AnnouncementAudience = /** @type {const} */ ({
  ALL: 'ALL',
  TEACHERS: 'TEACHERS',
  STUDENTS: 'STUDENTS',
  PARENTS: 'PARENTS',
  CLASS: 'CLASS',
});

const AnnouncementPriority = /** @type {const} */ ({
  NORMAL: 'NORMAL',
  URGENT: 'URGENT',
  INFO: 'INFO',
});

const MessageStatus = /** @type {const} */ ({
  SENT: 'SENT',
  READ: 'READ',
  DELETED: 'DELETED',
});

const TermName = /** @type {const} */ ({
  FIRST: 'FIRST',
  SECOND: 'SECOND',
  THIRD: 'THIRD',
});

const NotificationType = /** @type {const} */ ({
  GRADE_POSTED: 'GRADE_POSTED',
  ASSIGNMENT_DUE: 'ASSIGNMENT_DUE',
  ABSENCE_ALERT: 'ABSENCE_ALERT',
  NEW_MESSAGE: 'NEW_MESSAGE',
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  REPORT_READY: 'REPORT_READY',
});

const PaymentStatus = /** @type {const} */ ({
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
});

module.exports = {
  Role,
  Roles,
  Gender,
  Genders,
  AttendanceStatus,
  AttendanceStatuses,
  AssignmentStatus,
  SubmissionStatus,
  AnnouncementAudience,
  AnnouncementPriority,
  MessageStatus,
  TermName,
  NotificationType,
  PaymentStatus,
};
