process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/brightpath';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-with-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-at-least-32-chars';

const { AppError } = require('../../src/middleware/errorHandler');

const SCHOOL_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const STUDENT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const GUARDIAN_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const adminCtx = {
  userId: USER_ID,
  role: 'ADMIN',
  schoolIds: [SCHOOL_ID],
};

const mockPrisma = {
  student: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  guardian: {
    findFirst: jest.fn(),
  },
};

jest.mock('../../src/lib/prisma', () => ({
  getPrisma: () => mockPrisma,
}));

jest.mock('../../src/services/access.service', () => ({
  getUserContext: jest.fn(),
  assertCanManageSchool: jest.fn(),
  studentVisibilityWhere: jest.fn(() => ({ schoolId: { in: [SCHOOL_ID] } })),
}));

jest.mock('../../src/services/audit.service', () => ({
  writeAuditLog: jest.fn(),
}));

const AccessService = require('../../src/services/access.service');
const AuditService = require('../../src/services/audit.service');
const PeopleService = require('../../src/services/people.service');

describe('PeopleService — students', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AccessService.getUserContext.mockResolvedValue(adminCtx);
    AccessService.assertCanManageSchool.mockImplementation(() => {});
  });

  it('getStudent returns mapped student when visible', async () => {
    const row = {
      id: STUDENT_ID,
      schoolId: SCHOOL_ID,
      firstNameAr: 'أحمد',
      lastNameAr: 'علي',
      firstNameEn: 'Ahmed',
      lastNameEn: 'Ali',
      user: null,
      enrollments: [],
      guardians: [],
    };
    mockPrisma.student.findFirst.mockResolvedValue(row);

    const result = await PeopleService.getStudent(USER_ID, STUDENT_ID);

    expect(result.id).toBe(STUDENT_ID);
    expect(mockPrisma.student.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [{ id: STUDENT_ID }, { schoolId: { in: [SCHOOL_ID] } }],
        }),
      })
    );
  });

  it('getStudent throws 404 when record is missing', async () => {
    mockPrisma.student.findFirst.mockResolvedValue(null);

    await expect(PeopleService.getStudent(USER_ID, STUDENT_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Student not found',
    });
  });

  it('createStudent scopes to school and writes audit log', async () => {
    const input = {
      schoolId: SCHOOL_ID,
      studentIdNumber: 'STU-001',
      firstNameAr: 'سارة',
      lastNameAr: 'محمد',
      gender: 'female',
      dateOfBirth: new Date('2015-01-01'),
    };
    const created = { id: STUDENT_ID, ...input, user: null };
    mockPrisma.student.create.mockResolvedValue(created);

    const result = await PeopleService.createStudent(USER_ID, input);

    expect(AccessService.assertCanManageSchool).toHaveBeenCalledWith(adminCtx, SCHOOL_ID);
    expect(mockPrisma.student.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: input })
    );
    expect(AuditService.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        action: 'INSERT',
        tableName: 'students',
        recordId: STUDENT_ID,
      })
    );
    expect(result.id).toBe(STUDENT_ID);
  });

  it('createStudent rejects unauthorized school management', async () => {
    AccessService.assertCanManageSchool.mockImplementation(() => {
      throw new AppError('You are not allowed to manage this school resource', 403);
    });

    await expect(
      PeopleService.createStudent(USER_ID, {
        schoolId: SCHOOL_ID,
        studentIdNumber: 'STU-002',
        firstNameAr: 'x',
        lastNameAr: 'y',
        gender: 'male',
        dateOfBirth: new Date('2015-01-01'),
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('updateStudent audits before/after and enforces school access', async () => {
    const existing = {
      id: STUDENT_ID,
      schoolId: SCHOOL_ID,
      firstNameAr: 'قديم',
      lastNameAr: 'اسم',
      isActive: true,
    };
    const updated = { ...existing, firstNameAr: 'جديد', user: null };
    mockPrisma.student.findUnique.mockResolvedValue(existing);
    mockPrisma.student.update.mockResolvedValue(updated);

    const result = await PeopleService.updateStudent(USER_ID, STUDENT_ID, { firstNameAr: 'جديد' });

    expect(AccessService.assertCanManageSchool).toHaveBeenCalledWith(adminCtx, SCHOOL_ID);
    expect(AuditService.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        tableName: 'students',
        recordId: STUDENT_ID,
        oldValues: existing,
        newValues: updated,
      })
    );
    expect(result.firstNameAr).toBe('جديد');
  });

  it('updateStudent throws 404 when student does not exist', async () => {
    mockPrisma.student.findUnique.mockResolvedValue(null);

    await expect(
      PeopleService.updateStudent(USER_ID, STUDENT_ID, { isActive: false })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('PeopleService — guardians', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AccessService.getUserContext.mockResolvedValue(adminCtx);
  });

  it('getGuardian scopes non-super-admin users to their schools', async () => {
    const row = {
      id: GUARDIAN_ID,
      firstNameAr: 'والد',
      lastNameAr: 'طالب',
      user: null,
      studentGuardians: [],
    };
    mockPrisma.guardian.findFirst.mockResolvedValue(row);

    const result = await PeopleService.getGuardian(USER_ID, GUARDIAN_ID);

    expect(result.id).toBe(GUARDIAN_ID);
    expect(mockPrisma.guardian.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: GUARDIAN_ID,
          studentGuardians: {
            some: { student: { is: { schoolId: { in: [SCHOOL_ID] } } } },
          },
        },
      })
    );
  });

  it('getGuardian allows super admin without school link filter', async () => {
    AccessService.getUserContext.mockResolvedValue({
      ...adminCtx,
      role: 'SUPER_ADMIN',
    });
    mockPrisma.guardian.findFirst.mockResolvedValue({
      id: GUARDIAN_ID,
      firstNameAr: 'x',
      lastNameAr: 'y',
      user: null,
      studentGuardians: [],
    });

    await PeopleService.getGuardian(USER_ID, GUARDIAN_ID);

    expect(mockPrisma.guardian.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: GUARDIAN_ID } })
    );
  });

  it('getGuardian throws 404 when guardian is not found', async () => {
    mockPrisma.guardian.findFirst.mockResolvedValue(null);

    await expect(PeopleService.getGuardian(USER_ID, GUARDIAN_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Guardian not found',
    });
  });
});
