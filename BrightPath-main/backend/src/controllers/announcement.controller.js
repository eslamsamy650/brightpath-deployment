const { z } = require('zod');
const AnnouncementService = require('../services/announcement.service');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');
const { normalizeDoc } = require('../utils/serialize');

const uuidSchema = z.string().uuid();
const audienceSchema = z.enum(['ALL', 'TEACHERS', 'STUDENTS', 'PARENTS', 'CLASS']);
const prioritySchema = z.enum(['NORMAL', 'URGENT', 'INFO']);

const announcementParamsSchema = z.object({
  id: uuidSchema,
});

const announcementQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const createAnnouncementSchema = z
  .object({
    schoolId: uuidSchema.optional(),
    title: z.string().trim().min(1).max(255).optional(),
    titleAr: z.string().trim().min(1).max(255).optional(),
    titleEn: z.string().trim().min(1).max(255).optional(),
    body: z.string().trim().min(1).optional(),
    bodyAr: z.string().trim().min(1).optional(),
    bodyEn: z.string().trim().min(1).optional(),
    audience: audienceSchema.optional().default('ALL'),
    priority: prioritySchema.optional().default('NORMAL'),
    classId: uuidSchema.optional(),
    publishedAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional(),
  })
  .refine(data => data.title || data.titleAr || data.titleEn, {
    message: 'title is required',
    path: ['title'],
  })
  .refine(data => data.body || data.bodyAr || data.bodyEn, {
    message: 'body is required',
    path: ['body'],
  });

async function listAnnouncements(req, res) {
  const { data, meta } = await AnnouncementService.listAnnouncements(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Announcements retrieved', 200, meta);
}

async function createAnnouncement(req, res) {
  const announcement = await AnnouncementService.createAnnouncement(req.user.sub, req.body);
  sendCreated(res, normalizeDoc(announcement), 'Announcement created');
}

async function deleteAnnouncement(req, res) {
  await AnnouncementService.deleteAnnouncement(req.user.sub, req.params.id);
  sendNoContent(res);
}

module.exports = {
  announcementParamsSchema,
  announcementQuerySchema,
  createAnnouncementSchema,
  listAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
};
