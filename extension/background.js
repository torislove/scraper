/**
 * background.js — Scraper.co.in RAM Turbo
 * ============================================================================
 * ZERO-KNOWLEDGE & CLIENT-HARDWARE POWERED ARCHITECTURE
 *
 * This service worker turns the client's PC hardware into a high-throughput
 * residential edge worker:
 *   1. Dynamic RAM Concurrency: Scales dynamically from 4 lanes (8GB) up to
 *      16 lanes (32GB+) directly utilizing the user's CPU and RAM.
 *   2. Silent Offscreen Rendering: Uses chrome.offscreen API for headless DOM
 *      parsing with 0 visible tabs, falling back to background tabs when offscreen
 *      is unavailable (Firefox / older Chrome).
 *   3. Residential IP Extraction: Directly performs local-network scraping of
 *      directories, maps, and search engines with 0 Cloudflare blocks.
 *   4. Zero Server Footprint: All DOM tree building and network transit happens
 *      on the user's PC, keeping cloud server RAM < 50MB and CPU < 5%.
 * ============================================================================
 */

const EXTENSION_VERSION = '2.0.0';
const HEARTBEAT_ALARM = 'scraper-heartbeat';
const METRICS_ALARM = 'scraper-metrics-tick';
const HEARTBEAT_MINUTES = 0.5; // 30 s — server TTL is 90 s
const MAX_BODY_BYTES = 750_000;
const MAX_PAIRINGS = 6;
const SCRAPER_TAB_PATTERNS = [
  'https://scraper.co.in/*',
  'https://*.scraper.co.in/*',
  'https://master.scraper.co.in/*',
  'http://localhost/*',
  'http://127.0.0.1/*'
];

// Modern Desktop User-Agents (Chrome 131+ / Edge 131+ / Firefox 132+)
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:132.0) Gecko/20100101 Firefox/132.0'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/* ---------------------------------------------------------------------------
 * Hardware Detection & Dynamic Lane Calculation
 * ------------------------------------------------------------------------- */

let HARDWARE = {
  ramGb: 8,
  freeRamGb: 0,
  cpuCores: 8,
  cpuModel: '',
  source: 'navigator'
};

function navHardware() {
  return {
    ramGb: Number(navigator.deviceMemory) > 0 ? Number(navigator.deviceMemory) : 8,
    cpuCores: Number(navigator.hardwareConcurrency) > 0 ? Number(navigator.hardwareConcurrency) : 8
  };
}

async function hydrateHardware() {
  const nav = navHardware();
  let ramGb = nav.ramGb;
  let freeRamGb = 0;
  let cpuCores = nav.cpuCores;
  let cpuModel = '';
  let source = 'navigator';

  try {
    if (chrome.system?.memory?.getInfo) {
      const info = await chrome.system.memory.getInfo();
      const gb = (bytes) => Math.round((Number(bytes) || 0) / (1024 * 1024 * 1024));
      ramGb = gb(info?.capacity) || ramGb;
      freeRamGb = gb(info?.availableCapacity);
      source = 'system';
    }
  } catch (e) {
    // Managed environments fallback
  }

  try {
    if (chrome.system?.cpu?.getInfo) {
      const info = await chrome.system.cpu.getInfo();
      cpuCores = Number(info?.numOfProcessors) || cpuCores;
      cpuModel = String(info?.modelName || '').trim();
      source = 'system';
    }
  } catch (e) {}

  HARDWARE = {
    ramGb: ramGb > 0 ? ramGb : 8,
    freeRamGb,
    cpuCores: cpuCores > 0 ? cpuCores : 8,
    cpuModel,
    source
  };
  return HARDWARE;
}

function hardware() {
  const nav = navHardware();
  return {
    ramGb: HARDWARE.ramGb || nav.ramGb || 8,
    freeRamGb: HARDWARE.freeRamGb || 0,
    cpuCores: HARDWARE.cpuCores || nav.cpuCores || 8,
    cpuModel: HARDWARE.cpuModel || ''
  };
}

