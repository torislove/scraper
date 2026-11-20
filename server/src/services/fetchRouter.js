'use strict';

/**
 * fetchRouter.js
 *
 * One decision point: "who should fetch this URL?"
 *
 * Before this file existed, `SCRAPER_EXTENSION_ONLY=true` was a locked door:
 * the server refused to start a scrape without an extension, and then had no
 * code path that used the extension. This router is the room behind the door.
 *
 * Routing order
 * -------------
 *   1. User has an extension that supports `render` and the URL needs JS
 *      -> relay, mode 'render' (hidden tab in the user's browser)
 *   2. User has an extension
 *      -> relay, mode 'fetch' (plain HTTP from the user's IP)
 *   3. Extension-only mode is off
 *      -> server Playwright / server HTTP, exactly as before
 *   4. Otherwise
 *      -> typed `capability_unavailable` error the UI turns into an install card
 *
 * Nothing in an engine needs to change to use this: `fetchHtml()` returns a
 * string and throws a typed error, which is what the existing axios calls do.
 */

const extensionRelayHub = require('./extensionRelayHub');
const { currentUserId, currentSessionId } = require('./runContext');

/**
 * Hosts that return an empty shell without JavaScript. Rendering them is the
 * whole reason the extension needs a tab at all.
 */
const JS_GATED_HOSTS = [
  'google.com/maps',
  'google.co.in/maps',
  'google.co.uk/maps',
  'google.ca/maps',
  'google.com.au/maps',
  'justdial.com',
  'local.yahoo.com',
  'tripadvisor.',
  'yelp.com',
  'facebook.com',
  'instagram.com'
];

const JSON_API_EXCEPTIONS = [
  'm.justdial.com/verticals/',
  'justdial.com/webmain/ftxt.php'
];

function isJsGated(url) {
  const raw = String(url || '').toLowerCase();
  if (JSON_API_EXCEPTIONS.some((needle) => raw.includes(needle))) return false;
  return JS_GATED_HOSTS.some((needle) => raw.includes(needle));
}

class RelayError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'RelayError';
    this.code = code;
    Object.assign(this, details);
  }
}

/**
 * Decide how a URL should be fetched for a given user, without fetching it.
 * Useful for logging and for the UI's "why is this slow" panel.
 */
function resolveCapability(userId = currentUserId()) {
  const connected = extensionRelayHub.hasActiveExtension(userId);
  const caps = connected ? extensionRelayHub.capabilitiesOf(userId) : [];
  const extensionOnly = extensionRelayHub.isExtensionOnlyMode();

  return {
    userId,
    connected,
    capabilities: caps,
    extensionOnly,
    canFetch: connected,
    canRender: connected && caps.includes('render'),
    canUseServer: !extensionOnly
  };
}

/**
 * Ask the user's browser for a URL. Resolves with raw bytes; never parses.
 *
 * @returns {Promise<{ok: boolean, status?: number, contentType?: string,
 *   rawBody?: string, error?: string, code?: string}>}
 */
async function relayFetch(url, options = {}) {
  const userId = options.userId || currentUserId();
  const sessionId = options.sessionId || currentSessionId();
  const capability = resolveCapability(userId);

  if (!capability.connected) {
    return { ok: false, error: 'extension_not_connected', code: 'extension_not_connected' };
  }

  const wantsRender = options.mode === 'render' || (options.mode !== 'fetch' && isJsGated(url));
  const mode = wantsRender && capability.canRender ? 'render' : 'fetch';

  return extensionRelayHub.requestBlindRelayFetch(userId, url, {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: typeof options.body === 'string' ? options.body : undefined,
    timeoutMs: options.timeoutMs,
    settleMs: options.settleMs,
    maxBytes: options.maxBytes,
    sessionId,
    mode
  });
}

/**
 * Fetch a URL as HTML, routing through the extension when it is available.
 * Throws a RelayError with a machine-readable `code` on failure.
 */
async function fetchHtml(url, options = {}) {
  const capability = resolveCapability(options.userId);

  // 1 + 2 — the user's browser does the work.
  if (capability.connected) {
    const result = await relayFetch(url, options);
    if (result.ok) {
      return {
        html: String(result.rawBody || ''),
        status: Number(result.status) || 0,
        contentType: String(result.contentType || ''),
        transport: `relay-${result.mode || 'fetch'}`,
        elapsedMs: result.elapsedMs || 0
      };
    }
    if (!capability.canUseServer) {
      throw new RelayError(
        `Relay failed for ${url}: ${result.error}`,
        result.code || 'relay_failed',
        { url, relay: result }
      );
    }
    // Fall through to the server: a broken extension must not stop a run when
    // server browsers are still allowed.
  }

  // 3 — server path.
  if (capability.canUseServer) {
    const serverFetch = require('../scrapers/browserFactory');
    const page = await serverFetch.fetchHtmlViaServerBrowser(url, options);
    return { ...page, transport: 'server-browser' };
  }

  // 4 — nothing can fetch.
  throw new RelayError(
    'RAM Turbo is not connected and this server does not run browsers. ' +
    'Install the extension, or turn off extension-only mode.',
    'capability_unavailable',
    { url }
  );
}

/**
 * Non-throwing variant for engines that already have a try/catch.
 */
async function tryFetchHtml(url, options = {}) {
  try {
    return { ok: true, ...(await fetchHtml(url, options)) };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      code: error.code || 'fetch_failed',
      url
    };
  }
}

/**
 * Relay-first text/JSON fetch for fast HTTP scrapers when RAM Turbo is active.
 * Signals fallbackToServer so callers can run direct server axios without coupling.
 */
async function fetchTextSmart(url, options = {}) {
  const capability = resolveCapability(options.userId);
  if (!capability.connected) {
    return { ok: false, fallbackToServer: true, reason: 'extension_not_connected' };
  }
  const result = await relayFetch(url, { ...options, mode: options.mode || 'fetch' });
  if (result.ok && Number(result.status) >= 200 && Number(result.status) < 400 && typeof result.rawBody === 'string') {
    return {
      ok: true,
      text: result.rawBody,
      status: Number(result.status),
      contentType: String(result.contentType || ''),
      transport: `relay-${result.mode || 'fetch'}`,
      elapsedMs: result.elapsedMs || 0
    };
  }
  return {
    ok: false,
    fallbackToServer: capability.canUseServer,
    status: Number(result.status) || 0,
    error: result.error || 'relay_failed',
    code: result.code || 'relay_failed'
  };
}

function describeRoute(url, userId = currentUserId()) {
  const capability = resolveCapability(userId);
  if (capability.canRender && isJsGated(url)) return 'relay-render';
  if (capability.canFetch) return 'relay-fetch';
  if (capability.canUseServer) return 'server-browser';
  return 'unavailable';
}

module.exports = {
  isJsGated,
  resolveCapability,
  relayFetch,
  fetchTextSmart,
  fetchHtml,
  tryFetchHtml,
  describeRoute,
  RelayError,
  JS_GATED_HOSTS
};
