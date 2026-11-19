/**
 * tradeIntelligence.js
 *
 * Universal Trade & Service Typo Engine, Safe Common-Word Guard,
 * and Universal Family-Aware Dynamic Expansion Catalog.
 *
 * Provides Google-grade precision and rich suggestions across EVERY industry:
 * - IT, Computers, Laptops, Mobiles, Electronics & CCTV
 * - Photography, Studios, Weddings & Events
 * - Home Services, Repairs, Contractors & Solar
 * - Healthcare, Doctors, Clinics, Hospitals & Pharmacies
 * - Food, Restaurants, Bakeries, Sweet Shops & Catering
 * - Automotive, Garages, Showrooms, Tyres & Spare Parts
 * - Beauty, Salons, Spas, Gyms & Wellness
 * - Retail, Showrooms, Supermarkets, Clothing & Jewellery
 * - Real Estate, Builders, Architects & Interior Designers
 * - Education, Schools, Colleges, Coaching & Training Institutes
 * - Professional Services, Lawyers, CAs, Agencies & Printing
 * - Industrial, B2B, Manufacturers, Wholesalers & Logistics
 * - Hospitality, Hotels, Resorts, Travel & Agriculture
 */

/**
 * Protected English & Commercial Common Word Whitelist.
 * Words in this set are valid real-world business nouns and modifiers and MUST
 * NEVER be mutated by fuzzy/phonetic typo correction (e.g. "shops" must NEVER
 * become "spas", "stores" must NEVER become another word).
 */
const COMMON_WORD_WHITELIST = new Set([
  // Generic commercial nouns
  'shop', 'shops', 'store', 'stores', 'service', 'services', 'servicing',
  'repair', 'repairs', 'repairing', 'dealer', 'dealers', 'dealership', 'dealerships',
  'center', 'centers', 'centre', 'centres', 'hub', 'hubs', 'point', 'points',
  'agency', 'agencies', 'agent', 'agents', 'distributor', 'distributors',
  'wholesaler', 'wholesalers', 'wholesale', 'retail', 'retailer', 'retailers',
  'supplier', 'suppliers', 'supply', 'supplies', 'stockist', 'stockists',
  'manufacturer', 'manufacturers', 'manufacturing', 'factory', 'factories', 'mill', 'mills',
  'trader', 'traders', 'trading', 'merchant', 'merchants', 'vendor', 'vendors',
  'provider', 'providers', 'company', 'companies', 'firm', 'firms', 'enterprise', 'enterprises',
  'market', 'bazaar', 'mart', 'supermarket', 'supermarkets', 'mall', 'plaza', 'complex',
  'sale', 'sales', 'outlet', 'outlets', 'showroom', 'showrooms', 'emporium', 'depot',
  'studio', 'studios', 'lab', 'labs', 'laboratory', 'workshop', 'workshops', 'works',
  'contractor', 'contractors', 'consultant', 'consultants', 'consultancy', 'advisor', 'advisors',
  'specialist', 'specialists', 'expert', 'experts', 'technician', 'technicians',
  'rental', 'rentals', 'hire', 'leasing', 'booking', 'delivery', 'installation', 'maintenance',
  'exporter', 'exporters', 'importer', 'importers', 'broker', 'brokers', 'builder', 'builders',
  'best', 'top', 'near', 'local', 'good', 'cheap', 'affordable', 'luxury', 'premium', 'new', 'old', 'used', 'second', 'hand',

  // IT, Computers, Mobiles & Electronics
  'computer', 'computers', 'pc', 'pcs', 'desktop', 'desktops', 'laptop', 'laptops',
  'hardware', 'software', 'networking', 'network', 'server', 'servers', 'data', 'cloud',
  'digital', 'electronic', 'electronics', 'electrical', 'electricals', 'gadget', 'gadgets',
  'mobile', 'mobiles', 'cellphone', 'cellphones', 'phone', 'phones', 'smartphone', 'smartphones',
  'iphone', 'android', 'tablet', 'tablets', 'ipad', 'macbook', 'accessories', 'peripherals',
  'cctv', 'security', 'camera', 'cameras', 'surveillance', 'biometric', 'intercom',
  'printer', 'printers', 'scanner', 'scanners', 'toner', 'cartridge', 'refill', 'ups', 'inverter',
  'gaming', 'monitor', 'monitors', 'keyboard', 'mouse', 'ssd', 'ram', 'motherboard', 'gpu',
  'wifi', 'broadband', 'internet', 'cyber', 'cafe', 'coding', 'web', 'app', 'design',

  // Healthcare & Medical
  'clinic', 'clinics', 'hospital', 'hospitals', 'doctor', 'doctors', 'physician', 'surgeon',
  'medical', 'medicine', 'medicines', 'pharmacy', 'pharmacies', 'chemist', 'chemists',
  'dental', 'dentist', 'dentists', 'orthodontist', 'skin', 'eye', 'ent', 'heart', 'cardio',
  'ortho', 'pediatric', 'gynec', 'diagnostic', 'diagnostics', 'pathology', 'scan', 'xray', 'mri',
  'blood', 'physio', 'physiotherapy', 'ayurveda', 'ayurvedic', 'homeopathy', 'fertility', 'ivf',
  'vet', 'veterinary', 'nursing', 'ambulance', 'optical', 'optician', 'glasses', 'hearing',

  // Automotive & Transport
  'car', 'cars', 'bike', 'bikes', 'scooter', 'scooters', 'motorcycle', 'motorcycles',
  'auto', 'automobile', 'automobiles', 'motor', 'motors', 'vehicle', 'vehicles', 'truck', 'trucks',
  'garage', 'garages', 'mechanic', 'mechanics', 'tyre', 'tyres', 'tire', 'tires', 'wheel', 'wheels',
  'battery', 'batteries', 'parts', 'spares', 'spare', 'wash', 'detailing', 'alignment',
  'driving', 'taxi', 'cab', 'cabs', 'travels', 'travel', 'transport', 'logistics', 'courier', 'cargo', 'freight', 'packers', 'movers',

  // Home, Construction & Real Estate
  'home', 'house', 'office', 'kitchen', 'modular', 'interior', 'interiors', 'exterior',
  'construction', 'building', 'civil', 'architect', 'architects', 'real', 'estate', 'property', 'properties',
  'flat', 'flats', 'apartment', 'apartments', 'villa', 'villas', 'plot', 'plots', 'land', 'rent',
  'plumber', 'plumbers', 'plumbing', 'electrician', 'electricians', 'carpenter', 'carpenters', 'carpentry',
  'painter', 'painters', 'painting', 'pest', 'control', 'cleaning', 'cleaners', 'maid',
  'ac', 'air', 'cooler', 'fridge', 'refrigerator', 'washing', 'machine', 'microwave', 'tv', 'geyser',
  'solar', 'panel', 'panels', 'borewell', 'water', 'purifier', 'ro', 'waterproofing', 'welding', 'welder', 'fabrication', 'fabricator',
  'steel', 'iron', 'cement', 'sand', 'bricks', 'tiles', 'marble', 'granite', 'glass', 'plywood', 'timber', 'wood', 'paint', 'paints', 'sanitary', 'pipes', 'pipe', 'lift', 'elevator',

  // Food, Hospitality & Events
  'hotel', 'hotels', 'resort', 'resorts', 'lodge', 'lodges', 'hostel', 'pg', 'homestay',
  'restaurant', 'restaurants', 'cafes', 'bakery', 'bakeries', 'cake', 'cakes', 'pastry',
  'food', 'foods', 'sweet', 'sweets', 'mithai', 'snack', 'snacks', 'tea', 'coffee', 'juice', 'ice', 'cream',
  'biryani', 'pizza', 'burger', 'tiffin', 'mess', 'dhaba', 'bar', 'pub', 'lounge', 'caterer', 'caterers', 'catering',
  'wedding', 'weddings', 'marriage', 'event', 'events', 'party', 'banquet', 'hall', 'halls', 'venue', 'venues',
  'mandap', 'mandapam', 'convention', 'function', 'lawn', 'tent', 'flower', 'flowers', 'florist',
  'photo', 'photos', 'photographer', 'photographers', 'photography', 'video', 'videographer', 'videography', 'candid', 'drone', 'album',
  'decorator', 'decorators', 'decoration', 'planner', 'planners', 'dj', 'music', 'band', 'sound', 'lighting',

  // Retail, Fashion, Beauty & Wellness
  'cloth', 'clothes', 'clothing', 'garment', 'garments', 'textile', 'textiles', 'fabric', 'fabrics',
  'dress', 'dresses', 'saree', 'sarees', 'silk', 'cotton', 'suit', 'suits', 'mens', 'womens', 'kids', 'wear',
  'boutique', 'boutiques', 'tailor', 'tailors', 'footwear', 'shoe', 'shoes', 'bag', 'bags', 'luggage',
  'jewel', 'jewels', 'jeweller', 'jewellers', 'jewellery', 'jewelry', 'gold', 'silver', 'diamond', 'watch', 'watches',
  'furniture', 'sofa', 'mattress', 'curtain', 'curtains', 'carpet', 'decor', 'handicraft',
  'book', 'books', 'stationery', 'gift', 'gifts', 'toy', 'toys', 'sports', 'cycle', 'bicycle',
  'grocery', 'groceries', 'kirana', 'provision', 'organic', 'fruit', 'fruits', 'vegetable', 'vegetables', 'dairy', 'milk', 'meat', 'fish', 'chicken',
  'gym', 'gyms', 'fitness', 'yoga', 'pilates', 'zumba', 'swimming', 'spa', 'spas', 'salon', 'salons', 'parlour', 'parlor', 'makeup', 'beauty', 'barber', 'hair', 'nail', 'tattoo',

  // Education, Professional, Industrial & Agriculture
  'school', 'schools', 'college', 'colleges', 'university', 'coaching', 'tuition', 'tutor', 'tutors',
  'academy', 'institute', 'institutes', 'training', 'classes', 'class', 'preschool', 'kindergarten', 'play', 'montessori', 'dance', 'art', 'ielts', 'abroad', 'visa',
  'lawyer', 'lawyers', 'advocate', 'advocates', 'legal', 'notary', 'chartered', 'accountant', 'accountants', 'ca', 'tax', 'gst', 'audit',
  'insurance', 'loan', 'loans', 'finance', 'financial', 'bank', 'investment', 'marketing', 'seo', 'advertising', 'media', 'pr', 'hr', 'recruitment', 'placement', 'staffing',
  'printing', 'print', 'press', 'flex', 'banner', 'signage', 'board', 'packaging', 'box', 'boxes', 'carton', 'label', 'labels',
  'machinery', 'machines', 'tools', 'equipment', 'industrial', 'chemical', 'chemicals', 'plastic', 'plastics', 'rubber', 'paper', 'metal', 'cnc', 'laser', 'cutting', 'hydraulic', 'pump', 'pumps', 'generator', 'generators', 'boiler', 'valve', 'valves', 'bearing', 'bearings', 'cable', 'cables', 'wire', 'wires',
  'agriculture', 'agricultural', 'agri', 'seed', 'seeds', 'fertilizer', 'fertilizers', 'pesticide', 'pesticides', 'tractor', 'tractors', 'nursery', 'nurseries', 'plant', 'plants', 'garden', 'farm', 'dairy', 'poultry', 'cold', 'storage', 'warehouse',
  'pet', 'pets', 'dog', 'cat', 'aquarium', 'grooming', 'laundry', 'dry', 'cleaners', 'tailoring', 'astrologer', 'pandit', 'temple'
]);

