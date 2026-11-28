'use strict';

/**
 * server/src/services/queryNormalizer.js
 * Backend Authoritative Search & Geo Intent Normalizer.
 * Applies Damerau-Levenshtein typo correction, merged-preposition splitting,
 * and 11-country city aliasing so API scrapes & autocomplete receive clean targets.
 */

const { KNOWN_CITIES } = require('../geo');

const WORD_TYPOS = {
  hosptial: 'hospitals', hosptials: 'hospitals', hospitl: 'hospitals', hospitls: 'hospitals',
  hsopital: 'hospitals', hospiotal: 'hospitals', hospiotals: 'hospitals', hispitals: 'hospitals',
  hostpitals: 'hospitals', hosptls: 'hospitals', hospitol: 'hospitals', hospital: 'hospitals',
  clink: 'clinics', clinc: 'clinics', clincs: 'clinics', clinik: 'clinics',
  dentl: 'dental', dantal: 'dental', denatl: 'dental', denist: 'dentists', dentits: 'dentists', dentst: 'dentists',
  implnts: 'dental implants', implant: 'dental implants', implants: 'dental implants',
  optican: 'opticians', opthalmologist: 'ophthalmologists', opthalmology: 'ophthalmology',
  cardiologst: 'cardiologist', gynecolgist: 'gynecologist', orthopediccs: 'orthopedic',
  pharmcy: 'pharmacies', pharmacys: 'pharmacies', farmacy: 'pharmacies', chemst: 'chemists',
  diagnstic: 'diagnostics', diagnstics: 'diagnostics', patholgy: 'pathology',
  plumer: 'plumbers', plumers: 'plumbers', plummber: 'plumbers', plummbers: 'plumbers', plmber: 'plumbers',
  electrcian: 'electricians', eletrician: 'electricians', electrcians: 'electricians', elctrician: 'electricians',
  contrator: 'contractors', contractrs: 'contractors',
  resturant: 'restaurants', resturants: 'restaurants', restaraunt: 'restaurants', restraunts: 'restaurants', restarant: 'restaurants',
  hotls: 'hotels', htel: 'hotels', automtive: 'automotive', mechnic: 'mechanics',
  slon: 'salons', lawer: 'lawyers', lwayer: 'lawyers', lawyrs: 'lawyers', attorny: 'attorneys', attornies: 'attorneys',
  scool: 'schools', shools: 'schools', schols: 'schools',
  colege: 'colleges', collegs: 'colleges', colloge: 'colleges', colloges: 'colleges', coleges: 'colleges', collages: 'colleges', collage: 'colleges', colleg: 'colleges',
  univercity: 'universities', univercities: 'universities', univeristy: 'universities', universites: 'universities',
  realtorss: 'realtors', reltors: 'realtors', proprty: 'property',
  acountants: 'accountants', manufacuring: 'manufacturing', manufcturing: 'manufacturing',
  wholesle: 'wholesale', logstics: 'logistics', warehousng: 'warehousing',
  fitnes: 'fitness', photogrpher: 'photographers', photogrpaher: 'photographers',
  veterinry: 'veterinary', veternary: 'veterinary', vetinary: 'veterinary',
  softwre: 'software companies', jewellry: 'jewellery', jwellery: 'jewellery', furinture: 'furniture'
};

