'use strict';

/**
 * server/src/taxonomy/intentDifferentiator.js
 * Universal Business-Model Intent Classifier across all 11 Sovereign Countries:
 * Differentiates:
 *   1. 'service' -> Trades, Contractors, Repairs, Clinics, Lawyers, Salons, Cleaners
 *   2. 'store'   -> Product Retail Stores, Brand Showrooms, Supply Shops, Pharmacies & Shopping Malls
 *                   (including automatic Bare-Product -> Related Stores resolution)
 *   3. 'venue'   -> Hospitals, Schools, Colleges, Hotels, Restaurants, Labs, Gyms
 *   4. 'b2b'     -> Wholesalers, Stockists, Distributors, Manufacturers, Factories
 */

const EXPLICIT_B2B_RE = /\b(wholesal\w*|distribut\w*|stockist\w*|manufactur\w*|factor(?:y|ies)|exporter\w*|importer\w*|supplier\w*|bulk\b|b2b|industrial\s*unit|gro[sß]handel|grossiste|usine)\b/i;
const EXPLICIT_STORE_RE = /\b(stores?|shops?|showrooms?|dealers?|retail\w*|merchants?|malls?|shopping\s*cent(?:er|re)s?|plazas?|supermarkets?|hypermarkets?|mart\b|emporium|outlets?|boutiques?|supply|supplies|warehaus|fachhandel|gesch[aä]ft|kaufhaus|einkaufszentrum|magasin|boutique|centre\s*commercial)\b/i;
const EXPLICIT_SERVICE_RE = /\b(services?|plumbers?|plumbing|electricians?|contractors?|repairs?|maintenance|mechanics?|installers?|installation|cleaning|pest\s*control|doctors?|physicians?|dentists?|surgeons?|lawyers?|advocates?|attorneys?|solicitors?|accountants?|consultants?|agencies|agency|packers|movers|salons?|parlours?|spas?|architects?|therapists?|photographers?|catering|technicians?|engineers?|klempner|elektriker|plombier|[eé]lectricien)\b/i;
const EXPLICIT_VENUE_RE = /\b(hospitals?|schools?|colleges?|universit(?:y|ies)|hotels?|resorts?|restaurants?|cafes?|diagnostics?|labs?|pathology|gyms?|fitness|banquet|klinik|krankenhaus|h[oô]pital|schule|[eé]cole)\b/i;

const SERVICE_SECTOR_KEYS = new Set(['clinics', 'dental', 'contractors', 'lawyers', 'automotive', 'salons', 'real_estate', 'financial', 'it_software', 'logistics', 'events', 'veterinary']);
const STORE_SECTOR_KEYS = new Set(['pharmacies', 'retail']);
const VENUE_SECTOR_KEYS = new Set(['hospitals', 'schools', 'colleges', 'restaurants', 'hotels', 'diagnostics', 'fitness']);
const B2B_SECTOR_KEYS = new Set(['manufacturing', 'wholesale']);

