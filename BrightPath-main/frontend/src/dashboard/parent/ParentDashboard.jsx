import { useCallback, useEffect, useRef, useState } from 'react';
import { loadChildDashboardData, resolveParentChildren } from '../../api/parentApi';
import { LoadErrorBanner } from '../../components/LoadErrorBanner.jsx';
import { AttendanceCard } from './AttendanceCard.jsx';
import { ChildSwitcher } from './ChildSwitcher.jsx';
import { FeesCard } from './FeesCard.jsx';
import { GradesCard } from './GradesCard.jsx';
import './parent.css';

function announcementTitle(row = {}) {
  return row.titleAr || row.titleEn || row.title || 'إعلان';
}

function announcementBody(row = {}) {
  return row.bodyAr || row.bodyEn || row.body || '';
}

export function ParentDashboard({ profile }) {
  const [children, setChildren] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [childData, setChildData] = useState(null);
  const [expandedCard, setExpandedCard] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const activeChildRef = useRef('');

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        setLoading(true);
        setError('');
        try {
          const rows = await resolveParentChildren(profile);
          setChildren(rows);
          setSelectedId(current => current || rows[0]?.id || '');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات الأبناء');
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [profile]);

  const loadChild = useCallback(async studentId => {
    if (!studentId) return;
    activeChildRef.current = studentId;
    setLoading(true);
    setError('');
    setExpandedCard('');
    try {
      const data = await loadChildDashboardData(studentId);
      if (activeChildRef.current !== studentId) return;
      setChildData(data);
    } catch (err) {
      if (activeChildRef.current !== studentId) return;
      setChildData(null);
      setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات الطالب');
    } finally {
      if (activeChildRef.current === studentId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    queueMicrotask(() => void loadChild(selectedId));
  }, [loadChild, selectedId]);

  function toggleCard(key) {
    setExpandedCard(current => (current === key ? '' : key));
  }

  return (
    <section className="parent-dashboard">
      <div className="students-page__head">
        <div>
          <p>بوابة ولي الأمر</p>
          <h2>متابعة الأبناء</h2>
        </div>
      </div>

      <div className="parent-readonly-banner">عرض للقراءة فقط — لا يمكن التعديل من بوابة ولي الأمر</div>

      <ChildSwitcher children={children} selectedId={selectedId} onSelect={setSelectedId} />

      <LoadErrorBanner message={error} onRetry={() => selectedId && void loadChild(selectedId)} />
      {loading ? <p>جاري التحميل…</p> : null}

      {childData ? (
        <>
          {childData.sectionErrors?.length ? (
            <LoadErrorBanner
              title="تعذر تحميل بعض البيانات"
              message={childData.sectionErrors.join(' · ')}
              onRetry={() => selectedId && void loadChild(selectedId)}
            />
          ) : null}
          <div className="parent-cards-grid">
            <AttendanceCard
              data={childData.attendance}
              expanded={expandedCard === 'attendance'}
              onToggle={() => toggleCard('attendance')}
            />
            <GradesCard
              data={childData.grades}
              expanded={expandedCard === 'grades'}
              onToggle={() => toggleCard('grades')}
            />
            <FeesCard
              data={childData.fees}
              expanded={expandedCard === 'fees'}
              onToggle={() => toggleCard('fees')}
            />
            <button
              type="button"
              className={`parent-card ${expandedCard === 'announcements' ? 'is-expanded' : ''}`}
              onClick={() => toggleCard('announcements')}
            >
              <div className="parent-card__head">
                <div>
                  <span>إعلانات المدرسة</span>
                  <strong>{childData.announcements.length}</strong>
                </div>
                <span className="parent-card__icon" aria-hidden="true">
                  📢
                </span>
              </div>
              <div className="parent-announcement-list">
                {childData.announcements.slice(0, 3).map(row => (
                  <div className="parent-announcement-row" key={row.id}>
                    <span>{announcementTitle(row)}</span>
                  </div>
                ))}
              </div>
            </button>
          </div>

          {expandedCard === 'announcements' ? (
            <div className="parent-detail-panel">
              <h3>آخر الإعلانات</h3>
              {childData.announcements.length ? (
                childData.announcements.map(row => (
                  <article key={row.id} style={{ marginBottom: 12 }}>
                    <strong>{announcementTitle(row)}</strong>
                    <p>{announcementBody(row)}</p>
                  </article>
                ))
              ) : (
                <p className="empty">لا توجد إعلانات حالياً.</p>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
