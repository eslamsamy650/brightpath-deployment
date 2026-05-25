const { z } = require('zod');
const CalendarService = require('../services/calendar.service');
const { sendSuccess, sendCreated, sendNoContent } = require('../utils/response');
const { normalizeDoc } = require('../utils/serialize');

const uuidSchema = z.string().uuid();
const audienceSchema = z.enum(['ALL', 'TEACHERS', 'STUDENTS', 'PARENTS', 'CLASS']);
const idParamsSchema = z.object({ id: uuidSchema });
const calendarQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  schoolId: uuidSchema.optional(),
  classId: uuidSchema.optional(),
  audience: audienceSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const calendarBodySchema = z
  .object({
    schoolId: uuidSchema.optional(),
    classId: uuidSchema.optional().nullable(),
    title: z.string().trim().min(1).max(255).optional(),
    titleAr: z.string().trim().min(1).max(255).optional(),
    titleEn: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().optional().nullable(),
    descriptionAr: z.string().trim().optional().nullable(),
    descriptionEn: z.string().trim().optional().nullable(),
    audience: audienceSchema.optional().default('ALL'),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    allDay: z.boolean().optional(),
    location: z.string().trim().max(255).optional().nullable(),
    locationAr: z.string().trim().max(255).optional().nullable(),
    locationEn: z.string().trim().max(255).optional().nullable(),
    color: z.string().trim().max(20).optional().nullable(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine(data => data.title || data.titleAr || data.titleEn, {
    message: 'title is required',
    path: ['title'],
  });

const updateCalendarSchema = z
  .object({
    schoolId: uuidSchema.optional(),
    classId: uuidSchema.optional().nullable(),
    title: z.string().trim().min(1).max(255).optional(),
    titleAr: z.string().trim().min(1).max(255).optional(),
    titleEn: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().optional().nullable(),
    descriptionAr: z.string().trim().optional().nullable(),
    descriptionEn: z.string().trim().optional().nullable(),
    audience: audienceSchema.optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    allDay: z.boolean().optional(),
    location: z.string().trim().max(255).optional().nullable(),
    locationAr: z.string().trim().max(255).optional().nullable(),
    locationEn: z.string().trim().max(255).optional().nullable(),
    color: z.string().trim().max(20).optional().nullable(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

async function listCalendarEvents(req, res) {
  const { data, meta } = await CalendarService.listCalendarEvents(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Calendar events retrieved', 200, meta);
}

async function getCalendarEvent(req, res) {
  const data = await CalendarService.getCalendarEvent(req.user.sub, req.params.id);
  sendSuccess(res, normalizeDoc(data), 'Calendar event retrieved');
}

async function createCalendarEvent(req, res) {
  const data = await CalendarService.createCalendarEvent(req.user.sub, req.body);
  sendCreated(res, normalizeDoc(data), 'Calendar event created');
}

async function updateCalendarEvent(req, res) {
  const data = await CalendarService.updateCalendarEvent(req.user.sub, req.params.id, req.body);
  sendSuccess(res, normalizeDoc(data), 'Calendar event updated');
}

async function deleteCalendarEvent(req, res) {
  await CalendarService.deleteCalendarEvent(req.user.sub, req.params.id);
  sendNoContent(res);
}

module.exports = {
  idParamsSchema,
  calendarQuerySchema,
  calendarBodySchema,
  updateCalendarSchema,
  listCalendarEvents,
  getCalendarEvent,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
};
