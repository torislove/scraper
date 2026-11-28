/**
 * shared/utils/extensionBridge.js
 * Browser Extension Detection & Blind Ticket Execution Bridge.
 */

export const EXTENSION_DOWNLOAD_URL = '/api/scrape/extension-download';
export const EXTENSION_STORE_URL = String(import.meta.env.VITE_EXTENSION_STORE_URL || '').trim();

export function detectRamExtension(timeoutMs = 500) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve({ installed: false, version: '' });
  }
  const datasetVer = document.documentElement?.dataset?.scraperExtension;
  const attrInstalled = document.documentElement?.getAttribute('data-scraper-ext-installed') === 'true';
  if (datasetVer || attrInstalled) {
    return Promise.resolve({ installed: true, version: String(datasetVer || '2.0.0') });
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (val) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMsg);
      clearTimeout(timer);
      resolve(val);
    };
    const onMsg = (event) => {
      if (event.source !== window || !event.data) return;
      if (event.data.source === 'SCRAPER_RAM_EXTENSION' && event.data.type === 'SCRAPER_EXT_PONG') {
        finish({ installed: true, version: String(event.data.version || '2.0.0') });
      }
    };
    const timer = setTimeout(() => {
      const retryVer = document.documentElement?.dataset?.scraperExtension;
      finish(retryVer ? { installed: true, version: String(retryVer) } : { installed: false, version: '' });
    }, timeoutMs);
    window.addEventListener('message', onMsg);
    try {
      window.postMessage({ type: 'SCRAPER_EXT_PING' }, '*');
    } catch (_) {
      finish({ installed: false, version: '' });
    }
  });
}

export function executeBlindTicketInExtension(ticket, timeoutMs = 15000) {
  if (typeof window === 'undefined' || !ticket?.ticketId) {
    return Promise.resolve({ ok: false, error: 'Extension bridge unavailable' });
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (res) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMsg);
      clearTimeout(timer);
      resolve(res);
    };
    const onMsg = (event) => {
      if (event.source !== window || !event.data) return;
      if (
        event.data.source === 'SCRAPER_RAM_EXTENSION' &&
        event.data.type === 'SCRAPER_EXT_TICKET_RESULT' &&
        event.data.ticketId === ticket.ticketId
      ) {
        finish(event.data.result || { ok: false, error: 'Empty extension result' });
      }
    };
    const timer = setTimeout(() => finish({ ok: false, ticketId: ticket.ticketId, error: 'Extension timeout' }), timeoutMs);
    window.addEventListener('message', onMsg);
    try {
      window.postMessage({ type: 'SCRAPER_EXT_EXECUTE_TICKET', ticket }, '*');
    } catch (e) {
      finish({ ok: false, ticketId: ticket.ticketId, error: e?.message || 'PostMessage failed' });
    }
  });
}
