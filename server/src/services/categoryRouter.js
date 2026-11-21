/**
 * categoryRouter.js
 *
 * Universal category understanding for the local-first vendor scraper.
 *
 * It classifies any free-text vendor category (plumbers, electricians,
 * banquet halls, dental clinics, car showrooms, fabricators ...) into a
 * family, then selects only the discovery engines that can actually return
 * vendors for that family. This is what keeps an auto run fast: wedding
 * directories never run for plumbers, and IndiaMART only runs for
 * supplier/industrial searches.
 *
 * No data is invented here. Everything is deterministic classification.
 */

const brandIntel = require('./brandIntel');
const indiaTradeIntelligence = require('../utils/indiaTradeIntelligence');

const FAMILY_DEFINITIONS = {
  agriculture_spices: {
    label: 'Agriculture, Spices & Commodities',
    description: 'Turmeric, chilli, agro commodities, mandi merchants, rice mills and cold storage',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'indiamart', 'openstreetmap'],
    cityEngines: ['google-serp', 'justdial', 'indiamart', 'openstreetmap']
  },
  textiles: {
    label: 'Textiles, Sarees & Apparel',
    description: 'Saree showrooms, handlooms, fabrics, spinning mills and wholesale garments',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'indiamart', 'openstreetmap'],
    cityEngines: ['google-serp', 'justdial', 'indiamart', 'openstreetmap']
  },
  metals: {
    label: 'Iron, Steel & Metals',
    description: 'TMT bars, structural steel, sheet metal, fabrication and industrial metal stores',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'indiamart', 'openstreetmap'],
    cityEngines: ['google-serp', 'justdial', 'indiamart', 'openstreetmap']
  },
  technology: {
    label: 'IT, Computers & Electronics',
    description: 'Computer shops, laptop dealers, mobile stores, CCTV, software and electronics',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'openstreetmap', 'indiamart', 'social'],
    cityEngines: ['google-serp', 'justdial', 'openstreetmap', 'indiamart', 'social']
  },
  photography: {
    label: 'Photography, Studios & Media',
    description: 'Photo studios, wedding photographers, candid shoots, drone videography and digital labs',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'openstreetmap', 'social'],
    cityEngines: ['google-serp', 'justdial', 'openstreetmap', 'social']
  },
  wedding: {
    label: 'Weddings & events',
    description: 'Venues, decor, photography, catering and wedding services',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'weddingbazaar', 'weddingwire', 'mandap', 'openstreetmap', 'social'],
    cityEngines: ['google-serp', 'justdial', 'weddingbazaar', 'weddingwire', 'mandap', 'openstreetmap', 'social']
  },
  'home-services': {
    label: 'Home services',
    description: 'Plumbers, electricians, carpenters, painters and repair services',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'openstreetmap', 'social'],
    cityEngines: ['google-serp', 'justdial', 'openstreetmap', 'social']
  },
  retail: {
    label: 'Retail & showrooms',
    description: 'Stores, showrooms, boutiques and consumer brands',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'openstreetmap', 'indiamart'],
    cityEngines: ['google-serp', 'justdial', 'openstreetmap', 'indiamart']
  },
  health: {
    label: 'Health & medical',
    description: 'Clinics, hospitals, dentists, pharmacies and diagnostics',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'openstreetmap'],
    cityEngines: ['google-serp', 'justdial', 'openstreetmap']
  },
  beauty: {
    label: 'Beauty & wellness',
    description: 'Salons, spas, makeup artists and wellness studios',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'openstreetmap', 'social'],
    cityEngines: ['google-serp', 'justdial', 'openstreetmap', 'social']
  },
  food: {
    label: 'Food & dining',
    description: 'Restaurants, cafes, bakeries, caterers and cloud kitchens',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'openstreetmap', 'social'],
    cityEngines: ['google-serp', 'justdial', 'openstreetmap', 'social']
  },
  auto: {
    label: 'Automotive',
    description: 'Car and bike showrooms, garages, service centres and parts',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'openstreetmap'],
    cityEngines: ['google-serp', 'justdial', 'openstreetmap']
  },
  'real-estate': {
    label: 'Real estate & property',
    description: 'Builders, property dealers, architects and construction',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'openstreetmap', 'social'],
    cityEngines: ['google-serp', 'justdial', 'openstreetmap', 'social']
  },
  education: {
    label: 'Education & training',
    description: 'Schools, colleges, coaching centres and skill institutes',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'openstreetmap', 'social'],
    cityEngines: ['google-serp', 'justdial', 'openstreetmap', 'social']
  },
  professional: {
    label: 'Professional services',
    description: 'Lawyers, accountants, agencies, IT and business services',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'openstreetmap', 'social'],
    cityEngines: ['google-serp', 'justdial', 'openstreetmap', 'social']
  },
  industrial: {
    label: 'Industrial & B2B',
    description: 'Manufacturers, wholesalers, distributors and suppliers',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'indiamart', 'openstreetmap'],
    cityEngines: ['google-serp', 'justdial', 'indiamart', 'openstreetmap']
  },
  logistics: {
    label: 'Logistics & Transport',
    description: 'Packers, movers, transport companies, couriers, freight and warehouses',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'openstreetmap', 'indiamart'],
    cityEngines: ['google-serp', 'justdial', 'openstreetmap', 'indiamart']
  },
  hospitality: {
    label: 'Hotels & Travel',
    description: 'Hotels, resorts, lodges, travel agencies, tours and rentals',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'openstreetmap', 'social'],
    cityEngines: ['google-serp', 'justdial', 'openstreetmap', 'social']
  },
  fitness: {
    label: 'Fitness & Sports',
    description: 'Gyms, yoga studios, fitness clubs, swimming and sports academies',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'openstreetmap', 'social'],
    cityEngines: ['google-serp', 'justdial', 'openstreetmap', 'social']
  },
  generic: {
    label: 'General vendors',
    description: 'Any local business, service or supplier',
    engines: ['google-local-finder', 'maps', 'google-serp', 'justdial', 'openstreetmap', 'social'],
    cityEngines: ['google-serp', 'justdial', 'openstreetmap', 'social']
  }
};

