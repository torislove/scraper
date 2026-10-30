const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Engines
const { scrapeGooglePlaces, setDeps: setPlacesDeps } = require('../scrapers/engine-google-places');
const { scrapeGoogleSerp, setDeps: setSerpDeps } = require('../scrapers/engine-google-serp');
const { scrapeGoogleLocalFinder, setDeps: setLocalFinderDeps } = require('../scrapers/engine-google-serp-local');
const { scrapeDuckDuckGoDork, setLogger: setDorkLogger } = require('../scrapers/engine-social-dork');
const { scrapeJustDial, setDeps: setJDDeps } = require('../scrapers/engine-justdial');
const { scrapeWeddingBazaar, setDeps: setWBDeps } = require('../scrapers/engine-weddingbazaar');
const { scrapeWeddingWire, setDeps: setWWDeps } = require('../scrapers/engine-weddingwire');
const { scrapeMandap, setDeps: setMandapDeps } = require('../scrapers/engine-mandap');
const { scrapeBraveDork, setDeps: setBraveDeps } = require('../scrapers/engine-brave-dork');
const { scrapeDeepseekAI, setDeps: setDeepseekDeps } = require('../scrapers/engine-deepseek');
const { scrapeCrawleeDeep, setDeps: setCrawleeDeps } = require('../scrapers/engine-crawlee-deep');
const { scrapePuppeteerIndiaMart, setDeps: setIndiaMartDeps } = require('../scrapers/engine-puppeteer-indiamart');
const { scrapeScrapySpider, setDeps: setScrapyDeps } = require('../scrapers/engine-scrapy');

const { initQueue, registerTask, addScrapeJob, clearQueue, getActiveJobs, getPersistentQueue, getConcurrencyMetrics } = require('../utils/queue');
const { geocodeLocation, getCache: getGeoCache } = require('../utils/olaMaps');
const { getKeywordSynonyms } = require('../utils/aiParser');
const intelligentExtractor = require('../utils/intelligentExtractor');
const { parseNaturalLanguageQuery } = require('../utils/queryParser');
const { resolveUniversalZones } = require('../utils/universalGeoCluster');
const { fastWebsiteExtract } = require('../utils/fastWebsiteExtractor');
const geoAI = require('../utils/geoAI');
const { closeAllBrowsers } = require('../scrapers/browserFactory');
const dbAdapter = require('../config/dbAdapter');
const { defaultPool } = require('../scrapers/concurrencyManager');
const { deduplicateBatch, generateFingerprint, normalizePhone } = require('../utils/deduplicator');
const { enrichLead } = require('../utils/enricher');
const categoryRouter = require('../services/categoryRouter');
const leadRetention = require('../services/leadRetention');
const engineHealth = require('../services/engineHealth');
const { buildScopeZones } = require('../services/sweepScopePolicy');
const brandIntel = require('../services/brandIntel');
const taxonomyLearner = require('../services/taxonomyLearner');

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
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
        count: Array.isArray(result)
          ? result.length
          : (result && typeof result === 'object'
            ? Number(result.totalScraped ?? result.newInserted ?? result.count ?? 0)
            : null)
      });
    }
    return result;
  } catch (error) {
    if (engineKey) {
      engineHealth.recordRun(engineKey, {
        ok: false,
        error: error.message,
        ms: Date.now() - startedAt
      });
    }
    logger(`[SafeExecute] ${name} failed: ${error.message}`);
    return null;
  }
}

let batchProgress = { total: 0, completed: 0, currentTask: '', isActive: false };
let globalAbortSignal = { aborted: false };
let addLog = console.log;
let emitVendorEvent = () => {};
let emitGridEvent = () => {};
let emitDispatchEvent = () => {};
let emitProgressEvent = () => {};
let emitActivePointEvent = () => {};

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

