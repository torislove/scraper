/**
 * editionSwitch.js
 * Unified portal origin resolver and router across Client, Master, Admin & Backend API.
 * Automatically resolves production domains (scraper.co.in, master.scraper.co.in,
 * admin.scraper.co.in, api.scraper.co.in) or local dev ports (5173 / 5174 / 5175 / 5002).
 */

function isLocalRuntimeHost(hostname = '') {
  return (
    !hostname ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.endsWith('.local')
  );
}

function resolvePortalOrigin(envValue, prodOrigin, devPort) {
  if (envValue) return envValue.replace(/\/$/, '');
  if (typeof window === 'undefined') return `http://localhost:${devPort}`;
  const { protocol, hostname } = window.location;
  if (isLocalRuntimeHost(hostname)) {
    return `${protocol === 'https:' ? 'https:' : 'http:'}//${hostname || 'localhost'}:${devPort}`;
  }
  return prodOrigin;
}

export const CLIENT_ORIGIN = resolvePortalOrigin(
  import.meta.env?.VITE_CLIENT_URL,
  'https://scraper.co.in',
  5173
);

export const MASTER_ORIGIN = resolvePortalOrigin(
  import.meta.env?.VITE_MASTER_URL,
  'https://master.scraper.co.in',
  5174
);

export const ADMIN_ORIGIN = resolvePortalOrigin(
  import.meta.env?.VITE_ADMIN_URL,
  'https://admin.scraper.co.in',
  5175
);

export const API_ORIGIN = resolvePortalOrigin(
  import.meta.env?.VITE_BACKEND_URL,
  'https://api.scraper.co.in',
  5002
);

export function isMasterRuntime() {
  if (typeof window === 'undefined') return false;
  if (window.location.port === '5174') return true;
  if (window.location.hostname?.startsWith('master.')) return true;
  return import.meta.env?.VITE_EDITION === 'master';
}

export function openClientWorkspace(navigate, path = '/command?country=IN', ensureConnected) {
  if (!isMasterRuntime()) {
    if (typeof ensureConnected === 'function') {
      ensureConnected(() => navigate(path), { country: 'IN' });
    } else {
      navigate(path);
    }
    return;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  window.location.href = `${CLIENT_ORIGIN}${cleanPath}`;
}

export function openMasterWorkspace(navigate, path = '/command?country=IN') {
  if (isMasterRuntime()) {
    navigate(path);
    return;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  window.location.href = `${MASTER_ORIGIN}${cleanPath}`;
}

export function openAdminWorkspace(navigate, path = '/') {
  if (typeof window === 'undefined') return;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (isLocalRuntimeHost(window.location.hostname)) {
    window.location.href = `${ADMIN_ORIGIN}${cleanPath}`;
    return;
  }
  if (ADMIN_ORIGIN && ADMIN_ORIGIN !== window.location.origin) {
    window.location.href = `${ADMIN_ORIGIN}${cleanPath}`;
    return;
  }
  if (typeof navigate === 'function') {
    navigate(`/admin${cleanPath === '/' ? '' : cleanPath}`);
  } else {
    window.location.href = `/admin${cleanPath === '/' ? '' : cleanPath}`;
  }
}

export function openPortalLogin(portal, navigate, mode = 'signin') {
  const loginRoute = mode === 'signup' ? '/signup' : '/login';
  if (portal === 'admin') {
    openAdminWorkspace(navigate, '/');
    return;
  }
  if (portal === 'master') {
    if (isMasterRuntime() && typeof navigate === 'function') {
      navigate('/login');
    } else {
      window.location.href = `${MASTER_ORIGIN}/login`;
    }
    return;
  }
  if (!isMasterRuntime() && typeof navigate === 'function') {
    navigate(loginRoute);
  } else {
    window.location.href = `${CLIENT_ORIGIN}${loginRoute}`;
  }
}
