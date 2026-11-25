/**
 * searchRoutes.js
 * Omni search, Auto-discovery, Google Maps, query parser, keyword expansion, and batch execution routes.
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
const { geocodeLocation } = require('../../utils/olaMaps');
const { getKeywordSynonyms } = require('../../utils/aiParser');
const intelligentExtractor = require('../../utils/intelligentExtractor');
const { parseNaturalLanguageQuery } = require('../../utils/queryParser');
const { resolveUniversalZones, ZONE_COORDINATES, classifyLocation } = require('../../utils/universalGeoCluster');
const categoryRouter = require('../../services/categoryRouter');
const credits = require('../../services/credits');
const requestGuard = require('../../utils/requestGuard');
const { buildScopeZones } = require('../../services/sweepScopePolicy');
const { makeSessionId } = require('../../utils/sessionId');
const { buildCountrySweepPlan } = require('../../services/countrySweepPlan');
const { SESSIONS_DIR } = require('../../config/paths');
const etaModel = require('../../utils/etaModel');
const { addScrapeJob } = require('../../utils/queue');


router.post('/maps', async (req, res) => {
  const { query, category, location, radius } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });

  addLog(`[Google Maps] Manual scrape triggered for: "${query}"`);
  addScrapeJob('scrapeGooglePlaces', [query, category, location, [], 'manual-maps', null, null, radius || 10]);
  res.json({ success: true, message: 'Google Maps scrape initiated' });
});



router.get('/keywords', async (req, res) => {
  try {
    const { category } = req.query;
    if (!category) return res.status(400).json({ error: 'Category required' });
    const keywords = await getKeywordSynonyms(category, req.query.location || '');
    res.json(keywords);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch keywords' });
  }
});

// PRE-FLIGHT GEOGRAPHIC SCOPE API

router.post('/parse-location', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });
  const parsed = await geoAI.parseSearchQuery(query);
  res.json(parsed);
});

router.post('/preflight', async (req, res) => {
  const rawInput = req.body.location || req.body.query || '';
  if (!rawInput) return res.status(400).json({ error: 'Location required' });

  const { parseUniversalQuery } = require('../../utils/universalQueryEngine');
  const parsedUni = req.body.query ? parseUniversalQuery(req.body.query, req.body.country || 'IN') : null;
  const parsed = parseNaturalLanguageQuery(rawInput);
  const cleanLocation = req.body.location || parsedUni?.location || parsed.location || parsed.category || rawInput;
  const correctedLoc = intelligentExtractor.correctLocationTypo(cleanLocation);

  try {
    const scopeData = await intelligentExtractor.analyzeGeographicScope(correctedLoc);
    res.json(scopeData);
  } catch (err) {
    res.json({ type: "specific" });
  }
});



// The Universal Omni Search Orchestrator is extracted to ../services/omniSearchOrchestrator.js
// for surgical modularity, blazing speed, and durable folder persistence.


// OMNI SEARCH API
/**
 * Starting a search is free. Credits are charged per NEW lead by dbAdapter
 * (1 credit = 1 lead), so a customer never pays for a search that finds
 * nothing and never pays twice for the same business.
 *
 * The only admission check is creditsPreflight(): when the desktop grant is
 * exhausted it returns 402 credits_exhausted and blocks NEW searches. Old
 * folders, exports and edits keep working.
 */
/**
 * Credits exhaustion blocks NEW searches with an explicit 402. It must never
 * drop leads silently in the middle of a run.
 */
function creditsPreflight(res) {
  if (!credits.ENFORCED) return false;
  const state = credits.status();
  if (state.exhausted) {
    res.status(402).json({
      error: 'credits_exhausted',
      message: 'Your free credits are used up. Existing folders and exports stay available; top up to start a new search.',
      credits: state
    });
    return true;
  }
  return false;
}

