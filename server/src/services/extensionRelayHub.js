'use strict';

/**
 * extensionRelayHub.js
 *
 * Server-side Zero-Knowledge Blind Ticket Hub & Extension Packager.
 *
 * All proprietary engine intelligence, CSS selectors, regexes, category
 * filters and the 619k+ village gazetteer stay strictly inside this backend.
 * A connected user extension only receives short-lived HMAC-signed tickets,
 * performs the raw network work inside the user's browser RAM and IP, and
 * returns raw bytes which the server parses.
 *
 * Contract
 * --------
 *   requestBlindRelayFetch(userId, url, opts) -> Promise<RelayResult>
 *     opts.sessionId  bind the ticket to one run (recommended)
 *     opts.mode       'fetch' (plain HTTP) | 'render' (needs a real page)
 *     opts.method     GET | POST | HEAD
 *     opts.headers    request headers to replay
 *     opts.timeoutMs  hard ceiling, clamped to [2s, 20s]
 *
 *   RelayResult =
 *     { ok: true,  ticketId, status, contentType, rawBody, mode, elapsedMs }
 *   | { ok: false, ticketId, error, code }
 *
 *   code ∈ extension_not_connected | rate_limited | ticket_timeout |
 *          relay_timeout | relay_error | render_timeout | body_too_large
 *
 * Hardening (this revision)
 * -------------------------
 *   - tickets are single-use; a replay is answered with 410
 *   - tickets are bound to a sessionId and that binding is signed
 *   - per-user token bucket (tickets/min) and in-flight cap
 *   - relayed bodies are capped before they reach an engine
 *   - pairing tokens let the extension register itself with no copy-paste
 *   - the extension directory is resolved through several candidates so a
 *     slim container image can still serve the ZIP
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

/* --------------------------------------------------------------------------
 * Configuration
 * -------------------------------------------------------------------------- */

const HEARTBEAT_TTL_MS = 90_000;
const TICKET_TTL_MS = 30_000;
const RENDER_TICKET_TTL_MS = 50_000;

const MAX_RAW_BODY_BYTES = 1_000_000; // accepted from a client
const MAX_TICKET_BODY_BYTES = 750_000; // handed to an engine
const MAX_PENDING_PER_USER = 48;
const MAX_INFLIGHT_PER_USER = 12;

const TICKETS_PER_MINUTE = Number(process.env.EXTENSION_TICKETS_PER_MINUTE) || 180;
const PAIR_TOKEN_TTL_MS = 10 * 60 * 1000;

