import { apiCreate, apiGet, apiList, apiPatch, apiUpdate } from './schoolClient';
import { apiRequest } from './brighpathClient';
import { unwrapApiResponse } from './apiErrors';

const unwrap = unwrapApiResponse;

export function schoolIdFromProfile(profile, fallbackSchoolId = '') {
  return (
    profile?.adminProfile?.schoolId ||
    profile?.accountantProfile?.schoolId ||
    profile?.teacherProfile?.schoolId ||
    fallbackSchoolId ||
    ''
  );
}

const FEE_CATEGORIES = {
  tuition: 'tuition',
  activity: 'activity',
  bus: 'bus',
  books: 'other',
  book: 'other',
  uniform: 'uniform',
  other: 'other',
};

const PAYMENT_METHODS = {
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  CHECK: 'bank_transfer',
  cash: 'cash',
  bank_transfer: 'bank_transfer',
};

export function mapFeeCategory(itemName = '') {
  const key = String(itemName).trim().toLowerCase();
  if (key.includes('نشاط') || key.includes('activity')) return FEE_CATEGORIES.activity;
  if (key.includes('باص') || key.includes('bus')) return FEE_CATEGORIES.bus;
  if (key.includes('كتب') || key.includes('book')) return FEE_CATEGORIES.books;
  if (key.includes('زي') || key.includes('uniform')) return FEE_CATEGORIES.uniform;
  if (key.includes('دراس') || key.includes('tuition')) return FEE_CATEGORIES.tuition;
  return FEE_CATEGORIES.other;
}

export function mapPaymentMethod(method) {
  return PAYMENT_METHODS[method] || PAYMENT_METHODS.CASH;
}

export function paymentMethodLabel(method) {
  const map = {
    cash: 'نقدي',
    bank_transfer: 'تحويل بنكي / شيك',
    card: 'بطاقة',
    mobile_wallet: 'محفظة إلكترونية',
    CASH: 'نقدي',
    BANK_TRANSFER: 'تحويل بنكي',
    CHECK: 'شيك',
  };
  return map[method] || method || '-';
}

export function listFeeStructures(query = {}) {
  return apiList('/finance/fee-structures', query);
}

export function createFeeStructure(payload) {
  return apiCreate('/finance/fee-structures', payload);
}

export function updateFeeStructure(id, payload) {
  return apiUpdate('/finance/fee-structures', id, payload);
}

export function listInstallmentPlans(query = {}) {
  return apiList('/finance/installment-plans', query);
}

export function createInstallmentPlan(payload) {
  return apiCreate('/finance/installment-plans', payload);
}

export function updateInstallmentPlan(id, payload) {
  return apiUpdate('/finance/installment-plans', id, payload);
}

export function updateInstallmentSchedule(id, payload) {
  return apiPatch('/finance/installments', id, payload);
}

function paymentsQueryString(query = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.schoolId) params.set('schoolId', query.schoolId);
  if (query.studentId) params.set('studentId', query.studentId);
  if (query.status) params.set('status', query.status);
  if (query.date) params.set('date', query.date);
  return params.toString();
}

export async function listPayments(query = {}) {
  const qs = paymentsQueryString(query);
  return unwrap(
    apiRequest(qs ? `/finance/payments?${qs}` : '/finance/payments'),
    'Could not load payments'
  );
}

export async function recordPayment(payload) {
  return unwrap(
    apiRequest('/finance/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: payload.studentId,
        amount: payload.amountEgp ?? payload.amount,
        paymentMethod: payload.uiMethod || payload.paymentMethod,
        referenceNumber: payload.referenceNumber,
        note: payload.notesAr ?? payload.note,
        installmentId: payload.installmentId,
        receiptNumber: payload.receiptNumber,
        transactionDate: payload.transactionDate,
      }),
    }),
    'Could not record payment'
  );
}

export function getPayment(paymentId) {
  return apiGet('/finance/transactions', paymentId);
}

export async function getReceipt(paymentId) {
  return unwrap(
    apiRequest(`/finance/receipts/${encodeURIComponent(paymentId)}`),
    'Could not load receipt'
  );
}

export function groupKeyForStructure(row = {}) {
  return [row.nameAr || row.name, row.academicYearId, row.gradeLevelId || ''].join('::');
}