/**
 * Calculates optimal concurrent worker lanes based on the user's hardware.
 * 4GB RAM  -> 4 lanes
 * 8GB RAM  -> 8 lanes
 * 16GB RAM -> 12 lanes
 * 32GB+ RAM-> 16 lanes
 */
function calculateOptimalLanes() {
  const { ramGb, cpuCores } = hardware();
  let lanes = 4;
  if (ramGb >= 32) lanes = 16;
  else if (ramGb >= 16) lanes = 12;
  else if (ramGb >= 8) lanes = 8;
  else if (ramGb >= 4) lanes = 4;
  else lanes = 2;

  // Ensure CPU core parity
  if (cpuCores >= 8 && lanes < 8) lanes = 8;
  return lanes;
}

function capabilities() {
  const lanes = calculateOptimalLanes();
  const caps = ['fetch'];
  if (chrome.offscreen || (chrome.scripting && chrome.tabs)) caps.push('render');
  if (chrome.offscreen) caps.push('offscreen_dom');
  return { caps, lanes };
}

/* ---------------------------------------------------------------------------
 * Real-Time Telemetry & Performance Metrics
 * ------------------------------------------------------------------------- */

let METRICS = {
  activeRequests: 0,
  completedLastInterval: 0,
  reqPerSec: 0,
  latencyAccumulatorMs: 0,
  latencySamples: 0,
  avgLatencyMs: 0,
  verifiedLeadsRouted: 0,
  totalBytesRelayed: 0,
  lastUpdated: Date.now()
};

function recordLatency(ms, bytes = 0) {
  METRICS.completedLastInterval += 1;
  METRICS.latencyAccumulatorMs += ms;
  METRICS.latencySamples += 1;
  if (bytes > 0) METRICS.totalBytesRelayed += bytes;
}

function refreshMetrics() {
  const now = Date.now();
  const elapsedSec = Math.max(1, (now - METRICS.lastUpdated) / 1000);
  METRICS.reqPerSec = parseFloat((METRICS.completedLastInterval / elapsedSec).toFixed(1));
  METRICS.avgLatencyMs = METRICS.latencySamples > 0
    ? Math.round(METRICS.latencyAccumulatorMs / METRICS.latencySamples)
    : 0;

  // Reset rolling window
  METRICS.completedLastInterval = 0;
  METRICS.latencyAccumulatorMs = 0;
  METRICS.latencySamples = 0;
  METRICS.lastUpdated = now;
}

/* ---------------------------------------------------------------------------
 * Settings Management & Multi-Workspace Pairing
 * ------------------------------------------------------------------------- */

const DEFAULTS = {
  serverBase: '',
  apiBase: '',
  userId: '',
  pairToken: '',
  pairings: [],
  relayedCount: 0,
  lastRelayAt: '',
  lastError: '',
  enabledOrigins: [],
  offlineQueue: [],
  lastOnlineAt: '',
  paused: false
};

async function getSettings() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const merged = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    if (stored[key] !== undefined) merged[key] = stored[key];
  }
  if (!Array.isArray(merged.pairings)) merged.pairings = [];
  return merged;
}

async function patchSettings(patch) {
  await chrome.storage.local.set(patch);
  return getSettings();
}

function normaliseBase(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw || !/^https?:\/\//i.test(raw)) return '';
  return raw;
}

function resolvePairings(settings) {
  const list = Array.isArray(settings.pairings)
    ? settings.pairings.filter((p) => p && normaliseBase(p.serverBase || p.apiBase))
    : [];
  if (list.length) return list;
  const legacyBase = normaliseBase(settings.serverBase);
  if (legacyBase) {
    return [{
      serverBase: legacyBase,
      apiBase: normaliseBase(settings.apiBase) || `${legacyBase}/api`,
      userId: String(settings.userId || ''),
      lastPairedAt: ''
    }];
  }
  return [];
}