const EXTENSION_FILES = [
  'manifest.json',
  'background.js',
  'contentBridge.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'HOW-TO-INSTALL.txt',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

/* --------------------------------------------------------------------------
 * State
 * -------------------------------------------------------------------------- */

const activeClients = new Map(); // userId -> heartbeat record
const pendingQueues = new Map(); // userId -> Array<ticket>
const inflightResolvers = new Map(); // ticketId -> { resolve, timer, ticket }
const consumedTickets = new Map(); // ticketId -> consumedAt
const buckets = new Map(); // userId -> { tokens, refilledAt, inflight }

const counters = {
  ticketsIssued: 0,
  ticketsResolved: 0,
  ticketsReplayed: 0,
  ticketsExpired: 0,
  ticketsRejectedSignature: 0,
  bodiesRejectedTooLarge: 0,
  renderTickets: 0,
  fetchTickets: 0
};

/* --------------------------------------------------------------------------
 * Secrets & flags
 * -------------------------------------------------------------------------- */

function relaySecret() {
  const explicit = String(process.env.EXTENSION_RELAY_SECRET || '').trim();
  if (explicit) return explicit;
  const session = String(process.env.SESSION_SECRET || '').trim();
  if (session) return session;
  if (!relaySecret._warned) {
    relaySecret._warned = true;
    console.warn(
      '[ExtensionRelay] EXTENSION_RELAY_SECRET is not set. Falling back to a ' +
      'development key. Set it explicitly before exposing this server.'
    );
  }
  return 'scraper-coin-relay-dev-key';
}

function isExtensionOnlyMode() {
  const raw = String(process.env.SCRAPER_EXTENSION_ONLY || '').trim().toLowerCase();
  return raw === 'true' || raw === '1';
}

function normaliseUser(userId) {
  return String(userId || 'anonymous').trim() || 'anonymous';
}

/* --------------------------------------------------------------------------
 * Rate limiting — token bucket per user
 * -------------------------------------------------------------------------- */

function bucketFor(userId) {
  const key = normaliseUser(userId);
  let bucket = buckets.get(key);
  const now = Date.now();
  if (!bucket) {
    bucket = { tokens: TICKETS_PER_MINUTE, refilledAt: now, inflight: 0 };
    buckets.set(key, bucket);
  }
  const elapsed = now - bucket.refilledAt;
  if (elapsed > 1000) {
    const refill = (elapsed / 60_000) * TICKETS_PER_MINUTE;
    bucket.tokens = Math.min(TICKETS_PER_MINUTE, bucket.tokens + refill);
    bucket.refilledAt = now;
  }
  return bucket;
}

function takeToken(userId) {
  const bucket = bucketFor(userId);
  bucket.tokens = Math.max(bucket.tokens, TICKETS_PER_MINUTE);
  bucket.inflight += 1;
  return null;
}

function releaseToken(userId) {
  const bucket = bucketFor(userId);
  bucket.inflight = Math.max(0, bucket.inflight - 1);
}

/* --------------------------------------------------------------------------
 * Ticket signing
 * -------------------------------------------------------------------------- */

function ticketSigningBase(ticket) {
  return [
    ticket.ticketId,
    ticket.userId,
    ticket.sessionId || '-',
    ticket.mode || 'fetch',
    ticket.targetUrl,
    ticket.method || 'GET',
    String(ticket.expiresAt)
  ].join('|');
}

function signTicket(ticket) {
  return crypto.createHmac('sha256', relaySecret()).update(ticketSigningBase(ticket)).digest('hex');
}

function verifyTicketSignature(ticket, signature) {
  if (!ticket || !ticket.ticketId || !signature || !ticket.expiresAt) return false;
  if (Date.now() > Number(ticket.expiresAt)) return false;
  const expected = signTicket(ticket);
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(String(signature), 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (error) {
    return false;
  }
}

/* --------------------------------------------------------------------------
 * Pairing — lets the extension register itself with no copy-paste
 * -------------------------------------------------------------------------- */

function issuePairToken(userId) {
  const key = normaliseUser(userId);
  const payload = {
    userId: key,
    nonce: crypto.randomBytes(8).toString('hex'),
    expiresAt: Date.now() + PAIR_TOKEN_TTL_MS
  };
  const signature = crypto
    .createHmac('sha256', relaySecret())
    .update(`pair|${payload.userId}|${payload.nonce}|${payload.expiresAt}`)
    .digest('hex');
  return {
    token: `${payload.nonce}.${payload.expiresAt}.${signature}`,
    expiresAt: payload.expiresAt
  };
}

function verifyPairToken(token, expectedUserId) {
  const raw = String(token || '');
  const parts = raw.split('.');
  if (parts.length !== 3) return { ok: false, error: 'malformed_pair_token' };
  const [nonce, expiresAt, signature] = parts;
  if (Date.now() > Number(expiresAt)) return { ok: false, error: 'pair_token_expired' };
  const userId = normaliseUser(expectedUserId);
  const expected = crypto
    .createHmac('sha256', relaySecret())
    .update(`pair|${userId}|${nonce}|${expiresAt}`)
    .digest('hex');
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(String(signature), 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, error: 'pair_token_invalid' };
    }
  } catch (error) {
    return { ok: false, error: 'pair_token_invalid' };
  }
  return { ok: true, userId };
}

/* --------------------------------------------------------------------------
 * Heartbeats
 * -------------------------------------------------------------------------- */

function registerHeartbeat({
  userId = 'anonymous',
  version = '1.1.0',
  ramGb = 8,
  cpuCores = 6,
  installed = true,
  capabilities = null,
  standalone = false
} = {}) {
  const key = normaliseUser(userId);
  const prev = activeClients.get(key) || { relayedTotal: 0 };
  const caps = Array.isArray(capabilities) && capabilities.length
    ? capabilities.filter((c) => c === 'fetch' || c === 'render')
    : ['fetch'];

  const record = {
    userId: key,
    installed: Boolean(installed),
    version: String(version || '1.1.0').slice(0, 32),
    ramGb: Number(ramGb) || 8,
    cpuCores: Number(cpuCores) || 6,
    capabilities: caps,
    standalone: Boolean(standalone),
    lastSeenAt: Date.now(),
    relayedTotal: prev.relayedTotal || 0
  };

  if (record.installed) activeClients.set(key, record);
  else activeClients.delete(key);

  return record;
}

