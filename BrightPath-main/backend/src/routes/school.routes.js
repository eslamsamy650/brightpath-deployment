const { Router } = require('express');
const SchoolController = require('../controllers/school.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate(SchoolController.schoolQuerySchema, 'query'),
  asyncHandler(SchoolController.listSchools)
);

router.post(
  '/',
  authorize('SUPER_ADMIN'),
  validate(SchoolController.schoolBodySchema),
  asyncHandler(SchoolController.createSchool)
);

router.get(
  '/:id',
  validate(SchoolController.schoolParamsSchema, 'params'),
  asyncHandler(SchoolController.getSchool)
);

router.put(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN'),
  validate(SchoolController.schoolParamsSchema, 'params'),
  validate(SchoolController.updateSchoolSchema),
  asyncHandler(SchoolController.updateSchool)
);

router.delete(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN'),
  validate(SchoolController.schoolParamsSchema, 'params'),
  asyncHandler(SchoolController.deleteSchool)
);

module.exports = router;