router.post('/omni', async (req, res) => {
  const { query, category, location, radius, gridDensity, enabledEngines, engines, sessionId, userId: bodyUserId, hardware } = req.body;
  const userId = req.headers['x-user-id'] || bodyUserId || 'anonymous';
  const clientHw = hardware || (req.headers['x-hardware-ram'] ? { ramGb: Number(req.headers['x-hardware-ram']), parallelZones: Number(req.headers['x-hardware-lanes']) } : null);
  if (clientHw) browserBudget.setClientHardware(clientHw);
  const { parseUniversalQuery } = require('../../utils/universalQueryEngine');
  const fullInput = query || `${category || ''} in ${location || ''}`.trim();
  const parsedNL = parseUniversalQuery(fullInput);
  const parsed = categoryRouter.parseSearchQuery({
    query: fullInput,
    category: parsedNL.category || category,
    location: parsedNL.location || location
  });
  const searchQuery = query || (parsed.category && parsed.location ? `${parsed.category} in ${parsed.location}` : (parsed.category || parsed.location));

  if (!parsed.category || !parsed.location) {
    return res.status(400).json({
      error: 'Category and location are required. Send "plumbers in Vijayawada" or separate category + location fields.'
    });
  }

  // Client Restriction: Client can ONLY scrape individual cities and mandals!
  const isMaster = req.headers['x-workspace-scope'] === 'master' || req.body.isMaster === true;
  const extVer = String(req.headers['x-scraper-extension'] || req.body?.extensionVersion || '').trim();
  if (extVer) {
    extensionRelayHub.registerHeartbeat({ userId, version: extVer, installed: true });
  }
  const isLocalRun = req.headers['x-run-mode'] === 'local' || req.headers['x-skip-extension'] === 'true' || req.body?.runLocal === true;
  if (!isMaster && !isLocalRun && extensionRelayHub.isExtensionOnlyMode() && !extVer && !extensionRelayHub.hasActiveExtension(userId)) {
    return res.status(428).json({
      ok: false,
      extensionRequired: true,
      storeUrl: String(process.env.EXTENSION_STORE_URL || '').trim(),
      packageUrl: '/api/scrape/extension-download',
      error: 'RAM Turbo is not connected. Add the extension to Chrome, then reload this page â€” it connects itself.'
    });
  }
  const requestedCode = requestedCountry(req);
  const detectedCountry = require('../../services/localBrain/countries').detectCountry(parsed.location || '');
  const runCountry = requestedCode || (detectedCountry && detectedCountry.code) || 'IN';
  if (!isMaster && runCountry === 'IN') {
    const { classifyLocation } = require('../../utils/universalGeoCluster');
    const locClassification = classifyLocation(parsed.location);
    if (locClassification.type === 'district') {
      const hqCity = locClassification.name.replace(/\b(district|dist|zila|jilla)\b/gi, '').trim() || parsed.location;
      addLog(`[Client Scope] District query "${parsed.location}" gracefully routed to primary urban center "${hqCity}" for high-yield parallel search.`);
      parsed.location = hqCity;
    } else if (locClassification.type === 'state') {
      const capitalCity = (Array.isArray(locClassification.subZones) && locClassification.subZones[0]) || 'Hyderabad';
      addLog(`[Client Scope] State query "${parsed.location}" gracefully routed to primary metropolitan center "${capitalCity}".`);
      parsed.location = capitalCity;
    }
  }

  if (creditsPreflight(res)) return;

  const matchedCategory = parsed.category;
  let baseLocation = parsed.location;

  // Correct genuinely misspelled places only. An exact city must never drift
  // to a same-named rural village ("Vijayawada" -> "Vijayawada Rural").
  const correctedLoc = require('../../services/searchSuggest').correctLocationName(baseLocation);
  if (correctedLoc && correctedLoc.toLowerCase() !== baseLocation.toLowerCase()) {
    addLog(`[Geo Typo Auto-Correct] Corrected search target location from "${baseLocation}" to "${correctedLoc}"`);
    baseLocation = correctedLoc;
  }

  const strategy = req.body.strategy || 'broad';

  // Reset Abort Signal for fresh run
  globalAbortSignal.aborted = false;

  // Ensure changes are safely flushed
  if (typeof dbAdapter.flushSync === 'function') {
    dbAdapter.flushSync();
  }

  const finalSessionId = sessionId || makeSessionId('omni');
  clearSessionAborted(finalSessionId);
  dbAdapter.registerSessionOwner(finalSessionId, userId);
  dbAdapter.registerSessionScope(finalSessionId, { userId, isMaster });
  const classification = categoryRouter.classifyCategory(matchedCategory);

  // If explicit engines are provided by the user/UI, honor them; otherwise route automatically.
  const explicitEngines = (Array.isArray(enabledEngines) && enabledEngines.length)
    ? enabledEngines
    : (Array.isArray(engines) && engines.length)
      ? engines
      : null;
  const resolvedEngines = (explicitEngines && !explicitEngines.includes('auto'))
    ? [...new Set(explicitEngines)]
    : (runCountry === 'IN'
      ? categoryRouter.pickAutoEngines(classification)
      : require('../../services/sources/registry').enginesForCountry(runCountry));

  // Register session immediately so jobs watchdog and client learn about active session
  const estimatedClassification = classifyLocation(baseLocation);
  const initialZoneCount = estimatedClassification?.zoneCount || (isMaster ? 250 : 120);
  activeSessions[finalSessionId] = {
    sessionId: finalSessionId,
    userId,
    category: matchedCategory,
    location: baseLocation,
    status: 'running',
    sessionActive: true,
    totalMandals: initialZoneCount,
    totalMandalsAcrossAll: initialZoneCount,
    startTime: Date.now()
  };

  // Append-only policy: a new search never deletes the previous dataset.
  // Stop the old deep job so it stops consuming browser slots, then leave the
  // store untouched. Folders and live leads both remain available.
  let purge = { removed: 0, engagedKept: 0, profilesRemoved: 0, vaultsRemoved: 0, appendOnly: true };
  let deepStopped = 0;
  try {
    const deepProfileService = require('../../services/deepProfileService');
    deepStopped = deepProfileService.stopAll('superseded by a fresh search');
  } catch (deepStopError) {
    addLog(`[Omni] Deep-cancel skipped: ${deepStopError.message}`);
  }

  const { resolveUniversalZones } = require('../../utils/universalGeoCluster');
  const resolvedPlanZones = resolveUniversalZones(baseLocation, matchedCategory, isMaster, runCountry) || [];

  res.json({
    message: 'Omni Search started. Zones are running in the background.',
    sessionId: finalSessionId,
    purge,
    deepStopped,
    plan: {
      category: matchedCategory,
      location: baseLocation,
      family: classification.family,
      familyLabel: classification.label,
      engines: resolvedEngines,
      zones: resolvedPlanZones,
      auto: true
    }
  });

  addLog(`\n[Omni Search] Triggered for string: "${searchQuery}" with radius: ${radius || 0}km. Session ID: ${finalSessionId}`);
  addLog(`[Omni Search] Family ${classification.label} Â· engines ${resolvedEngines.join(', ')}`);

  // Add the orchestrator task to the background queue so it starts running
  addScrapeJob('scrapeOmniOrchestrator', [matchedCategory, baseLocation, strategy, radius, gridDensity, resolvedEngines, finalSessionId, userId, {}, null, isMaster, runCountry], 10, { sessionId: finalSessionId, userId, isMaster, unmetered: true });
});

