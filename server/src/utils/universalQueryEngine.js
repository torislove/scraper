/**
 * universalQueryEngine.js
 *
 * Universal Natural Language Intent & Geo-Entity Parser.
 *
 * Parses freeform natural language queries into:
 *   1. Category / Business intent (with synonym mapping)
 *   2. Geographic entity (State, District, Mandal, City, Village, or Ward/Landmark)
 *   3. Sweep radius (default 5km, or explicit e.g. "within 10km")
 *   4. Filter modifiers ("with phone", "top rated", "urgent", "wholesale")
 *   5. Proprietary multi-vector intelligence assignment (Strictly zero 3rd-party platform names exposed)
 */

const { normalizePrepositionTypos, ALL_STATES, MAJOR_CITIES } = require('./queryParser');
const { resolveUniversalZones } = require('./universalGeoCluster');
const { detectCountry, COUNTRIES } = require('../services/localBrain/countries');
const gazetteer = require('../services/localBrain/gazetteer');
const { COUNTRY_ENGINE_MAP } = require('../services/scopeEngines/countryEngineMap');

/**
 * Compiles exact tailored search parameters for all 10 international engines.
 */
function compileEngineQueries(category, location, countryCode = 'IN', modifiers = {}) {
  const cat = String(category || 'Businesses').trim();
  const loc = String(location || '').trim();
  const cCode = String(countryCode || 'IN').toUpperCase();

  const catSlug = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const locSlug = loc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const cylexDomains = {
    US: 'cylex.us.com',
    GB: 'cylex-uk.co.uk',
    CA: 'cylex-canada.ca',
    AU: 'cylex.com.au',
    DE: 'cylex.de',
    FR: 'cylex-locale.fr',
    ZA: 'cylex.net.za'
  };

  const wikidataClasses = {
    photographer: 'wd:Q33231',
    photography: 'wd:Q33231',
    studio: 'wd:Q33231',
    doctor: 'wd:Q39631',
    dentist: 'wd:Q27349',
    hospital: 'wd:Q16917',
    clinic: 'wd:Q16917',
    restaurant: 'wd:Q11707',
    hotel: 'wd:Q27686',
    school: 'wd:Q3914',
    college: 'wd:Q3914',
    university: 'wd:Q3914',
    bakery: 'wd:Q274393',
    bar: 'wd:Q187456',
    cafe: 'wd:Q11707',
    salon: 'wd:Q1135248',
    plumber: 'wd:Q18644535',
    electrician: 'wd:Q165077',
    lawyer: 'wd:Q40348',
    accountant: 'wd:Q581774',
    gym: 'wd:Q1078716',
    caterer: 'wd:Q2943261'
  };
  const matchedWd = Object.keys(wikidataClasses).find(k => cat.toLowerCase().includes(k));
  const wdClass = matchedWd ? wikidataClasses[matchedWd] : 'wd:Q4830453';

  const osmTags = {
    photographer: 'craft=photographer',
    studio: 'craft=photographer',
    plumber: 'craft=plumber',
    electrician: 'craft=electrician',
    carpenter: 'craft=carpenter',
    painter: 'craft=painter',
    restaurant: 'amenity=restaurant',
    cafe: 'amenity=cafe',
    bakery: 'shop=bakery',
    bar: 'amenity=bar',
    doctor: 'amenity=doctors',
    dentist: 'amenity=dentist',
    hospital: 'amenity=hospital',
    clinic: 'amenity=clinic',
    pharmacy: 'amenity=pharmacy',
    salon: 'shop=hairdresser',
    beauty: 'shop=beauty',
    gym: 'leisure=fitness_centre',
    hotel: 'tourism=hotel',
    school: 'amenity=school',
    lawyer: 'office=lawyer',
    accountant: 'office=accountant',
    car: 'shop=car_repair'
  };
  const matchedOsm = Object.keys(osmTags).find(k => cat.toLowerCase().includes(k));
  const osmTag = matchedOsm ? osmTags[matchedOsm] : 'shop=yes';

  return {
    yelp: {
      find_desc: cat,
      find_loc: loc ? `${loc}, ${cCode}` : cCode,
      category_alias: catSlug
    },
    bing: {
      query: loc ? `${cat} in ${loc}` : cat,
      location: loc
    },
    tripadvisor: {
      geoName: loc,
      category: catSlug
    },
    wikidata: {
      category: cat,
      location: loc,
      country: cCode,
      sparqlClass: wdClass
    },
    yellowpages: {
      search_terms: cat,
      geo_location_terms: loc,
      country: cCode
    },
    cylex: {
      q: cat,
      c: loc,
      domain: cylexDomains[cCode] || 'cylex.us.com'
    },
    trustpilot: {
      search: cat,
      country: cCode
    },
    openstreetmap: {
      tag: osmTag,
      city: loc,
      country: cCode
    },
    justdial: {
      city: locSlug,
      category: catSlug
    },
    socialDork: {
      query: `site:instagram.com OR site:facebook.com "${cat}" "${loc}" ("phone" OR "mobile" OR "contact" OR "whatsapp")`
    }
  };
}

