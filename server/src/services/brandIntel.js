/**
 * brandIntel.js
 *
 * Offline brand + product understanding. No LLM call at query time.
 *
 * Purpose: a buyer may type "AMD graphic card in Hyderabad" or "Asian Paints
 * dealer Guntur". Those words are not business-category words, so the old
 * classifier dropped them into `generic` and lost the dealer/supplier intent.
 * This module detects the brand, the product and the right dealer expansions,
 * then feeds suggestions and the auto engine plan.
 */

const fs = require('fs');
const path = require('path');

const BUILTIN_BRANDS = [
  { brand: 'AMD', aliases: ['amd', 'advanced micro devices', 'radeon', 'ryzen', 'threadripper', 'amd gpu'], hints: ['computer hardware dealer', 'graphic card dealer', 'IT peripherals'], keywords: ['graphic card', 'gpu', 'processor', 'laptop', 'desktop'], models: ['RX 7900', 'RX 7800', 'RX 7600', 'RX 6900', 'Ryzen 5', 'Ryzen 7', 'Ryzen 9', 'Threadripper'] },
  { brand: 'NVIDIA', aliases: ['nvidia', 'geforce', 'rtx', 'gtx'], hints: ['graphic card dealer', 'computer hardware shop', 'gaming PC builder'], keywords: ['graphic card', 'gpu', 'laptop', 'desktop'], models: ['RTX 5090', 'RTX 5080', 'RTX 4090', 'RTX 4080', 'RTX 4070', 'RTX 4060', 'RTX 3090', 'RTX 3060', 'GTX 1650'] },
  { brand: 'Intel', aliases: ['intel', 'core i3', 'core i5', 'core i7', 'core i9'], hints: ['computer hardware dealer', 'laptop dealer', 'IT peripherals'], keywords: ['processor', 'laptop', 'desktop', 'motherboard'], models: ['Core i3', 'Core i5', 'Core i7', 'Core i9', 'i5 12400', 'i7 13700'] },
  { brand: 'ASUS', aliases: ['asus'], hints: ['laptop dealer', 'computer hardware shop', 'service centre'], keywords: ['laptop', 'graphic card', 'motherboard', 'monitor'], models: ['ROG', 'TUF', 'Vivobook', 'Zenbook'] },
  { brand: 'MSI', aliases: ['msi'], hints: ['laptop dealer', 'graphic card dealer', 'gaming PC builder'], keywords: ['laptop', 'graphic card', 'motherboard'], models: ['Katana', 'Raider', 'Pulse'] },
  { brand: 'Gigabyte', aliases: ['gigabyte'], hints: ['computer hardware dealer', 'graphic card dealer'], keywords: ['graphic card', 'motherboard'], models: ['Aorus', 'Eagle', 'Gaming OC'] },
  { brand: 'Zotac', aliases: ['zotac'], hints: ['graphic card dealer', 'computer hardware shop'], keywords: ['graphic card', 'gpu'], models: ['Twin Edge', 'AMP Extreme'] },
  { brand: 'Corsair', aliases: ['corsair'], hints: ['computer hardware dealer', 'gaming peripherals shop'], keywords: ['ram', 'cabinet', 'keyboard', 'mouse', 'psu'], models: ['Vengeance', 'RM750', 'K70'] },
  { brand: 'Logitech', aliases: ['logitech'], hints: ['computer peripherals dealer', 'electronics store'], keywords: ['keyboard', 'mouse', 'webcam', 'headset'], models: ['MX Master', 'G Pro', 'MK270'] },
  { brand: 'BenQ', aliases: ['benq'], hints: ['monitor dealer', 'projector dealer'], keywords: ['monitor', 'projector'], models: ['Mobiuz', 'Zowie', 'GV11'] },
  { brand: 'Seagate', aliases: ['seagate'], hints: ['computer hardware dealer', 'storage dealer'], keywords: ['hard disk', 'ssd', 'external drive'], models: ['Barracuda', 'IronWolf', 'Expansion'] },
  { brand: 'WD', aliases: ['western digital', 'wd'], hints: ['computer hardware dealer', 'storage dealer'], keywords: ['hard disk', 'ssd', 'external drive'], models: ['My Passport', 'Blue', 'Black'] },
  { brand: 'HP', aliases: ['hp', 'hewlett packard'], hints: ['laptop dealer', 'printer dealer', 'service centre'], keywords: ['laptop', 'printer', 'desktop', 'ink'] },
  { brand: 'Dell', aliases: ['dell'], hints: ['laptop dealer', 'computer service centre'], keywords: ['laptop', 'desktop', 'monitor'] },
  { brand: 'Lenovo', aliases: ['lenovo'], hints: ['laptop dealer', 'computer service centre'], keywords: ['laptop', 'desktop'] },
  { brand: 'Acer', aliases: ['acer'], hints: ['laptop dealer', 'computer showroom'], keywords: ['laptop', 'monitor'] },
  { brand: 'Apple', aliases: ['apple', 'iphone', 'ipad', 'macbook'], hints: ['mobile shop', 'authorised reseller', 'service centre'], keywords: ['mobile', 'laptop', 'tablet'] },
  { brand: 'Samsung', aliases: ['samsung'], hints: ['mobile shop', 'electronics showroom', 'service centre'], keywords: ['mobile', 'tv', 'refrigerator', 'washing machine'] },
  { brand: 'Xiaomi', aliases: ['xiaomi', 'mi', 'redmi'], hints: ['mobile shop', 'electronics showroom', 'service centre'], keywords: ['mobile', 'tv', 'smartwatch'] },
  { brand: 'Realme', aliases: ['realme'], hints: ['mobile shop', 'service centre'], keywords: ['mobile', 'earbuds'] },
  { brand: 'OnePlus', aliases: ['oneplus', 'one plus'], hints: ['mobile shop', 'service centre'], keywords: ['mobile', 'tv'] },
  { brand: 'Vivo', aliases: ['vivo'], hints: ['mobile shop', 'service centre'], keywords: ['mobile'] },
  { brand: 'Oppo', aliases: ['oppo'], hints: ['mobile shop', 'service centre'], keywords: ['mobile'] },
  { brand: 'iQOO', aliases: ['iqoo'], hints: ['mobile shop', 'service centre'], keywords: ['mobile'] },
  { brand: 'Nothing', aliases: ['nothing phone'], hints: ['mobile shop'], keywords: ['mobile'] },
  { brand: 'boAt', aliases: ['boat', 'boat lifestyle'], hints: ['mobile accessories shop', 'electronics store'], keywords: ['earbuds', 'headphones', 'speaker'] },
  { brand: 'Noise', aliases: ['noise'], hints: ['mobile accessories shop', 'electronics store'], keywords: ['smartwatch', 'earbuds'] },
  { brand: 'Voltas', aliases: ['voltas'], hints: ['AC dealer', 'air conditioner service centre'], keywords: ['ac', 'air conditioner', 'refrigerator'] },
  { brand: 'Blue Star', aliases: ['blue star', 'bluestar'], hints: ['AC dealer', 'commercial refrigeration dealer'], keywords: ['ac', 'refrigerator', 'water cooler'] },
  { brand: 'Daikin', aliases: ['daikin'], hints: ['AC dealer', 'air conditioner service centre'], keywords: ['ac', 'air conditioner'] },
  { brand: 'Havells', aliases: ['havells'], hints: ['electrical goods dealer', 'fan dealer', 'switchgear dealer'], keywords: ['fan', 'wire', 'switch', 'geyser'] },
  { brand: 'Crompton', aliases: ['crompton'], hints: ['fan dealer', 'pump dealer', 'lighting dealer'], keywords: ['fan', 'pump', 'light'] },
  { brand: 'Anchor', aliases: ['anchor'], hints: ['electrical goods dealer', 'switch dealer'], keywords: ['switch', 'socket', 'wire'] },
  { brand: 'Legrand', aliases: ['legrand'], hints: ['electrical goods dealer', 'switchgear dealer'], keywords: ['switch', 'socket', 'modular board'] },
  { brand: 'Bajaj', aliases: ['bajaj'], hints: ['electronics showroom', 'two wheeler dealer', 'fan dealer'], keywords: ['fan', 'mixer', 'two wheeler', 'scooter'] },
  { brand: 'Asian Paints', aliases: ['asian paints', 'asian paint'], hints: ['paint shop', 'authorised paint dealer', 'hardware store'], keywords: ['paint', 'primer', 'putty'] },
  { brand: 'Berger Paints', aliases: ['berger', 'berger paints'], hints: ['paint shop', 'authorised paint dealer'], keywords: ['paint', 'primer'] },
  { brand: 'Nerolac', aliases: ['nerolac'], hints: ['paint shop', 'authorised paint dealer'], keywords: ['paint'] },
  { brand: 'Maruti Suzuki', aliases: ['maruti', 'maruti suzuki'], hints: ['car dealer', 'car service centre', 'spare parts dealer'], keywords: ['car', 'car accessories'] },
  { brand: 'Hyundai', aliases: ['hyundai'], hints: ['car dealer', 'car service centre'], keywords: ['car'] },
  { brand: 'Tata Motors', aliases: ['tata motors', 'tata'], hints: ['car dealer', 'commercial vehicle dealer'], keywords: ['car', 'truck', 'bus'] },
  { brand: 'Mahindra', aliases: ['mahindra'], hints: ['car dealer', 'tractor dealer', 'service centre'], keywords: ['car', 'suv', 'tractor'] },
  { brand: 'Royal Enfield', aliases: ['royal enfield', 'enfield'], hints: ['two wheeler dealer', 'bike service centre'], keywords: ['bike', 'motorcycle'] },
  { brand: 'Hero', aliases: ['hero motocorp', 'hero honda'], hints: ['two wheeler dealer', 'bike service centre'], keywords: ['bike', 'scooter'] },
  { brand: 'TVS', aliases: ['tvs'], hints: ['two wheeler dealer', 'bike service centre'], keywords: ['bike', 'scooter'] },
  { brand: 'Honda', aliases: ['honda'], hints: ['two wheeler dealer', 'car dealer', 'service centre'], keywords: ['bike', 'car', 'scooter'] },
  { brand: 'Yamaha', aliases: ['yamaha'], hints: ['two wheeler dealer', 'bike service centre'], keywords: ['bike', 'scooter'] },
  { brand: 'Tata Steel', aliases: ['tata steel'], hints: ['steel dealer', 'building material supplier'], keywords: ['steel', 'tmt bar', 'pipe'] },
  { brand: 'JSW', aliases: ['jsw', 'jsw steel'], hints: ['steel dealer', 'building material supplier'], keywords: ['steel', 'tmt bar', 'sheet'] },
  { brand: 'Hindalco', aliases: ['hindalco'], hints: ['aluminium dealer', 'metal supplier'], keywords: ['aluminium', 'sheet', 'profile'] },
  { brand: 'Havells Industrial', aliases: ['havells industrial'], hints: ['industrial electrical dealer', 'switchgear dealer'], keywords: ['industrial cable', 'switchgear', 'motor'] },
  { brand: 'Bosch', aliases: ['bosch'], hints: ['power tool dealer', 'industrial equipment dealer'], keywords: ['drill', 'tool', 'spare parts'] },
  { brand: 'Kirloskar', aliases: ['kirloskar'], hints: ['pump dealer', 'industrial equipment dealer'], keywords: ['pump', 'motor', 'generator'] },
  { brand: 'Cummins', aliases: ['cummins'], hints: ['generator dealer', 'industrial equipment dealer'], keywords: ['generator', 'engine'] },
  { brand: 'Godrej', aliases: ['godrej'], hints: ['furniture store', 'lock dealer', 'appliance showroom'], keywords: ['furniture', 'lock', 'almirah', 'refrigerator'] },
  { brand: 'Reliance Digital', aliases: ['reliance digital'], hints: ['electronics showroom'], keywords: ['electronics', 'mobile', 'laptop'] },
  { brand: 'Croma', aliases: ['croma'], hints: ['electronics showroom'], keywords: ['electronics', 'mobile', 'laptop'] },
  { brand: 'Vijay Sales', aliases: ['vijay sales'], hints: ['electronics showroom'], keywords: ['electronics', 'mobile', 'laptop'] },
  { brand: 'DMart', aliases: ['dmart', 'd mart'], hints: ['supermarket'], keywords: ['grocery', 'supermarket'] },
  { brand: 'Poorvika', aliases: ['poorvika'], hints: ['mobile shop', 'electronics showroom'], keywords: ['mobile', 'laptop'] },
  { brand: 'Sangeetha Mobiles', aliases: ['sangeetha mobiles', 'sangeetha'], hints: ['mobile shop'], keywords: ['mobile'] }
];

