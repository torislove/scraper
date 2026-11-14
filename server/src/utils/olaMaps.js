/**
 * Geocoding — 100% keyless.
 *
 * Free public services only:
 *   - Nominatim (OpenStreetMap) for turning a place name into coordinates
 *   - Photon for autocomplete suggestions
 *
 * No account, no key, no billing. The old file name is kept because several
 * modules import it; there is no Ola Maps code left inside.
 */

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

// The geocoder is a real engine, so its health is reported like the others.
function noteGeoHealth(ok, count = 1, error = '') {
  try {
    const engineHealth = require('../services/engineHealth');
    engineHealth.recordRun('geocoder', { ok, count, error });
  } catch (err) {
    /* health must never break a search */
  }
}

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

const USER_AGENT = `GomandapScraperApp/3.0_${Math.random().toString(36).substring(7)} (contact@gomandap.com)`;

async function nominatim(query, countryCode) {
  const params = { q: query, format: 'json', limit: 1, addressdetails: 1 };
  // Only narrow by country when the caller knows it; otherwise search globally.
  if (countryCode && /^[A-Z]{2}$/.test(countryCode)) {
    params.countrycodes = countryCode.toLowerCase();
  }
  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    params,
    headers: { 'User-Agent': USER_AGENT },
    timeout: 10000
  });
  return Array.isArray(response.data) ? response.data : [];
}

function toResult(match, source) {
  return {
    formattedLocation: match.display_name,
    lat: parseFloat(match.lat),
    lng: parseFloat(match.lon),
    boundingbox: match.boundingbox ? match.boundingbox.map(parseFloat) : null,
    source
  };
}

/**
 * Validates and geocodes a location string with free OpenStreetMap services.
 * @param {string} locationQuery e.g. "Chebrolu, Guntur, Andhra Pradesh" or "Austin, TX"
 * @param {{ countryCode?: string }} [opts]
 * @returns {Promise<{ formattedLocation: string, lat: number, lng: number, boundingbox: number[] | null } | null>}
 */
async function geocodeLocation(locationQuery, opts = {}) {
  if (!locationQuery || locationQuery.trim().length === 0) return null;

  const key = locationQuery.toLowerCase().trim();
  if (forwardCache[key]) return forwardCache[key];

  const countryCode = opts.countryCode ? String(opts.countryCode).toUpperCase() : '';
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      console.log(`[OSM Geocoding] Attempting to geocode: "${locationQuery}" (Attempt ${attempts + 1})`);
      const matches = await nominatim(locationQuery, countryCode);

      if (matches.length > 0) {
        const result = toResult(matches[0], 'osm');
        console.log(`[OSM Geocoding] Resolved to: ${result.formattedLocation} (${result.lat}, ${result.lng})`);
        forwardCache[key] = result;
        saveCache();
        noteGeoHealth(true, 1);
        return result;
      }

      // Fallback: if no match and it is a comma-separated query, try a broader
      // query (e.g. "Chebrolu, Andhra Pradesh").
      const parts = locationQuery.split(',');
      if (parts.length >= 3) {
        const fallbackQuery = `${parts[0].trim()}, ${parts[parts.length - 1].trim()}`;
        console.log(`[OSM Geocoding] Trying broader fallback query: "${fallbackQuery}"`);
        const fbMatches = await nominatim(fallbackQuery, countryCode);
        if (fbMatches.length > 0) {
          const result = toResult(fbMatches[0], 'osm_fallback');
          console.log(`[OSM Geocoding] Resolved (fallback) to: ${result.formattedLocation} (${result.lat}, ${result.lng})`);
          forwardCache[key] = result;
          saveCache();
          noteGeoHealth(true, 1);
          return result;
        }
      }

      console.warn(`[OSM Geocoding] No coordinates found for "${locationQuery}"`);
      const emptyResult = { formattedLocation: locationQuery.trim(), lat: null, lng: null, boundingbox: null };
      forwardCache[key] = emptyResult;
      saveCache();
      noteGeoHealth(true, 0);
      return emptyResult;
    } catch (err) {
      attempts++;
      console.error(`[OSM Geocoding Error] Failed to geocode "${locationQuery}":`, err.message);
      if (attempts < maxAttempts) {
        await sleep(1500);
      } else {
        noteGeoHealth(false, 0, err.message);
        return { formattedLocation: locationQuery.trim(), lat: null, lng: null, boundingbox: null };
      }
    }
  }
}

/**
 * Autocomplete using the free Photon service (no key).
 */
async function autocompleteLocation(text) {
  if (!text || text.trim().length === 0) return [];

  try {
    const response = await axios.get('https://photon.komoot.io/api/', {
      params: { q: text, limit: 6 },
      headers: { Accept: 'application/json' },
      timeout: 5000
    });

    if (response.data && response.data.features) {
      return response.data.features.map(f => {
        const props = f.properties;
        const parts = [];
        if (props.name) parts.push(props.name);
        if (props.city) parts.push(props.city);
        if (props.state) parts.push(props.state);
        if (props.country) parts.push(props.country);
        return parts.join(', ');
      });
    }
    return [];
  } catch (error) {
    console.error('[Autocomplete Error]:', error.message);
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
