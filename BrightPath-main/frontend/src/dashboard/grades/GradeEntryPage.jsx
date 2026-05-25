import { useEffect, useMemo, useState } from 'react';
import { listClassStudents, listTeacherClasses } from '../../api/attendanceApi';
import { listGradeSubjects, submitBulkGrades } from '../../api/gradesApi';
import { GradeTable } from './GradeTable.jsx';
import { gradeComponents } from './gradeComponents.js';
import './grades.css';

const TERMS = [
  ['Term 1', 'الترم الأول'],
  ['Term 2', 'الترم الثاني'],
  ['Final', 'نهائي'],
];

function draftKey(classId, subjectId, term) {
  return `brightpath.gradeDraft:${classId}:${subjectId}:${term}`;
}

function distribution(rows) {
  return rows.reduce((acc, row) => {
    const pct = row.max ? (row.mark / row.max) * 100 : 0;
    const key = pct < 50 ? 'راسب' : pct >= 85 ? 'ممتاز' : 'ناجح';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function GradeEntryPage() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [grades, setGrades] = useState({});
  const [locked, setLocked] = useState(false);
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void listTeacherClasses({ limit: 100 }).then(({ data }) => {
      setClasses(data || []);
      setClassId(current => current || data?.[0]?.id || '');
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    void Promise.all([listGradeSubjects(classId), listClassStudents(classId)]).then(([subjectRes, rosterRes]) => {
      setSubjects(subjectRes.data || []);
      setSubjectId(current => current || subjectRes.data?.[0]?.id || '');
      setStudents(rosterRes.data || []);
    });
  }, [classId]);

  useEffect(() => {
    if (!classId || !subjectId || !term) return;
    let nextGrades = {};
    try {
      const raw = sessionStorage.getItem(draftKey(classId, subjectId, term));
      nextGrades = raw ? JSON.parse(raw) : {};
    } catch {
      nextGrades = {};
    }
    queueMicrotask(() => {
      setGrades(nextGrades);
      setLocked(false);
    });
  }, [classId, subjectId, term]);

  const flattened = useMemo(() => {
    const rows = [];
    Object.entries(grades).forEach(([studentId, components]) => {
      gradeComponents().forEach(([component, , maxMark]) => {
        const mark = Number(components?.[component]?.mark || 0);
        rows.push({ studentId, component, mark, max: maxMark });
      });
    });
    return rows;
  }, [grades]);

  const average = useMemo(() => {
    if (!students.length) return 0;
    const totals = students.map(student =>
      gradeComponents().reduce((sum, [component]) => sum + Number(grades[student.id]?.[component]?.mark || 0), 0)
    );
    return Math.round((totals.reduce((a, b) => a + b, 0) / Math.max(1, totals.length)) * 100) / 100;
  }, [grades, students]);

  function updateGrade(studentId, component, value, maxMark) {
    const number = Math.max(0, Math.min(Number(value || 0), maxMark));
    setGrades(current => ({
      ...current,
      [studentId]: {
        ...current[studentId],
        [component]: { mark: number, maxMark },
      },
    }));
  }

  function saveDraft() {
    sessionStorage.setItem(draftKey(classId, subjectId, term), JSON.stringify(grades));
    setMessage('تم حفظ المسودة.');
  }

  async function submitFinal() {
    const payload = {
      classId,
      subjectId,
      term,
      grades: flattened.map(row => ({
        studentId: row.studentId,
        component: row.component,
        mark: row.mark,
        maxMark: row.max,
        isFinal: true,
      })),
    };
    const { data } = await submitBulkGrades(payload);
    setStats({ average, distribution: distribution(flattened), saved: data?.length || 0 });
    setLocked(true);
    setMessage('تم اعتماد الدرجات.');
  }

  return (
    <section className="grade-entry-page">
      <div className="students-page__head">
        <div><p>إدخال الدرجات</p><h2>درجات الفصل</h2></div>
        <div className="students-toolbar">
          <button type="button" className="students-button students-button--ghost" onClick={saveDraft} disabled={!subjectId || locked}>حفظ مسودة</button>
          <button type="button" className="students-button" onClick={submitFinal} disabled={!subjectId || locked}>اعتماد نهائي</button>
        </div>
      </div>
      <div className="attendance-steps">
        <label><span>الفصل</span><select value={classId} onChange={e => setClassId(e.target.value)}>{classes.map(c => <option key={c.id} value={c.id}>{c.nameAr || c.name}</option>)}</select></label>
        <label><span>المادة</span><select value={subjectId} onChange={e => setSubjectId(e.target.value)}>{subjects.map(s => <option key={s.id} value={s.id}>{s.titleAr || s.title}</option>)}</select></label>
        <label><span>الترم</span><select value={term} onChange={e => setTerm(e.target.value)}>{TERMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      </div>
      {message ? <div className="notice">{message}</div> : null}
      <div className="metric-grid">
        <article className="metric"><span>متوسط الفصل</span><strong>{average}</strong></article>
        <article className="metric"><span>الحالة</span><strong>{locked ? 'مقفل' : 'مسودة'}</strong></article>
      </div>
      <GradeTable disabled={locked} grades={grades} onChange={updateGrade} students={students} />
      {stats ? <div className="data-card"><h2>التوزيع</h2>{Object.entries(stats.distribution).map(([k, v]) => <p key={k}>{k}: {v}</p>)}</div> : null}
    </section>
  );
}
