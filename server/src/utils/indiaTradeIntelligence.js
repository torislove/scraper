/**
 * indiaTradeIntelligence.js
 *
 * God-Level Pan-Indian Vendor & Product Taxonomy, Activity-Aware Zonal Allocations,
 * Commodity Entity Extraction, and Smart Brand Intelligence for Local Business Extraction.
 *
 * Covers 18 Core Commercial Sectors with 120+ Specialized Subvectors, Strict Cross-Industry
 * Negative Gates (Avoids), Mutual Exclusion Anti-Bleed Matrix, and Spatial Activity Mapping.
 */

const { normalizePhone } = require('./phoneUtils');

// ── 1. SPECIFIC COMMODITY & TRADE PRODUCT ENTITIES ──────────────────────────
// When a substantive product noun is found in a query (e.g. "turmeric", "chilli",
// "cotton", "tmt steel", "sarees", "tiles"), subvectors and zone generation MUST
// strictly preserve and revolve around that specific entity.
const COMMODITY_ENTITIES = [
  {
    key: 'turmeric',
    patterns: [/\b(turmeric|haldi|pasupu)\b/i],
    label: 'Turmeric',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Turmeric Wholesalers & Commission Agents',
      'Turmeric Merchants & Mandi Traders',
      'Turmeric Processing & Polishing Units',
      'Turmeric Stockists & Exporters',
      'Turmeric Cold Storage & APMC Traders',
      'Spices & Turmeric Commission Agents',
      'Agricultural Produce Merchants (Turmeric)'
    ]
  },
  {
    key: 'chilli',
    patterns: [/\b(chilli|chillies|mirchi|red\s*chilli|guntur\s*mirchi)\b/i],
    label: 'Chilli & Spices',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Chilli Wholesalers & Commission Agents',
      'Red Chilli Merchants & Mandi Traders',
      'Chilli Cold Storage & Exporters',
      'Spices & Chilli Powder Processing Units',
      'APMC Yard Chilli Commission Agents'
    ]
  },
  {
    key: 'cotton',
    patterns: [/\b(cotton|ginning|cotton\s*spinning|kapas|cotton\s*mill)\b/i],
    label: 'Cotton & Ginning',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Cotton Ginning & Pressing Mills',
      'Raw Cotton Merchants & Commission Agents',
      'Cotton Bale Traders & Exporters',
      'Cotton Seed Oil Mills'
    ]
  },
  {
    key: 'rice_paddy',
    patterns: [/\b(rice\s*mill|rice\s*mills|paddy|basmati|rice\s*trader|rice\s*wholesale|rice\s*merchants?)\b/i],
    label: 'Rice Mills & Paddy',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Rice Mills & Paddy Processors',
      'Wholesale Rice Merchants & Stockists',
      'Basmati & Non-Basmati Rice Exporters',
      'Paddy Commission Agents & Mandi Merchants'
    ]
  },
  {
    key: 'pulses_dal',
    patterns: [/\b(pulses?|dal\s*mill|dhal|toor\s*dal|urad\s*dal|chana\s*dal|moong\s*dal)\b/i],
    label: 'Pulses & Dal Mills',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Dal Mills & Pulse Processors',
      'Wholesale Dal & Pulse Merchants',
      'Gram & Legume Commission Agents',
      'Grain Mandi Stockists'
    ]
  },
  {
    key: 'oilseeds_edible_oil',
    patterns: [/\b(oil\s*mill|oil\s*mills|oilseeds?|groundnut|mustard\s*oil|sunflower\s*oil|sesame\s*oil)\b/i],
    label: 'Edible Oil & Oilseeds',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Edible Oil Mills & Refineries',
      'Oilseed Wholesalers & Commission Agents',
      'Groundnut & Mustard Wholesale Traders',
      'Bulk Cooking Oil Distributors'
    ]
  },
  {
    key: 'general_spices',
    patterns: [/\b(spices?|masala|pepper|cardamom|coriander|cumin|jeera|cloves|cinnamon|garam\s*masala)\b/i],
    label: 'Spices & Condiments',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Spices Wholesalers & Exporters',
      'Whole Spice Merchants & Mandi Traders',
      'Masala Grinding & Processing Units',
      'Dry Fruit & Spices Wholesalers',
      'Spice Market Yard Commission Agents'
    ]
  },
  {
    key: 'jaggery_sugar',
    patterns: [/\b(jaggery|bellam|gur|sugar\s*wholesale|sugar\s*merchants?)\b/i],
    label: 'Jaggery & Sugar',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Jaggery Wholesalers & Commission Agents',
      'Gur Mandi Merchants',
      'Wholesale Sugar & Jaggery Stockists'
    ]
  },
  {
    key: 'tobacco',
    patterns: [/\b(tobacco|tobacco\s*leaf|flue\s*cured|tobacco\s*traders?)\b/i],
    label: 'Tobacco',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Tobacco Leaf Merchants & Exporters',
      'Tobacco Commission Agents & Grading Units',
      'Tobacco Warehouse & Stockists'
    ]
  },
  {
    key: 'iron_steel_tmt',
    patterns: [/\b(iron\s*and\s*steel|iron\s*&\s*steel|tmt\s*steel|tmt\s*bars?|structural\s*steel|steel\s*traders?|steel\s*dealers?)\b/i],
    label: 'Iron & Steel TMT',
    sectorKey: 'metals_steel',
    subvectors: [
      'Iron & Steel TMT Dealers',
      'Structural Steel & Section Wholesalers',
      'TMT Bar Distributors & Stockists',
      'Steel Pipes, Tubes & Sheets Merchants',
      'Steel Railing & Industrial Steel Suppliers'
    ]
  },
  {
    key: 'sarees_handlooms',
    patterns: [/\b(saree|sari|sarees|handloom|handlooms|silk\s*sarees?|dhoti|pattu\s*sarees?)\b/i],
    label: 'Sarees & Handlooms',
    sectorKey: 'textiles_apparel',
    subvectors: [
      'Saree Wholesalers & Showrooms',
      'Handloom Sarees & Silk Merchants',
      'Pattu & Wedding Saree Showrooms',
      'Cotton Handloom & Dhotis Wholesale',
      'Textile Commission Agents (Sarees)'
    ]
  },
  {
    key: 'tiles_granite_sanitary',
    patterns: [/\b(tiles?|vitrified\s*tiles|granite|marble|sanitaryware|bathroom\s*fittings)\b/i],
    label: 'Tiles, Granite & Sanitaryware',
    sectorKey: 'building_materials',
    subvectors: [
      'Tiles & Ceramic Showrooms',
      'Granite & Marble Wholesalers',
      'Sanitaryware & Bathroom Fitting Distributors',
      'Vitrified & Floor Tiles Dealers'
    ]
  },
  {
    key: 'cement',
    patterns: [/\b(cement|cement\s*dealer|cement\s*stockist|ultratech|acc\s*cement)\b/i],
    label: 'Cement',
    sectorKey: 'building_materials',
    subvectors: [
      'Cement Wholesalers & Stockists',
      'Authorized Cement Dealers',
      'Bulk Cement Suppliers & Building Materials'
    ]
  },
  {
    key: 'plywood_hardware',
    patterns: [/\b(plywood|laminates|flush\s*doors|timber|hardware\s*and\s*tools)\b/i],
    label: 'Plywood & Hardware',
    sectorKey: 'building_materials',
    subvectors: [
      'Plywood & Laminates Wholesalers',
      'Hardware & Tools Stores',
      'Timber Merchants & Wood Suppliers',
      'Modular Kitchen Hardware & Fittings'
    ]
  },
  {
    key: 'electrical_goods',
    patterns: [/\b(electrical\s*goods|switchgear|cables\s*and\s*wires|industrial\s*lighting|electrical\s*switch)\b/i],
    label: 'Electrical Goods',
    sectorKey: 'electrical_goods',
    subvectors: [
      'Electrical Goods Wholesalers',
      'Cables, Wires & Switchgear Distributors',
      'Industrial Electrical Suppliers',
      'LED Lighting & Electrical Fittings'
    ]
  },
  {
    key: 'computers_laptops',
    patterns: [/\b(computer|laptop|laptops|pc\s*builder|desktop\s*pc|gaming\s*pc)\b/i],
    label: 'Computers & Laptops',
    sectorKey: 'technology_computers',
    subvectors: [
      'Laptop Showrooms & Dealers',
      'Computer Hardware & Assembling Shops',
      'Computer & Laptop Repair Centers',
      'Computer Accessories & Peripherals'
    ]
  },
  {
    key: 'cctv_surveillance',
    patterns: [/\b(cctv|surveillance|security\s*cameras?|dvr|nvr|biometric)\b/i],
    label: 'CCTV & Surveillance',
    sectorKey: 'surveillance_cctv',
    subvectors: [
      'CCTV Camera Dealers & Installers',
      'Security Systems & Surveillance Wholesalers',
      'Biometric & Access Control Systems',
      'DVR & NVR Security Equipment'
    ]
  },
  {
    key: 'furniture_woodwork',
    patterns: [/\b(furniture|wooden\s*furniture|sofas?|mattresses?|office\s*furniture)\b/i],
    label: 'Furniture',
    sectorKey: 'furniture_woodwork',
    subvectors: [
      'Furniture Showrooms & Manufacturers',
      'Wooden Furniture & Sofa Makers',
      'Office Furniture Suppliers',
      'Mattress & Home Furnishing Stores'
    ]
  },
  {
    key: 'footwear_shoes',
    patterns: [/\b(footwear|shoes\s*wholesale|shoe\s*showroom|leather\s*shoes|chappal)\b/i],
    label: 'Footwear',
    sectorKey: 'footwear_leather',
    subvectors: [
      'Footwear Wholesalers & Distributors',
      'Shoe Showrooms & Retailers',
      'Sports Shoes & Leather Footwear Stores'
    ]
  },
  {
    key: 'jewelry_gold',
    patterns: [/\b(jewell?ery|gold\s*shop|gold\s*merchants?|bullion|diamond\s*jewell?ery)\b/i],
    label: 'Jewelry & Gold',
    sectorKey: 'jewelry_gems',
    subvectors: [
      'Jewellery Showrooms & Gold Merchants',
      'Gold & Diamond Jewellers',
      'Silver Jewellery & Bullion Traders'
    ]
  },
  {
    key: 'solar_power',
    patterns: [/\b(solar|solar\s*panels?|rooftop\s*solar|solar\s*inverter|solar\s*epc)\b/i],
    label: 'Solar Power',
    sectorKey: 'solar_power',
    subvectors: [
      'Solar Rooftop Installers & EPC Contractors',
      'Solar Panel Dealers & Distributors',
      'Solar Inverter & Battery Suppliers'
    ]
  }
];

