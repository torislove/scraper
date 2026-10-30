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

const FAMILY_DEFINITIONS = {
  wedding: {
    label: 'Weddings & events',
    description: 'Venues, decor, photography, catering and wedding services',
    engines: ['google-local-finder', 'maps', 'justdial', 'weddingbazaar', 'weddingwire', 'mandap'],
    cityEngines: ['justdial', 'weddingbazaar', 'weddingwire', 'mandap']
  },
  'home-services': {
    label: 'Home services',
    description: 'Plumbers, electricians, carpenters, painters and repair services',
    engines: ['google-local-finder', 'maps', 'justdial'],
    cityEngines: ['justdial']
  },
  retail: {
    label: 'Retail & showrooms',
    description: 'Stores, showrooms, boutiques and consumer brands',
    engines: ['google-local-finder', 'maps', 'justdial'],
    cityEngines: ['justdial']
  },
  health: {
    label: 'Health & medical',
    description: 'Clinics, hospitals, dentists, pharmacies and diagnostics',
    engines: ['google-local-finder', 'maps', 'justdial'],
    cityEngines: ['justdial']
  },
  beauty: {
    label: 'Beauty & wellness',
    description: 'Salons, spas, makeup artists and wellness studios',
    engines: ['google-local-finder', 'maps', 'justdial'],
    cityEngines: ['justdial']
  },
  food: {
    label: 'Food & dining',
    description: 'Restaurants, cafes, bakeries, caterers and cloud kitchens',
    engines: ['google-local-finder', 'maps', 'justdial'],
    cityEngines: ['justdial']
  },
  auto: {
    label: 'Automotive',
    description: 'Car and bike showrooms, garages, service centres and parts',
    engines: ['google-local-finder', 'maps', 'justdial'],
    cityEngines: ['justdial']
  },
  'real-estate': {
    label: 'Real estate & property',
    description: 'Builders, property dealers, architects and construction',
    engines: ['google-local-finder', 'maps', 'justdial'],
    cityEngines: ['justdial']
  },
  education: {
    label: 'Education & training',
    description: 'Schools, colleges, coaching centres and skill institutes',
    engines: ['google-local-finder', 'maps', 'justdial'],
    cityEngines: ['justdial']
  },
  professional: {
    label: 'Professional services',
    description: 'Lawyers, accountants, agencies, IT and business services',
    engines: ['google-local-finder', 'maps', 'justdial'],
    cityEngines: ['justdial']
  },
  industrial: {
    label: 'Industrial & B2B',
    description: 'Manufacturers, wholesalers, distributors and suppliers',
    engines: ['google-local-finder', 'maps', 'justdial', 'indiamart'],
    cityEngines: ['justdial', 'indiamart']
  },
  generic: {
    label: 'General vendors',
    description: 'Any local business, service or supplier',
    engines: ['google-local-finder', 'maps', 'justdial'],
    cityEngines: ['justdial']
  }
};

