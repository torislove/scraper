/**
 * credits.js
 *
 * The credit ledger. 1 credit = 1 lead saved to the local database.
 *
 * Rules
 *   - A fresh machine receives FREE_CREDITS (default 1,000) exactly once.
 *   - Credits never expire.
 *   - A lead is charged once, when it first enters the database. Re-running a
 *     search, opening an old folder, or editing a lead costs nothing.
 *   - Paid plans contribute a monthly allowance; the monthly allowance is
 *     consumed before the free grant so a customer never wastes what resets.
 *
 * Authority
 *   1. Signed licence token  (cannot be inflated locally)  -> plan allowance
 *   2. Windows registry anchor (HKCU\Software\Scraper)     -> stops re-grants
 *   3. Licence server record (optional, per device id)     -> survives reinstalls
 *   4. This JSON ledger                                    -> fast local counter
 *
 * Disabled outside the packaged desktop build so local development and
 * self-hosted deployments behave exactly as before.
 */

const fs = require('fs');
const path = require('path');

const { DATA_DIR } = require('../config/paths');
const anchor = require('./creditAnchor');

const ENFORCED = process.env.SCRAPER_CREDITS_ENFORCE === '1';
const FREE_CREDITS = Math.max(0, Number(process.env.SCRAPER_FREE_CREDITS || 1000));
const DEVICE_ID = String(process.env.SCRAPER_DEVICE_ID || '').trim();
const LEDGER_FILE = process.env.SCRAPER_CREDITS_FILE || path.join(DATA_DIR, 'credits.json');

const ANCHOR_EVERY = 25;     // registry writes are cheap, but not free
const WRITE_DEBOUNCE = 400;  // ms — scraping must never wait on disk

const DEFAULTS = {
  deviceId: '',
  granted: 0,
  used: 0,
  grantSource: 'none',
  grantedAt: 0,
  anchorAt: 0,
  serverClaimedAt: 0,
  period: { endsAt: 0, allowance: 0, used: 0 }
};

let state = null;
let writeTimer = null;
let anchorMark = 0;
let listeners = [];

/* ------------------------------------------------------------------ */
/* persistence                                                         */
/* ------------------------------------------------------------------ */

function readLedger() {
  try {
    const parsed = JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
    return {
      ...DEFAULTS,
      ...parsed,
      period: { ...DEFAULTS.period, ...(parsed.period || {}) }
    };
  } catch (e) {
    return null;
  }
}

function writeLedger() {
  if (!state) return;

  try {
    fs.mkdirSync(path.dirname(LEDGER_FILE), { recursive: true });
    const tmp = `${LEDGER_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmp, LEDGER_FILE);
  } catch (e) {
    /* the in-memory ledger stays correct; the next write retries */
  }
}

function flush() {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  writeLedger();
}

function scheduleWrite() {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    writeLedger();
  }, WRITE_DEBOUNCE);
}

function maybeAnchor(force = false) {
  if (!state || !anchor.enabled()) return;

  const spent = state.used + state.period.used;
  if (!force && spent - anchorMark < ANCHOR_EVERY) return;

  const ok = anchor.write({
    granted: state.granted,
    used: state.used,
    grantedAt: state.grantedAt,
    deviceId: state.deviceId
  });

  if (ok) {
    anchorMark = spent;
    state.anchorAt = Date.now();
    scheduleWrite();
  }
}

/* ------------------------------------------------------------------ */
/* bootstrap                                                           */
/* ------------------------------------------------------------------ */

function freshGrant(source, grantedAt) {
  return {
    ...DEFAULTS,
    deviceId: DEVICE_ID,
    granted: FREE_CREDITS,
    used: 0,
    grantSource: source,
    grantedAt: grantedAt || Date.now()
  };
}

function bootstrap() {
  const stored = ENFORCED ? readLedger() : null;

  // A ledger copied from another computer is not a free grant.
  if (stored && (!stored.deviceId || stored.deviceId === DEVICE_ID)) {
    state = { ...stored, deviceId: DEVICE_ID };
    anchorMark = state.used + state.period.used;
    return;
  }

  const mark = anchor.read();

  // The registry remembers the original grant even if the file was deleted.
  if (mark && mark.granted > 0 && (!mark.deviceId || mark.deviceId === DEVICE_ID)) {
    state = {
      ...freshGrant('anchor', mark.grantedAt),
      granted: mark.granted,
      used: Math.min(mark.used, mark.granted),
      deviceId: DEVICE_ID || mark.deviceId
    };
    anchorMark = state.used;
    writeLedger();
    return;
  }

  state = freshGrant('local');
  writeLedger();
  maybeAnchor(true);

  // Ask the licence server whether this device already claimed its grant
  // (e.g. Windows was reinstalled and the registry is empty).
  claimOnServer().catch(() => {});
}

async function claimOnServer() {
  const base = String(process.env.SCRAPER_LICENSE_API || '').replace(/\/+$/, '');
  if (!base || !DEVICE_ID || !state || state.grantSource === 'server') return;

  try {
    const res = await fetch(`${base}/credits/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: DEVICE_ID, appVersion: process.env.APP_VERSION || '' }),
      signal: AbortSignal.timeout(9000)
    });

    if (!res.ok) return;
    const json = await res.json();
    if (!json || typeof json.granted !== 'number') return;

    // The server is authoritative: it may know about credits spent before a
    // reinstall that this machine has forgotten.
    state = {
      ...state,
      granted: json.granted,
      used: Math.max(0, Math.min(Number(json.used) || 0, json.granted)),
      grantSource: 'server',
      grantedAt: Number(json.grantedAt) || state.grantedAt,
      serverClaimedAt: Date.now()
    };
    anchorMark = state.used;
    writeLedger();
    maybeAnchor(true);
    emit();
  } catch (e) {
    /* offline is fine — the local ledger keeps working */
  }
}