// Internal proprietary vector definitions (Strictly zero external brand names)
const PROPRIETARY_VECTORS = {
  geospatial_mesh: {
    id: 'geospatial_mesh',
    name: 'Geospatial Radar Mesh',
    shortName: 'GPS Radar',
    badge: '🛰️ GPS RADAR',
    desc: 'High-precision coordinate grid, street verification & active operating hours',
    engineKey: 'maps'
  },
  direct_telecom: {
    id: 'direct_telecom',
    name: 'Direct Telecom Registry',
    shortName: 'Direct Mobiles',
    badge: '📱 DIRECT MOBILES',
    desc: 'Primary Indian +91 mobile lines with live carrier connection status',
    engineKey: 'justdial'
  },
  deep_serp: {
    id: 'deep_serp',
    name: 'Deep Web SERP Index',
    shortName: 'Deep Web SERP',
    badge: '🌐 DEEP SERP',
    desc: 'Organic multi-area business citations and local directory cross-indexing',
    engineKey: 'local_finder'
  },
  b2b_network: {
    id: 'b2b_network',
    name: 'Enterprise Supplier Network',
    shortName: 'B2B Suppliers',
    badge: '🏢 B2B NETWORK',
    desc: 'Wholesale distributors, material suppliers, industrial contractors & factories',
    engineKey: 'indiamart'
  },
  digital_footprint: {
    id: 'digital_footprint',
    name: 'Digital Footprint Scanner',
    shortName: 'WhatsApp & Social',
    badge: '💬 SOCIAL & WA',
    desc: 'Direct WhatsApp communication channels, official websites and social presence',
    engineKey: 'social'
  },
  hospitality_registry: {
    id: 'hospitality_registry',
    name: 'Hospitality & Venue Registry',
    shortName: 'Venues & Events',
    badge: '🏛️ VENUE VAULT',
    desc: 'Convention centers, kalyana mandapams, banquet halls & event contractors',
    engineKey: 'weddings'
  }
};

