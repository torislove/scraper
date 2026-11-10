/**
 * requestGuard.js
 *
 * Ban-avoidance without evasion.
 *
 * The scraper is not trying to defeat a bot check. It is trying to behave like
 * a polite client so the upstream services do not have a reason to throttle it:
 *
 *   • PACING      a minimum gap between two starts of the same engine, with a
 *                 small random spread so five browser slots never fire in lockstep.
 *   • COOLDOWN    when a service answers 429/403 or shows a bot/CAPTCHA page, the
 *                 engine rests instead of hammering it. Repeated blocks lengthen
 *                 the rest exponentially, capped.
 *   • HONESTY     a cooling engine is reported on /engines/status and skipped for
 *                 the current zone; every other engine keeps working.
 *
 * The guard never changes what is requested, never rotates identity, never
 * solves a challenge. It only decides *when* an already-planned job may start.
 */

const engineHealth = require('../services/engineHealth');

const MAX_DEFER_MS = 45_000;

/**
 * Per-engine behaviour. `gapMs` is the minimum start-to-start spacing and
 * `jitterMs` the extra random spread. `cooldownMs` doubles on every consecutive
 * block up to `maxCooldownMs`.
 */
const POLICIES = {
  'google-local-finder': { gapMs: 550, jitterMs: 350, cooldownMs: 90_000, maxCooldownMs: 15 * 60_000 },
  maps: { gapMs: 350, jitterMs: 250, cooldownMs: 60_000, maxCooldownMs: 10 * 60_000 },
  'google-serp': { gapMs: 900, jitterMs: 500, cooldownMs: 120_000, maxCooldownMs: 15 * 60_000 },
  justdial: { gapMs: 1_100, jitterMs: 600, cooldownMs: 150_000, maxCooldownMs: 20 * 60_000 },
  indiamart: { gapMs: 1_500, jitterMs: 800, cooldownMs: 180_000, maxCooldownMs: 30 * 60_000 },
  weddingbazaar: { gapMs: 900, jitterMs: 500, cooldownMs: 120_000, maxCooldownMs: 20 * 60_000 },
  weddingwire: { gapMs: 900, jitterMs: 500, cooldownMs: 120_000, maxCooldownMs: 20 * 60_000 },
  mandap: { gapMs: 900, jitterMs: 500, cooldownMs: 120_000, maxCooldownMs: 20 * 60_000 },
  openstreetmap: { gapMs: 1_200, jitterMs: 600, cooldownMs: 120_000, maxCooldownMs: 20 * 60_000 },
  'web-contact': { gapMs: 350, jitterMs: 250, cooldownMs: 90_000, maxCooldownMs: 15 * 60_000 },
  social: { gapMs: 650, jitterMs: 350, cooldownMs: 120_000, maxCooldownMs: 20 * 60_000 },
  brave: { gapMs: 800, jitterMs: 400, cooldownMs: 120_000, maxCooldownMs: 20 * 60_000 },
  geocoder: { gapMs: 1_100, jitterMs: 500, cooldownMs: 120_000, maxCooldownMs: 20 * 60_000 },
};

const DEFAULT_POLICY = { gapMs: 400, jitterMs: 200, cooldownMs: 90_000, maxCooldownMs: 15 * 60_000 };

