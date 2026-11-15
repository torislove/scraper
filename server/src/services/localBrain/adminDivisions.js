/**
 * adminDivisions.js — what each country calls its administrative levels.
 *
 * One table, one source of truth. The Client and the Master never duplicate
 * this mapping; they read it from `/api/sources` and `/api/admin-divisions`.
 *
 * Terms are deliberately the *human* words an operator recognises:
 *   top      first level   State, Province, Region, Emirate, Prefecture, Oblast
 *   second   second level  District, County, Department, Raion, Wilayat
 *   local    settlement    City, Town, Commune, Ward, Suburb, Area
 *
 * Rules:
 *  - Never invent a level a country does not have. If the structure is unclear,
 *    fall back to Region → District → City instead of guessing.
 *  - India keeps its four-level model and its local word changes with the
 *    state: Mandal (AP/TS), Taluka (MH/GJ/KA/Goa), Taluk (TN/KL), Tehsil
 *    (UP/MP/RJ/…), Block (BR/JH/WB/OD/AS/NE).
 *  - Only labels are localised. Scope ids (`state`, `district`, `mandal`,
 *    `city`) stay stable so saved runs keep working.
 */

const DEFAULT_DIVISION = Object.freeze({
  top: 'Region',
  second: 'District',
  local: 'City',
  subdivision: 'Districts'
});

/**
 * Curated terms for the markets the app actively supports and the large
 * markets users search most. Anything missing falls back to DEFAULT_DIVISION.
 */