/* ------------------------------------------------------------------ */
/* state helpers                                                       */
/* ------------------------------------------------------------------ */

function planReset(period) {
  if (!period || !period.endsAt) return { endsAt: 0, allowance: 0, used: 0 };
  if (Date.now() > period.endsAt) {
    return { endsAt: period.endsAt, allowance: period.allowance, used: 0 };
  }
  return period;
}

function freeLeft() {
  return Math.max(0, state.granted - state.used);
}

function planLeft() {
  const period = state.period || DEFAULTS.period;
  if (!period.allowance) return 0;
  return Math.max(0, period.allowance - period.used);
}

function available() {
  return freeLeft() + planLeft();
}

function emit() {
  const snapshot = status();
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch (e) {
      /* a bad listener must not break a scrape */
    }
  }
}

function status() {
  if (!state) bootstrap();

  const period = planReset(state.period || DEFAULTS.period);
  const free = freeLeft();
  const plan = Math.max(0, period.allowance - period.used);
  const left = free + plan;

  return {
    enforced: ENFORCED,
    deviceId: state.deviceId,
    granted: state.granted,
    used: state.used,
    freeLeft: free,
    plan: {
      allowance: period.allowance,
      used: period.used,
      left: plan,
      endsAt: period.endsAt || null
    },
    left,
    exhausted: ENFORCED && left <= 0,
    grantSource: state.grantSource,
    grantedAt: state.grantedAt || null
  };
}

/* ------------------------------------------------------------------ */
/* public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Spend credits. Plan allowance first (it resets monthly), then the free grant.
 * Returns how many were actually charged, so callers can trim their batch.
 */
function spend(count = 1) {
  if (!ENFORCED) return { charged: Math.max(0, count), left: Infinity, enforced: false };
  if (!state) bootstrap();

  let wanted = Math.max(0, Math.floor(count));
  if (!wanted) return { charged: 0, left: available(), enforced: true };

  const period = planReset(state.period || DEFAULTS.period);
  state.period = period;
  state.period.used = state.period.used || 0;

  let charged = 0;

  const fromPlan = Math.min(wanted, planLeft());
  if (fromPlan > 0) {
    state.period.used += fromPlan;
    charged += fromPlan;
    wanted -= fromPlan;
  }

  const fromFree = Math.min(wanted, freeLeft());
  if (fromFree > 0) {
    state.used += fromFree;
    charged += fromFree;
  }

  if (charged > 0) {
    scheduleWrite();
    maybeAnchor();
  }

  return { charged, left: available(), enforced: true };
}

/** True when a scrape is allowed to start. */
function canStart() {
  if (!ENFORCED) return true;
  return available() > 0;
}

/**
 * Apply the signed licence payload. The allowance comes from the token, never
 * from a local setting, so it cannot be inflated by editing files.
 */
function applyPlan({ plan, allowance, endsAt } = {}) {
  if (!ENFORCED) return status();
  if (!state) bootstrap();

  const nextAllowance = Math.max(0, Number(allowance) || 0);
  const nextEndsAt = Number(endsAt) || 0;
  const current = state.period || DEFAULTS.period;

  if (!nextAllowance) {
    // No licence: keep the free grant only.
    if (current.allowance) {
      state.period = { ...DEFAULTS.period };
      scheduleWrite();
      emit();
    }
    return status();
  }

  if (current.endsAt !== nextEndsAt || current.allowance !== nextAllowance) {
    const isNewPeriod = !current.endsAt || nextEndsAt !== current.endsAt;
    state.period = {
      endsAt: nextEndsAt,
      allowance: nextAllowance,
      used: isNewPeriod ? 0 : Math.min(current.used || 0, nextAllowance)
    };
    scheduleWrite();
    emit();
  }

  return status();
}

function onChange(listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(item => item !== listener);
  };
}

function init() {
  bootstrap();
  return status();
}

process.on('exit', flush);
process.on('SIGINT', () => {
  flush();
  process.exit(0);
});
process.on('SIGTERM', () => {
  flush();
  process.exit(0);
});

module.exports = {
  ENFORCED,
  FREE_CREDITS,
  LEDGER_FILE,
  init,
  status,
  spend,
  canStart,
  applyPlan,
  onChange,
  flush
};
