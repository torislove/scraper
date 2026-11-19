const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Engines
const { scrapeGooglePlaces, setDeps: setPlacesDeps } = require('../scrapers/engine-google-places');
const { scrapeOpenStreetMap, setDeps: setOsmDeps } = require('../scrapers/engine-openstreetmap');
const { scrapeWebContact, setDeps: setWebContactDeps } = require('../scrapers/engine-web-contact');
const { scrapeGoogleSerp, setDeps: setSerpDeps } = require('../scrapers/engine-google-serp');
const { scrapeGoogleLocalFinder, setDeps: setLocalFinderDeps } = require('../scrapers/engine-google-serp-local');
const { scrapeDuckDuckGoDork, setLogger: setDorkLogger } = require('../scrapers/engine-social-dork');
const { scrapeJustDial, setDeps: setJDDeps } = require('../scrapers/engine-justdial');
const { scrapeWeddingBazaar, setDeps: setWBDeps } = require('../scrapers/engine-weddingbazaar');
const { scrapeWeddingWire, setDeps: setWWDeps } = require('../scrapers/engine-weddingwire');
const { scrapeMandap, setDeps: setMandapDeps } = require('../scrapers/engine-mandap');
const { scrapeBraveDork, setDeps: setBraveDeps } = require('../scrapers/engine-brave-dork');
const { scrapeCrawleeDeep, setDeps: setCrawleeDeps } = require('../scrapers/engine-crawlee-deep');
const { scrapePuppeteerIndiaMart, setDeps: setIndiaMartDeps } = require('../scrapers/engine-puppeteer-indiamart');
const { scrapeYellowPagesGlobal, setDeps: setYpDeps } = require('../scrapers/engine-yellowpages-global');
const { scrapeYelp, setDeps: setYelpDeps } = require('../scrapers/engine-yelp');
const { scrapeBingPlaces, setDeps: setBingPlacesDeps } = require('../scrapers/engine-bing-places');
const { scrapeTripAdvisor, setDeps: setTripAdvisorDeps } = require('../scrapers/engine-tripadvisor');
const { scrapeWikidata, setDeps: setWikidataDeps } = require('../scrapers/engine-wikidata-businesses');
const { scrapeSocialDorkIntl, setDeps: setSocialDorkDeps } = require('../scrapers/engine-social-dork-intl');
const { scrapeFreeIndexUK, setDeps: setFreeIndexDeps } = require('../scrapers/engine-freeindex-uk');
const { scrapeGoldenPagesIE, setDeps: setGoldenPagesDeps } = require('../scrapers/engine-goldenpages-ie');
const { scrapeCylex, setDeps: setCylexDeps } = require('../scrapers/engine-cylex');
const { scrapeTrustpilot, setDeps: setTrustpilotDeps } = require('../scrapers/engine-trustpilot');

const { initQueue, registerTask, addScrapeJob, clearQueue, clearQueueForSession, getActiveJobs, getConcurrencyMetrics } = require('../utils/queue');
const { geocodeLocation } = require('../utils/olaMaps');
const { getKeywordSynonyms } = require('../utils/aiParser');
const intelligentExtractor = require('../utils/intelligentExtractor');
const { parseNaturalLanguageQuery } = require('../utils/queryParser');
const { resolveUniversalZones, ZONE_COORDINATES, classifyLocation } = require('../utils/universalGeoCluster');
const { fastWebsiteExtract } = require('../utils/fastWebsiteExtractor');
const geoAI = require('../utils/geoAI');
const dbAdapter = require('../config/dbAdapter');
const { defaultPool } = require('../scrapers/concurrencyManager');
const categoryRouter = require('../services/categoryRouter');
const credits = require('../services/credits');
const engineHealth = require('../services/engineHealth');
const requestGuard = require('../utils/requestGuard');
const { buildScopeZones } = require('../services/sweepScopePolicy');
const { makeSessionId } = require('../utils/sessionId');
const { buildCountrySweepPlan } = require('../services/countrySweepPlan');
const { runOmniSearchOrchestrator, isInsideDistrictBoundary } = require('../services/omniSearchOrchestrator');
const { persistSessionVault } = require('../services/sessionVaultService');
const leadArchive = require('../services/leadArchive');
const outOfBoundsVault = require('../services/outOfBoundsVault');
const { SESSIONS_DIR } = require('../config/paths');
const etaModel = require('../utils/etaModel');

/**
 * The country the operator selected in the UI. This is authoritative for the
 * whole run: engine bundles, Google `gl`, phone parsing and admin vocabulary.
 * Without it a city like "Troy" falls back to India, which is exactly how
 * Indian numbers used to appear in US results.
 */
