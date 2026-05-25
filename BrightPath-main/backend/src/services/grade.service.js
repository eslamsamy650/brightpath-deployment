const { getPrisma } = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');
const {
  getUserContext,
  classVisibilityWhere,
  studentVisibilityWhere,
  assertCanManageClass,
} = require('./access.service');
const { scoreToLetter, letterToGpa } = require('../utils/grade');
const { mapStudentSummary } = require('../utils/serialize');

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

const gradeInclude = {
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
          class: {
            include: {
              classSubjects: { select: { teacherId: true } },
            },
          },
        },
      },
    },
  },
  enteredByUser: { select: { id: true, email: true } },
};

function numberOrNull(value) {
  return value == null ? null : Number(value);
}

function mapAssessmentSummary(assessment) {
  if (!assessment) return null;
  return {
    id: assessment.id,
    title: assessment.titleEn || assessment.titleAr,
    titleAr: assessment.titleAr,
    titleEn: assessment.titleEn,
    totalMarks: Number(assessment.totalMarks),
    assessmentDate: assessment.assessmentDate,
    termId: assessment.termId,
    classSubjectId: assessment.classSubjectId,
    assessmentType: assessment.assessmentType
      ? {
          id: assessment.assessmentType.id,
          name: assessment.assessmentType.nameEn || assessment.assessmentType.nameAr,
          weightPercent: Number(assessment.assessmentType.weightPercent),
        }
      : null,
    subject: assessment.classSubject?.subject
      ? {
          id: assessment.classSubject.subject.id,
          title: assessment.classSubject.subject.titleEn || assessment.classSubject.subject.titleAr,
          code: assessment.classSubject.subject.code,
        }
      : null,
    class: assessment.classSubject?.class
      ? {
          id: assessment.classSubject.class.id,
          name: assessment.classSubject.class.nameEn || assessment.classSubject.class.nameAr,
          schoolId: assessment.classSubject.class.schoolId,
        }
      : null,
  };
}

function mapGrade(row) {
  const marksObtained = numberOrNull(row.marksObtained);
  const totalMarks = numberOrNull(row.assessment?.totalMarks);
  const percentage = numberOrNull(row.percentage);
  const computedPercentage =
    percentage ??
    (marksObtained != null && totalMarks ? Math.round((marksObtained / totalMarks) * 10000) / 100 : null);
  const letterGrade =
    computedPercentage == null ? null : scoreToLetter(computedPercentage, 100);

  return {
    id: row.id,
    studentId: row.studentId,
    assessmentId: row.assessmentId,
    marksObtained,
    totalMarks,
    percentage: computedPercentage,
    letterGrade,
    gpaPoints: letterGrade ? letterToGpa(letterGrade) : null,
    isAbsent: row.isAbsent,
    notesAr: row.notesAr,
    notesEn: row.notesEn,
    enteredBy: row.enteredBy,
    enteredAt: row.enteredAt,
    student: mapStudentSummary(row.student),
    assessment: mapAssessmentSummary(row.assessment),
    enteredByUser: row.enteredByUser,
  };
}

function assessmentClass(assessment) {
  return assessment?.classSubject?.class;
}

async function getAssessmentForWrite(assessmentId) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      assessmentType: true,
      classSubject: {
        include: {
          class: { include: { classSubjects: { select: { teacherId: true } } } },
          subject: true,
          term: true,
        },
      },
    },
  });
  if (!assessment) throw new AppError('Assessment not found', 404);
  return assessment;
}

function assertCanGradeAssessment(ctx, assessment) {
  const cls = assessmentClass(assessment);
  if (!cls) throw new AppError('Assessment class not found', 404);
  assertCanManageClass(ctx, cls);
}

async function assertStudentInAssessmentClass(studentId, assessment) {
  const classId = assessment.classSubject.classId;
  const enrollment = await prisma.studentClassEnrollment.findFirst({
    where: { studentId, classId, withdrawalDate: null },
  });
  if (!enrollment) {
    throw new AppError('Student is not enrolled in the assessment class', 422);
  }
}

function gradeValues(input, assessment) {
  const isAbsent = Boolean(input.isAbsent);
  const marks = input.marksObtained == null ? null : Number(input.marksObtained);
  const totalMarks = Number(assessment.totalMarks);
  if (marks != null && marks > totalMarks) {
    throw new AppError('marksObtained cannot exceed assessment totalMarks', 422);
  }
  return {
    marksObtained: isAbsent ? null : marks,
    percentage: !isAbsent && marks != null ? Math.round((marks / totalMarks) * 10000) / 100 : null,
    isAbsent,
    notesAr: input.notesAr ?? null,
    notesEn: input.notesEn ?? input.notes ?? null,
  };
}

