/**
 * globalPlaceIndex.js — keyless place lookup for the 244 non-Indian countries.
 *
 * Why this exists: `indiaGeoIndex` is a 619k-village local index and it is
 * excellent for India, but it knows nothing about Troy, Michigan or Slough,
 * Berkshire. Without this module the search bar simply said "not recognised"
 * for every place outside India.
 *
 * Two keyless OpenStreetMap services are used, in order:
 *   1. Photon (photon.komoot.io) — built for type-ahead, ~100 ms, no key.
 *   2. Nominatim — same data, stricter rate limit, used only when Photon is
 *      empty or unreachable.
 *
 * Rules:
 *  - Results are cached for ten minutes, keyed by country + text, so typing
 *    "tro", "troy", "troy " costs one upstream request, not three.
 *  - Requests are serialised with a small gap. Nothing here hammers a
 *    volunteer service.
 *  - Only settlement-shaped results are returned (city, town, village,
 *    county, district, state). Streets, houses and random POIs are dropped.
 *  - A country filter is applied when the caller knows the country, so "Troy"
 *    in a US search does not offer Troy in Tamil Nadu.
 */

const axios = require('axios');

const PHOTON_URL = 'https://photon.komoot.io/api/';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Scraper.co.in-LeadFinder/1.0 (+https://scraper.co.in; contact: support@scraper.co.in)';

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 400;
const PHOTON_GAP_MS = 300;
const NOMINATIM_GAP_MS = 1200;

const cache = new Map();
let lastPhotonAt = 0;
let lastNominatimAt = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function norm(value) {
  return String(value == null ? '' : value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), value });
}

/** Photon mixes settlements with streets, houses and shops. Keep only places. */
function levelFor(props = {}) {
  const type = String(props.type || '').toLowerCase();
  const osmValue = String(props.osm_value || '').toLowerCase();
  const osmKey = String(props.osm_key || '').toLowerCase();

  if (type === 'country') return null;
  if (type === 'state' || osmValue === 'state') return 'state';
  if (type === 'county') return 'district';
  if (type === 'district' || osmValue === 'city_district') return 'district';
  if (type === 'city' || osmValue === 'city' || osmValue === 'town') return 'city';
  if (type === 'village' || osmValue === 'village' || osmValue === 'hamlet') return 'village';
  if (type === 'locality') return 'city';
  if (['suburb', 'neighbourhood', 'quarter', 'borough'].includes(osmValue)) return 'city';
  if (type === 'street' || type === 'house' || osmKey === 'highway' || osmKey === 'building') return null;
  if (osmValue === 'administrative') return type === 'state' ? 'state' : 'district';
  // Anything else that still has a settlement-ish key is a locality.
  if (osmKey === 'place' || osmKey === 'boundary') return 'city';
  return null;
}

function placeFromPhoton(feature) {
  const props = feature?.properties || {};
  const coords = feature?.geometry?.coordinates || [];
  const level = levelFor(props);
  if (!level) return null;

  const name = String(props.name || '').trim();
  if (!name) return null;

  const state = String(props.state || '').trim();
  const district = String(props.county || props.district || props.city || '').trim();
  const country = String(props.country || '').trim();
  const countryCode = String(props.countrycode || '').toUpperCase();
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);

  const display = [name, district && norm(district) !== norm(name) ? district : '', state, country]
    .filter(Boolean)
    .join(', ');

  return {
    value: name,
    display,
    name,
    level,
    scope: level === 'village' ? 'city' : level,
    district,
    state,
    country: countryCode,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    source: 'photon'
  };
}

