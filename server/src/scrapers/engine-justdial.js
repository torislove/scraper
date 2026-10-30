/**
 * JustDial engine — live mobile results API.
 *
 * The desktop listing page is aggressively bot-gated and often returns an
 * empty shell. JustDial's own mobile results endpoint, however, returns the
 * complete vendor payload used by the JustDial Android web app:
 *   - business name, area, city, exact latitude/longitude
 *   - rating and review count
 *   - working hours and open/closed status
 *   - every phone number attached to the listing (mobiles + landlines)
 *   - catalogue images and the public profile link
 *
 * We resolve a category's JustDial `ncatid` through the public autosuggest
 * endpoint, then POST the same request the mobile app makes. No browser and
 * no fragile DOM selectors, so this engine is fast and deterministic.
 *
 * Every number is validated with libphonenumber before it is saved. Numbers
 * shared by three or more unrelated listings are treated as a directory
 * helpline and dropped. Nothing is invented: missing values stay empty.
 */

const axios = require('axios');
const https = require('https');
const dbAdapter = require('../config/dbAdapter');
const dv = require('./directoryVendor');
const fidelity = require('../services/categoryFidelity');
const { extractPhones } = require('../utils/phoneUtils');

const httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
];

const DEVICE_ID = '59e8afb06077a1793194377810Fgs4xk4vux6lnhiElsq4Bu33nFnp4E4wrACo';
const SUGGEST_URL = 'https://www.justdial.com/webmain/ftxt.php';
const RESULTS_URL = 'https://m.justdial.com/verticals/hotel/searchziva?&srating=&lat=&gbotrate=0&lng=&returnurl=1&source=2&native=&version=&hide_header=&areaname=&ccode=&scode=&frst_text=&last_text=&nh=&search_option=&travel=';

// Numbers JustDial itself prints/uses. These must never become leads.
const BLOCKED_NUMBERS = new Set([
  '+919967462575',
  '+919925252525',
  '+918124222266',
  '+918888888888',
  '+919999999999',
  '+911141444444'
]);

// JustDial sometimes emits a promo/section header as a data row. The row still
// carries a real address and phone, but its "name" is a UI label, not a
// business. Storing it would create a vendor literally called "Results".
const GENERIC_ROW_NAMES = new Set([
  'results', 'result', 'sponsored', 'sponsored listing', 'sponsored listings',
  'advertisement', 'advertisements', 'justdial', 'search results', 'top results',
  'nearby', 'popular', 'featured', 'see more', 'view more', 'load more'
]);