// Product keywords (when queried bare without 'repair'/'service'/'contractor') -> Related Stores / Showrooms across 11 Nations
const PRODUCT_TO_STORE_REGISTRY = [
  {
    key: 'plumbing_sanitary_products',
    matchRe: /\b(pvc\s*pipes?|cpvc\s*pipes?|upvc\s*pipes?|pipes?\s*(?:and|&)?\s*fittings?|sanitary\s*ware|bathroom\s*fittings?|faucets?|taps?|commode|wash\s*basin|water\s*tanks?|bath\s*tubs?|shower\s*panels?|plumbing\s*materials?)\b/i,
    label: 'Sanitaryware, Pipe Dealers & Plumbing Stores',
    strictFilterRe: /(sanitary|pipe|pvc|cpvc|hardware|bathroom|plumbing\s*suppl|faucet|tile|ceramic|building\s*material|store|shop|showroom|dealer|merchant)/i,
    byCountry: {
      IN: ['Plumbing Supply Stores', 'Sanitaryware & Bathroom Showrooms', 'PVC & CPVC Pipe Dealers', 'Sintex & Water Tank Dealers'],
      US: ['Plumbing Supply Stores', 'Kitchen & Bath Showrooms', 'Pipe & Valve Supply Houses', 'Faucet & Fixture Showrooms'],
      GB: ['Plumbers Merchants', 'Bathroom Showrooms', 'Pipe & Sanitary Supply Stores', 'Radiator & Boiler Parts Merchants'],
      AU: ['Plumbing Supplies & Trade Stores', 'Bathroom & Tapware Showrooms', 'PVC Pipe & Irrigation Stores'],
      AE: ['Sanitaryware & Bath Showrooms', 'Building Pipe & Valve Suppliers', 'Plumbing Material Trading Stores'],
      default: ['Plumbing Supply Stores', 'Sanitaryware & Bathroom Showrooms', 'PVC & CPVC Pipe Dealers']
    }
  },
  {
    key: 'electrical_lighting_products',
    matchRe: /\b(electrical\s*goods|cables?\s*(?:and|&)?\s*wires?|switchgear|mcb|led\s*lights?|chandeliers?|inverters?|ups\s*batter(?:y|ies)|solar\s*panels?|generators?|fans?|motors?)\b/i,
    label: 'Electrical, Lighting & Power Supply Stores',
    strictFilterRe: /(electr|light|cable|wire|switch|led|chandelier|inverter|battery|solar|generator|hardware|store|shop|showroom|dealer)/i,
    byCountry: {
      IN: ['Electrical Goods & Cable Stores', 'Lighting & Chandelier Showrooms', 'Inverter, Battery & Solar Dealers', 'Switchgear & Motor Shops'],
      US: ['Electrical Supply Houses', 'Lighting & Ceiling Fan Showrooms', 'Solar & Backup Generator Dealers', 'Wire & Conduit Supply Stores'],
      GB: ['Electrical Wholesalers & Factors', 'Lighting Showrooms', 'Solar & Battery Suppliers', 'Switchgear & Cable Merchants'],
      AU: ['Electrical Wholesalers & Trade Outlets', 'Lighting & Fan Showrooms', 'Solar & Battery Retail Dealers'],
      AE: ['Electrical & Lighting Showrooms', 'Switchgear & Cable Trading Stores', 'LED & Chandelier Galleries'],
      default: ['Electrical Goods & Cable Stores', 'Lighting & Chandelier Showrooms', 'Inverter, Battery & Solar Dealers']
    }
  },
  {
    key: 'building_hardware_products',
    matchRe: /\b(ceramic\s*tiles?|vitrified\s*tiles?|tiles?|marble|granite|cement|steel\s*bars?|tmt\s*bars?|plywood|laminates?|veneer|paints?|asian\s*paints?|waterproofing\s*chemicals?|tools?|power\s*tools?|hardware)\b/i,
    label: 'Hardware, Tiles, Plywood & Building Material Stores',
    strictFilterRe: /(hardware|tile|ceramic|marble|granite|plywood|timber|laminate|paint|cement|steel|tool|building\s*material|store|shop|showroom|dealer)/i,
    byCountry: {
      IN: ['Hardware & Power Tool Stores', 'Ceramic Tiles, Marble & Granite Showrooms', 'Plywood, Timber & Laminate Dealers', 'Paint & Waterproofing Chemical Stores'],
      US: ['Hardware & Tool Stores', 'Tile, Stone & Flooring Showrooms', 'Lumber & Building Supply Yards', 'Paint & Coating Retail Stores'],
      GB: ['Builders Merchants & Hardware', 'Tile & Natural Stone Showrooms', 'Timber & Joinery Supplies', 'Paint & Decorating Centres'],
      AU: ['Hardware & Timber Yards', 'Tile & Stone Showrooms', 'Power Tool & Trade Stores', 'Paint & Waterproofing Outlets'],
      AE: ['Building Materials & Hardware Trading', 'Marble, Granite & Tile Showrooms', 'Paint & Waterproofing Stores', 'Power Tools & Fastener Shops'],
      default: ['Hardware & Power Tool Stores', 'Ceramic Tiles, Marble & Granite Showrooms', 'Plywood, Timber & Laminate Dealers', 'Paint & Building Material Stores']
    }
  },
  {
    key: 'tech_appliance_products',
    matchRe: /\b(laptops?|desktops?|computers?|smartphones?|mobile\s*phones?|iphones?|tablets?|televisions?|tvs?|refrigerators?|washing\s*machines?|air\s*conditioners?|home\s*appliances?|cctv\s*cameras?|printers?|cameras?)\b/i,
    label: 'Electronics, Mobile, Computer & Appliance Stores',
    strictFilterRe: /(electron|computer|laptop|mobile|phone|iphone|appliance|tv|cctv|camera|printer|it\s*store|showroom|shop|store|dealer|mart)/i,
    byCountry: {
      IN: ['Electronics & Home Appliance Showrooms', 'Laptop, Computer & Printer Stores', 'Mobile Phone & Smartphone Shops', 'CCTV & Security System Dealers'],
      US: ['Consumer Electronics & Appliance Stores', 'Computer & Gaming PC Stores', 'Mobile Phone & Carrier Stores', 'Security Camera & Smart Home Stores'],
      GB: ['Electrical & Appliance Retailers', 'Computer & Laptop Shops', 'Mobile Phone & Tech Stores', 'CCTV & Alarm Supply Shops'],
      AU: ['Electronics & Whitegoods Stores', 'Computer & IT Retail Shops', 'Mobile Phone & Repair Stores', 'Security & CCTV Dealers'],
      AE: ['Electronics & Appliance Showrooms', 'Laptop & IT Hardware Stores', 'Smartphone & Gadget Shops', 'CCTV & Surveillance Dealers'],
      default: ['Electronics & Home Appliance Showrooms', 'Laptop, Computer & Printer Stores', 'Mobile Phone & Smartphone Shops', 'CCTV & Security System Dealers']
    }
  },
  {
    key: 'home_furniture_products',
    matchRe: /\b(furniture|sofas?|beds?|mattress(?:es)?|wardrobes?|office\s*chairs?|dining\s*tables?|carpets?|curtains?|blinds?|home\s*decor|modular\s*kitchen)\b/i,
    label: 'Furniture, Mattress & Home Decor Showrooms',
    strictFilterRe: /(furniture|sofa|mattress|bed|decor|furnishing|curtain|carpet|kitchen|interior|showroom|store|shop)/i,
    byCountry: {
      IN: ['Furniture & Sofa Showrooms', 'Mattress & Bedding Stores', 'Office Furniture Dealers', 'Curtains, Carpets & Home Decor Stores'],
      US: ['Furniture & Living Room Showrooms', 'Mattress & Sleep Stores', 'Office Furniture Outlets', 'Kitchen Cabinets & Home Decor Stores'],
      GB: ['Furniture & Sofa Showrooms', 'Bed & Mattress Shops', 'Fitted Kitchen & Wardrobe Showrooms', 'Curtains, Blinds & Flooring Shops'],
      AU: ['Furniture & Outdoor Living Showrooms', 'Mattress & Bedding Retailers', 'Office Furniture & Fit-out Stores', 'Blinds, Curtains & Rugs Stores'],
      AE: ['Luxury Furniture & Sofa Galleries', 'Mattress & Home Furnishings Stores', 'Office Furniture Showrooms', 'Carpets, Curtains & Decor Boutiques'],
      default: ['Furniture & Sofa Showrooms', 'Mattress & Bedding Stores', 'Office Furniture Dealers', 'Curtains, Carpets & Home Decor Stores']
    }
  },
  {
    key: 'auto_tyre_products',
    matchRe: /\b(car\s*tyres?|tires?|alloys?|car\s*batteries?|auto\s*parts?|spare\s*parts?|car\s*accessories?|helmets?|lubricants?)\b/i,
    label: 'Tyres, Auto Spare Parts & Accessory Stores',
    strictFilterRe: /(tyre|tire|wheel|auto\s*part|spare|accessor|battery|helmet|lubricant|alloy|motor|store|shop|dealer)/i,
    byCountry: {
      IN: ['Car & Bike Tyre Dealers', 'Automobile Spare Parts Shops', 'Car Accessories & Audio Stores', 'Exide & Amaron Car Battery Dealers'],
      US: ['Tire & Wheel Retailers', 'Auto Parts & Supply Stores', 'Car Audio & Truck Accessory Shops', 'Auto Battery & Oil Stores'],
      GB: ['Tyre & Alloy Wheel Retailers', 'Motor Factors & Car Parts Shops', 'Car Audio & Accessory Stores'],
      AU: ['Tyre & 4x4 Wheel Stores', 'Auto Spare Parts & Repco/Trade Stores', '4WD & Car Accessory Retailers'],
      AE: ['Tyre & Rim Showrooms', 'Auto Spare Parts Trading Shops', 'Car Accessories & Tinting Stores'],
      default: ['Car & Bike Tyre Dealers', 'Automobile Spare Parts Shops', 'Car Accessories & Audio Stores']
    }
  },
  {
    key: 'fashion_jewel_retail_products',
    matchRe: /\b(gold\s*jewel\w*|diamonds?|jewel\w*|sarees?|bridal\s*wear|clothes|apparel|garments?|shoes|footwear|sneakers?|watches?|eyewear|spectacles?|sunglasses?|cosmetics?|perfumes?|toys?|stationery|books)\b/i,
    label: 'Jewellery, Fashion, Footwear & Lifestyle Stores',
    strictFilterRe: /(jewel|gold|diamond|saree|bridal|cloth|apparel|fashion|boutique|garment|shoe|footwear|watch|optic|eyewear|spectacle|cosmetic|perfume|toy|book|stationery|store|shop|showroom|mall)/i,
    byCountry: {
      IN: ['Jewellery & Gold Showrooms', 'Saree, Ethnic & Apparel Stores', 'Footwear & Shoe Stores', 'Optical, Eyewear & Watch Showrooms'],
      US: ['Fine Jewelry & Watch Stores', 'Apparel & Boutique Stores', 'Shoe & Sneaker Retailers', 'Optical & Eyewear Boutiques'],
      GB: ['Jewellers & Watch Boutiques', 'Clothing & Fashion Stores', 'Footwear Retailers', 'Opticians & Eyewear Shops'],
      AU: ['Jewellery & Diamond Showrooms', 'Fashion & Apparel Boutiques', 'Footwear & Surf Stores', 'Optical & Eyewear Stores'],
      AE: ['Gold Souk & Fine Jewellery Galleries', 'Luxury Fashion & Abaya Boutiques', 'Perfume, Oud & Cosmetics Stores', 'Watch & Eyewear Showrooms'],
      default: ['Jewellery & Gold Showrooms', 'Clothing, Saree & Apparel Stores', 'Footwear & Shoe Stores', 'Optical, Eyewear & Watch Showrooms']
    }
  },
  {
    key: 'shopping_malls',
    matchRe: /\b(shopping\s*malls?|malls?|shopping\s*cent(?:er|re)s?|department\s*stores?|hypermarkets?|supermarkets?|grocer(?:y|ies))\b/i,
    label: 'Shopping Malls, Supermarkets & Department Stores',
    strictFilterRe: /(mall|shopping\s*cent(?:er|re)|plaza|galleria|department\s*store|hypermarket|supermarket|grocery|mart|megamart)/i,
    byCountry: {
      IN: ['Shopping Malls & Plazas', 'Hypermarkets & Supermarkets', 'Kirana & Provision Superstores', 'Department Stores'],
      US: ['Shopping Malls & Lifestyle Centers', 'Department Stores', 'Supermarkets & Grocery Chains', 'Warehouse Clubs'],
      GB: ['Shopping Centres & Arcades', 'Department Stores', 'Supermarkets & Food Halls'],
      AU: ['Shopping Centres & Plazas', 'Department Stores', 'Supermarkets & Fresh Food Markets'],
      AE: ['Mega Shopping Malls & Plazas', 'Hypermarkets & Supermarkets', 'Department & Lifestyle Stores'],
      default: ['Shopping Malls & Plazas', 'Department & Lifestyle Stores', 'Supermarkets & Hypermarkets']
    }
  },
  {
    key: 'medical_pharma_products',
    matchRe: /\b(medicines?|pharmaceuticals?|surgical\s*equipment|wheelchairs?|hearing\s*aids?|medical\s*devices?|medical\s*supplies?|pet\s*food)\b/i,
    label: 'Pharmacies, Surgical Supply & Medical Stores',
    strictFilterRe: /(pharmac|chemist|drugstore|surgical|medical\s*store|medical\s*suppl|wheelchair|hearing\s*aid|pet\s*food|pet\s*shop)/i,
    byCountry: {
      IN: ['Medical Stores & Chemists', '24/7 Pharmacies', 'Surgical & Hospital Supply Stores', 'Hearing Aid & Mobility Stores'],
      US: ['Retail Pharmacies & Drugstores', 'Medical Supply & Mobility Stores', 'Hearing Aid Centers', 'Pet Food & Supply Stores'],
      GB: ['Chemists & Community Pharmacies', 'Mobility & Medical Equipment Shops', 'Hearing Care Retailers', 'Pet Supply Stores'],
      AU: ['Chemists & Discount Pharmacies', 'Medical & Mobility Supply Stores', 'Hearing Clinics & Retailers', 'Pet Supply Superstores'],
      AE: ['Pharmacies & Medical Stores', 'Surgical & Clinic Supply Dealers', 'Optical & Hearing Aid Stores'],
      default: ['Retail Pharmacies & Medical Stores', 'Surgical & Medical Equipment Stores', 'Hearing Aid & Mobility Stores']
    }
  }
];

