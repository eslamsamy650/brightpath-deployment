const { Router } = require('express');
const AnnouncementController = require('../controllers/announcement.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate(AnnouncementController.announcementQuerySchema, 'query'),
  asyncHandler(AnnouncementController.listAnnouncements)
);

router.post(
  '/',
  authorize('TEACHER', 'ADMIN', 'SUPER_ADMIN', 'REGISTRAR'),
  validate(AnnouncementController.createAnnouncementSchema),
  asyncHandler(AnnouncementController.createAnnouncement)
);

router.delete(
  '/:id',
  authorize('TEACHER', 'ADMIN', 'SUPER_ADMIN', 'REGISTRAR'),
  validate(AnnouncementController.announcementParamsSchema, 'params'),
  asyncHandler(AnnouncementController.deleteAnnouncement)
);

module.exports = router;
