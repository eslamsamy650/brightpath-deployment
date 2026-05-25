import { useEffect, useMemo, useState } from 'react';
import { apiFetchMessageInbox, createMessagingSocket } from '../api/messagingClient';
import {
  apiGetStudentAttendanceMonth,
  apiListAnnouncements,
  apiListAssignments,
  apiListClasses,
  apiListFinanceTransactions,
  apiListGrades,
  apiListNotifications,
  apiListStudents,
} from '../api/schoolClient';
import { roles } from '../dashboard/roleData';
import {
  displayNameFromProfile,
  initialsFromProfile,
  mapRoleToDashboardTab,
  roleSubtitleFromProfile,
  timeBasedGreeting,
} from '../utils/profileUi';

function trySwitchRole(next, bpProfile, sessionMode, demoRoleSetter) {
  if (sessionMode === 'api' && bpProfile) {
    const locked = mapRoleToDashboardTab(bpProfile.role);
    if (locked !== next) {
      window.alert(
        'You are signed in — only your role dashboard is shown. Use Log out to preview Teacher / Student / Parent demos.'
      );
      return;
    }
  }
  demoRoleSetter(next);
}

function buildPresentation(bpProfile, sessionMode, demoRoleKey) {
  const effectiveRole = bpProfile ? mapRoleToDashboardTab(bpProfile.role) : demoRoleKey;
  const layer = roles[effectiveRole];
  if (!(sessionMode === 'api') || !bpProfile) {
    return {
      tabKey: effectiveRole,
      av: layer.av,
      avBg: layer.avBg,
      avC: layer.avC,
      name: layer.name,
      roleLine: layer.role,
      roleBg: layer.roleBg,
      roleC: layer.roleC,
      greet: layer.greet,
      title: layer.title,
      kpis: layer,
      sidebar: layer,
      panelsHtml: layer,
    };
  }

  const name = displayNameFromProfile(bpProfile);
  const av = initialsFromProfile(bpProfile);
  const subtitle = roleSubtitleFromProfile(bpProfile);
  let title =
    bpProfile.role === 'ADMIN'
      ? 'School overview — welcome to the administrator dashboard.'
      : "You're signed in — dashboard panels below are demo content.";

  const greet = `${timeBasedGreeting()},`;

  return {
    tabKey: effectiveRole,
    av,
    avBg: layer.avBg,
    avC: layer.avC,
    name,
    roleLine: subtitle,
    roleBg: layer.roleBg,
    roleC: layer.roleC,
    greet,
    title,
    kpis: layer,
    sidebar: layer,
    panelsHtml: layer,
  };
}

function buildMessageDashboard(messageState, liveMessaging) {
  if (!liveMessaging) {
    return { unreadCount: 0, badge: '0', panelHtml: '' };
  }

  const inbox = Array.isArray(messageState.inbox) ? messageState.inbox : [];
  const unreadCount = inbox.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0);
  return {
    unreadCount,
    badge: String(unreadCount),
    panelHtml: renderMessagePanelHtml(messageState, inbox),
  };
}

function applyMessageKpi(kpis, bpProfile, liveMessaging, messageDashboard) {
  if (!liveMessaging || bpProfile?.role !== 'PARENT') return kpis;
  const unread = messageDashboard.unreadCount;
  return {
    ...kpis,
    k3l: 'Unread Messages',
    k3v: String(unread),
    k3n: unread > 0 ? 'Needs your attention' : 'All caught up',
    k3c: unread > 0 ? 'var(--amber-500)' : 'var(--green-500)',
  };
}

