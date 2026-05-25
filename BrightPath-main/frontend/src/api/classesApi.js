import { apiCreate, apiGet, apiList, apiUpdate } from './schoolClient';

export const listClasses = query => apiList('/classes', query);
export const getClass = id => apiGet('/classes', id);
export const createClass = payload => apiCreate('/classes', payload);
export const updateClass = (id, payload) => apiUpdate('/classes', id, payload);
export const listClassStudents = id => apiList(`/classes/${id}/students`, { limit: 100 });
export const listStaff = query => apiList('/staff', query);
