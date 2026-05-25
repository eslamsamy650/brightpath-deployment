const { Router } = require('express');
const MessageController = require('../controllers/message.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');
const { messageAttachmentUpload } = require('../middleware/upload');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate(MessageController.inboxQuerySchema, 'query'),
  asyncHandler(MessageController.listInbox)
);

router.get(
  '/contacts',
  validate(MessageController.contactsQuerySchema, 'query'),
  asyncHandler(MessageController.listContacts)
);

router.post(
  '/',
  validate(MessageController.sendMessageSchema),
  asyncHandler(MessageController.sendMessage)
);

router.get(
  '/conversations/:userId',
  validate(MessageController.conversationParamsSchema, 'params'),
  validate(MessageController.paginationQuerySchema, 'query'),
  asyncHandler(MessageController.listConversationMessages)
);

router.get(
  '/:id',
  validate(MessageController.messageParamsSchema, 'params'),
  asyncHandler(MessageController.getMessage)
);

router.post(
  '/:id/attachments',
  validate(MessageController.messageParamsSchema, 'params'),
  messageAttachmentUpload.array('attachments', 5),
  asyncHandler(MessageController.addAttachments)
);

router.delete(
  '/:id',
  validate(MessageController.messageParamsSchema, 'params'),
  asyncHandler(MessageController.deleteMessage)
);

module.exports = router;
