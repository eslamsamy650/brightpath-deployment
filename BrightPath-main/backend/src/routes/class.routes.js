const { Router } = require('express');
const ClassController = require('../controllers/class.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate(ClassController.classQuerySchema, 'query'),
  asyncHandler(ClassController.listClasses)
);

router.post(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN', 'REGISTRAR'),
  validate(ClassController.classBodySchema),
  asyncHandler(ClassController.createClass)
);

router.get(
  '/:id',
  validate(ClassController.classParamsSchema, 'params'),
  asyncHandler(ClassController.getClass)
);

router.get(
  '/:id/students',
  validate(ClassController.classParamsSchema, 'params'),
  validate(ClassController.paginationQuerySchema, 'query'),
  asyncHandler(ClassController.listClassStudents)
);

router.put(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN', 'REGISTRAR'),
  validate(ClassController.classParamsSchema, 'params'),
  validate(ClassController.updateClassSchema),
  asyncHandler(ClassController.updateClass)
);

router.delete(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN', 'REGISTRAR'),
  validate(ClassController.classParamsSchema, 'params'),
  asyncHandler(ClassController.deleteClass)
);

module.exports = router;
