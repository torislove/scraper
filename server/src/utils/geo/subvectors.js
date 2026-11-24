/**
 * subvectors.js
 * Category sub-vectors and dynamic long-tail subvector zone generator.
 */

const indiaTradeIntelligence = require('../indiaTradeIntelligence');
const { ZONE_COORDINATES } = require('./coordinates');

// ── CATEGORY SUB-VECTORS ──
// Google's Maps list is capped at ~20 places per query ("limited view").
// Coordinate cells alone keep returning the same top-20, so the honest way to
// reach the long tail is to ask the *same city* for its real sub-categories:
// a city with 40 restaurants for dinner has separate biryani, veg, dhaba,
// bakery, cafe and military-hotel clusters. These are search vectors, not
// invented businesses — every lead still comes from Google.
const CATEGORY_SUBVECTORS = [
  // 1. Manufacturers, Industrial Units, Factories & Fabrication
  {
    match: /manufactur|factory|factories|industrial|fabricat|oem|production|plant|mill|processing unit|packaging|machinery|foundry/i,
    labels: [
      'Industrial equipment manufacturer', 'Fabrication works', 'OEM parts manufacturer',
      'Machinery manufacturer', 'Plastic products manufacturer', 'Chemical manufacturing plant',
      'Packaging material manufacturer', 'Steel fabrication workshop', 'Food processing unit',
      'Electrical goods manufacturer', 'Industrial estate factory units', 'Warehouse and industrial supplier',
      'Pipes and fittings manufacturer', 'Corrugated box manufacturer', 'Textile mill'
    ]
  },
  // 2. Computer Stores, Laptops, IT Hardware, PC Builders & Laptop Repair (Strictly zero CCTV)
  {
    match: /\b(computer|computers|laptop|laptops|desktop|pc|gaming pc|macbook|pc builder|computer hardware|computer accessories)\b/i,
    exclude: /\b(cctv|surveillance|security|biometric|dvr|nvr|camera|dslr)\b/i,
    labels: [
      'Laptop showroom', 'Computer hardware shop', 'Desktop PC builder', 'Computer repair and service',
      'Laptop screen and motherboard repair', 'Refurbished laptop store', 'Computer accessories and peripherals',
      'Gaming PC builder', 'Computer AMC service provider', 'Networking equipment supplier',
      'Printer dealer and cartridge refill'
    ]
  },
  // 2a. CCTV, Security Systems & Surveillance (Strictly Isolated from Computer Stores)
  {
    match: /\b(cctv|surveillance|security camera|security systems|biometric|dvr|nvr|access control|video door phone)\b/i,
    labels: [
      'CCTV camera dealer', 'CCTV installation and wiring', 'Security surveillance systems',
      'Hikvision and CP Plus dealer', 'IP camera and wireless security', 'DVR and NVR setup and networking',
      'Biometric attendance systems', 'Access control and smart locks', 'CCTV repair and AMC service'
    ]
  },
  // 2b. Mobile Phones, Smartphones, Tablets & Mobile Repair
  {
    match: /\b(mobile|mobiles|smartphone|smartphones|iphone|cellphone|phone shop|phone store|phone repair|mobile repair)\b/i,
    exclude: /\b(automobile|mobility)\b/i,
    labels: [
      'Mobile phone showroom', 'Multi-brand smartphone store', 'Mobile phone repair center',
      'Mobile accessories and back covers', 'Second hand and refurbished mobile phones',
      'iPhone repair and service center'
    ]
  },
  // 2b. Camera & DSLR Shops, Lenses, Repair & Photography Gear (Distinct from CCTV & Photo Studios)
  {
    match: /\b(camera|cameras|camra|dslr|mirrorless|camera lens|photography gear|gimbal)\b/i,
    exclude: /\b(cctv|surveillance|security|biometric|dvr|nvr)\b/i,
    labels: [
      'Camera showroom', 'DSLR camera dealer', 'Canon camera store', 'Nikon camera shop',
      'Sony Alpha camera dealer', 'Camera lens and accessories store', 'Camera and lens repair center',
      'Second hand DSLR camera shop', 'Drone and gimbal store', 'Studio lighting and tripod dealer'
    ]
  },
  // 3. Photography, Studios, Videography & Digital Labs
  {
    match: /\b(photo|photographer|photographers|photography|photo studio|photo studios|studio|studios|videographer|videographers|videography|candid|digital lab|shoot)\b/i,
    labels: [
      'Wedding photographer', 'Photo studio', 'Digital photo lab', 'Candid wedding photography',
      'Pre wedding photoshoot', 'Newborn baby photographer', 'Just born baby photoshoot',
      'Maternity photoshoot studio', 'Birthday and event photographer', 'Drone videography and cinematography',
      'Cinematographer and video editor', 'Portrait studio', 'Passport photo studio',
      'Photo frame and album maker', 'Commercial photographer', 'Baby portfolio studio'
    ]
  },
  // 4. Venues, Mandaps, Function Halls, Banquets & Catering
  {
    match: /wedding|mandap|decorator|catering|banquet|function hall|marriage hall|convention|kalyana mandapam/i,
    labels: [
      'Convention centre', 'Function hall', 'Marriage hall', 'Kalyana mandapam',
      'AC banquet hall', 'Open party lawn', 'Wedding caterers', 'Outdoor catering service',
      'Veg catering service', 'Non veg catering', 'Brahmin catering service', 'Wedding decorator',
      'Mandap decoration', 'Stage decoration', 'Flower decorator', 'DJ sound and lighting',
      'Wedding planner', 'Event management company'
    ]
  },
  // 5. Food, Dining, Restaurants & Cafes
  {
    match: /restaurant|restaurent|dhaba|biryani|eatery|food court|dining|meals|mess|cafe|bakery|fast food/i,
    labels: [
      'Biryani restaurant', 'Veg restaurant', 'Non veg restaurant', 'Family restaurant',
      'Dhaba', 'Cafe', 'Bakery', 'Fast food', 'Chinese restaurant', 'South Indian restaurant',
      'North Indian restaurant', 'Bar and restaurant', 'Ice cream parlour', 'Pizza',
      'Military hotel', 'Meals mess', 'Grill and BBQ', 'Seafood restaurant', 'Sweets shop'
    ]
  },
  // 5-dental. Dentists, Dental Clinics & Orthodontic Centers (Strictly Dental & Teeth)
  {
    match: /\b(dentist|dentists|dental|teeth|tooth|orthodont|orthodontist|root\s*canal|dental\s*clinic|dental\s*hospital|dental\s*hospitals|implant\s*cent(?:er|re))\b/i,
    labels: [
      'Dental clinic', 'Dental hospital and implant centre', 'Orthodontic teeth clinic',
      'Root canal treatment centre', 'Cosmetic dentistry and smile studio', 'Dental care and oral surgery'
    ]
  },
  // 6a. Hospitals, Emergency Care & Nursing Homes (Strictly In-Patient, Trauma & Surgery)
  {
    match: /\b(hospital|hospitals|nursing home|nursing homes|trauma cent(?:er|re)|emergency care|icu|maternity home|healthcare center)\b/i,
    exclude: /\b(dental|dentist|teeth|tooth|orthodont|eye|veterinary|animal)\b/i,
    labels: [
      'Multispeciality hospital', 'Emergency and trauma care hospital', 'Children and pediatric hospital',
      'Maternity hospital and gynaec care', 'Eye hospital', 'Orthopaedic and fracture hospital',
      'Cardiology hospital', 'Super speciality hospital', 'Surgical nursing home', 'Cancer hospital'
    ]
  },
  // 6b. Pharmacies, Medical Stores, Chemists & Drug Stores (Medicines & Surgical Supplies)
  {
    match: /\b(pharmacy|pharmacies|medical store|medical stores|medical shop|medical shops|chemist|chemists|druggist|druggists|drug store|drug stores|apothecary|jan aushadhi|medicine shop|medicine store)\b/i,
    labels: [
      '24 hours pharmacy', 'Medical store and chemist', 'Retail pharmacy shop',
      'Wholesale medicine distributor', 'Surgical equipment supplier', 'Generic medicine store (Jan Aushadhi)',
      'Ayurvedic pharmacy and medical store', 'Homeopathy medical store', 'Veterinary pharmacy'
    ]
  },
  // 6c. Doctors, Clinics & Specialist Practitioners (Outpatient Consultations)
  {
    match: /\b(clinic|clinics|doctor|doctors|physician|eye care|ophthalmologist|orthopedic|pediatrician|gynecologist|dermatologist|ent clinic|physiotherapy)\b/i,
    exclude: /\b(dental|dentist|teeth|tooth|orthodont)\b/i,
    labels: [
      'General physician clinic', 'Skin and dermatology clinic',
      'Pediatrician child clinic', 'Gynaecologist clinic', 'ENT specialist clinic',
      'Orthopedic consultation clinic', 'Physiotherapy centre', 'Eye care and optometry clinic',
      'Ayurvedic and homeopathic clinic'
    ]
  },
  // 6d. Diagnostics, Scan Centers & Pathology Labs
  {
    match: /\b(diagnostic|diagnostics|pathology|blood test|scan cent(?:er|re)|mri|ct scan|x ray|ultrasound|laboratory|path lab)\b/i,
    labels: [
      'Diagnostic centre', 'Pathology and blood testing lab', 'MRI and CT scan centre',
      'Ultrasound and X-ray clinic', 'Thyroid and clinical lab', 'Full body health checkup centre'
    ]
  },
  // 6e. Photography, Studios, Cinematography & Media
  {
    match: /\b(photo|photographer|photographers|photography|photo\s*studio|photo\s*studios|studio|studios|videographer|videographers|videography|candid|candid\s*photographer|wedding\s*photography|pre\s*wedding|drone\s*shoot|drone\s*videography|cinematography|digital\s*lab)\b/i,
    exclude: /\b(xerox|photocopy|cctv|hospital|clinic|doctor|pharmacy)\b/i,
    labels: [
      'Wedding and candid photographers', 'Professional photo studio', 'Pre wedding photoshoot',
      'Drone videography and cinematography', 'Baby and kids photoshoot', 'Event and birthday photographers',
      'Passport size photo and digital lab', 'Cinematic video editing and albums', 'Commercial product photographer'
    ]
  },
  // 7. Salons, Spas, Makeup & Beauty
  {
    match: /salon|beauty|spa|parlour|parlor|hair|makeup/i,
    labels: [
      'Beauty parlour', 'Unisex salon', 'Bridal makeup artist', 'Mehendi artist',
      'Hair spa and styling salon', 'Nail art studio', 'Massage and wellness spa',
      'Men grooming salon', 'Ladies beauty parlour', 'Skin and laser treatment clinic'
    ]
  },
  // 8. Building Materials, Hardware & Construction
  {
    match: /tiles?|cement|steel|hardware|paint|building material|sanitary|plywood|timber|glass|aluminium/i,
    labels: [
      'Building material supplier', 'Hardware and tools shop', 'Tiles and granite showroom',
      'Sanitaryware shop', 'Plywood and laminates', 'TMT steel and cement dealer',
      'Paints and hardware store', 'Electrical goods and wiring', 'Glass and aluminium works',
      'Bathroom fittings dealer', 'Modular kitchen hardware', 'PVC pipe dealer'
    ]
  },
  // 8b. Shopping Malls, Commercial Centers & Retail Plazas
  {
    match: /\b(mall|malls|shopping mall|shopping malls|shopping cent(?:er|re)|commercial complex|retail plaza|hypermarket)\b/i,
    labels: [
      'Shopping mall', 'Commercial shopping complex', 'Central retail mall',
      'Multiplex and shopping mall', 'Hypermarket and departmental mall',
      'Retail plaza and fashion center', 'Food court and entertainment mall',
      'Commercial business arcade'
    ]
  },
  // 8c. Agriculture, Spices & Agro Commodities
  {
    match: /\b(turmeric|haldi|pasupu|spices?|masala|chilli|chillies|mirchi|cotton|ginning|rice\s*mill|paddy|grain|grains|pulses?|dal\s*mill|oil\s*mill|groundnut|jaggery|bellam|tobacco|agro\s*commodit|agricultural|apmc|mandi|krishi|fertilizer|seeds?|pesticide|grain\s*merchant|produce\s*merchant|dry\s*fruits?|cashew|cardamom|pepper|coriander|cumin|jeera|oilseeds?|cold\s*storage)\b/i,
    exclude: /\b(saree|textile|cloth|steel|iron|cement|tiles|sanitary|hospital|clinic|doctor|pharmacy|hotel|lodge|restaurant|barber|salon|parlour)\b/i,
    labels: [
      'Agricultural commodity traders', 'Spices wholesalers and commission agents',
      'Grain and pulse wholesale merchants', 'Rice mills and paddy processors',
      'Mandi merchants and APMC yard stockists', 'Cold storage and agro warehouse'
    ]
  },
  // 9a. Textiles, Sarees, Handlooms & Apparel
  {
    match: /\b(saree|sari|sarees|handloom|handlooms|textile|textiles|fabric|fabrics|cloth|clothes|clothing|garment|garments|spinning\s*mill|weaving|silk|cotton\s*cloth|readymade|apparel|hosiery|tailor|boutique)\b/i,
    exclude: /\b(turmeric|spices|chilli|grain|steel|iron|cement|tiles|sanitary|hospital|clinic)\b/i,
    labels: [
      'Saree showroom', 'Handloom sarees and silk', 'Textile wholesaler',
      'Readymade garments wholesale', 'Fabric and cloth merchants', 'Boutique and designer studio'
    ]
  },
  // 9b. Footwear & Shoes Showrooms
  {
    match: /\b(footwear|shoes\s*wholesale|shoe\s*showroom|leather\s*shoes|chappal|sandals)\b/i,
    exclude: /\b(turmeric|spices|steel|saree|hospital|clinic)\b/i,
    labels: [
      'Footwear showroom', 'Wholesale shoe dealer', 'Leather footwear store',
      'Sports shoe and sneaker store'
    ]
  },
  // 9c. Furniture, Woodwork & Mattresses
  {
    match: /\b(furniture|wooden\s*furniture|sofas?|mattresses?|office\s*furniture|wardrobes?)\b/i,
    exclude: /\b(turmeric|spices|steel|saree|hospital|clinic)\b/i,
    labels: [
      'Furniture showroom', 'Wooden furniture manufacturer', 'Sofa and interior furniture store',
      'Mattress and sleep studio', 'Office furniture supplier'
    ]
  },
  // 9d. Jewellery, Gold & Diamonds
  {
    match: /\b(jeweller|jewellers|jewellery|gold\s*shop|gold\s*merchant|bullion|diamond\s*jewell?ery)\b/i,
    exclude: /\b(turmeric|steel|saree|cement|clinic)\b/i,
    labels: [
      'Jewellery showroom', 'Gold merchants and bullion', 'Diamond jewellery store',
      'Silver ornaments and articles'
    ]
  },
  // 9e. Pure Wholesale & Distribution (General, when no specific retail industry matches)
  {
    match: /\b(wholesaler|wholesale\s*market|wholesale\s*dealer|distributor|bulk\s*supplier|c&f\s*agent|stockist)\b/i,
    exclude: /\b(turmeric|spices|chilli|cotton|grain|rice|dal|saree|garment|cloth|furniture|footwear|jewell|cctv|computer|doctor|clinic|hotel|restaurant|tiles|cement|steel)\b/i,
    labels: [
      'Wholesale market', 'Wholesale dealer', 'Authorized distributor', 'Bulk supplier and stockist'
    ]
  },
  // 10. Education, Coaching, Institutes & Academies
  {
    match: /school|college|coaching|tuition|institute|academy|training/i,
    labels: [
      'School', 'High school', 'College', 'IIT JEE NEET coaching', 'Competitive exam coaching',
      'Spoken English and IELTS institute', 'Computer software training institute', 'Tuition centre',
      'Play school and daycare', 'Music academy', 'Dance academy'
    ]
  },
  // 11. Fitness, Gym & Sports
  {
    match: /gym|fitness|yoga|sports|swimming/i,
    labels: [
      'Gym and fitness centre', 'Yoga studio', 'Crossfit gym', 'Ladies gym',
      'Swimming pool', 'Sports academy', 'Badminton court', 'Cricket coaching academy'
    ]
  },
  // 12. Real Estate, Builders & Properties
  {
    match: /real estate|property|builder|flat|apartment|land|plot/i,
    labels: [
      'Real estate agent', 'Property dealer', 'Builder and developer', 'Apartment project',
      'Open plots and layouts', 'Villa project', 'Rental flats', 'Commercial property', 'Land surveyor'
    ]
  },
  // 13. Automobiles, Vehicles, Spares & Servicing
  {
    match: /car|bike|automobile|vehicle|tyre|spare parts|service centre|service center/i,
    labels: [
      'Car repair workshop', 'Bike service centre', 'Car showroom', 'Bike showroom',
      'Tyre shop and wheel alignment', 'Auto spare parts shop', 'Car accessories', 'Car wash and detailing',
      'Car battery dealer', 'Car AC repair', 'Driving school'
    ]
  },
  // 14. Home Maintenance, Plumbing, Electrical & Repair
  {
    match: /plumber|electrician|carpenter|painter|pest control|cleaning|packers|movers|appliance|ac repair/i,
    labels: [
      'Plumbing contractor', 'Electrician and house wiring', 'Carpenter and woodwork',
      'Painter and whitewashing', 'AC repair and servicing', 'Home appliance repair',
      'Deep cleaning service', 'Pest control service', 'Packers and movers', 'RO water purifier service'
    ]
  },
  // 15. Legal, Financial & Corporate Services
  {
    match: /lawyer|advocate|legal|chartered accountant|ca |tax|consultant/i,
    labels: [
      'Lawyer', 'Advocate and legal counsel', 'Chartered accountant', 'Tax consultant', 'GST consultant',
      'Company registration consultant', 'Notary advocate', 'Legal advisor and firm'
    ]
  },
  // 16. Logistics, Travel, Printing & General Services
  {
    match: /service|repair|install|maintenance|security|transport|courier|travel|tour|insurance|finance|printing|xerox|laundry|tailor|agency/i,
    labels: [
      'Courier service', 'Transport and logistics service', 'Travel agency and tours',
      'Security services', 'Printing press and digital printing', 'Insurance agency',
      'Laundry and dry cleaners', 'Tailor and boutique', 'Installation and repair service'
    ]
  }
];

