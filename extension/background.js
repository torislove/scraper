/**
 * background.js — Scraper.co.in RAM Turbo
 * ============================================================================
 * ZERO-KNOWLEDGE BY CONSTRUCTION
 *
 * This file contains no selectors, no parsers, no regexes about businesses,
 * no geo data and no engine names. It performs two mechanical jobs:
 *
 *   1. fetch  — GET a URL and return the raw bytes.
 *   2. render — open a background tab, let it settle, return the raw HTML.
 *
 * The server decides every URL and does all parsing. The extension is a pipe.
 *
 * SELF-SUFFICIENCY
 *
 * An MV3 service worker is evicted after ~30 s idle. A `setInterval` dies with
 * it. `chrome.alarms` does not, so the heartbeat lives there and the extension
 * stays registered with the server even when no Scraper tab is open.
 * ============================================================================
 */

const EXTENSION_VERSION = '1.1.0';
const HEARTBEAT_ALARM = 'scraper-heartbeat';
const HEARTBEAT_MINUTES = 0.5; // 30 s — the server TTL is 90 s
const MAX_BODY_BYTES = 750_000;
const MAX_RENDER_LANES = 3;

/* ---------------------------------------------------------------------------
 * Settings
 * ------------------------------------------------------------------------- */

const DEFAULTS = {
  serverBase: '',
  userId: '',
  pairToken: '',
  relayedCount: 0,
  lastRelayAt: '',
  lastError: '',
  enabledOrigins: [],
  paused: false
};

async function getSettings() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const merged = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    if (stored[key] !== undefined) merged[key] = stored[key];
  }
  return merged;
}

async function patchSettings(patch) {
  await chrome.storage.local.set(patch);
  return getSettings();
}

function normaliseBase(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  if (!/^https?:\/\//i.test(raw)) return '';
  return raw;
}

function hardware() {
  return {
    ramGb: Number(navigator.deviceMemory) > 0 ? Number(navigator.deviceMemory) : 8,
    cpuCores: Number(navigator.hardwareConcurrency) > 0 ? Number(navigator.hardwareConcurrency) : 6
  };
}

function capabilities() {
  const { ramGb } = hardware();
  const lanes = ramGb >= 16 ? 3 : ramGb >= 8 ? 2 : 1;
  const caps = ['fetch'];
  // Render needs the scripting API to read the tab it created.
  if (chrome.scripting && chrome.tabs) caps.push('render');
  return { caps, lanes };
}

/* ---------------------------------------------------------------------------
 * Server conversation
 * ------------------------------------------------------------------------- */

function apiUrl(base, path) {
  return `${normaliseBase(base)}${path}`;
}

async function heartbeat({ force = false } = {}) {
  const settings = await getSettings();
  if (!settings.serverBase) return { ok: false, reason: 'not_paired' };
  if (settings.paused && !force) return { ok: false, reason: 'paused' };

  const { ramGb, cpuCores } = hardware();
  const { caps } = capabilities();

  try {
    const res = await fetch(apiUrl(settings.serverBase, '/api/scrape/extension-heartbeat'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-scraper-extension': EXTENSION_VERSION,
        ...(settings.userId ? { 'x-user-id': settings.userId } : {})
      },
      credentials: 'omit',
      cache: 'no-store',
      body: JSON.stringify({
        installed: true,
        version: EXTENSION_VERSION,
        ramGb,
        cpuCores,
        capabilities: caps,
        standalone: true
      })
    });

    if (!res.ok) {
      await patchSettings({ lastError: `heartbeat_http_${res.status}` });
      return { ok: false, reason: `http_${res.status}` };
    }

    const data = await res.json().catch(() => ({}));
    await patchSettings({ lastError: '' });

    const tickets = Array.isArray(data?.tickets) ? data.tickets : [];
    if (tickets.length) {
      // Run them without blocking the alarm handler for long.
      void runTickets(tickets, settings);
    }

    return { ok: true, connected: Boolean(data?.connected), extensionOnly: Boolean(data?.extensionOnly) };
  } catch (error) {
    await patchSettings({ lastError: String(error?.message || 'heartbeat_failed').slice(0, 160) });
    return { ok: false, reason: 'network' };
  }
}

