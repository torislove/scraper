/**
 * engine-openstreetmap.js — free, legal, no-key coverage from OpenStreetMap.
 *
 * Why this engine exists: Google's Maps list is capped at ~20 places per query
 * and JustDial is one directory. OpenStreetMap is the only large, openly
 * licensed business dataset in India that can be queried programmatically with
 * **no API key and no payment**, so it adds real long-tail coverage for shops,
 * clinics, workshops, offices and small lodges that never rank on page one.
 *
 * Rules this engine follows on purpose:
 *  - It talks to the public Overpass and Nominatim endpoints, which are run by
 *    volunteers. Requests are serialised, spaced out, cached for a day and
 *    identified with a contact UA. No parallel hammering, no retry storms.
 *  - It reads only public OSM tags. It does not defeat bot protection, guess
 *    hidden endpoints or touch sites that forbid automated access.
 *  - Missing fields stay empty. A value is only stored when OSM actually has it.
 *  - Attribution is kept on every lead (`source: 'OpenStreetMap'`, ODbL).
 */

const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
const dv = require('./directoryVendor');
const { normalizePhone } = require('../utils/phoneUtils');
const { COUNTRIES, detectCountry, findRegion } = require('../services/localBrain/countries');
const { DATA_DIR, ensureDir } = require('../config/paths');

/**
 * Overpass is run by volunteers, so a single instance goes down regularly
 * (502/504 is the normal failure). These three are independent public mirrors
 * with the same API. A run tries them in order and stops at the first answer;
 * a mirror that just failed is moved to the back so one bad host cannot stall
 * every later search.
 */
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];
const OVERPASS_TIMEOUT_MS = 20000;
const MIRROR_COOLDOWN_MS = 10 * 60 * 1000;
// A host that just failed is skipped for ten minutes, so a dead mirror costs
// one timeout per ten minutes instead of one per search.
const mirrorDownUntil = new Map();
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Scraper.co.in-LeadFinder/1.0 (+https://scraper.co.in; contact: support@scraper.co.in)';
const CACHE_DIR = path.join(DATA_DIR, 'osm-cache');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_REQUEST_GAP_MS = 1300;
const MAX_RESULTS = 1200;

const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });

const deps = {
  emitVendorEvent: null,
  abortSignal: null,
  logger: console.log
};

function setDeps(next = {}) {
  if (next.emitVendorEvent) deps.emitVendorEvent = next.emitVendorEvent;
  if (next.abortSignal) deps.abortSignal = next.abortSignal;
  if (next.logger) deps.logger = next.logger;
}

let lastRequestAt = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function politeGet(url, params, { timeout = 12000 } = {}) {
  const wait = MIN_REQUEST_GAP_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
  return axios.get(url, {
    params,
    timeout,
    httpsAgent,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json'
    }
  });
}

/**
 * Overpass with mirror fallback.
 *
 * The old version retried the same host once, which is exactly the wrong move
 * when that host is the one returning 502. Now each mirror gets one attempt:
 * a 429/5xx/timeout moves to the next host, and the host that answered is
 * promoted so the next search starts there. If every mirror fails the last
 * error is thrown so the caller can log an honest "source unavailable".
 *
 * Pacing is unchanged: one request slot per MIN_REQUEST_GAP_MS, no parallel
 * hammering, no retry storm.
 */
