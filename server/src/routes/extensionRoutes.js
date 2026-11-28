'use strict';

/**
 * server/src/routes/extensionRoutes.js
 * Coordinates Chrome/Edge RAM Turbo Extension v2.0.0 heartbeats,
 * offline lead outbox syncing, relay results, and live .zip packaging.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const store = require('../store');
const { normalizeLead } = require('../engines/contract');

const EXTENSION_DIR = path.resolve(__dirname, '../../../extension');
const connectedWorkers = new Map(); // workerKey -> { version, ramGb, cpuCores, lanes, metrics, lastSeen }
const pendingTickets = new Map();   // ticketId -> { resolve, createdAt }

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function collectExtensionFiles(dir, prefix = '', browser = 'chrome') {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'manifest.firefox.json') continue;
    if (browser === 'firefox' && name === 'manifest.json') continue;
    const full = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...collectExtensionFiles(full, rel, browser));
    else out.push({ name: rel.replace(/\\/g, '/'), data: fs.readFileSync(full) });
  }
  if (!prefix && browser === 'firefox') {
    const ffManifest = path.join(dir, 'manifest.firefox.json');
    if (fs.existsSync(ffManifest)) {
      out.push({ name: 'manifest.json', data: fs.readFileSync(ffManifest) });
    }
  }
  return out;
}

function buildZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const raw = entry.data;
    const compressed = zlib.deflateRawSync(raw);
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuf, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuf);
    offset += local.length + nameBuf.length + compressed.length;
  }
  const cdBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, cdBuf, eocd]);
}

function getActiveWorkers() {
  const now = Date.now();
  const active = [];
  for (const [k, w] of connectedWorkers.entries()) {
    if (now - w.lastSeen > 95_000) connectedWorkers.delete(k);
    else active.push(w);
  }
  return active;
}

function registerExtensionRoutes(app) {
  app.get(['/api/scrape/extension-status', '/api/extension/status'], (req, res) => {
    const active = getActiveWorkers();
    const top = active[0] || null;
    res.json({
      success: true,
      connected: active.length > 0,
      active: active.length > 0,
      workers: active.length,
      version: top?.version || '2.0.0',
      lanes: top?.lanes || 0,
      ramGb: top?.ramGb || 0,
      cpuCores: top?.cpuCores || 0,
      offlineSupported: true
    });
  });

  app.post('/api/scrape/extension-heartbeat', (req, res) => {
    const b = req.body || {};
    const workerKey = String(req.headers['x-user-id'] || req.ip || 'local_edge');
    connectedWorkers.set(workerKey, {
      id: workerKey,
      version: String(b.version || req.headers['x-scraper-extension'] || '2.0.0'),
      ramGb: Number(b.ramGb || 8),
      cpuCores: Number(b.cpuCores || 4),
      lanes: Number(b.lanes || 8),
      capabilities: Array.isArray(b.capabilities) ? b.capabilities : ['fetch'],
      metrics: b.metrics || {},
      lastSeen: Date.now()
    });
    res.json({
      ok: true,
      connected: true,
      extensionOnly: String(process.env.SCRAPER_EXTENSION_ONLY || '').toLowerCase() === 'true',
      tickets: []
    });
  });

  app.post('/api/scrape/relay-result', (req, res) => {
    const { ticketId } = req.body || {};
    if (ticketId && pendingTickets.has(ticketId)) {
      const entry = pendingTickets.get(ticketId);
      pendingTickets.delete(ticketId);
      entry.resolve(req.body);
    }
    res.json({ ok: true, received: Boolean(ticketId) });
  });

  app.post('/api/scrape/extension-sync-offline', (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    let imported = 0;
    for (const raw of items) {
      const leadName = String(raw?.name || raw?.title || '').trim();
      if (!leadName) continue;
      const norm = normalizeLead({
        name: leadName,
        phone: raw.phones?.[0] || '',
        phones: raw.phones || [],
        email: raw.emails?.[0] || '',
        emails: raw.emails || [],
        whatsappLink: raw.whatsapp || '',
        website: raw.website || raw.url || '',
        country: raw.country || 'GB',
        city: raw.city || 'Extension Capture',
        source: raw.source || 'extension_offline_tab'
      }, 'extension_offline_tab');
      store.saveVendor(norm, raw.sessionId || 'ext_offline_vault');
      imported += 1;
    }
    res.json({ ok: true, imported, synced: imported });
  });

  app.get('/api/scrape/extension-download', (req, res) => {
    const browser = String(req.query.browser || 'chrome').toLowerCase() === 'firefox' ? 'firefox' : 'chrome';
    const entries = collectExtensionFiles(EXTENSION_DIR, '', browser);
    if (!entries.length) return res.status(404).json({ ok: false, error: 'Extension directory not found' });
    const zipBuf = buildZipBuffer(entries);
    const filename = browser === 'firefox' ? 'scraper-ram-turbo-firefox-v2.0.0.zip' : 'scraper-ram-turbo-v2.0.0.zip';
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(zipBuf.length));
    res.send(zipBuf);
  });
}

module.exports = { registerExtensionRoutes };
