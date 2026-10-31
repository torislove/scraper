const fs = require('fs');
const path = require('path');

// 1. Update server/src/routes/search.js to pass isMaster to suggest()
const searchRoutePath = path.join(__dirname, '../server/src/routes/search.js');
let searchRouteCode = fs.readFileSync(searchRoutePath, 'utf8');

const oldSuggestCall = `    const rawQ = req.query.q || '';
    const payload = suggest({
      q: rawQ,
      category: req.query.category || '',
      location: req.query.location || '',
      limit: req.query.limit
    });`;

const newSuggestCall = `    const rawQ = req.query.q || '';
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.isMaster === 'true';
    const payload = suggest({
      q: rawQ,
      category: req.query.category || '',
      location: req.query.location || '',
      limit: req.query.limit,
      isMaster
    });`;

if (searchRouteCode.includes(oldSuggestCall)) {
  searchRouteCode = searchRouteCode.replace(oldSuggestCall, newSuggestCall);
  fs.writeFileSync(searchRoutePath, searchRouteCode, 'utf8');
  console.log('Updated server/src/routes/search.js with isMaster support');
} else {
  console.log('search.js already has isMaster or pattern changed');
}

// 2. Update server/src/services/searchSuggest.js
const searchSuggestPath = path.join(__dirname, '../server/src/services/searchSuggest.js');
let ssCode = fs.readFileSync(searchSuggestPath, 'utf8');

// Add TRADE_TYPO_MAP at the top
const tradeTypoBlock = `const TRADE_TYPO_MAP = {
  'fotography': 'photography',
  'photograpy': 'photography',
  'fhotography': 'photography',
  'fotographer': 'photographer',
  'fotographers': 'photographers',
  'studeo': 'studio',
  'studo': 'studio',
  'weeding': 'wedding',
  'marraige': 'marriage',
  'marrage': 'marriage',
  'caterors': 'caterers',
  'caterars': 'caterers',
  'caters': 'caterers',
  'catorers': 'caterers',
  'plumberr': 'plumber',
  'plambing': 'plumbing',
  'plamber': 'plumber',
  'electritian': 'electrician',
  'electrition': 'electrician',
  'electic': 'electrician',
  'paiting': 'painting',
  'panter': 'painter',
  'carpentar': 'carpenter',
  'carpanter': 'carpenter',
  'resturant': 'restaurant',
  'resturent': 'restaurant',
  'restarant': 'restaurant',
  'bakeri': 'bakery',
  'jewlery': 'jewellery',
  'jewelery': 'jewellery'
};

function normalizeTradeTypos(str) {
  if (!str || typeof str !== 'string') return str;
  let out = str;
  for (const [typo, fixed] of Object.entries(TRADE_TYPO_MAP)) {
    const reg = new RegExp('\\\\b' + typo + '\\\\b', 'gi');
    out = out.replace(reg, fixed);
  }
  return out;
}
`;

if (!ssCode.includes('TRADE_TYPO_MAP')) {
  const insertMarker = 'const PREPOSITION_SPLIT =';
  ssCode = ssCode.replace(insertMarker, tradeTypoBlock + '\n' + insertMarker);
  console.log('Added TRADE_TYPO_MAP to searchSuggest.js');
}

// Replace findPlaceVariants function
const fpvStart = 'function findPlaceVariants(text, limit = 6) {';
const fpvEnd = 'function findBestPlace(fragment, limit = 6) {';

