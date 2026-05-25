export const NAV_ITEMS_BY_ROLE = {
  SCHOOL_ADMIN: [
    ['dashboard', 'Dashboard', 'لوحة التحكم'],
    ['students', 'Students', 'الطلاب'],
    ['guardians', 'Guardians', 'أولياء الأمور'],
    ['teachers', 'Teachers', 'المعلمون'],
    ['classes', 'Classes', 'الفصول'],
    ['attendance', 'Attendance', 'الحضور'],
    ['grades', 'Grades', 'الدرجات'],
    ['fees', 'Fees', 'المصروفات'],
    ['reports', 'Reports', 'التقارير'],
    ['settings', 'Settings', 'الإعدادات'],
  ],
  TEACHER: [
    ['dashboard', 'Dashboard', 'لوحة التحكم'],
    ['my-classes', 'My Classes', 'فصولي'],
    ['attendance', 'Attendance', 'الحضور'],
    ['grades', 'Grades', 'الدرجات'],
    ['assignments', 'Assignments', 'الواجبات'],
  ],
  PARENT: [
    ['dashboard', 'Dashboard', 'لوحة التحكم'],
    ['my-children', 'My Children', 'أبنائي'],
    ['grades', 'Grades', 'الدرجات'],
    ['attendance', 'Attendance', 'الحضور'],
    ['fees', 'Fees', 'المصروفات'],
    ['messages', 'Messages', 'الرسائل'],
  ],
  ACCOUNTANT: [
    ['dashboard', 'Dashboard', 'لوحة التحكم'],
    ['fees', 'Fees', 'المصروفات'],
    ['payments', 'Payments', 'المدفوعات'],
    ['reports', 'Reports', 'التقارير'],
  ],
};

const ROLE_ALIASES = {
  ADMIN: 'SCHOOL_ADMIN',
  SUPER_ADMIN: 'SCHOOL_ADMIN',
  REGISTRAR: 'SCHOOL_ADMIN',
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
  TEACHER: 'TEACHER',
  PARENT: 'PARENT',
  STUDENT: 'PARENT',
  ACCOUNTANT: 'ACCOUNTANT',
};

export function getRoleNavItems(role) {
  const navRole = ROLE_ALIASES[role] || 'SCHOOL_ADMIN';
  return NAV_ITEMS_BY_ROLE[navRole];
}

export function getNavLabel(item, direction = 'rtl') {
  const allItems = Object.values(NAV_ITEMS_BY_ROLE).flat();
  const found = allItems.find(([key]) => key === item);
  if (!found) return item;
  return direction === 'rtl' ? found[2] : found[1];
}