// The raw payload occasionally wraps the label in markup or emoji
// (`<b>Results</b>`, `✨ Results`). Normalise before comparing so the guard is
// not defeated by presentation noise.
function normaliseRowName(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isGenericRowName(value) {
  const key = normaliseRowName(value);
  if (!key) return true;
  if (GENERIC_ROW_NAMES.has(key)) return true;
  // "Results for Plumbers in Vijayawada" is still a header.
  return /^(results?|search results?|top results?|sponsored( listings?)?)\b/.test(key);
}

// Category fan-out. Each variant is resolved to its own JustDial ncatid, so a
// single city query can cover related marketplace categories without guessing.
const VARIANT_RULES = [
  { test: /album|color lab|colour lab|photo book|photobook|karizma|canvera/i, variants: ['Photo Album Manufacturers', 'Digital Color Laboratories', 'Wedding Album Printers', 'Photo Book Printing Services', 'Digital Photo Printing Services', 'Offset Printers'] },
  { test: /print|flex|offset|screen print|dtp|banner|visiting card|brochure/i, variants: ['Printing Services', 'Offset Printers', 'Digital Printers', 'Flex Printing Services', 'Printing Press', 'Screen Printers'] },
  { test: /solar|inverter|battery|ups/i, variants: ['Solar Panel Dealers', 'Inverter Dealers', 'Battery Dealers', 'Solar Power System Dealers', 'UPS Dealers'] },
  { test: /cctv|surveillance|security camera|biometric/i, variants: ['CCTV Dealers', 'Security System Dealers', 'CCTV Installation Services', 'Biometric Attendance System Dealers'] },
  { test: /water purifier|ro repair|aquaguard|water filter/i, variants: ['Water Purifier Dealers', 'Water Purifier Repair & Services', 'RO Water Purifier Dealers', 'Water Treatment Plant Manufacturers'] },
  { test: /interior|modular kitchen|false ceiling|wardrobe/i, variants: ['Interior Designers', 'Modular Kitchen Dealers', 'False Ceiling Contractors', 'Interior Decorators'] },
  { test: /fabricat|welder|grill|gate|shed|steel fabricat/i, variants: ['Fabrication Contractors', 'Steel Fabricators', 'Aluminium Fabricators', 'Iron Grill Fabricators'] },
  { test: /borewell|drilling|submersible/i, variants: ['Borewell Drilling Contractors', 'Submersible Pump Dealers', 'Borewell Contractors'] },
  { test: /car wash|car detailing|car polish|ceramic coat/i, variants: ['Car Washing Services', 'Car Detailing Services', 'Car Polishers', 'Automobile Cleaning Services'] },
  { test: /astrolog|pandit|purohit|jyotish|pooja|vastu/i, variants: ['Astrologers', 'Pandits For Pooja', 'Vastu Shastra Consultants', 'Purohits'] },
  { test: /ca\b|chartered accountant|tax consultant|gst/i, variants: ['Chartered Accountants', 'Tax Consultants', 'GST Consultants', 'Accounting & Bookkeeping Services'] },
  { test: /travel|cab|car rental|taxi|tour/i, variants: ['Car Rental', 'Taxi Services', 'Tour Operators', 'Travel Agents', 'Bus Services'] },
  { test: /plumb/i, variants: ['Plumbers', 'Plumber Contractors', 'Plumbing Contractors', 'Water Tank Cleaning Services', 'Borewell Contractors'] },
  { test: /electric/i, variants: ['Electricians', 'Electrical Contractors', 'Electrical Repair Services', 'AC Repair Services', 'Electrical Installation Services'] },
  { test: /carpent|woodwork/i, variants: ['Carpenters', 'Carpentry Services', 'Furniture Manufacturers', 'Modular Kitchen Dealers'] },
  { test: /paint/i, variants: ['Painters', 'Painting Contractors', 'Painting Services', 'Waterproofing Services'] },
  { test: /pest/i, variants: ['Pest Control Services', 'Pest Control', 'Fumigation Services', 'Termite Control Services'] },
  { test: /packer|mover/i, variants: ['Packers And Movers', 'Movers And Packers', 'Transporters', 'Cargo Services'] },
  { test: /ac repair|air condition/i, variants: ['AC Repair Services', 'Air Conditioner Dealers', 'AC Installation Services', 'AC Repair & Services'] },
  { test: /salon|parlour|parlor|beauty/i, variants: ['Beauty Parlours', 'Salons', 'Spa', 'Hair Salons'] },
  { test: /banquet|marriage hall|wedding venue|mandap|kalyana|reception/i, variants: ['Banquet Halls', 'Wedding Venues', 'Marriage Halls', 'Convention Halls'] },
  { test: /wedding planner|wedding decor|decorator/i, variants: ['Wedding Planners', 'Wedding Decorators', 'Event Organizers', 'Wedding Planners & Decorators'] },
  { test: /photograph|videograph/i, variants: ['Photographers', 'Wedding Photographers', 'Video Graphers', 'Photography Studios'] },
  { test: /cater/i, variants: ['Caterers', 'Wedding Caterers', 'Food Catering Services', 'Catering Services'] },
  { test: /dental|dentist/i, variants: ['Dental Clinics', 'Dentists', 'Dental Hospitals', 'Dental Implant Centres'] },
  { test: /clinic|doctor|physician/i, variants: ['Clinics', 'Doctors', 'Medical Clinics', 'Polyclinics'] },
  { test: /hospital/i, variants: ['Hospitals', 'Multispeciality Hospitals', 'Nursing Homes', 'Clinics'] },
  { test: /restaurant|cafe|dining|food/i, variants: ['Restaurants', 'Cafes', 'Fast Food Outlets', 'Family Restaurants'] },
  { test: /car showroom|car dealer|automobile|motor/i, variants: ['Car Showrooms', 'Car Dealers', 'Automobile Dealers', 'Used Car Dealers'] },
  { test: /bike|scooter/i, variants: ['Bike Showrooms', 'Two Wheeler Dealers', 'Bike Service Centres', 'Motorcycle Dealers'] },
  { test: /garage|car service/i, variants: ['Car Service Centres', 'Garages', 'Car Repair Services', 'Auto Repair Shops'] },
  { test: /school|college|coaching|tuition|institute/i, variants: ['Schools', 'Coaching Classes', 'Educational Institutes', 'Play Schools'] },
  { test: /lawyer|advocate|legal/i, variants: ['Lawyers', 'Advocates', 'Legal Consultants', 'Law Firms'] },
  { test: /builder|real estate|property|realtor/i, variants: ['Real Estate Agents', 'Builders', 'Property Dealers', 'Real Estate Developers'] },
  { test: /supplier|wholesaler|distributor|manufacturer/i, variants: ['Suppliers', 'Wholesalers', 'Manufacturers', 'Distributors'] },
  { test: /hotel|resort|guest house/i, variants: ['Hotels', 'Resorts', 'Guest Houses', 'Lodges'] },
  { test: /gym|fitness/i, variants: ['Gyms', 'Fitness Centres', 'Yoga Classes', 'Personal Trainers'] },
  { test: /tattoo/i, variants: ['Tattoo Artists', 'Tattoo Studios', 'Tattoo Shops', 'Tattoo Artists & Studios'] }
];

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

function clean(value, max = 300) {
  return dv.cleanText(value, max);
}

function pickUserAgent(index = 0) {
  return USER_AGENTS[Math.abs(index) % USER_AGENTS.length];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function titleCase(value) {
  return clean(value).replace(/\b([a-z])/g, (m, c) => c.toUpperCase());
}

function buildVariants(category) {
  const base = clean(category, 120) || 'Business';
  const list = [];
  const seen = new Set();
  const push = value => {
    const label = clean(value, 120);
    const key = label.toLowerCase();
    if (!label || seen.has(key)) return;
    seen.add(key);
    list.push(label);
  };
  push(base);
  for (const rule of VARIANT_RULES) {
    if (!rule.test.test(base)) continue;
    for (const variant of rule.variants) push(variant);
    break;
  }
  if (list.length === 1) push(`${base} Services`);
  return list.slice(0, 5);
}

function tokenSet(value) {
  return new Set(
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2 && !['the', 'and', 'for', 'near', 'best', 'top', 'services', 'service', 'dealers', 'dealer', 'shops', 'shop', 'centres', 'centre', 'center', 'stores', 'store'].includes(token))
  );
}

function sharesToken(a, b) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  for (const token of left) {
    if (right.has(token)) return true;
  }
  return !left.size || !right.size;
}

