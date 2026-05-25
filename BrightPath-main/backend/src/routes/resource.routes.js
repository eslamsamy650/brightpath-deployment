const { Router } = require('express');
const ResourceController = require('../controllers/resource.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');

const WRITE_ROLES = ['TEACHER', 'ADMIN', 'SUPER_ADMIN', 'REGISTRAR'];

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate(ResourceController.resourceQuerySchema, 'query'),
  asyncHandler(ResourceController.listResources)
);

router.post(
  '/',
  authorize(...WRITE_ROLES),
  validate(ResourceController.resourceBodySchema),
  asyncHandler(ResourceController.createResource)
);

router.get(
  '/:id',
  validate(ResourceController.idParamsSchema, 'params'),
  asyncHandler(ResourceController.getResource)
);

router.put(
  '/:id',
  authorize(...WRITE_ROLES),
  validate(ResourceController.idParamsSchema, 'params'),
  validate(ResourceController.updateResourceSchema),
  asyncHandler(ResourceController.updateResource)
);

router.delete(
  '/:id',
  authorize(...WRITE_ROLES),
  validate(ResourceController.idParamsSchema, 'params'),
  asyncHandler(ResourceController.deleteResource)
);

module.exports = router;