async function postResult(settings, ticket, result) {
  if (!settings.serverBase) return;
  try {
    await fetch(apiUrl(settings.serverBase, '/api/scrape/relay-result'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-scraper-extension': EXTENSION_VERSION,
        ...(settings.userId ? { 'x-user-id': settings.userId } : {})
      },
      credentials: 'omit',
      cache: 'no-store',
      body: JSON.stringify({
        ticketId: ticket.ticketId,
        signature: ticket.signature,
        ok: Boolean(result.ok),
        status: Number(result.status) || 0,
        contentType: String(result.contentType || ''),
        rawBody: String(result.rawBody || ''),
        error: String(result.error || '')
      })
    });
  } catch (error) {
    // The server will time the ticket out. Nothing else to do.
  }
}

/* ---------------------------------------------------------------------------
 * Ticket execution — fetch mode
 * ------------------------------------------------------------------------- */

async function fetchTicket(ticket) {
  const url = String(ticket.targetUrl || '');
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, ticketId: ticket.ticketId, error: 'invalid_target' };
  }

  const controller = new AbortController();
  const timeoutMs = Math.min(20_000, Math.max(2000, Number(ticket.timeoutMs) || 12_000));
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const method = String(ticket.method || 'GET').toUpperCase();
    const fetchInit = {
      method,
      headers: ticket.headers && typeof ticket.headers === 'object' ? ticket.headers : {},
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal
    };
    if (method === 'POST' && typeof ticket.body === 'string') {
      fetchInit.body = ticket.body;
    }
    const res = await fetch(url, fetchInit);

    const text = await res.text();
    const capped = text.length > MAX_BODY_BYTES ? text.slice(0, MAX_BODY_BYTES) : text;

    return {
      ok: true,
      ticketId: ticket.ticketId,
      status: res.status,
      contentType: res.headers.get('content-type') || '',
      rawBody: capped
    };
  } catch (error) {
    return {
      ok: false,
      ticketId: ticket.ticketId,
      error: error?.name === 'AbortError' ? 'fetch_timeout' : String(error?.message || 'fetch_failed')
    };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------------------------
 * Ticket execution — render mode
 * ------------------------------------------------------------------------- */

let renderLanesInUse = 0;
const renderQueue = [];

function withRenderLane(task) {
  return new Promise((resolve) => {
    renderQueue.push(async () => {
      renderLanesInUse += 1;
      try {
        resolve(await task());
      } finally {
        renderLanesInUse -= 1;
        const next = renderQueue.shift();
        if (next) next();
      }
    });
    if (renderLanesInUse < MAX_RENDER_LANES) {
      const next = renderQueue.shift();
      if (next) next();
    }
  });
}

function waitForTabComplete(tabId, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
      resolve(ok);
    };
    const onUpdated = (id, info) => {
      if (id === tabId && info.status === 'complete') finish(true);
    };
    const onRemoved = (id) => {
      if (id === tabId) finish(false);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onRemoved.addListener(onRemoved);
  });
}

async function renderTicket(ticket) {
  const url = String(ticket.targetUrl || '');
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, ticketId: ticket.ticketId, error: 'invalid_target' };
  }

  return withRenderLane(async () => {
    let tabId = null;
    try {
      const tab = await chrome.tabs.create({ url, active: false });
      tabId = tab.id;

      const loaded = await waitForTabComplete(tabId, Math.min(20_000, Number(ticket.timeoutMs) || 15_000));
      if (!loaded) {
        return { ok: false, ticketId: ticket.ticketId, error: 'render_timeout' };
      }

      const settle = Math.min(4000, Math.max(0, Number(ticket.settleMs) || 1500));
      if (settle) await new Promise((r) => setTimeout(r, settle));

      const [{ result } = {}] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => document.documentElement.outerHTML
      });

      const html = String(result || '');
      if (!html) {
        return { ok: false, ticketId: ticket.ticketId, error: 'render_empty' };
      }

      return {
        ok: true,
        ticketId: ticket.ticketId,
        status: 200,
        contentType: 'text/html',
        rawBody: html.length > MAX_BODY_BYTES ? html.slice(0, MAX_BODY_BYTES) : html
      };
    } catch (error) {
      const message = String(error?.message || 'render_failed');
      // A missing host permission is the common failure. Say so plainly.
      if (/cannot access|permission|host/i.test(message)) {
        return { ok: false, ticketId: ticket.ticketId, error: 'site_not_allowed' };
      }
      return { ok: false, ticketId: ticket.ticketId, error: message.slice(0, 160) };
    } finally {
      if (tabId !== null) {
        try { await chrome.tabs.remove(tabId); } catch (error) { /* already closed */ }
      }
    }
  });
}

