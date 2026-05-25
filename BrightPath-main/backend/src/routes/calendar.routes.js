const { Router } = require('express');
const CalendarController = require('../controllers/calendar.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');

const WRITE_ROLES = ['TEACHER', 'ADMIN', 'SUPER_ADMIN', 'REGISTRAR'];

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate(CalendarController.calendarQuerySchema, 'query'),
  asyncHandler(CalendarController.listCalendarEvents)
);

router.post(
  '/',
  authorize(...WRITE_ROLES),
  validate(CalendarController.calendarBodySchema),
  asyncHandler(CalendarController.createCalendarEvent)
);

router.get(
  '/:id',
  validate(CalendarController.idParamsSchema, 'params'),
  asyncHandler(CalendarController.getCalendarEvent)
);

router.put(
  '/:id',
  authorize(...WRITE_ROLES),
  validate(CalendarController.idParamsSchema, 'params'),
  validate(CalendarController.updateCalendarSchema),
  asyncHandler(CalendarController.updateCalendarEvent)
);

router.delete(
  '/:id',
  authorize(...WRITE_ROLES),
  validate(CalendarController.idParamsSchema, 'params'),
  asyncHandler(CalendarController.deleteCalendarEvent)
);

module.exports = router;
