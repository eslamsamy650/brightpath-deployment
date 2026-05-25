import { useCallback, useEffect, useMemo, useState } from 'react';
import { getReportCard, saveReportRemarks } from '../../api/gradesApi';
import { listStudents } from '../../api/studentsApi';
import { ReportCardPrint } from './ReportCardPrint.jsx';
import './report-card.css';

const TERMS = [
  ['Term 1', 'الترم الأول'],
  ['Term 2', 'الترم الثاني'],
  ['Final', 'نهائي'],
];

function currentAcademicYear() {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
}

function studentName(student = {}) {
  return (
    student.name ||
    [student.firstNameAr, student.lastNameAr].filter(Boolean).join(' ') ||
    [student.firstNameEn, student.lastNameEn].filter(Boolean).join(' ') ||
    student.studentIdNumber ||
    'طالب'
  );
}

export function ReportCardPage() {
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeStudentId, setActiveStudentId] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [reports, setReports] = useState({});
  const [remarks, setRemarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void listStudents({ limit: 100 }).then(({ data }) => {
      const rows = data || [];
      setStudents(rows);
      setActiveStudentId(current => current || rows[0]?.id || '');
      setSelectedIds(current => current.length ? current : rows[0]?.id ? [rows[0].id] : []);
    });
  }, []);

  const loadReport = useCallback(async (studentId) => {
    setLoading(true);
    setMessage('');
    try {
      const { data } = await getReportCard(studentId, { term, academicYear });
      setReports(current => ({ ...current, [studentId]: data }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'تعذر تحميل بطاقة التقرير.');
    } finally {
      setLoading(false);
    }
  }, [academicYear, term]);

  useEffect(() => {
    if (!activeStudentId) return;
    queueMicrotask(() => {
      void loadReport(activeStudentId);
    });
  }, [activeStudentId, loadReport]);

  const selectedReports = useMemo(
    () => selectedIds.map(id => reports[id]).filter(Boolean),
    [reports, selectedIds]
  );

  function toggleStudent(studentId) {
    setSelectedIds(current =>
      current.includes(studentId) ? current.filter(id => id !== studentId) : [...current, studentId]
    );
    setActiveStudentId(studentId);
  }

  async function ensureSelectedReports() {
    const missing = selectedIds.filter(id => !reports[id]);
    if (!missing.length) return;
    setLoading(true);
    try {
      const loaded = await Promise.all(missing.map(id => getReportCard(id, { term, academicYear })));
      setReports(current => {
        const next = { ...current };
        loaded.forEach((response, index) => {
          next[missing[index]] = response.data;
        });
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  async function printSelected() {
    await ensureSelectedReports();
    window.setTimeout(() => window.print(), 100);
  }

  async function saveRemarksForActive() {
    if (!activeStudentId) return;
    await saveReportRemarks({
      studentId: activeStudentId,
      term,
      academicYear,
      remarks: remarks[activeStudentId] || '',
    });
    setMessage('تم حفظ ملاحظات بطاقة التقرير.');
  }

  return (
    <section className="report-card-page">
      <div className="students-page__head report-controls">
        <div>
          <p>كروت الدرجات</p>
          <h2>بطاقات تقرير الطلاب</h2>
        </div>
        <div className="students-toolbar">
          <button type="button" className="students-button students-button--ghost" onClick={saveRemarksForActive} disabled={!activeStudentId}>
            حفظ الملاحظات
          </button>
          <button type="button" className="students-button" onClick={printSelected} disabled={!selectedIds.length || loading}>
            طباعة المحدد
          </button>
        </div>
      </div>

      <div className="attendance-steps report-toolbar">
        <label>
          <span>الترم</span>
          <select value={term} onChange={event => setTerm(event.target.value)}>
            {TERMS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>العام الدراسي</span>
          <input value={academicYear} onChange={event => setAcademicYear(event.target.value)} />
        </label>
        <label>
          <span>عرض طالب</span>
          <select value={activeStudentId} onChange={event => setActiveStudentId(event.target.value)}>
            {students.map(student => <option key={student.id} value={student.id}>{studentName(student)}</option>)}
          </select>
        </label>
      </div>

      {message ? <div className="notice">{message}</div> : null}

      <div className="report-card-workspace">
        <aside className="report-student-picker">
          <h3>اختيار للطباعة</h3>
          {students.map(student => (
            <label key={student.id} className={student.id === activeStudentId ? 'is-active' : ''}>
              <input
                type="checkbox"
                checked={selectedIds.includes(student.id)}
                onChange={() => toggleStudent(student.id)}
              />
              <span>{studentName(student)}</span>
            </label>
          ))}
        </aside>

        <main className="report-preview-panel">
          {loading && !reports[activeStudentId] ? <div className="student-skeleton" /> : null}
          {reports[activeStudentId] ? (
            <>
              <label className="remarks-box">
                <span>ملاحظات المعلم / الإدارة</span>
                <textarea
                  value={remarks[activeStudentId] || ''}
                  onChange={event => setRemarks(current => ({ ...current, [activeStudentId]: event.target.value }))}
                  rows="4"
                />
              </label>
              <ReportCardPrint reports={[reports[activeStudentId]]} remarks={remarks} />
            </>
          ) : (
            <div className="data-card empty-card">
              <h2>لا توجد بطاقة محددة</h2>
              <p>اختر طالبا لعرض بطاقة التقرير.</p>
            </div>
          )}
        </main>
      </div>

      <div className="print-only">
        <ReportCardPrint reports={selectedReports.length ? selectedReports : reports[activeStudentId] ? [reports[activeStudentId]] : []} remarks={remarks} />
      </div>
    </section>
  );
}