// Weighted stems. Higher weight wins when two families match the same text.
// These are stems, so "plumb" matches plumber/plumbing/plumbers.
const FAMILY_KEYWORDS = {
  technology: [
    ['computer shop', 14], ['computer shops', 14], ['computer store', 14], ['computer stores', 14],
    ['computer dealer', 13], ['computer dealers', 13], ['computer hardware', 13], ['computer repair', 13],
    ['computer service', 12], ['computer accessories', 12], ['laptop shop', 14], ['laptop store', 14],
    ['laptop dealer', 13], ['laptop repair', 13], ['laptop service', 12], ['second hand laptop', 12],
    ['desktop pc', 12], ['gaming pc', 12], ['custom pc', 12], ['pc repair', 12],
    ['mobile shop', 13], ['mobile shops', 13], ['mobile store', 13], ['mobile repair', 13],
    ['smartphone', 11], ['iphone repair', 12], ['electronics shop', 11], ['electronics store', 11],
    ['cctv', 11], ['security camera', 11], ['biometric', 10], ['printer repair', 11],
    ['printer dealer', 11], ['toner refill', 10], ['camera repair', 13], ['dslr repair', 13], ['networking', 10], ['software company', 11],
    ['web development', 10], ['app development', 10], ['it services', 11], ['it company', 11],
    ['computer', 9], ['laptop', 9], ['desktop', 8], ['hardware', 6], ['electronics', 6]
  ],
  photography: [
    ['photo studio', 10], ['photo studios', 10], ['photographer', 9], ['photographers', 9],
    ['photography', 9], ['candid photography', 10], ['candid photographer', 10],
    ['wedding photographer', 10], ['pre wedding', 10], ['drone videography', 10],
    ['cinematography', 9], ['digital studio', 9], ['digital photo lab', 9],
    ['portrait studio', 9], ['photo shoot', 8], ['photoshoot', 8],
    ['photo', 7], ['studio', 6], ['videographer', 8], ['videography', 8]
  ],
  wedding: [
    ['wedding', 8], ['bride', 6], ['bridal', 7], ['groom', 5], ['banquet', 7],
    ['mandap', 8], ['sangeet', 7], ['mehendi', 6], ['haldi', 5], ['nikah', 6],
    ['matrimony', 6], ['marriage', 5], ['reception hall', 6], ['engagement', 4],
    ['wedding planner', 8], ['wedding venue', 8], ['wedding photographer', 8],
    ['wedding decorator', 7], ['wedding caterer', 6], ['invitation card', 4],
    ['tent house', 4], ['event planner', 4], ['event management', 3], ['dq', 1],
    ['function hall', 9], ['function halls', 9],
    ['convention centre', 9], ['convention center', 9], ['convention centres', 9], ['convention centers', 9],
    ['kalyana mandapam', 9], ['kalyanamandapam', 9],
    ['marriage hall', 9], ['marriage halls', 9],
    ['party hall', 8], ['party halls', 8],
    ['community hall', 8], ['community halls', 8],
    ['shadi mahal', 9], ['venue', 7], ['venues', 7],
    ['ac function hall', 10], ['ac function halls', 10],
    ['ac convention centre', 10], ['ac convention center', 10],
    ['ac convention centres', 10], ['ac convention centers', 10]
  ],
  'home-services': [
    ['plumb', 8], ['electric', 8], ['carpenter', 8], ['carpentry', 7], ['painter', 6],
    ['painting', 5], ['pest control', 8], ['cleaning service', 7], ['house cleaning', 6],
    ['ac repair', 8], ['air condition', 7], ['appliance repair', 8], ['refrigerator repair', 8],
    ['washing machine repair', 8], ['water purifier', 6], ['packers', 7], ['movers', 7],
    ['packers and movers', 9], ['interior design', 4], ['modular kitchen', 6],
    ['false ceiling', 6], ['waterproofing', 7], ['solar install', 6], ['cctv', 6],
    ['security service', 4], ['gardener', 6], ['landscaping', 5], ['mason', 6],
    ['civil contractor', 6], ['renovation', 5], ['handyman', 7], ['welder', 6],
    ['fabrication', 4], ['borewell', 7], ['drilling', 5], ['lift repair', 7],
    ['elevator', 5], ['chimney', 5], ['sofa cleaning', 7], ['technician', 4],
    ['home service', 5], ['repair service', 5]
  ],
  retail: [
    ['camera shop', 15], ['camera shops', 15], ['camera store', 15], ['camera stores', 15],
    ['camera dealer', 14], ['camera dealers', 14], ['camera showroom', 14], ['dslr shop', 14],
    ['dslr store', 14], ['dslr camera', 13], ['camera lens', 13], ['camera', 11],
    ['showroom', 5], ['store', 4], ['shop', 4], ['boutique', 5], ['mall', 4],
    ['supermarket', 6], ['kirana', 6], ['grocery', 6], ['electronics', 6],
    ['mobile shop', 7], ['mobile store', 7], ['furniture', 6], ['jewell', 6],
    ['jewel', 6], ['clothing', 5], ['apparel', 5], ['footwear', 5], ['fashion', 4],
    ['gift shop', 6], ['stationery', 5], ['book store', 6], ['toy store', 6],
    ['hardware', 5], ['paint store', 6], ['tiles', 5], ['sanitary', 5],
    ['kitchenware', 6], ['optical', 4], ['pet shop', 6], ['cosmetic store', 6],
    ['departmental', 5], ['retail', 4], ['dealer', 2], ['distributor', 3]
  ],
  health: [
    ['clinic', 7], ['hospital', 7], ['doctor', 7], ['dentist', 8], ['dental', 8],
    ['orthodont', 7], ['dermatolog', 7], ['gynec', 7], ['pediatric', 7],
    ['physician', 6], ['pharmacy', 7], ['chemist', 6], ['diagnostic', 7],
    ['pathology', 7], ['physiotherap', 7], ['ayurved', 6], ['homeopath', 6],
    ['veterinary', 6], ['eye care', 7], ['ivf', 7], ['fertility', 6],
    ['medical', 5], ['nursing home', 7], ['scan centre', 6], ['lab', 3]
  ],
  beauty: [
    ['salon', 8], ['spa', 7], ['parlour', 8], ['parlor', 8], ['beauty', 7],
    ['hair', 5], ['makeup', 8], ['make-up', 8], ['nail', 5], ['tattoo', 6],
    ['barber', 7], ['waxing', 7], ['threading', 7], ['massage', 5], ['wellness', 4],
    ['grooming', 5], ['cosmetolog', 6], ['skin care', 5]
  ],
  food: [
    ['restaurant', 8], ['cafe', 7], ['coffee', 6], ['bakery', 7], ['caterer', 7],
    ['catering', 7], ['cloud kitchen', 8], ['food', 4], ['bar', 3], ['pub', 5],
    ['brewery', 6], ['sweet shop', 6], ['ice cream', 6], ['biryani', 7],
    ['pizza', 6], ['dining', 5], ['eatery', 6], ['juice', 4], ['fast food', 6]
  ],
  auto: [
    ['car showroom', 9], ['bike showroom', 9], ['motorcycle', 7], ['scooter', 6],
    ['automobile', 7], ['car dealer', 8], ['car service', 8], ['garage', 8],
    ['service center', 6], ['tyre', 6], ['tire', 5], ['battery shop', 6],
    ['spare parts', 7], ['auto parts', 7], ['car wash', 7], ['detailing', 5],
    ['ev charging', 7], ['driving school', 7],
    ['car rental', 9], ['car rentals', 9], ['bike rental', 9], ['bike rentals', 9],
    ['rent a car', 9], ['self drive', 9], ['cab service', 8], ['taxi service', 8], ['car hire', 9],
    ['car', 3], ['bike', 3], ['auto', 2]
  ],
  'real-estate': [
    ['real estate', 9], ['property', 7], ['builder', 7], ['developer', 5],
    ['apartment', 5], ['flat', 4], ['villa', 5], ['plot', 4], ['land', 3],
    ['architect', 6], ['construction', 5], ['interior designer', 6], ['vastu', 5],
    ['rent', 4], ['lease', 4], ['broker', 5], ['realty', 7]
  ],
  education: [
    ['school', 7], ['college', 7], ['university', 7], ['coaching', 8],
    ['tuition', 7], ['institute', 6], ['academy', 6], ['training', 5],
    ['learning', 4], ['preschool', 7], ['kindergarten', 7], ['dance class', 6],
    ['music class', 6], ['spoken english', 7], ['skill development', 6],
    ['study abroad', 7], ['educational', 5]
  ],
  professional: [
    ['lawyer', 8], ['advocate', 8], ['legal', 6], ['chartered accountant', 9],
    ['accountant', 7], ['tax consultant', 8], ['gst consultant', 8],
    ['company secretary', 8], ['consultant', 5], ['consultancy', 5],
    ['agency', 4], ['software', 4], ['it service', 5], ['web design', 5],
    ['digital marketing', 6], ['advertising', 5], ['insurance', 5],
    ['financial', 4], ['loan', 4], ['photographer', 5], ['videograph', 5],
    ['album printing', 10], ['wedding album', 9], ['color lab', 9], ['colour lab', 9],
    ['photo printing', 9], ['printing press', 8], ['offset printing', 8], ['digital printing', 8],
    ['album maker', 9], ['album manufacturer', 9], ['photobook', 8], ['karizma', 8],
    ['printing', 6], ['translation', 5], ['recruitment', 5], ['hr service', 5],
    ['event photographer', 6], ['drone', 4]
  ],
  industrial: [
    ['manufacturer', 9], ['manufacturing', 8], ['supplier', 7], ['wholesaler', 8],
    ['wholesale', 6], ['distributor', 6], ['exporter', 8], ['importer', 7],
    ['industrial', 7], ['factory', 8], ['machinery', 7], ['equipment', 4],
    ['b2b', 7], ['raw material', 7], ['chemical', 5], ['plastic', 5], ['steel', 5],
    ['cement', 4], ['packaging', 5], ['textile', 5], ['garment manufacturer', 8],
    ['foundry', 7], ['pump', 4], ['generator', 5], ['electrical goods', 6],
    ['bulk supplier', 8], ['oem', 6], ['contractor', 4]
  ],
  logistics: [
    ['logistics', 10], ['transport', 9], ['packers and movers', 11], ['courier', 10],
    ['cargo', 9], ['freight', 9], ['warehouse', 9], ['cold storage', 10], ['trucking', 9]
  ],
  hospitality: [
    ['hotel', 10], ['hotels', 10], ['resort', 10], ['resorts', 10], ['lodge', 9],
    ['homestay', 9], ['travel agency', 10], ['tour operator', 10], ['visa consultant', 9]
  ],
  fitness: [
    ['gym', 11], ['gyms', 11], ['fitness', 10], ['yoga', 10], ['pilates', 9],
    ['crossfit', 9], ['zumba', 9], ['sports academy', 10], ['swimming', 8]
  ],
  generic: [
    ['business', 1], ['service', 1], ['company', 1], ['vendor', 1], ['shop', 1]
  ]
};

// Tie-break priority: specialist families win over broad ones with equal score.
const FAMILY_PRIORITY = [
  'agriculture_spices', 'textiles', 'metals', 'technology', 'photography', 'wedding', 'industrial', 'home-services', 'auto', 'real-estate',
  'health', 'fitness', 'hospitality', 'logistics', 'beauty', 'education', 'food', 'retail', 'professional', 'generic'
];

const CATEGORY_STOPWORDS = /^(?:find|search|search for|best|top|list of|show me|show|near me|nearest|good|cheap|affordable|local)\s+/i;
const LOCATION_PREFIX = /^(?:in|near|around|within|at|across)\s+/i;

