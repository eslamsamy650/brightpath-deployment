const { getPrisma } = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');
const {
  getUserContext,
  assertCanManageSchool,
  assertSchoolAccess,
  studentVisibilityWhere,
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

function meta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

function money(value) {
  return value == null ? null : Number(value);
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

function financeSchoolWhere(ctx, requestedSchoolId) {
  if (requestedSchoolId) {
    assertSchoolAccess(ctx, requestedSchoolId);
    return { schoolId: requestedSchoolId };
  }
  if (ctx.role === 'SUPER_ADMIN') return {};
  return { schoolId: { in: ctx.schoolIds } };
}

function canManageFinance(ctx) {
  return ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'ACCOUNTANT'].includes(ctx.role);
}

function assertCanManageFinance(ctx, schoolId) {
  if (!canManageFinance(ctx)) throw new AppError('You are not allowed to manage finance records', 403);
  assertCanManageSchool(ctx, schoolId);
}

function mapFeeStructure(row) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    academicYearId: row.academicYearId,
    gradeLevelId: row.gradeLevelId,
    category: row.category,
    name: row.nameEn || row.nameAr,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    amountEgp: money(row.amountEgp),
    isMandatory: row.isMandatory,
    dueDate: row.dueDate,
    createdAt: row.createdAt,
  };
}

async function listFeeStructures(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = financeSchoolWhere(ctx, query.schoolId);
  if (query.academicYearId) where.academicYearId = query.academicYearId;
  if (query.gradeLevelId) where.gradeLevelId = query.gradeLevelId;
  if (query.category) where.category = query.category;
  const [total, rows] = await Promise.all([
    prisma.feeStructure.count({ where }),
    prisma.feeStructure.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
  ]);
  return { data: rows.map(mapFeeStructure), meta: meta(total, page, limit) };
}

async function createFeeStructure(userId, input) {
  const ctx = await getUserContext(userId);
  assertCanManageFinance(ctx, input.schoolId);
  const row = await prisma.feeStructure.create({ data: input });
  await audit(userId, 'INSERT', 'fee_structures', row.id, null, row);
  return mapFeeStructure(row);
}

async function updateFeeStructure(userId, id, input) {
  const existing = await prisma.feeStructure.findUnique({ where: { id } });
  if (!existing) throw new AppError('Fee structure not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageFinance(ctx, existing.schoolId);
  const row = await prisma.feeStructure.update({ where: { id }, data: input });
  await audit(userId, 'UPDATE', 'fee_structures', id, existing, row);
  return mapFeeStructure(row);
}

function mapInstallmentPlan(row) {
  return {
    id: row.id,
    feeStructureId: row.feeStructureId,
    studentId: row.studentId,
    planName: row.planNameEn || row.planNameAr,
    planNameAr: row.planNameAr,
    planNameEn: row.planNameEn,
    totalAmountEgp: money(row.totalAmountEgp),
    discountEgp: money(row.discountEgp),
    notesAr: row.notesAr,
    notesEn: row.notesEn,
    createdAt: row.createdAt,
    schedule: Array.isArray(row.schedule) ? row.schedule.map(mapInstallmentSchedule) : undefined,
  };
}

function mapInstallmentSchedule(row) {
  return {
    id: row.id,
    planId: row.planId,
    installmentNo: row.installmentNo,
    dueDate: row.dueDate,
    amountEgp: money(row.amountEgp),
    status: row.status,
    paidAt: row.paidAt,
  };
}

async function listInstallmentPlans(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = {};
  if (query.studentId) where.studentId = query.studentId;
  if (query.feeStructureId) where.feeStructureId = query.feeStructureId;
  if (query.schoolId) {
    assertSchoolAccess(ctx, query.schoolId);
    where.student = { schoolId: query.schoolId };
  } else if (canManageFinance(ctx) && ctx.role !== 'SUPER_ADMIN') {
    where.student = { schoolId: { in: ctx.schoolIds } };
  } else if (!canManageFinance(ctx)) {
    where.student = studentVisibilityWhere(ctx);
  }
  const [total, rows] = await Promise.all([
    prisma.installmentPlan.count({ where }),
    prisma.installmentPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { schedule: { orderBy: { installmentNo: 'asc' } } },
    }),
  ]);
  return { data: rows.map(mapInstallmentPlan), meta: meta(total, page, limit) };
}

