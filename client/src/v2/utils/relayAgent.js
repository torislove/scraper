/**
 * relayAgent.js — the client/master half of the zero-knowledge relay.
 *
 * One singleton per tab. It:
 *   1. detects the RAM Turbo extension (DOM dataset, double-ping on wakeup)
 *   2. pairs it with this origin + explicit backend apiBase on first sight
 *   3. heartbeats every 10 s and wakes immediately on tab focus / visibility /
 *      live PONG events so once installed it stays connected silently
 *   4. backs off cleanly on failure instead of hammering
 *
 * Keeping this in one file means client and master cannot drift. Copy this
 * file verbatim between the two apps.
 */

const SOURCE = 'SCRAPER_RAM_EXTENSION';
const HEARTBEAT_MS = 10_000;
const BACKOFF_STEPS = [2000, 4000, 8000, 15_000, 30_000];
const TICKET_TIMEOUT_MS = 25_000;

let singleton = null;

function nowIso() {
  return new Date().toISOString();
}

function resolveAbsoluteApiBase(apiBase) {
  if (typeof window === 'undefined') return String(apiBase || '/api');
  try {
    return new URL(apiBase || '/api', window.location.origin).href.replace(/\/+$/, '');
  } catch (e) {
    return `${window.location.origin}/api`;
  }
}

export function detectExtension(timeoutMs = 500) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve({ installed: false, version: '', paired: false });
  }

  const dataset = document.documentElement?.dataset;
  if (dataset?.scraperExtension) {
    return Promise.resolve({
      installed: true,
      version: String(dataset.scraperExtension),
      paired: dataset.scraperExtensionPaired === '1'
    });
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      clearTimeout(secondPingTimer);
      resolve(value);
    };

    const onMessage = (event) => {
      if (event.source !== window || !event.data) return;
      if (event.data.source === SOURCE && event.data.type === 'SCRAPER_EXT_PONG') {
        finish({
          installed: true,
          version: String(event.data.version || '1.1.0'),
          paired: Boolean(event.data.paired),
          capabilities: event.data.capabilities || ['fetch']
        });
      }
    };

    const sendPing = () => {
      try {
        window.postMessage({ type: 'SCRAPER_EXT_PING' }, window.location.origin);
      } catch (error) {
        finish({ installed: false, version: '', paired: false });
      }
    };

    const timer = setTimeout(() => {
      const retry = document.documentElement?.dataset?.scraperExtension;
      finish(retry
        ? { installed: true, version: String(retry), paired: document.documentElement?.dataset?.scraperExtensionPaired === '1' }
        : { installed: false, version: '', paired: false });
    }, timeoutMs);

    // Second wakeup ping in case Chrome is mid-waking the content bridge or MV3 worker.
    const secondPingTimer = timeoutMs > 220 ? setTimeout(sendPing, 180) : null;

    window.addEventListener('message', onMessage);
    sendPing();
  });
}

export function executeTicket(ticket, timeoutMs = TICKET_TIMEOUT_MS) {
  if (typeof window === 'undefined' || !ticket?.ticketId) {
    return Promise.resolve({ ok: false, error: 'Extension bridge unavailable' });
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      resolve(value);
    };

    const onMessage = (event) => {
      if (event.source !== window || !event.data) return;
      if (
        event.data.source === SOURCE &&
        event.data.type === 'SCRAPER_EXT_TICKET_RESULT' &&
        event.data.ticketId === ticket.ticketId
      ) {
        finish(event.data.result || { ok: false, error: 'Empty extension result' });
      }
    };

    const timer = setTimeout(
      () => finish({ ok: false, ticketId: ticket.ticketId, error: 'extension_timeout' }),
      timeoutMs
    );

    window.addEventListener('message', onMessage);
    try {
      window.postMessage({ type: 'SCRAPER_EXT_EXECUTE_TICKET', ticket }, window.location.origin);
    } catch (error) {
      finish({ ok: false, ticketId: ticket.ticketId, error: String(error?.message || 'post_message_failed') });
    }
  });
}

export function pairExtension({ serverBase, apiBase, userId } = {}) {
  if (typeof window === 'undefined') return Promise.resolve({ ok: false });
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      resolve(value);
    };
    const onMessage = (event) => {
      if (event.source !== window || !event.data) return;
      if (event.data.source === SOURCE && event.data.type === 'SCRAPER_EXT_PAIR_RESULT') {
        finish(event.data.result || { ok: false });
      }
    };
    const timer = setTimeout(() => finish({ ok: false, error: 'pair_timeout' }), 6000);
    window.addEventListener('message', onMessage);
    try {
      window.postMessage(
        {
          type: 'SCRAPER_EXT_PAIR',
          serverBase: serverBase || window.location.origin,
          apiBase: resolveAbsoluteApiBase(apiBase),
          userId
        },
        window.location.origin
      );
    } catch (error) {
      finish({ ok: false, error: String(error?.message || 'post_message_failed') });
    }
  });
}

/**
 * Start the relay loop.
 *
 * @param {object} options
 * @param {string} options.apiBase        e.g. '/api'
 * @param {object} [options.headers]      auth / identity headers
 * @param {string} [options.userId]
 * @param {function} [options.onStatus]   ({ installed, connected, relayed, lastError })
 * @param {function} [options.onTicket]   (ticket) => void   observation hook
 * @returns {{stop: function, status: function, poke: function}}
 */
