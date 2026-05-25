import { useEffect, useMemo, useState } from 'react';
import { getAttendanceReport, getAttendanceSummary, getStudentAttendanceRange, listTeacherClasses } from '../../api/attendanceApi';
import { AttendanceMatrix } from './AttendanceMatrix.jsx';
import { AttendanceStudentModal } from './AttendanceStudentModal.jsx';
import './attendance-report.css';

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function datesBetween(from, to) {
  const dates = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end) {
    dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

function exportCsv(report, dates) {
  const rows = [['Student', ...dates, 'Absent Rate']];
  const map = new Map(report.records.map(record => [`${record.studentId}:${new Date(record.attendanceDate).toISOString().slice(0, 10)}`, record.status]));
  for (const student of report.students) {
    const statuses = dates.map(day => map.get(`${student.id}:${day}`) || '');
    const absent = statuses.filter(status => status === 'ABSENT').length;
    rows.push([[student.firstName, student.lastName].filter(Boolean).join(' '), ...statuses, `${Math.round((absent / Math.max(1, dates.length)) * 100)}%`]);
  }
  const csv = rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'attendance-report.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function AttendanceReportPage() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [report, setReport] = useState({ students: [], records: [], summary: {} });
  const [summary, setSummary] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentReport, setStudentReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const dates = useMemo(() => datesBetween(from, to), [from, to]);

  useEffect(() => {
    void listTeacherClasses({ limit: 100 }).then(({ data }) => {
      setClasses(data || []);
      setClassId(current => current || data?.[0]?.id || '');
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    const month = Number(from.slice(5, 7));
    const year = Number(from.slice(0, 4));
    void (async () => {
      setLoading(true);
      try {
        const [reportResponse, summaryResponse] = await Promise.all([
          getAttendanceReport({ classId, from, to }),
          getAttendanceSummary({ classId, month, year }),
        ]);
        setReport(reportResponse.data || { students: [], records: [], summary: {} });
        setSummary(summaryResponse.data || {});
      } finally {
        setLoading(false);
      }
    })();
  }, [classId, from, to]);

  async function openStudent(student) {
    setSelectedStudent(student);
    const { data } = await getStudentAttendanceRange(student.id, { from, to });
    setStudentReport(data);
  }

  return (
    <section className="attendance-report-page">
      <div className="students-page__head">
        <div><p>تقارير الحضور</p><h2>تقرير الحضور الشهري</h2></div>
        <button type="button" className="students-button" onClick={() => exportCsv(report, dates)}>تصدير CSV</button>
      </div>
      <div className="attendance-steps">
        <label><span>الفصل</span><select value={classId} onChange={e => setClassId(e.target.value)}>{classes.map(c => <option key={c.id} value={c.id}>{c.nameAr || c.name || c.nameEn}</option>)}</select></label>
        <label><span>من</span><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label><span>إلى</span><input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      </div>
      <div className="metric-grid">
        <article className="metric"><span>نسبة الحضور</span><strong>{summary.presentPercent || report.summary?.presentPercent || 0}%</strong></article>
        <article className="metric"><span>غياب</span><strong>{summary.ABSENT || report.summary?.ABSENT || 0}</strong></article>
        <article className="metric"><span>تأخير</span><strong>{summary.LATE || report.summary?.LATE || 0}</strong></article>
      </div>
      {loading ? <div className="student-skeleton" /> : <AttendanceMatrix dates={dates} records={report.records || []} students={report.students || []} onStudentClick={openStudent} />}
      {selectedStudent ? <AttendanceStudentModal student={selectedStudent} report={studentReport} onClose={() => setSelectedStudent(null)} /> : null}
    </section>
  );
}
