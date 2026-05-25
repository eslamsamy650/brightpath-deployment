export function FeesCard({ data, expanded, onToggle }) {
  const outstanding = Number(data?.outstanding || 0);
  const next = data?.nextInstallment;

  return (
    <>
      <button type="button" className={`parent-card ${expanded ? 'is-expanded' : ''}`} onClick={onToggle}>
        <div className="parent-card__head">
          <div>
            <span>المصروفات المتبقية</span>
            <strong>{outstanding.toLocaleString('ar-EG')} ج.م</strong>
          </div>
          <span className="parent-card__icon" aria-hidden="true">
            💰
          </span>
        </div>
        <p>
          {next
            ? `القسط القادم: ${String(next.dueDate || '').slice(0, 10)} — ${Number(next.amountEgp || 0).toLocaleString('ar-EG')} ج.م`
            : 'لا يوجد قسط مستحق قريبًا'}
        </p>
      </button>

      {expanded ? (
        <div className="parent-detail-panel">
          <h3>تفاصيل المصروفات</h3>
          <p>الإجمالي: {Number(data?.totalFees || 0).toLocaleString('ar-EG')} ج.م</p>
          <p>المدفوع: {Number(data?.paid || 0).toLocaleString('ar-EG')} ج.م</p>
          <p>المتبقي: {outstanding.toLocaleString('ar-EG')} ج.م</p>
          <div className="parent-subject-list">
            {(data?.installments || []).map(row => (
              <div className="parent-subject-row" key={row.id}>
                <span>
                  القسط {row.installmentNo} — {String(row.dueDate || '').slice(0, 10)}
                </span>
                <strong>{Number(row.amountEgp || 0).toLocaleString('ar-EG')} ج.م</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
