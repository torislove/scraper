/**
 * masterSweepRoutes.js
 * Master geographic sweep, district audit, out-of-bounds telemetry, and zone planning routes.
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
  emitActivePointEvent,
  browserBudget,
  extensionRelayHub,
  globalAbortSignal,
  clearSessionAborted,
  getConcurrencyMetrics
} = shared;


const dbAdapter = require('../../config/dbAdapter');
const { resolveUniversalZones, ZONE_COORDINATES, classifyLocation } = require('../../utils/universalGeoCluster');
const { buildCountrySweepPlan } = require('../../services/countrySweepPlan');
const { buildScopeZones } = require('../../services/sweepScopePolicy');
const { geocodeLocation } = require('../../utils/olaMaps');
const etaModel = require('../../utils/etaModel');
const { makeSessionId } = require('../../utils/sessionId');
const outOfBoundsVault = require('../../services/outOfBoundsVault');
const leadArchive = require('../../services/leadArchive');
const { addScrapeJob } = require('../../utils/queue');


router.post('/master-sweep/preview', async (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.body.isMaster === true;
    if (!isMaster) {
      return res.status(403).json({ error: 'Master scope required.' });
    }
    const { scope = 'district', name, deep = false } = req.body || {};
    if (!name) return res.status(400).json({ error: 'A place name is required.' });

    // India resolves through the offline gazetteer; every other country uses the
    // territory planner (curated children or a real lattice over the bbox).
    // Without this branch a US county preview silently became a city sweep.
    const previewCountry = requestedCountry(req) || 'IN';
    let plan;
    if (previewCountry === 'IN') {
      plan = buildScopeZones(scope, name, { deep: deep === true || deep === 'true' });
    } else {
      plan = await buildCountrySweepPlan({
        scope,
        name,
        countryCode: previewCountry,
        category: req.body.category || '',
        deep: deep === true || deep === 'true'
      });
    }
    if (!plan) {
      return res.status(404).json({
        error: previewCountry === 'IN'
          ? `Could not resolve "${name}" in the offline India gazetteer.`
          : `Could not resolve "${name}" in ${previewCountry}. Try adding the state or country, e.g. "Oakland County, Michigan".`,
        name
      });
    }

    // Rough wall-clock estimate from measured runs (~3 s per zone across the
    // parallel engine board). The UI labels it "approx" so it never promises
    // a precise finish time for a 700-zone state sweep.
    const zones = plan.zones.length;
    // Honest preview ETA: measured browser-seconds per zone Ã· live slots.
    // The old `zones Ã— 3 s` ignored concurrency and disagreed with the live
    // ETA by an order of magnitude on large sweeps.
    const previewMetrics = typeof getConcurrencyMetrics === 'function' ? getConcurrencyMetrics() : null;
    const previewSlots = etaModel.liveBrowserSlots(previewMetrics);
    const previewEtaMs = etaModel.modelEtaMs(zones, previewSlots);
    res.json({
      ok: true,
      scope: plan.resolvedScope,
      requestedScope: plan.requestedScope || plan.resolvedScope,
      targetName: plan.title,
      unitTerm: plan.unitTerm || null,
      requestedTerm: plan.requestedTerm || null,
      terminology: plan.terminology || null,
      coverage: plan.coverage || null,
      totalZones: zones,
      capped: Boolean(plan.stats && plan.stats.capped),
      unverifiedPlace: Boolean(plan.unverifiedPlace),
      zoneStats: plan.stats || null,
      policy: plan.policy || null,
      boundary: plan.boundary || null,
      warnings: plan.warnings || [],
      estimatedMinutes: Math.max(1, Math.ceil(previewEtaMs / 60000)),
      estimatedSeconds: Math.round(previewEtaMs / 1000),
      etaModel: {
        secondsPerZone: etaModel.MAPS_SECONDS_PER_ZONE,
        liveSlots: previewSlots,
        note: 'Measured browser-seconds per zone divided by live browser slots. An estimate, not a guarantee.'
      },
      sampleZones: plan.zones.slice(0, 12).map(z => z.name)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/master-sweep', async (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.body.isMaster === true;
    if (!isMaster) {
      return res.status(403).json({
        error: 'Access denied: Master territorial sweeps (District & State) are restricted to the Master Command Center.'
      });
    }

    const { category, scope = 'district', name, userId = 'master', strategy = 'broad', speedPreset = 'precision_grid', engines, deep = false, hardware } = req.body;
    const clientHw = hardware || (req.headers['x-hardware-ram'] ? { ramGb: Number(req.headers['x-hardware-ram']), parallelZones: Number(req.headers['x-hardware-lanes']) } : null);
    if (clientHw) browserBudget.setClientHardware(clientHw);
    if (!category || !name) {
      return res.status(400).json({ error: 'Both category and target location name are required for a Master Sweep.' });
    }

    // Resolve the requested scope through the country-aware planner:
    //   India    â†’ gazetteer policy (state / district / mandal / city, exhaustive)
    //   Anywhere â†’ buildCountrySweepPlan (curated child territories when the
    //              taxonomy knows them, otherwise a lattice over the real
    //              administrative bounding box, labelled `sampled`)
    // `deep` adds every village of a district in India and a 3Ã—3 lattice inside
    // every zone elsewhere.
    const sweepCountry = requestedCountry(req) || 'IN';
    let plan;
    if (sweepCountry === 'IN') {
      plan = buildScopeZones(scope, name, { deep: deep === true || deep === 'true' });
    } else {
      plan = await buildCountrySweepPlan({
        scope,
        name,
        countryCode: sweepCountry,
        category,
        deep: deep === true || deep === 'true'
      });
    }
    if (!plan) {
      return res.status(404).json({
        error: sweepCountry === 'IN'
          ? `Could not resolve "${name}" in the offline India gazetteer. Try a district, mandal, state or city name, or add the parent district.`
          : `Could not resolve "${name}" in ${sweepCountry}. Try adding the state or country, e.g. "Oakland County, Michigan".`
      });
    }

    const resolvedScope = plan.resolvedScope;
    const targetZones = plan.zones;
    const sweepTitle = plan.title;

    const filters = {};
    if (Number(req.body.minRating) > 0) filters.minRating = Math.min(5, Number(req.body.minRating));
    if (req.body.mobileOnly === true) filters.mobileOnly = true;
    if (req.body.hasWebsite === true) filters.hasWebsite = true;
    if (req.body.verifiedOnly === true) filters.verifiedOnly = true;

    const sessionId = req.body.sessionId || makeSessionId('master_sweep');
    const finalLocation = `${sweepTitle} (${resolvedScope.toUpperCase()} SWEEP)`;

    // Reset abort signals for fresh master sweep
    globalAbortSignal.aborted = false;
    clearSessionAborted(sessionId);
    sessionAbortSignals.set(sessionId, { aborted: false });
    dbAdapter.registerSessionOwner(sessionId, userId || 'master');
    dbAdapter.registerSessionScope(sessionId, { userId: userId || 'master', isMaster: true });
    if (typeof dbAdapter.flushSync === 'function') dbAdapter.flushSync();

    res.json({
      ok: true,
      sessionId,
      message: `Master ${resolvedScope} sweep initiated for "${sweepTitle}". Swarming ${targetZones.length} sub-zones.`,
      scope: resolvedScope,
      targetName: sweepTitle,
      unitTerm: plan.unitTerm || null,
      terminology: plan.terminology || null,
      coverage: plan.coverage || null,
      deep: deep === true || deep === 'true',
      totalZones: targetZones.length,
      capped: Boolean(plan.stats?.capped),
      zoneStats: plan.stats,
      policy: plan.policy,
      boundary: plan.boundary || null,
      warnings: plan.warnings || [],
      zones: targetZones.slice(0, 35).map(z => z.name),
      filters,
      isMasterSweep: true
    });

    addLog(`\n[Master Sweep] ðŸ—ºï¸ Swarming entire ${resolvedScope}: "${sweepTitle}" across ${targetZones.length} zones for category "${category}" (Master Folder: ${sessionId})`);
    addLog(`[Master Sweep] Coverage policy: ${plan.policy.label}. ${plan.policy.note}`);

    addScrapeJob('scrapeOmniOrchestrator', [
      category,
      sweepTitle,
      strategy,
      5,
      'high',
      engines || ['auto'],
      sessionId,
      userId || 'master',
      filters,
      plan,
      true,
      requestedCountry(req)
    ], 10, { sessionId, userId: userId || 'master', isMaster: true, unmetered: true });

  } catch (error) {
    console.error('[Master Sweep Error]', error);
    addLog(`[Master Sweep Error] ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DISTRICT BOUNDARY AUDIT
// Re-checks every lead a district sweep already saved and removes anything that
// does not belong to that district. Used after tightening containment so an
// older folder can be repaired without losing data: rejected rows are archived
// (recovery bin + out_of_bounds ledger) before the folder is rewritten.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/district-audit', async (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.body.isMaster === true;
    if (!isMaster) {
      return res.status(403).json({ error: 'Master scope required for a district audit.' });
    }
    const { sessionId, district, dryRun = false } = req.body || {};
    if (!sessionId || !district) {
      return res.status(400).json({ error: 'sessionId and district are required.' });
    }

    const plan = buildScopeZones('district', district);
    if (!plan || !plan.boundary) {
      return res.status(404).json({ error: `Could not build a district boundary for "${district}".` });
    }

    // Locate the folder (owner folder can be `master` or a user id).
    const candidates = [];
    try {
      const dirs = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
      for (const dir of dirs) {
        const file = path.join(SESSIONS_DIR, dir.name, `${sessionId}.json`);
        if (fs.existsSync(file)) candidates.push(file);
      }
    } catch (e) { }

    // Audit the rows the operator can actually see (the folder) plus any richer
    // store copy of the same id. Auditing only the store silently dropped folder
    // rows that had already been merged by name in an older read path.
    const storeRows = dbAdapter.getVendorsBySession(sessionId);
    let folderData = null;
    if (candidates.length) {
      try { folderData = JSON.parse(fs.readFileSync(candidates[0], 'utf8')); } catch (e) { }
    }
    const byId = new Map();
    for (const lead of (folderData?.leads || [])) {
      if (lead && lead.id) byId.set(lead.id, lead);
    }
    for (const lead of storeRows) {
      if (!lead || !lead.id) continue;
      byId.set(lead.id, { ...(byId.get(lead.id) || {}), ...lead });
    }
    const allRows = [...byId.values()];

    const kept = [];
    const rejected = [];
    for (const lead of allRows) {
      if (isInsideDistrictBoundary(lead, plan.boundary)) kept.push(lead);
      else rejected.push(lead);
    }

    if (dryRun) {
      return res.json({
        ok: true,
        dryRun: true,
        sessionId,
        district: plan.boundary.district,
        centers: plan.boundary.centers.length,
        storeRows: allRows.length,
        kept: kept.length,
        rejected: rejected.length,
        rejectedSamples: rejected.slice(0, 25).map(lead => ({
          id: lead.id,
          name: lead.name,
          district: lead.district || '',
          mandal: lead.mandal || '',
          latitude: lead.latitude,
          longitude: lead.longitude,
          address: lead.address || ''
        })),
        folder: candidates[0] || null
      });
    }

    let archived = 0;
    if (rejected.length) {
      const result = leadArchive.archive(rejected, {
        reason: `district boundary audit:${plan.boundary.district}`,
        sessionId
      });
      archived = result.archived || 0;
      for (const lead of rejected) {
        try { dbAdapter.dropFromSession(lead.id, sessionId); } catch (e) { }
      }
    }

    // Rejected vendors stay visible in the district's Out-of-Bound folder so
    // nothing is silently lost. Categorised by the rule that removed the row.
    let oobFolder = null;
    let oobAdded = 0;
    if (rejected.length) {
      try {
        const oob = outOfBoundsVault.recordRejections({
          district: plan.boundary.district,
          state: plan.boundary.state,
          category: folderData?.category || 'Rejected leads',
          sessionId,
          rows: rejected.map(lead => ({ lead, reason: 'outside district boundary' }))
        });
        oobFolder = oob.id;
        oobAdded = oob.added;
      } catch (oobError) {
        // The audit has already archived the rows; a folder write failure must
        // not turn a successful audit into an error.
        oobFolder = null;
      }
    }

    let folderSaved = null;
    let vaultMeta = {};
    if (candidates.length) {
      try {
        const current = JSON.parse(fs.readFileSync(candidates[0], 'utf8'));
        vaultMeta = current.metadata || {};
        const saved = persistSessionVault({
          sessionId,
          userId: current.userId || 'master',
          category: current.category,
          location: current.location,
          leads: kept,
          final: true,
          allowLead: lead => isInsideDistrictBoundary(lead, plan.boundary),
          metadata: {
            ...vaultMeta,
            status: 'completed',
            boundary: plan.boundary,
            scope: 'district',
            district: plan.boundary.district,
            state: plan.boundary.state,
            boundaryAudit: {
              at: new Date().toISOString(),
              rejected: rejected.length,
              kept: kept.length,
              rule: 'district boundary (sub-district union)'
            }
          }
        });
        folderSaved = saved.file || candidates[0];
      } catch (e) {
        return res.status(500).json({ error: `Boundary audit could not rewrite the folder: ${e.message}` });
      }
    }

    return res.json({
      ok: true,
      sessionId,
      district: plan.boundary.district,
      boundaryCenters: plan.boundary.centers.length,
      storeRows: allRows.length,
      kept: kept.length,
      rejected: rejected.length,
      archived,
      oobFolder,
      oobAdded,
      folderSaved,
      rejectedSamples: rejected.slice(0, 25).map(lead => ({
        id: lead.id,
        name: lead.name,
        district: lead.district || '',
        mandal: lead.mandal || '',
        address: lead.address || ''
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/out-of-bound', async (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';
    if (!isMaster) {
      return res.status(403).json({ error: 'Master scope required to view Out-of-Bound vaults.' });
    }
    const folders = outOfBoundsVault.listOobFolders();
    const totalLeads = folders.reduce((acc, f) => acc + (f.leadCount || 0), 0);
    const totalPhones = folders.reduce((acc, f) => acc + (f.phoneCount || 0), 0);
    return res.json({
      ok: true,
      folders,
      totalFolders: folders.length,
      totalLeads,
      totalPhones
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/scope-engines', (req, res) => {
  try {
    const { listScopeEngines } = require('../../services/scopeEngines');
    return res.json({ ok: true, engines: listScopeEngines() });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ON-DEMAND DEEP CONTACT ENRICHMENT API
// Probes websites for verified owner emails, Instagram, Facebook, and direct mobile lines
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.get('/zone-plan', (req, res) => {
  try {
    const category = String(req.query.category || 'Businesses').trim();
    const location = String(req.query.location || 'Hyderabad').trim();
    const country = String(req.query.country || req.headers['x-country'] || 'IN').trim().toUpperCase();
    const isMaster = req.headers['x-workspace-scope'] === 'master';
    const zones = resolveUniversalZones(location, category, isMaster, country) || [];
    return res.json({
      ok: true,
      category,
      location,
      country,
      totalZones: zones.length,
      zones: zones.slice(0, 48)
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Client-RAM Web Worker Lead Ingestion endpoint

module.exports = router;
