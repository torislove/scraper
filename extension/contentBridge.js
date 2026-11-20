/**
 * contentBridge.js — page ⇄ extension bridge for Scraper.co.in
 * ============================================================================
 * Runs at document_start on Scraper.co.in only. It does three things:
 *
 *   1. announces the extension to the page instantly (no refresh needed)
 *   2. forwards opaque signed tickets from the page to the service worker
 *   3. pushes live extension state (paired, relayed count, capabilities)
 *
 * It never reads page content, never inspects the DOM beyond setting one
 * dataset flag, and never touches localStorage.
 * ============================================================================
 */

(function initScraperBridge() {
  const SOURCE = 'SCRAPER_RAM_EXTENSION';
  const PAGE_SOURCE = 'SCRAPER_PAGE';

  let lastState = null;

  function post(payload) {
    try {
      window.postMessage({ source: SOURCE, ...payload }, window.location.origin);
    } catch (error) {
      // A page that has not finished loading can throw; ignore.
    }
  }

  function announce(state) {
    const version = state?.version || lastState?.version || '1.1.0';
    try {
      if (document.documentElement) {
        document.documentElement.dataset.scraperExtension = version;
        document.documentElement.dataset.scraperExtensionPaired = state?.paired ? '1' : '0';
      }
    } catch (error) {
      // documentElement can be null very early.
    }
    post({
      type: 'SCRAPER_EXT_PONG',
      version,
      status: 'READY',
      capabilities: state?.capabilities || ['fetch'],
      paired: Boolean(state?.paired),
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

  async function autoPair(serverBase, userId) {
    if (!serverBase) return { ok: false, error: 'no_server_base' };
    const current = await askBackground('SCRAPER_EXT_STATE');
    if (current?.ok && current.paired && current.serverBase === serverBase) {
      return { ok: true, alreadyPaired: true };
    }
    const result = await askBackground('SCRAPER_EXT_PAIR', {
      payload: { serverBase, userId }
    });
    if (result?.ok) await refreshState();
    return result;
  }

  // ---- boot ---------------------------------------------------------------
  announce(null);
  refreshState();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => announce(lastState), { once: true });
  }

  // Keep the dataset flag honest if the worker restarts.
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
        break;

      case 'SCRAPER_EXT_GET_STATE':
        refreshState();
        break;

      case 'SCRAPER_EXT_PAIR':
        autoPair(msg.serverBase, msg.userId).then((result) => {
          post({ type: 'SCRAPER_EXT_PAIR_RESULT', result });
        });
        break;

      case 'SCRAPER_EXT_EXECUTE_TICKET':
        if (!msg.ticket) break;
        askBackground('SCRAPER_EXT_EXECUTE_TICKET', { ticket: msg.ticket }).then((result) => {
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

  // The page may declare who it is; pair once, silently.
  if (window.location.hostname.endsWith('scraper.co.in') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setTimeout(() => {
      const serverBase = window.location.origin;
      const probe = window.__SCRAPER_USER_ID__;
      if (probe) autoPair(serverBase, probe);
    }, 1200);
  }
})();
