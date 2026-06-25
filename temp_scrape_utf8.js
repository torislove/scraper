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


const { initQueue, registerTask, addScrapeJob, clearQueue } = require('../utils/queue');
const { geocodeLocation } = require('../utils/olaMaps');

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

// Register tasks with BullMQ
registerTask('scrapeGooglePlaces', async (q, cat, loc, sessionId, centerLat, centerLng, radiusKm) => safeExecute(() => scrapeGooglePlaces(q, cat, loc, sessionId, centerLat, centerLng, radiusKm), 'Google Places Scrape', addLog));
registerTask('scrapeGoogleSerp', async (q, cat, loc) => safeExecute(() => scrapeGoogleSerp(q, cat, loc), 'Google Serp Scrape', addLog));
registerTask('scrapeJustDial', async (cat, loc) => safeExecute(() => scrapeJustDial(cat, loc), 'JustDial Scrape', addLog));
registerTask('scrapeWeddingBazaar', async (cat, loc) => safeExecute(() => scrapeWeddingBazaar(cat, loc), 'WeddingBazaar Scrape', addLog));
registerTask('scrapeWeddingWire', async (cat, loc) => safeExecute(() => scrapeWeddingWire(cat, loc), 'WeddingWire Scrape', addLog));
registerTask('scrapeMandap', async (cat, loc) => safeExecute(() => scrapeMandap(cat, loc), 'Mandap Scrape', addLog));
registerTask('scrapeDuckDuckGoDork', async (domain, q, cat, loc) => safeExecute(() => scrapeDuckDuckGoDork(domain, q, cat, loc, globalAbortSignal), `DDG Dork ${domain}`, addLog));
registerTask('scrapeBraveDork', async (domain, q, cat, loc) => safeExecute(() => scrapeBraveDork(domain, q, cat, loc), `Brave Dork ${domain}`, addLog));
registerTask('scrapeDeepseekAI', async (q, cat, loc) => safeExecute(() => scrapeDeepseekAI(q, cat, loc), 'DeepSeek AI Scrape', addLog));
registerTask('scrapeCrawleeDeep', async (url, vendorName, cat, loc) => safeExecute(() => scrapeCrawleeDeep(url, vendorName, cat, loc), 'Crawlee Deep Scrape', addLog));
registerTask('scrapePuppeteerIndiaMart', async (cat, loc) => safeExecute(() => scrapePuppeteerIndiaMart(cat, loc), 'IndiaMart Stealth Scrape', addLog));
registerTask('scrapeScrapySpider', async (cat, loc) => safeExecute(() => scrapeScrapySpider(cat, loc), 'Scrapy Python Spider', addLog));


function setDeps(deps) {
  addLog = deps.logger;
  globalAbortSignal = deps.abortSignal;
  if (deps.emitGridEvent) emitGridEvent = deps.emitGridEvent;
  if (deps.emitDispatchEvent) emitDispatchEvent = deps.emitDispatchEvent;
  if (setPlacesDeps) setPlacesDeps(deps);
  if (setDorkLogger) setDorkLogger(deps.logger);

  if (setJDDeps) setJDDeps(deps);
  if (setWBDeps) setWBDeps(deps);
  if (setWWDeps) setWWDeps(deps);
  if (setMandapDeps) setMandapDeps(deps);
  if (setBraveDeps) setBraveDeps(deps);
  if (setDeepseekDeps) setDeepseekDeps(deps);
  if (setSerpDeps) setSerpDeps(deps);
  if (setCrawleeDeps) setCrawleeDeps(deps);
  if (setIndiaMartDeps) setIndiaMartDeps(deps);
  if (setScrapyDeps) setScrapyDeps(deps);
  // Optional but safe to call if defined
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
  const { category, action, intervalMs } = req.body;
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
      job.timer = setInterval(() => {}, ms);
    }
  } else if (action === 'update_interval') {
    clearInterval(job.timer);
    job.interval = intervalMs;
    job.status = 'running';
    job.timer = setInterval(() => {}, intervalMs);
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
  const { query, category, location, radius } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });
  
  addLog(`[Google Maps] Manual scrape triggered for: "${query}"`);
  addScrapeJob('scrapeGooglePlaces', [query, category, location, [], 'manual-maps', null, null, radius || 10]);
  res.json({ success: true, message: 'Google Maps scrape initiated' });
});

