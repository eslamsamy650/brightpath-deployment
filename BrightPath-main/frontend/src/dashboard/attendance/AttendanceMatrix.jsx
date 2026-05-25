const STATUS_LABELS = {
  PRESENT: 'ح',
  ABSENT: 'غ',
  LATE: 'م',
  EXCUSED: 'ع',
};

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function studentName(student) {
  return student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || student.studentCode;
}

export function AttendanceMatrix({ dates, onStudentClick, records, students }) {
  const recordMap = new Map(records.map(record => [`${record.studentId}:${dateKey(record.attendanceDate)}`, record]));

  return (
    <div className="attendance-report-table">
      <table>
        <thead>
          <tr>
            <th>الطالب</th>
            {dates.map(day => (
              <th key={day}>{new Date(day).getDate()}</th>
            ))}
            <th>غياب %</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => {
            const studentRecords = dates.map(day => recordMap.get(`${student.id}:${day}`));
            const absentCount = studentRecords.filter(record => record?.status === 'ABSENT').length;
            const absenceRate = dates.length ? absentCount / dates.length : 0;
            return (
              <tr key={student.id} className={absenceRate > 0.2 ? 'is-chronic' : ''}>
                <td>
                  <button type="button" onClick={() => onStudentClick(student)}>
                    {studentName(student)}
                  </button>
                </td>
                {dates.map(day => {
                  const status = recordMap.get(`${student.id}:${day}`)?.status || '';
                  return (
                    <td key={day}>
                      <span className={`att-cell status-${status || 'EMPTY'}`}>
                        {STATUS_LABELS[status] || '-'}
                      </span>
                    </td>
                  );
                })}
                <td>{Math.round(absenceRate * 100)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
