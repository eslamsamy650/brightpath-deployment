process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/brightpath';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-with-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-at-least-32-chars';

const {
  assignmentBodySchema,
  updateAssignmentSchema,
} = require('../../src/controllers/assignment.controller');
const {
  gradeBodySchema,
  updateGradeSchema,
} = require('../../src/controllers/grade.controller');
const { schoolBodySchema } = require('../../src/controllers/school.controller');
const { classBodySchema } = require('../../src/controllers/class.controller');
const { gradeValues } = require('../../src/services/grade.service');

const uuid = '11111111-1111-4111-8111-111111111111';

describe('schoolBodySchema', () => {
  it('accepts the required school fields', () => {
    const parsed = schoolBodySchema.parse({
      nameAr: 'BrightPath School AR',
      nameEn: 'BrightPath School',
      licenseNumber: 'LIC-001',
      email: 'admin@brightpath.eg',
    });

    expect(parsed.licenseNumber).toBe('LIC-001');
  });
});

describe('classBodySchema', () => {
  it('accepts valid class references', () => {
    const parsed = classBodySchema.parse({
      schoolId: uuid,
      academicYearId: uuid,
      gradeLevelId: uuid,
      nameAr: '3A AR',
      nameEn: '3A',
      capacity: '35',
    });

    expect(parsed.capacity).toBe(35);
  });
});

describe('assignment schemas', () => {
  it('accepts an assessment-backed assignment', () => {
    const parsed = assignmentBodySchema.parse({
      classSubjectId: uuid,
      assessmentTypeId: uuid,
      title: 'Homework 1',
      totalMarks: '20',
    });

    expect(parsed.totalMarks).toBe(20);
  });

  it('requires at least one title field', () => {
    const result = assignmentBodySchema.safeParse({
      classSubjectId: uuid,
      assessmentTypeId: uuid,
      totalMarks: 20,
    });

    expect(result.success).toBe(false);
  });

  it('requires update payloads to contain a field', () => {
    expect(updateAssignmentSchema.safeParse({}).success).toBe(false);
  });
});

describe('grade schemas and values', () => {
  it('requires marks unless the student is absent', () => {
    expect(
      gradeBodySchema.safeParse({
        studentId: uuid,
        assessmentId: uuid,
      }).success
    ).toBe(false);

    expect(
      gradeBodySchema.safeParse({
        studentId: uuid,
        assessmentId: uuid,
        isAbsent: true,
      }).success
    ).toBe(true);
  });

  it('requires update payloads to contain a field', () => {
    expect(updateGradeSchema.safeParse({}).success).toBe(false);
  });

  it('computes percentages for persisted grades', () => {
    const values = gradeValues({ marksObtained: 45, isAbsent: false }, { totalMarks: 50 });

    expect(values.percentage).toBe(90);
  });
});
