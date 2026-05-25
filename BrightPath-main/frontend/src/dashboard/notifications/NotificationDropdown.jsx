import { NotificationItem } from './NotificationItem.jsx';

import { LoadErrorBanner } from '../../components/LoadErrorBanner.jsx';

export function NotificationDropdown({
  items = [],
  loading = false,
  error = '',
  onRetry,
  onMarkAllRead,
  onSelect,
  onViewAll,
}) {
  return (
    <div className="notification-dropdown" role="menu">
      <div className="notification-dropdown__head">
        <strong>الإشعارات</strong>
        <button type="button" className="students-button students-button--ghost" onClick={onMarkAllRead}>
          تعليم الكل كمقروء
        </button>
      </div>

      <div className="notification-dropdown__list">
        {error ? (
          <div style={{ padding: 10 }}>
            <LoadErrorBanner
              title="تعذر التحميل"
              message={error}
              onRetry={onRetry}
            />
          </div>
        ) : null}
        {loading ? (
          <p style={{ padding: 14 }}>جاري التحميل…</p>
        ) : !error && items.length ? (
          items.map(item => <NotificationItem key={item.id} notification={item} onClick={onSelect} />)
        ) : !error ? (
          <p style={{ padding: 14 }} className="empty">
            لا توجد إشعارات
          </p>
        ) : null}
      </div>

      <div className="notification-dropdown__foot">
        <button type="button" className="students-button students-button--ghost" onClick={onViewAll}>
          عرض الكل
        </button>
      </div>
    </div>
  );
}
