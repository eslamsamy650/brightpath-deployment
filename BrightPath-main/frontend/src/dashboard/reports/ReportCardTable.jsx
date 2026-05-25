function valueOrDash(value) {
  return value === null || value === undefined || value === '' ? '-' : value;
}

export function ReportCardTable({ subjects = [] }) {
  return (
    <table className="report-card-table">
      <thead>
        <tr>
          <th>المادة</th>
          <th>Subject</th>
          <th>الدرجة النهائية</th>
          <th>درجة الطالب</th>
          <th>التقدير</th>
          <th>الحالة</th>
        </tr>
      </thead>
      <tbody>
        {subjects.length ? (
          subjects.map((row, index) => (
            <tr key={`${row.subject?.id || row.subject?.titleAr || index}-${index}`}>
              <td>{valueOrDash(row.subject?.titleAr || row.subject?.title)}</td>
              <td>{valueOrDash(row.subject?.titleEn || row.subject?.title)}</td>
              <td>{valueOrDash(row.maxMark)}</td>
              <td>{valueOrDash(row.mark)}</td>
              <td>{valueOrDash(row.gradeLetter)}</td>
              <td>
                <span className={`report-status ${row.pass ? 'is-pass' : 'is-fail'}`}>
                  {row.pass ? 'ناجح' : 'راسب'}
                </span>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="6" className="report-empty">لا توجد درجات مسجلة لهذا الاختيار.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
