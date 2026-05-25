import { ReportCardTable } from './ReportCardTable.jsx';

function fullName(student = {}) {
  return (
    student.name ||
    [student.firstNameAr, student.lastNameAr].filter(Boolean).join(' ') ||
    [student.firstNameEn, student.lastNameEn].filter(Boolean).join(' ') ||
    student.studentIdNumber ||
    '-'
  );
}

function classNameOf(report = {}) {
  const cls = report.class || {};
  return cls.nameAr || cls.nameEn || cls.name || '-';
}

function academicYearName(report = {}) {
  const year = report.academicYear || {};
  return year.nameAr || year.nameEn || [year.startDate, year.endDate].filter(Boolean).join(' - ') || '-';
}

function attendanceValue(summary = {}, key) {
  return summary[key] || summary[key.toLowerCase()] || 0;
}

export function ReportCardPrint({ reports = [], remarks = {} }) {
  return (
    <div className="report-print-stack">
      {reports.map(report => (
        <article className="report-card-print" key={report.student?.id}>
          <header className="report-card-header">
            <div className="school-logo-placeholder">BP</div>
            <div>
              <p>{report.school?.nameAr || report.school?.nameEn || 'BrightPath School'}</p>
              <h2>بطاقة تقرير الطالب</h2>
            </div>
          </header>

          <section className="report-student-grid">
            <div><span>اسم الطالب</span><strong>{fullName(report.student)}</strong></div>
            <div><span>كود الطالب</span><strong>{report.student?.studentIdNumber || '-'}</strong></div>
            <div><span>الفصل</span><strong>{classNameOf(report)}</strong></div>
            <div><span>العام الدراسي</span><strong>{academicYearName(report)}</strong></div>
          </section>

          <ReportCardTable subjects={report.subjects || []} />

          <footer className="report-card-footer">
            <div className="attendance-summary-print">
              <h3>ملخص الحضور</h3>
              <p>حاضر: {attendanceValue(report.attendanceSummary, 'PRESENT')}</p>
              <p>غائب: {attendanceValue(report.attendanceSummary, 'ABSENT')}</p>
              <p>متأخر: {attendanceValue(report.attendanceSummary, 'LATE')}</p>
            </div>
            <div className="teacher-remarks-print">
              <h3>ملاحظات المعلم</h3>
              <p>{remarks[report.student?.id] || report.remarks || 'لا توجد ملاحظات.'}</p>
            </div>
            <div className="signature-line">توقيع المدير</div>
          </footer>
        </article>
      ))}
    </div>
  );
}