const ADMIN_DIVISIONS = {
  // ── Home market ──────────────────────────────────────────────────────────
  IN: { top: 'State', second: 'District', local: 'Mandal / Taluka / Tehsil', subdivision: 'Mandals / Talukas / Tehsils' },

  // ── North America ────────────────────────────────────────────────────────
  US: { top: 'State', second: 'County', local: 'City', subdivision: 'Counties' },
  CA: { top: 'Province', second: 'Census division', local: 'City', subdivision: 'Census divisions' },
  MX: { top: 'State', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },

  // ── Europe ───────────────────────────────────────────────────────────────
  GB: { top: 'Nation', second: 'County', local: 'Town', subdivision: 'Counties' },
  IE: { top: 'Province', second: 'County', local: 'Town', subdivision: 'Counties' },
  DE: { top: 'State', second: 'District', local: 'Municipality', subdivision: 'Districts' },
  FR: { top: 'Region', second: 'Department', local: 'Commune', subdivision: 'Departments' },
  ES: { top: 'Autonomous community', second: 'Province', local: 'Municipality', subdivision: 'Provinces' },
  IT: { top: 'Region', second: 'Province', local: 'Municipality', subdivision: 'Provinces' },
  NL: { top: 'Province', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },
  BE: { top: 'Region', second: 'Province', local: 'Municipality', subdivision: 'Provinces' },
  PT: { top: 'Region', second: 'District', local: 'Municipality', subdivision: 'Districts' },
  GR: { top: 'Region', second: 'Regional unit', local: 'Municipality', subdivision: 'Regional units' },
  AT: { top: 'State', second: 'District', local: 'Municipality', subdivision: 'Districts' },
  CH: { top: 'Canton', second: 'District', local: 'Municipality', subdivision: 'Districts' },
  PL: { top: 'Voivodeship', second: 'County', local: 'Commune', subdivision: 'Counties' },
  CZ: { top: 'Region', second: 'District', local: 'Municipality', subdivision: 'Districts' },
  SK: { top: 'Region', second: 'District', local: 'Municipality', subdivision: 'Districts' },
  HU: { top: 'County', second: 'District', local: 'City', subdivision: 'Districts' },
  RO: { top: 'County', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },
  BG: { top: 'Province', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },
  HR: { top: 'County', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },
  RS: { top: 'District', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },
  SI: { top: 'Region', second: 'Municipality', local: 'Settlement', subdivision: 'Municipalities' },
  BA: { top: 'Entity', second: 'Canton', local: 'Municipality', subdivision: 'Cantons' },
  AL: { top: 'County', second: 'Municipality', local: 'Town', subdivision: 'Municipalities' },
  SE: { top: 'County', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },
  NO: { top: 'County', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },
  DK: { top: 'Region', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },
  FI: { top: 'Region', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },
  IS: { top: 'Region', second: 'Municipality', local: 'Town', subdivision: 'Municipalities' },
  EE: { top: 'County', second: 'Municipality', local: 'Town', subdivision: 'Municipalities' },
  LV: { top: 'Region', second: 'Municipality', local: 'Town', subdivision: 'Municipalities' },
  LT: { top: 'County', second: 'Municipality', local: 'Town', subdivision: 'Municipalities' },
  BY: { top: 'Region', second: 'District', local: 'City', subdivision: 'Districts' },
  UA: { top: 'Oblast', second: 'Raion', local: 'City', subdivision: 'Raions' },
  RU: { top: 'Oblast', second: 'Raion', local: 'City', subdivision: 'Raions' },
  MD: { top: 'District', second: 'Municipality', local: 'Town', subdivision: 'Municipalities' },
  CY: { top: 'District', second: 'Municipality', local: 'Town', subdivision: 'Municipalities' },
  MT: { top: 'Region', second: 'Local council', local: 'Town', subdivision: 'Local councils' },
  LU: { top: 'Canton', second: 'Commune', local: 'Town', subdivision: 'Communes' },
  MC: { top: 'District', second: 'Ward', local: 'Area', subdivision: 'Wards' },
  AD: { top: 'Parish', second: 'Town', local: 'Village', subdivision: 'Parishes' },
  LI: { top: 'Municipality', second: 'Ward', local: 'Village', subdivision: 'Municipalities' },
  SM: { top: 'Municipality', second: 'Ward', local: 'Village', subdivision: 'Municipalities' },
  VA: { top: 'Region', second: 'District', local: 'City', subdivision: 'Districts' },

  // ── Middle East ──────────────────────────────────────────────────────────
  AE: { top: 'Emirate', second: 'Municipality', local: 'Area', subdivision: 'Municipalities' },
  SA: { top: 'Region', second: 'Governorate', local: 'City', subdivision: 'Governorates' },
  QA: { top: 'Municipality', second: 'Zone', local: 'Area', subdivision: 'Zones' },
  KW: { top: 'Governorate', second: 'Area', local: 'District', subdivision: 'Areas' },
  BH: { top: 'Governorate', second: 'Municipality', local: 'Area', subdivision: 'Municipalities' },
  OM: { top: 'Governorate', second: 'Wilayat', local: 'Town', subdivision: 'Wilayats' },
  JO: { top: 'Governorate', second: 'District', local: 'Town', subdivision: 'Districts' },
  LB: { top: 'Governorate', second: 'District', local: 'Town', subdivision: 'Districts' },
  IQ: { top: 'Governorate', second: 'District', local: 'Town', subdivision: 'Districts' },
  IR: { top: 'Province', second: 'County', local: 'City', subdivision: 'Counties' },
  IL: { top: 'District', second: 'Sub-district', local: 'City', subdivision: 'Sub-districts' },
  TR: { top: 'Province', second: 'District', local: 'Neighbourhood', subdivision: 'Districts' },

  // ── Asia-Pacific ─────────────────────────────────────────────────────────
  JP: { top: 'Prefecture', second: 'City or district', local: 'Ward', subdivision: 'Cities and districts' },
  CN: { top: 'Province', second: 'Prefecture', local: 'District', subdivision: 'Prefectures' },
  KR: { top: 'Province', second: 'City or county', local: 'District', subdivision: 'Cities and counties' },
  TW: { top: 'Province', second: 'County or city', local: 'District', subdivision: 'Counties and cities' },
  HK: { top: 'Region', second: 'District', local: 'Area', subdivision: 'Districts' },
  MO: { top: 'Region', second: 'Municipality', local: 'Parish', subdivision: 'Municipalities' },
  SG: { top: 'Region', second: 'Planning area', local: 'Subzone', subdivision: 'Planning areas' },
  MY: { top: 'State', second: 'District', local: 'Town', subdivision: 'Districts' },
  ID: { top: 'Province', second: 'Regency or city', local: 'District', subdivision: 'Regencies and cities' },
  PH: { top: 'Region', second: 'Province', local: 'City or municipality', subdivision: 'Provinces' },
  TH: { top: 'Province', second: 'District', local: 'Subdistrict', subdivision: 'Districts' },
  VN: { top: 'Province', second: 'District', local: 'Ward or commune', subdivision: 'Districts' },
  KH: { top: 'Province', second: 'District', local: 'Commune', subdivision: 'Districts' },
  LA: { top: 'Province', second: 'District', local: 'Village', subdivision: 'Districts' },
  MM: { top: 'Region', second: 'District', local: 'Township', subdivision: 'Districts' },
  BN: { top: 'District', second: 'Sub-district', local: 'Village', subdivision: 'Sub-districts' },
  TL: { top: 'Municipality', second: 'Sub-district', local: 'Village', subdivision: 'Sub-districts' },
  AU: { top: 'State', second: 'Local government area', local: 'Suburb', subdivision: 'Local government areas' },
  NZ: { top: 'Region', second: 'District', local: 'Suburb', subdivision: 'Districts' },
  FJ: { top: 'Division', second: 'Province', local: 'Town', subdivision: 'Provinces' },
  PG: { top: 'Province', second: 'District', local: 'Town', subdivision: 'Districts' },
  SB: { top: 'Province', second: 'Ward', local: 'Village', subdivision: 'Wards' },
  VU: { top: 'Province', second: 'Island', local: 'Village', subdivision: 'Islands' },
  WS: { top: 'District', second: 'Village', local: 'Town', subdivision: 'Villages' },
  TO: { top: 'Division', second: 'District', local: 'Village', subdivision: 'Districts' },
  MV: { top: 'Atoll', second: 'Island', local: 'City', subdivision: 'Atolls' },

  // ── South Asia ───────────────────────────────────────────────────────────
  PK: { top: 'Province', second: 'District', local: 'Tehsil', subdivision: 'Districts' },
  BD: { top: 'Division', second: 'District', local: 'Upazila', subdivision: 'Districts' },
  LK: { top: 'Province', second: 'District', local: 'Divisional secretariat', subdivision: 'Districts' },
  NP: { top: 'Province', second: 'District', local: 'Municipality', subdivision: 'Districts' },
  BT: { top: 'District', second: 'Gewog', local: 'Town', subdivision: 'Gewogs' },
  AF: { top: 'Province', second: 'District', local: 'Village', subdivision: 'Districts' },

  // ── Africa ───────────────────────────────────────────────────────────────
  NG: { top: 'State', second: 'Local government area', local: 'Town', subdivision: 'Local government areas' },
  ZA: { top: 'Province', second: 'District municipality', local: 'Suburb', subdivision: 'District municipalities' },
  KE: { top: 'County', second: 'Sub-county', local: 'Ward', subdivision: 'Counties' },
  GH: { top: 'Region', second: 'District', local: 'Town', subdivision: 'Districts' },
  ET: { top: 'Region', second: 'Zone', local: 'Woreda', subdivision: 'Zones' },
  EG: { top: 'Governorate', second: 'Markaz or district', local: 'City', subdivision: 'Governorates' },
  MA: { top: 'Region', second: 'Province or prefecture', local: 'Commune', subdivision: 'Provinces' },
  DZ: { top: 'Province', second: 'District', local: 'Municipality', subdivision: 'Districts' },
  TN: { top: 'Governorate', second: 'Delegation', local: 'Municipality', subdivision: 'Delegations' },
  LY: { top: 'District', second: 'Municipality', local: 'Town', subdivision: 'Municipalities' },
  SD: { top: 'State', second: 'District', local: 'Town', subdivision: 'Districts' },
  TZ: { top: 'Region', second: 'District', local: 'Ward', subdivision: 'Districts' },
  UG: { top: 'Region', second: 'District', local: 'Sub-county', subdivision: 'Districts' },
  RW: { top: 'Province', second: 'District', local: 'Sector', subdivision: 'Districts' },
  BI: { top: 'Province', second: 'Commune', local: 'Town', subdivision: 'Communes' },
  CM: { top: 'Region', second: 'Division', local: 'Subdivision', subdivision: 'Divisions' },
  CI: { top: 'District', second: 'Region', local: 'Department', subdivision: 'Regions' },
  SN: { top: 'Region', second: 'Department', local: 'Commune', subdivision: 'Departments' },
  ML: { top: 'Region', second: 'Cercle', local: 'Commune', subdivision: 'Cercles' },
  BF: { top: 'Region', second: 'Province', local: 'Commune', subdivision: 'Provinces' },
  NE: { top: 'Region', second: 'Department', local: 'Commune', subdivision: 'Departments' },
  TD: { top: 'Province', second: 'Department', local: 'Town', subdivision: 'Departments' },
  AO: { top: 'Province', second: 'Municipality', local: 'Commune', subdivision: 'Municipalities' },
  MZ: { top: 'Province', second: 'District', local: 'Town', subdivision: 'Districts' },
  ZM: { top: 'Province', second: 'District', local: 'Town', subdivision: 'Districts' },
  ZW: { top: 'Province', second: 'District', local: 'Town', subdivision: 'Districts' },
  MW: { top: 'Region', second: 'District', local: 'Town', subdivision: 'Districts' },
  MG: { top: 'Region', second: 'District', local: 'Commune', subdivision: 'Districts' },
  MU: { top: 'District', second: 'Municipality', local: 'Town', subdivision: 'Municipalities' },
  BW: { top: 'District', second: 'Sub-district', local: 'Village', subdivision: 'Sub-districts' },
  NA: { top: 'Region', second: 'Constituency', local: 'Town', subdivision: 'Constituencies' },
  SZ: { top: 'Region', second: 'Inkhundla', local: 'Town', subdivision: 'Inkhundla' },
  LS: { top: 'District', second: 'Community council', local: 'Town', subdivision: 'Community councils' },
  GA: { top: 'Province', second: 'Department', local: 'Town', subdivision: 'Departments' },
  CG: { top: 'Department', second: 'District', local: 'Town', subdivision: 'Districts' },
  CD: { top: 'Province', second: 'Territory', local: 'Town', subdivision: 'Territories' },
  CF: { top: 'Prefecture', second: 'Sub-prefecture', local: 'Town', subdivision: 'Sub-prefectures' },
  GN: { top: 'Region', second: 'Prefecture', local: 'Sub-prefecture', subdivision: 'Prefectures' },
  SL: { top: 'Province', second: 'District', local: 'Chiefdom', subdivision: 'Districts' },
  LR: { top: 'County', second: 'District', local: 'Town', subdivision: 'Districts' },
  TG: { top: 'Region', second: 'Prefecture', local: 'Town', subdivision: 'Prefectures' },
  BJ: { top: 'Department', second: 'Commune', local: 'Town', subdivision: 'Communes' },
  GM: { top: 'Region', second: 'District', local: 'Town', subdivision: 'Districts' },
  GW: { top: 'Region', second: 'Sector', local: 'Town', subdivision: 'Sectors' },
  MR: { top: 'Region', second: 'Department', local: 'Commune', subdivision: 'Departments' },
  ER: { top: 'Region', second: 'Sub-region', local: 'Town', subdivision: 'Sub-regions' },
  DJ: { top: 'Region', second: 'District', local: 'Town', subdivision: 'Districts' },
  SO: { top: 'Region', second: 'District', local: 'Town', subdivision: 'Districts' },
  SS: { top: 'State', second: 'County', local: 'Town', subdivision: 'Counties' },
  KM: { top: 'Island', second: 'Prefecture', local: 'Town', subdivision: 'Prefectures' },
  SC: { top: 'District', second: 'Ward', local: 'Town', subdivision: 'Wards' },
  ST: { top: 'District', second: 'Municipality', local: 'Town', subdivision: 'Municipalities' },
  CV: { top: 'Municipality', second: 'Parish', local: 'Town', subdivision: 'Parishes' },

  // ── Latin America & Caribbean ────────────────────────────────────────────
  BR: { top: 'State', second: 'Municipality', local: 'Neighbourhood', subdivision: 'Municipalities' },
  AR: { top: 'Province', second: 'Department', local: 'Municipality', subdivision: 'Departments' },
  CL: { top: 'Region', second: 'Province', local: 'Commune', subdivision: 'Provinces' },
  CO: { top: 'Department', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },
  PE: { top: 'Region', second: 'Province', local: 'District', subdivision: 'Provinces' },
  VE: { top: 'State', second: 'Municipality', local: 'Parish', subdivision: 'Municipalities' },
  EC: { top: 'Province', second: 'Canton', local: 'Parish', subdivision: 'Cantons' },
  BO: { top: 'Department', second: 'Province', local: 'Municipality', subdivision: 'Provinces' },
  PY: { top: 'Department', second: 'District', local: 'City', subdivision: 'Districts' },
  UY: { top: 'Department', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },
  CU: { top: 'Province', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },
  DO: { top: 'Province', second: 'Municipality', local: 'District', subdivision: 'Municipalities' },
  HT: { top: 'Department', second: 'Arrondissement', local: 'Commune', subdivision: 'Arrondissements' },
  GT: { top: 'Department', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },
  HN: { top: 'Department', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },
  SV: { top: 'Department', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },
  NI: { top: 'Department', second: 'Municipality', local: 'City', subdivision: 'Municipalities' },
  CR: { top: 'Province', second: 'Canton', local: 'District', subdivision: 'Cantons' },
  PA: { top: 'Province', second: 'District', local: 'Town', subdivision: 'Districts' },
  BZ: { top: 'District', second: 'Constituency', local: 'Town', subdivision: 'Constituencies' },
  JM: { top: 'Parish', second: 'Town', local: 'Community', subdivision: 'Parishes' },
  TT: { top: 'Region', second: 'Municipality', local: 'Town', subdivision: 'Regions' },
  BB: { top: 'Parish', second: 'Town', local: 'Community', subdivision: 'Parishes' },
  BS: { top: 'District', second: 'Town', local: 'Settlement', subdivision: 'Districts' },
  GD: { top: 'Parish', second: 'Town', local: 'Village', subdivision: 'Parishes' },
  LC: { top: 'District', second: 'Town', local: 'Village', subdivision: 'Districts' },
  VC: { top: 'Parish', second: 'Town', local: 'Village', subdivision: 'Parishes' },
  AG: { top: 'Parish', second: 'Town', local: 'Village', subdivision: 'Parishes' },
  DM: { top: 'Parish', second: 'Town', local: 'Village', subdivision: 'Parishes' },
  KN: { top: 'Parish', second: 'Town', local: 'Village', subdivision: 'Parishes' },
  SR: { top: 'District', second: 'Resort', local: 'Town', subdivision: 'Districts' },
  GY: { top: 'Region', second: 'Neighbourhood council', local: 'Town', subdivision: 'Regions' }
};

