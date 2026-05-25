import { useState } from 'react';

const PHONE_RE = /^01[0125][0-9]{8}$/;
const RELATIONSHIPS = [
  ['FATHER', 'أب'],
  ['MOTHER', 'أم'],
  ['OTHER', 'أخرى'],
];

function splitName(value = '') {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || '', last: parts.slice(1).join(' ') || parts[0] || '' };
}

function relationToArabic(value) {
  return RELATIONSHIPS.find(([key]) => key === value)?.[1] || 'أخرى';
}

function toForm(guardian = {}) {
  return {
    nameAr: guardian.nameAr || [guardian.firstNameAr, guardian.lastNameAr].filter(Boolean).join(' '),
    nameEn: guardian.nameEn || [guardian.firstNameEn, guardian.lastNameEn].filter(Boolean).join(' '),
    phone: guardian.phone || guardian.phonePrimary || '',
    email: guardian.email || '',
    relationship: guardian.relationship || guardian.relationshipEn || 'FATHER',
    nationalId: guardian.nationalId || guardian.nationalIdEncrypted || '',
  };
}

export function GuardianModal({ guardian, mode, onClose, onSubmit, saving }) {
  const [values, setValues] = useState(() => toForm(guardian));
  const [errors, setErrors] = useState({});

  function setField(key, value) {
    setValues(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: '' }));
  }

  function validate() {
    const next = {};
    if (!values.nameAr.trim()) next.nameAr = 'اسم ولي الأمر مطلوب';
    if (!PHONE_RE.test(values.phone)) next.phone = 'اكتب رقم موبايل مصري صحيح مثل 01012345678';
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = 'البريد الإلكتروني غير صحيح';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function payload() {
    const ar = splitName(values.nameAr);
    const en = splitName(values.nameEn);
    return {
      firstNameAr: ar.first,
      lastNameAr: ar.last,
      firstNameEn: en.first || null,
      lastNameEn: en.last || null,
      phonePrimary: values.phone,
      email: values.email || null,
      relationshipAr: relationToArabic(values.relationship),
      relationshipEn: values.relationship,
      nationalIdEncrypted: values.nationalId || null,
    };
  }

  return (
    <div className="students-modal-backdrop" role="presentation">
      <section className="students-modal" role="dialog" aria-modal="true" aria-labelledby="guardian-modal-title">
        <div className="students-modal__head">
          <h2 id="guardian-modal-title">{mode === 'edit' ? 'تعديل ولي أمر' : 'إضافة ولي أمر'}</h2>
          <button type="button" className="students-button students-button--ghost" onClick={onClose}>
            إغلاق
          </button>
        </div>

        <form
          className="students-form"
          onSubmit={event => {
            event.preventDefault();
            if (validate()) onSubmit(payload());
          }}
        >
          <label>
            الاسم العربي
            <input value={values.nameAr} onChange={event => setField('nameAr', event.target.value)} required />
            {errors.nameAr ? <span className="field-error">{errors.nameAr}</span> : null}
          </label>
          <label>
            الاسم الإنجليزي
            <input value={values.nameEn} onChange={event => setField('nameEn', event.target.value)} />
          </label>
          <label>
            الموبايل
            <input value={values.phone} onChange={event => setField('phone', event.target.value)} inputMode="tel" required />
            {errors.phone ? <span className="field-error">{errors.phone}</span> : null}
          </label>
          <label>
            البريد الإلكتروني
            <input value={values.email} onChange={event => setField('email', event.target.value)} type="email" />
            {errors.email ? <span className="field-error">{errors.email}</span> : null}
          </label>
          <label>
            صلة القرابة
            <select value={values.relationship} onChange={event => setField('relationship', event.target.value)}>
              {RELATIONSHIPS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            الرقم القومي
            <input value={values.nationalId} onChange={event => setField('nationalId', event.target.value)} />
          </label>
          <button type="submit" className="students-button" disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </form>
      </section>
    </div>
  );
}
