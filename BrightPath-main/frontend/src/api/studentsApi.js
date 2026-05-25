import { apiCreate, apiGet, apiList, apiUpdate } from './schoolClient';

export function listStudents(query = {}) {
  return apiList('/students', query);
}

export function getStudent(id) {
  return apiGet('/students', id);
}

export function createStudent(payload) {
  return apiCreate('/students', payload);
}

export function updateStudent(id, payload) {
  return apiUpdate('/students', id, payload);
}

export function deactivateStudent(id) {
  return updateStudent(id, { isActive: false });
}

export async function bulkDeactivateStudents(ids = []) {
  return Promise.all(ids.map(id => deactivateStudent(id)));
}