const newFpvAndFbp = `function findPlaceVariants(text, limit = 6, isMaster = false) {
  const raw = clean(text);
  if (raw.length < 3) return [];
  const suffixMatch = raw.match(PLACE_SUFFIX);
  const suffix = suffixMatch ? suffixMatch[2].toLowerCase() : '';
  const base = clean(suffixMatch ? suffixMatch[1] : raw);
  const key = norm(base);
  if (!key) return [];

  // Major city typo check: e.g. "mubai" -> "Mumbai", "guntr" -> "Guntur", "hydrabad" -> "Hyderabad"
  let matchedCity = null;
  let minCityDist = 99;
  for (const city of MAJOR_CITY_KEYS) {
    const d = levenshtein(key, city.key);
    if (d === 0) {
      matchedCity = city.name;
      minCityDist = 0;
      break;
    }
    if (d <= 2 && d < minCityDist) {
      matchedCity = city.name;
      minCityDist = d;
    }
  }

  // If input is a close typo of a major city, the major city takes absolute precedence over obscure hamlets!
  if (matchedCity && minCityDist > 0) {
    const majorLocations = findLocations(matchedCity, limit);
    if (majorLocations.length > 0) {
      return majorLocations.map(match => ({
        ...match,
        corrected: true,
        correctedFrom: text,
        correctedTo: matchedCity,
        major: true
      }));
    }
  }

  const only = suffix ? SUFFIX_LEVEL[suffix] : '';
  const out = [];
  const push = variant => {
    if (!variant) return;
    if (only && variant.level !== only) return;
    // In Client mode: suppress broad district sweeps and state sweeps
    if (!isMaster && (variant.level === 'district' || variant.level === 'state')) return;
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

  // States: Only in Master mode
  if (isMaster) {
    const state = geo.statesMap && geo.statesMap.get(key);
    if (state) {
      push({
        value: state.state,
        label: state.state,
        display: \`\${state.state}, India\`,
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
  }

  // District: In Master mode push district. Always push city option for operators!
  const district = geo.districtsMap && geo.districtsMap.get(key);
  if (district) {
    if (isMaster) {
      push({
        value: \`\${district.district} District\`,
        label: \`\${district.district} District\`,
        display: \`\${district.district} District, \${district.state}\`,
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
    // Push city/district HQ option so Client operators can search Coimbatore, Nashik, Agra, Varanasi, Guntur without error!
    push({
      value: district.district,
      label: district.district,
      display: \`\${district.district}, \${district.state}\`,
      level: 'city',
      scope: 'city',
      detail: 'City / District HQ',
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
      value: \`\${mandal.subDistrict} Mandal\`,
      label: \`\${mandal.subDistrict} Mandal\`,
      display: \`\${mandal.subDistrict} Mandal, \${mandal.district}, \${mandal.state}\`,
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
    if (!isMaster && (item.level === 'district' || item.level === 'state')) continue;
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

  return out.slice(0, limit);
}

function findBestPlace(fragment, limit = 6, isMaster = false) {
  const direct = findLocations(fragment, limit);
  const fuzzy = clean(fragment).length >= 4 ? findCorrectedLocation(fragment, 1) : [];

  let list = direct;
  if (!direct.length) list = fuzzy;

  const fuzzyBest = fuzzy[0] || null;
  const directBest = direct[0];
  if (fuzzyBest && fuzzyBest.major
    && (directBest?.level === 'village' || directBest?.level === 'town')
    && norm(fuzzyBest.value) !== norm(directBest.value)) {
    list = [fuzzyBest, ...direct.filter(item => norm(item.value) !== norm(fuzzyBest.value))];
  }

  if (!isMaster) {
    list = list.filter(item => item.level !== 'district' && item.level !== 'state');
  }

  return list.slice(0, limit);
}
`;

const fpvIdx = ssCode.indexOf(fpvStart);
const fbpIdx = ssCode.indexOf(fpvEnd);
if (fpvIdx !== -1 && fbpIdx !== -1) {
  // Find end of findBestPlace
  const resolveExactMarker = 'function resolveExactPlace(fragment) {';
  const resolveExactIdx = ssCode.indexOf(resolveExactMarker);
  if (resolveExactIdx !== -1) {
    ssCode = ssCode.substring(0, fpvIdx) + newFpvAndFbp + '\n' + ssCode.substring(resolveExactIdx);
    console.log('Replaced findPlaceVariants and findBestPlace in searchSuggest.js');
  }
}

// In suggest(options): add trade typo normalization and pass isMaster
const suggestStart = 'function suggest(options = {}) {';
const suggestIdx = ssCode.indexOf(suggestStart);
if (suggestIdx !== -1) {
  const oldDetectBlock = `  if (!explicit) {
    const parts = detectFragments(options.q || '');
    categoryFragment = parts.categoryFragment;
    locationFragment = parts.locationFragment;
    locationCorrectedFrom = parts.locationCorrectedFrom || '';
    splitBy = parts.splitBy;
  }`;

  const newDetectBlock = `  const isMaster = Boolean(options.isMaster);

  if (!explicit) {
    const parts = detectFragments(options.q || '');
    categoryFragment = parts.categoryFragment;
    locationFragment = parts.locationFragment;
    locationCorrectedFrom = parts.locationCorrectedFrom || '';
    splitBy = parts.splitBy;
  }

  // Normalize common trade and category spelling typos before routing
  const normalizedCategory = normalizeTradeTypos(categoryFragment);
  if (normalizedCategory.toLowerCase() !== categoryFragment.toLowerCase()) {
    categoryFragment = normalizedCategory;
  }`;

  if (ssCode.includes(oldDetectBlock)) {
    ssCode = ssCode.replace(oldDetectBlock, newDetectBlock);
    console.log('Added trade typo normalization to suggest()');
  }

  // Update placeVariants call to pass isMaster
  const oldPvCall = 'const placeVariants = locationFragment ? findPlaceVariants(locationFragment, limit) : [];';
  const newPvCall = 'const placeVariants = locationFragment ? findPlaceVariants(locationFragment, limit, isMaster) : [];';
  if (ssCode.includes(oldPvCall)) {
    ssCode = ssCode.replace(oldPvCall, newPvCall);
    console.log('Updated findPlaceVariants call with isMaster');
  }

  // Update findBestPlace call to pass isMaster
  const oldFbpCall = 'let locationMatches = placeVariants.length ? placeVariants : findBestPlace(locationFragment, limit);';
  const newFbpCall = 'let locationMatches = placeVariants.length ? placeVariants : findBestPlace(locationFragment, limit, isMaster);';
  if (ssCode.includes(oldFbpCall)) {
    ssCode = ssCode.replace(oldFbpCall, newFbpCall);
    console.log('Updated findBestPlace call with isMaster');
  }
}

fs.writeFileSync(searchSuggestPath, ssCode, 'utf8');
console.log('Successfully updated searchSuggest.js');

