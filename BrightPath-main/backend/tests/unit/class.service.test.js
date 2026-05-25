process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/brightpath';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-with-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-at-least-32-chars';

const SCHOOL_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CLASS_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const YEAR_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const GRADE_ID = '11111111-1111-4111-8111-111111111112';

const adminCtx = {
  userId: USER_ID,
  role: 'ADMIN',
  schoolIds: [SCHOOL_ID],
};

const mockPrisma = {
  school: { findUnique: jest.fn() },
  academicYear: { findUnique: jest.fn() },
  gradeLevel: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  class: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('../../src/lib/prisma', () => ({
  getPrisma: () => mockPrisma,
}));

jest.mock('../../src/services/access.service', () => ({
  getUserContext: jest.fn(),
  assertCanManageSchool: jest.fn(),
  assertCanManageClass: jest.fn(),
}));

jest.mock('../../src/services/audit.service', () => ({
  writeAuditLog: jest.fn(),
}));

const AccessService = require('../../src/services/access.service');
const AuditService = require('../../src/services/audit.service');
const ClassService = require('../../src/services/class.service');

function stubClassReferences() {
  mockPrisma.school.findUnique.mockResolvedValue({ id: SCHOOL_ID });
  mockPrisma.academicYear.findUnique.mockResolvedValue({ id: YEAR_ID, schoolId: SCHOOL_ID });
  mockPrisma.gradeLevel.findUnique.mockResolvedValue({ id: GRADE_ID, schoolId: SCHOOL_ID });
  mockPrisma.user.findUnique.mockResolvedValue(null);
}

describe('ClassService mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AccessService.getUserContext.mockResolvedValue(adminCtx);
    AccessService.assertCanManageSchool.mockImplementation(() => {});
    AccessService.assertCanManageClass.mockImplementation(() => {});
    stubClassReferences();
  });

  it('createClass writes INSERT audit log after success', async () => {
    const input = {
      schoolId: SCHOOL_ID,
      academicYearId: YEAR_ID,
      gradeLevelId: GRADE_ID,
      nameAr: 'الصف الأول',
      nameEn: 'Grade 1A',
      capacity: 30,
    };
    const created = { id: CLASS_ID, ...input, classSubjects: [], _count: { enrollments: 0 } };
    mockPrisma.class.create.mockResolvedValue(created);

    const result = await ClassService.createClass(USER_ID, input);

    expect(result.id).toBe(CLASS_ID);
    expect(AuditService.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        action: 'INSERT',
        tableName: 'classes',
        recordId: CLASS_ID,
        oldValues: null,
        newValues: created,
      })
    );
  });

  it('updateClass writes UPDATE audit with before and after', async () => {
    const existing = {
      id: CLASS_ID,
      schoolId: SCHOOL_ID,
      academicYearId: YEAR_ID,
      gradeLevelId: GRADE_ID,
      nameAr: 'قديم',
      nameEn: 'Old',
      homeroomTeacherId: null,
      classSubjects: [],
    };
    const updated = { ...existing, nameAr: 'جديد', _count: { enrollments: 0 }, classSubjects: [] };
    mockPrisma.class.findUnique.mockResolvedValue(existing);
    mockPrisma.class.update.mockResolvedValue(updated);

    await ClassService.updateClass(USER_ID, CLASS_ID, { nameAr: 'جديد' });

    expect(AuditService.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        tableName: 'classes',
        recordId: CLASS_ID,
        oldValues: existing,
        newValues: updated,
      })
    );
  });

  it('deleteClass writes DELETE audit with removed record', async () => {
    const existing = {
      id: CLASS_ID,
      schoolId: SCHOOL_ID,
      classSubjects: [],
    };
    mockPrisma.class.findUnique.mockResolvedValue(existing);
    mockPrisma.class.delete.mockResolvedValue(existing);

    await ClassService.deleteClass(USER_ID, CLASS_ID);

    expect(mockPrisma.class.delete).toHaveBeenCalledWith({ where: { id: CLASS_ID } });
    expect(AuditService.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        tableName: 'classes',
        recordId: CLASS_ID,
        oldValues: existing,
        newValues: null,
      })
    );
  });

  it('updateClass throws 404 when class is missing', async () => {
    mockPrisma.class.findUnique.mockResolvedValue(null);

    await expect(ClassService.updateClass(USER_ID, CLASS_ID, { nameAr: 'x' })).rejects.toMatchObject({
      statusCode: 404,
      message: 'Class not found',
    });
    expect(AuditService.writeAuditLog).not.toHaveBeenCalled();
  });
});
