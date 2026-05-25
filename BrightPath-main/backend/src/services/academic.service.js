const { getPrisma } = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');
const {
  getUserContext,
  assertSchoolAccess,
  assertCanManageSchool,
  assertCanManageClass,
  classVisibilityWhere,
} = require('./access.service');
const AuditService = require('./audit.service');

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

function paged(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  };
}

function schoolWhere(ctx, requestedSchoolId) {
  if (requestedSchoolId) {
    assertSchoolAccess(ctx, requestedSchoolId);
    return { schoolId: requestedSchoolId };
  }
  if (ctx.role === 'SUPER_ADMIN') return {};
  return { schoolId: { in: ctx.schoolIds } };
}

async function audit(userId, action, tableName, recordId, oldValues, newValues) {
  await AuditService.writeAuditLog({
    userId,
    action,
    tableName,
    recordId,
    oldValues,
    newValues,
  });
}

function mapAcademicYear(row) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    name: row.nameEn || row.nameAr,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    startDate: row.startDate,
    endDate: row.endDate,
    isCurrent: row.isCurrent,
    createdAt: row.createdAt,
    terms: row.terms,
  };
}

async function listAcademicYears(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = schoolWhere(ctx, query.schoolId);
  if (query.isCurrent !== undefined) where.isCurrent = query.isCurrent;
  const [total, rows] = await Promise.all([
    prisma.academicYear.count({ where }),
    prisma.academicYear.findMany({
      where,
      orderBy: { startDate: 'desc' },
      skip,
      take,
      include: { terms: { orderBy: { startDate: 'asc' } } },
    }),
  ]);
  return { data: rows.map(mapAcademicYear), meta: paged(total, page, limit) };
}

async function getAcademicYear(userId, id) {
  const ctx = await getUserContext(userId);
  const row = await prisma.academicYear.findUnique({
    where: { id },
    include: { terms: { orderBy: { startDate: 'asc' } } },
  });
  if (!row) throw new AppError('Academic year not found', 404);
  assertSchoolAccess(ctx, row.schoolId);
  return mapAcademicYear(row);
}

async function createAcademicYear(userId, input) {
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, input.schoolId);
  const row = await prisma.$transaction(async tx => {
    if (input.isCurrent) {
      await tx.academicYear.updateMany({
        where: { schoolId: input.schoolId },
        data: { isCurrent: false },
      });
    }
    return tx.academicYear.create({ data: input });
  });
  await audit(userId, 'INSERT', 'academic_years', row.id, null, row);
  return mapAcademicYear(row);
}