export function groupFeeStructures(rows = []) {
  const groups = new Map();
  for (const row of rows) {
    const key = groupKeyForStructure(row);
    const existing = groups.get(key) || {
      key,
      name: row.nameAr || row.name,
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      academicYearId: row.academicYearId,
      gradeLevelId: row.gradeLevelId,
      schoolId: row.schoolId,
      items: [],
      ids: [],
      totalAmount: 0,
      createdAt: row.createdAt,
    };
    existing.items.push({
      id: row.id,
      name: row.nameAr || row.name,
      category: row.category,
      amountEgp: Number(row.amountEgp) || 0,
    });
    existing.ids.push(row.id);
    existing.totalAmount += Number(row.amountEgp) || 0;
    groups.set(key, existing);
  }
  return [...groups.values()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function sumAmounts(rows = [], field = 'amountEgp') {
  return rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
}

function isOverdueInstallment(installment) {
  if (!installment || installment.status === 'paid' || installment.status === 'waived') return false;
  const due = new Date(installment.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function buildStudentFeeSummary(plans = [], transactions = []) {
  const completed = transactions.filter(tx => tx.status === 'completed');
  const paid = sumAmounts(completed);
  const expected = plans.reduce((sum, plan) => sum + (Number(plan.totalAmountEgp) || 0), 0);
  const installments = plans.flatMap(plan =>
    (plan.schedule || []).map(item => ({
      ...item,
      planId: plan.id,
      planName: plan.planNameAr || plan.planName,
    }))
  );
  const overdue = installments.filter(isOverdueInstallment);
  const outstanding = Math.max(expected - paid, 0);

  return {
    totalFees: expected,
    paid,
    outstanding,
    overdueAmount: sumAmounts(overdue),
    overdueCount: overdue.length,
    installments: installments.sort((a, b) => (a.installmentNo || 0) - (b.installmentNo || 0)),
    plans,
    transactions: completed,
  };
}

export async function getStudentFees(studentId) {
  return unwrap(
    apiRequest(`/finance/student-fees/${encodeURIComponent(studentId)}`),
    'Could not load student fees'
  );
}

export async function getFeeOverview({ schoolId, academicYearId } = {}) {
  const [structuresRes, plansRes, paymentsRes] = await Promise.all([
    listFeeStructures({ schoolId, academicYearId, limit: 100 }),
    listInstallmentPlans({ schoolId, limit: 100 }),
    listPayments({ schoolId, status: 'completed', limit: 100 }),
  ]);

  const structures = structuresRes.data || [];
  const structureIds = new Set(structures.map(row => row.id));
  const plans = (plansRes.data || []).filter(
    plan => !academicYearId || structureIds.has(plan.feeStructureId) || structureIds.size === 0
  );
  const payments = paymentsRes.data || [];

  const expected = plans.reduce((sum, plan) => sum + (Number(plan.totalAmountEgp) || 0), 0);
  const collected = sumAmounts(payments);
  const installments = plans.flatMap(plan => plan.schedule || []);
  const overdue = installments.filter(isOverdueInstallment);

  return {
    data: {
      expected,
      collected,
      outstanding: Math.max(expected - collected, 0),
      overdue: sumAmounts(overdue),
      overdueCount: overdue.length,
      structureCount: groupFeeStructures(structures).length,
      planCount: plans.length,
    },
  };
}

export async function assignFees({
  structureGroup,
  installments = [],
  studentIds = [],
  gradeLevelId,
}) {
  const feeStructureId = structureGroup.ids?.[0] || structureGroup.items?.[0]?.id;
  if (!feeStructureId) throw new Error('هيكل المصروفات غير مكتمل');

  const schedule = installments.map((row, index) => ({
    installmentNo: index + 1,
    dueDate: row.dueDate,
    amountEgp: Number(row.amountEgp) || 0,
    status: 'unpaid',
  }));

  return unwrap(
    apiRequest('/finance/assign-fees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feeStructureId,
        studentIds: studentIds?.length ? studentIds : undefined,
        gradeLevelId: gradeLevelId || structureGroup.gradeLevelId || undefined,
        planNameAr: structureGroup.nameAr || structureGroup.name,
        planNameEn: structureGroup.nameEn || structureGroup.name,
        totalAmountEgp: structureGroup.totalAmount,
        schedule,
      }),
    }),
    'Could not assign fees'
  );
}

export async function createFeeStructureBundle({ schoolId, academicYearId, gradeLevelId, nameAr, nameEn, items = [] }) {
  const created = [];
  for (const item of items) {
    const { data } = await createFeeStructure({
      schoolId,
      academicYearId,
      gradeLevelId: gradeLevelId || null,
      category: mapFeeCategory(item.name || item.nameAr),
      nameAr,
      nameEn: item.nameEn || item.name || item.nameAr || nameEn || nameAr,
      amountEgp: Number(item.amountEgp) || 0,
      isMandatory: true,
    });
    created.push(data);
  }
  return { data: groupFeeStructures(created)[0] || null, items: created };
}

export function filterPaymentsByDate(payments = [], date) {
  const target = date || new Date().toISOString().slice(0, 10);
  return payments
    .filter(tx => String(tx.transactionDate || tx.createdAt || '').slice(0, 10) === target)
    .sort((a, b) => String(b.transactionDate || b.createdAt).localeCompare(String(a.transactionDate || a.createdAt)));
}

export async function nextReceiptNumber(schoolPrefix = 'BP') {
  const { data } = await listPayments({ limit: 100 });
  const prefix = `${schoolPrefix}-`;
  const numbers = (data || [])
    .map(tx => tx.receiptNumber)
    .filter(code => code?.startsWith(prefix))
    .map(code => Number(code.replace(prefix, '')))
    .filter(num => Number.isFinite(num));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}

export async function searchStudents(query, listStudents) {
  const { data } = await listStudents({ search: query, limit: 20, isActive: true });
  return data || [];
}
