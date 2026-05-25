import { useCallback, useEffect, useMemo, useState } from 'react';
import { bulkDeactivateStudents, createStudent, deactivateStudent, getStudent, listStudents, updateStudent } from '../../api/studentsApi';
import { apiListClasses } from '../../api/schoolClient';
import { StudentFilters } from './StudentFilters.jsx';
import { StudentModal } from './StudentModal.jsx';
import { StudentTable } from './StudentTable.jsx';
import './students.css';

const DEFAULT_FILTERS = {
  page: 1,
  limit: 10,
  search: '',
  classId: '',
  gender: '',
  isActive: '',
};

const ADMIN_ROLES = new Set(['SCHOOL_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'REGISTRAR']);

function isAdminRole(role) {
  return ADMIN_ROLES.has(role);
}

function emptyMeta(filters) {
  return {
    page: filters.page,
    limit: filters.limit,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };
}

function studentMatchesClientFilters(student, filters) {
  const search = filters.search.trim().toLowerCase();
  if (search) {
    const haystack = [
      student.name,
      student.firstNameAr,
      student.lastNameAr,
      student.firstNameEn,
      student.lastNameEn,
      student.studentIdNumber,
      student.studentCode,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(search)) return false;
  }
  if (filters.gender && student.gender !== filters.gender) return false;
  return true;
}

function schoolIdFrom(profile, fallbackSchoolId) {
  return (
    profile?.adminProfile?.schoolId ||
    profile?.teacherProfile?.schoolId ||
    profile?.studentProfile?.schoolId ||
    fallbackSchoolId ||
    ''
  );
}

function blankStudent(schoolId) {
  return {
    schoolId,
    nameAr: '',
    nameEn: '',
    studentCode: '',
    gender: 'male',
    dateOfBirth: '2016-10-01',
    nationalId: '',
    enrollmentDate: new Date().toISOString().slice(0, 10),
    classId: '',
    isActive: true,
  };
}

function normalizePayload(formValue) {
  const { classId, ...studentPayload } = formValue;
  void classId;
  return {
    ...studentPayload,
    nationalId: studentPayload.nationalId || null,
    firstNameEn: studentPayload.firstNameEn || null,
    lastNameEn: studentPayload.lastNameEn || null,
    isActive: formValue.isActive === true || formValue.isActive === 'true',
  };
}

export function StudentsPage({ fallbackSchoolId = '', profile, role }) {
  const canManage = isAdminRole(role);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState(emptyMeta(DEFAULT_FILTERS));
  const [classes, setClasses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const schoolId = schoolIdFrom(profile, fallbackSchoolId);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = {
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
        classId: filters.classId,
        gender: filters.gender,
        isActive: filters.isActive,
      };
      const [{ data, meta: responseMeta }, classResponse] = await Promise.all([
        listStudents(query),
        apiListClasses({ limit: 100 }).catch(() => ({ data: [] })),
      ]);
      const filtered = (data || []).filter(student => studentMatchesClientFilters(student, filters));
      setStudents(filtered);
      setMeta(responseMeta || emptyMeta(filters));
      setClasses(classResponse.data || []);
      setSelectedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل الطلاب');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    queueMicrotask(() => void loadStudents());
  }, [loadStudents]);

  const selectedActiveCount = useMemo(
    () => students.filter(student => selectedIds.includes(student.id) && student.isActive !== false).length,
    [students, selectedIds]
  );

  function openAddModal() {
    setModal({ mode: 'add', student: blankStudent(schoolId) });
  }

  async function openEditModal(student) {
    try {
      const { data } = await getStudent(student.id);
      setModal({ mode: 'edit', student: { ...blankStudent(schoolId), ...data } });
    } catch {
      setModal({ mode: 'edit', student: { ...blankStudent(schoolId), ...student } });
    }
  }

  async function saveStudent(payload) {
    setSaving(true);
    try {
      const body = normalizePayload(payload);
      if (modal.mode === 'edit') {
        const allowedUpdate = { ...body };
        delete allowedUpdate.schoolId;
        delete allowedUpdate.studentIdNumber;
        await updateStudent(modal.student.id, allowedUpdate);
        setStudents(current =>
          current.map(student =>
            student.id === modal.student.id ? { ...student, ...allowedUpdate } : student
          )
        );
      } else {
        const { data: created } = await createStudent(body);
        setStudents(current => [created, ...current]);
      }
      setModal(null);
      await loadStudents();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(student) {
    if (!canManage) return;
    setSaving(true);
    try {
      await deactivateStudent(student.id);
      await loadStudents();
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkDeactivate() {
    if (!canManage || selectedActiveCount === 0) return;
    setSaving(true);
    try {
      await bulkDeactivateStudents(selectedIds);
      await loadStudents();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="students-page">
      <div className="students-page__head">
        <div>
          <p>إدارة الطلاب</p>
          <h2>قائمة الطلاب</h2>
        </div>
        <div className="students-toolbar">
          <button
            type="button"
            className="students-button students-button--ghost"
            onClick={handleBulkDeactivate}
            disabled={!canManage || selectedActiveCount === 0 || saving}
          >
            تعطيل المحدد
          </button>
          <button type="button" className="students-button" onClick={openAddModal} disabled={!canManage}>
            إضافة طالب
          </button>
        </div>
      </div>

      {!canManage ? (
        <div className="students-readonly">وضع قراءة فقط: يمكن للمعلم عرض بيانات الطلاب دون إضافة أو تعديل أو تعطيل.</div>
      ) : null}

      <StudentFilters
        classes={classes}
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {error ? (
        <ErrorState message={error} onRetry={loadStudents} />
      ) : students.length === 0 && !loading ? (
        <EmptyState onAdd={canManage ? openAddModal : null} />
      ) : (
        <>
          <StudentTable
            canManage={canManage}
            loading={loading}
            onDeactivate={handleDeactivate}
            onEdit={openEditModal}
            onSelectAll={checked => setSelectedIds(checked ? students.map(student => student.id) : [])}
            onSelectOne={(id, checked) =>
              setSelectedIds(current => (checked ? [...current, id] : current.filter(item => item !== id)))
            }
            onView={student => setModal({ mode: 'view', student })}
            selectedIds={selectedIds}
            students={students}
          />
          <Pagination
            meta={meta}
            onPageChange={page => setFilters(current => ({ ...current, page }))}
          />
        </>
      )}

      {modal ? (
        <StudentModal
          canEdit={canManage && modal.mode !== 'view'}
          classes={classes}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onSubmit={saveStudent}
          saving={saving}
          schoolId={schoolId}
          student={modal.student}
        />
      ) : null}
    </section>
  );
}

function Pagination({ meta, onPageChange }) {
  return (
    <div className="students-pagination">
      <span>
        صفحة {meta.page || 1} من {meta.totalPages || 1}
      </span>
      <div>
        <button
          type="button"
          className="students-button students-button--ghost"
          onClick={() => onPageChange((meta.page || 1) - 1)}
          disabled={!meta.hasPrevPage}
        >
          السابق
        </button>
        <button
          type="button"
          className="students-button students-button--ghost"
          onClick={() => onPageChange((meta.page || 1) + 1)}
          disabled={!meta.hasNextPage}
        >
          التالي
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="students-empty">
      <svg viewBox="0 0 180 120" role="img" aria-label="No students">
        <rect x="24" y="22" width="132" height="78" rx="8" />
        <circle cx="70" cy="56" r="14" />
        <path d="M46 88c8-18 40-18 48 0" />
        <path d="M106 48h28M106 64h28M106 80h18" />
      </svg>
      <h3>لا توجد بيانات طلاب</h3>
      <p>غيّر الفلاتر أو أضف أول طالب في هذا النطاق.</p>
      {onAdd ? (
        <button type="button" className="students-button" onClick={onAdd}>
          إضافة طالب
        </button>
      ) : null}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="students-error">
      <h3>تعذر تحميل قائمة الطلاب</h3>
      <p>{message}</p>
      <button type="button" className="students-button" onClick={onRetry}>
        إعادة المحاولة
      </button>
    </div>
  );
}