const NON_SERVICE_RETAIL_RE = /\b(plumbing\s*supply\s*store|bathroom\s*supply\s*store|hardware\s*(?:store|shop)|paint\s*store|tile\s*(?:store|showroom)|mirror\s*shop|electric\s*motor\s*store|electrical\s*(?:supply|goods)\s*(?:store|shop)|building\s*materials?\s*(?:store|shop)|home\s*goods\s*store|electronics\s*store|sanitary\s*ware\s*(?:store|shop|showroom|dealer)|pipe\s*(?:dealer|supplier|distributor|wholesaler|store|shop)|water\s*tank\s*(?:dealer|supplier|store|shop)|water\s*pump\s*(?:supplier|dealer)|pump\s*(?:supplier|dealer)|plymart|brand\s*store|shopping\s*mall|supermarket|hypermarket|department\s*store|retail\s*store|showroom)\b/i;

const NON_ENGLISH_STORE_RE = /(దుకాణం|సరఫరా|స్టోర్|షాప్|డీలర్|షోరూమ్|दुकान|स्टोर|हार्डवेयर|सैनिटरी|डीलर|शोरूम|सप्लायर|متجر|محل|بيع|معرض|توريد|مستلزمات\s+السباكة|أدوات\s+صحية)/;

const GENERIC_NON_SERVICE_CAT_TOKEN_RE = /\b(suppliers?|dealers?|distributors?|wholesalers?|stockists?|manufacturers?|traders?|stores?|showrooms?|malls?|supermarkets?|hypermarkets?|emporiums?|outlets?|boutiques?|marts?)\b/i;
const GENERIC_SHOP_RE = /\bshops?\b/i;
const ALLOWED_SHOP_SERVICE_CAT_RE = /\b(barber\s*shop|auto\s*(?:repair|body)\s*shop|car\s*(?:repair|body)\s*shop|motorcycle\s*repair\s*shop)\b/i;
const SERVICE_EXEMPT_KEYS = new Set(['automotive', 'salons']);
const PLUMBING_NON_SERVICE_NAME_RE = /\b(sanitary\s*(?:ware|mart|store|shop|showroom)|sanitations?|pvc\s*products|pipe\s*fittings?\s*store|water\s*tank\s*(?:dealer|supply|supplier)|bathroom\s*(?:supply|fittings?|gallery)|tiles?\s*(?:&|and)\s*sanitary|hardware\s*(?:&|and)\s*sanitary|paints?\s*(?:&|and)\s*(?:pipe|sanitary|hardware)|colourideas|plymart|brand\s*store|tools\s*on\s*rent)\b/i;