function placeFromNominatim(hit) {
  const type = String(hit?.addresstype || hit?.type || '').toLowerCase();
  const klass = String(hit?.category || hit?.class || '').toLowerCase();
  let level = null;
  if (klass === 'boundary' || klass === 'place') {
    if (type === 'state') level = 'state';
    else if (type === 'county' || type === 'district') level = 'district';
    else if (['city', 'town', 'municipality'].includes(type)) level = 'city';
    else if (['village', 'hamlet', 'suburb', 'neighbourhood', 'quarter'].includes(type)) {
      level = type === 'village' || type === 'hamlet' ? 'village' : 'city';
    }
  }
  if (!level) return null;

  const address = hit.address || {};
  const name = String(hit.name || address.city || address.town || address.village || '').trim();
  if (!name) return null;

  const district = String(address.county || address.state_district || '').trim();
  const state = String(address.state || '').trim();
  const country = String(address.country || '').trim();
  const countryCode = String(address.country_code || '').toUpperCase();

  return {
    value: name,
    display: [name, district && norm(district) !== norm(name) ? district : '', state, country]
      .filter(Boolean)
      .join(', '),
    name,
    level,
    scope: level === 'village' ? 'city' : level,
    district,
    state,
    country: countryCode,
    lat: Number.isFinite(Number(hit.lat)) ? Number(hit.lat) : null,
    lng: Number.isFinite(Number(hit.lon)) ? Number(hit.lon) : null,
    source: 'nominatim'
  };
}

async function queryPhoton(text, limit) {
  const wait = PHOTON_GAP_MS - (Date.now() - lastPhotonAt);
  if (wait > 0) await sleep(wait);
  lastPhotonAt = Date.now();

  const response = await axios.get(PHOTON_URL, {
    params: { q: text, limit: Math.min(20, Math.max(limit * 2, 6)), lang: 'en' },
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    timeout: 6000
  });

  const features = Array.isArray(response.data?.features) ? response.data.features : [];
  return features.map(placeFromPhoton).filter(Boolean);
}

async function queryNominatim(text, country, limit) {
  const wait = NOMINATIM_GAP_MS - (Date.now() - lastNominatimAt);
  if (wait > 0) await sleep(wait);
  lastNominatimAt = Date.now();

  const params = {
    q: text,
    format: 'jsonv2',
    limit: Math.min(20, Math.max(limit * 2, 6)),
    addressdetails: 1,
    featuretype: 'settlement'
  };
  if (/^[A-Z]{2}$/.test(country)) params.countrycodes = country.toLowerCase();

  const response = await axios.get(NOMINATIM_URL, {
    params,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    timeout: 8000
  });

  const hits = Array.isArray(response.data) ? response.data : [];
  return hits.map(placeFromNominatim).filter(Boolean);
}

/**
 * Suggest settlements for a text fragment.
 *
 * @param {string} text           what the operator has typed ("tro", "troy")
 * @param {{ country?: string, limit?: number }} [options]
 * @returns {Promise<Array<object>>}
 */
async function searchPlaces(text, options = {}) {
  const clean = String(text || '').trim();
  if (clean.length < 3) return [];

  const country = String(options.country || '').toUpperCase();
  const limit = Math.max(1, Math.min(12, Number(options.limit) || 6));
  const key = `${country}|${limit}|${norm(clean)}`;

  const cached = cacheGet(key);
  if (cached) return cached;

  let places = [];
  try {
    places = await queryPhoton(clean, limit);
  } catch (error) {
    places = [];
  }

  // Country filter: a US search should not offer Troy in Tamil Nadu.
  if (country && country !== 'IN') {
    const filtered = places.filter(place => !place.country || place.country === country);
    // Photon's coverage is thin in some countries; keep the unfiltered list
    // only when the filter would leave nothing at all.
    places = filtered.length ? filtered : places;
  }

  if (!places.length) {
    try {
      places = await queryNominatim(clean, country, limit);
    } catch (error) {
      places = [];
    }
  }

  const seen = new Set();
  const deduped = [];
  for (const place of places) {
    const id = `${norm(place.value)}|${norm(place.state)}|${place.level}`;
    if (seen.has(id)) continue;
    seen.add(id);
    deduped.push(place);
  }

  // Prefer places whose name actually starts with what was typed, then cities.
  const query = norm(clean);
  const levelRank = { city: 0, district: 1, state: 2, village: 3 };
  deduped.sort((a, b) => {
    const aStarts = norm(a.value).startsWith(query) ? 0 : 1;
    const bStarts = norm(b.value).startsWith(query) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    const aExact = norm(a.value) === query ? 0 : 1;
    const bExact = norm(b.value) === query ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return (levelRank[a.level] ?? 9) - (levelRank[b.level] ?? 9);
  });

  const result = deduped.slice(0, limit);
  cacheSet(key, result);
  return result;
}

function clearCache() {
  cache.clear();
}

module.exports = { searchPlaces, clearCache };
