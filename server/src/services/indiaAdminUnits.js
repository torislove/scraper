/**
 * indiaAdminUnits.js
 *
 * India does not have one name for the administrative layer between a district
 * and a village. The same Census/revenue level is called a **mandal** in Andhra
 * Pradesh and Telangana, a **taluk/taluka** in Tamil Nadu, Karnataka, Kerala,
 * Maharashtra, Gujarat and Goa, a **tehsil** in most of the Hindi belt, and a
 * **block / CD block** in West Bengal, Odisha, Assam and the North-East.
 *
 * A paid lead-finder cannot pretend "mandal" is universal: an operator in
 * Coimbatore types "Pollachi Taluk", and one in Kolkata types "Barrackpore
 * Block". This module is the single place that knows
 *
 *   1. which word each state uses for each level,
 *   2. every accepted spelling/alias an operator may type,
 *   3. how to split a typed phrase like "Tenali Mandal" or "Guntur Zilla"
 *      into a clean place name + an explicit administrative level.
 *
 * Nothing here talks to the network. It is pure terminology + parsing, so both
 * the master sweep policy and the UI can share it.
 */

const LEVELS = {
  STATE: 'state',
  DISTRICT: 'district',
  SUBDISTRICT: 'mandal',
  CITY: 'city',
  VILLAGE: 'village'
};

// Canonical internal level stays `mandal` for backwards compatibility with the
// orchestrator (it checks plan.resolvedScope === 'mandal'). The *label* shown to
// the operator is the local word from this table.
const STATE_TERMS = {
  'andhra pradesh': 'Mandal',
  'telangana': 'Mandal',
  'tamil nadu': 'Taluk',
  'karnataka': 'Taluk',
  'kerala': 'Taluk',
  'puducherry': 'Taluk',
  'maharashtra': 'Taluka',
  'gujarat': 'Taluka',
  'goa': 'Taluka',
  'dadra & nagar haveli': 'Taluka',
  'daman & diu': 'Taluka',
  'dadra and nagar haveli': 'Taluka',
  'daman and diu': 'Taluka',
  'uttar pradesh': 'Tehsil',
  'madhya pradesh': 'Tehsil',
  'rajasthan': 'Tehsil',
  'haryana': 'Tehsil',
  'punjab': 'Tehsil',
  'bihar': 'Tehsil',
  'jharkhand': 'Tehsil',
  'chhattisgarh': 'Tehsil',
  'uttarakhand': 'Tehsil',
  'himachal pradesh': 'Tehsil',
  'jammu & kashmir': 'Tehsil',
  'jammu and kashmir': 'Tehsil',
  'ladakh': 'Tehsil',
  'delhi': 'Tehsil',
  'chandigarh': 'Tehsil',
  'andaman & nicobar islands': 'Tehsil',
  'andaman and nicobar islands': 'Tehsil',
  'lakshadweep': 'Tehsil',
  'west bengal': 'Block',
  'odisha': 'Block',
  'orissa': 'Block',
  'assam': 'Block',
  'meghalaya': 'Block',
  'tripura': 'Block',
  'nagaland': 'Block',
  'manipur': 'Block',
  'mizoram': 'Block',
  'arunachal pradesh': 'Block',
  'sikkim': 'Block'
};

// Every word an operator can type as a suffix. Order matters: longer, more
// specific phrases are matched before short ones.
const TERM_TABLE = [
  { re: /\b(states?|union territories?|ut)\s*$/i, level: LEVELS.STATE, term: 'State' },
  { re: /\b(sub[-\s]?districts?|subdivisions?|sub[-\s]?divisions?|sub[-\s]?divisions?)\s*$/i, level: LEVELS.SUBDISTRICT, term: 'Sub-District' },
  { re: /\b(cd blocks?|community development blocks?|blocks?)\s*$/i, level: LEVELS.SUBDISTRICT, term: 'Block' },
  { re: /\b(revenue circles?|circles?)\s*$/i, level: LEVELS.SUBDISTRICT, term: 'Circle' },
  { re: /\b(taluks?|talukas?|taluq|taluka|tehsils?|tahsils?|tashils?|mandals?|firkas?)\s*$/i, level: LEVELS.SUBDISTRICT, term: null },
  { re: /\b(districts?|dists?|zillas?|zilas?|jillas?|jilas?)\s*$/i, level: LEVELS.DISTRICT, term: 'District' },
  { re: /\b(municipal corporations?|nagar nigams?|nagar palikas?|municipalities?|municipal councils?|corporations?|nagars?|towns?|cities|city)\s*$/i, level: LEVELS.CITY, term: 'City' },
  { re: /\b(gram panchayats?|gram sansads?|gps?|villages?|grams?|hamlets?|wards?)\s*$/i, level: LEVELS.VILLAGE, term: 'Village' }
];

