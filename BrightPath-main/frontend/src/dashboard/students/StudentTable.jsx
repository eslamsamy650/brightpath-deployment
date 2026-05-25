function studentName(student) {
  const ar = [student.firstNameAr, student.lastNameAr].filter(Boolean).join(' ');
  const en = [student.firstNameEn, student.lastNameEn].filter(Boolean).join(' ');
  return { ar: ar || student.name || '-', en: en || '-' };
}

function currentEnrollment(student) {
  return student.currentEnrollment || student.enrollment || student.enrollments?.[0] || {};
}

function className(student) {
  const enrollment = currentEnrollment(student);
  const cls = enrollment.class || student.class || student.currentClass;
  return cls?.nameAr || cls?.name || cls?.nameEn || student.className || '-';
}

function gradeLevel(student) {
  const enrollment = currentEnrollment(student);
  const level = enrollment.class?.gradeLevel || student.gradeLevel;
  return level?.nameAr || level?.name || level?.nameEn || student.gradeLevelName || '-';
}

function guardianName(student) {
  const guardianLink = student.studentGuardians?.[0] || student.guardians?.[0] || {};
  const guardian = guardianLink.guardian || guardianLink || student.guardian;
  return guardian?.name || [guardian?.firstNameAr, guardian?.lastNameAr].filter(Boolean).join(' ') || '-';
}

function guardianPhone(student) {
  const guardianLink = student.studentGuardians?.[0] || student.guardians?.[0] || {};
  const guardian = guardianLink.guardian || guardianLink || student.guardian;
  return guardian?.phonePrimary || guardian?.phone || student.guardianPhone || '-';
}

export function StudentTable({
  canManage,
  loading,
  onDeactivate,
  onEdit,
  onSelectAll,
  onSelectOne,
  onView,
  selectedIds,
  students,
}) {
  if (loading) {
    return (
      <div className="students-table-card">
        {Array.from({ length: 7 }).map((_, index) => (
          <div className="student-skeleton" key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="students-table-card">
      <div className="students-table-wrap">
        <table className="students-table">
          <thead>
            <tr>
              <th className="students-check">
                <input
                  type="checkbox"
                  checked={students.length > 0 && selectedIds.length === students.length}
                  onChange={event => onSelectAll(event.target.checked)}
                  aria-label="Select all students"
                />
              </th>
              <th>الاسم</th>
              <th>كود الطالب</th>
              <th>الفصل</th>
              <th>الصف</th>
              <th>ولي الأمر</th>
              <th>الهاتف</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => {
              const name = studentName(student);
              const selected = selectedIds.includes(student.id);
              return (
                <tr key={student.id}>
                  <td className="students-check">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={event => onSelectOne(student.id, event.target.checked)}
                      aria-label={`Select ${name.ar}`}
                    />
                  </td>
                  <td>
                    <strong>{name.ar}</strong>
                    <span>{name.en}</span>
                  </td>
                  <td>{student.studentIdNumber || student.studentCode || '-'}</td>
                  <td>{className(student)}</td>
                  <td>{gradeLevel(student)}</td>
                  <td>{guardianName(student)}</td>
                  <td>{guardianPhone(student)}</td>
                  <td>
                    <span className={`student-status${student.isActive === false ? ' is-inactive' : ''}`}>
                      {student.isActive === false ? 'غير نشط' : 'نشط'}
                    </span>
                  </td>
                  <td>
                    <div className="student-actions">
                      <button type="button" onClick={() => onView(student)}>
                        عرض
                      </button>
                      <button type="button" onClick={() => onEdit(student)} disabled={!canManage}>
                        تعديل
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => onDeactivate(student)}
                        disabled={!canManage || student.isActive === false}
                      >
                        تعطيل
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