// Weighted stems. Higher weight wins when two families match the same text.
// These are stems, so "plumb" matches plumber/plumbing/plumbers.
const FAMILY_KEYWORDS = {
  wedding: [
    ['wedding', 8], ['bride', 6], ['bridal', 7], ['groom', 5], ['banquet', 7],
    ['mandap', 8], ['sangeet', 7], ['mehendi', 6], ['haldi', 5], ['nikah', 6],
    ['matrimony', 6], ['marriage', 5], ['reception hall', 6], ['engagement', 4],
    ['wedding planner', 8], ['wedding venue', 8], ['wedding photographer', 8],
    ['wedding decorator', 7], ['wedding caterer', 6], ['invitation card', 4],
    ['tent house', 4], ['event planner', 4], ['event management', 3], ['dq', 1]
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
    ['ev charging', 7], ['driving school', 7], ['car', 3], ['bike', 3], ['auto', 2]
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
    ['printing', 4], ['translation', 5], ['recruitment', 5], ['hr service', 5],
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
  generic: [
    ['business', 1], ['service', 1], ['company', 1], ['vendor', 1], ['shop', 1]
  ]
};

// Tie-break priority: specialist families win over broad ones with equal score.
const FAMILY_PRIORITY = [
  'wedding', 'industrial', 'home-services', 'auto', 'real-estate',
  'health', 'beauty', 'education', 'food', 'retail', 'professional', 'generic'
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

  const definition = FAMILY_DEFINITIONS[bestFamily] || FAMILY_DEFINITIONS.generic;
  const confidence = bestScore >= 8 ? 'high' : bestScore >= 4 ? 'medium' : 'low';

  // Product and brand searches need the B2B supplier index. A shop that sells
  // GPUs is usually listed as "computer hardware dealer", and IndiaMART is the
  // only engine that indexes those dealers city-wide. Never add it to wedding
  // venue families, where it returns irrelevant banquet suppliers.
  const intent = brandIntel.detect(raw);
  const engines = [...definition.engines];
  const cityEngines = [...definition.cityEngines];
  if ((intent.brand || intent.product || intent.genericProduct) && bestFamily !== 'wedding') {
    if (!engines.includes('indiamart')) engines.push('indiamart');
    if (!cityEngines.includes('indiamart')) cityEngines.push('indiamart');
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
    wedding: bestFamily === 'wedding',
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

  // Category fidelity: Mandap.com, WeddingBazaar and WeddingWire publicly list
  // *venues*. Running them for a photographer, caterer or decorator search is
  // what produced banquet halls for "wedding photographers". Only venue
  // searches may use those directories.
  try {
    const fidelity = require('./categoryFidelity');
    if (info.family === 'wedding' && !fidelity.isVenueCategory(info.category)) {
      engines = engines.filter(engine => !['mandap', 'weddingbazaar', 'weddingwire'].includes(engine));
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
  { label: 'Wedding Venues', family: 'wedding', aliases: ['venue', 'wedding hall', 'function hall', 'marriage hall', 'kalyana mandapam', 'ac function hall', 'convention center'] },
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
  { label: 'CCTV Installation', family: 'home-services', aliases: ['cctv', 'security camera', 'surveillance'] },
  { label: 'Solar Installation', family: 'home-services', aliases: ['solar', 'solar panels', 'solar rooftop'] },
  { label: 'Borewell Services', family: 'home-services', aliases: ['borewell', 'bore well', 'drilling'] },
  { label: 'Waterproofing', family: 'home-services', aliases: ['waterproof', 'terrace waterproofing', 'leakage repair'] },
  { label: 'Welders', family: 'home-services', aliases: ['welding', 'fabrication', 'grill work'] },
  { label: 'Gardeners', family: 'home-services', aliases: ['gardening', 'landscaping', 'garden maintenance'] },
  { label: 'Lift Repair', family: 'home-services', aliases: ['elevator repair', 'lift service'] },

  // Retail
  { label: 'Showrooms', family: 'retail', aliases: ['showroom', 'store', 'shop'] },
  { label: 'Mobile Shops', family: 'retail', aliases: ['mobile shop', 'mobile store', 'phone shop'] },
  { label: 'Electronics Stores', family: 'retail', aliases: ['electronics', 'electronic shop', 'gadget store'] },
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

  // Generic fallback so a location-only pick still produces a valid run.
  { label: 'Businesses', family: 'generic', aliases: ['business', 'vendors', 'services', 'shops', 'companies', 'local business'] }
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
  return true;
}

function allowTypo(a, b) {
  if (!a || !b) return false;
  if (Math.abs(a.length - b.length) > 2) return false;
  if (a.length <= 4 && b.length <= 4) {
    return a.slice(0, 2) === b.slice(0, 2);
  }
  return a.slice(0, 1) === b.slice(0, 1) || (a.length >= 7 && b.length >= 7);
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

function tokenMatchScore(queryWords, candidateWords) {
  let score = 0;
  for (const qw of queryWords) {
    if (qw.length < 2) continue;
    const qStem = stemWord(qw);
    for (const cw of candidateWords) {
      if (cw.length < 2) continue;
      const cStem = stemWord(cw);
      if (qw === cw) score += 320;
      else if (qStem === cStem) score += 280;
      else if (cw.startsWith(qw) || qw.startsWith(cw)) score += 220;
      else if (qw.length >= 4 && cw.includes(qw)) score += 160;
      else if (cw.length >= 4 && qw.includes(cw)) score += 160;
      else if (qw.length >= 4 && cw.length >= 4 && allowTypo(qw, cw) && levenshtein(qw, cw) <= (qw.length <= 5 ? 1 : 2)) {
        score += 190;
      }
    }
  }
  return score;
}

function titleCase(value) {
  return clean(value)
    .toLowerCase()
    .replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

/**
 * Rank catalogue categories against any partial, multi-word or misspelled fragment.
 * Uses token-intersection, stemming, Levenshtein typo-correction and dynamic intent fallback.
 * @returns {Array<{label:string,family:string,familyLabel:string,score:number,corrected:boolean,matched:string}>}
 */
function suggestCategories(fragment, limit = 6) {
  const raw = clean(fragment, 120);
  const query = normalize(raw.replace(CATEGORY_STOPWORDS, ''));
  if (!query) {
    const defaultLabels = ['Plumbers', 'Electricians', 'Photo Studios', 'Interior Designers', 'AC Repair', 'Banquet Halls'];
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

  const queryWords = query.split(' ').filter(Boolean);
  const scored = [];
  const seenLabels = new Set();

  for (const entry of CATEGORY_CATALOG) {
    const label = normalize(entry.label);
    const labelWords = label.split(' ').filter(Boolean);
    let best = 0;
    let matched = entry.label;

    // 1. Exact match
    if (label === query) {
      best = 1000;
    }
    // 2. Starts with query
    else if (label.startsWith(query)) {
      best = 920 - Math.min(60, label.length - query.length);
    }
    // 3. Query contains whole label (e.g. query "urgent plumbers near me" contains "plumbers")
    else if (query.includes(label)) {
      best = 890;
    }
    // 4. Token prefix match
    else {
      const tokenScore = tokenPrefixScore(labelWords, queryWords);
      if (tokenScore) best = tokenScore;
    }

    // 5. Aliases match
    for (const alias of entry.aliases) {
      const a = normalize(alias);
      if (a === query) {
        best = Math.max(best, 960);
        matched = alias;
        break;
      }
      if (a.startsWith(query)) {
        best = Math.max(best, 890 - Math.min(60, a.length - query.length));
        matched = alias;
      } else if (hasWord(query, a) && a.length >= 3) {
        best = Math.max(best, 860 - Math.min(50, query.length - a.length));
        matched = alias;
      } else if (hasWord(a, query) && query.length >= 3) {
        best = Math.max(best, 830 - Math.min(50, a.length - query.length));
        matched = alias;
      }
    }

    // 6. Direct typo matching on whole label or alias (catches "plumbar" -> "Plumbers", "fotography" -> "Photographers")
    if (query.length >= 4) {
      if (allowTypo(query, label)) {
        const labelDist = levenshtein(query, label);
        if (labelDist <= (query.length <= 5 ? 1 : 2)) {
          const typoScore = 910 - labelDist * 35;
          if (typoScore > best) {
            best = typoScore;
            matched = entry.label;
          }
        }
      }
      for (const alias of entry.aliases) {
        const a = normalize(alias);
        if (allowTypo(query, a)) {
          const aliasDist = levenshtein(query, a);
          if (aliasDist <= (query.length <= 5 ? 1 : 2)) {
            const typoScore = 900 - aliasDist * 35;
            if (typoScore > best) {
              best = typoScore;
              matched = alias;
            }
          }
        }
      }
    }

    // 7. Token Overlap & Stemming (matches "photography studio" to "Photographers" & "Photo Studios")
    if (best < 850) {
      const allCandidateTokens = [
        ...labelWords,
        ...entry.aliases.flatMap(a => normalize(a).split(' ').filter(Boolean))
      ];
      const overlapScore = tokenMatchScore(queryWords, allCandidateTokens);
      if (overlapScore > 0) {
        best = Math.max(best, Math.min(840, 500 + overlapScore));
      }
    }

    // 7. Typo Tolerance with Levenshtein Distance
    if (!best && query.length >= 4) {
      const dist = levenshtein(query, label);
      if (dist <= 2) {
        best = 520 - dist * 60;
      } else {
        for (const qw of queryWords) {
          if (qw.length < 4) continue;
          for (const lw of labelWords) {
            const wordDist = levenshtein(qw, lw);
            if (wordDist <= (qw.length <= 5 ? 1 : 2)) {
              best = Math.max(best, 480 - wordDist * 50);
              break;
            }
          }
          if (best) break;
          for (const alias of entry.aliases) {
            const a = normalize(alias);
            const aliasDist = levenshtein(qw, a);
            if (aliasDist <= (qw.length <= 5 ? 1 : 2)) {
              best = Math.max(best, 460 - aliasDist * 50);
              matched = alias;
              break;
            }
          }
          if (best) break;
        }
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

  // Fallback: If nothing matched or query is specific & uncataloged, dynamically synthesize a verified suggestion
  if (query.length >= 2) {
    const titleCased = titleCase(query);
    if (!seenLabels.has(titleCased)) {
      const familyClass = classifyCategory(query);
      const def = FAMILY_DEFINITIONS[familyClass.family] || FAMILY_DEFINITIONS.generic;
      scored.unshift({
        label: titleCased,
        family: familyClass.family,
        familyLabel: def.label,
        description: def.description,
        engines: [...def.engines],
        score: scored.length ? Math.min(scored[0].score + 10, 950) : 800,
        corrected: false,
        matched: titleCased
      });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score || a.label.length - b.label.length)
    .slice(0, Math.max(1, Math.min(20, Number(limit) || 6)));
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
  suggestCategories
};