/* ---------------------------------------------------------------------------
 * Chrome Offscreen Document Lifecycle Management
 * ------------------------------------------------------------------------- */

let creatingOffscreenDoc = null;

async function ensureOffscreenDocument() {
  if (!chrome.offscreen?.hasDocument) return false;

  try {
    const hasDoc = await chrome.offscreen.hasDocument();
    if (hasDoc) return true;

    if (creatingOffscreenDoc) {
      await creatingOffscreenDoc;
      return true;
    }

    creatingOffscreenDoc = chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSER'],
      justification: 'Render JS-heavy directories without opening user tabs'
    });

    await creatingOffscreenDoc;
    creatingOffscreenDoc = null;
    return true;
  } catch (err) {
    creatingOffscreenDoc = null;
    return false;
  }
}

/* ---------------------------------------------------------------------------
 * Ticket Execution: Fetch Mode with Rate-Limit Resilience
 * ------------------------------------------------------------------------- */

async function fetchTicket(ticket) {
  const url = String(ticket.targetUrl || '');
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, ticketId: ticket.ticketId, error: 'invalid_target' };
  }

  const timeoutMs = Math.min(25_000, Math.max(2000, Number(ticket.timeoutMs) || 12_000));
  const startTime = Date.now();
  METRICS.activeRequests += 1;

  let retriesLeft = 2;
  let lastError = null;

  while (retriesLeft >= 0) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const method = String(ticket.method || 'GET').toUpperCase();
      const headers = {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(ticket.headers && typeof ticket.headers === 'object' ? ticket.headers : {})
      };

      const fetchInit = {
        method,
        headers,
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'follow',
        signal: controller.signal
      };

      if (method === 'POST' && typeof ticket.body === 'string') {
        fetchInit.body = ticket.body;
      }

      const res = await fetch(url, fetchInit);

      // Handle 429 Rate Limit or 503 Service Unavailable with exponential jitter backoff
      if ((res.status === 429 || res.status === 503) && retriesLeft > 0) {
        retriesLeft -= 1;
        clearTimeout(timer);
        const backoff = 350 * Math.pow(2, 2 - retriesLeft) + Math.random() * 300;
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }

      const text = await res.text();
      const capped = text.length > MAX_BODY_BYTES ? text.slice(0, MAX_BODY_BYTES) : text;
      const latency = Date.now() - startTime;
      recordLatency(latency, capped.length);
      METRICS.activeRequests = Math.max(0, METRICS.activeRequests - 1);
      clearTimeout(timer);

      return {
        ok: true,
        ticketId: ticket.ticketId,
        status: res.status,
        contentType: res.headers.get('content-type') || '',
        rawBody: capped
      };
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (error?.name !== 'AbortError' && retriesLeft > 0) {
        retriesLeft -= 1;
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 200));
        continue;
      }
      break;
    }
  }

  METRICS.activeRequests = Math.max(0, METRICS.activeRequests - 1);
  return {
    ok: false,
    ticketId: ticket.ticketId,
    error: lastError?.name === 'AbortError' ? 'fetch_timeout' : String(lastError?.message || 'fetch_failed')
  };
}

/* ---------------------------------------------------------------------------
 * Dynamic Concurrency Queue for Rendering
 * ------------------------------------------------------------------------- */

let renderLanesInUse = 0;
const renderQueue = [];

function withRenderLane(task) {
  const maxLanes = calculateOptimalLanes();
  return new Promise((resolve) => {
    renderQueue.push(async () => {
      renderLanesInUse += 1;
      try {
        resolve(await task());
      } finally {
        renderLanesInUse -= 1;
        if (renderQueue.length && renderLanesInUse < maxLanes) {
          const next = renderQueue.shift();
          if (next) next();
        }
      }
    });

    if (renderLanesInUse < maxLanes) {
      const next = renderQueue.shift();
      if (next) next();
    }
  });
}

