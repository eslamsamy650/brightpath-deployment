const { z } = require('zod');
const NotificationService = require('../services/notification.service');
const { sendSuccess } = require('../utils/response');
const { normalizeDoc } = require('../utils/serialize');

const uuidSchema = z.string().uuid();

const notificationParamsSchema = z.object({
  id: uuidSchema,
});

const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform(value => value === 'true'),
});

async function listNotifications(req, res) {
  const { data, meta } = await NotificationService.listForUser(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Notifications retrieved', 200, meta);
}

async function markNotificationRead(req, res) {
  const read = await NotificationService.markRead(req.user.sub, req.params.id);
  sendSuccess(res, normalizeDoc(read), 'Notification marked read');
}

async function markAllNotificationsRead(req, res) {
  const result = await NotificationService.markAllRead(req.user.sub);
  sendSuccess(res, result, 'Notifications marked read');
}

module.exports = {
  notificationParamsSchema,
  notificationQuerySchema,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
