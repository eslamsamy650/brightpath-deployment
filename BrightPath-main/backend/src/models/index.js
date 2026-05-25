/**
 * Database access — Prisma client (PostgreSQL).
 * @deprecated Import from ../lib/prisma directly in new code.
 */
const { getPrisma } = require('../lib/prisma');

module.exports = {
  prisma: getPrisma(),
};