const BUILTIN_PRODUCT_EXPANSIONS = {
  'graphic card': ['graphic card dealer', 'computer hardware shop', 'GPU supplier', 'computer peripherals dealer', 'gaming PC builder'],
  'gpu': ['graphic card dealer', 'computer hardware shop', 'GPU supplier'],
  'laptop': ['laptop dealer', 'computer hardware shop', 'laptop service centre'],
  'printer': ['printer dealer', 'printer service centre', 'ink cartridge shop'],
  'desktop': ['computer hardware shop', 'computer sales and service', 'assembled PC dealer'],
  'motherboard': ['computer hardware dealer', 'computer peripherals dealer'],
  'monitor': ['computer hardware dealer', 'computer peripherals shop'],
  'ac': ['AC dealer', 'air conditioner service centre', 'HVAC contractor'],
  'air conditioner': ['AC dealer', 'air conditioner service centre'],
  'refrigerator': ['refrigerator dealer', 'home appliance showroom', 'appliance repair service'],
  'washing machine': ['washing machine dealer', 'home appliance showroom', 'appliance repair service'],
  'water purifier': ['water purifier dealer', 'RO service centre'],
  'cctv camera': ['CCTV dealer', 'security systems dealer', 'security service'],
  'led bulb': ['electrical goods dealer', 'lighting shop', 'LED light dealer'],
  'fan': ['fan dealer', 'electrical goods dealer'],
  'wire': ['electrical goods dealer', 'cable dealer'],
  'solar panel': ['solar panel dealer', 'solar installer', 'renewable energy contractor'],
  'water pump': ['water pump dealer', 'motor dealer', 'borewell service'],
  'pump': ['pump dealer', 'motor dealer'],
  'generator': ['generator dealer', 'diesel generator service'],
  'paint': ['paint shop', 'hardware and paint store', 'authorised paint dealer'],
  'tiles': ['tile showroom', 'sanitary ware dealer', 'building material supplier'],
  'sanitary ware': ['sanitary ware dealer', 'bathroom fittings showroom', 'plumbing material supplier'],
  'furniture': ['furniture store', 'office furniture dealer', 'modular furniture dealer'],
  'cotton fabric': ['cotton fabric wholesaler', 'textile wholesaler', 'fabric supplier'],
  'fabric': ['fabric wholesaler', 'textile shop', 'garment material supplier'],
  'packaging material': ['packaging material supplier', 'corrugated box manufacturer', 'packaging wholesaler'],
  'chemical': ['chemical supplier', 'industrial chemical dealer', 'chemical distributor'],
  'machine tools': ['machine tools dealer', 'industrial equipment supplier'],
  'spare parts': ['spare parts dealer', 'automobile spare parts shop'],
  'tyre': ['tyre dealer', 'tyre service centre'],
  'mobile': ['mobile shop', 'mobile phone dealer', 'mobile service centre'],
  'tv': ['television showroom', 'electronics store'],
  'sofa': ['furniture store', 'sofa dealer'],
  'mattress': ['mattress showroom', 'furniture store']
};

