/**
 * shared/data/intentRules.js
 * Frontend 5-Country Differentiation Rules (Services vs. Product Stores/Malls vs. Venues vs. B2B).
 * 1:1 synced with server/src/taxonomy/intentDifferentiator.js across IN, US, GB, AU, AE.
 */

export const INTENT_META = {
  service: { key: 'service', label: 'Services & Trades', badge: 'Service', tone: 'gold', description: 'Contractors, repairs, doctors, clinics, lawyers, agencies & field trades' },
  store: { key: 'store', label: 'Product Stores & Malls', badge: 'Store / Retail', tone: 'sapphire', description: 'Retail stores, brand showrooms, supply dealers & shopping malls for specific products' },
  venue: { key: 'venue', label: 'Venues & Institutions', badge: 'Venue', tone: 'emerald', description: 'Hospitals, schools, colleges, hotels, restaurants, diagnostic labs & gyms' },
  b2b: { key: 'b2b', label: 'Wholesale & Manufacturing', badge: 'B2B / Factory', tone: 'gold', description: 'Manufacturers, wholesale distributors, stockists & industrial exporters' }
};

export const SECTOR_INTENT_MAP = {
  hospitals: 'venue', schools: 'venue', colleges: 'venue', restaurants: 'venue', hotels: 'venue', diagnostics: 'venue', fitness: 'venue',
  pharmacies: 'store', retail: 'store',
  manufacturing: 'b2b', wholesale: 'b2b',
  clinics: 'service', dental: 'service', contractors: 'service', lawyers: 'service', automotive: 'service',
  salons: 'service', real_estate: 'service', financial: 'service', it_software: 'service', logistics: 'service', events: 'service', veterinary: 'service'
};

