/**
 * offscreen.js — Scraper.co.in RAM Turbo Sandboxed DOM Render Engine
 * ============================================================================
 * Runs silently inside an isolated chrome.offscreen document context.
 * Enables zero-window / zero-tab DOM rendering for JS-heavy directory scraping
 * entirely using client-side RAM and V8 DOM parsing.
 * ============================================================================
 */

const MAX_BODY_BYTES = 750_000;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.target !== 'offscreen') return false;

  if (message.type === 'OFFSCREEN_RENDER_URL') {
    handleOffscreenRender(message.ticket)
      .then(sendResponse)
      .catch((err) => {
        sendResponse({
          ok: false,
          ticketId: message.ticket?.ticketId,
          error: String(err?.message || 'offscreen_render_failed')
        });
      });
    return true; // Keep sendResponse open for async resolution
  }

  return false;
});

/**
 * Render a target URL in an isolated hidden iframe inside the offscreen document.
 */
async function handleOffscreenRender(ticket) {
  const url = String(ticket?.targetUrl || '');
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, ticketId: ticket?.ticketId, error: 'invalid_target' };
  }

  const timeoutMs = Math.min(25_000, Math.max(3000, Number(ticket?.timeoutMs) || 12_000));
  const settleMs = Math.min(4000, Math.max(300, Number(ticket?.settleMs) || 1200));

  return new Promise((resolve) => {
    const sandbox = document.getElementById('render-sandbox') || document.body;
    const iframe = document.createElement('iframe');
    iframe.style.width = '1280px';
    iframe.style.height = '800px';
    iframe.style.border = '0';
    iframe.sandbox = 'allow-scripts allow-same-origin';

    let resolved = false;
    const cleanup = () => {
      try {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      } catch (e) {}
    };

    const done = (result) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      cleanup();
      resolve(result);
    };

    const timer = setTimeout(() => {
      done({
        ok: false,
        ticketId: ticket.ticketId,
        error: 'offscreen_render_timeout'
      });
    }, timeoutMs);

    iframe.onload = async () => {
      try {
        if (settleMs > 0) {
          await new Promise((r) => setTimeout(r, settleMs));
        }

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) {
          // If cross-origin iframe security prevents direct access, fetch raw HTML as fallback
          const rawFetch = await fetch(url, { credentials: 'omit', cache: 'no-store' });
          const rawText = await rawFetch.text();
          done({
            ok: true,
            ticketId: ticket.ticketId,
            status: rawFetch.status,
            contentType: rawFetch.headers.get('content-type') || 'text/html',
            rawBody: rawText.length > MAX_BODY_BYTES ? rawText.slice(0, MAX_BODY_BYTES) : rawText
          });
          return;
        }

        const html = doc.documentElement?.outerHTML || '';
        if (!html) {
          done({ ok: false, ticketId: ticket.ticketId, error: 'empty_html' });
          return;
        }

        done({
          ok: true,
          ticketId: ticket.ticketId,
          status: 200,
          contentType: 'text/html',
          rawBody: html.length > MAX_BODY_BYTES ? html.slice(0, MAX_BODY_BYTES) : html
        });
      } catch (err) {
        // Fallback to direct client-side fetch if DOM access was blocked by CSP
        try {
          const fb = await fetch(url, { credentials: 'omit', cache: 'no-store' });
          const text = await fb.text();
          done({
            ok: true,
            ticketId: ticket.ticketId,
            status: fb.status,
            contentType: fb.headers.get('content-type') || 'text/html',
            rawBody: text.length > MAX_BODY_BYTES ? text.slice(0, MAX_BODY_BYTES) : text
          });
        } catch (fbErr) {
          done({
            ok: false,
            ticketId: ticket.ticketId,
            error: String(err?.message || fbErr?.message || 'render_failed')
          });
        }
      }
    };

    iframe.onerror = (e) => {
      done({
        ok: false,
        ticketId: ticket.ticketId,
        error: 'iframe_load_error'
      });
    };

    iframe.src = url;
    sandbox.appendChild(iframe);
  });
}
