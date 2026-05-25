/** Wired after marketing HTML hydration (dangerouslySetInnerHTML). */

import {
  apiFetchConversation,
  apiFetchMessageContacts,
  apiFetchMessageInbox,
  apiSendMessage,
  createMessagingSocket,
  sendSocketMessage,
} from '../api/messagingClient';

export function initInboxFilters(root) {
  if (!root) return () => {};
  const cleanups = [];
  root.querySelectorAll('.filter-chip').forEach(chip => {
    const handler = function inboxChipClick() {
      root.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
    };
    chip.addEventListener('click', handler);
    cleanups.push(() => chip.removeEventListener('click', handler));
  });
  return () => cleanups.forEach(cleanup => cleanup());
}

export function initChatDemo(root, { bpProfile, sessionMode } = {}) {
  if (!root) return () => {};
  if (sessionMode === 'api' && bpProfile?.id) {
    return initLiveMessaging(root, bpProfile);
  }
  return initLocalDemoComposer(root);
}

function initLocalDemoComposer(root) {
  const chatSend = root.querySelector('#chatSend');
  const chatInput = root.querySelector('#chatInput');
  const chatBody = root.querySelector('#chatBody');
  if (!chatSend || !chatInput || !chatBody) return () => {};

  const send = () => {
    const text = chatInput.value.trim();
    if (!text) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
    <div class="bubble me">${escapeHtml(text)}</div>
    <div class="btime r">You · Just now</div>`;
    chatBody.appendChild(wrapper);
    chatInput.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;
  };

  const enterHandler = e => {
    if (e.key === 'Enter') send();
  };
  chatSend.addEventListener('click', send);
  chatInput.addEventListener('keypress', enterHandler);

  return () => {
    chatSend.removeEventListener('click', send);
    chatInput.removeEventListener('keypress', enterHandler);
  };
}

function initLiveMessaging(root, bpProfile) {
  const els = {
    inboxTitle: root.querySelector('.inbox-hdr-title'),
    compose: root.querySelector('.inbox-compose'),
    filters: root.querySelector('.inbox-filter'),
    thread: root.querySelector('.msg-thread'),
    headerAvatar: root.querySelector('.open-msg-av'),
    headerName: root.querySelector('.open-msg-name'),
    headerStatus: root.querySelector('.open-msg-status'),
    chatBody: root.querySelector('#chatBody'),
    chatInput: root.querySelector('#chatInput'),
    chatSend: root.querySelector('#chatSend'),
  };
  if (!els.thread || !els.chatBody || !els.chatInput || !els.chatSend) return () => {};

  const state = {
    inbox: [],
    unreadOnly: false,
    activeParticipant: null,
    messages: [],
    loadingConversation: false,
    contacts: [],
    showingContacts: false,
  };

  if (els.inboxTitle) els.inboxTitle.textContent = '📬 Live Message Inbox';
  if (els.compose) {
    els.compose.textContent = '+ New';
    els.compose.disabled = false;
    els.compose.title = 'Start a conversation with an eligible contact.';
  }

  renderFilters(els, state, () => {
    void loadInbox();
  });
  renderInboxLoading(els);
  renderConversationEmpty(els, 'Loading your latest messages…');

  const socket = createMessagingSocket({
    onNewMessage: message => {
      const peerId = peerIdForMessage(message, bpProfile.id);
      if (state.activeParticipant?.id === peerId) {
        void loadConversation(state.activeParticipant);
      }
      void loadInbox({ preserveActive: true });
    },
    onSentMessage: message => {
      const peerId = peerIdForMessage(message, bpProfile.id);
      if (state.activeParticipant?.id === peerId) {
        upsertMessage(state, message);
        renderConversation(els, state, bpProfile.id);
      }
      void loadInbox({ preserveActive: true });
    },
    onError: err => {
      renderConversationNotice(els, err.message || 'Messaging socket error');
    },
  });

  async function loadInbox({ preserveActive = false } = {}) {
    try {
      const { data } = await apiFetchMessageInbox({
        limit: 100,
        unreadOnly: state.unreadOnly,
      });
      state.inbox = Array.isArray(data) ? data : [];
      renderFilters(els, state, () => {
        void loadInbox();
      });
      renderInbox(els, state, participant => {
        void loadConversation(participant);
      });

      if (!preserveActive && !state.activeParticipant && state.inbox[0]?.participant) {
        await loadConversation(state.inbox[0].participant);
      } else if (!state.activeParticipant && state.inbox.length === 0) {
        renderConversationEmpty(els, 'No conversations yet. Click + New to choose a contact.');
      }
    } catch (err) {
      renderInboxError(els, err.message || 'Could not load messages');
      renderConversationEmpty(els, 'Sign in and make sure the backend is running to use messaging.');
    }
  }

  async function loadContacts() {
    state.showingContacts = true;
    renderInboxLoading(els);
    renderConversationEmpty(els, 'Choose a contact to start a conversation.');
    try {
      const { data } = await apiFetchMessageContacts({ limit: 100 });
      state.contacts = Array.isArray(data) ? data : [];
      renderContacts(els, state, participant => {
        state.showingContacts = false;
        void loadConversation(participant);
      });
    } catch (err) {
      renderInboxError(els, err.message || 'Could not load contacts');
    }
  }

  async function loadConversation(participant) {
    if (!participant?.id || state.loadingConversation) return;
    state.loadingConversation = true;
    state.activeParticipant = participant;
    renderInbox(els, state, next => {
      void loadConversation(next);
    });
    renderConversationEmpty(els, 'Loading conversation…');

    try {
      const result = await apiFetchConversation(participant.id, { limit: 50 });
      state.activeParticipant = result.participant || participant;
      state.messages = Array.isArray(result.messages) ? result.messages.slice().reverse() : [];
      renderConversation(els, state, bpProfile.id);
      void loadInbox({ preserveActive: true });
    } catch (err) {
      renderConversationEmpty(els, err.message || 'Could not load conversation');
    } finally {
      state.loadingConversation = false;
    }
  }

  async function sendCurrentMessage() {
    const body = els.chatInput.value.trim();
    const receiverId = state.activeParticipant?.id;
    if (!body || !receiverId) return;

    els.chatInput.disabled = true;
    els.chatSend.disabled = true;
    try {
      const message = socket?.connected
        ? await sendSocketMessage(socket, { receiverId, body })
        : await apiSendMessage(receiverId, body);
      els.chatInput.value = '';
      upsertMessage(state, message);
      renderConversation(els, state, bpProfile.id);
      void loadInbox({ preserveActive: true });
    } catch (err) {
      renderConversationNotice(els, err.message || 'Could not send message');
    } finally {
      els.chatInput.disabled = false;
      els.chatSend.disabled = false;
      els.chatInput.focus();
    }
  }

  const sendHandler = () => {
    void sendCurrentMessage();
  };
  const enterHandler = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void sendCurrentMessage();
    }
  };
  els.chatSend.addEventListener('click', sendHandler);
  els.chatInput.addEventListener('keydown', enterHandler);
  els.compose?.addEventListener('click', loadContacts);

  void loadInbox();

  return () => {
    socket?.disconnect();
    els.chatSend.removeEventListener('click', sendHandler);
    els.chatInput.removeEventListener('keydown', enterHandler);
    els.compose?.removeEventListener('click', loadContacts);
  };
}

function renderFilters(els, state, reload) {
  if (!els.filters) return;
  const unreadTotal = state.inbox.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0);
  els.filters.innerHTML = `
    <div class="filter-chip${state.unreadOnly ? '' : ' active'}" data-filter="all">All</div>
    <div class="filter-chip${state.unreadOnly ? ' active' : ''}" data-filter="unread">Unread (${unreadTotal})</div>
  `;
  els.filters.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const next = chip.getAttribute('data-filter') === 'unread';
      if (state.unreadOnly === next) return;
      state.unreadOnly = next;
      state.activeParticipant = null;
      state.messages = [];
      reload();
    });
  });
}

function renderInboxLoading(els) {
  els.thread.innerHTML = '<div class="message-state">Loading inbox…</div>';
}

function renderInboxError(els, message) {
  els.thread.innerHTML = `<div class="message-state message-state-error">${escapeHtml(message)}</div>`;
}

function renderInbox(els, state, onSelect) {
  if (state.inbox.length === 0) {
    els.thread.innerHTML = '<div class="message-state">No message threads found.</div>';
    return;
  }

  els.thread.innerHTML = state.inbox
    .map(item => {
      const participant = item.participant || {};
      const active = state.activeParticipant?.id === participant.id;
      const unread = Number(item.unreadCount || 0);
      return `
      <div class="msg-row${unread > 0 ? ' unread' : ''}${active ? ' active' : ''}" data-user-id="${escapeHtml(participant.id)}">
        <div class="msg-row-av" style="background:var(--blue-100);color:var(--blue-700);">${escapeHtml(initialsFromName(participant.name || participant.email))}</div>
        <div class="msg-row-body">
          <div class="msg-row-top">
            <span class="msg-row-name">${escapeHtml(displayParticipant(participant))}</span>
            <span class="msg-row-time">${escapeHtml(formatShortTime(item.lastMessageAt || item.lastMessage?.createdAt))}</span>
          </div>
          <div class="msg-row-preview">${escapeHtml(item.lastMessage?.preview || 'No messages yet')}</div>
        </div>
        ${unread > 0 ? `<div class="unread-badge">${unread}</div>` : ''}
      </div>`;
    })
    .join('');

  els.thread.querySelectorAll('.msg-row[data-user-id]').forEach(row => {
    row.addEventListener('click', () => {
      const userId = row.getAttribute('data-user-id');
      const item = state.inbox.find(next => next.participant?.id === userId);
      if (item?.participant) onSelect(item.participant);
    });
  });
}

function renderContacts(els, state, onSelect) {
  if (state.contacts.length === 0) {
    els.thread.innerHTML = '<div class="message-state">No eligible contacts found.</div>';
    return;
  }
  els.thread.innerHTML = state.contacts
    .map(contact => `
      <div class="msg-row" data-user-id="${escapeHtml(contact.id)}">
        <div class="msg-row-av" style="background:var(--green-100);color:var(--green-700);">${escapeHtml(initialsFromName(contact.name || contact.email))}</div>
        <div class="msg-row-body">
          <div class="msg-row-top">
            <span class="msg-row-name">${escapeHtml(displayParticipant(contact))}</span>
            <span class="msg-row-time">${escapeHtml(contact.role || '')}</span>
          </div>
          <div class="msg-row-preview">Start a new conversation</div>
        </div>
      </div>`)
    .join('');
  els.thread.querySelectorAll('.msg-row[data-user-id]').forEach(row => {
    row.addEventListener('click', () => {
      const userId = row.getAttribute('data-user-id');
      const contact = state.contacts.find(next => next.id === userId);
      if (contact) onSelect(contact);
    });
  });
}

function renderConversationEmpty(els, message) {
  if (els.headerAvatar) els.headerAvatar.textContent = 'BP';
  if (els.headerName) els.headerName.textContent = 'Messages';
  if (els.headerStatus) els.headerStatus.textContent = 'Sign in to use live messaging';
  els.chatInput.disabled = true;
  els.chatSend.disabled = true;
  els.chatInput.placeholder = 'Select a conversation';
  els.chatBody.innerHTML = `<div class="message-state">${escapeHtml(message)}</div>`;
}

function renderConversation(els, state, currentUserId) {
  const participant = state.activeParticipant;
  if (els.headerAvatar) els.headerAvatar.textContent = initialsFromName(participant?.name || participant?.email);
  if (els.headerName) els.headerName.textContent = displayParticipant(participant);
  if (els.headerStatus) els.headerStatus.textContent = `${participant?.role || 'User'} · Live conversation`;
  els.chatInput.disabled = false;
  els.chatSend.disabled = false;
  els.chatInput.placeholder = `Type a message to ${displayParticipant(participant)}…`;

  if (state.messages.length === 0) {
    els.chatBody.innerHTML = '<div class="message-state">No messages in this conversation yet.</div>';
    return;
  }

  els.chatBody.innerHTML = state.messages
    .map(message => {
      const mine = message.senderId === currentUserId;
      return `
      <div>
        <div class="bubble ${mine ? 'me' : 'them'}">${escapeHtml(message.body || message.preview || '')}</div>
        <div class="btime${mine ? ' r' : ''}">${mine ? 'You' : escapeHtml(displayParticipant(message.sender))} · ${escapeHtml(formatShortTime(message.createdAt))}</div>
      </div>`;
    })
    .join('');
  els.chatBody.scrollTop = els.chatBody.scrollHeight;
}

function renderConversationNotice(els, message) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-state message-state-error';
  wrapper.textContent = message;
  els.chatBody.appendChild(wrapper);
  els.chatBody.scrollTop = els.chatBody.scrollHeight;
}

function upsertMessage(state, message) {
  if (!message?.id) return;
  const index = state.messages.findIndex(next => next.id === message.id);
  if (index >= 0) {
    state.messages[index] = message;
  } else {
    state.messages.push(message);
  }
  state.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function peerIdForMessage(message, currentUserId) {
  return message?.senderId === currentUserId ? message.receiverId : message?.senderId;
}

function displayParticipant(user) {
  return user?.name || user?.email || 'Unknown user';
}

function initialsFromName(name) {
  const parts = String(name || 'BP').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BP';
  return parts
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function formatShortTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
