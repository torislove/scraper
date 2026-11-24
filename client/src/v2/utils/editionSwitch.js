/**
 * editionSwitch.js
 * Configurable switcher between Client Cockpit and Master Fleet Command.
 * Automatically respects VITE_CLIENT_URL / VITE_MASTER_URL when deployed to
 * custom production domains, and falls back to local dev ports 5173 / 5174.
 */

export const CLIENT_ORIGIN =
  import.meta.env?.VITE_CLIENT_URL || 'http://localhost:5173';

export const MASTER_ORIGIN =
  import.meta.env?.VITE_MASTER_URL || 'http://localhost:5174';

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
  const cleanOrigin = CLIENT_ORIGIN.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  window.location.href = `${cleanOrigin}${cleanPath}`;
}

export function openMasterWorkspace(navigate, path = '/command?country=IN') {
  if (isMasterRuntime()) {
    navigate(path);
    return;
  }
  const cleanOrigin = MASTER_ORIGIN.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  window.location.href = `${cleanOrigin}${cleanPath}`;
}
