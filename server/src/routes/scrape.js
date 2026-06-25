const express = require('express');
const router = express.Router();

// Engines
const { scrapeGooglePlaces, setDeps: setPlacesDeps } = require('../scrapers/engine-google-places');
const { scrapeGoogleSerp, setDeps: setSerpDeps } = require('../scrapers/engine-google-serp');
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

const { initQueue, registerTask, addScrapeJob, clearQueue, getActiveJobs, getPersistentQueue } = require('../utils/queue');
const { geocodeLocation, getCache: getGeoCache } = require('../utils/olaMaps');

let emitVendorEvent = () => {};

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

// Safe execute wrapper
async function safeExecute(fn, name = 'Operation', logger = console.log) {
  try {
    return await fn();
  } catch (error) {
    logger(`[SafeExecute] ${name} failed: ${error.message}`);
    return null;
  }
}

let batchProgress = { total: 0, completed: 0, currentTask: '', isActive: false };
let globalAbortSignal = { aborted: false };
let addLog = console.log;
let emitGridEvent = () => {};
let emitDispatchEvent = () => {};
let emitProgressEvent = () => {};

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
  session.completedTargetsMap[key] = status;
  
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
    const targetDistrict = session.fullHierarchy.find(d => 
      (d.mandals || []).some(m => m.toLowerCase().trim() === key)
    );
    if (targetDistrict) {
      session.activeDistrict = targetDistrict.districtName;
    }
  }

  // Update completedDistricts count
  let completedDistrictsCount = 0;
  session.fullHierarchy.forEach(d => {
    const allMandalsDone = d.mandals.every(m => 
      session.completedTargetsMap[m.toLowerCase().trim()] === 'completed'
    );
    if (allMandalsDone) completedDistrictsCount++;
  });
  session.completedDistricts = completedDistrictsCount;
  
  // Calculate ETA
  if (completedCount > 0) {
    const elapsed = Date.now() - session.startTime;
    const avgTime = elapsed / completedCount;
    const remaining = Object.keys(session.completedTargetsMap).length - completedCount;
    session.eta = formatEta(remaining * avgTime);
  }

  try {
    emitProgressEvent({
      totalDistricts: session.totalDistricts,
      completedDistricts: session.completedDistricts,
      activeDistrict: session.activeDistrict,
      totalMandals: Object.keys(session.completedTargetsMap).length,
      completedMandals: completedCount,
      activeMandal: session.activeMandal,
      totalMandalsAcrossAll: Object.keys(session.completedTargetsMap).length,
      overallCompletedMandals: completedCount,
      eta: session.eta,
      sessionActive: true,
      fullHierarchy: session.fullHierarchy,
      targetsMap: session.completedTargetsMap
    });
  } catch (e) {}
}

