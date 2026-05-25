import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiListAcademicYears, apiListGradeLevels } from '../../api/schoolClient';
import { createClass, listClassStudents, listClasses, listStaff, updateClass } from '../../api/classesApi';
import { ClassCard } from './ClassCard.jsx';
import { ClassModal } from './ClassModal.jsx';
import './classes.css';

const ADMIN_ROLES = new Set(['SCHOOL_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'REGISTRAR']);
const TABS = [
  ['all', 'الكل'],
  ['primary', 'ابتدائي'],
  ['preparatory', 'إعدادي'],
  ['secondary', 'ثانوي'],
];

function schoolIdFrom(profile, fallbackSchoolId) {
  return profile?.adminProfile?.schoolId || profile?.teacherProfile?.schoolId || fallbackSchoolId || '';
}

function stageForLevel(level) {
  const order = Number(level?.orderIndex || 0);
  const name = `${level?.nameEn || ''} ${level?.nameAr || ''}`.toLowerCase();
  if (name.includes('secondary') || order >= 10) return 'secondary';
  if (name.includes('prep') || order >= 7) return 'preparatory';
  return 'primary';
}

export function ClassesPage({ fallbackSchoolId = '', profile, role }) {
  const canManage = ADMIN_ROLES.has(role);
  const [classes, setClasses] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [detail, setDetail] = useState(null);
  const [roster, setRoster] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const schoolId = schoolIdFrom(profile, fallbackSchoolId);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [classResponse, levelResponse, yearResponse, staffResponse] = await Promise.all([
        listClasses({ limit: 100 }),
        apiListGradeLevels({ limit: 100 }),
        apiListAcademicYears({ limit: 100 }),
        listStaff({ limit: 100 }),
      ]);
      setClasses(classResponse.data || []);
      setGradeLevels(levelResponse.data || []);
      setAcademicYears(yearResponse.data || []);
      setTeachers((staffResponse.data || []).filter(member => member.user?.role === 'TEACHER' || member.user?.role === 'Teacher'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل الفصول');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const visibleClasses = useMemo(
    () =>
      activeTab === 'all'
        ? classes
        : classes.filter(cls => stageForLevel(cls.gradeLevel) === activeTab),
    [activeTab, classes]
  );

  async function openDetail(cls) {
    setDetail(cls);
    try {
      const { data } = await listClassStudents(cls.id);
      setRoster(data || []);
    } catch {
      setRoster([]);
    }
  }

  async function saveClass(payload) {
    setSaving(true);
    try {
      if (modal?.classItem) {
        const body = { ...payload };
        delete body.schoolId;
        const { data } = await updateClass(modal.classItem.id, body);
        setClasses(current => current.map(item => (item.id === data.id ? data : item)));
      } else {
        const { data } = await createClass(payload);
        setClasses(current => [data, ...current]);
      }
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="classes-page">
      <div className="students-page__head">
        <div>
          <p>إدارة الفصول</p>
          <h2>الفصول الدراسية</h2>
        </div>
        <button type="button" className="students-button" onClick={() => setModal({})} disabled={!canManage}>
          إضافة فصل
        </button>
      </div>

      <div className="class-tabs">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" className={activeTab === key ? 'is-active' : ''} onClick={() => setActiveTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="students-error">
          <h3>تعذر التحميل</h3>
          <p>{error}</p>
          <button type="button" className="students-button" onClick={load}>إعادة المحاولة</button>
        </div>
      ) : loading ? (
        <div className="class-grid">{Array.from({ length: 6 }).map((_, index) => <div className="student-skeleton" key={index} />)}</div>
      ) : (
        <div className="module grid-two">
          <div className="class-grid">
            {visibleClasses.map(cls => (
              <ClassCard key={cls.id} classItem={cls} onClick={openDetail} />
            ))}
          </div>
          <aside className="data-card">
            <h2>تفاصيل الفصل</h2>
            {detail ? (
              <>
                <p><strong>{detail.nameAr || detail.name || detail.nameEn}</strong></p>
                <p>ملخص الحضور: {roster.length ? 'جاهز للتكامل مع سجلات الحضور' : 'لا توجد قائمة طلاب بعد'}</p>
                {canManage ? (
                  <button type="button" className="students-button students-button--ghost" onClick={() => setModal({ classItem: detail })}>
                    تعديل الفصل
                  </button>
                ) : null}
                <h3>قائمة الطلاب</h3>
                {roster.length ? roster.map(student => (
                  <div className="row-lite" key={student.id}>
                    <strong>{student.name || [student.firstNameAr, student.lastNameAr].filter(Boolean).join(' ')}</strong>
                    <span>{student.studentIdNumber}</span>
                  </div>
                )) : <p className="empty">لا توجد بيانات طلاب لهذا الفصل.</p>}
              </>
            ) : (
              <p className="empty">اختر فصل لعرض التفاصيل.</p>
            )}
          </aside>
        </div>
      )}

      {modal ? (
        <ClassModal
          academicYears={academicYears}
          classItem={modal.classItem}
          gradeLevels={gradeLevels}
          onClose={() => setModal(null)}
          onSubmit={saveClass}
          saving={saving}
          schoolId={schoolId}
          teachers={teachers}
        />
      ) : null}
    </section>
  );
}
