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
const PLACE_SUFFIX = /^(.*?)\s+(districts?|dists?|zillas?|zilas?|jillas?|jilas?|mandals?|tehsils?|tahsils?|talukas?|taluks?|taluq|circles?|blocks?|subdivisions?|sub[-\s]?districts?|cities|city|towns?|villages?|states?|municipalities?|municipal\s+corporations?|nagar\s+palikas?|nagar\s+nigams?|gram\s+panchayats?|GPs?|wards?)$/i;
const SUFFIX_LEVEL = {
  district: 'district',
  districts: 'district',
  dist: 'district',
  dists: 'district',
  zilla: 'district',
  zillas: 'district',
  zila: 'district',
  zilas: 'district',
  jilla: 'district',
  jillas: 'district',
  jila: 'district',
  jilas: 'district',
  mandal: 'mandal',
  mandals: 'mandal',
  tehsil: 'mandal',
  tehsils: 'mandal',
  tahsil: 'mandal',
  tahsils: 'mandal',
  taluk: 'mandal',
  taluks: 'mandal',
  taluka: 'mandal',
  talukas: 'mandal',
  taluq: 'mandal',
  circle: 'mandal',
  circles: 'mandal',
  block: 'mandal',
  blocks: 'mandal',
  subdivision: 'mandal',
  subdivisions: 'mandal',
  'sub-district': 'mandal',
  'sub district': 'mandal',
  'sub-districts': 'mandal',
  'sub districts': 'mandal',
  city: 'city',
  cities: 'city',
  town: 'town',
  towns: 'town',
  village: 'village',
  villages: 'village',
  municipality: 'city',
  municipalities: 'city',
  'municipal corporation': 'city',
  'municipal corporations': 'city',
  'nagar palika': 'city',
  'nagar palikas': 'city',
  'nagar nigam': 'city',
  'nagar nigams': 'city',
  'gram panchayat': 'village',
  'gram panchayats': 'village',
  gp: 'village',
  gps: 'village',
  ward: 'city',
  wards: 'city',
  state: 'state',
  states: 'state'
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

const CITY_TYPO_MAP = {
  'mubai': 'Mumbai',
  'mumbai': 'Mumbai',
  'mumbay': 'Mumbai',
  'bombay': 'Mumbai',
  'hydrabad': 'Hyderabad',
  'hyderbad': 'Hyderabad',
  'hyd': 'Hyderabad',
  'secndrabad': 'Secunderabad',
  'secunderbad': 'Secunderabad',
  'vijaywada': 'Vijayawada',
  'vijayawda': 'Vijayawada',
  'bezawada': 'Vijayawada',
  'guntr': 'Guntur',
  'guntor': 'Guntur',
  'vizag': 'Visakhapatnam',
  'vishakapatnam': 'Visakhapatnam',
  'vishakhapatnam': 'Visakhapatnam',
  'vizianagram': 'Vizianagaram',
  'tirupathi': 'Tirupati',
  'bengaluru': 'Bengaluru',
  'banglore': 'Bengaluru',
  'bangalore': 'Bengaluru',
  'madras': 'Chennai',
  'chenai': 'Chennai',
  'calcutta': 'Kolkata',
  'kolkatta': 'Kolkata',
  'delhy': 'Delhi',
  'newdelhi': 'New Delhi',
  'ahmdabad': 'Ahmedabad',
  'ahmedbad': 'Ahmedabad',
  'vadodra': 'Vadodara',
  'baroda': 'Vadodara',
  'cochin': 'Kochi',
  'trivandrum': 'Thiruvananthapuram',
  'poona': 'Pune',
  'pune': 'Pune',
  'punecity': 'Pune',
  'pune city': 'Pune',
  'poonacity': 'Pune'
};

const TRADE_TYPO_MAP = {
  'photgraphy': 'photography',
  'photograhy': 'photography',
  'photogrfy': 'photography',
  'fotogrfy': 'photography',
  'photogrphy': 'photography',
  'photogaphy': 'photography',
  'fotogaphy': 'photography',
  'photgrapher': 'photographer',
  'fotography': 'photography',
  'photograpy': 'photography',
  'potography': 'photography',
  'photogrpahy': 'photography',
  'fotographer': 'photographer',
  'photograper': 'photographer',
  'fotographers': 'photographers',
  'photogal': 'photography',
  'vedio': 'video',
  'videograpy': 'videography',
  'vedigraphy': 'videography',
  'cameraman': 'photographer',
  'albm': 'album',
  'albumb': 'album',
  'albump': 'album',
  'flim': 'film',
  'weeding': 'wedding',
  'weddding': 'wedding',
  'wedidng': 'wedding',
  'marrige': 'marriage',
  'marraige': 'marriage',
  'merriage': 'marriage',
  'mandapam': 'mandap',
  'mandapams': 'mandap',
  'functionhall': 'function hall',
  'caterors': 'caterers',
  'catrers': 'caterers',
  'caterar': 'caterer',
  'catrer': 'caterer',
  'caterings': 'catering',
  'cetring': 'catering',
  'catring': 'catering',
  'decarator': 'decorator',
  'decorater': 'decorator',
  'decoraters': 'decorators',
  'decarators': 'decorators',
  'decors': 'decorators',
  'flwer': 'flower',
  'florist': 'flower decorators',
  'shamiana': 'tent house',
  'shamiyana': 'tent house',
  'pandol': 'pandal decorators',
  'pandal': 'pandal decorators',
  'make up': 'makeup',
  'mekeup': 'makeup',
  'beautician': 'beautician',
  'beatition': 'beautician',
  'beauty parlour': 'beauty parlour',
  'beuty parlour': 'beauty parlour',
  'parlor': 'parlour',
  'mehendi': 'mehendi artist',
  'mehandi': 'mehendi artist',
  'mehendhi': 'mehendi artist',
  'mehndi': 'mehendi artist',
  'pandit': 'pandit',
  'pujari': 'pandit',
  'brahmin': 'pandit',
  'purohit': 'pandit',
  'plumer': 'plumber',
  'plambur': 'plumber',
  'plambr': 'plumber',
  'electrition': 'electrician',
  'electrican': 'electrician',
  'electrisian': 'electrician',
  'carpanter': 'carpenter',
  'carpentor': 'carpenter',
  'paniter': 'painter',
  'peinter': 'painter',
  'butiqe': 'boutique',
  'butique': 'boutique',
  'botique': 'boutique',
  'jewelery': 'jewellers',
  'jewellary': 'jewellers',
  'jwellery': 'jewellers',
  'tailer': 'tailor',
  'taylor': 'tailor'
};

function normalizeTradeTypos(fragment) {
  try {
    const { normalizeTradePhrase } = require("../utils/tradeIntelligence");
    return normalizeTradePhrase(fragment);
  } catch (e) {}

  if (!fragment || typeof fragment !== 'string') return fragment;
  let tokens = fragment.toLowerCase().split(/\s+/);
  let resultTokens = tokens.map(token => TRADE_TYPO_MAP[token] || token);
  let joined = resultTokens.join(' ');
  for (const [key, replacement] of Object.entries(TRADE_TYPO_MAP)) {
    if (key.includes(' ') && joined.includes(key)) {
      joined = joined.replace(new RegExp(`\\b${key}\\b`, 'gi'), replacement);
    }
  }
  return joined;
}

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
  return 2;
}