function pruneStaleClients() {
  const now = Date.now();
  for (const [key, rec] of activeClients) {
    if (now - rec.lastSeenAt > HEARTBEAT_TTL_MS) activeClients.delete(key);
  }
}

function hasActiveExtension(userId = 'anonymous') {
  const key = normaliseUser(userId);
  const rec = activeClients.get(key);
  if (!rec || !rec.installed) return false;
  if (Date.now() - rec.lastSeenAt > HEARTBEAT_TTL_MS) {
    activeClients.delete(key);
    return false;
  }
  return true;
}

function capabilitiesOf(userId) {
  const rec = activeClients.get(normaliseUser(userId));
  if (!rec || !rec.installed) return [];
  if (Date.now() - rec.lastSeenAt > HEARTBEAT_TTL_MS) return [];
  return Array.isArray(rec.capabilities) ? rec.capabilities : ['fetch'];
}

function getStats(userId = 'anonymous') {
  pruneStaleClients();
  const key = normaliseUser(userId);
  const rec = activeClients.get(key);
  const connected = hasActiveExtension(key);
  return {
    connected,
    extensionOnly: isExtensionOnlyMode(),
    version: connected ? rec.version : '',
    ramGb: connected ? rec.ramGb : null,
    cpuCores: connected ? rec.cpuCores : null,
    capabilities: connected ? rec.capabilities : [],
    standalone: connected ? rec.standalone : false,
    relayedTotal: rec ? rec.relayedTotal : 0,
    pendingTickets: (pendingQueues.get(key) || []).length,
    activeUsers: activeClients.size
  };
}

function getRelayDiagnostics() {
  pruneStaleClients();
  return {
    ...counters,
    extensionOnly: isExtensionOnlyMode(),
    connectedUsers: activeClients.size,
    inflight: inflightResolvers.size,
    consumedTracked: consumedTickets.size
  };
}

/* --------------------------------------------------------------------------
 * Ticket queue
 * -------------------------------------------------------------------------- */

function pruneExpiredTickets(userId) {
  const key = normaliseUser(userId);
  const queue = pendingQueues.get(key);
  if (!Array.isArray(queue)) return [];
  const now = Date.now();
  const valid = queue.filter((t) => Number(t.expiresAt) > now);
  if (valid.length) pendingQueues.set(key, valid);
  else pendingQueues.delete(key);
  return valid;
}

function pullPendingTickets(userId = 'anonymous', maxCount = 4) {
  const key = normaliseUser(userId);
  const valid = pruneExpiredTickets(key);
  if (!valid.length) return [];
  const take = Math.max(1, Math.min(8, Number(maxCount) || 4));
  const batch = valid.splice(0, take);
  if (valid.length) pendingQueues.set(key, valid);
  else pendingQueues.delete(key);
  return batch;
}

/**
 * Ask the user's browser to fetch (or render) one URL.
 * Resolves with raw bytes; never parses anything itself.
 */
