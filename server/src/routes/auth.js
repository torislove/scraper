'use strict';

/**
 * auth.js
 *
 * Identity for both command centers.
 *
 * The product promise is "no API keys", so there is no third-party identity
 * provider in the hot path. Google Sign-In is *supported* but optional: when
 * GOOGLE_CLIENT_ID is set the browser obtains a Google ID token and this route
 * verifies it against Google's public tokeninfo endpoint (no secret, no SDK on
 * the server). Until then, email + password against a local user record works.
 *
 * Tokens are signed with HMAC-SHA256 in the JWT wire format so any standard
 * client can read them, but we deliberately avoid a JWT dependency: one
 * `crypto.createHmac` is enough and it cannot drift from the running Node.
 *
 * Files this module owns:
 *   data/users.json        provisioned users (scrypt password hashes)
 *   data/.session-secret   generated once, chmod 0600, so tokens survive a
 *                          restart when SESSION_SECRET is not set
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { DATA_DIR } = require('../config/paths');

const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SECRET_FILE = path.join(DATA_DIR, '.session-secret');

const TOKEN_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 24 * 7);

/* ---------------------------------------------------------------------------
 * Small helpers
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
  const tmp = `${file}.${process.pid}.tmp`;
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
 * Password hashing (scrypt, no dependency)
 * ------------------------------------------------------------------------- */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const [scheme, salt, digest] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !digest) {
    // Legacy plaintext records (admin.json, employees.json) still work.
    return timingSafeEqual(password, stored);
  }
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return timingSafeEqual(derived, digest);
}

/* ---------------------------------------------------------------------------
 * Tokens
 * ------------------------------------------------------------------------- */

function signToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    role: user.role,
    clientId: user.clientId || (user.role === 'master' ? 'master' : user.id),
    email: user.email || null,
    name: user.name || null,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS
  };
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { token: `${header}.${body}.${signature}`, payload };
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (!timingSafeEqual(signature, expected)) return null;
  try {
    const payload = JSON.parse(fromBase64url(body).toString('utf8'));
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

/** Read a bearer token from any request. Exported for middleware. */
function readToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(header));
  if (match) return verifyToken(match[1].trim());
  const cookie = req.headers?.cookie || '';
  const cookieMatch = /(?:^|;\s*)scraper_session=([^;]+)/.exec(cookie);
  if (cookieMatch) return verifyToken(decodeURIComponent(cookieMatch[1]));
  // EventSource cannot send headers. Only stream URLs may carry the token in
  // the query string, so a token cannot leak through an ordinary link or log.
  const queryToken = req.query?.token;
  const streamPath = String(req.path || req.originalUrl || '');
  if (queryToken && /\/(logs\/stream|scrape\/stream|events|stream)(\/|$)/.test(streamPath)) {
    return verifyToken(String(queryToken));
  }
  return null;
}

/* ---------------------------------------------------------------------------
 * User directory
 * ------------------------------------------------------------------------- */

function getUsers() {
  const users = readJson(USERS_FILE, []);
  return Array.isArray(users) ? users : [];
}

function findUser({ email, username, id }) {
  const users = getUsers();
  if (id) return users.find(u => u.id === id) || null;
  const needle = String(email || username || '').trim().toLowerCase();
  if (!needle) return null;
  return users.find(u => String(u.email || '').toLowerCase() === needle
    || String(u.username || '').toLowerCase() === needle) || null;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email || null,
    name: user.name || null,
    role: user.role,
    clientId: user.clientId || (user.role === 'master' ? 'master' : user.id)
  };
}

function getAdminCredentials() {
  const file = readJson(ADMIN_FILE, null);
  if (file && file.username && file.password) return file;
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    return { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD };
  }
  return null;
}

function getEmployees() {
  const rows = readJson(EMPLOYEES_FILE, []);
  return Array.isArray(rows) ? rows : [];
}

/**
 * Resolve any accepted credential pair to a session user.
 * Order matters: provisioned users first, then the operator admin, then staff.
 */
