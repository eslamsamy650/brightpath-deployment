export function AttendanceStudentModal({ onClose, report, student }) {
  return (
    <div className="students-modal-backdrop" role="presentation">
      <section className="students-modal" role="dialog" aria-modal="true">
        <div className="students-modal__head">
          <h2>{student?.name || [student?.firstName, student?.lastName].filter(Boolean).join(' ')}</h2>
          <button type="button" className="students-button students-button--ghost" onClick={onClose}>
            إغلاق
          </button>
        </div>
        <div className="attendance-detail-list">
          {(report?.records || []).map(record => (
            <div className="row-lite" key={record.id || record.attendanceDate}>
              <strong>{new Date(record.attendanceDate).toLocaleDateString('ar-EG')}</strong>
              <span>{record.status}</span>
            </div>
          ))}
          {!report?.records?.length ? <p className="empty">لا توجد سجلات في هذا النطاق.</p> : null}
        </div>
      </section>
    </div>
  );
}
