const { Router } = require('express');
const NotificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate(NotificationController.notificationQuerySchema, 'query'),
  asyncHandler(NotificationController.listNotifications)
);

router.patch('/read-all', asyncHandler(NotificationController.markAllNotificationsRead));
router.put('/read-all', asyncHandler(NotificationController.markAllNotificationsRead));

router.patch(
  '/:id/read',
  validate(NotificationController.notificationParamsSchema, 'params'),
  asyncHandler(NotificationController.markNotificationRead)
);
router.put(
  '/:id/read',
  validate(NotificationController.notificationParamsSchema, 'params'),
  asyncHandler(NotificationController.markNotificationRead)
);

module.exports = router;
