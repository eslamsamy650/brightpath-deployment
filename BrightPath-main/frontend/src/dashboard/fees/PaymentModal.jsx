import { useMemo, useState } from 'react';
import { mapPaymentMethod } from '../../api/financeApi';

const METHODS = [
  ['CASH', 'نقدي'],
  ['BANK_TRANSFER', 'تحويل بنكي'],
  ['CHECK', 'شيك'],
];

export function PaymentModal({
  student,
  summary,
  installments = [],
  onClose,
  onSubmit,
  saving = false,
}) {
  const [amountEgp, setAmountEgp] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [installmentId, setInstallmentId] = useState('');
  const [notesAr, setNotesAr] = useState('');
  const [error, setError] = useState('');

  const outstanding = Number(summary?.outstanding || 0);
  const unpaidInstallments = useMemo(
    () => installments.filter(row => row.status !== 'paid' && row.status !== 'waived'),
    [installments]
  );

  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const amount = Number(amountEgp);
    if (!amount || amount <= 0) {
      setError('أدخل مبلغًا صالحًا');
      return;
    }
    if (amount > outstanding) {
      setError('المبلغ أكبر من الرصيد المتبقي');
      return;
    }
    if (['BANK_TRANSFER', 'CHECK'].includes(paymentMethod) && !referenceNumber.trim()) {
      setError('رقم المرجع مطلوب للتحويل أو الشيك');
      return;
    }

    onSubmit({
      studentId: student.id,
      amountEgp: amount,
      paymentMethod: mapPaymentMethod(paymentMethod),
      referenceNumber: referenceNumber.trim() || null,
      transactionDate,
      installmentId: installmentId || null,
      notesAr: notesAr.trim() || null,
      uiMethod: paymentMethod,
    });
  }

  return (
    <div className="finance-modal-backdrop" role="presentation" onClick={onClose}>
      <form className="finance-modal" onClick={event => event.stopPropagation()} onSubmit={handleSubmit}>
        <h3>تسجيل دفعة يدوية</h3>
        <p>
          الرصيد المتبقي: <strong>{outstanding.toLocaleString('ar-EG')} ج.م</strong>
        </p>

        <label>
          المبلغ
          <input
            type="number"
            min="0"
            max={outstanding}
            step="0.01"
            value={amountEgp}
            onChange={event => setAmountEgp(event.target.value)}
            required
          />
        </label>

        <label>
          طريقة الدفع
          <select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}>
            {METHODS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {['BANK_TRANSFER', 'CHECK'].includes(paymentMethod) ? (
          <label>
            رقم المرجع
            <input value={referenceNumber} onChange={event => setReferenceNumber(event.target.value)} required />
          </label>
        ) : null}

        <label>
          تاريخ التحصيل
          <input
            type="date"
            value={transactionDate}
            onChange={event => setTransactionDate(event.target.value)}
            required
          />
        </label>

        {unpaidInstallments.length ? (
          <label>
            القسط (اختياري)
            <select value={installmentId} onChange={event => setInstallmentId(event.target.value)}>
              <option value="">بدون ربط بقسط</option>
              {unpaidInstallments.map(row => (
                <option key={row.id} value={row.id}>
                  القسط {row.installmentNo} — {Number(row.amountEgp || 0).toLocaleString('ar-EG')} ج.م
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label>
          ملاحظات
          <textarea value={notesAr} onChange={event => setNotesAr(event.target.value)} rows={3} />
        </label>

        {error ? <p className="finance-form-error">{error}</p> : null}

        <div className="finance-modal__actions">
          <button type="button" className="students-button students-button--ghost" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" className="students-button" disabled={saving}>
            {saving ? 'جاري الحفظ…' : 'حفظ الدفعة'}
          </button>
        </div>
      </form>
    </div>
  );
}