const CITY_ALIASES = {
  hyderbad: 'Hyderabad', hydrabad: 'Hyderabad', hyderabd: 'Hyderabad', hyd: 'Hyderabad', secunderbad: 'Secunderabad',
  vijaywada: 'Vijayawada', vijayawad: 'Vijayawada', vijaywda: 'Vijayawada',
  visakapatnam: 'Visakhapatnam', vishakapatnam: 'Visakhapatnam', vizag: 'Visakhapatnam',
  banglore: 'Bengaluru', bangaluru: 'Bengaluru', bangalore: 'Bengaluru',
  mumbay: 'Mumbai', bombay: 'Mumbai', mumabi: 'Mumbai', delh: 'Delhi', dlhi: 'Delhi',
  guntor: 'Guntur', gntur: 'Guntur', guntr: 'Guntur', tirupathi: 'Tirupati',
  chenai: 'Chennai', madras: 'Chennai', kolkatta: 'Kolkata', calcutta: 'Kolkata',
  gurgaon: 'Gurugram', ahmadabad: 'Ahmedabad', poona: 'Pune', cochin: 'Kochi',
  andhra: 'Andhra Pradesh', andhrapradesh: 'Andhra Pradesh', telngana: 'Telangana', maharastra: 'Maharashtra',
  texa: 'Texas', txas: 'Texas', texs: 'Texas', texsa: 'Texas', texas: 'Texas', tx: 'Texas',
  calfornia: 'California', califonia: 'California', florda: 'Florida',
  dals: 'Dallas', houstn: 'Houston', austn: 'Austin', chicgo: 'Chicago',
  newyrok: 'New York', nyc: 'New York', losangeles: 'Los Angeles', sanfrancisco: 'San Francisco',
  londn: 'London', lndn: 'London', londo: 'London', manchesterr: 'Manchester', manchestr: 'Manchester', birmingam: 'Birmingham', engalnd: 'England',
  sydeny: 'Sydney', sydny: 'Sydney', melborn: 'Melbourne', melborne: 'Melbourne', tornto: 'Toronto', vancuver: 'Vancouver',
  singapoor: 'Singapore', dubay: 'Dubai', dubi: 'Dubai', abudabi: 'Abu Dhabi', munic: 'Munich', francfurt: 'Frankfurt'
};

const CANONICAL_CATEGORIES = [
  'hospitals', 'clinics', 'doctors', 'dental', 'dentists', 'dental implants', 'dental clinic', 'orthopedic', 'eye hospital',
  'maternity', 'pediatric', 'cardiology', 'oncology', 'neurology', 'ent', 'gastroenterology', 'urology',
  'schools', 'colleges', 'universities', 'contractors', 'builders', 'plumbers', 'electricians', 'roofing',
  'lawyers', 'attorneys', 'solicitors', 'advocates', 'restaurants', 'hotels', 'automotive', 'salons', 'real estate', 'accountants',
  'manufacturing', 'wholesale', 'pharmacies', 'chemists', 'diagnostics', 'pathology',
  'retail', 'supermarkets', 'electronics', 'jewellery', 'furniture', 'clothing',
  'software', 'digital marketing', 'logistics', 'packers and movers', 'warehousing',
  'fitness', 'gyms', 'yoga', 'events', 'wedding planners', 'photographers', 'catering',
  'veterinary', 'pet clinics', 'physiotherapy', 'pest control', 'interior design', 'architects', 'solar'
];

const KNOWN_CITY_NAMES = Array.from(
  new Set([
    ...Object.values(KNOWN_CITIES || {}).map((c) => c.city).filter(Boolean),
    ...Object.values(CITY_ALIASES),
    'Texas', 'California', 'Florida', 'Illinois', 'Georgia', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Karnataka', 'Tamil Nadu',
    'England', 'Scotland', 'New South Wales', 'Victoria', 'Queensland',
    'Dallas', 'Houston', 'Austin', 'San Antonio', 'Fort Worth', 'New York', 'Chicago', 'Miami', 'Los Angeles', 'Atlanta', 'Seattle',
    'London', 'Manchester', 'Birmingham', 'Leeds', 'Edinburgh', 'Glasgow', 'Bristol',
    'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra',
    'Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa',
    'Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne',
    'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice',
    'Dubai', 'Abu Dhabi', 'Sharjah', 'Singapore', 'Auckland', 'Wellington', 'Christchurch',
    'Dublin', 'Cork', 'Galway', 'Limerick'
  ])
);

function damerauLevenshtein(a, b) {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  const n = s1.length;
  const m = s2.length;
  if (!n) return m;
  if (!m) return n;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[n][m];
}

function fuzzyMatchWord(token, candidates) {
  const clean = token.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length < 4) return null;
  if (candidates.some((c) => c.toLowerCase() === clean)) return null;
  const maxDist = clean.length >= 7 ? 2 : 1;
  let best = null;
  let bestDist = Infinity;
  for (const cand of candidates) {
    if (cand.includes(' ') || Math.abs(cand.length - clean.length) > maxDist) continue;
    const d = damerauLevenshtein(clean, cand);
    if (d <= maxDist && d < bestDist) {
      bestDist = d;
      best = cand;
    }
  }
  return best;
}