const NAME_ALIASES = {
  'mumbai city': 'Mumbai',
  'mumbai suburban': 'Mumbai',
  'bengaluru urban': 'Bengaluru',
  'bengaluru rural': 'Bengaluru',
  'pune city': 'Pune',
  'pune urban': 'Pune',
  'hyderabad city': 'Hyderabad',
  'delhi city': 'Delhi',
  'chennai city': 'Chennai',
  'kolkata city': 'Kolkata',
  'ahmedabad city': 'Ahmedabad',
  'surat city': 'Surat',
  'jaipur city': 'Jaipur',
  'lucknow city': 'Lucknow',
  'kanpur city': 'Kanpur',
  'nagpur city': 'Nagpur',
  'indore city': 'Indore',
  'bhopal city': 'Bhopal',
  'coimbatore city': 'Coimbatore',
  'guntur city': 'Guntur',
  'vijayawada city': 'Vijayawada',
  'visakhapatnam city': 'Visakhapatnam'
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
  const detail = item.detail || LEVEL_LABEL[level] || 'City';
  const scope = item.scope || (level === 'district' ? 'district' : level === 'state' ? 'state' : level === 'mandal' ? 'mandal' : 'city');
  return {
    value: name,
    display,
    mandal,
    district,
    state,
    level,
    detail,
    scope,
    lat: Number.isFinite(Number(item.lat)) ? Number(item.lat) : null,
    lng: Number.isFinite(Number(item.lng)) ? Number(item.lng) : null,
    corrected: isRealCorrection(fragment, name),
    source: item.source || 'geo'
  };
}

