/**
 * liveStream.js
 *
 * A small, dependency-free owner for the dashboard's Server-Sent-Events feed.
 *
 * Why this exists
 * ---------------
 * Both workspaces used to construct an `EventSource` by hand inside a
 * `useEffect`. That had three failure modes that all looked identical to the
 * customer — a permanent "Reconnecting to Swarm Server" banner:
 *
 *   1. The client app never reconnected at all. One `error` event and the
 *      feed stayed dead until a full page reload, while the engine was fine.
 *   2. Reconnect attempts could stack: a timer, an `online` event and a focus
 *      event could each open a socket, so a handful of tabs filled the server's
 *      stream cap and every later attempt was refused.
 *   3. A half-open TCP socket (sleep, Wi-Fi switch, proxy idle timeout) never
 *      fires `error`, so the UI said LIVE while receiving nothing. SSE
 *      comments are invisible to JavaScript, so they could not detect it.
 *
 * This helper gives every caller the same behaviour:
 *   • one socket at a time (single-flight);
 *   • exponential backoff with jitter, capped at 30 s;
 *   • a liveness watchdog driven by the server's named `heartbeat` event;
 *   • immediate reconnect when the tab becomes visible or the network returns.
 */

const MAX_BACKOFF_MS = 30000;
const SILENCE_LIMIT_MS = 45000;
const WATCHDOG_MS = 10000;

export function createLiveStream({ url, onSource, onStatus, onAttempt }) {
  let source = null;
  let retryTimer = null;
  let watchdog = null;
  let attempt = 0;
  let stopped = true;
  let lastActivity = Date.now();

  const emitStatus = status => {
    try { onStatus?.(status); } catch (e) { /* UI must never break transport */ }
  };
  const emitAttempt = count => {
    try { onAttempt?.(count); } catch (e) { /* ignore */ }
  };
  const touch = () => { lastActivity = Date.now(); };

  function closeSource() {
    if (!source) return;
    try { source.close(); } catch (e) { /* already closed */ }
    source = null;
  }

  function connect() {
    if (stopped) return;
    // Single-flight: a pending CONNECTING socket is reused, never duplicated.
    if (source && source.readyState === 0) return;
    closeSource();

    emitStatus('connecting');
    let next;
    try {
      next = new EventSource(url);
    } catch (e) {
      scheduleReconnect(false);
      return;
    }
    source = next;

    try {
      onSource?.(next, { touch, reconnect: () => scheduleReconnect(true), attempt: () => attempt });
    } catch (e) {
      console.error('Live stream listener registration failed:', e);
    }

    next.addEventListener('open', () => {
      if (stopped || source !== next) return;
      attempt = 0;
      emitAttempt(0);
      touch();
      emitStatus('open');
    });

    // Named heartbeat is visible to JavaScript; SSE comments are not.
    next.addEventListener('heartbeat', touch);

    next.addEventListener('error', () => {
      if (stopped || source !== next) return;
      emitStatus('error');
      scheduleReconnect(false);
    });
  }

  function scheduleReconnect(immediate = false) {
    if (stopped) return;
    closeSource();
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (immediate) {
      connect();
      return;
    }
    attempt += 1;
    emitAttempt(attempt);
    emitStatus('error');
    const base = Math.min(MAX_BACKOFF_MS, 1000 * Math.pow(1.6, Math.min(attempt - 1, 6)));
    const delay = Math.min(MAX_BACKOFF_MS, base) + Math.floor(Math.random() * 500);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (!stopped) connect();
    }, delay);
  }

  function wake() {
    if (stopped) return;
    // Coming back from sleep/offline: retry immediately, but never stack.
    if (!source || source.readyState === 2) scheduleReconnect(true);
  }

  function onVisibility() {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') wake();
  }

  function start() {
    if (!stopped) return;
    stopped = false;
    lastActivity = Date.now();
    connect();

    watchdog = setInterval(() => {
      if (stopped) return;
      const silentFor = Date.now() - lastActivity;
      // A stream that is OPEN but silent past the limit is a half-open pipe.
      if (silentFor > SILENCE_LIMIT_MS) {
        scheduleReconnect(true);
      }
    }, WATCHDOG_MS);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', wake);
      window.addEventListener('focus', wake);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }
  }

  function stop() {
    stopped = true;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (watchdog) {
      clearInterval(watchdog);
      watchdog = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', wake);
      window.removeEventListener('focus', wake);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibility);
    }
    closeSource();
  }

  return {
    start,
    stop,
    reconnect: () => scheduleReconnect(true),
    touch,
    get status() { return source ? source.readyState : 2; },
    get attempt() { return attempt; }
  };
}