function buildGradeWhere(ctx, query) {
  const where = { AND: [{ student: studentVisibilityWhere(ctx) }] };
  if (query.studentId) where.AND.push({ studentId: query.studentId });
  if (query.assessmentId) where.AND.push({ assessmentId: query.assessmentId });
  if (query.termId) where.AND.push({ assessment: { termId: query.termId } });
  if (query.classId) {
    where.AND.push({ assessment: { classSubject: { classId: query.classId } } });
  }
  if (query.subjectId) {
    where.AND.push({ assessment: { classSubject: { subjectId: query.subjectId } } });
  }
  if (query.term) {
    where.AND.push({
      OR: [
        { assessment: { termId: query.term } },
        { assessment: { term: { termType: query.term } } },
        { assessment: { term: { nameEn: { contains: query.term, mode: 'insensitive' } } } },
      ],
    });
  }
  return where;
}

async function listGrades(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = buildGradeWhere(ctx, query);

  const [total, grades] = await Promise.all([
    prisma.studentGrade.count({ where }),
    prisma.studentGrade.findMany({
      where,
      orderBy: [{ assessment: { assessmentDate: 'desc' } }, { enteredAt: 'desc' }],
      skip,
      take,
      include: gradeInclude,
    }),
  ]);

  return {
    data: grades.map(mapGrade),
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

async function recordGrade(userId, input) {
  const ctx = await getUserContext(userId);
  const assessment = await getAssessmentForWrite(input.assessmentId);
  assertCanGradeAssessment(ctx, assessment);
  await assertStudentInAssessmentClass(input.studentId, assessment);

  const saved = await prisma.studentGrade.upsert({
    where: {
      studentId_assessmentId: {
        studentId: input.studentId,
        assessmentId: input.assessmentId,
      },
    },
    create: {
      studentId: input.studentId,
      assessmentId: input.assessmentId,
      ...gradeValues(input, assessment),
      enteredBy: userId,
    },
    update: {
      ...gradeValues(input, assessment),
      enteredBy: userId,
      enteredAt: new Date(),
    },
    include: gradeInclude,
  });
  return mapGrade(saved);
}

async function updateGrade(userId, gradeId, input) {
  const ctx = await getUserContext(userId);
  const existing = await prisma.studentGrade.findUnique({
    where: { id: gradeId },
    include: gradeInclude,
  });
  if (!existing) throw new AppError('Grade not found', 404);
  assertCanGradeAssessment(ctx, existing.assessment);

  const merged = {
    marksObtained: input.marksObtained ?? numberOrNull(existing.marksObtained),
    isAbsent: input.isAbsent ?? existing.isAbsent,
    notesAr: input.notesAr ?? existing.notesAr,
    notesEn: input.notesEn ?? input.notes ?? existing.notesEn,
  };

  const saved = await prisma.studentGrade.update({
    where: { id: gradeId },
    data: {
      ...gradeValues(merged, existing.assessment),
      enteredBy: userId,
      enteredAt: new Date(),
    },
    include: gradeInclude,
  });
  return mapGrade(saved);
}

async function listSubjectsForClass(userId, classId) {
  const ctx = await getUserContext(userId);
  const rows = await prisma.classSubject.findMany({
    where: { classId, class: classVisibilityWhere(ctx) },
    include: { subject: true, term: true },
    orderBy: { subject: { titleAr: 'asc' } },
  });
  return rows.map(row => ({
    id: row.subject.id,
    classSubjectId: row.id,
    titleAr: row.subject.titleAr,
    titleEn: row.subject.titleEn,
    title: row.subject.titleAr || row.subject.titleEn,
    termId: row.termId,
    term: row.term,
  }));
}

async function resolveTerm(classId, termInput) {
  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { academicYearId: true } });
  if (!cls) throw new AppError('Class not found', 404);
  const normalized = String(termInput || '').toLowerCase();
  const termType = normalized.includes('2') ? 'second' : normalized.includes('final') ? 'summer' : 'first';
  const term = await prisma.term.findFirst({
    where: {
      academicYearId: cls.academicYearId,
      OR: [
        { id: termInput },
        { termType },
        { nameEn: { contains: termInput, mode: 'insensitive' } },
      ],
    },
  });
  if (!term) throw new AppError('Term not found for class academic year', 404);
  return term;
}

async function resolveAssessmentType(schoolId, component) {
  const existing = await prisma.assessmentType.findFirst({
    where: { schoolId, nameEn: component },
  });
  if (existing) return existing;
  return prisma.assessmentType.create({
    data: {
      schoolId,
      nameAr: component,
      nameEn: component,
      weightPercent: 100,
    },
  });
}

