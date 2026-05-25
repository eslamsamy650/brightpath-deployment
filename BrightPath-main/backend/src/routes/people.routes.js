const { Router } = require('express');
const PeopleController = require('../controllers/people.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');

const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR'];

function peopleCrud({ querySchema, bodySchema, updateSchema, handlers }) {
  const router = Router();
  router.use(authenticate);
  router.get('/', validate(querySchema, 'query'), asyncHandler(handlers.list));
  if (handlers.get) {
    router.get(
      '/:id',
      validate(PeopleController.idParamsSchema, 'params'),
      asyncHandler(handlers.get)
    );
  }
  router.post(
    '/',
    authorize(...WRITE_ROLES),
    validate(bodySchema),
    asyncHandler(handlers.create)
  );
  router.put(
    '/:id',
    authorize(...WRITE_ROLES),
    validate(PeopleController.idParamsSchema, 'params'),
    validate(updateSchema),
    asyncHandler(handlers.update)
  );
  return router;
}

const userRoutes = Router();
userRoutes.use(authenticate);
userRoutes.get(
  '/',
  authorize(...WRITE_ROLES, 'ACCOUNTANT'),
  validate(PeopleController.userQuerySchema, 'query'),
  asyncHandler(PeopleController.listUsers)
);
userRoutes.post(
  '/',
  authorize(...WRITE_ROLES),
  validate(PeopleController.userBodySchema),
  asyncHandler(PeopleController.createUser)
);
userRoutes.get(
  '/:id',
  authorize(...WRITE_ROLES, 'ACCOUNTANT'),
  validate(PeopleController.idParamsSchema, 'params'),
  asyncHandler(PeopleController.getUser)
);
userRoutes.put(
  '/:id',
  authorize(...WRITE_ROLES),
  validate(PeopleController.idParamsSchema, 'params'),
  validate(PeopleController.updateUserSchema),
  asyncHandler(PeopleController.updateUser)
);
userRoutes.post(
  '/:id/password',
  authorize(...WRITE_ROLES),
  validate(PeopleController.idParamsSchema, 'params'),
  validate(PeopleController.resetPasswordSchema),
  asyncHandler(PeopleController.resetUserPassword)
);

const staffRoutes = peopleCrud({
  querySchema: PeopleController.staffQuerySchema,
  bodySchema: PeopleController.staffBodySchema,
  updateSchema: PeopleController.updateStaffSchema,
  handlers: {
    list: PeopleController.listStaff,
    create: PeopleController.createStaff,
    update: PeopleController.updateStaff,
  },
});

const studentRoutes = peopleCrud({
  querySchema: PeopleController.studentQuerySchema,
  bodySchema: PeopleController.studentBodySchema,
  updateSchema: PeopleController.updateStudentSchema,
  handlers: {
    list: PeopleController.listStudents,
    get: PeopleController.getStudent,
    create: PeopleController.createStudent,
    update: PeopleController.updateStudent,
  },
});

const guardianRoutes = peopleCrud({
  querySchema: PeopleController.guardianQuerySchema,
  bodySchema: PeopleController.guardianBodySchema,
  updateSchema: PeopleController.updateGuardianSchema,
  handlers: {
    list: PeopleController.listGuardians,
    get: PeopleController.getGuardian,
    create: PeopleController.createGuardian,
    update: PeopleController.updateGuardian,
  },
});
guardianRoutes.post(
  '/links',
  authorize(...WRITE_ROLES),
  validate(PeopleController.guardianLinkSchema),
  asyncHandler(PeopleController.linkGuardian)
);
guardianRoutes.get(
  '/:id/students',
  validate(PeopleController.idParamsSchema, 'params'),
  asyncHandler(PeopleController.getGuardianStudents)
);

const enrollmentRoutes = Router();
enrollmentRoutes.use(authenticate);
enrollmentRoutes.post(
  '/',
  authorize(...WRITE_ROLES),
  validate(PeopleController.enrollmentBodySchema),
  asyncHandler(PeopleController.createEnrollment)
);
enrollmentRoutes.put(
  '/:id',
  authorize(...WRITE_ROLES),
  validate(PeopleController.idParamsSchema, 'params'),
  validate(PeopleController.updateEnrollmentSchema),
  asyncHandler(PeopleController.updateEnrollment)
);

module.exports = {
  userRoutes,
  staffRoutes,
  studentRoutes,
  guardianRoutes,
  enrollmentRoutes,
};