// Known urban ward/landmark to parent city mapping
const LANDMARK_DICTIONARY = {
  'benz circle': { parent: 'Vijayawada', type: 'Ward/Junction' },
  'auto nagar': { parent: 'Vijayawada', type: 'Industrial Area' },
  'machavaram': { parent: 'Vijayawada', type: 'Ward' },
  'maruthi nagar': { parent: 'Vijayawada', type: 'Residential Ward' },
  'governorpet': { parent: 'Vijayawada', type: 'Commercial Ward' },
  'bhavanipuram': { parent: 'Vijayawada', type: 'Ward' },
  'patamata': { parent: 'Vijayawada', type: 'Ward' },
  'moghalrajpuram': { parent: 'Vijayawada', type: 'Ward' },
  'gunadala': { parent: 'Vijayawada', type: 'Ward' },
  'one town': { parent: 'Vijayawada', type: 'Historic Ward' },
  'two town': { parent: 'Vijayawada', type: 'Ward' },
  'payakapuram': { parent: 'Vijayawada', type: 'Ward' },
  'gollapudi': { parent: 'Vijayawada', type: 'Mandal/Sub-Metro' },
  'enikepadu': { parent: 'Vijayawada Rural', type: 'Mandal Village' },
  'nunna': { parent: 'Vijayawada Rural', type: 'Mandal Village' },
  'nidamanuru': { parent: 'Vijayawada Rural', type: 'Mandal Village' },
  'jakkampudi': { parent: 'Vijayawada Rural', type: 'Mandal Village' },
  'morrispet': { parent: 'Tenali', type: 'Ward' },
  'gandhinagar': { parent: 'Tenali', type: 'Ward' },
  'angalakuduru': { parent: 'Tenali', type: 'Ward' },
  'burripalem': { parent: 'Tenali', type: 'Ward' },
  'china ravuru': { parent: 'Tenali', type: 'Ward' },
  'kolakaluru': { parent: 'Tenali', type: 'Sub-Mandal' },
  'mangalagiri': { parent: 'Guntur', type: 'Town/Sub-Metro' },
  'tadepalle': { parent: 'Guntur', type: 'Town/Sub-Metro' },
  'amaravathi': { parent: 'Guntur', type: 'Capital Region' }
};

const STOPWORDS_FLUFF = [
  'i want', 'i need', 'find me', 'show me', 'search for', 'can you find', 'looking for',
  'give me', 'list of', 'list all', 'who are the', 'where are the', 'please find',
  'best', 'top', 'cheap', 'affordable', 'good', 'some', 'few'
];

const VERB_FIRST_TRADE_NOUNS = 'mobiles?|phones?|smartphones?|iphones?|cellphones?|laptops?|computers?|pcs?|macbooks?|printers?|cameras?|dslrs?|ac|air\\s*conditioners?|fridges?|refrigerators?|washing\\s*machines?|tvs?|televisions?|microwaves?|ovens?|inverters?|ro\\s*purifiers?|water\\s*purifiers?|geysers?|cars?|bikes?|two\\s*wheelers?|vehicles?|watches?|cycles?|appliances?';

function reorderVerbFirstCategory(catText) {
  let out = String(catText || '').replace(/\s+/g, ' ').trim();
  if (!out) return out;
  // "repair mobile" / "fix iphone" -> "mobile repair" / "iphone repair"
  const repairLeadRx = new RegExp(`^(repair|repairing|fix|fixing|servicing)\\s+(${VERB_FIRST_TRADE_NOUNS})(?:\\s+(.*))?$`, 'i');
  const repairMatch = out.match(repairLeadRx);
  if (repairMatch) {
    const verb = /^servicing$/i.test(repairMatch[1]) ? 'service' : 'repair';
    const tail = repairMatch[3] ? ` ${repairMatch[3]}` : '';
    return `${repairMatch[2]} ${verb}${tail}`.replace(/\s+/g, ' ').trim();
  }
  const installLeadRx = /^(install|installation\s+of)\s+(.+)$/i;
  const installMatch = out.match(installLeadRx);
  if (installMatch && !/\binstallation\b/i.test(installMatch[2])) {
    return `${installMatch[2]} installation`.replace(/\s+/g, ' ').trim();
  }
  return out;
}

/**
 * Universal Natural Language Parser
 * @param {string} rawInput 
 * @returns {object} Full parsed execution contract
 */
