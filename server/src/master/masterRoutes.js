'use strict';

/**
 * server/src/master/masterRoutes.js
 * Isolated HTTP API routes for Master Fleet (/api/master/geo/* & /api/master/scrape/*).
 * Completely separate from Client /api/geo/* routes.
 */

const {
  validateMasterLocationAsync,
  suggestMasterLocations,
  resolveMasterTerritoryAsync,
  startMasterSweep
} = require('./masterOrchestrator');
const { MASTER_ADMIN_PACK, getCountryAdminLabels } = require('./adminRegistry');

function registerMasterRoutes(app, orchestrator) {
  app.get('/api/master/geo/labels', (req, res) => {
    const cc = String(req.query.country || 'IN').toUpperCase();
    res.json({ ok: true, country: cc, labels: getCountryAdminLabels(cc) });
  });

  app.get('/api/master/geo/suggest', (req, res) => {
    const q = String(req.query.q || '').trim();
    const cc = String(req.query.country || 'IN').toUpperCase();
    const limit = Math.min(25, Math.max(1, Number(req.query.limit || 12)));
    let suggestions = suggestMasterLocations(q, cc, limit);
    let detectedCountryMismatch = null;
    if (suggestions.length === 0 && q.length >= 2) {
      const globalHits = [];
      for (const market of ['IN', 'US', 'GB', 'AU', 'AE']) {
        if (market === cc) continue;
        for (const hit of suggestMasterLocations(q, market, limit)) {
          globalHits.push({ ...hit, autoSwitchCountry: true });
        }
      }
      if (globalHits.length > 0) {
        suggestions = globalHits.slice(0, limit);
        const topCc = globalHits[0].country;
        detectedCountryMismatch = { detectedCountry: topCc, matchedPlace: globalHits[0].name };
      }
    }
    res.json({
      ok: true,
      country: detectedCountryMismatch?.detectedCountry || cc,
      detectedCountryMismatch,
      labels: getCountryAdminLabels(detectedCountryMismatch?.detectedCountry || cc),
      suggestions
    });
  });

  app.get('/api/master/geo/validate', async (req, res) => {
    const location = String(req.query.location || req.query.q || '').trim();
    const cc = String(req.query.country || 'IN').toUpperCase();
    const out = await validateMasterLocationAsync(location, cc);
    res.status(out.ok ? 200 : 400).json(out);
  });

  app.get('/api/master/geo/resolve', async (req, res) => {
    const location = String(req.query.location || req.query.city || '').trim();
    const cc = String(req.query.country || 'IN').toUpperCase();
    const maxStateDistricts = Math.min(20, Math.max(1, Number(req.query.maxDistricts || 12)));
    const out = await resolveMasterTerritoryAsync(location, cc, { maxStateDistricts });
    res.status(out.ok ? 200 : 400).json(out);
  });

  app.get('/api/master/geo/catalog', (req, res) => {
    const cc = String(req.query.country || '').toUpperCase();
    if (cc && MASTER_ADMIN_PACK[cc]) {
      return res.json({ ok: true, country: cc, labels: getCountryAdminLabels(cc), ...MASTER_ADMIN_PACK[cc] });
    }
    res.json({ ok: true, countries: Object.keys(MASTER_ADMIN_PACK) });
  });

  app.post('/api/master/scrape/start', async (req, res) => {
    try {
      const body = req.body || {};
      const result = await startMasterSweep({
        query: body.query || body.category,
        location: body.location || body.city,
        country: body.country || 'IN',
        subcategories: body.subcategories,
        selectedZones: body.selectedZones,
        resumeSessionId: body.resumeSessionId,
        maxLeads: body.maxLeads || 0,
        depth: body.depth || 6,
        extractEmails: body.extractEmails !== false,
        startZoneIndex: body.startZoneIndex || 0,
        maxStateDistricts: body.maxStateDistricts || 12
      });
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        ok: false,
        error: err.message,
        suggestions: err.suggestions || []
      });
    }
  });

  app.post('/api/master/scrape/stop', (req, res) => {
    const out = orchestrator.stopSweep(req.body?.sessionId);
    res.json(out);
  });
}

module.exports = { registerMasterRoutes };
