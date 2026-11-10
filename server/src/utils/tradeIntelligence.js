/**
 * tradeIntelligence.js
 *
 * Universal Trade & Service Typo Engine, Phonetic Skeleton Matcher,
 * and Universal Family-Aware Dynamic Expansion Catalog.
 *
 * Provides Google-grade precision and rich suggestions across ANY search:
 * - Photography, Weddings, Events
 * - Home Services, Repairs, Contractors
 * - Healthcare, Doctors, Clinics, Pharmacies
 * - Food, Restaurants, Bakeries, Catering
 * - Automotive, Garages, Showrooms, Spare Parts
 * - Beauty, Salons, Spas, Makeup
 * - Retail, Showrooms, Electronics, Jewellery
 * - Real Estate, Builders, Architects
 * - Education, Coaching, Institutes
 * - Professional Services, Lawyers, CAs, Agencies
 * - Industrial, B2B, Manufacturers, Wholesalers
 */

const TRADE_TYPOS_MAP = new Map([
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
  ['photograper', 'photographer'],
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
  ['florist', 'flower decorators'],

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
  ['biryani', 'biryani'],
  ['biriyani', 'biryani'],
  ['biryany', 'biryani'],

  // Home Services & Repair
  ['plumer', 'plumber'],
  ['plubmer', 'plumber'],
  ['plambur', 'plumber'],
  ['plambr', 'plumber'],
  ['plumbers', 'plumbers'],
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
  ['ac repair', 'ac repair'],
  ['acrepair', 'ac repair'],
  ['interier', 'interior design'],
  ['interiors', 'interior designers'],

  // Beauty, Salons & Fashion
  ['make up', 'makeup'],
  ['mekeup', 'makeup'],
  ['make-up', 'makeup'],
  ['beautician', 'beautician'],
  ['beatition', 'beautician'],
  ['beauty parlour', 'beauty parlour'],
  ['beuty parlour', 'beauty parlour'],
  ['beuty parlor', 'beauty parlour'],
  ['parlor', 'parlour'],
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
  ['taylor', 'tailor'],

  // Healthcare
  ['hospitel', 'hospital'],
  ['hosptal', 'hospital'],
  ['clinc', 'clinic'],
  ['dentel', 'dental'],
  ['medicl', 'medical'],
  ['pharmcy', 'pharmacy'],

  // Auto
  ['garag', 'garage'],
  ['garadge', 'garage'],
  ['automobil', 'automobile'],
  ['showrom', 'showroom'],
  ['tyres', 'tyre shops'],

  // Professional
  ['lawer', 'lawyer'],
  ['adovate', 'advocate'],
  ['advokat', 'advocate'],
  ['acountant', 'accountant'],
  ['priting', 'printing']
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
 * Canonical targets across all 12 industries
 */
const CANONICAL_TRADE_TARGETS = [
  'photographers', 'photographer', 'photography', 'videographers', 'videographer',
  'wedding venues', 'banquet halls', 'caterers', 'catering', 'decorators', 'decoration',
  'mandap services', 'tent house', 'bridal makeup', 'mehendi artists',
  'plumbers', 'plumber', 'electricians', 'electrician', 'carpenters', 'carpenter',
  'painters', 'painter', 'pest control', 'ac repair', 'appliance repair',
  'packers and movers', 'interior designers', 'modular kitchen', 'borewell services',
  'clinics', 'hospitals', 'dentists', 'pharmacies', 'diagnostic labs',
  'restaurants', 'cafes', 'bakeries', 'sweet shops', 'biryani',
  'salons', 'spas', 'makeup artists', 'boutiques', 'jewellers',
  'car showrooms', 'bike showrooms', 'car service', 'garages', 'tyre shops',
  'real estate agents', 'builders', 'architects', 'schools', 'coaching centres',
  'lawyers', 'advocates', 'chartered accountants', 'printing services',
  'manufacturers', 'wholesalers', 'distributors', 'hardware stores'
];

/**
 * Adaptive fuzzy trade check: returns corrected canonical trade or original token
 */
function correctTradeTypo(token) {
  if (!token || typeof token !== 'string') return token;
  const raw = token.trim().toLowerCase();
  if (raw.length < 3) return token;

  // Direct map check
  if (TRADE_TYPOS_MAP.has(raw)) {
    return TRADE_TYPOS_MAP.get(raw);
  }

  // Singular/plural check in map
  if (raw.endsWith('s') && TRADE_TYPOS_MAP.has(raw.slice(0, -1))) {
    return TRADE_TYPOS_MAP.get(raw.slice(0, -1)) + 's';
  }

  // Consonant skeleton check against known keys
  const skel = consonantSkeleton(raw);
  if (skel.length >= 3) {
    for (const [key, replacement] of TRADE_TYPOS_MAP.entries()) {
      const keySkel = consonantSkeleton(key);
      const repSkel = consonantSkeleton(replacement);
      if (skel === keySkel || skel === repSkel || levenshtein(skel, repSkel) <= (skel.length >= 6 ? 1 : 0)) {
        if (levenshtein(raw, replacement) <= (raw.length >= 8 ? 3 : 2)) {
          return replacement;
        }
      }
    }
  }

  // Levenshtein and skeleton comparison against all canonical targets
  for (const target of CANONICAL_TRADE_TARGETS) {
    const maxDist = target.length >= 10 ? 3 : (target.length >= 6 ? 2 : 1);
    if (Math.abs(raw.length - target.length) <= 3 && levenshtein(raw, target) <= maxDist) {
      return target;
    }
    if (skel.length >= 4 && levenshtein(skel, consonantSkeleton(target)) <= 1) {
      if (levenshtein(raw, target) <= 3) {
        return target;
      }
    }
  }

  return token;
}

/**
 * Normalizes all trade typos across a full query string or category fragment
 */
function normalizeTradePhrase(phrase) {
  if (!phrase || typeof phrase !== 'string') return phrase;
  const tokens = phrase.split(/\s+/).filter(Boolean);
  const corrected = tokens.map(t => correctTradeTypo(t));
  return corrected.join(' ');
}

/**
 * Checks if a query is a service or trade (even with typos)
 */
function isKnownServiceOrTypo(text) {
  if (!text) return false;
  const normalized = normalizeTradePhrase(text).toLowerCase();
  const serviceStemRegex = /(repair|servic|mechanic|technician|install|amc|maintenance|plumb|electric|carpent|paint|clean|pest|tutor|tuition|coach|doctor|clinic|hospital|salon|spa|photograph|videograph|cater|banquet|decorat|makeup|parlour|parlor|gym|fitness|travel|transport|logistic|packers|movers|interior|architect|security|event|restaurant|cafe|dhaba|bakery|hotel|mandap|auditorium|studio|cameraman|lawyer|advocate|dentist|pharmacy|garage|boutique|jeweller|biryani)/i;
  return serviceStemRegex.test(normalized) || serviceStemRegex.test(text.toLowerCase());
}

/**
 * Universal Rich Domain Expansions across all Indian services, trades and industries.
 * Generates natural, human-curated, professional suggestions for ANY search.
 * Never outputs robotic phrases like "Senior Photographers Consultants" or "Plumbers Firms".
 */
function getUniversalRichExpansions(categoryLabel, family = 'generic', location = '') {
  if (!categoryLabel) return [];
  let cleanLabel = categoryLabel.trim();
  // Strip trailing "in <location>" if already attached
  cleanLabel = cleanLabel.replace(/\s+in\s+.*$/i, '').trim();
  const locSuffix = location ? ` in ${location}` : '';
  const norm = cleanLabel.toLowerCase();

  const expansions = [];

  // 1. Photography & Videography Studios
  if (/photograph|studio|cameraman|videograph|photoshoot|candid/i.test(norm)) {
    expansions.push({ label: `Photographers${locSuffix}`, subtitle: 'Verified Professional Photographers', detail: 'VERIFIED' });
    expansions.push({ label: `Top Rated Wedding Photographers${locSuffix}`, subtitle: 'Weddings, Receptions & Matrimony Specialists', detail: 'WEDDING' });
    expansions.push({ label: `Candid Photographers${locSuffix}`, subtitle: 'Natural Candid Celebrations & Events', detail: 'CANDID' });
    expansions.push({ label: `Top Rated Photography Studios${locSuffix}`, subtitle: 'Portraits, Passport & Indoor Shoot Labs', detail: 'STUDIOS' });
    expansions.push({ label: `Product & Commercial Photographers${locSuffix}`, subtitle: 'E-commerce, Catalogue & Advertising', detail: 'COMMERCIAL' });
    expansions.push({ label: `Pre-Wedding & Drone Photographers${locSuffix}`, subtitle: 'Cinematic 4K Aerial Coverage & Outdoor Shoots', detail: 'CINEMA' });
    return expansions;
  }

  // 2. Catering & Food Services
  if (/cater/i.test(norm)) {
    expansions.push({ label: `Caterers${locSuffix}`, subtitle: 'Professional Food Catering for all Occasions', detail: 'VERIFIED' });
    expansions.push({ label: `Top Rated Wedding Caterers${locSuffix}`, subtitle: 'Grand Wedding Feasts & Reception Menus', detail: 'WEDDING' });
    expansions.push({ label: `Pure Veg Traditional Caterers${locSuffix}`, subtitle: 'Brahmin & Pure Vegetarian Traditional Menus', detail: 'PURE VEG' });
    expansions.push({ label: `Non-Veg & Biryani Caterers${locSuffix}`, subtitle: 'Authentic Hyderabadi & Mughlai Biryani Catering', detail: 'SPECIALITY' });
    expansions.push({ label: `Event & Party Food Caterers${locSuffix}`, subtitle: 'Birthdays, Anniversaries & Corporate Buffets', detail: 'BUFFET' });
    return expansions;
  }

  // 3. Venues, Marriage Halls & Mandaps
  if (/venue|hall|mandap|kalyana|banquet|convention/i.test(norm)) {
    expansions.push({ label: `Wedding Venues${locSuffix}`, subtitle: 'Marriage Halls, Lawns & Convention Centers', detail: 'VERIFIED' });
    expansions.push({ label: `AC Function Halls & Convention Centres${locSuffix}`, subtitle: 'Spacious Air-Conditioned Halls with Dining', detail: 'AC HALLS' });
    expansions.push({ label: `Kalyana Mandapams${locSuffix}`, subtitle: 'Traditional Ritual Mandapams & Choultries', detail: 'HERITAGE' });
    expansions.push({ label: `Banquet Halls for Receptions${locSuffix}`, subtitle: 'Modern Banquets for Sangeet & Receptions', detail: 'BANQUETS' });
    return expansions;
  }

  // 4. Decorators & Floral Design
  if (/decor|florist|flower|stage|balloon/i.test(norm)) {
    expansions.push({ label: `Wedding Decorators${locSuffix}`, subtitle: 'Full Venue Styling & Event Planning', detail: 'VERIFIED' });
    expansions.push({ label: `Stage & Mandap Decorators${locSuffix}`, subtitle: 'Grand Reception Stages & Floral Backdrops', detail: 'WEDDING' });
    expansions.push({ label: `Fresh Flower Decorators${locSuffix}`, subtitle: 'Temple & Traditional Floral Garland Decor', detail: 'FLORAL' });
    expansions.push({ label: `Theme & Balloon Event Decorators${locSuffix}`, subtitle: 'Birthdays, Haldi & Sangeet Theme Decors', detail: 'THEME' });
    return expansions;
  }

  // 5. Plumbing & Water Works
  if (/plumb|pipe|tap|drain/i.test(norm)) {
    expansions.push({ label: `Plumbers${locSuffix}`, subtitle: 'Doorstep Plumbing Repair & Installation', detail: 'VERIFIED' });
    expansions.push({ label: `24/7 Emergency Plumber Services${locSuffix}`, subtitle: 'Immediate Leakage & Blockage Resolution', detail: 'EMERGENCY' });
    expansions.push({ label: `Pipe Leakage & Tap Repair Plumbers${locSuffix}`, subtitle: 'Bathroom Fittings & Water Tank Work', detail: 'REPAIR' });
    expansions.push({ label: `Licensed Plumbing Contractors${locSuffix}`, subtitle: 'New House Piping & Commercial Drainage', detail: 'CONTRACTORS' });
    return expansions;
  }

  // 6. Electrical & Inverter Works
  if (/electric|wiring|inverter|mcb/i.test(norm)) {
    expansions.push({ label: `Electricians${locSuffix}`, subtitle: 'Certified Household & Commercial Electricians', detail: 'VERIFIED' });
    expansions.push({ label: `24/7 Emergency Electrician Services${locSuffix}`, subtitle: 'Short Circuits, Tripped MCB & Power Faults', detail: 'EMERGENCY' });
    expansions.push({ label: `House Wiring & Inverter Electricians${locSuffix}`, subtitle: 'Complete Home Electrical Wiring & Solar Setup', detail: 'WIRING' });
    expansions.push({ label: `Licensed Electrical Contractors${locSuffix}`, subtitle: 'Industrial & Multi-Storey Electrical Work', detail: 'CONTRACTORS' });
    return expansions;
  }

  // 7. Carpentry & Furniture
  if (/carpent|wood|furniture/i.test(norm)) {
    expansions.push({ label: `Carpenters${locSuffix}`, subtitle: 'Expert Woodwork & Furniture Artisans', detail: 'VERIFIED' });
    expansions.push({ label: `Furniture Repair & Woodwork Carpenters${locSuffix}`, subtitle: 'Door Locks, Tables & Sofa Framing Repair', detail: 'REPAIR' });
    expansions.push({ label: `Modular Kitchen & Wardrobe Carpenters${locSuffix}`, subtitle: 'Custom Plywood & Modular Storage Fittings', detail: 'INTERIOR' });
    return expansions;
  }

  // 8. Painting & Waterproofing
  if (/paint|waterproof/i.test(norm)) {
    expansions.push({ label: `Painters${locSuffix}`, subtitle: 'Interior & Exterior House Painting', detail: 'VERIFIED' });
    expansions.push({ label: `House & Wall Painting Contractors${locSuffix}`, subtitle: 'Asian Paints / Berger Certified Painters', detail: 'POPULAR' });
    expansions.push({ label: `Waterproofing & Damp Proofing Specialists${locSuffix}`, subtitle: 'Terrace & Wall Seepage Solutions', detail: 'SPECIALISTS' });
    return expansions;
  }

  // 9. AC & Appliance Repair
  if (/ac repair|air condition|refrigerator|fridge|washing machine/i.test(norm)) {
    expansions.push({ label: `AC Repair Services${locSuffix}`, subtitle: 'All Brand Air Conditioners Repair & Gas Refill', detail: 'VERIFIED' });
    expansions.push({ label: `Doorstep AC Servicing & Installation${locSuffix}`, subtitle: 'Deep Jet Cleaning & Copper Piping Fitting', detail: 'FAST DOORSTEP' });
    expansions.push({ label: `Home Appliance Repair Technicians${locSuffix}`, subtitle: 'Fridge, Washing Machine & Microwave Repairs', detail: 'APPLIANCES' });
    return expansions;
  }

  // 10. Salons, Makeup & Beauty
  if (/salon|parlour|parlor|spa|makeup|mehendi|beautician/i.test(norm)) {
    expansions.push({ label: `Salons & Beauty Parlours${locSuffix}`, subtitle: 'Haircuts, Styling & Facials', detail: 'VERIFIED' });
    expansions.push({ label: `Bridal Makeup Artists${locSuffix}`, subtitle: 'HD & Airbrush Bridal Makeovers', detail: 'BRIDAL' });
    expansions.push({ label: `Professional Mehendi Artists${locSuffix}`, subtitle: 'Arabic, Bridal & Marwari Henna Art', detail: 'MEHENDI' });
    expansions.push({ label: `Luxury Spas & Wellness Centres${locSuffix}`, subtitle: 'Ayurvedic Massage & Aroma Therapies', detail: 'WELLNESS' });
    return expansions;
  }

  // 11. Healthcare, Clinics & Doctors
  if (/clinic|doctor|hospital|dentist|pharmacy|diagnostic|lab/i.test(norm)) {
    expansions.push({ label: `Clinics & Consultation Centres${locSuffix}`, subtitle: 'Experienced Senior Doctors & Physicians', detail: 'VERIFIED' });
    expansions.push({ label: `Top Rated Multi-Speciality Hospitals${locSuffix}`, subtitle: '24/7 Emergency Care, ICU & Surgeries', detail: 'HOSPITALS' });
    expansions.push({ label: `Dentists & Dental Care Clinics${locSuffix}`, subtitle: 'Root Canals, Braces & Teeth Cleaning', detail: 'DENTAL' });
    expansions.push({ label: `24-Hour Diagnostic Labs & Scan Centres${locSuffix}`, subtitle: 'Blood Tests, X-Ray & MRI Scans', detail: 'LABS' });
    return expansions;
  }

  // 12. Restaurants & Dining
  if (/restaurant|cafe|dining|biryani|bakery|food/i.test(norm)) {
    expansions.push({ label: `Restaurants${locSuffix}`, subtitle: 'Top Rated Dine-in & Food Spots', detail: 'VERIFIED' });
    expansions.push({ label: `Top Rated Family Dining Restaurants${locSuffix}`, subtitle: 'AC Family Rooms & Multi-Cuisine Menus', detail: 'FAMILY' });
    expansions.push({ label: `Authentic Biryani & Non-Veg Spots${locSuffix}`, subtitle: 'Famous Dum Biryani & Kebabs', detail: 'POPULAR' });
    expansions.push({ label: `Pure Vegetarian Traditional Restaurants${locSuffix}`, subtitle: 'South & North Indian Pure Veg Thalis', detail: 'PURE VEG' });
    expansions.push({ label: `Bakeries, Pastries & Cake Shops${locSuffix}`, subtitle: 'Custom Birthday Cakes & Fresh Snacks', detail: 'BAKERY' });
    return expansions;
  }

  // 13. Automotive & Garages
  if (/car service|garage|automobile|bike service|mechanic|tyre/i.test(norm)) {
    expansions.push({ label: `Car Service Centres & Garages${locSuffix}`, subtitle: 'Periodic Maintenance & Engine Repairs', detail: 'VERIFIED' });
    expansions.push({ label: `Two Wheeler Bike Service Centres${locSuffix}`, subtitle: 'Motorcycle & Scooter Repairs & Tuning', detail: 'BIKE SERVICE' });
    expansions.push({ label: `Car Washing & Detailing Studios${locSuffix}`, subtitle: 'Ceramic Coating & Interior Deep Wash', detail: 'DETAILING' });
    expansions.push({ label: `Automobile Spare Parts Shops${locSuffix}`, subtitle: 'Genuine OEM Spares, Batteries & Tyres', detail: 'SPARES' });
    return expansions;
  }

  // 14. Lawyers & Legal Advisors
  if (/lawyer|advocate|legal/i.test(norm)) {
    expansions.push({ label: `Lawyers & Legal Advocates${locSuffix}`, subtitle: 'High Court & District Court Advocates', detail: 'VERIFIED' });
    expansions.push({ label: `Civil & Property Dispute Lawyers${locSuffix}`, subtitle: 'Land Documentation & Registration Law', detail: 'PROPERTY LAW' });
    expansions.push({ label: `Corporate & Business Legal Advisors${locSuffix}`, subtitle: 'Contracts, Company Law & Compliance', detail: 'CORPORATE' });
    return expansions;
  }

  // 15. Chartered Accountants & Tax Consultants
  if (/ca\b|chartered accountant|tax consultant|gst|accountant/i.test(norm)) {
    expansions.push({ label: `Chartered Accountants (CA)${locSuffix}`, subtitle: 'Audits, Financial Advisory & Compliance', detail: 'VERIFIED' });
    expansions.push({ label: `GST & Income Tax Return Consultants${locSuffix}`, subtitle: 'ITR Filing, GST Registration & Auditing', detail: 'TAX' });
    expansions.push({ label: `Company Registration & Startup Consultants${locSuffix}`, subtitle: 'Pvt Ltd & LLP Registrations', detail: 'BUSINESS' });
    return expansions;
  }

  // 16. Real Estate & Builders
  if (/real estate|property|builder|architect/i.test(norm)) {
    expansions.push({ label: `Real Estate Agents & Property Dealers${locSuffix}`, subtitle: 'Plots, Flats & Commercial Lands', detail: 'VERIFIED' });
    expansions.push({ label: `Building Contractors & Civil Engineers${locSuffix}`, subtitle: 'Home Construction & Turnkey Projects', detail: 'BUILDERS' });
    expansions.push({ label: `Architects & Interior Designers${locSuffix}`, subtitle: '3D Elevation & Modern Floor Plans', detail: 'DESIGN' });
    return expansions;
  }

  // 17. Packers & Movers
  if (/packer|mover|shifting/i.test(norm)) {
    expansions.push({ label: `Packers and Movers${locSuffix}`, subtitle: 'Safe Door-to-Door Household Relocation', detail: 'VERIFIED' });
    expansions.push({ label: `Inter-City Shifting & Vehicle Transport${locSuffix}`, subtitle: 'All-India Container Transportation', detail: 'LONG DISTANCE' });
    return expansions;
  }

  // 18. Printing & Digital Labs
  if (/print|flex|album|dtp/i.test(norm)) {
    expansions.push({ label: `Printing Services & Digital Press${locSuffix}`, subtitle: 'Visiting Cards, Brochures & Books', detail: 'VERIFIED' });
    expansions.push({ label: `Flex & Banner Printing Shops${locSuffix}`, subtitle: 'Large Format Hoardings & Standees', detail: 'OUTDOOR' });
    expansions.push({ label: `Wedding Card & Invitation Printing Press${locSuffix}`, subtitle: 'Embossed Cards & Golden Foil Prints', detail: 'INVITATIONS' });
    return expansions;
  }

  // 19. Retail & Consumer Showrooms
  if (family === 'retail' || /store|shop|showroom|boutique/i.test(norm)) {
    const baseRetail = cleanLabel.replace(/\s+(stores|store|shops|shop|showrooms|showroom|outlets|outlet)$/i, '').trim() || cleanLabel;
    expansions.push({ label: `Authorised ${baseRetail} Showrooms${locSuffix}`, subtitle: 'Official Brand Dealers with Warranty', detail: 'SHOWROOM' });
    expansions.push({ label: `Top Rated ${baseRetail} Stores${locSuffix}`, subtitle: 'Best Customer Reviews & Discounts', detail: 'TOP RATED' });
    expansions.push({ label: `Wholesale ${baseRetail} Outlets${locSuffix}`, subtitle: 'Bulk Deals & Trade Pricing', detail: 'WHOLESALE' });
    return expansions;
  }

  // 20. Industrial & Manufacturers
  if (family === 'industrial' || /manufactur|supplier|wholesal|factory/i.test(norm)) {
    expansions.push({ label: `${cleanLabel} Manufacturers${locSuffix}`, subtitle: 'Direct OEM & Factory Production', detail: 'FACTORIES' });
    expansions.push({ label: `Wholesale ${cleanLabel} Suppliers${locSuffix}`, subtitle: 'Bulk Material Distributors & Stockists', detail: 'DISTRIBUTORS' });
    return expansions;
  }

  // 21. Natural Universal Fallback for any other custom service
  expansions.push({ label: `${cleanLabel}${locSuffix}`, subtitle: `Verified Top Rated ${cleanLabel}`, detail: 'VERIFIED' });
  expansions.push({ label: `Top Rated ${cleanLabel}${locSuffix}`, subtitle: `Highest Customer Ratings in ${location || 'the Area'}`, detail: 'POPULAR' });
  expansions.push({ label: `Local ${cleanLabel} Services${locSuffix}`, subtitle: `Direct Verified Contact Numbers & Quotes`, detail: 'LOCAL' });

  return expansions.map(item => ({
    type: 'category',
    value: item.label,
    label: item.label,
    subtitle: item.subtitle,
    detail: item.detail,
    family: family || 'generic',
    familyLabel: item.detail,
    corrected: true,
    matched: cleanLabel
  }));
}

module.exports = {
  TRADE_TYPOS_MAP,
  consonantSkeleton,
  levenshtein,
  correctTradeTypo,
  normalizeTradePhrase,
  isKnownServiceOrTypo,
  getUniversalRichExpansions
};
