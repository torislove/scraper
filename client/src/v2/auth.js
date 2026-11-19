/**
 * auth.js
 *
 * One place that knows where the session lives and how to talk to /api/auth.
 *
 * The session is a signed token issued by the engine. It is kept in
 * localStorage so a reload keeps the operator signed in; `AUTH_REQUIRED` is a
 * build-time switch so the app can still be opened without a login while the
 * Google client is being configured.
 */

import { API_URL } from '../apiConfig';

const SESSION_KEY = 'scraper.session.v1';

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
    // Only one copy may exist, or a stale persistent token wins on reload.
    (persistent ? sessionStorage : localStorage).removeItem(SESSION_KEY);
  } catch (e) {
    /* storage blocked: session lives for this page view only */
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

/** Append the token to a stream URL because EventSource cannot send headers. */
export function withStreamToken(url) {
  const token = getToken();
  if (!token) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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

export function fetchAuthConfig() {
  return request('/auth/config');
}

export async function loginWithPassword(email, password, { remember = true } = {}) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, username: email, password })
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

export function logout() {
  clearSession();
  fetch(`${API_URL}/auth/logout`, { method: 'POST' }).catch(() => {});
}

export function useSession() {
  return getSession();
}
