/**
 * shared/data/searchNormalize.js
 * Deterministic Damerau-Levenshtein typo auto-corrector, merged-phrase splitter,
 * and 11-country city normalizer shared by OmniSearchBar.
 * Strictly <= 250 lines.
 */

import { COUNTRIES } from './countries.js';

export const STATIC_WORD_TYPOS = {
  hosptial: 'hospitals', hosptials: 'hospitals', hospitl: 'hospitals', hospitls: 'hospitals',
  hsopital: 'hospitals', hospiotal: 'hospitals', hospiotals: 'hospitals', hispitals: 'hospitals',
  hostpitals: 'hospitals', hosptls: 'hospitals', hospitol: 'hospitals', hospitla: 'hospitals',
  hospitlas: 'hospitals', hspital: 'hospitals', hspitals: 'hospitals',
  clink: 'clinics', clinc: 'clinics', clincs: 'clinics', clinik: 'clinics', clinicks: 'clinics', policlinic: 'polyclinics',
  dentl: 'dental', dantal: 'dental', denatl: 'dental', denist: 'dentists', dentits: 'dentists', dentst: 'dentists',
  implnts: 'dental implants', implant: 'dental implants', implants: 'dental implants',
  optican: 'opticians', opthalmologist: 'ophthalmologists', opthalmology: 'ophthalmology',
  cardiologst: 'cardiologist', gynecolgist: 'gynecologist', orthopediccs: 'orthopedic',
  pediatrc: 'pediatric', pharmcy: 'pharmacies', pharmacys: 'pharmacies', farmacy: 'pharmacies', chemst: 'chemists',
  diagnstic: 'diagnostics', diagnstics: 'diagnostics', patholgy: 'pathology',
  plumer: 'plumbers', plumers: 'plumbers', plummber: 'plumbers', plummbers: 'plumbers', plmber: 'plumbers', plmbers: 'plumbers',
  electrcian: 'electricians', eletrician: 'electricians', electrcians: 'electricians', elctrician: 'electricians',
  contrator: 'contractors', contractrs: 'contractors', contractr: 'contractors', roofer: 'roofing',
  resturant: 'restaurants', resturants: 'restaurants', restaraunt: 'restaurants', restraunts: 'restaurants', restarant: 'restaurants',
  hotls: 'hotels', htel: 'hotels', hotl: 'hotels', automtive: 'automotive', mechnic: 'mechanics',
  slon: 'salons', saln: 'salons', parlour: 'beauty parlours',
  lawer: 'lawyers', lwayer: 'lawyers', lawyrs: 'lawyers', attorny: 'attorneys', attornies: 'attorneys', soliciter: 'solicitors', advocat: 'advocates',
  scool: 'schools', shools: 'schools', schols: 'schools', schol: 'schools', schoools: 'schools',
  colege: 'colleges', collegs: 'colleges', colloge: 'colleges', colloges: 'colleges', coleges: 'colleges', collages: 'colleges', collage: 'colleges', colleg: 'colleges',
  univercity: 'universities', univercities: 'universities', univeristy: 'universities', universites: 'universities', unversity: 'universities',
  enginering: 'engineering', enigneering: 'engineering', engeneering: 'engineering',
  realtorss: 'realtors', reltors: 'realtors', realtor: 'realtors', proprty: 'property',
  acountants: 'accountants', acountant: 'accountants', accountnt: 'accountants',
  manufacuring: 'manufacturing', manufcturing: 'manufacturing', manufacurer: 'manufacturers',
  wholesle: 'wholesale', wholsalers: 'wholesalers', logstics: 'logistics', warehousng: 'warehousing',
  fitnes: 'fitness', photogrpher: 'photographers', photogrpaher: 'photographers',
  veterinry: 'veterinary', veternary: 'veterinary', vetinary: 'veterinary',
  softwre: 'software companies', softwere: 'software companies', jewellry: 'jewellery', jwellery: 'jewellery', furinture: 'furniture',
  turmaric: 'turmeric', tumeric: 'turmeric', turmairc: 'turmeric', paspu: 'pasupu', mirchi: 'chilli',
  chemcal: 'chemical', chemcals: 'chemicals', waterproffing: 'waterproofing', waterprofing: 'waterproofing'
};

