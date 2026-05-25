function installmentStatusLabel(status, overdue) {
  if (status === 'paid') return 'مدفوع';
  if (overdue) return 'متأخر';
  if (status === 'waived') return 'معفى';
  return 'غير مدفوع';
}

function statusClass(status, overdue) {
  if (status === 'paid') return 'installment-status installment-status--paid';
  if (overdue) return 'installment-status installment-status--overdue';
  return 'installment-status installment-status--unpaid';
}

function isOverdue(row) {
  if (row.status === 'paid' || row.status === 'waived') return false;
  const due = new Date(row.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function studentLabel(student = {}) {
  return (
    student.name ||
    [student.firstNameAr, student.lastNameAr].filter(Boolean).join(' ') ||
    [student.firstNameEn, student.lastNameEn].filter(Boolean).join(' ') ||
    student.studentCode ||
    student.studentIdNumber ||
    '-'
  );
}

export function StudentFeeCard({ student, summary, onRecordPayment, loading }) {
  if (!student) {
    return (
      <div className="student-fee-card">
        <p className="empty">ابحث عن طالب لعرض ملخص المصروفات.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="student-fee-card">
        <h3>{studentLabel(student)}</h3>
        <p>جاري تحميل المصروفات…</p>
      </div>
    );
  }

  const metrics = [
    ['إجمالي المصروفات', summary?.totalFees],
    ['المدفوع', summary?.paid],
    ['المتبقي', summary?.outstanding],
  ];

  return (
    <div className="student-fee-card">
      <div className="students-page__head">
        <div>
          <h3>{studentLabel(student)}</h3>
          <p>{student.studentCode || student.studentIdNumber || ''}</p>
        </div>
        <button
          type="button"
          className="students-button"
          disabled={!summary || summary.outstanding <= 0}
          onClick={onRecordPayment}
        >
          تسجيل دفعة
        </button>
      </div>

      <div className="student-fee-card__metrics">
        {metrics.map(([label, value]) => (
          <div className="student-fee-card__metric" key={label}>
            <span>{label}</span>
            <strong>{Number(value || 0).toLocaleString('ar-EG')} ج.م</strong>
          </div>
        ))}
      </div>

      <div>
        <h4>حالة الأقساط</h4>
        <div className="installment-list">
          {summary?.installments?.length ? (
            summary.installments.map(row => {
              const overdue = isOverdue(row);
              return (
                <div className={`installment-row ${overdue ? 'is-overdue' : ''}`} key={row.id}>
                  <div>
                    <strong>
                      القسط {row.installmentNo}
                      {row.planName ? ` — ${row.planName}` : ''}
                    </strong>
                    <p>استحقاق: {String(row.dueDate || '').slice(0, 10)}</p>
                  </div>
                  <span>{Number(row.amountEgp || 0).toLocaleString('ar-EG')} ج.م</span>
                  <span className={statusClass(row.status, overdue)}>
                    {installmentStatusLabel(row.status, overdue)}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="empty">لا توجد خطة أقساط لهذا الطالب بعد.</p>
          )}
        </div>
      </div>
    </div>
  );
}