function buildLiveDashboardHtml(schoolState, bpProfile) {
  if (schoolState.loading) {
    return {
      p1: 'Loading Live Data',
      p1b: dashboardStateRow('Loading your latest school data…'),
      p2: 'Notifications',
      p2b: dashboardStateRow('Loading notifications…'),
    };
  }
  if (schoolState.error) {
    return {
      p1: 'Live Data',
      p1b: dashboardStateRow(schoolState.error, 'chip-red'),
      p2: 'Notifications',
      p2b: dashboardStateRow('Could not load live notifications.', 'chip-red'),
    };
  }

  const role = bpProfile?.role;
  if (role === 'TEACHER' || role === 'ADMIN' || role === 'REGISTRAR' || role === 'SUPER_ADMIN') {
    return {
      p1: role === 'TEACHER' ? '📚 Assignments' : '🏫 Classes',
      p1b:
        role === 'TEACHER'
          ? renderAssignments(schoolState.assignments)
          : renderClasses(schoolState.classes),
      p2: role === 'TEACHER' ? '📊 Recent Grades' : '👥 Students',
      p2b:
        role === 'TEACHER'
          ? renderGrades(schoolState.grades)
          : renderStudents(schoolState.students),
    };
  }

  if (role === 'STUDENT') {
    return {
      p1: '📚 My Assignments',
      p1b: renderAssignments(schoolState.assignments),
      p2: '📊 My Grades',
      p2b: renderGrades(schoolState.grades),
    };
  }

  if (role === 'PARENT') {
    return {
      p1: '📢 Announcements',
      p1b: renderAnnouncements(schoolState.announcements),
      p2: '📅 Attendance',
      p2b: renderAttendance(schoolState.attendance),
    };
  }

  if (role === 'ACCOUNTANT') {
    return {
      p1: '💳 Recent Transactions',
      p1b: renderTransactions(schoolState.transactions),
      p2: '🔔 Notifications',
      p2b: renderNotifications(schoolState.notifications),
    };
  }

  return {
    p1: '📢 Announcements',
    p1b: renderAnnouncements(schoolState.announcements),
    p2: '🔔 Notifications',
    p2b: renderNotifications(schoolState.notifications),
  };
}

function rowHtml({ av = 'BP', title, subtitle, chip = 'Live', chipClass = 'chip-blue', end = '' }) {
  return `
    <div class="row-item">
      <div class="row-av" style="background:var(--blue-100);color:var(--blue-700);">${escapeHtml(av)}</div>
      <div class="row-main"><div class="row-title">${escapeHtml(title)}</div><div class="row-sub">${escapeHtml(subtitle || '')}</div></div>
      ${end ? `<span class="row-end">${escapeHtml(end)}</span>` : `<span class="chip ${chipClass}">${escapeHtml(chip)}</span>`}
    </div>`;
}

function renderEmpty(label) {
  return dashboardStateRow(`No ${label} found yet.`);
}

function renderAssignments(items = []) {
  if (!items.length) return renderEmpty('assignments');
  return items
    .slice(0, 4)
    .map(item =>
      rowHtml({
        av: 'A',
        title: item.title || 'Assignment',
        subtitle: [item.subject?.title, item.class?.name, formatShortDate(item.assessmentDate)].filter(Boolean).join(' · '),
        chip: item.status || 'LIVE',
        chipClass: item.status === 'DRAFT' ? 'chip-amber' : 'chip-green',
      })
    )
    .join('');
}

function renderGrades(items = []) {
  if (!items.length) return renderEmpty('grades');
  return items
    .slice(0, 4)
    .map(item =>
      rowHtml({
        av: 'G',
        title: item.assessment?.title || 'Grade',
        subtitle: item.assessment?.subject?.title || item.student?.firstName || '',
        end:
          item.percentage == null
            ? 'Pending'
            : `${item.letterGrade || ''} ${Math.round(item.percentage)}%`.trim(),
      })
    )
    .join('');
}

function renderAnnouncements(items = []) {
  if (!items.length) return renderEmpty('announcements');
  return items
    .slice(0, 4)
    .map(item =>
      rowHtml({
        av: '📢',
        title: item.title || 'Announcement',
        subtitle: item.body || '',
        chip: item.priority || 'Info',
        chipClass: item.priority === 'URGENT' ? 'chip-red' : 'chip-blue',
      })
    )
    .join('');
}

function renderNotifications(items = []) {
  if (!items.length) return renderEmpty('notifications');
  return items
    .slice(0, 4)
    .map(item =>
      rowHtml({
        av: '🔔',
        title: item.title || item.type || 'Notification',
        subtitle: item.body || '',
        chip: item.isRead ? 'Read' : 'New',
        chipClass: item.isRead ? 'chip-blue' : 'chip-amber',
      })
    )
    .join('');
}