export function startRelayAgent(options = {}) {
  const {
    apiBase = '/api',
    headers = {},
    userId = '',
    onStatus = () => {},
    onTicket = () => {},
    intervalMs = HEARTBEAT_MS
  } = options;

  if (typeof window === 'undefined') {
    return { stop() {}, status: () => ({ installed: false }), poke() {} };
  }

  // One agent per tab: two views must never execute the same ticket twice.
  if (singleton) {
    singleton.update({ apiBase, headers, userId, onStatus, onTicket });
    return singleton;
  }

  const state = {
    installed: false,
    connected: false,
    paired: false,
    version: '',
    capabilities: [],
    relayed: 0,
    lastError: '',
    lastHeartbeatAt: null,
    running: true
  };

  let current = { apiBase, headers, userId, onStatus, onTicket, intervalMs };
  let timer = null;
  let backoffIndex = 0;
  let inFlight = false;
  let pokePending = false;

  function emit() {
    try {
      current.onStatus({ ...state });
    } catch (error) {
      // A broken listener must not stop the relay.
    }
  }

  async function heartbeatOnce() {
    if (!state.installed) {
      const detected = await detectExtension(400);
      state.installed = detected.installed;
      state.version = detected.version || state.version;
      state.capabilities = detected.capabilities?.length ? detected.capabilities : state.capabilities;
      state.paired = Boolean(detected.paired);
    }

    if (!state.installed) {
      state.connected = false;
      emit();
      return;
    }

    if (!state.paired) {
      const paired = await pairExtension({
        serverBase: window.location.origin,
        apiBase: current.apiBase,
        userId: current.userId
      });
      state.paired = Boolean(paired?.ok);
    }

    const res = await fetch(`${current.apiBase}/scrape/extension-heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-scraper-extension': state.version || '1.1.0',
        ...(current.userId ? { 'x-user-id': current.userId } : {}),
        ...current.headers
      },
      body: JSON.stringify({
        installed: true,
        version: state.version || '1.1.0',
        capabilities: state.capabilities,
        ramGb: Number(navigator.deviceMemory) || 8,
        cpuCores: Number(navigator.hardwareConcurrency) || 6
      })
    });

    if (!res.ok) throw new Error(`heartbeat_http_${res.status}`);

    const data = await res.json();
    state.connected = Boolean(data?.connected);
    state.lastHeartbeatAt = nowIso();
    state.lastError = '';
    emit();

    const tickets = Array.isArray(data?.tickets) ? data.tickets : [];
    const devRam = Number(navigator.deviceMemory) || 8;
    const devCores = Number(navigator.hardwareConcurrency) || 6;
    const relayConcurrency = devRam <= 4 || devCores <= 2 ? 3 : (devCores >= 12 ? 12 : (devCores >= 8 ? 8 : 5));
    for (let i = 0; i < tickets.length; i += relayConcurrency) {
      if (!state.running) break;
      const chunk = tickets.slice(i, i + relayConcurrency);
      await Promise.allSettled(chunk.map(async (ticket) => {
        if (!state.running) return;
        try {
          current.onTicket(ticket);
        } catch (error) {
          // observer only
        }
        const result = await executeTicket(ticket);
        await fetch(`${current.apiBase}/scrape/relay-result`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(current.userId ? { 'x-user-id': current.userId } : {}),
            ...current.headers
          },
          body: JSON.stringify({
            ticketId: ticket.ticketId,
            signature: ticket.signature,
            ...result
          })
        }).catch(() => {});
        if (result?.ok) state.relayed += 1;
        else state.lastError = String(result?.error || 'relay_failed');
      }));
    }
    emit();
  }

  function schedule(delay) {
    if (timer) clearTimeout(timer);
    if (!state.running) return;
    timer = setTimeout(tick, delay);
  }

  async function tick() {
    if (!state.running) return;
    if (inFlight) {
      pokePending = true;
      return;
    }
    inFlight = true;
    pokePending = false;
    try {
      await heartbeatOnce();
      backoffIndex = 0;
    } catch (error) {
      state.lastError = String(error?.message || 'relay_failed');
      state.connected = false;
      emit();
      const wait = BACKOFF_STEPS[Math.min(backoffIndex, BACKOFF_STEPS.length - 1)];
      backoffIndex += 1;
      schedule(wait);
      return;
    } finally {
      inFlight = false;
    }
    schedule(pokePending ? 150 : current.intervalMs);
  }

  // Instant wakeup when extension is newly loaded, or tab regains focus.
  const onWindowMessage = (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.source !== SOURCE) return;
    if (event.data.type === 'SCRAPER_EXT_PONG' || event.data.type === 'SCRAPER_EXT_STATE') {
      const s = event.data.state || event.data;
      const wasInstalled = state.installed;
      state.installed = true;
      if (s?.version) state.version = String(s.version);
      if (Array.isArray(s?.capabilities) && s.capabilities.length) state.capabilities = s.capabilities;
      if (s?.paired !== undefined) state.paired = Boolean(s.paired);
      if (!wasInstalled || !state.connected) {
        emit();
        singleton?.poke();
      }
    }
  };

  const onFocusOrVisible = () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      window.postMessage({ type: 'SCRAPER_EXT_PING' }, window.location.origin);
    } catch (e) {}
    singleton?.poke();
  };

  window.addEventListener('message', onWindowMessage);
  window.addEventListener('focus', onFocusOrVisible);
  document.addEventListener('visibilitychange', onFocusOrVisible);

  singleton = {
    update(next = {}) {
      current = { ...current, ...next };
      emit();
    },
    stop() {
      state.running = false;
      if (timer) clearTimeout(timer);
      timer = null;
      window.removeEventListener('message', onWindowMessage);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
      singleton = null;
    },
    status() {
      return { ...state };
    },
    poke() {
      if (timer) clearTimeout(timer);
      schedule(0);
    }
  };

  tick();
  return singleton;
}

export function getRelayAgent() {
  return singleton;
}
