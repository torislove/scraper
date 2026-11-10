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
const { DATA_DIR, ensureDir } = require('../config/paths');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
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
 * One polite retry for a transient upstream answer. A timeout is not retried:
 * doubling the wait would only make the run feel stuck. 429/5xx get a short
 * pause, then the guard records the block and the job moves on.
 */
async function politeOverpass(query) {
  const wait = MIN_REQUEST_GAP_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  const request = () => axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
    timeout: 15000,
    httpsAgent,
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    }
  });

  try {
    return await request();
  } catch (err) {
    const status = err.response?.status;
    const retryable = status === 429 || (status >= 500 && status <= 599);
    if (!retryable) throw err;
    await sleep(1500);
    return request();
  }
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

async function geocode(city) {
  const key = `geo-${city}`;
  const cached = readCache(key);
  if (cached) return cached;
  try {
    const response = await politeGet(NOMINATIM_URL, {
      q: `${city}, India`,
      format: 'json',
      limit: 1,
      addressdetails: 1
    });
    const hit = Array.isArray(response.data) ? response.data[0] : null;
    if (!hit) return null;
    const result = {
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      district: hit.address?.state_district || hit.address?.county || '',
      state: hit.address?.state || ''
    };
    writeCache(key, result);
    return result;
  } catch (error) {
    deps.logger(`[OpenStreetMap] Geocode failed for "${city}": ${error.message}`);
    return null;
  }
}

/* ── tag extraction ──────────────────────────────────────────────────────── */

function tag(element, ...keys) {
  for (const key of keys) {
    const value = element.tags?.[key];
    if (value && String(value).trim()) return String(value).trim();
  }
  return '';
}

function pickPhones(element) {
  const raw = [
    tag(element, 'phone', 'contact:phone', 'mobile', 'contact:mobile', 'telephone'),
    tag(element, 'phone:mobile', 'contact:phone:mobile')
  ].filter(Boolean);
  const phones = [];
  for (const value of raw) {
    for (const part of value.split(/[;,/]/)) {
      const parsed = normalizePhone(part, { context: 'osm' });
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

async function scrapeOpenStreetMap(category, location, sessionId = 'legacy', centerLat = null, centerLng = null, radiusKm = 8) {
  const baseCategory = dv.cleanText(category, 120) || 'Business';
  const city = dv.cleanText(location, 120) || '';
  const filters = buildFilters(baseCategory);
  if (!city || !filters.length) {
    deps.logger(`[OpenStreetMap] Nothing to query for "${baseCategory}" in "${city}".`);
    return { totalScraped: 0, newInserted: 0, updated: 0, phoneCount: 0 };
  }

  let center = (Number.isFinite(Number(centerLat)) && Number.isFinite(Number(centerLng)))
    ? { lat: Number(centerLat), lng: Number(centerLng) }
    : null;
  let geo = center ? { district: '', state: '' } : null;
  if (!center) {
    geo = await geocode(city);
    if (!geo) {
      deps.logger(`[OpenStreetMap] Could not find "${city}" — skipping.`);
      return { totalScraped: 0, newInserted: 0, updated: 0, phoneCount: 0 };
    }
    center = { lat: geo.lat, lng: geo.lng };
  }

  const isMetro = /hyderabad|bangalore|bengaluru|mumbai|delhi|chennai|kolkata|pune|ahmedabad|guntur|vijayawada/i.test(city);
  const defaultKm = isMetro ? 32 : 12;
  const radiusMeters = Math.max(1000, Math.min(35000, (Number(radiusKm) || defaultKm) * 1000));
  const around = `(around:${Math.round(radiusMeters)},${center.lat.toFixed(5)},${center.lng.toFixed(5)})`;
  const body = filters.map(filter => `nwr${filter}${around};`).join('\n  ');
  const query = `[out:json][timeout:12];\n(\n  ${body}\n);\nout center tags ${MAX_RESULTS};`;

  const cacheKey = `osm-${city}-${baseCategory}-${Math.round(radiusMeters / 1000)}`;
  let payload = readCache(cacheKey);
  if (!payload) {
    try {
      const response = await politeOverpass(query);
      payload = response.data;
      writeCache(cacheKey, payload);
    } catch (error) {
      deps.logger(`[OpenStreetMap] Query failed: ${error.message}`);
      return { totalScraped: 0, newInserted: 0, updated: 0, phoneCount: 0 };
    }
  } else {
    deps.logger(`[OpenStreetMap] Reusing today's cached answer for "${baseCategory}" in "${city}".`);
  }

  const elements = Array.isArray(payload?.elements) ? payload.elements : [];
  deps.logger(`[OpenStreetMap] ${elements.length} public OSM places matched "${baseCategory}" within ${Math.round(radiusMeters / 1000)} km of ${city}.`);

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

    const phones = pickPhones(element);
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
      const tenDigits = String(primaryMobile.national || primaryMobile.e164).replace(/\D/g, '').slice(-10);
      vendor.whatsapp = `https://wa.me/91${tenDigits}`;
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
    mobileCount
  };
}

module.exports = { scrapeOpenStreetMap, setDeps };
