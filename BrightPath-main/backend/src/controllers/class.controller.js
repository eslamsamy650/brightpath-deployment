const { z } = require('zod');
const ClassService = require('../services/class.service');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');
const { normalizeDoc } = require('../utils/serialize');

const uuidSchema = z.string().uuid();

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const classQuerySchema = paginationQuerySchema.extend({
  schoolId: uuidSchema.optional(),
  academicYearId: uuidSchema.optional(),
  gradeLevelId: uuidSchema.optional(),
  teacherId: uuidSchema.optional(),
});

const classParamsSchema = z.object({
  id: uuidSchema,
});

const classBodySchema = z.object({
  schoolId: uuidSchema,
  academicYearId: uuidSchema,
  gradeLevelId: uuidSchema,
  nameAr: z.string().trim().min(1).max(50),
  nameEn: z.string().trim().min(1).max(50),
  capacity: z.coerce.number().int().min(1).max(200).optional(),
  homeroomTeacherId: uuidSchema.optional().nullable(),
  roomNumber: z.string().trim().max(20).optional().nullable(),
});

const updateClassSchema = classBodySchema.partial().refine(data => Object.keys(data).length > 0, {
  message: 'At least one field is required',
});

async function listClasses(req, res) {
  const { data, meta } = await ClassService.listClasses(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Classes retrieved', 200, meta);
}

async function getClass(req, res) {
  const cls = await ClassService.getClass(req.user.sub, req.params.id);
  sendSuccess(res, normalizeDoc(cls), 'Class retrieved');
}

async function createClass(req, res) {
  const cls = await ClassService.createClass(req.user.sub, req.body);
  sendCreated(res, normalizeDoc(cls), 'Class created');
}

async function updateClass(req, res) {
  const cls = await ClassService.updateClass(req.user.sub, req.params.id, req.body);
  sendSuccess(res, normalizeDoc(cls), 'Class updated');
}

async function deleteClass(req, res) {
  await ClassService.deleteClass(req.user.sub, req.params.id);
  sendNoContent(res);
}

async function listClassStudents(req, res) {
  const { data, meta } = await ClassService.listClassStudents(req.user.sub, req.params.id, req.query);
  sendSuccess(res, normalizeDoc(data), 'Class students retrieved', 200, meta);
}

module.exports = {
  paginationQuerySchema,
  classQuerySchema,
  classParamsSchema,
  classBodySchema,
  updateClassSchema,
  listClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  listClassStudents,
};
