const { z } = require('zod');
const SchoolService = require('../services/school.service');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');
const { normalizeDoc } = require('../utils/serialize');

const uuidSchema = z.string().uuid();

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const schoolQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform(value => (value === undefined ? undefined : value === 'true')),
});

const schoolParamsSchema = z.object({
  id: uuidSchema,
});

const schoolBodySchema = z.object({
  nameAr: z.string().trim().min(1).max(255),
  nameEn: z.string().trim().min(1).max(255),
  licenseNumber: z.string().trim().min(1).max(100),
  addressAr: z.string().trim().optional(),
  addressEn: z.string().trim().optional(),
  governorateAr: z.string().trim().max(100).optional(),
  governorateEn: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email().optional(),
  logoUrl: z.string().trim().url().optional(),
  isActive: z.boolean().optional(),
});

const updateSchoolSchema = schoolBodySchema.partial().refine(data => Object.keys(data).length > 0, {
  message: 'At least one field is required',
});

async function listSchools(req, res) {
  const { data, meta } = await SchoolService.listSchools(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Schools retrieved', 200, meta);
}

async function getSchool(req, res) {
  const school = await SchoolService.getSchool(req.user.sub, req.params.id);
  sendSuccess(res, normalizeDoc(school), 'School retrieved');
}

async function createSchool(req, res) {
  const school = await SchoolService.createSchool(req.body);
  sendCreated(res, normalizeDoc(school), 'School created');
}

async function updateSchool(req, res) {
  const school = await SchoolService.updateSchool(req.user.sub, req.params.id, req.body);
  sendSuccess(res, normalizeDoc(school), 'School updated');
}

async function deleteSchool(req, res) {
  await SchoolService.deactivateSchool(req.user.sub, req.params.id);
  sendNoContent(res);
}

module.exports = {
  schoolQuerySchema,
  schoolParamsSchema,
  schoolBodySchema,
  updateSchoolSchema,
  listSchools,
  getSchool,
  createSchool,
  updateSchool,
  deleteSchool,
};