function resolvePasswordLogin(identifier, password) {
  const user = findUser({ email: identifier, username: identifier });
  if (user && user.passwordHash && verifyPassword(password, user.passwordHash)) {
    return publicUser(user);
  }

  const admin = getAdminCredentials();
  if (admin && identifier === admin.username && verifyPassword(password, admin.password)) {
    return { id: 'admin', email: null, name: 'Administrator', role: 'master', clientId: 'master' };
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
      clientId: employee.clientId || employee.id || `emp_${employee.username}`
    };
  }

  return null;
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
  if (provisioned) return publicUser(provisioned);

  // A provisioned record may exist under an older email; match on the Google sub.
  const bySub = getUsers().find(u => u.googleSub && u.googleSub === claims.sub);
  if (bySub) return publicUser(bySub);

  const allowDomains = String(process.env.GOOGLE_ALLOWED_DOMAINS || '')
    .split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
  const domain = email.split('@')[1] || '';

  if (process.env.GOOGLE_AUTO_PROVISION === '1' && allowDomains.includes(domain)) {
    const role = allowDomains.length && process.env.GOOGLE_MASTER_DOMAIN
      && domain === process.env.GOOGLE_MASTER_DOMAIN.toLowerCase() ? 'master' : 'client';
    const created = {
      id: `usr_${crypto.randomBytes(6).toString('hex')}`,
      email,
      name: claims.name || email.split('@')[0],
      role,
      clientId: role === 'master' ? 'master' : `usr_${crypto.randomBytes(6).toString('hex')}`,
      googleSub: claims.sub,
      createdAt: new Date().toISOString()
    };
    const users = getUsers();
    users.push(created);
    writeJsonAtomic(USERS_FILE, users);
    return publicUser(created);
  }

  const error = new Error('not_provisioned');
  error.status = 403;
  throw error;
}

/* ---------------------------------------------------------------------------
 * Routes
 * ------------------------------------------------------------------------- */

router.get('/config', (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  res.json({
    authRequired: process.env.AUTH_REQUIRED === '1',
    localLogin: true,
    googleEnabled: Boolean(googleClientId),
    googleClientId,
    provider: googleClientId ? 'google+password' : 'password',
    masterHost: process.env.MASTER_HOST || null
  });
});

router.post('/login', (req, res) => {
  const { email, username, password } = req.body || {};
  const identifier = String(email || username || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      error: 'missing_credentials',
      message: 'Enter your email and password.'
    });
  }

  const user = resolvePasswordLogin(identifier, password);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'invalid_credentials',
      message: 'That email and password do not match an account.'
    });
  }

  const { token, payload } = signToken(user);
  res.json({
    success: true,
    token,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    user
  });
});

router.post('/google', async (req, res) => {
  const credential = req.body?.credential;
  if (!credential) {
    return res.status(400).json({ success: false, error: 'missing_credential', message: 'Google did not return a credential.' });
  }

  try {
    const claims = await verifyGoogleCredential(credential);
    const user = userFromGoogleClaims(claims);
    const { token, payload } = signToken(user);
    return res.json({
      success: true,
      token,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      user
    });
  } catch (error) {
    const status = error.status || 500;
    const messages = {
      google_not_configured: 'Google Sign-In is not configured on this server yet.',
      google_token_invalid: 'Google could not verify that sign-in. Please try again.',
      google_audience_mismatch: 'This Google client is not allowed for this workspace.',
      google_email_unverified: 'Your Google email is not verified.',
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
  res.json({
    success: true,
    user: {
      id: claims.sub,
      email: claims.email,
      name: claims.name,
      role: claims.role,
      clientId: claims.clientId
    },
    expiresAt: new Date(claims.exp * 1000).toISOString()
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('scraper_session', { path: '/' });
  res.json({ success: true });
});

/* ---------------------------------------------------------------------------
 * Operator helpers (unchanged contract)
 * ------------------------------------------------------------------------- */

router.put('/admin', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  writeJsonAtomic(ADMIN_FILE, { username, password: hashPassword(password) });
  res.json({ success: true, message: 'Admin credentials updated' });
});

module.exports = router;
module.exports.readToken = readToken;
module.exports.verifyToken = verifyToken;
module.exports.hashPassword = hashPassword;
module.exports.verifyPassword = verifyPassword;
module.exports.getUsers = getUsers;
module.exports.findUser = findUser;