export const PRODUCT_STORE_EXPANSIONS = [
  {
    key: 'plumbing_sanitary_products',
    label: 'Sanitaryware & Pipe Stores',
    matchRe: /\b(pvc\s*pipes?|cpvc\s*pipes?|upvc\s*pipes?|pipes?\s*(?:and|&)?\s*fittings?|sanitary\s*ware|bathroom\s*fittings?|faucets?|taps?|commode|wash\s*basin|water\s*tanks?|bath\s*tubs?|shower\s*panels?|plumbing\s*materials?)\b/i,
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
    label: 'Electrical, Cable & Lighting Stores',
    matchRe: /\b(electrical\s*goods|cables?\s*(?:and|&)?\s*wires?|switchgear|mcb|led\s*lights?|chandeliers?|inverters?|ups\s*batter(?:y|ies)|solar\s*panels?|generators?|fans?|motors?)\b/i,
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
    label: 'Hardware, Tiles & Building Material Stores',
    matchRe: /\b(ceramic\s*tiles?|vitrified\s*tiles?|tiles?|marble|granite|cement|steel\s*bars?|tmt\s*bars?|plywood|laminates?|veneer|paints?|asian\s*paints?|waterproofing\s*chemicals?|tools?|power\s*tools?|hardware)\b/i,
    byCountry: {
      IN: ['Hardware & Power Tool Stores', 'Ceramic Tiles, Marble & Granite Showrooms', 'Plywood, Timber & Laminate Dealers', 'Paint & Waterproofing Chemical Stores'],
      US: ['Hardware & Tool Stores', 'Tile, Stone & Flooring Showrooms', 'Lumber & Building Supply Yards', 'Paint & Coating Retail Stores'],
      GB: ['Builders Merchants & Hardware', 'Tile & Natural Stone Showrooms', 'Timber & Joinery Supplies', 'Paint & Decorating Centres'],
      AU: ['Hardware & Timber Yards', 'Tile & Stone Showrooms', 'Power Tool & Trade Stores', 'Paint & Waterproofing Outlets'],
      AE: ['Building Materials & Hardware Trading', 'Marble, Granite & Tile Showrooms', 'Paint & Waterproofing Stores', 'Power Tools & Fastener Shops'],
      default: ['Hardware & Power Tool Stores', 'Ceramic Tiles & Granite Showrooms', 'Plywood & Timber Dealers', 'Paint & Building Material Stores']
    }
  },
  {
    key: 'tech_appliance_products',
    label: 'Electronics, Computer & Mobile Stores',
    matchRe: /\b(laptops?|desktops?|computers?|smartphones?|mobile\s*phones?|iphones?|tablets?|televisions?|tvs?|refrigerators?|washing\s*machines?|air\s*conditioners?|home\s*appliances?|cctv\s*cameras?|printers?|cameras?)\b/i,
    byCountry: {
      IN: ['Electronics & Home Appliance Showrooms', 'Laptop, Computer & Printer Stores', 'Mobile Phone & Smartphone Shops', 'CCTV & Security System Dealers'],
      US: ['Consumer Electronics & Appliance Stores', 'Computer & Gaming PC Stores', 'Mobile Phone & Carrier Stores', 'Security Camera & Smart Home Stores'],
      GB: ['Electrical & Appliance Retailers', 'Computer & Laptop Shops', 'Mobile Phone & Tech Stores', 'CCTV & Alarm Supply Shops'],
      AU: ['Electronics & Whitegoods Stores', 'Computer & IT Retail Shops', 'Mobile Phone & Repair Stores', 'Security & CCTV Dealers'],
      AE: ['Electronics & Appliance Showrooms', 'Laptop & IT Hardware Stores', 'Smartphone & Gadget Shops', 'CCTV & Surveillance Dealers'],
      default: ['Electronics & Appliance Showrooms', 'Laptop & Computer Stores', 'Mobile Phone Shops', 'CCTV & Security Dealers']
    }
  },
  {
    key: 'home_furniture_products',
    label: 'Furniture, Mattress & Decor Showrooms',
    matchRe: /\b(furniture|sofas?|beds?|mattress(?:es)?|wardrobes?|office\s*chairs?|dining\s*tables?|carpets?|curtains?|blinds?|home\s*decor|modular\s*kitchen)\b/i,
    byCountry: {
      IN: ['Furniture & Sofa Showrooms', 'Mattress & Bedding Stores', 'Office Furniture Dealers', 'Curtains, Carpets & Home Decor Stores'],
      US: ['Furniture & Living Room Showrooms', 'Mattress & Sleep Stores', 'Office Furniture Outlets', 'Kitchen Cabinets & Home Decor Stores'],
      GB: ['Furniture & Sofa Showrooms', 'Bed & Mattress Shops', 'Fitted Kitchen & Wardrobe Showrooms', 'Curtains, Blinds & Flooring Shops'],
      AU: ['Furniture & Outdoor Living Showrooms', 'Mattress & Bedding Retailers', 'Office Furniture & Fit-out Stores', 'Blinds, Curtains & Rugs Stores'],
      AE: ['Luxury Furniture & Sofa Galleries', 'Mattress & Home Furnishings Stores', 'Office Furniture Showrooms', 'Carpets, Curtains & Decor Boutiques'],
      default: ['Furniture & Sofa Showrooms', 'Mattress & Bedding Stores', 'Office Furniture Dealers', 'Curtains & Decor Stores']
    }
  },
  {
    key: 'auto_tyre_products',
    label: 'Tyres & Auto Spare Parts Stores',
    matchRe: /\b(car\s*tyres?|tires?|alloys?|car\s*batteries?|auto\s*parts?|spare\s*parts?|car\s*accessories?|helmets?|lubricants?)\b/i,
    byCountry: {
      IN: ['Car & Bike Tyre Dealers', 'Automobile Spare Parts Shops', 'Car Accessories & Audio Stores', 'Car Battery Dealers'],
      US: ['Tire & Wheel Retailers', 'Auto Parts & Supply Stores', 'Car Audio & Truck Accessory Shops'],
      GB: ['Tyre & Alloy Wheel Retailers', 'Motor Factors & Car Parts Shops', 'Car Audio & Accessory Stores'],
      AU: ['Tyre & 4x4 Wheel Stores', 'Auto Spare Parts Stores', '4WD & Car Accessory Retailers'],
      AE: ['Tyre & Rim Showrooms', 'Auto Spare Parts Trading Shops', 'Car Accessories & Tinting Stores'],
      default: ['Car & Bike Tyre Dealers', 'Automobile Spare Parts Shops', 'Car Accessories Stores']
    }
  },
  {
    key: 'fashion_jewel_products',
    label: 'Jewellery, Fashion & Lifestyle Stores',
    matchRe: /\b(gold\s*jewel\w*|diamonds?|jewel\w*|sarees?|bridal\s*wear|clothes|apparel|garments?|shoes|footwear|sneakers?|watches?|eyewear|spectacles?|sunglasses?|cosmetics?|perfumes?|toys?|stationery|books)\b/i,
    byCountry: {
      IN: ['Jewellery & Gold Showrooms', 'Saree, Ethnic & Apparel Stores', 'Footwear & Shoe Stores', 'Optical, Eyewear & Watch Showrooms'],
      US: ['Fine Jewelry & Watch Stores', 'Apparel & Boutique Stores', 'Shoe & Sneaker Retailers', 'Optical & Eyewear Boutiques'],
      GB: ['Jewellers & Watch Boutiques', 'Clothing & Fashion Stores', 'Footwear Retailers', 'Opticians & Eyewear Shops'],
      AU: ['Jewellery & Diamond Showrooms', 'Fashion & Apparel Boutiques', 'Footwear & Surf Stores', 'Optical & Eyewear Stores'],
      AE: ['Gold Souk & Fine Jewellery Galleries', 'Luxury Fashion & Abaya Boutiques', 'Perfume, Oud & Cosmetics Stores', 'Watch & Eyewear Showrooms'],
      default: ['Jewellery & Gold Showrooms', 'Clothing & Apparel Stores', 'Footwear Stores', 'Optical & Watch Showrooms']
    }
  },
  {
    key: 'shopping_malls',
    label: 'Shopping Malls & Supermarkets',
    matchRe: /\b(shopping\s*malls?|malls?|shopping\s*cent(?:er|re)s?|department\s*stores?|hypermarkets?|supermarkets?|grocer(?:y|ies))\b/i,
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
    label: 'Pharmacies, Surgical Supply & Medical Stores',
    matchRe: /\b(medicines?|pharmaceuticals?|surgical\s*equipment|wheelchairs?|hearing\s*aids?|medical\s*devices?|medical\s*supplies?|pet\s*food)\b/i,
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

const SERVICE_RE = /\b(services?|plumbers?|plumbing|electricians?|contractors?|repairs?|maintenance|mechanics?|installers?|cleaning|pest\s*control|doctors?|dentists?|lawyers?|advocates?|solicitors?|attorneys?|accountants?|consultants?|agencies|packers|movers|salons?|spas?|borewell|pro\s*services|company\s*formation)\b/i;
const B2B_RE = /\b(wholesal\w*|distribut\w*|stockist\w*|manufactur\w*|factor(?:y|ies)|exporter\w*|importer\w*|bulk\b)\b/i;
const STORE_RE = /\b(stores?|shops?|showrooms?|dealers?|retail\w*|merchants?|malls?|supermarkets?|outlets?|boutiques?|mart\b)\b/i;

export function detectClientIntent(rawQuery = '', country = 'IN') {
  const q = String(rawQuery || '').trim();
  const low = q.toLowerCase();
  const cc = String(country || 'IN').toUpperCase();
  if (!q) return { intentType: 'service', meta: INTENT_META.service, productMatch: null };
  if (B2B_RE.test(low)) return { intentType: 'b2b', meta: INTENT_META.b2b, productMatch: null };

  for (const prod of PRODUCT_STORE_EXPANSIONS) {
    if (prod.matchRe.test(low) && !SERVICE_RE.test(low)) {
      const subs = prod.byCountry[cc] || prod.byCountry.default;
      return { intentType: 'store', meta: INTENT_META.store, productMatch: { key: prod.key, label: prod.label, subcategories: subs } };
    }
  }

  if (SERVICE_RE.test(low)) return { intentType: 'service', meta: INTENT_META.service, productMatch: null };
  if (STORE_RE.test(low)) return { intentType: 'store', meta: INTENT_META.store, productMatch: null };
  return { intentType: 'service', meta: INTENT_META.service, productMatch: null };
}