/**
 * Operators can extend the dictionary without touching code:
 *   server/data/taxonomy/brands.json      [{ brand, aliases, models, categoryHints }]
 *   server/data/taxonomy/expansions.json  { "product": ["dealer phrase", ...] }
 * File entries are merged over the built-in list, so a local brand or a new
 * product phrase becomes searchable immediately.
 */
function loadTaxonomyFile(relative) {
  try {
    const file = path.join(__dirname, '../../data/taxonomy', relative);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return null;
  }
}

function normalizeBrandRecord(record) {
  if (!record || !record.brand) return null;
  return {
    brand: String(record.brand).trim(),
    aliases: Array.isArray(record.aliases) ? record.aliases.map(String) : [],
    hints: Array.isArray(record.categoryHints) ? record.categoryHints.map(String) : (Array.isArray(record.hints) ? record.hints.map(String) : []),
    keywords: Array.isArray(record.keywords) ? record.keywords.map(String) : [],
    models: Array.isArray(record.models) ? record.models.map(String) : [],
    entityRoles: Array.isArray(record.entityRoles) ? record.entityRoles.map(String) : [],
    excludeRoles: Array.isArray(record.excludeRoles) ? record.excludeRoles.map(String) : []
  };
}

const brandMap = new Map(BUILTIN_BRANDS.map(brand => [brand.brand.toLowerCase(), brand]));
for (const record of (loadTaxonomyFile('brands.json') || []).map(normalizeBrandRecord)) {
  if (!record) continue;
  const key = record.brand.toLowerCase();
  brandMap.set(key, { ...(brandMap.get(key) || {}), ...record });
}

