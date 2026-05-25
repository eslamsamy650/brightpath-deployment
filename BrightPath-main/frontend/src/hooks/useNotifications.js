import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { apiOriginFromBase, apiTryRefresh, getAccessToken, getApiBase } from '../api/brighpathClient';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notificationsApi';

function normalizeIncoming(payload = {}) {
  return {
    id: payload.id || `tmp-${Date.now()}`,
    type: payload.type,
    title: payload.titleAr || payload.title || payload.titleEn,
    body: payload.bodyAr || payload.body || payload.bodyEn || payload.message,
    sentAt: payload.sentAt || payload.createdAt || new Date().toISOString(),
    isRead: false,
    metadata: payload.metadata || payload.data,
  };
}

export function useNotifications({ enabled = true, dropdownLimit = 10 } = {}) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    try {
      const [allRes, unreadRes] = await Promise.all([
        listNotifications({ limit: dropdownLimit }),
        listNotifications({ limit: 50, unreadOnly: true }),
      ]);
      setItems(allRes.data || []);
      setUnreadCount((unreadRes.data || []).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل الإشعارات');
    } finally {
      setLoading(false);
    }
  }, [dropdownLimit, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    queueMicrotask(() => void refresh());
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    async function connect() {
      if (!getAccessToken()) await apiTryRefresh();
      const token = getAccessToken();
      if (!token || cancelled) return;

      const socket = io(apiOriginFromBase(getApiBase()), {
        auth: { token },
        withCredentials: true,
      });
      socketRef.current = socket;

      const handlePush = payload => {
        const row = normalizeIncoming(payload);
        setItems(current => [row, ...current].slice(0, dropdownLimit));
        setUnreadCount(count => count + 1);
      };

      socket.on('notification:push', handlePush);
      socket.on('notification', handlePush);
    }

    void connect();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [dropdownLimit, enabled]);

  const markRead = useCallback(async id => {
    setError('');
    await markNotificationRead(id);
    setItems(current =>
      current.map(item => (item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item))
    );
    setUnreadCount(count => Math.max(0, count - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    setError('');
    await markAllNotificationsRead();
    setItems(current => current.map(item => ({ ...item, isRead: true })));
    setUnreadCount(0);
  }, []);

  const loadMore = useCallback(async page => {
    const { data, meta } = await listNotifications({ page, limit: 20 });
    return { data: data || [], meta };
  }, []);

  return {
    items,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
    loadMore,
  };
}
