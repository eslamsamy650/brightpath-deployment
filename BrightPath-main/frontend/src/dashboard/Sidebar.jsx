import { getRoleNavItems } from './navConfig.js';

function iconFor(item) {
  return {
    dashboard: '⌂',
    students: 'ط',
    guardians: 'أ',
    teachers: 'م',
    classes: 'ف',
    attendance: 'ح',
    grades: 'د',
    fees: 'ج',
    reports: 'ت',
    settings: '⚙',
    'my-classes': 'ف',
    assignments: 'و',
    'my-children': 'أ',
    messages: 'ر',
    payments: 'د',
  }[item] || '•';
}

export function Sidebar({
  activeItem,
  collapsed,
  direction = 'rtl',
  onNavigate,
  onToggleCollapse,
  role,
}) {
  const navItems = getRoleNavItems(role);

  return (
    <aside className={`bp-sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Dashboard navigation">
      <div className="bp-sidebar__brand">
        <div className="bp-sidebar__mark" aria-hidden="true">
          BP
        </div>
        <div className="bp-sidebar__brandText">
          <strong>BrightPath</strong>
          <span>School ERP</span>
        </div>
      </div>

      <button
        type="button"
        className="bp-sidebar__collapse"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '›' : '‹'}
      </button>

      <nav className="bp-sidebar__nav">
        {navItems.map(([key, enLabel, arLabel]) => {
          const label = direction === 'rtl' ? arLabel : enLabel;
          return (
            <button
              key={key}
              type="button"
              className={activeItem === key ? 'is-active' : ''}
              onClick={() => onNavigate(key)}
              title={label}
            >
              <span className="bp-sidebar__icon" aria-hidden="true">
                {iconFor(key)}
              </span>
              <span className="bp-sidebar__label">{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
