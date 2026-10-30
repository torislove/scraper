/**
 * Shared helpers for directory engines (JustDial, IndiaMART, Mandap,
 * WeddingBazaar, WeddingWire).
 *
 * Goals:
 *  - Never invent data. Missing values stay empty and are rendered as Unknown.
 *  - Never store a site helpline / support number as a vendor phone.
 *  - Merge conservatively so a fresh shallow scrape cannot erase a richer
 *    record created by a previous deep extraction.
 *  - Track every session that has seen the vendor without duplicating the row.
 */

const crypto = require('crypto');
const dbAdapter = require('../config/dbAdapter');
const phoneUtils = require('../utils/phoneUtils');

const INDIAN_STATES = new Set([
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa',
  'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala',
  'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland',
  'odisha', 'orissa', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 'telangana',
  'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi', 'delhi ncr',
  'jammu and kashmir', 'ladakh', 'puducherry', 'pondicherry', 'chandigarh',
  'andaman and nicobar islands', 'dadra and nagar haveli and daman and diu',
  'daman and diu', 'lakshadweep'
]);

function cleanText(value, max = 2000) {
  return String(value == null ? '' : value)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function cleanMultiline(value, max = 4000) {
  return String(value == null ? '' : value)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

function slug(value) {
  return cleanText(value, 200)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeName(value) {
  return cleanText(value, 240)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(pvt|private|ltd|limited|llp|inc|co|company|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const GENERIC_LABEL = /^(?:results?|search results?|top results?|sponsored(?: listing| by)?|advertisement|featured(?: listing)?|listing(?: results?)?|view all|load more|show more|booking\.com\??|justdial|indiamart|weddingbazaar|mandap\.com|sulekha)$/i;

function nameFromProfileUrl(url) {
  const raw = cleanText(url, 1000);
  if (!raw) return '';
  try {
    const pathname = new URL(raw, 'https://example.com').pathname;
    const segment = pathname.split('/').filter(Boolean).pop() || '';
    const words = segment.replace(/\.[a-z0-9]+$/i, '').replace(/-in-.*$/i, '').replace(/[-_]+/g, ' ').trim();
    if (!words || words.length < 3) return '';
    return words.replace(/\b\w/g, c => c.toUpperCase());
  } catch (e) {
    return '';
  }
}

function parseRating(value) {
  if (value == null || value === '') return '';
  const match = String(value).replace(',', '.').match(/([0-5](?:\.\d{1,2})?)/);
  if (!match) return '';
  const n = Number(match[1]);
  return Number.isFinite(n) && n >= 0 && n <= 5 ? n : '';
}

function parseReviewCount(value) {
  if (value == null || value === '') return '';
  const text = String(value).replace(/,/g, '');
  if (/no\s+reviews?/i.test(text)) return 0;
  const match = text.match(/(\d{1,8})/);
  return match ? Number(match[1]) : '';
}

/**
 * Normalise Indian price strings. Keeps the human-readable range, drops
 * duplicated currency symbols, and appends the unit when it is known.
 */
function parsePrice(value, unitHint = '') {
  const text = cleanText(value, 200);
  if (!text) return '';
  const range = text.match(/(?:₹|rs\.?|inr)\s*([\d][\d,]*(?:\.\d+)?)\s*(?:-|–|to)\s*(?:₹|rs\.?|inr)?\s*([\d][\d,]*(?:\.\d+)?)/i);
  const matches = [...text.matchAll(/(?:₹|rs\.?|inr)\s*([\d][\d,]*(?:\.\d+)?)/gi)].map(m => m[1]);
  const unit = (text.match(/\b(per\s+plate|per\s+day|per\s+person|per\s+event|starting\s+at|onwards)\b/i) || [])[1]
    || cleanText(unitHint, 40);
  const withPrice = priceText => {
    if (!unit) return priceText;
    if (/^starting at$/i.test(unit)) return `Starting at ${priceText}`;
    return `${priceText} ${unit}`;
  };
  if (range) return withPrice(`₹${range[1]} – ₹${range[2]}`);
  if (!matches.length) return unit ? `${text} ${unit}`.trim() : text;
  const unique = [...new Set(matches)];
  return withPrice(unique.length > 1 ? `₹${unique[0]} – ₹${unique[1]}` : `₹${unique[0]}`);
}

function parseCapacity(value) {
  const text = cleanText(value, 120);
  if (!text) return '';
  const range = text.match(/(\d[\d,]*)\s*(?:to|-|–)\s*(\d[\d,]*)/i);
  if (range) {
    const low = range[1].replace(/,/g, '');
    const high = range[2].replace(/,/g, '');
    return low === high ? `${low} guests` : `${low}–${high} guests`;
  }
  const single = text.match(/(\d[\d,]*)/);
  return single ? `${single[1].replace(/,/g, '')} guests` : '';
}

function extractPincode(value) {
  const match = String(value || '').match(/\b([1-9]\d{5})\b/);
  return match ? match[1] : '';
}

function uniqueStrings(list, max = 60) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    const value = cleanText(item, 400);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

function uniqueLinks(list, max = 40) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    if (!item) continue;
    const url = typeof item === 'string' ? item : (item.url || '');
    const label = typeof item === 'string' ? '' : cleanText(item.label || item.name || '', 120);
    if (!/^https?:\/\//i.test(url) && !/^\/\//.test(url)) continue;
    const absolute = url.startsWith('//') ? `https:${url}` : url;
    if (seen.has(absolute)) continue;
    seen.add(absolute);
    out.push(label ? { label, url: absolute } : absolute);
    if (out.length >= max) break;
  }
  return out;
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ');
}

function parseCityState(location) {
  const parts = String(location || '').split(',').map(part => cleanText(part, 120)).filter(Boolean);
  const city = parts[0] || '';
  let state = '';
  for (let i = parts.length - 1; i >= 1; i--) {
    if (INDIAN_STATES.has(parts[i].toLowerCase())) state = parts[i];
  }
  const district = parts.length > 1 && !INDIAN_STATES.has(parts[1].toLowerCase()) ? parts[1] : '';
  return { city, state, district };
}

function parsePlaceIdFromUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url, 'https://www.google.com');
    const query = parsed.searchParams.get('query') || parsed.searchParams.get('q') || '';
    return cleanText(query, 500);
  } catch (e) {
    return '';
  }
}

function stripVenueNameFromAddress(address, name) {
  let value = cleanText(address, 800);
  if (!value || !name) return value;
  const normalisedName = normalizeName(name);
  if (normalisedName && normalizeName(value).startsWith(normalisedName)) {
    value = value.slice(name.length).replace(/^[\s,–-]+/, '');
  }
  return value.trim();
}

function ensureAbsolute(url, base) {
  const value = cleanText(url, 1200);
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  try {
    return new URL(value, base).toString();
  } catch (e) {
    return '';
  }
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
}

/**
 * Join address parts without duplicating segments that already appear
 * elsewhere in the chain (e.g. "Kanuru, Vijayawada, Vijayawada").
 */
function joinAddressParts(parts, max = 800) {
  const values = [];
  const segments = new Set();
  for (const part of Array.isArray(parts) ? parts : []) {
    const value = cleanText(part, 240);
    if (!value) continue;
    const key = value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key) continue;
    // Compare whole comma-delimited segments, never substrings. A street such
    // as "Hyderabad Rd, Gandi Maisamma" must not suppress the city Hyderabad.
    if (segments.has(key)) continue;
    values.push(value);
    for (const segment of value.split(',')) {
      const normalized = segment.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (normalized) segments.add(normalized);
    }
  }
  return cleanText(values.join(', '), max);
}

function nameFromProfileUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const pathname = new URL(url, 'https://www.google.com').pathname;
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || '';
    const slugPart = last.replace(/--e\d+$/i, '').replace(/-e\d+$/i, '').replace(/\.html?$/i, '');
    if (slugPart && slugPart.length > 2) {
      return slugPart.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
    }
  } catch (e) {}
  return '';
}

/**
 * Build a rich, schema-compatible vendor object from raw directory data.
 */
function buildDirectoryVendor(input = {}) {
  const {
    prefix = 'dir',
    sessionId = 'legacy',
    source = 'Directory',
    sourceEngine = '',
    name = '',
    category = '',
    subcategory = '',
    description = '',
    address = '',
    locality = '',
    city = '',
    district = '',
    state = '',
    pincode = '',
    latitude = null,
    longitude = null,
    rating = '',
    reviewCount = '',
    priceRange = '',
    capacity = '',
    amenities = [],
    services = [],
    products = [],
    payments = [],
    accessibility = [],
    languages = [],
    hours = '',
    hoursTable = [],
    images = [],
    logo = '',
    profileUrl = '',
    mapsUrl = '',
    website = '',
    phone = '',
    phones = [],
    email = '',
    socials = {},
    bookingLinks = [],
    tags = [],
    otherInfo = {},
    sourceProvenance = []
  } = input;

  const cleanCity = cleanText(city, 120);
  let cleanName = cleanText(name, 240);
  const isCoord = /°|\b\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}|\b\d+°\d+.*[NSEW]/i.test(cleanName);
  if (!cleanName || GENERIC_LABEL.test(cleanName) || isCoord) {
    const fromUrl = nameFromProfileUrl(profileUrl);
    if (fromUrl && !isCoord && !GENERIC_LABEL.test(fromUrl)) {
      cleanName = fromUrl;
    } else {
      const loc = cleanCity || cleanText(district, 120) || cleanText(state, 120) || 'India';
      const cat = cleanText(category, 120) || 'Business';
      cleanName = `${cat} in ${loc}`;
    }
  }
  const cleanLocality = cleanText(locality || cleanCity, 160);
  const cleanAddress = cleanText(address, 800);
  const cleanPincode = cleanText(pincode, 10) || extractPincode(cleanAddress);
  const inputPhones = [
    ...(Array.isArray(phones) ? phones : []),
    phone
  ].filter(Boolean);
  const phoneList = inputPhones
    .map(p => typeof p === 'string' ? phoneUtils.normalizePhone(p) : p)
    .filter(p => p && p.isValid !== false && p.e164);
  const bestPhone = phoneList.find(p => p.isMobile) || phoneList[0] || null;
  const imageList = uniqueStrings(images, 30);
  const now = new Date().toISOString();
  const categoryValue = cleanText(category, 120) || 'Business';
  const fingerprint = `${normalizeName(cleanName)}|${slug(cleanCity || cleanLocality)}`;

  return {
    id: makeId(prefix),
    userId: 'admin_1',
    sessionId,
    sessionIds: [sessionId],
    lastSessionId: sessionId,

    name: cleanName,
    normalizedName: normalizeName(cleanName),
    fingerprint,
    category: categoryValue,
    subcategory: cleanText(subcategory, 120),
    description: cleanMultiline(description, 2600),
    tagline: '',
    priceRange: cleanText(priceRange, 120),
    capacity: cleanText(capacity, 80),
    businessStatus: '',

    phone: bestPhone ? bestPhone.e164 : '',
    phones: phoneList,
    whatsapp: bestPhone && bestPhone.isMobile ? bestPhone.e164 : '',
    whatsappAvailable: Boolean(bestPhone && bestPhone.isMobile),
    email: cleanText(email, 240),
    emails: email ? [cleanText(email, 240)] : [],

    address: cleanAddress,
    locality: cleanLocality,
    city: cleanCity || cleanLocality,
    district: cleanText(district, 120),
    state: cleanText(state, 120),
    pincode: cleanPincode,
    coordinates: {
      lat: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
      lng: Number.isFinite(Number(longitude)) ? Number(longitude) : null
    },
    latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
    longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null,

    rating: rating === '' ? '' : Number(rating),
    reviewCount: reviewCount === '' ? '' : Number(reviewCount),
    reviewsCount: reviewCount === '' ? '' : Number(reviewCount),

    website: cleanText(website, 800),
    mapsLink: cleanText(mapsUrl, 1200),
    googleMapsUrl: cleanText(mapsUrl, 1200),
    profileSourceUrl: cleanText(profileUrl, 1200),
    sourceUrl: cleanText(profileUrl || mapsUrl, 1200),

    images: imageList,
    photos: imageList,
    logo: cleanText(logo, 1000) || imageList[0] || '',

    amenities: uniqueStrings(amenities, 80),
    services: uniqueStrings(services, 60),
    products: uniqueStrings(products, 60),
    payments: uniqueStrings(payments, 40),
    accessibility: uniqueStrings(accessibility, 30),
    languages: uniqueStrings(languages, 20),
    bookingLinks: uniqueLinks(bookingLinks, 20),
    menuLink: '',

    businessHours: cleanText(hours, 500),
    operatingHours: cleanText(hours, 500),
    hoursTable: Array.isArray(hoursTable) ? hoursTable.slice(0, 10) : [],

    instagram: cleanText(socials.instagram || '', 500),
    facebook: cleanText(socials.facebook || '', 500),
    linkedin: cleanText(socials.linkedin || '', 500),
    youtube: cleanText(socials.youtube || '', 500),
    twitter: cleanText(socials.twitter || '', 500),
    socials: {
      instagram: cleanText(socials.instagram || '', 500),
      facebook: cleanText(socials.facebook || '', 500),
      linkedin: cleanText(socials.linkedin || '', 500),
      youtube: cleanText(socials.youtube || '', 500),
      twitter: cleanText(socials.twitter || '', 500)
    },

    tags: uniqueStrings(tags, 20),
    otherInfo: otherInfo && typeof otherInfo === 'object' ? otherInfo : {},
    sourceProvenance: Array.isArray(sourceProvenance) ? sourceProvenance.slice(0, 80) : [],

    source,
    sourceEngine: cleanText(sourceEngine || source, 120),
    verified: Boolean(bestPhone),
    aiVerified: false,

    crmStage: 'new',
    crmScore: 20,
    crmNotes: [],
    crmTasks: [],
    assignedTo: null,

    createdAt: now,
    scrapedAt: now,
    lastScrapedAt: now
  };
}

