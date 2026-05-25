const { z } = require('zod');
const GradeService = require('../services/grade.service');
const { sendSuccess, sendCreated } = require('../utils/response');
const { normalizeDoc } = require('../utils/serialize');

const uuidSchema = z.string().uuid();

const gradeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  studentId: uuidSchema.optional(),
  assessmentId: uuidSchema.optional(),
  termId: uuidSchema.optional(),
  classId: uuidSchema.optional(),
  subjectId: uuidSchema.optional(),
  term: z.string().trim().optional(),
});

const gradeParamsSchema = z.object({
  id: uuidSchema,
});

const gradeBodySchema = z
  .object({
    studentId: uuidSchema,
    assessmentId: uuidSchema,
    marksObtained: z.coerce.number().min(0).optional().nullable(),
    isAbsent: z.boolean().optional().default(false),
    notes: z.string().trim().optional(),
    notesAr: z.string().trim().optional(),
    notesEn: z.string().trim().optional(),
  })
  .refine(data => data.isAbsent || data.marksObtained != null, {
    message: 'marksObtained is required unless the student is absent',
    path: ['marksObtained'],
  });

const updateGradeSchema = z
  .object({
    marksObtained: z.coerce.number().min(0).optional().nullable(),
    isAbsent: z.boolean().optional(),
    notes: z.string().trim().optional(),
    notesAr: z.string().trim().optional(),
    notesEn: z.string().trim().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });
const subjectsQuerySchema = z.object({ classId: uuidSchema });
const bulkGradeSchema = z.object({
  classId: uuidSchema,
  subjectId: uuidSchema,
  term: z.string().trim().min(1),
  grades: z.array(z.object({
    studentId: uuidSchema,
    mark: z.coerce.number().min(0),
    maxMark: z.coerce.number().positive(),
    component: z.string().trim().min(1),
    isFinal: z.boolean().optional(),
  })).min(1),
});
const reportCardParamsSchema = z.object({ studentId: uuidSchema });
const reportCardQuerySchema = z.object({
  term: z.string().trim().optional(),
  academicYear: z.string().trim().optional(),
});
const remarksSchema = z.object({
  studentId: uuidSchema,
  term: z.string().trim().optional(),
  academicYear: z.string().trim().optional(),
  remarks: z.string().trim().max(2000).optional(),
});

async function listGrades(req, res) {
  const { data, meta } = await GradeService.listGrades(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Grades retrieved', 200, meta);
}

async function recordGrade(req, res) {
  const grade = await GradeService.recordGrade(req.user.sub, req.body);
  sendCreated(res, normalizeDoc(grade), 'Grade recorded');
}

async function updateGrade(req, res) {
  const grade = await GradeService.updateGrade(req.user.sub, req.params.id, req.body);
  sendSuccess(res, normalizeDoc(grade), 'Grade updated');
}

async function listSubjectsForClass(req, res) {
  const data = await GradeService.listSubjectsForClass(req.user.sub, req.query.classId);
  sendSuccess(res, normalizeDoc(data), 'Subjects retrieved');
}

async function recordBulkGrades(req, res) {
  const data = await GradeService.recordBulkGrades(req.user.sub, req.body);
  sendCreated(res, normalizeDoc(data), 'Grades saved');
}

async function getReportCard(req, res) {
  const data = await GradeService.getReportCard(req.user.sub, req.params.studentId, req.query);
  sendSuccess(res, normalizeDoc(data), 'Report card retrieved');
}

async function saveRemarks(req, res) {
  const data = await GradeService.saveRemarks(req.user.sub, req.body);
  sendSuccess(res, normalizeDoc(data), 'Remarks saved');
}

module.exports = {
  gradeQuerySchema,
  gradeParamsSchema,
  gradeBodySchema,
  updateGradeSchema,
  subjectsQuerySchema,
  bulkGradeSchema,
  reportCardParamsSchema,
  reportCardQuerySchema,
  remarksSchema,
  listGrades,
  recordGrade,
  updateGrade,
  listSubjectsForClass,
  recordBulkGrades,
  getReportCard,
  saveRemarks,
};
