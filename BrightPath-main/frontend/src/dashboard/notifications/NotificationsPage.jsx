import { useCallback, useEffect, useRef, useState } from 'react';
import { listNotifications } from '../../api/notificationsApi';
import { LoadErrorBanner } from '../../components/LoadErrorBanner.jsx';
import { NotificationItem } from './NotificationItem.jsx';
import { useNotifications } from '../../hooks/useNotifications.js';
import './notifications.css';

export function NotificationsPage() {
  const { markRead, markAllRead } = useNotifications({ enabled: false });
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const sentinelRef = useRef(null);
  const loadingMoreRef = useRef(false);

  const loadPage = useCallback(async (nextPage, replace = false) => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoading(true);
    if (replace) setError('');
    try {
      const { data, meta } = await listNotifications({ page: nextPage, limit: 20 });
      setItems(current => (replace ? data || [] : [...current, ...(data || [])]));
      setHasMore(Boolean(meta?.hasNextPage));
      setPage(nextPage);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'تعذر تحميل الإشعارات';
      if (replace) {
        setItems([]);
        setHasMore(false);
        setError(message);
      } else {
        setActionError(message);
      }
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadPage(1, true));
  }, [loadPage]);

  useEffect(() => {
    if (!hasMore || loading || error) return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) void loadPage(page + 1);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [error, hasMore, loadPage, loading, page]);

  async function handleMarkAllRead() {
    setActionError('');
    try {
      await markAllRead();
      await loadPage(1, true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'تعذر تعليم الإشعارات كمقروءة');
    }
  }

  return (
    <section className="notifications-page">
      <div className="students-page__head">
        <div>
          <p>التنبيهات</p>
          <h2>كل الإشعارات</h2>
        </div>
        <button
          type="button"
          className="students-button students-button--ghost"
          onClick={() => void handleMarkAllRead()}
        >
          تعليم الكل كمقروء
        </button>
      </div>

      <LoadErrorBanner message={error} onRetry={() => void loadPage(1, true)} />
      {actionError ? (
        <LoadErrorBanner
          title="تعذر إكمال العملية"
          message={actionError}
          onRetry={() => setActionError('')}
          retryLabel="إغلاق"
        />
      ) : null}

      <div className="notifications-page__list">
        {items.map(item => (
          <NotificationItem
            key={item.id}
            notification={item}
            onClick={notification => {
              if (!notification.isRead) {
                void markRead(notification.id)
                  .then(() => {
                    setItems(current =>
                      current.map(row =>
                        row.id === notification.id ? { ...row, isRead: true } : row
                      )
                    );
                  })
                  .catch(err => {
                    setActionError(
                      err instanceof Error ? err.message : 'تعذر تحديث حالة الإشعار'
                    );
                  });
              }
            }}
          />
        ))}
        {!items.length && !loading && !error ? (
          <p className="empty" style={{ padding: 16 }}>
            لا توجد إشعارات
          </p>
        ) : null}
      </div>

      <div ref={sentinelRef} />
      {loading ? <p>جاري التحميل…</p> : null}
      {!hasMore && items.length && !error ? (
        <p className="fee-items-inline">تم عرض كل الإشعارات</p>
      ) : null}
    </section>
  );
}