const SCOPE_ALIASES = {
  state: LEVELS.STATE,
  ut: LEVELS.STATE,
  unionterritory: LEVELS.STATE,
  district: LEVELS.DISTRICT,
  dist: LEVELS.DISTRICT,
  zilla: LEVELS.DISTRICT,
  zila: LEVELS.DISTRICT,
  jilla: LEVELS.DISTRICT,
  subdistrict: LEVELS.SUBDISTRICT,
  subdivision: LEVELS.SUBDISTRICT,
  mandal: LEVELS.SUBDISTRICT,
  mandals: LEVELS.SUBDISTRICT,
  taluk: LEVELS.SUBDISTRICT,
  taluks: LEVELS.SUBDISTRICT,
  taluka: LEVELS.SUBDISTRICT,
  talukas: LEVELS.SUBDISTRICT,
  tehsil: LEVELS.SUBDISTRICT,
  tehsils: LEVELS.SUBDISTRICT,
  tahsil: LEVELS.SUBDISTRICT,
  tahsils: LEVELS.SUBDISTRICT,
  block: LEVELS.SUBDISTRICT,
  blocks: LEVELS.SUBDISTRICT,
  circle: LEVELS.SUBDISTRICT,
  city: LEVELS.CITY,
  town: LEVELS.CITY,
  municipality: LEVELS.CITY,
  corporation: LEVELS.CITY,
  village: LEVELS.VILLAGE,
  gram: LEVELS.VILLAGE
};

function clean(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function keyOf(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Normalise the terminology table once. Looking it up with the raw display name
// failed for every multi-word state ("tamil nadu" became "tamilnadu", which was
// not a key), silently falling back to "Mandal" everywhere outside AP.
const TERM_BY_KEY = {};
for (const [stateName, term] of Object.entries(STATE_TERMS)) {
  TERM_BY_KEY[keyOf(stateName)] = term;
}
// Common alternate spellings found in older gazetteers.
TERM_BY_KEY.tamilnadu = TERM_BY_KEY.tamilnadu || 'Taluk';
TERM_BY_KEY.andhra = TERM_BY_KEY.andhra || 'Mandal';
TERM_BY_KEY.telengana = TERM_BY_KEY.telengana || 'Mandal';
TERM_BY_KEY.orissa = TERM_BY_KEY.orissa || 'Block';
TERM_BY_KEY.pondicherry = TERM_BY_KEY.pondicherry || 'Taluk';
TERM_BY_KEY.uttaranchal = TERM_BY_KEY.uttaranchal || 'Tehsil';
TERM_BY_KEY.jammukashmir = TERM_BY_KEY.jammukashmir || 'Tehsil';
TERM_BY_KEY.andamannicobarislands = TERM_BY_KEY.andamannicobarislands || 'Tehsil';
TERM_BY_KEY.dadraandnagarhaveli = TERM_BY_KEY.dadraandnagarhaveli || 'Taluka';
TERM_BY_KEY.damananddiu = TERM_BY_KEY.damananddiu || 'Taluka';

/**
 * Split a typed place into name + explicit administrative level.
 * "Tenali Mandal" → { name: "Tenali", level: "mandal", term: "Mandal" }
 * "Guntur"       → { name: "Guntur", level: null, term: null }
 */
function parseAdminQuery(raw) {
  const text = clean(raw);
  if (!text) return { name: '', level: null, term: null };
  for (const row of TERM_TABLE) {
    if (!row.re.test(text)) continue;
    const name = clean(text.replace(row.re, '')).replace(/[,\-–—]+$/g, '').trim();
    if (!name) return { name: text, level: null, term: null };
    let term = row.term;
    if (!term) {
      const match = text.match(row.re);
      term = match ? titleCase(match[1]) : null;
    }
    return { name, level: row.level, term };
  }
  return { name: text, level: null, term: null };
}

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b([a-z])/g, (m, c) => c.toUpperCase());
}

/** Map any scope word the API receives onto a canonical level. */
function canonicalScope(scope) {
  const key = keyOf(scope);
  if (!key) return null;
  if (SCOPE_ALIASES[key]) return SCOPE_ALIASES[key];
  for (const [alias, level] of Object.entries(SCOPE_ALIASES)) {
    if (key.includes(alias) || alias.includes(key)) return level;
  }
  return null;
}

/** The local word a state uses for the sub-district level. */
function subDistrictTerm(stateName) {
  return TERM_BY_KEY[keyOf(stateName)] || 'Mandal';
}

/** Display label for a level, using the state's own vocabulary. */
function unitLabel(level, stateName, explicitTerm) {
  if (explicitTerm) return titleCase(explicitTerm);
  if (level === LEVELS.SUBDISTRICT) return subDistrictTerm(stateName);
  if (level === LEVELS.DISTRICT) return 'District';
  if (level === LEVELS.STATE) return 'State';
  if (level === LEVELS.CITY) return 'City';
  if (level === LEVELS.VILLAGE) return 'Village';
  return 'Zone';
}

/**
 * A short, human explanation of how this state names its levels. The master UI
 * uses it so an operator in Tamil Nadu reads "Taluk", not "Mandal".
 */
function describeTerminology(stateName) {
  // Without a state there is no honest sentence to write. "This state calls
  // it a Mandal" would be a guess (Kerala would say Taluk), so return null and
  // let the UI simply omit the vocabulary line.
  if (!stateName) return null;
  const sub = subDistrictTerm(stateName);
  return {
    state: stateName,
    subDistrict: sub,
    district: 'District',
    sentence: `${stateName} calls the sub-district unit a ${sub}; its parent unit is the District.`
  };
}

/** All spellings that mean the same sub-district level. */
const SUBDISTRICT_WORDS = [
  'mandal', 'taluk', 'taluka', 'taluq', 'tehsil', 'tahsil', 'tashil',
  'block', 'cd block', 'circle', 'sub-district', 'subdistrict', 'subdivision',
  'firka'
];

module.exports = {
  LEVELS,
  STATE_TERMS,
  SUBDISTRICT_WORDS,
  parseAdminQuery,
  canonicalScope,
  subDistrictTerm,
  unitLabel,
  describeTerminology,
  keyOf,
  titleCase
};
