import { GRADE_COMPONENTS } from './gradeComponents.js';

function studentName(student) {
  return student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || student.studentCode;
}

export function GradeRow({ disabled, grades, onChange, student }) {
  const total = GRADE_COMPONENTS.reduce((sum, [key]) => sum + Number(grades[key]?.mark || 0), 0);
  const maxTotal = GRADE_COMPONENTS.reduce((sum, [, , max]) => sum + max, 0);
  const pct = maxTotal ? (total / maxTotal) * 100 : 0;
  const tone = pct < 50 ? 'is-low' : pct >= 85 ? 'is-high' : '';

  return (
    <tr className={tone}>
      <td>
        <strong>{studentName(student)}</strong>
        <span>{student.studentCode}</span>
      </td>
      {GRADE_COMPONENTS.map(([key, label, max]) => (
        <td key={key}>
          <label className="grade-input">
            <span>{label} / {max}</span>
            <input
              type="number"
              min="0"
              max={max}
              disabled={disabled}
              value={grades[key]?.mark ?? ''}
              onChange={event => onChange(student.id, key, event.target.value, max)}
            />
          </label>
        </td>
      ))}
      <td><strong>{total}</strong></td>
    </tr>
  );
}
