const STATUS_OPTIONS = [
  ['PRESENT', 'حاضر'],
  ['ABSENT', 'غائب'],
  ['LATE', 'متأخر'],
  ['EXCUSED', 'بعذر'],
];

function studentName(student) {
  return (
    student.name ||
    [student.firstNameAr, student.lastNameAr].filter(Boolean).join(' ') ||
    [student.firstNameEn, student.lastNameEn].filter(Boolean).join(' ') ||
    'طالب'
  );
}

export function StudentAttendanceRow({ disabled, onChange, record, student }) {
  return (
    <article className="attendance-entry-row">
      <div className="attendance-entry-row__student">
        <strong>{studentName(student)}</strong>
        <span>{student.studentIdNumber || student.studentCode || ''}</span>
      </div>

      <div className="attendance-status-buttons" role="group" aria-label={`Attendance for ${studentName(student)}`}>
        {STATUS_OPTIONS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={record.status === value ? 'is-active' : ''}
            disabled={disabled}
            onClick={() => onChange(student.id, { status: value })}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        aria-label="ملاحظة"
        disabled={disabled}
        placeholder="ملاحظة اختيارية"
        value={record.note || ''}
        onChange={event => onChange(student.id, { note: event.target.value })}
      />
    </article>
  );
}