function getLocalizedStoreSubs(entry, countryCode = 'IN') {
  const cc = String(countryCode || 'IN').toUpperCase();
  const map = entry.byCountry || {};
  return map[cc] || map.default || [];
}

function detectIntentAndProduct(rawQuery = '', countryCode = 'IN') {
  const q = String(rawQuery || '').trim();
  const lower = q.toLowerCase();
  const cc = String(countryCode || 'IN').toUpperCase();

  if (EXPLICIT_B2B_RE.test(lower)) {
    return { intentType: 'b2b', businessModelLabel: 'Wholesale & Manufacturing', isProductQuery: false, matchedProduct: null };
  }

  for (const prod of PRODUCT_TO_STORE_REGISTRY) {
    if (prod.matchRe.test(lower) && !EXPLICIT_SERVICE_RE.test(lower)) {
      return {
        intentType: 'store',
        businessModelLabel: 'Product Store / Showroom',
        isProductQuery: true,
        matchedProduct: { ...prod, subvectors: getLocalizedStoreSubs(prod, cc) }
      };
    }
  }

  if (EXPLICIT_SERVICE_RE.test(lower)) {
    return { intentType: 'service', businessModelLabel: 'Service & Trades', isProductQuery: false, matchedProduct: null };
  }
  if (EXPLICIT_STORE_RE.test(lower)) {
    return { intentType: 'store', businessModelLabel: 'Store, Showroom & Mall', isProductQuery: false, matchedProduct: null };
  }
  if (EXPLICIT_VENUE_RE.test(lower)) {
    return { intentType: 'venue', businessModelLabel: 'Venues & Institutions', isProductQuery: false, matchedProduct: null };
  }
  return { intentType: 'service', businessModelLabel: 'Service & Businesses', isProductQuery: false, matchedProduct: null };
}