async function updateAcademicYear(userId, id, input) {
  const existing = await prisma.academicYear.findUnique({ where: { id } });
  if (!existing) throw new AppError('Academic year not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, existing.schoolId);
  const row = await prisma.$transaction(async tx => {
    if (input.isCurrent) {
      await tx.academicYear.updateMany({
        where: { schoolId: existing.schoolId },
        data: { isCurrent: false },
      });
    }
    return tx.academicYear.update({ where: { id }, data: input });
  });
  await audit(userId, 'UPDATE', 'academic_years', id, existing, row);
  return mapAcademicYear(row);
}

async function deleteAcademicYear(userId, id) {
  const existing = await prisma.academicYear.findUnique({ where: { id } });
  if (!existing) throw new AppError('Academic year not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, existing.schoolId);
  await prisma.academicYear.delete({ where: { id } });
  await audit(userId, 'DELETE', 'academic_years', id, existing, null);
}

function mapTerm(row) {
  return {
    id: row.id,
    academicYearId: row.academicYearId,
    schoolId: row.academicYear?.schoolId,
    termType: row.termType,
    name: row.nameEn || row.nameAr,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    startDate: row.startDate,
    endDate: row.endDate,
  };
}

async function listTerms(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = {};
  if (query.academicYearId) where.academicYearId = query.academicYearId;
  if (query.schoolId) {
    assertSchoolAccess(ctx, query.schoolId);
    where.academicYear = { schoolId: query.schoolId };
  } else if (ctx.role !== 'SUPER_ADMIN') {
    where.academicYear = { schoolId: { in: ctx.schoolIds } };
  }
  const [total, rows] = await Promise.all([
    prisma.term.count({ where }),
    prisma.term.findMany({
      where,
      orderBy: { startDate: 'asc' },
      skip,
      take,
      include: { academicYear: { select: { schoolId: true } } },
    }),
  ]);
  return { data: rows.map(mapTerm), meta: paged(total, page, limit) };
}

async function assertAcademicYearWrite(ctx, academicYearId) {
  const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!year) throw new AppError('Academic year not found', 404);
  assertCanManageSchool(ctx, year.schoolId);
  return year;
}

async function createTerm(userId, input) {
  const ctx = await getUserContext(userId);
  await assertAcademicYearWrite(ctx, input.academicYearId);
  const row = await prisma.term.create({ data: input });
  await audit(userId, 'INSERT', 'terms', row.id, null, row);
  return mapTerm(row);
}

async function updateTerm(userId, id, input) {
  const existing = await prisma.term.findUnique({
    where: { id },
    include: { academicYear: { select: { schoolId: true } } },
  });
  if (!existing) throw new AppError('Term not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, existing.academicYear.schoolId);
  const row = await prisma.term.update({ where: { id }, data: input });
  await audit(userId, 'UPDATE', 'terms', id, existing, row);
  return mapTerm(row);
}

async function deleteTerm(userId, id) {
  const existing = await prisma.term.findUnique({
    where: { id },
    include: { academicYear: { select: { schoolId: true } } },
  });
  if (!existing) throw new AppError('Term not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, existing.academicYear.schoolId);
  await prisma.term.delete({ where: { id } });
  await audit(userId, 'DELETE', 'terms', id, existing, null);
}

function mapGradeLevel(row) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    name: row.nameEn || row.nameAr,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    orderIndex: row.orderIndex,
    gradingSystem: row.gradingSystem,
  };
}

async function listGradeLevels(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = schoolWhere(ctx, query.schoolId);
  const [total, rows] = await Promise.all([
    prisma.gradeLevel.count({ where }),
    prisma.gradeLevel.findMany({ where, orderBy: { orderIndex: 'asc' }, skip, take }),
  ]);
  return { data: rows.map(mapGradeLevel), meta: paged(total, page, limit) };
}

async function createGradeLevel(userId, input) {
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, input.schoolId);
  const row = await prisma.gradeLevel.create({ data: input });
  await audit(userId, 'INSERT', 'grade_levels', row.id, null, row);
  return mapGradeLevel(row);
}

async function updateGradeLevel(userId, id, input) {
  const existing = await prisma.gradeLevel.findUnique({ where: { id } });
  if (!existing) throw new AppError('Grade level not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, existing.schoolId);
  const row = await prisma.gradeLevel.update({ where: { id }, data: input });
  await audit(userId, 'UPDATE', 'grade_levels', id, existing, row);
  return mapGradeLevel(row);
}

async function deleteGradeLevel(userId, id) {
  const existing = await prisma.gradeLevel.findUnique({ where: { id } });
  if (!existing) throw new AppError('Grade level not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, existing.schoolId);
  await prisma.gradeLevel.delete({ where: { id } });
  await audit(userId, 'DELETE', 'grade_levels', id, existing, null);
}

function mapSubject(row) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    title: row.titleEn || row.titleAr,
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    code: row.code,
    creditHours: row.creditHours == null ? null : Number(row.creditHours),
    isElective: row.isElective,
    createdAt: row.createdAt,
  };
}

async function listSubjects(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = schoolWhere(ctx, query.schoolId);
  if (query.q) {
    where.OR = [
      { titleEn: { contains: query.q, mode: 'insensitive' } },
      { titleAr: { contains: query.q, mode: 'insensitive' } },
      { code: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.subject.count({ where }),
    prisma.subject.findMany({ where, orderBy: [{ titleEn: 'asc' }, { titleAr: 'asc' }], skip, take }),
  ]);
  return { data: rows.map(mapSubject), meta: paged(total, page, limit) };
}

async function createSubject(userId, input) {
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, input.schoolId);
  const row = await prisma.subject.create({ data: input });
  await audit(userId, 'INSERT', 'subjects', row.id, null, row);
  return mapSubject(row);
}

