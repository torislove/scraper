/**
 * Subscription / licence manager for the desktop edition.
 *
 * Two supported flows:
 *   1. Online  - SCRAPER_LICENSE_API points at your licence server.
 *   2. Offline - the customer imports a signed .scraperlic file or pastes a
 *                token that you minted with the same private key.
 *
 * A 14-day trial is always available on a fresh install so the app is usable
 * before any billing integration exists.
 */

const { EventEmitter } = require('events');
const fs = require('fs');
const { dialog, shell, app } = require('electron');
const log = require('electron-log');

const config = require('../config');
const store = require('./store');
const { getDeviceId, getDeviceName } = require('./machine');
const { verifyToken } = require('./token');

const emitter = new EventEmitter();
const DAY = 86400000;

let state = {
  state: 'unlicensed',
  plan: null,
  daysLeft: null,
  expiresAt: null,
  canUse: false,
  deviceId: '',
  email: '',
  reason: 'not_initialised',
  apiEnabled: Boolean(config.API_URL),
  maxLeads: null,
  trialDays: config.TRIAL_DAYS
};

function planLimit(planId) {
  const plan = config.PLANS.find(p => p.id === String(planId || '').toLowerCase());
  return plan ? plan.maxLeads : null;
}

function compute(data) {
  const now = Date.now();
  const deviceId = getDeviceId();
  const trialStart = data.trialStartedAt || now;
  const trialEnds = trialStart + config.TRIAL_DAYS * DAY;
  const trialDaysLeft = Math.max(0, Math.ceil((trialEnds - now) / DAY));

  const next = {
    state: 'expired',
    plan: null,
    daysLeft: trialDaysLeft,
    expiresAt: null,
    canUse: false,
    deviceId,
    email: data.email || '',
    reason: '',
    apiEnabled: Boolean(config.API_URL),
    maxLeads: null,
    trialDays: config.TRIAL_DAYS,
    trialEndsAt: new Date(trialEnds).toISOString()
  };

  if (data.token) {
    const result = verifyToken(data.token);
    if (result.valid) {
      const payload = result.payload || {};
      const boundTo = String(payload.deviceId || '').trim();

      if (boundTo && boundTo !== deviceId) {
        next.reason = 'device_mismatch';
        next.plan = payload.plan || null;
      } else {
        const expiresAt = Number(payload.expiresAt) || 0;
        next.state = result.inGrace ? 'grace' : 'active';
        next.plan = payload.plan || 'licensed';
        next.expiresAt = expiresAt ? new Date(expiresAt).toISOString() : null;
        next.daysLeft = expiresAt ? Math.ceil((expiresAt - now) / DAY) : null;
        next.canUse = true;
        next.maxLeads = payload.maxLeads || planLimit(payload.plan);
        next.reason = result.inGrace ? 'grace_period' : 'active';
        next.email = data.email || payload.email || '';
        return next;
      }
    } else {
      next.reason = result.reason;
      next.plan = result.payload?.plan || null;
    }
  }

  if (trialDaysLeft > 0) {
    next.state = 'trial';
    next.plan = 'trial';
    next.canUse = true;
    next.maxLeads = planLimit('starter');
    next.reason = 'trial';
    return next;
  }

  next.reason = next.reason || 'trial_expired';
  return next;
}

function persist(data) {
  try {
    return store.write(data);
  } catch (e) {
    log.error('[license] could not persist:', e.message);
    return data;
  }
}

function publish(next) {
  state = next;
  emitter.emit('change', state);
  return state;
}

function status() {
  return { ...state };
}

async function init() {
  let data = store.readDecrypted();

  if (!data.trialStartedAt) {
    data = persist({ ...data, trialStartedAt: Date.now(), deviceId: getDeviceId() });
  }
  if (!data.deviceId) {
    data = persist({ ...data, deviceId: getDeviceId() });
  }

  publish(compute(data));

  // Silent refresh in the background; never blocks startup.
  if (state.apiEnabled && data.token) {
    refresh().catch(() => {});
  }

  log.info('[license] state:', state.state, 'plan:', state.plan, 'daysLeft:', state.daysLeft);
  return state;
}

