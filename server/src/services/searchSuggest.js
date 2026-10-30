/**
 * Live search suggestions for the command console.
 *
 * One request can answer three questions at once:
 *   1. What category did the user mean (with spelling correction)?
 *   2. What place did the user mean (city, mandal, village, district)?
 *   3. What is the clean query that should be dispatched?
 *
 * Everything runs against in-memory indexes, so a keystroke costs
 * a few milliseconds once the India geo index is warm.
 */

const categoryRouter = require('./categoryRouter');
const brandIntel = require('./brandIntel');
const { normalizePrepositionTypos } = require('../utils/queryParser');

const PREPOSITION_SPLIT = /^(.*?)\s+(?:in|near|around|within|at|across)\s+(.+)$/i;
const PLACE_SUFFIX = /^(.*?)\s+(district|mandal|mandals|tehsil|taluk|circle|block|city|town|village|state)$/i;
const SUFFIX_LEVEL = {
  district: 'district',
  mandal: 'mandal',
  mandals: 'mandal',
  tehsil: 'mandal',
  taluk: 'mandal',
  circle: 'mandal',
  block: 'mandal',
  city: 'city',
  town: 'town',
  village: 'village',
  state: 'state'
};
const LEVEL_RANK = { city: 0, town: 1, district: 2, mandal: 3, state: 4, village: 5 };
const LEVEL_LABEL = {
  city: 'City',
  town: 'Town',
  district: 'District',
  mandal: 'Mandal',
  state: 'State',
  village: 'Village'
};
const LOCATION_LEVELS = {
  city: 'city',
  town: 'town',
  village: 'village',
  subdistrict: 'mandal',
  district: 'district',
  state: 'state'
};

let geoIndex = null;
function getGeo() {
  if (!geoIndex) geoIndex = require('../utils/indiaGeoIndex');
  return geoIndex;
}