export const CITY_ALIASES = {
  teanli: 'Tenali', tenali: 'Tenali', chilakaluripet: 'Chilakaluripet', chilakaluripeta: 'Chilakaluripet', chlkpet: 'Chilakaluripet',
  hyderbad: 'Hyderabad', hydrabad: 'Hyderabad', hyderabd: 'Hyderabad', hyd: 'Hyderabad', secunderbad: 'Secunderabad',
  vijaywada: 'Vijayawada', vijayawad: 'Vijayawada', vijaywda: 'Vijayawada',
  visakapatnam: 'Visakhapatnam', vishakapatnam: 'Visakhapatnam', vizag: 'Visakhapatnam',
  banglore: 'Bengaluru', bangaluru: 'Bengaluru', bangalore: 'Bengaluru', bnglr: 'Bengaluru',
  mumbay: 'Mumbai', bombay: 'Mumbai', mumabi: 'Mumbai', delh: 'Delhi', dlhi: 'Delhi',
  guntor: 'Guntur', gntur: 'Guntur', guntr: 'Guntur', tirupathi: 'Tirupati',
  chenai: 'Chennai', madras: 'Chennai', kolkatta: 'Kolkata', calcutta: 'Kolkata',
  gurgaon: 'Gurugram', ahmadabad: 'Ahmedabad', poona: 'Pune', cochin: 'Kochi',
  andhra: 'Andhra Pradesh', andhrapradesh: 'Andhra Pradesh', telngana: 'Telangana', maharastra: 'Maharashtra',
  texa: 'Texas', txas: 'Texas', texs: 'Texas', texsa: 'Texas', texas: 'Texas', tx: 'Texas',
  calfornia: 'California', califonia: 'California', florda: 'Florida', florid: 'Florida',
  dals: 'Dallas', dalls: 'Dallas', houstn: 'Houston', austn: 'Austin', chicgo: 'Chicago',
  newyrok: 'New York', nyc: 'New York', losangeles: 'Los Angeles', sanfrancisco: 'San Francisco',
  londn: 'London', lndn: 'London', londo: 'London', manchesterr: 'Manchester', manchestr: 'Manchester', birmingam: 'Birmingham', engalnd: 'England',
  sydeny: 'Sydney', sydny: 'Sydney', melborn: 'Melbourne', melborne: 'Melbourne', brisban: 'Brisbane', brisbne: 'Brisbane', quensland: 'Queensland',
  dubay: 'Dubai', dubi: 'Dubai', abudabi: 'Abu Dhabi', sharja: 'Sharjah'
};

const CANONICAL_CATEGORIES = [
  'hospitals', 'clinics', 'doctors', 'dental', 'dentists', 'dental implants', 'dental clinic', 'orthopedic', 'eye hospital',
  'maternity', 'pediatric', 'cardiology', 'oncology', 'neurology', 'ent', 'gastroenterology', 'urology',
  'schools', 'colleges', 'universities', 'engineering', 'contractors', 'builders', 'plumbers', 'electricians', 'roofing',
  'lawyers', 'attorneys', 'solicitors', 'advocates', 'restaurants', 'hotels', 'automotive', 'salons', 'real estate', 'realtors', 'accountants',
  'manufacturing', 'manufacturers', 'wholesale', 'wholesalers', 'pharmacies', 'chemists', 'diagnostics', 'pathology',
  'retail', 'supermarkets', 'electronics', 'jewellery', 'furniture', 'clothing',
  'software', 'digital marketing', 'logistics', 'packers and movers', 'warehousing',
  'fitness', 'gyms', 'yoga', 'events', 'wedding planners', 'photographers', 'catering',
  'veterinary', 'pet clinics', 'physiotherapy', 'pest control', 'interior design', 'architects', 'solar',
  'turmeric', 'spices', 'mills', 'flour mills', 'chilli', 'paint', 'waterproofing', 'chemicals'
];

export const ALL_KNOWN_CITIES = Array.from(
  new Set(
    COUNTRIES.flatMap((c) => c.cities || []).concat([
      'Tenali', 'Chilakaluripet', 'Bapatla', 'Narasaraopet', 'Ongole', 'Machilipatnam', 'Gudivada',
      'Texas', 'California', 'Florida', 'Illinois', 'Georgia', 'Washington', 'Arizona', 'Colorado', 'Massachusetts',
      'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Rajasthan', 'Kerala',
      'England', 'Scotland', 'Greater London', 'Greater Manchester', 'New South Wales', 'Victoria', 'Queensland',
      'Dallas County', 'Harris County', 'Travis County', 'Guntur District', 'NTR District', 'Hyderabad District',
      'Visakhapatnam', 'Tirupati', 'Warangal', 'Kolkata', 'Ahmedabad', 'Surat', 'Jaipur', 'Coimbatore',
      'Kochi', 'Gurugram', 'Secunderabad', 'San Francisco', 'Seattle', 'Boston', 'Phoenix', 'San Antonio', 'Fort Worth',
      'Liverpool', 'Bristol', 'Sheffield', 'Oxford', 'Cambridge', 'Brighton', 'Gold Coast', 'Canberra', 'Wellington', 'Christchurch'
    ])
  )
).sort((a, b) => b.length - a.length);

