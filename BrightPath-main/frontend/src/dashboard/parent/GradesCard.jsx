function subjectName(row = {}) {
  const subject = row.subject || {};
  return subject.nameAr || subject.nameEn || subject.name || subject.titleAr || 'مادة';
}

export function GradesCard({ data, expanded, onToggle }) {
  const topSubjects = data?.subjects || [];
  const average = data?.overallAverage;

  return (
    <>
      <button type="button" className={`parent-card ${expanded ? 'is-expanded' : ''}`} onClick={onToggle}>
        <div className="parent-card__head">
          <div>
            <span>الدرجات — {data?.term || 'الترم الحالي'}</span>
            <strong>{average != null ? `${average}%` : '—'}</strong>
          </div>
          <span className="parent-card__icon" aria-hidden="true">
            📊
          </span>
        </div>
        <div className="parent-subject-list">
          {topSubjects.length ? (
            topSubjects.map(row => (
              <div className="parent-subject-row" key={subjectName(row)}>
                <span>{subjectName(row)}</span>
                <strong>{row.percent ?? 0}%</strong>
              </div>
            ))
          ) : (
            <p className="empty">لا توجد درجات منشورة بعد</p>
          )}
        </div>
      </button>

      {expanded ? (
        <div className="parent-detail-panel">
          <h3>تفاصيل الدرجات</h3>
          <p>المعدل العام: {average != null ? `${average}%` : '—'}</p>
          <div className="parent-subject-list">
            {(data?.allSubjects || topSubjects).map(row => (
              <div className="parent-subject-row" key={`${subjectName(row)}-full`}>
                <span>
                  {subjectName(row)} ({row.gradeLetter || '-'})
                </span>
                <strong>{row.percent ?? 0}%</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
