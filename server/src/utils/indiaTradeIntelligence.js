/**
 * indiaTradeIntelligence.js
 *
 * God-Level Pan-Indian Vendor & Product Taxonomy, Activity-Aware Zonal Allocations,
 * and Smart Brand Intelligence for Local Business Extraction.
 *
 * Covers 11 Core Commercial Sectors with 80+ Specialized Subvectors, Strict Non-Vendor
 * Negative Gates (Avoids), and Spatial Activity Mapping.
 */

const { normalizePhone } = require('./phoneUtils');

const SECTORS = {
  PHOTOGRAPHY_MEDIA: {
    key: 'photography_media',
    label: 'Photography, Studios & Media',
    patterns: [
      /\b(photo|photographer|photographers|photography|photo studio|photo studios|studio|studios|videographer|videographers|videography|candid|candid photographer|wedding photography|pre wedding|pre-wedding|drone shoot|drone videography|cinematography|digital lab)\b/i
    ],
    subvectors: [
      'Wedding Photographers',
      'Photo Studios & Digital Labs',
      'Candid Wedding Photography',
      'Pre Wedding Photoshoot',
      'Drone Videographers & Cinematographers',
      'Maternity & Baby Photographers',
      'Event & Birthday Photographers',
      'Portrait & Portfolio Studios',
      'Cinematic Video Editors'
    ],
    avoids: [
      'xerox', 'photocopy', 'colour print', 'color print', 'flex printing',
      'offset press', 'digital seva', 'meeseva', 'mee seva', 'internet center',
      'photo framing', 'glass house', 'cctv', 'camera repair', 'mobile repair'
    ],
    preferredZoneTypes: ['commercial_bazaar', 'residential_belts', 'radial_corridors']
  },

  WEDDINGS_HOSPITALITY: {
    key: 'weddings_hospitality',
    label: 'Weddings, Events & Hospitality',
    patterns: [
      /\b(wedding|events?|banquet|function hall|kalyana mandapam|convention center|marriage hall|caterer|catering|decorator|stage decoration|mandap|tent house|shamiana|mehendi|bridal makeup|dj sound)\b/i
    ],
    subvectors: [
      'Banquet Halls & AC Function Halls',
      'Kalyana Mandapams & Marriage Halls',
      'Convention Centres',
      'Wedding Planners & Event Organisers',
      'Mandap & Stage Decorators',
      'Flower Decorators & Florists',
      'Wedding Caterers',
      'Bridal Makeup Artists',
      'Mehendi Artists',
      'DJ Sound & Lighting',
      'Tent House & Shamiana',
      'Wedding Invitation Printers'
    ],
    avoids: ['hotel booking', 'lodge', 'room rent', 'pg', 'dormitory'],
    preferredZoneTypes: ['radial_corridors', 'highway_belts', 'commercial_bazaar']
  },

  HEALTHCARE_DOCTORS: {
    key: 'healthcare_doctors',
    label: 'Healthcare, Hospitals & Doctors',
    patterns: [
      /\b(hospital|hospitals|clinic|clinics|doctor|doctors|dentist|dentists|dental|eye hospital|pediatric|child specialist|orthopedic|gynecologist|maternity|pathology|diagnostic|scan center|physiotherapy|dermatologist|ent)\b/i
    ],
    subvectors: [
      'Multi Speciality Hospitals',
      'Emergency & Trauma Care Hospitals',
      'Dental Clinics & Dental Hospitals',
      'Eye Hospitals & Ophthalmologists',
      'Children & Pediatric Hospitals',
      'Maternity & Gynecologists',
      'Orthopedic Hospitals',
      'Diagnostic Centers & Pathology Labs',
      'Ayurvedic & Homeopathy Clinics',
      'Dermatology & Skin Clinics',
      'ENT Clinics'
    ],
    avoids: ['pharmacy', 'medical store', 'chemist', 'druggist', 'ayurvedic store', 'optician store', 'veterinary', 'pet clinic', 'medicine shop', 'drug store'],
    preferredZoneTypes: ['healthcare_belts', 'commercial_bazaar', 'residential_belts']
  },

  PHARMACIES_DRUGSTORES: {
    key: 'pharmacies_drugstores',
    label: 'Pharmacies, Medical Stores & Drugstores',
    patterns: [
      /\b(pharmacy|pharmacies|medical store|medical stores|medical shop|medical shops|chemist|chemists|druggist|druggists|drug store|drug stores|apothecary|jan aushadhi|medicine shop|medicine store)\b/i
    ],
    subvectors: [
      '24 Hours Pharmacies',
      'Retail Medical Stores & Chemists',
      'Wholesale Medicine Distributors',
      'Surgical Equipment & Medical Devices',
      'Generic Medicine Stores (Jan Aushadhi)',
      'Ayurvedic & Herbal Medicine Shops',
      'Homeopathy Pharmacies & Dispensaries',
      'Veterinary Medicine & Pet Pharmacy'
    ],
    avoids: ['hospital', 'nursing home', 'multi speciality', 'dental clinic', 'icu', 'trauma care'],
    preferredZoneTypes: ['commercial_bazaar', 'healthcare_belts', 'residential_belts']
  },

  HOME_SERVICES_CONTRACTORS: {
    key: 'home_services_contractors',
    label: 'Home Services, Technicians & Contractors',
    patterns: [
      /\b(electrician|electricians|electrical works|plumber|plumbers|carpenter|carpenters|painter|painters|waterproofing|ac service|ac repair|ro repair|refrigerator repair|washing machine repair|packers and movers|pest control|borewell|false ceiling|fabricator)\b/i
    ],
    subvectors: [
      'Electricians & Electrical Contractors',
      'Plumbers & Sanitary Contractors',
      'Carpenters & Wood Work',
      'Painters & Waterproofing',
      'AC Repair & Servicing',
      'RO Water Purifier Repair',
      'Refrigerator & Washing Machine Repair',
      'Packers and Movers',
      'Pest Control Services',
      'Borewell Drilling & Submersibles',
      'False Ceiling & POP',
      'Glass & Aluminium Fabricators',
      'Civil Building Contractors'
    ],
    avoids: ['scrap', 'waste paper', 'kabbadi', 'second hand only', 'junk yard'],
    preferredZoneTypes: ['residential_belts', 'commercial_bazaar', 'industrial_belts']
  },

  AUTOMOTIVE_GARAGES: {
    key: 'automotive_garages',
    label: 'Automotive, Garages & Transport',
    patterns: [
      /\b(car mechanic|car service|auto repair|garage|bike service|two wheeler mechanic|car wash|detailing|wheel alignment|tyre dealer|car battery|spare parts|driving school|tours and travels|taxi service)\b/i
    ],
    subvectors: [
      'Car Mechanics & Multi-Brand Garages',
      'Car Service Centres',
      'Bike Mechanics & Two Wheeler Service',
      'Car Washing & Detailing Studios',
      'Tyre Dealers & Wheel Alignment',
      'Automobile Spare Parts Shops',
      'Car Battery Dealers',
      'Car Accessories & Fitment',
      'Driving Schools',
      'Tours & Travels, Cab Services'
    ],
    avoids: ['scrap dealer', 'junk yard', 'towing only'],
    preferredZoneTypes: ['industrial_belts', 'highway_belts', 'commercial_bazaar']
  },

  WHOLESALE_BUILDING_MATERIALS: {
    key: 'wholesale_building_materials',
    label: 'Wholesalers, Distributors & Building Materials (B2B)',
    patterns: [
      /\b(wholesaler|wholesalers|wholesale|distributor|distributors|building materials|sanitaryware|tiles|plywood|hardware|iron and steel|tmt steel|cement|paints dealer|textile wholesale|saree wholesale|grain merchant|kirana wholesale)\b/i
    ],
    subvectors: [
      'Electrical Wholesalers & Dealers',
      'Sanitaryware & Bathroom Fittings',
      'Tiles & Ceramic Showrooms',
      'Plywood & Hardware Wholesalers',
      'Iron & Steel TMT Dealers',
      'Cement Wholesalers & Stockists',
      'Paint Dealers',
      'Textile & Saree Wholesalers',
      'Grain & Kirana Wholesalers',
      'Packaging Material Manufacturers'
    ],
    avoids: ['scrap', 'waste', 'retail provision only'],
    preferredZoneTypes: ['wholesale_bazaars', 'industrial_belts', 'highway_belts']
  },

  RETAIL_LIFESTYLE: {
    key: 'retail_lifestyle',
    label: 'Retail, Showrooms & Lifestyle',
    patterns: [
      /\b(jeweller|jewellers|jewellery|gold shop|furniture|electronics showroom|home appliances|mobile shop|mobile store|opticals|eyewear|watches|footwear|gift shop)\b/i
    ],
    subvectors: [
      'Jewellery Showrooms & Gold Merchants',
      'Furniture Showrooms & Manufacturers',
      'Electronics & Home Appliances',
      'Mobile Showrooms & Mobile Repair',
      'Opticians & Eyewear Stores',
      'Watch Showrooms & Repair',
      'Footwear Showrooms',
      'Gift Shops & Stationery'
    ],
    avoids: ['pawn shop', 'old gold buying only'],
    preferredZoneTypes: ['commercial_bazaar', 'residential_belts']
  },

  PROFESSIONAL_LEGAL_FINANCE: {
    key: 'professional_legal_finance',
    label: 'Professional Services, Legal & Finance',
    patterns: [
      /\b(lawyer|lawyers|advocate|advocates|chartered accountant|ca firm|tax consultant|gst practitioner|document writer|notary|real estate agent|property dealer|architect|interior designer|digital marketing|security agency)\b/i
    ],
    subvectors: [
      'Advocates & High Court Lawyers',
      'Chartered Accountants (CA)',
      'Tax Consultants & GST Practitioners',
      'Document Writers & Notaries',
      'Real Estate Agents & Property Dealers',
      'Architects & Building Designers',
      'Interior Designers & Decorators',
      'Digital Marketing & Web Agencies',
      'Security Agencies'
    ],
    avoids: ['stamp vendor only', 'typewriter only'],
    preferredZoneTypes: ['commercial_bazaar', 'healthcare_belts']
  },

  BEAUTY_WELLNESS: {
    key: 'beauty_wellness',
    label: 'Beauty, Wellness & Fitness',
    patterns: [
      /\b(beauty parlour|ladies salon|gents salon|hair stylist|spa|massage center|gym|fitness center|yoga|tattoo studio)\b/i
    ],
    subvectors: [
      'Beauty Parlours & Ladies Salons',
      'Gents Salons & Hair Stylists',
      'Spas & Massage Centres',
      'Gyms & Fitness Centres',
      'Yoga Studios',
      'Tattoo & Piercing Studios'
    ],
    avoids: ['cosmetic wholesale only', 'chemical supplier'],
    preferredZoneTypes: ['commercial_bazaar', 'residential_belts']
  },

  FOOD_DINING: {
    key: 'food_dining',
    label: 'Food, Dining & Bakeries',
    patterns: [
      /\b(restaurant|restaurants|hotel dining|pure veg|biryani|family restaurant|cafe|coffee shop|bakery|cake shop|sweets|mithai|ice cream parlour|fast food|tiffin)\b/i
    ],
    subvectors: [
      'Restaurants & Family Dine-in',
      'Pure Veg Restaurants',
      'Biryani & Non-Veg Centers',
      'Cafes & Coffee Shops',
      'Bakeries & Cake Shops',
      'Sweet & Savoury Showrooms',
      'Ice Cream Parlours',
      'Fast Food & Tiffin Centers'
    ],
    avoids: ['raw meat shop', 'butcher', 'ration shop'],
    preferredZoneTypes: ['commercial_bazaar', 'residential_belts', 'highway_belts']
  },

  EDUCATION_COACHING: {
    key: 'education_coaching',
    label: 'Education, Coaching & Training',
    patterns: [
      /\b(school|schools|college|colleges|coaching center|iit jee coaching|neet coaching|competitive exam|computer training|spoken english|ielts|music academy|dance academy)\b/i
    ],
    subvectors: [
      'CBSE & State Board Schools',
      'Junior Colleges',
      'IIT-JEE & NEET Coaching Institutes',
      'Competitive Exam Coaching (Civil/Banking)',
      'Computer Training Institutes',
      'Spoken English & IELTS',
      'Music & Dance Academies'
    ],
    avoids: ['uniform manufacturer only', 'stationery only'],
    preferredZoneTypes: ['residential_belts', 'commercial_bazaar']
  }
};

