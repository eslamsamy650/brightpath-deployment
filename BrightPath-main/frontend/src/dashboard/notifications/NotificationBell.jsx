import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications.js';
import { NotificationDropdown } from './NotificationDropdown.jsx';
import './notifications.css';

export function NotificationBell({ onViewAll }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const { items, unreadCount, loading, error, refresh, markRead, markAllRead } = useNotifications({
    enabled: true,
    dropdownLimit: 10,
  });
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  async function handleSelect(notification) {
    if (!notification.isRead) {
      try {
        await markRead(notification.id);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'تعذر تحديث الإشعار');
      }
    }
  }

  async function handleMarkAllRead() {
    setActionError('');
    try {
      await markAllRead();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'تعذر تعليم الإشعارات كمقروءة');
    }
  }

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        type="button"
        className="notification-bell__button"
        aria-label="الإشعارات"
        onClick={() => setOpen(value => !value)}
      >
        🔔
        {unreadCount > 0 ? (
          <span className="notification-bell__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        ) : null}
      </button>

      {open ? (
        <NotificationDropdown
          items={items}
          loading={loading}
          error={error || actionError}
          onRetry={() => {
            setActionError('');
            void refresh();
          }}
          onMarkAllRead={() => void handleMarkAllRead()}
          onSelect={notification => void handleSelect(notification)}
          onViewAll={() => {
            setOpen(false);
            onViewAll?.();
          }}
        />
      ) : null}
    </div>
  );
}
