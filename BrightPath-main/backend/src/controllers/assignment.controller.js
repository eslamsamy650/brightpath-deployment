const { z } = require('zod');
const AssignmentService = require('../services/assignment.service');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');
const { normalizeDoc } = require('../utils/serialize');

const uuidSchema = z.string().uuid();

const assignmentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  classId: uuidSchema.optional(),
  classSubjectId: uuidSchema.optional(),
  termId: uuidSchema.optional(),
  assessmentTypeId: uuidSchema.optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

const assignmentParamsSchema = z.object({
  id: uuidSchema,
});

const gradeSubmissionParamsSchema = z.object({
  id: uuidSchema,
  sid: uuidSchema,
});

const assignmentBaseSchema = z.object({
    classSubjectId: uuidSchema,
    assessmentTypeId: uuidSchema,
    termId: uuidSchema.optional(),
    title: z.string().trim().min(1).max(200).optional(),
    titleAr: z.string().trim().min(1).max(200).optional(),
    titleEn: z.string().trim().min(1).max(200).optional(),
    totalMarks: z.coerce.number().positive().max(9999.99),
    assessmentDate: z.coerce.date().optional().nullable(),
  });

const assignmentBodySchema = assignmentBaseSchema
  .refine(data => data.title || data.titleAr || data.titleEn, {
    message: 'title is required',
    path: ['title'],
  });

const updateAssignmentSchema = assignmentBaseSchema
  .partial()
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

const publishAssignmentSchema = z.object({
  assessmentDate: z.coerce.date().optional(),
});

const submitAssignmentSchema = z.object({
  notes: z.string().trim().optional(),
  notesAr: z.string().trim().optional(),
  notesEn: z.string().trim().optional(),
});

const gradeSubmissionSchema = z
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

async function listAssignments(req, res) {
  const { data, meta } = await AssignmentService.listAssignments(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Assignments retrieved', 200, meta);
}

async function createAssignment(req, res) {
  const assignment = await AssignmentService.createAssignment(req.user.sub, req.body);
  sendCreated(res, normalizeDoc(assignment), 'Assignment created');
}

async function getAssignment(req, res) {
  const assignment = await AssignmentService.getAssignment(req.user.sub, req.params.id);
  sendSuccess(res, normalizeDoc(assignment), 'Assignment retrieved');
}

async function updateAssignment(req, res) {
  const assignment = await AssignmentService.updateAssignment(req.user.sub, req.params.id, req.body);
  sendSuccess(res, normalizeDoc(assignment), 'Assignment updated');
}

async function publishAssignment(req, res) {
  const assignment = await AssignmentService.publishAssignment(req.user.sub, req.params.id, req.body);
  sendSuccess(res, normalizeDoc(assignment), 'Assignment published');
}

async function deleteAssignment(req, res) {
  await AssignmentService.deleteAssignment(req.user.sub, req.params.id);
  sendNoContent(res);
}

async function submitAssignment(req, res) {
  const submission = await AssignmentService.submitAssignment(req.user.sub, req.params.id, req.body);
  sendCreated(res, normalizeDoc(submission), 'Assignment submitted');
}

async function gradeSubmission(req, res) {
  const submission = await AssignmentService.gradeSubmission(
    req.user.sub,
    req.params.id,
    req.params.sid,
    req.body
  );
  sendSuccess(res, normalizeDoc(submission), 'Submission graded');
}

module.exports = {
  assignmentQuerySchema,
  assignmentParamsSchema,
  gradeSubmissionParamsSchema,
  assignmentBodySchema,
  updateAssignmentSchema,
  publishAssignmentSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
  listAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  publishAssignment,
  deleteAssignment,
  submitAssignment,
  gradeSubmission,
};