const BRANDS = [...brandMap.values()];

const PRODUCT_EXPANSIONS = (() => {
  const overrides = loadTaxonomyFile('expansions.json');
  const merged = { ...BUILTIN_PRODUCT_EXPANSIONS };
  if (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) {
    for (const [key, value] of Object.entries(overrides)) {
      if (Array.isArray(value) && value.length) {
        merged[String(key).toLowerCase()] = value.map(String);
      }
    }
  }
  return merged;
})();

const GENERIC_ROLES = ['authorised_dealer', 'multi_brand_dealer', 'distributor', 'service_centre'];
const DEFAULT_EXCLUDE_ROLES = ['brand_office', 'corporate_hq', 'brand_store'];

// Commodity words are usually sold by wholesalers / traders / market yards,
// not by "dealers" in a showroom. This list is a hint, not a gate: any word
// outside it still gets the generic dealer/shop/supplier expansions.
const COMMODITIES = [
  'tamarind', 'turmeric', 'chilli', 'chili', 'rice', 'paddy', 'onion', 'potato',
  'cotton', 'maize', 'groundnut', 'coconut', 'copra', 'cashew', 'cardamom',
  'pepper', 'cumin', 'coriander', 'sesame', 'mustard', 'soybean', 'jaggery',
  'sugar', 'wheat', 'dal', 'pulses', 'millets', 'ragi', 'banana', 'mango',
  'vegetable', 'fruit', 'flower', 'tea', 'coffee', 'rubber', 'areca', 'betel'
];