/* ---------------------------------------------------------------------------
 * Ticket Execution: Render Mode (Offscreen First, Background Tab Fallback)
 * ------------------------------------------------------------------------- */

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

async function renderTicketWithTabFallback(ticket) {
  const url = String(ticket.targetUrl || '');
  let tabId = null;
  try {
    const tab = await chrome.tabs.create({ url, active: false });
    tabId = tab.id;

    const loaded = await waitForTabComplete(tabId, Math.min(22_000, Number(ticket.timeoutMs) || 15_000));
    if (!loaded) {
      return { ok: false, ticketId: ticket.ticketId, error: 'render_timeout' };
    }

    const settle = Math.min(4000, Math.max(0, Number(ticket.settleMs) || 1200));
    if (settle) await new Promise((r) => setTimeout(r, settle));

    const [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.documentElement.outerHTML
    });

    const html = String(result || '');
    if (!html) return { ok: false, ticketId: ticket.ticketId, error: 'render_empty' };

    return {
      ok: true,
      ticketId: ticket.ticketId,
      status: 200,
      contentType: 'text/html',
      rawBody: html.length > MAX_BODY_BYTES ? html.slice(0, MAX_BODY_BYTES) : html
    };
  } finally {
    if (tabId !== null) {
      try { await chrome.tabs.remove(tabId); } catch (e) {}
    }
  }
}

async function renderTicket(ticket) {
  const url = String(ticket.targetUrl || '');
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, ticketId: ticket.ticketId, error: 'invalid_target' };
  }

  const startTime = Date.now();
  METRICS.activeRequests += 1;

  return withRenderLane(async () => {
    try {
      // 1. Try silent offscreen document rendering first
      const hasOffscreen = await ensureOffscreenDocument();
      if (hasOffscreen) {
        try {
          const offscreenResult = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              target: 'offscreen',
              type: 'OFFSCREEN_RENDER_URL',
              ticket
            }, (res) => {
              if (chrome.runtime.lastError || !res) {
                resolve(null);
              } else {
                resolve(res);
              }
            });
          });

          if (offscreenResult && offscreenResult.ok) {
            const latency = Date.now() - startTime;
            recordLatency(latency, offscreenResult.rawBody?.length || 0);
            return offscreenResult;
          }
        } catch (e) {
          // Fall through to tab fallback
        }
      }

      // 2. Tab fallback for Firefox or browsers without offscreen
      if (chrome.tabs && chrome.scripting) {
        const tabResult = await renderTicketWithTabFallback(ticket);
        const latency = Date.now() - startTime;
        recordLatency(latency, tabResult.rawBody?.length || 0);
        return tabResult;
      }

      // 3. Fallback to direct fetch
      return await fetchTicket(ticket);
    } catch (err) {
      return { ok: false, ticketId: ticket.ticketId, error: String(err?.message || 'render_failed') };
    } finally {
      METRICS.activeRequests = Math.max(0, METRICS.activeRequests - 1);
    }
  });
}

/* ---------------------------------------------------------------------------
 * Server Conversation & Heartbeat
 * ------------------------------------------------------------------------- */

function apiUrl(base, path) {
  return `${normaliseBase(base)}${path}`;
}

function heartbeatUrl(pairing) {
  const apiBase = normaliseBase(pairing?.apiBase);
  if (apiBase) {
    return apiBase.endsWith('/api') ? `${apiBase}/scrape/extension-heartbeat` : `${apiBase}/scrape/extension-heartbeat`;
  }
  return apiUrl(pairing?.serverBase, '/api/scrape/extension-heartbeat');
}

