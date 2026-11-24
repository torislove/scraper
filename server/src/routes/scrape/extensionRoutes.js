/**
 * extensionRoutes.js
 * Chrome turbo extension relay hub, pairing tokens, heartbeat, ingest, and download routes.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const shared = require('./scrapeShared');
const {
  activeSessions,
  batchProgress,
  sessionAbortSignals,
  isSessionAborted,
  isSessionActive,
  updateSessionTargetState,
  safeExecute,
  requestedCountry,
  getDistanceKm,
  formatEta,
  addLog,
  emitVendorEvent,
  emitGridEvent,
  emitDispatchEvent,
  emitProgressEvent,
  emitActivePointEvent
} = shared;


const extensionRelayHub = require('../../services/extensionRelayHub');
const dbAdapter = require('../../config/dbAdapter');
const leadArchive = require('../../services/leadArchive');
const { isVendorRelevant } = require('../../services/categoryFidelity');
const categoryRouter = require('../../services/categoryRouter');


router.post('/client-ingest', async (req, res) => {
  try {
    const {
      sessionId = `ram_${Date.now()}`,
      leads = [],
      category = 'Businesses',
      location = '',
      country = 'IN',
      deviceSpec = null
    } = req.body || {};

    if (!Array.isArray(leads)) {
      return res.status(400).json({ ok: false, error: 'leads array is required' });
    }

    const userId = String(req.headers['x-user-id'] || 'admin_1').trim() || 'admin_1';
    const batch = leads.slice(0, 200);
    const savedList = [];

    for (const raw of batch) {
      if (!raw || typeof raw !== 'object') continue;
      const name = String(raw.name || '').trim();
      if (!name) continue;

      const lat = raw.latitude != null ? Number(raw.latitude) : (raw.lat != null ? Number(raw.lat) : null);
      const lng = raw.longitude != null ? Number(raw.longitude) : (raw.lng != null ? Number(raw.lng) : null);
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40) || 'lead';
      const coordKey = Number.isFinite(lat) && Number.isFinite(lng)
        ? `${lat.toFixed(4)}_${lng.toFixed(4)}`
        : Math.random().toString(36).slice(2, 8);
      const leadId = String(raw.id || `ram_${slug}_${coordKey}`);

      const vendor = {
        id: leadId,
        sessionId: String(sessionId || `ram_${Date.now()}`),
        userId,
        name,
        category: String(raw.category || category || 'Businesses').trim(),
        city: String(raw.city || raw.zoneName || location || '').trim(),
        location: String(raw.location || location || '').trim(),
        address: String(raw.address || raw.location || location || '').trim(),
        country: String(raw.country || country || 'IN').trim().toUpperCase(),
        phone: String(raw.phone || '').trim(),
        website: String(raw.website || '').trim(),
        email: String(raw.email || '').trim(),
        latitude: Number.isFinite(lat) ? lat : null,
        longitude: Number.isFinite(lng) ? lng : null,
        source: String(raw.source || 'Client RAM Engine'),
        engine: 'client_ram_worker',
        scrapedAt: new Date().toISOString(),
        deviceTier: deviceSpec?.tier || undefined
      };

      if (category && !isVendorRelevant(vendor, category)) {
        try {
          const { archiveDivergentLead } = require('../../services/divergentLeadService');
          archiveDivergentLead(vendor, category);
        } catch (e) {}
        continue;
      }

      const saved = dbAdapter.saveVendor(userId, vendor);
      if (saved) {
        savedList.push(vendor);
        try { emitVendorEvent(vendor, 'new'); } catch (e) { }
      }
    }

    return res.json({
      ok: true,
      ingested: savedList.length,
      leads: savedList
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Zero-Knowledge Extension-Only Status, Pairing, Heartbeat, Blind Relay Ticket Result & Package
const OFFICIAL_EDGE_STORE_URL = 'https://microsoftedge.microsoft.com/addons/detail/gcmknikiliglejekhghkdplkjgkjjkdm';

router.get('/extension-status', (req, res) => {
  const userId = String(req.headers['x-user-id'] || req.query.userId || 'anonymous').trim() || 'anonymous';
  const edgeUrl = String(process.env.EXTENSION_STORE_URL_EDGE || OFFICIAL_EDGE_STORE_URL).trim();
  const chromeUrl = String(process.env.EXTENSION_STORE_URL_CHROME || process.env.EXTENSION_STORE_URL || '').trim();
  const firefoxUrl = String(process.env.EXTENSION_STORE_URL_FIREFOX || '').trim();
  return res.json({
    ok: true,
    ...extensionRelayHub.getStats(userId),
    storeUrl: edgeUrl || chromeUrl || String(process.env.EXTENSION_STORE_URL || '').trim(),
    storeUrls: {
      chrome: chromeUrl,
      edge: edgeUrl,
      firefox: firefoxUrl
    },
    packageUrl: '/api/scrape/extension-download'
  });
});

// One-time pairing token. The extension calls this on first load so the user
// never copies a key anywhere.
router.post('/extension-pair-token', (req, res) => {
  const userId = String(req.headers['x-user-id'] || req.body?.userId || 'anonymous').trim() || 'anonymous';
  const issued = extensionRelayHub.issuePairToken(userId);
  return res.json({ ok: true, ...issued });
});

router.post('/extension-heartbeat', (req, res) => {
  try {
    const userId = String(req.headers['x-user-id'] || req.body?.userId || 'anonymous').trim() || 'anonymous';
    const record = extensionRelayHub.registerHeartbeat({
      userId,
      version: req.body?.version || req.headers['x-scraper-extension'] || '1.1.0',
      ramGb: req.body?.ramGb,
      cpuCores: req.body?.cpuCores,
      capabilities: req.body?.capabilities,
      standalone: req.body?.standalone === true,
      installed: req.body?.installed !== false
    });
    const tickets = record.installed ? extensionRelayHub.pullPendingTickets(userId, 4) : [];
    return res.json({
      ok: true,
      connected: extensionRelayHub.hasActiveExtension(userId),
      extensionOnly: extensionRelayHub.isExtensionOnlyMode(),
      storeUrl: String(process.env.EXTENSION_STORE_URL || '').trim(),
      capabilities: record.capabilities || [],
      tickets
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/relay-result', (req, res) => {
  try {
    const outcome = extensionRelayHub.resolveTicketResult(req.body || {});
    if (outcome.status === 'replayed') {
      return res.status(410).json({ ok: false, error: 'Ticket already used', ...outcome });
    }
    if (outcome.status === 'expired_ticket') {
      return res.status(410).json({ ok: false, error: 'Ticket expired', ...outcome });
    }
    if (outcome.status === 'invalid_signature') {
      return res.status(403).json({ ok: false, error: 'Invalid ticket signature', ...outcome });
    }
    if (outcome.status === 'unknown_ticket') {
      return res.status(404).json({ ok: false, error: 'Unknown ticket', ...outcome });
    }
    return res.json({ ok: true, ...outcome });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/relay-stats', (_req, res) => {
  return res.json({ ok: true, ...extensionRelayHub.getRelayDiagnostics() });
});

router.get('/extension-download', (_req, res) => {
  try {
    const zipBuffer = extensionRelayHub.buildExtensionZipBuffer();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="scraper-co-in-ram-turbo-extension.zip"');
    res.setHeader('Cache-Control', 'no-cache');
    return res.send(zipBuffer);
  } catch (err) {
    const missing = err.code === 'extension_dir_missing' || err.code === 'extension_empty';
    return res.status(missing ? 503 : 500).json({
      ok: false,
      error: missing
        ? 'This server image does not carry the extension package. Install from the Chrome Web Store instead.'
        : err.message
    });
  }
});


module.exports = router;
