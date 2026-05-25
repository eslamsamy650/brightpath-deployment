const { getPrisma } = require('../lib/prisma');
const { toApiRole } = require('../utils/roles');
const { getUserContext, isSuperAdmin, isSchoolAdmin } = require('./access.service');
const { AppError } = require('../middleware/errorHandler');

const prisma = getPrisma();

function clampPagination(page = 1, limit = 20) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

async function writeAuditLog(
  {
    userId,
    action,
    tableName,
    recordId,
    oldValues,
    newValues,
    ipAddress,
    userAgent,
    querySnippet,
    isSensitive = true,
  },
  tx = prisma
) {
  if (!action || !tableName) return null;
  return tx.auditLog.create({
    data: {
      userId: userId ?? null,
      action,
      tableName,
      recordId: recordId ?? null,
      oldValues: oldValues ?? undefined,
      newValues: newValues ?? undefined,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      querySnippet: querySnippet ?? null,
      isSensitive,
    },
  });
}

function mapAuditLog(row) {
  return {
    id: row.id,
    userId: row.userId,
    action: row.action,
    tableName: row.tableName,
    recordId: row.recordId,
    oldValues: row.oldValues,
    newValues: row.newValues,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    querySnippet: row.querySnippet,
    isSensitive: row.isSensitive,
    createdAt: row.createdAt,
    user: row.user
      ? {
          id: row.user.id,
          email: row.user.email,
          role: toApiRole(row.user.role),
        }
      : null,
  };
}

async function listAuditLogs(userId, query = {}) {
  const ctx = await getUserContext(userId);
  if (!isSuperAdmin(ctx) && !isSchoolAdmin(ctx)) {
    throw new AppError('You are not allowed to view audit logs', 403);
  }

  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = {};
  if (query.action) where.action = query.action;
  if (query.tableName) where.tableName = query.tableName;
  if (query.recordId) where.recordId = query.recordId;
  if (query.userId) where.userId = query.userId;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { user: { select: { id: true, email: true, role: true } } },
    }),
  ]);

  return {
    data: logs.map(mapAuditLog),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
}

module.exports = {
  writeAuditLog,
  listAuditLogs,
  mapAuditLog,
};
