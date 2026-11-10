const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Cache file to prevent hitting external APIs
const cacheFile = path.join(require('../config/paths').DATA_DIR, 'locationCache.json');
let geoCache = {};
if (fs.existsSync(cacheFile)) {
  try {
    geoCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch (e) { geoCache = {}; }
}

let saveCacheTimer = null;
const saveCache = () => {
  if (saveCacheTimer) return;
  saveCacheTimer = setTimeout(() => {
    saveCacheTimer = null;
    try {
      fs.writeFile(cacheFile, JSON.stringify(geoCache, null, 2), () => {});
    } catch (e) {}
  }, 2000);
};

async function initAI() {
  return null;
}

async function parseSearchQuery(query) {
  const start = performance.now();
  const result = {
    original: query,
    category: '',
    village: '',
    mandal: '',
    district: '',
    state: ''
  };

  const states = ['Andhra Pradesh', 'Telangana', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Goa', 'Gujarat', 'Rajasthan'];
  const inRegex = /\s(in|at|near|around)\s(.*)/i;
  const match = query.match(inRegex);
  
  if (match) {
    result.category = query.replace(match[0], '').trim();
    const locString = match[2];
    for (const s of states) {
      if (locString.toLowerCase().includes(s.toLowerCase())) {
        result.state = s;
      }
    }
    const locParts = locString.split(',').map(s => s.trim());
    result.village = locParts[0];
    if (locParts.length > 1) result.district = locParts[1];
  } else {
    result.category = query;
  }

  const duration = performance.now() - start;
  return result;
}

let lastExternalCallTime = 0;

/**
 * Reverse Geocodes lat/lng into Village, Mandal, District using Cache & Local Gazetteer First
 */
async function reverseGeocode(lat, lng, context = {}) {
  if (!lat || !lng) return null;
  
  // Round to ~1.1km grid for instant cache lookup
  const gridLat = parseFloat(lat).toFixed(2);
  const gridLng = parseFloat(lng).toFixed(2);
  const cacheKey = `${gridLat},${gridLng}`;

  if (geoCache[cacheKey]) {
    return geoCache[cacheKey];
  }

  // 1. Instant 0ms Local Resolution from context metadata
  if (context && (context.district || context.mandal || context.state || context.city)) {
    const localInfo = {
      village: context.village || context.city || '',
      mandal: context.mandal || '',
      district: context.district || '',
      state: context.state || context.stateName || 'India',
      country: 'India',
      postcode: (context.address && context.address.match(/\b\d{6}\b/)) ? context.address.match(/\b\d{6}\b/)[0] : ''
    };
    geoCache[cacheKey] = localInfo;
    saveCache();
    return localInfo;
  }

  // 2. Throttle external calls (max 1 request per 2000ms) to strictly avoid 429 rate limits
  const now = Date.now();
  if (now - lastExternalCallTime < 2000) {
    return null; // Skip non-essential reverse geocoding to keep scraping blazing fast
  }
  lastExternalCallTime = now;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'LeadHarvestTerritorialSwarm/3.0' },
      timeout: 3000
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
    // Silently ignore external rate limit errors - never spam terminal
  }
  
  return null;
}

module.exports = {
  initAI,
  parseSearchQuery,
  reverseGeocode
};
