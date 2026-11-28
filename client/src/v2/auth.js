/**
 * auth.js
 *
 * Unified authentication & session client for Scraper.co.in (Client).
 * Supports Free Firebase Auth (Email/Password + Google Sign-In on Spark plan)
 * bridged cleanly to signed backend sessions, plus resilient local server
 * fallback, 7-day free launch access metadata, sliding refresh, and sign-out.
 */

import { useEffect, useState } from 'react';
import { API_URL, DIRECT_BACKEND_URL } from '../apiConfig';
import {
  firebaseLogout,
  sendResetEmail,
  signInWithEmail,
  signInWithGooglePopup,
  signUpWithEmail
} from '../firebase';

const SESSION_KEY = 'scraper.session.v1';
const CONFIG_CACHE_KEY = 'scraper.auth.config.v1';

export const AUTH_REQUIRED = import.meta.env.VITE_AUTH_REQUIRED === '1';

export function isLocalDev() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.local');
}

export function loginLocalDevBypass(role = 'admin') {
  const isMaster = role === 'admin';
  const session = {
    user: {
      id: isMaster ? 'usr_dev_master' : 'usr_dev_client',
      email: isMaster ? 'admin@scraper.co.in' : 'dev@scraper.co.in',
      name: isMaster ? 'Master Administrator' : 'Local Developer',
      company: 'Scraper Local Dev',
      role: isMaster ? 'admin' : 'user',
      plan: 'enterprise',
      credits: 999999
    },
    token: 'dev-local-bypass-token',
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
  };
  setSession(session, { persistent: true });
  return session;
}

function mapFirebaseError(err, fallbackMsg) {
  const code = String(err?.code || '');
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google sign-in popup was closed before completing.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Your browser blocked the Google sign-in popup. Allow popups for this site and try again.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Add this domain under Firebase Console -> Authentication -> Settings -> Authorized domains.';
  }
  if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
    return 'Enable Google & Email/Password providers in Firebase Console -> Authentication -> Sign-in method.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password must be at least 8 characters long.';
  }
  if (code === 'auth/invalid-email') {
    return 'Enter a valid email address.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'That email and password do not match an account.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Wait a minute and try again.';
  }
  return err?.message || fallbackMsg;
}

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
  } catch (e) { }
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
  const fetchOpts = {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {})
    }
  };
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, fetchOpts);
    const ct = response.headers.get('content-type') || '';
    const shouldRetryDirect =
      String(API_URL || '').startsWith('/') &&
      DIRECT_BACKEND_URL &&
      ([502, 503, 504].includes(response.status) ||
        (response.status === 500 && !ct.includes('application/json')));
    if (shouldRetryDirect) {
      response = await fetch(`${DIRECT_BACKEND_URL}/api${path}`, fetchOpts);
    }
  } catch (err) {
    if (String(API_URL || '').startsWith('/') && DIRECT_BACKEND_URL) {
      response = await fetch(`${DIRECT_BACKEND_URL}/api${path}`, fetchOpts);
    } else {
      throw err;
    }
  }
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
  } catch (e) { }
  return {
    authRequired: AUTH_REQUIRED,
    allowSelfSignup: true,
    firebaseAuthEnabled: true,
    googleEnabled: false,
    freeTrialDays: 7,
    paymentRequired: false
  };
}

export async function fetchAuthConfig() {
  const cfg = await request('/auth/config');
  try {
    sessionStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(cfg));
  } catch (e) { }
  return cfg;
}

export async function loginWithFirebaseIdToken(idToken, { name = '', company = '', plan = 'starter', remember = true } = {}) {
  const result = await request('/auth/firebase', {
    method: 'POST',
    body: JSON.stringify({ idToken, name, company, plan, remember })
  });
  return setSession(
    { token: result.token, expiresAt: result.expiresAt, user: result.user },
    { persistent: remember }
  );
}

export async function loginWithFirebaseGoogle({ remember = true } = {}) {
  try {
    const { user, idToken } = await signInWithGooglePopup();
    return await loginWithFirebaseIdToken(idToken, {
      name: user?.displayName || '',
      remember
    });
  } catch (err) {
    throw new Error(mapFirebaseError(err, 'Google sign-in failed.'), { cause: err });
  }
}

export async function registerWithPassword({ name, email, password, company = '', plan = 'starter', remember = true }) {
  try {
    const { idToken } = await signUpWithEmail({ name, email, password });
    return await loginWithFirebaseIdToken(idToken, { name, company, plan, remember });
  } catch (fbErr) {
    const code = String(fbErr?.code || '');
    const canFallbackLocal =
      code === 'auth/operation-not-allowed' ||
      code === 'auth/configuration-not-found' ||
      code === 'auth/network-request-failed' ||
      code === 'auth/unauthorized-domain';
    if (!canFallbackLocal) {
      throw new Error(mapFirebaseError(fbErr, 'Could not create account.'), { cause: fbErr });
    }
  }

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
  const cleanIdentifier = String(email || '').trim();
  if (cleanIdentifier.includes('@')) {
    try {
      const { user, idToken } = await signInWithEmail(cleanIdentifier, password);
      return await loginWithFirebaseIdToken(idToken, {
        name: user?.displayName || '',
        remember
      });
    } catch (fbErr) {
      const code = String(fbErr?.code || '');
      const tryLocalFallback =
        code === 'auth/operation-not-allowed' ||
        code === 'auth/configuration-not-found' ||
        code === 'auth/network-request-failed' ||
        code === 'auth/unauthorized-domain' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-credential';
      if (!tryLocalFallback) {
        throw new Error(mapFirebaseError(fbErr, 'Sign-in failed.'), { cause: fbErr });
      }
    }
  }

  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: cleanIdentifier, username: cleanIdentifier, password, remember })
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

export async function requestPasswordReset(email) {
  try {
    await sendResetEmail(String(email || '').trim());
    return {
      success: true,
      firebaseEmailSent: true,
      message: 'Password reset link sent to your email! Check your inbox (and Spam folder).'
    };
  } catch (fbErr) {
    const code = String(fbErr?.code || '');
    const tryLocal =
      code === 'auth/operation-not-allowed' ||
      code === 'auth/configuration-not-found' ||
      code === 'auth/network-request-failed' ||
      code === 'auth/unauthorized-domain' ||
      code === 'auth/user-not-found';
    if (!tryLocal) {
      throw new Error(mapFirebaseError(fbErr, 'Could not send reset email.'), { cause: fbErr });
    }
  }
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
  firebaseLogout();
  fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => { });
}

export async function logoutAll() {
  try {
    await request('/auth/logout-all', { method: 'POST' });
  } catch (e) { }
  firebaseLogout();
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