async function createInstallmentPlan(userId, input) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new AppError('Student not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageFinance(ctx, student.schoolId);
  const { schedule = [], ...plan } = input;
  const row = await prisma.installmentPlan.create({
    data: {
      ...plan,
      schedule: { create: schedule },
    },
    include: { schedule: true },
  });
  await audit(userId, 'INSERT', 'installment_plans', row.id, null, row);
  return mapInstallmentPlan(row);
}

async function updateInstallmentPlan(userId, id, input) {
  const existing = await prisma.installmentPlan.findUnique({
    where: { id },
    include: { student: true },
  });
  if (!existing) throw new AppError('Installment plan not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageFinance(ctx, existing.student.schoolId);
  const { schedule, ...plan } = input;
  const row = await prisma.$transaction(async tx => {
    if (schedule) {
      await tx.installmentSchedule.deleteMany({ where: { planId: id } });
      await tx.installmentSchedule.createMany({
        data: schedule.map(item => ({ ...item, planId: id })),
      });
    }
    return tx.installmentPlan.update({
      where: { id },
      data: plan,
      include: { schedule: { orderBy: { installmentNo: 'asc' } } },
    });
  });
  await audit(userId, 'UPDATE', 'installment_plans', id, existing, row);
  return mapInstallmentPlan(row);
}

async function updateInstallmentSchedule(userId, id, input) {
  const existing = await prisma.installmentSchedule.findUnique({
    where: { id },
    include: { plan: { include: { student: true } } },
  });
  if (!existing) throw new AppError('Installment not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageFinance(ctx, existing.plan.student.schoolId);
  const row = await prisma.installmentSchedule.update({ where: { id }, data: input });
  await audit(userId, 'UPDATE', 'installment_schedule', id, existing, row);
  return mapInstallmentSchedule(row);
}

function mapTransaction(row) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    studentId: row.studentId,
    installmentId: row.installmentId,
    receiptNumber: row.receiptNumber,
    amountEgp: money(row.amountEgp),
    paymentMethod: row.paymentMethod,
    status: row.status,
    referenceNumber: row.referenceNumber,
    notesAr: row.notesAr,
    notesEn: row.notesEn,
    collectedBy: row.collectedBy,
    transactionDate: row.transactionDate,
    createdAt: row.createdAt,
  };
}

function normalizePaymentMethod(method) {
  const key = String(method || 'cash').toUpperCase();
  if (key === 'CASH') return 'cash';
  if (key === 'BANK_TRANSFER') return 'bank_transfer';
  if (key === 'CHECK') return 'bank_transfer';
  if (key === 'CARD') return 'card';
  if (key === 'MOBILE_WALLET') return 'mobile_wallet';
  return method;
}

