const fs = require('fs');
const path = require('path');
const axios = require('axios');
// Dynamic import for ES modules like @xenova/transformers
let pipeline = null;

// Cache file to prevent hitting Nominatim API rate limits
const cacheFile = path.join(__dirname, '../../data/locationCache.json');
let geoCache = {};
if (fs.existsSync(cacheFile)) {
  try {
    geoCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch (e) { geoCache = {}; }
}

const saveCache = () => fs.writeFileSync(cacheFile, JSON.stringify(geoCache, null, 2));

/**
 * Initializes the Transformers.js pipeline (loads into RAM once for <50ms parsing)
 */
async function initAI() {
  // Disabled to ensure lightweight server footprint and prevent ERR_MODULE_NOT_FOUND
  return null;
}

/**
 * Parses a natural language query into specific location tokens
 */
async function parseSearchQuery(query) {
  const start = performance.now();
  
  // Fast hybrid parsing (Regex + Dictionary + AI) for <50ms constraint
  const result = {
    original: query,
    category: '',
    village: '',
    mandal: '',
    district: '',
    state: ''
  };

  // Common Indian states & districts (mocked for speed, can be expanded)
  const states = ['Andhra Pradesh', 'Telangana', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi'];
  
  // Regex heuristics (0.1ms)
  const inRegex = /\s(in|at|near|around)\s(.*)/i;
  const match = query.match(inRegex);
  
  if (match) {
    result.category = query.replace(match[0], '').trim();
    const locString = match[2];
    
    // Check state
    for (const s of states) {
      if (locString.toLowerCase().includes(s.toLowerCase())) {
        result.state = s;
      }
    }
    
    // Assume the first word might be the village/city
    const locParts = locString.split(',').map(s => s.trim());
    result.village = locParts[0];
    if (locParts.length > 1) result.district = locParts[1];
  } else {
    result.category = query;
  }

  // AI Augmentation (fallback if regex is unsure)
  // Ensures we only use AI when needed to keep latency < 50ms
  if (!result.village && pipeline) {
    try {
      const classifier = await initAI();
      const aiResult = await classifier(query, ['location', 'service category', 'business name']);
      if (aiResult.labels[0] === 'location') {
        result.village = query;
        result.category = '';
      }
    } catch (e) {
      console.error('[GeoAI] AI parsing error', e);
    }
  }

  const duration = performance.now() - start;
  console.log(`[GeoAI] Parsed "${query}" in ${duration.toFixed(2)}ms`);
  
  return result;
}

/**
 * Reverse Geocodes lat/lng into Village, Mandal, District using Cache & Nominatim
 */
async function reverseGeocode(lat, lng) {
  if (!lat || !lng) return null;
  
  // Round to ~1.1km grid to heavily cache and group vendors automatically
  const gridLat = parseFloat(lat).toFixed(2);
  const gridLng = parseFloat(lng).toFixed(2);
  const cacheKey = `${gridLat},${gridLng}`;

  if (geoCache[cacheKey]) {
    return geoCache[cacheKey];
  }

  try {
    // OpenStreetMap Nominatim API
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Gomandap-Scraper-Agent/1.0' }
    });
    const data = res.data;
    
    if (data && data.address) {
      const isUSA = data.address.country_code === 'us';
      const locationInfo = {
        village: data.address.village || data.address.suburb || data.address.town || data.address.city || '',
        mandal: isUSA ? data.address.city || data.address.town : data.address.county || data.address.state_district || '',
        district: isUSA ? data.address.county : data.address.state_district || data.address.county || '',
        state: data.address.state || '',
        country: data.address.country || '',
        postcode: data.address.postcode || ''
      };
      
      geoCache[cacheKey] = locationInfo;
      saveCache();
      return locationInfo;
    }
  } catch (err) {
    console.error('[GeoAI] Geocoding error:', err.message);
  }
  
  return null;
}

module.exports = {
  initAI,
  parseSearchQuery,
  reverseGeocode
};