async function heartbeatPairing(pairing, meta) {
  const url = heartbeatUrl(pairing);
  if (!/^https?:\/\//i.test(url)) return { ok: false, reason: 'invalid_base' };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-scraper-extension': EXTENSION_VERSION,
      ...(pairing.userId ? { 'x-user-id': pairing.userId } : {})
    },
    credentials: 'omit',
    cache: 'no-store',
    body: JSON.stringify({
      installed: true,
      version: EXTENSION_VERSION,
      ramGb: meta.ramGb,
      cpuCores: meta.cpuCores,
      capabilities: meta.caps,
      lanes: meta.lanes,
      metrics: {
        reqPerSec: METRICS.reqPerSec,
        avgLatencyMs: METRICS.avgLatencyMs,
        activeRequests: METRICS.activeRequests
      },
      standalone: true
    })
  });

  if (!res.ok) {
    return { ok: false, reason: `http_${res.status}`, status: res.status };
  }

  const data = await res.json().catch(() => ({}));
  const tickets = Array.isArray(data?.tickets) ? data.tickets : [];
  if (tickets.length) {
    const relayBase = normaliseBase(pairing.apiBase) || `${normaliseBase(pairing.serverBase)}/api`;
    void runTickets(tickets, { apiBase: relayBase, serverBase: pairing.serverBase, userId: pairing.userId || '' });
  }

  return {
    ok: true,
    connected: Boolean(data?.connected),
    extensionOnly: Boolean(data?.extensionOnly)
  };
}