const TRADE_TYPOS_MAP = new Map([
  // IT, Computers, Mobiles & Electronics
  ['computr', 'computer'],
  ['compter', 'computer'],
  ['comptr', 'computer'],
  ['compuetr', 'computer'],
  ['computrs', 'computers'],
  ['computar', 'computer'],
  ['laptp', 'laptop'],
  ['lapotp', 'laptop'],
  ['laptap', 'laptop'],
  ['laptps', 'laptops'],
  ['desktp', 'desktop'],
  ['moble', 'mobile'],
  ['mobail', 'mobile'],
  ['moblie', 'mobile'],
  ['mobils', 'mobiles'],
  ['smartphne', 'smartphone'],
  ['electroics', 'electronics'],
  ['electrnics', 'electronics'],
  ['elctronics', 'electronics'],
  ['hardwre', 'hardware'],
  ['hardwar', 'hardware'],
  ['softwre', 'software'],
  ['softwar', 'software'],
  ['printr', 'printer'],
  ['prntrs', 'printers'],
  ['acessories', 'accessories'],
  ['accesories', 'accessories'],
  ['netwrking', 'networking'],
  ['cc tv', 'cctv'],

  // Photography & Videography
  ['phtgaphers', 'photographers'],
  ['phtgapher', 'photographer'],
  ['phtgopher', 'photographer'],
  ['phtgrphr', 'photographer'],
  ['phtographers', 'photographers'],
  ['phtographer', 'photographer'],
  ['photgrapher', 'photographer'],
  ['photgraphers', 'photographers'],
  ['photgraphy', 'photography'],
  ['photograper', 'photographer'],
  ['photogapers', 'photographers'],
  ['photogaper', 'photographer'],
  ['photogrfy', 'photography'],
  ['photogrphy', 'photography'],
  ['photogrpahy', 'photography'],
  ['fotography', 'photography'],
  ['fotographer', 'photographer'],
  ['fotographers', 'photographers'],
  ['fotogrfy', 'photography'],
  ['fotogaphy', 'photography'],
  ['potography', 'photography'],
  ['potographer', 'photographer'],
  ['cameraman', 'photographer'],
  ['cameramen', 'photographers'],
  ['vedio', 'video'],
  ['videograpy', 'videography'],
  ['vedigraphy', 'videography'],
  ['vedigrapher', 'videographer'],
  ['videograper', 'videographer'],
  ['vedios', 'videos'],

  // Weddings, Venues & Decors
  ['weeding', 'wedding'],
  ['weddding', 'wedding'],
  ['wedidng', 'wedding'],
  ['wedin', 'wedding'],
  ['marrige', 'marriage'],
  ['marraige', 'marriage'],
  ['merriage', 'marriage'],
  ['mandapam', 'mandap'],
  ['mandapams', 'mandap'],
  ['shamiana', 'tent house'],
  ['shamiyana', 'tent house'],
  ['pandol', 'pandal decorators'],
  ['pandal', 'pandal decorators'],
  ['functionhall', 'function hall'],
  ['funtion hall', 'function hall'],
  ['funtionhall', 'function hall'],
  ['decarator', 'decorator'],
  ['decorater', 'decorator'],
  ['decoraters', 'decorators'],
  ['decarators', 'decorators'],
  ['decors', 'decorators'],
  ['flwer', 'flower'],

  // Catering & Food
  ['caterors', 'caterers'],
  ['catrers', 'caterers'],
  ['caterar', 'caterer'],
  ['catrer', 'caterer'],
  ['caterings', 'catering'],
  ['cetring', 'catering'],
  ['catring', 'catering'],
  ['restaurent', 'restaurant'],
  ['resturant', 'restaurant'],
  ['resturent', 'restaurant'],
  ['bakary', 'bakery'],
  ['backery', 'bakery'],
  ['sweetshop', 'sweet shop'],
  ['biriyani', 'biryani'],
  ['biryany', 'biryani'],

  // Home Services & Repair
  ['plumer', 'plumber'],
  ['plubmer', 'plumber'],
  ['plambur', 'plumber'],
  ['plambr', 'plumber'],
  ['electrition', 'electrician'],
  ['electrican', 'electrician'],
  ['electrisian', 'electrician'],
  ['electrisan', 'electrician'],
  ['electritions', 'electricians'],
  ['carpanter', 'carpenter'],
  ['carpentor', 'carpenter'],
  ['paniter', 'painter'],
  ['peinter', 'painter'],
  ['repiar', 'repair'],
  ['repeir', 'repair'],
  ['repaire', 'repair'],
  ['repaier', 'repair'],
  ['servise', 'service'],
  ['servce', 'service'],
  ['servis', 'service'],
  ['mecanic', 'mechanic'],
  ['mechnic', 'mechanic'],
  ['acrepair', 'ac repair'],
  ['interier', 'interior design'],
  ['constuction', 'construction'],
  ['archtect', 'architect'],
  ['slar', 'solar'],

  // Beauty, Salons & Fashion
  ['make up', 'makeup'],
  ['mekeup', 'makeup'],
  ['make-up', 'makeup'],
  ['beatition', 'beautician'],
  ['beuty parlour', 'beauty parlour'],
  ['beuty parlor', 'beauty parlour'],
  ['saloon', 'salon'],
  ['mehendi', 'mehendi artist'],
  ['mehandi', 'mehendi artist'],
  ['mehndi', 'mehendi artist'],
  ['butiqe', 'boutique'],
  ['butique', 'boutique'],
  ['botique', 'boutique'],
  ['jewelery', 'jewellers'],
  ['jewellary', 'jewellers'],
  ['jwellery', 'jewellers'],
  ['tailer', 'tailor'],

  // Healthcare
  ['hospitel', 'hospital'],
  ['hosptal', 'hospital'],
  ['hospitl', 'hospital'],
  ['clinc', 'clinic'],
  ['clnic', 'clinic'],
  ['dentel', 'dental'],
  ['dentst', 'dentist'],
  ['medicl', 'medical'],
  ['pharmcy', 'pharmacy'],
  ['phrmacy', 'pharmacy'],

  // Auto & Logistics
  ['garag', 'garage'],
  ['garadge', 'garage'],
  ['automobil', 'automobile'],
  ['showrom', 'showroom'],
  ['shwroom', 'showroom'],
  ['trvels', 'travels'],
  ['logistcs', 'logistics'],

  // Professional & Industrial
  ['lawer', 'lawyer'],
  ['adovate', 'advocate'],
  ['advokat', 'advocate'],
  ['acountant', 'accountant'],
  ['priting', 'printing'],
  ['wholsaler', 'wholesaler'],
  ['manfacturer', 'manufacturer'],
  ['fabrcator', 'fabricator'],
  ['deler', 'dealer'],
  ['delers', 'dealers'],
  ['delear', 'dealer'],
  ['delears', 'dealers'],
  ['shps', 'shops']
]);

