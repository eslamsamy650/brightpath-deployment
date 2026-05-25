import { notificationIcon, timeAgoLabel } from '../../api/notificationsApi';

export function NotificationItem({ notification, onClick }) {
  const unread = !notification.isRead;
  return (
    <button
      type="button"
      className={`notification-item ${unread ? 'is-unread' : ''}`}
      onClick={() => onClick?.(notification)}
    >
      <div className="notification-item__row">
        <span aria-hidden="true">{notificationIcon(notification.type)}</span>
        <span className="notification-item__time">
          {timeAgoLabel(notification.sentAt || notification.createdAt)}
        </span>
      </div>
      <span className="notification-item__title">
        {notification.titleAr || notification.title || 'إشعار'}
      </span>
      <span className="notification-item__preview">
        {notification.bodyAr || notification.body || ''}
      </span>
    </button>
  );
}
