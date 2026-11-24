/**
 * scrapeShared.js
 * Central shared state, worker task registrations, and event dispatchers for the scraping fleet.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Engines
const { scrapeGooglePlaces, setDeps: setPlacesDeps } = require('../../scrapers/engine-google-places');
const { scrapeOpenStreetMap, setDeps: setOsmDeps } = require('../../scrapers/engine-openstreetmap');
const { scrapeWebContact, setDeps: setWebContactDeps } = require('../../scrapers/engine-web-contact');
const { scrapeGoogleSerp, setDeps: setSerpDeps } = require('../../scrapers/engine-google-serp');
const { scrapeGoogleLocalFinder, setDeps: setLocalFinderDeps } = require('../../scrapers/engine-google-serp-local');
const { scrapeDuckDuckGoDork, setLogger: setDorkLogger, setDeps: setSocialDorkDirectDeps } = require('../../scrapers/engine-social-dork');
const { scrapeJustDial, setDeps: setJDDeps } = require('../../scrapers/engine-justdial');
const { scrapeWeddingBazaar, setDeps: setWBDeps } = require('../../scrapers/engine-weddingbazaar');
const { scrapeWeddingWire, setDeps: setWWDeps } = require('../../scrapers/engine-weddingwire');
const { scrapeMandap, setDeps: setMandapDeps } = require('../../scrapers/engine-mandap');
const { scrapeBraveDork, setDeps: setBraveDeps } = require('../../scrapers/engine-brave-dork');
const { scrapeCrawleeDeep, setDeps: setCrawleeDeps } = require('../../scrapers/engine-crawlee-deep');
const { scrapePuppeteerIndiaMart, setDeps: setIndiaMartDeps } = require('../../scrapers/engine-puppeteer-indiamart');
const { scrapeYellowPagesGlobal, setDeps: setYpDeps } = require('../../scrapers/engine-yellowpages-global');
const { scrapeYelp, setDeps: setYelpDeps } = require('../../scrapers/engine-yelp');
const { scrapeBingPlaces, setDeps: setBingPlacesDeps } = require('../../scrapers/engine-bing-places');
const { scrapeTripAdvisor, setDeps: setTripAdvisorDeps } = require('../../scrapers/engine-tripadvisor');
const { scrapeWikidata, setDeps: setWikidataDeps } = require('../../scrapers/engine-wikidata-businesses');
const { scrapeSocialDorkIntl, setDeps: setSocialDorkDeps } = require('../../scrapers/engine-social-dork-intl');
const { scrapeFreeIndexUK, setDeps: setFreeIndexDeps } = require('../../scrapers/engine-freeindex-uk');
const { scrapeGoldenPagesIE, setDeps: setGoldenPagesDeps } = require('../../scrapers/engine-goldenpages-ie');
const { scrapeCylex, setDeps: setCylexDeps } = require('../../scrapers/engine-cylex');
const { scrapeTrustpilot, setDeps: setTrustpilotDeps } = require('../../scrapers/engine-trustpilot');

const { initQueue, registerTask, addScrapeJob, clearQueue, clearQueueForSession, markSessionAborted, clearSessionAborted, getActiveJobs, getConcurrencyMetrics } = require('../../utils/queue');
const { geocodeLocation } = require('../../utils/olaMaps');
const { getKeywordSynonyms } = require('../../utils/aiParser');
const intelligentExtractor = require('../../utils/intelligentExtractor');
const { parseNaturalLanguageQuery } = require('../../utils/queryParser');
const { resolveUniversalZones, ZONE_COORDINATES, classifyLocation } = require('../../utils/universalGeoCluster');
const { fastWebsiteExtract } = require('../../utils/fastWebsiteExtractor');
const geoAI = require('../../utils/geoAI');
const dbAdapter = require('../../config/dbAdapter');
const browserBudget = require('../../utils/browserBudget');
const { defaultPool } = require('../../scrapers/concurrencyManager');
const categoryRouter = require('../../services/categoryRouter');
const { isVendorRelevant } = require('../../services/categoryFidelity');
const credits = require('../../services/credits');
const engineHealth = require('../../services/engineHealth');
const requestGuard = require('../../utils/requestGuard');
const { buildScopeZones } = require('../../services/sweepScopePolicy');
const { makeSessionId } = require('../../utils/sessionId');
const { buildCountrySweepPlan } = require('../../services/countrySweepPlan');
const { runOmniSearchOrchestrator, isInsideDistrictBoundary } = require('../../services/omniSearchOrchestrator');
const { persistSessionVault } = require('../../services/sessionVaultService');
const leadArchive = require('../../services/leadArchive');
const outOfBoundsVault = require('../../services/outOfBoundsVault');
const { SESSIONS_DIR } = require('../../config/paths');
const etaModel = require('../../utils/etaModel');
const extensionRelayHub = require('../../services/extensionRelayHub');

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

  if ((status === 'completed' || status === 'failed') && !session.completedZoneNames.includes(loc)) {
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
    const { ZONE_COORDINATES } = require('../../utils/universalGeoCluster');
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
  updateSessionTargetState(sessionId, loc, res !== null ? 'completed' : 'failed');
  return res;
});
registerTask('scrapeGooglePlaces', async (q, cat, loc, sessionId, centerLat, centerLng, radiusKm, strategy, district, stateName, boundingbox, cityHint, isMaster = false, scope = null, mandal = null, countryHint = null) => {
  updateSessionTargetState(sessionId, loc, 'running');
  const res = await safeExecute(() => scrapeGooglePlaces(q, cat, loc, sessionId, centerLat, centerLng, radiusKm, strategy, district, stateName, boundingbox, cityHint, isMaster, scope, mandal, countryHint), 'Google Places Scrape', addLog, 'maps');
  updateSessionTargetState(sessionId, loc, res !== null ? 'completed' : 'failed');
  return res;
});
registerTask('scrapeGoogleSerp', async (q, cat, loc, sessionId) => {
  updateSessionTargetState(sessionId, loc, 'running');
  const res = await safeExecute(() => scrapeGoogleSerp(q, cat, loc, sessionId), 'Google Serp Scrape', addLog, 'google-serp');
  updateSessionTargetState(sessionId, loc, res !== null ? 'completed' : 'failed');
  return res;
});
registerTask('scrapeJustDial', async (cat, loc, dummy, sessionId) => {
  updateSessionTargetState(sessionId, loc, 'running');
  const res = await safeExecute(() => scrapeJustDial(cat, loc, sessionId), 'JustDial Scrape', addLog, 'justdial');
  updateSessionTargetState(sessionId, loc, res !== null ? 'completed' : 'failed');
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
registerTask('scrapeDuckDuckGoDork', async (domain, q, cat, loc, sessionId, countryCode = 'IN', userId = 'admin_1', meta = {}) => {
  const sig = (sessionId && sessionAbortSignals.get(sessionId)) || globalAbortSignal;
  if (typeof setSocialDorkDirectDeps === 'function') setSocialDorkDirectDeps({ logger: addLog, emitVendorEvent, abortSignal: sig });
  return safeExecute(() => scrapeDuckDuckGoDork(domain, q, cat, loc, sig, sessionId, countryCode, userId, meta), `Social Engine ${domain}`, addLog, 'social');
});
registerTask('scrapeBraveDork', async (domain, q, cat, loc, sessionId) => safeExecute(() => scrapeBraveDork(domain, q, cat, loc, sessionId), `Brave Dork ${domain}`, addLog, 'brave'));
registerTask('scrapeWebContact', async (websiteUrl, vendorName, cat, loc, sessionId) => {
  const sig = (sessionId && sessionAbortSignals.get(sessionId)) || globalAbortSignal;
  if (typeof setWebContactDeps === 'function') setWebContactDeps({ logger: addLog, emitVendorEvent, abortSignal: sig });
  return safeExecute(() => scrapeWebContact(websiteUrl, vendorName, cat, loc, sessionId), 'Web Contact Scrape', addLog, 'web-contact');
});
registerTask('scrapeCrawleeDeep', async (url, vendorName, cat, loc, sessionId) => {
  try {
    return await safeExecute(() => scrapeCrawleeDeep(url, vendorName, cat, loc, sessionId), 'Crawlee Deep Scrape', addLog);
  } catch (err) {
    addLog(`[Crawlee] Module unavailable: ${err.message}`);
    return [];
  }
});
registerTask('scrapePuppeteerIndiaMart', async (cat, loc, dummy, sessionId) => {
  updateSessionTargetState(sessionId, loc, 'running');
  let res = null;
  try {
    res = await safeExecute(() => scrapePuppeteerIndiaMart(cat, loc, sessionId), 'IndiaMart Stealth Scrape', addLog, 'indiamart');
  } catch (err) {
    addLog(`[IndiaMart] Module unavailable: ${err.message}`);
  }
  updateSessionTargetState(sessionId, loc, res !== null ? 'completed' : 'failed');
  return res || { totalScraped: 0, newInserted: 0, updated: 0, blocked: true };
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
  if (typeof setSocialDorkDirectDeps !== 'undefined') setSocialDorkDirectDeps(deps);
  if (typeof setFreeIndexDeps !== 'undefined') setFreeIndexDeps(deps);
  if (typeof setGoldenPagesDeps !== 'undefined') setGoldenPagesDeps(deps);
  if (typeof setCylexDeps !== 'undefined') setCylexDeps(deps);
  if (typeof setTrustpilotDeps !== 'undefined') setTrustpilotDeps(deps);

  initQueue(deps);
}

const { getSettings, updateSettings } = require('../../config/settingsManager');
const { resolveIntervention } = require('../../utils/manualIntervention');


module.exports = {
  // State
  activeSessions,
  batchProgress,
  sessionAbortSignals,
  isSessionAborted,
  isSessionActive,
  updateSessionTargetState,

  // Helpers
  safeExecute,
  requestedCountry,
  getDistanceKm,
  formatEta,

  // Event dispatchers & logger proxies
  addLog: (...args) => addLog(...args),
  emitVendorEvent: (...args) => emitVendorEvent(...args),
  emitGridEvent: (...args) => emitGridEvent(...args),
  emitDispatchEvent: (...args) => emitDispatchEvent(...args),
  emitProgressEvent: (...args) => emitProgressEvent(...args),
  emitActivePointEvent: (...args) => emitActivePointEvent(...args),

  // Shared Utilities & Services
  browserBudget,
  extensionRelayHub,
  clearSessionAborted,
  getConcurrencyMetrics,

  // Setters & Lifecycle
  setDeps
};

Object.defineProperty(module.exports, 'globalAbortSignal', {
  get() { return globalAbortSignal; },
  set(val) { globalAbortSignal = val; }
});
