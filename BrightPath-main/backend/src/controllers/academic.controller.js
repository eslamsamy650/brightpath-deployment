const { z } = require('zod');
const AcademicService = require('../services/academic.service');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');
const { normalizeDoc } = require('../utils/serialize');

const uuidSchema = z.string().uuid();
const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
const idParamsSchema = z.object({ id: uuidSchema });
const schoolScopedQuerySchema = paginationQuerySchema.extend({
  schoolId: uuidSchema.optional(),
});

const academicYearQuerySchema = schoolScopedQuerySchema.extend({
  isCurrent: z
    .enum(['true', 'false'])
    .optional()
    .transform(value => (value === undefined ? undefined : value === 'true')),
});
const academicYearBodySchema = z.object({
  schoolId: uuidSchema,
  nameAr: z.string().trim().min(1).max(50),
  nameEn: z.string().trim().min(1).max(50),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().optional(),
});

const termQuerySchema = paginationQuerySchema.extend({
  schoolId: uuidSchema.optional(),
  academicYearId: uuidSchema.optional(),
});
const termBodySchema = z.object({
  academicYearId: uuidSchema,
  termType: z.enum(['first', 'second', 'summer']),
  nameAr: z.string().trim().min(1).max(100),
  nameEn: z.string().trim().min(1).max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

const gradeLevelBodySchema = z.object({
  schoolId: uuidSchema,
  nameAr: z.string().trim().min(1).max(100),
  nameEn: z.string().trim().min(1).max(100),
  orderIndex: z.coerce.number().int().min(1).max(99),
  gradingSystem: z.enum(['thanaweya_amma', 'gpa', 'percentage']).optional(),
});

const subjectQuerySchema = schoolScopedQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
});
const subjectBodySchema = z.object({
  schoolId: uuidSchema,
  titleAr: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().min(1).max(200),
  code: z.string().trim().max(30).optional().nullable(),
  creditHours: z.coerce.number().positive().max(99).optional().nullable(),
  isElective: z.boolean().optional(),
});

const classSubjectQuerySchema = paginationQuerySchema.extend({
  classId: uuidSchema.optional(),
  subjectId: uuidSchema.optional(),
  termId: uuidSchema.optional(),
  teacherId: uuidSchema.optional(),
});
const classSubjectBodySchema = z.object({
  classId: uuidSchema,
  subjectId: uuidSchema,
  teacherId: uuidSchema.optional().nullable(),
  termId: uuidSchema,
});

const assessmentTypeBodySchema = z.object({
  schoolId: uuidSchema,
  nameAr: z.string().trim().min(1).max(100),
  nameEn: z.string().trim().min(1).max(100),
  weightPercent: z.coerce.number().min(0).max(100),
});

const gradingBandSchema = z.object({
  minPercentage: z.coerce.number().min(0).max(100),
  maxPercentage: z.coerce.number().min(0).max(100),
  letterGrade: z.string().trim().max(5).optional().nullable(),
  gpaPoints: z.coerce.number().min(0).max(4).optional().nullable(),
  labelAr: z.string().trim().max(50).optional().nullable(),
  labelEn: z.string().trim().max(50).optional().nullable(),
});
const gradingScaleQuerySchema = schoolScopedQuerySchema.extend({
  system: z.enum(['thanaweya_amma', 'gpa', 'percentage']).optional(),
});
const gradingScaleBodySchema = z.object({
  schoolId: uuidSchema,
  nameAr: z.string().trim().min(1).max(100),
  nameEn: z.string().trim().min(1).max(100),
  system: z.enum(['thanaweya_amma', 'gpa', 'percentage']),
  isDefault: z.boolean().optional(),
  bands: z.array(gradingBandSchema).optional(),
});

function partialBody(schema) {
  return schema.partial().refine(data => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });
}

function list(serviceMethod, message) {
  return async (req, res) => {
    const { data, meta } = await AcademicService[serviceMethod](req.user.sub, req.query);
    sendSuccess(res, normalizeDoc(data), message, 200, meta);
  };
}