function requestedCountry(req) {
  const raw = String(
    (req.body && req.body.country)
    || req.headers['x-country']
    || (req.query && req.query.country)
    || ''
  ).trim().toUpperCase();
  if (!raw) return null;
  if (raw === 'UK') return 'GB';
  return /^[A-Z]{2}$/.test(raw) ? raw : null;
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Safe execute wrapper. When an engine key is supplied the outcome is written
// to the engine health ledger so the master board can show live green/red state.
async function safeExecute(fn, name = 'Operation', logger = console.log, engineKey = null) {
  const startedAt = Date.now();
  try {
    const result = await fn();
    if (engineKey) {
      engineHealth.recordRun(engineKey, {
        ok: true,
        ms: Date.now() - startedAt,
        note: result && typeof result === 'object' ? result.note || '' : '',
        count: Array.isArray(result)
          ? result.length
          : (result && typeof result === 'object'
            ? Number(result.totalScraped ?? result.newInserted ?? result.found ?? result.count ?? 0)
            : null)
      });
      // Feed the same outcome to the politeness guard. An engine that answered
      // with a CAPTCHA/429/403 rests; an engine that answered normally resets.
      requestGuard.observe(engineKey, { ok: true, result });
    }
    return result;
  } catch (error) {
    if (engineKey) {
      engineHealth.recordRun(engineKey, {
        ok: false,
        error: error.message,
        ms: Date.now() - startedAt
      });
      requestGuard.observe(engineKey, { ok: false, error: error.message });
    }
    logger(`[SafeExecute] ${name} failed: ${error.message}`);
    return null;
  }
}

let batchProgress = { total: 0, completed: 0, currentTask: '', isActive: false };
let globalAbortSignal = { aborted: false };
const sessionAbortSignals = new Map();

function isSessionAborted(sessionId) {
  if (sessionId) {
    const sig = sessionAbortSignals.get(sessionId);
    if (sig && sig.aborted) return true;
    if (activeSessions[sessionId]?.aborted || activeSessions[sessionId]?.status === 'aborted') return true;
    return false;
  }
  return Boolean(globalAbortSignal.aborted);
}

let addLog = console.log;
let emitVendorEvent = () => { };
let emitGridEvent = () => { };
let emitDispatchEvent = () => { };
let emitProgressEvent = () => { };
let emitActivePointEvent = () => { };

function formatEta(ms) {
  if (ms <= 0) return '0s';
  const totalSecs = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

const activeSessions = {};

/**
 * True while a session is still writing leads. Folder delete uses this to
 * refuse removing a live vault that the orchestrator would recreate.
 */
function isSessionActive(sessionId) {
  const session = activeSessions[sessionId];
  if (!session) return false;
  if (session.finished) return false;
  return session.status === 'running'
    || session.status === 'stopping'
    || session.sessionActive === true;
}

function updateSessionTargetState(sessionId, loc, status) {
  if (!sessionId || !loc) return;
  const session = activeSessions[sessionId];
  if (!session) return;

  const key = (loc || '').toLowerCase().trim();
  session.completedTargetsMap = session.completedTargetsMap || {};
  session.completedTargetsMap[key] = status;

  if (!session.completedZoneNames) session.completedZoneNames = [];
  if (!session.completedZoneIndices) session.completedZoneIndices = [];

  if (status === 'completed' && !session.completedZoneNames.includes(loc)) {
    session.completedZoneNames.push(loc);
    if (Array.isArray(session.zones)) {
      const zIdx = session.zones.findIndex(z => String(z.zoneName || z.name || '').toLowerCase().trim() === key);
      if (zIdx !== -1 && !session.completedZoneIndices.includes(zIdx)) {
        session.completedZoneIndices.push(zIdx);
      }
    }
  }

  let completedCount = 0;
  let runningCount = 0;
  Object.keys(session.completedTargetsMap).forEach(k => {
    if (session.completedTargetsMap[k] === 'completed') completedCount++;
    if (session.completedTargetsMap[k] === 'running') runningCount++;
  });

  const activeTotal = Number(session.overallTotalMandals || session.totalMandals) || 0;
  session.overallCompletedMandals = activeTotal
    ? Math.min(completedCount, activeTotal)
    : completedCount;

  if (status === 'running') {
    session.activeMandal = loc;

    // Find district for this subLoc
    if (session.fullHierarchy && Array.isArray(session.fullHierarchy)) {
      const targetDistrict = session.fullHierarchy.find(d =>
        (d.mandals || []).some(m => m.toLowerCase().trim() === key)
      );
      if (targetDistrict) {
        session.activeDistrict = targetDistrict.districtName;
      }
    }
  }

  // Always emit the active point so the map can fly to the exact area being
  // scraped. City-scoped engines (JustDial, wedding suites) fall back to the
  // geocoded base location instead of disappearing from the radar.
  try {
    const { ZONE_COORDINATES } = require('../utils/universalGeoCluster');
    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanKey = norm(key);
    let zCoords = ZONE_COORDINATES[key] || ZONE_COORDINATES[cleanKey];
    if (!zCoords && session.zones && Array.isArray(session.zones)) {
      zCoords = session.zones.find(z => norm(z.zoneName || z.name) === cleanKey);
    }
    if (!zCoords && session.baseLat && session.baseLng) {
      zCoords = { lat: session.baseLat, lng: session.baseLng };
    }
    if (zCoords && Number.isFinite(Number(zCoords.lat)) && Number.isFinite(Number(zCoords.lng))) {
      emitActivePointEvent({
        lat: Number(zCoords.lat),
        lng: Number(zCoords.lng),
        zoneName: loc,
        locationName: loc,
        district: session.activeDistrict || loc,
        sessionId,
        active: status === 'running',
        completed: status === 'completed',
        instanceId: 1
      });
    }
  } catch (e) { }

  // Update completedDistricts count
  let completedDistrictsCount = 0;
  if (session.fullHierarchy && Array.isArray(session.fullHierarchy)) {
    session.fullHierarchy.forEach(d => {
      const allMandalsDone = (d.mandals || []).every(m =>
        session.completedTargetsMap[m.toLowerCase().trim()] === 'completed'
      );
      if (allMandalsDone) completedDistrictsCount++;
    });
  }
  session.completedDistricts = completedDistrictsCount;

  // Calculate ETA & Velocity
  let velocity = '0.0';
  let totalFound = 0;
  try {
    const vendors = dbAdapter.getVendors() || [];
    totalFound = vendors.filter(v => v.sessionId === sessionId).length;
    const elapsedSec = Math.max(1, (Date.now() - session.startTime) / 1000);
    velocity = (totalFound / elapsedSec).toFixed(1);
  } catch (e) { }

  const totalZonesCount = session.totalMandalsAcrossAll || session.totalMandals || (Array.isArray(session.zones) ? session.zones.length : Object.keys(session.completedTargetsMap).length);

  if (completedCount > 0) {
    const elapsed = Date.now() - session.startTime;
    const avgTime = elapsed / completedCount;
    const remaining = Math.max(0, totalZonesCount - completedCount);
    session.eta = formatEta(remaining * avgTime);
  }

  const metrics = typeof getConcurrencyMetrics === 'function' ? getConcurrencyMetrics() : { activeWorkers: 6 };

  try {
    emitProgressEvent({
      sessionId,
      totalDistricts: session.totalDistricts || 1,
      completedDistricts: session.completedDistricts || 0,
      activeDistrict: session.activeDistrict,
      totalMandals: totalZonesCount,
      completedMandals: completedCount,
      activeMandal: session.activeMandal,
      totalMandalsAcrossAll: totalZonesCount,
      overallCompletedMandals: completedCount,
      eta: session.eta,
      velocity,
      activeWorkers: metrics.activeWorkers || 6,
      maxWorkers: metrics.maxWorkers || 12,
      freeRamPct: metrics.freeRamPct || 50,
      totalLeads: totalFound,
      sessionActive: true,
      fullHierarchy: session.fullHierarchy,
      targetsMap: session.completedTargetsMap
    });
  } catch (e) { }
}

// Register tasks
registerTask('scrapeGoogleLocalFinder', async (q, cat, loc, sessionId, maxPages, district, stateName, centerCoords, cityHint, mapsBackup, isMaster = false, scope = null, countryHint = null) => {
  updateSessionTargetState(sessionId, loc, 'running');
  const res = await safeExecute(() => scrapeGoogleLocalFinder(q, cat, loc, sessionId, maxPages, district, stateName, centerCoords, cityHint, mapsBackup, isMaster, scope, countryHint), 'Google Local Finder Scrape', addLog, 'google-local-finder');
  updateSessionTargetState(sessionId, loc, 'completed');
  return res;
});
registerTask('scrapeGooglePlaces', async (q, cat, loc, sessionId, centerLat, centerLng, radiusKm, strategy, district, stateName, boundingbox, cityHint, isMaster = false, scope = null, mandal = null, countryHint = null) => {
  updateSessionTargetState(sessionId, loc, 'running');
  const res = await safeExecute(() => scrapeGooglePlaces(q, cat, loc, sessionId, centerLat, centerLng, radiusKm, strategy, district, stateName, boundingbox, cityHint, isMaster, scope, mandal, countryHint), 'Google Places Scrape', addLog, 'maps');
  updateSessionTargetState(sessionId, loc, 'completed');
  return res;
});
registerTask('scrapeGoogleSerp', async (q, cat, loc, sessionId) => {
  updateSessionTargetState(sessionId, loc, 'running');
  const res = await safeExecute(() => scrapeGoogleSerp(q, cat, loc, sessionId), 'Google Serp Scrape', addLog, 'google-serp');
  updateSessionTargetState(sessionId, loc, 'completed');
  return res;
});
registerTask('scrapeJustDial', async (cat, loc, dummy, sessionId) => {
  updateSessionTargetState(sessionId, loc, 'running');
  const res = await safeExecute(() => scrapeJustDial(cat, loc, sessionId), 'JustDial Scrape', addLog, 'justdial');
  updateSessionTargetState(sessionId, loc, 'completed');
  return res;
});
registerTask('scrapeWeddingBazaar', async (cat, loc, dummy, sessionId) => safeExecute(() => scrapeWeddingBazaar(cat, loc, sessionId), 'WeddingBazaar Scrape', addLog, 'weddingbazaar'));
registerTask('scrapeWeddingWire', async (cat, loc, dummy, sessionId, countryCode) => safeExecute(() => scrapeWeddingWire(cat, loc, sessionId, countryCode), 'WeddingWire Scrape', addLog, 'weddingwire'));
registerTask('scrapeMandap', async (cat, loc, dummy, sessionId) => safeExecute(() => scrapeMandap(cat, loc, sessionId), 'Mandap Scrape', addLog, 'mandap'));
registerTask('scrapeOpenStreetMap', async (cat, loc, dummy, sessionId, lat, lng, radiusKm) => {
  const res = await safeExecute(
    () => scrapeOpenStreetMap(cat, loc, sessionId, lat, lng, radiusKm),
    'OpenStreetMap Scrape',
    addLog,
    'openstreetmap'
  );
  return res;
});
registerTask('scrapeDuckDuckGoDork', async (domain, q, cat, loc, sessionId, countryCode = 'IN', userId = 'admin_1') => {
  const sig = (sessionId && sessionAbortSignals.get(sessionId)) || globalAbortSignal;
  return safeExecute(() => scrapeDuckDuckGoDork(domain, q, cat, loc, sig, sessionId, countryCode, userId), `Social Engine ${domain}`, addLog, 'social');
});
registerTask('scrapeBraveDork', async (domain, q, cat, loc, sessionId) => safeExecute(() => scrapeBraveDork(domain, q, cat, loc, sessionId), `Brave Dork ${domain}`, addLog, 'brave'));
registerTask('scrapeCrawleeDeep', async (url, vendorName, cat, loc, sessionId) => safeExecute(() => scrapeCrawleeDeep(url, vendorName, cat, loc, sessionId), 'Crawlee Deep Scrape', addLog));
registerTask('scrapePuppeteerIndiaMart', async (cat, loc, dummy, sessionId) => {
  updateSessionTargetState(sessionId, loc, 'running');
  const res = await safeExecute(() => scrapePuppeteerIndiaMart(cat, loc, sessionId), 'IndiaMart Stealth Scrape', addLog, 'indiamart');
  updateSessionTargetState(sessionId, loc, 'completed');
  return res;
});
registerTask('scrapeYellowPagesGlobal', async (cat, loc, sessionId, opts = {}) => {
  const sig = (sessionId && sessionAbortSignals.get(sessionId)) || globalAbortSignal;
  if (typeof setYpDeps === 'function') setYpDeps({ logger: addLog, emitVendorEvent, abortSignal: sig });
  return safeExecute(() => scrapeYellowPagesGlobal(cat, loc, sessionId, opts), `YellowPages Global ${opts.countryCode || ''}`, addLog, 'yellowpages');
});
registerTask('scrapeYelp', async (cat, loc, sessionId, opts = {}) => {
  const sig = (sessionId && sessionAbortSignals.get(sessionId)) || globalAbortSignal;
  if (typeof setYelpDeps === 'function') setYelpDeps({ logger: addLog, emitVendorEvent, abortSignal: sig });
  return safeExecute(() => scrapeYelp(cat, loc, sessionId, opts), `Yelp ${opts.countryCode || ''}`, addLog, 'yelp');
});
registerTask('scrapeBingPlaces', async (cat, loc, sessionId, opts = {}) => {
  const sig = (sessionId && sessionAbortSignals.get(sessionId)) || globalAbortSignal;
  if (typeof setBingPlacesDeps === 'function') setBingPlacesDeps({ logger: addLog, emitVendorEvent, abortSignal: sig });
  return safeExecute(() => scrapeBingPlaces(cat, loc, sessionId, opts), `Bing Places ${opts.countryCode || ''}`, addLog, 'bing-places');
});
registerTask('scrapeTripAdvisor', async (cat, loc, sessionId, opts = {}) => {
  const sig = (sessionId && sessionAbortSignals.get(sessionId)) || globalAbortSignal;
  if (typeof setTripAdvisorDeps === 'function') setTripAdvisorDeps({ logger: addLog, emitVendorEvent, abortSignal: sig });
  return safeExecute(() => scrapeTripAdvisor(cat, loc, sessionId, opts), `TripAdvisor ${opts.countryCode || ''}`, addLog, 'tripadvisor');
});
registerTask('scrapeWikidata', async (cat, loc, sessionId, countryCode = 'US') => {
  const sig = (sessionId && sessionAbortSignals.get(sessionId)) || globalAbortSignal;
  if (typeof setWikidataDeps === 'function') setWikidataDeps({ logger: addLog, emitVendorEvent, abortSignal: sig });
  return safeExecute(() => scrapeWikidata(cat, loc, sessionId, countryCode), `Wikidata ${countryCode}`, addLog, 'wikidata');
});
registerTask('scrapeSocialDorkIntl', async (cat, loc, sessionId, countryCode = 'US') => {
  const sig = (sessionId && sessionAbortSignals.get(sessionId)) || globalAbortSignal;
  if (typeof setSocialDorkDeps === 'function') setSocialDorkDeps({ logger: addLog, emitVendorEvent, abortSignal: sig });
  return safeExecute(() => scrapeSocialDorkIntl(cat, loc, sessionId, countryCode), `Social Dork ${countryCode}`, addLog, 'social-dork');
});
registerTask('scrapeFreeIndexUK', async (cat, loc, sessionId) => {
  const sig = (sessionId && sessionAbortSignals.get(sessionId)) || globalAbortSignal;
  if (typeof setFreeIndexDeps === 'function') setFreeIndexDeps({ logger: addLog, emitVendorEvent, abortSignal: sig });
  return safeExecute(() => scrapeFreeIndexUK(cat, loc, sessionId), 'FreeIndex UK', addLog, 'freeindex');
});
registerTask('scrapeGoldenPagesIE', async (cat, loc, sessionId) => {
  const sig = (sessionId && sessionAbortSignals.get(sessionId)) || globalAbortSignal;
  if (typeof setGoldenPagesDeps === 'function') setGoldenPagesDeps({ logger: addLog, emitVendorEvent, abortSignal: sig });
  return safeExecute(() => scrapeGoldenPagesIE(cat, loc, sessionId), 'GoldenPages Ireland', addLog, 'goldenpages');
});
registerTask('scrapeCylex', async (cat, loc, sessionId, opts = {}) => {
  const sig = (sessionId && sessionAbortSignals.get(sessionId)) || globalAbortSignal;
  if (typeof setCylexDeps === 'function') setCylexDeps({ logger: addLog, emitVendorEvent, abortSignal: sig });
  return safeExecute(() => scrapeCylex(cat, loc, sessionId, opts), `Cylex ${opts.countryCode || ''}`, addLog, 'cylex');
});
registerTask('scrapeTrustpilot', async (cat, loc, sessionId, opts = {}) => {
  const sig = (sessionId && sessionAbortSignals.get(sessionId)) || globalAbortSignal;
  if (typeof setTrustpilotDeps === 'function') setTrustpilotDeps({ logger: addLog, emitVendorEvent, abortSignal: sig });
  return safeExecute(() => scrapeTrustpilot(cat, loc, sessionId, opts), `Trustpilot ${opts.countryCode || ''}`, addLog, 'trustpilot');
});
registerTask('scrapeOmniOrchestrator', async (category, baseLocation, strategy, radius, gridDensity, enabledEngines, sessionId, userId, filters = {}, plan = null, isMaster = false, country = null) =>
  safeExecute(() => runOmniSearchOrchestrator(category, baseLocation, strategy, radius, gridDensity, enabledEngines, sessionId, userId, filters, plan, isMaster, {
    activeSessions,
    sessionAbortSignals,
    globalAbortSignal,
    addScrapeJob,
    addLog: (...args) => addLog(...args),
    emitVendorEvent: (...args) => emitVendorEvent(...args),
    emitGridEvent: (...args) => emitGridEvent(...args),
    emitDispatchEvent: (...args) => emitDispatchEvent(...args),
    emitProgressEvent: (...args) => emitProgressEvent(...args),
    emitActivePointEvent: (...args) => emitActivePointEvent(...args),
    isSessionAborted
  }, country), 'Omni Search Orchestrator', addLog)
);

function setDeps(deps) {
  addLog = deps.logger;
  globalAbortSignal = deps.abortSignal;
  if (deps.emitVendorEvent) emitVendorEvent = deps.emitVendorEvent;
  if (deps.emitGridEvent) emitGridEvent = deps.emitGridEvent;
  if (deps.emitDispatchEvent) emitDispatchEvent = deps.emitDispatchEvent;
  if (deps.emitProgressEvent) emitProgressEvent = deps.emitProgressEvent;
  if (deps.emitActivePointEvent) emitActivePointEvent = deps.emitActivePointEvent;
  if (typeof setLocalFinderDeps !== 'undefined') setLocalFinderDeps(deps);
  if (typeof setPlacesDeps !== 'undefined') setPlacesDeps(deps);
  if (typeof setOsmDeps !== 'undefined') setOsmDeps(deps);
  if (typeof setWebContactDeps !== 'undefined') setWebContactDeps(deps);
  if (typeof setDorkLogger !== 'undefined') setDorkLogger(deps.logger);
  if (typeof setSerpDeps !== 'undefined') setSerpDeps(deps);
  if (typeof setCrawleeDeps !== 'undefined') setCrawleeDeps(deps);

  if (typeof setJDDeps !== 'undefined') setJDDeps(deps);
  if (typeof setWBDeps !== 'undefined') setWBDeps(deps);
  if (typeof setWWDeps !== 'undefined') setWWDeps(deps);
  if (typeof setMandapDeps !== 'undefined') setMandapDeps(deps);
  if (typeof setBraveDeps !== 'undefined') setBraveDeps(deps);
  if (typeof setIndiaMartDeps !== 'undefined') setIndiaMartDeps(deps);
  if (typeof setYpDeps !== 'undefined') setYpDeps(deps);
  if (typeof setYelpDeps !== 'undefined') setYelpDeps(deps);
  if (typeof setBingPlacesDeps !== 'undefined') setBingPlacesDeps(deps);
  if (typeof setTripAdvisorDeps !== 'undefined') setTripAdvisorDeps(deps);
  if (typeof setWikidataDeps !== 'undefined') setWikidataDeps(deps);
  if (typeof setSocialDorkDeps !== 'undefined') setSocialDorkDeps(deps);
  if (typeof setFreeIndexDeps !== 'undefined') setFreeIndexDeps(deps);
  if (typeof setGoldenPagesDeps !== 'undefined') setGoldenPagesDeps(deps);
  if (typeof setCylexDeps !== 'undefined') setCylexDeps(deps);
  if (typeof setTrustpilotDeps !== 'undefined') setTrustpilotDeps(deps);

  initQueue(deps);
}

const { getSettings, updateSettings } = require('../config/settingsManager');
const { resolveIntervention } = require('../utils/manualIntervention');

router.post('/resolve-intervention', (req, res) => {
  const { platform, action } = req.body;
  if (!platform || !action) return res.status(400).json({ error: 'Missing platform or action' });

  const shouldContinue = action === 'yes';
  const resolved = resolveIntervention(platform, shouldContinue);

  if (resolved) {
    res.json({ success: true, message: `Intervention for ${platform} resolved as ${action}` });
  } else {
    res.status(404).json({ error: `No pending intervention for ${platform}` });
  }
});

router.get('/settings', (req, res) => {
  const settings = getSettings();
  res.json({
    ...settings,
    aiProvider: 'Local brain (offline, no key required)',
    mapsProvider: 'OpenStreetMap (free, no key)',
    geocodingProvider: 'OpenStreetMap Nominatim (free, no key)',
    searchProvider: 'Public web results (free, no key)'
  });
});

router.post('/settings', (req, res) => {
  // This product has no API keys. Anything secret-looking is ignored so an old
  // client cannot write a key back into settings.json.
  const newSettings = updateSettings({});
  res.json({ success: true, message: 'No keys are needed. Nothing to save.', settings: newSettings });
});

const activeCronJobs = {};

router.get('/jobs', (req, res) => {
  const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';
  const requestingUserId = req.headers['x-user-id'];

  const cronJobs = isMaster ? Object.keys(activeCronJobs).map(cat => ({
    category: cat,
    interval: activeCronJobs[cat].interval,
    status: activeCronJobs[cat].status,
    location: activeCronJobs[cat].location
  })) : [];

  // Include recent sessions, finished or running, filtered by user identity
  const now = Date.now();
  const recentSessions = Object.values(activeSessions).filter(s => {
    const started = Number(s.startTime) || 0;
    const isRecent = !started || now - started < 2 * 60 * 60 * 1000;
    if (!isRecent) return false;
    if (isMaster) return true;
    if (!requestingUserId || requestingUserId === 'anonymous') {
      return !s.userId || s.userId === 'anonymous';
    }
    return s.userId === requestingUserId || s.clientId === requestingUserId;
  });

  const activeQueue = (typeof getActiveJobs === 'function') ? getActiveJobs() : [];

  const omniJobs = recentSessions.map(s => ({
    id: s.sessionId || `session_${s.category}`,
    category: s.category,
    location: s.location,
    status: s.finished ? (s.status === 'failed' ? 'failed' : 'completed') : 'running',
    sessionActive: !s.finished,
    finishedAt: s.finishedAt || null,
    startTime: s.startTime || null,
    activeDistrict: s.activeDistrict,
    activeMandal: s.activeMandal,
    completedCount: s.overallCompletedMandals,
    totalCount: s.overallTotalMandals || s.totalMandals || Object.keys(s.completedTargetsMap || {}).length,
    etaText: s.eta,
    type: 'omni'
  }));

  // If queue has jobs running, also expose them
  if (omniJobs.length === 0 && activeQueue.length > 0 && isMaster) {
    activeQueue.forEach((qJob, idx) => {
      omniJobs.push({
        id: `queue_${idx}`,
        category: qJob.args?.[1] || 'Business',
        location: qJob.args?.[2] || 'India',
        status: 'running',
        taskName: qJob.taskName,
        type: 'queue'
      });
    });
  }

  res.json([...omniJobs, ...cronJobs]);
});

router.get('/active', (req, res) => {
  const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';
  const requestingUserId = req.headers['x-user-id'];

  let sessions = Object.values(activeSessions);
  if (!isMaster) {
    if (requestingUserId && requestingUserId !== 'anonymous') {
      sessions = sessions.filter(s => s.userId === requestingUserId || s.clientId === requestingUserId);
    } else {
      sessions = sessions.filter(s => !s.userId || s.userId === 'anonymous');
    }
  }

  // Prefer the genuinely live session, newest first.
  const newestFirst = (a, b) => (b.startTime || 0) - (a.startTime || 0);
  const liveSession = sessions
    .filter(s => s.sessionActive && !s.finished && s.status !== 'aborted' && s.status !== 'completed' && !globalAbortSignal.aborted)
    .sort(newestFirst)[0];
  const runningSession = liveSession
    || sessions.slice().sort(newestFirst)[0]
    || null;

  const activeQueue = (typeof getActiveJobs === 'function') ? getActiveJobs() : [];
  const sessionIsLive = Boolean(
    runningSession
    && !runningSession.finished
    && runningSession.status !== 'aborted'
    && runningSession.status !== 'completed'
    && runningSession.overallCompletedMandals < (runningSession.overallTotalMandals || 1)
  );
  const isScraping = (isMaster && activeQueue.length > 0) || sessionIsLive;

  res.json({
    isScraping: Boolean(isScraping),
    session: runningSession,
    queueCount: activeQueue.length,
    category: runningSession?.category || activeQueue[0]?.args?.[1] || null,
    location: runningSession?.location || activeQueue[0]?.args?.[2] || null,
    activeMandal: runningSession?.activeMandal || null,
    activeDistrict: runningSession?.activeDistrict || null,
    eta: runningSession?.eta || null
  });
});


router.post('/jobs/update', (req, res) => {
  const { category, action, intervalMs, location } = req.body;

  if (action === 'create') {
    if (!category || !location) return res.status(400).json({ error: 'Category and location required' });
    const ms = intervalMs || 24 * 60 * 60 * 1000; // default 24h
    if (activeCronJobs[category]) {
      clearInterval(activeCronJobs[category].timer);
    }

    // Create new scheduled job
    activeCronJobs[category] = {
      category,
      location,
      interval: ms,
      status: 'running',
      timer: setInterval(() => {
        addLog(`[Scheduler] Triggering scheduled scrape for ${category} in ${location}`);
        const searchString = `${category} in ${location}`;
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}`;
        addScrapeJob('scrapeGooglePlaces', [searchUrl, category, location, 'scheduled', null, null, 10, 'mandal']);
      }, ms)
    };

    // Also trigger it immediately the first time
    addLog(`[Scheduler] Triggering initial scrape for ${category} in ${location}`);
    const searchString = `${category} in ${location}`;
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}`;
    addScrapeJob('scrapeGooglePlaces', [searchUrl, category, location, 'scheduled', null, null, 10, 'mandal']);

    return res.json({ success: true, message: `Scheduled job created for ${category}` });
  }

  const job = activeCronJobs[category];
  if (!job) return res.status(404).json({ error: 'Job not found' });

  if (action === 'stop') {
    clearInterval(job.timer);
    job.status = 'stopped';
  } else if (action === 'start') {
    if (job.status === 'stopped') {
      const ms = intervalMs || job.interval;
      job.interval = ms;
      job.status = 'running';
      job.timer = setInterval(() => {
        addLog(`[Scheduler] Triggering scheduled scrape for ${job.category} in ${job.location}`);
        const searchString = `${job.category} in ${job.location}`;
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}`;
        addScrapeJob('scrapeGooglePlaces', [searchUrl, job.category, job.location, 'scheduled', null, null, 10, 'mandal']);
      }, ms);
    }
  } else if (action === 'update_interval') {
    clearInterval(job.timer);
    job.interval = intervalMs;
    job.status = 'running';
    job.timer = setInterval(() => {
      addLog(`[Scheduler] Triggering scheduled scrape for ${job.category} in ${job.location}`);
      const searchString = `${job.category} in ${job.location}`;
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}`;
      addScrapeJob('scrapeGooglePlaces', [searchUrl, job.category, job.location, 'scheduled', null, null, 10, 'mandal']);
    }, intervalMs);
  }

  res.json({ success: true, message: `Job for ${category} updated.` });
});

// MANUAL SCRAPER TRIGGERS
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
  const { location } = req.body;
  if (!location) return res.status(400).json({ error: 'Location required' });

  // Auto-correct location typos before checking scope
  const parsed = parseNaturalLanguageQuery(location);
  const cleanLocation = parsed.location || parsed.category || location;
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
function chargeOmniCredits() {
  return { ok: true };
}

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
  const { query, category, location, radius, gridDensity, enabledEngines, engines, sessionId, userId: bodyUserId } = req.body;
  const userId = req.headers['x-user-id'] || bodyUserId || 'anonymous';
  const { parseUniversalQuery } = require('../utils/universalQueryEngine');
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
  const requestedCode = requestedCountry(req);
  const detectedCountry = require('../services/localBrain/countries').detectCountry(parsed.location || '');
  const runCountry = requestedCode || (detectedCountry && detectedCountry.code) || 'IN';
  if (!isMaster && runCountry === 'IN') {
    const { classifyLocation } = require('../utils/universalGeoCluster');
    const locClassification = classifyLocation(parsed.location);
    if (locClassification.type === 'state' || locClassification.type === 'district') {
      return res.status(403).json({
        error: `Client searches are restricted to individual cities and mandals. Wide-area ${locClassification.type} sweeps (${locClassification.name}) require Master Command Center access.`,
        classification: locClassification,
        allowedScopes: ['city', 'mandal', 'locality', 'town'],
        suggestedZones: locClassification.subZones?.slice(0, 8) || []
      });
    }
  }

  const charge = chargeOmniCredits(userId);
  if (!charge.ok) {
    return res.status(charge.status).json({ error: charge.error });
  }
  if (creditsPreflight(res)) return;

  const matchedCategory = parsed.category;
  let baseLocation = parsed.location;

  // Correct genuinely misspelled places only. An exact city must never drift
  // to a same-named rural village ("Vijayawada" -> "Vijayawada Rural").
  const correctedLoc = require('../services/searchSuggest').correctLocationName(baseLocation);
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
      : require('../services/sources/registry').enginesForCountry(runCountry));

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
    const deepProfileService = require('../services/deepProfileService');
    deepStopped = deepProfileService.stopAll('superseded by a fresh search');
  } catch (deepStopError) {
    addLog(`[Omni] Deep-cancel skipped: ${deepStopError.message}`);
  }

  const { resolveUniversalZones } = require('../utils/universalGeoCluster');
  const resolvedPlanZones = resolveUniversalZones(baseLocation, matchedCategory, isMaster) || [];

  res.json({
    message: 'Omni Search Started in Background via BullMQ.',
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
  addLog(`[Omni Search] Family ${classification.label} · engines ${resolvedEngines.join(', ')}`);

  // Add the orchestrator task to the background queue so it starts running
  addScrapeJob('scrapeOmniOrchestrator', [matchedCategory, baseLocation, strategy, radius, gridDensity, resolvedEngines, finalSessionId, userId, {}, null, isMaster, runCountry], 10, { sessionId: finalSessionId, userId, isMaster });
});

/**
 * Fully automatic scrape. Accepts one free-text query:
 *   { "query": "plumbers in Vijayawada" }
 * It classifies the category, chooses relevant engines, purges older leads
 * and dispatches the orchestrator. No engine knowledge is required.
 */
router.post('/auto', async (req, res) => {
  try {
    const { query, category, location, strategy = 'broad', radius, gridDensity, sessionId, userId: bodyUserId, engines, enabledEngines } = req.body;
    const userId = req.headers['x-user-id'] || bodyUserId || 'anonymous';
    const { parseUniversalQuery } = require('../utils/universalQueryEngine');
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
    const detectedCountry = require('../services/localBrain/countries').detectCountry(plan.location || '');
    const country = requestedCountry(req) || (detectedCountry && detectedCountry.code) || 'IN';
    const { classifyLocation } = require('../utils/universalGeoCluster');
    const locClassification = classifyLocation(plan.location);

    // Auto-populate constituent zones (e.g. all villages for a mandal, commercial sectors for a city, or mandals for a district)
    if (country === 'IN') {
      try {
        const sweepScopePolicy = require('../services/sweepScopePolicy');
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
          const { resolveUniversalZones, AUTHORITATIVE_CLUSTERS } = require('../utils/universalGeoCluster');
          const cleanLoc = (plan.location || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (AUTHORITATIVE_CLUSTERS[cleanLoc] || AUTHORITATIVE_CLUSTERS[cleanLoc.replace(/city|town/g, '')]) {
            const uniZones = resolveUniversalZones(plan.location, plan.category, isMaster);
            if (uniZones && uniZones.length) {
              plan.zones = uniZones.map(z => ({ name: z.zoneName, ...z }));
              plan.resolvedScope = 'city';
              addLog(`[Auto Plan] Auto-resolved authoritative city "${plan.location}" into ${plan.zones.length} commercial zones.`);
            }
          } else {
            const cityPlan = sweepScopePolicy.buildScopeZones('city', plan.location, scopeOpts);
            if (cityPlan && Array.isArray(cityPlan.zones) && cityPlan.zones.length > 1) {
              plan.zones = cityPlan.zones;
              plan.resolvedScope = 'city';
              plan.district = cityPlan.district;
              plan.state = cityPlan.state;
              addLog(`[Auto Plan] Auto-resolved city "${plan.location}" into ${plan.zones.length} commercial zones.`);
            } else {
              const uniZones = resolveUniversalZones(plan.location, plan.category, isMaster);
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
      // The orchestrator will build the country's coordinate lattice. Keep the
      // scope label so the UI still says "city".
      plan.zones = [];
      plan.resolvedScope = 'city';
      addLog(`[Auto Plan] ${country} run: coordinate lattice will be planned by the orchestrator.`);
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

    const charge = chargeOmniCredits(userId);
    if (!charge.ok) {
      return res.status(charge.status).json({ error: charge.error });
    }
    if (creditsPreflight(res)) return;

    const finalSessionId = sessionId || makeSessionId(isMaster ? 'master_sweep' : 'client_auto');
    globalAbortSignal.aborted = false;
    sessionAbortSignals.set(finalSessionId, { aborted: false });
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
      const deepProfileService = require('../services/deepProfileService');
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

    addLog(`\n[Auto Scrape] "${plan.category}" in "${plan.location}" · ${plan.familyLabel} · ${plan.engines.join(' + ')} · session ${finalSessionId}`);

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
    ], 10, { sessionId: finalSessionId, userId, isMaster });
  } catch (error) {
    addLog(`[Auto Scrape Error] ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// MASTER GEO-COVERAGE SWEEP API (District, Mandal Cluster, & State Sweeps)
// Dedicated orchestrator for full-district and state coverage folders
// ──────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────
// ENGINE & API HEALTH BOARD
// The master command center renders this as green/red chips so the operator
// knows which engines can actually answer before launching a swarm.
// ──────────────────────────────────────────────────────────────────────────────
router.get('/engines/status', (req, res) => {
  try {
    const status = engineHealth.getStatus();
    const metrics = typeof getConcurrencyMetrics === 'function' ? getConcurrencyMetrics() : null;
    let httpCache = null;
    try {
      httpCache = require('../utils/fastGoogleHttp').getHttpCacheStats();
    } catch (e) { }
    res.json({ ok: true, ...status, queue: metrics, httpCache, breakers: { localFinder: require('../services/serpBreaker').snapshot() }, resilience: requestGuard.snapshot() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/engines/reset', (req, res) => {
  try {
    engineHealth.resetEngine(String(req.body?.engine || '').trim() || null);
    res.json({ ok: true, ...engineHealth.getStatus() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

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
    // Honest preview ETA: measured browser-seconds per zone ÷ live slots.
    // The old `zones × 3 s` ignored concurrency and disagreed with the live
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

    const { category, scope = 'district', name, userId = 'master', strategy = 'broad', speedPreset = 'precision_grid', engines, deep = false } = req.body;
    if (!category || !name) {
      return res.status(400).json({ error: 'Both category and target location name are required for a Master Sweep.' });
    }

    // Resolve the requested scope through the country-aware planner:
    //   India    → gazetteer policy (state / district / mandal / city, exhaustive)
    //   Anywhere → buildCountrySweepPlan (curated child territories when the
    //              taxonomy knows them, otherwise a lattice over the real
    //              administrative bounding box, labelled `sampled`)
    // `deep` adds every village of a district in India and a 3×3 lattice inside
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
    sessionAbortSignals.set(sessionId, { aborted: false });
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

    addLog(`\n[Master Sweep] 🗺️ Swarming entire ${resolvedScope}: "${sweepTitle}" across ${targetZones.length} zones for category "${category}" (Master Folder: ${sessionId})`);
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
    ], 10, { sessionId, userId: userId || 'master', isMaster: true });

  } catch (error) {
    console.error('[Master Sweep Error]', error);
    addLog(`[Master Sweep Error] ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// DISTRICT BOUNDARY AUDIT
// Re-checks every lead a district sweep already saved and removes anything that
// does not belong to that district. Used after tightening containment so an
// older folder can be repaired without losing data: rejected rows are archived
// (recovery bin + out_of_bounds ledger) before the folder is rewritten.
// ──────────────────────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────────────────────
// ON-DEMAND DEEP CONTACT ENRICHMENT API
// Probes websites for verified owner emails, Instagram, Facebook, and direct mobile lines
// ──────────────────────────────────────────────────────────────────────────────
router.post('/deep-enrich', async (req, res) => {
  try {
    const { leadIds, sessionId } = req.body;
    const allVendors = dbAdapter.getVendors();

    let targets = [];
    if (Array.isArray(leadIds) && leadIds.length > 0) {
      targets = allVendors.filter(v => leadIds.includes(v.id));
    } else if (sessionId) {
      targets = allVendors.filter(v => v.sessionId === sessionId);
    } else {
      // Default: all leads with a website that haven't been deep-extracted yet
      targets = allVendors.filter(v => v.website && v.website.startsWith('http') && (!v.emails || v.emails.length === 0));
    }

    if (targets.length === 0) {
      return res.json({ success: true, message: 'No eligible leads found for deep enrichment', targetCount: 0 });
    }

    addLog(`[Deep Enrich] ⚡ Customer triggered deep contact enrichment for ${targets.length} leads...`);
    res.json({ success: true, message: `Deep enrichment initiated for ${targets.length} leads in background`, targetCount: targets.length });

    // Background asynchronous enrichment with parallel workers (concurrency 6)
    (async () => {
      let enrichedCount = 0;
      let currentIndex = 0;
      const workerConcurrency = 6;

      const worker = async () => {
        while (currentIndex < targets.length) {
          if (globalAbortSignal.aborted) break;
          const lead = targets[currentIndex++];
          if (!lead || !lead.website || !lead.website.startsWith('http')) continue;

          try {
            const leadCountry = (require('../services/localBrain/countries').detectCountry(
              [lead.country, lead.city, lead.district, lead.state].filter(Boolean).join(', ')
            ) || { code: 'IN' }).code;
            const webData = await fastWebsiteExtract(lead.website, lead.name, { defaultCountry: leadCountry, allowInternational: leadCountry !== 'IN' });
            if (webData && (webData.emails?.length > 0 || webData.instagram || webData.facebook || webData.phones?.length > 0 || webData.logo)) {
              const currentVendors = dbAdapter.getVendors();
              const targetIdx = currentVendors.findIndex(v => v.id === lead.id);
              if (targetIdx !== -1) {
                const item = currentVendors[targetIdx];
                item.emails = webData.emails || item.emails || [];
                item.email = webData.emails?.[0] || item.email || '';
                if (webData.instagram) item.instagram = webData.instagram;
                if (webData.facebook) item.facebook = webData.facebook;
                if (webData.linkedin) item.linkedin = webData.linkedin;
                if (webData.logo) item.logo = webData.logo;
                if (webData.gstin && !item.gstin) item.gstin = webData.gstin;
                if (webData.contactPerson && !item.contactPerson) item.contactPerson = webData.contactPerson;
                if (webData.pincode && !item.pincode) item.pincode = webData.pincode;
                if (webData.whatsappLink && !item.whatsappLink) {
                  item.whatsappLink = webData.whatsappLink;
                  item.whatsappAvailable = true;
                }
                if ((!item.phone || item.phone.includes('Requires')) && webData.phones?.length > 0) {
                  item.phone = webData.phones[0];
                }

                // Recalculate CRM quality score
                let score = 20;
                if (item.phone && !item.phone.includes('Requires')) score += 35;
                if (item.website && item.website.startsWith('http')) score += 20;
                if (item.emails && item.emails.length > 0) score += 15;
                if (item.rating && parseFloat(item.rating) >= 4.0) score += 10;
                item.qualityScore = Math.min(score, 100);
                item.tier = item.qualityScore >= 80 ? 'Premium' : (item.qualityScore >= 55 ? 'Standard' : 'Basic');

                currentVendors[targetIdx] = item;
                dbAdapter.saveVendor(item.userId || 'admin_1', item);

                try {
                  emitVendorEvent(item, 'updated');
                } catch (e) { }

                enrichedCount++;
              }
            }
          } catch (e) {
            // Continue to next lead
          }
        }
      };

      await Promise.all(Array.from({ length: Math.min(workerConcurrency, targets.length) }, worker));
      addLog(`[Deep Enrich] ✅ Completed deep enrichment: +${enrichedCount} leads enriched with verified owner contacts in parallel.`);
    })();
  } catch (err) {
    addLog(`[Deep Enrich Error] ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// Unified Parallel Batch Scrape (accepts either bulk tasks or queries)
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
  // Can expand to fetch actual BullMQ metrics if desired
  res.json(batchProgress);
});

const handleMasterStopAll = async (req, res) => {
  const bodySessionId = req.body?.sessionId || req.query?.sessionId || req.headers['x-session-id'] || null;
  const workspaceScope = req.headers['x-workspace-scope'] || (req.body?.isMaster ? 'master' : null);
  addLog(bodySessionId
    ? `🛑 [SYSTEM] STOP INITIATED for session ${bodySessionId}.`
    : `🛑 [SYSTEM] STOP INITIATED (scope: ${workspaceScope || 'global'}). Aborting active scrapes & clearing queue.`);

  // 1. Determine targets: targeted stop must never abort unrelated runs
  const runningSessions = Object.values(activeSessions).filter(session =>
    session && (session.status === 'running' || session.sessionActive === true)
  );

  let targets = [];
  const requestingUserId = req.headers['x-user-id'];
  if (bodySessionId) {
    targets = runningSessions.filter(session => session.sessionId === bodySessionId);
    if (targets.length === 0 && activeSessions[bodySessionId]) {
      targets = [activeSessions[bodySessionId]];
    }
    // Prevent client users from stopping another client's session
    if (workspaceScope !== 'master' && requestingUserId && requestingUserId !== 'anonymous') {
      targets = targets.filter(session => session.userId === requestingUserId || session.clientId === requestingUserId);
      if (targets.length === 0) {
        return res.status(403).json({ error: 'Forbidden: Cannot abort another user\'s scrape session' });
      }
    }
  } else if (workspaceScope === 'master') {
    targets = runningSessions.filter(session => session.isMaster || session.sessionId.startsWith('master_'));
  } else if (workspaceScope === 'client') {
    targets = runningSessions.filter(session => !session.isMaster && !session.sessionId.startsWith('master_') && 
      (!requestingUserId || requestingUserId === 'anonymous' || session.userId === requestingUserId));
  } else {
    targets = runningSessions;
  }

  // Only trigger global abort if no specific session targeted and master invoked
  if (!bodySessionId && workspaceScope === 'master') {
    globalAbortSignal.aborted = true;
  }

  // 2. Mark targets as aborted and signal per-session abort controllers
  for (const session of targets) {
    session.aborted = true;
    session.status = 'aborted';
    session.sessionActive = false;
    const sig = sessionAbortSignals.get(session.sessionId);
    if (sig) sig.aborted = true;
  }

  // 3. Stop streaming enricher and deep jobs only if no other sessions are active
  const otherRunning = runningSessions.filter(session => !targets.includes(session));
  if (!bodySessionId || otherRunning.length === 0) {
    try {
      const { streamingEnricher } = require('../services/phoneBackfillService');
      await streamingEnricher.stop();
    } catch (e) { }
    try {
      require('../services/deepProfileService').stopAll('user pressed stop');
    } catch (e) { }
    try {
      const { closeAllBrowsers } = require('../scrapers/browserFactory');
      await closeAllBrowsers();
    } catch (e) { }
  }

  // 4. Snappy queue clearing & browser cleanup
  if (bodySessionId) {
    await clearQueueForSession(bodySessionId).catch(() => { });
  } else if (targets.length > 0 && targets.length < runningSessions.length) {
    for (const s of targets) {
      await clearQueueForSession(s.sessionId).catch(() => { });
    }
  } else {
    await clearQueue().catch(() => { });
    batchProgress.isActive = false;
    batchProgress.currentTask = 'Aborted';
  }

  // 5. Flush the atomic store before persisting
  try { dbAdapter.flushSync(); } catch (e) { }

  // 6. Persist each running session as aborted with preserved leads and zone metadata
  let totalPreserved = 0;
  for (const session of targets) {
    const sessionLeads = dbAdapter.getVendorsBySession(session.sessionId);
    totalPreserved += sessionLeads.length;
    try {
      persistSessionVault({
        sessionId: session.sessionId,
        userId: session.userId,
        category: session.category,
        location: session.location,
        leads: sessionLeads,
        final: true,
        metadata: {
          status: 'aborted',
          abortedAt: new Date().toISOString(),
          preservedLeads: sessionLeads.length,
          totalZones: session.totalMandalsAcrossAll || session.totalMandals || (session.zones ? session.zones.length : 0),
          completedZones: session.overallCompletedMandals || 0,
          completedZoneIndices: session.completedZoneIndices || [],
          completedZoneNames: session.completedZoneNames || [],
          zones: session.zones || []
        }
      });
    } catch (e) { }
    session.finished = true;
    session.finishedAt = Date.now();
    try {
      emitProgressEvent({
        sessionId: session.sessionId,
        sessionActive: false,
        aborted: true,
        status: 'aborted',
        totalLeads: sessionLeads.length,
        currentTask: `Scrape safely terminated. Collected ${sessionLeads.length} stores saved to folder.`
      });
    } catch (e) { }
  }

  addLog(`🛑 [SYSTEM] STOP EXECUTED. Safely committed ${totalPreserved} collected stores into session folder with 'Aborted' badge.`);

  return res.json({
    success: true,
    status: 'aborted',
    preservedCount: totalPreserved,
    sessions: targets.map(session => session.sessionId),
    message: `Scrape safely terminated. Collected ${totalPreserved} stores saved to folder.`
  });
};

router.post('/jobs/stop-all', handleMasterStopAll);
router.post('/stop-all', handleMasterStopAll);
router.post('/stop', handleMasterStopAll);

router.post('/resume', async (req, res) => {
  try {
    const { sessionId, userId: bodyUserId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required to resume a scrape.' });
    }
    const userId = req.headers['x-user-id'] || bodyUserId || 'anonymous';
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.body.isMaster === true;

    // 1. Look in activeSessions first, then read from disk vault
    let session = activeSessions[sessionId];
    let vaultData = null;
    const SESSIONS_DIR = require('../config/paths').SESSIONS_DIR;
    const userVaultPath = path.join(SESSIONS_DIR, String(userId).replace(/[^a-zA-Z0-9_-]/g, '_'), `${sessionId}.json`);
    const anonVaultPath = path.join(SESSIONS_DIR, 'anonymous', `${sessionId}.json`);
    const targetFile = fs.existsSync(userVaultPath) ? userVaultPath : (fs.existsSync(anonVaultPath) ? anonVaultPath : null);

    if (targetFile) {
      try {
        vaultData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
      } catch (e) {
        addLog(`[Resume] Could not parse vault ${targetFile}: ${e.message}`);
      }
    }

    const category = session?.category || vaultData?.category;
    const location = session?.location || vaultData?.location;

    if (!category || !location) {
      return res.status(404).json({ error: `Cannot resume session "${sessionId}": session metadata not found.` });
    }

    // 2. Identify all zones and completed zones
    const rawCoverageMode = session?.coverageMode || vaultData?.metadata?.coverageMode || 'deep';
    const coverageMode = String(rawCoverageMode).toLowerCase() === 'fast' ? 'fast' : 'deep';
    let allZones = session?.zones || vaultData?.metadata?.zones || [];
    if (!allZones || allZones.length === 0) {
      const { resolveUniversalZones } = require('../utils/universalGeoCluster');
      const resolved = resolveUniversalZones(location, category, isMaster);
      allZones = resolved.map(z => ({ name: z.zoneName, ...z }));
    }

    // Fast folders deliberately deferred their grid pass. Resume continues the
    // named pass only; the grid cells stay recorded for a later deep pass.
    if (coverageMode === 'fast') {
      allZones = allZones.filter(z => !(z.coverageKind === 'grid' || z.kind === 'grid'));
    }

    const completedZoneIndices = new Set(
      session?.completedZoneIndices || vaultData?.metadata?.completedZoneIndices || []
    );
    const completedZoneNames = new Set(
      (session?.completedZoneNames || vaultData?.metadata?.completedZoneNames || []).map(s => String(s).toLowerCase().trim())
    );

    // Filter to remaining uncompleted zones. Names are the durable identity:
    // a fast folder's stored indices point at the full footprint, so after the
    // grid cells are filtered out only the names can be trusted.
    const remainingZones = allZones.filter((z, idx) => {
      const zName = String(z.name || z.zoneName || '').toLowerCase().trim();
      if (completedZoneNames.has(zName)) return false;
      if (coverageMode === 'fast') return true;
      return !completedZoneIndices.has(idx);
    });

    const remainingSet = new Set(remainingZones);
    const activeCompletedIndices = new Set();
    allZones.forEach((zone, idx) => {
      if (!remainingSet.has(zone)) activeCompletedIndices.add(idx);
    });

    if (remainingZones.length === 0) {
      return res.json({
        ok: true,
        alreadyComplete: true,
        message: 'All zones for this search have already been completed!',
        totalZones: allZones.length,
        completedZones: allZones.length,
        sessionId
      });
    }

    addLog(`[Resume] 🔄 Resuming session "${sessionId}" ("${category}" in "${location}"): ${remainingZones.length}/${allZones.length} zones remaining.`);

    // 3. Reset abort flags for this session
    sessionAbortSignals.set(sessionId, { aborted: false });
    activeSessions[sessionId] = {
      ...(session || {}),
      sessionId,
      userId,
      category,
      location,
      status: 'running',
      sessionActive: true,
      aborted: false,
      finished: false,
      zones: allZones,
      coverageMode,
      completedZoneIndices: Array.from(activeCompletedIndices),
      completedZoneNames: Array.from(completedZoneNames),
      startTime: Date.now()
    };

    // 4. Construct a resumed plan. Scope and parent names are inferred from the
    // stored zone rows so a resumed Tenali Mandal sweep stays a mandal sweep
    // (the old plan carried no scope, so it fell back to district behaviour).
    const sampleZone = remainingZones[0] || allZones[0] || {};
    const resumeScope = session?.scope || vaultData?.metadata?.scope || sampleZone.scope || (isMaster ? 'district' : 'city');
    const resumeDistrict = session?.district || vaultData?.metadata?.district || sampleZone.district || null;
    let resumeBoundary = session?.boundary || vaultData?.metadata?.boundary || null;
    // Older folders predate the stored boundary. Rebuild it from the gazetteer
    // so a resumed district sweep keeps the same territorial guard.
    if (!resumeBoundary && resumeScope === 'district' && resumeDistrict) {
      try {
        const rebuilt = buildScopeZones('district', resumeDistrict);
        resumeBoundary = rebuilt?.boundary || null;
      } catch (e) { }
    }

    const resumePlan = {
      category,
      location,
      resolvedScope: resumeScope,
      district: resumeDistrict,
      state: session?.state || vaultData?.metadata?.state || sampleZone.state || null,
      title: session?.title || vaultData?.metadata?.title || location,
      center: session?.center || vaultData?.metadata?.center || null,
      boundary: resumeBoundary,
      zones: remainingZones,
      originalTotalZones: allZones.length,
      resumed: true,
      coverageMode,
      initialCompletedCount: activeCompletedIndices.size,
      completedZoneIndices: Array.from(activeCompletedIndices),
      completedZoneNames: Array.from(completedZoneNames)
    };

    // 5. Respond immediately to UI
    res.json({
      ok: true,
      resumed: true,
      sessionId,
      category,
      location,
      coverageMode,
      remainingZonesCount: remainingZones.length,
      totalZonesCount: allZones.length,
      completedZonesCount: activeCompletedIndices.size,
      message: `Resuming scrape: ${remainingZones.length} zones remaining.`
    });

    // 6. Enqueue the orchestrator for remaining zones. Resuming keeps the
    // folder's original coverage mode instead of forcing a full grid sweep.
    addScrapeJob('scrapeOmniOrchestrator', [
      category,
      location,
      'broad',
      5,
      coverageMode,
      session?.engines || vaultData?.metadata?.engines || ['auto'],
      sessionId,
      userId,
      {},
      resumePlan,
      isMaster,
      requestedCountry(req)
    ], 10, { sessionId, userId, isMaster });

  } catch (err) {
    console.error('[Resume Error]', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/enrich-now', async (req, res) => {
  const { sessionId, leadIds } = req.body || {};
  const phoneBackfillService = require('../services/phoneBackfillService');
  const allVendors = dbAdapter.getVendors();
  let targetLeads = allVendors;

  if (Array.isArray(leadIds) && leadIds.length > 0) {
    const idSet = new Set(leadIds);
    targetLeads = allVendors.filter(v => idSet.has(v.id));
  } else if (sessionId) {
    targetLeads = dbAdapter.getVendorsBySession(sessionId);
  }

  // Every lead without a mobile is a candidate. Name-search URLs are verified
  // against the place panel inside backfillPhones(), so they are safe to use.
  const missingMobile = targetLeads.filter(lead => !phoneBackfillService.hasValidMobile(lead.phone));

  if (!missingMobile.length) {
    return res.json({
      success: true,
      message: 'All selected leads already have verified mobile contacts.',
      filled: 0,
      candidates: 0
    });
  }

  addLog(`[On-Demand Enrich] Starting instant enrichment for ${missingMobile.length} leads...`);

  phoneBackfillService.backfillPhones({
    leads: missingMobile,
    sessionId: sessionId || 'manual_enrich',
    budgetMs: Math.min(300_000, Math.max(60_000, missingMobile.length * 2_000)),
    concurrency: 8,
    emit: (vendor, type) => { try { emitVendorEvent(vendor, type); } catch (e) { } },
    log: addLog
  }).then(summary => {
    addLog(`[On-Demand Enrich] Finished: ${summary.filled} contacts enriched (${summary.mobilesFound} mobile, ${summary.landlinesFound} landline).`);
  }).catch(err => {
    addLog(`[On-Demand Enrich] Error: ${err.message}`);
  });

  return res.json({
    success: true,
    message: `Enrichment started for ${missingMobile.length} leads. Contacts will stream to the table in real time.`,
    candidateCount: missingMobile.length
  });
});

module.exports = {
  scrapeRouter: router,
  setDeps,
  isSessionActive
};
