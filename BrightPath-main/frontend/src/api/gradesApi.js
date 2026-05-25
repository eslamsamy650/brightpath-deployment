import { apiCreate, apiList } from './schoolClient';

export const listGradeSubjects = classId => apiList('/grades/subjects', { classId });
export const listGrades = query => apiList('/grades', query);
export const submitBulkGrades = payload => apiCreate('/grades/bulk', payload);
export const getReportCard = (studentId, query) => apiList(`/grades/report-card/${studentId}`, query);
export const saveReportRemarks = payload => apiCreate('/grades/remarks', payload);
