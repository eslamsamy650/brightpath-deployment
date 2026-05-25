import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listStudents } from '../../api/studentsApi';
import {
  getReceipt,
  getStudentFees,
  listPayments,
  nextReceiptNumber,
  paymentMethodLabel,
  recordPayment,
  schoolIdFromProfile,
} from '../../api/financeApi';
import { LoadErrorBanner } from '../../components/LoadErrorBanner.jsx';
import { PaymentModal } from './PaymentModal.jsx';
import { ReceiptPrint } from './ReceiptPrint.jsx';
import { StudentFeeCard } from './StudentFeeCard.jsx';
import './fees.css';

const TABS = [
  ['record', 'تسجيل دفعة'],
  ['log', 'سجل اليوم'],
];

const schoolIdFrom = schoolIdFromProfile;

function displayName(profile) {
  const p =
    profile?.adminProfile ||
    profile?.teacherProfile ||
    profile?.accountantProfile ||
    profile?.studentProfile ||
    profile?.parentProfile;
  return (
    p?.name ||
    [p?.firstNameAr || p?.firstNameEn, p?.lastNameAr || p?.lastNameEn].filter(Boolean).join(' ') ||
    profile?.email ||
    'محاسب'
  );
}

function studentSearchLabel(student = {}) {
  const name =
    student.name ||
    [student.firstNameAr, student.lastNameAr].filter(Boolean).join(' ') ||
    [student.firstNameEn, student.lastNameEn].filter(Boolean).join(' ');
  const code = student.studentCode || student.studentIdNumber;
  return code ? `${name} — ${code}` : name;
}

export function PaymentRecordingPage({ fallbackSchoolId = '', profile, schoolName }) {
  const schoolId = schoolIdFrom(profile, fallbackSchoolId);
  const accountantName = displayName(profile);
  const [activeTab, setActiveTab] = useState('record');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [dailyPayments, setDailyPayments] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const activeStudentRef = useRef(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const dailyTotal = useMemo(
    () => dailyPayments.reduce((sum, row) => sum + (Number(row.amountEgp) || 0), 0),
    [dailyPayments]
  );

  const loadDailyLog = useCallback(async () => {
    setLoadingLog(true);
    try {
      const { data } = await listPayments({ schoolId, limit: 100, status: 'completed', date: today });
      setDailyPayments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل سجل اليوم');
    } finally {
      setLoadingLog(false);
    }
  }, [schoolId, today]);

  useEffect(() => {
    if (activeTab === 'log') queueMicrotask(() => void loadDailyLog());
  }, [activeTab, loadDailyLog]);

  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      void listStudents({ search: query.trim(), limit: 12, isActive: true })
        .then(res => setHits(res.data || []))
        .catch(() => setHits([]));
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  async function selectStudent(student) {
    activeStudentRef.current = student.id;
    setSelectedStudent(student);
    setQuery(studentSearchLabel(student));
    setHits([]);
    setLoadingSummary(true);
    setError('');
    try {
      const { data } = await getStudentFees(student.id);
      if (activeStudentRef.current !== student.id) return;
      setSummary(data);
    } catch (err) {
      setSummary(null);
      setError(err instanceof Error ? err.message : 'تعذر تحميل مصروفات الطالب');
    } finally {
      setLoadingSummary(false);
    }
  }

  async function handleRecordPayment(payload) {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const receiptNumber = await nextReceiptNumber('BP');
      const { data: payment } = await recordPayment({
        studentId: payload.studentId,
        installmentId: payload.installmentId,
        receiptNumber,
        amountEgp: payload.amountEgp,
        paymentMethod: payload.paymentMethod,
        referenceNumber: payload.referenceNumber,
        notesAr: payload.notesAr,
        transactionDate: payload.transactionDate,
        uiMethod: payload.uiMethod,
      });
      setPaymentModal(false);
      const receiptRes = await getReceipt(payment.id).catch(() => ({ data: payment }));
      setReceipt({
        ...receiptRes.data,
        student: receiptRes.data?.student || selectedStudent,
        uiMethod: payload.uiMethod,
        notesAr: payload.notesAr ?? receiptRes.data?.notesAr,
      });
      await selectStudent(selectedStudent);
      if (activeTab === 'log') await loadDailyLog();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الدفعة');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="payments-page">
      <div className="students-page__head">
        <div>
          <p>الحسابات</p>
          <h2>تسجيل المدفوعات اليدوية</h2>
        </div>
        {receipt ? (
          <button type="button" className="students-button students-button--ghost" onClick={() => window.print()}>
            طباعة الإيصال
          </button>
        ) : null}
      </div>

      <div className="payments-tabs">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={activeTab === key ? 'is-active' : ''}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <LoadErrorBanner
        message={error}
        onRetry={() => {
          setError('');
          if (activeTab === 'log') void loadDailyLog();
          else if (selectedStudent) void selectStudent(selectedStudent);
        }}
      />

      {activeTab === 'record' ? (
        <>
          <div className="student-search-panel">
            <label>
              بحث عن طالب (الاسم أو الكود)
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="اكتب اسم الطالب أو الكود" />
            </label>
            {hits.length ? (
              <div className="student-search-results">
                {hits.map(student => (
                  <button
                    type="button"
                    key={student.id}
                    className={`student-search-hit ${selectedStudent?.id === student.id ? 'is-selected' : ''}`}
                    onClick={() => selectStudent(student)}
                  >
                    {studentSearchLabel(student)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <StudentFeeCard
            student={selectedStudent}
            summary={summary}
            loading={loadingSummary}
            onRecordPayment={() => setPaymentModal(true)}
          />

          {paymentModal && selectedStudent ? (
            <PaymentModal
              student={selectedStudent}
              summary={summary}
              installments={summary?.installments || []}
              onClose={() => setPaymentModal(false)}
              onSubmit={handleRecordPayment}
              saving={saving}
            />
          ) : null}
        </>
      ) : (
        <div className="payments-log-table">
          <div className="students-page__head">
            <p>
              إجمالي اليوم: <strong>{dailyTotal.toLocaleString('ar-EG')} ج.م</strong>
            </p>
            <button type="button" className="students-button students-button--ghost" onClick={loadDailyLog}>
              تحديث
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>الوقت</th>
                <th>رقم الإيصال</th>
                <th>المبلغ</th>
                <th>الطريقة</th>
              </tr>
            </thead>
            <tbody>
              {loadingLog ? (
                <tr>
                  <td colSpan={4}>جاري التحميل…</td>
                </tr>
              ) : dailyPayments.length ? (
                dailyPayments.map(payment => (
                  <tr key={payment.id}>
                    <td>
                      {new Date(payment.transactionDate || payment.createdAt).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>{payment.receiptNumber}</td>
                    <td>{Number(payment.amountEgp || 0).toLocaleString('ar-EG')} ج.م</td>
                    <td>{paymentMethodLabel(payment.paymentMethod)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty">
                    لا توجد مدفوعات مسجلة اليوم.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ReceiptPrint receipt={receipt} schoolName={schoolName} accountantName={accountantName} />
    </section>
  );
}