// ── India: the local word depends on the state ─────────────────────────────

const INDIA_TERM_GROUPS = [
  {
    term: 'Mandal',
    states: ['Andhra Pradesh', 'Telangana']
  },
  {
    term: 'Taluka',
    states: ['Maharashtra', 'Gujarat', 'Karnataka', 'Goa', 'Dadra and Nagar Haveli and Daman and Diu']
  },
  {
    term: 'Taluk',
    states: ['Tamil Nadu', 'Kerala', 'Puducherry']
  },
  {
    term: 'Tehsil',
    states: [
      'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan', 'Chhattisgarh', 'Uttarakhand',
      'Himachal Pradesh', 'Punjab', 'Haryana', 'Jammu and Kashmir', 'Ladakh',
      'Delhi', 'Chandigarh', 'Andaman and Nicobar Islands'
    ]
  },
  {
    term: 'Block',
    states: [
      'Bihar', 'Jharkhand', 'West Bengal', 'Odisha', 'Assam', 'Arunachal Pradesh',
      'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Tripura', 'Sikkim'
    ]
  }
];

const INDIA_DEFAULT_TERM = 'Mandal / Taluka / Tehsil';

// Two-letter state abbreviations people type instead of the full name.
const INDIA_STATE_ALIASES = {
  ap: 'Andhra Pradesh',
  ts: 'Telangana',
  tg: 'Telangana',
  mh: 'Maharashtra',
  gj: 'Gujarat',
  ka: 'Karnataka',
  ga: 'Goa',
  tn: 'Tamil Nadu',
  kl: 'Kerala',
  py: 'Puducherry',
  up: 'Uttar Pradesh',
  mp: 'Madhya Pradesh',
  rj: 'Rajasthan',
  cg: 'Chhattisgarh',
  ct: 'Chhattisgarh',
  uk: 'Uttarakhand',
  ua: 'Uttarakhand',
  hp: 'Himachal Pradesh',
  pb: 'Punjab',
  hr: 'Haryana',
  jk: 'Jammu and Kashmir',
  la: 'Ladakh',
  dl: 'Delhi',
  ch: 'Chandigarh',
  br: 'Bihar',
  jh: 'Jharkhand',
  wb: 'West Bengal',
  od: 'Odisha',
  or: 'Odisha',
  as: 'Assam',
  ar: 'Arunachal Pradesh',
  mn: 'Manipur',
  ml: 'Meghalaya',
  mz: 'Mizoram',
  nl: 'Nagaland',
  tr: 'Tripura',
  sk: 'Sikkim',
  an: 'Andaman and Nicobar Islands',
  dn: 'Dadra and Nagar Haveli and Daman and Diu',
  dd: 'Dadra and Nagar Haveli and Daman and Diu'
};