function updateSessionTargetState(sessionId, loc, status) {
  if (!sessionId || !loc) return;
  const session = activeSessions[sessionId];
  if (!session) return;
  
  const key = (loc || '').toLowerCase().trim();
  const tracked = Object.prototype.hasOwnProperty.call(session.completedTargetsMap, key);
  if (tracked) session.completedTargetsMap[key] = status;
  
  let completedCount = 0;
  let runningCount = 0;
  Object.keys(session.completedTargetsMap).forEach(k => {
    if (session.completedTargetsMap[k] === 'completed') completedCount++;
    if (session.completedTargetsMap[k] === 'running') runningCount++;
  });
  
  session.overallCompletedMandals = completedCount;
  
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
    const zCoords = ZONE_COORDINATES[key]
      || (session.baseLat && session.baseLng ? { lat: session.baseLat, lng: session.baseLng } : null);
    if (zCoords) {
      emitActivePointEvent({
        lat: zCoords.lat,
        lng: zCoords.lng,
        zoneName: loc,
        locationName: loc,
        district: session.activeDistrict || loc,
        sessionId,
        active: status === 'running',
        completed: status === 'completed',
        instanceId: 1
      });
    }
  } catch (e) {}

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
  } catch (e) {}

  if (completedCount > 0) {
    const elapsed = Date.now() - session.startTime;
    const avgTime = elapsed / completedCount;
    const remaining = Object.keys(session.completedTargetsMap).length - completedCount;
    session.eta = formatEta(remaining * avgTime);
  }

  const metrics = typeof getConcurrencyMetrics === 'function' ? getConcurrencyMetrics() : { activeWorkers: 6 };

  try {
    emitProgressEvent({
      sessionId,
      totalDistricts: session.totalDistricts,
      completedDistricts: session.completedDistricts,
      activeDistrict: session.activeDistrict,
      totalMandals: Object.keys(session.completedTargetsMap).length,
      completedMandals: completedCount,
      activeMandal: session.activeMandal,
      totalMandalsAcrossAll: Object.keys(session.completedTargetsMap).length,
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
  } catch (e) {}
}

// Register tasks
registerTask('scrapeGoogleLocalFinder', async (q, cat, loc, sessionId, maxPages, district, stateName, centerCoords, cityHint) => {
  updateSessionTargetState(sessionId, loc, 'running');
  const res = await safeExecute(() => scrapeGoogleLocalFinder(q, cat, loc, sessionId, maxPages, district, stateName, centerCoords, cityHint), 'Google Local Finder Scrape', addLog, 'google-local-finder');
  updateSessionTargetState(sessionId, loc, 'completed');
  return res;
});
registerTask('scrapeGooglePlaces', async (q, cat, loc, sessionId, centerLat, centerLng, radiusKm, strategy, district, stateName, boundingbox, cityHint) => {
  updateSessionTargetState(sessionId, loc, 'running');
  const res = await safeExecute(() => scrapeGooglePlaces(q, cat, loc, sessionId, centerLat, centerLng, radiusKm, strategy, district, stateName, boundingbox, cityHint), 'Google Places Scrape', addLog, 'maps');
  updateSessionTargetState(sessionId, loc, 'completed');
  return res;
});
registerTask('scrapeGoogleSerp', async (q, cat, loc, sessionId) => {
  updateSessionTargetState(sessionId, loc, 'running');
  const res = await safeExecute(() => scrapeGoogleSerp(q, cat, loc), 'Google Serp Scrape', addLog, 'google-serp');
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
registerTask('scrapeWeddingWire', async (cat, loc, dummy, sessionId) => safeExecute(() => scrapeWeddingWire(cat, loc, sessionId), 'WeddingWire Scrape', addLog, 'weddingwire'));
registerTask('scrapeMandap', async (cat, loc, dummy, sessionId) => safeExecute(() => scrapeMandap(cat, loc, sessionId), 'Mandap Scrape', addLog, 'mandap'));
registerTask('scrapeDuckDuckGoDork', async (domain, q, cat, loc, sessionId) => safeExecute(() => scrapeDuckDuckGoDork(domain, q, cat, loc, globalAbortSignal, sessionId), `DDG Dork ${domain}`, addLog, 'social'));
registerTask('scrapeBraveDork', async (domain, q, cat, loc, sessionId) => safeExecute(() => scrapeBraveDork(domain, q, cat, loc, sessionId), `Brave Dork ${domain}`, addLog, 'brave'));
registerTask('scrapeDeepseekAI', async (q, cat, loc) => safeExecute(() => scrapeDeepseekAI(q, cat, loc), 'DeepSeek AI Scrape', addLog, 'deepseek'));
registerTask('scrapeCrawleeDeep', async (url, vendorName, cat, loc, sessionId) => safeExecute(() => scrapeCrawleeDeep(url, vendorName, cat, loc, sessionId), 'Crawlee Deep Scrape', addLog));
registerTask('scrapePuppeteerIndiaMart', async (cat, loc, dummy, sessionId) => {
  updateSessionTargetState(sessionId, loc, 'running');
  const res = await safeExecute(() => scrapePuppeteerIndiaMart(cat, loc, sessionId), 'IndiaMart Stealth Scrape', addLog, 'indiamart');
  updateSessionTargetState(sessionId, loc, 'completed');
  return res;
});
registerTask('scrapeScrapySpider', async (cat, loc) => safeExecute(() => scrapeScrapySpider(cat, loc), 'Scrapy Python Spider', addLog, 'scrapy'));
registerTask('scrapeOmniOrchestrator', async (category, baseLocation, strategy, radius, gridDensity, enabledEngines, sessionId, userId, filters = {}, plan = null) =>
  safeExecute(() => runOmniSearchOrchestrator(category, baseLocation, strategy, radius, gridDensity, enabledEngines, sessionId, userId, filters, plan), 'Omni Search Orchestrator', addLog)
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
  if (typeof setDorkLogger !== 'undefined') setDorkLogger(deps.logger);
  if (typeof setSerpDeps !== 'undefined') setSerpDeps(deps);
  if (typeof setCrawleeDeps !== 'undefined') setCrawleeDeps(deps);
  
  if (typeof setJDDeps !== 'undefined') setJDDeps(deps);
  if (typeof setWBDeps !== 'undefined') setWBDeps(deps);
  if (typeof setWWDeps !== 'undefined') setWWDeps(deps);
  if (typeof setMandapDeps !== 'undefined') setMandapDeps(deps);
  if (typeof setBraveDeps !== 'undefined') setBraveDeps(deps);
  if (typeof setDeepseekDeps !== 'undefined') setDeepseekDeps(deps);
  if (typeof setIndiaMartDeps !== 'undefined') setIndiaMartDeps(deps);
  if (typeof setScrapyDeps !== 'undefined') setScrapyDeps(deps);

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
  const maskedNvidia = settings.nvidiaApiKey 
    ? settings.nvidiaApiKey.substring(0, 8) + '*'.repeat(20) + settings.nvidiaApiKey.slice(-4) 
    : '';
  const maskedOla = settings.olaMapsApiKey 
    ? settings.olaMapsApiKey.substring(0, 6) + '*'.repeat(16) + settings.olaMapsApiKey.slice(-4) 
    : '';
  res.json({ 
    ...settings, 
    nvidiaApiKey: maskedNvidia,
    olaMapsApiKey: maskedOla,
    mapsProvider: 'CartoDB Dark Basemaps (Free, Zero Key Required)',
    geocodingProvider: 'OpenStreetMap Nominatim (Free, Zero Key Required)'
  });
});

router.post('/settings', (req, res) => {
  const { nvidiaApiKey, olaMapsApiKey } = req.body;
  
  const updates = {};
  if (nvidiaApiKey && !nvidiaApiKey.includes('**')) {
    updates.nvidiaApiKey = nvidiaApiKey;
  }
  if (olaMapsApiKey && !olaMapsApiKey.includes('**')) {
    updates.olaMapsApiKey = olaMapsApiKey;
  }
  
  const newSettings = updateSettings(updates);
  res.json({ success: true, message: 'Settings saved successfully.', settings: newSettings });
});

const activeCronJobs = {};

router.get('/jobs', (req, res) => {
  const cronJobs = Object.keys(activeCronJobs).map(cat => ({
    category: cat,
    interval: activeCronJobs[cat].interval,
    status: activeCronJobs[cat].status,
    location: activeCronJobs[cat].location
  }));

  // Include recent sessions, finished or running. A finished record is how the
  // client watchdog learns that a run actually completed instead of guessing
  // from silence.
  const now = Date.now();
  const recentSessions = Object.values(activeSessions).filter(s => {
    const started = Number(s.startTime) || 0;
    return !started || now - started < 2 * 60 * 60 * 1000;
  });

  const activeQueue = (typeof getActiveJobs === 'function') ? getActiveJobs() : [];

  const omniJobs = recentSessions.map(s => ({
    id: s.sessionId || `session_${s.category}`,
    category: s.category,
    location: s.location,
    status: s.finished ? (s.status === 'failed' ? 'failed' : 'completed') : 'running',
    sessionActive: !s.finished,
    finishedAt: s.finishedAt || null,
    activeDistrict: s.activeDistrict,
    activeMandal: s.activeMandal,
    completedCount: s.overallCompletedMandals,
    totalCount: s.overallTotalMandals || Object.keys(s.completedTargetsMap || {}).length,
    etaText: s.eta,
    type: 'omni'
  }));

  // If queue has jobs running, also expose them
  if (omniJobs.length === 0 && activeQueue.length > 0) {
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
  const sessions = Object.values(activeSessions);
  const runningSession = sessions.find(s => {
    const total = s.overallTotalMandals || Object.keys(s.completedTargetsMap || {}).length || 1;
    return s.overallCompletedMandals < total && !globalAbortSignal.aborted;
  }) || sessions[sessions.length - 1] || null;

  const activeQueue = (typeof getActiveJobs === 'function') ? getActiveJobs() : [];
  const isScraping = activeQueue.length > 0 || (runningSession && runningSession.overallCompletedMandals < (runningSession.overallTotalMandals || 1));

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

router.post('/firebase', async (req, res) => {
  const { query, category, location } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });
  res.json({ success: true, message: 'Firebase scrape initiated' });
});

// MANUAL SCRAPER TRIGGERS (Restored as requested)
const { exec } = require('child_process');

router.post('/python', async (req, res) => {
  const { query, location } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });
  
  // Python trigger logic with properly escaped arguments
  const pythonScript = path.join(__dirname, '../scrapers/engine-python.py');
  const safeQuery = query.replace(/"/g, '\\"');
  const safeLoc = (location || '').replace(/"/g, '\\"');
  
  const { getSettings } = require('../config/settingsManager');
  const settings = getSettings();
  const apiKey = settings.nvidiaApiKey || 'none';
  
  addLog(`[System] Triggering manual Python Engine for: "${safeQuery}" in "${safeLoc}"`);
  
  const cmd = `python "${pythonScript}" --query "${safeQuery}" --category "${safeQuery}" --location "${safeLoc}" --apikey "${apiKey}"`;
  
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      addLog(`[ERROR] Python engine failed: ${error.message}`);
      return;
    }
    addLog(`[INFO] Python engine stdout: ${stdout}`);
    if (stderr) addLog(`[WARN] Python engine stderr: ${stderr}`);
  });
  
  res.json({ success: true, message: 'Python script triggered successfully' });
});

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
  } catch(err) {
    res.json({ type: "specific" });
  }
});



// Permanent AI Geographical Memory
const LOCATIONS_MEMORY_FILE = path.join(require('../config/paths').DB_DIR, 'locations_memory.json');
let locationsMemoryCache = null;

function getLocationsMemory() {
  if (locationsMemoryCache) return locationsMemoryCache;
  if (fs.existsSync(LOCATIONS_MEMORY_FILE)) {
    try {
      locationsMemoryCache = JSON.parse(fs.readFileSync(LOCATIONS_MEMORY_FILE, 'utf-8'));
      return locationsMemoryCache;
    } catch(e) { 
      locationsMemoryCache = {};
      return locationsMemoryCache; 
    }
  }
  locationsMemoryCache = {};
  return locationsMemoryCache;
}

function saveLocationsMemory(data) {
  try {
    locationsMemoryCache = data;
    if (!fs.existsSync(path.dirname(LOCATIONS_MEMORY_FILE))) {
      fs.mkdirSync(path.dirname(LOCATIONS_MEMORY_FILE), { recursive: true });
    }
    fs.writeFileSync(LOCATIONS_MEMORY_FILE, JSON.stringify(data, null, 2));
  } catch(e) { console.error("Failed to save locations memory:", e); }
}