export function damerauLevenshtein(a, b) {
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

const STOP_WORDS = new Set(['in', 'at', 'near', 'around', 'for', 'and', 'the', 'all', 'top', 'best', 'find', 'show', 'me']);

function fuzzyMatchWord(token, candidates) {
  const clean = token.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length < 4 || STOP_WORDS.has(clean)) return null;
  const exact = candidates.find((c) => c.toLowerCase() === clean);
  if (exact) return null;
  const maxDist = clean.length >= 6 ? 2 : 1;
  let best = null;
  let bestScore = Infinity;
  for (const cand of candidates) {
    if (cand.includes(' ') || Math.abs(cand.length - clean.length) > maxDist) continue;
    const candLow = cand.toLowerCase();
    const d = damerauLevenshtein(clean, candLow);
    const sameFirst = clean[0] === candLow[0] ? 0 : 1;
    let prefixLen = 0;
    while (prefixLen < clean.length && prefixLen < candLow.length && clean[prefixLen] === candLow[prefixLen]) prefixLen++;
    const effectiveMax = clean.length >= 5 && prefixLen >= 2 ? 2 : maxDist;
    if (d <= effectiveMax) {
      const score = d * 10 + sameFirst * 3 - prefixLen;
      if (score < bestScore) {
        bestScore = score;
        best = cand;
      }
    }
  }
  return best;
}

export function autoCorrectTypedQuery(rawInput = '', { commitFinalToken = false } = {}) {
  const str = String(rawInput || '');
  if (!str.trim()) return { text: str, changed: false, replacements: [] };
  const endsWithSpace = /\s$/.test(str);
  const parts = str.split(/(\s+|,)/);
  let lastWordIdx = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] && !/^\s+$/.test(parts[i]) && parts[i] !== ',') { lastWordIdx = i; break; }
  }
  const replacements = [];
  const next = parts.map((part, idx) => {
    if (!part || /^\s+$/.test(part) || part === ',') return part;
    if (idx === lastWordIdx && !endsWithSpace && !commitFinalToken) return part;
    const low = part.toLowerCase().replace(/[^a-z]/g, '');
    if (!low || STOP_WORDS.has(low)) return part;
    let fixed = CITY_ALIASES[low] || STATIC_WORD_TYPOS[low];
    if (!fixed) {
      const catFix = fuzzyMatchWord(low, CANONICAL_CATEGORIES);
      const cityFix = !catFix ? fuzzyMatchWord(low, ALL_KNOWN_CITIES) : null;
      fixed = catFix || cityFix;
    }
    if (fixed && fixed.toLowerCase() !== part.toLowerCase()) {
      replacements.push({ from: part, to: fixed });
      return fixed;
    }
    return part;
  });
  return { text: next.join(''), changed: replacements.length > 0, replacements };
}

export function normalizeCategoryText(rawCat = '') {
  const cleanStr = String(rawCat || '').trim();
  if (!cleanStr) return { value: '', changed: false };
  const wholeLower = cleanStr.toLowerCase();
  if (STATIC_WORD_TYPOS[wholeLower]) return { value: STATIC_WORD_TYPOS[wholeLower], changed: true };

  const words = cleanStr.split(/\s+/).filter(Boolean);
  let changed = false;
  const fixedWords = words.map((w) => {
    const low = w.toLowerCase().replace(/[^a-z]/g, '');
    if (!low) return w;
    if (STATIC_WORD_TYPOS[low]) {
      changed = true;
      return STATIC_WORD_TYPOS[low];
    }
    const fuzzy = fuzzyMatchWord(low, CANONICAL_CATEGORIES);
    if (fuzzy && fuzzy !== low) {
      changed = true;
      return fuzzy;
    }
    return w;
  });
  return { value: fixedWords.join(' '), changed };
}