function paymentDayRange(dateInput) {
  const match = String(dateInput).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const start = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(dateInput);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function isOverdueInstallment(installment) {
  if (!installment || installment.status === 'paid' || installment.status === 'waived') return false;
  const due = new Date(installment.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function buildStudentFeeSummary(plans = [], transactions = []) {
  const completed = transactions.filter(tx => tx.status === 'completed');
  const paid = completed.reduce((sum, row) => sum + (Number(row.amountEgp) || 0), 0);
  const expected = plans.reduce((sum, plan) => sum + (Number(plan.totalAmountEgp) || 0), 0);
  const installments = plans.flatMap(plan =>
    (plan.schedule || []).map(item => ({
      ...item,
      planId: plan.id,
      planName: plan.planNameAr || plan.planName,
    }))
  );
  const overdue = installments.filter(isOverdueInstallment);

  return {
    totalFees: expected,
    paid,
    outstanding: Math.max(expected - paid, 0),
    overdueAmount: overdue.reduce((sum, row) => sum + (Number(row.amountEgp) || 0), 0),
    overdueCount: overdue.length,
    installments: installments.sort((a, b) => (a.installmentNo || 0) - (b.installmentNo || 0)),
    plans,
    transactions: completed,
  };
}

async function getStudentFees(userId, studentId) {
  const ctx = await getUserContext(userId);
  const student = await prisma.student.findFirst({
    where: { AND: [{ id: studentId }, studentVisibilityWhere(ctx)] },
    select: { id: true },
  });
  if (!student) throw new AppError('Student not found', 404);

  const [plans, transactions] = await Promise.all([
    prisma.installmentPlan.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: { schedule: { orderBy: { installmentNo: 'asc' } } },
    }),
    prisma.transaction.findMany({
      where: { studentId },
      orderBy: { transactionDate: 'desc' },
    }),
  ]);

  return buildStudentFeeSummary(plans.map(mapInstallmentPlan), transactions.map(mapTransaction));
}

async function assignFees(userId, input) {
  const feeStructure = await prisma.feeStructure.findUnique({ where: { id: input.feeStructureId } });
  if (!feeStructure) throw new AppError('Fee structure not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageFinance(ctx, feeStructure.schoolId);

  let studentIds = Array.isArray(input.studentIds) ? [...input.studentIds] : [];
  if (!studentIds.length && input.gradeLevelId) {
    const students = await prisma.student.findMany({
      where: {
        schoolId: feeStructure.schoolId,
        isActive: true,
        enrollments: {
          some: {
            withdrawalDate: null,
            class: { gradeLevelId: input.gradeLevelId },
          },
        },
      },
      select: { id: true },
    });
    studentIds = students.map(row => row.id);
  }
  if (!studentIds.length) throw new AppError('No students to assign fees to', 422);

  const schedule = input.schedule || [];
  const results = [];
  for (const targetStudentId of studentIds) {
    const targetStudent = await prisma.student.findUnique({
      where: { id: targetStudentId },
      select: { id: true, schoolId: true },
    });
    if (!targetStudent || targetStudent.schoolId !== feeStructure.schoolId) {
      throw new AppError('Student not found for this fee structure', 404);
    }
    const row = await createInstallmentPlan(userId, {
      feeStructureId: input.feeStructureId,
      studentId: targetStudentId,
      planNameAr: input.planNameAr ?? feeStructure.nameAr,
      planNameEn: input.planNameEn ?? feeStructure.nameEn,
      totalAmountEgp: input.totalAmountEgp,
      schedule,
    });
    results.push(row);
  }
  return results;
}

function collectorName(user) {
  if (!user) return null;
  const staff = user.staffProfile;
  if (staff) {
    return [staff.firstNameAr || staff.firstNameEn, staff.lastNameAr || staff.lastNameEn]
      .filter(Boolean)
      .join(' ');
  }
  return user.email;
}

async function getPaymentReceipt(userId, paymentId) {
  const ctx = await getUserContext(userId);
  const tx = await prisma.transaction.findUnique({
    where: { id: paymentId },
    include: {
      student: {
        select: {
          id: true,
          firstNameAr: true,
          firstNameEn: true,
          lastNameAr: true,
          lastNameEn: true,
          studentIdNumber: true,
        },
      },
      school: { select: { id: true, nameAr: true, nameEn: true } },
      collector: {
        select: {
          id: true,
          email: true,
          staffProfile: {
            select: { firstNameAr: true, firstNameEn: true, lastNameAr: true, lastNameEn: true },
          },
        },
      },
    },
  });
  if (!tx) throw new AppError('Payment not found', 404);

  if (canManageFinance(ctx)) {
    assertSchoolAccess(ctx, tx.schoolId);
  } else {
    const visible = await prisma.student.findFirst({
      where: { AND: [{ id: tx.studentId }, studentVisibilityWhere(ctx)] },
      select: { id: true },
    });
    if (!visible) throw new AppError('Payment not found', 404);
  }

  return {
    ...mapTransaction(tx),
    student: tx.student
      ? {
          id: tx.student.id,
          firstNameAr: tx.student.firstNameAr,
          firstNameEn: tx.student.firstNameEn,
          lastNameAr: tx.student.lastNameAr,
          lastNameEn: tx.student.lastNameEn,
          studentIdNumber: tx.student.studentIdNumber,
        }
      : null,
    school: tx.school
      ? { id: tx.school.id, name: tx.school.nameEn || tx.school.nameAr, nameAr: tx.school.nameAr, nameEn: tx.school.nameEn }
      : null,
    collectorName: collectorName(tx.collector),
  };
}

async function listTransactions(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = canManageFinance(ctx) ? financeSchoolWhere(ctx, query.schoolId) : {};
  if (!canManageFinance(ctx)) where.student = studentVisibilityWhere(ctx);
  if (query.studentId) where.studentId = query.studentId;
  if (query.status) where.status = query.status;
  if (query.date) {
    const { start, end } = paymentDayRange(query.date);
    where.transactionDate = { gte: start, lt: end };
  }
  const [total, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({ where, orderBy: { transactionDate: 'desc' }, skip, take }),
  ]);
  return { data: rows.map(mapTransaction), meta: meta(total, page, limit) };
}

async function recordPayment(userId, input) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new AppError('Student not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageFinance(ctx, student.schoolId);

  const amount = Number(input.amountEgp ?? input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('Invalid payment amount', 422);
  }

  const fees = await getStudentFees(userId, input.studentId);
  if (amount > fees.outstanding) {
    throw new AppError('Payment amount exceeds outstanding balance', 422);
  }

  let receiptNumber = input.receiptNumber?.trim();
  if (!receiptNumber) {
    const prefix = 'BP-';
    const recent = await prisma.transaction.findMany({
      where: { schoolId: student.schoolId, receiptNumber: { startsWith: prefix } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { receiptNumber: true },
    });
    const numbers = recent
      .map(row => Number(String(row.receiptNumber).replace(prefix, '')))
      .filter(num => Number.isFinite(num));
    const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
    receiptNumber = `${prefix}${String(next).padStart(5, '0')}`;
  }

  return createTransaction(userId, {
    schoolId: student.schoolId,
    studentId: input.studentId,
    installmentId: input.installmentId ?? null,
    receiptNumber,
    amountEgp: amount,
    paymentMethod: normalizePaymentMethod(input.paymentMethod),
    status: input.status ?? 'completed',
    referenceNumber: input.referenceNumber ?? null,
    notesAr: input.note ?? input.notesAr ?? null,
    notesEn: input.notesEn ?? null,
    collectedBy: input.collectedBy ?? null,
    transactionDate: input.transactionDate ?? new Date(),
  });
}

async function createTransaction(userId, input) {
  const ctx = await getUserContext(userId);
  assertCanManageFinance(ctx, input.schoolId);
  const row = await prisma.$transaction(async tx => {
    const created = await tx.transaction.create({
      data: { ...input, collectedBy: input.collectedBy ?? userId },
    });
    if (input.installmentId && input.status === 'completed') {
      await tx.installmentSchedule.update({
        where: { id: input.installmentId },
        data: { status: 'paid', paidAt: created.transactionDate },
      });
    }
    return created;
  });
  await audit(userId, 'INSERT', 'transactions', row.id, null, row);
  return mapTransaction(row);
}

async function updateTransaction(userId, id, input) {
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) throw new AppError('Transaction not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageFinance(ctx, existing.schoolId);
  const row = await prisma.transaction.update({ where: { id }, data: input });
  await audit(userId, 'UPDATE', 'transactions', id, existing, row);
  return mapTransaction(row);
}

function mapDiscount(row) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    name: row.nameEn || row.nameAr,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    discountType: row.discountType,
    value: money(row.value),
    reasonAr: row.reasonAr,
    reasonEn: row.reasonEn,
    approvedBy: row.approvedBy,
    createdAt: row.createdAt,
  };
}

