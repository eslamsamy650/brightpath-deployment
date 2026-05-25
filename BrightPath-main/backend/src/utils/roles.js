/** Map legacy API role strings (frontend) to PostgreSQL enum values. */
const API_TO_DB = {
  SUPER_ADMIN: 'SuperAdmin',
  ADMIN: 'SchoolAdmin',
  REGISTRAR: 'Registrar',
  ACCOUNTANT: 'Accountant',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  PARENT: 'Parent',
};

/** @type {Record<string, string>} */
const DB_TO_API = Object.fromEntries(Object.entries(API_TO_DB).map(([api, db]) => [db, api]));

/**
 * @param {string | null | undefined} dbRole
 * @returns {string}
 */
function toApiRole(dbRole) {
  if (!dbRole) return '';
  return DB_TO_API[dbRole] ?? dbRole;
}

/**
 * @param {string | null | undefined} apiRole
 * @returns {string}
 */
function toDbRole(apiRole) {
  if (!apiRole) return '';
  return API_TO_DB[apiRole] ?? apiRole;
}

/**
 * @param {...string} apiRoles
 * @returns {Set<string>}
 */
function expandRolesForAuth(...apiRoles) {
  const allowed = new Set();
  for (const role of apiRoles) {
    allowed.add(role);
    const dbRole = toDbRole(role);
    if (dbRole) allowed.add(dbRole);
    const apiRole = toApiRole(role);
    if (apiRole) allowed.add(apiRole);
  }
  return allowed;
}

/**
 * @param {string | undefined} userRole — stored in JWT as API role
 * @param {...string} allowedApiRoles
 */
function isRoleAllowed(userRole, ...allowedApiRoles) {
  if (!userRole) return false;
  return expandRolesForAuth(...allowedApiRoles).has(userRole);
}

module.exports = {
  API_TO_DB,
  DB_TO_API,
  toApiRole,
  toDbRole,
  expandRolesForAuth,
  isRoleAllowed,
};