const ARRAY_FIELDS = ['phones', 'images', 'photos', 'amenities', 'services', 'products', 'payments', 'accessibility', 'languages', 'bookingLinks', 'emails', 'tags'];
const NEVER_OVERWRITE = new Set([
  'id', 'userId', 'sessionId', 'sessionIds', 'lastSessionId', 'createdAt',
  'crmStage', 'crmScore', 'crmNotes', 'crmTasks', 'assignedTo'
]);

/**
 * Merge a fresh directory record into an existing vendor without destroying
 * richer data from a previous deep extraction.
 */
function mergeDirectoryVendor(existing, incoming, sessionId) {
  const merged = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if (NEVER_OVERWRITE.has(key)) continue;

    if (ARRAY_FIELDS.includes(key)) {
      const current = Array.isArray(merged[key]) ? merged[key] : [];
      if (key === 'phones') {
        const byNumber = new Map();
        for (const phone of [...current, ...(Array.isArray(value) ? value : [])]) {
          if (!phone) continue;
          if (typeof phone === 'string') { byNumber.set(phone, phone); continue; }
          if (phone.e164) byNumber.set(phone.e164, phone);
        }
        merged[key] = [...byNumber.values()];
      } else if (key === 'bookingLinks') {
        merged[key] = uniqueLinks([...current, ...(Array.isArray(value) ? value : [])]);
      } else {
        merged[key] = uniqueStrings([...current, ...(Array.isArray(value) ? value : [])], 100);
      }
      continue;
    }

    const hasIncoming = value !== '' && value !== null && value !== undefined &&
      !(Array.isArray(value) && value.length === 0) &&
      !(typeof value === 'object' && !Array.isArray(value) && value && Object.keys(value).length === 0);
    if (!hasIncoming) continue;

    if (key === 'phone') {
      const existingPhone = merged.phone;
      const existingIsMobile = phoneUtils.isIndianMobile(existingPhone);
      const incomingPhone = value;
      const incomingIsMobile = phoneUtils.isIndianMobile(incomingPhone);

      if (incomingIsMobile && !existingIsMobile) {
        merged.phone = incomingPhone;
      } else if (existingIsMobile) {
        // Keep existing mobile immutable!
      } else if (incomingPhone) {
        merged.phone = incomingPhone;
      }
      continue;
    }

    if (key === 'address') {
      // Prefer the more specific address, never truncate a richer one.
      if (String(value).length >= String(merged.address || '').length) merged.address = value;
      continue;
    }
    if (key === 'description') {
      if (String(value).length > String(merged.description || '').length) merged.description = value;
      continue;
    }
    if (key === 'coordinates' || key === 'socials') {
      merged[key] = { ...(merged[key] || {}), ...Object.fromEntries(Object.entries(value).filter(([, v]) => v !== '' && v != null)) };
      continue;
    }
    if (key === 'reviewCount' || key === 'reviewsCount') {
      merged[key] = value;
      merged.reviewCount = value;
      merged.reviewsCount = value;
      continue;
    }
    if (key === 'rating') { merged.rating = value; continue; }
    if (key === 'lastScrapedAt' || key === 'scrapedAt') { merged[key] = value; continue; }
    if (key === 'verified') { merged.verified = Boolean(merged.verified || value); continue; }

    // Fill blanks, but refresh source-owned factual fields.
    const refreshable = new Set(['priceRange', 'capacity', 'locality', 'city', 'pincode', 'mapsLink', 'googleMapsUrl', 'profileSourceUrl', 'sourceUrl', 'source', 'sourceEngine']);
    if (refreshable.has(key) || !merged[key]) merged[key] = value;
  }

  const sessions = new Set([...(Array.isArray(existing.sessionIds) ? existing.sessionIds : []), existing.sessionId, sessionId].filter(Boolean));
  merged.sessionIds = [...sessions];
  merged.lastSessionId = sessionId;
  merged.lastScrapedAt = incoming.scrapedAt || new Date().toISOString();
  merged.scrapedAt = merged.lastScrapedAt;
  merged.deepExtractedAt = existing.deepExtractedAt || '';
  merged.deepCompleteness = existing.deepCompleteness;

  return merged;
}

