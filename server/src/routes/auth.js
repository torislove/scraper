'use strict';

/**
 * auth.js
 *
 * Complete zero-dependency identity & session engine for both Client & Master
 * command centers.
 *
 * Features:
 *   • Self-serve client signup (`POST /api/auth/register`) + auto workspace registration
 *   • Email/username + password login (`POST /api/auth/login`) with scrypt hashing
 *   • Optional keyless Google Identity Services (`POST /api/auth/google`)
 *   • Live token verification with tokenVersion (`tv`) revocation (`GET /api/auth/me`)
 *   • Sliding token refresh (`POST /api/auth/refresh`)
 *   • Authenticated password change (`POST /api/auth/change-password`)
 *   • 6-digit single-use password reset flow (`POST /api/auth/forgot-password` & `/reset-password`)
 *   • Single-device (`POST /api/auth/logout`) & all-device (`POST /api/auth/logout-all`) sign-out
 *   • Hardened admin setup (`PUT /api/auth/admin` locked to master after bootstrap)
 *   • Dual delivery: Signed HMAC-SHA256 JWT + HttpOnly SameSite=Lax `scraper_session` cookie
 *   • Built-in brute-force rate limiting
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { DATA_DIR } = require('../config/paths');
const security = require('../middleware/security');
const masterStore = require('../services/masterStore');

const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RESETS_FILE = path.join(DATA_DIR, 'password_resets.json');
const SECRET_FILE = path.join(DATA_DIR, '.session-secret');

const TOKEN_TTL_LONG = Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 24 * 7); // 7 days
const TOKEN_TTL_SHORT = Number(process.env.SESSION_SHORT_TTL_SECONDS || 60 * 60 * 24); // 24 hours
const RESET_TTL_MS = 15 * 60 * 1000; // 15 minutes
const FREE_TRIAL_DAYS = Math.max(1, Number(process.env.FREE_TRIAL_DAYS || 7));
const FIREBASE_PROJECT_ID = String(process.env.FIREBASE_PROJECT_ID || 'scraper-37c72').trim();

function computeTrialMetadata(user = {}) {
  const role = user.role || 'client';
  if (role === 'master' || role === 'admin') {
    return {
      active: false,
      unlimited: true,
      daysRemaining: null,
      endsAt: null,
      paymentRequired: false
    };
  }
  const paymentEnforced = process.env.PAYMENT_ENFORCEMENT === '1';
  const launchUntilMs = process.env.LAUNCH_FREE_UNTIL ? Date.parse(process.env.LAUNCH_FREE_UNTIL) : 0;
  const startedMs = Date.parse(user.trialStartedAt || user.createdAt || '') || Date.now();
  const explicitEndMs = Date.parse(user.trialEndsAt || '') || 0;
  const endsAtMs = Math.max(
    explicitEndMs || (startedMs + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000),
    Number.isFinite(launchUntilMs) ? launchUntilMs : 0
  );
  const remainingMs = Math.max(0, endsAtMs - Date.now());
  const daysRemaining = remainingMs > 0 ? Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000))) : 0;
  return {
    active: remainingMs > 0 || !paymentEnforced,
    unlimited: false,
    daysRemaining: remainingMs > 0 ? daysRemaining : FREE_TRIAL_DAYS,
    endsAt: new Date(endsAtMs).toISOString(),
    paymentRequired: Boolean(paymentEnforced && remainingMs <= 0)
  };
}

const authRateLimit = security.createAuthLimiter({ windowMs: 15 * 60_000, max: 14, name: 'Authentication' });

/* ---------------------------------------------------------------------------
 * Atomic storage helpers
 * ------------------------------------------------------------------------- */

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return fallback;
  }
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(input) {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function timingSafeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function getSecret() {
  const fromEnv = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;

  try {
    if (fs.existsSync(SECRET_FILE)) {
      const saved = fs.readFileSync(SECRET_FILE, 'utf8').trim();
      if (saved.length >= 32) return saved;
    }
    const fresh = crypto.randomBytes(48).toString('hex');
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    fs.writeFileSync(SECRET_FILE, fresh, { encoding: 'utf8', mode: 0o600 });
    console.warn('[auth] SESSION_SECRET not set — generated data/.session-secret. Set SESSION_SECRET in production.');
    return fresh;
  } catch (e) {
    console.warn('[auth] could not persist a session secret; tokens will not survive a restart.');
    return crypto.randomBytes(48).toString('hex');
  }
}

const SECRET = getSecret();

/* ---------------------------------------------------------------------------
 * Validation & password hashing (scrypt, zero external dependency)
 * ------------------------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validatePasswordStrength(password) {
  const raw = String(password || '');
  if (raw.length < 8) return 'Password must be at least 8 characters long.';
  if (raw.length > 128) return 'Password must be 128 characters or fewer.';
  if (!/[A-Za-z]/.test(raw) || !/\d/.test(raw)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const [scheme, salt, digest] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !digest) {
    return timingSafeEqual(password, stored);
  }
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return timingSafeEqual(derived, digest);
}

function hashResetCode(email, code) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(`reset:${String(email).toLowerCase()}:${String(code).trim()}`)
    .digest('hex');
}

/* ---------------------------------------------------------------------------
 * Tokens & HttpOnly cookie helpers
 * ------------------------------------------------------------------------- */

function signToken(user, { remember = true } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = remember ? TOKEN_TTL_LONG : TOKEN_TTL_SHORT;
  const payload = {
    sub: user.id,
    role: user.role,
    clientId: user.clientId || (user.role === 'master' ? 'master' : user.id),
    email: user.email || null,
    name: user.name || null,
    tv: Number(user.tokenVersion || 1),
    iat: now,
    exp: now + ttl
  };
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return { token: `${header}.${body}.${signature}`, payload, ttl };
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  if (!timingSafeEqual(signature, expected)) return null;
  try {
    const payload = JSON.parse(fromBase64url(body).toString('utf8'));
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function attachSessionCookie(req, res, token, ttlSeconds) {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const parts = [
    `scraper_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    isSecure ? 'SameSite=None' : 'SameSite=Lax',
    `Max-Age=${Math.max(60, Math.floor(ttlSeconds))}`
  ];
  if (isSecure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function readToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(header));
  if (match) return verifyToken(match[1].trim());
  const cookie = req.headers?.cookie || '';
  const cookieMatch = /(?:^|;\s*)scraper_session=([^;]+)/.exec(cookie);
  if (cookieMatch) return verifyToken(decodeURIComponent(cookieMatch[1]));
  const queryToken = req.query?.token;
  const streamPath = String(req.path || req.originalUrl || '');
  if (queryToken && /\/(logs\/stream|scrape\/stream|events|stream)(\/|$)/.test(streamPath)) {
    return verifyToken(String(queryToken));
  }
  return null;
}

/* ---------------------------------------------------------------------------
 * User directory & live session checks
 * ------------------------------------------------------------------------- */

function getUsers() {
  const users = readJson(USERS_FILE, []);
  return Array.isArray(users) ? users : [];
}

function saveUsers(users) {
  writeJsonAtomic(USERS_FILE, users);
}

function findUser({ email, username, id, clientId }) {
  const users = getUsers();
  if (id) return users.find(u => u.id === id) || null;
  if (clientId) return users.find(u => u.clientId === clientId) || null;
  const needle = String(email || username || '').trim().toLowerCase();
  if (!needle) return null;
  return users.find(
    u => String(u.email || '').toLowerCase() === needle || String(u.username || '').toLowerCase() === needle
  ) || null;
}

function enrichUserWithPlan(user) {
  const role = user.role || 'client';
  const clientId = user.clientId || (role === 'master' ? 'master' : user.id);
  const record = role === 'master' ? null : masterStore.getClientRecord(clientId);
  const trial = computeTrialMetadata(user);
  return {
    id: user.id,
    email: user.email || null,
    name: user.name || (role === 'master' ? 'Administrator' : 'Workspace User'),
    company: user.company || '',
    role,
    clientId,
    plan: role === 'master' ? 'sovereign' : (record?.plan || user.plan || 'launch_free_7d'),
    credits: role === 'master' ? null : (record?.credits ?? 5000),
    trial,
    status: user.status === 'suspended' || record?.status === 'suspended' ? 'suspended' : 'active',
    tokenVersion: Number(user.tokenVersion || 1),
    lastLoginAt: user.lastLoginAt || null
  };
}

function publicUser(user) {
  const enriched = enrichUserWithPlan(user);
  return {
    id: enriched.id,
    email: enriched.email,
    name: enriched.name,
    company: enriched.company,
    role: enriched.role,
    clientId: enriched.clientId,
    plan: enriched.plan,
    credits: enriched.credits,
    trial: enriched.trial,
    status: enriched.status
  };
}

/**
 * Verifies that a decoded JWT has not been invalidated by a password reset,
 * logout-all, or account suspension.
 */
function verifyLiveSession(claims) {
  if (!claims || !claims.sub) return { ok: false, reason: 'invalid_token' };
  if (claims.sub === 'admin') {
    const admin = getAdminCredentials();
    const currentTv = Number(admin?.tokenVersion || 1);
    if (claims.tv && Number(claims.tv) < currentTv) {
      return { ok: false, reason: 'session_revoked' };
    }
    return { ok: true, user: publicUser({ id: 'admin', name: 'Administrator', role: 'master', clientId: 'master' }) };
  }

  const user = findUser({ id: claims.sub });
  if (user) {
    const currentTv = Number(user.tokenVersion || 1);
    if (claims.tv && Number(claims.tv) < currentTv) {
      return { ok: false, reason: 'session_revoked' };
    }
    const enriched = enrichUserWithPlan(user);
    if (enriched.status === 'suspended') {
      return { ok: false, reason: 'account_suspended' };
    }
    return { ok: true, user: publicUser(user) };
  }

  // Fallback for legacy employee records
  return {
    ok: true,
    user: {
      id: claims.sub,
      email: claims.email || null,
      name: claims.name || 'Workspace User',
      role: claims.role || 'client',
      clientId: claims.clientId || claims.sub,
      plan: claims.role === 'master' ? 'sovereign' : 'starter',
      status: 'active'
    }
  };
}

function getAdminCredentials() {
  const file = readJson(ADMIN_FILE, null);
  if (file && file.username && file.password) return file;
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    return { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD, tokenVersion: 1 };
  }
  return null;
}

function getEmployees() {
  const rows = readJson(EMPLOYEES_FILE, []);
  return Array.isArray(rows) ? rows : [];
}

function syncClientToMasterStore(user) {
  if (!user || user.role === 'master') return;
  try {
    const existing = masterStore.getClientRecord(user.clientId);
    if (!existing) {
      masterStore.upsertClient({
        id: user.clientId,
        name: user.name || user.email?.split('@')[0] || 'Client',
        email: user.email || '',
        plan: ['free', 'starter', 'pro', 'agency', 'custom'].includes(String(user.plan || '').toLowerCase())
          ? String(user.plan).toLowerCase()
          : 'starter',
        status: 'active',
        note: user.company ? `Company: ${user.company}` : 'Self-registered account'
      });
    }
  } catch (e) {
    /* never fail signup on master bookkeeping */
  }
}

function touchLastLogin(userId) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return;
  users[idx].lastLoginAt = new Date().toISOString();
  saveUsers(users);
}

function resolvePasswordLogin(identifier, password) {
  const user = findUser({ email: identifier, username: identifier });
  if (user && user.passwordHash && verifyPassword(password, user.passwordHash)) {
    const enriched = enrichUserWithPlan(user);
    if (enriched.status === 'suspended') {
      const err = new Error('account_suspended');
      err.status = 403;
      throw err;
    }
    touchLastLogin(user.id);
    return enriched;
  }

  const admin = getAdminCredentials();
  if (admin && identifier === admin.username && verifyPassword(password, admin.password)) {
    return {
      id: 'admin',
      email: admin.email || null,
      name: admin.name || 'Administrator',
      role: 'master',
      clientId: 'master',
      tokenVersion: Number(admin.tokenVersion || 1),
      status: 'active'
    };
  }

  const employee = getEmployees().find(
    e => (e.username === identifier || e.email === identifier) && verifyPassword(password, e.password)
  );
  if (employee) {
    return {
      id: employee.id || `emp_${employee.username}`,
      email: employee.email || null,
      name: employee.name || employee.username,
      role: 'client',
      clientId: employee.clientId || employee.id || `emp_${employee.username}`,
      tokenVersion: 1,
      status: 'active'
    };
  }

  return null;
}

/* ---------------------------------------------------------------------------
 * Password reset store helpers
 * ------------------------------------------------------------------------- */

function getResets() {
  const list = readJson(RESETS_FILE, []);
  const now = Date.now();
  return Array.isArray(list) ? list.filter(item => item && item.expiresAt > now) : [];
}

function issueResetCode(email, userId) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const code = String(crypto.randomInt(100000, 1000000));
  const resets = getResets().filter(item => item.email !== cleanEmail);
  resets.push({
    email: cleanEmail,
    userId,
    codeHash: hashResetCode(cleanEmail, code),
    createdAt: Date.now(),
    expiresAt: Date.now() + RESET_TTL_MS
  });
  writeJsonAtomic(RESETS_FILE, resets);
  return { code, expiresAt: new Date(Date.now() + RESET_TTL_MS).toISOString() };
}

/* ---------------------------------------------------------------------------
 * Operator helpers exported for master.js
 * ------------------------------------------------------------------------- */

function provisionClientUser({ clientId, email, name, password, plan = 'starter', company = '' }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail)) throw new Error('Enter a valid email address.');
  const pwErr = validatePasswordStrength(password);
  if (pwErr) throw new Error(pwErr);

  const users = getUsers();
  const existingIdx = users.findIndex(
    u => u.clientId === clientId || String(u.email || '').toLowerCase() === cleanEmail
  );
  const now = new Date().toISOString();

  if (existingIdx !== -1) {
    const existing = users[existingIdx];
    users[existingIdx] = {
      ...existing,
      email: cleanEmail,
      name: name || existing.name || cleanEmail.split('@')[0],
      company: company || existing.company || '',
      clientId: clientId || existing.clientId,
      passwordHash: hashPassword(password),
      tokenVersion: Number(existing.tokenVersion || 1) + 1,
      status: 'active',
      updatedAt: now
    };
    saveUsers(users);
    return publicUser(users[existingIdx]);
  }

  const created = {
    id: `usr_${crypto.randomBytes(6).toString('hex')}`,
    email: cleanEmail,
    name: String(name || cleanEmail.split('@')[0]).trim(),
    company: String(company || '').trim(),
    role: 'client',
    clientId: clientId || `ws_${crypto.randomBytes(5).toString('hex')}`,
    plan,
    passwordHash: hashPassword(password),
    tokenVersion: 1,
    status: 'active',
    createdAt: now,
    updatedAt: now
  };
  users.push(created);
  saveUsers(users);
  return publicUser(created);
}

function createResetCodeForClient(clientId) {
  const user = findUser({ clientId });
  if (!user || !user.email) {
    throw new Error('This client does not have a provisioned email login yet. Set their login first.');
  }
  const issued = issueResetCode(user.email, user.id);
  return { email: user.email, code: issued.code, expiresAt: issued.expiresAt };
}

function revokeUserSessions({ id, clientId }) {
  const users = getUsers();
  const idx = users.findIndex(u => (id && u.id === id) || (clientId && u.clientId === clientId));
  if (idx === -1) return false;
  users[idx].tokenVersion = Number(users[idx].tokenVersion || 1) + 1;
  users[idx].updatedAt = new Date().toISOString();
  saveUsers(users);
  return true;
}

/* ---------------------------------------------------------------------------
 * Google ID token verification (keyless: Google's public tokeninfo endpoint)
 * ------------------------------------------------------------------------- */

async function verifyGoogleCredential(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const error = new Error('google_not_configured');
    error.status = 503;
    throw error;
  }

  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    const error = new Error('google_token_invalid');
    error.status = 401;
    throw error;
  }
  const claims = await response.json();

  if (claims.aud !== clientId) {
    const error = new Error('google_audience_mismatch');
    error.status = 401;
    throw error;
  }
  if (String(claims.email_verified) !== 'true') {
    const error = new Error('google_email_unverified');
    error.status = 401;
    throw error;
  }

  return claims;
}

function userFromGoogleClaims(claims) {
  const email = String(claims.email || '').toLowerCase();

  const provisioned = findUser({ email });
  if (provisioned) {
    const enriched = enrichUserWithPlan(provisioned);
    if (enriched.status === 'suspended') {
      const error = new Error('account_suspended');
      error.status = 403;
      throw error;
    }
    touchLastLogin(provisioned.id);
    return enriched;
  }

  const bySub = getUsers().find(u => u.googleSub && u.googleSub === claims.sub);
  if (bySub) {
    const enriched = enrichUserWithPlan(bySub);
    if (enriched.status === 'suspended') {
      const error = new Error('account_suspended');
      error.status = 403;
      throw error;
    }
    touchLastLogin(bySub.id);
    return enriched;
  }

  const masterEmails = String(process.env.GOOGLE_MASTER_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const masterDomain = String(process.env.GOOGLE_MASTER_DOMAIN || '').trim().toLowerCase();
  const allowDomains = String(process.env.GOOGLE_ALLOWED_DOMAINS || '')
    .split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
  const domain = email.split('@')[1] || '';

  const isMasterEligible = masterEmails.includes(email) || (masterDomain && domain === masterDomain);
  const openClientSignup = process.env.GOOGLE_OPEN_SIGNUP !== '0' && process.env.ALLOW_SELF_SIGNUP !== '0';
  const domainAllowed = allowDomains.length === 0 || allowDomains.includes(domain);

  if (isMasterEligible || (openClientSignup && domainAllowed) || (process.env.GOOGLE_AUTO_PROVISION === '1' && domainAllowed)) {
    const role = isMasterEligible ? 'master' : 'client';
    const created = {
      id: `usr_${crypto.randomBytes(6).toString('hex')}`,
      email,
      name: claims.name || email.split('@')[0],
      role,
      clientId: role === 'master' ? 'master' : `ws_${crypto.randomBytes(5).toString('hex')}`,
      plan: role === 'master' ? 'sovereign' : 'starter',
      googleSub: claims.sub,
      tokenVersion: 1,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    const users = getUsers();
    users.push(created);
    saveUsers(users);
    syncClientToMasterStore(created);
    return enrichUserWithPlan(created);
  }

  const error = new Error('not_provisioned');
  error.status = 403;
  throw error;
}

/* ---------------------------------------------------------------------------
 * Firebase ID token verification (zero-key: Google SecureToken X.509 certs)
 * ------------------------------------------------------------------------- */

const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let firebaseCertCache = { certs: null, expiresAt: 0 };

async function getFirebasePublicCerts(forceRefresh = false) {
  if (!forceRefresh && firebaseCertCache.certs && Date.now() < firebaseCertCache.expiresAt) {
    return firebaseCertCache.certs;
  }
  const response = await fetch(FIREBASE_CERTS_URL, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    const err = new Error('firebase_certs_unavailable');
    err.status = 503;
    throw err;
  }
  const certs = await response.json();
  const cc = String(response.headers.get('cache-control') || '');
  const maxAgeMatch = /max-age=(\d+)/i.exec(cc);
  const ttlSec = maxAgeMatch ? Math.max(60, Number(maxAgeMatch[1])) : 3600;
  firebaseCertCache = { certs, expiresAt: Date.now() + ttlSec * 1000 };
  return certs;
}

async function verifyFirebaseIdToken(idToken) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) {
    const err = new Error('firebase_token_invalid');
    err.status = 401;
    throw err;
  }
  let header;
  let claims;
  try {
    header = JSON.parse(fromBase64url(parts[0]).toString('utf8'));
    claims = JSON.parse(fromBase64url(parts[1]).toString('utf8'));
  } catch (e) {
    const err = new Error('firebase_token_invalid');
    err.status = 401;
    throw err;
  }

  if (header.alg !== 'RS256' || !header.kid) {
    const err = new Error('firebase_token_invalid');
    err.status = 401;
    throw err;
  }

  let certs = await getFirebasePublicCerts(false);
  let certPem = certs?.[header.kid];
  if (!certPem) {
    certs = await getFirebasePublicCerts(true);
    certPem = certs?.[header.kid];
  }
  if (!certPem) {
    const err = new Error('firebase_token_invalid');
    err.status = 401;
    throw err;
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();
  const signatureOk = verifier.verify(certPem, fromBase64url(parts[2]));
  if (!signatureOk) {
    const err = new Error('firebase_token_invalid');
    err.status = 401;
    throw err;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
  if (
    claims.aud !== FIREBASE_PROJECT_ID ||
    claims.iss !== expectedIssuer ||
    !claims.sub ||
    !claims.exp ||
    claims.exp < nowSec - 30 ||
    (claims.iat && claims.iat > nowSec + 120)
  ) {
    const err = new Error('firebase_audience_mismatch');
    err.status = 401;
    throw err;
  }

  return claims;
}

function userFromFirebaseClaims(claims, extra = {}) {
  const email = String(claims.email || '').trim().toLowerCase();
  const uid = String(claims.user_id || claims.sub || '').trim();
  if (!email && !uid) {
    const err = new Error('firebase_token_invalid');
    err.status = 401;
    throw err;
  }

  const masterEmails = String(process.env.GOOGLE_MASTER_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const masterDomain = String(process.env.GOOGLE_MASTER_DOMAIN || '').trim().toLowerCase();
  const domain = email.split('@')[1] || '';
  const isMasterEligible = Boolean(email && (masterEmails.includes(email) || (masterDomain && domain === masterDomain)));

  const users = getUsers();
  const existingIdx = users.findIndex(
    u => (email && String(u.email || '').toLowerCase() === email) || (uid && u.firebaseUid === uid)
  );

  if (existingIdx !== -1) {
    const existing = users[existingIdx];
    const upgradedRole = isMasterEligible ? 'master' : (existing.role || 'client');
    users[existingIdx] = {
      ...existing,
      firebaseUid: uid || existing.firebaseUid,
      name: existing.name || extra.name || claims.name || (email ? email.split('@')[0] : 'Workspace User'),
      company: existing.company || String(extra.company || '').trim().slice(0, 100),
      role: upgradedRole,
      clientId: upgradedRole === 'master' ? 'master' : existing.clientId,
      plan: upgradedRole === 'master' ? 'sovereign' : (existing.plan || 'launch_free_7d'),
      lastLoginAt: new Date().toISOString()
    };
    saveUsers(users);
    const enriched = enrichUserWithPlan(users[existingIdx]);
    if (enriched.status === 'suspended') {
      const err = new Error('account_suspended');
      err.status = 403;
      throw err;
    }
    return enriched;
  }

  if (!isMasterEligible && process.env.ALLOW_SELF_SIGNUP === '0') {
    const err = new Error('signup_disabled');
    err.status = 403;
    throw err;
  }

  const role = isMasterEligible ? 'master' : 'client';
  const nowIso = new Date().toISOString();
  const trialEndIso = new Date(Date.now() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const created = {
    id: `usr_${crypto.randomBytes(6).toString('hex')}`,
    email: email || null,
    name: String(extra.name || claims.name || (email ? email.split('@')[0] : 'Workspace User')).trim().slice(0, 80),
    company: String(extra.company || '').trim().slice(0, 100),
    role,
    clientId: role === 'master' ? 'master' : `ws_${crypto.randomBytes(5).toString('hex')}`,
    plan: role === 'master' ? 'sovereign' : 'launch_free_7d',
    firebaseUid: uid,
    trialStartedAt: nowIso,
    trialEndsAt: role === 'master' ? null : trialEndIso,
    tokenVersion: 1,
    status: 'active',
    createdAt: nowIso,
    lastLoginAt: nowIso
  };
  users.push(created);
  saveUsers(users);
  syncClientToMasterStore(created);
  return enrichUserWithPlan(created);
}

/* ---------------------------------------------------------------------------
 * Routes
 * ------------------------------------------------------------------------- */

router.get('/config', (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  res.json({
    authRequired: process.env.AUTH_REQUIRED === '1',
    allowSelfSignup: process.env.ALLOW_SELF_SIGNUP !== '0',
    localLogin: true,
    firebaseAuthEnabled: true,
    firebaseProjectId: FIREBASE_PROJECT_ID,
    googleEnabled: Boolean(googleClientId),
    googleClientId,
    freeTrialDays: FREE_TRIAL_DAYS,
    paymentRequired: process.env.PAYMENT_ENFORCEMENT === '1',
    hasAdmin: Boolean(getAdminCredentials()),
    provider: 'firebase+password',
    masterHost: process.env.MASTER_HOST || null
  });
});

router.post('/firebase', authRateLimit, async (req, res) => {
  const { idToken, name = '', company = '', remember = true } = req.body || {};
  if (!idToken) {
    return res.status(400).json({
      success: false,
      error: 'missing_token',
      message: 'Firebase authentication token is required.'
    });
  }
  try {
    const claims = await verifyFirebaseIdToken(idToken);
    const user = userFromFirebaseClaims(claims, { name, company });
    const { token, payload, ttl } = signToken(user, { remember: Boolean(remember) });
    attachSessionCookie(req, res, token, ttl);
    return res.json({
      success: true,
      token,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      user: publicUser(user)
    });
  } catch (error) {
    const status = error.status || 401;
    const messages = {
      firebase_certs_unavailable: 'Could not reach Google authentication certificates. Please try again.',
      firebase_token_invalid: 'Could not verify your Firebase sign-in token. Please sign in again.',
      firebase_audience_mismatch: 'Firebase project mismatch on authentication token.',
      account_suspended: 'This workspace is currently paused. Contact your administrator.',
      signup_disabled: 'New self-serve registrations are currently paused.'
    };
    return res.status(status).json({
      success: false,
      error: error.message || 'firebase_auth_failed',
      message: messages[error.message] || 'Authentication failed. Please try again.'
    });
  }
});

router.post('/register', authRateLimit, (req, res) => {
  if (process.env.ALLOW_SELF_SIGNUP === '0') {
    return res.status(403).json({
      success: false,
      error: 'signup_disabled',
      message: 'New self-serve registrations are currently paused. Contact your workspace administrator.'
    });
  }

  const { name, email, password, company = '', plan = 'starter', remember = true } = req.body || {};
  const cleanName = String(name || '').trim().slice(0, 80);
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanName || cleanName.length < 2) {
    return res.status(400).json({ success: false, error: 'invalid_name', message: 'Enter your full name.' });
  }
  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ success: false, error: 'invalid_email', message: 'Enter a valid email address.' });
  }
  const pwErr = validatePasswordStrength(password);
  if (pwErr) {
    return res.status(400).json({ success: false, error: 'weak_password', message: pwErr });
  }
  if (findUser({ email: cleanEmail })) {
    return res.status(409).json({
      success: false,
      error: 'email_exists',
      message: 'An account with this email already exists. Try signing in instead.'
    });
  }

  const allowedPlans = new Set(['free', 'starter', 'pro', 'growth']);
  const safePlan = allowedPlans.has(String(plan).toLowerCase())
    ? (String(plan).toLowerCase() === 'growth' ? 'pro' : String(plan).toLowerCase())
    : 'starter';

  const now = new Date().toISOString();
  const trialEndsAt = new Date(Date.now() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const created = {
    id: `usr_${crypto.randomBytes(6).toString('hex')}`,
    email: cleanEmail,
    name: cleanName,
    company: String(company || '').trim().slice(0, 100),
    role: 'client',
    clientId: `ws_${crypto.randomBytes(5).toString('hex')}`,
    plan: safePlan || 'launch_free_7d',
    passwordHash: hashPassword(password),
    trialStartedAt: now,
    trialEndsAt,
    tokenVersion: 1,
    status: 'active',
    createdAt: now,
    lastLoginAt: now
  };

  const users = getUsers();
  users.push(created);
  saveUsers(users);
  syncClientToMasterStore(created);

  const enriched = enrichUserWithPlan(created);
  const { token, payload, ttl } = signToken(enriched, { remember: Boolean(remember) });
  attachSessionCookie(req, res, token, ttl);

  return res.status(201).json({
    success: true,
    token,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    user: publicUser(created)
  });
});

router.post('/login', authRateLimit, (req, res) => {
  const { email, username, password, remember = true } = req.body || {};
  const identifier = String(email || username || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      error: 'missing_credentials',
      message: 'Enter your email and password.'
    });
  }

  let user = null;
  try {
    user = resolvePasswordLogin(identifier, password);
  } catch (err) {
    if (err.message === 'account_suspended') {
      return res.status(403).json({
        success: false,
        error: 'account_suspended',
        message: 'This workspace is currently paused. Contact support or your administrator.'
      });
    }
    throw err;
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'invalid_credentials',
      message: 'That email and password do not match an account.'
    });
  }

  const { token, payload, ttl } = signToken(user, { remember: Boolean(remember) });
  attachSessionCookie(req, res, token, ttl);

  return res.json({
    success: true,
    token,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    user: publicUser(user)
  });
});

router.post('/google', authRateLimit, async (req, res) => {
  const credential = req.body?.credential;
  if (!credential) {
    return res.status(400).json({
      success: false,
      error: 'missing_credential',
      message: 'Google did not return a credential.'
    });
  }

  try {
    const claims = await verifyGoogleCredential(credential);
    const user = userFromGoogleClaims(claims);
    const { token, payload, ttl } = signToken(user, { remember: true });
    attachSessionCookie(req, res, token, ttl);
    return res.json({
      success: true,
      token,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      user: publicUser(user)
    });
  } catch (error) {
    const status = error.status || 500;
    const messages = {
      google_not_configured: 'Google Sign-In is not configured on this server yet.',
      google_token_invalid: 'Google could not verify that sign-in. Please try again.',
      google_audience_mismatch: 'This Google client is not allowed for this workspace.',
      google_email_unverified: 'Your Google email is not verified.',
      account_suspended: 'This workspace is currently paused. Contact your administrator.',
      not_provisioned: 'This Google account has not been added to a workspace yet.'
    };
    return res.status(status).json({
      success: false,
      error: error.message,
      message: messages[error.message] || 'Google sign-in failed.'
    });
  }
});

router.get('/me', (req, res) => {
  const claims = readToken(req);
  if (!claims) {
    return res.status(401).json({ success: false, error: 'unauthenticated' });
  }
  const live = verifyLiveSession(claims);
  if (!live.ok) {
    return res.status(live.reason === 'account_suspended' ? 403 : 401).json({
      success: false,
      error: live.reason,
      message: live.reason === 'account_suspended'
        ? 'Your workspace is paused.'
        : 'Your session expired or was signed out. Please sign in again.'
    });
  }
  return res.json({
    success: true,
    user: live.user,
    expiresAt: new Date(claims.exp * 1000).toISOString()
  });
});

router.post('/refresh', (req, res) => {
  const claims = readToken(req);
  if (!claims) {
    return res.status(401).json({ success: false, error: 'unauthenticated', message: 'Sign in required.' });
  }
  const live = verifyLiveSession(claims);
  if (!live.ok) {
    return res.status(401).json({ success: false, error: live.reason, message: 'Session is no longer active.' });
  }
  const userRecord = claims.sub === 'admin'
    ? { ...live.user, tokenVersion: Number(getAdminCredentials()?.tokenVersion || 1) }
    : (findUser({ id: claims.sub }) || live.user);
  const { token, payload, ttl } = signToken(enrichUserWithPlan(userRecord), { remember: true });
  attachSessionCookie(req, res, token, ttl);
  return res.json({
    success: true,
    token,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    user: live.user
  });
});

router.post('/change-password', authRateLimit, (req, res) => {
  const claims = readToken(req);
  if (!claims) {
    return res.status(401).json({ success: false, error: 'unauthenticated', message: 'Sign in to change your password.' });
  }
  const live = verifyLiveSession(claims);
  if (!live.ok) {
    return res.status(401).json({ success: false, error: live.reason, message: 'Session expired. Please sign in again.' });
  }

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'missing_fields', message: 'Enter both your current and new password.' });
  }
  const pwErr = validatePasswordStrength(newPassword);
  if (pwErr) {
    return res.status(400).json({ success: false, error: 'weak_password', message: pwErr });
  }

  if (claims.sub === 'admin') {
    const admin = getAdminCredentials();
    if (!admin || !verifyPassword(currentPassword, admin.password)) {
      return res.status(401).json({ success: false, error: 'invalid_password', message: 'Current password is incorrect.' });
    }
    const nextTv = Number(admin.tokenVersion || 1) + 1;
    writeJsonAtomic(ADMIN_FILE, {
      username: admin.username,
      password: hashPassword(newPassword),
      tokenVersion: nextTv,
      updatedAt: new Date().toISOString()
    });
    const updatedAdmin = { id: 'admin', name: 'Administrator', role: 'master', clientId: 'master', tokenVersion: nextTv };
    const { token, payload, ttl } = signToken(updatedAdmin, { remember: true });
    attachSessionCookie(req, res, token, ttl);
    return res.json({
      success: true,
      message: 'Admin password updated and older sessions signed out.',
      token,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      user: publicUser(updatedAdmin)
    });
  }

  const users = getUsers();
  const idx = users.findIndex(u => u.id === claims.sub);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'user_not_found', message: 'Account record not found.' });
  }
  if (users[idx].passwordHash && !verifyPassword(currentPassword, users[idx].passwordHash)) {
    return res.status(401).json({ success: false, error: 'invalid_password', message: 'Current password is incorrect.' });
  }

  users[idx].passwordHash = hashPassword(newPassword);
  users[idx].tokenVersion = Number(users[idx].tokenVersion || 1) + 1;
  users[idx].updatedAt = new Date().toISOString();
  saveUsers(users);

  const enriched = enrichUserWithPlan(users[idx]);
  const { token, payload, ttl } = signToken(enriched, { remember: true });
  attachSessionCookie(req, res, token, ttl);

  return res.json({
    success: true,
    message: 'Password updated successfully.',
    token,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    user: publicUser(users[idx])
  });
});

router.post('/forgot-password', authRateLimit, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, error: 'invalid_email', message: 'Enter a valid account email.' });
  }

  const user = findUser({ email });
  let localHint = null;
  if (user) {
    const issued = issueResetCode(email, user.id);
    const isLocalDev = process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST;
    console.log(`[auth] Password reset code for ${email}: ${issued.code} (valid 15m)`);
    if (isLocalDev) {
      localHint = issued.code;
    }
  }

  return res.json({
    success: true,
    message: 'If an account exists for that email, a 6-digit reset code has been generated (valid for 15 minutes).',
    ...(localHint ? { devCode: localHint } : {})
  });
});

router.post('/reset-password', authRateLimit, (req, res) => {
  const { email, code, newPassword } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanCode = String(code || '').trim();

  if (!EMAIL_RE.test(cleanEmail) || !/^\d{6}$/.test(cleanCode)) {
    return res.status(400).json({
      success: false,
      error: 'invalid_reset_code',
      message: 'Enter your email and the 6-digit reset code.'
    });
  }
  const pwErr = validatePasswordStrength(newPassword);
  if (pwErr) {
    return res.status(400).json({ success: false, error: 'weak_password', message: pwErr });
  }

  const resets = getResets();
  const expectedHash = hashResetCode(cleanEmail, cleanCode);
  const matchIdx = resets.findIndex(item => item.email === cleanEmail && timingSafeEqual(item.codeHash, expectedHash));
  if (matchIdx === -1) {
    return res.status(400).json({
      success: false,
      error: 'code_invalid_or_expired',
      message: 'That reset code is invalid or expired. Request a new code.'
    });
  }

  const users = getUsers();
  const userIdx = users.findIndex(u => String(u.email || '').toLowerCase() === cleanEmail);
  if (userIdx === -1) {
    return res.status(404).json({ success: false, error: 'user_not_found', message: 'Account not found.' });
  }

  users[userIdx].passwordHash = hashPassword(newPassword);
  users[userIdx].tokenVersion = Number(users[userIdx].tokenVersion || 1) + 1;
  users[userIdx].updatedAt = new Date().toISOString();
  saveUsers(users);

  // Consume code immediately (single-use)
  resets.splice(matchIdx, 1);
  writeJsonAtomic(RESETS_FILE, resets);

  return res.json({
    success: true,
    message: 'Password reset complete! You can now sign in with your new password.'
  });
});

router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'scraper_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  res.json({ success: true });
});

router.post('/logout-all', (req, res) => {
  const claims = readToken(req);
  if (claims?.sub === 'admin') {
    const admin = getAdminCredentials();
    if (admin) {
      writeJsonAtomic(ADMIN_FILE, {
        ...admin,
        tokenVersion: Number(admin.tokenVersion || 1) + 1
      });
    }
  } else if (claims?.sub) {
    revokeUserSessions({ id: claims.sub });
  }
  res.setHeader('Set-Cookie', 'scraper_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  res.json({ success: true, message: 'Signed out from all devices.' });
});

/* ---------------------------------------------------------------------------
 * Hardened admin credentials route (Master-only after initial bootstrap)
 * ------------------------------------------------------------------------- */

router.put('/admin', authRateLimit, (req, res) => {
  const existingAdmin = getAdminCredentials();
  const claims = readToken(req);
  const isMaster = claims && (claims.role === 'master' || claims.role === 'admin') && verifyLiveSession(claims).ok;
  const key = process.env.MASTER_KEY;
  const hasMasterKey = Boolean(key && req.headers['x-master-key'] === key);

  if (existingAdmin && !isMaster && !hasMasterKey) {
    return res.status(403).json({
      success: false,
      error: 'master_required',
      message: 'Only an authenticated master administrator can update admin credentials.'
    });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }
  const pwErr = validatePasswordStrength(password);
  if (pwErr) {
    return res.status(400).json({ success: false, error: 'weak_password', message: pwErr });
  }

  writeJsonAtomic(ADMIN_FILE, {
    username: String(username).trim(),
    password: hashPassword(password),
    tokenVersion: Number(existingAdmin?.tokenVersion || 0) + 1,
    updatedAt: new Date().toISOString()
  });
  return res.json({ success: true, message: 'Admin credentials updated' });
});

module.exports = router;
module.exports.readToken = readToken;
module.exports.verifyToken = verifyToken;
module.exports.verifyLiveSession = verifyLiveSession;
module.exports.hashPassword = hashPassword;
module.exports.verifyPassword = verifyPassword;
module.exports.getUsers = getUsers;
module.exports.findUser = findUser;
module.exports.provisionClientUser = provisionClientUser;
module.exports.createResetCodeForClient = createResetCodeForClient;
module.exports.revokeUserSessions = revokeUserSessions;