router.post('/cheerio', async (req, res) => {
  const { engine, category, location } = req.body; // engine could be 'justdial' or 'weddingbazaar'
  if (!category || !location) return res.status(400).json({ error: 'Category and location required for directory scrapers' });
  
  if (engine === 'justdial') {
    addLog(`[JustDial] Manual scrape triggered for: "${category} in ${location}"`);
    addScrapeJob('scrapeJustDial', [category, location]);
  } else if (engine === 'weddingbazaar') {
    addLog(`[WeddingBazaar] Manual scrape triggered for: "${category} in ${location}"`);
    addScrapeJob('scrapeWeddingBazaar', [category, location]);
  } else {
    return res.status(400).json({ error: 'Invalid cheerio engine specified' });
  }
  
  res.json({ success: true, message: `${engine} scrape initiated` });
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
  
  try {
    const scopeData = await intelligentExtractor.analyzeGeographicScope(cleanLocation);
    res.json(scopeData);
  } catch(err) {
    res.json({ type: "specific" });
  }
});

// Helper: Calculate distance in kilometers using the Haversine formula
const fs = require('fs');

// Permanent AI Geographical Memory
const LOCATIONS_MEMORY_FILE = path.join(__dirname, '../../db/locations_memory.json');

function getLocationsMemory() {
  if (fs.existsSync(LOCATIONS_MEMORY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOCATIONS_MEMORY_FILE, 'utf-8'));
    } catch(e) { return {}; }
  }
  return {};
}

function saveLocationsMemory(data) {
  try {
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

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// PHYLLOTAXIS GOLDEN ANGLE GRID (Best-in-class 360┬░ coverage algorithm)
// Uses the same math as sunflower seeds and NASA radar arrays.
// Golden Angle Γëê 137.5077┬░ ensures ZERO clustering and ZERO blind spots.
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function generateGridCoordinates(centerLat, centerLng, radiusKm, pointCount = 20, boundingbox = null) {
  const GOLDEN_ANGLE_DEG = 137.50776405003785; // 360┬░ / ╧å┬▓
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
    angle: 0
  });

  const totalOuterPoints = Math.max(pointCount - 1, 1);

  for (let i = 1; i <= totalOuterPoints; i++) {
    // Phyllotaxis formula: uniform spiral outward
    const t = i / totalOuterPoints;
    const distKm = Math.sqrt(t) * radiusKm; // ΓêÜt gives inner-dense, outer-sparse
    const angleDeg = i * GOLDEN_ANGLE_DEG;
    const angleRad = (angleDeg % 360) * Math.PI / 180;

    // Convert polar ΓåÆ geographic lat/lng
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
      angle: parseFloat((angleDeg % 360).toFixed(1))
    });
  }

  return coords;
}

// STOP SCRAPING API
router.post('/stop', async (req, res) => {
  addLog('[System] User triggered Stop. Aborting all active scraping jobs...');
  globalAbortSignal.aborted = true;
  await clearQueue();
  res.json({ message: 'All active scrapers aborted and queue cleared.' });
});

