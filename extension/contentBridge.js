/**
 * contentBridge.js — Lightweight Handshake Bridge for Scraper.co.in
 *
 * Announces extension presence to the Scraper.co.in page (0ms detection)
 * and forwards opaque signed fetch tickets between the Command Center and
 * the background service worker.
 */

(function initScraperBridge() {
  const VERSION = '1.0.0';
  const SOURCE = 'SCRAPER_RAM_EXTENSION';

  function announceReady() {
    try {
      if (document.documentElement) {
        document.documentElement.dataset.scraperExtension = VERSION;
      }
      window.postMessage(
        {
          source: SOURCE,
          type: 'SCRAPER_EXT_PONG',
          version: VERSION,
          status: 'READY'
        },
        '*'
      );
    } catch (e) {}
  }

  announceReady();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', announceReady, { once: true });
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || typeof event.data !== 'object') return;
    const msg = event.data;
    if (msg.source === SOURCE) return;

    if (msg.type === 'SCRAPER_EXT_PING') {
      announceReady();
      return;
    }

    if (msg.type === 'SCRAPER_EXT_EXECUTE_TICKET' && msg.ticket) {
      chrome.runtime.sendMessage(
        { type: 'SCRAPER_EXT_EXECUTE_TICKET', ticket: msg.ticket },
        (result) => {
          const payload = chrome.runtime.lastError
            ? { ok: false, ticketId: msg.ticket?.ticketId, error: chrome.runtime.lastError.message }
            : result;
          window.postMessage(
            {
              source: SOURCE,
              type: 'SCRAPER_EXT_TICKET_RESULT',
              ticketId: msg.ticket?.ticketId,
              result: payload
            },
            '*'
          );
        }
      );
    }
  });
})();
