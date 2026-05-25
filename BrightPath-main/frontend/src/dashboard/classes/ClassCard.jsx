export function ClassCard({ classItem, onClick }) {
  const name = classItem.nameAr || classItem.name || classItem.nameEn || 'فصل';
  const grade = classItem.gradeLevel?.nameAr || classItem.gradeLevel?.name || classItem.gradeLevel?.nameEn || '-';
  const teacher =
    classItem.homeroomTeacher?.staffProfile?.name ||
    classItem.homeroomTeacher?.email ||
    classItem.teacher?.name ||
    '-';
  const studentCount = classItem.enrollmentCount ?? classItem._count?.enrollments ?? classItem.students?.length ?? 0;
  const capacity = classItem.capacity || 0;

  return (
    <button type="button" className="class-card" onClick={() => onClick(classItem)}>
      <div className="class-card__head">
        <strong>{name}</strong>
        <span className="student-status">نشط</span>
      </div>
      <p>{grade}</p>
      <div className="class-card__meta">
        <span>المعلم</span>
        <strong>{teacher}</strong>
      </div>
      <div className="class-card__capacity">
        <span>{studentCount} / {capacity}</span>
        <div>
          <i style={{ width: `${capacity ? Math.min(100, (studentCount / capacity) * 100) : 0}%` }} />
        </div>
      </div>
    </button>
  );
}
