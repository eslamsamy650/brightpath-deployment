const { z } = require('zod');
const ResourceService = require('../services/resource.service');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');
const { normalizeDoc } = require('../utils/serialize');

const uuidSchema = z.string().uuid();
const audienceSchema = z.enum(['ALL', 'TEACHERS', 'STUDENTS', 'PARENTS', 'CLASS']);
const resourceTypeSchema = z.enum(['LINK', 'FILE', 'DOCUMENT', 'IMAGE', 'VIDEO', 'OTHER']);
const idParamsSchema = z.object({ id: uuidSchema });

const resourceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  schoolId: uuidSchema.optional(),
  classId: uuidSchema.optional(),
  audience: audienceSchema.optional(),
  type: resourceTypeSchema.optional(),
  q: z.string().trim().max(100).optional(),
});

const resourceBodySchema = z
  .object({
    schoolId: uuidSchema.optional(),
    classId: uuidSchema.optional().nullable(),
    title: z.string().trim().min(1).max(255).optional(),
    titleAr: z.string().trim().min(1).max(255).optional(),
    titleEn: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().optional().nullable(),
    descriptionAr: z.string().trim().optional().nullable(),
    descriptionEn: z.string().trim().optional().nullable(),
    type: resourceTypeSchema.optional().default('LINK'),
    audience: audienceSchema.optional().default('ALL'),
    url: z.string().trim().url().optional().nullable(),
    fileName: z.string().trim().max(255).optional().nullable(),
    mimeType: z.string().trim().max(100).optional().nullable(),
    storagePath: z.string().trim().optional().nullable(),
    publishedAt: z.coerce.date().optional().nullable(),
    expiresAt: z.coerce.date().optional().nullable(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine(data => data.title || data.titleAr || data.titleEn, {
    message: 'title is required',
    path: ['title'],
  });

const updateResourceSchema = z
  .object({
    schoolId: uuidSchema.optional(),
    classId: uuidSchema.optional().nullable(),
    title: z.string().trim().min(1).max(255).optional(),
    titleAr: z.string().trim().min(1).max(255).optional(),
    titleEn: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().optional().nullable(),
    descriptionAr: z.string().trim().optional().nullable(),
    descriptionEn: z.string().trim().optional().nullable(),
    type: resourceTypeSchema.optional(),
    audience: audienceSchema.optional(),
    url: z.string().trim().url().optional().nullable(),
    fileName: z.string().trim().max(255).optional().nullable(),
    mimeType: z.string().trim().max(100).optional().nullable(),
    storagePath: z.string().trim().optional().nullable(),
    publishedAt: z.coerce.date().optional().nullable(),
    expiresAt: z.coerce.date().optional().nullable(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

async function listResources(req, res) {
  const { data, meta } = await ResourceService.listResources(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Resources retrieved', 200, meta);
}

async function getResource(req, res) {
  const data = await ResourceService.getResource(req.user.sub, req.params.id);
  sendSuccess(res, normalizeDoc(data), 'Resource retrieved');
}

async function createResource(req, res) {
  const data = await ResourceService.createResource(req.user.sub, req.body);
  sendCreated(res, normalizeDoc(data), 'Resource created');
}

async function updateResource(req, res) {
  const data = await ResourceService.updateResource(req.user.sub, req.params.id, req.body);
  sendSuccess(res, normalizeDoc(data), 'Resource updated');
}

async function deleteResource(req, res) {
  await ResourceService.deleteResource(req.user.sub, req.params.id);
  sendNoContent(res);
}

module.exports = {
  idParamsSchema,
  resourceQuerySchema,
  resourceBodySchema,
  updateResourceSchema,
  listResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
};
