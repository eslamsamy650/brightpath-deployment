/**
 * API response normalization helpers.
 */

function normalizeDoc(doc) {
  if (doc == null) return doc;
  if (Array.isArray(doc)) return doc.map(normalizeDoc);
  if (doc instanceof Date) return doc;
  if (typeof doc !== 'object') return doc;
  const out = { ...doc };
  if (out._id !== undefined && out._id !== null && out.id == null) {
    out.id = String(out._id);
    delete out._id;
  }
  if (out.__v !== undefined) delete out.__v;
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (v instanceof Date || v == null) continue;
    if (typeof v === 'object') {
      out[k] = normalizeDoc(v);
    }
  }
  return out;
}

/** @deprecated use normalizeDoc */
const normalizeMongoDoc = normalizeDoc;

/**
 * @param {{ isPresent?: boolean, isExcused?: boolean, notesEn?: string | null, notesAr?: string | null }} record
 */
function attendanceToApi(record) {
  let status = 'PRESENT';
  if (record.isExcused) status = 'EXCUSED';
  else if (!record.isPresent) status = 'ABSENT';
  else if (record.notesEn === 'LATE' || record.notesAr === 'LATE') status = 'LATE';

  return {
    ...record,
    status,
    note: record.notesEn || record.notesAr || undefined,
  };
}

/**
 * @param {any} student
 */
function mapStudentSummary(student) {
  if (!student) return null;
  return {
    id: student.id,
    firstName: student.firstNameEn || student.firstNameAr,
    lastName: student.lastNameEn || student.lastNameAr,
    studentCode: student.studentIdNumber,
    avatarUrl: student.photoUrl ?? null,
  };
}

/**
 * @param {any} staff
 */
function mapStaffProfile(staff) {
  if (!staff) return null;
  return {
    id: staff.id,
    userId: staff.userId,
    schoolId: staff.schoolId,
    firstName: staff.firstNameEn || staff.firstNameAr,
    lastName: staff.lastNameEn || staff.lastNameAr,
    phone: null,
    gender: staff.gender ?? null,
    dateOfBirth: staff.dateOfBirth ?? null,
    avatarUrl: null,
    nationalId: staff.nationalId ?? null,
    qualifications: staff.positionEn || staff.positionAr || null,
    bio: null,
    joinedAt: staff.hireDate ?? staff.createdAt ?? null,
  };
}

/**
 * @param {any} student
 */
function mapStudentProfile(student) {
  if (!student) return null;
  return {
    id: student.id,
    userId: student.userId,
    schoolId: student.schoolId,
    classId: student.currentClassId ?? null,
    firstName: student.firstNameEn || student.firstNameAr,
    lastName: student.lastNameEn || student.lastNameAr,
    gender: student.gender ?? null,
    dateOfBirth: student.dateOfBirth ?? null,
    avatarUrl: student.photoUrl ?? null,
    nationalId: student.nationalId ?? null,
    studentCode: student.studentIdNumber,
    enrollmentDate: student.enrollmentDate ?? null,
    isActive: student.isActive ?? true,
  };
}

/**
 * @param {any} guardian
 */
function mapParentProfile(guardian) {
  if (!guardian) return null;
  return {
    id: guardian.id,
    userId: guardian.userId,
    firstName: guardian.firstNameEn || guardian.firstNameAr,
    lastName: guardian.lastNameEn || guardian.lastNameAr,
    phone: guardian.phonePrimary ?? null,
    gender: null,
    avatarUrl: null,
    nationalId: null,
    occupation: guardian.occupationEn || guardian.occupationAr || null,
    address: guardian.addressEn || guardian.addressAr || null,
  };
}

module.exports = {
  normalizeDoc,
  normalizeMongoDoc,
  attendanceToApi,
  mapStudentSummary,
  mapStaffProfile,
  mapStudentProfile,
  mapParentProfile,
};
