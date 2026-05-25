const { z } = require('zod');
const ComplianceService = require('../services/compliance.service');
const AuditService = require('../services/audit.service');
const { sendSuccess, sendCreated } = require('../utils/response');
const { normalizeDoc } = require('../utils/serialize');

const uuidSchema = z.string().uuid();
const idParamsSchema = z.object({ id: uuidSchema });
const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
const consentQuerySchema = paginationQuerySchema.extend({
  studentId: uuidSchema.optional(),
  guardianId: uuidSchema.optional(),
  status: z.enum(['granted', 'revoked', 'expired']).optional(),
});
const consentBodySchema = z.object({
  studentId: uuidSchema,
  guardianId: uuidSchema,
  consentStatus: z.enum(['granted', 'revoked', 'expired']).optional(),
  consentVersion: z.string().trim().min(1).max(20),
  guardianIdNumberEncrypted: z.string().trim().min(1),
  ipAddress: z.string().trim().optional().nullable(),
  collectionPurposeAr: z.string().trim().min(1),
  collectionPurposeEn: z.string().trim().optional().nullable(),
  dataCategories: z.array(z.string().trim().min(1)).default([]),
  retentionPeriodDays: z.coerce.number().int().min(1).optional(),
});
const updateConsentSchema = consentBodySchema
  .omit({ studentId: true, guardianId: true })
  .partial()
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field is required' });
const revokeConsentSchema = z.object({
  reason: z.string().trim().optional(),
});
const auditLogQuerySchema = paginationQuerySchema.extend({
  action: z.enum(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'EXPORT']).optional(),
  tableName: z.string().trim().max(100).optional(),
  recordId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
});

async function listConsents(req, res) {
  const { data, meta } = await ComplianceService.listConsents(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Consents retrieved', 200, meta);
}

async function createConsent(req, res) {
  const consent = await ComplianceService.createConsent(req.user.sub, req.body);
  sendCreated(res, normalizeDoc(consent), 'Consent captured');
}

async function updateConsent(req, res) {
  const consent = await ComplianceService.updateConsent(req.user.sub, req.params.id, req.body);
  sendSuccess(res, normalizeDoc(consent), 'Consent updated');
}

async function revokeConsent(req, res) {
  const consent = await ComplianceService.revokeConsent(req.user.sub, req.params.id, req.body.reason);
  sendSuccess(res, normalizeDoc(consent), 'Consent revoked');
}

async function listAuditLogs(req, res) {
  const { data, meta } = await AuditService.listAuditLogs(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Audit logs retrieved', 200, meta);
}

module.exports = {
  idParamsSchema,
  consentQuerySchema,
  consentBodySchema,
  updateConsentSchema,
  revokeConsentSchema,
  auditLogQuerySchema,
  listConsents,
  createConsent,
  updateConsent,
  revokeConsent,
  listAuditLogs,
};