function renderClasses(items = []) {
  if (!items.length) return renderEmpty('classes');
  return items
    .slice(0, 4)
    .map(item =>
      rowHtml({
        av: 'C',
        title: item.name || 'Class',
        subtitle: [item.gradeLevel?.name, item.homeroomTeacher?.name].filter(Boolean).join(' · '),
        chip: `${item.enrollmentCount ?? 0} students`,
      })
    )
    .join('');
}

function renderStudents(items = []) {
  if (!items.length) return renderEmpty('students');
  return items
    .slice(0, 4)
    .map(item =>
      rowHtml({
        av: initialsFromName(item.name || `${item.firstNameEn || item.firstName || ''} ${item.lastNameEn || item.lastName || ''}`),
        title: item.name || `${item.firstNameEn || item.firstName || ''} ${item.lastNameEn || item.lastName || ''}`.trim() || 'Student',
        subtitle: item.studentIdNumber || item.studentCode || '',
        chip: item.isActive === false ? 'Inactive' : 'Active',
        chipClass: item.isActive === false ? 'chip-amber' : 'chip-green',
      })
    )
    .join('');
}

function renderAttendance(attendance) {
  const records = attendance?.records || [];
  if (!records.length) return renderEmpty('attendance records');
  const summary = attendance.summary || {};
  return rowHtml({
    av: '📅',
    title: 'This month',
    subtitle: `Present ${summary.PRESENT || 0} · Late ${summary.LATE || 0} · Absent ${summary.ABSENT || 0}`,
    chip: `${records.length} days`,
  });
}

function renderTransactions(items = []) {
  if (!items.length) return renderEmpty('transactions');
  return items
    .slice(0, 4)
    .map(item =>
      rowHtml({
        av: '💳',
        title: item.receiptNumber || 'Transaction',
        subtitle: [item.paymentMethod, item.status].filter(Boolean).join(' · '),
        end: item.amountEgp == null ? '' : `${item.amountEgp} EGP`,
      })
    )
    .join('');
}

function formatShortDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderMessagePanelHtml(messageState, inbox) {
  if (messageState.loading) {
    return dashboardStateRow('Loading live messages…');
  }
  if (messageState.error) {
    return dashboardStateRow(messageState.error, 'chip-red');
  }
  if (inbox.length === 0) {
    return dashboardStateRow('No message conversations yet.');
  }

  return inbox
    .slice(0, 4)
    .map(item => {
      const participant = item.participant || {};
      const unread = Number(item.unreadCount || 0);
      const preview = item.lastMessage?.preview || 'No messages yet';
      return `
      <div class="row-item">
        <div class="row-av" style="background:var(--blue-100);color:var(--blue-700);">${escapeHtml(initialsFromName(participant.name || participant.email))}</div>
        <div class="row-main"><div class="row-title">${escapeHtml(displayParticipant(participant))}</div><div class="row-sub">${escapeHtml(preview)}</div></div>
        <span class="chip ${unread > 0 ? 'chip-amber' : 'chip-blue'}">${unread > 0 ? `${unread} new` : 'Read'}</span>
      </div>`;
    })
    .join('');
}

