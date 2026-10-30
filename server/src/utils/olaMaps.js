const axios = require('axios');
const fs = require('fs');
const path = require('path');

const cacheFile = path.join(require('../config/paths').DATA_DIR, 'forwardGeocodeCache.json');
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
    const dir = path.dirname(cacheFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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

// Check for Ola Maps API key from environment or settings.json
function getOlaMapsApiKey() {
  let key = process.env.OLA_MAPS_API_KEY || process.env.VITE_OLA_MAPS_API_KEY || process.env.MAPS_API_KEY;
  if (!key) {
    try {
      const { getOlaMapsApiKey: getKeyFromSettings } = require('../config/settingsManager');
      key = getKeyFromSettings();
    } catch(e) {}
  }
  return key || '';
}

/**
 * Validates and geocodes a location string using Ola Maps API (if configured) or OpenStreetMap (Nominatim)
 * @param {string} locationQuery - The raw location string (e.g. "Chebrolu, Guntur, Andhra Pradesh")
 * @returns {Promise<{ formattedLocation: string, lat: number, lng: number, boundingbox: number[] | null } | null>}
 */
async function geocodeLocation(locationQuery) {
  if (!locationQuery || locationQuery.trim().length === 0) return null;
  
  const key = locationQuery.toLowerCase().trim();
  if (forwardCache[key]) {
    return forwardCache[key];
  }

  const olaApiKey = getOlaMapsApiKey();

  // 1. Try Ola Maps API if API key is provided
  if (olaApiKey) {
    try {
      console.log(`[Ola Maps Geocoding] Querying: "${locationQuery}"`);
      const response = await axios.get(`https://api.olamaps.io/places/v1/geocode`, {
        params: {
          address: locationQuery,
          api_key: olaApiKey
        },
        headers: {
          'Origin': 'https://gomandap.com',
          'Referer': 'https://gomandap.com/'
        },
        timeout: 8000
      });

      if (response.data && (response.data.geocodingResults?.length > 0 || response.data.results?.length > 0)) {
        const item = (response.data.geocodingResults || response.data.results)[0];
        const lat = item.geometry?.location?.lat || item.lat;
        const lng = item.geometry?.location?.lng || item.lng;
        const formatted = item.formatted_address || item.display_name || locationQuery;

        if (lat != null && lng != null) {
          console.log(`[Ola Maps Resolved] ${formatted} (${lat}, ${lng})`);
          const result = {
            formattedLocation: formatted,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            boundingbox: item.geometry?.viewport ? [
              item.geometry.viewport.southwest?.lat,
              item.geometry.viewport.northeast?.lat,
              item.geometry.viewport.southwest?.lng,
              item.geometry.viewport.northeast?.lng
            ] : null,
            source: 'olamaps'
          };
          forwardCache[key] = result;
          saveCache();
          return result;
        }
      }
    } catch (olaErr) {
      console.warn(`[Ola Maps Geocode Warning] ${olaErr.message}. Falling back to high-res OSM...`);
    }
  }

  // 2. High-Resolution OSM / Nominatim with Fallbacks
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
          'User-Agent': `GomandapScraperApp/3.0_${Math.random().toString(36).substring(7)} (contact@gomandap.com)`
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
          boundingbox: bestMatch.boundingbox ? bestMatch.boundingbox.map(parseFloat) : null,
          source: 'osm'
        };
        forwardCache[key] = result;
        saveCache();
        return result;
      }
      
      // Fallback: If no match and it's a comma-separated query, try broader query (e.g. "Chebrolu, Andhra Pradesh")
      const parts = locationQuery.split(',');
      if (parts.length >= 3) {
        const fallbackQuery = `${parts[0].trim()}, ${parts[2].trim()}`;
        console.log(`[OSM Geocoding] Trying broader fallback query: "${fallbackQuery}"`);
        const fbResponse = await axios.get(`https://nominatim.openstreetmap.org/search`, {
          params: {
            q: fallbackQuery,
            format: 'json',
            limit: 1,
            addressdetails: 1,
            countrycodes: 'in'
          },
          headers: {
            'User-Agent': `GomandapScraperApp/3.0_${Math.random().toString(36).substring(7)} (contact@gomandap.com)`
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
            boundingbox: bestMatch.boundingbox ? bestMatch.boundingbox.map(parseFloat) : null,
            source: 'osm_fallback'
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
        await sleep(1500);
      } else {
        return { formattedLocation: locationQuery.trim(), lat: null, lng: null, boundingbox: null };
      }
    }
  }
}

/**
 * Autocomplete using Ola Maps API or OSM-based Photon API
 */
async function autocompleteLocation(text) {
  if (!text || text.trim().length === 0) return [];

  const olaApiKey = getOlaMapsApiKey();
  if (olaApiKey) {
    try {
      const response = await axios.get(`https://api.olamaps.io/places/v1/autocomplete`, {
        params: {
          input: text,
          api_key: olaApiKey
        },
        headers: {
          'Origin': 'https://gomandap.com',
          'Referer': 'https://gomandap.com/'
        },
        timeout: 5000
      });
      if (response.data && response.data.predictions) {
        return response.data.predictions.map(p => p.description || p.structured_formatting?.main_text);
      }
    } catch (e) {
      console.warn('[Ola Autocomplete Warning] Falling back to Photon:', e.message);
    }
  }

  try {
    const response = await axios.get(`https://photon.komoot.io/api/`, {
      params: { q: text, limit: 6 },
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
    console.error(`[Autocomplete Error]:`, error.message);
    return [];
  }
}

function getCache() {
  return forwardCache;
}

module.exports = {
  geocodeLocation,
  autocompleteLocation,
  getCache,
  getOlaMapsApiKey
};