async function getSubLocations(locationName, stateHint = '') {
  const memory = getLocationsMemory();
  const key = `${(locationName || "").toString().toLowerCase().trim()}_${(stateHint || '').toLowerCase().trim()}`;
  
  if (memory[key] && memory[key].length > 0) {
    return memory[key];
  }
  
  // Not in memory, fetch it!
  console.log(`[Geographic AI] Memory miss for "${locationName}". Learning sub-locations from AI...`);
  const results = await intelligentExtractor.generateLocalities(locationName, stateHint);
  
  if (results && results.length > 0) {
    memory[key] = results;
    saveLocationsMemory(memory);
  }
  
  return (results || [locationName]).filter(Boolean);
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ──────────────────────────────────────────────────────────────────────────────
// PHYLLOTAXIS GOLDEN ANGLE GRID (Best-in-class 360° coverage algorithm)
// Uses the same math as sunflower seeds and NASA radar arrays.
// Golden Angle ≈ 137.5077° ensures ZERO clustering and ZERO blind spots.
// ──────────────────────────────────────────────────────────────────────────────
function generateGridCoordinates(centerLat, centerLng, radiusKm, pointCount = 20, boundingbox = null) {
  const GOLDEN_ANGLE_DEG = 137.50776405003785; // 360° / φ²
  const coords = [];

  // Bounding box format from Nominatim: [south, north, west, east]
  let minLat, maxLat, minLng, maxLng;
  let useBoundary = false;
  
  if (boundingbox && boundingbox.length === 4) {
    minLat = parseFloat(boundingbox[0]);
    maxLat = parseFloat(boundingbox[1]);
    minLng = parseFloat(boundingbox[2]);
    maxLng = parseFloat(boundingbox[3]);
    useBoundary = true;
    addLog(`[Containment Guard] Enforcing strict boundary mesh [${minLat.toFixed(4)}, ${maxLat.toFixed(4)}, ${minLng.toFixed(4)}, ${maxLng.toFixed(4)}]`);
  }

  // Point 0: always the search center
  coords.push({
    lat: parseFloat(centerLat.toFixed(6)),
    lng: parseFloat(centerLng.toFixed(6)),
    distanceFromCenter: 0,
    ring: 0,
    angle: 0,
    boundingbox: boundingbox
  });

  const totalOuterPoints = Math.max(pointCount - 1, 1);

  for (let i = 1; i <= totalOuterPoints; i++) {
    // Phyllotaxis formula: uniform spiral outward
    const t = i / totalOuterPoints;
    const distKm = Math.sqrt(t) * radiusKm; // √t gives inner-dense, outer-sparse
    const angleDeg = i * GOLDEN_ANGLE_DEG;
    const angleRad = (angleDeg % 360) * Math.PI / 180;

    // Convert polar → geographic lat/lng
    const ptLat = centerLat + (distKm * Math.cos(angleRad)) / 111.0;
    const ptLng = centerLng + (distKm * Math.sin(angleRad)) / (111.0 * Math.cos(centerLat * Math.PI / 180));

    // Advanced: If bounding box exists, discard points outside the district!
    if (useBoundary) {
      if (ptLat < minLat || ptLat > maxLat || ptLng < minLng || ptLng > maxLng) {
        continue; // Skip this point, it's outside the district!
      }
    }

    // Determine which concentric ring this point belongs to (for UI coloring)
    const ring = t < 0.34 ? 1 : t < 0.67 ? 2 : 3;

    coords.push({
      lat: parseFloat(ptLat.toFixed(6)),
      lng: parseFloat(ptLng.toFixed(6)),
      distanceFromCenter: parseFloat(distKm.toFixed(2)),
      ring,
      angle: parseFloat((angleDeg % 360).toFixed(1)),
      boundingbox: boundingbox
    });
  }

  return coords;
}

// ──────────────────────────────────────────────────────────────────────────────
// INSTANT MANDAL JOB QUEUER - Cache-first, never blocks on Nominatim
// ──────────────────────────────────────────────────────────────────────────────
async function queueMandalJob(subLoc, district, mandal, stateName, category, activeEngines, sessionId, geocodeCache, isVillage) {
  const activeRadius = isVillage ? 5 : 10;
  const queryStr = `${subLoc}, ${district}, ${stateName || 'India'}`;
  const cacheKey = queryStr.toLowerCase().trim();

  // Check cache instantly (0ms)
  const cached = geocodeCache[cacheKey];
  let geo = (cached && cached.lat) ? cached : null;

  // If not cached, try district-level cache as fallback (still 0ms)
  if (!geo) {
    const districtKey = `${district}, ${stateName || 'India'}`.toLowerCase().trim();
    const districtCached = geocodeCache[districtKey];
    if (districtCached && districtCached.lat) {
      geo = districtCached; // Use district coords as pin placeholder
    }
  }

  // Emit map pin if we have coords
  if (geo && geo.lat) {
    const gridPoint = { lat: geo.lat, lng: geo.lng, distanceFromCenter: 0, ring: 0, angle: 0, centerLoc: subLoc, activeRadius, isExactPoint: true, boundingbox: geo.boundingbox };
    try { emitGridEvent([gridPoint]); } catch (e) {}
  }

  // Build search URL - qualified with state & district to prevent cross-border drift
  let searchUrl, meta;
  const searchString = `${category} in ${subLoc}, ${district}, ${stateName || 'India'}`;
  if (geo && geo.lat) {
    searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}/@${geo.lat},${geo.lng},14z`;
    meta = { lat: geo.lat, lng: geo.lng, locationName: subLoc, district: district, state: stateName, isVillage, boundingbox: geo.boundingbox || null };
  } else {
    // Text-only search
    searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}`;
    meta = { lat: null, lng: null, locationName: subLoc, district: district, state: stateName, isVillage, boundingbox: null };
  }

  // Queue ultra-fast Local Finder job (20 leads/page in pre-rendered HTML)
  await addScrapeJob('scrapeGoogleLocalFinder', [searchString, category, subLoc, sessionId, 10, district, stateName, geo], 10, meta);
  if (activeEngines && (activeEngines.includes('google-web') || activeEngines.includes('serp'))) {
    await addScrapeJob('scrapeGoogleSerp', [`${category} in ${subLoc}, ${district}`, category, subLoc, sessionId], 10, meta);
  }
}

/**
 * Write a search folder. Every run owns one JSON file under
 * db/user_sessions/<user>/<sessionId>.json. The live vendor store is purged
 * between runs, but these folders are the durable history the user can reopen.
 */
function persistSessionVault({ sessionId, userId, category, location, leads, metadata }) {
  const safeSessionId = String(sessionId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
  const SESSIONS_DIR = require('../config/paths').SESSIONS_DIR;
  const targetDirs = [path.join(SESSIONS_DIR, 'anonymous')];
  if (userId && userId !== 'anonymous') {
    targetDirs.push(path.join(SESSIONS_DIR, String(userId).replace(/[^a-zA-Z0-9_-]/g, '_')));
  }

  const safeLeads = Array.isArray(leads) ? leads : [];
  const phoneCount = safeLeads.filter(lead => lead && lead.phone && !String(lead.phone).includes('Requires')).length;
  const verifiedCount = safeLeads.filter(lead => lead && (lead.verified || (lead.phone && /^[6-9]\d{9}$/.test(String(lead.phone).replace(/\D/g, '').slice(-10))))).length;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const cleanCat = String(category || 'Business').replace(/[^\w\s&,-]/g, '').trim();
  const cleanLoc = String(location || 'India').replace(/[^\w\s&,-]/g, '').trim();
  const friendlyName = `${cleanCat} in ${cleanLoc} • ${dateStr}, ${timeStr}`;

  const sessionVaultData = {
    id: safeSessionId,
    name: friendlyName,
    name: `${String(category || 'Business').replace(/[^\w\s&,-]/g, '').trim()} in ${String(location || 'India').replace(/[^\w\s&,-]/g, '').trim()}`,
    userId: userId || 'anonymous',
    category: cleanCat,
    location: cleanLoc,
    timestamp: now.toISOString(),
    createdAt: metadata?.startedAt || now.toISOString(),
    leadCount: safeLeads.length,
    phoneCount,
    verifiedCount,
    metadata: {
      ...(metadata || {}),
      phoneCount,
      verifiedCount,
      status: metadata?.status || 'completed'
    },
    leads: safeLeads
  };

  const written = [];
  for (const dir of targetDirs) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const vaultPath = path.join(dir, `${safeSessionId}.json`);

      // Never shrink a folder. A stop, a fresh run or a deep-profile pass can
      // hand us a partial list for a session that already has a full snapshot;
      // overwriting it would silently delete leads the user can still see.
      try {
        if (fs.existsSync(vaultPath)) {
          const previous = JSON.parse(fs.readFileSync(vaultPath, 'utf-8'));
          const previousCount = Number(previous?.leadCount) || (Array.isArray(previous?.leads) ? previous.leads.length : 0);
          if (previousCount > safeLeads.length && previousCount > 0) {
            written.push(vaultPath);
            continue;
          }
        }
      } catch (guardError) {
        // A corrupt folder is replaced by the current snapshot.
      }

      fs.writeFileSync(vaultPath, JSON.stringify(sessionVaultData, null, 2), 'utf-8');
      written.push(vaultPath);
    } catch (error) {
      // A folder write must never break a live scrape.
    }
  }
  return { file: written[0] || '', phoneCount, leadCount: safeLeads.length };
}

