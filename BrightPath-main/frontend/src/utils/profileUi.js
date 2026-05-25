/** Profile overlay helpers ported from legacy app.js */

export function mapRoleToDashboardTab(role) {
  switch (role) {
    case 'TEACHER':
      return 'teacher';
    case 'STUDENT':
      return 'student';
    case 'PARENT':
      return 'parent';
    case 'ADMIN':
      return 'teacher';
    default:
      return 'teacher';
  }
}

export function displayNameFromProfile(p) {
  if (!p || typeof p !== 'object') return 'User';
  if (p.adminProfile && typeof p.adminProfile === 'object') {
    const a = p.adminProfile;
    return [a.firstName, a.lastName].filter(Boolean).join(' ') || String(p.email || 'Admin');
  }
  if (p.teacherProfile && typeof p.teacherProfile === 'object') {
    const t = p.teacherProfile;
    return [t.firstName, t.lastName].filter(Boolean).join(' ') || String(p.email || 'Teacher');
  }
  if (p.studentProfile && typeof p.studentProfile === 'object') {
    const s = p.studentProfile;
    return [s.firstName, s.lastName].filter(Boolean).join(' ') || String(p.email || 'Student');
  }
  if (p.parentProfile && typeof p.parentProfile === 'object') {
    const pa = p.parentProfile;
    return [pa.firstName, pa.lastName].filter(Boolean).join(' ') || String(p.email || 'Parent');
  }
  return String(p.email || 'User');
}

export function initialsFromName(firstName, lastName) {
  const f = (firstName && String(firstName)[0]) || '?';
  const l = (lastName && String(lastName)[0]) || '';
  return (f + l).toUpperCase();
}

export function initialsFromProfile(p) {
  if (!p || typeof p !== 'object') return 'BP';
  if (p.adminProfile && typeof p.adminProfile === 'object')
    return initialsFromName(p.adminProfile.firstName, p.adminProfile.lastName);
  if (p.teacherProfile && typeof p.teacherProfile === 'object')
    return initialsFromName(p.teacherProfile.firstName, p.teacherProfile.lastName);
  if (p.studentProfile && typeof p.studentProfile === 'object')
    return initialsFromName(p.studentProfile.firstName, p.studentProfile.lastName);
  if (p.parentProfile && typeof p.parentProfile === 'object')
    return initialsFromName(p.parentProfile.firstName, p.parentProfile.lastName);
  return 'BP';
}

export function roleSubtitleFromProfile(p) {
  if (!p || typeof p !== 'object') return '';
  const role = p.role;
  if (role === 'ADMIN') return 'School administrator';
  if (role === 'TEACHER') return 'Teacher';
  if (role === 'STUDENT' && p.studentProfile && typeof p.studentProfile === 'object') {
    const code = p.studentProfile.studentCode;
    return code ? `Student · ${code}` : 'Student';
  }
  if (role === 'PARENT') return 'Parent / guardian';
  return String(role || '');
}

export function timeBasedGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