// Words that mean the searcher wants a service, not a shop that sells goods.
// Stems (no trailing \b) so plurals work: plumbers, electricians, painters.
const SERVICE_WORDS = /\b(repair|servic|mechanic|technician|install|amc|maintenance|plumb|electric|carpent|paint(?:er|ing)|clean|pest|tutor|tuition|coach|doctor|clinic|hospital|salon|spa|photograph|cater|advocate|lawyer|consult|banquet|decorat|makeup|parlour|parlor|gym|fitness|travel|transport|logistic|packers|movers|courier|interior|architect|security|housekeep|event)/;
const REPAIR_WORDS = /\b(repair|repairs|service centre|service center|servicing|mechanic|technician)\b/;

const PRODUCT_STOPWORDS = /\b(old|new|second hand|secondhand|used|best|top|cheap|cheapest|affordable|near me|nearby|good|local|shop|shops|store|stores|dealer|dealers|supplier|suppliers|wholesaler|wholesalers|distributor|distributors|trader|traders|market|showroom|centre|center)\b/g;

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Typed-in-a-hurry spellings of the words that decide intent. Fixing these is
// what makes "tv repeir shops" behave like "tv repair shops" instead of
// silently turning into a television showroom search.
const SPELLING_FIXES = new Map([
  ['repiar', 'repair'], ['repeir', 'repair'], ['repaire', 'repair'], ['repaier', 'repair'],
  ['repait', 'repair'], ['repare', 'repair'], ['repari', 'repair'], ['repares', 'repairs'],
  ['servise', 'service'], ['servce', 'service'], ['serviece', 'service'], ['servis', 'service'],
  ['srvice', 'service'], ['servies', 'services'],
  ['delar', 'dealer'], ['dealr', 'dealer'], ['delaer', 'dealer'], ['dealar', 'dealer'],
  ['dealrs', 'dealers'], ['dealerss', 'dealers'],
  ['suppler', 'supplier'], ['supplir', 'supplier'], ['suplier', 'supplier'], ['supplierss', 'suppliers'],
  ['wholsaler', 'wholesaler'], ['wholesellor', 'wholesaler'], ['wholesaler', 'wholesaler'],
  ['showrom', 'showroom'], ['distributer', 'distributor'], ['distrubutor', 'distributor'],
  ['moble', 'mobile'], ['moblie', 'mobile'], ['mobil', 'mobile'],
  ['laptp', 'laptop'], ['labtop', 'laptop'],
  ['fridg', 'fridge'], ['refrigirator', 'refrigerator'],
  ['washin', 'washing'], ['machin', 'machine']
]);