/**
 * Strips vowels, double consonants, and symbols to form phonetic skeleton
 */
function consonantSkeleton(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/[aeiou]/g, '')
    .replace(/(.)\1+/g, '$1');
}

/**
 * Standard Levenshtein distance
 */
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

/**
 * Canonical single-word targets for safe high-precision spelling correction.
 * Only long or unmistakable trade terms are included; short common words are guarded.
 */
const CANONICAL_TRADE_TARGETS = [
  'photographers', 'photographer', 'photography', 'videographers', 'videographer',
  'computer', 'computers', 'laptop', 'laptops', 'electronics', 'hardware', 'software',
  'caterers', 'catering', 'decorators', 'decoration', 'banquet', 'mandap',
  'plumbers', 'plumber', 'electricians', 'electrician', 'carpenters', 'carpenter',
  'painters', 'painter', 'interior', 'architects', 'builders', 'contractors',
  'hospitals', 'clinics', 'dentists', 'pharmacies', 'diagnostics', 'physiotherapy',
  'restaurants', 'bakeries', 'boutiques', 'jewellers', 'supermarkets', 'furniture',
  'automobiles', 'garages', 'showrooms', 'logistics', 'transport', 'couriers',
  'coaching', 'colleges', 'schools', 'institutes', 'universities',
  'lawyers', 'advocates', 'accountants', 'printing', 'marketing',
  'manufacturers', 'wholesalers', 'distributors', 'fabricators', 'suppliers'
];

/**
 * Safe adaptive fuzzy trade check:
 * 1. NEVER mutates valid English / commercial words in COMMON_WORD_WHITELIST.
 * 2. Applies exact curated typo fixes from TRADE_TYPOS_MAP.
 * 3. Only runs strict Levenshtein matching for genuinely misspelled words (>= 5 chars, same starting letter).
 */
function correctTradeTypo(token) {
  if (!token || typeof token !== 'string') return token;
  const raw = token.trim().toLowerCase();
  if (raw.length < 3) return token;

  // Guard 1: NEVER mutate valid English or commercial words!
  if (COMMON_WORD_WHITELIST.has(raw)) {
    return token;
  }

  // Guard 2: Direct curated typo map check
  if (TRADE_TYPOS_MAP.has(raw)) {
    return TRADE_TYPOS_MAP.get(raw);
  }

  // Singular/plural check in curated typo map
  if (raw.endsWith('s') && TRADE_TYPOS_MAP.has(raw.slice(0, -1))) {
    const base = TRADE_TYPOS_MAP.get(raw.slice(0, -1));
    return base.endsWith('s') ? base : `${base}s`;
  }

  // Guard 3: Consonant skeleton check strictly against curated typos of length >= 6
  const skel = consonantSkeleton(raw);
  if (raw.length >= 6 && skel.length >= 4) {
    for (const [key, replacement] of TRADE_TYPOS_MAP.entries()) {
      if (raw[0] !== replacement[0] && raw[0] !== key[0]) continue;
      const keySkel = consonantSkeleton(key);
      const repSkel = consonantSkeleton(replacement);
      if (skel === keySkel || skel === repSkel) {
        if (levenshtein(raw, replacement) <= (raw.length >= 8 ? 3 : 2)) {
          return replacement;
        }
      }
    }
  }

  // Guard 4: Strict Levenshtein check against canonical targets (never short words, same first letter)
  if (raw.length >= 5) {
    for (const target of CANONICAL_TRADE_TARGETS) {
      if (raw[0] !== target[0]) continue;
      const maxDist = target.length >= 10 ? 2 : 1;
      if (Math.abs(raw.length - target.length) <= maxDist && levenshtein(raw, target) <= maxDist) {
        return target;
      }
    }
  }

  return token;
}

/**
 * Normalizes genuine trade typos across a full query string or category fragment
 * while keeping valid commercial nouns intact.
 */
function normalizeTradePhrase(phrase) {
  if (!phrase || typeof phrase !== 'string') return phrase;
  const tokens = phrase.split(/\s+/).filter(Boolean);
  const corrected = tokens.map(t => correctTradeTypo(t));
  return corrected.join(' ');
}

/**
 * Checks if a query represents any known local business, shop, service, supplier, or trade
 */
function isKnownServiceOrTypo(text) {
  if (!text) return false;
  const normalized = normalizeTradePhrase(text).toLowerCase();
  const serviceStemRegex = /(shop|store|dealer|showroom|computer|laptop|mobile|electronic|hardware|software|cctv|printer|repair|servic|mechanic|technician|install|amc|maintenance|plumb|electric|carpent|paint|clean|pest|tutor|tuition|coach|school|college|academy|institute|doctor|clinic|hospital|dental|dentist|pharmacy|diagnostic|salon|spa|gym|fitness|yoga|photograph|videograph|cater|banquet|decorat|makeup|parlour|parlor|travel|transport|logistic|courier|packers|movers|interior|architect|builder|contractor|real estate|property|security|event|restaurant|cafe|dhaba|bakery|sweet|hotel|resort|mandap|auditorium|studio|cameraman|lawyer|advocate|accountant|ca\b|tax|gst|garage|tyre|boutique|jeweller|cloth|garment|textile|furniture|supermarket|grocery|solar|borewell|fabricat|manufactur|wholesal|distribut|supplier|agency|marketing|print|pet|vet|agri|nursery|biryani)/i;
  return serviceStemRegex.test(normalized) || serviceStemRegex.test(text.toLowerCase());
}

/**
 * Universal Rich Domain Expansions across ALL 25+ global commercial industries.
 * Returns normalized suggestion rows with consistent `type: 'category'` & `value`.
 */
