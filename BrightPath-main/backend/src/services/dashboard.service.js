const AssignmentService = require('./assignment.service');
const GradeService = require('./grade.service');
const AnnouncementService = require('./announcement.service');
const NotificationService = require('./notification.service');
const ClassService = require('./class.service');
const PeopleService = require('./people.service');
const FinanceService = require('./finance.service');
const MessageService = require('./message.service');
const CalendarService = require('./calendar.service');
const ResourceService = require('./resource.service');
const { AppError } = require('../middleware/errorHandler');

const SECTION_HANDLERS = {
  assignments: AssignmentService.listAssignments,
  grades: GradeService.listGrades,
  announcements: AnnouncementService.listAnnouncements,
  notifications: NotificationService.listForUser,
  classes: ClassService.listClasses,
  students: PeopleService.listStudents,
  transactions: FinanceService.listTransactions,
  messages: MessageService.listInbox,
  calendar: CalendarService.listCalendarEvents,
  resources: ResourceService.listResources,
};

async function viewAll(userId, section, query = {}) {
  const handler = SECTION_HANDLERS[section];
  if (!handler) throw new AppError('Dashboard section not found', 404);
  return handler(userId, query);
}

module.exports = {
  viewAll,
  sections: Object.keys(SECTION_HANDLERS),
};