/**
 * Fully automatic scrape. Accepts one free-text query:
 *   { "query": "plumbers in Vijayawada" }
 * It classifies the category, chooses relevant engines, purges older leads
 * and dispatches the orchestrator. No engine knowledge is required.
 */
router.post('/auto', async (req, res) => {
  try {
    const { query, category, location, strategy = 'broad', radius, gridDensity, sessionId, userId: bodyUserId, engines, enabledEngines, hardware } = req.body;
    const userId = req.headers['x-user-id'] || bodyUserId || 'anonymous';
    const clientHw = hardware || (req.headers['x-hardware-ram'] ? { ramGb: Number(req.headers['x-hardware-ram']), parallelZones: Number(req.headers['x-hardware-lanes']) } : null);
    if (clientHw) browserBudget.setClientHardware(clientHw);
    const { parseUniversalQuery } = require('../../utils/universalQueryEngine');
    const fullInput = query || `${category || ''} in ${location || ''}`.trim();
    const parsedNL = parseUniversalQuery(fullInput);
    const resolvedCat = parsedNL.category || category;
    const resolvedLoc = parsedNL.location || location;
    const plan = categoryRouter.buildAutoPlan({ query: fullInput, category: resolvedCat, location: resolvedLoc });

    if (!plan.category || !plan.location) {
      return res.status(400).json({
        error: 'Could not resolve both a vendor category and a location. Try "plumbers in Vijayawada" or "electricians near Guntur".'
      });
    }

    // Client Restriction: Whole-district (18+ mandals) & state sweeps are restricted to Master!
    // Individual mandals (and their constituent villages), cities, towns, and localities are fully supported in Client.
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.body.isMaster === true;
    const extVer = String(req.headers['x-scraper-extension'] || req.body?.extensionVersion || '').trim();
    if (extVer) {
      extensionRelayHub.registerHeartbeat({ userId, version: extVer, installed: true });
    }
    const isLocalRun = req.headers['x-run-mode'] === 'local' || req.headers['x-skip-extension'] === 'true' || req.body?.runLocal === true;
    if (!isMaster && !isLocalRun && extensionRelayHub.isExtensionOnlyMode() && !extVer && !extensionRelayHub.hasActiveExtension(userId)) {
      return res.status(428).json({
        ok: false,
        extensionRequired: true,
        storeUrl: String(process.env.EXTENSION_STORE_URL || '').trim(),
        packageUrl: '/api/scrape/extension-download',
        error: 'RAM Turbo is not connected. Add the extension to Chrome, then reload this page â€” it connects itself.'
      });
    }
    const detectedCountry = require('../../services/localBrain/countries').detectCountry(plan.location || '');
    const country = requestedCountry(req) || (detectedCountry && detectedCountry.code) || 'IN';
    const { classifyLocation } = require('../../utils/universalGeoCluster');
    const locClassification = classifyLocation(plan.location);

    // Auto-populate constituent zones (e.g. all villages for a mandal, commercial sectors for a city, or mandals for a district)
    if (country === 'IN') {
      try {
        const sweepScopePolicy = require('../../services/sweepScopePolicy');
        const scopeOpts = { category: plan.category, isMaster };
        if (locClassification.type === 'mandal') {
          const mandalPlan = sweepScopePolicy.buildScopeZones('mandal', plan.location, scopeOpts);
          if (mandalPlan && Array.isArray(mandalPlan.zones) && mandalPlan.zones.length) {
            plan.zones = mandalPlan.zones;
            plan.resolvedScope = 'mandal';
            plan.district = mandalPlan.district;
            plan.state = mandalPlan.state;
            plan.mandal = mandalPlan.title;
            addLog(`[Auto Plan] Auto-resolved mandal "${plan.location}" into ${plan.zones.length} constituent villages/zones.`);
          }
        } else if (locClassification.type === 'city' || locClassification.type === 'town' || locClassification.type === 'metro') {
          const { resolveUniversalZones, AUTHORITATIVE_CLUSTERS } = require('../../utils/universalGeoCluster');
          const cleanLoc = (plan.location || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (AUTHORITATIVE_CLUSTERS[cleanLoc] || AUTHORITATIVE_CLUSTERS[cleanLoc.replace(/city|town/g, '')]) {
            const uniZones = resolveUniversalZones(plan.location, plan.category, isMaster, country);
            if (uniZones && uniZones.length) {
              plan.zones = uniZones.map(z => ({ name: z.zoneName, ...z }));
              plan.resolvedScope = 'city';
              addLog(`[Auto Plan] Auto-resolved authoritative city "${plan.location}" into ${plan.zones.length} commercial zones.`);
            }
          } else {
            const cityPlan = sweepScopePolicy.buildScopeZones('city', plan.location, { ...scopeOpts, countryCode: country });
            if (cityPlan && Array.isArray(cityPlan.zones) && cityPlan.zones.length > 1) {
              plan.zones = cityPlan.zones;
              plan.resolvedScope = 'city';
              plan.district = cityPlan.district;
              plan.state = cityPlan.state;
              addLog(`[Auto Plan] Auto-resolved city "${plan.location}" into ${plan.zones.length} commercial zones.`);
            } else {
              const uniZones = resolveUniversalZones(plan.location, plan.category, isMaster, country);
              if (uniZones && uniZones.length) {
                plan.zones = uniZones.map(z => ({ name: z.zoneName, ...z }));
                plan.resolvedScope = 'city';
                addLog(`[Auto Plan] Auto-resolved city "${plan.location}" into ${plan.zones.length} commercial zones.`);
              }
            }
          }
        } else if (locClassification.type === 'district') {
          const districtPlan = sweepScopePolicy.buildScopeZones('district', plan.location, scopeOpts);
          if (districtPlan && Array.isArray(districtPlan.zones) && districtPlan.zones.length) {
            plan.zones = districtPlan.zones;
            plan.resolvedScope = 'district';
            plan.district = districtPlan.title || plan.location;
            plan.state = districtPlan.state;
            addLog(`[Auto Plan] Auto-resolved district "${plan.location}" into ${plan.zones.length} constituent mandals & urban centers.`);
          }
        } else if (locClassification.type === 'state') {
          const statePlan = sweepScopePolicy.buildScopeZones('state', plan.location, scopeOpts);
          if (statePlan && Array.isArray(statePlan.zones) && statePlan.zones.length) {
            plan.zones = statePlan.zones;
            plan.resolvedScope = 'state';
            plan.state = statePlan.title || plan.location;
            addLog(`[Auto Plan] Auto-resolved state "${plan.location}" into ${plan.zones.length} regional district centers & commercial hubs.`);
          }
        } else if (locClassification.type === 'village') {
          const villagePlan = sweepScopePolicy.buildScopeZones('village', plan.location, scopeOpts);
          if (villagePlan && Array.isArray(villagePlan.zones) && villagePlan.zones.length) {
            plan.zones = villagePlan.zones;
            plan.resolvedScope = 'village';
            plan.district = villagePlan.district;
            plan.state = villagePlan.state;
            addLog(`[Auto Plan] Auto-resolved village "${plan.location}" into ${plan.zones.length} zones.`);
          }
        }
      } catch (scopeErr) {
        addLog(`[Auto Plan] Scope resolution error: ${scopeErr.message}`);
      }
    } else {
      // International city run: resolve through authoritative international boroughs or international sectors
      const { resolveUniversalZones } = require('../../utils/universalGeoCluster');
      const uniZones = resolveUniversalZones(plan.location, plan.category, isMaster, country);
      if (uniZones && uniZones.length) {
        plan.zones = uniZones.map(z => ({ name: z.zoneName, ...z }));
        plan.resolvedScope = 'city';
        addLog(`[Auto Plan] ${country} run: Auto-resolved city "${plan.location}" into ${plan.zones.length} international commercial zones.`);
      } else {
        plan.zones = [];
        plan.resolvedScope = 'city';
        addLog(`[Auto Plan] ${country} run: coordinate lattice will be planned by the orchestrator.`);
      }
    }

    // High-yield territorial zone allocation:
    // Allow comprehensive multi-locality, sub-vector, and GPS grid sweeps without artificial 64-zone bottlenecks.
    const MAX_AUTO_ZONES = isMaster ? 2600 : 400;
    if (Array.isArray(plan.zones) && plan.zones.length > MAX_AUTO_ZONES) {
      const before = plan.zones.length;
      plan.zones = plan.zones.slice(0, MAX_AUTO_ZONES);
      addLog(`[Auto Plan] High-yield zone cap applied: ${MAX_AUTO_ZONES} of ${before} zones for "${plan.location}".`);
    }

    const explicitEngines = (Array.isArray(enabledEngines) && enabledEngines.length)
      ? enabledEngines
      : (Array.isArray(engines) && engines.length)
        ? engines
        : null;
    const finalEngines = (explicitEngines && !explicitEngines.includes('auto'))
      ? [...new Set(explicitEngines)]
      : plan.engines;
    plan.engines = finalEngines;

    if (creditsPreflight(res)) return;

    const finalSessionId = sessionId || makeSessionId(isMaster ? 'master_sweep' : 'client_auto');
    globalAbortSignal.aborted = false;
    clearSessionAborted(finalSessionId);
    sessionAbortSignals.set(finalSessionId, { aborted: false });
    dbAdapter.registerSessionOwner(finalSessionId, userId);
    dbAdapter.registerSessionScope(finalSessionId, { userId, isMaster });
    if (typeof dbAdapter.flushSync === 'function') dbAdapter.flushSync();

    // Register session immediately so jobs watchdog and client learn about active session
    const autoZonesCount = Array.isArray(plan.zones) && plan.zones.length ? plan.zones.length : 64;
    activeSessions[finalSessionId] = {
      sessionId: finalSessionId,
      userId,
      category: plan.category,
      location: plan.location,
      status: 'running',
      sessionActive: true,
      totalMandals: autoZonesCount,
      totalMandalsAcrossAll: autoZonesCount,
      zones: plan.zones || [],
      startTime: Date.now()
    };

    // Append-only: the previous run's leads stay in the store and its folder
    // stays on disk. Only the background deep job is stopped.
    const purge = { removed: 0, engagedKept: 0, profilesRemoved: 0, vaultsRemoved: 0, appendOnly: true };
    let deepStopped = 0;
    try {
      const deepProfileService = require('../../services/deepProfileService');
      deepStopped = deepProfileService.stopAll('superseded by a fresh run');
    } catch (deepStopError) {
      addLog(`[Auto] Deep-cancel skipped: ${deepStopError.message}`);
    }

    res.json({
      message: 'Auto scrape started.',
      sessionId: finalSessionId,
      plan,
      purge,
      deepStopped
    });

    addLog(`\n[Auto Scrape] "${plan.category}" in "${plan.location}" Â· ${plan.familyLabel} Â· ${plan.engines.join(' + ')} Â· session ${finalSessionId}`);

    addScrapeJob('scrapeOmniOrchestrator', [
      plan.category,
      plan.location,
      strategy,
      radius,
      gridDensity,
      plan.engines,
      finalSessionId,
      userId,
      {},
      plan,
      isMaster,
      country
    ], 10, { sessionId: finalSessionId, userId, isMaster, unmetered: true });
  } catch (error) {
    console.error('[Auto Scrape Error Stack]', error.stack);
    addLog(`[Auto Scrape Error] ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MASTER GEO-COVERAGE SWEEP API (District, Mandal Cluster, & State Sweeps)
// Dedicated orchestrator for full-district and state coverage folders
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ENGINE & API HEALTH BOARD
// The master command center renders this as green/red chips so the operator
// knows which engines can actually answer before launching a swarm.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.post('/batch', async (req, res) => {
  const { tasks, queries = [], engines = ['google-serp-local'], sessionId = `batch_${Date.now()}` } = req.body;
  if ((!tasks || tasks.length === 0) && (!queries || queries.length === 0)) {
    return res.status(400).json({ error: 'Either tasks or queries array is required' });
  }

  if (tasks && tasks.length > 0) {
    for (const t of tasks) {
      const engs = t.engines || ['maps', 'justdial'];
      const resolvedData = await geocodeLocation(t.location);
      const accurateLocation = resolvedData && resolvedData.lat ? resolvedData.formattedLocation : t.location;
      const q = `${t.category} in ${accurateLocation}`;
      if (engs.includes('maps')) {
        await addScrapeJob('scrapeGooglePlaces', [q, t.category, accurateLocation, 'legacy', null, null, null]);
      }
    }
    return res.json({ success: true, message: `Successfully queued ${tasks.length} bulk tasks in background memory queue.` });
  }

  addLog(`[Batch Scraper] Dispatched parallel batch with ${queries.length} queries across concurrency pool`);
  res.json({
    success: true,
    sessionId,
    queriesCount: queries.length,
    status: 'dispatched'
  });

  defaultPool.runBatch(queries.map(q => async () => {
    try {
      const parsed = parseNaturalLanguageQuery(q);
      const cat = parsed.category || 'Business';
      const loc = parsed.location || 'India';
      addLog(`[Batch Worker] Scraping: "${cat}" in "${loc}"`);
      await scrapeGoogleLocalFinder(q, cat, loc, sessionId, 5);
    } catch (err) {
      addLog(`[Batch Worker Error] Failed on "${q}": ${err.message}`);
    }
  })).catch(err => console.error('[Batch Pool Error]', err));
});

router.post('/upload', async (req, res) => {
  const { tasks } = req.body;
  if (!tasks || !Array.isArray(tasks)) return res.status(400).json({ error: 'Invalid tasks array' });

  for (const t of tasks) {
    const engines = t.engines || ['maps'];
    const aiKeywords = await getKeywordSynonyms(t.category);

    // Free geocoding (OpenStreetMap Nominatim first)
    const resolvedData = await geocodeLocation(t.location);
    const accurateLocation = resolvedData && resolvedData.lat ? resolvedData.formattedLocation : t.location;
    const q = `${t.category} in ${accurateLocation}`;

    if (engines.includes('maps') || engines.includes('google')) {
      await addScrapeJob('scrapeGooglePlaces', [q, t.category, accurateLocation, aiKeywords, 'legacy', null, null, null]);
    }
  }

  res.json({ success: true, message: `Successfully queued ${tasks.length} bulk tasks in background memory queue.` });
});

router.get('/batch/progress', async (req, res) => {
  res.json(batchProgress);
});


module.exports = router;
