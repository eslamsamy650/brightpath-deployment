import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiListStudents } from '../../api/schoolClient';
import {
  createGuardian,
  linkGuardianToStudent,
  listGuardianStudents,
  listGuardians,
  updateGuardian,
} from '../../api/guardiansApi';
import { GuardianModal } from './GuardianModal.jsx';

const ADMIN_ROLES = new Set(['SCHOOL_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'REGISTRAR']);

function displayName(row) {
  return row.name || [row.firstNameAr, row.lastNameAr].filter(Boolean).join(' ') || '-';
}

function linkedCount(row) {
  return row.studentGuardians?.length || row.students?.length || 0;
}

export function GuardiansPage({ role }) {
  const canManage = ADMIN_ROLES.has(role);
  const [guardians, setGuardians] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedGuardian, setSelectedGuardian] = useState(null);
  const [linkedStudents, setLinkedStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filteredStudents = useMemo(() => {
    const needle = studentSearch.trim().toLowerCase();
    if (!needle) return students.slice(0, 8);
    return students
      .filter(student =>
        [student.name, student.firstNameAr, student.lastNameAr, student.studentIdNumber]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle)
      )
      .slice(0, 8);
  }, [students, studentSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [guardianResponse, studentResponse] = await Promise.all([
        listGuardians({ limit: 50 }),
        apiListStudents({ limit: 100 }),
      ]);
      setGuardians(guardianResponse.data || []);
      setStudents(studentResponse.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل أولياء الأمور');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function openDetail(guardian) {
    setSelectedGuardian(guardian);
    try {
      const { data } = await listGuardianStudents(guardian.id);
      setLinkedStudents(data || []);
    } catch {
      setLinkedStudents((guardian.studentGuardians || []).map(link => link.student).filter(Boolean));
    }
  }

  async function saveGuardian(payload) {
    setSaving(true);
    try {
      if (modal?.mode === 'edit') {
        const { data } = await updateGuardian(modal.guardian.id, payload);
        setGuardians(current => current.map(item => (item.id === data.id ? data : item)));
      } else {
        const { data } = await createGuardian(payload);
        setGuardians(current => [data, ...current]);
      }
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function linkStudent(studentId) {
    if (!selectedGuardian || !studentId) return;
    setSaving(true);
    try {
      await linkGuardianToStudent({ guardianId: selectedGuardian.id, studentId, isPrimary: false });
      await openDetail(selectedGuardian);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="students-page">
      <div className="students-page__head">
        <div>
          <p>إدارة أولياء الأمور</p>
          <h2>أولياء الأمور</h2>
        </div>
        <button type="button" className="students-button" onClick={() => setModal({ mode: 'add' })} disabled={!canManage}>
          إضافة ولي أمر
        </button>
      </div>

      {error ? (
        <div className="students-error">
          <h3>تعذر التحميل</h3>
          <p>{error}</p>
          <button type="button" className="students-button" onClick={load}>إعادة المحاولة</button>
        </div>
      ) : (
        <div className="module grid-two">
          <div className="students-table-card">
            <div className="students-table-wrap">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>الهاتف</th>
                    <th>البريد</th>
                    <th>عدد الطلاب</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5">جاري التحميل...</td></tr>
                  ) : guardians.length ? (
                    guardians.map(guardian => (
                      <tr key={guardian.id}>
                        <td>{displayName(guardian)}</td>
                        <td>{guardian.phonePrimary || '-'}</td>
                        <td>{guardian.email || '-'}</td>
                        <td>{linkedCount(guardian)}</td>
                        <td>
                          <div className="student-actions">
                            <button type="button" onClick={() => openDetail(guardian)}>عرض</button>
                            <button type="button" onClick={() => setModal({ mode: 'edit', guardian })} disabled={!canManage}>تعديل</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" className="empty">لا توجد بيانات.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="data-card">
            <h2>تفاصيل ولي الأمر</h2>
            {selectedGuardian ? (
              <>
                <p><strong>{displayName(selectedGuardian)}</strong></p>
                <p>{selectedGuardian.phonePrimary || '-'}</p>
                <p>{selectedGuardian.email || '-'}</p>
                <hr />
                <h3>الطلاب المرتبطون</h3>
                {linkedStudents.length ? (
                  linkedStudents.map(student => (
                    <div className="row-lite" key={student.id}>
                      <strong>{student.name || [student.firstNameAr, student.lastNameAr].filter(Boolean).join(' ')}</strong>
                      <span>{student.studentIdNumber}</span>
                    </div>
                  ))
                ) : (
                  <p className="empty">لا يوجد طلاب مرتبطون.</p>
                )}
                {canManage ? (
                  <div className="guardian-linker">
                    <input
                      placeholder="ابحث عن طالب للربط"
                      value={studentSearch}
                      onChange={event => setStudentSearch(event.target.value)}
                    />
                    <select onChange={event => linkStudent(event.target.value)} defaultValue="" disabled={saving}>
                      <option value="">اختر طالب</option>
                      {filteredStudents.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.name || [student.firstNameAr, student.lastNameAr].filter(Boolean).join(' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="empty">اختر ولي أمر لعرض التفاصيل.</p>
            )}
          </aside>
        </div>
      )}

      {modal ? (
        <GuardianModal
          guardian={modal.guardian}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onSubmit={saveGuardian}
          saving={saving}
        />
      ) : null}
    </section>
  );
}