function clean(value, max = 180) {
  return String(value == null ? '' : value)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function norm(value) {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(value) {
  return clean(value)
    .toLowerCase()
    .replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

const MAJOR_CITIES = [
  'Hyderabad', 'Secunderabad', 'Vijayawada', 'Guntur', 'Visakhapatnam', 'Tirupati',
  'Nellore', 'Kurnool', 'Rajahmundry', 'Rajamahendravaram', 'Kakinada', 'Eluru',
  'Ongole', 'Tenali', 'Mangalagiri', 'Chirala', 'Bapatla', 'Narasaraopet',
  'Chilakaluripet', 'Macherla', 'Piduguralla', 'Sattenapalle', 'Vinukonda',
  'Warangal', 'Khammam', 'Karimnagar', 'Nizamabad', 'Nalgonda', 'Suryapet',
  'Anantapur', 'Kadapa', 'Nandyal', 'Machilipatnam', 'Bhimavaram',
  'Tadepalligudem', 'Srikakulam', 'Vizianagaram', 'Amaravati',
  'Bengaluru', 'Bangalore', 'Mysuru', 'Mysore', 'Mangaluru', 'Mangalore',
  'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Erode',
  'Tiruppur', 'Vellore', 'Tirunelveli', 'Thoothukudi', 'Puducherry',
  'Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane', 'Navi Mumbai',
  'Delhi', 'New Delhi', 'Noida', 'Ghaziabad', 'Faridabad', 'Gurugram', 'Gurgaon',
  'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner',
  'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar',
  'Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Meerut', 'Ghaziabad', 'Moradabad',
  'Bareilly', 'Aligarh', 'Prayagraj', 'Gorakhpur',
  'Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain',
  'Raipur', 'Bhilai', 'Bilaspur', 'Ranchi', 'Jamshedpur', 'Dhanbad',
  'Patna', 'Gaya', 'Muzaffarpur', 'Bhubaneswar', 'Cuttack', 'Rourkela',
  'Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Guwahati',
  'Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala',
  'Dehradun', 'Haridwar', 'Srinagar', 'Jammu', 'Shimla', 'Panaji', 'Goa'
];

const MAJOR_CITY_KEYS = MAJOR_CITIES.map(name => ({ name, key: norm(name) }));

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

function typoBudget(length) {
  if (length <= 4) return 1;
  if (length <= 7) return 2;
  if (length <= 11) return 2;
  return 3;
}

const NAME_ALIASES = {
  'mumbai city': 'Mumbai',
  'mumbai suburban': 'Mumbai',
  'bengaluru urban': 'Bengaluru',
  'bengaluru rural': 'Bengaluru'
};

function canonicalName(item) {
  let name = item.name;
  const alias = NAME_ALIASES[norm(name)];
  if (alias) return alias;
  if ((item.type === 'city' || item.type === 'town') && item.district
    && /\s+(?:Urban|Rural)$/i.test(name) && norm(item.district) !== norm(name)) {
    name = item.district;
  }
  return name;
}

function isRealCorrection(fragment, value) {
  const a = norm(fragment);
  const b = norm(value);
  if (!a || !b || a === b) return false;
  if (b.startsWith(a) || a.startsWith(b)) return false;
  return true;
}

function locationFromResult(item, fragment) {
  const name = canonicalName(item);
  const display = name === item.name && item.display
    ? item.display
    : [name, norm(item.district) !== norm(name) ? item.district : '', item.state].filter(Boolean).join(', ');
  const mandal = item.mandal || item.subDistrict || (item.type === 'subdistrict' ? item.name : '');
  const district = item.district || (item.type === 'district' ? item.name : '');
  const state = item.state || (item.type === 'state' ? item.name : '');
  const level = LOCATION_LEVELS[item.type] || item.type || 'city';
  return {
    value: name,
    display,
    mandal,
    district,
    state,
    level,
    lat: Number.isFinite(Number(item.lat)) ? Number(item.lat) : null,
    lng: Number.isFinite(Number(item.lng)) ? Number(item.lng) : null,
    corrected: isRealCorrection(fragment, name),
    source: item.source || 'geo'
  };
}

function findLocations(fragment, limit = 6) {
  const text = clean(fragment);
  if (text.length < 3) return [];
  try {
    const geo = getGeo();
    const mapped = geo.searchLocations(text, Math.max(limit, 6))
      .map(item => locationFromResult(item, text));
    const seen = new Set();
    return mapped.filter(item => {
      const key = `${norm(item.value)}|${norm(item.state)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, limit);
  } catch (error) {
    return [];
  }
}

/**
 * Fuzzy place lookup restricted to major cities and district names.
 * This avoids the global Fuse index which can jump to an unrelated village.
 */
function findCorrectedLocation(fragment, limit = 6) {
  const text = clean(fragment);
  const query = norm(text);
  if (query.length < 4) return [];

  const budget = typoBudget(query.length);
  const candidates = [];

  for (const city of MAJOR_CITY_KEYS) {
    const distance = levenshtein(query, city.key);
    if (distance <= budget) {
      candidates.push({ name: city.name, distance, rank: 0 });
    }
  }

  try {
    const geo = getGeo();
    for (const district of geo.districtsMap.values()) {
      const key = norm(district.district);
      const distance = levenshtein(query, key);
      if (distance <= Math.min(budget, 2)) {
        candidates.push({ name: district.district, distance, rank: 1 });
      }
    }
  } catch (error) {
    // District map may not be loaded yet; major cities are enough.
  }

  if (!candidates.length) return [];
  candidates.sort((a, b) => a.rank - b.rank || a.distance - b.distance || a.name.length - b.name.length);
  const chosen = candidates[0];
  const canonical = chosen.name;
  const matches = findLocations(canonical, limit);
  return matches.map(match => ({
    ...match,
    corrected: true,
    correctedFrom: text,
    correctedTo: canonical,
    major: chosen.rank === 0
  }));
}

/**
 * Prefer a known major city when the user typed something two keystrokes
 * away from it, even if a tiny village happens to share the misspelling.
 */
function findBestPlace(fragment, limit = 6) {
  const direct = findLocations(fragment, limit);
  const fuzzy = clean(fragment).length >= 4 ? findCorrectedLocation(fragment, 1) : [];

  if (!direct.length) return fuzzy;

  const fuzzyBest = fuzzy[0] || null;
  const directBest = direct[0];
  if (fuzzyBest && fuzzyBest.major
    && (directBest.level === 'village' || directBest.level === 'town')
    && norm(fuzzyBest.value) !== norm(directBest.value)) {
    return [fuzzyBest, ...direct.filter(item => norm(item.value) !== norm(fuzzyBest.value))].slice(0, limit);
  }

  return direct;
}

function resolveExactPlace(fragment) {
  const candidates = findBestPlace(fragment, 6);
  if (!candidates.length) return null;
  const best = candidates[0];
  if (norm(best.value) === norm(fragment)) return { match: best, corrected: false };
  if (best.corrected) return { match: best, corrected: true };
  const exact = candidates.find(item => norm(item.value) === norm(fragment));
  return exact ? { match: exact, corrected: false } : { match: best, corrected: false };
}

/**
 * Split free text without guessing when the user has only typed a service.
 * "plumbers in vij"        -> category "plumbers", location "vij"
 * "plumbers vijayawada"    -> category "plumbers", location "vijayawada"
 * "plumbers"               -> category "plumbers", location ""
 */
function detectFragments(query) {
  const text = normalizePrepositionTypos(clean(query));
  if (!text) return { categoryFragment: '', locationFragment: '', splitBy: 'none' };

  const explicit = text.match(PREPOSITION_SPLIT);
  if (explicit) {
    return {
      categoryFragment: clean(explicit[1]),
      locationFragment: clean(explicit[2]),
      splitBy: 'preposition'
    };
  }

  const words = text.split(/\s+/).filter(Boolean);

  // "Guntur District", "Tenali Mandal", "Guntur City" — the suffix decides the
  // level even when the name exists at several levels.
  if (PLACE_SUFFIX.test(text) && findPlaceVariants(text, 3).length) {
    return {
      categoryFragment: '',
      locationFragment: text,
      splitBy: 'place-with-type',
      locationCorrectedFrom: ''
    };
  }

  // An exact place name wins over a fuzzy category match. This is what makes
  // "Vijayawada", "Tenali" and "Nellore" places instead of categories.
  const directPlaces = findLocations(text, 6);
  const exactPlace = directPlaces.find(place => norm(place.value) === norm(text));
  const exactCategory = categoryRouter.suggestCategories(text, 1).some(match => match.score >= 990);
  if (exactPlace && !exactCategory) {
    return {
      categoryFragment: '',
      locationFragment: exactPlace.value,
      splitBy: 'standalone-location',
      locationCorrectedFrom: ''
    };
  }

  for (let take = Math.min(4, words.length - 1); take >= 1; take--) {
    const suffix = words.slice(-take).join(' ');
    if (suffix.length < 3) continue;
    const prefix = words.slice(0, -take).join(' ');
    if (!prefix) continue;
    if (!categoryRouter.suggestCategories(prefix, 1).length) continue;
    const place = resolveExactPlace(suffix);
    if (place) {
      return {
        categoryFragment: prefix,
        locationFragment: place.match.value,
        locationCorrectedFrom: place.corrected ? suffix : '',
        splitBy: 'trailing-place'
      };
    }
  }

  // Fallback standalone detection for prefix typing ("vijaya", "guntu").
  const prefixPlaces = findLocations(text, 3);
  if (prefixPlaces.length > 0) {
    const isCat = categoryRouter.suggestCategories(text, 1).some(c => c.score >= 950);
    if (!isCat) {
      return {
        categoryFragment: '',
        locationFragment: prefixPlaces[0].value || text,
        locationCorrectedFrom: prefixPlaces[0].corrected ? text : '',
        splitBy: 'standalone-location'
      };
    }
  }

  return { categoryFragment: text, locationFragment: '', locationCorrectedFrom: '', splitBy: 'none' };
}

function buildCategoryInfo(match, rawFragment) {
  if (!match) return null;
  return {
    value: match.label,
    family: match.family,
    familyLabel: match.familyLabel,
    description: match.description,
    engines: match.engines,
    confidence: match.score >= 700 ? 'high' : match.score >= 420 ? 'medium' : 'low',
    raw: clean(rawFragment),
    corrected: Boolean(match.corrected),
    matched: match.matched || match.label
  };
}

// Words that carry no product meaning on their own. They are ignored when
// checking whether a fuzzy category row is really about the typed product.
const GENERIC_TOKENS = new Set([
  'shop', 'shops', 'store', 'stores', 'dealer', 'dealers', 'supplier', 'suppliers',
  'distributor', 'distributors', 'wholesaler', 'wholesalers', 'trader', 'traders',
  'service', 'services', 'centre', 'center', 'centres', 'centers', 'market',
  'near', 'best', 'top', 'the', 'and', 'for', 'with', 'from', 'india'
]);

function meaningfulTokens(value) {
  return norm(value)
    .split(' ')
    .filter(token => token.length >= 3 && !GENERIC_TOKENS.has(token));
}

/**
 * A typo suggestion is only credible when the whole phrase is a few keystrokes
 * away. "plumer" → "Plumbers" qualifies; "amd graphic card" → "Car Wash" does not.
 */
function isPlausibleCorrection(fragment, label) {
  const a = norm(fragment);
  const b = norm(label);
  if (!a || !b) return false;
  const budget = typoBudget(Math.min(a.length, b.length));
  return levenshtein(a, b) <= budget;
}

function filterRelevantCategories(matches, fragment, intent) {
  if (!Array.isArray(matches) || !matches.length) return [];
  const queryTokens = new Set(meaningfulTokens(fragment));
  for (const part of [
    intent && intent.product,
    intent && intent.genericProduct,
    intent && intent.brand && intent.brand.brand
  ]) {
    for (const token of meaningfulTokens(part)) queryTokens.add(token);
  }
  for (const expansion of (intent && intent.expansions) || []) {
    for (const token of meaningfulTokens(expansion)) queryTokens.add(token);
  }
  if (!queryTokens.size) return matches;

  const keep = matches.filter(match => {
    if (Number(match.score || 0) >= 950) return true;
    // The category router flags every fuzzy hit as "corrected", so verify the
    // correction is a plausible typo rather than an unrelated directory.
    if (match.corrected && isPlausibleCorrection(fragment, match.label)) return true;
    return meaningfulTokens(match.label).some(token => queryTokens.has(token));
  });

  // Never return an empty list just because the gate was strict; a single
  // best-effort row is more useful than a blank console.
  return keep.length ? keep : matches.slice(0, 1);
}

/**
 * Every level that shares a name, so "guntur" can ask "city or district?".
 * Direct O(1) map lookups, no fuzzy scan: this is the fast path that runs on
 * every place keystroke.
 */
function findPlaceVariants(text, limit = 6) {
  const raw = clean(text);
  if (raw.length < 3) return [];
  const suffixMatch = raw.match(PLACE_SUFFIX);
  const suffix = suffixMatch ? suffixMatch[2].toLowerCase() : '';
  const base = clean(suffixMatch ? suffixMatch[1] : raw);
  const key = norm(base);
  if (!key) return [];

  const only = suffix ? SUFFIX_LEVEL[suffix] : '';
  const out = [];
  const push = variant => {
    if (!variant) return;
    if (only && variant.level !== only) return;
    const duplicate = out.some(item => item.level === variant.level
      && norm(item.value) === norm(variant.value)
      && norm(item.state) === norm(variant.state));
    if (!duplicate) out.push(variant);
  };

  let geo;
  try {
    geo = getGeo();
  } catch (error) {
    return [];
  }

  const state = geo.statesMap && geo.statesMap.get(key);
  if (state) {
    push({
      value: state.state,
      label: state.state,
      display: `${state.state}, India`,
      level: 'state',
      scope: 'state',
      detail: 'State',
      state: state.state,
      district: '',
      mandal: '',
      lat: null,
      lng: null,
      corrected: false,
      explicit: true
    });
  }

  const district = geo.districtsMap && geo.districtsMap.get(key);
  if (district) {
    push({
      value: `${district.district} District`,
      label: `${district.district} District`,
      display: `${district.district} District, ${district.state}`,
      level: 'district',
      scope: 'district',
      detail: 'District',
      state: district.state,
      district: district.district,
      mandal: '',
      lat: null,
      lng: null,
      corrected: false,
      explicit: true
    });
  }

  const mandals = (geo.subDistrictsMap && geo.subDistrictsMap.get(key)) || [];
  mandals.slice(0, 2).forEach(mandal => {
    push({
      value: `${mandal.subDistrict} Mandal`,
      label: `${mandal.subDistrict} Mandal`,
      display: `${mandal.subDistrict} Mandal, ${mandal.district}, ${mandal.state}`,
      level: 'mandal',
      scope: 'mandal',
      detail: 'Mandal',
      state: mandal.state,
      district: mandal.district,
      mandal: mandal.subDistrict,
      lat: null,
      lng: null,
      corrected: false,
      explicit: true
    });
  });

  for (const item of findLocations(base, 10)) {
    if (norm(item.value) !== key) continue;
    push({
      value: item.value,
      label: item.value,
      display: item.display,
      level: item.level,
      scope: item.level === 'village' ? 'city' : item.level,
      detail: LEVEL_LABEL[item.level] || 'Place',
      state: item.state || '',
      district: item.district || '',
      mandal: item.mandal || '',
      lat: item.lat,
      lng: item.lng,
      corrected: false,
      explicit: true
    });
  }

  return out
    .sort((a, b) => (LEVEL_RANK[a.level] ?? 9) - (LEVEL_RANK[b.level] ?? 9))
    .slice(0, limit);
}

/**
 * @param {object} options
 * @param {string} options.q          full free-text query
 * @param {string} options.category   explicit category fragment (advanced form)
 * @param {string} options.location   explicit location fragment (advanced form)
 * @param {number} options.limit      suggestions per group
 */
function suggest(options = {}) {
  const limit = Math.max(1, Math.min(12, Number(options.limit) || 6));
  const explicitCategory = clean(options.category);
  const explicitLocation = clean(options.location);
  const explicit = Boolean(explicitCategory || explicitLocation);

  let categoryFragment = explicitCategory;
  let locationFragment = explicitLocation;
  let splitBy = explicit ? 'explicit' : 'none';
  let locationCorrectedFrom = '';

  if (!explicit) {
    const parts = detectFragments(options.q || '');
    categoryFragment = parts.categoryFragment;
    locationFragment = parts.locationFragment;
    locationCorrectedFrom = parts.locationCorrectedFrom || '';
    splitBy = parts.splitBy;
  }

  const intent = brandIntel.detect(categoryFragment);
  // The fuzzy category index is deliberately loose (it is tuned for typos), so
  // it also returns near-misses like "Car Wash" for "amd graphic card". Once we
  // know the product/brand, keep only rows that share a meaningful word with
  // the query or its expansions. Exact and corrected matches always survive.
  const categoryMatches = filterRelevantCategories(
    categoryRouter.suggestCategories(categoryFragment, limit),
    categoryFragment,
    intent
  );
  // Named places: return every level that shares the name (city, district,
  // mandal, state), which is what drives the "Guntur city or Guntur district?"
  // chooser. Prefix typing falls back to the fuzzy place search.
  const placeVariants = locationFragment ? findPlaceVariants(locationFragment, limit) : [];
  let locationMatches = placeVariants.length ? placeVariants : findBestPlace(locationFragment, limit);
  const correctedLocation = locationMatches[0]?.corrected ? locationMatches[0] : null;
  if (correctedLocation) locationCorrectedFrom = correctedLocation.correctedFrom || locationFragment;
  else if (!locationMatches.length && locationFragment) {
    locationMatches = findCorrectedLocation(locationFragment, limit);
    if (locationMatches.length) locationCorrectedFrom = locationFragment;
  }

  const bestCategory = buildCategoryInfo(categoryMatches[0], categoryFragment);

  let bestLocation = null;
  const firstLocation = locationMatches[0];
  if (firstLocation && locationFragment.length >= 3) {
    bestLocation = {
      value: firstLocation.value,
      display: firstLocation.display,
      mandal: firstLocation.mandal || '',
      district: firstLocation.district || '',
      state: firstLocation.state || '',
      level: firstLocation.level,
      lat: firstLocation.lat,
      lng: firstLocation.lng,
      raw: locationFragment,
      corrected: firstLocation.corrected || Boolean(locationCorrectedFrom),
      correctedFrom: locationCorrectedFrom || (firstLocation.corrected ? locationFragment : '')
    };
  }

const ENGINE_VECTOR_LABEL_MAP = {
  'google-local-finder': 'Deep Web SERP',
  'maps': 'Geospatial Radar',
  'justdial': 'Direct Telecom Registry',
  'indiamart': 'B2B Supplier Network',
  'weddingbazaar': 'Vendor Directory',
  'weddingwire': 'Vendor Directory',
  'mandap': 'Direct Mandap Index'
};

function formatVectorDetail(engines) {
  if (!Array.isArray(engines) || !engines.length) return 'Geospatial Radar · Direct Telecom';
  const mapped = engines.map(e => ENGINE_VECTOR_LABEL_MAP[e] || 'Geospatial Radar');
  const unique = [...new Set(mapped)];
  return unique.slice(0, 3).join(' · ');
}

  const brandRows = brandIntel.suggest(categoryFragment, 3);

  const suggestions = [
    ...brandRows,
    ...categoryMatches.map(match => ({
      type: 'category',
      value: match.label,
      label: match.label,
      subtitle: match.familyLabel,
      detail: formatVectorDetail(match.engines),
      family: match.family,
      familyLabel: match.familyLabel,
      corrected: match.corrected,
      matched: match.matched || match.label
    })),
    ...locationMatches.map((match, index) => ({
      type: 'location',
      value: match.value,
      label: match.value,
      display: match.display,
      mandal: match.mandal || '',
      district: match.district || '',
      state: match.state || '',
      subtitle: [
        match.mandal && norm(match.mandal) !== norm(match.value) ? `Mandal: ${match.mandal}` : '',
        match.district && norm(match.district) !== norm(match.value) ? `District: ${match.district}` : (match.district ? `District: ${match.district}` : ''),
        match.state
      ].filter(Boolean).join(' • '),
      detail: LEVEL_LABEL[match.level] || 'City',
      level: match.level,
      scope: match.scope || (match.level === 'village' ? 'city' : match.level),
      lat: match.lat,
      lng: match.lng,
      corrected: index === 0
        ? Boolean(match.corrected || locationCorrectedFrom)
        : false,
      correctedFrom: index === 0 ? (match.correctedFrom || locationCorrectedFrom) : ''
    }))
  ];

  let correctedQuery = '';
  if (bestCategory && bestLocation) correctedQuery = `${bestCategory.value} in ${bestLocation.value}`;
  else if (bestCategory) correctedQuery = bestCategory.value;
  else if (bestLocation) correctedQuery = bestLocation.value;

  return {
    ok: true,
    query: correctedQuery,
    ready: Boolean(bestCategory && bestLocation),
    intent,
    fragments: {
      category: categoryFragment,
      location: locationFragment,
      splitBy
    },
    category: bestCategory,
    location: bestLocation,
    disambiguation: (() => {
      const levels = [...new Set(locationMatches.map(match => match.level).filter(Boolean))];
      if (placeVariants.length < 2 || levels.length < 2) return null;
      const baseName = clean(locationFragment).replace(PLACE_SUFFIX, '$1').trim();
      return {
        name: baseName,
        question: `Which ${titleCase(baseName)}?`,
        levels,
        options: placeVariants.map(variant => ({
          value: variant.value,
          level: variant.level,
          detail: variant.detail,
          state: variant.state || '',
          district: variant.district || ''
        }))
      };
    })(),
    suggestions,
    counts: {
      categories: categoryMatches.length,
      locations: locationMatches.length
    }
  };
}

/**
 * Canonical place name for dispatch. Exact places are returned untouched;
 * only genuinely misspelled or abbreviated input is corrected. This keeps a
 * full city such as "Vijayawada" from drifting to "Vijayawada Rural".
 */
function correctLocationName(fragment) {
  const text = clean(fragment);
  if (text.length < 3) return '';
  const best = findBestPlace(text, 1)[0];
  if (!best) return '';
  const a = norm(text);
  const b = norm(best.value);
  if (a === b) return best.value;
  if (best.corrected) return best.value;
  // Keep rich "locality, district" input intact for the geocoder.
  if (text.includes(',')) return '';
  if (b.startsWith(a) || a.startsWith(`${b} `)) return best.value;
  return '';
}

module.exports = { suggest: suggestCached, suggestUncached: suggest, detectFragments, findLocations, titleCase, correctLocationName };

/**
 * Tiny LRU-style memo for the suggestion endpoint. Typing fires a request every
 * few hundred milliseconds; repeated prefixes and corrections should not touch
 * the 619k-village index twice.
 */
const SUGGEST_CACHE = new Map();
const SUGGEST_CACHE_MAX = 300;
const SUGGEST_CACHE_TTL = 120000;

function suggestCached(options = {}) {
  const key = [
    clean(options.q),
    clean(options.category),
    clean(options.location),
    Math.max(1, Math.min(12, Number(options.limit) || 6))
  ].join('\u0000');

  const hit = SUGGEST_CACHE.get(key);
  if (hit && Date.now() - hit.at < SUGGEST_CACHE_TTL) {
    SUGGEST_CACHE.delete(key);
    SUGGEST_CACHE.set(key, hit);
    return hit.value;
  }

  const value = suggest(options);
  SUGGEST_CACHE.set(key, { at: Date.now(), value });
  if (SUGGEST_CACHE.size > SUGGEST_CACHE_MAX) {
    const oldest = SUGGEST_CACHE.keys().next().value;
    SUGGEST_CACHE.delete(oldest);
  }
  return value;
}