const axios = require('axios');
const fs = require('fs');
const path = require('path');

const cacheFile = path.join(__dirname, '../../data/forwardGeocodeCache.json');
let forwardCache = {};

function loadCache() {
  if (fs.existsSync(cacheFile)) {
    try {
      forwardCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    } catch (e) {
      forwardCache = {};
    }
  }
}
loadCache();

function saveCache() {
  try {
    fs.writeFile(cacheFile, JSON.stringify(forwardCache), (err) => {
      if (err) console.error('[Geocoding Cache] Failed to write file:', err.message);
    });
  } catch (e) {
    console.error('[Geocoding Cache] Failed to save cache:', e.message);
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validates and geocodes a location string using OpenStreetMap (Nominatim)
 * @param {string} locationQuery - The raw location string (e.g. "banquets near hyd")
 * @returns {Promise<{ formattedLocation: string, lat: number, lng: number } | null>}
 */
async function geocodeLocation(locationQuery) {
  if (!locationQuery || locationQuery.trim().length === 0) return null;
  
  const key = locationQuery.toLowerCase().trim();
  if (forwardCache[key]) {
    return forwardCache[key];
  }
  
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      console.log(`[OSM Geocoding] Attempting to geocode: "${locationQuery}" (Attempt ${attempts + 1})`);
      const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: locationQuery,
          format: 'json',
          limit: 1,
          addressdetails: 1,
          countrycodes: 'in'
        },
        headers: {
          // Unique user-agent is REQUIRED by Nominatim TOS to prevent blocking
          'User-Agent': `GomandapScraperApp/2.0_${Math.random().toString(36).substring(7)} (contact@gomandap.com)`
        },
        timeout: 10000
      });

      if (response.data && response.data.length > 0) {
        const bestMatch = response.data[0];
        console.log(`[OSM Geocoding] Resolved to: ${bestMatch.display_name} (${bestMatch.lat}, ${bestMatch.lon})`);
        const result = {
          formattedLocation: bestMatch.display_name,
          lat: parseFloat(bestMatch.lat),
          lng: parseFloat(bestMatch.lon),
          boundingbox: bestMatch.boundingbox ? bestMatch.boundingbox.map(parseFloat) : null
        };
        forwardCache[key] = result;
        saveCache();
        return result;
      }
      
      // If no match and it's a comma-separated query, try fallback (remove district name)
      const parts = locationQuery.split(',');
      if (parts.length >= 3) {
        const fallbackQuery = `${parts[0].trim()}, ${parts[2].trim()}`;
        console.log(`[OSM Geocoding] No direct match. Trying broader fallback query: "${fallbackQuery}"`);
        const fbResponse = await axios.get(`https://nominatim.openstreetmap.org/search`, {
          params: {
            q: fallbackQuery,
            format: 'json',
            limit: 1,
            addressdetails: 1,
            countrycodes: 'in'
          },
          headers: {
            'User-Agent': `GomandapScraperApp/2.0_${Math.random().toString(36).substring(7)} (contact@gomandap.com)`
          },
          timeout: 10000
        });

        if (fbResponse.data && fbResponse.data.length > 0) {
          const bestMatch = fbResponse.data[0];
          console.log(`[OSM Geocoding] Resolved (fallback) to: ${bestMatch.display_name} (${bestMatch.lat}, ${bestMatch.lon})`);
          const result = {
            formattedLocation: bestMatch.display_name,
            lat: parseFloat(bestMatch.lat),
            lng: parseFloat(bestMatch.lon),
            boundingbox: bestMatch.boundingbox ? bestMatch.boundingbox.map(parseFloat) : null
          };
          forwardCache[key] = result;
          saveCache();
          return result;
        }
      }
      
      console.warn(`[OSM Geocoding] No coordinates found for "${locationQuery}"`);
      const emptyResult = { formattedLocation: locationQuery.trim(), lat: null, lng: null, boundingbox: null };
      forwardCache[key] = emptyResult;
      saveCache();
      return emptyResult;
      
    } catch (err) {
      attempts++;
      console.error(`[OSM Geocoding Error] Failed to geocode "${locationQuery}":`, err.message);
      if (attempts < maxAttempts) {
        console.log(`[OSM Geocoding] Retrying in 2 seconds...`);
        await sleep(2000);
      } else {
        return { formattedLocation: locationQuery.trim(), lat: null, lng: null, boundingbox: null };
      }
    }
  }
}

/**
 * Autocomplete using OSM-based Photon API (Nominatim TOS forbids high-frequency autocomplete)
 */
async function autocompleteLocation(text) {
  if (!text || text.trim().length === 0) return [];

  try {
    const response = await axios.get(`https://photon.komoot.io/api/`, {
      params: { q: text, limit: 5 },
      headers: { 'Accept': 'application/json' },
      timeout: 5000
    });
    
    if (response.data && response.data.features) {
      return response.data.features.map(f => {
        const props = f.properties;
        let parts = [];
        if (props.name) parts.push(props.name);
        if (props.city) parts.push(props.city);
        if (props.state) parts.push(props.state);
        return parts.join(', ');
      });
    }
    return [];
  } catch (error) {
    console.error(`[OSM Autocomplete Error]:`, error.message);
    return [];
  }
}

function getCache() {
  return forwardCache;
}

module.exports = {
  geocodeLocation,
  autocompleteLocation,
  getCache
};
