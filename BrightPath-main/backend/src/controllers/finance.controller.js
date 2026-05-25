const { z } = require('zod');
const FinanceService = require('../services/finance.service');
const { sendSuccess, sendCreated } = require('../utils/response');
const { normalizeDoc } = require('../utils/serialize');

const uuidSchema = z.string().uuid();
const idParamsSchema = z.object({ id: uuidSchema });
const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const feeQuerySchema = paginationQuerySchema.extend({
  schoolId: uuidSchema.optional(),
  academicYearId: uuidSchema.optional(),
  gradeLevelId: uuidSchema.optional(),
  category: z.enum(['tuition', 'bus', 'uniform', 'activity', 'other']).optional(),
});
const feeBodySchema = z.object({
  schoolId: uuidSchema,
  academicYearId: uuidSchema,
  gradeLevelId: uuidSchema.optional().nullable(),
  category: z.enum(['tuition', 'bus', 'uniform', 'activity', 'other']),
  nameAr: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().min(1).max(200),
  amountEgp: z.coerce.number().min(0),
  isMandatory: z.boolean().optional(),
  dueDate: z.coerce.date().optional().nullable(),
});

const scheduleSchema = z.object({
  installmentNo: z.coerce.number().int().min(1).max(99),
  dueDate: z.coerce.date(),
  amountEgp: z.coerce.number().min(0),
  status: z.enum(['unpaid', 'paid', 'overdue', 'waived']).optional(),
  paidAt: z.coerce.date().optional().nullable(),
});
const installmentPlanQuerySchema = paginationQuerySchema.extend({
  schoolId: uuidSchema.optional(),
  studentId: uuidSchema.optional(),
  feeStructureId: uuidSchema.optional(),
});
const installmentPlanBodySchema = z.object({
  feeStructureId: uuidSchema,
  studentId: uuidSchema,
  planNameAr: z.string().trim().max(200).optional().nullable(),
  planNameEn: z.string().trim().max(200).optional().nullable(),
  totalAmountEgp: z.coerce.number().min(0),
  discountEgp: z.coerce.number().min(0).optional(),
  notesAr: z.string().trim().optional().nullable(),
  notesEn: z.string().trim().optional().nullable(),
  schedule: z.array(scheduleSchema).optional(),
});
const scheduleUpdateSchema = scheduleSchema.partial().refine(data => Object.keys(data).length > 0, {
  message: 'At least one field is required',
});

const studentIdParamsSchema = z.object({ studentId: uuidSchema });

const transactionQuerySchema = paginationQuerySchema.extend({
  schoolId: uuidSchema.optional(),
  studentId: uuidSchema.optional(),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const paymentMethodSchema = z
  .enum(['cash', 'bank_transfer', 'card', 'mobile_wallet', 'CASH', 'BANK_TRANSFER', 'CHECK'])
  .transform(value => {
    const key = value.toUpperCase();
    if (key === 'CASH') return 'cash';
    if (key === 'BANK_TRANSFER' || key === 'CHECK') return 'bank_transfer';
    if (key === 'CARD') return 'card';
    if (key === 'MOBILE_WALLET') return 'mobile_wallet';
    return value;
  });

const paymentBodySchema = z.object({
  studentId: uuidSchema,
  amount: z.coerce.number().min(0),
  paymentMethod: paymentMethodSchema,
  referenceNumber: z.string().trim().max(100).optional().nullable(),
  note: z.string().trim().optional().nullable(),
  installmentId: uuidSchema.optional().nullable(),
  receiptNumber: z.string().trim().min(1).max(50).optional(),
  transactionDate: z.coerce.date().optional(),
});

const assignFeesBodySchema = z.object({
  feeStructureId: uuidSchema,
  studentIds: z.array(uuidSchema).optional(),
  gradeLevelId: uuidSchema.optional(),
  planNameAr: z.string().trim().max(200).optional().nullable(),
  planNameEn: z.string().trim().max(200).optional().nullable(),
  totalAmountEgp: z.coerce.number().min(0),
  schedule: z.array(scheduleSchema).optional(),
});

const transactionBodySchema = z.object({
  schoolId: uuidSchema,
  studentId: uuidSchema,
  installmentId: uuidSchema.optional().nullable(),
  receiptNumber: z.string().trim().min(1).max(50),
  amountEgp: z.coerce.number().min(0),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'card', 'mobile_wallet']),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
  notesAr: z.string().trim().optional().nullable(),
  notesEn: z.string().trim().optional().nullable(),
  collectedBy: uuidSchema.optional().nullable(),
  transactionDate: z.coerce.date().optional(),
});

