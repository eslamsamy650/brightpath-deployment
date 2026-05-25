const { getPrisma } = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');
const { getUserContext } = require('./access.service');
const GradeService = require('./grade.service');

const prisma = getPrisma();

function clampPagination(page = 1, limit = 20) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

const assignmentInclude = {
  assessmentType: true,
  term: true,
  classSubject: {
    include: {
      subject: true,
      class: {
        include: {
          school: { select: { id: true, nameAr: true, nameEn: true } },
          gradeLevel: { select: { id: true, nameAr: true, nameEn: true } },
          classSubjects: { select: { teacherId: true } },
        },
      },
    },
  },
  _count: { select: { studentGrades: true } },
};

function mapAssignment(assessment) {
  const summary = GradeService.mapAssessmentSummary(assessment);
  return {
    ...summary,
    status: assessment.assessmentDate ? 'PUBLISHED' : 'DRAFT',
    publishedAt: assessment.assessmentDate,
    createdAt: assessment.createdAt,
    submissionCount: assessment._count?.studentGrades,
    school: assessment.classSubject?.class?.school
      ? {
          id: assessment.classSubject.class.school.id,
          name: assessment.classSubject.class.school.nameEn || assessment.classSubject.class.school.nameAr,
        }
      : null,
    gradeLevel: assessment.classSubject?.class?.gradeLevel
      ? {
          id: assessment.classSubject.class.gradeLevel.id,
          name:
            assessment.classSubject.class.gradeLevel.nameEn ||
            assessment.classSubject.class.gradeLevel.nameAr,
        }
      : null,
  };
}

function buildAssignmentWhere(ctx, query) {
  const where = { AND: [GradeService.assessmentVisibilityWhere(ctx)] };
  if (query.classId) where.AND.push({ classSubject: { classId: query.classId } });
  if (query.classSubjectId) where.AND.push({ classSubjectId: query.classSubjectId });
  if (query.termId) where.AND.push({ termId: query.termId });
  if (query.assessmentTypeId) where.AND.push({ assessmentTypeId: query.assessmentTypeId });
  if (query.status === 'DRAFT') where.AND.push({ assessmentDate: null });
  if (query.status === 'PUBLISHED') where.AND.push({ assessmentDate: { not: null } });
  return where;
}

async function listAssignments(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = buildAssignmentWhere(ctx, query);

  const [total, assignments] = await Promise.all([
    prisma.assessment.count({ where }),
    prisma.assessment.findMany({
      where,
      orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
      include: assignmentInclude,
    }),
  ]);

  return {
    data: assignments.map(mapAssignment),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
}

async function getAssignment(userId, id) {
  const ctx = await getUserContext(userId);
  const assessment = await prisma.assessment.findFirst({
    where: {
      AND: [{ id }, GradeService.assessmentVisibilityWhere(ctx)],
    },
    include: assignmentInclude,
  });
  if (!assessment) throw new AppError('Assignment not found', 404);
  return mapAssignment(assessment);
}

async function getAssignmentForWrite(id) {
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: assignmentInclude,
  });
  if (!assessment) throw new AppError('Assignment not found', 404);
  return assessment;
}

async function validateAssessmentReferences(input) {
  const classSubject = await prisma.classSubject.findUnique({
    where: { id: input.classSubjectId },
    include: {
      class: { include: { classSubjects: { select: { teacherId: true } } } },
      term: true,
    },
  });
  if (!classSubject) throw new AppError('Class subject not found', 404);

  const assessmentType = await prisma.assessmentType.findUnique({
    where: { id: input.assessmentTypeId },
  });
  if (!assessmentType || assessmentType.schoolId !== classSubject.class.schoolId) {
    throw new AppError('Assessment type not found for class school', 404);
  }

  const termId = input.termId ?? classSubject.termId;
  if (termId !== classSubject.termId) {
    throw new AppError('termId must match the class subject term', 422);
  }

  return { classSubject, termId };
}