function clean(value, max = 240) {
  return String(value == null ? '' : value)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function normalize(value) {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywordMatches(text, keyword) {
  if (!text || !keyword) return false;
  // Word-boundary match for short words, substring match for stems.
  if (keyword.length <= 3) {
    return new RegExp(`(^|\\s)${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`, 'i').test(text);
  }
  return text.includes(keyword);
}

function scoreFamily(text, family) {
  let score = 0;
  const matched = [];
  for (const [keyword, weight] of FAMILY_KEYWORDS[family] || []) {
    if (!keywordMatches(text, keyword)) continue;
    score += weight;
    matched.push(keyword);
  }
  return { score, matched };
}

/**
 * Classify any category text into a family.
 * @returns {{family:string,label:string,description:string,engines:string[],cityEngines:string[],confidence:number,matched:string[],wedding:boolean}}
 */
function classifyCategory(category) {
  const raw = clean(category, 240);
  const text = normalize(raw);

  if (!text) {
    return {
      ...FAMILY_DEFINITIONS.generic,
      family: 'generic',
      confidence: 0,
      matched: [],
      wedding: false,
      category: ''
    };
  }

  let bestFamily = 'generic';
  let bestScore = 0;
  let bestMatched = [];
  let genericScore = 0;

  for (const [family, definition] of Object.entries(FAMILY_DEFINITIONS)) {
    if (family === 'generic') continue;
    const result = scoreFamily(text, family);
    if (!result.score) continue;
    if (result.score > bestScore) {
      bestScore = result.score;
      bestFamily = family;
      bestMatched = result.matched;
    } else if (result.score === bestScore) {
      const currentRank = FAMILY_PRIORITY.indexOf(family);
      const bestRank = FAMILY_PRIORITY.indexOf(bestFamily);
      if (currentRank !== -1 && (bestRank === -1 || currentRank < bestRank)) {
        bestFamily = family;
        bestMatched = result.matched;
      }
    }
  }

  if (!bestScore) {
    const generic = scoreFamily(text, 'generic');
    genericScore = generic.score;
    bestFamily = genericScore ? 'generic' : 'generic';
    bestMatched = generic.matched;
  }

  // Pan-Indian Trade Intelligence Boost:
  // Authoritative detection across 11 core commercial sectors
  const tradeSector = indiaTradeIntelligence.detectTradeSector(raw);
  if (tradeSector) {
    const sectorFamilyMap = {
      agriculture_spices: 'agriculture_spices',
      textiles_apparel: 'textiles',
      metals_steel: 'metals',
      building_materials: 'industrial',
      electrical_goods: 'industrial',
      chemicals_packaging: 'industrial',
      industrial_machinery: 'industrial',
      technology_computers: 'technology',
      surveillance_cctv: 'technology',
      photography_media: 'photography',
      weddings_hospitality: 'wedding',
      healthcare_doctors: 'health',
      pharmacies_drugstores: 'health',
      home_services_contractors: 'home-services',
      automotive_garages: 'auto',
      wholesale_building_materials: 'industrial',
      retail_lifestyle: 'retail',
      hospitality_hotels: 'hospitality',
      jewelry_gems: 'retail',
      furniture_woodwork: 'retail',
      footwear_leather: 'retail',
      professional_legal_finance: 'professional',
      beauty_wellness: 'beauty',
      food_dining: 'food',
      education_coaching: 'education'
    };
    const mappedFamily = sectorFamilyMap[tradeSector.key];
    if (mappedFamily && FAMILY_DEFINITIONS[mappedFamily]) {
      if (bestScore < 8 || mappedFamily === 'photography') {
        bestFamily = mappedFamily;
        bestScore = 10;
        bestMatched = ['trade_intelligence', tradeSector.key];
      }
    }
  }

  const definition = FAMILY_DEFINITIONS[bestFamily] || FAMILY_DEFINITIONS.generic;
  const confidence = bestScore >= 8 ? 'high' : bestScore >= 4 ? 'medium' : 'low';

  // Product and brand searches need the B2B supplier index. A shop that sells
  // GPUs is usually listed as "computer hardware dealer", and IndiaMART is the
  // only engine that indexes those dealers city-wide.
  // Album printing, color labs, digital press, and book manufacturing
  // are commercial B2B supplier services. They MUST run on IndiaMART even if the word
  // "wedding" is present in the query (e.g. "wedding album printing").
  const isPrintingOrAlbum = /\b(album|printing|print|color lab|colour lab|press|photobook|karizma|canvera|offset|flex)\b/i.test(raw);
  const isWeddingIntent = /\b(wedding|marriage|matrimony|bride|bridal|groom|banquet|mandap)\b/i.test(raw);
  const intent = brandIntel.detect(raw);
  const engines = [...definition.engines];
  const cityEngines = [...definition.cityEngines];
  if ((intent.brand || intent.product || intent.genericProduct || isPrintingOrAlbum) && (bestFamily !== 'wedding' || isPrintingOrAlbum)) {
    if (!engines.includes('indiamart')) engines.push('indiamart');
    if (!cityEngines.includes('indiamart')) cityEngines.push('indiamart');
  }

  if (isWeddingIntent && !isPrintingOrAlbum) {
    if (!engines.includes('weddingwire')) engines.push('weddingwire');
    if (!cityEngines.includes('weddingwire')) cityEngines.push('weddingwire');
  }

  return {
    family: bestFamily,
    label: definition.label,
    description: definition.description,
    engines,
    cityEngines,
    confidence,
    score: bestScore,
    matched: bestMatched,
    wedding: bestFamily === 'wedding' || isWeddingIntent,
    category: raw,
    intent
  };
}

/**
 * Choose only the engines that make sense for this category.
 * `auto` always returns the family defaults. `fast` drops marketplaces
 * and wedding suites so the first lead arrives sooner.
 */
function pickAutoEngines(classification, options = {}) {
  const info = typeof classification === 'string'
    ? classifyCategory(classification)
    : (classification || classifyCategory(''));
  const mode = String(options.mode || 'auto').toLowerCase();
  let engines = [...(info.engines || FAMILY_DEFINITIONS.generic.engines)];

  // Category fidelity: Mandap.com lists only venues.
  // WeddingWire supports venues, photographers, caterers, planners, makeup.
  try {
    const fidelity = require('./categoryFidelity');
    const isPrintingOrAlbum = /\b(album|printing|print|color lab|colour lab|press|photobook|karizma|canvera|offset|flex)\b/i.test(info.category);
    const isWwSupported = /photo|video|shoot|cater|food|plan|decor|event|makeup|mehendi|bridal|venue|banquet|mandap|hall/i.test(info.category);
    if (isPrintingOrAlbum) {
      engines = engines.filter(engine => !['mandap', 'weddingbazaar', 'weddingwire'].includes(engine));
    } else {
      if (!fidelity.isVenueCategory(info.category)) {
        engines = engines.filter(engine => !['mandap', 'weddingbazaar'].includes(engine));
      }
      if (!isWwSupported) {
        engines = engines.filter(engine => engine !== 'weddingwire');
      }
    }
  } catch (e) {
    // The fidelity module is optional at boot; keep the base engine list.
  }

  if (mode === 'fast') {
    engines = engines.filter(engine => !['indiamart', 'weddingbazaar', 'weddingwire', 'mandap'].includes(engine));
    if (!engines.includes('google-local-finder')) engines.unshift('google-local-finder');
  }

  if (options.includeMarketplaces === false) {
    engines = engines.filter(engine => engine !== 'indiamart');
  }

  // Always retain fast Tier-0 HTTP engines in auto mode for sub-second first leads
  if (!engines.includes('web-discovery')) {
    engines.push('web-discovery');
  }
  if (!engines.includes('openstreetmap')) {
    engines.push('openstreetmap');
  }

  return [...new Set(engines)];
}

/**
 * Split free text such as:
 *   "plumbers in Vijayawada"       -> category Plumbers, location Vijayawada
 *   "best electricians near Guntur" -> category Electricians, location Guntur
 *   "showrooms in Hyderabad"        -> category Showrooms, location Hyderabad
 *
 * If no location is present, the last 1–4 words are checked against the
 * local India geo index (synchronous, in-memory) so "plumbers Vijayawada"
 * still resolves. Nothing is guessed when no match exists.
 */
function parseSearchQuery(input = {}, explicitLocation = '') {
  let queryText = clean(typeof input === 'string' ? input : (input.query || ''), 300);
  let category = clean(typeof input === 'object' ? (input.category || '') : '', 200);
  let location = clean(explicitLocation || (typeof input === 'object' ? (input.location || '') : ''), 200);

  if (queryText && !category && !location) {
    const split = queryText.match(/^(.*?)\s+(?:in|near|around|within|at|across)\s+(.+)$/i);
    if (split) {
      category = clean(split[1], 200);
      location = clean(split[2], 200);
    }
  } else if (queryText && !category && location) {
    category = queryText;
  }

  // Strip common search noise from category.
  if (category) {
    category = category
      .replace(CATEGORY_STOPWORDS, '')
      .replace(/\s+(?:near me|in my area)$/i, '')
      .trim();
  }
  if (location) location = location.replace(LOCATION_PREFIX, '').trim();

  // If there is still no location, try to detect a trailing place name locally.
  if (!location && queryText) {
    try {
      const indiaGeoIndex = require('../utils/indiaGeoIndex');
      const words = queryText.split(/\s+/).filter(Boolean);
      const maxTake = Math.min(4, words.length - 1);
      for (let take = maxTake; take >= 1; take--) {
        const candidate = words.slice(-take).join(' ');
        if (candidate.length < 3) continue;
        const resolved = indiaGeoIndex.resolveQuick(candidate);
        if (resolved && (resolved.district || resolved.state || resolved.village || resolved.city)) {
          location = candidate;
          category = words.slice(0, -take).join(' ');
          break;
        }
      }
    } catch (e) {
      // Geo index is optional for parsing; never fail the request.
    }
  }

  if (!category && queryText) category = queryText;
  if (!category && location) category = 'Business';
  if (category && !location && queryText && queryText !== category) {
    // Query already consumed; leave location empty for the caller to reject.
  }

  return {
    query: queryText,
    category: clean(category, 200),
    location: clean(location, 200)
  };
}

/**
 * Full auto plan for a free-text request. This is the single source of truth
 * used by /api/scrape/auto, the orchestrator and the pre-flight estimator.
 */
function buildAutoPlan(input = {}) {
  const parsed = parseSearchQuery(input, input.location);
  const classification = classifyCategory(parsed.category);
  const engines = pickAutoEngines(classification, {
    mode: input.mode || 'auto',
    includeMarketplaces: input.includeMarketplaces !== false
  });
  return {
    ...parsed,
    family: classification.family,
    familyLabel: classification.label,
    familyDescription: classification.description,
    confidence: classification.confidence,
    matched: classification.matched,
    wedding: classification.wedding,
    engines,
    cityEngines: classification.cityEngines
  };
}

function isWeddingCategory(category) {
  return classifyCategory(category).wedding;
}

/**
 * Human-friendly category catalogue used by the command console suggestions.
 * Labels are what the user sees; aliases catch partial and colloquial input.
 */
const CATEGORY_CATALOG = [
  // Weddings & events
  { label: 'AC Function Halls', family: 'wedding', aliases: ['ac function hall', 'function hall', 'function halls', 'ac hall', 'ac halls', 'ac function halls', 'ac convention hall'] },
  { label: 'Convention Centres', family: 'wedding', aliases: ['convention centre', 'convention center', 'convention centres', 'convention centers', 'convention halls', 'convention hall'] },
  { label: 'Kalyana Mandapams', family: 'wedding', aliases: ['kalyana mandapam', 'kalyana mandapams', 'marriage hall', 'marriage halls', 'choultry', 'shadi mahal'] },
  { label: 'Wedding Venues', family: 'wedding', aliases: ['venue', 'wedding hall', 'marriage hall', 'party lawn'] },
  { label: 'Banquet Halls', family: 'wedding', aliases: ['banquet', 'party hall', 'reception hall', 'ac banquet hall'] },
  { label: 'Wedding Photographers', family: 'wedding', aliases: ['wedding photo', 'marriage photographer', 'photoshoot', 'wedding photography', 'candid photographer', 'wedding studio', 'pre wedding photoshoot'] },
  { label: 'Photo Studios', family: 'professional', aliases: ['photo studio', 'photography studio', 'digital studio', 'digital photo studio', 'photo shoot studio', 'passport photo studio', 'portrait studio', 'videography studio', 'studio'] },
  { label: 'Wedding Decorators', family: 'wedding', aliases: ['decor', 'stage decoration', 'flower decoration', 'mandap decoration', 'event decoration'] },
  { label: 'Wedding Caterers', family: 'wedding', aliases: ['catering', 'wedding food', 'catering services', 'veg caterers', 'non veg caterers'] },
  { label: 'Wedding Planners', family: 'wedding', aliases: ['event planner', 'event management', 'wedding organiser', 'party planner'] },
  { label: 'Bridal Makeup Artists', family: 'wedding', aliases: ['bridal makeup', 'makeup artist', 'makeup', 'beauty parlour for bridal'] },
  { label: 'Mehendi Artists', family: 'wedding', aliases: ['mehndi', 'henna artist', 'bridal mehendi'] },
  { label: 'Mandap Services', family: 'wedding', aliases: ['mandap', 'tent house', 'pandal', 'shamiana'] },
  { label: 'Wedding Invitations', family: 'wedding', aliases: ['invitation card', 'invitation', 'wedding cards printing'] },

  // Home services
  { label: 'Plumbers', family: 'home-services', aliases: ['plumber', 'plumbing', 'pipe repair', 'tap repair', 'plumbing contractor', 'sanitary works', 'water leakage repair', 'pipe fittings', 'bathroom fittings'] },
  { label: 'Electricians', family: 'home-services', aliases: ['electrician', 'electrical work', 'wiring', 'electric repair', 'electrical contractor', 'electrical works', 'wiring contractor', 'inverter repair'] },
  { label: 'Carpenters', family: 'home-services', aliases: ['carpenter', 'carpentry', 'furniture repair'] },
  { label: 'Painters', family: 'home-services', aliases: ['painter', 'house painting', 'painting'] },
  { label: 'Pest Control', family: 'home-services', aliases: ['pest', 'termite control', 'fumigation'] },
  { label: 'House Cleaning', family: 'home-services', aliases: ['cleaning service', 'deep cleaning', 'sofa cleaning'] },
  { label: 'AC Repair', family: 'home-services', aliases: ['ac service', 'air conditioner repair', 'air conditioning'] },
  { label: 'Appliance Repair', family: 'home-services', aliases: ['washing machine repair', 'refrigerator repair', 'fridge repair'] },
  { label: 'Packers and Movers', family: 'home-services', aliases: ['packers', 'movers', 'shifting service', 'relocation'] },
  { label: 'Interior Designers', family: 'home-services', aliases: ['interior design', 'interiors', 'home interior'] },
  { label: 'Modular Kitchen', family: 'home-services', aliases: ['modular kitchen', 'kitchen design'] },
  { label: 'CCTV Installation', family: 'home-services', aliases: ['cctv', 'cctv installation', 'cctv camera', 'cctv dealer', 'cctv shops', 'surveillance camera', 'security surveillance'] },
  { label: 'Solar Installation', family: 'home-services', aliases: ['solar', 'solar panels', 'solar rooftop'] },
  { label: 'Borewell Services', family: 'home-services', aliases: ['borewell', 'bore well', 'drilling'] },
  { label: 'Waterproofing', family: 'home-services', aliases: ['waterproof', 'terrace waterproofing', 'leakage repair'] },
  { label: 'Welders', family: 'home-services', aliases: ['welding', 'fabrication', 'grill work'] },
  { label: 'Gardeners', family: 'home-services', aliases: ['gardening', 'landscaping', 'garden maintenance'] },
  { label: 'Lift Repair', family: 'home-services', aliases: ['elevator repair', 'lift service'] },

  // IT, Computers, Cameras, Mobiles & Electronics
  { label: 'Camera & DSLR Shops', family: 'retail', aliases: ['camera shop', 'camera shops', 'camera store', 'camera stores', 'camera dealer', 'camera dealers', 'camera showroom', 'dslr shop', 'dslr store', 'dslr camera shop', 'digital camera store', 'camera lens shop', 'photography equipment store', 'camera gear store', 'canon dealer', 'nikon dealer', 'sony camera store'] },
  { label: 'Camera & Lens Repair Centres', family: 'technology', aliases: ['camera repair', 'dslr repair', 'camera service center', 'camera servicing', 'lens repair'] },
  { label: 'Computer Shops', family: 'technology', aliases: ['computer shop', 'computer shops', 'computer store', 'computer stores', 'pc shop', 'desktop shop', 'computer dealer', 'computer dealers', 'computer showroom', 'computers'] },
  { label: 'Laptop Repair & Dealers', family: 'technology', aliases: ['laptop shop', 'laptop store', 'laptop dealer', 'laptop repair', 'laptop service', 'laptops', 'second hand laptop', 'refurbished laptops', 'macbook repair'] },
  { label: 'Computer Hardware & Accessories', family: 'technology', aliases: ['computer hardware', 'computer accessories', 'gaming pc', 'custom pc', 'computer parts', 'pc components', 'monitors', 'ssd', 'graphics card', 'it hardware'] },
  { label: 'Mobile Shops', family: 'technology', aliases: ['mobile shop', 'mobile shops', 'mobile store', 'phone shop', 'smartphone store', 'mobile showroom'] },
  { label: 'Mobile Repair', family: 'technology', aliases: ['mobile repair', 'phone repair', 'smartphone repair', 'iphone repair', 'mobile service center'] },
  { label: 'Electronics Stores', family: 'technology', aliases: ['electronics', 'electronic shop', 'electronics shop', 'gadget store', 'home appliances showroom'] },
  { label: 'Printer & Cartridge Shops', family: 'technology', aliases: ['printer shop', 'printer repair', 'printer dealer', 'toner refill', 'cartridge refill'] },
  { label: 'Software & IT Companies', family: 'technology', aliases: ['software company', 'it company', 'it services', 'app development', 'software development', 'networking services'] },
  { label: 'Inverter & Battery Dealers', family: 'technology', aliases: ['inverter dealer', 'battery shop', 'ups dealer', 'car battery', 'inverter battery'] },

  // Retail
  { label: 'Shopping Malls', family: 'retail', aliases: ['shopping mall', 'shopping malls', 'mall', 'malls', 'shopping complex', 'commercial complex', 'retail plaza', 'hypermarket', 'multiplex mall'] },
  { label: 'Showrooms', family: 'retail', aliases: ['showroom', 'retail showroom', 'brand outlet'] },
  { label: 'Furniture Stores', family: 'retail', aliases: ['furniture', 'furniture shop', 'sofa store'] },
  { label: 'Jewellery Stores', family: 'retail', aliases: ['jewellery', 'jewelry', 'jewel shop', 'gold shop'] },
  { label: 'Clothing Boutiques', family: 'retail', aliases: ['boutique', 'clothing', 'apparel', 'garments'] },
  { label: 'Footwear Stores', family: 'retail', aliases: ['footwear', 'shoe shop', 'chappal store'] },
  { label: 'Supermarkets', family: 'retail', aliases: ['supermarket', 'grocery', 'kirana', 'provision store'] },
  { label: 'Gift Shops', family: 'retail', aliases: ['gift', 'gift shop', 'novelty store'] },
  { label: 'Hardware Stores', family: 'retail', aliases: ['hardware', 'building material', 'paint shop'] },
  { label: 'Optical Stores', family: 'retail', aliases: ['optical', 'spectacles', 'eye glasses'] },
  { label: 'Pet Shops', family: 'retail', aliases: ['pet shop', 'pet store', 'aquarium'] },

  // Health
  { label: 'Clinics', family: 'health', aliases: ['clinic', 'doctor', 'physician', 'general physician'] },
  { label: 'Hospitals', family: 'health', aliases: ['hospital', 'nursing home', 'multispeciality'] },
  { label: 'Dentists', family: 'health', aliases: ['dentist', 'dental', 'tooth', 'orthodontist'] },
  { label: 'Dermatologists', family: 'health', aliases: ['dermatologist', 'skin doctor', 'skin clinic'] },
  { label: 'Gynecologists', family: 'health', aliases: ['gynecologist', 'gynaecologist', 'women doctor'] },
  { label: 'Pediatricians', family: 'health', aliases: ['pediatrician', 'child doctor', 'paediatric'] },
  { label: 'Pharmacies', family: 'health', aliases: ['pharmacy', 'medical store', 'chemist', 'medicine shop'] },
  { label: 'Diagnostic Labs', family: 'health', aliases: ['diagnostic', 'pathology', 'blood test', 'scan centre'] },
  { label: 'Physiotherapists', family: 'health', aliases: ['physiotherapy', 'physio', 'rehab'] },
  { label: 'Ayurvedic Clinics', family: 'health', aliases: ['ayurveda', 'ayurvedic', 'panchakarma'] },
  { label: 'Homeopathy Clinics', family: 'health', aliases: ['homeopathy', 'homeopathic'] },
  { label: 'Eye Care', family: 'health', aliases: ['eye hospital', 'ophthalmologist', 'eye clinic'] },
  { label: 'IVF Centres', family: 'health', aliases: ['ivf', 'fertility', 'test tube baby'] },
  { label: 'Veterinary Clinics', family: 'health', aliases: ['veterinary', 'pet doctor', 'animal hospital'] },

  // Beauty
  { label: 'Salons', family: 'beauty', aliases: ['salon', 'beauty parlour', 'parlour', 'hair salon'] },
  { label: 'Spas', family: 'beauty', aliases: ['spa', 'massage', 'wellness centre'] },
  { label: 'Makeup Artists', family: 'beauty', aliases: ['makeup', 'make-up artist', 'bridal makeup'] },
  { label: 'Nail Studios', family: 'beauty', aliases: ['nail art', 'nail salon', 'manicure'] },
  { label: 'Barbershops', family: 'beauty', aliases: ['barber', 'gents salon', 'haircut'] },
  { label: 'Tattoo Studios', family: 'beauty', aliases: ['tattoo', 'tattoo artist', 'piercing'] },

  // Food
  { label: 'Restaurants', family: 'food', aliases: ['restaurant', 'dining', 'eatery', 'biryani', 'meals'] },
  { label: 'Cafes', family: 'food', aliases: ['cafe', 'coffee shop', 'coffee'] },
  { label: 'Bakeries', family: 'food', aliases: ['bakery', 'cake shop', 'cakes'] },
  { label: 'Caterers', family: 'food', aliases: ['caterer', 'catering', 'bulk food'] },
  { label: 'Cloud Kitchens', family: 'food', aliases: ['cloud kitchen', 'ghost kitchen', 'delivery kitchen'] },
  { label: 'Bars and Pubs', family: 'food', aliases: ['bar', 'pub', 'brewery', 'liquor'] },
  { label: 'Sweet Shops', family: 'food', aliases: ['sweet shop', 'mithai', 'halwai'] },
  { label: 'Ice Cream Parlours', family: 'food', aliases: ['ice cream', 'gelato', 'dessert'] },

  // Auto
  { label: 'Car Showrooms', family: 'auto', aliases: ['car showroom', 'car dealer', 'new car'] },
  { label: 'Bike Showrooms', family: 'auto', aliases: ['bike showroom', 'two wheeler', 'motorcycle showroom', 'scooter showroom'] },
  { label: 'Car Rentals', family: 'auto', aliases: ['car rental', 'car hire', 'taxi service', 'cab service', 'self drive cars', 'travels', 'car rentals'] },
  { label: 'Car Service', family: 'auto', aliases: ['car service', 'car repair', 'garage', 'automobile service'] },
  { label: 'Tyre Shops', family: 'auto', aliases: ['tyre', 'tire shop', 'puncture'] },
  { label: 'Spare Parts', family: 'auto', aliases: ['spare parts', 'auto parts', 'car accessories'] },
  { label: 'Car Wash', family: 'auto', aliases: ['car wash', 'car detailing', 'ceramic coating'] },
  { label: 'Driving Schools', family: 'auto', aliases: ['driving school', 'driving classes', 'licence training'] },
  { label: 'EV Charging', family: 'auto', aliases: ['ev charging', 'electric vehicle charger'] },

  // Real estate
  { label: 'Real Estate Agents', family: 'real-estate', aliases: ['real estate', 'property broker', 'realty'] },
  { label: 'Builders', family: 'real-estate', aliases: ['builder', 'property developer', 'construction company'] },
  { label: 'Architects', family: 'real-estate', aliases: ['architect', 'architecture', 'building design'] },
  { label: 'Construction Contractors', family: 'real-estate', aliases: ['contractor', 'civil contractor', 'construction'] },
  { label: 'Vaastu Consultants', family: 'real-estate', aliases: ['vastu', 'vaastu', 'feng shui'] },

  // Education
  { label: 'Schools', family: 'education', aliases: ['school', 'cbse school', 'state board school'] },
  { label: 'Colleges', family: 'education', aliases: ['college', 'degree college', 'university'] },
  { label: 'Coaching Centres', family: 'education', aliases: ['coaching', 'tuition', 'institute', 'academy'] },
  { label: 'Preschools', family: 'education', aliases: ['preschool', 'kindergarten', 'play school'] },
  { label: 'Dance Classes', family: 'education', aliases: ['dance class', 'dance academy', 'choreographer'] },
  { label: 'Music Classes', family: 'education', aliases: ['music class', 'music academy', 'guitar class'] },
  { label: 'Spoken English', family: 'education', aliases: ['spoken english', 'english coaching', 'ielts'] },
  { label: 'Study Abroad Consultants', family: 'education', aliases: ['study abroad', 'overseas education', 'visa consultant'] },

  // Professional
  { label: 'Lawyers', family: 'professional', aliases: ['lawyer', 'advocate', 'legal advisor'] },
  { label: 'Chartered Accountants', family: 'professional', aliases: ['chartered accountant', 'ca', 'accountant'] },
  { label: 'Tax Consultants', family: 'professional', aliases: ['tax consultant', 'income tax', 'gst consultant'] },
  { label: 'Company Secretaries', family: 'professional', aliases: ['company secretary', 'cs', 'compliance'] },
  { label: 'Digital Marketing Agencies', family: 'professional', aliases: ['digital marketing', 'seo agency', 'social media agency'] },
  { label: 'Web Designers', family: 'professional', aliases: ['web design', 'website development', 'web developer'] },
  { label: 'Photographers', family: 'professional', aliases: ['photographer', 'photography', 'photography studio', 'photo studio', 'videographer', 'videography', 'photoshoot', 'event photographer', 'commercial photographer', 'portrait photographer'] },
  { label: 'Recruitment Agencies', family: 'professional', aliases: ['recruitment', 'placement agency', 'hr consultant'] },
  { label: 'Insurance Agents', family: 'professional', aliases: ['insurance', 'insurance advisor', 'policy agent'] },
  { label: 'Printing Services', family: 'professional', aliases: ['printing', 'print shop', 'flex printing'] },

  // Industrial / B2B
  { label: 'Manufacturers', family: 'industrial', aliases: ['manufacturer', 'factory', 'manufacturing'] },
  { label: 'Wholesalers', family: 'industrial', aliases: ['wholesaler', 'wholesale', 'bulk supplier'] },
  { label: 'Distributors', family: 'industrial', aliases: ['distributor', 'dealer', 'stockist'] },
  { label: 'Exporters', family: 'industrial', aliases: ['exporter', 'export house', 'international trade'] },
  { label: 'B2B Suppliers', family: 'industrial', aliases: ['b2b', 'supplier', 'industrial supplier'] },
  { label: 'Machinery Suppliers', family: 'industrial', aliases: ['machinery', 'machine tools', 'equipment supplier'] },
  { label: 'Packaging Suppliers', family: 'industrial', aliases: ['packaging', 'carton box', 'packing material'] },
  { label: 'Textile Manufacturers', family: 'industrial', aliases: ['textile', 'fabric manufacturer', 'garment manufacturer'] },
  { label: 'Chemical Suppliers', family: 'industrial', aliases: ['chemical', 'chemicals', 'industrial chemical'] },
  { label: 'Steel Suppliers', family: 'industrial', aliases: ['steel', 'iron trader', 'metal supplier'] },
  { label: 'Hydraulic Equipment', family: 'industrial', aliases: ['hydraulic', 'hydraulic lift', 'hydraulic fittings', 'hydraulic cylinder', 'hydraulic pump', 'hydraulic press'] },
  { label: 'Elevators & Lifts', family: 'home-services', aliases: ['elevator', 'passenger lift', 'cargo lift', 'lift repair', 'elevator service', 'lift installation'] },

  // Fitness, Hospitality, Logistics, Energy & Specialty Trades
  { label: 'Gyms & Fitness Centres', family: 'fitness', aliases: ['gym', 'gyms', 'fitness centre', 'fitness center', 'workout', 'crossfit'] },
  { label: 'Yoga Studios', family: 'fitness', aliases: ['yoga', 'yoga classes', 'yoga studio', 'meditation centre', 'zumba'] },
  { label: 'Hotels & Resorts', family: 'hospitality', aliases: ['hotel', 'hotels', 'resort', 'resorts', 'lodge', 'homestay', 'guest house'] },
  { label: 'Travel Agencies', family: 'hospitality', aliases: ['travel agency', 'travel agent', 'tour operator', 'holiday packages', 'visa agent'] },
  { label: 'Transport & Logistics', family: 'logistics', aliases: ['transport', 'logistics', 'cargo', 'freight', 'goods carrier', 'trucking', 'warehouse', 'cold storage'] },
  { label: 'Courier Services', family: 'logistics', aliases: ['courier', 'parcel service', 'express delivery'] },
  { label: 'HVAC Contractors', family: 'home-services', aliases: ['hvac', 'hvac contractor', 'heating and cooling', 'central ac'] },
  { label: 'Roofing Contractors', family: 'home-services', aliases: ['roofer', 'roofers', 'roofing', 'roof repair'] },
  { label: 'Landscapers', family: 'home-services', aliases: ['landscaper', 'landscaping', 'lawn care'] },
  { label: 'RO Water Purifier Dealers', family: 'home-services', aliases: ['ro service', 'water purifier', 'ro repair', 'ro dealer'] },
  { label: 'Agricultural Supplies & Nurseries', family: 'industrial', aliases: ['agriculture', 'seeds shop', 'fertilizer dealer', 'plant nursery', 'tractor dealer', 'pesticides'] },
  { label: 'CNC & Laser Cutting', family: 'industrial', aliases: ['cnc', 'laser cutting', 'cnc machining', 'metal fabrication', 'sheet metal'] },

  // Universal High-Frequency Retail & Specialty Shops (prevents generic "shops" hijacking)
  { label: 'Flower Shops & Florists', family: 'retail', aliases: ['flower shop', 'flower shops', 'florist', 'florists', 'bouquet shop', 'fresh flowers'] },
  { label: 'Book Shops & Stationery', family: 'retail', aliases: ['book shop', 'book shops', 'bookstore', 'book store', 'stationery shop', 'stationery store', 'notebooks'] },
  { label: 'Gift & Toy Shops', family: 'retail', aliases: ['gift shop', 'gift shops', 'toy shop', 'toy shops', 'novelty store', 'gift articles'] },
  { label: 'Footwear & Shoe Shops', family: 'retail', aliases: ['shoe shop', 'shoe shops', 'footwear shop', 'footwear store', 'shoe store', 'chappal shop'] },
  { label: 'Optical Shops & Opticians', family: 'retail', aliases: ['optical shop', 'optical shops', 'optician', 'eyewear store', 'spectacles shop', 'sunglasses shop'] },
  { label: 'Watch & Clock Shops', family: 'retail', aliases: ['watch shop', 'watch shops', 'watch repair', 'clock shop', 'watch showroom'] },
  { label: 'Cycle & Bicycle Shops', family: 'retail', aliases: ['cycle shop', 'cycle shops', 'bicycle shop', 'bicycle store', 'cycle repair'] },
  { label: 'Sports Goods Shops', family: 'retail', aliases: ['sports shop', 'sports shops', 'sports store', 'fitness equipment shop', 'cricket shop'] },
  { label: 'Sweet Shops & Mithai', family: 'food', aliases: ['sweet shop', 'sweet shops', 'mithai shop', 'sweets store', 'halwai', 'laddu shop'] },
  { label: 'Bakeries & Cake Shops', family: 'food', aliases: ['bakery shop', 'bakery shops', 'cake shop', 'cake shops', 'pastry shop', 'bakehouse'] },
  { label: 'Medical Stores & Pharmacies', family: 'health', aliases: ['medical shop', 'medical shops', 'medical store', 'medical stores', 'pharmacy', 'chemist', 'drug store'] },
  { label: 'Tyre & Battery Shops', family: 'auto', aliases: ['tyre shop', 'tyre shops', 'tire shop', 'tire shops', 'car battery shop', 'wheel alignment', 'puncture shop'] },
  { label: 'Paint Shops & Dealers', family: 'home-services', aliases: ['paint shop', 'paint shops', 'paint dealer', 'asian paints dealer', 'wall putty shop'] },
  { label: 'Tailors & Boutiques', family: 'retail', aliases: ['tailor shop', 'tailor shops', 'tailors', 'ladies tailor', 'mens tailor', 'stitching centre'] },
  { label: 'Meat & Fish Shops', family: 'food', aliases: ['meat shop', 'meat shops', 'chicken shop', 'mutton shop', 'fish shop', 'seafood shop'] },
  { label: 'Fruit & Vegetable Shops', family: 'food', aliases: ['fruit shop', 'fruit shops', 'vegetable shop', 'vegetable market', 'organic store'] },
  { label: 'Tea & Coffee Shops', family: 'food', aliases: ['tea shop', 'tea shops', 'coffee shop', 'coffee shops', 'chai shop', 'tea stall'] },
  { label: 'Hardware & Tools Shops', family: 'industrial', aliases: ['hardware shop', 'hardware shops', 'hardware store', 'tools shop', 'nuts and bolts shop', 'plywood shop'] },
  { label: 'Cosmetics & Beauty Shops', family: 'retail', aliases: ['cosmetics shop', 'cosmetic shop', 'fancy store', 'bangle store', 'makeup store'] },
  { label: 'Curtains & Furnishing Shops', family: 'retail', aliases: ['curtain shop', 'furnishing shop', 'handloom shop', 'bedsheet shop', 'mattress shop'] },
  { label: 'Utensils & Kitchenware Shops', family: 'retail', aliases: ['utensils shop', 'steel shop', 'kitchenware shop', 'crockery shop', 'home appliances shop'] },
  { label: 'Printing & Xerox Shops', family: 'professional', aliases: ['print shop', 'print shops', 'xerox shop', 'photocopy shop', 'digital printing', 'offset printing', 'flex printing'] },
  { label: 'Cold Storage & Warehouses', family: 'logistics', aliases: ['cold storage', 'warehouse', 'godown', 'storage facility'] },
  { label: 'Scrap & Recycling Dealers', family: 'industrial', aliases: ['scrap shop', 'scrap dealer', 'junk buyer', 'metal recycling'] },
  { label: 'Plant Nurseries & Gardens', family: 'retail', aliases: ['plant nursery', 'nursery', 'garden shop', 'indoor plants shop'] },

  // Generic fallback so a location-only pick still produces a valid run.
  { label: 'Businesses', family: 'generic', aliases: ['business', 'vendors', 'local business'] }
];

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

function tokenPrefixScore(labelWords, queryWords) {  if (!queryWords.length || queryWords.length > labelWords.length) return 0;
  for (let i = 0; i < queryWords.length; i++) {
    if (!labelWords[i].startsWith(queryWords[i])) return 0;
  }
  return queryWords.length === labelWords.length ? 720 : 660 - (labelWords.length - queryWords.length) * 10;
}

/**
 * True only for a real spelling change, not a prefix completion or an
 * added district/state context. Keeps the "corrected" chip honest.
 */
function isRealCorrection(fragment, label) {
  const a = normalize(fragment);
  const b = normalize(label);
  if (!a || !b || a === b) return false;
  if (b.startsWith(a) || a.startsWith(b)) return false;
  if (a.includes(b) || b.includes(a)) return false;

  // If both share meaningful tokens (length >= 3), it is an alias or related concept, not a typo
  const aTokens = a.split(' ').filter(t => t.length >= 3);
  const bTokens = b.split(' ').filter(t => t.length >= 3);
  const common = aTokens.filter(t => bTokens.includes(t));
  if (common.length > 0) return false;

  // It is only a real typo correction if the edit distance is within typo budget and lengths are close
  const dist = levenshtein(a, b);
  return dist > 0 && dist <= (Math.min(a.length, b.length) <= 5 ? 1 : 2) && Math.abs(a.length - b.length) <= 2;
}

function allowTypo(a, b) {
  if (!a || !b) return false;
  const diff = Math.abs(a.length - b.length);
  if (diff > 3) return false;
  if (a.length <= 4 && b.length <= 4) {
    return a.slice(0, 2) === b.slice(0, 2);
  }
  return a.slice(0, 1) === b.slice(0, 1) || (a.length >= 6 && b.length >= 6);
}

function hasWord(text, word) {
  if (!text || !word) return false;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(?:^|\\s)' + escaped + '(?:$|\\s)', 'i').test(text);
}

function stemWord(w) {
  if (!w || w.length < 3) return w || '';
  const word = w.toLowerCase();
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ers') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('er') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('ors') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('or') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
}

const GENERIC_HEAD_NOUNS = new Set([
  'shop', 'shops', 'store', 'stores', 'center', 'centre', 'centers', 'centres',
  'service', 'services', 'servicing', 'dealer', 'dealers', 'supplier', 'suppliers',
  'agency', 'agencies', 'studio', 'studios', 'clinic', 'clinics', 'house', 'houses',
  'mart', 'marts', 'point', 'hub', 'world', 'zone', 'works', 'showroom', 'showrooms',
  'company', 'companies', 'contractor', 'contractors', 'repair', 'repairs',
  'maker', 'makers', 'vendor', 'vendors', 'business', 'businesses', 'outlet', 'outlets',
  'emporium', 'palace', 'bazaar', 'market', 'traders', 'trader', 'enterprise', 'enterprises',
  'solutions', 'consultants', 'consultant', 'firm', 'firms', 'care', 'near', 'best', 'top', 'in', 'at', 'for', 'of'
]);

function tokenMatchScore(queryWords, candidateWords) {
  const { consonantSkeleton, COMMON_WORD_WHITELIST } = require('../utils/tradeIntelligence');
  const uniqueQuery = [...new Set((queryWords || []).filter(w => w && w.length >= 2))];
  const uniqueCand = [...new Set((candidateWords || []).filter(w => w && w.length >= 2))];
  if (!uniqueQuery.length || !uniqueCand.length) return 0;

  const subjectWords = uniqueQuery.filter(w => !GENERIC_HEAD_NOUNS.has(w));
  const hasSubject = subjectWords.length > 0;
  let subjectScore = 0;
  let genericBonus = 0;

  for (const qw of uniqueQuery) {
    const isGeneric = GENERIC_HEAD_NOUNS.has(qw);
    const isProtected = COMMON_WORD_WHITELIST.has(qw);
    const qStem = stemWord(qw);
    const qSkel = consonantSkeleton(qw);
    let bestWordScore = 0;

    for (const cw of uniqueCand) {
      if (isGeneric && !GENERIC_HEAD_NOUNS.has(cw)) continue;
      if (!isGeneric && GENERIC_HEAD_NOUNS.has(cw)) continue;
      const cStem = stemWord(cw);
      const cSkel = consonantSkeleton(cw);
      let s = 0;
      if (qw === cw) s = 320;
      else if (qStem === cStem) s = 280;
      else if (cw.startsWith(qw) || qw.startsWith(cw)) s = 220;
      else if (qw.length >= 4 && cw.includes(qw)) s = 160;
      else if (cw.length >= 4 && qw.includes(cw)) s = 160;
      else if (!isProtected && !isGeneric && qw.length >= 5 && qw[0] === cw[0] && qSkel && cSkel && qSkel.length >= 4 && qSkel === cSkel) {
        if (levenshtein(qw, cw) <= (qw.length >= 8 ? 3 : 2)) s = 240;
      } else if (!isProtected && !isGeneric && qw.length >= 5 && cw.length >= 5 && qw[0] === cw[0] && allowTypo(qw, cw) && levenshtein(qw, cw) <= (qw.length >= 8 ? 2 : 1)) {
        s = 190;
      }
      if (s > bestWordScore) bestWordScore = s;
    }

    if (isGeneric) {
      if (bestWordScore > 0) genericBonus += 35;
    } else {
      subjectScore += bestWordScore;
    }
  }

  // CRITICAL: If query contains a real subject word (e.g. "flower" in "flower shops"),
  // matching ONLY the generic word ("shops") must NEVER hijack to an unrelated category like "Pet Shops"!
  if (hasSubject && subjectScore === 0) return 0;

  return subjectScore + genericBonus;
}

function titleCase(value) {
  return clean(value)
    .toLowerCase()
    .replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

/**
 * Rank catalogue categories against any partial, multi-word or misspelled fragment.
 * Uses token-intersection, stemming, Levenshtein typo-correction, consonant skeleton matching,
 * and high-yield trade typo normalization.
 * @returns {Array<{label:string,family:string,familyLabel:string,score:number,corrected:boolean,matched:string}>}
 */
function suggestCategories(fragment, limit = 6) {
  const { normalizeTradePhrase, consonantSkeleton, COMMON_WORD_WHITELIST } = require('../utils/tradeIntelligence');
  const raw = clean(fragment, 120);
  const query = normalize(raw.replace(CATEGORY_STOPWORDS, ''));
  if (!query) {
    const defaultLabels = ['Computer Shops', 'Plumbers', 'Electricians', 'Photo Studios', 'Interior Designers', 'Dentists'];
    return CATEGORY_CATALOG.filter(c => defaultLabels.includes(c.label)).slice(0, limit).map(entry => ({
      label: entry.label,
      family: entry.family,
      familyLabel: (FAMILY_DEFINITIONS[entry.family] || {}).label || 'Services',
      score: 500,
      corrected: false,
      matched: entry.label,
      description: (FAMILY_DEFINITIONS[entry.family] || {}).description || '',
      engines: (FAMILY_DEFINITIONS[entry.family] || {}).engines || ['maps']
    }));
  }

  const normalizedTradeQuery = normalizeTradePhrase(query);
  const querySkel = consonantSkeleton(query);
  const queryWords = query.split(' ').filter(Boolean);
  const normalizedWords = normalizedTradeQuery.split(' ').filter(Boolean);
  const queryProtected = queryWords.length > 0 && queryWords.every(w => COMMON_WORD_WHITELIST.has(w));
  const scored = [];
  const seenLabels = new Set();

  for (const entry of CATEGORY_CATALOG) {
    const label = normalize(entry.label);
    const labelWords = label.split(' ').filter(Boolean);
    const labelSkel = consonantSkeleton(label);
    let best = 0;
    let matched = entry.label;

    // 1. Exact match (direct or via normalized trade)
    if (label === query || label === normalizedTradeQuery) {
      best = 1000;
    }
    // 2. Starts with query or normalized trade
    else if (label.startsWith(query) || label.startsWith(normalizedTradeQuery)) {
      best = 940 - Math.min(60, label.length - query.length);
    }
    // 3. Query contains whole label
    else if (query.includes(label) || normalizedTradeQuery.includes(label)) {
      best = 900;
    }
    // 4. Safe consonant skeleton match (only for genuine non-dictionary misspellings)
    else if (!queryProtected && query.length >= 6 && query[0] === label[0] && querySkel.length >= 4 && querySkel === labelSkel) {
      if (levenshtein(query, label) <= (query.length >= 8 ? 3 : 2)) {
        best = 930 - levenshtein(query, label) * 20;
        matched = entry.label;
      }
    }
    // 5. Token prefix match
    else {
      const tokenScore = Math.max(
        tokenPrefixScore(labelWords, queryWords),
        tokenPrefixScore(labelWords, normalizedWords)
      );
      if (tokenScore) best = tokenScore;
    }

    // 6. Aliases match
    for (const alias of entry.aliases) {
      const a = normalize(alias);
      const aSkel = consonantSkeleton(a);
      if (a === query || a === normalizedTradeQuery) {
        best = Math.max(best, 970);
        matched = alias;
        break;
      }
      if (a.startsWith(query) || a.startsWith(normalizedTradeQuery)) {
        best = Math.max(best, 910 - Math.min(60, a.length - query.length));
        matched = alias;
      } else if (hasWord(query, a) || hasWord(normalizedTradeQuery, a)) {
        best = Math.max(best, 880 - Math.min(50, query.length - a.length));
        matched = alias;
      } else if (hasWord(a, query) || hasWord(a, normalizedTradeQuery)) {
        best = Math.max(best, 850 - Math.min(50, a.length - query.length));
        matched = alias;
      } else if (!queryProtected && query.length >= 6 && query[0] === a[0] && querySkel.length >= 4 && querySkel === aSkel) {
        if (levenshtein(query, a) <= (query.length >= 8 ? 3 : 2)) {
          best = Math.max(best, 920 - levenshtein(query, a) * 20);
          matched = alias;
        }
      }
    }

    // 7. Direct typo matching on whole label or alias (disabled for protected common words)
    if (!queryProtected && query.length >= 5 && best < 900) {
      if (query[0] === label[0] && (allowTypo(query, label) || allowTypo(normalizedTradeQuery, label))) {
        const labelDist = Math.min(levenshtein(query, label), levenshtein(normalizedTradeQuery, label));
        if (labelDist <= (query.length >= 8 ? 2 : 1)) {
          const typoScore = 920 - labelDist * 30;
          if (typoScore > best) {
            best = typoScore;
            matched = entry.label;
          }
        }
      }
      for (const alias of entry.aliases) {
        const a = normalize(alias);
        if (query[0] === a[0] && (allowTypo(query, a) || allowTypo(normalizedTradeQuery, a))) {
          const aliasDist = Math.min(levenshtein(query, a), levenshtein(normalizedTradeQuery, a));
          if (aliasDist <= (query.length >= 8 ? 2 : 1)) {
            const typoScore = 910 - aliasDist * 30;
            if (typoScore > best) {
              best = typoScore;
              matched = alias;
            }
          }
        }
      }
    }

    // 8. Token Overlap & Stemming
    if (best < 850) {
      const allCandidateTokens = [
        ...labelWords,
        ...entry.aliases.flatMap(al => normalize(al).split(' ').filter(Boolean))
      ];
      const overlapScore = Math.max(
        tokenMatchScore(queryWords, allCandidateTokens),
        tokenMatchScore(normalizedWords, allCandidateTokens)
      );
      if (overlapScore > 0) {
        best = Math.max(best, Math.min(860, 520 + overlapScore));
      }
    }

    if (!best) continue;
    const definition = FAMILY_DEFINITIONS[entry.family] || FAMILY_DEFINITIONS.generic;
    seenLabels.add(entry.label);
    scored.push({
      label: entry.label,
      family: entry.family,
      familyLabel: definition.label,
      description: definition.description,
      engines: [...definition.engines],
      score: best,
      corrected: isRealCorrection(raw, entry.label),
      matched
    });
  }

  // High-confidence custom query preservation:
  // If the query is a recognized service/trade phrase, preserve it at the top with full score
  const highConfClass = classifyCategory(normalizedTradeQuery || query);
  if (highConfClass.confidence === 'high' || highConfClass.score >= 10) {
    const customLabel = titleCase(raw);
    if (!seenLabels.has(customLabel)) {
      const def = FAMILY_DEFINITIONS[highConfClass.family] || FAMILY_DEFINITIONS.generic;
      scored.unshift({
        label: customLabel,
        family: highConfClass.family,
        familyLabel: def.label,
        description: def.description,
        engines: [...def.engines],
        score: 1000,
        corrected: false,
        matched: customLabel
      });
      seenLabels.add(customLabel);
    }
  }

  // Fallback: ONLY when no catalog or auto-corrected match is found
  if (query.length >= 2 && !scored.some(s => s.score >= 820)) {
    const titleCased = titleCase(normalizedTradeQuery || query);
    if (!seenLabels.has(titleCased)) {
      const familyClass = classifyCategory(normalizedTradeQuery || query);
      const def = FAMILY_DEFINITIONS[familyClass.family] || FAMILY_DEFINITIONS.generic;
      scored.push({
        label: titleCased,
        family: familyClass.family,
        familyLabel: def.label,
        description: def.description,
        engines: [...def.engines],
        score: 750,
        corrected: false,
        matched: titleCased
      });
    }
  }

  // Pan-Indian Trade Subvector Injection & Cross-Industry Noise Elimination
  const detectedSector = indiaTradeIntelligence.detectTradeSector(query);
  if (detectedSector && Array.isArray(detectedSector.subvectors)) {
    const def = FAMILY_DEFINITIONS[detectedSector.key === 'photography_media' ? 'photography' : 'generic'] || FAMILY_DEFINITIONS.generic;
    for (const sub of detectedSector.subvectors) {
      if (!seenLabels.has(sub)) {
        seenLabels.add(sub);
        scored.push({
          label: sub,
          family: detectedSector.key === 'photography_media' ? 'photography' : (FAMILY_DEFINITIONS[detectedSector.key] ? detectedSector.key : 'generic'),
          familyLabel: detectedSector.label,
          description: `Specialized ${detectedSector.label}`,
          engines: [...(def.engines || ['maps', 'google-local-finder'])],
          score: 890,
          corrected: false,
          matched: sub
        });
      }
    }

    // Discard cross-industry noise (e.g. Nail / Tattoo Studios when Photography is searched)
    const noiseFilter = new Set([
      ...(detectedSector.avoids || []).map(a => a.toLowerCase()),
      ...(detectedSector.key === 'photography_media' ? ['nail', 'tattoo', 'hair salon', 'beauty parlour', 'yoga', 'dance'] : [])
    ]);
    for (let i = scored.length - 1; i >= 0; i--) {
      const lower = scored[i].label.toLowerCase();
      if ([...noiseFilter].some(bad => lower.includes(bad))) {
        scored.splice(i, 1);
      }
    }
  }

  // Strict disambiguation: a query about buying/repairing cameras ("camera shop", "camra store", "dslr lens")
  // or computers ("computer shop", "laptop store", "pc builder", "laptop repair")
  // must NEVER fall into "CCTV Installation" unless cctv/surveillance/security/dvr/nvr/biometric is explicitly present.
  const hasExplicitCctv = /\b(?:cctv|surveillance|security camera|security system|biometric|dvr|nvr|intercom|access control)\b/i.test(normalizedTradeQuery || query);
  const isCameraHardwareQuery = /\b(?:camera|cameras|camra|camras|camara|dslr|mirrorless|gopro|gimbal)\b/i.test(normalizedTradeQuery || query) && !hasExplicitCctv;
  const isComputerHardwareQuery = /\b(?:computer|computers|laptop|laptops|desktop|pc|gaming pc|macbook)\b/i.test(normalizedTradeQuery || query) && !hasExplicitCctv;
  const filteredScored = (isCameraHardwareQuery || isComputerHardwareQuery)
    ? scored.filter(item => !/\bcctv\b|surveillance|security/i.test(item.label))
    : scored;

  return filteredScored
    .sort((a, b) => b.score - a.score || a.label.length - b.label.length)
    .slice(0, Math.max(1, Math.min(20, Number(limit) || 6)));
}

function getCategorySubvectors(category) {
  const normCat = normalize(category);
  const tradeVectors = indiaTradeIntelligence.getSubvectorsForQuery(category);
  if (Array.isArray(tradeVectors) && tradeVectors.length > 0) {
    return tradeVectors;
  }
  if (/\b(dentist|dentists|dental|teeth|orthodont|dental clinic)\b/i.test(normCat)) {
    return [
      'Dentists',
      'Dental Hospitals',
      'Dental Clinics',
      'Orthodontists',
      'Teeth Care & Implant Centres'
    ];
  }
  if (/\b(hospital|hospitals|healthcare|nursing home)\b/i.test(normCat)) {
    return [
      'Hospitals',
      'Dental Hospitals & Dentists',
      'Eye Hospitals & Eye Care',
      'Children & Maternity Hospitals',
      'Multi Speciality Clinics'
    ];
  }
  if (/\b(doctor|doctors|physician|physicians|clinic|clinics)\b/i.test(normCat)) {
    return [
      'General Physicians',
      'Dentists & Dental Care',
      'Gynecologists & Maternity',
      'Pediatricians & Child Specialists',
      'Orthopedic & Bone Specialists'
    ];
  }
  if (/\b(wedding|marriage|matrimony|banquet|mandap|event)\b/i.test(normCat)) {
    return [
      'Wedding Photographers',
      'Banquet Halls & Function Halls',
      'Catering Services',
      'Bridal Makeup Artists',
      'Event & Wedding Decorators'
    ];
  }
  if (/\b(real estate|property|properties|builder|builders|realtor)\b/i.test(normCat)) {
    return [
      'Real Estate Agents',
      'Builders & Developers',
      'Property Dealers & Brokers',
      'Plot Promoters'
    ];
  }
  if (/\b(car repair|auto repair|automobile|car service|mechanic)\b/i.test(normCat)) {
    return [
      'Car Service & Repair Centers',
      'Car Mechanics',
      'Car Detailing & Washing',
      'Tyre Dealers & Alignment'
    ];
  }
  if (/\b(school|schools|college|colleges|coaching|tuition|institute)\b/i.test(normCat)) {
    return [
      'Schools',
      'Junior Colleges',
      'Coaching Centers & Tuition',
      'Educational Institutes'
    ];
  }
  if (/\b(lawyer|lawyers|advocate|advocates|legal|attorney)\b/i.test(normCat)) {
    return [
      'Advocates & Lawyers',
      'Legal Consultants & Advisors',
      'High Court Lawyers',
      'Notaries'
    ];
  }
  return [category];
}

module.exports = {
  CATEGORY_CATALOG,
  FAMILY_DEFINITIONS,
  FAMILY_KEYWORDS,
  classifyCategory,
  pickAutoEngines,
  parseSearchQuery,
  buildAutoPlan,
  isWeddingCategory,
  suggestCategories,
  getCategorySubvectors
};