function fixSpelling(text) {
  return String(text || '')
    .split(' ')
    .map(word => SPELLING_FIXES.get(word) || word)
    .join(' ');
}

function titleCase(value) {
  return String(value || '')
    .split(' ')
    .filter(Boolean)
    .map(word => (word.length <= 2 ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

function hasPhrase(text, phrase) {
  const needle = normalize(phrase);
  if (!needle) return false;
  return ` ${text} `.includes(` ${needle} `);
}

function detectBrand(text) {
  const norm = normalize(text);
  if (!norm) return null;
  const sorted = [...BRANDS].sort((a, b) => b.brand.length - a.brand.length);
  for (const brand of sorted) {
    const aliases = [brand.brand, ...(brand.aliases || [])];
    if (aliases.some(alias => hasPhrase(norm, alias))) return brand;
  }
  return null;
}

function detectModel(text) {
  const norm = normalize(text);
  if (!norm) return null;
  for (const brand of BRANDS) {
    for (const model of brand.models || []) {
      if (hasPhrase(norm, model) || norm.includes(normalize(model))) {
        return { brand, model };
      }
    }
  }
  return null;
}

function detectProduct(text) {
  const norm = normalize(text);
  if (!norm) return '';
  const keys = Object.keys(PRODUCT_EXPANSIONS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (hasPhrase(norm, key)) return key;
  }
  return '';
}

function productBase(text) {
  const norm = normalize(text);
  const commodity = COMMODITIES.find(word => hasPhrase(norm, word));
  if (commodity) return commodity;
  const stripped = norm
    .replace(PRODUCT_STOPWORDS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped || norm;
}

function genericExpansions(text, limit = 4) {
  const norm = normalize(text);
  if (!norm) return [];
  const base = productBase(norm);
  const pretty = titleCase(base);
  const out = [];
  const push = value => {
    if (value && !out.some(existing => normalize(existing) === normalize(value))) out.push(value);
  };

  if (REPAIR_WORDS.test(norm)) {
    const thing = titleCase(
      norm.replace(REPAIR_WORDS, ' ').replace(PRODUCT_STOPWORDS, ' ').replace(/\s+/g, ' ').trim() || base
    );
    push(`${thing} repair service`);
    push(`${thing} service centre`);
    if (/\b(tv|television|fridge|refrigerator|washing machine|ac|air conditioner|computer|laptop|mobile|phone)\b/.test(norm)) {
      push('electronics repair shop');
    }
    push(`${thing} spare parts`);
    return out.slice(0, limit);
  }

  if (COMMODITIES.some(word => hasPhrase(norm, word))) {
    push(`${pretty} wholesaler`);
    push(`${pretty} trader`);
    push(`${pretty} market`);
    push(`${pretty} supplier`);
    return out.slice(0, limit);
  }

  push(`${pretty} dealer`);
  push(`${pretty} shop`);
  push(`${pretty} supplier`);
  push(`${pretty} wholesaler`);
  return out.slice(0, limit);
}

function detect(text) {
  const norm = fixSpelling(normalize(text));
  if (!norm) {
    return { brand: null, product: '', model: null, expansions: [], roles: [], excludeRoles: [], intentKind: 'unknown' };
  }
  const brand = detectBrand(norm);
  const product = detectProduct(norm);
  const model = detectModel(norm);
  const repair = REPAIR_WORDS.test(norm);
  let expansions = [];

  if (repair) {
    expansions = genericExpansions(norm, 5);
  } else if (product) {
    expansions = (PRODUCT_EXPANSIONS[product] || []).slice(0, 5);
  } else if (brand) {
    expansions = (brand.hints || []).slice(0, 3);
  } else if (!SERVICE_WORDS.test(norm)) {
    expansions = genericExpansions(norm, 4);
  }

  const intentKind = brand && (product || model)
    ? 'brand_product'
    : brand
      ? 'brand'
      : (product || expansions.length)
        ? 'product'
        : 'unknown';

  return {
    brand: brand || null,
    product,
    model,
    expansions,
    genericProduct: !product && !brand && expansions.length ? productBase(norm) : '',
    roles: GENERIC_ROLES,
    excludeRoles: DEFAULT_EXCLUDE_ROLES,
    repair,
    intentKind
  };
}

function dealerValue(base, suffix) {
  const norm = normalize(base);
  const hasDealerWord = /(dealer|shop|store|supplier|distributor|showroom|centre|center|wholesale)/.test(norm);
  return hasDealerWord ? base : `${base} ${suffix}`;
}

/**
 * Suggestions shown above category suggestions in both apps.
 * Every row is type 'category' so existing renderers keep working; `group`
 * lets the UI split Brands / Products / Categories.
 */
function suggest(text, limit = 4) {
  const raw = String(text || '').trim();
  if (raw.length < 2) return [];
  const intent = detect(raw);
  const rows = [];
  const brand = intent.brand;
  const product = intent.product;
  const model = intent.model;
  const max = Math.max(2, limit);

  if (brand) {
    const subject = model ? `${brand.brand} ${model.model}` : (product ? `${brand.brand} ${titleCase(product)}` : brand.brand);
    rows.push({
      type: 'category',
      group: 'brand',
      value: dealerValue(subject, intent.repair ? 'service centre' : 'dealer'),
      label: intent.repair ? `${subject} service centre` : `${subject} dealer`,
      subtitle: intent.repair
        ? 'Brand service · repair and spare parts'
        : `Brand${product || model ? ' + product' : ''} · authorised dealers and distributors`,
      detail: 'BRAND',
      family: 'retail',
      familyLabel: intent.repair ? 'Brand service' : 'Brand dealers',
      intentKind: intent.intentKind
    });
  }

  if (intent.repair) {
    // The browser has already seen this service before? Use the labels the
    // directory pages returned instead of generic guesses.
    let learnedRows = [];
    if (!brand) {
      try {
        learnedRows = require('./taxonomyLearner').suggest(raw, max);
      } catch (err) {
        learnedRows = [];
      }
    }
    const variants = learnedRows.length ? [] : genericExpansions(fixSpelling(normalize(raw)), max);
    if (learnedRows.length) rows.push(...learnedRows);
    variants.forEach((variant, index) => {
      rows.push({
        type: 'category',
        group: 'product',
        value: titleCase(variant),
        label: titleCase(variant),
        subtitle: index === 0 ? 'Repair intent detected' : 'Related service phrase',
        detail: 'SERVICE',
        family: 'home-services',
        familyLabel: 'Repair & service',
        intentKind: brand ? 'brand_product' : 'local_service'
      });
    });
  } else if (isServiceQuery(raw)) {
    // Any local service the browser has already seen becomes a suggestion.
    // No hard-coded list is required: the directory labels are the source.
    let learnedRows = [];
    try {
      learnedRows = require('./taxonomyLearner').suggest(raw, max);
    } catch (err) {
      learnedRows = [];
    }
    rows.push(...learnedRows);
  } else if (product) {
    const variants = (PRODUCT_EXPANSIONS[product] || []).slice(0, max);
    variants.forEach((variant, index) => {
      rows.push({
        type: 'category',
        group: 'product',
        value: titleCase(variant),
        label: titleCase(variant),
        subtitle: index === 0 ? `Product expansion for “${product}”` : 'Related dealer / supplier phrase',
        detail: 'PRODUCT',
        family: 'generic',
        familyLabel: 'Product suppliers',
        intentKind: brand ? 'brand_product' : 'product'
      });
    });
  } else if (intent.expansions.length) {
    // Learned phrases win over generic guesses. If the engine has already run
    // this product successfully, use what actually produced vendors.
    let learnedRows = [];
    try {
      learnedRows = require('./taxonomyLearner').suggest(raw, max);
    } catch (err) {
      learnedRows = [];
    }

    if (learnedRows.length) {
      rows.push(...learnedRows);
    } else {
      // Any product the dictionary has never seen still gets a dealer/supplier
      // path. This is what lets "tamarind" or "industrial valves" work.
      intent.expansions.forEach((variant, index) => {
        rows.push({
          type: 'category',
          group: 'product',
          value: titleCase(variant),
          label: titleCase(variant),
          subtitle: index === 0
            ? `Any product is allowed · expanded from “${productBase(raw)}”`
            : 'Related dealer / supplier phrase',
          detail: 'PRODUCT',
          family: 'generic',
          familyLabel: 'Product suppliers',
          intentKind: 'product'
        });
      });
    }
  }

  // Dedupe by dispatched value before returning.
  const seen = new Set();
  return rows.filter(row => {
    const key = normalize(row.value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * The phrase the engine should actually send for a product/brand search.
 * Keeps folder naming on the operator's words, but sends the dealer phrase
 * that directories actually index.
 */
function bestSearchPhrase(intent, fallback = '') {
  if (!intent) return fallback;
  if (intent.repair) {
    if (intent.brand && intent.product) return `${intent.brand.brand} ${titleCase(intent.product)} repair service`;
    if (intent.brand) return `${intent.brand.brand} repair service`;
    if (Array.isArray(intent.expansions) && intent.expansions.length) return intent.expansions[0];
  }
  if (intent.brand && intent.model) return `${intent.brand.brand} ${intent.model.model} dealer`;
  if (intent.brand && intent.product) return `${intent.brand.brand} ${titleCase(intent.product)} dealer`;
  if (intent.brand) return `${intent.brand.brand} dealer`;
  if (Array.isArray(intent.expansions) && intent.expansions.length) return intent.expansions[0];
  return fallback;
}

/**
 * True when the phrase asks for a service or a repair rather than goods.
 * Exported so the learner can file the result under services instead of
 * product categories.
 */
function isServiceQuery(text) {
  const norm = normalize(text);
  return SERVICE_WORDS.test(norm) || REPAIR_WORDS.test(norm);
}

module.exports = {
  BRANDS,
  PRODUCT_EXPANSIONS,
  BUILTIN_BRANDS,
  BUILTIN_PRODUCT_EXPANSIONS,
  detectBrand,
  detectProduct,
  detectModel,
  detect,
  genericExpansions,
  bestSearchPhrase,
  isServiceQuery,
  suggest
};