// Register tasks
registerTask('scrapeGooglePlaces', async (q, cat, loc, sessionId, centerLat, centerLng, radiusKm, strategy, district, stateName, boundingBox, isClient, userId) => {
  updateSessionTargetState(sessionId, loc, 'running');
  const res = await safeExecute(() => scrapeGooglePlaces(q, cat, loc, sessionId, centerLat, centerLng, radiusKm, strategy, district, stateName, boundingBox, isClient, userId), 'Google Places Scrape', addLog);
  updateSessionTargetState(sessionId, loc, 'completed');
  return res;
});
registerTask('scrapeGoogleSerp', async (q, cat, loc, sessionId, isClient, userId) => {
  updateSessionTargetState(sessionId, loc, 'running');
  const res = await safeExecute(() => scrapeGoogleSerp(q, cat, loc, sessionId, isClient, userId), 'Google Serp Scrape', addLog);
  updateSessionTargetState(sessionId, loc, 'completed');
  return res;
});
registerTask('scrapeJustDial', async (cat, loc, dummy, sessionId) => {
  updateSessionTargetState(sessionId, loc, 'running');
  const res = await safeExecute(() => scrapeJustDial(cat, loc), 'JustDial Scrape', addLog);
  updateSessionTargetState(sessionId, loc, 'completed');
  return res;
});
registerTask('scrapeWeddingBazaar', async (cat, loc) => safeExecute(() => scrapeWeddingBazaar(cat, loc), 'WeddingBazaar Scrape', addLog));
registerTask('scrapeWeddingWire', async (cat, loc) => safeExecute(() => scrapeWeddingWire(cat, loc), 'WeddingWire Scrape', addLog));
registerTask('scrapeMandap', async (cat, loc) => safeExecute(() => scrapeMandap(cat, loc), 'Mandap Scrape', addLog));
registerTask('scrapeDuckDuckGoDork', async (domain, q, cat, loc) => safeExecute(() => scrapeDuckDuckGoDork(domain, q, cat, loc, globalAbortSignal), `DDG Dork ${domain}`, addLog));
registerTask('scrapeBraveDork', async (domain, q, cat, loc) => safeExecute(() => scrapeBraveDork(domain, q, cat, loc), `Brave Dork ${domain}`, addLog));
registerTask('scrapeDeepseekAI', async (q, cat, loc) => safeExecute(() => scrapeDeepseekAI(q, cat, loc), 'DeepSeek AI Scrape', addLog));
registerTask('scrapeCrawleeDeep', async (url, vendorName, cat, loc) => safeExecute(() => scrapeCrawleeDeep(url, vendorName, cat, loc), 'Crawlee Deep Scrape', addLog));
registerTask('scrapePuppeteerIndiaMart', async (cat, loc, dummy, sessionId) => {
  updateSessionTargetState(sessionId, loc, 'running');
  const res = await safeExecute(() => scrapePuppeteerIndiaMart(cat, loc), 'IndiaMart Stealth Scrape', addLog);
  updateSessionTargetState(sessionId, loc, 'completed');
  return res;
});
registerTask('scrapeScrapySpider', async (cat, loc) => safeExecute(() => scrapeScrapySpider(cat, loc), 'Scrapy Python Spider', addLog));
registerTask('scrapeOmniOrchestrator', async (category, baseLocation, strategy, radius, gridDensity, enabledEngines, sessionId, isClient, userId) =>
  safeExecute(() => runOmniSearchOrchestrator(category, baseLocation, strategy, radius, gridDensity, enabledEngines, sessionId, isClient, userId), 'Omni Search Orchestrator', addLog)
);

function setDeps(deps) {
  addLog = deps.logger;
  globalAbortSignal = deps.abortSignal;
  if (deps.emitGridEvent) emitGridEvent = deps.emitGridEvent;
  if (deps.emitDispatchEvent) emitDispatchEvent = deps.emitDispatchEvent;
  if (deps.emitProgressEvent) emitProgressEvent = deps.emitProgressEvent;
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

  if (deps.emitVendorEvent) emitVendorEvent = deps.emitVendorEvent;

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
  // Mask API key for security on the frontend
  const maskedKey = settings.nvidiaApiKey 
    ? settings.nvidiaApiKey.substring(0, 8) + '*'.repeat(20) + settings.nvidiaApiKey.slice(-4) 
    : '';
  res.json({ ...settings, nvidiaApiKey: maskedKey });
});

router.post('/settings', (req, res) => {
  const { nvidiaApiKey } = req.body;
  
  const updates = {};
  // Only update if it's not the masked string
  if (nvidiaApiKey && !nvidiaApiKey.includes('**')) {
    updates.nvidiaApiKey = nvidiaApiKey;
  }
  
  const newSettings = updateSettings(updates);
  res.json({ success: true, message: 'Settings saved successfully.' });
});

const activeCronJobs = {};

router.get('/jobs', (req, res) => {
  const jobs = Object.keys(activeCronJobs).map(cat => ({
    category: cat,
    interval: activeCronJobs[cat].interval,
    status: activeCronJobs[cat].status,
    location: activeCronJobs[cat].location
  }));
  res.json(jobs);
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
const path = require('path');

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
  const { query, category, location, radius, userId } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });
  
  addLog(`[Google Maps] Manual scrape triggered for: "${query}" (User ID: ${userId})`);
  const isClient = userId && !userId.startsWith('admin') ? true : false;
  addScrapeJob('scrapeGooglePlaces', [query, category, location, 'manual-session', null, null, radius || 10, 'broad', null, null, null, isClient, userId]);
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
const intelligentExtractor = require('../utils/intelligentExtractor');
const { parseNaturalLanguageQuery } = require('../utils/queryParser');
const geoAI = require('../utils/geoAI');

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