/**
 * Detect trade sector for a given query or category string
 */
function detectTradeSector(query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return null;

  for (const sector of Object.values(SECTORS)) {
    for (const pat of sector.patterns) {
      if (pat.test(q)) {
        return sector;
      }
    }
  }
  return null;
}

/**
 * Returns subvectors for a given query
 */
function getSubvectorsForQuery(query) {
  const sector = detectTradeSector(query);
  if (sector && Array.isArray(sector.subvectors)) {
    return sector.subvectors;
  }
  return [];
}

/**
 * Returns negative avoid keywords for a query
 */
function getNegativeAvoidsForQuery(query) {
  const sector = detectTradeSector(query);
  if (sector && Array.isArray(sector.avoids)) {
    return sector.avoids;
  }
  return [];
}

/**
 * Normalizes vendor name to a clean brand core token for deduplication.
 * Removes generic noise words like photo, studio, works, enterprises, services, guntur, etc.
 */
function normalizeBrandToken(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(photo|photography|photographer|photographers|studio|studios|digital|digital studio|colour lab|color lab|creations|clickz|clicks|works|enterprises|enterprise|services|service|solutions|group|hub|center|centre|in|the|best|top|near|me|guntur|tenali|vijayawada|hyderabad|visakhapatnam|andhra|pradesh)\b/gi, ' ')
    .replace(/\s+/g, '')
    .trim();
}