const INDIA_PLURALS = {
  Mandal: 'Mandals',
  Taluka: 'Talukas',
  Taluk: 'Taluks',
  Tehsil: 'Tehsils',
  Block: 'Blocks'
};

function normaliseKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(state|province|district|division|region|governorate|emirate)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** The local word India uses for the sub-district level in a given state. */
function indiaSubdivisionTerm(state) {
  let key = normaliseKey(state);
  if (!key) return INDIA_DEFAULT_TERM;
  if (INDIA_STATE_ALIASES[key]) key = normaliseKey(INDIA_STATE_ALIASES[key]);
  for (const group of INDIA_TERM_GROUPS) {
    for (const name of group.states) {
      const stateKey = normaliseKey(name);
      if (
        key === stateKey ||
        key.endsWith(` ${stateKey}`) ||
        key.startsWith(`${stateKey} `) ||
        key.includes(` ${stateKey} `)
      ) {
        return group.term;
      }
    }
  }
  return INDIA_DEFAULT_TERM;
}

function pluralOf(term) {
  if (INDIA_PLURALS[term]) return INDIA_PLURALS[term];
  if (!term) return '';
  if (/[^aeiou]y$/i.test(term)) return `${term.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(term)) return `${term}es`;
  return `${term}s`;
}

/**
 * Full hierarchy for a country. Pass `{ state }` for India to get the
 * state-specific word (Taluka in Maharashtra, Tehsil in Uttar Pradesh, …).
 */
function adminForCountry(code, opts = {}) {
  const upper = String(code || 'IN').toUpperCase();
  if (upper === 'IN') {
    const local = indiaSubdivisionTerm(opts.state);
    return {
      top: 'State',
      second: 'District',
      local,
      subdivision: local === INDIA_DEFAULT_TERM
        ? 'Mandals / Talukas / Tehsils'
        : pluralOf(local),
      levels: ['State', 'District', local],
      stateAware: true
    };
  }
  const base = ADMIN_DIVISIONS[upper] || DEFAULT_DIVISION;
  return {
    top: base.top,
    second: base.second,
    local: base.local,
    subdivision: base.subdivision,
    levels: [base.top, base.second, base.local],
    stateAware: false
  };
}

/** One-line human summary, e.g. "Province → Census division → City". */
function adminPath(code, opts = {}) {
  return adminForCountry(code, opts).levels.join(' → ');
}

module.exports = {
  ADMIN_DIVISIONS,
  DEFAULT_DIVISION,
  INDIA_TERM_GROUPS,
  INDIA_DEFAULT_TERM,
  INDIA_STATE_ALIASES,
  adminForCountry,
  adminPath,
  indiaSubdivisionTerm,
  normaliseKey
};
