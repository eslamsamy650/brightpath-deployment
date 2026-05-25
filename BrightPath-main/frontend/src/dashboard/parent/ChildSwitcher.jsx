import { studentDisplayName } from '../../api/parentApi';

export function ChildSwitcher({ children = [], selectedId, onSelect }) {
  if (!children.length) {
    return <p className="empty">لا يوجد أبناء مرتبطون بهذا الحساب.</p>;
  }

  return (
    <div className="child-switcher" role="tablist" aria-label="اختيار الابن">
      {children.map(child => (
        <button
          key={child.id}
          type="button"
          role="tab"
          aria-selected={selectedId === child.id}
          className={`child-switcher__tab ${selectedId === child.id ? 'is-active' : ''}`}
          onClick={() => onSelect(child.id)}
        >
          {studentDisplayName(child)}
        </button>
      ))}
    </div>
  );
}
