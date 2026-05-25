import { apiCreate, apiList } from './schoolClient';

export const listTeacherClasses = query => apiList('/classes', query);
export const listClassStudents = classId => apiList(`/classes/${classId}/students`, { limit: 100 });
export const getClassAttendance = ({ classId, date }) =>
  apiList('/attendance', { classId, date, limit: undefined });
export const submitBulkAttendance = payload => apiCreate('/attendance/bulk', payload);
export const getAttendanceReport = query => apiList('/attendance/report', query);
export const getAttendanceSummary = query => apiList('/attendance/summary', query);
export const getStudentAttendanceRange = (studentId, query) =>
  apiList(`/attendance/student/${studentId}`, query);