async function politeOverpass(query) {
  const wait = MIN_REQUEST_GAP_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  const now = Date.now();
  const candidates = OVERPASS_MIRRORS.filter(url => (mirrorDownUntil.get(url) || 0) <= now);
  if (!candidates.length) {
    throw new Error('All Overpass mirrors are cooling down after failures');
  }

  let lastError = null;

  for (let i = 0; i < candidates.length; i += 1) {
    const url = candidates[i];
    try {
      const response = await axios.post(url, `data=${encodeURIComponent(query)}`, {
        timeout: OVERPASS_TIMEOUT_MS,
        httpsAgent,
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        }
      });

      mirrorDownUntil.delete(url);
      // Promote the healthy mirror so later searches start there.
      const at = OVERPASS_MIRRORS.indexOf(url);
      if (at > 0) {
        OVERPASS_MIRRORS.splice(at, 1);
        OVERPASS_MIRRORS.unshift(url);
      }
      return response;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      const transient = !status || status === 429 || (status >= 500 && status <= 599);
      deps.logger(`[OpenStreetMap] Mirror ${new URL(url).host} failed (${status || err.code || 'network'}); trying next.`);
      if (!transient) throw err;
      mirrorDownUntil.set(url, Date.now() + MIRROR_COOLDOWN_MS);
      await sleep(500);
    }
  }

  throw lastError || new Error('Overpass unavailable');
}

function cachePath(key) {
  return path.join(CACHE_DIR, `${key.replace(/[^a-z0-9]+/gi, '-').slice(0, 120)}.json`);
}