function findLocations(fragment, limit = 6, isMaster = false) {
  const text = clean(fragment);
  if (text.length < 3) return [];
  try {
    const geo = getGeo();
    let mapped = geo.searchLocations(text, Math.max(limit, 6), isMaster)
      .map(item => locationFromResult(item, text));

    // Common Indian phonetic variants (e.g. Namburu -> Nambur, Gunturu -> Guntur)
    if (!mapped.length && text.length >= 4 && /[uai]$/i.test(text)) {
      const stem = text.replace(/[uai]$/i, '');
      if (stem.length >= 3) {
        const stemResults = geo.searchLocations(stem, Math.max(limit, 6), isMaster)
          .map(item => locationFromResult(item, text));
        if (stemResults.length) {
          mapped = stemResults;
        }
      }
    }
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
function findBestPlace(fragment, limit = 6, isMaster = false) {
  let direct = findLocations(fragment, limit, isMaster);
  if (!isMaster) {
    direct = direct.filter(item => item.level !== 'district' && item.level !== 'state');
  }
  const fuzzy = clean(fragment).length >= 4 ? findCorrectedLocation(fragment, 1) : [];
  let filteredFuzzy = isMaster ? fuzzy : fuzzy.filter(item => item.level !== 'district' && item.level !== 'state');

  if (!direct.length) return filteredFuzzy;

  const fuzzyBest = filteredFuzzy[0] || null;
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

  try {
    const { parseUniversalQuery } = require('../utils/universalQueryEngine');
    const parsedNL = parseUniversalQuery(query);
    if (parsedNL.ready && parsedNL.category && parsedNL.location) {
      let cleanLoc = parsedNL.location;
      if (cleanLoc.includes(',')) cleanLoc = cleanLoc.split(',')[0].trim();
      return {
        categoryFragment: parsedNL.category,
        locationFragment: cleanLoc,
        splitBy: 'universal-nl',
        locationCorrectedFrom: ''
      };
    }
  } catch (e) {}

  const explicit = text.match(PREPOSITION_SPLIT);
  if (explicit) {
    let cleanLoc = clean(explicit[2]);
    if (cleanLoc.includes(',')) cleanLoc = cleanLoc.split(',')[0].trim();
    return {
      categoryFragment: clean(explicit[1]),
      locationFragment: cleanLoc,
      splitBy: 'preposition'
    };
  }

  const words = text.split(/\s+/).filter(Boolean);

  // Common service suffix tokens (e.g. "car rental", "wedding cards", "real estate", "pest control")
  // These should NEVER be split into trailing places even if a distant village shares the name.
  const SERVICE_KEYWORD_TOKENS = new Set([
    'rental', 'rentals', 'repair', 'repairs', 'service', 'services', 'store', 'stores',
    'shop', 'shops', 'centre', 'centres', 'center', 'centers', 'dealer', 'dealers',
    'contractor', 'contractors', 'design', 'designer', 'designers', 'hall', 'halls',
    'planner', 'planners', 'studio', 'studios', 'card', 'cards', 'care', 'clinic',
    'clinics', 'hospital', 'hospitals', 'doctor', 'doctors', 'tutor', 'tutors',
    'parlour', 'parlours', 'decorator', 'decorators', 'caterer', 'caterers',
    'catering', 'photography', 'photographer', 'photographers', 'agent', 'agents',
    'estate', 'maker', 'makers', 'cleaning', 'wash', 'washing', 'detailing'
  ]);

  const lastWord = words.length ? norm(words[words.length - 1]) : '';
  const isProtectedServiceCompound = words.length >= 2 && SERVICE_KEYWORD_TOKENS.has(lastWord);
  const isHighConfCategory = categoryRouter.suggestCategories(text, 1).some(m => m.score >= 750);

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
  // BUT do not treat as standalone place if it's a known service word or prefix.
  if (text.length >= 4) {
    const directPlaces = findLocations(text, 6);
    const exactPlace = directPlaces.find(place => {
      const a = norm(place.value);
      const b = norm(text);
      return a === b || (a.length >= 4 && b.length >= 4 && a.replace(/[uai]$/i, '') === b.replace(/[uai]$/i, ''));
    });
    const exactCategory = categoryRouter.suggestCategories(text, 1).some(match => match.score >= 950);
    if (exactPlace && !exactCategory && !isProtectedServiceCompound) {
      return {
        categoryFragment: '',
        locationFragment: exactPlace.value,
        splitBy: 'standalone-location',
        locationCorrectedFrom: ''
      };
    }
  }

  // Trailing place detection ("wedding venues mangalagiri", "plumbers tenali")
  // Only attempt if not a protected multi-word category compound
  if (!isProtectedServiceCompound && !isHighConfCategory) {
    for (let take = Math.min(4, words.length - 1); take >= 1; take--) {
      const suffix = words.slice(-take).join(' ');
      if (suffix.length < 3) continue;
      const normSuffix = norm(suffix);
      if (SERVICE_KEYWORD_TOKENS.has(normSuffix)) continue;

      const prefix = words.slice(0, -take).join(' ');
      if (!prefix) continue;
      const normPrefix = normalizeTradeTypos(prefix);
      if (!categoryRouter.suggestCategories(normPrefix, 1).length && !categoryRouter.suggestCategories(prefix, 1).length) continue;
      const place = resolveExactPlace(suffix);
      if (place && place.match && place.match.level !== 'village') {
        return {
          categoryFragment: prefix,
          locationFragment: place.match.value,
          locationCorrectedFrom: place.corrected ? suffix : '',
          splitBy: 'trailing-place'
        };
      }
    }
  }

  // Fallback standalone detection for prefix typing of major cities ("vijaya", "guntu", "hyder").
  // Standalone prefixes MUST be >= 4 characters and match a Town/City/Mandal/District, NOT a remote village!
  if (text.length >= 4 && !isProtectedServiceCompound) {
    const prefixPlaces = findLocations(text, 3);
    const nonVillagePlace = prefixPlaces.find(p => p.level !== 'village');
    if (nonVillagePlace) {
      const isCat = categoryRouter.suggestCategories(text, 1).some(c => c.score >= 800);
      if (!isCat) {
        return {
          categoryFragment: '',
          locationFragment: nonVillagePlace.value || text,
          locationCorrectedFrom: nonVillagePlace.corrected ? text : '',
          splitBy: 'standalone-location'
        };
      }
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
function findPlaceVariants(text, limit = 6, isMaster = false) {
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
    if (!isMaster && (variant.level === 'district' || variant.level === 'state' || variant.scope === 'district' || variant.scope === 'state')) return;
    if (only && variant.level !== only) return;
    const duplicate = out.some(item => item.level === variant.level
      && norm(item.value) === norm(variant.value)
      && norm(item.state) === norm(variant.state));
    if (!duplicate) out.push(variant);
  };

  // Check if base matches a major city by alias, common typo, or close Levenshtein distance
  const cityAlias = CITY_TYPO_MAP[key];
  let targetCity = cityAlias;
  if (!targetCity) {
    // Only search fuzzy major city if base is not an exact known place (village/mandal/town)
    const directHits = findLocations(base, 1);
    const isDirectPlace = directHits.some(p => {
      const pNorm = norm(p.value);
      return pNorm === key || (pNorm.length >= 3 && pNorm.replace(/[uai]$/i, '') === key.replace(/[uai]$/i, ''));
    });

    if (!isDirectPlace) {
      // Allow distance 1 for short strings, distance 2 only for long strings (>= 8 chars)
      const budget = key.length >= 8 ? 2 : 1;
      const match = MAJOR_CITY_KEYS.find(c => levenshtein(key, c.key) <= budget);
      if (match) targetCity = match.name;
    }
  }

  let geo;
  try {
    geo = getGeo();
  } catch (error) {
    return [];
  }

  if (targetCity && norm(targetCity) !== key) {
    // A major city is matched via typo/alias (e.g. mubai -> Mumbai, guntr -> Guntur)
    const majorLocations = geo.searchLocations(targetCity, 1);
    const primary = majorLocations[0];
    push({
      value: targetCity,
      label: targetCity,
      display: primary ? primary.display : `${targetCity}, City`,
      level: 'city',
      scope: 'city',
      detail: 'City',
      state: primary?.state || '',
      district: primary?.district || '',
      mandal: '',
      lat: primary ? Number(primary.lat) : null,
      lng: primary ? Number(primary.lng) : null,
      corrected: true,
      correctedFrom: raw,
      correctedTo: targetCity,
      explicit: true,
      major: true
    });
  }

  if (isMaster) {
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

  const searchBase = targetCity || base;
  for (const item of findLocations(searchBase, 10)) {
    const itemNorm = norm(item.value);
    const baseNorm = norm(searchBase);
    const isMatch = itemNorm === baseNorm ||
      (itemNorm.length >= 3 && baseNorm.length >= 3 && itemNorm.replace(/[uai]$/i, '') === baseNorm.replace(/[uai]$/i, ''));
    if (!isMatch) continue;
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
      corrected: Boolean(targetCity && norm(targetCity) !== key),
      correctedFrom: targetCity && norm(targetCity) !== key ? raw : '',
      correctedTo: targetCity && norm(targetCity) !== key ? targetCity : '',
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
  const isMaster = Boolean(options.isMaster);
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

  // Auto-correct common trade typos
  categoryFragment = normalizeTradeTypos(categoryFragment);

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
  const placeVariants = locationFragment ? findPlaceVariants(locationFragment, limit, isMaster) : [];
  let locationMatches = placeVariants.length ? placeVariants : findBestPlace(locationFragment, limit, isMaster);
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

  const { getUniversalRichExpansions, isKnownServiceOrTypo } = require('../utils/tradeIntelligence');
  const isService = isKnownServiceOrTypo(categoryFragment) || categoryMatches.length > 0;
  const brandRows = isService ? [] : brandIntel.suggest(categoryFragment, 3);
  const richExpansions = bestCategory ? getUniversalRichExpansions(bestCategory.value, bestCategory.family, bestLocation?.value || '') : [];

  const suggestions = [
    ...richExpansions,
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
      detail: match.detail || LEVEL_LABEL[match.level] || 'City',
      level: match.level,
      scope: match.scope || (match.level === 'village' ? 'city' : match.level),
      lat: match.lat,
      lng: match.lng,
      corrected: index === 0
        ? Boolean(match.corrected || locationCorrectedFrom)
        : false,
      correctedFrom: index === 0 ? (match.correctedFrom || locationCorrectedFrom) : ''
    }))
  ].filter(item => {
    if (isMaster) return true;
    if (item.type === 'location') {
      return item.level !== 'district' && item.level !== 'state';
    }
    return true;
  });

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
    didYouMean: (bestCategory?.corrected || bestLocation?.corrected) ? correctedQuery : null,
    disambiguation: (() => {
      const allowedVariants = isMaster 
        ? placeVariants 
        : placeVariants.filter(v => v.level !== 'district' && v.level !== 'state');
      const levels = [...new Set(allowedVariants.map(match => match.level).filter(Boolean))];
      if (allowedVariants.length < 2 || levels.length < 2) return null;
      const baseName = clean(locationFragment).replace(PLACE_SUFFIX, '$1').trim();
      return {
        name: baseName,
        question: `Which ${titleCase(baseName)}?`,
        levels,
        options: allowedVariants.map(variant => ({
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

function warmSuggestions() {
  const seeds = ['g', 'gu', 'gun', 'gunt', 'guntur', 'hy', 'hyd', 'mum', 'del', 'vij', 'ten', 'comp', 'phot'];
  const started = Date.now();
  for (const q of seeds) {
    try {
      suggestCached({ q, limit: 6, isMaster: true });
    } catch (error) {}
  }
  return Date.now() - started;
}

module.exports = {
  suggest: suggestCached,
  suggestUncached: suggest,
  warmSuggestions,
  detectFragments,
  findLocations,
  titleCase,
  correctLocationName
};

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
    Math.max(1, Math.min(12, Number(options.limit) || 6)),
    Boolean(options.isMaster)
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