function resolveIntentForUmbrellaKey(key) {
  if (B2B_SECTOR_KEYS.has(key)) return 'b2b';
  if (STORE_SECTOR_KEYS.has(key)) return 'store';
  if (VENUE_SECTOR_KEYS.has(key)) return 'venue';
  if (SERVICE_SECTOR_KEYS.has(key)) return 'service';
  return 'service';
}

function isServiceStoreMismatch(lead, specificity) {
  if (!lead || specificity?.intentType !== 'service') return false;
  const cat = String(lead.category || '').trim();
  const name = String(lead.name || '').trim();
  const sub = String(lead.subcategory || '').trim();
  const combined = `${cat} ${name} ${sub}`;
  // Reject explicit retail stores/showrooms/malls when searching purely for a Service
  if (cat && (NON_SERVICE_RETAIL_RE.test(cat) || NON_ENGLISH_STORE_RE.test(cat))) return true;
  if (/\b(plymart|brand\s*store|sanitary\s*showroom|shopping\s*mall|supermarket|hypermarket)\b/i.test(name)) return true;

  if (!SERVICE_EXEMPT_KEYS.has(specificity.key)) {
    if (cat && GENERIC_NON_SERVICE_CAT_TOKEN_RE.test(cat)) {
      const hasExplicitTradeService = /\b(contractors?|installers?|repairs?|maintenance|cleaning)\b/i.test(cat);
      if (!hasExplicitTradeService || specificity.key === 'plumbing_trades') return true;
    }
    if (cat && GENERIC_SHOP_RE.test(cat) && !ALLOWED_SHOP_SERVICE_CAT_RE.test(cat)) {
      return true;
    }
  }

  if (specificity.key === 'plumbing_trades') {
    if (/\b(bathroom\s*(?:supply|fitting|accessory)|plumbing\s*supply|pipe\s*(?:dealer|supplier|trader|wholesaler)|sanitary\s*(?:ware|store|shop|mart|dealer)|water\s*tank\s*(?:dealer|supplier)|water\s*pump\s*(?:supplier|dealer)|pump\s*(?:supplier|dealer))\b/i.test(combined)) {
      return true;
    }
    if (PLUMBING_NON_SERVICE_NAME_RE.test(name) && !/\b(plumb\w*|drain\w*|septic|leak\w*)\b/i.test(cat)) {
      return true;
    }
  }
  return false;
}

