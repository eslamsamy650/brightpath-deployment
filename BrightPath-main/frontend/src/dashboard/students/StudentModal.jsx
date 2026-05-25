import { useStudentForm } from './useStudentForm.js';

function maskNationalId(value = '') {
  if (!value) return '';
  return value.length <= 4 ? '••••' : `${value.slice(0, 2)}••••••••${value.slice(-2)}`;
}

export function StudentModal({
  canEdit,
  classes = [],
  mode,
  onClose,
  onSubmit,
  saving,
  schoolId,
  student,
}) {
  const form = useStudentForm({ initialStudent: student, schoolId });
  const title = mode === 'add' ? 'إضافة طالب' : mode === 'edit' ? 'تعديل طالب' : 'بيانات الطالب';

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canEdit || !form.validate()) return;
    try {
      await onSubmit(form.toApiPayload());
    } catch (error) {
      form.applyBackendErrors(error);
    }
  }

  return (
    <div className="students-modal-backdrop" role="presentation">
      <section className="students-modal" role="dialog" aria-modal="true" aria-labelledby="student-modal-title">
        <div className="students-modal__head">
          <h2 id="student-modal-title">{title}</h2>
          <button type="button" className="students-button students-button--ghost" onClick={onClose}>
            إغلاق
          </button>
        </div>

        <form className="students-form" onSubmit={handleSubmit}>
          <label>
            الاسم العربي
            <input
              value={form.values.nameAr}
              onChange={event => form.setField('nameAr', event.target.value)}
              disabled={!canEdit}
              required
            />
            {form.errors.nameAr ? <span className="field-error">{form.errors.nameAr}</span> : null}
          </label>

          <label>
            الاسم الإنجليزي
            <input
              value={form.values.nameEn}
              onChange={event => form.setField('nameEn', event.target.value)}
              disabled={!canEdit}
            />
            {form.errors.nameEn ? <span className="field-error">{form.errors.nameEn}</span> : null}
          </label>

          <label>
            كود الطالب
            <input
              value={form.values.studentCode}
              onChange={event => form.setField('studentCode', event.target.value)}
              disabled={!canEdit || mode === 'edit'}
              required
            />
            {form.errors.studentIdNumber ? <span className="field-error">{form.errors.studentIdNumber}</span> : null}
          </label>

          <label>
            تاريخ الميلاد
            <input
              type="date"
              value={form.values.dateOfBirth}
              onChange={event => form.setField('dateOfBirth', event.target.value)}
              disabled={!canEdit}
              required
            />
            {form.errors.dateOfBirth ? <span className="field-error">{form.errors.dateOfBirth}</span> : null}
          </label>

          <fieldset className="students-radio-group" disabled={!canEdit}>
            <legend>النوع</legend>
            <label>
              <input
                type="radio"
                name="gender"
                checked={form.values.gender === 'male'}
                onChange={() => form.setField('gender', 'male')}
              />
              ذكر
            </label>
            <label>
              <input
                type="radio"
                name="gender"
                checked={form.values.gender === 'female'}
                onChange={() => form.setField('gender', 'female')}
              />
              أنثى
            </label>
            {form.errors.gender ? <span className="field-error">{form.errors.gender}</span> : null}
          </fieldset>

          <label>
            الفصل
            <select
              value={form.values.classId}
              onChange={event => form.setField('classId', event.target.value)}
              disabled={!canEdit}
            >
              <option value="">بدون فصل</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.nameAr || cls.name || cls.nameEn}
                </option>
              ))}
            </select>
            {form.errors.classId ? <span className="field-error">{form.errors.classId}</span> : null}
          </label>

          <label>
            تاريخ القيد
            <input
              type="date"
              value={form.values.enrollmentDate}
              onChange={event => form.setField('enrollmentDate', event.target.value)}
              disabled={!canEdit}
            />
            {form.errors.enrollmentDate ? <span className="field-error">{form.errors.enrollmentDate}</span> : null}
          </label>

          <label>
            الرقم القومي
            <div className="sensitive-field">
              <input
                value={form.showNationalId ? form.values.nationalId : maskNationalId(form.values.nationalId)}
                onChange={event => form.setField('nationalId', event.target.value)}
                disabled={!canEdit || !form.showNationalId}
                inputMode="numeric"
              />
              <button
                type="button"
                className="students-button students-button--ghost"
                onClick={() => form.setShowNationalId(value => !value)}
              >
                {form.showNationalId ? 'إخفاء' : 'إظهار'}
              </button>
            </div>
            {form.errors.nationalId ? <span className="field-error">{form.errors.nationalId}</span> : null}
          </label>

          <label>
            الحالة
            <select
              value={String(form.values.isActive)}
              onChange={event => form.setField('isActive', event.target.value === 'true')}
              disabled={!canEdit}
            >
              <option value="true">نشط</option>
              <option value="false">غير نشط</option>
            </select>
          </label>

          {form.errors.form ? <div className="form-level-error">{form.errors.form}</div> : null}

          {canEdit ? (
            <button type="submit" className="students-button" disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          ) : null}
        </form>
      </section>
    </div>
  );
}
