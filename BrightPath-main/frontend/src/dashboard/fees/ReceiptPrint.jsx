import { paymentMethodLabel } from '../../api/financeApi';

function studentLabel(student = {}) {
  return (
    student.name ||
    [student.firstNameAr, student.lastNameAr].filter(Boolean).join(' ') ||
    [student.firstNameEn, student.lastNameEn].filter(Boolean).join(' ') ||
    '-'
  );
}

export function ReceiptPrint({ receipt, schoolName, accountantName }) {
  if (!receipt) return null;

  const amount = Number(receipt.amountEgp || 0).toLocaleString('ar-EG');
  const date = String(receipt.transactionDate || receipt.createdAt || '').slice(0, 10);

  return (
    <div className="receipt-print-stack">
      <article className="receipt-print">
        <h2>{schoolName || 'BrightPath School'}</h2>
        <p style={{ textAlign: 'center' }}>إيصال تحصيل مصروفات</p>

        <div className="receipt-print__grid">
          <div>
            <span>رقم الإيصال</span>
            <strong>{receipt.receiptNumber}</strong>
          </div>
          <div>
            <span>التاريخ</span>
            <strong>{date}</strong>
          </div>
          <div>
            <span>اسم الطالب</span>
            <strong>{studentLabel(receipt.student)}</strong>
          </div>
          <div>
            <span>المبلغ</span>
            <strong>{amount} ج.م</strong>
          </div>
          <div>
            <span>طريقة الدفع</span>
            <strong>{paymentMethodLabel(receipt.uiMethod || receipt.paymentMethod)}</strong>
          </div>
          {receipt.referenceNumber ? (
            <div>
              <span>المرجع</span>
              <strong>{receipt.referenceNumber}</strong>
            </div>
          ) : null}
          <div>
            <span>المحصل</span>
            <strong>{accountantName || '-'}</strong>
          </div>
        </div>

        {receipt.notesAr ? <p>ملاحظات: {receipt.notesAr}</p> : null}
      </article>
    </div>
  );
}