const discountQuerySchema = paginationQuerySchema.extend({ schoolId: uuidSchema.optional() });
const discountBodySchema = z.object({
  schoolId: uuidSchema,
  nameAr: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().max(200).optional().nullable(),
  discountType: z.enum(['percentage', 'fixed']),
  value: z.coerce.number().min(0),
  reasonAr: z.string().trim().optional().nullable(),
  reasonEn: z.string().trim().optional().nullable(),
  approvedBy: uuidSchema.optional().nullable(),
});
const applyDiscountSchema = z.object({
  studentId: uuidSchema,
  discountId: uuidSchema,
  feeStructureId: uuidSchema,
});

function partial(schema) {
  return schema.partial().refine(data => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });
}

function list(method, message) {
  return async (req, res) => {
    const { data, meta } = await FinanceService[method](req.user.sub, req.query);
    sendSuccess(res, normalizeDoc(data), message, 200, meta);
  };
}

function create(method, message) {
  return async (req, res) => {
    const data = await FinanceService[method](req.user.sub, req.body);
    sendCreated(res, normalizeDoc(data), message);
  };
}

function update(method, message) {
  return async (req, res) => {
    const data = await FinanceService[method](req.user.sub, req.params.id, req.body);
    sendSuccess(res, normalizeDoc(data), message);
  };
}

async function getStudentFees(req, res) {
  const data = await FinanceService.getStudentFees(req.user.sub, req.params.studentId);
  sendSuccess(res, normalizeDoc(data), 'Student fees retrieved');
}

async function assignFees(req, res) {
  const data = await FinanceService.assignFees(req.user.sub, req.body);
  sendCreated(res, normalizeDoc(data), 'Fees assigned');
}

async function listPayments(req, res) {
  const { data, meta } = await FinanceService.listTransactions(req.user.sub, req.query);
  sendSuccess(res, normalizeDoc(data), 'Payments retrieved', 200, meta);
}

async function recordPayment(req, res) {
  const data = await FinanceService.recordPayment(req.user.sub, req.body);
  sendCreated(res, normalizeDoc(data), 'Payment recorded');
}

async function getReceipt(req, res) {
  const data = await FinanceService.getPaymentReceipt(req.user.sub, req.params.id);
  sendSuccess(res, normalizeDoc(data), 'Receipt retrieved');
}

module.exports = {
  idParamsSchema,
  studentIdParamsSchema,
  feeQuerySchema,
  feeBodySchema,
  updateFeeSchema: partial(feeBodySchema.omit({ schoolId: true })),
  installmentPlanQuerySchema,
  installmentPlanBodySchema,
  updateInstallmentPlanSchema: partial(installmentPlanBodySchema),
  scheduleUpdateSchema,
  transactionQuerySchema,
  paymentBodySchema,
  assignFeesBodySchema,
  transactionBodySchema,
  updateTransactionSchema: partial(transactionBodySchema.omit({ schoolId: true })),
  discountQuerySchema,
  discountBodySchema,
  updateDiscountSchema: partial(discountBodySchema.omit({ schoolId: true })),
  applyDiscountSchema,
  listFeeStructures: list('listFeeStructures', 'Fee structures retrieved'),
  createFeeStructure: create('createFeeStructure', 'Fee structure created'),
  updateFeeStructure: update('updateFeeStructure', 'Fee structure updated'),
  listInstallmentPlans: list('listInstallmentPlans', 'Installment plans retrieved'),
  createInstallmentPlan: create('createInstallmentPlan', 'Installment plan created'),
  updateInstallmentPlan: update('updateInstallmentPlan', 'Installment plan updated'),
  updateInstallmentSchedule: update('updateInstallmentSchedule', 'Installment updated'),
  getStudentFees,
  assignFees,
  listPayments,
  recordPayment,
  getReceipt,
  listTransactions: list('listTransactions', 'Transactions retrieved'),
  createTransaction: create('createTransaction', 'Transaction created'),
  updateTransaction: update('updateTransaction', 'Transaction updated'),
  listDiscounts: list('listDiscounts', 'Discounts retrieved'),
  createDiscount: create('createDiscount', 'Discount created'),
  updateDiscount: update('updateDiscount', 'Discount updated'),
  applyDiscount: create('applyDiscount', 'Discount applied'),
};
