import { getStudentAttendanceRange } from './attendanceApi';
import { apiGetStudentAttendanceMonth, apiListAnnouncements } from './schoolClient';
import { getStudent } from './studentsApi';
import { getReportCard } from './gradesApi';
import { getStudentFees } from './financeApi';
import { listGuardianStudents } from './guardiansApi';

export function studentDisplayName(student = {}) {
  return (
    student.name ||
    [student.firstNameAr || student.firstName, student.lastNameAr || student.lastName]
      .filter(Boolean)
      .join(' ') ||
    [student.firstNameEn, student.lastNameEn].filter(Boolean).join(' ') ||
    student.studentCode ||
    student.studentIdNumber ||
    'طالب'
  );
}

export async function resolveParentChildren(profile) {
  if (profile?.children?.length) return profile.children;
  if (profile?.studentProfile?.id) {
    return [
      {
        id: profile.studentProfile.id,
        firstName: profile.studentProfile.firstName,
        lastName: profile.studentProfile.lastName,
        studentCode: profile.studentProfile.studentCode,
        avatarUrl: profile.studentProfile.avatarUrl,
      },
    ];
  }
  if (profile?.parentProfile?.id) {
    const { data } = await listGuardianStudents(profile.parentProfile.id);
    return data || [];
  }
  return [];
}

async function fetchSection(label, request, fallback) {
  try {
    return await request();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'تعذر التحميل';
    return { data: fallback, error: `${label}: ${message}` };
  }
}

export async function loadChildDashboardData(studentId) {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 4);
  const fromIso = from.toISOString().slice(0, 10);
  const toIso = now.toISOString().slice(0, 10);

  const [studentRes, attendanceMonth, attendanceRecent, reportRes, feesRes, announcementsRes] =
    await Promise.all([
      fetchSection('بيانات الطالب', () => getStudent(studentId), null),
      fetchSection('الحضور الشهري', () => apiGetStudentAttendanceMonth(studentId, now), null),
      fetchSection('الحضور الأخير', () => getStudentAttendanceRange(studentId, { from: fromIso, to: toIso }), null),
      fetchSection('الدرجات', () => getReportCard(studentId, { term: 'Term 1' }), null),
      fetchSection('المصروفات', () => getStudentFees(studentId), null),
      fetchSection('الإعلانات', () => apiListAnnouncements({ limit: 3 }), []),
    ]);

  const sectionErrors = [
    studentRes.error,
    attendanceMonth.error,
    attendanceRecent.error,
    reportRes.error,
    feesRes.error,
    announcementsRes.error,
  ].filter(Boolean);

  if (!studentRes.data && sectionErrors.length >= 3) {
    throw new Error(sectionErrors[0] || 'تعذر تحميل بيانات الطالب');
  }

  const monthSummary = attendanceMonth.data?.summary || {};
  const monthTotal =
    Object.values(monthSummary).reduce((sum, value) => sum + (Number(value) || 0), 0) || 0;
  const presentCount = Number(monthSummary.PRESENT || 0);
  const presentPercent = monthTotal ? Math.round((presentCount / monthTotal) * 100) : 0;

  const recentRecords = (attendanceRecent.data?.records || attendanceMonth.data?.records || []).slice(-5);
  const subjects = reportRes.data?.subjects || [];
  const sortedSubjects = [...subjects].sort((a, b) => (b.percent || 0) - (a.percent || 0));
  const overallAverage = subjects.length
    ? Math.round(subjects.reduce((sum, row) => sum + (row.percent || 0), 0) / subjects.length)
    : null;

  const fees = feesRes.data || {};
  const nextInstallment = (fees.installments || [])
    .filter(row => row.status !== 'paid' && row.status !== 'waived')
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0];

  return {
    student: studentRes.data,
    attendance: {
      presentPercent,
      summary: monthSummary,
      recentRecords,
      monthRecords: attendanceMonth.data?.records || [],
    },
    grades: {
      term: 'Term 1',
      subjects: sortedSubjects.slice(0, 3),
      allSubjects: subjects,
      overallAverage,
      report: reportRes.data,
    },
    fees: {
      outstanding: fees.outstanding || 0,
      totalFees: fees.totalFees || 0,
      paid: fees.paid || 0,
      nextInstallment,
      installments: fees.installments || [],
    },
    announcements: announcementsRes.data || [],
    sectionErrors,
  };
}
