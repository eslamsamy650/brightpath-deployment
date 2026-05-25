import { useMemo, useState } from 'react';

const ARABIC_NAME_RE = /^[\u0600-\u06FF\s]+$/;

function splitName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] || '',
    last: parts.slice(1).join(' ') || '',
  };
}

function toFormStudent(student = {}, schoolId = '') {
  const arName = student.nameAr || [student.firstNameAr, student.lastNameAr].filter(Boolean).join(' ');
  const enName = student.nameEn || [student.firstNameEn, student.lastNameEn].filter(Boolean).join(' ');
  const currentEnrollment = student.enrollments?.[0] || student.currentEnrollment || {};
  return {
    schoolId: student.schoolId || schoolId,
    nameAr: arName,
    nameEn: enName,
    studentCode: student.studentCode || student.studentIdNumber || '',
    dateOfBirth: String(student.dateOfBirth || '2016-10-01').slice(0, 10),
    gender: student.gender === 'female' || student.gender === 'FEMALE' ? 'female' : 'male',
    classId: student.classId || currentEnrollment.classId || currentEnrollment.class?.id || '',
    nationalId: student.nationalId || '',
    enrollmentDate: String(student.enrollmentDate || new Date().toISOString()).slice(0, 10),
    isActive: student.isActive !== false,
  };
}

function backendFieldErrors(error) {
  const details = error?.details || error?.errors || error?.fields;
  if (!details) return {};
  if (Array.isArray(details)) {
    return Object.fromEntries(
      details
        .map(item => [item.path?.[0] || item.field || item.param, item.message || item.msg])
        .filter(([key, message]) => key && message)
    );
  }
  return details;
}

export function useStudentForm({ initialStudent, schoolId }) {
  const initialValue = useMemo(
    () => toFormStudent(initialStudent, schoolId),
    [initialStudent, schoolId]
  );
  const [values, setValues] = useState(initialValue);
  const [errors, setErrors] = useState({});
  const [showNationalId, setShowNationalId] = useState(false);

  function setField(name, value) {
    setValues(current => ({ ...current, [name]: value }));
    setErrors(current => ({ ...current, [name]: '' }));
  }

  function validate() {
    const nextErrors = {};
    if (!values.nameAr.trim()) {
      nextErrors.nameAr = 'الاسم العربي مطلوب';
    } else if (!ARABIC_NAME_RE.test(values.nameAr.trim())) {
      nextErrors.nameAr = 'اكتب الاسم العربي بحروف عربية فقط';
    }
    if (!values.dateOfBirth) nextErrors.dateOfBirth = 'تاريخ الميلاد مطلوب';
    if (!values.gender) nextErrors.gender = 'النوع مطلوب';
    if (values.nationalId && !/^\d{14}$/.test(values.nationalId)) {
      nextErrors.nationalId = 'الرقم القومي يجب أن يكون 14 رقم';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function applyBackendErrors(error) {
    const mapped = backendFieldErrors(error);
    setErrors(current => ({ ...current, ...mapped, form: error?.message || 'تعذر حفظ الطالب' }));
  }

  function toApiPayload() {
    const ar = splitName(values.nameAr);
    const en = splitName(values.nameEn);
    return {
      schoolId: values.schoolId,
      studentIdNumber: values.studentCode,
      firstNameAr: ar.first,
      lastNameAr: ar.last || ar.first,
      firstNameEn: en.first || null,
      lastNameEn: en.last || null,
      gender: values.gender,
      dateOfBirth: values.dateOfBirth,
      nationalId: values.nationalId || null,
      enrollmentDate: values.enrollmentDate || undefined,
      isActive: values.isActive,
      classId: values.classId || undefined,
    };
  }

  return {
    applyBackendErrors,
    errors,
    setErrors,
    setField,
    setShowNationalId,
    showNationalId,
    toApiPayload,
    validate,
    values,
  };
}