async function createAssignment(userId, input) {
  const ctx = await getUserContext(userId);
  const refs = await validateAssessmentReferences(input);
  GradeService.assertCanGradeAssessment(ctx, {
    classSubject: {
      class: refs.classSubject.class,
    },
  });

  const assessment = await prisma.assessment.create({
    data: {
      classSubjectId: input.classSubjectId,
      assessmentTypeId: input.assessmentTypeId,
      titleAr: input.titleAr ?? input.title,
      titleEn: input.titleEn ?? input.title ?? input.titleAr,
      totalMarks: input.totalMarks,
      assessmentDate: input.assessmentDate ?? null,
      termId: refs.termId,
    },
    include: assignmentInclude,
  });
  return mapAssignment(assessment);
}

async function updateAssignment(userId, id, input) {
  const ctx = await getUserContext(userId);
  const existing = await getAssignmentForWrite(id);
  GradeService.assertCanGradeAssessment(ctx, existing);

  let data = {
    titleAr: input.titleAr ?? input.title,
    titleEn: input.titleEn ?? input.title ?? input.titleAr,
    totalMarks: input.totalMarks,
    assessmentDate: input.assessmentDate,
    assessmentTypeId: input.assessmentTypeId,
  };
  data = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));

  if (input.assessmentTypeId) {
    const assessmentType = await prisma.assessmentType.findUnique({
      where: { id: input.assessmentTypeId },
    });
    if (!assessmentType || assessmentType.schoolId !== existing.classSubject.class.schoolId) {
      throw new AppError('Assessment type not found for class school', 404);
    }
  }

  const assessment = await prisma.assessment.update({
    where: { id },
    data,
    include: assignmentInclude,
  });
  return mapAssignment(assessment);
}

async function publishAssignment(userId, id, input = {}) {
  const ctx = await getUserContext(userId);
  const existing = await getAssignmentForWrite(id);
  GradeService.assertCanGradeAssessment(ctx, existing);

  const assessment = await prisma.assessment.update({
    where: { id },
    data: { assessmentDate: input.assessmentDate ?? existing.assessmentDate ?? new Date() },
    include: assignmentInclude,
  });
  return mapAssignment(assessment);
}

async function deleteAssignment(userId, id) {
  const ctx = await getUserContext(userId);
  const existing = await getAssignmentForWrite(id);
  GradeService.assertCanGradeAssessment(ctx, existing);
  await prisma.assessment.delete({ where: { id } });
}

async function submitAssignment(userId, id, input = {}) {
  const ctx = await getUserContext(userId);
  if (ctx.role !== 'STUDENT' || !ctx.studentId) {
    throw new AppError('Only student accounts can submit assignments', 403);
  }
  const assessment = await getAssignmentForWrite(id);
  await GradeService.assertStudentInAssessmentClass(ctx.studentId, assessment);

  const submission = await prisma.studentGrade.upsert({
    where: {
      studentId_assessmentId: {
        studentId: ctx.studentId,
        assessmentId: id,
      },
    },
    create: {
      studentId: ctx.studentId,
      assessmentId: id,
      marksObtained: null,
      percentage: null,
      isAbsent: false,
      notesEn: input.notesEn ?? input.notes ?? null,
      notesAr: input.notesAr ?? null,
      enteredBy: userId,
    },
    update: {
      notesEn: input.notesEn ?? input.notes ?? undefined,
      notesAr: input.notesAr ?? undefined,
      enteredAt: new Date(),
    },
  });

  const hydrated = await prisma.studentGrade.findUnique({
    where: { id: submission.id },
    include: {
      student: {
        select: {
          id: true,
          firstNameAr: true,
          firstNameEn: true,
          lastNameAr: true,
          lastNameEn: true,
          studentIdNumber: true,
          photoUrl: true,
        },
      },
      assessment: {
        include: {
          assessmentType: true,
          term: true,
          classSubject: {
            include: {
              subject: true,
              class: { include: { classSubjects: { select: { teacherId: true } } } },
            },
          },
        },
      },
      enteredByUser: { select: { id: true, email: true } },
    },
  });
  return GradeService.mapGrade(hydrated);
}

async function gradeSubmission(userId, assignmentId, submissionId, input) {
  const existing = await prisma.studentGrade.findUnique({
    where: { id: submissionId },
    select: { assessmentId: true },
  });
  if (!existing || existing.assessmentId !== assignmentId) {
    throw new AppError('Submission not found', 404);
  }
  return GradeService.updateGrade(userId, submissionId, input);
}

module.exports = {
  listAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  publishAssignment,
  deleteAssignment,
  submitAssignment,
  gradeSubmission,
  mapAssignment,
};
