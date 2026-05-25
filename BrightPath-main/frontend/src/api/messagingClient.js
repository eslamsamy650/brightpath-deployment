import { io } from 'socket.io-client';
import {
  apiOriginFromBase,
  apiRequest,
  getAccessToken,
  getApiBase,
} from './brighpathClient';

function unwrapApiResponse(json, fallbackMessage) {
  if (!json || json.success !== true) {
    throw new Error(json?.message || fallbackMessage);
  }
  return { data: json.data, meta: json.meta };
}

export async function apiFetchMessageInbox({ page = 1, limit = 20, unreadOnly = false } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    unreadOnly: unreadOnly ? 'true' : 'false',
  });
  const res = await apiRequest(`/messages?${params.toString()}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Could not load messages (${res.status})`);
  return unwrapApiResponse(json, 'Invalid messages response');
}

export async function apiFetchConversation(userId, { page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const res = await apiRequest(`/messages/conversations/${encodeURIComponent(userId)}?${params}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Could not load conversation (${res.status})`);
  return unwrapApiResponse(json, 'Invalid conversation response').data;
}

export async function apiSendMessage(receiverId, body) {
  const res = await apiRequest('/messages', {
    method: 'POST',
    body: JSON.stringify({ receiverId, body }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Could not send message (${res.status})`);
  return unwrapApiResponse(json, 'Invalid send message response').data;
}

export async function apiFetchMessageContacts({ page = 1, limit = 50, q = '', role = '' } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (q) params.set('q', q);
  if (role) params.set('role', role);
  const res = await apiRequest(`/messages/contacts?${params.toString()}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Could not load contacts (${res.status})`);
  return unwrapApiResponse(json, 'Invalid contacts response');
}

export async function apiDeleteMessage(messageId) {
  const res = await apiRequest(`/messages/${encodeURIComponent(messageId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `Could not delete message (${res.status})`);
  }
}

export async function apiUploadMessageAttachments(messageId, files) {
  const form = new FormData();
  Array.from(files || []).forEach(file => form.append('attachments', file));
  const res = await apiRequest(`/messages/${encodeURIComponent(messageId)}/attachments`, {
    method: 'POST',
    body: form,
    headers: {},
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Could not upload attachments (${res.status})`);
  return unwrapApiResponse(json, 'Invalid attachment response').data;
}

export function createMessagingSocket({
  onNewMessage,
  onSentMessage,
  onNotification,
  onConnectError,
  onError,
} = {}) {
  const token = getAccessToken();
  if (!token) return null;

  const socket = io(apiOriginFromBase(getApiBase()), {
    auth: { token },
    withCredentials: true,
  });

  socket.on('message:new', message => onNewMessage?.(message));
  socket.on('message:sent', message => onSentMessage?.(message));
  socket.on('notification:push', notification => onNotification?.(notification));
  socket.on('message:error', payload =>
    onError?.(new Error(payload?.message || 'Message could not be sent'))
  );
  socket.on('connect_error', err => onConnectError?.(err));

  return socket;
}

export function sendSocketMessage(socket, payload) {
  if (!socket?.connected) {
    return Promise.reject(new Error('Messaging socket is not connected'));
  }

  return new Promise((resolve, reject) => {
    socket.timeout(8000).emit('message:send', payload, (err, ack) => {
      if (err) {
        reject(new Error('Message send timed out'));
        return;
      }
      if (!ack?.success) {
        reject(new Error(ack?.message || 'Message could not be sent'));
        return;
      }
      resolve(ack.data);
    });
  });
}