// Words that describe a trade, not a business. "Catering By Grand GRT" and
// "Ghiza Family Restaurant & Arabian Mandi" share almost nothing once these
// are removed, which is exactly the point: they are different businesses.
const NAME_NOISE = new Set([
  'the', 'and', 'by', 'of', 'for', 'pvt', 'ltd', 'limited', 'private', 'llp',
  'inc', 'co', 'company', 'best', 'top', 'new', 'near', 'sri', 'shri', 'sai',
  'catering', 'catterings', 'caterers', 'caterer', 'restaurant', 'restaurants',
  'family', 'arabian', 'mandi', 'hotel', 'hotels', 'foods', 'food', 'events',
  'event', 'services', 'service', 'solutions', 'group', 'grand', 'royal',
  'centre', 'center', 'hub', 'works', 'enterprises', 'enterprise'
]);

function coreNameTokens(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 3 && !NAME_NOISE.has(token));
}

/**
 * How much two business names actually share, 0..1.
 * Uses the distinctive words only, so "Grand GRT" vs "Ghiza" scores 0.
 */
function nameSimilarity(nameA, nameB) {
  const a = new Set(coreNameTokens(nameA));
  const b = new Set(coreNameTokens(nameB));
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared++;
  return shared / Math.min(a.size, b.size);
}

