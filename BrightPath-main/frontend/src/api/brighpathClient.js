const BP_TOKEN_ACCESS = 'brightpath_access_token';
const BP_TOKEN_REFRESH = 'brightpath_refresh_token';

let accessTokenMemory = '';

export function getApiBase() {
  const raw = import.meta.env.VITE_API_BASE;
  const base =
    typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : `${window.location.origin}/api/v1`;
  return base.replace(/\/$/, '');
}

export function apiOriginFromBase(base) {
  try {
    const u = new URL(base);
    let p = u.pathname.replace(/\/api\/v1\/?$/i, '');
    if (p === '/') p = '';
    return `${u.origin}${p}`;
  } catch {
    return String(base || '').replace(/\/?api\/v1\/?$/i, '');
  }
}

export async function apiTryRefresh(getBase = getApiBase) {
  const refreshToken = localStorage.getItem(BP_TOKEN_REFRESH);
  if (!refreshToken) return false;

  const res = await fetch(`${getBase()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return false;
  const json = await res.json().catch(() => ({}));
  if (!json.success || !json.data?.accessToken || !json.data?.refreshToken) return false;

  accessTokenMemory = json.data.accessToken;
  localStorage.removeItem(BP_TOKEN_ACCESS);
  localStorage.setItem(BP_TOKEN_REFRESH, json.data.refreshToken);
  return true;
}

export async function apiRequest(path, options = {}, getBase = getApiBase) {
  const base = getBase();
  const headers = { ...(options.headers && typeof options.headers === 'object' ? options.headers : {}) };
  let token = accessTokenMemory;

  if (localStorage.getItem(BP_TOKEN_ACCESS)) {
    localStorage.removeItem(BP_TOKEN_ACCESS);
  }

  if (!token && localStorage.getItem(BP_TOKEN_REFRESH)) {
    await apiTryRefresh(getBase);
    token = accessTokenMemory;
  }

  if (token) headers.Authorization = `Bearer ${token}`;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (options.body !== undefined && !isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let res = await fetch(`${base}${path}`, { ...options, headers });
  if (res.status === 401 && token && (await apiTryRefresh(getBase))) {
    headers.Authorization = `Bearer ${accessTokenMemory}`;
    res = await fetch(`${base}${path}`, { ...options, headers });
  }
  return res;
}

export async function apiFetchMe(getBase = getApiBase) {
  const res = await apiRequest('/users/me', {}, getBase);
  if (!res.ok) throw new Error('Could not load profile');
  const json = await res.json();
  if (!json.success || json.data == null) throw new Error(json.message || 'Invalid profile response');
  return json.data;
}

export async function apiLogin(email, password, getBase = getApiBase) {
  const res = await fetch(`${getBase()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Login failed (${res.status})`);
  if (!json.success || !json.data?.accessToken || !json.data?.refreshToken) {
    throw new Error(json.message || 'Login failed');
  }

  accessTokenMemory = json.data.accessToken;
  localStorage.removeItem(BP_TOKEN_ACCESS);
  localStorage.setItem(BP_TOKEN_REFRESH, json.data.refreshToken);
  return json.data;
}

export async function apiLogout(getBase = getApiBase) {
  const refreshToken = localStorage.getItem(BP_TOKEN_REFRESH);
  const token = accessTokenMemory;

  if (refreshToken) {
    try {
      await fetch(`${getBase()}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Logout should still clear local client state.
    }
  }

  accessTokenMemory = '';
  localStorage.removeItem(BP_TOKEN_ACCESS);
  localStorage.removeItem(BP_TOKEN_REFRESH);
}

export function getAccessToken() {
  return accessTokenMemory;
}

export { BP_TOKEN_ACCESS, BP_TOKEN_REFRESH };