async function api(pathname, body) {
  const url = `${String(config.API_URL).replace(/\/+$/, '')}${pathname}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(json.message || json.error || `HTTP ${res.status}`);
    error.code = json.error || `http_${res.status}`;
    throw error;
  }
  return json;
}

async function refresh({ force = false } = {}) {
  const data = store.readDecrypted();
  if (!data.token || !config.API_URL) return state;

  const sixHours = 6 * 60 * 60 * 1000;
  if (!force && data.lastCheck && Date.now() - data.lastCheck < sixHours && state.canUse) {
    return state;
  }

  try {
    const json = await api('/validate', {
      token: data.token,
      deviceId: getDeviceId(),
      appVersion: app.getVersion()
    });

    if (json && json.token) {
      const merged = persist({ ...data, token: json.token, lastCheck: Date.now() });
      publish(compute(merged));
    } else {
      persist({ ...data, lastCheck: Date.now() });
    }
  } catch (err) {
    // Network failures must never lock a paying customer out: the cached token
    // stays valid until its own expiry + grace window.
    log.warn('[license] refresh failed:', err.message);
    if (err.code === 'revoked' || err.code === 'expired' || err.code === 'not_found') {
      persist({ ...data, token: '' });
      publish(compute({ ...data, token: '' }));
    }
  }

  return state;
}

function applyToken(rawToken, meta = {}) {
  const token = String(rawToken || '').trim();
  if (!token) return { ok: false, error: 'Enter a licence key.' };

  const result = verifyToken(token);
  if (!result.valid) {
    const messages = {
      malformed: 'That key is not in the correct format.',
      bad_signature: 'This key is not valid for Scraper.',
      expired: 'This key has expired. Please renew your subscription.'
    };
    return { ok: false, error: messages[result.reason] || 'This key could not be verified.' };
  }

  const boundTo = String(result.payload.deviceId || '').trim();
  if (boundTo && boundTo !== getDeviceId()) {
    return { ok: false, error: 'This licence is bound to a different computer. Contact support to move it.' };
  }

  const data = store.readDecrypted();
  const merged = persist({
    ...data,
    token,
    email: meta.email || result.payload.email || data.email,
    plan: result.payload.plan || data.plan,
    activatedAt: Date.now(),
    lastCheck: Date.now()
  });

  const next = publish(compute(merged));
  return { ok: next.canUse, status: next, error: next.canUse ? undefined : 'Licence could not be activated.' };
}

async function activate({ key, email } = {}) {
  const licenceKey = String(key || '').trim();
  if (!licenceKey) return { ok: false, error: 'Enter your licence key.' };

  // Offline builds: the pasted value may already be a signed token.
  if (licenceKey.split('.').length === 2 && licenceKey.length > 60) {
    return applyToken(licenceKey, { email });
  }

  if (!config.API_URL) {
    return {
      ok: false,
      error: 'Online activation is not configured in this build. Import your .scraperlic file instead.'
    };
  }

  try {
    const json = await api('/activate', {
      licenseKey: licenceKey,
      email: email || '',
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
      appVersion: app.getVersion(),
      platform: process.platform
    });

    if (!json.token) return { ok: false, error: 'The server did not return a licence.' };
    return applyToken(json.token, { email });
  } catch (err) {
    const messages = {
      invalid_key: 'That licence key was not found. Check your purchase email.',
      seat_limit: 'This key is already active on the maximum number of computers.',
      expired: 'This subscription has expired. Renew to continue.',
      revoked: 'This licence has been revoked.'
    };
    return { ok: false, error: messages[err.code] || `Activation failed: ${err.message}` };
  }
}

async function importFile(parentWindow) {
  const result = await dialog.showOpenDialog(parentWindow || undefined, {
    title: 'Import licence file',
    properties: ['openFile'],
    filters: [
      { name: 'Scraper licence', extensions: ['scraperlic', 'json', 'txt'] },
      { name: 'All files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePaths.length) return { ok: false, canceled: true };

  try {
    const raw = fs.readFileSync(result.filePaths[0], 'utf8').trim();
    let token = raw;
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      token = parsed.token || parsed.license || parsed.key || '';
    }
    return applyToken(token);
  } catch (e) {
    return { ok: false, error: 'That file could not be read as a licence.' };
  }
}

function deactivate() {
  const data = store.readDecrypted();
  persist({
    ...data,
    token: '',
    plan: '',
    activatedAt: 0
  });
  return publish(compute({ ...data, token: '' }));
}

function openPortal() {
  const url = config.CHECKOUT_URL;
  if (url) shell.openExternal(url);
}

function startMonitor(onExpired) {
  setInterval(async () => {
    const before = state.canUse;
    await refresh({ force: true }).catch(() => {});
    if (before && !state.canUse && typeof onExpired === 'function') onExpired(state);
  }, 30 * 60 * 1000);
}

module.exports = {
  init,
  status,
  refresh,
  activate,
  applyToken,
  importFile,
  deactivate,
  openPortal,
  startMonitor,
  onChange: handler => {
    emitter.on('change', handler);
    return () => emitter.off('change', handler);
  }
};