// Generic last-resort vectors that work for any category. They surface the
// long tail (wholesale, 24-hour, service, famous) that a single ranked list
// hides behind the top-20 cap.
const GENERIC_SUBVECTORS = [
  'best', 'famous', 'near railway station', 'near bus stand',
  'near main road', '24 hours', 'wholesale', 'service centre'
];

const INTERNATIONAL_GENERIC_SUBVECTORS = [
  'best', 'top rated', 'downtown', 'commercial core',
  'central', '24 hours', 'specialists', 'services'
];

function normalizeCategoryKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function buildCategorySubVectorZones(category, cityLabel, limit = 32, countryCode = 'IN') {
  const cat = String(category || '').replace(/\s+/g, ' ').trim();
  if (!cat) return [];
  const city = String(cityLabel || '').replace(/,\s*$/, '').trim();
  if (!city) return [];

  const tradeVectors = indiaTradeIntelligence.getSubvectorsForQuery(cat, countryCode);
  let labels = [];

  if (Array.isArray(tradeVectors) && tradeVectors.length > 0) {
    // Exact trade intelligence subvectors have highest priority and absolute domain purity
    labels = [...tradeVectors];
  } else {
    const family = CATEGORY_SUBVECTORS.find(entry => entry.match.test(cat) && (!entry.exclude || !entry.exclude.test(cat)));
    labels = family ? [...family.labels] : [];
  }

  // Cross-Industry Negative Gate: Strictly drop any label matching negative avoid keywords
  const sectorAvoids = indiaTradeIntelligence.getNegativeAvoidsForQuery(cat, countryCode);
  if (Array.isArray(sectorAvoids) && sectorAvoids.length > 0) {
    labels = labels.filter(lbl => {
      const lower = lbl.toLowerCase();
      return !sectorAvoids.some(avoid => lower.includes(avoid.toLowerCase()));
    });
  }

  const catKey = normalizeCategoryKey(cat);

  // Add generic modifiers only when they do not dilute or contradict the sector intent
  const isAgroOrCommodity = /\b(turmeric|haldi|pasupu|spices?|masala|chilli|cotton|grain|paddy|rice|dal|oilseed|tobacco|jaggery)\b/i.test(cat);
  const isIntl = String(countryCode || 'IN').toUpperCase() !== 'IN';
  const activeGenericPool = isIntl ? INTERNATIONAL_GENERIC_SUBVECTORS : GENERIC_SUBVECTORS;
  const generic = (tradeVectors.length > 0 || isAgroOrCommodity)
    ? [] // When we have authoritative trade vectors or commodities, keep 100% pure focus
    : activeGenericPool
        .filter(mod => {
          if (/wholesale|service centre/.test(mod)) return /shop|dealer|store|repair|computer|mobile|car|bike|electronics/i.test(catKey);
          return true;
        })
        .map(mod => (mod === 'best' || mod === 'famous' || mod === 'top rated') ? `${mod} ${cat}` : `${cat} ${mod}`);

  const seen = new Set();
  const zones = [];
  const base = ZONE_COORDINATES[String(city).toLowerCase().trim()] || null;
  for (const label of [...labels, ...generic]) {
    const key = label.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    zones.push({
      zoneName: `${city} · ${label}`,
      queryText: `${label} in ${city}`,
      lat: base ? base.lat : null,
      lng: base ? base.lng : null,
      engines: ['local_finder', 'maps'],
      coverageKind: 'vector',
      precisionLevel: 'category_vector',
      radiusKm: 6.0,
      isVectorQuery: true,
      isSingle: false
    });
    if (zones.length >= limit) break;
  }
  return zones;
}


module.exports = {
  CATEGORY_SUBVECTORS,
  GENERIC_SUBVECTORS,
  INTERNATIONAL_GENERIC_SUBVECTORS,
  normalizeCategoryKey,
  buildCategorySubVectorZones
};
