import { NotificationBell } from './notifications/NotificationBell.jsx';

function initialsFromName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'BP';
}

export function TopHeader({
  direction = 'rtl',
  onLogout,
  onNavigate,
  onRefresh,
  refreshing = false,
  schoolName,
  userName,
  userRoleLabel,
}) {
  return (
    <header className="bp-top-header">
      <div className="bp-top-header__school">
        <span>{direction === 'rtl' ? 'المدرسة' : 'School'}</span>
        <strong>{schoolName || 'BrightPath School'}</strong>
      </div>

      <div className="bp-top-header__actions">
        <NotificationBell onViewAll={() => onNavigate?.('notifications')} />

        {onRefresh ? (
          <button type="button" className="bp-header-button" onClick={onRefresh} disabled={refreshing}>
            {direction === 'rtl' ? 'تحديث' : 'Refresh'}
          </button>
        ) : null}

        <div className="bp-user-chip">
          <div className="bp-user-chip__avatar" aria-hidden="true">
            {initialsFromName(userName)}
          </div>
          <div className="bp-user-chip__text">
            <strong>{userName || 'BrightPath User'}</strong>
            <span>{userRoleLabel}</span>
          </div>
        </div>

        <button type="button" className="bp-header-button bp-header-button--ghost" onClick={onLogout}>
          {direction === 'rtl' ? 'خروج' : 'Logout'}
        </button>
      </div>
    </header>
  );
}