// Directory switchboards that appear on hundreds of unrelated listings. A
// shared number alone must never merge two businesses; these are the ones we
// have actually seen repeated (JustDial's own Bangalore line, for example).
const SHARED_DIRECTORY_NUMBERS = new Set([
  '08062210155',
  '18602080808',
  '18001234567'
]);

function sameCity(a, b) {
  const ca = String(a.city || a.locality || '').toLowerCase().trim();
  const cb = String(b.city || b.locality || '').toLowerCase().trim();
  if (!ca || !cb) return true; // cannot judge, do not block
  return ca === cb || ca.includes(cb) || cb.includes(ca);
}

/**
 * Determines if two vendor entries are near-duplicates.
 *
 * A shared phone number is NOT enough on its own: directory sites reuse a
 * switchboard across unrelated vendors, and trusting it chain-merged 26
 * different Vijayawada caterers into one row. Phone overlap now needs name
 * evidence too.
 */
function areNearDuplicates(leadA, leadB) {
  if (!leadA || !leadB) return false;
  if (!sameCity(leadA, leadB)) return false;

  const tokenA = normalizeBrandToken(leadA.name);
  const tokenB = normalizeBrandToken(leadB.name);
  const similarity = nameSimilarity(leadA.name, leadB.name);

  // 1. Exact normalized brand token match (if at least 4 characters long)
  if (tokenA && tokenB && tokenA.length >= 4 && tokenB.length >= 4) {
    if (tokenA === tokenB) return true;
    if (tokenA.length >= 6 && tokenB.length >= 6) {
      if (tokenA.includes(tokenB) || tokenB.includes(tokenA)) return true;
    }
  }

  // 2. Shared phone, but only when the names agree that this is the same shop.
  const phonesA = (Array.isArray(leadA.phones) ? leadA.phones : [leadA.phone]).filter(Boolean);
  const phonesB = (Array.isArray(leadB.phones) ? leadB.phones : [leadB.phone]).filter(Boolean);
  for (const pa of phonesA) {
    const cleanA = String(pa).replace(/\D/g, '').slice(-10);
    if (cleanA.length !== 10 || SHARED_DIRECTORY_NUMBERS.has(cleanA)) continue;
    for (const pb of phonesB) {
      const cleanB = String(pb).replace(/\D/g, '').slice(-10);
      if (cleanB.length !== 10 || cleanA !== cleanB) continue;
      if (similarity >= 0.6) return true;
    }
  }

  return false;
}

