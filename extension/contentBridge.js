/**
 * contentBridge.js — page ⇄ extension bridge for Scraper.co.in
 * ============================================================================
 * Runs at document_start on Scraper.co.in only (or injected immediately into
 * already-open tabs via `chrome.scripting.executeScript` when installed).
 *
 * It does three mechanical jobs:
 *   1. announces the extension to the page instantly (zero refresh needed)
 *   2. forwards opaque signed tickets from the page to the service worker
 *   3. pushes live extension state (paired, relayed count, capabilities)
 *
 * Guarded against double-injection so re-running it in an active tab simply
 * re-announces and refreshes state with zero duplicate listeners.
 * ============================================================================
 */

(function initScraperBridge() {
  if (typeof window.__SCRAPER_BRIDGE_ANNOUNCE__ === 'function') {
    window.__SCRAPER_BRIDGE_ANNOUNCE__();
    return;
  }

  const SOURCE = 'SCRAPER_RAM_EXTENSION';
  let lastState = null;

  function post(payload) {
    try {
      window.postMessage({ source: SOURCE, ...payload }, window.location.origin);
    } catch (error) {
      // A page that has not finished loading can throw; ignore.
    }
  }

  function stampDom(version, paired) {
    try {
      if (document.documentElement) {
        document.documentElement.dataset.scraperExtension = version;
        document.documentElement.dataset.scraperExtensionPaired = paired ? '1' : '0';
      }
    } catch (error) {
      // documentElement can be null very early.
    }
  }

  function announce(state) {
    const version = state?.version || lastState?.version || '1.1.0';
    const paired = Boolean(state?.paired ?? lastState?.paired);
    stampDom(version, paired);
    post({
      type: 'SCRAPER_EXT_PONG',
      version,
      status: 'READY',
      capabilities: state?.capabilities || ['fetch'],
      paired,
      relayedCount: Number(state?.relayedCount) || 0
    });
    if (state) post({ type: 'SCRAPER_EXT_STATE', state });
  }

  function askBackground(type, payload) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type, ...payload }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(response || { ok: false, error: 'empty_response' });
        });
      } catch (error) {
        resolve({ ok: false, error: String(error?.message || 'send_failed') });
      }
    });
  }

  async function refreshState() {
    const state = await askBackground('SCRAPER_EXT_STATE');
    if (state?.ok) {
      lastState = state;
      announce(state);
    }
    return state;
  }

  async function autoPair(serverBase, userId, apiBase) {
    const origin = serverBase || window.location.origin;
    if (!origin) return { ok: false, error: 'no_server_base' };
    const resolvedApi = apiBase || `${origin.replace(/\/+$/, '')}/api`;
    const uid = String(userId || '');

    const current = await askBackground('SCRAPER_EXT_STATE');
    const alreadyInPairings = Array.isArray(current?.pairings)
      ? current.pairings.some((p) => p.apiBase === resolvedApi && String(p.userId || '') === uid)
      : (current?.paired && current?.serverBase === origin);

    if (current?.ok && alreadyInPairings) {
      return { ok: true, alreadyPaired: true };
    }

    const result = await askBackground('SCRAPER_EXT_PAIR', {
      payload: { serverBase: origin, apiBase: resolvedApi, userId: uid }
    });
    if (result?.ok) await refreshState();
    return result;
  }

  window.__SCRAPER_BRIDGE_ANNOUNCE__ = () => {
    announce(lastState);
    refreshState();
  };

  // ---- boot ---------------------------------------------------------------
  announce(null);
  refreshState();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => announce(lastState), { once: true });
  }

  window.addEventListener('pageshow', () => announce(lastState));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) announce(lastState);
  });

  // Keep the dataset flag intact across worker wakes or DOM resets.
  setInterval(() => {
    if (!document.documentElement?.dataset?.scraperExtension) {
      announce(lastState);
    }
  }, 5000);

  // ---- page → extension ---------------------------------------------------
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || typeof event.data !== 'object') return;
    const msg = event.data;
    if (msg.source === SOURCE) return;

    switch (msg.type) {
      case 'SCRAPER_EXT_PING':
        announce(lastState);
        if (!lastState) refreshState();
        break;

      case 'SCRAPER_EXT_GET_STATE':
        refreshState();
        break;

      case 'SCRAPER_EXT_PAIR':
        autoPair(msg.serverBase, msg.userId, msg.apiBase).then((result) => {
          post({ type: 'SCRAPER_EXT_PAIR_RESULT', result });
        });
        break;

      case 'SCRAPER_EXT_EXECUTE_TICKET':
        if (!msg.ticket) break;
        askBackground('SCRAPER_EXT_EXECUTE_TICKET', {
          ticket: msg.ticket,
          fromPage: true
        }).then((result) => {
          post({
            type: 'SCRAPER_EXT_TICKET_RESULT',
            ticketId: msg.ticket.ticketId,
            result
          });
        });
        break;

      default:
        break;
    }
  });
})();