async function heartbeat({ force = false } = {}) {
  const settings = await getSettings();
  const pairings = resolvePairings(settings);
  if (!pairings.length) return { ok: false, reason: 'not_paired' };
  if (settings.paused && !force) return { ok: false, reason: 'paused' };

  const { ramGb, cpuCores } = hardware();
  const { caps, lanes } = capabilities();

  let anyOk = false;
  let anyConnected = false;
  let extensionOnly = false;
  let lastFail = '';

  for (const pairing of pairings) {
    try {
      const outcome = await heartbeatPairing(pairing, { ramGb, cpuCores, caps, lanes });
      if (outcome.ok) {
        anyOk = true;
        if (outcome.connected) anyConnected = true;
        if (outcome.extensionOnly) extensionOnly = true;
      } else {
        lastFail = outcome.reason || 'heartbeat_failed';
      }
    } catch (error) {
      lastFail = String(error?.message || 'heartbeat_failed').slice(0, 160);
    }
  }

  if (anyOk) {
    if (Array.isArray(settings.offlineQueue) && settings.offlineQueue.length > 0 && pairings[0]) {
      const base = normaliseBase(pairings[0].apiBase) || `${normaliseBase(pairings[0].serverBase)}/api`;
      if (base) {
        try {
          const syncRes = await fetch(`${base}/scrape/extension-sync-offline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-scraper-extension': EXTENSION_VERSION, ...(pairings[0].userId ? { 'x-user-id': pairings[0].userId } : {}) },
            body: JSON.stringify({ items: settings.offlineQueue })
          });
          if (syncRes.ok) await patchSettings({ offlineQueue: [] });
        } catch (_) {}
      }
    }
    await patchSettings({ lastError: '', lastOnlineAt: new Date().toISOString() });
    return { ok: true, connected: anyConnected, extensionOnly, offline: false };
  }
  const offlineMode = typeof navigator !== 'undefined' && navigator.onLine === false;
  await patchSettings({ lastError: offlineMode ? '' : (lastFail || 'standby_offline') });
  return { ok: false, offline: true, reason: lastFail || 'standby_offline' };
}

async function postResult(pairing, ticket, result) {
  const base = normaliseBase(pairing?.apiBase) || (normaliseBase(pairing?.serverBase) ? `${normaliseBase(pairing.serverBase)}/api` : '');
  if (!base) return;
  try {
    await fetch(`${base}/scrape/relay-result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-scraper-extension': EXTENSION_VERSION,
        ...(pairing.userId ? { 'x-user-id': pairing.userId } : {})
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
    if (result?.ok) {
      try {
        const s = await getSettings();
        const q = Array.isArray(s.offlineQueue) ? s.offlineQueue : [];
        await patchSettings({
          offlineQueue: [...q, { name: ticket.businessName || ticket.targetUrl || 'Relay Capture', url: ticket.targetUrl || '', ticketId: ticket.ticketId, capturedAt: new Date().toISOString(), source: 'extension_offline_relay' }].slice(-250)
        });
      } catch (_) {}
    }
  }
}

async function extractActiveTabOffline() {
  if (!chrome.tabs?.query || !chrome.scripting?.executeScript) {
    return { ok: false, error: 'tab_scripting_unavailable' };
  }
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:\/\//i.test(String(tab.url || ''))) {
      return { ok: false, error: 'open_webpage_first' };
    }
    const injected = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const text = document.body ? document.body.innerText : '';
        const telLinks = Array.from(document.querySelectorAll('a[href^="tel:"]')).map((a) => (a.getAttribute('href') || '').replace(/^tel:/i, '').trim());
        const mailLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map((a) => (a.getAttribute('href') || '').replace(/^mailto:/i, '').split('?')[0].trim());
        const waLinks = Array.from(document.querySelectorAll('a[href*="wa.me"],a[href*="whatsapp.com"]')).map((a) => a.href);
        const textPhones = text.match(/(?:\+\d{1,3}[\s.-]?)?\(?\d{2,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,5}/g) || [];
        const textEmails = text.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/g) || [];
        const phones = Array.from(new Set([...telLinks, ...textPhones].map((s) => s.trim()).filter((s) => s.replace(/\D/g, '').length >= 7))).slice(0, 12);
        const emails = Array.from(new Set([...mailLinks, ...textEmails].map((s) => s.toLowerCase().trim()))).slice(0, 8);
        return { name: document.title || location.hostname, website: location.origin, url: location.href, phones, emails, whatsapp: waLinks[0] || '' };
      }
    });
    const item = injected?.[0]?.result;
    if (!item) return { ok: false, error: 'empty_tab_result' };
    const settings = await getSettings();
    const queue = Array.isArray(settings.offlineQueue) ? settings.offlineQueue : [];
    const nextQueue = [...queue, { ...item, capturedAt: new Date().toISOString(), source: 'extension_offline_tab' }].slice(-250);
    await patchSettings({
      offlineQueue: nextQueue,
      relayedCount: (Number(settings.relayedCount) || 0) + 1,
      lastRelayAt: new Date().toISOString()
    });
    // Attempt opportunistic online sync without blocking offline success
    heartbeat({ force: true }).catch(() => {});
    return { ok: true, item, offlineQueuedCount: nextQueue.length };
  } catch (err) {
    return { ok: false, error: String(err?.message || 'extract_failed') };
  }
}

/* ---------------------------------------------------------------------------
 * Ticket Dispatch
 * ------------------------------------------------------------------------- */

const executing = new Set();

async function recordRelayOutcome(result) {
  if (result?.ok) {
    const fresh = await getSettings();
    await patchSettings({
      relayedCount: (Number(fresh.relayedCount) || 0) + 1,
      lastRelayAt: new Date().toISOString()
    });
    METRICS.verifiedLeadsRouted += 1;
  } else {
    await patchSettings({ lastError: String(result?.error || 'relay_failed').slice(0, 160) });
  }
}

async function runTickets(tickets, pairing) {
  for (const ticket of tickets) {
    if (!ticket?.ticketId || executing.has(ticket.ticketId)) continue;
    executing.add(ticket.ticketId);

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

      await postResult(pairing, ticket, result);
      await recordRelayOutcome(result);
    })();
  }
}

/* ---------------------------------------------------------------------------
 * Multi-Workspace Pairing
 * ------------------------------------------------------------------------- */

