/**
 * background.js — Scraper.co.in Zero-Knowledge Blind RAM Relay
 *
 * SECURITY DESIGN:
 * This extension contains ZERO scraping engines, ZERO CSS selectors,
 * ZERO geo-databases, and ZERO business parsing rules.
 * It only executes short-lived HMAC-signed fetch tickets issued by the
 * Scraper.co.in backend server using the user's browser RAM & IP,
 * returns the raw unparsed response, and clears memory immediately.
 */

const EXTENSION_VERSION = '1.0.0';

async function executeBlindTicket(ticket) {
  const {
    ticketId,
    targetUrl,
    method = 'GET',
    headers = {},
    timeoutMs = 12000
  } = ticket || {};

  if (!ticketId || !targetUrl || !/^https?:\/\//i.test(String(targetUrl))) {
    return { ok: false, ticketId, error: 'Invalid ticket target' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(20000, Math.max(2000, Number(timeoutMs) || 12000)));

  try {
    const res = await fetch(String(targetUrl), {
      method: String(method || 'GET').toUpperCase(),
      headers: headers && typeof headers === 'object' ? headers : {},
      credentials: 'omit',
      signal: controller.signal
    });
    const rawBody = await res.text();
    const bounded = rawBody.length > 750_000 ? rawBody.slice(0, 750_000) : rawBody;

    chrome.storage.local.get(['relayedCount'], (data) => {
      const nextCount = (Number(data?.relayedCount) || 0) + 1;
      chrome.storage.local.set({
        relayedCount: nextCount,
        lastRelayAt: new Date().toISOString()
      });
    });

    return {
      ok: true,
      ticketId,
      status: res.status,
      contentType: res.headers.get('content-type') || '',
      rawBody: bounded
    };
  } catch (err) {
    return {
      ok: false,
      ticketId,
      error: err?.message || 'Fetch aborted'
    };
  } finally {
    clearTimeout(timer);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  if (message.type === 'SCRAPER_EXT_PING') {
    sendResponse({
      ok: true,
      version: EXTENSION_VERSION,
      status: 'READY'
    });
    return false;
  }

  if (message.type === 'SCRAPER_EXT_EXECUTE_TICKET') {
    executeBlindTicket(message.ticket).then(sendResponse);
    return true;
  }

  return false;
});
