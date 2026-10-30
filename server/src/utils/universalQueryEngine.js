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
  'best', 'top', 'cheap', 'affordable', 'good', 'some', 'few', 'services', 'service'
];

/**
 * Universal Natural Language Parser
 * @param {string} rawInput 
 * @returns {object} Full parsed execution contract
 */
function parseUniversalQuery(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      query: '',
      category: '',
      location: '',
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

  if (/\b(?:with phone|with mobile|mobile numbers?|contact numbers?|phones?|verified contact|phone|mobiles?)\b/i.test(normalized)) {
    modifiers.phoneOnly = true;
    normalized = normalized.replace(/\b(?:with phone|with mobile|mobile numbers?|contact numbers?|phones?|verified contact)\b/gi, ' ');
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

  // 4. Split Category vs Location
  let rawCategory = normalized;
  let rawLocation = '';
  let matchedLandmark = null;
  let parentCity = null;

  // Check landmark matches first
  for (const [lmKey, info] of Object.entries(LANDMARK_DICTIONARY)) {
    if (normalized.includes(lmKey)) {
      matchedLandmark = lmKey;
      parentCity = info.parent;
      rawLocation = `${lmKey}, ${info.parent}`;
      // Strip both landmark and parent from category
      rawCategory = normalized.replace(lmKey, ' ').replace(info.parent.toLowerCase(), ' ').trim();
      break;
    }
  }

  if (!rawLocation) {
    const prepMatch = normalized.match(/\s+(in|near|around|within|at|across)\s+/i);
    if (prepMatch) {
      const splitIndex = prepMatch.index;
      rawCategory = normalized.substring(0, splitIndex).trim();
      rawLocation = normalized.substring(splitIndex + prepMatch[0].length).trim();
    } else {
      // Check known cities occurring at the end or start
      for (const city of MAJOR_CITIES) {
        const cityLower = city.toLowerCase();
        if (normalized.endsWith(` ${cityLower}`)) {
          rawLocation = city;
          rawCategory = normalized.substring(0, normalized.length - cityLower.length - 1).trim();
          break;
        } else if (normalized.startsWith(`${cityLower} `)) {
          rawLocation = city;
          rawCategory = normalized.substring(cityLower.length + 1).trim();
          break;
        }
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

  // Clean and capitalize category
  let cleanCategory = rawCategory
    .replace(/\b(?:with|and|or|in|near|at|around|under|from)\b/gi, ' ')
    .replace(/^(services?|contractors?|works?|dealers?|repair)\s+/gi, '')
    .replace(/\s+(services?|works?)$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

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
      resolvedZones = resolveUniversalZones(formattedLocation) || [];
    } catch (e) {
      // safe fallback
    }
  }

  const zonesCount = resolvedZones.length || 1;
  const ready = Boolean(formattedCategory && formattedLocation);
  const expectedMin = zonesCount * (uniqueVectors.length >= 4 ? 20 : 14);
  const expectedMax = zonesCount * (uniqueVectors.length >= 4 ? 40 : 25);

  return {
    raw: text,
    category: formattedCategory || (ready ? 'Businesses' : text),
    location: formattedLocation,
    landmark: matchedLandmark ? matchedLandmark.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null,
    radius,
    modifiers,
    vectors: uniqueVectors,
    vectorDetails,
    zones: resolvedZones.slice(0, 15),
    zonesCount,
    expectedLeads: ready ? `${expectedMin}–${expectedMax}+ verified leads` : 'Add location for estimate',
    estimatedSpeed: ready ? `${Math.min(10, Math.max(3, Math.round(zonesCount * 0.7)))}s` : 'Instant',
    ready
  };
}

module.exports = {
  parseUniversalQuery,
  PROPRIETARY_VECTORS,
  LANDMARK_DICTIONARY
};