async function pair({ serverBase, apiBase, userId, pairToken }) {
  const base = normaliseBase(serverBase);
  const resolvedApi = normaliseBase(apiBase) || (base ? `${base}/api` : '');
  if (!base && !resolvedApi) return { ok: false, error: 'invalid_server_base' };

  const effectiveServer = base || resolvedApi.replace(/\/api$/, '');
  const uid = String(userId || '');
  const settings = await getSettings();
  const existing = resolvePairings(settings);
  const entry = {
    serverBase: effectiveServer,
    apiBase: resolvedApi,
    userId: uid,
    lastPairedAt: new Date().toISOString()
  };

  const filtered = existing.filter(
    (p) => !(p.apiBase === entry.apiBase && p.userId === entry.userId)
  );
  const nextPairings = [entry, ...filtered].slice(0, MAX_PAIRINGS);

  await patchSettings({
    serverBase: effectiveServer,
    apiBase: resolvedApi,
    userId: uid,
    pairToken: String(pairToken || settings.pairToken || ''),
    pairings: nextPairings
  });

  const result = await heartbeat({ force: true });
  return { ok: result.ok, serverBase: effectiveServer, apiBase: resolvedApi, ...result };
}

/* ---------------------------------------------------------------------------
 * Instant Open-Tab Injection
 * ------------------------------------------------------------------------- */

async function injectIntoOpenScraperTabs() {
  if (!chrome.tabs?.query || !chrome.scripting?.executeScript) return 0;
  let injected = 0;
  try {
    const tabs = await chrome.tabs.query({ url: SCRAPER_TAB_PATTERNS });
    for (const tab of tabs || []) {
      if (!tab?.id) continue;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['contentBridge.js']
        });
        injected += 1;
      } catch (err) {}
    }
  } catch (err) {}
  return injected;
}

/* ---------------------------------------------------------------------------
 * Site Access Verification
 * ------------------------------------------------------------------------- */

const SITE_GROUPS = [
  { id: 'search', label: 'Search engines', origins: ['https://*.bing.com/*', 'https://*.duckduckgo.com/*', 'https://*.search.brave.com/*'] },
  { id: 'maps', label: 'Maps & places (5 Markets)', origins: ['https://*.google.com/*', 'https://*.google.co.in/*', 'https://*.google.co.uk/*', 'https://*.google.com.au/*', 'https://*.google.ae/*'] },
  { id: 'directories', label: '5-Market directories', origins: ['https://*.justdial.com/*', 'https://*.indiamart.com/*', 'https://*.sulekha.com/*', 'https://*.yelp.com/*', 'https://*.yelp.com.au/*', 'https://*.yellowpages.com/*', 'https://*.yellowpages.com.au/*', 'https://*.yellowpages.ae/*', 'https://*.yell.com/*', 'https://*.cylex.us.com/*', 'https://*.cylex.co.uk/*', 'https://*.cylex.com.au/*', 'https://*.cylex.ae/*', 'https://*.freeindex.co.uk/*', 'https://*.trustpilot.com/*'] },
  { id: 'geo', label: 'Open maps data', origins: ['https://*.openstreetmap.org/*', 'https://*.overpass-api.de/*', 'https://*.wikidata.org/*'] }
];

function allOrigins() {
  return [...new Set(SITE_GROUPS.flatMap((g) => g.origins))];
}

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
 * Lifecycle & Alarms
 * ------------------------------------------------------------------------- */

async function ensureAlarms() {
  const existing = await chrome.alarms.get(HEARTBEAT_ALARM);
  if (!existing) {
    chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: HEARTBEAT_MINUTES, delayInMinutes: 0.1 });
  }
  const metricsAlarm = await chrome.alarms.get(METRICS_ALARM);
  if (!metricsAlarm) {
    chrome.alarms.create(METRICS_ALARM, { periodInMinutes: 0.1, delayInMinutes: 0.1 });
  }
}

void hydrateHardware();