// ── 2. COMPREHENSIVE 18 COMMERCIAL INDUSTRY SECTORS ─────────────────────────
const SECTORS = {
  AGRICULTURE_SPICES_COMMODITIES: {
    key: 'agriculture_spices',
    label: 'Agriculture, Spices & Agro Commodities',
    patterns: [
      /\b(turmeric|haldi|pasupu|spices?|masala|chilli|chillies|mirchi|cotton|ginning|rice\s*mill|paddy|grain|grains|pulses?|dal\s*mill|oil\s*mill|groundnut|jaggery|bellam|tobacco|agro\s*commodit|agricultural|apmc|mandi|krishi|fertilizer|seeds?|pesticide|grain\s*merchant|produce\s*merchant|dry\s*fruits?|cashew|cardamom|pepper|coriander|cumin|jeera|oilseeds?|cold\s*storage|spice\s*dealer|spice\s*merchant|spice\s*wholesal)\b/i
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
      /\b(saree|sari|sarees|handloom|handlooms|textile|textiles|fabric|fabrics|cloth|clothes|clothing|garment|garments|spinning\s*mill|weaving|silk|cotton\s*cloth|readymade|apparel|hosiery|tailor|boutique)\b/i
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
      /\b(electrical\s*goods|cables?\s*and\s*wires?|switchgear|industrial\s*lighting|electrical\s*panel|transformers?|fans\s*and\s*switches|electrical\s*wholesal)\b/i
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
      /\b(hospital|hospitals|clinic|clinics|doctor|doctors|dentist|dentists|dental|eye\s*hospital|pediatric|child\s*specialist|orthopedic|gynecologist|maternity|pathology|diagnostic|scan\s*center|physiotherapy|dermatologist|ent)\b/i
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
    label: 'Food, Dining & Bakeries',
    patterns: [
      /\b(restaurant|restaurants|hotel\s*dining|pure\s*veg|biryani|family\s*restaurant|cafe|coffee\s*shop|bakery|cake\s*shop|sweets|mithai|ice\s*cream\s*parlour|fast\s*food|tiffin)\b/i
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
    avoids: ['raw meat shop', 'butcher', 'ration shop', 'steel', 'cement', 'turmeric commodity', 'saree'],
    preferredZoneTypes: ['commercial_bazaar', 'residential_belts', 'highway_belts']
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
 * Extracts specific substantive commodity or trade product entity from query.
 * e.g. "Wholesale Turmeric Suppliers in Tenali" -> Turmeric entity
 */
function extractSpecificCommodity(query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return null;

  for (const ent of COMMODITY_ENTITIES) {
    for (const pat of ent.patterns) {
      if (pat.test(q)) {
        return ent;
      }
    }
  }
  return null;
}

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

/**
 * Returns dynamic subvectors for a given query, preserving the exact substantive entity
 */
function getSubvectorsForQuery(query) {
  const commodity = extractSpecificCommodity(query);
  if (commodity && Array.isArray(commodity.subvectors) && commodity.subvectors.length) {
    return commodity.subvectors;
  }

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
 * Comprehensive Cross-Industry Anti-Bleed Conflict Matrix:
 * Detects if a scraped vendor profile violates the requested industry boundary.
 *
 * @param {string} querySectorKey - Key of the sector being searched
 * @param {string} haystack - Combined lowercase text of vendor (name, subcategory, desc)
 * @param {string} subcategory - Explicit subcategory assigned by directory/maps
 * @returns {boolean} true if an irreconcilable cross-industry conflict is detected
 */
function isIndustryConflict(querySectorKey, haystack, subcategory = '') {
  if (!querySectorKey || !haystack) return false;

  const h = String(haystack).toLowerCase();
  const sub = String(subcategory || '').toLowerCase();
  const combined = `${h} ${sub}`;

  // ── 1. AGRICULTURE & SPICES COMMODITIES ──
  if (querySectorKey === 'agriculture_spices') {
    // Strictly reject Metals, Sarees/Textiles, Tiles/Granite, Electricals, Hotels, Hospitals
    const isSteel = /\b(iron\s*and\s*steel|iron\s*&\s*steel|tmt|tmt\s*bars?|steel\s*dealer|steel\s*corporation|railing|metal\s*store|metal\s*house|fabrication)\b/i.test(combined);
    const isTextile = /\b(saree|sari|sarees|handloom|handlooms|textile|textiles|cloth\s*store|readymade|garments?|silk\s*sarees?)\b/i.test(combined);
    const isBuildingMat = /\b(tiles?|sanitaryware|marbles?|granites?|cement|plywood|vox\s*ceiling|ceramic\s*showroom)\b/i.test(combined);
    const isElectrical = /\b(electrical|electricals|spares|switchgear|lighting\s*fixtures)\b/i.test(combined);
    const isHotel = /\b(hotel|grand|residency|lodge|banquet|mandapam|function\s*hall)\b/i.test(combined);
    const isHealth = /\b(hospital|clinic|dentist|dental|nursing\s*home|doctor)\b/i.test(combined);

    if (isSteel || isTextile || isBuildingMat || isElectrical || isHotel || isHealth) {
      return true;
    }
  }

  // ── 2. METALS, STEEL & MINING ──
  if (querySectorKey === 'metals_steel') {
    const isAgro = /\b(turmeric|haldi|spices?|masala|chilli|mirchi|grain|paddy|rice\s*mill|cotton\s*ginning)\b/i.test(combined);
    const isTextile = /\b(saree|handloom|cloth|readymade|garment)\b/i.test(combined);
    const isHotel = /\b(hotel|lodge|restaurant|bakery|sweet\s*shop)\b/i.test(combined);
    const isHealth = /\b(hospital|clinic|doctor|pharmacy|chemist)\b/i.test(combined);

    if (isAgro || isTextile || isHotel || isHealth) return true;
  }

  // ── 3. TEXTILES, SAREES & APPAREL ──
  if (querySectorKey === 'textiles_apparel') {
    const isSteel = /\b(iron\s*and\s*steel|tmt|steel\s*dealer|metal\s*store)\b/i.test(combined);
    const isAgro = /\b(turmeric|spices?|chilli|paddy|grain|cotton\s*seeds?)\b/i.test(combined);
    const isBuilding = /\b(cement|tiles|sanitaryware|granite|plywood)\b/i.test(combined);
    const isHotel = /\b(hotel|lodge|resort|banquet)\b/i.test(combined);
    const isHealth = /\b(hospital|clinic|dentist|pharmacy)\b/i.test(combined);

    if (isSteel || isAgro || isBuilding || isHotel || isHealth) return true;
  }

  // ── 4. BUILDING MATERIALS, TILES & CERAMICS ──
  if (querySectorKey === 'building_materials') {
    const isAgro = /\b(turmeric|spices?|chilli|paddy|grain)\b/i.test(combined);
    const isTextile = /\b(saree|handloom|cloth|garments?)\b/i.test(combined);
    const isHealth = /\b(hospital|clinic|doctor|pharmacy)\b/i.test(combined);
    const isHotel = /\b(hotel|residency|lodge|restaurant)\b/i.test(combined);

    if (isAgro || isTextile || isHealth || isHotel) return true;
  }

  // ── 5. TECHNOLOGY & COMPUTER STORES ──
  if (querySectorKey === 'technology_computers') {
    const isCctvOnly = /\b(cctv|surveillance|security\s*camera|biometric)\b/i.test(combined) && !/\b(computer|laptop|pc\s*builder|hardware)\b/i.test(combined);
    const isTextile = /\b(saree|handloom|cloth)\b/i.test(combined);
    const isSteel = /\b(steel|iron\s*and\s*steel|tmt)\b/i.test(combined);
    const isAgro = /\b(turmeric|spices?|chilli)\b/i.test(combined);

    if (isCctvOnly || isTextile || isSteel || isAgro) return true;
  }

  // ── 6. CCTV SURVEILLANCE ──
  if (querySectorKey === 'surveillance_cctv') {
    const isPureLaptop = /\b(laptop\s*repair|screen\s*replacement|motherboard\s*repair)\b/i.test(combined) && !/\b(cctv|camera|surveillance|security)\b/i.test(combined);
    const isTextile = /\b(saree|handloom)\b/i.test(combined);
    const isAgro = /\b(turmeric|spices?|chilli)\b/i.test(combined);

    if (isPureLaptop || isTextile || isAgro) return true;
  }

  return false;
}

/**
 * Normalizes vendor name to a clean brand core token for deduplication.
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

function nameSimilarity(nameA, nameB) {
  const a = new Set(coreNameTokens(nameA));
  const b = new Set(coreNameTokens(nameB));
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared++;
  return shared / Math.min(a.size, b.size);
}

const SHARED_DIRECTORY_NUMBERS = new Set([
  '08062210155',
  '18602080808',
  '18001234567'
]);

function sameCity(a, b) {
  const ca = String(a.city || a.locality || '').toLowerCase().trim();
  const cb = String(b.city || b.locality || '').toLowerCase().trim();
  if (!ca || !cb) return true;
  return ca === cb || ca.includes(cb) || cb.includes(ca);
}

function areNearDuplicates(leadA, leadB) {
  if (!leadA || !leadB) return false;
  if (!sameCity(leadA, leadB)) return false;

  const tokenA = normalizeBrandToken(leadA.name);
  const tokenB = normalizeBrandToken(leadB.name);
  const similarity = nameSimilarity(leadA.name, leadB.name);

  if (tokenA && tokenB && tokenA.length >= 4 && tokenB.length >= 4) {
    if (tokenA === tokenB) return true;
    if (tokenA.length >= 6 && tokenB.length >= 6) {
      if (tokenA.includes(tokenB) || tokenB.includes(tokenA)) return true;
    }
  }

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

function mergeVendorLeads(primary, secondary) {
  const merged = { ...primary };

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

  cleanPhones.sort((a, b) => {
    const pA = normalizePhone(a);
    const pB = normalizePhone(b);
    const scoreA = pA?.isMobile ? 3 : (pA?.isLandline ? 2 : 1);
    const scoreB = pB?.isMobile ? 3 : (pB?.isLandline ? 2 : 1);
    return scoreB - scoreA;
  });

  const MAX_PHONES_PER_LEAD = 6;
  if (cleanPhones.length > MAX_PHONES_PER_LEAD) cleanPhones.length = MAX_PHONES_PER_LEAD;
  merged.phones = cleanPhones.length ? cleanPhones : (primary.phones || [primary.phone].filter(Boolean));
  merged.phone = cleanPhones[0] || primary.phone || secondary.phone || null;

  const revA = Number(primary.reviewsCount || primary.reviews || 0);
  const revB = Number(secondary.reviewsCount || secondary.reviews || 0);
  if (revB > revA) {
    merged.reviewsCount = revB;
    merged.rating = secondary.rating || primary.rating;
  }

  const addrA = String(primary.address || '');
  const addrB = String(secondary.address || '');
  if (addrB.length > addrA.length && !addrB.includes('undefined')) {
    merged.address = secondary.address;
  }

  if (!merged.website && secondary.website) merged.website = secondary.website;
  if (!merged.placeId && secondary.placeId) merged.placeId = secondary.placeId;

  return merged;
}

module.exports = {
  COMMODITY_ENTITIES,
  SECTORS,
  extractSpecificCommodity,
  detectTradeSector,
  getSubvectorsForQuery,
  getNegativeAvoidsForQuery,
  isIndustryConflict,
  normalizeBrandToken,
  areNearDuplicates,
  mergeVendorLeads
};