function shouldRejectByCrossDomain(lead, nameWithoutLandmark, specificity) {
  if (!specificity?.rejectRe) return false;
  const rawName = String(lead?.name || '').trim();
  const rawCat = String(lead?.category || '').trim();
  const rejectTarget = `${rawName} ${rawCat}`.toLowerCase();
  if (!specificity.rejectRe.test(rejectTarget)) return false;

  // Never relax store/retail/supplier rejection on service queries
  if (isServiceStoreMismatch(lead, specificity)) return true;

  if (specificity.intentType === 'service' && specificity.strictFilterRe) {
    const hardIncompatibleCatRe = /\b(hospital|clinic|dental|dentist|optician|school|college|university|restaurant|hotel|beauty\s*salon|barber|lawyer|attorney|real\s*estate|apartment\s*(?:building|complex)|housing\s*society|public\s*bathroom|public\s*toilet|restroom)\b/i;
    if (rawCat && hardIncompatibleCatRe.test(rawCat)) return true;

    // 1. Authentic category matches target service (e.g. "Plumber" or "Plumbers, Grouting Contractors" with "Apartment" in name)
    if (rawCat && specificity.strictFilterRe.test(rawCat)) {
      return false;
    }

    // 2. Multi-trade residential contractor whose business name explicitly advertises the searched service (e.g. "Arun electrician & plumber works")
    const tradeCompanionCatRe = /\b(electrician|electrical\s*installation|handyman|custom\s*home\s*builder|contractor|carpenter|painter|tile\s*contractor|masonry|maintenance|plumber|plumbing|waterproofing|roofing|hvac|air\s*conditioning|cleaning)\b/i;
    if (specificity.strictFilterRe.test(nameWithoutLandmark || rawName) && (!rawCat || tradeCompanionCatRe.test(rawCat))) {
      return false;
    }
  }

  return true;
}

module.exports = {
  PRODUCT_TO_STORE_REGISTRY,
  NON_SERVICE_RETAIL_RE,
  detectIntentAndProduct,
  resolveIntentForUmbrellaKey,
  isServiceStoreMismatch,
  shouldRejectByCrossDomain
};