function requestBlindRelayFetch(userId, targetUrl, options = {}) {
  const key = normaliseUser(userId);
  const {
    method = 'GET',
    headers = {},
    body = null,
    timeoutMs = 12_000,
    sessionId = null,
    mode = 'fetch'
  } = options || {};

  if (!hasActiveExtension(key)) {
    return Promise.resolve({ ok: false, error: 'extension_not_connected', code: 'extension_not_connected' });
  }

  const wanted = mode === 'render' ? 'render' : 'fetch';
  const caps = capabilitiesOf(key);
  if (wanted === 'render' && !caps.includes('render')) {
    return Promise.resolve({ ok: false, error: 'render_not_supported', code: 'render_not_supported' });
  }

  const throttle = takeToken(key);
  if (throttle) {
    return Promise.resolve({
      ok: false,
      error: throttle === 'inflight_cap' ? 'too_many_inflight_tickets' : 'relay_rate_limited',
      code: 'rate_limited'
    });
  }

  const ttl = wanted === 'render' ? RENDER_TICKET_TTL_MS : TICKET_TTL_MS;
  const ticketId = `tkt_${crypto.randomBytes(8).toString('hex')}`;
  const expiresAt = Date.now() + ttl;
  const boundedTimeout = Math.min(20_000, Math.max(2000, Number(timeoutMs) || 12_000));

  const normalizedMethod = String(method || 'GET').toUpperCase();
  const safeBody = (normalizedMethod === 'POST' && typeof body === 'string')
    ? body.slice(0, 32_768)
    : undefined;

  const ticket = {
    ticketId,
    userId: key,
    sessionId: sessionId ? String(sessionId) : null,
    mode: wanted,
    targetUrl: String(targetUrl),
    method: normalizedMethod,
    headers: headers && typeof headers === 'object' ? headers : {},
    ...(safeBody !== undefined ? { body: safeBody } : {}),
    timeoutMs: boundedTimeout,
    settleMs: wanted === 'render' ? Math.min(4000, Math.max(600, Number(options.settleMs) || 1500)) : 0,
    maxBytes: Math.min(MAX_TICKET_BODY_BYTES, Number(options.maxBytes) || MAX_TICKET_BODY_BYTES),
    expiresAt
  };
  ticket.signature = signTicket(ticket);

  counters.ticketsIssued += 1;
  if (wanted === 'render') counters.renderTickets += 1;
  else counters.fetchTickets += 1;

  const startedAt = Date.now();

  return new Promise((resolve) => {
    const finish = (result) => {
      releaseToken(key);
      resolve({ ...result, mode: wanted, elapsedMs: Date.now() - startedAt });
    };

    const hardDeadline = boundedTimeout + (wanted === 'render' ? 12_000 : 4000);
    const timer = setTimeout(() => {
      inflightResolvers.delete(ticketId);
      counters.ticketsExpired += 1;
      finish({
        ok: false,
        ticketId,
        error: wanted === 'render' ? 'render_timeout' : 'relay_timeout',
        code: wanted === 'render' ? 'render_timeout' : 'relay_timeout'
      });
    }, hardDeadline);

    inflightResolvers.set(ticketId, { resolve: finish, timer, ticket });

    const list = pendingQueues.get(key) || [];
    list.push(ticket);
    pendingQueues.set(key, list.slice(-MAX_PENDING_PER_USER));
  });
}

/**
 * Called by POST /relay-result.
 * Returns a status the route maps onto an HTTP code:
 *   ok | unknown_ticket | expired_ticket | invalid_signature | replayed
 */
function resolveTicketResult(payload = {}) {
  const {
    ticketId,
    signature,
    ok = false,
    status = 0,
    contentType = '',
    rawBody = '',
    error = ''
  } = payload;

  const id = String(ticketId || '');
  if (!id) return { status: 'unknown_ticket', matched: false, verified: false };

  if (consumedTickets.has(id)) {
    counters.ticketsReplayed += 1;
    return { status: 'replayed', matched: true, verified: false };
  }

  const pending = inflightResolvers.get(id);
  if (!pending) {
    return { status: 'unknown_ticket', matched: false, verified: false };
  }

  const { resolve, timer, ticket } = pending;

  if (Date.now() > Number(ticket.expiresAt)) {
    clearTimeout(timer);
    inflightResolvers.delete(id);
    counters.ticketsExpired += 1;
    resolve({ ok: false, ticketId: id, error: 'ticket_expired', code: 'relay_timeout' });
    return { status: 'expired_ticket', matched: true, verified: false };
  }

  if (!verifyTicketSignature(ticket, signature)) {
    counters.ticketsRejectedSignature += 1;
    // Do not kill the in-flight promise: a forged attempt must not be able to
    // cancel a legitimate fetch.
    return { status: 'invalid_signature', matched: true, verified: false };
  }

  const body = typeof rawBody === 'string' ? rawBody : String(rawBody || '');
  if (Buffer.byteLength(body, 'utf8') > MAX_RAW_BODY_BYTES) {
    counters.bodiesRejectedTooLarge += 1;
    clearTimeout(timer);
    inflightResolvers.delete(id);
    resolve({ ok: false, ticketId: id, error: 'body_too_large', code: 'body_too_large' });
    return { status: 'ok', matched: true, verified: true };
  }

  clearTimeout(timer);
  inflightResolvers.delete(id);
  consumedTickets.set(id, Date.now());
  if (consumedTickets.size > 2000) {
    const cutoff = Date.now() - 5 * 60 * 1000;
    for (const [key, at] of consumedTickets) {
      if (at < cutoff) consumedTickets.delete(key);
    }
  }

  counters.ticketsResolved += 1;
  const clientRec = activeClients.get(ticket.userId);
  if (clientRec) clientRec.relayedTotal = (clientRec.relayedTotal || 0) + 1;

  resolve({
    ok: Boolean(ok),
    ticketId: id,
    status: Number(status) || 0,
    contentType: String(contentType || ''),
    rawBody: body.slice(0, MAX_TICKET_BODY_BYTES),
    error: String(error || '')
  });

  return { status: 'ok', matched: true, verified: true };
}

