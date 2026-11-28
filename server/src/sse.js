'use strict';

/**
 * src/sse.js
 * Clean, lightweight Server-Sent Events (SSE) live event broadcaster.
 * Pipes real-time leads, progress pulses, and map coordinates directly to the frontend.
 */

const clients = new Set();
let telemetryTimer = null;
let telemetryProvider = null;
let lastHeartbeatAt = 0;

function ensureTelemetryLoop() {
  if (telemetryTimer || clients.size === 0 || typeof telemetryProvider !== 'function') return;
  telemetryTimer = setInterval(() => {
    if (clients.size === 0) {
      clearInterval(telemetryTimer);
      telemetryTimer = null;
      return;
    }
    try {
      const now = Date.now();
      if (typeof telemetryProvider === 'function') {
        broadcast('telemetry', telemetryProvider());
      }
      if (now - lastHeartbeatAt >= 10000) {
        lastHeartbeatAt = now;
        broadcast('heartbeat', { ts: now });
      }
    } catch (_) {}
  }, 2000);
}

function registerTelemetryProvider(fn) {
  telemetryProvider = fn;
  ensureTelemetryLoop();
}

function addClient(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const clientInfo = {
    res,
    sessionId: req.query.sessionId || req.query.session || null,
    userId: req.query.userId || null,
    isMaster: req.query.isMaster === 'true' || req.query.master === '1'
  };

  clients.add(clientInfo);
  ensureTelemetryLoop();

  // Initial connection + named heartbeat so client liveness watchdog resets immediately
  const now = Date.now();
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: now })}\n\n`);
  res.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: now })}\n\n`);
  if (typeof telemetryProvider === 'function') {
    try {
      res.write(`event: telemetry\ndata: ${JSON.stringify(telemetryProvider())}\n\n`);
    } catch (_) {}
  }

  req.on('close', () => {
    clients.delete(clientInfo);
    if (clients.size === 0 && telemetryTimer) {
      clearInterval(telemetryTimer);
      telemetryTimer = null;
    }
  });
}

function broadcast(eventType, data, audience = null) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const client of clients) {
    try {
      if (audience) {
        if (audience.sessionId && client.sessionId && client.sessionId !== audience.sessionId) continue;
        if (audience.isMaster === true && !client.isMaster) continue;
        if (audience.isMaster === false && client.isMaster) continue;
      }
      client.res.write(payload);
    } catch (_) {
      clients.delete(client);
    }
  }
}

function broadcastVendor(vendor, sessionId = null, audienceExtra = {}) {
  broadcast('vendor', {
    sessionId,
    vendor,
    status: 'running'
  }, { sessionId, ...audienceExtra });
}

function broadcastStatus(statusObj = {}, sessionId = null, audienceExtra = {}) {
  const sid = statusObj.sessionId || sessionId || null;
  broadcast('status', {
    ...statusObj,
    sessionId: sid
  }, { sessionId: sid, ...audienceExtra });
}

function broadcastProgress(progress = {}, sessionId = null, audienceExtra = {}) {
  const sid = progress.sessionId || sessionId || null;
  const status = progress.status || 'running';
  const sessionActive = status === 'running';
  const payload = {
    ...progress,
    sessionId: sid,
    status,
    sessionActive
  };
  broadcast('progress', payload, { sessionId: sid, ...audienceExtra });
  if (status === 'complete' || status === 'completed' || status === 'stopped' || status === 'error') {
    broadcastStatus(payload, sid, audienceExtra);
  }
}

function broadcastActivePoint(point, sessionId = null, audienceExtra = {}) {
  broadcast('activePoint', {
    sessionId,
    ...point
  }, { sessionId, ...audienceExtra });
}

function broadcastGridPoints(points, sessionId = null) {
  broadcast('grid_points', {
    sessionId,
    points
  });
}

module.exports = {
  addClient,
  registerTelemetryProvider,
  broadcast,
  broadcastVendor,
  broadcastStatus,
  broadcastProgress,
  broadcastActivePoint,
  broadcastGridPoints,
  // Backward compatibility alias
  broadcastEvent: broadcast
};
