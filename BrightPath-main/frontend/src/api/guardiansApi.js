import { apiCreate, apiGet, apiList, apiUpdate } from './schoolClient';

export const listGuardians = query => apiList('/guardians', query);
export const getGuardian = id => apiGet('/guardians', id);
export const createGuardian = payload => apiCreate('/guardians', payload);
export const updateGuardian = (id, payload) => apiUpdate('/guardians', id, payload);
export const listGuardianStudents = guardianId => apiList(`/guardians/${guardianId}/students`, { limit: 100 });
export const linkGuardianToStudent = payload => apiCreate('/guardians/links', payload);
