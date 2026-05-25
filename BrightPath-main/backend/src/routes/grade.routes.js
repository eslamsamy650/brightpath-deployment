const { Router } = require('express');
const GradeController = require('../controllers/grade.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(authenticate);

router.get(
  '/subjects',
  validate(GradeController.subjectsQuerySchema, 'query'),
  asyncHandler(GradeController.listSubjectsForClass)
);

router.get(
  '/report-card/:studentId',
  validate(GradeController.reportCardParamsSchema, 'params'),
  validate(GradeController.reportCardQuerySchema, 'query'),
  asyncHandler(GradeController.getReportCard)
);

router.get(
  '/',
  validate(GradeController.gradeQuerySchema, 'query'),
  asyncHandler(GradeController.listGrades)
);

router.post(
  '/bulk',
  authorize('SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'TEACHER'),
  validate(GradeController.bulkGradeSchema),
  asyncHandler(GradeController.recordBulkGrades)
);

router.post(
  '/remarks',
  authorize('SUPER_ADMIN', 'ADMIN', 'REGISTRAR'),
  validate(GradeController.remarksSchema),
  asyncHandler(GradeController.saveRemarks)
);

router.post(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'TEACHER'),
  validate(GradeController.gradeBodySchema),
  asyncHandler(GradeController.recordGrade)
);

router.put(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'TEACHER'),
  validate(GradeController.gradeParamsSchema, 'params'),
  validate(GradeController.updateGradeSchema),
  asyncHandler(GradeController.updateGrade)
);

module.exports = router;
