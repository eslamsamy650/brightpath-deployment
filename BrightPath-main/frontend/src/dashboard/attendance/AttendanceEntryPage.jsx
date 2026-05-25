import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getClassAttendance,
  listClassStudents,
  listTeacherClasses,
  submitBulkAttendance,
} from '../../api/attendanceApi';
import { StudentAttendanceRow } from './StudentAttendanceRow.jsx';
import './attendance-entry.css';

const DRAFT_PREFIX = 'brightpath.attendanceDraft';
const today = () => new Date().toISOString().slice(0, 10);

function draftKey(classId, date) {
  return `${DRAFT_PREFIX}:${classId}:${date}`;
}

function toRecordMap(students, existingRecords = []) {
  const existingByStudent = new Map(existingRecords.map(record => [record.studentId, record]));
  return Object.fromEntries(
    students.map(student => {
      const existing = existingByStudent.get(student.id);
      return [
        student.id,
        {
          studentId: student.id,
          status: existing?.status || 'PRESENT',
          note: existing?.note || existing?.notesAr || existing?.notesEn || '',
        },
      ];
    })
  );
}

function countsFromRecords(records) {
  return Object.values(records).reduce(
    (acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    },
    { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 }
  );
}

function readDraft(classId, date) {
  try {
    const raw = sessionStorage.getItem(draftKey(classId, date));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDraft(classId, date, value) {
  try {
    sessionStorage.setItem(draftKey(classId, date), JSON.stringify(value));
  } catch {
    // Session storage is best-effort offline support.
  }
}

function clearDraft(classId, date) {
  try {
    sessionStorage.removeItem(draftKey(classId, date));
  } catch {
    // Ignore storage failures.
  }
}

export function AttendanceEntryPage() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today());
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [submittedRecords, setSubmittedRecords] = useState([]);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const counts = useMemo(() => countsFromRecords(records), [records]);

  useEffect(() => {
    let cancelled = false;
    async function loadClasses() {
      setLoading(true);
      setError('');
      try {
        const { data } = await listTeacherClasses({ limit: 100 });
        if (cancelled) return;
        setClasses(data || []);
        setClassId(current => current || data?.[0]?.id || '');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'تعذر تحميل الفصول');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadClasses();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadRosterAndAttendance = useCallback(async () => {
    if (!classId || !date) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const [rosterResponse, attendanceResponse] = await Promise.all([
        listClassStudents(classId),
        getClassAttendance({ classId, date }).catch(() => ({ data: [] })),
      ]);
      const roster = rosterResponse.data || [];
      const existing = attendanceResponse.data || [];
      const draft = readDraft(classId, date);
      setStudents(roster);
      setSubmittedRecords(existing);
      setReadOnly(existing.length > 0 && !draft);
      setRecords(draft?.records || toRecordMap(roster, existing));
      if (draft?.pending) setMessage('تم حفظ مسودة محلية. سيتم الإرسال عند عودة الاتصال.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل كشف الحضور');
    } finally {
      setLoading(false);
    }
  }, [classId, date]);

  useEffect(() => {
    queueMicrotask(() => void loadRosterAndAttendance());
  }, [loadRosterAndAttendance]);

  useEffect(() => {
    if (!classId || !date || readOnly || Object.keys(records).length === 0) return;
    writeDraft(classId, date, { classId, date, records, pending: false });
  }, [classId, date, readOnly, records]);

  const submitAttendance = useCallback(async (payload, options = {}) => {
    if (!payload.classId || Object.keys(payload.records || {}).length === 0) return;
    const body = {
      classId: payload.classId,
      date: payload.date,
      records: Object.values(payload.records).map(record => ({
        studentId: record.studentId,
        status: record.status,
        note: record.note || undefined,
      })),
    };

    if (!navigator.onLine && !options.forceOnline) {
      writeDraft(payload.classId, payload.date, { ...payload, pending: true });
      setMessage('أنت غير متصل. تم حفظ الحضور وسيتم إرساله عند عودة الاتصال.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const { data } = await submitBulkAttendance(body);
      clearDraft(payload.classId, payload.date);
      setSubmittedRecords(data || []);
      setReadOnly(true);
      setMessage('تم حفظ الحضور بنجاح.');
    } catch (err) {
      writeDraft(payload.classId, payload.date, { ...payload, pending: true });
      setError(err instanceof Error ? err.message : 'تعذر حفظ الحضور');
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    function handleOnline() {
      const draft = readDraft(classId, date);
      if (draft?.pending) void submitAttendance(draft, { forceOnline: true });
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [classId, date, submitAttendance]);

  function updateRecord(studentId, patch) {
    setRecords(current => ({
      ...current,
      [studentId]: { ...current[studentId], ...patch },
    }));
  }

  function enableEdit() {
    setReadOnly(false);
    setRecords(toRecordMap(students, submittedRecords));
  }

  return (
    <section className="attendance-entry-page">
      <div className="attendance-entry-head">
        <div>
          <p>حضور يومي</p>
          <h2>تسجيل حضور الطلاب</h2>
        </div>
        {readOnly ? (
          <button type="button" className="students-button students-button--ghost" onClick={enableEdit}>
            تعديل الحضور
          </button>
        ) : null}
      </div>

      <div className="attendance-steps">
        <label>
          <span>1. اختر الفصل</span>
          <select value={classId} onChange={event => setClassId(event.target.value)} disabled={loading}>
            <option value="">اختر الفصل</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.nameAr || cls.name || cls.nameEn}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>2. التاريخ</span>
          <input
            type="date"
            max={today()}
            value={date}
            onChange={event => setDate(event.target.value)}
          />
        </label>
      </div>

      {message ? <div className="notice">{message}</div> : null}
      {error ? <div className="students-error"><h3>تعذر تحميل الحضور</h3><p>{error}</p><button type="button" className="students-button" onClick={loadRosterAndAttendance}>إعادة المحاولة</button></div> : null}

      <div className="attendance-roster">
        {loading ? (
          Array.from({ length: 7 }).map((_, index) => <div className="student-skeleton" key={index} />)
        ) : students.length ? (
          students.map(student => (
            <StudentAttendanceRow
              key={student.id}
              disabled={readOnly || saving}
              onChange={updateRecord}
              record={records[student.id] || { studentId: student.id, status: 'PRESENT', note: '' }}
              student={student}
            />
          ))
        ) : (
          <div className="students-empty">
            <h3>لا توجد قائمة طلاب</h3>
            <p>اختر فصلا يحتوي على طلاب مسجلين.</p>
          </div>
        )}
      </div>

      {!readOnly ? (
        <div className="attendance-submit-bar">
          <div>
            حاضر: {counts.PRESENT} | غائب: {counts.ABSENT} | متأخر: {counts.LATE} | بعذر: {counts.EXCUSED}
          </div>
          <button
            type="button"
            className="students-button"
            onClick={() => submitAttendance({ classId, date, records })}
            disabled={!classId || students.length === 0 || saving}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ الحضور'}
          </button>
        </div>
      ) : (
        <div className="attendance-submit-bar is-readonly">
          تم تسجيل حضور هذا اليوم. حاضر: {counts.PRESENT} | غائب: {counts.ABSENT} | متأخر: {counts.LATE}
        </div>
      )}
    </section>
  );
}
