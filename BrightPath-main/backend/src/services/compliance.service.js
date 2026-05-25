const { getPrisma } = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');
const {
  getUserContext,
  assertCanManageSchool,
  studentVisibilityWhere,
} = require('./access.service');
const AuditService = require('./audit.service');

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

function meta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

function mapConsent(row) {
  return {
    id: row.id,
    studentId: row.studentId,
    guardianId: row.guardianId,
    consentStatus: row.consentStatus,
    consentVersion: row.consentVersion,
    consentTimestamp: row.consentTimestamp,
    revocationTimestamp: row.revocationTimestamp,
    revocationReason: row.revocationReason,
    dataCategories: row.dataCategories,
    retentionPeriodDays: row.retentionPeriodDays,
    collectionPurposeAr: row.collectionPurposeAr,
    collectionPurposeEn: row.collectionPurposeEn,
    createdAt: row.createdAt,
  };
}

async function listConsents(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = { student: studentVisibilityWhere(ctx) };
  if (query.studentId) where.studentId = query.studentId;
  if (query.guardianId) where.guardianId = query.guardianId;
  if (query.status) where.consentStatus = query.status;
  const [total, rows] = await Promise.all([
    prisma.dataConsent.count({ where }),
    prisma.dataConsent.findMany({
      where,
      orderBy: { consentTimestamp: 'desc' },
      skip,
      take,
    }),
  ]);
  return { data: rows.map(mapConsent), meta: meta(total, page, limit) };
}

async function createConsent(userId, input) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new AppError('Student not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, student.schoolId);
  const row = await prisma.dataConsent.create({ data: input });
  await AuditService.writeAuditLog({
    userId,
    action: 'INSERT',
    tableName: 'data_consent',
    recordId: row.id,
    newValues: row,
  });
  return mapConsent(row);
}

async function updateConsent(userId, id, input) {
  const existing = await prisma.dataConsent.findUnique({
    where: { id },
    include: { student: true },
  });
  if (!existing) throw new AppError('Consent not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, existing.student.schoolId);
  const row = await prisma.dataConsent.update({ where: { id }, data: input });
  await AuditService.writeAuditLog({
    userId,
    action: 'UPDATE',
    tableName: 'data_consent',
    recordId: id,
    oldValues: existing,
    newValues: row,
  });
  return mapConsent(row);
}

async function revokeConsent(userId, id, reason) {
  return updateConsent(userId, id, {
    consentStatus: 'revoked',
    revocationTimestamp: new Date(),
    revocationReason: reason ?? null,
  });
}

module.exports = {
  listConsents,
  createConsent,
  updateConsent,
  revokeConsent,
};