/* ---------------------------------------------------------------------------
 * Ticket dispatch
 * ------------------------------------------------------------------------- */

const executing = new Set();

async function runTickets(tickets, settings) {
  for (const ticket of tickets) {
    if (!ticket?.ticketId || executing.has(ticket.ticketId)) continue;
    executing.add(ticket.ticketId);

    // Fire and forget; each ticket posts its own result.
    (async () => {
      let result;
      try {
        result = ticket.mode === 'render'
          ? await renderTicket(ticket)
          : await fetchTicket(ticket);
      } catch (error) {
        result = { ok: false, ticketId: ticket.ticketId, error: String(error?.message || 'relay_failed') };
      } finally {
        executing.delete(ticket.ticketId);
      }

      await postResult(settings, ticket, result);

      if (result.ok) {
        const fresh = await getSettings();
        await patchSettings({
          relayedCount: (Number(fresh.relayedCount) || 0) + 1,
          lastRelayAt: new Date().toISOString()
        });
      } else {
        await patchSettings({ lastError: String(result.error || 'relay_failed').slice(0, 160) });
      }
    })();
  }
}

/* ---------------------------------------------------------------------------
 * Pairing
 * ------------------------------------------------------------------------- */

async function pair({ serverBase, userId, pairToken }) {
  const base = normaliseBase(serverBase);
  if (!base) return { ok: false, error: 'invalid_server_base' };

  await patchSettings({ serverBase: base, userId: String(userId || ''), pairToken: String(pairToken || '') });

  // Prove the pairing immediately so the page can flip to "connected".
  const result = await heartbeat({ force: true });
  return { ok: result.ok, serverBase: base, ...result };
}

/* ---------------------------------------------------------------------------
 * Site access — one native Chrome dialog, no scary install prompt
 * ------------------------------------------------------------------------- */

const SITE_GROUPS = [
  { id: 'search', label: 'Search engines', origins: ['https://*.bing.com/*', 'https://*.duckduckgo.com/*', 'https://*.search.brave.com/*'] },
  { id: 'maps', label: 'Maps & places', origins: ['https://*.google.com/*', 'https://*.google.co.in/*', 'https://*.google.co.uk/*', 'https://*.google.ca/*', 'https://*.google.com.au/*', 'https://*.google.ae/*', 'https://*.google.com.sg/*', 'https://*.google.co.nz/*', 'https://*.google.co.za/*', 'https://*.google.ie/*', 'https://*.google.de/*'] },
  { id: 'directories', label: 'Business directories', origins: ['https://*.justdial.com/*', 'https://*.indiamart.com/*', 'https://*.yelp.com/*', 'https://*.yelp.ca/*', 'https://*.yelp.com.au/*', 'https://*.yellowpages.com/*', 'https://*.yellowpages.ca/*', 'https://*.yellowpages.com.au/*', 'https://*.yellowpages.co.za/*', 'https://*.yellowpages.ae/*', 'https://*.yellowpages.com.sg/*', 'https://*.yellow.co.nz/*', 'https://*.yell.com/*', 'https://*.cylex.us.com/*', 'https://*.cylex.co.uk/*', 'https://*.cylex.ca/*', 'https://*.cylex.com.au/*', 'https://*.cylex.ae/*', 'https://*.cylex.com.sg/*', 'https://*.freeindex.co.uk/*', 'https://*.goldenpages.ie/*', 'https://*.trustpilot.com/*', 'https://*.weddingwire.com/*', 'https://*.weddingwire.in/*', 'https://*.weddingbazaar.com/*', 'https://*.mandap.com/*'] },
  { id: 'geo', label: 'Open maps data', origins: ['https://*.openstreetmap.org/*', 'https://*.overpass-api.de/*', 'https://*.wikidata.org/*'] }
];

function allOrigins() {
  return [...new Set(SITE_GROUPS.flatMap((g) => g.origins))];
}

/**
 * Site access is granted at install time by the manifest, so this is a health
 * check rather than a prompt. The optional wildcard grant exists only for
 * "also read business websites I find", which the user enables from the popup.
 */