async function updateSubject(userId, id, input) {
  const existing = await prisma.subject.findUnique({ where: { id } });
  if (!existing) throw new AppError('Subject not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, existing.schoolId);
  const row = await prisma.subject.update({ where: { id }, data: input });
  await audit(userId, 'UPDATE', 'subjects', id, existing, row);
  return mapSubject(row);
}

async function deleteSubject(userId, id) {
  const existing = await prisma.subject.findUnique({ where: { id } });
  if (!existing) throw new AppError('Subject not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, existing.schoolId);
  await prisma.subject.delete({ where: { id } });
  await audit(userId, 'DELETE', 'subjects', id, existing, null);
}

function mapClassSubject(row) {
  return {
    id: row.id,
    classId: row.classId,
    subjectId: row.subjectId,
    teacherId: row.teacherId,
    termId: row.termId,
    subject: row.subject ? mapSubject(row.subject) : undefined,
    class: row.class
      ? {
          id: row.class.id,
          schoolId: row.class.schoolId,
          name: row.class.nameEn || row.class.nameAr,
        }
      : undefined,
  };
}

async function listClassSubjects(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = { class: classVisibilityWhere(ctx) };
  if (query.classId) where.classId = query.classId;
  if (query.subjectId) where.subjectId = query.subjectId;
  if (query.termId) where.termId = query.termId;
  if (query.teacherId) where.teacherId = query.teacherId;
  const [total, rows] = await Promise.all([
    prisma.classSubject.count({ where }),
    prisma.classSubject.findMany({
      where,
      orderBy: { subject: { titleEn: 'asc' } },
      skip,
      take,
      include: { subject: true, class: true },
    }),
  ]);
  return { data: rows.map(mapClassSubject), meta: paged(total, page, limit) };
}

async function assertClassSubjectReferences(ctx, input) {
  const cls = await prisma.class.findUnique({ where: { id: input.classId } });
  if (!cls) throw new AppError('Class not found', 404);
  assertCanManageClass(ctx, { ...cls, classSubjects: [] });
  const [subject, term] = await Promise.all([
    prisma.subject.findUnique({ where: { id: input.subjectId } }),
    prisma.term.findUnique({
      where: { id: input.termId },
      include: { academicYear: { select: { schoolId: true } } },
    }),
  ]);
  if (!subject || subject.schoolId !== cls.schoolId) {
    throw new AppError('Subject not found for class school', 404);
  }
  if (!term || term.academicYear.schoolId !== cls.schoolId) {
    throw new AppError('Term not found for class school', 404);
  }
}

async function createClassSubject(userId, input) {
  const ctx = await getUserContext(userId);
  await assertClassSubjectReferences(ctx, input);
  const row = await prisma.classSubject.create({
    data: input,
    include: { subject: true, class: true },
  });
  await audit(userId, 'INSERT', 'class_subjects', row.id, null, row);
  return mapClassSubject(row);
}

async function updateClassSubject(userId, id, input) {
  const existing = await prisma.classSubject.findUnique({
    where: { id },
    include: { class: true },
  });
  if (!existing) throw new AppError('Class subject not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageClass(ctx, { ...existing.class, classSubjects: [] });
  await assertClassSubjectReferences(ctx, { ...existing, ...input });
  const row = await prisma.classSubject.update({
    where: { id },
    data: input,
    include: { subject: true, class: true },
  });
  await audit(userId, 'UPDATE', 'class_subjects', id, existing, row);
  return mapClassSubject(row);
}

async function deleteClassSubject(userId, id) {
  const existing = await prisma.classSubject.findUnique({
    where: { id },
    include: { class: true },
  });
  if (!existing) throw new AppError('Class subject not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageClass(ctx, { ...existing.class, classSubjects: [] });
  await prisma.classSubject.delete({ where: { id } });
  await audit(userId, 'DELETE', 'class_subjects', id, existing, null);
}

function mapAssessmentType(row) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    name: row.nameEn || row.nameAr,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    weightPercent: Number(row.weightPercent),
  };
}

async function listAssessmentTypes(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = schoolWhere(ctx, query.schoolId);
  const [total, rows] = await Promise.all([
    prisma.assessmentType.count({ where }),
    prisma.assessmentType.findMany({ where, orderBy: { nameEn: 'asc' }, skip, take }),
  ]);
  return { data: rows.map(mapAssessmentType), meta: paged(total, page, limit) };
}

async function createAssessmentType(userId, input) {
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, input.schoolId);
  const row = await prisma.assessmentType.create({ data: input });
  await audit(userId, 'INSERT', 'assessment_types', row.id, null, row);
  return mapAssessmentType(row);
}

async function updateAssessmentType(userId, id, input) {
  const existing = await prisma.assessmentType.findUnique({ where: { id } });
  if (!existing) throw new AppError('Assessment type not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, existing.schoolId);
  const row = await prisma.assessmentType.update({ where: { id }, data: input });
  await audit(userId, 'UPDATE', 'assessment_types', id, existing, row);
  return mapAssessmentType(row);
}

async function deleteAssessmentType(userId, id) {
  const existing = await prisma.assessmentType.findUnique({ where: { id } });
  if (!existing) throw new AppError('Assessment type not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, existing.schoolId);
  await prisma.assessmentType.delete({ where: { id } });
  await audit(userId, 'DELETE', 'assessment_types', id, existing, null);
}

function mapGradingScale(row) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    name: row.nameEn || row.nameAr,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    system: row.system,
    isDefault: row.isDefault,
    bands: Array.isArray(row.bands)
      ? row.bands.map(band => ({
          id: band.id,
          minPercentage: Number(band.minPercentage),
          maxPercentage: Number(band.maxPercentage),
          letterGrade: band.letterGrade,
          gpaPoints: band.gpaPoints == null ? null : Number(band.gpaPoints),
          labelAr: band.labelAr,
          labelEn: band.labelEn,
        }))
      : undefined,
  };
}

async function listGradingScales(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = schoolWhere(ctx, query.schoolId);
  if (query.system) where.system = query.system;
  const [total, rows] = await Promise.all([
    prisma.gradingScale.count({ where }),
    prisma.gradingScale.findMany({
      where,
      orderBy: { nameEn: 'asc' },
      skip,
      take,
      include: { bands: { orderBy: { minPercentage: 'desc' } } },
    }),
  ]);
  return { data: rows.map(mapGradingScale), meta: paged(total, page, limit) };
}

async function createGradingScale(userId, input) {
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, input.schoolId);
  const { bands = [], ...scaleInput } = input;
  const row = await prisma.gradingScale.create({
    data: {
      ...scaleInput,
      bands: { create: bands },
    },
    include: { bands: true },
  });
  await audit(userId, 'INSERT', 'grading_scales', row.id, null, row);
  return mapGradingScale(row);
}