function normalizeCategory(raw = '') {
  const clean = String(raw || '').trim();
  if (!clean) return { value: '', changed: false };
  const low = clean.toLowerCase();
  if (WORD_TYPOS[low]) return { value: WORD_TYPOS[low], changed: WORD_TYPOS[low] !== low };
  const words = clean.split(/\s+/).filter(Boolean);
  let changed = false;
  const out = words.map((w) => {
    const k = w.toLowerCase().replace(/[^a-z]/g, '');
    if (WORD_TYPOS[k]) { changed = true; return WORD_TYPOS[k]; }
    const f = fuzzyMatchWord(k, CANONICAL_CATEGORIES);
    if (f) { changed = true; return f; }
    return w;
  });
  return { value: out.join(' '), changed };
}

function normalizeLocation(raw = '') {
  const clean = String(raw || '').trim();
  if (!clean) return { value: '', changed: false };
  const firstSegment = clean.split(',')[0].trim();
  const rest = clean.includes(',') ? ',' + clean.split(',').slice(1).join(',') : '';
  const compacted = firstSegment.toLowerCase().replace(/\s+/g, '');
  if (CITY_ALIASES[compacted]) {
    const fixed = CITY_ALIASES[compacted] + rest;
    return { value: fixed, changed: CITY_ALIASES[compacted].toLowerCase() !== firstSegment.toLowerCase() };
  }
  const exact = KNOWN_CITY_NAMES.find((c) => c.toLowerCase() === firstSegment.toLowerCase());
  if (exact) return { value: exact + rest, changed: false };
  const fuzzy = fuzzyMatchWord(firstSegment, KNOWN_CITY_NAMES);
  if (fuzzy) return { value: fuzzy + rest, changed: true };
  return { value: clean, changed: false };
}

function normalizeScrapeIntent({ query = '', location = '', country = 'IN' } = {}) {
  let qRaw = String(query || '').trim();
  let locRaw = String(location || '').trim();

  // Handle combined single-field query if caller omitted separate location
  if (qRaw && !locRaw) {
    const m = qRaw.match(/^(.*?)\s+(?:in|near|at|,|around)\s+(.*)$/i) || qRaw.match(/^([a-z]{4,}?)(?:in|at|near)\s+([a-z][a-z\s-]{2,})$/i);
    if (m) {
      qRaw = m[1].trim();
      locRaw = m[2].trim();
    }
  }

  const normQ = normalizeCategory(qRaw);
  const normL = normalizeLocation(locRaw);
  return {
    query: normQ.value || qRaw,
    location: normL.value || locRaw,
    country: String(country || 'IN').toUpperCase(),
    correctedQuery: normQ.changed,
    correctedLocation: normL.changed
  };
}

function expandCompoundSearchPhrases(rawQuery = '') {
  const clean = String(rawQuery || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const clauses = clean.split(/\s*(?:&|\/|\band\b|,)\s*/i).map((c) => c.trim()).filter(Boolean);
  if (clauses.length <= 1) return [clean];

  const lastClause = clauses[clauses.length - 1];
  const headMatch = lastClause.match(/\b(hospitals?|clinics?|doctors?|surgeons?|specialists?|cent(?:er|re)s?|stores?|shops?|services?|agencies?|contractors?|lawyers?|attorneys?|firms?|companies|institutes?|academies?|colleges?|schools?|restaurants?|hotels?|salons?|pharmacies|labs?)$/i);
  const headNoun = headMatch ? headMatch[1] : '';

  const expanded = clauses.map((c) => {
    if (!headNoun) return c;
    if (/\b(hospitals?|clinics?|doctors?|surgeons?|specialists?|dentists?|cent(?:er|re)s?|stores?|shops?|services?|agencies?|contractors?|lawyers?|firms?|companies|institutes?|colleges?|schools?|restaurants?|hotels?|salons?|pharmacies|labs?)$/i.test(c)) {
      return c;
    }
    return `${c} ${headNoun}`;
  });
  return Array.from(new Set([clean, ...expanded]));
}

module.exports = {
  normalizeCategory,
  normalizeLocation,
  normalizeScrapeIntent,
  expandCompoundSearchPhrases,
  damerauLevenshtein
};
