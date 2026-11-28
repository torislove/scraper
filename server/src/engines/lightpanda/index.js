'use strict';

/**
 * engines/lightpanda/index.js
 * Container-safe HTTP/CDP interface for headless Lightpanda (optional).
 * Gracefully degrades to empty string when no Lightpanda container sidecar is configured.
 */

const LIGHTPANDA_CDP_URL = String(process.env.LIGHTPANDA_CDP_URL || '').trim();

async function isLightpandaAvailable() {
  if (!LIGHTPANDA_CDP_URL) return false;
  try {
    const res = await fetch(`${LIGHTPANDA_CDP_URL.replace(/\/+$/, '')}/json/version`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data.Browser?.includes('Lightpanda'));
    }
  } catch (_) {}
  return false;
}

/**
 * Renders a JS-heavy URL via configured Lightpanda sidecar container (no WSL dependency).
 * @param {string} url
 * @param {object} options
 * @returns {Promise<string>} rendered HTML or ''
 */
async function renderPageLightpanda(url, options = {}) {
  if (!LIGHTPANDA_CDP_URL || !url) return '';
  const timeoutMs = options.timeout || 12000;
  try {
    const res = await fetch(`${LIGHTPANDA_CDP_URL.replace(/\/+$/, '')}/fetch?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(timeoutMs)
    });
    return res.ok ? await res.text() : '';
  } catch (_) {
    return '';
  }
}

module.exports = {
  isLightpandaAvailable,
  renderPageLightpanda
};
