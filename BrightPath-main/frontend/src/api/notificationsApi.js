import { apiRequest } from './brighpathClient';
import { unwrapApiResponse } from './apiErrors';

const unwrap = unwrapApiResponse;

export function listNotifications(query = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.unreadOnly) params.set('unreadOnly', 'true');
  const qs = params.toString();
  return unwrap(
    apiRequest(qs ? `/notifications?${qs}` : '/notifications'),
    'Could not load notifications'
  );
}

export async function markNotificationRead(id) {
  const path = `/notifications/${encodeURIComponent(id)}/read`;
  const patchRes = await apiRequest(path, { method: 'PATCH' });
  if (patchRes.ok) return unwrap(patchRes, 'Could not mark notification read');
  return unwrap(await apiRequest(path, { method: 'PUT' }), 'Could not mark notification read');
}

export async function markAllNotificationsRead() {
  const patchRes = await apiRequest('/notifications/read-all', { method: 'PATCH' });
  if (patchRes.ok) return unwrap(patchRes, 'Could not mark all notifications read');
  return unwrap(await apiRequest('/notifications/read-all', { method: 'PUT' }), 'Could not mark all notifications read');
}

export function timeAgoLabel(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} ي`;
  return date.toLocaleDateString('ar-EG');
}

export function notificationIcon(type = '') {
  const key = String(type).toUpperCase();
  if (key.includes('ATTENDANCE')) return '📋';
  if (key.includes('GRADE')) return '📊';
  if (key.includes('FEE')) return '💰';
  if (key.includes('ANNOUNCE')) return '📢';
  if (key.includes('MESSAGE')) return '💬';
  return '🔔';
}