function matchesMasterFilters(lead, filters = {}) {
  if (!lead) return false;
  if (Number(filters.minRating) > 0 && Number(lead.rating) < Number(filters.minRating)) return false;
  if (filters.hasWebsite && !lead.website) return false;
  if (filters.verifiedOnly && !(lead.verified || Number(lead.profileQuality?.score) >= 70)) return false;
  if (filters.mobileOnly) {
    const digits = String(lead.phone || lead.whatsapp || '').replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) return false;
  }
  return true;
}

async function runOmniSearchOrchestrator(category, baseLocation, strategy, radius, gridDensity, enabledEngines, sessionId, userId = 'anonymous', filters = {}, plan = null) {
  const sessionAbortSignal = { aborted: false };
  const requestedEngines = Array.isArray(enabledEngines) ? enabledEngines.filter(Boolean) : [];
  const classification = categoryRouter.classifyCategory(category);
  const autoMode = !requestedEngines.length || requestedEngines.some(engine => /^auto$/i.test(String(engine)));
  const activeEngines = autoMode
    ? categoryRouter.pickAutoEngines(classification)
    : [...new Set(requestedEngines)];

  // Product/brand intent is searched with the dealer phrase that directories
  // actually index ("graphic card dealer", "Tamarind wholesaler"), while the
  // folder keeps the operator's original words.
  const productIntent = classification.intent
    && ['product', 'brand', 'brand_product'].includes(classification.intent.intentKind);
  const searchPhrase = productIntent
    ? brandIntel.bestSearchPhrase(classification.intent, category)
    : category;
  if (productIntent && searchPhrase && searchPhrase.toLowerCase() !== category.toLowerCase()) {
    addLog(`[Orchestrator] Intent: ${classification.intent.intentKind} · searching dealer phrase "${searchPhrase}" (folder keeps "${category}")`);
  }

  addLog(`[Orchestrator] Starting Universal Omni Search session: ${sessionId} (User: ${userId})`);
  addLog(`[Orchestrator] Query: "${category}" in "${baseLocation}". Family: ${classification.label} (${classification.family}). Strategy: ${strategy}`);
  addLog(`[Orchestrator] Auto engine plan: ${activeEngines.join(', ')}${autoMode ? ' (automatic)' : ' (manual)'}`);

  // Open the search folder immediately so an interrupted run still leaves a
  // dated artifact with its query and metadata. It is overwritten with the
  // complete lead list when the scrape phase finishes.
  try {
    persistSessionVault({
      sessionId,
      userId,
      category,
      location: baseLocation,
      leads: [],
      metadata: {
        status: 'running',
        startedAt: new Date().toISOString(),
        services: classification.label,
        engines: activeEngines,
        filters: filters && Object.keys(filters).length ? filters : undefined
      }
    });
  } catch (error) {
    addLog(`[Orchestrator] Folder could not be opened: ${error.message}`);
  }
  
  // Clear any pending old ghost jobs from the queue to prevent blocking the new dispatch
  await clearQueue();
  addLog(`[Orchestrator] Flushed persistent job queue to unblock sequence.`);

  // Fresh-data policy: older leads are removed automatically. CRM-engaged
  // leads and the current run are preserved.
  try {
    const purge = leadRetention.prepareFreshRun({ keepSessionId: sessionId, requestedCategory: category });
    addLog(`[Orchestrator] 🧹 Fresh-data purge: ${purge.removed} old leads removed, ${purge.engagedKept || 0} CRM-engaged kept, ${purge.profilesRemoved} deep profiles cleaned.`);
  } catch (purgeError) {
    addLog(`[Orchestrator] Purge skipped: ${purgeError.message}`);
  }

  // Ensure database sync is flushed to disk
  if (typeof dbAdapter.flushSync === 'function') {
    dbAdapter.flushSync();
  }
  
  try {
    // 1. Resolve Universal Geographic Zones (0.01ms instantaneous local memory indexing).
    //    A master sweep supplies a frozen plan, so its exact zone policy is honoured
    //    instead of re-resolving from the location string.
    const zones = (Array.isArray(plan?.zones) && plan.zones.length)
      ? plan.zones.map(z => {
          const zoneName = z.name;
          const suffix = z.kind === 'village' && plan.district ? `, ${plan.district}` : '';
          return {
            zoneName,
            queryText: `${searchPhrase} in ${zoneName}${suffix}`,
            district: plan.district || null,
            state: plan.state || null,
            isVectorQuery: true,
            isSingle: false
          };
        })
      : resolveUniversalZones(baseLocation, category);
    addLog(`[Orchestrator] Resolved ${zones.length} universal zones for "${baseLocation}": ${zones.map(z => z.zoneName).join(', ')}`);

    // Geocode base location for initial radar map focus & fallback coordinates
    let baseGeo = null;
    try {
      baseGeo = await geocodeLocation(baseLocation);
    } catch (e) {}

    // Emit initial dispatch event to radar map
    try {
      emitDispatchEvent(zones.map(z => z.zoneName));
    } catch (e) {}

    // Emit the full zone coverage, not just the base pin, so the command map
    // can scan every area before the first vendor arrives.
    if (baseGeo && baseGeo.lat) {
      try {
        const zonePoints = zones.map((zone, index) => {
          const lat = Number(zone.lat);
          const lng = Number(zone.lng);
          const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
          return {
            zoneName: zone.zoneName,
            query: zone.queryText,
            lat: hasCoords ? lat : baseGeo.lat,
            lng: hasCoords ? lng : baseGeo.lng,
            approx: !hasCoords,
            index: index + 1,
            centerLoc: baseLocation,
            district: zone.district || baseGeo.district || baseLocation,
            state: zone.state || baseGeo.state || 'India'
          };
        });
        emitGridEvent([{
          lat: baseGeo.lat,
          lng: baseGeo.lng,
          distanceFromCenter: 0,
          ring: 0,
          angle: 0,
          centerLoc: baseLocation,
          activeRadius: Number(radius) || 5,
          isExactPoint: true,
          boundingbox: baseGeo.boundingbox,
          zones: zonePoints
        }, ...zonePoints]);
        addLog(`[Orchestrator] 🛰️ Coverage grid emitted: ${zonePoints.length} zones anchored around ${baseGeo.lat.toFixed(4)}, ${baseGeo.lng.toFixed(4)}.`);
      } catch (e) {}
    }

    const totalZones = zones.length;
    let completedZones = 0;
    const startTime = Date.now();

    activeSessions[sessionId] = {
      sessionId,
      category,
      location: baseLocation,
      family: classification.family,
      engines: activeEngines,
      baseLat: baseGeo?.lat || null,
      baseLng: baseGeo?.lng || null,
      status: 'running',
      totalDistricts: 1,
      completedDistricts: 0,
      activeDistrict: baseLocation,
      totalMandals: totalZones,
      completedMandals: 0,
      activeMandal: zones[0]?.zoneName || 'Zone 1',
      totalMandalsAcrossAll: totalZones,
      overallCompletedMandals: 0,
      eta: formatEta(totalZones * 6000), // ~6s per zone with parallel workers
      sessionActive: true,
      finished: false,
      completedTargetsMap: {},
      fullHierarchy: [{
        districtName: baseLocation,
        mandals: zones.map(z => z.zoneName)
      }],
      startTime
    };

    // Emit initial progress
    try {
      emitProgressEvent({
        totalDistricts: 1,
        completedDistricts: 0,
        activeDistrict: baseLocation,
        totalMandals: totalZones,
        completedMandals: 0,
        activeMandal: zones[0]?.zoneName || 'Zone 1',
        totalMandalsAcrossAll: totalZones,
        overallCompletedMandals: 0,
        eta: formatEta(totalZones * 6000),
        sessionActive: true
      });
    } catch (e) {}

    const geocodeCache = getGeoCache();
    const radiusKm = Number(radius) || 5;
    const normEngines = (Array.isArray(activeEngines) ? activeEngines : []).map(e => String(e).toLowerCase().replace(/[^a-z0-9]/g, ''));
    const isAutoMode = normEngines.length === 0 || normEngines.includes('auto');

    const hasEngine = (key) => {
      if (isAutoMode) return true;
      switch (key) {
        case 'local_finder':
          return normEngines.some(e => e.includes('serp') || e.includes('local') || e.includes('finder') || e.includes('deepserp'));
        case 'maps':
          return normEngines.some(e => e.includes('map') || e.includes('place') || e.includes('geospatial') || e.includes('mesh') || e.includes('radar') || e.includes('gps'));
        case 'justdial':
          return normEngines.some(e => e.includes('justdial') || e.includes('jd') || e.includes('telecom') || e.includes('mobile') || e.includes('direct'));
        case 'indiamart':
          return normEngines.some(e => e.includes('indiamart') || e.includes('mart') || e.includes('b2b') || e.includes('enterprise') || e.includes('supplier'));
        case 'social':
          return normEngines.some(e => e.includes('dork') || e.includes('social') || e.includes('duckduckgo') || e.includes('ddg') || e.includes('instagram') || e.includes('facebook') || e.includes('footprint') || e.includes('digital'));
        case 'weddingbazaar':
          return normEngines.some(e => e.includes('weddingbazaar') || e.includes('bazaar') || e.includes('hospitality') || e.includes('venue'));
        case 'weddingwire':
          return normEngines.some(e => e.includes('weddingwire') || e.includes('wedding-wire') || e.includes('hospitality') || e.includes('venue'));
        case 'mandap':
          return normEngines.some(e => e.includes('mandap') || e.includes('hospitality') || e.includes('venue'));
        default:
          return normEngines.includes(String(key).toLowerCase().replace(/[^a-z0-9]/g, ''));
      }
    };

    // 2. Queue all zones into the high-speed worker pool
    for (let zi = 0; zi < zones.length; zi++) {
      if (globalAbortSignal.aborted || sessionAbortSignal.aborted) break;

      const z = zones[zi];
      const zoneQuery = (z.isVectorQuery || z.queryText.toLowerCase().includes(searchPhrase.toLowerCase())) ? z.queryText : `${searchPhrase} in ${z.queryText}`;
      
      // Attempt 0ms geocode cache lookup for zone
      const zoneCacheKey = `${z.zoneName}, ${baseLocation}`.toLowerCase().trim();
      const zoneGeo = (z.lat && z.lng) ? { lat: z.lat, lng: z.lng } : (geocodeCache[zoneCacheKey] || baseGeo);

      const targetDistrict = z.district || baseLocation;
      const targetState = z.state || 'India';

      const meta = {
        lat: zoneGeo?.lat || null,
        lng: zoneGeo?.lng || null,
        zoneName: z.zoneName,
        locationName: z.zoneName,
        district: targetDistrict,
        state: targetState,
        sessionId,
        active: true
      };

      activeSessions[sessionId].completedTargetsMap[z.zoneName.toLowerCase().trim()] = 'queued';

      // Queue the Google Local Finder job (5 pages for comprehensive high-density lead yield)
      if (hasEngine('local_finder')) {
        await addScrapeJob(
          'scrapeGoogleLocalFinder',
          [zoneQuery, category, z.zoneName, sessionId, 5, targetDistrict, targetState, zoneGeo, baseLocation],
          10,
          meta
        );
      }

      // Google Maps place feed with 5km search radius
      if (hasEngine('maps')) {
        await addScrapeJob(
          'scrapeGooglePlaces',
          [zoneQuery, category, z.zoneName, sessionId, zoneGeo?.lat || null, zoneGeo?.lng || null, radiusKm, 'broad', targetDistrict, targetState, zoneGeo?.boundingbox || null, baseLocation],
          8,
          meta
        );
      }

      // If DeepSeek AI is enabled, also queue it for auxiliary AI enrichment
      if (activeEngines.includes('deepseek-ai')) {
        await addScrapeJob('scrapeDeepseekAI', [zoneQuery, category, z.zoneName], 5, meta);
      }
    }

    addLog(`[Orchestrator] Queued all ${zones.length} zone jobs into high-speed swarm. Monitoring execution...`);

    // 2b. City-scoped directory & marketplace engines. These run once per
    // session (not per zone) and stream real listings into the same session.
    const directoryJobs = [];
    if (hasEngine('justdial')) {
      directoryJobs.push(['scrapeJustDial', [searchPhrase, baseLocation, 'omni', sessionId]]);
    }
    if (hasEngine('indiamart')) {
      directoryJobs.push(['scrapePuppeteerIndiaMart', [searchPhrase, baseLocation, 'omni', sessionId]]);
    }
    if (hasEngine('weddingbazaar')) {
      directoryJobs.push(['scrapeWeddingBazaar', [category, baseLocation, 'omni', sessionId]]);
    }
    if (hasEngine('weddingwire')) {
      directoryJobs.push(['scrapeWeddingWire', [category, baseLocation, 'omni', sessionId]]);
    }
    if (hasEngine('mandap')) {
      directoryJobs.push(['scrapeMandap', [category, baseLocation, 'omni', sessionId]]);
    }
    if (hasEngine('social')) {
      directoryJobs.push(['scrapeDuckDuckGoDork', ['instagram.com', `${category} ${baseLocation}`, category, baseLocation, sessionId]]);
      directoryJobs.push(['scrapeDuckDuckGoDork', ['facebook.com', `${category} ${baseLocation}`, category, baseLocation, sessionId]]);
    }
    if (normEngines.some(e => e.includes('brave'))) {
      directoryJobs.push(['scrapeBraveDork', ['instagram.com', `${category} ${baseLocation}`, category, baseLocation, sessionId]]);
    }

    for (const [taskName, args] of directoryJobs) {
      try {
        await addScrapeJob(taskName, args, 5, {
          lat: baseGeo?.lat || null,
          lng: baseGeo?.lng || null,
          zoneName: baseLocation,
          locationName: baseLocation,
          district: baseLocation,
          state: 'India',
          sessionId,
          active: true,
          cityScope: true
        });
        addLog(`[Orchestrator] Queued directory engine: ${taskName}`);
      } catch (e) {
        addLog(`[Orchestrator] Could not queue ${taskName}: ${e.message}`);
      }
    }

    // 3. Monitor swarm progress & emit dynamic sliding-window ETA
    let waitTicks = 0;
    let allZonesCompleteAt = null;
    const maxScrapeWindowMs = Math.max(60000, totalZones * 12000);
    while (true) {
      if (globalAbortSignal.aborted || sessionAbortSignal.aborted) break;

      const currentQueue = getPersistentQueue();
      const running = getActiveJobs();

      const belongsToSession = (job) => Array.isArray(job.args) && job.args.includes(sessionId);
      const pendingForSession = currentQueue.filter(belongsToSession);
      const runningForSession = running.filter(belongsToSession);

      // Progress must come from the per-zone state map, not from raw job
      // counts. Two discovery engines run per zone plus city-scoped directory
      // engines, so job counts made the bar sit at 0 until the very end.
      const sessionState = activeSessions[sessionId] || {};
      const targetMap = sessionState.completedTargetsMap || {};
      const targetKeys = Object.keys(targetMap);
      const finishedZones = targetKeys.filter(key => targetMap[key] === 'completed').length;
      completedZones = Math.min(totalZones, finishedZones);

      // Calculate sliding-window dynamic ETA
      let etaStr = 'Calculating...';
      const elapsed = Date.now() - startTime;
      if (completedZones > 0) {
        const avgTimePerZone = elapsed / completedZones;
        const remainingMs = (totalZones - completedZones) * avgTimePerZone;
        etaStr = formatEta(remainingMs);
      } else {
        etaStr = formatEta(Math.max(5000, (totalZones - completedZones) * 6000));
      }

      // Active zone name being processed
      const activeRunningJob = runningForSession[0];
      const nextZone = zones.find(zone => targetMap[String(zone.zoneName).toLowerCase().trim()] !== 'completed');
      const activeZoneName = activeRunningJob?.meta?.locationName || nextZone?.zoneName || 'Finalizing';

      try {
        emitProgressEvent({
          totalDistricts: 1,
          completedDistricts: completedZones >= totalZones ? 1 : 0,
          activeDistrict: baseLocation,
          totalMandals: totalZones,
          completedMandals: completedZones,
          activeMandal: activeZoneName,
          totalMandalsAcrossAll: totalZones,
          overallCompletedMandals: completedZones,
          eta: etaStr,
          sessionActive: true
        });
      } catch (e) {}

      // Completion rules. Once every zone has reported, give duplicate engine
      // jobs a short grace window and release the stragglers. Also cap the
      // whole scrape window so one hung page can never hold a run for minutes.
      if (finishedZones >= totalZones) {
        if (!allZonesCompleteAt) allZonesCompleteAt = Date.now();
        if (Date.now() - allZonesCompleteAt > 12000) {
          addLog('[Orchestrator] All zones reported complete. Releasing remaining browser jobs.');
          break;
        }
      } else {
        allZonesCompleteAt = null;
      }
      if (Date.now() - startTime > maxScrapeWindowMs) {
        addLog(`[Orchestrator] Scrape window reached with ${finishedZones}/${totalZones} zones complete. Finalizing.`);
        break;
      }

      if (pendingForSession.length === 0 && runningForSession.length === 0) {
        break;
      }

      waitTicks++;
      if (waitTicks % 5 === 0) {
        addLog(`[Orchestrator] Progress: ${completedZones}/${totalZones} zones complete. ${pendingForSession.length} pending, ${runningForSession.length} running. ETA: ${etaStr}`);
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    // Close the scrape phase for jobs that are still in flight. Without this,
    // a hung duplicate engine keeps writing into a session that already
    // reported 100% and the client never sees a completed run.
    if (!sessionAbortSignal.aborted) {
      sessionAbortSignal.aborted = true;
      addLog(`[Orchestrator] Scrape phase closed for session ${sessionId}.`);
    }

    // 4. Scrape Completed: Aggregate Session Leads & Automatically Save to Individual Search Vault
    const allVendors = dbAdapter.getVendors();
    const harvestedLeads = allVendors.filter(v => v.sessionId === sessionId);
    const hasFilters = filters && Object.keys(filters).length > 0;
    const sessionLeads = hasFilters ? harvestedLeads.filter(lead => matchesMasterFilters(lead, filters)) : harvestedLeads;
    addLog(`[Orchestrator] Swarm finished. Harvested ${sessionLeads.length} leads for session "${sessionId}"${hasFilters ? ` (${harvestedLeads.length - sessionLeads.length} removed by master filters)` : ''}.`);

    // Dual-save session vault to disk. This is the user's "search folder":
    // one file per run, kept even after the live dataset is purged.
    try {
      const saved = persistSessionVault({
        sessionId,
        userId,
        category,
        location: baseLocation,
        leads: sessionLeads,
        metadata: {
          status: 'completed',
          completedAt: new Date().toISOString(),
          totalZones,
          zones: zones.map(z => z.zoneName),
          elapsedTimeSec: Math.round((Date.now() - startTime) / 1000),
          filters: hasFilters ? filters : undefined,
          harvestedBeforeFilters: hasFilters ? harvestedLeads.length : undefined
        }
      });
      addLog(`[Orchestrator] 📁 Search folder saved: ${saved.file || `${sessionId}.json`} (${saved.leadCount} leads, ${saved.phoneCount} phones)`);
    } catch (saveErr) {
      addLog(`[Orchestrator] Note: Could not auto-persist vault to disk: ${saveErr.message}`);
    }

    // Auto-learning: only a finished run with real leads may teach the
    // taxonomy. This is how the dictionary grows for products nobody curated.
    try {
      const learned = taxonomyLearner.recordRun({
        query: category,
        location: baseLocation,
        leadCount: sessionLeads.length,
        phoneCount: sessionLeads.filter(v => v.phone).length,
        vendors: sessionLeads
      });
      if (learned?.product) {
        addLog(`[Orchestrator] 🧠 Taxonomy learned: "${learned.product}" from ${sessionLeads.length} leads.`);
      }
    } catch (learnErr) {
      addLog(`[Orchestrator] Taxonomy learning skipped: ${learnErr.message}`);
    }

    // Emit 100% complete event
    try {
      emitProgressEvent({
        totalDistricts: 1,
        completedDistricts: 1,
        activeDistrict: baseLocation,
        totalMandals: totalZones,
        completedMandals: totalZones,
        activeMandal: 'Complete',
        totalMandalsAcrossAll: totalZones,
        overallCompletedMandals: totalZones,
        eta: '0s',
        totalLeads: sessionLeads.length,
        sessionActive: false
      });
    } catch (e) {}

    // 5. Automatic deep enrichment: Maps detail pass, then website crawl for
    // every lead that is still missing contact data. Runs in the background so
    // profiles stream in while the user reviews the map.
    try {
      const deepProfileService = require('../services/deepProfileService');
      const candidates = sessionLeads.filter(v => !v.deepExtractedAt || !v.phone || !v.website);
      if (candidates.length) {
        const deepJob = deepProfileService.startJob({
          vendorIds: candidates.map(v => v.id),
          force: true,
          includeWebsite: true,
          includeGoogle: true,
          concurrency: 3,
          limit: Math.min(candidates.length, 300)
        });
        addLog(`[Orchestrator] Deep enrichment queued for ${deepJob.total} vendors (job ${deepJob.id}). Phones, websites and profiles will stream in as each vendor completes.`);
      }
    } catch (deepErr) {
      addLog(`[Orchestrator] Deep enrichment could not be queued: ${deepErr.message}`);
    }

    sessionAbortSignal.aborted = true;
    if (activeSessions[sessionId]) {
      activeSessions[sessionId].finished = true;
      activeSessions[sessionId].status = 'completed';
      activeSessions[sessionId].sessionActive = false;
      activeSessions[sessionId].finishedAt = Date.now();
    }
    addLog(`[Orchestrator] Universal Omni Search Session ${sessionId} completed in ${Math.round((Date.now() - startTime) / 1000)}s!`);
  } catch (err) {
    addLog(`[Orchestrator Error] ${err.message}`);
    try {
      persistSessionVault({
        sessionId,
        userId,
        category,
        location: baseLocation,
        leads: dbAdapter.getVendors().filter(v => v.sessionId === sessionId || v.lastSessionId === sessionId),
        metadata: { status: 'failed', error: err.message, completedAt: new Date().toISOString() }
      });
    } catch (saveErr) { /* ignore */ }
    try {
      emitProgressEvent({
        sessionActive: false,
        error: err.message
      });
    } catch (e) {}
    sessionAbortSignal.aborted = true;
    if (activeSessions[sessionId]) {
      activeSessions[sessionId].finished = true;
      activeSessions[sessionId].status = 'failed';
      activeSessions[sessionId].sessionActive = false;
      activeSessions[sessionId].finishedAt = Date.now();
    }
  }
}


// OMNI SEARCH API
function chargeOmniCredits(userId) {
  if (!userId) return { ok: true };
  const users = dbAdapter.getPublicUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) return { ok: false, status: 404, error: 'User not found' };

  const user = users[userIndex];
  if (Number(user.credits) < 5) {
    return { ok: false, status: 403, error: 'Insufficient credits for an Omni Scrape. Requires at least 5 credits.' };
  }

  user.credits = Number(user.credits) - 5;
  users[userIndex] = user;
  dbAdapter.savePublicUsers(users);
  addLog(`[Billing] Deducted 5 credits from user ${user.email || user.id} for Omni Scrape. Remaining: ${user.credits}`);
  return { ok: true, remaining: user.credits };
}

router.post('/omni', async (req, res) => {
  const { query, category, location, radius, gridDensity, enabledEngines, engines, sessionId, userId } = req.body;
  const parsed = categoryRouter.parseSearchQuery({ query, category, location });
  const searchQuery = query || (parsed.category && parsed.location ? `${parsed.category} in ${parsed.location}` : (parsed.category || parsed.location));

  if (!parsed.category || !parsed.location) {
    return res.status(400).json({
      error: 'Category and location are required. Send "plumbers in Vijayawada" or separate category + location fields.'
    });
  }

  // Client Restriction: Client can ONLY scrape individual cities and mandals!
  const isMaster = req.headers['x-workspace-scope'] === 'master' || req.body.isMaster === true;
  if (!isMaster) {
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

  const finalSessionId = sessionId || 'omni_' + Date.now().toString(36);
  const classification = categoryRouter.classifyCategory(matchedCategory);

  // If explicit engines are provided by the user/UI, honor them; otherwise route automatically.
  const explicitEngines = (Array.isArray(enabledEngines) && enabledEngines.length)
    ? enabledEngines
    : (Array.isArray(engines) && engines.length)
      ? engines
      : null;
  const resolvedEngines = (explicitEngines && !explicitEngines.includes('auto'))
    ? [...new Set(explicitEngines)]
    : categoryRouter.pickAutoEngines(classification);

  // A new search replaces the live dataset. Stop the old deep job first so it
  // cannot keep probing vendors that are about to be deleted. Archived search
  // folders are preserved.
  let purge = { removed: 0, engagedKept: 0, profilesRemoved: 0, vaultsRemoved: 0 };
  let deepStopped = 0;
  try {
    const deepProfileService = require('../services/deepProfileService');
    deepStopped = deepProfileService.stopAll('superseded by a fresh search');
  } catch (deepStopError) {
    addLog(`[Omni] Deep-cancel skipped: ${deepStopError.message}`);
  }
  try {
    purge = leadRetention.prepareFreshRun({ keepSessionId: finalSessionId, requestedCategory: matchedCategory });
  } catch (purgeError) {
    addLog(`[Omni] Purge skipped: ${purgeError.message}`);
  }

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
      auto: true
    }
  });

  addLog(`\n[Omni Search] Triggered for string: "${searchQuery}" with radius: ${radius || 0}km. Session ID: ${finalSessionId}`);
  addLog(`[Omni Search] Family ${classification.label} · engines ${resolvedEngines.join(', ')}`);

  // Add the orchestrator task to the background queue so it starts running
  addScrapeJob('scrapeOmniOrchestrator', [matchedCategory, baseLocation, strategy, radius, gridDensity, resolvedEngines, finalSessionId, userId || 'anonymous']);
});

