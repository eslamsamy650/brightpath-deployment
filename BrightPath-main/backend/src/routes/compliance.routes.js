const { Router } = require('express');
const ComplianceController = require('../controllers/compliance.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');

const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR'];

const consentRoutes = Router();
consentRoutes.use(authenticate);
consentRoutes.get(
  '/',
  validate(ComplianceController.consentQuerySchema, 'query'),
  asyncHandler(ComplianceController.listConsents)
);
consentRoutes.post(
  '/',
  authorize(...WRITE_ROLES),
  validate(ComplianceController.consentBodySchema),
  asyncHandler(ComplianceController.createConsent)
);
consentRoutes.put(
  '/:id',
  authorize(...WRITE_ROLES),
  validate(ComplianceController.idParamsSchema, 'params'),
  validate(ComplianceController.updateConsentSchema),
  asyncHandler(ComplianceController.updateConsent)
);
consentRoutes.patch(
  '/:id/revoke',
  authorize(...WRITE_ROLES),
  validate(ComplianceController.idParamsSchema, 'params'),
  validate(ComplianceController.revokeConsentSchema),
  asyncHandler(ComplianceController.revokeConsent)
);

const auditLogRoutes = Router();
auditLogRoutes.use(authenticate);
auditLogRoutes.get(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN'),
  validate(ComplianceController.auditLogQuerySchema, 'query'),
  asyncHandler(ComplianceController.listAuditLogs)
);

module.exports = {
  consentRoutes,
  auditLogRoutes,
};