function sameVendor(existing, incoming) {
  if (incoming.profileSourceUrl && existing.profileSourceUrl &&
      incoming.profileSourceUrl.toLowerCase() === existing.profileSourceUrl.toLowerCase()) return true;

  const incomingPhone = (incoming.phones || []).find(p => p && p.e164)?.e164 || incoming.phone;
  const existingPhones = new Set([
    ...(Array.isArray(existing.phones) ? existing.phones.map(p => (p && p.e164) || p) : []),
    existing.phone
  ].filter(Boolean));
  if (incomingPhone && existingPhones.has(incomingPhone)) return true;

  const incomingFingerprint = incoming.fingerprint || `${normalizeName(incoming.name)}|${slug(incoming.city)}`;
  const existingFingerprint = existing.fingerprint || `${normalizeName(existing.name)}|${slug(existing.city)}`;
  if (incomingFingerprint && incomingFingerprint === existingFingerprint) return true;

  const nameMatch = normalizeName(existing.name) === normalizeName(incoming.name) &&
    normalizeName(existing.name).length > 3;
  const cityA = slug(existing.city);
  const cityB = slug(incoming.city);
  if (nameMatch && cityA && cityB && cityA === cityB) return true;

  return false;
}

/**
 * Persist one directory vendor. Returns { vendor, created, updated }.
 */