/**
 * Fully automatic scrape. Accepts one free-text query:
 *   { "query": "plumbers in Vijayawada" }
 * It classifies the category, chooses relevant engines, purges older leads
 * and dispatches the orchestrator. No engine knowledge is required.
 */
router.post('/auto', async (req, res) => {
  try {
    const { query, category, location, strategy = 'broad', radius, gridDensity, sessionId, userId, engines, enabledEngines } = req.body;
    const plan = categoryRouter.buildAutoPlan({ query, category, location });

    if (!plan.category || !plan.location) {
      return res.status(400).json({
        error: 'Could not resolve both a vendor category and a location. Try "plumbers in Vijayawada" or "electricians near Guntur".'
      });
    }

    // Client Restriction: Client can ONLY scrape individual cities and mandals!
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.body.isMaster === true;
    if (!isMaster) {
      const { classifyLocation } = require('../utils/universalGeoCluster');
      const locClassification = classifyLocation(plan.location);
      if (locClassification.type === 'state' || locClassification.type === 'district') {
        return res.status(403).json({
          error: `Client searches are restricted to individual cities and mandals. Wide-area ${locClassification.type} sweeps (${locClassification.name}) require Master Command Center access.`,
          classification: locClassification,
          allowedScopes: ['city', 'mandal', 'locality', 'town'],
          suggestedZones: locClassification.subZones?.slice(0, 8) || []
        });
      }
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

    globalAbortSignal.aborted = false;
    if (typeof dbAdapter.flushSync === 'function') dbAdapter.flushSync();

    const finalSessionId = sessionId || `auto_${Date.now().toString(36)}`;
    let purge = { removed: 0, engagedKept: 0, profilesRemoved: 0, vaultsRemoved: 0 };
    let deepStopped = 0;
    try {
      // A new run replaces the previous dataset. Stop its deep job first so it
      // does not keep probing vendors the purge is about to delete.
      const deepProfileService = require('../services/deepProfileService');
      deepStopped = deepProfileService.stopAll('superseded by a fresh run');
    } catch (deepStopError) {
      addLog(`[Auto] Deep-cancel skipped: ${deepStopError.message}`);
    }
    try {
      purge = leadRetention.prepareFreshRun({ keepSessionId: finalSessionId, requestedCategory: plan.category });
    } catch (purgeError) {
      addLog(`[Auto] Purge skipped: ${purgeError.message}`);
    }

    res.json({
      message: 'Auto scrape started.',
      sessionId: finalSessionId,
      plan,
      purge,
      deepStopped
    });

    addLog(`\n[Auto Scrape] "${plan.category}" in "${plan.location}" · ${plan.familyLabel} · ${plan.engines.join(' + ')} · session ${finalSessionId}`);
    if (purge.removed) {
      addLog(`[Auto Scrape] Fresh-data purge removed ${purge.removed} old leads (${purge.engagedKept || 0} CRM-engaged kept).`);
    }

    addScrapeJob('scrapeOmniOrchestrator', [
      plan.category,
      plan.location,
      strategy,
      radius,
      gridDensity,
      plan.engines,
      finalSessionId,
      userId || 'anonymous'
    ]);
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
    res.json({ ok: true, ...status, queue: metrics });
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

router.post('/master-sweep', async (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.body.isMaster === true;
    if (!isMaster) {
      return res.status(403).json({
        error: 'Access denied: Master territorial sweeps (District & State) are restricted to the Master Command Center.'
      });
    }

    const { category, scope = 'district', name, userId = 'master', strategy = 'broad', speedPreset = 'precision_grid', engines } = req.body;
    if (!category || !name) {
      return res.status(400).json({ error: 'Both category and target location name are required for a Master Sweep.' });
    }

    // Resolve the requested scope through the India-aware policy layer:
    //   district → all mandals (villages are covered by each mandal query)
    //   mandal   → every village / ward
    //   state    → all districts + district HQ cities + major mandals
    //   city     → commercial localities
    const plan = buildScopeZones(scope, name);
    if (!plan) {
      return res.status(404).json({
        error: `Could not resolve "${name}" in the offline India gazetteer. Try a district, mandal, state or city name, or add the parent district.`
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

    const sessionId = `master_${Date.now().toString(36)}`;
    const finalLocation = `${sweepTitle} (${resolvedScope.toUpperCase()} SWEEP)`;

    globalAbortSignal.aborted = false;
    if (typeof dbAdapter.flushSync === 'function') dbAdapter.flushSync();

    res.json({
      ok: true,
      sessionId,
      message: `Master ${resolvedScope} sweep initiated for "${sweepTitle}". Swarming ${targetZones.length} sub-zones.`,
      scope: resolvedScope,
      targetName: sweepTitle,
      totalZones: targetZones.length,
      capped: Boolean(plan.stats?.capped),
      zoneStats: plan.stats,
      policy: plan.policy,
      warnings: plan.warnings || [],
      zones: targetZones.slice(0, 35).map(z => z.name),
      filters,
      isMasterSweep: true
    });

    addLog(`\n[Master Sweep] 🗺️ Swarming entire ${resolvedScope}: "${sweepTitle}" across ${targetZones.length} zones for category "${category}" (Master Folder: ${sessionId})`);
    addLog(`[Master Sweep] Coverage policy: ${plan.policy.label}. ${plan.policy.note}`);

    addScrapeJob('scrapeOmniOrchestrator', [
      category,
      finalLocation,
      strategy,
      5,
      'high',
      engines || ['auto'],
      sessionId,
      userId || 'master',
      filters,
      plan
    ]);

  } catch (error) {
    console.error('[Master Sweep Error]', error);
    addLog(`[Master Sweep Error] ${error.message}`);
    res.status(500).json({ error: error.message });
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

    // Background asynchronous enrichment without blocking the client
    (async () => {
      let enrichedCount = 0;
      for (const lead of targets) {
        if (globalAbortSignal.aborted) break;
        if (!lead.website || !lead.website.startsWith('http')) continue;

        try {
          const webData = await fastWebsiteExtract(lead.website, lead.name);
          if (webData && (webData.emails?.length > 0 || webData.instagram || webData.facebook || webData.phones?.length > 0 || webData.logo)) {
            const currentVendors = dbAdapter.getVendors();
            const targetIdx = currentVendors.findIndex(v => v.id === lead.id);
            if (targetIdx !== -1) {
              const item = currentVendors[targetIdx];
              item.emails = webData.emails || item.emails || [];
              item.email = webData.emails?.[0] || item.email || '';
              if (webData.instagram) item.instagram = webData.instagram;
              if (webData.facebook) item.facebook = webData.facebook;
              if (webData.logo) item.logo = webData.logo;
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
              dbAdapter.saveVendors(currentVendors);

              try {
                emitVendorEvent(item, 'updated');
              } catch (e) {}

              enrichedCount++;
            }
          }
        } catch (e) {
          // Continue to next lead
        }
      }
      addLog(`[Deep Enrich] ✅ Completed deep enrichment: +${enrichedCount} leads enriched with verified owner contacts.`);
    })();
  } catch (err) {
    addLog(`[Deep Enrich Error] ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// BATCH API
router.post('/batch', async (req, res) => {
  const { tasks } = req.body;
  if (!tasks || tasks.length === 0) return res.status(400).json({ error: 'No tasks' });

  for (const t of tasks) {
    const engines = t.engines || ['maps', 'justdial', 'weddingbazaar'];
    
    // Ola Maps Geocoding
    const resolvedData = await geocodeLocation(t.location);
    const accurateLocation = resolvedData && resolvedData.lat ? resolvedData.formattedLocation : t.location;
    const q = `${t.category} in ${accurateLocation}`;
    
    // Exclusive DeepSeek AI Scraper
    await addScrapeJob('scrapeDeepseekAI', [q, t.category, accurateLocation]);

    // Regular Engines
    if (engines.includes('maps')) {
      await addScrapeJob('scrapeGooglePlaces', [q, t.category, accurateLocation, 'legacy', null, null, null]);
    }
  }

  res.json({ success: true, message: `Successfully queued ${tasks.length} bulk tasks in background memory queue.` });
});

router.post('/upload', async (req, res) => {
  const { tasks } = req.body;
  if (!tasks || !Array.isArray(tasks)) return res.status(400).json({ error: 'Invalid tasks array' });

  for (const t of tasks) {
    const engines = t.engines || ['maps', 'deepseek-ai'];
    const aiKeywords = await getKeywordSynonyms(t.category);
    
    // Ola Maps Geocoding
    const resolvedData = await geocodeLocation(t.location);
    const accurateLocation = resolvedData && resolvedData.lat ? resolvedData.formattedLocation : t.location;
    const q = `${t.category} in ${accurateLocation}`;
    
    // DeepSeek AI and Google Maps Scrapers
    if (engines.includes('deepseek-ai')) {
      await addScrapeJob('scrapeDeepseekAI', [q, t.category, accurateLocation]);
    }
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
  addLog('🛑 [SYSTEM] MASTER STOP INITIATED. Aborting all active scrapes & clearing queue.');
  globalAbortSignal.aborted = true;

  // 1. Instantly kill all spawned Playwright / headless browser processes
  try {
    await closeAllBrowsers();
  } catch (e) {
    console.warn('[Master Stop] Error closing browsers:', e.message);
  }

  // 2. Clear job queues and reset progress
  await clearQueue();
  batchProgress.isActive = false;
  batchProgress.currentTask = 'Aborted';

  // 3. Flush in-memory vendors buffer to disk synchronously
  try {
    if (typeof dbAdapter.flushSync === 'function') {
      dbAdapter.flushSync();
    }
  } catch (e) {}

  // 4. Safely commit collected leads into individual session folder files
  const SESSIONS_DIR = require('../config/paths').SESSIONS_DIR;
  const allVendors = dbAdapter.getVendors() || [];
  let totalPreserved = 0;

  Object.keys(activeSessions).forEach(sessionId => {
    const session = activeSessions[sessionId];
    if (session) {
      session.status = 'aborted';
      const sessionLeads = allVendors.filter(v => v.sessionId === sessionId
        || v.lastSessionId === sessionId
        || (Array.isArray(v.sessionIds) && v.sessionIds.includes(sessionId)));
      totalPreserved += sessionLeads.length;

      const safeUserDir = path.join(SESSIONS_DIR, (session.userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_'));
      if (!fs.existsSync(safeUserDir)) {
        try { fs.mkdirSync(safeUserDir, { recursive: true }); } catch (e) {}
      }
      const safeSessionFile = path.join(safeUserDir, `${sessionId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);

      const sessionRecord = {
        id: sessionId,
        userId: session.userId || 'anonymous',
        category: session.category || 'General Business',
        location: session.location || 'All India',
        timestamp: new Date().toISOString(),
        status: 'aborted',
        leadCount: sessionLeads.length,
        phoneCount: sessionLeads.filter(l => l.phone).length,
        metadata: {
          ...(session.metadata || {}),
          status: 'aborted',
          abortedAt: new Date().toISOString(),
          preservedLeads: sessionLeads.length
        },
        leads: sessionLeads
      };

      try {
        // Same no-shrink rule as persistSessionVault: an abort must not wipe a
        // completed snapshot that already holds more leads.
        let shouldWrite = true;
        try {
          if (fs.existsSync(safeSessionFile)) {
            const previous = JSON.parse(fs.readFileSync(safeSessionFile, 'utf-8'));
            const previousCount = Number(previous?.leadCount) || (Array.isArray(previous?.leads) ? previous.leads.length : 0);
            if (previousCount > sessionRecord.leadCount && previousCount > 0) shouldWrite = false;
          }
        } catch (guardError) {
          shouldWrite = true;
        }
        if (shouldWrite) {
          fs.writeFileSync(safeSessionFile, JSON.stringify(sessionRecord, null, 2), 'utf-8');
        }
      } catch (err) {
        console.error('[Session Storage] Error saving aborted session file:', err.message);
      }
    }
  });

  addLog(`🛑 [SYSTEM] MASTER STOP EXECUTED. Safely committed ${totalPreserved} collected stores into session folder with 'Aborted' badge.`);

  // 5. Emit event so frontend HUD & cockpit update immediately
  try {
    emitProgressEvent({
      sessionActive: false,
      aborted: true,
      status: 'aborted',
      totalLeads: totalPreserved,
      currentTask: `Scrape safely terminated. Collected ${totalPreserved} stores saved to folder.`
    });
  } catch (e) {}

  res.json({
    success: true,
    status: 'aborted',
    preservedCount: totalPreserved,
    message: `Scrape safely terminated. Collected ${totalPreserved} stores saved to folder.`
  });
};

router.post('/jobs/stop-all', handleMasterStopAll);
router.post('/stop', handleMasterStopAll);

// Dedicated Session Stream
router.get('/stream/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ sessionId, status: 'listening' })}\n\n`);
  
  const keepAlive = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (e) { clearInterval(keepAlive); }
  }, 15000);

  req.on('close', () => clearInterval(keepAlive));
});

// Parallel Multi-Location Batch Scrape
router.post('/batch', async (req, res) => {
  const { queries = [], engines = ['google-serp-local'], sessionId = `batch_${Date.now()}` } = req.body;
  if (!queries || queries.length === 0) {
    return res.status(400).json({ error: 'Queries array is required' });
  }

  addLog(`[Batch Scraper] Dispatched parallel batch with ${queries.length} queries across concurrency pool`);
  
  res.json({
    success: true,
    sessionId,
    queriesCount: queries.length,
    status: 'dispatched'
  });

  // Execute in background via defaultPool
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

module.exports = {
  scrapeRouter: router,
  setDeps
};
