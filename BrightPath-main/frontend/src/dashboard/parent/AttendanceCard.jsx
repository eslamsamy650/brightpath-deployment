const STATUS_CLASS = {
  PRESENT: 'parent-mini-day--present',
  ABSENT: 'parent-mini-day--absent',
  LATE: 'parent-mini-day--late',
  EXCUSED: 'parent-mini-day--excused',
};

const STATUS_LABEL = {
  PRESENT: 'حاضر',
  ABSENT: 'غائب',
  LATE: 'متأخر',
  EXCUSED: 'معذور',
};

function dayLabel(date) {
  const d = new Date(date);
  return d.toLocaleDateString('ar-EG', { weekday: 'short' });
}

export function AttendanceCard({ data, expanded, onToggle }) {
  const percent = data?.presentPercent ?? 0;
  const recent = data?.recentRecords || [];

  return (
    <>
      <button type="button" className={`parent-card ${expanded ? 'is-expanded' : ''}`} onClick={onToggle}>
        <div className="parent-card__head">
          <div>
            <span>الحضور — هذا الشهر</span>
            <strong>{percent}%</strong>
          </div>
          <span className="parent-card__icon" aria-hidden="true">
            📋
          </span>
        </div>
        <div className="parent-mini-calendar">
          {recent.length ? (
            recent.map(record => (
              <div
                className={`parent-mini-day ${STATUS_CLASS[record.status] || 'parent-mini-day--empty'}`}
                key={record.id || record.attendanceDate}
              >
                <small>{dayLabel(record.attendanceDate)}</small>
                <span>{STATUS_LABEL[record.status] || '-'}</span>
              </div>
            ))
          ) : (
            <p className="empty">لا توجد سجلات للأيام الأخيرة</p>
          )}
        </div>
      </button>

      {expanded ? (
        <div className="parent-detail-panel">
          <h3>تفاصيل الحضور</h3>
          <p>نسبة الحضور هذا الشهر: {percent}%</p>
          <div className="parent-mini-calendar">
            {(data?.monthRecords || recent).map(record => (
              <div
                className={`parent-mini-day ${STATUS_CLASS[record.status] || 'parent-mini-day--empty'}`}
                key={record.id || `${record.attendanceDate}-${record.status}`}
              >
                <small>{String(record.attendanceDate || '').slice(0, 10)}</small>
                <span>{STATUS_LABEL[record.status] || '-'}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
