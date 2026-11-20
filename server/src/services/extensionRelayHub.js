'use strict';

/**
 * extensionRelayHub.js
 *
 * Server-side Zero-Knowledge Blind Ticket Hub & Extension Packager.
 *
 * All proprietary 6-engine intelligence, CSS selectors, regexes, category filters,
 * and 619k+ village geo-databases remain strictly inside the private backend.
 * Connected user extensions only receive short-lived HMAC-signed fetch tickets,
 * perform raw network fetches inside the user's browser RAM & IP, and return raw
 * bytes back to the server engines for parsing.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const EXTENSION_DIR = path.resolve(__dirname, '../../../extension');
const EXTENSION_FILES = [
  'manifest.json',
  'background.js',
  'contentBridge.js',
  'popup.html',
  'popup.js'
];

const HEARTBEAT_TTL_MS = 90_000;
const TICKET_TTL_MS = 30_000;

const activeClients = new Map(); // userId -> { version, ramGb, cpuCores, lastSeenAt, relayedTotal }
const pendingQueues = new Map(); // userId -> Array<ticketEnvelope>
const inflightResolvers = new Map(); // ticketId -> { resolve, timer, ticket }

function relaySecret() {
  return String(process.env.EXTENSION_RELAY_SECRET || process.env.SESSION_SECRET || 'scraper-coin-relay-dev-key');
}

function isExtensionOnlyMode() {
  const raw = String(process.env.SCRAPER_EXTENSION_ONLY || '').trim().toLowerCase();
  return raw === 'true' || raw === '1';
}

function signTicket(payload) {
  const base = [
    payload.ticketId,
    payload.userId,
    payload.targetUrl,
    payload.method || 'GET',
    String(payload.expiresAt)
  ].join('|');
  return crypto.createHmac('sha256', relaySecret()).update(base).digest('hex');
}

function verifyTicketSignature(ticketId, userId, targetUrl, method, expiresAt, signature) {
  if (!ticketId || !signature || !expiresAt) return false;
  if (Date.now() > Number(expiresAt)) return false;
  const expected = signTicket({ ticketId, userId, targetUrl, method, expiresAt });
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(String(signature), 'hex'));
  } catch (e) {
    return false;
  }
}

function registerHeartbeat({ userId = 'anonymous', version = '1.0.0', ramGb = 8, cpuCores = 6, installed = true } = {}) {
  const key = String(userId || 'anonymous').trim() || 'anonymous';
  const prev = activeClients.get(key) || { relayedTotal: 0 };
  const record = {
    userId: key,
    installed: Boolean(installed),
    version: String(version || '1.0.0').slice(0, 32),
    ramGb: Number(ramGb) || 8,
    cpuCores: Number(cpuCores) || 6,
    lastSeenAt: Date.now(),
    relayedTotal: prev.relayedTotal || 0
  };
  if (record.installed) {
    activeClients.set(key, record);
  } else {
    activeClients.delete(key);
  }
  return record;
}

function hasActiveExtension(userId = 'anonymous') {
  const key = String(userId || 'anonymous').trim() || 'anonymous';
  const rec = activeClients.get(key);
  if (!rec || !rec.installed) return false;
  if (Date.now() - rec.lastSeenAt > HEARTBEAT_TTL_MS) {
    activeClients.delete(key);
    return false;
  }
  return true;
}

function getStats(userId = 'anonymous') {
  const key = String(userId || 'anonymous').trim() || 'anonymous';
  const rec = activeClients.get(key);
  const connected = hasActiveExtension(key);
  return {
    connected,
    extensionOnly: isExtensionOnlyMode(),
    version: connected ? rec.version : '',
    ramGb: connected ? rec.ramGb : null,
    cpuCores: connected ? rec.cpuCores : null,
    relayedTotal: rec ? rec.relayedTotal : 0,
    activeUsers: activeClients.size
  };
}

function pullPendingTickets(userId = 'anonymous', maxCount = 4) {
  const key = String(userId || 'anonymous').trim() || 'anonymous';
  const queue = pendingQueues.get(key);
  if (!Array.isArray(queue) || !queue.length) return [];
  const now = Date.now();
  const valid = queue.filter((t) => Number(t.expiresAt) > now);
  const batch = valid.splice(0, Math.max(1, Math.min(8, Number(maxCount) || 4)));
  if (valid.length) pendingQueues.set(key, valid);
  else pendingQueues.delete(key);
  return batch;
}

function requestBlindRelayFetch(userId, targetUrl, { method = 'GET', headers = {}, timeoutMs = 12_000 } = {}) {
  const key = String(userId || 'anonymous').trim() || 'anonymous';
  if (!hasActiveExtension(key)) {
    return Promise.resolve({ ok: false, error: 'extension_not_connected' });
  }

  const ticketId = `tkt_${crypto.randomBytes(8).toString('hex')}`;
  const expiresAt = Date.now() + TICKET_TTL_MS;
  const cleanHeaders = headers && typeof headers === 'object' ? headers : {};
  const ticket = {
    ticketId,
    userId: key,
    targetUrl: String(targetUrl),
    method: String(method || 'GET').toUpperCase(),
    headers: cleanHeaders,
    timeoutMs: Math.min(20_000, Math.max(2000, Number(timeoutMs) || 12_000)),
    expiresAt
  };
  ticket.signature = signTicket(ticket);

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      inflightResolvers.delete(ticketId);
      resolve({ ok: false, ticketId, error: 'relay_timeout' });
    }, ticket.timeoutMs + 4000);

    inflightResolvers.set(ticketId, { resolve, timer, ticket });
    const list = pendingQueues.get(key) || [];
    list.push(ticket);
    pendingQueues.set(key, list.slice(-32));
  });
}

function resolveTicketResult({ ticketId, signature, ok = false, status = 0, contentType = '', rawBody = '', error = '' } = {}) {
  const pending = inflightResolvers.get(String(ticketId || ''));
  if (!pending) {
    // Allow standalone ticket verification check even without in-flight promise
    return { matched: false, verified: false };
  }

  const { resolve, timer, ticket } = pending;
  const sigToCheck = signature || ticket.signature;
  const valid = verifyTicketSignature(
    ticket.ticketId,
    ticket.userId,
    ticket.targetUrl,
    ticket.method,
    ticket.expiresAt,
    sigToCheck
  );
  if (!valid) {
    return { matched: true, verified: false, error: 'invalid_or_expired_signature' };
  }

  clearTimeout(timer);
  inflightResolvers.delete(ticket.ticketId);

  const clientRec = activeClients.get(ticket.userId);
  if (clientRec) clientRec.relayedTotal = (clientRec.relayedTotal || 0) + 1;

  resolve({
    ok: Boolean(ok),
    ticketId: ticket.ticketId,
    status: Number(status) || 0,
    contentType: String(contentType || ''),
    rawBody: typeof rawBody === 'string' ? rawBody : String(rawBody || ''),
    error: String(error || '')
  });

  return { matched: true, verified: true };
}

/* --------------------------------------------------------------------------
 * Dependency-Free PKZIP Generator (Node 18/20/22/24 Compatible)
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
  if (!fs.existsSync(EXTENSION_DIR)) {
    throw new Error('Extension directory is missing on server.');
  }

  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const filename of EXTENSION_FILES) {
    const filePath = path.join(EXTENSION_DIR, filename);
    if (!fs.existsSync(filePath)) continue;

    const raw = fs.readFileSync(filePath);
    const compressed = zlib.deflateRawSync(raw);
    const nameBuf = Buffer.from(filename, 'utf8');
    const sum = crc32(raw);

    // Local File Header (30 bytes + name)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(8, 8); // compression = deflate
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0x5421, 12); // mod date
    localHeader.writeUInt32LE(sum, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(raw.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, compressed);

    // Central Directory Header (46 bytes + name)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(8, 10); // deflate
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
  isExtensionOnlyMode,
  signTicket,
  verifyTicketSignature,
  registerHeartbeat,
  hasActiveExtension,
  getStats,
  pullPendingTickets,
  requestBlindRelayFetch,
  resolveTicketResult,
  buildExtensionZipBuffer
};