function readCache(key) {
  try {
    const file = cachePath(key);
    if (!fs.existsSync(file)) return null;
    const stat = fs.statSync(file);
    if (Date.now() - stat.mtimeMs > CACHE_TTL_MS) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeCache(key, value) {
  try {
    ensureDir(CACHE_DIR);
    fs.writeFileSync(cachePath(key), JSON.stringify(value));
  } catch (e) {}
}

/* ── category → OSM tags ─────────────────────────────────────────────────── */

const CATEGORY_TAGS = [
  {
    test: /restaurant|dhaba|biryani|eatery|dining|meals|mess|cafe|bakery|food|pizza|ice cream|sweets|fast food|chinese|south indian|north indian|bar\b|pub\b|grill|bbq|seafood/i,
    filters: [
      '["amenity"~"^(restaurant|cafe|fast_food|bar|pub|food_court|ice_cream)$"]',
      '["shop"~"^(bakery|confectionery|pastry|coffee|tea|beverages)$"]'
    ]
  },
  {
    test: /hospital|clinic|doctor|medical|nursing home|diagnostic|dental|eye care|physician|gynaec|dermatolog|paediatric|pediatric|ortho|ent\b|ayurved/i,
    filters: [
      '["amenity"~"^(hospital|clinic|doctors|dentist|pharmacy|veterinary)$"]',
      '["healthcare"~"^(hospital|clinic|doctor|dentist|physiotherapist|alternative)$"]'
    ]
  },
  {
    test: /hotel|resort|lodge|guest house|hostel|banquet|function hall|marriage hall|convention|wedding venue/i,
    filters: [
      '["tourism"~"^(hotel|guest_house|resort|hostel|motel|apartment)$"]',
      '["amenity"~"^(events_venue|conference_centre|community_hall)$"]'
    ]
  },
  {
    test: /school|college|coaching|tuition|institute|academy|training|university|nursery|play school/i,
    filters: [
      '["amenity"~"^(school|college|university|kindergarten|language_school|music_school|driving_school)$"]',
      '["office"~"^(educational_institution)$"]'
    ]
  },
  {
    test: /gym|fitness|yoga|sports|swimming|badminton|cricket/i,
    filters: [
      '["leisure"~"^(fitness_centre|sports_centre|swimming_pool|pitch|stadium)$"]',
      '["amenity"~"^(gym|dojo)$"]'
    ]
  },
  {
    test: /salon|beauty|spa|parlour|parlor|hair|makeup|nail|massage/i,
    filters: [
      '["shop"~"^(beauty|hairdresser|massage)$"]',
      '["leisure"~"^(spa)$"]'
    ]
  },
  {
    test: /computer|laptop|printer|cctv|software|it service|mobile|electronics|ups\b/i,
    filters: [
      '["shop"~"^(computer|electronics|mobile_phone|photo|hifi|appliance)$"]',
      '["office"~"^(it|telecommunication)$"]',
      '["craft"~"^(electronics_repair|computer_repair)$"]'
    ]
  },
  {
    test: /real estate|property|builder|flat|apartment|land|plot/i,
    filters: [
      '["office"~"^(estate_agent|property_management)$"]'
    ]
  },
  {
    test: /car|bike|automobile|vehicle|tyre|spare parts|service centre|service center|showroom/i,
    filters: [
      '["shop"~"^(car|car_repair|car_parts|motorcycle|motorcycle_repair|tyres|bicycle)$"]'
    ]
  },
  {
    test: /wedding|mandap|photographer|photography|decorator|catering|bridal|dj\b/i,
    filters: [
      '["shop"~"^(wedding|bridal|photo|florist)$"]',
      '["office"~"^(event_management|photographer)$"]',
      '["craft"~"^(photographer|florist|caterer)$"]'
    ]
  },
  {
    test: /lawyer|advocate|legal|chartered accountant|tax|consultant|gst|notary/i,
    filters: [
      '["office"~"^(lawyer|accountant|tax_advisor|notary|consulting|company)$"]'
    ]
  },
  {
    test: /plumber|electrician|carpenter|painter|pest control|cleaning|packers|movers|ac repair|ro repair/i,
    filters: [
      '["craft"~"^(plumber|electrician|carpenter|painter|hvac|key_cutter|joiner|metal_construction)$"]',
      '["shop"~"^(hardware|doityourself|garden_centre)$"]'
    ]
  },
  {
    test: /shop|store|dealer|wholesale|distributor|supplier/i,
    filters: ['["shop"]', '["office"~"^(wholesale|company)$"]']
  }
];

function buildFilters(category) {
  const text = String(category || '');
  const entry = CATEGORY_TAGS.find(group => group.test.test(text));
  if (entry) return entry.filters;
  // Unknown category: match the business name instead of guessing a tag.
  const safe = String(category || '').replace(/["\\]/g, '').trim();
  if (!safe) return [];
  return [`["name"~"${safe}",i]`];
}

/* ── geocoding fallback ──────────────────────────────────────────────────── */

/**
 * Which country is this search in? Location text wins ("Austin, USA",
 * "London, UK", "Texas"), otherwise India (the default install base).
 */
function resolveCountry(location) {
  const direct = detectCountry(location);
  if (direct) return direct;
  const region = findRegion(location);
  if (region) return region.country;
  return COUNTRIES.find(c => c.code === 'IN') || COUNTRIES[0];
}

async function geocode(city, country) {
  const cc = (country && country.code) || 'IN';
  const key = `geo-${cc}-${city}`;
  const cached = readCache(key);
  if (cached) return cached;
  try {
    const query = cc === 'IN' ? `${city}, India` : `${city}, ${country.name}`;
    const response = await politeGet(NOMINATIM_URL, {
      q: query,
      format: 'json',
      limit: 1,
      addressdetails: 1,
      countrycodes: cc.toLowerCase()
    });
    const hit = Array.isArray(response.data) ? response.data[0] : null;
    if (!hit) return null;
    const result = {
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      bbox: Array.isArray(hit.boundingbox) ? hit.boundingbox : null,
      district: hit.address?.state_district || hit.address?.county || '',
      state: hit.address?.state || '',
      country: cc
    };
    writeCache(key, result);
    return result;
  } catch (error) {
    deps.logger(`[OpenStreetMap] Geocode failed for "${city}": ${error.message}`);
    return null;
  }
}

/* ── Nominatim POI fallback ──────────────────────────────────────────────── */

/**
 * Overpass is the right tool, but it is volunteer-run and sometimes the whole
 * public network is unreachable from a given ISP. Nominatim is the same OSM
 * data behind a different service, so instead of returning an empty search we
 * ask it for places matching the category inside the city box.
 *
 * Coverage is narrower than Overpass (Nominatim ranks named places, it does
 * not dump every node), but it is keyless, legal, and returns the same fields:
 * name, phone, website, email, opening hours, coordinates and OSM id.
 */
const NON_BUSINESS_CLASSES = new Set([
  'boundary', 'place', 'highway', 'railway', 'waterway', 'natural',
  'landuse', 'building', 'man_made', 'admin', 'aeroway', 'route'
]);

/**
 * Nominatim matches names and its own special phrases, not arbitrary tags.
 * "photographers shop" returns nothing, while "photographer" returns the real
 * photo studios around Troy. So: map the trade to the phrase Nominatim actually
 * understands, then fall back to the singular trade and the original words.
 */
const CATEGORY_SYNONYMS = [
  [/photograph|videograph|photo studio|photo lab|portrait/i, ['photographer', 'photo studio', 'camera shop']],
  [/plumb/i, ['plumber']],
  [/electric/i, ['electrician']],
  [/carpent|joinery/i, ['carpenter']],
  [/dentist|dental/i, ['dentist']],
  [/doctor|clinic|physician|hospital/i, ['clinic', 'doctor']],
  [/restaurant|cafe|coffee|bakery|food/i, ['restaurant', 'cafe']],
  [/gym|fitness/i, ['gym', 'fitness centre']],
  [/salon|beauty|hair|spa/i, ['hairdresser', 'beauty shop']],
  [/lawyer|advocate|attorney|legal/i, ['lawyer']],
  [/real estate|realtor|property/i, ['estate agent', 'real estate']],
  [/mechanic|car repair|garage|auto/i, ['car repair', 'mechanic']],
  [/florist|flower/i, ['florist']],
  [/tailor|stitch/i, ['tailor']],
  [/laundry|dry clean/i, ['laundry', 'dry cleaning']],
  [/hotel|guest house|lodge/i, ['hotel', 'guest house']],
  [/travel|tour operator|ticket/i, ['travel agency']],
  [/insurance/i, ['insurance']],
  [/bank|finance/i, ['bank']],
  [/supermarket|grocery|kirana/i, ['supermarket', 'convenience store']],
  [/computer|electronics|laptop|mobile phone|cell phone/i, ['computer shop', 'electronics shop', 'mobile phone shop']],
  [/furniture/i, ['furniture shop']],
  [/jewel/i, ['jeweller']],
  [/shoe|footwear/i, ['shoe shop']],
  [/clothing|boutique|apparel/i, ['clothes shop']],
  [/pharmac|chemist|medical store/i, ['pharmacy', 'chemist']],
  [/pet /i, ['pet shop', 'veterinary']],
  [/school|tuition|coaching/i, ['school', 'college']]
];

function singularise(value) {
  const word = String(value || '').trim();
  if (!word) return '';
  if (/ies$/i.test(word)) return word.replace(/ies$/i, 'y');
  if (/ches|shes|sses|xes$/i.test(word)) return word.replace(/es$/i, '');
  if (/s$/i.test(word) && !/ss$/i.test(word)) return word.replace(/s$/i, '');
  return word;
}

function nominatimTerms(category) {
  const clean = String(category || '').trim();
  if (!clean) return [];
  const terms = [];

  for (const [pattern, phrases] of CATEGORY_SYNONYMS) {
    if (pattern.test(clean)) terms.push(...phrases);
  }

  const stripped = clean
    .replace(/\b(stores?|shops?|dealers?|centres?|centers?|suppliers?|companies|services?|vendors?|providers?|agencies)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped) {
    terms.push(singularise(stripped));
    // Some Nominatim phrases are literally "<thing> shop" (computer shop).
    terms.push(`${stripped} shop`);
  }
  terms.push(clean);

  const seen = new Set();
  const out = [];
  for (const term of terms) {
    const key = term.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(term.trim());
    if (out.length >= 4) break;
  }
  return out;
}

async function nominatimPlaces(category, city, country, center, radiusKm, bbox = null) {
  // A city's own bounding box beats a guessed radius: Austin's box reaches the
  // suburbs that a fixed 8 km circle misses. Fall back to a radius square when
  // the geocoder gave us no box.
  let viewbox = '';
  if (Array.isArray(bbox) && bbox.length === 4) {
    const [south, north, west, east] = bbox.map(Number);
    if ([south, north, west, east].every(Number.isFinite)) {
      viewbox = [west, north, east, south].map(value => value.toFixed(5)).join(',');
    }
  }
  if (!viewbox) {
    const delta = Math.min(0.6, Math.max(0.05, (Number(radiusKm) || 12) / 111));
    viewbox = [
      center.lng - delta,
      center.lat + delta,
      center.lng + delta,
      center.lat - delta
    ].map(value => value.toFixed(5)).join(',');
  }

  const terms = nominatimTerms(category);
  if (!terms.length) return [];

  const elements = [];
  const seen = new Set();

  for (const term of terms) {
    let hits = [];
    try {
      const response = await politeGet(NOMINATIM_URL, {
        q: term,
        format: 'jsonv2',
        limit: 50,
        addressdetails: 1,
        extratags: 1,
        namedetails: 1,
        bounded: 1,
        viewbox,
        countrycodes: country.code.toLowerCase()
      }, { timeout: 20000 });
      hits = Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      deps.logger(`[OpenStreetMap] Nominatim term "${term}" failed: ${error.message}`);
      continue;
    }

    for (const hit of hits) {
      const klass = String(hit.category || hit.class || '');
      if (!hit || NON_BUSINESS_CLASSES.has(klass)) continue;
      const name = hit.namedetails?.name || hit.name || '';
      if (!name) continue;

      const key = `${hit.osm_type || 'node'}/${hit.osm_id || hit.place_id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const address = hit.address || {};
      const extratags = hit.extratags || {};
      const tags = {
        name,
        ...extratags,
        'addr:housenumber': address.house_number || '',
        'addr:street': address.road || '',
        'addr:suburb': address.suburb || address.neighbourhood || address.quarter || '',
        'addr:city': address.city || address.town || address.village || '',
        'addr:district': address.county || address.state_district || '',
        'addr:state': address.state || '',
        'addr:postcode': address.postcode || ''
      };
      if (klass && hit.type) tags[klass] = hit.type;

      elements.push({
        type: hit.osm_type || 'node',
        id: hit.osm_id || hit.place_id,
        lat: Number(hit.lat),
        lon: Number(hit.lon),
        tags
      });
    }

    if (elements.length >= 40) break;
  }

  return elements;
}

/* ── tag extraction ──────────────────────────────────────────────────────── */

function tag(element, ...keys) {
  for (const key of keys) {
    const value = element.tags?.[key];
    if (value && String(value).trim()) return String(value).trim();
  }
  return '';
}

function pickPhones(element, countryCode = 'IN') {
  const raw = [
    tag(element, 'phone', 'contact:phone', 'mobile', 'contact:mobile', 'telephone'),
    tag(element, 'phone:mobile', 'contact:phone:mobile')
  ].filter(Boolean);
  const phones = [];
  for (const value of raw) {
    for (const part of value.split(/[;,/]/)) {
      const parsed = normalizePhone(part, {
        context: 'osm',
        defaultCountry: countryCode,
        allowInternational: true
      });
      if (parsed && parsed.isValid !== false && !phones.some(p => p.e164 === parsed.e164)) {
        phones.push(parsed);
      }
    }
  }
  return phones;
}

function buildAddress(element, fallbackCity, fallbackState) {
  const parts = [
    tag(element, 'addr:housenumber'),
    tag(element, 'addr:street'),
    tag(element, 'addr:suburb', 'addr:neighbourhood', 'addr:quarter'),
    tag(element, 'addr:city', 'addr:town', 'addr:village') || fallbackCity,
    tag(element, 'addr:district', 'addr:county') || '',
    tag(element, 'addr:state') || fallbackState,
    tag(element, 'addr:postcode')
  ].filter(Boolean);
  return parts.join(', ');
}

/* ── main entry ──────────────────────────────────────────────────────────── */

async function scrapeOpenStreetMap(category, location, sessionId = 'legacy', centerLat = null, centerLng = null, radiusKm = 8, countryHint = null) {
  const baseCategory = dv.cleanText(category, 120) || 'Business';
  const city = dv.cleanText(location, 120) || '';
  const filters = buildFilters(baseCategory);
  if (!city || !filters.length) {
    deps.logger(`[OpenStreetMap] Nothing to query for "${baseCategory}" in "${city}".`);
    return { totalScraped: 0, newInserted: 0, updated: 0, phoneCount: 0 };
  }

  const country = countryHint
    ? (COUNTRIES.find(c => c.code === String(countryHint).toUpperCase()) || resolveCountry(city))
    : resolveCountry(city);
  const countryCode = country.code;

  // `Number(null)` is 0, so a plain null check is not enough: without this,
  // every "no coordinates supplied" call silently searched the Gulf of Guinea
  // and returned nothing. Only treat a value as a centre when it is real.
  const hasCoord = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  let center = (hasCoord(centerLat) && hasCoord(centerLng))
    ? { lat: Number(centerLat), lng: Number(centerLng) }
    : null;
  let geo = center ? { district: '', state: '' } : null;
  if (!center) {
    geo = await geocode(city, country);
    if (!geo) {
      deps.logger(`[OpenStreetMap] Could not find "${city}" — skipping.`);
      return { totalScraped: 0, newInserted: 0, updated: 0, phoneCount: 0 };
    }
    center = { lat: geo.lat, lng: geo.lng };
  }

  const isMetro = /hyderabad|bangalore|bengaluru|mumbai|delhi|chennai|kolkata|pune|ahmedabad|guntur|vijayawada|new york|london|los angeles|chicago|toronto|sydney|melbourne|dubai|singapore|houston|dallas|miami|manchester|birmingham/i.test(city);
  const defaultKm = isMetro ? 32 : 12;
  const radiusMeters = Math.max(1000, Math.min(35000, (Number(radiusKm) || defaultKm) * 1000));
  const around = `(around:${Math.round(radiusMeters)},${center.lat.toFixed(5)},${center.lng.toFixed(5)})`;
  const body = filters.map(filter => `nwr${filter}${around};`).join('\n  ');
  const query = `[out:json][timeout:25];\n(\n  ${body}\n);\nout center tags ${MAX_RESULTS};`;

  const cacheKey = `osm-${countryCode}-${city}-${baseCategory}-${Math.round(radiusMeters / 1000)}`;
  let payload = readCache(cacheKey);
  let sourcePath = 'overpass';
  if (!payload) {
    try {
      const response = await politeOverpass(query);
      payload = response.data;
      writeCache(cacheKey, payload);
    } catch (error) {
      deps.logger(`[OpenStreetMap] Overpass unavailable (${error.message}); switching to Nominatim for the same city box.`);
      try {
        const fallback = await nominatimPlaces(baseCategory, city, country, center, radiusMeters / 1000, geo?.bbox);
        payload = { elements: fallback, via: 'nominatim' };
        sourcePath = 'nominatim';
        if (fallback.length) writeCache(cacheKey, payload);
        deps.logger(`[OpenStreetMap] Nominatim returned ${fallback.length} named places for "${baseCategory}" in ${city}.`);
      } catch (fallbackError) {
        deps.logger(`[OpenStreetMap] Both Overpass and Nominatim failed: ${fallbackError.message}`);
        return { totalScraped: 0, newInserted: 0, updated: 0, phoneCount: 0, sourceUnavailable: true };
      }
    }
  } else {
    sourcePath = payload?.via === 'nominatim' ? 'nominatim (cached)' : 'overpass (cached)';
    deps.logger(`[OpenStreetMap] Reusing today's cached answer for "${baseCategory}" in "${city}".`);
  }

  const elements = Array.isArray(payload?.elements) ? payload.elements : [];
  deps.logger(`[OpenStreetMap] ${elements.length} public OSM places matched "${baseCategory}" within ${Math.round(radiusMeters / 1000)} km of ${city} · via ${sourcePath}.`);

  let created = 0;
  let updated = 0;
  let phoneCount = 0;
  let mobileCount = 0;
  const state = dv.cleanText(geo?.state || '', 80);
  const district = dv.cleanText(geo?.district || '', 80);
  const seen = new Set();

  for (const element of elements) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;

    const name = tag(element, 'name', 'brand', 'operator');
    if (!name) continue;

    const identity = `${dv.normalizeName(name)}|${Math.round(Number(element.lat || element.center?.lat || 0) * 1000)}`;
    if (seen.has(identity)) continue;
    seen.add(identity);

    const phones = pickPhones(element, countryCode);
    const website = tag(element, 'website', 'contact:website', 'url');
    const email = tag(element, 'email', 'contact:email');

    // Only import OSM entries that have verified contact channels (phone, website, or email).
    // Raw geographic nodes without contact details flood the system with non-actionable rows.
    if (!phones.length && !website && !email) continue;

    const latitude = Number(element.lat ?? element.center?.lat ?? 0) || null;
    const longitude = Number(element.lon ?? element.center?.lon ?? 0) || null;

    const vendor = dv.buildDirectoryVendor({
      prefix: 'osm',
      sessionId,
      source: 'OpenStreetMap',
      sourceEngine: 'openstreetmap',
      name,
      category: baseCategory,
      subcategory: tag(element, 'cuisine', 'healthcare', 'shop', 'amenity', 'office', 'craft'),
      description: tag(element, 'description'),
      address: buildAddress(element, city, state),
      locality: tag(element, 'addr:suburb', 'addr:neighbourhood') || city,
      city: tag(element, 'addr:city', 'addr:town', 'addr:village') || city,
      district,
      state: tag(element, 'addr:state') || state,
      country: countryCode,
      pincode: tag(element, 'addr:postcode'),
      latitude,
      longitude,
      hours: tag(element, 'opening_hours'),
      website: tag(element, 'website', 'contact:website', 'url'),
      email: tag(element, 'email', 'contact:email'),
      socials: {
        instagram: tag(element, 'contact:instagram'),
        facebook: tag(element, 'contact:facebook'),
        linkedin: tag(element, 'contact:linkedin'),
        youtube: tag(element, 'contact:youtube'),
        twitter: tag(element, 'contact:twitter')
      },
      phones,
      profileUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      tags: ['openstreetmap', 'odbl'],
      sourceProvenance: [{
        field: 'listing',
        source: 'OpenStreetMap (ODbL)',
        sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
        extractedAt: new Date().toISOString()
      }]
    });

    if (!vendor.name) continue;

    const primaryMobile = phones.find(phone => phone.isMobile);
    if (primaryMobile) {
      // digits already contains the country code; never assume +91.
      vendor.whatsapp = `https://wa.me/${primaryMobile.digits}`;
      vendor.whatsappLink = vendor.whatsapp;
      vendor.whatsappAvailable = true;
      if (!vendor.phone) vendor.phone = primaryMobile.e164;
    }

    const result = dv.saveDirectoryVendor(vendor, sessionId);
    if (!result.vendor) continue;
    phoneCount += (result.vendor.phones || []).filter(phone => phone?.e164).length;
    mobileCount += (result.vendor.phones || []).filter(phone => phone?.isMobile).length;

    if (result.created) {
      created += 1;
      try { deps.emitVendorEvent?.(result.vendor, 'inserted'); } catch (e) {}
    } else {
      updated += 1;
      try { deps.emitVendorEvent?.(result.vendor, 'updated'); } catch (e) {}
    }

    try {
      const { streamingEnricher } = require('../services/phoneBackfillService');
      streamingEnricher.enqueue(result.vendor);
    } catch (e) {}
  }

  deps.logger(`[OpenStreetMap] Saved ${created} new + ${updated} merged places · ${mobileCount} mobiles.`);
  return {
    totalScraped: elements.length,
    newInserted: created,
    updated,
    phoneCount,
    mobileCount,
    sourcePath
  };
}

module.exports = { scrapeOpenStreetMap, setDeps, nominatimPlaces };
