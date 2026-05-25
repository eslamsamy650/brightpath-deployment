export function LoginSection({ apiStatus, loginError, onSubmit }) {
  return (
    <section className="login-section section" id="login">
      <div className="section-center">
        <div className="eyebrow">Live API</div>
        <div className="section-h">Sign in to BrightPath</div>
        <p className="section-sub">
          Connect this app to your running backend (<code className="login-code">npm run dev</code> inside{' '}
          <code className="login-code">backend/</code>). Set{' '}
          <code className="login-code">FRONTEND_URL=http://localhost:5173</code> in{' '}
          <code className="login-code">backend/.env</code> for CORS, or omit{' '}
          <code className="login-code">VITE_API_BASE</code> here to use the Vite proxy.
        </p>
        <p id="apiStatus" className="login-status" aria-live="polite">
          {apiStatus}
        </p>
        <div className="login-card">
          <form
            id="loginForm"
            className="login-form"
            onSubmit={ev => {
              ev.preventDefault();
              const fd = new FormData(ev.currentTarget);
              const email = String(fd.get('email') || '').trim();
              const password = String(fd.get('password') || '');
              void onSubmit?.({ email, password });
            }}
          >
            <label className="login-field">
              <span>Email</span>
              <input
                id="loginEmail"
                name="email"
                type="email"
                autoComplete="username"
                required
                placeholder="fatima@brightpath.eg"
              />
            </label>
            <label className="login-field">
              <span>Password</span>
              <input
                id="loginPassword"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
            </label>
            <button type="submit" className="btn-login-submit">
              Sign in
            </button>
          </form>
          <p id="loginError" className="login-error" role="alert">
            {loginError}
          </p>
          <details className="login-hint">
            <summary>
              Demo accounts (after <code>npm run seed</code> in <code>backend/</code>)
            </summary>
            <ul>
              <li>
                <strong>Teacher</strong> — fatima@brightpath.eg / Teacher@1234
              </li>
              <li>
                <strong>Student</strong> — yasmine@brightpath.eg / Student@1234
              </li>
              <li>
                <strong>Parent</strong> — nadia@example.com / Parent@1234
              </li>
              <li>
                <strong>Admin</strong> — admin@brightpath.eg / Admin@1234
              </li>
            </ul>
          </details>
        </div>
      </div>
    </section>
  );
}
