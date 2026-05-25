const { Router } = require('express');
const AssignmentController = require('../controllers/assignment.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate(AssignmentController.assignmentQuerySchema, 'query'),
  asyncHandler(AssignmentController.listAssignments)
);

router.post(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'TEACHER'),
  validate(AssignmentController.assignmentBodySchema),
  asyncHandler(AssignmentController.createAssignment)
);

router.get(
  '/:id',
  validate(AssignmentController.assignmentParamsSchema, 'params'),
  asyncHandler(AssignmentController.getAssignment)
);

router.put(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'TEACHER'),
  validate(AssignmentController.assignmentParamsSchema, 'params'),
  validate(AssignmentController.updateAssignmentSchema),
  asyncHandler(AssignmentController.updateAssignment)
);

router.patch(
  '/:id/publish',
  authorize('SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'TEACHER'),
  validate(AssignmentController.assignmentParamsSchema, 'params'),
  validate(AssignmentController.publishAssignmentSchema),
  asyncHandler(AssignmentController.publishAssignment)
);

router.delete(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'TEACHER'),
  validate(AssignmentController.assignmentParamsSchema, 'params'),
  asyncHandler(AssignmentController.deleteAssignment)
);

router.post(
  '/:id/submissions',
  authorize('STUDENT'),
  validate(AssignmentController.assignmentParamsSchema, 'params'),
  validate(AssignmentController.submitAssignmentSchema),
  asyncHandler(AssignmentController.submitAssignment)
);

router.patch(
  '/:id/submissions/:sid/grade',
  authorize('SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'TEACHER'),
  validate(AssignmentController.gradeSubmissionParamsSchema, 'params'),
  validate(AssignmentController.gradeSubmissionSchema),
  asyncHandler(AssignmentController.gradeSubmission)
);

module.exports = router;