/**
 * Consolidates two matching leads into one single enriched lead.
 * Preserves all unique phone numbers into `phones: [...]`, keeps the best rating/reviews count,
 * and preserves detailed address information.
 */
function mergeVendorLeads(primary, secondary) {
  const merged = { ...primary };

  // Consolidate and cleanly format unique phone numbers
  const rawPhones = [
    primary.phone,
    secondary.phone,
    ...(Array.isArray(primary.phones) ? primary.phones : []),
    ...(Array.isArray(secondary.phones) ? secondary.phones : [])
  ].filter(Boolean);

  const seenDigits = new Set();
  const cleanPhones = [];
  for (const p of rawPhones) {
    const parsed = normalizePhone(p);
    const key = parsed ? parsed.national : String(p).replace(/\D/g, '').slice(-10);
    if (key && key.length >= 7 && !seenDigits.has(key)) {
      seenDigits.add(key);
      cleanPhones.push(parsed ? parsed.displayPhone : p);
    }
  }

  // Sort: Mobile numbers first, STD landlines second, others last
  cleanPhones.sort((a, b) => {
    const pA = normalizePhone(a);
    const pB = normalizePhone(b);
    const scoreA = pA?.isMobile ? 3 : (pA?.isLandline ? 2 : 1);
    const scoreB = pB?.isMobile ? 3 : (pB?.isLandline ? 2 : 1);
    return scoreB - scoreA;
  });

  // A real business has a handful of lines, not dozens. Anything beyond six
  // means we were merging unrelated vendors; keep the best six and move on.
  const MAX_PHONES_PER_LEAD = 6;
  if (cleanPhones.length > MAX_PHONES_PER_LEAD) cleanPhones.length = MAX_PHONES_PER_LEAD;
  merged.phones = cleanPhones.length ? cleanPhones : (primary.phones || [primary.phone].filter(Boolean));
  merged.phone = cleanPhones[0] || primary.phone || secondary.phone || null;

  // Best reviews & rating
  const revA = Number(primary.reviewsCount || primary.reviews || 0);
  const revB = Number(secondary.reviewsCount || secondary.reviews || 0);
  if (revB > revA) {
    merged.reviewsCount = revB;
    merged.rating = secondary.rating || primary.rating;
  }

  // Longest / most descriptive address
  const addrA = String(primary.address || '');
  const addrB = String(secondary.address || '');
  if (addrB.length > addrA.length && !addrB.includes('undefined')) {
    merged.address = secondary.address;
  }

  // Preserve website / social links
  if (!merged.website && secondary.website) merged.website = secondary.website;
  if (!merged.placeId && secondary.placeId) merged.placeId = secondary.placeId;

  return merged;
}

module.exports = {
  SECTORS,
  detectTradeSector,
  getSubvectorsForQuery,
  getNegativeAvoidsForQuery,
  normalizeBrandToken,
  areNearDuplicates,
  mergeVendorLeads
};