async function recordBulkGrades(userId, input) {
  const ctx = await getUserContext(userId);
  const term = await resolveTerm(input.classId, input.term);
  const classSubject = await prisma.classSubject.findFirst({
    where: {
      classId: input.classId,
      subjectId: input.subjectId,
      termId: term.id,
      class: classVisibilityWhere(ctx),
    },
    include: { class: true, subject: true },
  });
  if (!classSubject) throw new AppError('Subject is not assigned to this class and term', 404);
  assertCanManageClass(ctx, classSubject.class);

  const grouped = new Map();
  for (const grade of input.grades) {
    const key = `${grade.component}:${grade.maxMark}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(grade);
  }

  const saved = [];
  for (const [key, grades] of grouped.entries()) {
    const [component, maxMark] = key.split(':');
    const assessmentType = await resolveAssessmentType(classSubject.class.schoolId, component);
    const assessment = await prisma.assessment.create({
      data: {
        classSubjectId: classSubject.id,
        assessmentTypeId: assessmentType.id,
        titleAr: component,
        titleEn: component,
        totalMarks: Number(maxMark),
        assessmentDate: grades.some(grade => grade.isFinal) ? new Date() : null,
        termId: term.id,
      },
      include: gradeInclude.assessment.include,
    });

    for (const grade of grades) {
      await assertStudentInAssessmentClass(grade.studentId, assessment);
      saved.push(await recordGrade(userId, {
        studentId: grade.studentId,
        assessmentId: assessment.id,
        marksObtained: grade.mark,
      }));
    }
  }
  return saved;
}

function gradeLabel(percent) {
  if (percent >= 90) return 'امتياز';
  if (percent >= 80) return 'جيد جداً';
  if (percent >= 65) return 'جيد';
  if (percent >= 50) return 'مقبول';
  return 'راسب';
}

function aggregateReportSubjects(grades) {
  const grouped = new Map();
  for (const grade of grades) {
    const subject = grade.assessment?.subject;
    const key = subject?.id || grade.assessment?.id || grade.id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        subject,
        maxMark: 0,
        mark: 0,
      });
    }
    const row = grouped.get(key);
    row.maxMark += Number(grade.totalMarks || 0);
    row.mark += Number(grade.marksObtained || 0);
  }
  return Array.from(grouped.values()).map(row => {
    const percent = row.maxMark ? Math.round((row.mark / row.maxMark) * 10000) / 100 : 0;
    return {
      ...row,
      percent,
      gradeLetter: gradeLabel(percent),
      pass: percent >= 50,
    };
  });
}

async function getReportCard(userId, studentId, query = {}) {
  const ctx = await getUserContext(userId);
  const student = await prisma.student.findFirst({
    where: { AND: [{ id: studentId }, studentVisibilityWhere(ctx)] },
    include: {
      school: true,
      enrollments: {
        where: { withdrawalDate: null },
        take: 1,
        include: { class: { include: { gradeLevel: true, academicYear: true } } },
      },
    },
  });
  if (!student) throw new AppError('Student not found', 404);
  const currentClass = student.enrollments[0]?.class || null;
  const term = currentClass && query.term ? await resolveTerm(currentClass.id, query.term) : null;
  const grades = await listGrades(userId, { studentId, limit: 100, term: query.term });
  const reportNotes = term
    ? await prisma.termReportCard.findFirst({
        where: { studentId, termId: term.id },
        orderBy: { publishedAt: 'desc' },
      })
    : null;
  const attendance = await prisma.attendanceRecord.findMany({ where: { studentId } });
  const attendanceApi = attendance.map(row => ({
    status: row.isExcused ? 'EXCUSED' : !row.isPresent ? 'ABSENT' : row.notesEn === 'LATE' || row.notesAr === 'LATE' ? 'LATE' : 'PRESENT',
  }));
  const attendanceSummary = attendanceApi.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  return {
    student,
    class: currentClass,
    school: student.school,
    academicYear: currentClass?.academicYear || null,
    subjects: aggregateReportSubjects(grades.data),
    attendanceSummary,
    remarks: reportNotes?.teacherNotesAr || reportNotes?.teacherNotesEn || '',
  };
}

async function saveRemarks(userId, input) {
  const ctx = await getUserContext(userId);
  const student = await prisma.student.findFirst({
    where: { AND: [{ id: input.studentId }, studentVisibilityWhere(ctx)] },
    include: {
      enrollments: {
        where: { withdrawalDate: null },
        take: 1,
        include: { class: true },
      },
    },
  });
  if (!student) throw new AppError('Student not found', 404);
  const cls = student.enrollments[0]?.class;
  if (!cls) throw new AppError('Student current class not found', 404);
  assertCanManageClass(ctx, cls);

  const term = await resolveTerm(cls.id, input.term);
  const classSubject = await prisma.classSubject.findFirst({
    where: { classId: cls.id, termId: term.id },
  });
  if (!classSubject) throw new AppError('Class subject not found for report card term', 404);

  return prisma.termReportCard.upsert({
    where: {
      studentId_termId_classSubjectId: {
        studentId: input.studentId,
        termId: term.id,
        classSubjectId: classSubject.id,
      },
    },
    create: {
      studentId: input.studentId,
      termId: term.id,
      classSubjectId: classSubject.id,
      teacherNotesAr: input.remarks || '',
      publishedAt: new Date(),
    },
    update: {
      teacherNotesAr: input.remarks || '',
      publishedAt: new Date(),
    },
  });
}

function assessmentVisibilityWhere(ctx) {
  return {
    classSubject: {
      class: classVisibilityWhere(ctx),
    },
  };
}

module.exports = {
  listGrades,
  recordGrade,
  updateGrade,
  listSubjectsForClass,
  recordBulkGrades,
  getReportCard,
  saveRemarks,
  mapGrade,
  mapAssessmentSummary,
  getAssessmentForWrite,
  assertCanGradeAssessment,
  assertStudentInAssessmentClass,
  assessmentVisibilityWhere,
  gradeValues,
};
