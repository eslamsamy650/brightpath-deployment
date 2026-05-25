import { useState } from 'react';

export function ClassModal({
  academicYears = [],
  classItem,
  gradeLevels = [],
  onClose,
  onSubmit,
  saving,
  schoolId,
  teachers = [],
}) {
  const [values, setValues] = useState(() => ({
    schoolId: classItem?.schoolId || schoolId,
    academicYearId: classItem?.academicYearId || academicYears[0]?.id || '',
    gradeLevelId: classItem?.gradeLevelId || gradeLevels[0]?.id || '',
    nameAr: classItem?.nameAr || '',
    nameEn: classItem?.nameEn || '',
    capacity: classItem?.capacity || 40,
    homeroomTeacherId: classItem?.homeroomTeacherId || '',
    roomNumber: classItem?.roomNumber || '',
  }));
  const [errors, setErrors] = useState({});

  function setField(key, value) {
    setValues(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: '' }));
  }

  function validate() {
    const next = {};
    if (!values.nameAr.trim()) next.nameAr = 'اسم الفصل العربي مطلوب';
    if (!values.nameEn.trim()) next.nameEn = 'اسم الفصل الإنجليزي مطلوب';
    if (!values.academicYearId) next.academicYearId = 'اختر العام الدراسي';
    if (!values.gradeLevelId) next.gradeLevelId = 'اختر الصف';
    if (!Number(values.capacity) || Number(values.capacity) < 1) next.capacity = 'السعة يجب أن تكون أكبر من صفر';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  return (
    <div className="students-modal-backdrop" role="presentation">
      <section className="students-modal" role="dialog" aria-modal="true" aria-labelledby="class-modal-title">
        <div className="students-modal__head">
          <h2 id="class-modal-title">{classItem ? 'تعديل فصل' : 'إضافة فصل'}</h2>
          <button type="button" className="students-button students-button--ghost" onClick={onClose}>إغلاق</button>
        </div>
        <form
          className="students-form"
          onSubmit={event => {
            event.preventDefault();
            if (validate()) onSubmit({ ...values, capacity: Number(values.capacity), homeroomTeacherId: values.homeroomTeacherId || null });
          }}
        >
          <label>
            اسم الفصل عربي
            <input value={values.nameAr} onChange={event => setField('nameAr', event.target.value)} />
            {errors.nameAr ? <span className="field-error">{errors.nameAr}</span> : null}
          </label>
          <label>
            اسم الفصل إنجليزي
            <input value={values.nameEn} onChange={event => setField('nameEn', event.target.value)} />
            {errors.nameEn ? <span className="field-error">{errors.nameEn}</span> : null}
          </label>
          <label>
            الصف
            <select value={values.gradeLevelId} onChange={event => setField('gradeLevelId', event.target.value)}>
              {gradeLevels.map(level => (
                <option key={level.id} value={level.id}>{level.nameAr || level.name || level.nameEn}</option>
              ))}
            </select>
            {errors.gradeLevelId ? <span className="field-error">{errors.gradeLevelId}</span> : null}
          </label>
          <label>
            العام الدراسي
            <select value={values.academicYearId} onChange={event => setField('academicYearId', event.target.value)}>
              {academicYears.map(year => (
                <option key={year.id} value={year.id}>{year.nameAr || year.name || year.nameEn}</option>
              ))}
            </select>
            {errors.academicYearId ? <span className="field-error">{errors.academicYearId}</span> : null}
          </label>
          <label>
            معلم الفصل
            <select value={values.homeroomTeacherId} onChange={event => setField('homeroomTeacherId', event.target.value)}>
              <option value="">بدون معلم</option>
              {teachers.map(teacher => (
                <option key={teacher.userId || teacher.id} value={teacher.userId || teacher.id}>
                  {teacher.name || [teacher.firstNameAr, teacher.lastNameAr].filter(Boolean).join(' ') || teacher.user?.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            السعة
            <input type="number" value={values.capacity} onChange={event => setField('capacity', event.target.value)} />
            {errors.capacity ? <span className="field-error">{errors.capacity}</span> : null}
          </label>
          <label>
            رقم القاعة
            <input value={values.roomNumber} onChange={event => setField('roomNumber', event.target.value)} />
          </label>
          <button type="submit" className="students-button" disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </form>
      </section>
    </div>
  );
}