async function updateGradingScale(userId, id, input) {
  const existing = await prisma.gradingScale.findUnique({
    where: { id },
    include: { bands: true },
  });
  if (!existing) throw new AppError('Grading scale not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, existing.schoolId);
  const { bands, ...scaleInput } = input;
  const row = await prisma.$transaction(async tx => {
    if (bands) {
      await tx.gradingScaleBand.deleteMany({ where: { scaleId: id } });
      await tx.gradingScaleBand.createMany({
        data: bands.map(band => ({ ...band, scaleId: id })),
      });
    }
    return tx.gradingScale.update({
      where: { id },
      data: scaleInput,
      include: { bands: true },
    });
  });
  await audit(userId, 'UPDATE', 'grading_scales', id, existing, row);
  return mapGradingScale(row);
}

async function deleteGradingScale(userId, id) {
  const existing = await prisma.gradingScale.findUnique({
    where: { id },
    include: { bands: true },
  });
  if (!existing) throw new AppError('Grading scale not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageSchool(ctx, existing.schoolId);
  await prisma.gradingScale.delete({ where: { id } });
  await audit(userId, 'DELETE', 'grading_scales', id, existing, null);
}

module.exports = {
  listAcademicYears,
  getAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  listTerms,
  createTerm,
  updateTerm,
  deleteTerm,
  listGradeLevels,
  createGradeLevel,
  updateGradeLevel,
  deleteGradeLevel,
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  listClassSubjects,
  createClassSubject,
  updateClassSubject,
  deleteClassSubject,
  listAssessmentTypes,
  createAssessmentType,
  updateAssessmentType,
  deleteAssessmentType,
  listGradingScales,
  createGradingScale,
  updateGradingScale,
  deleteGradingScale,
};