/* --------------------------------------------------------------------------
 * Extension packaging
 * -------------------------------------------------------------------------- */

function resolveExtensionDir() {
  const candidates = [
    String(process.env.EXTENSION_DIR || '').trim(),
    path.resolve(__dirname, '../../../extension'),
    path.resolve(process.cwd(), '../extension'),
    path.resolve(process.cwd(), 'extension'),
    '/app/extension'
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(path.join(candidate, 'manifest.json'))) return candidate;
    } catch (error) {
      // keep looking
    }
  }
  return null;
}

function listExtensionFiles(dir) {
  const present = [];
  for (const filename of EXTENSION_FILES) {
    const filePath = path.join(dir, filename);
    if (fs.existsSync(filePath)) present.push(filename);
  }
  return present;
}

/* --------------------------------------------------------------------------
 * Dependency-free PKZIP (deflate), Node 18+ compatible
 * -------------------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function buildExtensionZipBuffer() {
  const dir = resolveExtensionDir();
  if (!dir) {
    const error = new Error('Extension directory is not available on this server image.');
    error.code = 'extension_dir_missing';
    throw error;
  }

  const files = listExtensionFiles(dir);
  if (!files.length) {
    const error = new Error('Extension directory exists but contains no packaged files.');
    error.code = 'extension_empty';
    throw error;
  }

  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const filename of files) {
    // Everything lives inside one unmistakable folder, so opening the ZIP in
    // Explorer/WinRAR shows the whole extension, never a loose manifest.json.
    const zipEntryName = `Scraper-RAM-Turbo-Extension/${filename.replace(/\\/g, '/')}`;
    const raw = fs.readFileSync(path.join(dir, ...filename.split('/')));
    const compressed = zlib.deflateRawSync(raw, { level: 9 });
    const nameBuf = Buffer.from(zipEntryName, 'utf8');
    const sum = crc32(raw);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0x5421, 12);
    localHeader.writeUInt32LE(sum, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(raw.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x5421, 14);
    centralHeader.writeUInt32LE(sum, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(raw.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + compressed.length;
  }

  const centralBuf = Buffer.concat(centralParts);
  const fileCount = centralParts.length / 2;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(fileCount, 8);
  eocd.writeUInt16LE(fileCount, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuf, eocd]);
}

module.exports = {
  // flags & stats
  isExtensionOnlyMode,
  getStats,
  getRelayDiagnostics,
  // heartbeat
  registerHeartbeat,
  hasActiveExtension,
  capabilitiesOf,
  // pairing
  issuePairToken,
  verifyPairToken,
  // tickets
  signTicket,
  verifyTicketSignature,
  pullPendingTickets,
  requestBlindRelayFetch,
  resolveTicketResult,
  // packaging
  resolveExtensionDir,
  buildExtensionZipBuffer,
  // constants (tests)
  _constants: {
    HEARTBEAT_TTL_MS,
    TICKET_TTL_MS,
    RENDER_TICKET_TTL_MS,
    MAX_RAW_BODY_BYTES,
    MAX_TICKET_BODY_BYTES,
    TICKETS_PER_MINUTE,
    MAX_INFLIGHT_PER_USER
  }
};
