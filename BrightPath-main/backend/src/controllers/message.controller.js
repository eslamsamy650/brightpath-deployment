const { z } = require('zod');
const MessageService = require('../services/message.service');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');
const { normalizeDoc } = require('../utils/serialize');

const uuidSchema = z.string().uuid();

const sendMessageSchema = z
  .object({
    receiverId: uuidSchema,
    body: z.string().trim().min(1).max(4000).optional(),
    content: z.string().trim().min(1).max(4000).optional(),
    preview: z.string().trim().min(1).max(4000).optional(),
  })
  .refine((data) => data.body || data.content || data.preview, {
    message: 'body is required',
    path: ['body'],
  });

const messageParamsSchema = z.object({
  id: uuidSchema,
});

const conversationParamsSchema = z.object({
  userId: uuidSchema,
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const inboxQuerySchema = paginationQuerySchema.extend({
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

const contactsQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'ACCOUNTANT', 'TEACHER', 'STUDENT', 'PARENT']).optional(),
});

async function listInbox(req, res) {
  const { data, meta } = await MessageService.listInbox(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Messages retrieved', 200, meta);
}

async function listContacts(req, res) {
  const { data, meta } = await MessageService.listEligibleRecipients(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Message contacts retrieved', 200, meta);
}

async function sendMessage(req, res) {
  const body = req.body.body ?? req.body.content ?? req.body.preview;
  const message = await MessageService.sendMessage({
    senderId: req.user.sub,
    receiverId: req.body.receiverId,
    body,
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${message.receiverId}`).emit('message:new', message);
    io.to(`user:${message.receiverId}`).emit('notification:push', {
      type: 'NEW_MESSAGE',
      title: 'New message',
      body: message.preview,
      data: {
        messageId: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
      },
    });
    io.to(`user:${message.senderId}`).emit('message:sent', message);
  }

  sendCreated(res, normalizeDoc(message), 'Message sent');
}

async function listConversationMessages(req, res) {
  const result = await MessageService.listConversationMessages(
    req.user.sub,
    req.params.userId,
    req.query
  );
  sendSuccess(res, normalizeDoc(result), 'Conversation retrieved');
}

async function getMessage(req, res) {
  const message = await MessageService.getMessage(req.user.sub, req.params.id);
  sendSuccess(res, normalizeDoc(message), 'Message retrieved');
}

async function deleteMessage(req, res) {
  await MessageService.deleteMessage(req.user.sub, req.params.id);
  sendNoContent(res);
}

async function addAttachments(req, res) {
  const message = await MessageService.addMessageAttachments(req.user.sub, req.params.id, req.files);
  sendSuccess(res, normalizeDoc(message), 'Attachments uploaded');
}

module.exports = {
  sendMessageSchema,
  messageParamsSchema,
  conversationParamsSchema,
  inboxQuerySchema,
  contactsQuerySchema,
  paginationQuerySchema,
  listInbox,
  listContacts,
  sendMessage,
  listConversationMessages,
  getMessage,
  deleteMessage,
  addAttachments,
};