function saveDirectoryVendor(incoming, sessionId = incoming.sessionId || 'legacy') {
  if (!incoming || !incoming.name || GENERIC_LABEL.test(cleanText(incoming.name, 240))) {
    return { vendor: null, created: false, updated: false, skipped: 'generic-name' };
  }
  const all = dbAdapter.getVendors();
  const existing = all.find(candidate => sameVendor(candidate, incoming));

  if (existing) {
    const merged = mergeDirectoryVendor(existing, incoming, sessionId);
    dbAdapter.saveVendor(existing.userId || 'admin_1', merged);
    return { vendor: merged, created: false, updated: true };
  }

  const vendor = { ...incoming };
  vendor.sessionIds = uniqueStrings([...(vendor.sessionIds || []), sessionId], 50);
  dbAdapter.saveVendor('admin_1', vendor);
  return { vendor, created: true, updated: false };
}

module.exports = {
  cleanText,
  cleanMultiline,
  slug,
  normalizeName,
  parseRating,
  parseReviewCount,
  parsePrice,
  parseCapacity,
  extractPincode,
  decodeHtml,
  parseCityState,
  parsePlaceIdFromUrl,
  stripVenueNameFromAddress,
  joinAddressParts,
  ensureAbsolute,
  uniqueStrings,
  uniqueLinks,
  makeId,
  buildDirectoryVendor,
  mergeDirectoryVendor,
  sameVendor,
  saveDirectoryVendor
};
