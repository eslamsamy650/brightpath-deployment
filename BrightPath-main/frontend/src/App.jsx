import { useCallback, useEffect, useState } from 'react';
import {
  BP_TOKEN_REFRESH,
  apiFetchMe,
  apiLogin,
  apiLogout,
  apiOriginFromBase,
  getApiBase,
} from './api/brighpathClient';
import {
  apiListAcademicYears,
  apiListAssignments,
  apiListClasses,
  apiListFinanceTransactions,
  apiListGradeLevels,
  apiListGrades,
  apiListGuardians,
  apiListSchools,
  apiListStudents,
  apiListUsers,
  apiRecordGrade,
} from './api/schoolClient';
import { DashboardLayout } from './dashboard/DashboardLayout.jsx';
import { AttendanceEntryPage } from './dashboard/attendance/AttendanceEntryPage.jsx';
import { ClassesPage } from './dashboard/classes/ClassesPage.jsx';
import { GradeEntryPage } from './dashboard/grades/GradeEntryPage.jsx';
import { GuardiansPage } from './dashboard/guardians/GuardiansPage.jsx';
import { FeeStructurePage } from './dashboard/fees/FeeStructurePage.jsx';
import { PaymentRecordingPage } from './dashboard/fees/PaymentRecordingPage.jsx';
import { NotificationsPage } from './dashboard/notifications/NotificationsPage.jsx';
import { ParentDashboard } from './dashboard/parent/ParentDashboard.jsx';
import { ReportsPage } from './dashboard/reports/ReportsPage.jsx';
import { StudentsPage } from './dashboard/students/StudentsPage.jsx';

const ROLE_LABELS = {
  SCHOOL_ADMIN: 'إدارة المدرسة',
  SUPER_ADMIN: 'مدير النظام',
  ADMIN: 'إدارة المدرسة',
  REGISTRAR: 'شؤون الطلاب',
  ACCOUNTANT: 'الحسابات',
  TEACHER: 'معلم',
  STUDENT: 'طالب',
  PARENT: 'ولي أمر',
};

function emptyData() {
  return {
    schools: [],
    years: [],
    levels: [],
    users: [],
    classes: [],
    students: [],
    guardians: [],
    assignments: [],
    grades: [],
    transactions: [],
  };
}

function displayName(profile) {
  const p =
    profile?.adminProfile ||
    profile?.teacherProfile ||
    profile?.studentProfile ||
    profile?.parentProfile;
  return p?.name || [p?.firstNameAr || p?.firstNameEn, p?.lastNameAr || p?.lastNameEn].filter(Boolean).join(' ') || profile?.email || 'مستخدم BrightPath';
}

function schoolIdFrom(profile, data) {
  return (
    profile?.adminProfile?.schoolId ||
    profile?.teacherProfile?.schoolId ||
    profile?.studentProfile?.schoolId ||
    data.schools[0]?.id ||
    ''
  );
}

function nameAr(row, fallback = 'غير محدد') {
  return row?.nameAr || row?.titleAr || row?.name || row?.nameEn || row?.title || row?.titleEn || fallback;
}

function normalizeError(err) {
  return err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
}

async function loadWorkspaceData(role) {
  const canManage = ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR'].includes(role);
  const canTeach = ['SUPER_ADMIN', 'ADMIN', 'TEACHER'].includes(role);
  const canFinance = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(role);

  const [
    schools,
    years,
    levels,
    users,
    classes,
    students,
    guardians,
    assignments,
    grades,
    transactions,
  ] = await Promise.all([
    apiListSchools().catch(() => ({ data: [] })),
    canManage || canFinance ? apiListAcademicYears().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    canManage ? apiListGradeLevels().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    canManage ? apiListUsers().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    canManage || canTeach ? apiListClasses().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    canManage || canFinance || canTeach ? apiListStudents().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    canManage ? apiListGuardians().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    canTeach ? apiListAssignments().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    apiListGrades().catch(() => ({ data: [] })),
    canFinance ? apiListFinanceTransactions().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
  ]);

  return {
    schools: schools.data || [],
    years: years.data || [],
    levels: levels.data || [],
    users: users.data || [],
    classes: classes.data || [],
    students: students.data || [],
    guardians: guardians.data || [],
    assignments: assignments.data || [],
    grades: grades.data || [],
    transactions: transactions.data || [],
  };
}