async function siteAccessState() {
  let have = [];
  try {
    const current = await chrome.permissions.getAll();
    have = current.origins || [];
  } catch (error) {
    have = [];
  }

  const required = allOrigins();
  const missing = required.filter((origin) => {
    const bare = origin.replace(/^https:\/\/\*\./, '').replace(/\/\*$/, '');
    return !have.some((granted) => granted === origin || granted === 'https://*/*' || granted.includes(bare));
  });

  return {
    ok: missing.length === 0,
    grantedCount: required.length - missing.length,
    requiredCount: required.length,
    missing,
    wildcard: have.includes('https://*/*'),
    groups: SITE_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      granted: group.origins.every((origin) => {
        const bare = origin.replace(/^https:\/\/\*\./, '').replace(/\/\*$/, '');
        return have.some((granted) => granted === origin || granted === 'https://*/*' || granted.includes(bare));
      })
    }))
  };
}

/**
 * Optional upgrade: let the relay read arbitrary business websites it finds.
 * Must be called from a user gesture inside the extension (the popup button),
 * because Chrome requires one for permissions.request.
 */
async function requestWildcardAccess() {
  try {
    const granted = await chrome.permissions.request({ origins: ['https://*/*'] });
    const state = await siteAccessState();
    return { granted: Boolean(granted), ...state };
  } catch (error) {
    return { granted: false, error: String(error?.message || 'request_failed') };
  }
}

/* ---------------------------------------------------------------------------
 * Lifecycle
 * ------------------------------------------------------------------------- */

async function ensureAlarm() {
  const existing = await chrome.alarms.get(HEARTBEAT_ALARM);
  if (!existing) {
    chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: HEARTBEAT_MINUTES, delayInMinutes: 0.1 });
  }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  await ensureAlarm();
  if (details.reason === 'install') {
    await patchSettings({ relayedCount: 0 });
    try {
      await chrome.tabs.create({ url: 'https://scraper.co.in/install' });
    } catch (error) {
      // The tab may be blocked; the popup still works.
    }
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureAlarm();
  await heartbeat({ force: true });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== HEARTBEAT_ALARM) return;
  await ensureAlarm();
  await heartbeat();
});

/* ---------------------------------------------------------------------------
 * Message bus
 * ------------------------------------------------------------------------- */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  switch (message.type) {
    case 'SCRAPER_EXT_PING':
      sendResponse({
        ok: true,
        version: EXTENSION_VERSION,
        status: 'READY',
        capabilities: capabilities().caps
      });
      return false;

    case 'SCRAPER_EXT_EXECUTE_TICKET': {
      const ticket = message.ticket || {};
      const run = ticket.mode === 'render' ? renderTicket(ticket) : fetchTicket(ticket);
      run.then(async (result) => {
        const settings = await getSettings();
        // A page-originated ticket still has to report to the server; the
        // page posts results too, so only post when we own the pairing.
        if (settings.standalone !== false && settings.serverBase) {
          await postResult(settings, ticket, result);
        }
        sendResponse(result);
      });
      return true;
    }

    case 'SCRAPER_EXT_PAIR':
      pair(message.payload || {}).then(sendResponse);
      return true;

    case 'SCRAPER_EXT_UNPAIR':
      patchSettings({ serverBase: '', userId: '', pairToken: '' }).then(() => sendResponse({ ok: true }));
      return true;

    case 'SCRAPER_EXT_STATE':
      Promise.all([getSettings(), siteAccessState()]).then(([settings, sites]) => {
        sendResponse({
          ok: true,
          version: EXTENSION_VERSION,
          ...hardware(),
          capabilities: capabilities().caps,
          relayedCount: Number(settings.relayedCount) || 0,
          lastRelayAt: settings.lastRelayAt || '',
          lastError: settings.lastError || '',
          paired: Boolean(settings.serverBase),
          serverBase: settings.serverBase,
          paused: Boolean(settings.paused),
          sites
        });
      });
      return true;

    case 'SCRAPER_EXT_SET_PAUSED':
      patchSettings({ paused: Boolean(message.paused) }).then(() => sendResponse({ ok: true }));
      return true;

    case 'SCRAPER_EXT_HEARTBEAT':
      heartbeat({ force: true }).then(sendResponse);
      return true;

    case 'SCRAPER_EXT_SITE_GROUPS':
      siteAccessState().then(sendResponse);
      return true;

    case 'SCRAPER_EXT_REQUEST_SITES':
      requestWildcardAccess().then(sendResponse);
      return true;

    default:
      return false;
  }
});

// Keep the alarm alive even if the worker is woken by something else.
ensureAlarm();