function get(serviceMethod, message) {
  return async (req, res) => {
    const data = await AcademicService[serviceMethod](req.user.sub, req.params.id);
    sendSuccess(res, normalizeDoc(data), message);
  };
}

function create(serviceMethod, message) {
  return async (req, res) => {
    const data = await AcademicService[serviceMethod](req.user.sub, req.body);
    sendCreated(res, normalizeDoc(data), message);
  };
}

function update(serviceMethod, message) {
  return async (req, res) => {
    const data = await AcademicService[serviceMethod](req.user.sub, req.params.id, req.body);
    sendSuccess(res, normalizeDoc(data), message);
  };
}

function remove(serviceMethod) {
  return async (req, res) => {
    await AcademicService[serviceMethod](req.user.sub, req.params.id);
    sendNoContent(res);
  };
}

module.exports = {
  idParamsSchema,
  academicYearQuerySchema,
  academicYearBodySchema,
  updateAcademicYearSchema: partialBody(academicYearBodySchema.omit({ schoolId: true })),
  termQuerySchema,
  termBodySchema,
  updateTermSchema: partialBody(termBodySchema),
  schoolScopedQuerySchema,
  gradeLevelBodySchema,
  updateGradeLevelSchema: partialBody(gradeLevelBodySchema.omit({ schoolId: true })),
  subjectQuerySchema,
  subjectBodySchema,
  updateSubjectSchema: partialBody(subjectBodySchema.omit({ schoolId: true })),
  classSubjectQuerySchema,
  classSubjectBodySchema,
  updateClassSubjectSchema: partialBody(classSubjectBodySchema),
  assessmentTypeBodySchema,
  updateAssessmentTypeSchema: partialBody(assessmentTypeBodySchema.omit({ schoolId: true })),
  gradingScaleQuerySchema,
  gradingScaleBodySchema,
  updateGradingScaleSchema: partialBody(gradingScaleBodySchema.omit({ schoolId: true })),
  listAcademicYears: list('listAcademicYears', 'Academic years retrieved'),
  getAcademicYear: get('getAcademicYear', 'Academic year retrieved'),
  createAcademicYear: create('createAcademicYear', 'Academic year created'),
  updateAcademicYear: update('updateAcademicYear', 'Academic year updated'),
  deleteAcademicYear: remove('deleteAcademicYear'),
  listTerms: list('listTerms', 'Terms retrieved'),
  createTerm: create('createTerm', 'Term created'),
  updateTerm: update('updateTerm', 'Term updated'),
  deleteTerm: remove('deleteTerm'),
  listGradeLevels: list('listGradeLevels', 'Grade levels retrieved'),
  createGradeLevel: create('createGradeLevel', 'Grade level created'),
  updateGradeLevel: update('updateGradeLevel', 'Grade level updated'),
  deleteGradeLevel: remove('deleteGradeLevel'),
  listSubjects: list('listSubjects', 'Subjects retrieved'),
  createSubject: create('createSubject', 'Subject created'),
  updateSubject: update('updateSubject', 'Subject updated'),
  deleteSubject: remove('deleteSubject'),
  listClassSubjects: list('listClassSubjects', 'Class subjects retrieved'),
  createClassSubject: create('createClassSubject', 'Class subject created'),
  updateClassSubject: update('updateClassSubject', 'Class subject updated'),
  deleteClassSubject: remove('deleteClassSubject'),
  listAssessmentTypes: list('listAssessmentTypes', 'Assessment types retrieved'),
  createAssessmentType: create('createAssessmentType', 'Assessment type created'),
  updateAssessmentType: update('updateAssessmentType', 'Assessment type updated'),
  deleteAssessmentType: remove('deleteAssessmentType'),
  listGradingScales: list('listGradingScales', 'Grading scales retrieved'),
  createGradingScale: create('createGradingScale', 'Grading scale created'),
  updateGradingScale: update('updateGradingScale', 'Grading scale updated'),
  deleteGradingScale: remove('deleteGradingScale'),
};