chrome.runtime.onInstalled.addListener(async (details) => {
  await ensureAlarms();
  if (details.reason === 'install') {
    await patchSettings({ relayedCount: 0 });
  }
  await hydrateHardware();
  await injectIntoOpenScraperTabs();
  await heartbeat({ force: true });
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureAlarms();
  await hydrateHardware();
  await injectIntoOpenScraperTabs();
  await heartbeat({ force: true });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === HEARTBEAT_ALARM) {
    await ensureAlarms();
    await heartbeat();
  } else if (alarm.name === METRICS_ALARM) {
    refreshMetrics();
  }
});

/* ---------------------------------------------------------------------------
 * Message Bus
 * ------------------------------------------------------------------------- */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  switch (message.type) {
    case 'SCRAPER_EXT_PING':
      sendResponse({
        ok: true,
        version: EXTENSION_VERSION,
        status: 'READY',
        lanes: calculateOptimalLanes(),
        capabilities: capabilities().caps
      });
      return false;

    case 'SCRAPER_EXT_EXECUTE_TICKET': {
      const ticket = message.ticket || {};
      const run = ticket.mode === 'render' ? renderTicket(ticket) : fetchTicket(ticket);
      run.then(async (result) => {
        const settings = await getSettings();
        if (!message.fromPage) {
          const pairings = resolvePairings(settings);
          if (pairings.length) await postResult(pairings[0], ticket, result);
        }
        await recordRelayOutcome(result);
        sendResponse(result);
      });
      return true;
    }

    case 'SCRAPER_EXT_PAIR':
      pair(message.payload || {}).then(sendResponse);
      return true;

    case 'SCRAPER_EXT_UNPAIR':
      patchSettings({ serverBase: '', apiBase: '', userId: '', pairToken: '', pairings: [] })
        .then(() => sendResponse({ ok: true }));
      return true;

    case 'SCRAPER_EXT_STATE':
      (async () => {
        const [settings, sites] = await Promise.all([getSettings(), siteAccessState()]);
        if (!HARDWARE.cpuCores) await hydrateHardware();
        const pairings = resolvePairings(settings);
        const lanes = calculateOptimalLanes();
        sendResponse({
          ok: true,
          version: EXTENSION_VERSION,
          ...hardware(),
          lanes,
          capabilities: capabilities().caps,
          relayedCount: Number(settings.relayedCount) || 0,
          offlineQueuedCount: Array.isArray(settings.offlineQueue) ? settings.offlineQueue.length : 0,
          offlineQueue: Array.isArray(settings.offlineQueue) ? settings.offlineQueue : [],
          lastRelayAt: settings.lastRelayAt || '',
          lastOnlineAt: settings.lastOnlineAt || '',
          lastError: settings.lastError || '',
          offlineMode: typeof navigator !== 'undefined' ? navigator.onLine === false : false,
          paired: pairings.length > 0,
          serverBase: settings.serverBase || pairings[0]?.serverBase || '',
          pairings,
          paused: Boolean(settings.paused),
          sites,
          metrics: {
            reqPerSec: METRICS.reqPerSec,
            avgLatencyMs: METRICS.avgLatencyMs,
            activeRequests: METRICS.activeRequests,
            verifiedLeadsRouted: METRICS.verifiedLeadsRouted,
            totalBytesRelayed: METRICS.totalBytesRelayed
          }
        });
      })().catch((err) => {
        try {
          sendResponse({ ok: false, error: err?.message || 'state_failed' });
        } catch (e) {}
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

    case 'SCRAPER_EXT_EXTRACT_TAB':
      extractActiveTabOffline().then(sendResponse);
      return true;

    case 'SCRAPER_EXT_CLEAR_OFFLINE':
      patchSettings({ offlineQueue: [] }).then(() => sendResponse({ ok: true }));
      return true;

    default:
      return false;
  }
});

// Boot initialization
ensureAlarms();
injectIntoOpenScraperTabs();