const BLOCK_PATTERNS = [
  /captcha/i,
  /\/sorry\b/i,
  /unusual traffic/i,
  /verify (?:that )?you(?:'re| are) (?:a )?human/i,
  /are you a robot/i,
  /automated queries/i,
  /bot (?:detection|check|page)/i,
  /access denied/i,
  /temporarily blocked/i,
  /too many requests/i,
  /rate[-\s]?limit/i,
  /http\s*(?:403|429)\b/i,
  /status\s*(?:403|429)\b/i,
];

const TRANSIENT_PATTERNS = [
  /timed? ?out/i,
  /econnreset/i,
  /econnrefused/i,
  /enotfound/i,
  /net::err/i,
  /socket hang up/i,
  /network error/i,
  /navigation failed/i,
];

const state = new Map();
const listeners = new Set();

function policyFor(engineKey) {
  return POLICIES[engineKey] || DEFAULT_POLICY;
}

function stateFor(engineKey) {
  let entry = state.get(engineKey);
  if (!entry) {
    entry = {
      engineKey,
      nextStartAt: 0,
      cooldownUntil: 0,
      strikes: 0,
      blocks: 0,
      defers: 0,
      skips: 0,
      lastBlockAt: 0,
      lastBlockReason: '',
      lastStartAt: 0,
      lastResultAt: 0,
    };
    state.set(engineKey, entry);
  }
  return entry;
}

function onGuardEvent(fn) {
  if (typeof fn === 'function') listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(event) {
  for (const fn of listeners) {
    try {
      fn(event);
    } catch (e) {
      /* a listener must never break a job */
    }
  }
}

function textOf(payload = {}) {
  const parts = [
    payload.error,
    payload.note,
    payload.message,
    payload.reason,
    payload.blockReason,
  ];
  return parts.filter(Boolean).map(String).join(' | ');
}

function isBlockedPayload(payload = {}) {
  if (payload.blocked === true || payload.captcha === true || payload.rateLimited === true) return true;
  const text = textOf(payload);
  if (!text) return false;
  return BLOCK_PATTERNS.some((pattern) => pattern.test(text));
}

function isTransientPayload(payload = {}) {
  const text = textOf(payload);
  if (!text) return false;
  return TRANSIENT_PATTERNS.some((pattern) => pattern.test(text));
}

function countOf(result) {
  if (Array.isArray(result)) return result.length;
  if (result && typeof result === 'object') {
    const direct = Number(result.totalScraped ?? result.totalFound ?? result.count);
    if (Number.isFinite(direct)) return direct;
    const inserted = Number(result.newInserted ?? result.inserted ?? result.updated);
    if (Number.isFinite(inserted)) return inserted;
  }
  return null;
}

function taskToEngine(taskName) {
  return engineHealth.TASK_TO_ENGINE[taskName] || null;
}

/**
 * Ask permission to start one job. Returns:
 *   { allow:true }
 *   { allow:false, waitMs }        → queue should delay and retry
 *   { allow:false, skip:true }     → cooldown is too long for this run
 */
function beforeJob(taskName, now = Date.now()) {
  const engineKey = taskToEngine(taskName);
  if (!engineKey) return { allow: true, engineKey: null };

  const entry = stateFor(engineKey);
  const policy = policyFor(engineKey);

  if (entry.cooldownUntil > now) {
    const remaining = entry.cooldownUntil - now;
    entry.defers += 1;
    if (remaining > MAX_DEFER_MS) {
      entry.skips += 1;
      emit({
        type: 'skip',
        engineKey,
        remainingMs: remaining,
        reason: entry.lastBlockReason || 'cooling_down',
      });
      return {
        allow: false,
        skip: true,
        waitMs: 0,
        engineKey,
        reason: 'cooling_down',
        remainingMs: remaining,
      };
    }
    return {
      allow: false,
      waitMs: remaining,
      engineKey,
      reason: 'cooling_down',
      remainingMs: remaining,
    };
  }

  if (entry.nextStartAt > now) {
    return {
      allow: false,
      waitMs: entry.nextStartAt - now,
      engineKey,
      reason: 'pacing',
    };
  }

  const spread = policy.gapMs + Math.floor(Math.random() * (policy.jitterMs + 1));
  entry.nextStartAt = now + spread;
  entry.lastStartAt = now;
  return { allow: true, engineKey, gapMs: spread };
}

/**
 * Record the outcome of a finished job. Called from safeExecute, so every
 * engine is covered whether it throws, returns an empty array or returns a
 * structured note.
 */
function observe(engineKey, payload = {}) {
  if (!engineKey) return { action: 'ignored' };
  const entry = stateFor(engineKey);
  const policy = policyFor(engineKey);
  const now = Date.now();
  entry.lastResultAt = now;

  const ok = payload.ok !== false;
  const blocked = isBlockedPayload(payload);
  const transient = !blocked && isTransientPayload(payload);
  const count = countOf(payload.result);

  if (blocked) {
    entry.blocks += 1;
    entry.strikes += 1;
    entry.lastBlockAt = now;
    entry.lastBlockReason = String(payload.error || payload.note || payload.reason || 'blocked').slice(0, 240);
    const backoff = Math.min(
      policy.cooldownMs * Math.pow(2, Math.max(0, entry.strikes - 1)),
      policy.maxCooldownMs
    );
    entry.cooldownUntil = now + backoff;
    emit({
      type: 'cooldown',
      engineKey,
      cooldownMs: backoff,
      strikes: entry.strikes,
      reason: entry.lastBlockReason,
    });
    return { action: 'cooldown', cooldownMs: backoff, strikes: entry.strikes };
  }

  if (transient) {
    // Network wobble is not a ban signal. A short extra gap is enough.
    entry.nextStartAt = Math.max(entry.nextStartAt, now + policy.gapMs * 2);
    return { action: 'slow_down' };
  }

  if (ok && (count === null || count > 0)) {
    entry.strikes = 0;
    entry.cooldownUntil = 0;
    entry.lastBlockReason = '';
    return { action: 'reset' };
  }

  // A clean run that returned nothing may simply have no inventory in that
  // zone. Do not punish it; keep the pacing only.
  return { action: 'none' };
}

function isAvailable(engineKey, now = Date.now()) {
  if (!engineKey) return true;
  const entry = state.get(engineKey);
  if (!entry) return true;
  return entry.cooldownUntil <= now;
}

function reset(engineKey) {
  if (engineKey) state.delete(engineKey);
  else state.clear();
}

function snapshot(now = Date.now()) {
  const engines = {};
  for (const [engineKey, entry] of state) {
    const policy = policyFor(engineKey);
    engines[engineKey] = {
      cooling: entry.cooldownUntil > now,
      cooldownRemainingMs: Math.max(0, entry.cooldownUntil - now),
      cooldownMs: entry.cooldownUntil > now ? entry.cooldownUntil - now : 0,
      maxCooldownMs: policy.maxCooldownMs,
      strikes: entry.strikes,
      blocks: entry.blocks,
      defers: entry.defers,
      skips: entry.skips,
      lastBlockAt: entry.lastBlockAt || null,
      lastBlockReason: entry.lastBlockReason || '',
      lastStartAt: entry.lastStartAt || null,
      lastResultAt: entry.lastResultAt || null,
    };
  }
  return {
    checkedAt: now,
    deferLimitMs: MAX_DEFER_MS,
    cooling: Object.values(engines).filter((e) => e.cooling).length,
    engines,
  };
}

module.exports = {
  POLICIES,
  MAX_DEFER_MS,
  beforeJob,
  observe,
  isAvailable,
  reset,
  snapshot,
  taskToEngine,
  onGuardEvent,
  // exported for tests
  _internals: { isBlockedPayload, isTransientPayload, countOf, stateFor, state },
};
