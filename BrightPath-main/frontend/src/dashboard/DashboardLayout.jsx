import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from './Sidebar.jsx';
import { TopHeader } from './TopHeader.jsx';
import { getNavLabel } from './navConfig.js';
import './dashboard-layout.css';

const COLLAPSE_STORAGE_KEY = 'brightpath.sidebarCollapsed';

export function DashboardLayout({
  activeItem,
  children,
  direction = 'rtl',
  loading = false,
  notice = '',
  onLogout,
  onNavigate,
  onRefresh,
  role,
  schoolName,
  userName,
  userRoleLabel,
}) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return sessionStorage.getItem(COLLAPSE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(COLLAPSE_STORAGE_KEY, String(collapsed));
    } catch {
      // Session persistence is a convenience; the layout still works without it.
    }
  }, [collapsed]);

  const breadcrumb = useMemo(() => {
    const current = getNavLabel(activeItem, direction);
    return direction === 'rtl'
      ? ['BrightPath', current].filter(Boolean)
      : ['BrightPath', current].filter(Boolean);
  }, [activeItem, direction]);

  return (
    <div
      className={`bp-dashboard-layout${collapsed ? ' is-sidebar-collapsed' : ''}`}
      dir={direction}
    >
      <Sidebar
        activeItem={activeItem}
        collapsed={collapsed}
        direction={direction}
        onNavigate={onNavigate}
        onToggleCollapse={() => setCollapsed(value => !value)}
        role={role}
      />

      <div className="bp-dashboard-layout__content">
        <TopHeader
          direction={direction}
          onLogout={onLogout}
          onNavigate={onNavigate}
          onRefresh={onRefresh}
          refreshing={loading}
          schoolName={schoolName}
          userName={userName}
          userRoleLabel={userRoleLabel}
        />

        <main className="bp-dashboard-layout__main">
          <nav className="bp-breadcrumb" aria-label="Breadcrumb">
            {breadcrumb.map((item, index) => (
              <span key={`${item}-${index}`}>
                {item}
                {index < breadcrumb.length - 1 ? <b>/</b> : null}
              </span>
            ))}
          </nav>

          {notice ? <div className="notice">{notice}</div> : null}
          {loading ? (
            <div className="notice muted">
              {direction === 'rtl' ? 'جاري تحميل بيانات المدرسة...' : 'Loading school data...'}
            </div>
          ) : null}

          {children}
        </main>
      </div>
    </div>
  );
}