export default function App() {
  const [profile, setProfile] = useState(null);
  const [apiStatus, setApiStatus] = useState('جاري فحص الاتصال...');
  const [loginError, setLoginError] = useState('');
  const [active, setActive] = useState('dashboard');
  const [data, setData] = useState(emptyData);
  const [loadingData, setLoadingData] = useState(false);
  const [notice, setNotice] = useState('');

  const role = profile?.role || '';
  const signedIn = Boolean(profile);

  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, []);

  useEffect(() => {
    const origin = apiOriginFromBase(getApiBase());
    const controller = new AbortController();

    void (async () => {
      try {
        const res = await fetch(`${origin}/health`, { signal: controller.signal });
        setApiStatus(res.ok ? `متصل بالواجهة البرمجية: ${origin}` : `الخادم رد بحالة ${res.status}`);
      } catch (err) {
        if (err.name !== 'AbortError') setApiStatus(`لا يمكن الوصول إلى الخادم: ${origin}`);
      }
    })();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(BP_TOKEN_REFRESH)) return;
    void (async () => {
      try {
        const me = await apiFetchMe();
        setProfile(me);
        setLoadingData(true);
        setData(await loadWorkspaceData(me.role));
        setLoadingData(false);
      } catch {
        setLoadingData(false);
        await apiLogout();
      }
    })();
  }, []);

  const refreshData = useCallback(async (nextRole = role) => {
    setLoadingData(true);
    setNotice('');
    try {
      setData(await loadWorkspaceData(nextRole));
    } catch (err) {
      setNotice(normalizeError(err));
    } finally {
      setLoadingData(false);
    }
  }, [role]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError('');
    const form = new FormData(event.currentTarget);
    try {
      await apiLogin(form.get('email'), form.get('password'));
      const me = await apiFetchMe();
      setProfile(me);
      setActive('dashboard');
      await refreshData(me.role);
    } catch (err) {
      setLoginError(normalizeError(err));
    }
  }

  async function handleLogout() {
    await apiLogout();
    setProfile(null);
    setData(emptyData());
    setActive('dashboard');
  }

  async function submitAction(action, successMessage) {
    setNotice('');
    try {
      await action();
      await refreshData();
      setNotice(successMessage);
    } catch (err) {
      setNotice(normalizeError(err));
    }
  }

  return (
    <main className="bp-root">
      {!signedIn ? (
        <LoginScreen apiStatus={apiStatus} loginError={loginError} onLogin={handleLogin} />
      ) : (
        <DashboardLayout
          activeItem={active}
          direction="rtl"
          loading={loadingData}
          notice={notice}
          onLogout={handleLogout}
          onNavigate={setActive}
          onRefresh={() => refreshData()}
          role={role}
          schoolName={nameAr(data.schools[0], 'BrightPath School')}
          userName={displayName(profile)}
          userRoleLabel={ROLE_LABELS[role] || role}
        >
          <ActiveModule
            active={active}
            role={role}
            profile={profile}
            data={data}
            onSubmit={submitAction}
            schoolName={nameAr(data.schools[0], 'BrightPath School')}
          />
        </DashboardLayout>
      )}
    </main>
  );
}

function LoginScreen({ apiStatus, loginError, onLogin }) {
  return (
    <section className="login-page">
      <div className="login-copy">
        <p className="eyebrow">BrightPath ERP</p>
        <h1>نظام إدارة مدارس عربي أولا للمدارس المصرية</h1>
        <p>
          سجّل الدخول لفتح لوحة العمل الحقيقية: الطلاب، الفصول، الحضور، الدرجات، والمصروفات
          اليدوية ضمن نطاق المدرسة.
        </p>
      </div>
      <form className="login-panel" onSubmit={onLogin}>
        <h2>تسجيل الدخول</h2>
        <p className="status">{apiStatus}</p>
        <label>
          البريد الإلكتروني
          <input name="email" type="email" autoComplete="username" required defaultValue="admin@brightpath.eg" />
        </label>
        <label>
          كلمة المرور
          <input name="password" type="password" autoComplete="current-password" required defaultValue="Admin@1234" />
        </label>
        {loginError ? <p className="form-error">{loginError}</p> : null}
        <button type="submit">دخول إلى النظام</button>
        <p className="hint">يتم حفظ رمز التحديث فقط. رمز الوصول يبقى في الذاكرة أثناء الجلسة.</p>
      </form>
    </section>
  );
}

function isParentPortalRole(role) {
  return role === 'PARENT' || role === 'STUDENT';
}

