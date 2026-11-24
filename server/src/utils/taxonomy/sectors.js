/**
 * sectors.js
 * Comprehensive 18 Commercial Industry Sectors with patterns, subvectors, and avoids.
 */

const { extractSpecificCommodity } = require('./commodities');

const SECTORS = {
  AGRICULTURE_SPICES_COMMODITIES: {
    key: 'agriculture_spices',
    label: 'Agriculture, Spices & Agro Commodities',
    patterns: [
      /\b(turmeric|haldi|pasupu|spices?|masala|chilli|chillies|mirchi|raw\s*cotton|cotton\s*(?:ginning|pressing|seed|bale|farming|raw|mandi|market\s*yard|spinning|mill)|ginning|kapas|rice\s*mill|paddy|grain|grains|pulses?|dal\s*mill|oil\s*mill|groundnut|jaggery|bellam|tobacco|agro\s*commodit|agricultural|apmc|mandi|krishi|fertilizer|seeds?|pesticide|grain\s*merchant|produce\s*merchant|dry\s*fruits?|cashew|cardamom|pepper|coriander|cumin|jeera|oilseeds?|cold\s*storage|spice\s*dealer|spice\s*merchant|spice\s*wholesal)\b/i
    ],
    subvectors: [
      'Turmeric Wholesalers & Commission Agents',
      'Turmeric Processing & Polishing Units',
      'Spices Wholesalers & Exporters',
      'Agricultural Commodity Traders & Mandi Merchants',
      'Grain & Pulse Wholesale Merchants',
      'Rice Mills & Paddy Processors',
      'Cold Storage & Agro Stockists',
      'Chilli & Spices Commission Agents'
    ],
    avoids: [
      'iron and steel', 'iron & steel', 'steel', 'tmt', 'railing', 'tiles', 'sanitaryware', 'plumber',
      'saree', 'textile', 'handloom', 'dress material', 'readymade', 'electrical',
      'electricals', 'appliances', 'electronics', 'furniture', 'hardware and tools',
      'hotel', 'lodge', 'function hall', 'kalyana mandapam', 'cement', 'glass house',
      'hospital', 'clinic', 'dentist', 'car repair', 'garage', 'auto works',
      'photo studio', 'barber', 'beauty parlour', 'salon', 'spa', 'vox ceiling',
      'metal store', 'metal house', 'spares', 'textiles', 'marbles', 'granites'
    ],
    preferredZoneTypes: ['wholesale_bazaars', 'industrial_belts', 'highway_belts']
  },

  TEXTILES_HANDLOOM_APPAREL: {
    key: 'textiles_apparel',
    label: 'Textiles, Sarees, Handlooms & Apparel',
    patterns: [
      /\b(saree|sari|sarees|handloom|handlooms|textile|textiles|fabric|fabrics|cloth|clothes|clothing|garment|garments|spinning\s*mill|weaving|silk|cotton\s*cloth|cotton\s*knitwear|cotton\s*garments?|cotton\s*apparel|knitwear|hosiery|readymade|apparel|tailor|boutique)\b/i
    ],
    subvectors: [
      'Saree Wholesalers & Showrooms',
      'Handloom Sarees & Silk Merchants',
      'Textile Wholesalers & Commission Agents',
      'Readymade Garments & Wholesale Apparel',
      'Fabric & Cloth Merchants',
      'Boutiques & Designer Studios'
    ],
    avoids: [
      'turmeric', 'spices', 'chilli', 'grain', 'cement', 'steel', 'iron', 'tmt',
      'tiles', 'sanitaryware', 'hardware', 'hospital', 'clinic', 'pharmacy',
      'hotel', 'lodge', 'electrical', 'plumber', 'auto repair', 'seeds', 'fertilizer'
    ],
    preferredZoneTypes: ['commercial_bazaar', 'wholesale_bazaars', 'residential_belts']
  },

  METALS_MINING_STEEL: {
    key: 'metals_steel',
    label: 'Iron, Steel, Metals & TMT Dealers',
    patterns: [
      /\b(iron\s*and\s*steel|iron\s*&\s*steel|tmt\s*steel|tmt\s*bars?|steel\s*dealer|steel\s*trader|structural\s*steel|metal\s*store|sheet\s*metal|pipes\s*and\s*tubes|foundry|casting|metal\s*fabricat|scrap\s*metal)\b/i
    ],
    subvectors: [
      'Iron & Steel TMT Dealers',
      'Structural Steel & Pipe Wholesalers',
      'Metal Stores & Sheets',
      'Steel Railing & Fabrication Works',
      'Industrial Metal Suppliers'
    ],
    avoids: [
      'turmeric', 'spices', 'chilli', 'grain', 'saree', 'textile', 'clothing',
      'pharmacy', 'hospital', 'clinic', 'hotel', 'restaurant', 'photo studio',
      'sweet shop', 'bakery', 'dentist', 'jeweller'
    ],
    preferredZoneTypes: ['industrial_belts', 'wholesale_bazaars', 'highway_belts']
  },

  BUILDING_MATERIALS_CERAMICS: {
    key: 'building_materials',
    label: 'Building Materials, Tiles, Cement & Sanitaryware',
    patterns: [
      /\b(building\s*materials?|cement\s*(?:dealer|stockist|wholesale)|sanitaryware|tiles?\s*(?:showroom|dealer|wholesale)|granite|marble|vitrified|plywood\s*(?:wholesale|dealer)|timber|hardware\s*(?:wholesale|store|shop)|bathroom\s*fittings)\b/i
    ],
    subvectors: [
      'Building Material Wholesalers',
      'Sanitaryware & Bathroom Fittings Wholesalers',
      'Tiles & Ceramic Wholesalers',
      'Plywood & Hardware Wholesalers',
      'Granite & Marble Showrooms',
      'Cement Wholesalers & Stockists',
      'Paints & Waterproofing Stores'
    ],
    avoids: [
      'turmeric', 'spices', 'chilli', 'grain', 'saree', 'clothing', 'textile',
      'hospital', 'clinic', 'pharmacy', 'hotel', 'restaurant', 'dentist'
    ],
    preferredZoneTypes: ['wholesale_bazaars', 'industrial_belts', 'highway_belts']
  },

  ELECTRICAL_GOODS_SWITCHGEAR: {
    key: 'electrical_goods',
    label: 'Electrical Goods, Lighting, Cables & Switchgear',
    patterns: [
      /\b(electrical|electricals|electric|electronics|switchgear|cables?\s*and\s*wires?|industrial\s*lighting|electrical\s*panel|transformers?|fans\s*and\s*switches|electrical\s*wholesal|electrical\s*goods|electrical\s*store)\b/i
    ],
    subvectors: [
      'Electrical Goods Wholesalers',
      'Cables, Wires & Switchgear Distributors',
      'Industrial Electrical Suppliers',
      'LED Lighting & Commercial Fixtures',
      'Electrical Panels & Transformers'
    ],
    avoids: [
      'turmeric', 'spices', 'chilli', 'grain', 'saree', 'textile', 'clothing',
      'hospital', 'clinic', 'dentist', 'hotel', 'plumbing only'
    ],
    preferredZoneTypes: ['commercial_bazaar', 'wholesale_bazaars', 'industrial_belts']
  },

  ELECTRONICS_IT_SURVEILLANCE: {
    key: 'technology_computers',
    label: 'Computers, Laptops, IT Hardware & Electronics',
    patterns: [
      /\b(computer\s*shop|computer\s*store|computer\s*hardware|laptop\s*shop|laptop\s*repair|desktop\s*pc|gaming\s*pc|pc\s*builder|it\s*hardware|networking\s*equipment)\b/i
    ],
    subvectors: [
      'Laptop Showrooms & Authorised Dealers',
      'Computer Hardware & Motherboard Repair',
      'Desktop PC Builders & Gaming Rigs',
      'Computer Peripherals & Networking Suppliers',
      'Refurbished Laptops & PC Stores'
    ],
    avoids: [
      'cctv', 'surveillance', 'security camera', 'biometric', 'dvr', 'nvr',
      'saree', 'textile', 'clothing', 'turmeric', 'spices', 'steel', 'tiles',
      'hospital', 'clinic', 'plumber', 'dentist', 'spa', 'salon'
    ],
    preferredZoneTypes: ['commercial_bazaar', 'residential_belts']
  },

  SURVEILLANCE_CCTV: {
    key: 'surveillance_cctv',
    label: 'CCTV Surveillance & Security Systems',
    patterns: [
      /\b(cctv|surveillance|security\s*cameras?|dvr|nvr|access\s*control|video\s*door\s*phone|biometric\s*attendance)\b/i
    ],
    subvectors: [
      'CCTV Camera Dealers & Wholesalers',
      'CCTV Installation & Maintenance Services',
      'Biometric Access Control Systems',
      'Commercial Security Surveillance Solutions'
    ],
    avoids: [
      'pure laptop shop', 'computer repair only', 'wedding', 'saree', 'steel',
      'turmeric', 'dentist', 'spa', 'salon'
    ],
    preferredZoneTypes: ['commercial_bazaar', 'industrial_belts']
  },

  CHEMICALS_POLYMERS_PACKAGING: {
    key: 'chemicals_packaging',
    label: 'Industrial Chemicals, Polymers & Packaging',
    patterns: [
      /\b(industrial\s*chemicals?|polymers?|packaging\s*materials?|corrugated\s*box|plastic\s*products?|rotomoulding|hdpe|pp\s*woven|bubble\s*wrap)\b/i
    ],
    subvectors: [
      'Industrial Chemical Wholesalers & Distributors',
      'Corrugated Box Manufacturers & Suppliers',
      'Packaging Material Wholesalers',
      'Plastic & Polymer Raw Material Dealers'
    ],
    avoids: ['saree', 'textile', 'jewellery', 'gold', 'hotel', 'hospital', 'turmeric'],
    preferredZoneTypes: ['industrial_belts', 'highway_belts']
  },

  INDUSTRIAL_MACHINERY_TOOLS: {
    key: 'industrial_machinery',
    label: 'Industrial Machinery, Tools & Equipment',
    patterns: [
      /\b(industrial\s*equipment|machinery|lathe|cnc|bearings|industrial\s*pumps?|electric\s*motor|valves|compressors|tooling|foundry|cutting\s*tools)\b/i
    ],
    subvectors: [
      'Industrial Machinery & Tools Wholesalers',
      'Industrial Pumps & Electric Motors Dealers',
      'Bearings & Power Transmission Suppliers',
      'CNC & Machine Tool Dealers',
      'Hydraulic & Pneumatic Equipment'
    ],
    avoids: ['saree', 'textile', 'jewellery', 'hotel', 'hospital', 'salon', 'turmeric', 'spices'],
    preferredZoneTypes: ['industrial_belts', 'highway_belts']
  },

  PHOTOGRAPHY_MEDIA: {
    key: 'photography_media',
    label: 'Photography, Studios & Media',
    patterns: [
      /\b(photo|photographer|photographers|photography|photo\s*studio|photo\s*studios|studio|studios|videographer|videographers|videography|candid|candid\s*photographer|wedding\s*photography|pre\s*wedding|drone\s*shoot|drone\s*videography|cinematography|digital\s*lab)\b/i
    ],
    subvectors: [
      'Wedding Photographers',
      'Candid Wedding Photography',
      'Pre Wedding Photoshoot',
      'Just Born & Newborn Baby Photoshoots',
      'Maternity & Baby Shower Photographers',
      'Drone Videographers & Cinematographers',
      'Photo Studios & Digital Labs',
      'Event & Birthday Photographers',
      'Commercial & Product Photography',
      'Portrait & Fashion Portfolio Studios',
      'Cinematic Video Editors'
    ],
    avoids: [
      'xerox', 'photocopy', 'colour print', 'color print', 'flex printing',
      'offset press', 'digital seva', 'meeseva', 'mee seva', 'internet center',
      'photo framing', 'glass house', 'cctv', 'camera repair', 'mobile repair',
      'steel', 'turmeric', 'cement', 'tiles'
    ],
    preferredZoneTypes: ['commercial_bazaar', 'residential_belts', 'radial_corridors']
  },

  WEDDINGS_HOSPITALITY: {
    key: 'weddings_hospitality',
    label: 'Weddings, Venues, Decor & Catering',
    patterns: [
      /\b(wedding|events?|banquet|function\s*hall|kalyana\s*mandapam|convention\s*center|marriage\s*hall|caterer|catering|decorator|stage\s*decoration|mandap|tent\s*house|shamiana|mehendi|bridal\s*makeup|dj\s*sound)\b/i
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
    avoids: [
      'hotel booking', 'lodge', 'room rent', 'pg', 'dormitory', 'steel', 'cement',
      'turmeric', 'chilli', 'hardware', 'tiles', 'sanitaryware', 'clinic'
    ],
    preferredZoneTypes: ['radial_corridors', 'highway_belts', 'commercial_bazaar']
  },

  HEALTHCARE_DOCTORS: {
    key: 'healthcare_doctors',
    label: 'Healthcare, Hospitals & Doctors',
    patterns: [
      /\b(hospital|hospitals|clinic|clinics|doctor|doctors|eye\s*hospital|pediatric|child\s*specialist|orthopedic|gynecologist|maternity|pathology|diagnostic|scan\s*center|physiotherapy|dermatologist|ent)\b/i
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
    avoids: [
      'pharmacy', 'medical store', 'chemist', 'druggist', 'ayurvedic store',
      'optician store', 'veterinary', 'pet clinic', 'medicine shop', 'drug store',
      'steel', 'turmeric', 'saree', 'cement', 'tiles'
    ],
    preferredZoneTypes: ['healthcare_belts', 'commercial_bazaar', 'residential_belts']
  },

  PHARMACIES_DRUGSTORES: {
    key: 'pharmacies_drugstores',
    label: 'Pharmacies, Medical Stores & Drugstores',
    patterns: [
      /\b(pharmacy|pharmacies|medical\s*store|medical\s*stores|medical\s*shop|medical\s*shops|chemist|chemists|druggist|druggists|drug\s*store|drug\s*stores|jan\s*aushadhi|medicine\s*shop|medicine\s*store)\b/i
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
    avoids: ['hospital', 'nursing home', 'multi speciality', 'dental clinic', 'icu', 'trauma care', 'steel', 'saree', 'turmeric'],
    preferredZoneTypes: ['commercial_bazaar', 'healthcare_belts', 'residential_belts']
  },

  HOME_SERVICES_CONTRACTORS: {
    key: 'home_services_contractors',
    label: 'Home Services, Technicians & Contractors',
    patterns: [
      /\b(electrician|electricians|electrical\s*works|plumber|plumbers|carpenter|carpenters|painter|painters|waterproofing|ac\s*service|ac\s*repair|ro\s*repair|refrigerator\s*repair|washing\s*machine\s*repair|packers\s*and\s*movers|pest\s*control|borewell|false\s*ceiling|fabricator)\b/i
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
    avoids: ['scrap', 'waste paper', 'kabbadi', 'second hand only', 'junk yard', 'turmeric', 'saree', 'jewelry'],
    preferredZoneTypes: ['residential_belts', 'commercial_bazaar', 'industrial_belts']
  },

  AUTOMOTIVE_GARAGES: {
    key: 'automotive_garages',
    label: 'Automotive, Garages & Transport',
    patterns: [
      /\b(car\s*mechanic|car\s*service|auto\s*repair|garage|bike\s*service|two\s*wheeler\s*mechanic|car\s*wash|detailing|wheel\s*alignment|tyre\s*dealer|car\s*battery|spare\s*parts|driving\s*school|tours\s*and\s*travels|taxi\s*service)\b/i
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
    avoids: ['scrap dealer', 'junk yard', 'towing only', 'turmeric', 'saree', 'dentist', 'clinic'],
    preferredZoneTypes: ['industrial_belts', 'highway_belts', 'commercial_bazaar']
  },

  FOOD_DINING: {
    key: 'food_dining',
    label: 'Food, Dining & Restaurants',
    patterns: [
      /\b(restaurant|restaurants|hotel\s*dining|pure\s*veg|biryani|family\s*restaurant|cafe|coffee\s*shop|sweets|mithai|fast\s*food|tiffin|dhaba|mess|meals|food\s*court)\b/i
    ],
    subvectors: [
      'Family Multi-Cuisine Dine-in Restaurants',
      'Hyderabadi Dum Biryani & Arabian Mandi Houses',
      'Pure Vegetarian & Traditional Thali Dining',
      'Cafes, Coffee Shops & Hangout Lounges',
      'South Indian Tiffin & Breakfast Centers',
      'Barbecue, Grills & Rooftop Dining Restaurants',
      'Fast Food, Chaat & Evening Snacks Centers',
      'Chinese, Continental & Fine Dining Restaurants'
    ],
    avoids: ['bakery', 'cake shop', 'pastry shop', 'raw meat shop', 'butcher', 'ration shop', 'steel', 'cement', 'turmeric commodity', 'saree'],
    preferredZoneTypes: ['commercial_bazaar', 'residential_belts', 'highway_belts']
  },

  BAKERIES_CONFECTIONERY: {
    key: 'bakeries_confectionery',
    label: 'Bakeries, Cake Shops & Confectioneries',
    patterns: [
      /\b(bakery|bakeries|cake\s*shop|cake\s*shops|pastry\s*shop|pastry\s*shops|confectionery|confectioneries|custom\s*cakes?|birthday\s*cakes?|eggless\s*cakes?|patisserie|bakers)\b/i
    ],
    subvectors: [
      'Live Cake Studios & Custom Birthday Cake Bakers',
      'Designer Fondant & Wedding Cake Studios',
      'Pastry, Dessert & French Patisserie Shops',
      'Artisan Fresh Bread & Sourdough Bakeries',
      '100% Eggless & Vegan Specialty Bakeries',
      'Traditional Biscuit & Cookie Manufacturers / Rusk Wholesalers',
      'Sweet, Mithai & Savory Confectioneries',
      'Cafe & Bakery Lounges'
    ],
    avoids: ['biryani', 'chicken', 'mutton', 'restaurant dining', 'bar and restaurant', 'meat shop', 'function hall', 'steel', 'cement'],
    preferredZoneTypes: ['commercial_bazaar', 'residential_belts']
  },

  HOSPITALITY_HOTELS: {
    key: 'hospitality_hotels',
    label: 'Hotels, Lodging & Travel',
    patterns: [
      /\b(hotel|hotels|resort|resorts|lodge|lodges|guest\s*house|homestay|travel\s*agency|tour\s*operator)\b/i
    ],
    subvectors: [
      'Hotels & Luxury Stays',
      'Budget Lodges & Guest Houses',
      'Resorts & Weekend Getaways',
      'Travel Agencies & Tour Operators'
    ],
    avoids: ['steel', 'turmeric', 'spices', 'tiles', 'sarees', 'hardware'],
    preferredZoneTypes: ['commercial_bazaar', 'highway_belts', 'radial_corridors']
  },

  JEWELRY_GEMS: {
    key: 'jewelry_gems',
    label: 'Jewellery, Gold, Diamonds & Silver',
    patterns: [
      /\b(jeweller|jewellers|jewellery|gold\s*shop|gold\s*merchant|bullion|diamond\s*jewell?ery|silver\s*jewell?ery)\b/i
    ],
    subvectors: [
      'Jewellery Showrooms & Gold Merchants',
      'Gold & Diamond Jewellers',
      'Silver Jewellery & Ornaments',
      'Bullion Dealers & Certified Gold'
    ],
    avoids: ['pawn shop', 'old gold buying only', 'steel', 'turmeric', 'cement'],
    preferredZoneTypes: ['commercial_bazaar', 'residential_belts']
  },

  FURNITURE_WOODWORK: {
    key: 'furniture_woodwork',
    label: 'Furniture, Woodwork & Home Decor',
    patterns: [
      /\b(furniture|wooden\s*furniture|sofas?|mattresses?|office\s*furniture|wardrobes?|dining\s*tables?)\b/i
    ],
    subvectors: [
      'Furniture Showrooms & Manufacturers',
      'Wooden Furniture & Sofa Makers',
      'Office Furniture Suppliers',
      'Mattress & Home Furnishing Stores'
    ],
    avoids: ['turmeric', 'spices', 'steel tmt', 'saree', 'clinic', 'dentist'],
    preferredZoneTypes: ['commercial_bazaar', 'industrial_belts']
  },

  FOOTWEAR_LEATHER: {
    key: 'footwear_leather',
    label: 'Footwear & Leather Goods',
    patterns: [
      /\b(footwear|shoes\s*wholesale|shoe\s*showroom|leather\s*shoes|chappal|sandals)\b/i
    ],
    subvectors: [
      'Footwear Wholesalers & Distributors',
      'Shoe Showrooms & Retailers',
      'Sports Shoes & Leather Footwear Stores'
    ],
    avoids: ['turmeric', 'spices', 'steel', 'cement', 'clinic', 'hospital'],
    preferredZoneTypes: ['commercial_bazaar', 'residential_belts']
  },

  PROFESSIONAL_LEGAL_FINANCE: {
    key: 'professional_legal_finance',
    label: 'Professional Services, Legal & Finance',
    patterns: [
      /\b(lawyer|lawyers|advocate|advocates|chartered\s*accountant|ca\s*firm|tax\s*consultant|gst\s*practitioner|document\s*writer|notary|real\s*estate\s*agent|property\s*dealer|architect|interior\s*designer|digital\s*marketing|security\s*agency)\b/i
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
    avoids: ['stamp vendor only', 'typewriter only', 'turmeric', 'steel', 'saree'],
    preferredZoneTypes: ['commercial_bazaar', 'healthcare_belts']
  },

  BEAUTY_WELLNESS: {
    key: 'beauty_wellness',
    label: 'Beauty, Wellness & Fitness',
    patterns: [
      /\b(beauty\s*parlour|ladies\s*salon|gents\s*salon|hair\s*stylist|spa|massage\s*center|gym|fitness\s*center|yoga|tattoo\s*studio)\b/i
    ],
    subvectors: [
      'Beauty Parlours & Ladies Salons',
      'Gents Salons & Hair Stylists',
      'Spas & Massage Centres',
      'Gyms & Fitness Centres',
      'Yoga Studios',
      'Tattoo & Piercing Studios'
    ],
    avoids: ['cosmetic wholesale only', 'chemical supplier', 'steel', 'turmeric', 'cement'],
    preferredZoneTypes: ['commercial_bazaar', 'residential_belts']
  },

  EDUCATION_COACHING: {
    key: 'education_coaching',
    label: 'Education, Coaching & Training',
    patterns: [
      /\b(school|schools|college|colleges|coaching\s*center|iit\s*jee\s*coaching|neet\s*coaching|competitive\s*exam|computer\s*training|spoken\s*english|ielts|music\s*academy|dance\s*academy)\b/i
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
    avoids: ['uniform manufacturer only', 'stationery only', 'turmeric', 'steel'],
    preferredZoneTypes: ['residential_belts', 'commercial_bazaar']
  }
};


/**
 * Detect trade sector for a given query or category string
 */
function detectTradeSector(query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return null;

  // 1. Check specific commodity entity first (preserves exact product sector)
  const commodity = extractSpecificCommodity(q);
  if (commodity && SECTORS[commodity.sectorKey.toUpperCase()]) {
    return SECTORS[commodity.sectorKey.toUpperCase()];
  }
  if (commodity) {
    const found = Object.values(SECTORS).find(s => s.key === commodity.sectorKey);
    if (found) return found;
  }

  // 2. Fall back to sector pattern matching
  for (const sector of Object.values(SECTORS)) {
    for (const pat of sector.patterns) {
      if (pat.test(q)) {
        return sector;
      }
    }
  }
  return null;
}

module.exports = {
  SECTORS,
  detectTradeSector
};
