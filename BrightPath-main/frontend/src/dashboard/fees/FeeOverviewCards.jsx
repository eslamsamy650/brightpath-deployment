function formatEgp(value) {
  return `${Number(value || 0).toLocaleString('ar-EG')} ج.م`;
}

export function FeeOverviewCards({ overview, loading }) {
  const cards = [
    ['المتوقع هذا العام', overview?.expected, ''],
    ['المحصل', overview?.collected, ''],
    ['المتبقي', overview?.outstanding, ''],
    ['متأخر', overview?.overdue, 'fee-overview-card--warning'],
  ];

  if (loading) {
    return (
      <div className="fee-overview-grid">
        {cards.map(([label]) => (
          <article className="fee-overview-card" key={label}>
            <span>{label}</span>
            <strong>…</strong>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="fee-overview-grid">
      {cards.map(([label, value, extraClass]) => (
        <article className={`fee-overview-card ${extraClass || ''}`.trim()} key={label}>
          <span>{label}</span>
          <strong>{formatEgp(value)}</strong>
          {label === 'متأخر' && overview?.overdueCount ? (
            <small>{overview.overdueCount} قسط متأخر</small>
          ) : null}
        </article>
      ))}
    </div>
  );
}