function ActiveModule({ active, role, profile, data, onSubmit, schoolName }) {
  if (active === 'notifications') return <NotificationsPage />;
  if (
    isParentPortalRole(role) &&
    ['dashboard', 'my-children', 'portal', 'grades', 'attendance', 'fees'].includes(active)
  ) {
    return <ParentDashboard profile={profile} />;
  }
  if (active === 'students') {
    return <StudentsPage fallbackSchoolId={data.schools[0]?.id || ''} profile={profile} role={role} />;
  }
  if (active === 'guardians') return <GuardiansPage role={role} />;
  if (active === 'classes' || active === 'my-classes') {
    return <ClassesPage fallbackSchoolId={data.schools[0]?.id || ''} profile={profile} role={role} />;
  }
  if (active === 'attendance') return <AttendanceEntryPage />;
  if (active === 'grades') return <GradeEntryPage />;
  if (active === 'grade-records') return <GradesModule data={data} onSubmit={onSubmit} />;
  if (active === 'fees') {
    return <FeeStructurePage fallbackSchoolId={data.schools[0]?.id || ''} profile={profile} role={role} />;
  }
  if (active === 'payments') {
    return (
      <PaymentRecordingPage
        fallbackSchoolId={data.schools[0]?.id || ''}
        profile={profile}
        schoolName={schoolName}
      />
    );
  }
  if (active === 'teachers') return <PlaceholderModule title="المعلمون" text="سيتم ربط شاشة المعلمين مع وحدة staff الحالية في المرحلة التالية." />;
  if (active === 'assignments') return <PlaceholderModule title="الواجبات" text="تم تجهيز عنصر التنقل، وسيتم بناء شاشة الواجبات فوق endpoints الحالية." />;
  if (active === 'reports') return <ReportsPage />;
  if (active === 'settings') return <PlaceholderModule title="الإعدادات" text="سيتم ربط إعدادات المدرسة والمستخدم مع API الموجود لاحقا." />;
  if (active === 'messages') return <PlaceholderModule title="الرسائل" text="Socket.io والرسائل موجودة، وسيتم وضع شاشة الرسائل هنا." />;
  return <DashboardModule role={role} data={data} />;
}

function PlaceholderModule({ title, text }) {
  return (
    <section className="module">
      <div className="data-card empty-card">
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </section>
  );
}

function DashboardModule({ role, data }) {
  const cards = [
    ['الطلاب', data.students.length, 'سجلات الطلاب النشطة والمتاحة لدورك'],
    ['الفصول', data.classes.length, 'فصول العام الدراسي الحالي'],
    ['الدرجات', data.grades.length, 'درجات مسجلة أو متاحة للقراءة'],
    ['إيصالات', data.transactions.length, 'مدفوعات يدوية Cash/Bank فقط'],
  ];
  return (
    <section className="module">
      <div className="module-head">
        <div>
          <p>نظرة عامة</p>
          <h2>لوحة {ROLE_LABELS[role] || 'المستخدم'}</h2>
        </div>
      </div>
      <div className="metric-grid">
        {cards.map(([label, value, desc]) => (
          <article className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <p>{desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function GradesModule({ data, onSubmit }) {
  return (
    <section className="module grid-two">
      <EntityList
        title="آخر الدرجات"
        items={data.grades}
        columns={[
          ['الطالب', item => item.student?.name || item.studentName || '-'],
          ['التقييم', item => item.assessment?.title || '-'],
          ['الدرجة', item => (item.isAbsent ? 'غائب' : item.marksObtained ?? item.percentage ?? '-')],
        ]}
      />
      <SmartForm
        title="إدخال درجة"
        fields={[
          ['studentId', 'select', data.students[0]?.id || '', 'الطالب', data.students.map(s => [s.id, s.name || `${s.firstNameAr || ''} ${s.lastNameAr || ''}`])],
          ['assessmentId', 'select', data.assignments[0]?.id || '', 'التقييم', data.assignments.map(a => [a.id, a.title || a.titleAr || a.titleEn || 'تقييم'])],
          ['marksObtained', 'number', '', 'الدرجة'],
          ['notesAr', 'textarea', '', 'ملاحظات عربية (اختياري)'],
        ]}
        onSubmit={payload => onSubmit(() => apiRecordGrade(payload), 'تم تسجيل الدرجة')}
      />
    </section>
  );
}

function EntityList({ title, items, columns }) {
  return (
    <div className="data-card">
      <h2>{title}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{columns.map(([label]) => <th key={label}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {items.length ? (
              items.slice(0, 12).map(item => (
                <tr key={item.id}>
                  {columns.map(([label, render]) => (
                    <td key={label}>{render(item) || '-'}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="empty">
                  لا توجد بيانات بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SmartForm({ title, fields, onSubmit }) {
  return (
    <form
      className="card-form"
      onSubmit={event => {
        event.preventDefault();
        const payload = {};
        const form = new FormData(event.currentTarget);
        fields.forEach(([name, type]) => {
          const value = form.get(name);
          if (value === '' && type !== 'hidden') return;
          payload[name] = type === 'number' ? Number(value) : value;
        });
        onSubmit(payload);
        event.currentTarget.reset();
      }}
    >
      <h2>{title}</h2>
      {fields.map(([name, type, value, label, options]) => {
        if (type === 'hidden') return <input key={name} name={name} type="hidden" value={value} readOnly />;
        if (type === 'textarea') {
          return (
            <label key={name}>
              {label}
              <textarea name={name} defaultValue={value} />
            </label>
          );
        }
        if (type === 'select') {
          return (
            <label key={name}>
              {label}
              <select name={name} defaultValue={value} required>
                {(options || []).map(([optionValue, optionLabel]) => (
                  <option key={optionValue} value={optionValue}>
                    {optionLabel}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        return (
          <label key={name}>
            {label}
            <input name={name} type={type} defaultValue={value} required={!label?.includes('اختياري')} />
          </label>
        );
      })}
      <button type="submit">حفظ</button>
    </form>
  );
}