function resolveGeo(location) {
  try {
    const indiaGeoIndex = require('../utils/indiaGeoIndex');
    const resolved = indiaGeoIndex.resolveQuick(location);
    if (resolved) {
      return {
        city: resolved.city || resolved.name || '',
        district: resolved.district || '',
        state: resolved.state || '',
        lat: resolved.lat || null,
        lng: resolved.lng || null
      };
    }
  } catch (e) { /* geo index is optional */ }
  return { city: '', district: '', state: '', lat: null, lng: null };
}

/**
 * Resolve the JustDial national category id (ncatid) for a category label.
 */
async function lookupCategoryId(label, city, attempt = 0) {
  const params = new URLSearchParams({
    source: '77',
    wap: '77',
    version: '2.9',
    user: '1',
    search: label,
    city: city || '',
    deviceId: DEVICE_ID,
    dtcity: '',
    area: '',
    dlat: '',
    dlon: '',
    freetext: '1',
    voice: '',
    act: '',
    case: 'auto_search',
    dtarea: '',
    format: '1',
    vs: '1601'
  });

  try {
    const response = await axios.get(`${SUGGEST_URL}?${params.toString()}`, {
      timeout: 15000,
      httpsAgent,
      responseType: 'text',
      headers: {
        'User-Agent': pickUserAgent(attempt),
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-IN,en;q=0.9',
        'Referer': 'https://www.justdial.com/',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    const text = String(response.data || '').replace(/^\uFEFF/, '').trim();
    if (!text.startsWith('{')) return null;
    const payload = JSON.parse(text);
    const results = Array.isArray(payload.results) ? payload.results : [];
    const categories = results.filter(item => item && item.type === 1 && (item.id || item.ncatid));
    const exact = categories.find(item => sharesToken(item.value || item.disp || '', label));
    const chosen = exact || categories[0];
    if (!chosen) return null;

    const id = Number(chosen.id || chosen.ncatid);
    if (!Number.isFinite(id) || id <= 0) return null;
    return {
      id,
      label: clean(chosen.value || chosen.disp || label, 120),
      outletCount: Number(chosen.outlet_count) || 0
    };
  } catch (error) {
    if (attempt < 1) {
      await sleep(250);
      return lookupCategoryId(label, city, attempt + 1);
    }
    deps.logger(`[JustDial] Category lookup failed for "${label}": ${error.message}`);
    return null;
  }
}

/**
 * POST the mobile results endpoint. This is the exact request the JustDial
 * mobile web app sends; it returns JSON, not HTML.
 */
async function fetchListing({ ncatid, label, city, state, area = '', attempt = 0 }) {
  const body = new URLSearchParams({
    action: 'result',
    ncatid: String(ncatid),
    ccode: 'in',
    scode: state || '',
    areaname: area || '',
    searchcity: city,
    geolong: '',
    geolat: '',
    prop: '',
    attributeValue: '',
    Vprice: '',
    search_option: ''
  });

  const slugCity = dv.slug(city) || 'India';
  const slugCategory = dv.slug(label) || 'Business';
  const referer = `https://m.justdial.com/${slugCity}/${slugCategory}/nct-${ncatid}?source=2&searchcity=${encodeURIComponent(city)}`;

  try {
    const response = await axios.post(RESULTS_URL, body.toString(), {
      timeout: 20000,
      httpsAgent,
      responseType: 'text',
      headers: {
        'User-Agent': pickUserAgent(attempt + 1),
        'Accept': '*/*',
        'Accept-Language': 'en-IN,en;q=0.9',
        'Referer': referer,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      }
    });

    const text = String(response.data || '').trim();
    if (!text.startsWith('{')) {
      throw new Error(`non-JSON response (${text.slice(0, 60)})`);
    }
    const payload = JSON.parse(text);
    const data = payload.getResultData;
    if (!data || !data.results) return null;
    return data;
  } catch (error) {
    if (attempt < 1) {
      await sleep(400);
      return fetchListing({ ncatid, label, city, state, attempt: attempt + 1 });
    }
    deps.logger(`[JustDial] Listing fetch failed for ${label} in ${city}: ${error.message}`);
    return null;
  }
}

function collectPhoneStrings(row) {
  const out = [];
  const push = value => {
    if (typeof value === 'string' && value.trim()) out.push(value);
    else if (typeof value === 'number' && Number.isFinite(value)) out.push(String(value));
  };

  // Positional columns used by the mobile API.
  push(row[15]);
  if (row[23] && typeof row[23] === 'object') {
    push(row[23].l);
    push(row[23].m);
    push(row[23].t);
  }
  if (row[51] && typeof row[51] === 'object') {
    push(row[51].contactdisplay);
    push(row[51].contactdial);
    push(row[51].contactpopup);
  }

  // CALL buttons carry the fully revealed number list.
  for (const bucket of [row[26], row[29]]) {
    if (!bucket || typeof bucket !== 'object') continue;
    const lists = bucket.other?.actionurl || bucket.actionurl || [];
    for (const item of Array.isArray(lists) ? lists : []) {
      push(item.button_url);
      push(item.button_text);
      if (Array.isArray(item.val)) item.val.forEach(push);
    }
  }

  return out;
}

function collectPhones(row) {
  const byNumber = new Map();
  for (const candidate of collectPhoneStrings(row)) {
    if (!candidate || candidate.length > 80) continue;
    if (/^https?:\/\//i.test(candidate)) continue;
    const phones = extractPhones(candidate, { context: 'contact call mobile tel phone number' });
    for (const phone of phones) {
      if (!phone || !phone.e164) continue;
      if (BLOCKED_NUMBERS.has(phone.e164)) continue;
      byNumber.set(phone.e164, phone);
    }
  }
  return [...byNumber.values()].sort((a, b) => Number(b.isMobile) - Number(a.isMobile));
}

function parseHours(row) {
  const hours = row[11];
  if (!hours || typeof hours !== 'object') return { text: '', table: [] };
  const status = clean(hours.status, 40);
  const timing = clean(hours.timing, 160);
  const text = [status, timing].filter(Boolean).join(' · ');
  const table = timing ? [{ day: 'All days', hours: timing }] : [];
  return { text, table };
}

function extractProfileUrl(row) {
  const shareText = String(row[32] || '');
  const match = shareText.match(/https:\/\/www\.justdial\.com\/[^\s"']+/i);
  return match ? match[0] : '';
}

/**
 * JustDial packs two different things into its category column: a precise
 * trade label ("Electricians For Building") or a comma-separated service list
 * ("North Indian, Chinese, Biryani, ..."). Lists belong in `services`, not in
 * the primary category, otherwise a restaurant's category becomes a cuisine.
 */
function splitCategoryDetail(value) {
  const raw = clean(value, 300);
  if (!raw) return { label: '', services: [] };
  const parts = raw.split(',').map(part => part.trim()).filter(Boolean);
  const looksLikeList = parts.length >= 3 || (parts.length >= 2 && raw.length > 60);
  if (!looksLikeList) return { label: raw, services: [] };
  return { label: '', services: [...new Set(parts)].slice(0, 24) };
}

function parseRow(row, context) {
  if (!Array.isArray(row)) return null;
  const name = clean(row[1], 240);
  if (!name || name.length < 2) return null;
  if (isGenericRowName(name)) return null;

  const phones = collectPhones(row);
  const ratings = dv.parseRating(row[7]);
  const reviewCount = dv.parseReviewCount(row[16] || row[20] || '');
  const hours = parseHours(row);
  const area = clean(row[12], 120);
  const rowCity = clean(row[18], 120);
  const city = context.city || titleCase(rowCity);
  const address = dv.joinAddressParts([row[3], area, city, context.state], 700);
  const pincode = dv.extractPincode(address);
  const lat = Number(row[4]);
  const lng = Number(row[5]);
  const safeLat = Number.isFinite(lat) && lat >= 6 && lat <= 38 ? lat : null;
  const safeLng = Number.isFinite(lng) && lng >= 68 && lng <= 98 ? lng : null;
  const images = [...new Set([
    row[19],
    row[31],
    row[34],
    ...(Array.isArray(row[47]) ? row[47] : [])
  ].filter(value => typeof value === 'string' && /^https?:\/\//i.test(value) && !/\.svg(\?|$)/i.test(value)))].slice(0, 12);
  const verified = JSON.stringify(row[22] || '').includes('JdVerified') || String(row[40] || '').toUpperCase() === 'P';
  const distance = Number(row[50]);

  return {
    docId: clean(row[0], 160),
    name,
    rowCategory: clean(row[14], 160),
    area,
    city,
    address,
    pincode,
    latitude: safeLat,
    longitude: safeLng,
    rating: ratings,
    reviewCount,
    hours: hours.text,
    hoursTable: hours.table,
    phones,
    images,
    profileUrl: extractProfileUrl(row),
    verified,
    distanceMeters: Number.isFinite(distance) ? distance : null,
    status: clean(row[11]?.status, 40),
    timing: clean(row[11]?.timing, 160)
  };
}

/**
 * Reject numbers that appear on three or more unrelated listings. These are
 * directory helplines, booking aggregators or ad call-tracking numbers.
 */
function dropSharedHelplines(vendors) {
  const owners = new Map();
  for (const vendor of vendors) {
    for (const phone of vendor.phones) {
      if (!owners.has(phone.e164)) owners.set(phone.e164, new Set());
      owners.get(phone.e164).add(vendor.docId || vendor.name);
    }
  }

  const shared = new Set();
  for (const [phone, set] of owners.entries()) {
    if (set.size >= 3) shared.add(phone);
  }

  for (const vendor of vendors) {
    if (!shared.size) continue;
    const kept = vendor.phones.filter(phone => !shared.has(phone.e164));
    if (kept.length) {
      vendor.phones = kept;
    } else {
      // Keep the only remaining contact but mark it as shared so the UI can
      // show the caveat instead of silently pretending it is exclusive.
      vendor.sharedPhone = true;
    }
  }

  return { sharedCount: shared.size };
}

async function scrapeJustDial(category, location, sessionId = 'legacy') {
  const startedAt = Date.now();
  const baseCategory = clean(category, 120) || 'Business';
  const cityInput = clean(location, 120) || 'India';
  const geo = resolveGeo(cityInput);
  const city = titleCase(geo.city) || titleCase(cityInput);
  const state = geo.state || '';

  deps.logger(`[JustDial] API scrape: "${baseCategory}" in "${city}"${state ? `, ${state}` : ''}`);

  if (deps.abortSignal && deps.abortSignal.aborted) return { totalScraped: 0, newInserted: 0, updated: 0, phoneCount: 0 };

  const labels = buildVariants(baseCategory);
  const parsed = [];
  const seenRows = new Set();
  const seenNames = new Set();

  // Resolve every variant in parallel, then fetch every unique ncatid in
  // parallel. Sequential requests made first-lead latency scale with the
  // number of variants (4 categories ≈ 7s); this keeps it around one round
  // trip while still deduping categories that collapse to the same ncatid.
  const lookupResults = await Promise.allSettled(labels.map(label => lookupCategoryId(label, city)));
  const resolvedCategories = [];
  const seenCategories = new Set();
  for (const result of lookupResults) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    const resolved = result.value;
    if (seenCategories.has(resolved.id)) continue;
    seenCategories.add(resolved.id);
    resolvedCategories.push(resolved);
  }

  // Harvest orchestrated areas for the city/mandal to sweep high-density local nodes
  let targetAreas = [''];
  try {
    const { resolveUniversalZones } = require('../utils/universalGeoCluster');
    const targetZones = resolveUniversalZones(city, baseCategory);
    const subAreas = targetZones
      .map(z => z.zoneName)
      .filter(z => !z.toLowerCase().includes('central') && !z.toLowerCase().includes('core'))
      .slice(0, 8);
    if (subAreas.length) targetAreas = ['', ...subAreas];
  } catch (e) {}

  const fetchTasks = [];
  for (const resolved of resolvedCategories) {
    for (const area of targetAreas) {
      fetchTasks.push({
        ncatid: resolved.id,
        label: resolved.label,
        city,
        state,
        area
      });
    }
  }

  const listingResults = await Promise.allSettled(fetchTasks.map(t => fetchListing(t)));

  for (let index = 0; index < fetchTasks.length; index++) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;
    if (parsed.length >= 300) break; // Uncapped from 36 to 300 for high yield

    const task = fetchTasks[index];
    const listing = listingResults[index];
    if (listing.status !== 'fulfilled' || !listing.value) continue;

    const data = listing.value;
    if (!data || !Array.isArray(data.results?.data)) continue;

    const rows = data.results.data;
    let added = 0;
    for (const row of rows) {
      const vendor = parseRow(row, {
        category: task.label || baseCategory,
        city,
        state
      });
      if (!vendor) continue;

      const rowKey = vendor.docId || `${dv.normalizeName(vendor.name)}|${dv.slug(vendor.area)}`;
      if (seenRows.has(rowKey)) continue;

      const nameKey = `${dv.normalizeName(vendor.name)}|${dv.slug(vendor.area || vendor.city)}`;
      if (seenNames.has(nameKey)) continue;

      seenRows.add(rowKey);
      seenNames.add(nameKey);
      vendor.categoryLabel = task.label || baseCategory;
      vendor.categoryId = task.ncatid;
      vendor.queryLabel = task.label || baseCategory;
      parsed.push(vendor);
      added += 1;
    }

    if (added > 0) {
      deps.logger(`[JustDial] ${task.label}${task.area ? ` (${task.area})` : ''} → ${rows.length} rows, ${added} new, total: ${parsed.length}.`);
    }
  }

  if (!parsed.length) {
    deps.logger(`[JustDial] No live listings returned for "${baseCategory}" in "${city}". The city may not exist in JustDial's directory.`);
    return { totalScraped: 0, newInserted: 0, updated: 0, phoneCount: 0 };
  }

  const shared = dropSharedHelplines(parsed);
  const primaryCategory = titleCase(baseCategory) || 'Business';
  let created = 0;
  let updated = 0;
  let phoneCount = 0;
  let mobileCount = 0;

  for (const item of parsed) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;

    const detail = splitCategoryDetail(item.rowCategory);
    const subcategory = detail.label && detail.label.toLowerCase() !== primaryCategory.toLowerCase()
      ? detail.label
      : '';

    const vendor = dv.buildDirectoryVendor({
      prefix: 'jd',
      sessionId,
      source: 'JustDial',
      sourceEngine: 'justdial',
      name: item.name,
      category: primaryCategory,
      subcategory,
      services: detail.services,
      address: item.address,
      locality: item.area || city,
      city: item.city || city,
      district: geo.district || '',
      state: state,
      pincode: item.pincode,
      latitude: item.latitude,
      longitude: item.longitude,
      rating: item.rating,
      reviewCount: item.reviewCount,
      hours: item.hours,
      hoursTable: item.hoursTable,
      images: item.images,
      logo: item.images[0] || '',
      profileUrl: item.profileUrl,
      phones: item.phones,
      tags: [
        'justdial',
        item.verified ? 'jd-verified' : '',
        item.sharedPhone ? 'shared-phone' : ''
      ].filter(Boolean),
      otherInfo: {
        justdialDocId: item.docId,
        justdialCategoryId: item.categoryId,
        justdialQuery: item.queryLabel,
        sourceCategory: item.rowCategory,
        area: item.area,
        status: item.status,
        timing: item.timing,
        distanceMeters: item.distanceMeters,
        verifiedListing: item.verified,
        sharedPhone: Boolean(item.sharedPhone),
        mobileNumbers: item.phones.filter(phone => phone.isMobile).map(phone => phone.e164)
      },
      sourceProvenance: [{
        field: 'listing',
        source: 'JustDial mobile results API',
        sourceUrl: item.profileUrl || `https://www.justdial.com/${dv.slug(city)}/${dv.slug(item.categoryLabel || baseCategory)}/nct-${item.categoryId}`,
        extractedAt: new Date().toISOString()
      }]
    });

    if (!vendor.name) continue;

    // Category fidelity: keep only vendors that match the requested category.
    if (!fidelity.isVendorRelevant(vendor, primaryCategory)) continue;

    // JustDial's CALL numbers are phone contacts, not confirmed WhatsApp.
    vendor.whatsapp = '';
    vendor.whatsappAvailable = false;

    const result = dv.saveDirectoryVendor(vendor, sessionId);
    if (!result.vendor) continue;
    phoneCount += (result.vendor.phones || []).filter(phone => phone && phone.e164).length;
    mobileCount += (result.vendor.phones || []).filter(phone => phone && phone.isMobile).length;

    if (result.created) {
      created += 1;
      try { deps.emitVendorEvent(result.vendor, 'inserted'); } catch (e) {}
    } else {
      updated += 1;
      try { deps.emitVendorEvent(result.vendor, 'updated'); } catch (e) {}
    }
  }

  try { if (typeof dbAdapter.flushSync === 'function') dbAdapter.flushSync(); } catch (e) {}

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  deps.logger(`[JustDial] Complete in ${elapsed}s. ${parsed.length} live vendors, ${created} new, ${updated} refreshed, ${mobileCount} mobile numbers, ${shared.sharedCount} shared helplines filtered.`);

  return {
    totalScraped: parsed.length,
    newInserted: created,
    updated,
    phoneCount,
    mobileCount,
    sharedFiltered: shared.sharedCount,
    categories: resolvedCategories.map(item => ({ id: item.id, label: item.label }))
  };
}

module.exports = { scrapeJustDial, setDeps, isGenericRowName, normaliseRowName };
