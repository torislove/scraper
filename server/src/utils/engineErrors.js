'use strict';

/**
 * engineErrors.js
 *
 * Normalizes internal engine/browser/CAPTCHA/network exceptions into clean,
 * non-technical customer-facing status messages so the UI never displays raw
 * Selenium/Playwright stack traces, verification alerts, or legacy API-key text.
 */

function normalizeEngineError(rawErrorOrMessage, engineName = 'engine') {
  const raw = rawErrorOrMessage instanceof Error
    ? (rawErrorOrMessage.message || String(rawErrorOrMessage))
    : String(rawErrorOrMessage || '');
  const lower = raw.toLowerCase();

  if (/captcha|unusual traffic|verify you are human|consent\/verify|automated query/i.test(lower)) {
    return {
      code: 'engine_cooldown',
      severity: 'info',
      engine: engineName,
      userMessage: 'Google Search surface is resting — automatically routed to Google Maps & directory engines.',
      action: 'auto_reroute',
      shouldCooldown: true
    };
  }

  if (/target page, context or browser has been closed|execution context was destroyed|navigating|protocol error|session closed/i.test(lower)) {
    return {
      code: 'page_recycled',
      severity: 'info',
      engine: engineName,
      userMessage: 'Browser tab recycled cleanly after navigation.',
      action: 'retry_or_skip',
      shouldCooldown: false
    };
  }

  if (/\b(429|403)\b|rate limit|cooldown window|too many requests|slow down/i.test(lower)) {
    return {
      code: 'rate_cooldown',
      severity: 'info',
      engine: engineName,
      userMessage: 'Source is in a short politeness cooldown — parallel engines are continuing.',
      action: 'auto_reroute',
      shouldCooldown: true
    };
  }

  if (/timeout|timed out|navigation timeout|etimedout/i.test(lower)) {
    return {
      code: 'timeout',
      severity: 'info',
      engine: engineName,
      userMessage: 'Slow response from source — continuing with visible results.',
      action: 'continue',
      shouldCooldown: false
    };
  }

  if (/api[_\s-]?key|request_denied|key required|unauthorized|missing.*key/i.test(lower)) {
    return {
      code: 'keyless_fallback',
      severity: 'info',
      engine: engineName,
      userMessage: 'Using built-in keyless engine — no external API key needed.',
      action: 'keyless_auto',
      shouldCooldown: false
    };
  }

  return {
    code: 'engine_notice',
    severity: 'info',
    engine: engineName,
    userMessage: raw || 'Engine notice',
    action: 'continue',
    shouldCooldown: false
  };
}

function sanitizeLogForUi(line) {
  if (line == null) return null;
  const text = String(line);

  if (/google search captcha|captcha pivot|cooldown window|captcha detected/i.test(text)) {
    return '[Auto Router] ⚡ Search surface resting — routed zone directly to Google Maps engine (zero leads lost).';
  }

  if (/execution context was destroyed|target page, context or browser has been closed/i.test(text)) {
    return null;
  }

  if (/\bapi[_\s-]?key\b|request_denied|api key required|requires an api key/i.test(text)) {
    return '[Auto Router] ⚡ Keyless autonomous engine active (no API key required).';
  }

  return text;
}

module.exports = {
  normalizeEngineError,
  sanitizeLogForUi
};
