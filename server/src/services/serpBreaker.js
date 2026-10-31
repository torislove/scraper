/**
 * serpBreaker.js
 *
 * Google's HTML Local Finder throws a /sorry CAPTCHA after a handful of quick
 * requests. When that starts happening, every zone pays the full browser page
 * load before pivoting to Maps. This breaker remembers the block for a short
 * window so later zones go straight to the Maps engine instead of paying that
 * tax again and again.
 *
 * It only short-circuits the blocked surface. No engine is disabled globally.
 */

const BLOCK_TTL_MS = 8 * 60 * 1000;
const STRIKES_TO_TRIP = 2;
const STRIKE_WINDOW_MS = 3 * 60 * 1000;

const state = {
  strikes: 0,
  lastStrikeAt: 0,
  trippedAt: 0,
  trippedUntil: 0
};

function reset() {
  state.strikes = 0;
  state.lastStrikeAt = 0;
  state.trippedAt = 0;
  state.trippedUntil = 0;
}

function isBlocked(now = Date.now()) {
  if (!state.trippedUntil) return false;
  if (now >= state.trippedUntil) {
    reset();
    return false;
  }
  return true;
}

function recordCaptcha(now = Date.now()) {
  if (state.lastStrikeAt && now - state.lastStrikeAt > STRIKE_WINDOW_MS) {
    state.strikes = 0;
  }
  state.strikes += 1;
  state.lastStrikeAt = now;
  if (state.strikes >= STRIKES_TO_TRIP) {
    state.trippedAt = now;
    state.trippedUntil = now + BLOCK_TTL_MS;
  }
  return isBlocked(now);
}

function recordSuccess() {
  state.strikes = 0;
  state.lastStrikeAt = 0;
}

function snapshot(now = Date.now()) {
  return {
    blocked: isBlocked(now),
    strikes: state.strikes,
    trippedAt: state.trippedAt,
    retryAt: state.trippedUntil
  };
}

module.exports = {
  isBlocked,
  recordCaptcha,
  recordSuccess,
  snapshot,
  reset
};
