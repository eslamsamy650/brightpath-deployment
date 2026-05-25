import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiListAcademicYears, apiListGradeLevels } from '../../api/schoolClient';
import { listStudents } from '../../api/studentsApi';
import {
  assignFees,
  createFeeStructureBundle,
  getFeeOverview,
  groupFeeStructures,
  listFeeStructures,
  schoolIdFromProfile,
} from '../../api/financeApi';
import { LoadErrorBanner } from '../../components/LoadErrorBanner.jsx';
import { FeeOverviewCards } from './FeeOverviewCards.jsx';
import { FeeStructureModal } from './FeeStructureModal.jsx';
import './fees.css';

const schoolIdFrom = schoolIdFromProfile;

function levelName(levels, id) {
  const level = levels.find(item => item.id === id);
  return level?.nameAr || level?.nameEn || level?.name || 'كل المراحل';
}

function yearName(years, id) {
  const year = years.find(item => item.id === id);
  return year?.nameAr || year?.nameEn || year?.name || '-';
}

export function FeeStructurePage({ fallbackSchoolId = '', profile, role }) {
  const canManage = ['SCHOOL_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'REGISTRAR'].includes(role);
  const schoolId = schoolIdFrom(profile, fallbackSchoolId);
  const [structures, setStructures] = useState([]);
  const [overview, setOverview] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [assignTarget, setAssignTarget] = useState({ mode: 'grade', gradeLevelId: '', studentId: '' });
  const [studentQuery, setStudentQuery] = useState('');
  const [studentHits, setStudentHits] = useState([]);

  const grouped = useMemo(() => groupFeeStructures(structures), [structures]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [feeRes, yearRes, levelRes, overviewRes] = await Promise.all([
        listFeeStructures({ schoolId, limit: 100 }),
        apiListAcademicYears({ limit: 100 }),
        apiListGradeLevels({ limit: 100 }),
        getFeeOverview({ schoolId }),
      ]);
      setStructures(feeRes.data || []);
      setAcademicYears(yearRes.data || []);
      setGradeLevels(levelRes.data || []);
      setOverview(overviewRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل هياكل المصروفات');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    if (modal?.mode !== 'assign' || assignTarget.mode !== 'student' || !studentQuery.trim()) {
      setStudentHits([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      void listStudents({ search: studentQuery.trim(), limit: 8, isActive: true })
        .then(res => setStudentHits(res.data || []))
        .catch(() => setStudentHits([]));
    }, 280);
    return () => clearTimeout(timer);
  }, [assignTarget.mode, modal?.mode, studentQuery]);

  async function handleCreate(payload) {
    setSaving(true);
    try {
      await createFeeStructureBundle({
        schoolId,
        academicYearId: payload.academicYearId,
        gradeLevelId: payload.gradeLevelId,
        nameAr: payload.nameAr,
        nameEn: payload.nameEn,
        items: payload.items,
      });
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(payload) {
    if (!modal?.structure) return;
    setSaving(true);
    try {
      const studentIds = assignTarget.mode === 'student' && assignTarget.studentId ? [assignTarget.studentId] : [];
      await assignFees({
        structureGroup: modal.structure,
        installments: payload.installments,
        studentIds,
        gradeLevelId: assignTarget.mode === 'grade' ? assignTarget.gradeLevelId || modal.structure.gradeLevelId : undefined,
      });
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="fees-page">
      <div className="students-page__head">
        <div>
          <p>المالية</p>
          <h2>هياكل المصروفات</h2>
        </div>
        <button type="button" className="students-button" disabled={!canManage} onClick={() => setModal({ mode: 'create' })}>
          إنشاء هيكل
        </button>
      </div>

      <FeeOverviewCards overview={overview} loading={loading} />

      <LoadErrorBanner message={error} onRetry={load} />

      {!error ? (
        <div className="fee-structure-table">
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>العام الدراسي</th>
                <th>المرحلة</th>
                <th>الإجمالي</th>
                <th>البنود / الأقساط</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>جاري التحميل…</td>
                </tr>
              ) : grouped.length ? (
                grouped.map(structure => (
                  <tr key={structure.key}>
                    <td>{structure.name}</td>
                    <td>{yearName(academicYears, structure.academicYearId)}</td>
                    <td>{levelName(gradeLevels, structure.gradeLevelId)}</td>
                    <td>{structure.totalAmount.toLocaleString('ar-EG')} ج.م</td>
                    <td className="fee-items-inline">
                      {structure.items.length} بند
                      <br />
                      عيّن الأقساط عند التوزيع على الطلاب
                    </td>
                    <td>
                      <button
                        type="button"
                        className="students-button students-button--ghost"
                        disabled={!canManage}
                        onClick={() => {
                          setAssignTarget({
                            mode: 'grade',
                            gradeLevelId: structure.gradeLevelId || '',
                            studentId: '',
                          });
                          setModal({ mode: 'assign', structure });
                        }}
                      >
                        تعيين
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="empty">
                    لا توجد هياكل مصروفات بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {modal?.mode === 'create' ? (
        <FeeStructureModal
          academicYears={academicYears}
          gradeLevels={gradeLevels}
          mode="create"
          onClose={() => setModal(null)}
          onSubmit={handleCreate}
          saving={saving}
        />
      ) : null}

      {modal?.mode === 'assign' ? (
        <>
          <div className="data-card">
            <h3>نطاق التعيين</h3>
            <div className="finance-row-grid">
              <label>
                النطاق
                <select
                  value={assignTarget.mode}
                  onChange={event => setAssignTarget(current => ({ ...current, mode: event.target.value }))}
                >
                  <option value="grade">صف / مرحلة كاملة</option>
                  <option value="student">طالب محدد</option>
                </select>
              </label>
              {assignTarget.mode === 'grade' ? (
                <label>
                  المرحلة
                  <select
                    value={assignTarget.gradeLevelId}
                    onChange={event => setAssignTarget(current => ({ ...current, gradeLevelId: event.target.value }))}
                  >
                    <option value="">اختر المرحلة</option>
                    {gradeLevels.map(level => (
                      <option key={level.id} value={level.id}>
                        {level.nameAr || level.nameEn}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label>
                  بحث عن طالب
                  <input
                    value={studentQuery}
                    onChange={event => setStudentQuery(event.target.value)}
                    placeholder="الاسم أو كود الطالب"
                  />
                </label>
              )}
            </div>
            {assignTarget.mode === 'student' && studentHits.length ? (
              <div className="student-search-results">
                {studentHits.map(student => (
                  <button
                    type="button"
                    key={student.id}
                    className={`student-search-hit ${assignTarget.studentId === student.id ? 'is-selected' : ''}`}
                    onClick={() => {
                      setAssignTarget(current => ({ ...current, studentId: student.id }));
                      setStudentQuery(
                        student.name ||
                          [student.firstNameAr, student.lastNameAr].filter(Boolean).join(' ')
                      );
                      setStudentHits([]);
                    }}
                  >
                    {student.studentCode || student.studentIdNumber} —{' '}
                    {student.name || [student.firstNameAr, student.lastNameAr].filter(Boolean).join(' ')}
                  </button>
                ))}
              </div>
            ) : null}
            {assignTarget.mode === 'student' ? (
              <p className="fee-items-inline">
                {assignTarget.studentId ? 'تم اختيار الطالب' : 'اختر طالبًا من نتائج البحث'}
              </p>
            ) : null}
          </div>
          <FeeStructureModal
            academicYears={academicYears}
            gradeLevels={gradeLevels}
            mode="assign"
            onClose={() => setModal(null)}
            onSubmit={handleAssign}
            saving={saving}
          />
        </>
      ) : null}
    </section>
  );
}