function parseUniversalQuery(rawInput, defaultCountry = 'IN') {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      query: '',
      category: '',
      location: '',
      country: { code: defaultCountry || 'IN', name: defaultCountry === 'US' ? 'United States' : 'India' },
      recommendedEngines: COUNTRY_ENGINE_MAP[defaultCountry || 'IN'] || COUNTRY_ENGINE_MAP.IN,
      engineQueries: compileEngineQueries('', '', defaultCountry || 'IN'),
      radius: 5,
      landmark: null,
      modifiers: { phoneOnly: false, minRating: 0, urgent: false, isB2B: false },
      vectors: ['geospatial_mesh', 'direct_telecom'],
      vectorDetails: [PROPRIETARY_VECTORS.geospatial_mesh, PROPRIETARY_VECTORS.direct_telecom],
      zones: [],
      zonesCount: 1,
      expectedLeads: '50–150',
      estimatedSpeed: '4.5s',
      ready: false
    };
  }

  let text = rawInput.trim();
  let normalized = text.toLowerCase();

  // 1. Extract Radius (e.g., "5km", "within 10 km", "around 15km", "radius 3km")
  let radius = 5; // Standard benchmark 5km per zone
  const radiusMatch = normalized.match(/(?:within|around|under|in)?\s*(\d{1,2})\s*(?:km|kms|kilometer|kilometers)\b/i);
  if (radiusMatch) {
    radius = Math.max(1, Math.min(25, parseInt(radiusMatch[1], 10)));
    normalized = normalized.replace(radiusMatch[0], ' ').trim();
  }

  // 2. Extract Modifiers (Phone, Rating, Urgency, B2B)
  const modifiers = {
    phoneOnly: false,
    minRating: 0,
    urgent: false,
    isB2B: false
  };

  if (/\b(?:with\s+(?:phone|mobile|contact)s?|only\s+(?:phone|mobile)\s+numbers?|(?:phone|mobile|contact)\s+numbers?\s+only|verified\s+contact|has:phone)\b/i.test(normalized)) {
    modifiers.phoneOnly = true;
    normalized = normalized.replace(/\b(?:with\s+(?:phone|mobile|contact)s?|only\s+(?:phone|mobile)\s+numbers?|(?:phone|mobile|contact)\s+numbers?\s+only|verified\s+contact|has:phone)\b/gi, ' ');
  }

  if (/\b(?:without\s+website|no\s+website)\b/i.test(normalized)) {
    modifiers.noWebsiteOnly = true;
    normalized = normalized.replace(/\b(?:without\s+website|no\s+website)\b/gi, ' ');
  }

  if (/\b(?:with\s+whatsapp|whatsapp\s+only)\b/i.test(normalized)) {
    modifiers.whatsappOnly = true;
    normalized = normalized.replace(/\b(?:with\s+whatsapp|whatsapp\s+only)\b/gi, ' ');
  }

  if (/\b(?:top rated|best rated|highest rated|rated 4\+|4 star|5 star)\b/i.test(normalized)) {
    modifiers.minRating = 4.0;
    normalized = normalized.replace(/\b(?:top rated|best rated|highest rated|rated 4\+|4 star|5 star)\b/gi, ' ');
  }

  if (/\b(?:urgent|emergency|24 hours|24\/7|immediate|fast)\b/i.test(normalized)) {
    modifiers.urgent = true;
    normalized = normalized.replace(/\b(?:urgent|emergency|24 hours|24\/7|immediate)\b/gi, ' ');
  }

  if (/\b(?:wholesale|suppliers?|manufacturers?|distributors?|dealers?|bulk|factories|factory|contractors?)\b/i.test(normalized)) {
    modifiers.isB2B = true;
  }

  // 3. Strip fluff keywords
  for (const fluff of STOPWORDS_FLUFF) {
    const rx = new RegExp(`(^|\\s)${fluff}(\\s|$)`, 'gi');
    normalized = normalized.replace(rx, ' ');
  }
  normalized = normalized.replace(/\s+/g, ' ').trim();
  normalized = normalizePrepositionTypos(normalized);

  // Normalize isolated typo prepositions (e.g. 'phtgaphers I gntur' -> 'phtgaphers in gntur')
  normalized = normalized.replace(/\s+\b([iI]|n|arund|aroun)\b\s+/g, ' in ');

  // Normalize city typos & regional shorthand in tokens
  const CITY_TYPO_MAP = {
    'gntur': 'Guntur', 'guntor': 'Guntur', 'mubai': 'Mumbai', 'mumbay': 'Mumbai',
    'hyd': 'Hyderabad', 'hydrabad': 'Hyderabad', 'hyderbad': 'Hyderabad',
    'vja': 'Vijayawada', 'bezawada': 'Vijayawada', 'vijaywada': 'Vijayawada', 'vijayawda': 'Vijayawada',
    'vizag': 'Visakhapatnam', 'vishakapatnam': 'Visakhapatnam', 'tirupathi': 'Tirupati',
    'blr': 'Bengaluru', 'blore': 'Bengaluru', 'bengaluru': 'Bengaluru', 'banglore': 'Bengaluru', 'bangalore': 'Bengaluru',
    'madras': 'Chennai', 'chenai': 'Chennai', 'calcutta': 'Kolkata', 'kolkatta': 'Kolkata',
    'delhy': 'Delhi', 'poona': 'Pune', 'pune': 'Pune', 'secndrabad': 'Secunderabad', 'tenal': 'Tenali'
  };

  const normTokens = normalized.split(/\s+/).map(t => {
    const cleanT = t.toLowerCase().replace(/[^a-z]/g, '');
    return CITY_TYPO_MAP[cleanT] || t;
  });
  normalized = normTokens.join(' ');

  // 4. Split Category vs Location
  let rawCategory = normalized;
  let rawLocation = '';
  let matchedLandmark = null;
  let parentCity = null;

  // Check landmark matches with strict word boundaries first
  for (const [lmKey, info] of Object.entries(LANDMARK_DICTIONARY)) {
    const lmRx = new RegExp(`\\b${lmKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (lmRx.test(normalized)) {
      matchedLandmark = lmKey;
      parentCity = info.parent;
      rawLocation = `${lmKey}, ${info.parent}`;
      rawCategory = normalized
        .replace(lmRx, ' ')
        .replace(new RegExp(`\\b${info.parent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), ' ')
        .trim();
      break;
    }
  }

  if (!rawLocation) {
    const prepRegex = /\s+(in|near|around|within|at|across)\s+/i;
    if (prepRegex.test(normalized)) {
      const parts = normalized.split(prepRegex).filter(Boolean);
      rawCategory = parts[0].trim();
      const locCandidates = parts.slice(1);
      const locMap = new Map();
      locCandidates.forEach(cand => {
        const cleanCand = cand.replace(/\b(in|near|at|around|within|across)\b/gi, '').trim();
        if (cleanCand) {
          const canonical = CITY_TYPO_MAP[cleanCand.toLowerCase()] || cleanCand;
          locMap.set(canonical.toLowerCase(), canonical);
        }
      });
      rawLocation = Array.from(locMap.values()).join(', ');
    } else if (/[,|]\s*|\s+-\s+/.test(normalized)) {
      const sepParts = normalized.split(/\s*[,|]\s*|\s+-\s+/).map(s => s.trim()).filter(Boolean);
      if (sepParts.length >= 2) {
        const firstLower = sepParts[0].toLowerCase();
        const isFirstCity = MAJOR_CITIES.some(c => c.toLowerCase() === firstLower) || ALL_STATES.some(s => s.toLowerCase() === firstLower);
        if (isFirstCity) {
          rawLocation = sepParts[0];
          rawCategory = sepParts.slice(1).join(' ');
        } else {
          rawLocation = sepParts[sepParts.length - 1];
          rawCategory = sepParts.slice(0, -1).join(' ');
        }
      }
    } else {
      // Check known cities/states occurring at the end OR start
      for (const city of [...MAJOR_CITIES, ...ALL_STATES]) {
        const cityLower = city.toLowerCase();
        if (normalized.toLowerCase().endsWith(` ${cityLower}`)) {
          rawLocation = city;
          rawCategory = normalized.substring(0, normalized.length - cityLower.length - 1).trim();
          break;
        } else if (normalized.toLowerCase().startsWith(`${cityLower} `)) {
          rawLocation = city;
          rawCategory = normalized.substring(cityLower.length + 1).trim();
          break;
        }
      }
      // India geo index fallback (districts, mandals, towns, villages) when no major city matched
      if (!rawLocation) {
        try {
          const indiaGeoIndex = require('./indiaGeoIndex');
          const words = normalized.split(/\s+/).filter(Boolean);
          if (words.length >= 2) {
            for (let take = Math.min(3, words.length - 1); take >= 1; take--) {
              const tail = words.slice(-take).join(' ');
              const head = words.slice(0, take).join(' ');
              const tailHit = tail.length >= 3 ? indiaGeoIndex.resolveQuick(tail) : null;
              if (tailHit && (tailHit.district || tailHit.city || tailHit.state || tailHit.village)) {
                rawLocation = tail;
                rawCategory = words.slice(0, -take).join(' ');
                break;
              }
              const headHit = head.length >= 3 ? indiaGeoIndex.resolveQuick(head) : null;
              if (headHit && (headHit.district || headHit.city || headHit.state || headHit.village)) {
                rawLocation = head;
                rawCategory = words.slice(take).join(' ');
                break;
              }
            }
          }
        } catch (e) {}
      }
    }
  }

  // Clean trailing/leading dangling prepositions in rawLocation
  rawLocation = rawLocation
    .replace(/\b(?:with|and|or|in|near|at|around|under|from)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If location has landmark but no parent city, append parent city
  const locLower = rawLocation.toLowerCase();
  for (const [lmKey, info] of Object.entries(LANDMARK_DICTIONARY)) {
    if (locLower.includes(lmKey)) {
      matchedLandmark = lmKey;
      if (!locLower.includes(info.parent.toLowerCase())) {
        rawLocation = `${rawLocation}, ${info.parent}`;
      }
      break;
    }
  }

  // Clean category while strictly preserving trade nouns ("services", "repair", "dealers", "contractors", "works")
  let cleanCategory = rawCategory
    .replace(/^(?:with|in|near|at|around|under|from)\b\s*/gi, '')
    .replace(/\s*\b(?:in|near|at|around|under|from)$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  cleanCategory = reorderVerbFirstCategory(cleanCategory);

  // Strip duplicate location name if it still leaked into cleanCategory
  if (rawLocation) {
    const locWords = rawLocation.toLowerCase().split(/[\s,]+/).filter(w => w.length >= 3);
    for (const lw of locWords) {
      const rx = new RegExp(`(^|\\s)${lw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`, 'gi');
      cleanCategory = cleanCategory.replace(rx, ' ').trim();
    }
  }

  try {
    const { normalizeTradePhrase } = require('./tradeIntelligence');
    cleanCategory = normalizeTradePhrase(cleanCategory);
    cleanCategory = reorderVerbFirstCategory(cleanCategory);
  } catch (e) {
    // fallback
  }

  const catWords = cleanCategory.split(/\s+/).filter(Boolean);
  const formattedCategory = catWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Clean and format location
  let formattedLocation = rawLocation.split(',').map(s => {
    return s.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }).filter(Boolean).join(', ');

  // 5. Select Proprietary Vectors
  const selectedVectors = ['geospatial_mesh', 'direct_telecom', 'deep_serp'];
  
  const catLower = cleanCategory.toLowerCase();
  const isWedding = /(?:wedding|mandap|banquet|photographer|decorator|caterer|mehendi|bridal|hall)/i.test(catLower);
  const isB2B = modifiers.isB2B || /(?:pipes?|pvc|steel|cement|wholesale|supplier|distributor|machinery|industrial)/i.test(catLower);

  if (isWedding) {
    selectedVectors.push('hospitality_registry');
  }
  if (isB2B) {
    selectedVectors.push('b2b_network');
  }
  selectedVectors.push('digital_footprint');

  const uniqueVectors = Array.from(new Set(selectedVectors));
  const vectorDetails = uniqueVectors.map(v => PROPRIETARY_VECTORS[v]).filter(Boolean);

  // 6. Resolve Constituent Zones via Universal Geo Cluster
  let resolvedZones = [];
  if (formattedLocation) {
    try {
      resolvedZones = resolveUniversalZones(formattedLocation, formattedCategory) || [];
    } catch (e) {
      // safe fallback
    }
  }

  const zonesCount = resolvedZones.length || 1;
  const ready = Boolean(formattedCategory && formattedLocation);
  const expectedMin = zonesCount * (uniqueVectors.length >= 4 ? 20 : 14);
  const expectedMax = zonesCount * (uniqueVectors.length >= 4 ? 40 : 25);
  const coverageKind = zonesCount > 10 ? 'whole-city' : 'locality';

  // 7. Resolve Country Intelligence & Multi-Engine Queries
  let resolvedCountryCode = (defaultCountry && defaultCountry !== 'IN') ? defaultCountry.toUpperCase() : null;
  if (!resolvedCountryCode) {
    const locHit = detectCountry(rawLocation || text);
    if (locHit && locHit.code) {
      resolvedCountryCode = locHit.code;
    } else {
      try {
        const gzHit = gazetteer.lookup(rawLocation || text);
        if (gzHit) resolvedCountryCode = 'IN';
      } catch (e) {}
    }
  }
  if (!resolvedCountryCode) resolvedCountryCode = 'IN';

  const countryProfile = COUNTRIES.find(c => c.code === resolvedCountryCode) || {
    code: resolvedCountryCode,
    name: resolvedCountryCode === 'US' ? 'United States' : (resolvedCountryCode === 'GB' ? 'United Kingdom' : 'India'),
    phone: resolvedCountryCode === 'US' ? '+1' : (resolvedCountryCode === 'GB' ? '+44' : '+91'),
    currency: resolvedCountryCode === 'US' ? 'USD' : (resolvedCountryCode === 'GB' ? 'GBP' : 'INR')
  };

  const engineQueries = compileEngineQueries(formattedCategory, formattedLocation, resolvedCountryCode, modifiers);
  const recommendedEngines = COUNTRY_ENGINE_MAP[resolvedCountryCode] || COUNTRY_ENGINE_MAP.US;

  return {
    raw: text,
    category: formattedCategory || (ready ? 'Businesses' : text),
    location: formattedLocation,
    country: {
      code: countryProfile.code,
      name: countryProfile.name,
      phonePrefix: countryProfile.phone,
      currency: countryProfile.currency,
      topTerm: countryProfile.topTerm || 'State',
      localTerm: countryProfile.localTerm || 'City'
    },
    recommendedEngines,
    engineQueries,
    landmark: matchedLandmark ? matchedLandmark.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null,
    radius,
    modifiers,
    vectors: uniqueVectors,
    vectorDetails,
    zones: resolvedZones.slice(0, 15),
    zonesCount,
    coverageKind,
    gridCells: resolvedZones.filter(z => z.coverageKind === 'grid').length,
    vectorZones: resolvedZones.filter(z => z.coverageKind === 'vector').length,
    expectedLeads: ready ? `${expectedMin}–${expectedMax}+ verified leads` : 'Add location for estimate',
    estimatedSpeed: ready ? `${Math.max(25, Math.round(zonesCount * 4))}s+` : 'Instant',
    ready
  };
}

module.exports = {
  parseUniversalQuery,
  PROPRIETARY_VECTORS,
  LANDMARK_DICTIONARY
};