export function normalizeCityName(rawCity = '') {
  const cleanStr = String(rawCity || '').trim();
  if (!cleanStr) return { value: '', changed: false };
  const lower = cleanStr.toLowerCase().replace(/\s+/g, '');
  if (CITY_ALIASES[lower]) return { value: CITY_ALIASES[lower], changed: CITY_ALIASES[lower].toLowerCase() !== cleanStr.toLowerCase() };
  const exactKnown = ALL_KNOWN_CITIES.find((c) => c.toLowerCase() === cleanStr.toLowerCase());
  if (exactKnown) return { value: exactKnown, changed: false };

  const fuzzy = fuzzyMatchWord(cleanStr, ALL_KNOWN_CITIES);
  if (fuzzy) return { value: fuzzy, changed: true };
  return { value: cleanStr, changed: false };
}

export function strictParseSearchIntent(rawInput, currentCity = '') {
  let text = String(rawInput || '').trim();
  text = text.replace(/^(?:can\s+you\s+(?:please\s+)?(?:find|get|search|show)|could\s+you\s+find|please\s+(?:find|get)|find\s+me|search\s+for|look\s+for|show\s+me)\s+/i, '');
  text = text.replace(/^(?:the|all|top|best)\s+/i, '');
  if (!text) return { q: '', c: '', rawQ: '', rawC: '', didCorrect: false };

  let rawQ = '';
  let rawC = '';

  const m = text.match(/^(.*?)\s+(?:in|near|at|,|around|à|in\s+der)\s+(.*)$/i);
  if (m) {
    rawQ = m[1].trim();
    rawC = m[2].trim();
  } else {
    const glued = text.match(/^([a-z]{4,}?)(?:in|at|near)\s+([a-z][a-z\s-]{2,})$/i);
    if (glued) {
      rawQ = glued[1].trim();
      rawC = glued[2].trim();
    } else {
      const parts = text.split(/\s+/);
      const lastWord = parts[parts.length - 1];
      const twoWords = parts.length >= 2 ? parts.slice(-2).join(' ') : '';
      const matchedTwo = twoWords ? normalizeCityName(twoWords) : null;
      const matchedOne = lastWord ? normalizeCityName(lastWord) : null;

      if (parts.length >= 3 && matchedTwo && (matchedTwo.changed || ALL_KNOWN_CITIES.some((c) => c.toLowerCase() === matchedTwo.value.toLowerCase()))) {
        rawQ = parts.slice(0, -2).join(' ');
        rawC = twoWords;
      } else if (parts.length >= 2 && matchedOne && (CITY_ALIASES[lastWord.toLowerCase()] || ALL_KNOWN_CITIES.some((c) => c.toLowerCase() === matchedOne.value.toLowerCase()))) {
        rawQ = parts.slice(0, -1).join(' ');
        rawC = lastWord;
      } else {
        rawQ = text;
        rawC = currentCity || '';
      }
    }
  }

  const normCat = normalizeCategoryText(rawQ);
  const normCity = normalizeCityName(rawC);
  return {
    q: normCat.value,
    c: normCity.value,
    rawQ,
    rawC,
    didCorrect: normCat.changed || normCity.changed
  };
}

export function expandCompoundSearchPhrases(rawQuery = '') {
  const clean = String(rawQuery || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const clauses = clean.split(/\s*(?:&|\/|\band\b|,)\s*/i).map((c) => c.trim()).filter(Boolean);
  if (clauses.length <= 1) return [clean];
  const lastClause = clauses[clauses.length - 1];
  const headMatch = lastClause.match(/\b(hospitals?|clinics?|doctors?|surgeons?|specialists?|cent(?:er|re)s?|stores?|shops?|services?|agencies?|contractors?|lawyers?|attorneys?|firms?|companies|institutes?|academies?|colleges?|schools?|restaurants?|hotels?|salons?|pharmacies|labs?)$/i);
  const headNoun = headMatch ? headMatch[1] : '';
  const expanded = clauses.map((c) => {
    if (!headNoun) return c;
    if (/\b(hospitals?|clinics?|doctors?|surgeons?|specialists?|dentists?|cent(?:er|re)s?|stores?|shops?|services?|agencies?|contractors?|lawyers?|attorneys?|firms?|companies|institutes?|colleges?|schools?|restaurants?|hotels?|salons?|pharmacies|labs?)$/i.test(c)) return c;
    return `${c} ${headNoun}`;
  });
  return Array.from(new Set([clean, ...expanded]));
}
