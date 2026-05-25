const { Router } = require('express');
const AcademicController = require('../controllers/academic.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');

const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR'];

function crudRouter({ querySchema, bodySchema, updateSchema, handlers, includeGet = false }) {
  const router = Router();
  router.use(authenticate);
  router.get('/', validate(querySchema, 'query'), asyncHandler(handlers.list));
  router.post(
    '/',
    authorize(...WRITE_ROLES),
    validate(bodySchema),
    asyncHandler(handlers.create)
  );
  if (includeGet) {
    router.get(
      '/:id',
      validate(AcademicController.idParamsSchema, 'params'),
      asyncHandler(handlers.get)
    );
  }
  router.put(
    '/:id',
    authorize(...WRITE_ROLES),
    validate(AcademicController.idParamsSchema, 'params'),
    validate(updateSchema),
    asyncHandler(handlers.update)
  );
  router.delete(
    '/:id',
    authorize(...WRITE_ROLES),
    validate(AcademicController.idParamsSchema, 'params'),
    asyncHandler(handlers.delete)
  );
  return router;
}

const academicYearRoutes = crudRouter({
  querySchema: AcademicController.academicYearQuerySchema,
  bodySchema: AcademicController.academicYearBodySchema,
  updateSchema: AcademicController.updateAcademicYearSchema,
  includeGet: true,
  handlers: {
    list: AcademicController.listAcademicYears,
    get: AcademicController.getAcademicYear,
    create: AcademicController.createAcademicYear,
    update: AcademicController.updateAcademicYear,
    delete: AcademicController.deleteAcademicYear,
  },
});

const termRoutes = crudRouter({
  querySchema: AcademicController.termQuerySchema,
  bodySchema: AcademicController.termBodySchema,
  updateSchema: AcademicController.updateTermSchema,
  handlers: {
    list: AcademicController.listTerms,
    create: AcademicController.createTerm,
    update: AcademicController.updateTerm,
    delete: AcademicController.deleteTerm,
  },
});

const gradeLevelRoutes = crudRouter({
  querySchema: AcademicController.schoolScopedQuerySchema,
  bodySchema: AcademicController.gradeLevelBodySchema,
  updateSchema: AcademicController.updateGradeLevelSchema,
  handlers: {
    list: AcademicController.listGradeLevels,
    create: AcademicController.createGradeLevel,
    update: AcademicController.updateGradeLevel,
    delete: AcademicController.deleteGradeLevel,
  },
});

const subjectRoutes = crudRouter({
  querySchema: AcademicController.subjectQuerySchema,
  bodySchema: AcademicController.subjectBodySchema,
  updateSchema: AcademicController.updateSubjectSchema,
  handlers: {
    list: AcademicController.listSubjects,
    create: AcademicController.createSubject,
    update: AcademicController.updateSubject,
    delete: AcademicController.deleteSubject,
  },
});

const classSubjectRoutes = crudRouter({
  querySchema: AcademicController.classSubjectQuerySchema,
  bodySchema: AcademicController.classSubjectBodySchema,
  updateSchema: AcademicController.updateClassSubjectSchema,
  handlers: {
    list: AcademicController.listClassSubjects,
    create: AcademicController.createClassSubject,
    update: AcademicController.updateClassSubject,
    delete: AcademicController.deleteClassSubject,
  },
});

const assessmentTypeRoutes = crudRouter({
  querySchema: AcademicController.schoolScopedQuerySchema,
  bodySchema: AcademicController.assessmentTypeBodySchema,
  updateSchema: AcademicController.updateAssessmentTypeSchema,
  handlers: {
    list: AcademicController.listAssessmentTypes,
    create: AcademicController.createAssessmentType,
    update: AcademicController.updateAssessmentType,
    delete: AcademicController.deleteAssessmentType,
  },
});

const gradingScaleRoutes = crudRouter({
  querySchema: AcademicController.gradingScaleQuerySchema,
  bodySchema: AcademicController.gradingScaleBodySchema,
  updateSchema: AcademicController.updateGradingScaleSchema,
  handlers: {
    list: AcademicController.listGradingScales,
    create: AcademicController.createGradingScale,
    update: AcademicController.updateGradingScale,
    delete: AcademicController.deleteGradingScale,
  },
});

module.exports = {
  academicYearRoutes,
  termRoutes,
  gradeLevelRoutes,
  subjectRoutes,
  classSubjectRoutes,
  assessmentTypeRoutes,
  gradingScaleRoutes,
};
