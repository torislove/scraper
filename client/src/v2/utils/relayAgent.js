/**
 * relayAgent.js — the client/master half of the zero-knowledge relay.
 *
 * One singleton per tab. It:
 *   1. detects the RAM Turbo extension (dataset flag, then a ping)
 *   2. pairs it with this origin the first time it is seen
 *   3. heartbeats every 10 s and executes every ticket the server hands back
 *   4. backs off on failure instead of hammering
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

export function detectExtension(timeoutMs = 400) {
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

    const timer = setTimeout(() => {
      const retry = document.documentElement?.dataset?.scraperExtension;
      finish(retry
        ? { installed: true, version: String(retry), paired: document.documentElement?.dataset?.scraperExtensionPaired === '1' }
        : { installed: false, version: '', paired: false });
    }, timeoutMs);

    window.addEventListener('message', onMessage);
    try {
      window.postMessage({ type: 'SCRAPER_EXT_PING' }, '*');
    } catch (error) {
      finish({ installed: false, version: '', paired: false });
    }
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
      window.postMessage({ type: 'SCRAPER_EXT_EXECUTE_TICKET', ticket }, '*');
    } catch (error) {
      finish({ ok: false, ticketId: ticket.ticketId, error: String(error?.message || 'post_message_failed') });
    }
  });
}

export function pairExtension({ serverBase, userId } = {}) {
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
          userId
        },
        '*'
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

  function emit() {
    try {
      current.onStatus({ ...state });
    } catch (error) {
      // A broken listener must not stop the relay.
    }
  }

  async function heartbeatOnce() {
    if (!state.installed) {
      const detected = await detectExtension(300);
      state.installed = detected.installed;
      state.version = detected.version || '';
      state.capabilities = detected.capabilities || [];
      state.paired = Boolean(detected.paired);

      if (state.installed && !state.paired) {
        const paired = await pairExtension({
          serverBase: window.location.origin,
          userId: current.userId
        });
        state.paired = Boolean(paired?.ok);
      }
      if (!state.installed) {
        state.connected = false;
        emit();
        return;
      }
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
    for (const ticket of tickets) {
      if (!state.running) break;
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
    }
    emit();
  }

  async function tick() {
    if (!state.running || inFlight) return;
    inFlight = true;
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
    schedule(current.intervalMs);
  }

  function schedule(delay) {
    if (timer) clearTimeout(timer);
    if (!state.running) return;
    timer = setTimeout(tick, delay);
  }

  singleton = {
    update(next = {}) {
      current = { ...current, ...next };
    },
    stop() {
      state.running = false;
      if (timer) clearTimeout(timer);
      timer = null;
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