// Helper: Calculate distance in kilometers using the Haversine formula
const fs = require('fs');

// Permanent AI Geographical Memory
const LOCATIONS_MEMORY_FILE = path.join(__dirname, '../../db/locations_memory.json');
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

async function getSubLocations(locationName) {
  const memory = getLocationsMemory();
  const key = (locationName || "").toString().toLowerCase().trim();
  
  if (memory[key] && memory[key].length > 0) {
    return memory[key];
  }
  
  // Not in memory, fetch it!
  console.log(`[Geographic AI] Memory miss for "${locationName}". Learning sub-locations from AI...`);
  const results = await intelligentExtractor.generateLocalities(locationName);
  
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
  
  if (boundingbox && boundingbox.length === 4 && radiusKm >= 100) {
    minLat = boundingbox[0];
    maxLat = boundingbox[1];
    minLng = boundingbox[2];
    maxLng = boundingbox[3];
    useBoundary = true;
    addLog(`[Grid Generator] Advanced Mode: Constraining ${pointCount} points strictly within Bounding Box [${minLat}, ${maxLat}, ${minLng}, ${maxLng}]`);
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
async function queueMandalJob(subLoc, district, mandal, stateName, category, activeEngines, sessionId, geocodeCache, isVillage, isClient, userId) {
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

  // Build search URL - with coords if available (better results), text-only if not
  let searchUrl, meta;
  if (geo && geo.lat) {
    const searchString = `${category} in ${subLoc}, ${district}`;
    searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}/@${geo.lat},${geo.lng},14z`;
    meta = { lat: geo.lat, lng: geo.lng, locationName: subLoc, district: district, state: stateName, isVillage };
  } else {
    // Text-only search — scraping still works, just no boundary filter
    const searchString = `${category} in ${subLoc}, ${district}`;
    searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}`;
    meta = { lat: null, lng: null, locationName: subLoc, district: district, state: stateName, isVillage };
  }

  // Queue jobs immediately without any await delay
  await addScrapeJob('scrapeGooglePlaces', [searchUrl, category, subLoc, sessionId, geo?.lat || null, geo?.lng || null, activeRadius, 'mandal', district, stateName, null, isClient, userId], 10, meta);
  await addScrapeJob('scrapeGoogleSerp', [`${category} in ${subLoc}`, category, subLoc, sessionId, isClient, userId], 10, meta);
}

async function runOmniSearchOrchestrator(category, baseLocation, strategy, radius, gridDensity, enabledEngines, sessionId, isClient, userId) {
  const activeEngines = enabledEngines || ['deepseek-ai', 'maps'];
  addLog(`[Orchestrator] Starting Place-by-Place Omni Search session: ${sessionId}`);
  addLog(`[Orchestrator] Query: "${category}" in "${baseLocation}". Strategy: ${strategy}`);
  
  // Clear any pending old ghost jobs from the queue to prevent blocking the new district dispatch
  await clearQueue();
  addLog(`[Orchestrator] Flushed persistent job queue to unblock sequence.`);
  
  try {
    const isMandal = strategy === 'mandal';
    const isFull = strategy === 'full';

    if (isMandal || isFull) {
      try {
        emitProgressEvent({
          totalDistricts: 0,
          completedDistricts: 0,
          activeDistrict: 'Resolving Hierarchy...',
          totalMandals: 0,
          completedMandals: 0,
          activeMandal: 'Loading from local database...',
          totalMandalsAcrossAll: 0,
          overallCompletedMandals: 0,
          eta: 'Resolving...',
          sessionActive: true
        });
      } catch (e) {}

      addLog(`[Orchestrator] Resolving geographic hierarchy for: "${baseLocation}"...`);
      const hierarchyResult = await intelligentExtractor.resolveHierarchy(baseLocation);
      addLog(`[Orchestrator] Hierarchy resolved instantly: level=${hierarchyResult.level}, state=${hierarchyResult.stateName}, districts=${hierarchyResult.hierarchy.length}`);

      const districts = hierarchyResult.hierarchy;
      const geocodeCache = getGeoCache();
      let overallCompletedMandals = 0;
      let totalMandalsAcrossAll = districts.reduce((acc, d) => acc + (d.mandals || []).length, 0);
      const startTime = Date.now();

      activeSessions[sessionId] = {
        totalDistricts: districts.length,
        completedDistricts: 0,
        activeDistrict: 'Starting...',
        totalMandals: 0,
        completedMandals: 0,
        activeMandal: 'Starting...',
        totalMandalsAcrossAll,
        overallCompletedMandals: 0,
        eta: 'Calculating...',
        sessionActive: true,
        fullHierarchy: districts,
        completedTargetsMap: {},
        startTime
      };

      // ──────────────────────────────────────────────
      // DISTRICT-BY-DISTRICT → MANDAL-BY-MANDAL LOOP
      // ──────────────────────────────────────────────
      for (let di = 0; di < districts.length; di++) {
        if (globalAbortSignal.aborted) break;

        const distObj = districts[di];
        const district = distObj.districtName;
        const mandals = distObj.mandals || [district];

        addLog(`[Orchestrator] ── District ${di + 1}/${districts.length}: "${district}" (${mandals.length} mandals) ──`);

        try {
          emitProgressEvent({
            totalDistricts: districts.length,
            completedDistricts: di,
            activeDistrict: district,
            totalMandals: mandals.length,
            completedMandals: 0,
            activeMandal: 'Queuing mandals...',
            totalMandalsAcrossAll,
            overallCompletedMandals,
            eta: formatEta((totalMandalsAcrossAll - overallCompletedMandals) * 30000),
            sessionActive: true,
            fullHierarchy: districts
          });
        } catch (e) {}

        // Queue all mandals of this district immediately
        for (let mi = 0; mi < mandals.length; mi++) {
          if (globalAbortSignal.aborted) break;

          const mandal = mandals[mi];
          const mandalKey = mandal.toLowerCase().trim();

          if (strategy === 'full') {
            // Full strategy: expand into sub-localities first
            const subLocs = await getSubLocations(mandal, hierarchyResult.stateName);
            for (const subLoc of subLocs) {
              if (globalAbortSignal.aborted) break;
              await queueMandalJob(subLoc, district, mandal, hierarchyResult.stateName, category, activeEngines, sessionId, geocodeCache, true, isClient, userId);
            }
          } else {
            // Mandal strategy: queue directly
            await queueMandalJob(mandal, district, mandal, hierarchyResult.stateName, category, activeEngines, sessionId, geocodeCache, false, isClient, userId);
          }

          activeSessions[sessionId].completedTargetsMap[mandalKey] = 'queued';
        }

        addLog(`[Orchestrator] Queued all ${mandals.length} mandals for "${district}". Waiting for workers...`);

        // Wait for all jobs of THIS DISTRICT to complete before moving to next district
        let waitTicks = 0;
        while (true) {
          if (globalAbortSignal.aborted) break;

          const currentQueue = getPersistentQueue();
          const running = getActiveJobs();

          const pendingDistrict = currentQueue.filter(j =>
            j.meta && j.meta.district === district && j.args && j.args[3] === sessionId
          );
          const runningDistrict = running.filter(j =>
            j.meta && j.meta.district === district && j.args && j.args[3] === sessionId
          );

          if (pendingDistrict.length === 0 && runningDistrict.length === 0) {
            break;
          }

          waitTicks++;
          if (waitTicks % 10 === 0) {
            addLog(`[Orchestrator] "${district}": ${pendingDistrict.length} pending, ${runningDistrict.length} running...`);
          }
          await new Promise(r => setTimeout(r, 1000));
        }

        overallCompletedMandals += mandals.length;

        try {
          emitProgressEvent({
            totalDistricts: districts.length,
            completedDistricts: di + 1,
            activeDistrict: district,
            totalMandals: mandals.length,
            completedMandals: mandals.length,
            activeMandal: 'Complete',
            totalMandalsAcrossAll,
            overallCompletedMandals,
            eta: formatEta((totalMandalsAcrossAll - overallCompletedMandals) * 30000),
            sessionActive: true,
            fullHierarchy: districts
          });
        } catch (e) {}

        addLog(`[Orchestrator] ✓ District "${district}" complete (${di + 1}/${districts.length})`);
      }

      addLog(`[Orchestrator] >>> ALL DISTRICTS COMPLETE for session ${sessionId} <<<`);

      try {
        emitProgressEvent({
          totalDistricts: districts.length,
          completedDistricts: districts.length,
          activeDistrict: 'Complete',
          totalMandals: 0,
          completedMandals: 0,
          activeMandal: 'Complete',
          totalMandalsAcrossAll,
          overallCompletedMandals: totalMandalsAcrossAll,
          eta: '0s',
          sessionActive: false,
          fullHierarchy: districts
        });
      } catch (e) {}
    } else {
      // Broad strategy: single region with sunflower coordinates grid
      addLog(`[Orchestrator] Processing search for target: "${baseLocation}"...`);
      const geo = await geocodeLocation(baseLocation);
      if (!geo || !geo.lat) {
        throw new Error(`Could not resolve coordinates for place "${baseLocation}"`);
      }

      const activeRadius = (radius && parseInt(radius) > 0) ? parseInt(radius) : 30;
      const density = gridDensity ? parseInt(gridDensity) : 50; 
      addLog(`[Orchestrator] Generating ${activeRadius}km radius grid with ${density} points for "${baseLocation}".`);
      let gridCoords = generateGridCoordinates(geo.lat, geo.lng, activeRadius, density, geo.boundingbox);
      gridCoords = gridCoords.map(c => ({ ...c, centerLoc: baseLocation, activeRadius, isExactPoint: false }));

      // Emit grid coordinates to the map
      try { emitGridEvent(gridCoords); } catch (e) {}
      try { emitDispatchEvent([baseLocation]); } catch (e) {}

      const totalPoints = gridCoords.length;
      let completedPoints = 0;
      const startTime = Date.now();

      // Emit initial progress
      try {
        emitProgressEvent({
          totalDistricts: 1,
          completedDistricts: 0,
          activeDistrict: baseLocation,
          totalMandals: totalPoints,
          completedMandals: 0,
          activeMandal: 'Grid Point 1',
          totalMandalsAcrossAll: totalPoints,
          overallCompletedMandals: 0,
          eta: 'Calculating...',
          sessionActive: true
        });
      } catch (e) {}

      // Queue scrapes for this grid
      for (const coord of gridCoords) {
        if (globalAbortSignal.aborted) break;

        // Calculate ETA
        let etaStr = 'Calculating...';
        if (completedPoints > 0) {
          const elapsed = Date.now() - startTime;
          const avgTime = elapsed / completedPoints;
          const etaMs = (totalPoints - completedPoints) * avgTime;
          etaStr = formatEta(etaMs);
        } else {
          etaStr = formatEta(totalPoints * 25000);
        }

        try {
          emitProgressEvent({
            totalDistricts: 1,
            completedDistricts: 0,
            activeDistrict: baseLocation,
            totalMandals: totalPoints,
            completedMandals: completedPoints,
            activeMandal: `Grid Point ${completedPoints + 1}`,
            totalMandalsAcrossAll: totalPoints,
            overallCompletedMandals: completedPoints,
            eta: etaStr,
            sessionActive: true
          });
        } catch (e) {}

        const meta = { lat: coord.lat, lng: coord.lng, locationName: baseLocation };
        const searchString = `${category} near ${coord.lat},${coord.lng}`;
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}/@${coord.lat},${coord.lng},14z`;

        if (activeEngines.includes('maps') || activeEngines.includes('google')) {
          await addScrapeJob('scrapeGooglePlaces', [searchUrl, category, baseLocation, sessionId, coord.lat, coord.lng, coord.activeRadius, strategy, null, null, coord.boundingbox, isClient, userId], 10, meta);
        }

        if (activeEngines.includes('google-web')) {
          const serpSearchString = `${category} in ${baseLocation}`;
          await addScrapeJob('scrapeGoogleSerp', [serpSearchString, category, baseLocation, sessionId, isClient, userId]);
        }

        completedPoints++;
      }

      // Wait for all queued and running tasks to finish
      addLog(`[Orchestrator] Waiting for all worker jobs to complete for target "${baseLocation}"...`);
      let waitCounter = 0;
      while (true) {
        if (globalAbortSignal.aborted) break;

        const currentQueue = getPersistentQueue();
        const pendingForSession = currentQueue.filter(j => j.args && j.args[3] === sessionId);
        const runningForSession = getActiveJobs().filter(j => j.args && j.args[3] === sessionId);

        if (pendingForSession.length === 0 && runningForSession.length === 0) {
          break; 
        }

        waitCounter++;
        if (waitCounter % 10 === 0) {
          addLog(`[Orchestrator] Still waiting... ${pendingForSession.length} pending, ${runningForSession.length} running for target "${baseLocation}".`);
        }

        await new Promise(r => setTimeout(r, 1000));
      }
    }

    addLog(`[Orchestrator] Place-by-Place Omni Search Session ${sessionId} completed successfully.`);
    // Emit complete progress event
    try {
      emitProgressEvent({
        totalDistricts: 1,
        completedDistricts: 1,
        activeDistrict: baseLocation,
        totalMandals: 1,
        completedMandals: 1,
        activeMandal: 'Complete',
        eta: '0s',
        sessionActive: false
      });
    } catch (e) {}

    globalAbortSignal.aborted = true;
    await clearQueue();
    addLog(`[Orchestrator] All background workers aborted and queue cleared after successful completion.`);
  } catch (err) {
    addLog(`[Orchestrator Error] ${err.message}`);
    // Emit error progress event
    try {
      emitProgressEvent({
        sessionActive: false,
        error: err.message
      });
    } catch (e) {}
    globalAbortSignal.aborted = true;
    await clearQueue();
    addLog(`[Orchestrator] All background workers aborted and queue cleared after failure.`);
  }
}

router.post('/stop', async (req, res) => {
  addLog('[System] User triggered Stop. Aborting all active scraping jobs...');
  globalAbortSignal.aborted = true;
  await clearQueue();
  try {
    emitProgressEvent({
      sessionActive: false
    });
  } catch (e) {}
  res.json({ message: 'All active scrapers aborted and queue cleared.' });
});

// OMNI SEARCH API
router.post('/omni', async (req, res) => {
  const { query, category, location, radius, gridDensity, enabledEngines, sessionId, userId } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const { logSearchActivity } = require('./activity');
  let userEmail = 'Admin';
  
  const matchedCategory = category || query; 
  let baseLocation = location || ""; 

  // Handle Startup/Public User Credit Deduction & Constraints
  if (userId) {
    const dbAdapter = require('../config/dbAdapter');
    const users = dbAdapter.getPublicUsers();
    let userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      // Auto-create an anonymous user for the 1-month frictionless trial
      const newUser = {
        id: userId,
        email: `${userId}@anonymous.com`,
        name: `User_${userId}`,
        credits: 100,
        subscriptionTier: 'Free',
        subscriptionExpiry: null,
        unlockedLeads: [],
        deepExtractorEnabled: false,
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      dbAdapter.savePublicUsers(users);
      userIndex = users.length - 1;
    }
    
    const user = users[userIndex];
    userEmail = user.email;

    // RAM/Deployment Constraint: Block State-wide searches for non-admin
    const blockedStates = ['telangana', 'andhra pradesh', 'karnataka', 'maharashtra', 'tamil nadu'];
    const isStateSearch = blockedStates.some(s => baseLocation.toLowerCase().includes(s));
    
    if (isStateSearch || !baseLocation.trim()) {
      return res.status(403).json({ 
        error: 'For RAM and deployment stability, marketplace/client searches must specify a single city or district (e.g. "Guntur"). State-wide searches are reserved for Admin.' 
      });
    }

    if (user.credits < 5) {
      return res.status(403).json({ error: 'Insufficient credits for an Omni Scrape. Requires at least 5 credits.' });
    }
    
    // Deduct 5 credits for a search
    user.credits -= 5;
    users[userIndex] = user;
    dbAdapter.savePublicUsers(users);
    addLog(`[Billing] Deducted 5 credits from user ${user.email} for Omni Scrape. Remaining: ${user.credits}`);
  }
  
  // Auto-correct spelling typos in location using fuzzy geo-index (bypassed for client search to avoid unintended changes)
  if (!userId) {
    const correctedLoc = intelligentExtractor.correctLocationTypo(baseLocation);
    if (correctedLoc && correctedLoc.toLowerCase() !== baseLocation.toLowerCase()) {
      addLog(`[Geo Typo Auto-Correct] Corrected search target location from "${baseLocation}" to "${correctedLoc}"`);
      baseLocation = correctedLoc;
    }
  }

  // Default to 'broad' (localized city search) for clients to keep it ultra-fast and credit-efficient
  const strategy = req.body.strategy || (userId ? 'broad' : 'mandal');

  // Reset Abort Signal for fresh run
  globalAbortSignal.aborted = false;

  const finalSessionId = sessionId || 'session_' + Date.now();

  // Log activity
  logSearchActivity({
    userId: userId || 'admin',
    userEmail,
    query: matchedCategory,
    location: baseLocation,
    creditsDeducted: userId ? 5 : 0,
    sessionId: finalSessionId
  });

  if (global.registerSessionUser && userId) {
    global.registerSessionUser(finalSessionId, userId);
  }

  res.json({ message: 'Omni Search Started in Background via BullMQ.', sessionId: finalSessionId });

  addLog(`\n[Omni Search] Triggered for string: "${query}" with radius: ${radius || 0}km. Session ID: ${finalSessionId}`, userId);

  // Instant Cached Leads Stream (harvest existing database leads instantly to impress client)
  if (userId) {
    const dbAdapter = require('../config/dbAdapter');
    const existing = dbAdapter.getVendors().filter(v => 
      v.category?.toLowerCase() === matchedCategory.toLowerCase() &&
      v.city?.toLowerCase() === baseLocation.toLowerCase()
    );
    
    if (existing.length > 0) {
      const instantLeads = existing.slice(0, 50);
      addLog(`[Omni Search] Found ${existing.length} matching leads in historical database. Instant-streaming ${instantLeads.length} leads now.`, userId);
      
      setTimeout(() => {
        instantLeads.forEach((lead, idx) => {
          const clonedLead = {
            ...lead,
            id: 'instant_' + Date.now().toString() + '_' + idx + '_' + Math.random().toString(36).substring(7),
            userId: userId,
            scrapedAt: new Date().toISOString()
          };
          dbAdapter.saveVendor(userId, clonedLead);
          try {
            emitVendorEvent(clonedLead, 'inserted');
          } catch(e) {}
        });
      }, 500); // 500ms organic feeling delay
    }
  }
  
  const isClient = userId && !userId.startsWith('admin') ? true : false;
  // Add the orchestrator task to the background queue so it starts running
  addScrapeJob('scrapeOmniOrchestrator', [matchedCategory, baseLocation, strategy, radius, gridDensity, enabledEngines, finalSessionId, isClient, userId]);
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

router.post('/jobs/stop-all', async (req, res) => {
  addLog('🔴 [SYSTEM] MASTER STOP INITIATED. Aborting all scrapes & clearing queue.');
  globalAbortSignal.aborted = true;
  await clearQueue();
  batchProgress.isActive = false;
  batchProgress.currentTask = 'Aborted';

  res.json({ success: true, message: 'All scrapes aborted and queue cleared.' });
});

module.exports = {
  scrapeRouter: router,
  setDeps
};
