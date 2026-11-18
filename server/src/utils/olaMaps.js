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

/**
 * Bump when the ranking rules change. Older entries were resolved with
 * `limit: 1` and no granularity check, so a cached "Slough, Berkshire" could
 * point at a street called Berkshire Avenue forever. A new version ignores
 * those anchors and re-resolves them once.
 */
const GEO_CACHE_VERSION = 3;

function loadCache() {
  if (fs.existsSync(cacheFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      // Drop anchors resolved by an older ranking rule instead of letting them
      // shadow a correct answer forever.
      const prefix = `${GEO_CACHE_VERSION}|`;
      forwardCache = {};
      for (const [key, value] of Object.entries(raw || {})) {
        if (key.startsWith(prefix)) forwardCache[key] = value;
      }
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
  const params = {
    q: query,
    format: 'json',
    // Five candidates, ranked below. `limit: 1` trusted Nominatim's first hit,
    // which is how "Slough, Berkshire" became a street on the Slough Trading
    // Estate and anchored a whole sweep there.
    limit: 5,
    addressdetails: 1,
    'accept-language': 'en'
  };
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

const SETTLEMENT_CLASSES = new Set(['place', 'boundary']);
const LINEAR_CLASSES = new Set(['highway', 'railway', 'waterway', 'route', 'barrier']);

/**
 * Pick the result that matches the granularity the operator typed.
 *
 * "Slough, Berkshire" must resolve to the town of Slough, not to Berkshire
 * Avenue inside the Slough Trading Estate. A settlement/boundary result always
 * outranks a street, a postcode or a shop that merely contains the same words.
 */
function rankNominatimMatches(matches, query) {
  const segments = String(query || '')
    .toLowerCase()
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  const head = segments[0] || '';
  const tail = segments.slice(1);

  const scored = matches.map((match, index) => {
    const display = String(match.display_name || '').toLowerCase();
    const name = String(match.name || '').toLowerCase();
    const cls = String(match.class || '').toLowerCase();
    const type = String(match.type || '').toLowerCase();
    const rank = Number(match.place_rank);
    let score = 0;

    // 1. Granularity of the feature itself.
    if (SETTLEMENT_CLASSES.has(cls)) score += 30;
    else if (LINEAR_CLASSES.has(cls)) score += 2;
    else if (cls === 'landuse' || cls === 'natural') score += 4;
    else score += 10;

    // 2. Name agreement. A street called "Berkshire Avenue" only contains the
    //    word; the town of Slough *is* the head segment.
    if (head && (name === head || display.startsWith(`${head},`))) score += 25;
    else if (head && display.includes(head)) score += 9;

    // 3. Administrative tails must be present ("Berkshire", "Michigan").
    for (const part of tail) {
      if (part && display.includes(part)) score += 8;
    }

    // 4. Prefer the granularity a location search means: city/town/village,
    //    then state/county. Country and continent hits are not anchors.
    if (Number.isFinite(rank)) {
      if (rank >= 14 && rank <= 22) score += 12;
      else if (rank >= 8 && rank <= 13) score += 8;
      else if (rank <= 4) score -= 14;
      else if (rank >= 26) score -= 7;
    }

    return { match, score, index };
  });

  scored.sort((a, b) => (b.score - a.score) || (a.index - b.index));
  return scored.map(entry => entry.match);
}

function precisionOf(match) {
  const cls = String(match.class || '').toLowerCase();
  const type = String(match.type || '').toLowerCase();
  if (cls === 'boundary' && type === 'administrative') return 'administrative';
  if (cls === 'place') return type || 'place';
  if (LINEAR_CLASSES.has(cls)) return 'street';
  return type || cls || 'unknown';
}

function toResult(match, source) {
  return {
    formattedLocation: match.display_name,
    name: match.name || String(match.display_name || '').split(',')[0].trim(),
    lat: parseFloat(match.lat),
    lng: parseFloat(match.lon),
    boundingbox: match.boundingbox ? match.boundingbox.map(parseFloat) : null,
    address: match.address || null,
    precision: precisionOf(match),
    source
  };
}

function normText(value) {
  return String(value == null ? '' : value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Every address field joined, so "Berkshire" can be looked up in county/state. */
function addressHaystack(result) {
  const address = result && result.address ? result.address : {};
  return normText(Object.values(address).filter(value => typeof value === 'string').join(' '));
}

/**
 * "Slough, Berkshire, United Kingdom" -> ["Slough, Berkshire", "Slough"].
 * Nominatim answers the *street* called Berkshire Avenue for the full query and
 * only returns the town of Slough for the head alone, so the anchor has to be
 * found by relaxing the query rather than trusting the first hit.
 */
function queryLadder(locationQuery) {
  const segments = String(locationQuery || '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  if (segments.length <= 1) return [String(locationQuery || '').trim()];
  const ladder = [segments.join(', ')];
  if (segments.length >= 3) ladder.push(`${segments[0]}, ${segments[segments.length - 1]}`);
  ladder.push(segments[0]);
  return [...new Set(ladder)];
}

/**
 * Does this Nominatim hit deserve to be the sweep anchor?
 *
 * First attempt: a settlement/boundary always wins; a landmark (street, POI)
 * only when the operator typed that landmark's exact name and the rest of the
 * address confirms the town.
 * Relaxed attempt: only a settlement whose name is the head segment.
 */
function acceptCandidate(match, attempt, isFirstAttempt) {
  const cls = String(match.class || '').toLowerCase();
  const name = normText(match.name);
  const display = normText(match.display_name);
  const head = normText(String(attempt || '').split(',')[0]);
  const settlement = SETTLEMENT_CLASSES.has(cls);

  if (settlement && (name === head || display.startsWith(head))) return true;
  if (!isFirstAttempt) return false;
  if (name && name === head) {
    // A landmark (junction, street, POI) is only accepted when its own address
    // confirms the town the operator named: "Benz Circle, Vijayawada" resolves
    // to the bus stop whose address.city is Vijayawada.
    const tail = String(attempt).split(',').slice(1).map(normText).filter(Boolean);
    if (!tail.length) return true;
    const hay = addressHaystack({ address: match.address });
    return tail.some(part => hay.includes(part));
  }
  return false;
}

async function resolveGeocode(locationQuery, countryCode) {
  const ladder = queryLadder(locationQuery);
  let fallback = null;

  for (let step = 0; step < ladder.length; step += 1) {
    const attempt = ladder[step];
    const isFirstAttempt = step === 0;
    const matches = await nominatim(attempt, countryCode);
    if (!matches.length) continue;

    const ranked = rankNominatimMatches(matches, attempt);
    for (const match of ranked) {
      const candidate = toResult(match, isFirstAttempt ? 'osm' : 'osm_relaxed');
      if (acceptCandidate(match, attempt, isFirstAttempt)) {
        if (!isFirstAttempt) {
          console.log(`[OSM Geocoding] Relaxed "${locationQuery}" to "${attempt}" to find a settlement anchor.`);
        }
        return candidate;
      }
      // Keep the best plausible non-settlement hit in case nothing better exists.
      if (!fallback) fallback = candidate;
    }
  }

  return fallback;
}

/**
 * Validates and geocodes a location string with free OpenStreetMap services.
 * @param {string} locationQuery e.g. "Chebrolu, Guntur, Andhra Pradesh" or "Austin, TX"
 * @param {{ countryCode?: string }} [opts]
 * @returns {Promise<{ formattedLocation: string, lat: number, lng: number, boundingbox: number[] | null } | null>}
 */
async function geocodeLocation(locationQuery, opts = {}) {
  if (!locationQuery || locationQuery.trim().length === 0) return null;

  const key = `${GEO_CACHE_VERSION}|${locationQuery.toLowerCase().trim()}`;
  if (forwardCache[key]) return forwardCache[key];

  const countryCode = opts.countryCode ? String(opts.countryCode).toUpperCase() : '';
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      console.log(`[OSM Geocoding] Attempting to geocode: "${locationQuery}" (Attempt ${attempts + 1})`);
      const result = await resolveGeocode(locationQuery, countryCode);

      if (result && Number.isFinite(Number(result.lat))) {
        if (result.precision === 'street' || result.precision === 'unknown') {
          console.warn(`[OSM Geocoding] Only a ${result.precision}-level match was found for "${locationQuery}" — using it, but the anchor is not a settlement (${result.formattedLocation}).`);
        }
        console.log(`[OSM Geocoding] Resolved to: ${result.formattedLocation} (${result.lat}, ${result.lng}) [${result.precision}]`);
        forwardCache[key] = result;
        saveCache();
        noteGeoHealth(true, 1);
        return result;
      }

      // A miss is not cached: a rate-limited or offline moment must not
      // permanently disable a location that resolves fine a minute later.
      console.warn(`[OSM Geocoding] No coordinates found for "${locationQuery}"`);
      noteGeoHealth(true, 0);
      return { formattedLocation: locationQuery.trim(), lat: null, lng: null, boundingbox: null, address: null, precision: 'none' };
    } catch (err) {
      attempts++;
      console.error(`[OSM Geocoding Error] Failed to geocode "${locationQuery}":`, err.message);
      if (attempts < maxAttempts) {
        await sleep(1500);
      } else {
        noteGeoHealth(false, 0, err.message);
        return { formattedLocation: locationQuery.trim(), lat: null, lng: null, boundingbox: null, address: null, precision: 'none' };
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