async function listDiscounts(userId, query = {}) {
  const ctx = await getUserContext(userId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const where = financeSchoolWhere(ctx, query.schoolId);
  const [total, rows] = await Promise.all([
    prisma.discount.count({ where }),
    prisma.discount.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
  ]);
  return { data: rows.map(mapDiscount), meta: meta(total, page, limit) };
}

async function createDiscount(userId, input) {
  const ctx = await getUserContext(userId);
  assertCanManageFinance(ctx, input.schoolId);
  const row = await prisma.discount.create({
    data: { ...input, approvedBy: input.approvedBy ?? userId },
  });
  await audit(userId, 'INSERT', 'discounts', row.id, null, row);
  return mapDiscount(row);
}

async function updateDiscount(userId, id, input) {
  const existing = await prisma.discount.findUnique({ where: { id } });
  if (!existing) throw new AppError('Discount not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageFinance(ctx, existing.schoolId);
  const row = await prisma.discount.update({ where: { id }, data: input });
  await audit(userId, 'UPDATE', 'discounts', id, existing, row);
  return mapDiscount(row);
}

async function applyDiscount(userId, input) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new AppError('Student not found', 404);
  const ctx = await getUserContext(userId);
  assertCanManageFinance(ctx, student.schoolId);
  const row = await prisma.studentDiscount.upsert({
    where: {
      studentId_discountId_feeStructureId: {
        studentId: input.studentId,
        discountId: input.discountId,
        feeStructureId: input.feeStructureId,
      },
    },
    create: input,
    update: {},
  });
  await audit(userId, 'INSERT', 'student_discounts', row.id, null, row);
  return row;
}

module.exports = {
  listFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  listInstallmentPlans,
  createInstallmentPlan,
  updateInstallmentPlan,
  updateInstallmentSchedule,
  getStudentFees,
  assignFees,
  listTransactions,
  recordPayment,
  getPaymentReceipt,
  createTransaction,
  updateTransaction,
  listDiscounts,
  createDiscount,
  updateDiscount,
  applyDiscount,
  buildStudentFeeSummary,
};
