/**
 * auth.js
 *
 * Unified authentication & session client for Master Command Center.
 */

import { useEffect, useState } from 'react';
import { API_URL } from '../apiConfig';

const SESSION_KEY = 'scraper.session.v1';
const CONFIG_CACHE_KEY = 'scraper.auth.config.v1';

export const AUTH_REQUIRED = import.meta.env.VITE_AUTH_REQUIRED === '1';

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token) return null;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

export function setSession(session, { persistent = true } = {}) {
  try {
    const store = persistent ? localStorage : sessionStorage;
    store.setItem(SESSION_KEY, JSON.stringify(session));
    (persistent ? sessionStorage : localStorage).removeItem(SESSION_KEY);
  } catch (e) {
    /* storage blocked */
  }
  window.dispatchEvent(new CustomEvent('scraper:auth-changed', { detail: session }));
  return session;
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('scraper:auth-changed', { detail: null }));
}

export function getToken() {
  return getSession()?.token || null;
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function withStreamToken(url) {
  const token = getToken();
  if (!token) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {})
    },
    ...options
  });
  let body = null;
  try {
    body = await response.json();
  } catch (e) {
    body = null;
  }
  if (!response.ok || body?.success === false) {
    const error = new Error(body?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.code = body?.error;
    throw error;
  }
  return body;
}

export function getCachedAuthConfig() {
  try {
    const raw = sessionStorage.getItem(CONFIG_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { authRequired: AUTH_REQUIRED, allowSelfSignup: false, googleEnabled: false };
}

export async function fetchAuthConfig() {
  const cfg = await request('/auth/config');
  try {
    sessionStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(cfg));
  } catch (e) {}
  return cfg;
}

export async function registerWithPassword({ name, email, password, company = '', plan = 'starter', remember = true }) {
  const result = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, company, plan, remember })
  });
  return setSession(
    { token: result.token, expiresAt: result.expiresAt, user: result.user },
    { persistent: remember }
  );
}

export async function loginWithPassword(email, password, { remember = true } = {}) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, username: email, password, remember })
  });
  return setSession(
    { token: result.token, expiresAt: result.expiresAt, user: result.user },
    { persistent: remember }
  );
}

export async function loginWithGoogle(credential, { remember = true } = {}) {
  const result = await request('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential })
  });
  return setSession(
    { token: result.token, expiresAt: result.expiresAt, user: result.user },
    { persistent: remember }
  );
}

export async function fetchMe() {
  const session = getSession();
  if (!session?.token) return null;
  try {
    const result = await request('/auth/me');
    const updated = { ...session, user: result.user, expiresAt: result.expiresAt || session.expiresAt };
    const isPersistent = Boolean(localStorage.getItem(SESSION_KEY));
    return setSession(updated, { persistent: isPersistent });
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      clearSession();
    }
    return null;
  }
}

export async function refreshSession() {
  const result = await request('/auth/refresh', { method: 'POST' });
  const isPersistent = Boolean(localStorage.getItem(SESSION_KEY));
  return setSession(
    { token: result.token, expiresAt: result.expiresAt, user: result.user },
    { persistent: isPersistent }
  );
}

export async function changePassword(currentPassword, newPassword) {
  const result = await request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  });
  if (result.token) {
    const isPersistent = Boolean(localStorage.getItem(SESSION_KEY));
    setSession(
      { token: result.token, expiresAt: result.expiresAt, user: result.user },
      { persistent: isPersistent }
    );
  }
  return result;
}

export function requestPasswordReset(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export function confirmPasswordReset({ email, code, newPassword }) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code, newPassword })
  });
}

export function logout() {
  clearSession();
  fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
}

export async function logoutAll() {
  try {
    await request('/auth/logout-all', { method: 'POST' });
  } catch (e) {}
  clearSession();
}

export function useSession() {
  return getSession();
}

export function useAuthSession() {
  const [session, setLocalSession] = useState(() => getSession());

  useEffect(() => {
    const sync = () => setLocalSession(getSession());
    window.addEventListener('scraper:auth-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('scraper:auth-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return session;
}
