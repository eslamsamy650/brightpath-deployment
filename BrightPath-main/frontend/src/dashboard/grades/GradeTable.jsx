import { GradeRow } from './GradeRow.jsx';
import { gradeComponents } from './gradeComponents.js';

export function GradeTable({ disabled, grades, onChange, students }) {
  return (
    <div className="grade-table-card">
      <table className="grade-table">
        <thead>
          <tr>
            <th>الطالب</th>
            {gradeComponents().map(([key, label, max]) => (
              <th key={key}>{label} / {max}</th>
            ))}
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <GradeRow
              key={student.id}
              disabled={disabled}
              grades={grades[student.id] || {}}
              onChange={onChange}
              student={student}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