function dashboardStateRow(message, chipClass = 'chip-blue') {
  return `
    <div class="row-item">
      <div class="row-av" style="background:var(--blue-100);color:var(--blue-700);">💬</div>
      <div class="row-main"><div class="row-title">Messages</div><div class="row-sub">${escapeHtml(message)}</div></div>
      <span class="chip ${chipClass}">Live</span>
    </div>`;
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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function Dashboard({ bpProfile, sessionMode }) {
  const [demoRole, setDemoRole] = useState('teacher');
  const [messageState, setMessageState] = useState({
    loading: false,
    error: '',
    inbox: [],
  });
  const [schoolState, setSchoolState] = useState({
    loading: false,
    error: '',
    assignments: [],
    grades: [],
    announcements: [],
    notifications: [],
    classes: [],
    students: [],
    attendance: null,
    transactions: [],
  });
  const pv = buildPresentation(bpProfile, sessionMode, demoRole);
  const liveMessaging = sessionMode === 'api' && !!bpProfile?.id;
  const messageDashboard = useMemo(
    () => buildMessageDashboard(messageState, liveMessaging),
    [messageState, liveMessaging]
  );
  const kpis = useMemo(
    () => applyMessageKpi(pv.kpis, bpProfile, liveMessaging, messageDashboard),
    [pv.kpis, bpProfile, liveMessaging, messageDashboard]
  );
  const panelsHtml = useMemo(
    () => {
      if (!liveMessaging) return pv.panelsHtml;
      const livePanels = buildLiveDashboardHtml(schoolState, bpProfile);
      return {
        ...pv.panelsHtml,
        ...livePanels,
        p1: livePanels.p1,
        p1b: livePanels.p1b,
      };
    },
    [liveMessaging, schoolState, bpProfile, pv.panelsHtml]
  );
  const unreadNotifications = schoolState.notifications.filter(item => !item.isRead).length;
  const messageBadge = liveMessaging ? messageDashboard.badge : pv.sidebar.nib2;
  const notificationBadge = liveMessaging ? String(unreadNotifications) : pv.kpis.nb;

  useEffect(() => {
    if (!liveMessaging) {
      return;
    }

    let cancelled = false;
    async function loadInbox() {
      setMessageState(prev => ({ ...prev, loading: true, error: '' }));
      try {
        const { data } = await apiFetchMessageInbox({ limit: 100 });
        if (!cancelled) {
          setMessageState({
            loading: false,
            error: '',
            inbox: Array.isArray(data) ? data : [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setMessageState({
            loading: false,
            error: err.message || 'Could not load messages',
            inbox: [],
          });
        }
      }
    }

    void loadInbox();
    const socket = createMessagingSocket({
      onNewMessage: () => void loadInbox(),
      onSentMessage: () => void loadInbox(),
    });

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [liveMessaging, bpProfile?.id]);

  useEffect(() => {
    if (!liveMessaging) return;
    let cancelled = false;
    async function loadSchoolData() {
      setSchoolState(prev => ({ ...prev, loading: true, error: '' }));
      try {
        const role = bpProfile?.role;
        const studentId = bpProfile?.studentProfile?.id;
        const [
          assignments,
          grades,
          announcements,
          notifications,
          classes,
          students,
          attendance,
          transactions,
        ] = await Promise.all([
          apiListAssignments().catch(() => ({ data: [] })),
          apiListGrades(studentId ? { studentId } : {}).catch(() => ({ data: [] })),
          apiListAnnouncements().catch(() => ({ data: [] })),
          apiListNotifications().catch(() => ({ data: [] })),
          ['ADMIN', 'SUPER_ADMIN', 'REGISTRAR', 'TEACHER'].includes(role)
            ? apiListClasses().catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
          ['ADMIN', 'SUPER_ADMIN', 'REGISTRAR'].includes(role)
            ? apiListStudents().catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
          studentId
            ? apiGetStudentAttendanceMonth(studentId).catch(() => ({ data: null }))
            : Promise.resolve({ data: null }),
          role === 'ACCOUNTANT'
            ? apiListFinanceTransactions().catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
        ]);
        if (!cancelled) {
          setSchoolState({
            loading: false,
            error: '',
            assignments: assignments.data || [],
            grades: grades.data || [],
            announcements: announcements.data || [],
            notifications: notifications.data || [],
            classes: classes.data || [],
            students: students.data || [],
            attendance: attendance.data || null,
            transactions: transactions.data || [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setSchoolState(prev => ({
            ...prev,
            loading: false,
            error: err.message || 'Could not load live school data',
          }));
        }
      }
    }
    void loadSchoolData();
    const socket = createMessagingSocket({
      onNotification: () => void loadSchoolData(),
    });
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [liveMessaging, bpProfile]);

  return (
    <section className="dash-section section" id="dashboard">
      <div className="section-center">
        <div className="eyebrow">Live Dashboard</div>
        <div className="section-h">One View for Every Role</div>
        <div className="section-sub">
          Switch between portals to see how each user experiences BrightPath.
        </div>
      </div>

      <div className="role-tabs">
        {['teacher', 'student', 'parent'].map(tab => (
          <button
            key={tab}
            type="button"
            className={`role-tab${pv.tabKey === tab ? ' active' : ''}`}
            id={`tab-${tab}`}
            onClick={() => trySwitchRole(tab, bpProfile, sessionMode, setDemoRole)}
          >
            {tab === 'teacher' ? '🎓 Teacher' : tab === 'student' ? '📚 Student' : '👨‍👩‍👧 Parent'}
          </button>
        ))}
      </div>

      <div className="app-shell">
        <div className="app-bar">
          <div className="app-bar-left">
            <div className="app-av" style={{ background: pv.avBg, color: pv.avC }}>
              {pv.av}
            </div>
            <div>
              <span className="app-bar-name">{pv.name}</span>
              <span
                className="app-bar-role"
                style={{ background: pv.roleBg, color: pv.roleC }}
              >
                {pv.roleLine}
              </span>
            </div>
          </div>
          <div className="app-bar-right">
            <div className="app-bar-notif">
              🔔
              <span className="notif-badge">{notificationBadge}</span>
            </div>
            <div
              style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}
              id="adate"
            >
              {new Date().toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>

        <div className="app-body">
          <div className="app-nav" id="appNav">
            <div className="nav-item active">🏠 Dashboard</div>
            <div
              className="nav-item"
              id="ni1"
              dangerouslySetInnerHTML={{
                __html:
                  pv.sidebar.ni1 +
                  (pv.sidebar.nib1
                    ? `<span class="nav-item-badge">${pv.sidebar.nib1}</span>`
                    : ''),
              }}
            />
            <div className="nav-item" id="ni2">
              {pv.sidebar.ni2}
            </div>
            <div className="nav-item" id="ni3">
              {pv.sidebar.ni3}
            </div>
            <div className="nav-divider" />
            <div className="nav-item">
              💬 Messages
              <span className="nav-item-badge" id="nib2">
                {messageBadge}
              </span>
            </div>
            <div className="nav-item">📢 Announcements</div>
            <div className="nav-item">📅 Calendar</div>
            <div className="nav-item">📁 Resources</div>
            <div className="nav-divider" />
            <div className="nav-item">⚙️ Settings</div>
          </div>

          <div className="app-main">
            <div className="app-greeting" id="agreet">
              {pv.greet}
            </div>
            <div className="app-title" id="atitle">
              {pv.title}
            </div>

            <div className="kpi-row">
              <div className="kpi">
                <div className="kpi-label" id="k1l">
                  {kpis.k1l}
                </div>
                <div className="kpi-val" id="k1v">
                  {kpis.k1v}
                </div>
                <div className="kpi-note" id="k1n" style={{ color: kpis.k1c }}>
                  {kpis.k1n}
                </div>
              </div>
              <div className="kpi">
                <div className="kpi-label" id="k2l">
                  {kpis.k2l}
                </div>
                <div className="kpi-val" id="k2v">
                  {kpis.k2v}
                </div>
                <div className="kpi-note" id="k2n" style={{ color: kpis.k2c }}>
                  {kpis.k2n}
                </div>
              </div>
              <div className="kpi">
                <div className="kpi-label" id="k3l">
                  {kpis.k3l}
                </div>
                <div className="kpi-val" id="k3v">
                  {kpis.k3v}
                </div>
                <div className="kpi-note" id="k3n" style={{ color: kpis.k3c }}>
                  {kpis.k3n}
                </div>
              </div>
            </div>

            <div className="panels-row">
              <div className="panel">
                <div className="panel-head">
                  <span id="p1title">{panelsHtml.p1}</span>
                  <span
                    style={{
                      fontSize: '0.69rem',
                      color: 'var(--blue-500)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    View All →
                  </span>
                </div>
                <div
                  className="panel-body"
                  id="p1body"
                  dangerouslySetInnerHTML={{ __html: panelsHtml.p1b }}
                />
              </div>
              <div className="panel">
                <div className="panel-head">
                  <span id="p2title">{panelsHtml.p2}</span>
                </div>
                <div
                  className="panel-body"
                  id="p2body"
                  dangerouslySetInnerHTML={{ __html: panelsHtml.p2b }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