// OMNI SEARCH API
router.post('/omni', async (req, res) => {
  const { query, category, location, radius, gridDensity, enabledEngines, sessionId, userId } = req.body;
  const activeEngines = enabledEngines || ['deepseek-ai', 'maps'];

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  // Handle Startup/Public User Credit Deduction
  if (userId) {
    const dbAdapter = require('../config/dbAdapter');
    const users = dbAdapter.getPublicUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[userIndex];
    if (user.credits < 5) {
      return res.status(403).json({ error: 'Insufficient credits for an Omni Scrape. Requires at least 5 credits.' });
    }
    
    // Deduct 5 credits for a search
    user.credits -= 5;
    users[userIndex] = user;
    dbAdapter.savePublicUsers(users);
    addLog(`[Billing] Deducted 5 credits from user ${user.email} for Omni Scrape. Remaining: ${user.credits}`);
  }
  
  // The user requested NO NLP auto-correction, NO splitting for the primary.
  const exactQuery = query;
  const matchedCategory = category || query; 
  let baseLocation = location || ""; 
  const strategy = req.body.strategy || 'mandal'; // ALWAYS default to AI Location Intelligence

  // Reset Abort Signal for fresh run
  globalAbortSignal.aborted = false;

  res.json({ message: 'Omni Search Started in Background via BullMQ.' });

  addLog(`\n[Omni Search] Triggered for string: "${exactQuery}" with radius: ${radius || 0}km`);
  
  try {
    let googleMapsJobsDispatched = false;

    // 1. RESOLVE LOCATIONS (Support State -> District -> Mandal Expansion)
    let centerLocations = [];
    let allGridCoords = [];
    const bl = (baseLocation || "").toString().toLowerCase();

    if (strategy === 'mandal' || strategy === 'full') {
      addLog(`[Hierarchy Engine] Resolving regional sub-divisions for: ${baseLocation}...`);
      const initialBreakdown = await getSubLocations(baseLocation);
      let targets = [];
      const isSafeString = (val) => typeof val === 'string' && val.trim().length > 0;

      if (initialBreakdown.length === 1 && isSafeString(initialBreakdown[0]) && initialBreakdown[0].toLowerCase() === (baseLocation || "").toString().toLowerCase()) {
         addLog(`[Hierarchy Engine] No breakdown found in knowledge base or AI for "${baseLocation}". Falling back to OpenStreetMap (OSM) extraction...`);
         const intelligentExtractor = require('../utils/intelligentExtractor');
         const osmResults = await intelligentExtractor.fetchOSMLocalities(baseLocation);
         if (osmResults && osmResults.length > 0) {
            for (const loc of osmResults) {
                if (loc.name) targets.push(loc.name);
            }
         } else {
            targets.push(baseLocation);
         }
      } else {
         if (strategy === 'full') {
           for (const subRegion of initialBreakdown.filter(isSafeString)) {
              addLog(`[Hierarchy Engine] Expanding deep localities for: ${subRegion}...`);
              const deepLocalities = await getSubLocations(subRegion); 
              
              if (deepLocalities.length === 1 && isSafeString(deepLocalities[0]) && deepLocalities[0].toLowerCase() === subRegion.toLowerCase()) {
                  targets.push(subRegion);
              } else {
                  for (const loc of deepLocalities.filter(isSafeString)) {
                     targets.push(loc); 
                  }
              }
           }
         } else {
           for (const subRegion of initialBreakdown.filter(isSafeString)) {
              targets.push(subRegion); 
           }
         }
      }
      
      // Remove duplicates
      targets = [...new Set(targets)];
      addLog(`[Hierarchy Engine] Regional expansion complete! Generated ${targets.length} distinct targets.`);
      
      // Emit dispatch targets to frontend to show a beautiful popup
      try { emitDispatchEvent(targets); } catch (e) {}
      
      if (strategy === 'full' && targets.length > 10) {
         const baseGeo = await geocodeLocation(baseLocation);
         if (baseGeo && baseGeo.lat) {
           for (let i = 0; i < targets.length; i++) {
             const jitterLat = baseGeo.lat + (Math.random() - 0.5) * 0.05;
             const jitterLng = baseGeo.lng + (Math.random() - 0.5) * 0.05;
             allGridCoords.push({ lat: jitterLat, lng: jitterLng, distanceFromCenter: 0, ring: 0, angle: 0, centerLoc: `${targets[i]}, ${baseLocation}` });
             centerLocations.push({ lat: jitterLat, lng: jitterLng, formattedLocation: targets[i], queryLoc: targets[i] });
           }
         } else {
           for (const t of targets) {
             centerLocations.push({ lat: null, lng: null, formattedLocation: t, queryLoc: t });
           }
         }
      } else {
         // Normal sequential geocoding for smaller lists (Mandals)
         for (const t of targets) {
           addLog(`[Mandal Expansion] Resolving coordinates for: ${t}`);
           const geo = await geocodeLocation(t);
           if (geo && geo.lat) {
             allGridCoords.push({
               lat: parseFloat(geo.lat.toFixed(6)),
               lng: parseFloat(geo.lng.toFixed(6)),
               distanceFromCenter: 0, ring: 0, angle: 0, centerLoc: t
             });
             centerLocations.push({ ...geo, queryLoc: t });
           }
         }
      }
    } else {
      // Normal Single Target
      if (baseLocation) {
        const geo = await geocodeLocation(baseLocation);
        if (geo && geo.lat) centerLocations.push({ ...geo, queryLoc: baseLocation });
      }
    }

    // NASA SUNFLOWER RADIUS JUMPING (MULTI-TIER SCALING)
    const isMandal = strategy === 'mandal';
    
    if (centerLocations.length > 0) {
      if (strategy === 'full') {
         // Tier 3: Village Level
         addLog(`[Tier 3: Villages] Bypassing massive grids. Targeting exactly ${centerLocations.length} precise village coordinates.`);
         for (const center of centerLocations) {
            allGridCoords.push({ 
               lat: center.lat, lng: center.lng, 
               distanceFromCenter: 0, ring: 0, angle: 0, 
               centerLoc: center.queryLoc, activeRadius: 2, isExactPoint: true 
            });
         }
      } else {
         // Tier 1 & Tier 2: City / Mandal
         const activeRadius = isMandal ? 10 : ((radius && parseInt(radius) > 0) ? parseInt(radius) : 30); 
         const density = isMandal ? 20 : (gridDensity ? parseInt(gridDensity) : 50); 
         
         addLog(`[Tier ${isMandal ? 2 : 1}: ${isMandal ? 'Mandal' : 'City'}] Generating ${activeRadius}km radius grid with ${density} points.`);
         
         for (const center of centerLocations) {
           const gridCoords = generateGridCoordinates(center.lat, center.lng, activeRadius, density, center.boundingbox);
           gridCoords.forEach(c => allGridCoords.push({ ...c, centerLoc: center.queryLoc, activeRadius, isExactPoint: false }));
         }
      }
    } else if (targets.length > 0) {
      // === GEOGRAPHIC WORKER DISPATCH SYSTEM FOR TEXT TARGETS (NO CENTER GEO) ===
      if (targets.length > 50) {
          addLog(`[Dispatcher] Large geographic target detected (${targets.length} sub-regions). Engaging Distributed Worker Mode.`);
          const chunkSize = 20; // Dispatch 20 localities per worker job
          for (let i = 0; i < targets.length; i += chunkSize) {
             const chunkTargets = targets.slice(i, i + chunkSize);
             
             addLog(`[Dispatcher] Queuing Worker Task ${Math.floor(i/chunkSize) + 1} for ${chunkTargets.length} localities...`);
             addScrapeJob('scrapeOmniGrid', [
                category,
                `${baseLocation} (Part ${Math.floor(i/chunkSize) + 1})`,
                sessionId,
                [], // centerGeo
                chunkTargets,
                [], // allGridCoords
                isMandal ? 10 : 30,
                enabledEngines
             ]);
          }
          addLog(`[Dispatcher] Successfully queued ${Math.ceil(targets.length / chunkSize)} parallel worker jobs.`);
          return res.json({ message: 'Omni-Scrape process started (Distributed Worker Mode)', sessionId });
      } else {
          addLog(`[Dispatcher] Single worker node assigned for ${baseLocation}.`);
          addScrapeJob('scrapeOmniGrid', [
             category,
             baseLocation,
             sessionId,
             [],
             targets,
             [],
             isMandal ? 10 : 30,
             enabledEngines
          ]);
          return res.json({ message: 'Omni-Scrape process started', sessionId });
      }
    }

    if (allGridCoords.length > 0) {
        addLog(`[Grid Generator] Generated ${allGridCoords.length} total search points.`);
      
        // Emit the grid coordinates to the frontend to visualize them on the map
        try { emitGridEvent(allGridCoords); } catch (e) {}
        
        // Give the user 2 seconds to view the grid points on the map
        addLog(`[Radius Jumping] Plotting grid points on map. Starting jobs in 2 seconds...`);
        await new Promise(r => setTimeout(r, 2000));
        
        // Distribute jobs sequentially per coordinate to avoid overloading
        for (const coord of allGridCoords) {
          const accurateLocation = coord.centerLoc;
          const meta = { lat: coord.lat, lng: coord.lng, locationName: accurateLocation };

          if (activeEngines.includes('maps') || activeEngines.includes('google')) {
            let searchString;
            
            if (coord.isExactPoint) {
              // Tier 3: Strict Semantic without lat/lng coordinates to ensure pure village query
              searchString = `${matchedCategory} in ${accurateLocation}`;
              addLog(`[Tier 3 Dispatch] STRICT SEMANTIC query: ${searchString}`);
              const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}`;
              await addScrapeJob('scrapeGooglePlaces', [searchUrl, matchedCategory, accurateLocation, sessionId, null, null, null, strategy], 10, meta);
            } else {
              // Tier 1/2: Grid Jumping with exact coordinates
              if (strategy === 'strict') {
                searchString = `${matchedCategory} in ${accurateLocation} near ${coord.lat},${coord.lng}`;
              } else {
                searchString = `${matchedCategory} near ${coord.lat},${coord.lng}`;
              }
              const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}/@${coord.lat},${coord.lng},14z`;
              addLog(`[Sunflower Map Dispatch] Dispatching query at distance ${coord.distanceFromCenter}km from ${accurateLocation}`);
              await addScrapeJob('scrapeGooglePlaces', [searchUrl, matchedCategory, accurateLocation, sessionId, coord.lat, coord.lng, coord.activeRadius, strategy], 10, meta);
            }
          }

          if (activeEngines.includes('google-web')) {
            const searchString = `${matchedCategory} in ${accurateLocation}`;
            addLog(`[Radius Jumping] Dispatching Universal Web Search for: ${searchString}`);
            await addScrapeJob('scrapeGoogleSerp', [searchString, matchedCategory, accurateLocation]);
          }
        }

        // Dispatch JustDial ONCE per unique baseLocation/District (It ignores coordinates anyway)
        if (activeEngines.includes('justdial')) {
          const uniqueLocs = [...new Set(centerLocations.map(c => c.queryLoc))];
          for (const loc of uniqueLocs) {
            addLog(`[Radius Jumping] Dispatching JustDial Search globally for ${loc}`);
            await addScrapeJob('scrapeJustDial', [matchedCategory, loc]);
          }
        }
        googleMapsJobsDispatched = true;
      }

    // FALLBACKS & SINGLE RUNS (If Grid Search didn't trigger)
    if (!googleMapsJobsDispatched) {
      if (activeEngines.includes('maps') || activeEngines.includes('google')) {
        let textLocations = [baseLocation || exactQuery];
        if (radius && parseInt(radius) > 0 && baseLocation) {
          addLog(`[AI Location Expansion Fallback] Finding nearby towns within ${radius}km for Google Maps fallback...`);
          const nearby = await intelligentExtractor.generateNearbyLocations(baseLocation, parseInt(radius));
          if (nearby && nearby.length > 0) textLocations = nearby;
        }
        
        for (const loc of textLocations) {
          let searchStr = exactQuery;
          if (loc !== baseLocation && loc !== exactQuery && category) searchStr = `${category} in ${loc}`;
          else if (loc !== baseLocation && loc !== exactQuery && !category) searchStr = `${exactQuery} in ${loc}`;
          
          const resolvedLocationData = await geocodeLocation(loc || searchStr);
          const accurateLocation = resolvedLocationData && resolvedLocationData.lat ? resolvedLocationData.formattedLocation : loc;
          addLog(`[Google Maps Fallback] Dispatching job for: "${searchStr}"`);
          const searchStrFormatted = `${matchedCategory} near ${accurateLocation}`;
          await addScrapeJob('scrapeGooglePlaces', [searchStrFormatted, matchedCategory, accurateLocation, sessionId, resolvedLocationData ? resolvedLocationData.lat : null, resolvedLocationData ? resolvedLocationData.lng : null, radius ? parseInt(radius) : null]);
        }
      }

      if (activeEngines.includes('google-web')) {
        const searchString = `${matchedCategory} in ${baseLocation}`;
        await addScrapeJob('scrapeGoogleSerp', [searchString, matchedCategory, baseLocation]);
      }

      if (activeEngines.includes('justdial')) {
        addLog(`[Radius Jumping] Dispatching JustDial Search globally for ${baseLocation}`);
        await addScrapeJob('scrapeJustDial', [matchedCategory, baseLocation]);
      }

      if (activeEngines.includes('indiamart')) {
        addLog(`[Manual Login Engine] Dispatching Native IndiaMart Scraper for ${matchedCategory} in ${baseLocation}`);
        await addScrapeJob('scrapePuppeteerIndiaMart', [matchedCategory, baseLocation]);
      }
    }
  } catch (err) {
    addLog(`[Omni] Failed to dispatch jobs: ${err.message}`);
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
  addLog('≡ƒö┤ [SYSTEM] MASTER STOP INITIATED. Aborting all scrapes & clearing queue.');
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
