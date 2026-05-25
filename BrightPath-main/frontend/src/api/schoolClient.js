import { apiRequest } from './brighpathClient';
import { unwrapApiResponse } from './apiErrors';

const unwrap = unwrapApiResponse;

function paramsFrom(input = {}) {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return params.toString();
}

function endpoint(path, query) {
  const qs = paramsFrom(query);
  return qs ? `${path}?${qs}` : path;
}

export async function apiList(path, query = {}) {
  return unwrap(await apiRequest(endpoint(path, { limit: 50, ...query })), `Could not load ${path}`);
}

export async function apiGet(path, id) {
  return unwrap(
    await apiRequest(`${path}/${encodeURIComponent(id)}`),
    `Could not load ${path}`
  );
}

export async function apiCreate(path, payload) {
  return unwrap(
    await apiRequest(path, { method: 'POST', body: JSON.stringify(payload) }),
    `Could not create ${path}`
  );
}

export async function apiUpdate(path, id, payload) {
  return unwrap(
    await apiRequest(`${path}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
    `Could not update ${path}`
  );
}

export async function apiPatch(path, id, payload) {
  return unwrap(
    await apiRequest(`${path}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    `Could not update ${path}`
  );
}

export async function apiTakeAttendance(payload) {
  return apiCreate('/attendance', payload);
}

export async function apiGetClassAttendance(classId, date) {
  return unwrap(
    await apiRequest(endpoint(`/attendance/class/${encodeURIComponent(classId)}`, { date })),
    'Could not load class attendance'
  );
}

export async function apiGetStudentAttendanceMonth(studentId, date = new Date()) {
  return unwrap(
    await apiRequest(
      endpoint(`/attendance/student/${encodeURIComponent(studentId)}/month`, {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      })
    ),
    'Could not load attendance'
  );
}

export const apiListAssignments = query => apiList('/assignments', query);
export const apiListGrades = query => apiList('/grades', query);
export const apiListAnnouncements = query => apiList('/announcements', query);
export const apiListNotifications = query => apiList('/notifications', query);
export const apiListClasses = query => apiList('/classes', query);
export const apiListStudents = query => apiList('/students', query);
export const apiListGuardians = query => apiList('/guardians', query);
export const apiListSchools = query => apiList('/schools', query);
export const apiListAcademicYears = query => apiList('/academic-years', query);
export const apiListGradeLevels = query => apiList('/grade-levels', query);
export const apiListUsers = query => apiList('/users', query);
export const apiListClassSubjects = query => apiList('/class-subjects', query);
export const apiListAssessmentTypes = query => apiList('/assessment-types', query);
export const apiListFinanceTransactions = query => apiList('/finance/transactions', query);
export const apiListFeeStructures = query => apiList('/finance/fee-structures', query);
export const apiListInstallmentPlans = query => apiList('/finance/installment-plans', query);

export const apiCreateStudent = payload => apiCreate('/students', payload);
export const apiUpdateStudent = (id, payload) => apiUpdate('/students', id, payload);
export const apiCreateGuardian = payload => apiCreate('/guardians', payload);
export const apiUpdateGuardian = (id, payload) => apiUpdate('/guardians', id, payload);
export const apiCreateClass = payload => apiCreate('/classes', payload);
export const apiUpdateClass = (id, payload) => apiUpdate('/classes', id, payload);
export const apiRecordGrade = payload => apiCreate('/grades', payload);
export const apiCreateFinanceTransaction = payload => apiCreate('/finance/transactions', payload);
export const apiGetMySettings = async () =>
  unwrap(await apiRequest('/users/me/settings'), 'Could not load settings');
export const apiMarkNotificationRead = async id =>
  unwrap(
    await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
    'Could not mark notification read'
  );