function getUniversalRichExpansions(categoryLabel, family = 'generic', location = '') {
  if (!categoryLabel) return [];
  let cleanLabel = categoryLabel.trim();
  cleanLabel = cleanLabel.replace(/\s+(?:in|near|around|at)\s+.*$/i, '').trim();
  if (!cleanLabel) return [];
  const locSuffix = location ? ` in ${location}` : '';
  const norm = cleanLabel.toLowerCase();

  const formatRows = (rows, resolvedFamily = family) => rows.map(item => ({
    type: 'category',
    value: item.baseValue || item.label.replace(/\s+in\s+.*$/i, '').trim(),
    label: item.label,
    subtitle: item.subtitle,
    detail: item.detail,
    family: resolvedFamily || 'generic',
    familyLabel: item.familyLabel || item.detail,
    corrected: false,
    matched: cleanLabel
  }));

  // 1. IT, Computers, Laptops & Peripherals
  if (/\b(?:computer|computers|laptop|laptops|desktop|pc|gaming pc|computer hardware|it hardware|peripherals)\b/i.test(norm)) {
    return formatRows([
      { baseValue: 'Computer Shops & Laptop Dealers', label: `Computer Shops & Laptop Dealers${locSuffix}`, subtitle: 'Desktops, Laptops, Accessories & Multi-Brand Stores', detail: 'IT & COMPUTERS' },
      { baseValue: 'Laptop Repair & Service Centres', label: `Laptop Repair & Service Centres${locSuffix}`, subtitle: 'Chip-Level Repair, Screen Replacement & Upgrades', detail: 'REPAIR & SERVICE' },
      { baseValue: 'Computer Hardware & Peripherals', label: `Computer Hardware & Peripherals${locSuffix}`, subtitle: 'Monitors, SSDs, RAM, Motherboards & Accessories', detail: 'HARDWARE' },
      { baseValue: 'Gaming PC & Custom Builders', label: `Gaming PC & Custom Builders${locSuffix}`, subtitle: 'Custom Workstations, GPUs & High-Performance Rigs', detail: 'CUSTOM PC' },
      { baseValue: 'Second Hand Laptop & PC Dealers', label: `Second Hand Laptop & PC Dealers${locSuffix}`, subtitle: 'Refurbished Business Laptops & Bulk Office PCs', detail: 'REFURBISHED' }
    ], 'technology');
  }

  // 2. Mobile Phones & Smartphones
  if (/\b(?:mobile|mobiles|smartphone|smartphones|iphone|cellphone|phone shop|phone repair|tablet)\b/i.test(norm)) {
    return formatRows([
      { baseValue: 'Mobile Phone Shops & Showrooms', label: `Mobile Phone Shops & Showrooms${locSuffix}`, subtitle: 'Multi-Brand Smartphones, Tablets & EMI Stores', detail: 'MOBILE STORES' },
      { baseValue: 'Mobile Repair & Service Centres', label: `Mobile Repair & Service Centres${locSuffix}`, subtitle: 'Screen Replacement, Battery & Motherboard Repair', detail: 'REPAIR' },
      { baseValue: 'Mobile Accessories & Wholesale', label: `Mobile Accessories & Wholesale${locSuffix}`, subtitle: 'Chargers, Cases, Tempered Glass & Audio Gear', detail: 'ACCESSORIES' },
      { baseValue: 'Second Hand & Refurbished Mobiles', label: `Second Hand & Refurbished Mobiles${locSuffix}`, subtitle: 'Pre-Owned Verified Smartphones & Exchange', detail: 'PRE-OWNED' }
    ], 'technology');
  }

  // 3. CCTV, Security & Surveillance
  if (/\b(?:cctv|security camera|surveillance|biometric|intercom|access control)\b/i.test(norm)) {
    return formatRows([
      { baseValue: 'CCTV Camera Dealers & Installation', label: `CCTV Camera Dealers & Installation${locSuffix}`, subtitle: 'HD/IP Security Cameras, DVR/NVR & Home Setup', detail: 'SECURITY' },
      { baseValue: 'Biometric & Access Control Systems', label: `Biometric & Access Control Systems${locSuffix}`, subtitle: 'Office Attendance, Video Door Phones & Smart Locks', detail: 'COMMERCIAL' },
      { baseValue: 'CCTV Repair & AMC Services', label: `CCTV Repair & AMC Services${locSuffix}`, subtitle: 'Annual Maintenance, Wiring & Remote View Setup', detail: 'MAINTENANCE' }
    ], 'technology');
  }

  // 4. Printers, Networking & Software / IT Companies
  if (/\b(?:printer|scanner|toner|cartridge|networking|software|web design|web dev|app dev|it company|it services|digital marketing|seo)\b/i.test(norm)) {
    if (/printer|scanner|toner|cartridge/i.test(norm)) {
      return formatRows([
        { baseValue: 'Printer Dealers & Service Centres', label: `Printer Dealers & Service Centres${locSuffix}`, subtitle: 'Laser, Inkjet & Multifunction Printers Sales & Repair', detail: 'PRINTERS' },
        { baseValue: 'Toner & Cartridge Refilling Shops', label: `Toner & Cartridge Refilling Shops${locSuffix}`, subtitle: 'Original Cartridges, Inks & Onsite Refilling', detail: 'SUPPLIES' }
      ], 'technology');
    }
    return formatRows([
      { baseValue: 'Software & IT Service Companies', label: `Software & IT Service Companies${locSuffix}`, subtitle: 'Custom Software, ERP, Cloud & Enterprise IT', detail: 'IT & SOFTWARE' },
      { baseValue: 'Website & Mobile App Developers', label: `Website & Mobile App Developers${locSuffix}`, subtitle: 'Business Websites, E-Commerce & iOS/Android Apps', detail: 'WEB & APPS' },
      { baseValue: 'Digital Marketing & SEO Agencies', label: `Digital Marketing & SEO Agencies${locSuffix}`, subtitle: 'Google Ads, Social Media & Lead Generation', detail: 'MARKETING' }
    ], 'technology');
  }

  // 5. Electronics & Home Appliances Showrooms
  if (/\b(?:electronics|electronic|appliances|tv showroom|inverter|battery|ups)\b/i.test(norm) && !/repair/i.test(norm)) {
    return formatRows([
      { baseValue: 'Electronics & Appliance Showrooms', label: `Electronics & Appliance Showrooms${locSuffix}`, subtitle: 'TVs, Refrigerators, ACs, Washing Machines & Audio', detail: 'ELECTRONICS' },
      { baseValue: 'Inverter, UPS & Battery Dealers', label: `Inverter, UPS & Battery Dealers${locSuffix}`, subtitle: 'Home Power Backup, Batteries & Solar Inverters', detail: 'POWER BACKUP' },
      { baseValue: 'Wholesale Electronics Dealers', label: `Wholesale Electronics Dealers${locSuffix}`, subtitle: 'Bulk Electronic Components & Trade Pricing', detail: 'WHOLESALE' }
    ], 'technology');
  }

  // 6. Photography & Videography Studios
  if (/photograph|studio|cameraman|videograph|photoshoot|candid/i.test(norm)) {
    return formatRows([
      { baseValue: 'Photographers', label: `Photographers${locSuffix}`, subtitle: 'Verified Professional Photographers & Studios', detail: 'PHOTOGRAPHY' },
      { baseValue: 'Wedding Photographers', label: `Wedding Photographers${locSuffix}`, subtitle: 'Weddings, Receptions & Candid Event Specialists', detail: 'WEDDING' },
      { baseValue: 'Photo Studios', label: `Photo Studios${locSuffix}`, subtitle: 'Portraits, Passport & Indoor Shoot Labs', detail: 'STUDIOS' },
      { baseValue: 'Product & Commercial Photographers', label: `Product & Commercial Photographers${locSuffix}`, subtitle: 'E-Commerce, Catalogue & Brand Photography', detail: 'COMMERCIAL' },
      { baseValue: 'Pre-Wedding & Drone Videographers', label: `Pre-Wedding & Drone Videographers${locSuffix}`, subtitle: 'Cinematic 4K Aerial Coverage & Film Shoots', detail: 'CINEMA' }
    ], 'photography');
  }

  // 7. Catering & Food Services
  if (/cater/i.test(norm)) {
    return formatRows([
      { baseValue: 'Caterers', label: `Caterers${locSuffix}`, subtitle: 'Professional Food Catering for All Occasions', detail: 'CATERING' },
      { baseValue: 'Wedding Caterers', label: `Wedding Caterers${locSuffix}`, subtitle: 'Grand Wedding Feasts & Reception Buffets', detail: 'WEDDING' },
      { baseValue: 'Pure Veg Caterers', label: `Pure Veg Caterers${locSuffix}`, subtitle: 'Traditional Pure Vegetarian & Ritual Menus', detail: 'PURE VEG' },
      { baseValue: 'Corporate & Party Caterers', label: `Corporate & Party Caterers${locSuffix}`, subtitle: 'Office Events, Birthdays & Bulk Food Orders', detail: 'EVENTS' }
    ], 'food');
  }

  // 8. Venues, Marriage Halls & Mandaps
  if (/venue|hall|mandap|kalyana|banquet|convention/i.test(norm)) {
    return formatRows([
      { baseValue: 'Wedding Venues', label: `Wedding Venues${locSuffix}`, subtitle: 'Marriage Halls, Open Lawns & Convention Centers', detail: 'VENUES' },
      { baseValue: 'AC Function Halls & Convention Centres', label: `AC Function Halls & Convention Centres${locSuffix}`, subtitle: 'Spacious Air-Conditioned Halls with Dining', detail: 'AC HALLS' },
      { baseValue: 'Kalyana Mandapams', label: `Kalyana Mandapams${locSuffix}`, subtitle: 'Traditional Mandapams & Heritage Venues', detail: 'MANDAPAMS' },
      { baseValue: 'Banquet Halls', label: `Banquet Halls${locSuffix}`, subtitle: 'Modern Banquets for Receptions & Corporate Events', detail: 'BANQUETS' }
    ], 'wedding');
  }

  // 9. Decorators & Floral Design
  if (/decor|florist|flower|stage|balloon/i.test(norm)) {
    if (/flower\s*shop|florist|bouquet/i.test(norm) && !/decor|stage|mandap/i.test(norm)) {
      return formatRows([
        { baseValue: 'Flower Shops & Florists', label: `Flower Shops & Florists${locSuffix}`, subtitle: 'Fresh Bouquets, Garlands & Same-Day Flower Delivery', detail: 'FLORISTS' },
        { baseValue: 'Fresh Flower Decorators & Florists', label: `Fresh Flower Decorators & Florists${locSuffix}`, subtitle: 'Stage, Mandap & Event Floral Arrangements', detail: 'FLORAL DECOR' },
        { baseValue: 'Wholesale Flower Markets & Suppliers', label: `Wholesale Flower Markets & Suppliers${locSuffix}`, subtitle: 'Bulk Fresh Flowers & Commercial Florists', detail: 'WHOLESALE' }
      ], 'retail');
    }
    return formatRows([
      { baseValue: 'Wedding & Event Decorators', label: `Wedding & Event Decorators${locSuffix}`, subtitle: 'Full Venue Styling, Lighting & Event Design', detail: 'DECOR' },
      { baseValue: 'Stage & Mandap Decorators', label: `Stage & Mandap Decorators${locSuffix}`, subtitle: 'Grand Reception Stages & Floral Backdrops', detail: 'WEDDING' },
      { baseValue: 'Fresh Flower Decorators & Florists', label: `Fresh Flower Decorators & Florists${locSuffix}`, subtitle: 'Bouquets, Garlands & Traditional Floral Decor', detail: 'FLORAL' },
      { baseValue: 'Theme & Balloon Decorators', label: `Theme & Balloon Decorators${locSuffix}`, subtitle: 'Birthdays, Baby Showers & Corporate Themes', detail: 'EVENTS' }
    ], 'wedding');
  }

  // 10. Plumbing & Water Works
  if (/plumb|pipe|tap|drain|sanitary/i.test(norm)) {
    return formatRows([
      { baseValue: 'Plumbers', label: `Plumbers${locSuffix}`, subtitle: 'Doorstep Plumbing Repair & Installation', detail: 'PLUMBING' },
      { baseValue: 'Emergency Plumber Services', label: `Emergency Plumber Services${locSuffix}`, subtitle: 'Immediate Pipe Leakage & Blockage Repair', detail: '24/7 REPAIR' },
      { baseValue: 'Plumbing Contractors', label: `Plumbing Contractors${locSuffix}`, subtitle: 'New Building Piping & Commercial Drainage', detail: 'CONTRACTORS' },
      { baseValue: 'Sanitaryware & Pipe Fittings Stores', label: `Sanitaryware & Pipe Fittings Stores${locSuffix}`, subtitle: 'Bathroom Fittings, Taps & Plumbing Supplies', detail: 'SUPPLIES' }
    ], 'home-services');
  }

  // 11. Electrical & Solar Works
  if (/electric|wiring|mcb|solar|rooftop|borewell|water purifier|ro service/i.test(norm)) {
    if (/solar/i.test(norm)) {
      return formatRows([
        { baseValue: 'Solar Panel Dealers & Installers', label: `Solar Panel Dealers & Installers${locSuffix}`, subtitle: 'Rooftop Solar Systems, Net Metering & Subsidy Setup', detail: 'SOLAR ENERGY' },
        { baseValue: 'Commercial Solar EPC Contractors', label: `Commercial Solar EPC Contractors${locSuffix}`, subtitle: 'Industrial Plants, Solar Pumps & Street Lights', detail: 'COMMERCIAL' }
      ], 'home-services');
    }
    if (/water purifier|ro /i.test(norm)) {
      return formatRows([
        { baseValue: 'RO Water Purifier Dealers & Service', label: `RO Water Purifier Dealers & Service${locSuffix}`, subtitle: 'Filter Replacement, Repair & New Installation', detail: 'WATER PURIFIER' }
      ], 'home-services');
    }
    return formatRows([
      { baseValue: 'Electricians', label: `Electricians${locSuffix}`, subtitle: 'Certified Household & Commercial Electricians', detail: 'ELECTRICAL' },
      { baseValue: 'Emergency Electrician Services', label: `Emergency Electrician Services${locSuffix}`, subtitle: 'Short Circuits, Tripped MCB & Power Faults', detail: '24/7 REPAIR' },
      { baseValue: 'Electrical Contractors & Wiring', label: `Electrical Contractors & Wiring${locSuffix}`, subtitle: 'Complete House Wiring & Commercial Panels', detail: 'CONTRACTORS' },
      { baseValue: 'Electrical Goods & Lighting Shops', label: `Electrical Goods & Lighting Shops${locSuffix}`, subtitle: 'Wires, Switches, Fans & LED Lights Dealers', detail: 'SUPPLIES' }
    ], 'home-services');
  }

  // 12. Carpentry & Furniture
  if (/carpent|wood|furniture|modular kitchen|plywood|sofa|mattress/i.test(norm)) {
    return formatRows([
      { baseValue: 'Furniture Showrooms & Stores', label: `Furniture Showrooms & Stores${locSuffix}`, subtitle: 'Sofas, Beds, Dining Tables & Office Furniture', detail: 'FURNITURE' },
      { baseValue: 'Carpenters & Woodwork Services', label: `Carpenters & Woodwork Services${locSuffix}`, subtitle: 'Door Locks, Cupboards & Custom Woodwork', detail: 'CARPENTRY' },
      { baseValue: 'Modular Kitchen & Wardrobe Designers', label: `Modular Kitchen & Wardrobe Designers${locSuffix}`, subtitle: 'Custom Plywood & Modern Kitchen Installations', detail: 'INTERIORS' }
    ], 'home-services');
  }

  // 13. Painting & Waterproofing
  if (/paint|waterproof/i.test(norm)) {
    if (/paint\s*shop|paint\s*dealer|paint\s*store/i.test(norm)) {
      return formatRows([
        { baseValue: 'Paint Shops & Authorised Dealers', label: `Paint Shops & Authorised Dealers${locSuffix}`, subtitle: 'Wall Putty, Primers & Multi-Brand Paints', detail: 'DEALERS' },
        { baseValue: 'Painting Contractors & Painters', label: `Painting Contractors & Painters${locSuffix}`, subtitle: 'Interior, Exterior & Texture House Painting', detail: 'PAINTING' },
        { baseValue: 'Waterproofing Specialists', label: `Waterproofing Specialists${locSuffix}`, subtitle: 'Terrace, Bathroom & Wall Seepage Solutions', detail: 'WATERPROOFING' }
      ], 'home-services');
    }
    return formatRows([
      { baseValue: 'Painting Contractors & Painters', label: `Painting Contractors & Painters${locSuffix}`, subtitle: 'Interior, Exterior & Texture House Painting', detail: 'PAINTING' },
      { baseValue: 'Waterproofing Specialists', label: `Waterproofing Specialists${locSuffix}`, subtitle: 'Terrace, Bathroom & Wall Seepage Solutions', detail: 'WATERPROOFING' },
      { baseValue: 'Paint Shops & Authorised Dealers', label: `Paint Shops & Authorised Dealers${locSuffix}`, subtitle: 'Wall Putty, Primers & Multi-Brand Paints', detail: 'DEALERS' }
    ], 'home-services');
  }

  // 14. AC & Appliance Repair / HVAC
  if (/ac repair|hvac|air condition|refrigerator|fridge|washing machine|appliance repair/i.test(norm)) {
    return formatRows([
      { baseValue: 'AC Repair & HVAC Services', label: `AC Repair & HVAC Services${locSuffix}`, subtitle: 'All Brand Split/Window AC Servicing & Gas Refill', detail: 'AC & HVAC' },
      { baseValue: 'Home Appliance Repair Centres', label: `Home Appliance Repair Centres${locSuffix}`, subtitle: 'Fridge, Washing Machine, TV & Microwave Repair', detail: 'APPLIANCES' },
      { baseValue: 'Commercial HVAC Contractors', label: `Commercial HVAC Contractors${locSuffix}`, subtitle: 'Central Cooling, Ducting & Office AMC', detail: 'COMMERCIAL' }
    ], 'home-services');
  }

  // 15. Salons, Makeup, Gyms & Wellness
  if (/\b(?:salon|salons|parlour|parlor|spa|spas|makeup|mehendi|beautician|barber|gym|gyms|fitness|yoga)\b/i.test(norm)) {
    if (/gym|fitness|yoga/i.test(norm)) {
      return formatRows([
        { baseValue: 'Gyms & Fitness Centres', label: `Gyms & Fitness Centres${locSuffix}`, subtitle: 'Personal Training, Cardio & Strength Equipment', detail: 'FITNESS' },
        { baseValue: 'Yoga & Wellness Studios', label: `Yoga & Wellness Studios${locSuffix}`, subtitle: 'Yoga Classes, Meditation & Zumba Training', detail: 'WELLNESS' }
      ], 'fitness');
    }
    return formatRows([
      { baseValue: 'Salons & Beauty Parlours', label: `Salons & Beauty Parlours${locSuffix}`, subtitle: 'Haircuts, Styling, Facials & Grooming', detail: 'BEAUTY' },
      { baseValue: 'Bridal Makeup Artists', label: `Bridal Makeup Artists${locSuffix}`, subtitle: 'HD & Airbrush Bridal Makeovers', detail: 'BRIDAL' },
      { baseValue: 'Spas & Wellness Centres', label: `Spas & Wellness Centres${locSuffix}`, subtitle: 'Massage, Therapy & Relaxation Centres', detail: 'WELLNESS' }
    ], 'beauty');
  }

  // 16. Healthcare, Clinics, Hospitals, Dental & Pharmacies
  if (/clinic|doctor|hospital|dentist|dental|pharmacy|medical|chemist|diagnostic|pathology|physio|eye care|dermatolog|veterinary|vet\b/i.test(norm)) {
    if (/pharmacy|pharmacies|medical|chemist|drug/i.test(norm)) {
      return formatRows([
        { baseValue: 'Pharmacies & Medical Stores', label: `Pharmacies & Medical Stores${locSuffix}`, subtitle: '24-Hour Chemists, Prescription Medicines & Surgical Supplies', detail: 'PHARMACY' },
        { baseValue: 'Wholesale Medicine Distributors', label: `Wholesale Medicine Distributors${locSuffix}`, subtitle: 'Pharma Stockists & Bulk Medical Suppliers', detail: 'WHOLESALE' },
        { baseValue: 'Diagnostic Labs & Scan Centres', label: `Diagnostic Labs & Scan Centres${locSuffix}`, subtitle: 'Blood Tests, Pathology, X-Ray & MRI Scans', detail: 'DIAGNOSTICS' },
        { baseValue: 'Clinics & Specialist Doctors', label: `Clinics & Specialist Doctors${locSuffix}`, subtitle: 'General Physicians, Specialists & Consultations', detail: 'HEALTHCARE' }
      ], 'health');
    }
    if (/dentist|dental/i.test(norm)) {
      return formatRows([
        { baseValue: 'Dentists & Dental Clinics', label: `Dentists & Dental Clinics${locSuffix}`, subtitle: 'Implants, Braces, Root Canals & Cosmetic Care', detail: 'DENTAL' },
        { baseValue: 'Dental Hospitals & Orthodontists', label: `Dental Hospitals & Orthodontists${locSuffix}`, subtitle: 'Multi-Chair Dental Centres & Oral Surgeons', detail: 'HOSPITALS' },
        { baseValue: 'Clinics & Specialist Doctors', label: `Clinics & Specialist Doctors${locSuffix}`, subtitle: 'General Physicians, Specialists & Consultations', detail: 'HEALTHCARE' }
      ], 'health');
    }
    if (/diagnostic|pathology|lab\b|scan/i.test(norm)) {
      return formatRows([
        { baseValue: 'Diagnostic Labs & Scan Centres', label: `Diagnostic Labs & Scan Centres${locSuffix}`, subtitle: 'Blood Tests, Pathology, X-Ray & MRI Scans', detail: 'DIAGNOSTICS' },
        { baseValue: 'Multi-Speciality Hospitals', label: `Multi-Speciality Hospitals${locSuffix}`, subtitle: '24/7 Emergency Care, Diagnostics & Surgeries', detail: 'HOSPITALS' },
        { baseValue: 'Pharmacies & Medical Stores', label: `Pharmacies & Medical Stores${locSuffix}`, subtitle: '24-Hour Chemists & Prescription Delivery', detail: 'PHARMACY' }
      ], 'health');
    }
    return formatRows([
      { baseValue: 'Clinics & Specialist Doctors', label: `Clinics & Specialist Doctors${locSuffix}`, subtitle: 'General Physicians, Specialists & Consultations', detail: 'HEALTHCARE' },
      { baseValue: 'Multi-Speciality Hospitals', label: `Multi-Speciality Hospitals${locSuffix}`, subtitle: '24/7 Emergency Care, Diagnostics & Surgeries', detail: 'HOSPITALS' },
      { baseValue: 'Dentists & Dental Clinics', label: `Dentists & Dental Clinics${locSuffix}`, subtitle: 'Implants, Braces, Root Canals & Cosmetic Care', detail: 'DENTAL' },
      { baseValue: 'Pharmacies & Medical Stores', label: `Pharmacies & Medical Stores${locSuffix}`, subtitle: '24-Hour Chemists & Prescription Delivery', detail: 'PHARMACY' },
      { baseValue: 'Diagnostic Labs & Scan Centres', label: `Diagnostic Labs & Scan Centres${locSuffix}`, subtitle: 'Blood Tests, Pathology, X-Ray & MRI Scans', detail: 'DIAGNOSTICS' }
    ], 'health');
  }

  // 17. Restaurants, Cafes, Bakeries & Sweet Shops
  if (/restaurant|cafe|coffee|tea shop|dining|biryani|bakery|cake|sweet|mithai|food|cloud kitchen/i.test(norm)) {
    if (/sweet|mithai/i.test(norm)) {
      return formatRows([
        { baseValue: 'Sweet Shops & Mithai Stores', label: `Sweet Shops & Mithai Stores${locSuffix}`, subtitle: 'Traditional Sweets, Savouries & Bulk Gift Boxes', detail: 'SWEETS' },
        { baseValue: 'Bakeries & Cake Shops', label: `Bakeries & Cake Shops${locSuffix}`, subtitle: 'Custom Cakes, Pastries & Fresh Breads', detail: 'BAKERY' },
        { baseValue: 'Wedding & Event Caterers', label: `Wedding & Event Caterers${locSuffix}`, subtitle: 'Bulk Festive Sweets & Catering Orders', detail: 'CATERING' }
      ], 'food');
    }
    if (/bakery|cake/i.test(norm)) {
      return formatRows([
        { baseValue: 'Bakeries & Cake Shops', label: `Bakeries & Cake Shops${locSuffix}`, subtitle: 'Custom Cakes, Pastries & Fresh Breads', detail: 'BAKERY' },
        { baseValue: 'Sweet Shops & Mithai Stores', label: `Sweet Shops & Mithai Stores${locSuffix}`, subtitle: 'Traditional Sweets, Savouries & Gift Boxes', detail: 'SWEETS' },
        { baseValue: 'Cafes & Coffee Shops', label: `Cafes & Coffee Shops${locSuffix}`, subtitle: 'Specialty Coffee, Snacks & Desserts', detail: 'CAFES' }
      ], 'food');
    }
    if (/coffee|cafe|tea shop/i.test(norm)) {
      return formatRows([
        { baseValue: 'Cafes & Coffee Shops', label: `Cafes & Coffee Shops${locSuffix}`, subtitle: 'Specialty Coffee, Snacks & Work-Friendly Cafes', detail: 'CAFES' },
        { baseValue: 'Bakeries & Cake Shops', label: `Bakeries & Cake Shops${locSuffix}`, subtitle: 'Custom Cakes, Pastries & Fresh Breads', detail: 'BAKERY' },
        { baseValue: 'Restaurants', label: `Restaurants${locSuffix}`, subtitle: 'Top Rated Family Dining & Multi-Cuisine Spots', detail: 'DINING' }
      ], 'food');
    }
    return formatRows([
      { baseValue: 'Restaurants', label: `Restaurants${locSuffix}`, subtitle: 'Top Rated Family Dining & Multi-Cuisine Spots', detail: 'DINING' },
      { baseValue: 'Cafes & Coffee Shops', label: `Cafes & Coffee Shops${locSuffix}`, subtitle: 'Specialty Coffee, Snacks & Work-Friendly Cafes', detail: 'CAFES' },
      { baseValue: 'Bakeries & Cake Shops', label: `Bakeries & Cake Shops${locSuffix}`, subtitle: 'Custom Cakes, Pastries & Fresh Breads', detail: 'BAKERY' },
      { baseValue: 'Sweet Shops & Mithai Stores', label: `Sweet Shops & Mithai Stores${locSuffix}`, subtitle: 'Traditional Sweets, Savouries & Bulk Gift Boxes', detail: 'SWEETS' }
    ], 'food');
  }

  // 18. Automotive, Showrooms, Garages, Tyres & Spare Parts
  if (/car|bike|garage|automobile|auto repair|mechanic|tyre|tire|spare parts|car wash|detailing|driving school/i.test(norm)) {
    if (/tyre|tire|battery|wheel|puncture/i.test(norm)) {
      return formatRows([
        { baseValue: 'Tyre Shops & Auto Spare Parts', label: `Tyre Shops & Auto Spare Parts${locSuffix}`, subtitle: 'Multi-Brand Tyres, Wheel Alignment & Car Batteries', detail: 'PARTS & TYRES' },
        { baseValue: 'Car Service Centres & Garages', label: `Car Service Centres & Garages${locSuffix}`, subtitle: 'Periodic Service, Denting, Painting & Engine Repair', detail: 'GARAGES' },
        { baseValue: 'Two Wheeler Showrooms & Service', label: `Two Wheeler Showrooms & Service${locSuffix}`, subtitle: 'Bike Tyres, Servicing & Genuine Spares', detail: 'TWO WHEELERS' }
      ], 'auto');
    }
    return formatRows([
      { baseValue: 'Car Showrooms & Dealers', label: `Car Showrooms & Dealers${locSuffix}`, subtitle: 'New Cars, Pre-Owned Dealers & Test Drives', detail: 'SHOWROOMS' },
      { baseValue: 'Car Service Centres & Garages', label: `Car Service Centres & Garages${locSuffix}`, subtitle: 'Periodic Service, Denting, Painting & Engine Repair', detail: 'GARAGES' },
      { baseValue: 'Two Wheeler Showrooms & Service', label: `Two Wheeler Showrooms & Service${locSuffix}`, subtitle: 'Motorcycles, Scooters & EV Two-Wheelers', detail: 'TWO WHEELERS' },
      { baseValue: 'Tyre Shops & Auto Spare Parts', label: `Tyre Shops & Auto Spare Parts${locSuffix}`, subtitle: 'Genuine Spares, Wheel Alignment & Batteries', detail: 'PARTS & TYRES' }
    ], 'auto');
  }

  // 19. Education, Schools, Colleges & Coaching
  if (/school|college|coaching|tuition|tutor|academy|institute|training|preschool|ielts|study abroad/i.test(norm)) {
    return formatRows([
      { baseValue: 'Schools & Preschools', label: `Schools & Preschools${locSuffix}`, subtitle: 'CBSE, ICSE, International Schools & Kindergartens', detail: 'SCHOOLS' },
      { baseValue: 'Colleges & Universities', label: `Colleges & Universities${locSuffix}`, subtitle: 'Engineering, Degree, MBA & Polytechnic Colleges', detail: 'COLLEGES' },
      { baseValue: 'Coaching & Competitive Exam Centres', label: `Coaching & Competitive Exam Centres${locSuffix}`, subtitle: 'NEET, JEE, UPSC, Banking & SSC Academies', detail: 'COACHING' },
      { baseValue: 'Computer & Skill Training Institutes', label: `Computer & Skill Training Institutes${locSuffix}`, subtitle: 'Coding, Spoken English, Tally & Career Courses', detail: 'TRAINING' }
    ], 'education');
  }

  // 20. Hotels, Resorts, Travel & Logistics
  if (/hotel|resort|lodge|travel|tour|cab|taxi|packer|mover|shifting|logistic|transport|courier|cargo|warehouse/i.test(norm)) {
    if (/hotel|resort|lodge/i.test(norm)) {
      return formatRows([
        { baseValue: 'Hotels & Resorts', label: `Hotels & Resorts${locSuffix}`, subtitle: 'Business Hotels, Luxury Stays & Family Resorts', detail: 'HOSPITALITY' },
        { baseValue: 'Lodges & Serviced Apartments', label: `Lodges & Serviced Apartments${locSuffix}`, subtitle: 'Budget Rooms & Short-Stay Accommodations', detail: 'STAYS' }
      ], 'hospitality');
    }
    if (/packer|mover|shifting|logistic|transport|courier|cargo|warehouse/i.test(norm)) {
      return formatRows([
        { baseValue: 'Packers and Movers', label: `Packers and Movers${locSuffix}`, subtitle: 'Door-to-Door Home & Office Relocation', detail: 'RELOCATION' },
        { baseValue: 'Transport & Logistics Companies', label: `Transport & Logistics Companies${locSuffix}`, subtitle: 'Goods Carriers, Cargo & Fleet Services', detail: 'LOGISTICS' },
        { baseValue: 'Courier & Parcel Services', label: `Courier & Parcel Services${locSuffix}`, subtitle: 'Domestic & International Express Delivery', detail: 'COURIER' }
      ], 'logistics');
    }
    return formatRows([
      { baseValue: 'Travel Agencies & Tour Operators', label: `Travel Agencies & Tour Operators${locSuffix}`, subtitle: 'Holiday Packages, Flight Bookings & Visa Assistance', detail: 'TRAVEL' },
      { baseValue: 'Car Rentals & Cab Services', label: `Car Rentals & Cab Services${locSuffix}`, subtitle: 'Outstation Cabs, Airport Transfers & Self-Drive', detail: 'RENTALS' }
    ], 'hospitality');
  }

  // 21. Lawyers, CAs, Tax, Finance & Real Estate
  if (/lawyer|advocate|legal|ca\b|chartered accountant|tax consultant|gst|accountant|real estate|property|builder|architect|interior|construction|contractor/i.test(norm)) {
    if (/lawyer|advocate|legal/i.test(norm)) {
      return formatRows([
        { baseValue: 'Lawyers & Advocates', label: `Lawyers & Advocates${locSuffix}`, subtitle: 'Civil, Corporate, Family & Property Legal Advisors', detail: 'LEGAL' },
        { baseValue: 'Property & Documentation Lawyers', label: `Property & Documentation Lawyers${locSuffix}`, subtitle: 'Registration, Title Verification & Agreements', detail: 'PROPERTY LAW' }
      ], 'professional');
    }
    if (/ca\b|chartered|tax|gst|accountant/i.test(norm)) {
      return formatRows([
        { baseValue: 'Chartered Accountants (CA)', label: `Chartered Accountants (CA)${locSuffix}`, subtitle: 'Audits, Taxation & Financial Advisory', detail: 'FINANCE' },
        { baseValue: 'GST & Tax Consultants', label: `GST & Tax Consultants${locSuffix}`, subtitle: 'GST Filing, ITR & Company Registration', detail: 'TAX & GST' }
      ], 'professional');
    }
    return formatRows([
      { baseValue: 'Real Estate Agents & Brokers', label: `Real Estate Agents & Brokers${locSuffix}`, subtitle: 'Plots, Flats, Commercial Spaces & Rentals', detail: 'REAL ESTATE' },
      { baseValue: 'Builders & Construction Contractors', label: `Builders & Construction Contractors${locSuffix}`, subtitle: 'Turnkey Construction & Residential Developers', detail: 'CONSTRUCTION' },
      { baseValue: 'Architects & Interior Designers', label: `Architects & Interior Designers${locSuffix}`, subtitle: 'Floor Plans, 3D Elevation & Complete Interiors', detail: 'ARCHITECTURE' }
    ], 'real-estate');
  }

  // 22. Printing, Packaging & Industrial Manufacturing / B2B
  if (/print|flex|banner|signage|manufactur|supplier|wholesal|factory|machinery|steel|hardware|fabricat|packaging|chemical|plastic|cnc|laser|hydraulic/i.test(norm)) {
    if (/print|flex|banner|signage/i.test(norm)) {
      return formatRows([
        { baseValue: 'Printing Press & Digital Print Shops', label: `Printing Press & Digital Print Shops${locSuffix}`, subtitle: 'Brochures, Business Cards, Offset & Custom Prints', detail: 'PRINTING' },
        { baseValue: 'Flex, Banner & LED Signage Makers', label: `Flex, Banner & LED Signage Makers${locSuffix}`, subtitle: 'Shop Boards, Hoardings & Commercial Branding', detail: 'SIGNAGE' }
      ], 'professional');
    }
    const baseInd = cleanLabel.replace(/\s+(manufacturers|manufacturer|suppliers|supplier|wholesalers|wholesaler|factories|factory)$/i, '').trim() || cleanLabel;
    return formatRows([
      { baseValue: cleanLabel, label: `${cleanLabel}${locSuffix}`, subtitle: `Verified ${cleanLabel} & Direct Business Contacts`, detail: 'B2B & INDUSTRIAL' },
      { baseValue: `${baseInd} Manufacturers`, label: `${baseInd} Manufacturers${locSuffix}`, subtitle: 'Direct Factory & OEM Production Units', detail: 'MANUFACTURERS' },
      { baseValue: `${baseInd} Wholesale Suppliers`, label: `${baseInd} Wholesale Suppliers${locSuffix}`, subtitle: 'Bulk Distributors & Trade Stockists', detail: 'WHOLESALE' }
    ], 'industrial');
  }

  // 23. Specialty Shops (Flowers, Books, Gifts, Shoes, Opticals, Cycles) & General Retail
  if (/flower|florist|bouquet/i.test(norm)) {
    return formatRows([
      { baseValue: 'Flower Shops & Florists', label: `Flower Shops & Florists${locSuffix}`, subtitle: 'Fresh Bouquets, Garlands & Same-Day Flower Delivery', detail: 'FLORISTS' },
      { baseValue: 'Wedding Flower Decorators', label: `Wedding Flower Decorators${locSuffix}`, subtitle: 'Stage, Mandap & Event Floral Arrangements', detail: 'DECOR' },
      { baseValue: 'Wholesale Flower Markets & Suppliers', label: `Wholesale Flower Markets & Suppliers${locSuffix}`, subtitle: 'Bulk Fresh Flowers & Commercial Florists', detail: 'WHOLESALE' }
    ], 'retail');
  }
  if (/book\s*shop|bookstore|stationery|notebook/i.test(norm)) {
    return formatRows([
      { baseValue: 'Book Shops & Stationery Stores', label: `Book Shops & Stationery Stores${locSuffix}`, subtitle: 'Academic Books, Office Stationery & Art Supplies', detail: 'BOOKS & STATIONERY' },
      { baseValue: 'Wholesale Stationery Suppliers', label: `Wholesale Stationery Suppliers${locSuffix}`, subtitle: 'School, Office & Bulk Corporate Supplies', detail: 'WHOLESALE' },
      { baseValue: 'Printing & Xerox Shops', label: `Printing & Xerox Shops${locSuffix}`, subtitle: 'Spiral Binding, Photocopy & Digital Prints', detail: 'PRINTING' }
    ], 'retail');
  }
  if (family === 'retail' || /store|shop|showroom|boutique|jewel|cloth|garment|saree|footwear|shoe|supermarket|grocery|optical|gift|toy|cycle|watch|sports/i.test(norm)) {
    const baseRetail = cleanLabel.replace(/\s+(stores|store|shops|shop|showrooms|showroom|outlets|outlet)$/i, '').trim() || cleanLabel;
    return formatRows([
      { baseValue: cleanLabel, label: `${cleanLabel}${locSuffix}`, subtitle: `Verified Local ${cleanLabel} with Direct Phones`, detail: 'RETAIL & SHOPS' },
      { baseValue: `${baseRetail} Dealers & Showrooms`, label: `${baseRetail} Dealers & Showrooms${locSuffix}`, subtitle: 'Authorised Brand Outlets & Multi-Brand Stores', detail: 'SHOWROOMS' },
      { baseValue: `Wholesale ${baseRetail} Suppliers`, label: `Wholesale ${baseRetail} Suppliers${locSuffix}`, subtitle: 'Bulk Trade Pricing & Distributors', detail: 'WHOLESALE' }
    ], 'retail');
  }

  // 24. Open-Domain Universal Preservation (Works for ANY niche business on Earth!)
  return formatRows([
    { baseValue: cleanLabel, label: `${cleanLabel}${locSuffix}`, subtitle: `Verified ${cleanLabel} with Phone Numbers & Locations`, detail: 'TOP MATCH' },
    { baseValue: `${cleanLabel} Dealers & Suppliers`, label: `${cleanLabel} Dealers & Suppliers${locSuffix}`, subtitle: `Authorised Dealers, Stockists & Commercial Suppliers`, detail: 'DEALERS' },
    { baseValue: `${cleanLabel} Services`, label: `${cleanLabel} Services${locSuffix}`, subtitle: `Local Specialists & Direct Business Contacts`, detail: 'SERVICES' }
  ], family || 'generic');
}

module.exports = {
  COMMON_WORD_WHITELIST,
  TRADE_TYPOS_MAP,
  consonantSkeleton,
  levenshtein,
  correctTradeTypo,
  normalizeTradePhrase,
  isKnownServiceOrTypo,
  getUniversalRichExpansions
};
