import { useState } from 'react';
import { AttendanceReportPage } from '../attendance/AttendanceReportPage.jsx';
import { ReportCardPage } from './ReportCardPage.jsx';
import './reports.css';

const TABS = [
  ['attendance', 'تقارير الحضور'],
  ['report-cards', 'كروت الدرجات'],
];

export function ReportsPage() {
  const [tab, setTab] = useState('attendance');

  return (
    <section className="reports-page">
      <div className="reports-tabs" role="tablist" aria-label="التقارير">
        {TABS.map(([value, label]) => (
          <button
            aria-selected={tab === value}
            className={tab === value ? 'is-active' : ''}
            key={value}
            onClick={() => setTab(value)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'attendance' ? <AttendanceReportPage /> : <ReportCardPage />}
    </section>
  );
}
