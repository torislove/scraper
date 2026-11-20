'use strict';

/**
 * liveStreams.js
 *
 * One owner for every Server-Sent-Events connection the engine serves.
 *
 * The previous implementation kept a plain array of `res` objects and removed
 * a client only from `req.on('close')`. That is not enough:
 *
 *   â€¢ a half-open socket (laptop sleep, Wi-Fi switch, killed tab, crashed
 *     browser process) can stop delivering data without ever emitting `close`;
 *   â€¢ `res.write()` on such a socket does not throw, it just buffers, so the
 *     array kept growing and those ghost rows counted against the 25-stream
 *     cap;
 *   â€¢ once the cap was reached the endpoint answered `503`, which the browser
 *     reports as a generic EventSource error. The dashboard then retried
 *     forever â€” the "Reconnectingâ€¦ Attempt #473" banner â€” even though the
 *     engine was perfectly healthy.
 *
 * This module fixes the class of bug rather than the symptom:
 *   â€“ every socket is tracked with lifecycle events on both req and res;
 *   â€“ dead / ended / erroring sockets are pruned on every heartbeat;
 *   â€“ a slow consumer is dropped once its write buffer passes a ceiling;
 *   â€“ the caps evict the *oldest* stream instead of rejecting the newest, so a
 *     live dashboard can always reattach;
 *   â€“ a named `heartbeat` event is emitted every 15 s so the browser can prove
 *     the pipe is alive (SSE comments are invisible to JavaScript, which is why
 *     a frozen stream used to look "LIVE" forever);
 *   â€“ `retry: 5000` tells the browser how to space its own reconnects.
 */

const HEARTBEAT_MS = 2500;
function LiveStreams_accepts(client, audience) { return LiveStreamHub.viewerAccepts(client, audience); }
const MAX_LOG_STREAMS = 40;
const MAX_SESSION_STREAMS = 80;
const MAX_VIEWERS_PER_SESSION = 10;
const MAX_BUFFERED_BYTES = 2 * 1024 * 1024;

let nextId = 1;

class LiveStreamHub {
  constructor() {
    this.logClients = new Map();
    this.sessionClients = new Map();
    this.droppedTotal = 0;
    this.lastDropReason = null;
    this.heartbeat = setInterval(() => this.heartbeatTick(), HEARTBEAT_MS);
    if (typeof this.heartbeat.unref === 'function') this.heartbeat.unref();
  }

  /* ------------------------------------------------------------------ */
  /* socket plumbing                                                     */
  /* ------------------------------------------------------------------ */

