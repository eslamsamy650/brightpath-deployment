const { Router } = require('express');
const { asyncHandler } = require('../middleware/asyncHandler');
const { authenticate } = require('../middleware/auth');
const PeopleController = require('../controllers/people.controller');
const { validate } = require('../middleware/validate');
const { sendSuccess, sendUnauthorized } = require('../utils/response');
const { getPrisma } = require('../lib/prisma');
const {
  normalizeDoc,
  mapStaffProfile,
  mapStudentProfile,
  mapParentProfile,
  mapStudentSummary,
} = require('../utils/serialize');
const { toApiRole } = require('../utils/roles');

const router = Router();
const prisma = getPrisma();

router.use(authenticate);

router.get('/me/settings', asyncHandler(PeopleController.getMySettings));

router.put(
  '/me/settings',
  validate(PeopleController.settingsSchema),
  asyncHandler(PeopleController.updateMySettings)
);

router.post(
  '/me/password',
  validate(PeopleController.changePasswordSchema),
  asyncHandler(PeopleController.changeMyPassword)
);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const uid = req.user.sub;
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, email: true, role: true, lastLoginAt: true },
    });

    if (!user) {
      sendUnauthorized(res);
      return;
    }

    const [staff, student, guardian] = await Promise.all([
      prisma.staffProfile.findUnique({ where: { userId: uid } }),
      prisma.student.findUnique({
        where: { userId: uid },
        include: {
          enrollments: {
            where: { withdrawalDate: null },
            orderBy: { enrollmentDate: 'desc' },
            take: 1,
            select: { classId: true },
          },
        },
      }),
      prisma.guardian.findUnique({
        where: { userId: uid },
        include: {
          studentGuardians: {
            include: {
              student: {
                select: {
                  id: true,
                  schoolId: true,
                  firstNameAr: true,
                  firstNameEn: true,
                  lastNameAr: true,
                  lastNameEn: true,
                  studentIdNumber: true,
                  photoUrl: true,
                  gender: true,
                  isActive: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const apiRole = toApiRole(user.role);
    const studentWithClass = student
      ? {
          ...student,
          currentClassId: student.enrollments[0]?.classId ?? null,
        }
      : null;

    const children = guardian
      ? (guardian.studentGuardians || [])
          .map(link => mapStudentSummary(link.student))
          .filter(Boolean)
      : studentWithClass
        ? [mapStudentSummary(studentWithClass)]
        : [];

    const payload = {
      id: user.id,
      email: user.email,
      role: apiRole,
      lastLoginAt: user.lastLoginAt,
      children,
      teacherProfile:
        apiRole === 'TEACHER' && staff ? mapStaffProfile(staff) : null,
      studentProfile: studentWithClass ? mapStudentProfile(studentWithClass) : null,
      parentProfile: guardian ? mapParentProfile(guardian) : null,
      adminProfile:
        (apiRole === 'ADMIN' || apiRole === 'SUPER_ADMIN') && staff
          ? mapStaffProfile(staff)
          : null,
      accountantProfile:
        (apiRole === 'ACCOUNTANT' || apiRole === 'REGISTRAR') && staff
          ? mapStaffProfile(staff)
          : null,
    };

    sendSuccess(res, normalizeDoc(payload));
  })
);

module.exports = router;