  _makeClient(req, res, kind) {
    const client = {
      id: nextId++,
      kind,
      res,
      since: Date.now(),
      alive: true,
      pingedAt: Date.now()
    };

    res.status(200);
    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Cache-Control'
    });
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    // A dashboard stream is intentionally idle between events. Disable the
    // socket timeout and enable TCP keep-alive so the OS and any local proxy
    // notice a dead peer instead of holding a zombie socket for hours.
    try {
      if (res.socket) {
        res.socket.setTimeout(0);
        res.socket.setNoDelay(true);
        res.socket.setKeepAlive(true, 20000);
      }
    } catch (e) { /* socket already gone */ }

    const cleanup = () => this._drop(client, 'client_closed');
    req.on('close', cleanup);
    req.on('aborted', cleanup);
    req.on('error', cleanup);
    res.on('close', cleanup);
    res.on('error', cleanup);

    // Tell EventSource how long to wait before its own reconnect attempt.
    this._write(client, 'retry: 3000\n\n');
    this._write(client, `event: heartbeat\ndata: ${JSON.stringify({ t: Date.now(), streams: this.logClients.size + 1 })}\n\n`);
    return client;
  }

  _write(client, frame) {
    if (!client || !client.alive) return false;
    const res = client.res;
    if (res.writableEnded || res.destroyed) {
      this._drop(client, 'socket_gone');
      return false;
    }
    try {
      res.write(frame);
      if (typeof res.writableLength === 'number' && res.writableLength > MAX_BUFFERED_BYTES) {
        this._drop(client, 'slow_client');
        return false;
      }
      return true;
    } catch (e) {
      this._drop(client, 'write_error');
      return false;
    }
  }

  _drop(client, reason) {
    if (!client || !client.alive) return;
    client.alive = false;
    this.droppedTotal += 1;
    this.lastDropReason = reason;
    try { client.res.end(); } catch (e) { /* already closed */ }

    if (client.kind === 'log') {
      this.logClients.delete(client.id);
    } else if (client.sessionId) {
      const viewers = this.sessionClients.get(client.sessionId);
      if (viewers) {
        viewers.delete(client.id);
        if (!viewers.size) this.sessionClients.delete(client.sessionId);
      }
    }
  }

  _prune() {
    for (const client of Array.from(this.logClients.values())) {
      if (client.res.writableEnded || client.res.destroyed) this._drop(client, 'pruned');
    }
    for (const [sessionId, viewers] of Array.from(this.sessionClients.entries())) {
      for (const client of Array.from(viewers.values())) {
        if (client.res.writableEnded || client.res.destroyed) this._drop(client, 'pruned');
      }
      if (!viewers.size) this.sessionClients.delete(sessionId);
    }
  }

  _evictOldest(map) {
    let oldest = null;
    for (const client of map.values()) {
      if (!oldest || client.since < oldest.since) oldest = client;
    }
    if (oldest) this._drop(oldest, 'cap_evicted');
  }

  heartbeatTick() {
    this._prune();
    const frame = `event: heartbeat\ndata: ${JSON.stringify({ t: Date.now(), streams: this.logClients.size })}\n\n`;
    for (const client of this.logClients.values()) {
      client.pingedAt = Date.now();
      this._write(client, frame);
    }
    const sessionFrame = `event: heartbeat\ndata: ${JSON.stringify({ t: Date.now(), sessions: this.sessionClients.size })}\n\n`;
    for (const viewers of this.sessionClients.values()) {
      for (const client of viewers.values()) this._write(client, sessionFrame);
    }
  }

  /* ------------------------------------------------------------------ */
  /* public API                                                          */
  /* ------------------------------------------------------------------ */

  attachLog(req, res, initialLogs = [], viewer = {}) {
    this._prune();
    while (this.logClients.size >= MAX_LOG_STREAMS) {
      const before = this.logClients.size;
      this._evictOldest(this.logClients);
      if (this.logClients.size === before) break;
    }

    const client = this._makeClient(req, res, 'log');
    const scope = String(viewer?.scope || 'all').toLowerCase();
    client.scope = ['master', 'client'].includes(scope) ? scope : 'all';
    client.userId = String(viewer?.userId || '').trim();
    this.logClients.set(client.id, client);

    // First frame is the console backlog, exactly as before.
    // Scoped viewers get no shared backlog: it mixes every workspace's lines.
    const backlog = JSON.stringify(client.scope === 'all' && Array.isArray(initialLogs) ? initialLogs : []);
    this._write(client, `event: init\ndata: ${backlog}\n\n`);
    return client;
  }

  attachSession(req, res, sessionId) {
    this._prune();
    let viewers = this.sessionClients.get(sessionId);
    if (!viewers) {
      viewers = new Map();
      this.sessionClients.set(sessionId, viewers);
    }

    while (viewers.size >= MAX_VIEWERS_PER_SESSION) {
      const before = viewers.size;
      this._evictOldest(viewers);
      if (viewers.size === before) break;
    }

    let total = 0;
    for (const set of this.sessionClients.values()) total += set.size;
    while (total >= MAX_SESSION_STREAMS) {
      let oldest = null;
      for (const set of this.sessionClients.values()) {
        for (const c of set.values()) {
          if (!oldest || c.since < oldest.since) oldest = c;
        }
      }
      if (!oldest) break;
      this._drop(oldest, 'cap_evicted');
      total = 0;
      for (const set of this.sessionClients.values()) total += set.size;
    }

    const client = this._makeClient(req, res, 'session');
    client.sessionId = sessionId;
    // Register before the first named frame: if anything below throws, the
    // socket is already tracked and will be pruned instead of hanging forever
    // with an open connection that no dashboard can see.
    viewers.set(client.id, client);

    this._write(client, `event: connected\ndata: ${JSON.stringify({ sessionId, status: 'listening' })}\n\n`);
    return client;
  }

  /**
   * Audience routing. `audience` is `{ isMaster, userId }` for an event that
   * belongs to one run, or null/undefined for system frames that everyone
   * sees. Master viewers receive only master-owned runs; client viewers
   * receive only their own user's runs. Viewers that did not declare a scope
   * ('all') keep the legacy behaviour. This is routing, not an auth boundary.
   */
  static viewerAccepts(client, audience) {
    if (!audience) return true;
    if (!client || client.scope === 'all') return true;
    if (client.scope === 'master') return audience.isMaster === true;
    const uid = client.userId || 'anonymous';
    const owner = String(audience.userId || 'anonymous');
    if (audience.isMaster === true) return false;
    if (uid === 'anonymous') return owner === 'anonymous' || owner === '';
    return owner === uid;
  }

  _writeAudience(frame, audience) {
    for (const client of this.logClients.values()) {
      if (LiveStreamHub.viewerAccepts(client, audience)) this._write(client, frame);
    }
  }

  /** Pre-formatted frame to every global log stream (used for batching). */
  broadcastRaw(frame, audience = null) {
    if (!frame) return;
    this._writeAudience(frame, audience);
  }

  /** Raw console line for the global log stream (`onmessage`). */
  broadcastLogLine(line, audience = null) {
    if (!line) return;
    const safe = String(line).replace(/\n/g, '\\n');
    this._writeAudience(`data: ${safe}\n\n`, audience);
  }

  /** Named event for the global log stream. */
  broadcastEvent(eventName, payload, audience = null) {
    let data;
    try {
      data = JSON.stringify(payload).replace(/\n/g, '\\n');
    } catch (e) {
      return;
    }
    const frame = `event: ${eventName}\ndata: ${data}\n\n`;
    this._writeAudience(frame, audience);
    const sid = payload && (payload.sessionId || (Array.isArray(payload) && payload[0] && payload[0].sessionId));
    if (sid) this._writeSession(sid, frame);
  }

  _writeSession(sessionId, frame) {
    const viewers = this.sessionClients.get(sessionId);
    if (!viewers) return;
    for (const client of viewers.values()) this._write(client, frame);
  }

  /** Raw console line tagged with its run, also delivered to session viewers. */
  broadcastSessionLine(sessionId, line) {
    if (!sessionId || !line) return;
    const safe = String(line).replace(/\n/g, '\\n');
    this._writeSession(sessionId, `data: ${safe}\n\n`);
  }

  /**
   * Batched vendor rows: one frame per global viewer that is allowed to see
   * each row, and one per session that actually owns at least one row.
   * `audienceOf(vendor)` returns `{ isMaster, userId }` or null.
   */
  broadcastVendorBatch(entries, belongsToSession, audienceOf = null) {
    if (!Array.isArray(entries) || !entries.length) return;
    const audiences = entries.map(entry => (typeof audienceOf === 'function' ? audienceOf(entry.vendor) : null));
    for (const client of this.logClients.values()) {
      let frame = '';
      for (let i = 0; i < entries.length; i += 1) {
        if (LiveStreams_accepts(client, audiences[i])) frame += `event: vendor\ndata: ${entries[i].data}\n\n`;
      }
      if (frame) this._write(client, frame);
    }

    if (typeof belongsToSession !== 'function') return;
    for (const [sessionId, viewers] of this.sessionClients.entries()) {
      const frame = entries
        .filter(entry => belongsToSession(entry.vendor, sessionId))
        .map(entry => `event: vendor\ndata: ${entry.data}\n\n`)
        .join('');
      if (!frame) continue;
      for (const client of viewers.values()) this._write(client, frame);
    }
  }
  health() {
    let sessionStreams = 0;
    for (const viewers of this.sessionClients.values()) sessionStreams += viewers.size;
    return {
      logStreams: this.logClients.size,
      logStreamCap: MAX_LOG_STREAMS,
      sessionStreams,
      sessionCap: MAX_SESSION_STREAMS,
      droppedTotal: this.droppedTotal,
      lastDropReason: this.lastDropReason
    };
  }
}

module.exports = new LiveStreamHub();
