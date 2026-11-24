/**
 * querySpecificityClassifier.js
 *
 * Deterministic, high-precision query classification module for Scraper Fleet Engine v2.5.
 * Distinguishes between:
 *  1. Generic Umbrella Queries (Broad Intent -> Multi-Vector Expansion)
 *  2. Particular Niche Queries (Laser Intent -> Domain Purity Preservation)
 *
 * Prevents domain contamination (e.g. searching "maternity photographer" will never yield
 * passport labs, drone cinematographers, or commercial catalog studios).
 */

// ── 1. PARTICULAR NICHE REGISTRY & LASER MICRO-SYNONYMS ──────────────────────
const PARTICULAR_NICHE_REGISTRY = [
  // ── Photography & Media ──
  {
    key: 'maternity_photography',
    patterns: [/\b(maternity|pregnancy|pregnant|baby\s*bump)\b/i],
    categoryFamily: 'photography',
    label: 'Maternity Photography',
    avoids: ['passport', 'visa photo', 'id card', 'drone industrial', 'commercial product', 'e-commerce shoot'],
    synonyms: {
      default: [
        'Maternity Photoshoot Studios',
        'Outdoor Maternity Photographers',
        'Pregnancy & Baby Bump Shoots',
        'Maternity & Newborn Portrait Studios'
      ],
      IN: [
        'Maternity Photoshoot Studios',
        'Outdoor Maternity Photographers',
        'Baby Shower & Sreemantham Photographers',
        'Maternity & Newborn Baby Shoots'
      ]
    }
  },
  {
    key: 'newborn_baby_photography',
    patterns: [/\b(newborn|new\s*born|just\s*born|infant|toddler|baby\s*shoot)\b/i],
    categoryFamily: 'photography',
    label: 'Newborn & Baby Photography',
    avoids: ['passport', 'commercial product', 'corporate headshots', 'real estate shoot'],
    synonyms: {
      default: [
        'Newborn Baby Photoshoots',
        'Infant & Just Born Photography Studios',
        'Toddler & First Birthday Cake Smash Shoots',
        'Baby Portrait & Milestone Studios'
      ],
      IN: [
        'Just Born & Newborn Baby Photoshoots',
        'Cradle Ceremony & Naming Ceremony Photographers',
        'Baby & Toddler Photography Studios',
        'First Birthday Party Photographers'
      ]
    }
  },
  {
    key: 'candid_wedding_photography',
    patterns: [/\b(candid|candid\s*wedding|wedding\s*cinematography)\b/i],
    categoryFamily: 'photography',
    label: 'Candid Wedding Photography',
    avoids: ['passport', 'product catalog', 'visa photo', 'id card photo'],
    synonyms: {
      default: [
        'Candid Wedding Photographers',
        'Luxury Wedding Cinematography & Film',
        'Wedding Photojournalists & Candid Shoots',
        'Destination Wedding Photographers'
      ],
      IN: [
        'Candid Wedding Photographers',
        'Telugu & South Indian Wedding Cinematography',
        'Traditional & Candid Marriage Photographers',
        'Wedding Reception & Muhurtham Shoots'
      ]
    }
  },
  {
    key: 'pre_wedding_photography',
    patterns: [/\b(pre\s*wedding|pre-wedding|post\s*wedding|engagement\s*shoot|couple\s*shoot)\b/i],
    categoryFamily: 'photography',
    label: 'Pre-Wedding & Couple Shoots',
    avoids: ['passport', 'id card', 'product photography', 'industrial photo'],
    synonyms: {
      default: [
        'Pre-Wedding & Engagement Shoots',
        'Outdoor Couple Photoshoot Studios',
        'Creative Pre-Wedding Cinematographers',
        'Love Story & Couple Portrait Photographers'
      ],
      IN: [
        'Pre-Wedding & Outdoor Couple Shoots',
        'Post-Wedding & Engagement Photographers',
        'Resort & Outdoor Location Photoshoots',
        'Romantic Couple Cinematography'
      ]
    }
  },
  {
    key: 'drone_aerial_photography',
    patterns: [/\b(drone|aerial\s*photography|aerial\s*video|quadcopter)\b/i],
    categoryFamily: 'photography',
    label: 'Drone & Aerial Cinematography',
    avoids: ['passport', 'maternity baby', 'indoor portrait', 'cake smash'],
    synonyms: {
      default: [
        'Drone Aerial Cinematography & 4K Video',
        'Licensed Commercial Drone Pilots & Operators',
        'Aerial Real Estate & Construction Survey Shoots',
        'Drone Video Production Services'
      ],
      IN: [
        'Drone Wedding & Event Cinematography',
        '4K Drone Camera Shoots & Video Coverage',
        'Aerial Mapping & Real Estate Drone Services',
        'Drone Pilots & Event Cinematography'
      ]
    }
  },
  {
    key: 'commercial_product_photography',
    patterns: [
      /\b(product|commercial|ecommerce|e-commerce|catalog)\b.*?\b(photo|shoot|video)/i,
      /\b(product\s*photograph|commercial\s*photograph|ecommerce\s*photograph|catalog\s*shoot)\b/i
    ],
    categoryFamily: 'photography',
    label: 'Commercial & Product Photography',
    avoids: ['wedding shoot', 'maternity baby', 'passport visa', 'kalyana mandapam'],
    synonyms: {
      default: [
        'Commercial & Product Photography Studios',
        'E-Commerce & Amazon Product Shoots',
        'White Background Product Photographers',
        'Advertising & Brand Campaign Photographers'
      ],
      IN: [
        'Product & Commercial Photography Studios',
        'Amazon & Flipkart Product Photoshoots',
        'Catalog & Apparel Fashion Shoots',
        'Jewellery & Industrial Product Photographers'
      ]
    }
  },

  // ── Dental & Healthcare ──
  {
    key: 'root_canal_dentist',
    patterns: [/\b(root\s*canal|endodontic|endodontist)\b/i],
    categoryFamily: 'health',
    label: 'Root Canal Endodontist',
    avoids: ['teeth whitening', 'cosmetic veneers', 'invisalign braces'],
    synonyms: {
      default: [
        'Root Canal Specialists (Endodontics)',
        'Emergency Root Canal Pain Relief Clinics',
        'Endodontic Therapy & Tooth Preservation',
        'Microscopic Endodontic Surgery Centers'
      ],
      IN: [
        'Root Canal Treatment & Endodontic Clinics',
        'Single Sitting Root Canal Specialists',
        'Tooth Pain Relief & Endodontic Centers',
        'Advanced Dental Hospital (Root Canal)'
      ]
    }
  },
  {
    key: 'dental_implants',
    patterns: [/\b(dental\s*implant|implantology|all\s*on\s*4|implant\s*dentist)\b/i],
    categoryFamily: 'health',
    label: 'Dental Implants',
    avoids: ['pediatric baby', 'routine cleaning', 'teeth whitening'],
    synonyms: {
      default: [
        'Dental Implant & Oral Surgery Centers',
        'Full Mouth Dental Implant Specialists',
        'All-on-4 Implant Dentists',
        'Cosmetic Implantology Studios'
      ],
      IN: [
        'Dental Implant & Oral Surgery Centers',
        'Basal & Immediate Dental Implants',
        'Full Mouth Rehabilitation Dental Clinics',
        'Dental Hospital & Implant Centre'
      ]
    }
  },
  {
    key: 'orthodontics_invisalign',
    patterns: [/\b(orthodont|invisalign|clear\s*aligner|braces)\b/i],
    categoryFamily: 'health',
    label: 'Orthodontics & Invisalign',
    avoids: ['denture repair', 'oral trauma surgery', 'tooth extraction'],
    synonyms: {
      default: [
        'Orthodontic Clinics & Braces',
        'Invisalign & Clear Aligner Specialists',
        'Adult & Teen Orthodontics',
        'Diamond Invisalign Providers'
      ],
      IN: [
        'Orthodontic Clinics & Braces Specialists',
        'Invisalign & Invisible Aligners',
        'Teeth Straightening & Clip Clinics',
        'Orthodontic Smile Design Centers'
      ]
    }
  },

  // ── Legal & Law ──
  {
    key: 'truck_accident_lawyers',
    patterns: [
      /\b(semi\s*truck|tractor\s*trailer|18\s*wheeler|commercial\s*truck)\b.*?\b(accident|injury|lawyer|attorney|law\s*firm)/i,
      /\btruck\s*accident\b.*?\b(lawyer|attorney|law\s*firm|advocate|solicitor)/i
    ],
    categoryFamily: 'professional',
    label: 'Semi-Truck Accident Lawyers',
    avoids: ['traffic parking ticket', 'small claims court', 'divorce'],
    synonyms: {
      default: [
        'Semi-Truck Accident Lawyers',
        'Commercial Truck Crash Attorneys',
        '18-Wheeler Injury Lawyers',
        'Fatal Truck Accident Law Firms'
      ]
    }
  },
  {
    key: 'medical_malpractice_lawyers',
    patterns: [/\b(medical\s*malpractice|birth\s*injury|surgical\s*error|hospital\s*negligence)\b/i],
    categoryFamily: 'professional',
    label: 'Medical Malpractice Lawyers',
    avoids: ['routine doctor appointment', 'medical insurance sales'],
    synonyms: {
      default: [
        'Medical Malpractice Attorneys',
        'Birth Injury Law Firms',
        'Hospital Negligence Lawyers',
        'Surgical Malpractice Advocates'
      ]
    }
  },
  {
    key: 'divorce_family_lawyer',
    patterns: [/\b(divorce|child\s*custody|family\s*law|spousal\s*support|alimony|marital)\b/i],
    categoryFamily: 'professional',
    label: 'Divorce & Family Lawyer',
    avoids: ['patent', 'trademark', 'corporate tax', 'mergers acquisitions', 'dui criminal'],
    synonyms: {
      default: [
        'Divorce & Family Law Attorneys',
        'Child Custody & Support Lawyers',
        'Contested & Uncontested Divorce Lawyers',
        'Family Law Mediation & Settlement Firms'
      ],
      GB: [
        'Family Law & Divorce Solicitors',
        'Child Arrangement Order Solicitors',
        'Matrimonial & Financial Dispute Solicitors'
      ],
      IN: [
        'Family Court & Divorce Advocates',
        'Child Custody & Maintenance Lawyers',
        'Mutual Consent Divorce Advocates',
        'Domestic Violence & Family Law Advocates'
      ]
    }
  },
  {
    key: 'personal_injury_lawyer',
    patterns: [
      /\bpersonal\s*injury\b/i,
      /\b(car\s*accident|truck\s*accident|accident|slip\s*and\s*fall)\b.*?\b(law|attorney|lawyer|solicitor|advocate)/i
    ],
    categoryFamily: 'professional',
    label: 'Personal Injury Lawyer',
    avoids: ['patent copyright', 'corporate tax', 'divorce custody', 'estate planning probate'],
    synonyms: {
      default: [
        'Personal Injury & Accident Lawyers',
        'Auto Accident Injury Attorneys',
        'Catastrophic Injury & Wrongful Death Lawyers',
        'No Win No Fee Injury Claims Attorneys'
      ],
      GB: [
        'Personal Injury & Claims Solicitors',
        'No Win No Fee Accident Claims Solicitors',
        'Road Traffic Accident Solicitors'
      ],
      IN: [
        'Motor Accident Claims Tribunal (MACT) Advocates',
        'Accident Compensation Advocates',
        'Insurance Claim Settlement Lawyers'
      ]
    }
  },
  {
    key: 'criminal_defense_lawyer',
    patterns: [/\b(criminal\s*defense|dui|dwi|bail\s*bond)\b/i],
    categoryFamily: 'professional',
    label: 'Criminal Defense Attorney',
    avoids: ['real estate closing', 'patent trademark', 'divorce family'],
    synonyms: {
      default: [
        'Criminal Defense Attorneys',
        'DUI & DWI Defense Lawyers',
        'Felony & Misdemeanor Defense Counsel',
        'Federal & State Trial Defense Attorneys'
      ],
      IN: [
        'Criminal Defense Advocates',
        'Bail & Anticipatory Bail Advocates',
        'High Court Criminal Lawyers',
        'Sessions Court Criminal Trial Advocates'
      ]
    }
  },

  // ── Plumbing & Trades ──
  {
    key: 'emergency_247_plumber',
    patterns: [
      /\b(emergency|24\/7|24\s*hour|burst\s*pipe|urgent)\b.*?\bplumb/i,
      /\bplumb.*?\b(emergency|24\/7|24\s*hour|urgent)/i
    ],
    categoryFamily: 'home-services',
    label: 'Emergency 24/7 Plumber',
    avoids: ['bathroom remodeling', 'kitchen cabinet', 'tile showroom'],
    synonyms: {
      default: [
        '24/7 Emergency Plumbers',
        'After-Hours Emergency Plumbing Services',
        'Burst Pipe & Urgent Water Leak Plumbers',
        'Rapid Response Drain & Sewer Plumbers'
      ],
      GB: [
        '24/7 Emergency Callout Plumbers',
        'Gas Safe Emergency Heating Engineers',
        'Rapid Burst Pipe & Flood Repair Plumbers',
        'Out of Hours Emergency Plumbers'
      ],
      AU: [
        '24/7 Emergency Plumbers & Gasfitters',
        'Rapid Response Plumbing Services',
        'Burst Pipe & Blocked Drain Emergency'
      ],
      IN: [
        '24/7 Emergency Plumbers',
        'Urgent Pipe Leakage & Plumber Services',
        'Same Day Plumber Callout',
        'Borewell & Water Motor Plumbers'
      ]
    }
  },
  {
    key: 'drain_sewer_cleaning',
    patterns: [/\b(drain\s*clean|sewer\s*clean|rooter|hydro\s*jet|blocked\s*drain)\b/i],
    categoryFamily: 'home-services',
    label: 'Drain & Sewer Cleaning',
    avoids: ['water heater sales', 'bathroom design', 'solar panel'],
    synonyms: {
      default: [
        'Drain Cleaning & Sewer Rooter Specialists',
        'Hydro Jetting & Main Line Clear Specialists',
        'Clogged Drain & Video Camera Pipe Inspection',
        'Emergency Sewer Drain Snaking Services'
      ],
      GB: [
        'Blocked Drain Clearance & CCTV Drainage Survey',
        'Drain Jetting & Unblocking Specialists',
        'Emergency Drainage Engineers'
      ],
      AU: [
        'Blocked Drain Clearing & Jetting',
        'CCTV Drain Camera Inspection',
        'Emergency Drainage Specialists'
      ],
      IN: [
        'Drainage Cleaning & Blockage Removal Plumbers',
        'Underground Drainage Cleaning Services',
        'Septic Tank & Sewer Line Cleaning'
      ]
    }
  },

  // ── Electrical Niches ──
  {
    key: 'emergency_electrician_ev',
    patterns: [
      /\b(emergency|24\/7)\b.*?\belectric/i,
      /\belectric.*?\b(emergency|24\/7)/i,
      /\b(ev\s*charger|tesla\s*wall|panel\s*upgrade)\b/i
    ],
    categoryFamily: 'home-services',
    label: 'Emergency Electrician & EV Charger',
    avoids: ['plumbing drain', 'roof tile'],
    synonyms: {
      default: [
        '24/7 Emergency Electricians',
        'EV Charger & Tesla Wall Connector Installation',
        '200 Amp Electrical Panel Upgrade Specialists',
        'Emergency Power Outage & Rewiring Electricians'
      ],
      GB: [
        '24/7 Emergency Callout Electricians',
        'NICEIC Emergency Electrical Contractors',
        'EV Home Chargepoint Installers',
        'Fuse Box & Consumer Unit Replacements'
      ],
      AU: [
        '24/7 Emergency Sparkies & Electricians',
        'EV Charger Installation Specialists',
        'Switchboard Upgrades & Rewiring'
      ],
      IN: [
        '24/7 Emergency Electricians',
        'Short Circuit Repair & Tripping Solutions',
        'Inverter & Home UPS Electricians',
        'Complete Home Wiring & Panel Work'
      ]
    }
  },

  // ── HVAC & Heating Niches ──
  {
    key: 'furnace_ac_repair',
    patterns: [/\b(furnace|ac\s*compressor|duct\s*cleaning|heat\s*pump|emergency\s*hvac|boiler\s*repair|gas\s*safe|boiler\s*breakdown|central\s*heating|combi\s*boiler)\b/i],
    categoryFamily: 'home-services',
    label: 'HVAC Furnace & AC Repair',
    avoids: ['gutter clean', 'fence staining', 'plumbing drain'],
    synonyms: {
      default: [
        'Emergency HVAC Repair & AC Service',
        'Furnace Repair & Heating Technicians',
        'Air Duct Cleaning & Air Quality Specialists',
        'Heat Pump Installation & Compressor Service'
      ],
      GB: [
        'Emergency Boiler Breakdown & Repair',
        'Central Heating Engineers & Radiators',
        'Heat Pump & Boiler Servicing'
      ],
      AE: [
        'Chiller AC Breakdown & Rapid Repair',
        'AC Duct Cleaning & Sanitization Services',
        'Emergency Central AC Maintenance'
      ],
      IN: [
        'Emergency AC Repair & Gas Refilling',
        'Split & Inverter AC Service Technicians',
        'Central AC & VRF Maintenance Services'
      ]
    }
  },

  // ── Food & Catering ──
  {
    key: 'biryani_restaurant',
    patterns: [/\b(biryanis?|dum\s*biryanis?|potful\s*biryanis?|mandi\s*biryanis?)\b/i],
    categoryFamily: 'food',
    label: 'Biryani Restaurant',
    avoids: ['pure veg jain', 'italian pasta', 'chinese noodle', 'pizza'],
    synonyms: {
      default: [
        'Dum Biryani & Indian Tandoori Restaurants',
        'Hyderabadi Biryani Dine-in Spots',
        'Biryani & Mughlai Feast Restaurants'
      ],
      IN: [
        'Authentic Hyderabadi Dum Biryani Restaurants',
        'Mutton & Chicken Biryani Dine-in',
        'Potful & Handi Biryani Centers',
        'Family Biryani & Kebabs Restaurants'
      ]
    }
  },
  {
    key: 'pure_veg_restaurant',
    patterns: [/\b(pure\s*veg|pure\s*vegetarian|udupi|jain\s*food|veg\s*thali|dosa\s*centers?)\b/i],
    categoryFamily: 'food',
    label: 'Pure Veg Restaurant',
    avoids: ['non veg', 'chicken', 'mutton', 'halal meat', 'bar and pub'],
    synonyms: {
      default: [
        'Pure Vegetarian & Vegan Restaurants',
        'South Indian Vegetarian Dining',
        'Plant-Based & Veg Dine-in'
      ],
      IN: [
        'Pure Veg South Indian Thali Restaurants',
        'Udupi Tiffin & Dosa Centers',
        'Pure Vegetarian Family Dining',
        'Traditional Gujarati & Rajasthani Thali'
      ]
    }
  },
  {
    key: 'italian_pizza_pasta',
    patterns: [/\b(italian\s*restaurants?|pizzerias?|pizzas?|woodfired\s*pizzas?|trattorias?|pastas?)\b/i],
    categoryFamily: 'food',
    label: 'Italian Pizzeria & Trattoria',
    avoids: ['biryani', 'curry house', 'chinese wok', 'tacos'],
    synonyms: {
      default: [
        'Artisan Woodfired Pizzerias',
        'Authentic Italian Trattorias & Pasta Bars',
        'Neapolitan Style Pizza Restaurants',
        'Italian Fine Dining & Wine Bars'
      ],
      US: [
        'Artisan Woodfired Pizzerias',
        'Authentic Italian Trattorias & Pasta Bars',
        'Neapolitan Pizza & Craft Pizzerias',
        'Classic New York Pizza & Italian Dining'
      ],
      GB: [
        'Italian Trattorias & Artisan Pizzerias',
        'Authentic Pasta Bars & Italian Dining',
        'Woodfired Pizza Restaurants'
      ]
    }
  },
  {
    key: 'sushi_japanese_ramen',
    patterns: [/\b(sushis?|omakase|ramens?|japanese\s*restaurants?|izakayas?|sashimis?)\b/i],
    categoryFamily: 'food',
    label: 'Sushi & Japanese Dining',
    avoids: ['pizza', 'tacos', 'biryani', 'bbq ribs'],
    synonyms: {
      default: [
        'Sushi & Sashimi Dining Bars',
        'Japanese Ramen & Noodle Bars',
        'Omakase & Japanese Fine Dining',
        'Izakaya & Japanese Grill Restaurants'
      ]
    }
  },
  {
    key: 'mexican_tacos',
    patterns: [/\b(mexican\s*restaurants?|taquerias?|tacos?|cantinas?|burritos?)\b/i],
    categoryFamily: 'food',
    label: 'Mexican Taqueria & Cantina',
    avoids: ['sushi', 'biryani', 'curry', 'pasta'],
    synonyms: {
      default: [
        'Authentic Mexican Taquerias',
        'Mexican Cantinas & Taco Bars',
        'Gourmet Mexican Street Food & Margaritas'
      ],
      US: [
        'Authentic Mexican Taquerias',
        'Mexican Cantinas & Taco Bars',
        'Street Taco & Tequila Bars',
        'Sonoran & Oaxacan Mexican Dining'
      ]
    }
  },
  {
    key: 'steakhouse_bbq',
    patterns: [/\b(steakhouses?|chophouses?|prime\s*steaks?|smokehouses?|bbq\s*ribs?)\b/i],
    categoryFamily: 'food',
    label: 'Steakhouse & BBQ',
    avoids: ['pure veg', 'vegan raw', 'sushi omakase'],
    synonyms: {
      default: [
        'Prime Steakhouses & Chophouses',
        'Wood-Smoked BBQ & Ribs Restaurants',
        'Upscale Steak Dining & Grills'
      ],
      US: [
        'Prime Dry-Aged Steakhouses',
        'Southern BBQ & Smokehouse Ribs',
        'Classic American Chophouses & Grills'
      ]
    }
  },
  {
    key: 'bakery_patisserie_cakes',
    patterns: [/\b(bakery|bakeries|patisserie|custom\s*cake|birthday\s*cake|pastry\s*shop|cake\s*studio)\b/i],
    categoryFamily: 'food',
    label: 'Bakery & Cake Studio',
    avoids: ['biryani', 'steakhouse', 'car repair', 'plumbing'],
    synonyms: {
      default: [
        'Artisan Bakeries & French Patisseries',
        'Custom Birthday & Wedding Cake Studios',
        'Specialty Pastry & Dessert Bakeries',
        'Fresh Sourdough Bread Bakeries'
      ],
      IN: [
        'Custom Birthday Cake Studios & Bakeries',
        'Live Pastry & Cake Shops',
        'Artisan Bakery & Confectionery',
        'Eggless Custom Designer Cakes'
      ]
    }
  },
  {
    key: 'cafe_coffee_brunch',
    patterns: [/\b(cafe|coffee\s*shop|specialty\s*coffee|brunch\s*cafe|roastery|espresso\s*bar)\b/i],
    categoryFamily: 'food',
    label: 'Specialty Coffee & Cafe',
    avoids: ['steakhouse grill', 'heavy buffet', 'towing'],
    synonyms: {
      default: [
        'Specialty Coffee Roasters & Cafes',
        'Artisan Espresso Bars & Coffee Shops',
        'All-Day Breakfast & Brunch Cafes'
      ],
      AU: [
        'Specialty Coffee Roasters & Specialty Cafes',
        'Artisan Espresso & Modern Brunch Spots',
        'Specialty Brew & Coffee Bars'
      ],
      IN: [
        'Specialty Coffee Cafes & Hangout Lounges',
        'Artisan Coffee Roasters & Bistro Cafes',
        'Rooftop Cafes & Dessert Bars'
      ]
    }
  },
  {
    key: 'gastropub_beer',
    patterns: [/\b(gastropubs?|craft\s*beer|sunday\s*roast|brewpubs?|british\s*pubs?)\b/i],
    categoryFamily: 'food',
    label: 'Gastropub & Craft Beer',
    avoids: ['sushi', 'biryani', 'pure veg'],
    synonyms: {
      GB: [
        'Traditional British Gastropubs & Real Ale',
        'Sunday Roast & Traditional Pub Dining',
        'Craft Brewery Taprooms & Pubs'
      ],
      default: [
        'Gastropubs & Craft Ale Bars',
        'Artisan Brewpubs & Gourmet Pub Food'
      ]
    }
  },
  {
    key: 'waterproofing_roofing',
    patterns: [/\b(waterproofing|wall\s*putty|roof\s*leak|terrace\s*leak)\b/i],
    categoryFamily: 'home-services',
    label: 'Waterproofing & Leak Repair',
    avoids: ['salon', 'food catering'],
    synonyms: {
      default: [
        'Roof Waterproofing Contractors',
        'Basement & Terrace Leakage Repair',
        'Damp Proofing & Water Seal Specialists'
      ],
      IN: [
        'Terrace Waterproofing & Wall Putty Contractors',
        'Dr Fixit Certified Waterproofing Services',
        'Basement & Roof Leakage Solution Experts'
      ]
    }
  },
  {
    key: 'modular_kitchen_carpentry',
    patterns: [/\b(modular\s*kitchen|interior\s*carpentry|custom\s*cabinets?)\b/i],
    categoryFamily: 'home-services',
    label: 'Modular Kitchen & Cabinetry',
    avoids: ['engine repair', 'dentist'],
    synonyms: {
      default: [
        'Modular Kitchen Designers & Installers',
        'Custom Cabinet Makers & Carpentry',
        'Interior Woodwork & Closet Specialists'
      ],
      IN: [
        'Modular Kitchen Showrooms & Designers',
        'Interior Woodwork & Custom Wardrobe Carpenters',
        'Factory Finish Modular Kitchens'
      ]
    }
  },
  {
    key: 'borewell_submersible',
    patterns: [/\b(borewell|submersible\s*pump|well\s*drilling)\b/i],
    categoryFamily: 'home-services',
    label: 'Borewell & Submersible Pump',
    avoids: ['restaurant', 'salon'],
    synonyms: {
      default: [
        'Water Well Drilling Contractors',
        'Submersible Pump Installation & Repair'
      ],
      IN: [
        'Borewell Drilling Contractors & Rig Services',
        'Submersible Water Pump Dealers & Repair',
        'Deep Tube Well Boring Specialists'
      ]
    }
  },
  {
    key: 'brahmin_vegetarian_catering',
    patterns: [
      /\b(brahmin|satvik)\b/i,
      /\b(pure\s*veg|traditional\s*veg|jain)\b.*?\bcater/i
    ],
    categoryFamily: 'food',
    label: 'Pure Veg Brahmin Caterers',
    avoids: ['non veg', 'chicken biryani', 'mutton', 'bbq pork', 'alcohol bar'],
    synonyms: {
      default: [
        'Pure Vegetarian Wedding Caterers',
        'Traditional Brahmin Catering Services',
        'Gourmet Vegetarian Feast Caterers',
        'Satvik & Pure Veg Event Caterers'
      ],
      IN: [
        'Pure Veg Brahmin Wedding Caterers',
        'Traditional South Indian Brahmin Feast Caterers',
        'Authentic Vegetarian Meals & Tiffin Caterers',
        'Kalyana Mandapam Pure Veg Caterers'
      ]
    }
  },
  {
    key: 'biryani_nonveg_catering',
    patterns: [/\b(biryani|halal|dum\s*biryani|non\s*veg\s*cater)\b/i],
    categoryFamily: 'food',
    label: 'Biryani & Non-Veg Caterers',
    avoids: ['brahmin satvik', 'pure veg jain'],
    synonyms: {
      default: [
        'Biryani & Halal Feast Caterers',
        'Barbecue & Non-Veg Event Caterers',
        'Gourmet Meat & Multi-Cuisine Caterers'
      ],
      IN: [
        'Authentic Hyderabadi Dum Biryani Caterers',
        'Non-Veg Wedding & Reception Caterers',
        'Halal Mutton & Chicken Feast Caterers',
        'Grand Dawat & Party Biryani Caterers'
      ]
    }
  },

  // ── Auto Services ──
  {
    key: 'ceramic_coating_ppf',
    patterns: [/\b(ceramic\s*coating|paint\s*protection\s*film|ppf|graphene\s*coating)\b/i],
    categoryFamily: 'auto',
    label: 'Ceramic Coating & PPF',
    avoids: ['engine overhaul', 'scrapyard salvage', 'smog check', 'towing wrecker'],
    synonyms: {
      default: [
        'Ceramic Coating Studios',
        'Paint Protection Film (PPF) Installers',
        'Paint Correction & Swirl Removal Specialists',
        'Luxury Auto Detailing & Ceramic Centers'
      ],
      GB: [
        'Ceramic Coating & Paint Protection Film (PPF)',
        'Machine Polishing & Paint Correction Studios',
        'High-End Car Detailing & Studio Valeting'
      ],
      AE: [
        'Exotic Car Ceramic Coating & PPF',
        'XPEL Paint Protection Film Specialists',
        'Supercar Detailing & Paint Protection'
      ],
      IN: [
        'Car Ceramic Coating Studios',
        'Paint Protection Film (PPF) Centers',
        'Teflon Coating & Car Detailing Studios',
        '3M Car Care & Ceramic Detailing'
      ]
    }
  },

  // ── Beauty & Aesthetics ──
  {
    key: 'medspa_botox_fillers',
    patterns: [/\b(botox|dermal\s*filler|med\s*spa|laser\s*hair\s*removal|microneedling)\b/i],
    categoryFamily: 'beauty',
    label: 'Med Spa, Botox & Aesthetics',
    avoids: ['haircut barber', 'oil change', 'nail gel manicure'],
    synonyms: {
      default: [
        'Medical Spas & Aesthetic Clinics',
        'Botox & Dermal Filler Specialists',
        'Laser Hair Removal & Skin Resurfacing',
        'Cosmetic Dermatology & Anti-Aging Centers'
      ],
      GB: [
        'Aesthetic Clinics & Botox Practitioners',
        'Laser Hair Removal & Skin Rejuvenation',
        'Doctor-Led Cosmetic Aesthetic Clinics'
      ],
      IN: [
        'Cosmetology & Laser Skin Clinics',
        'Botox, Fillers & Anti-Aging Clinics',
        'Permanent Laser Hair Reduction Clinics'
      ]
    }
  },

  // ── Fitness & Gyms ──
  {
    key: 'crossfit_hiit_gym',
    patterns: [/\b(crossfit|hiit|functional\s*training|kettlebell)\b/i],
    categoryFamily: 'fitness',
    label: 'CrossFit & HIIT Box',
    avoids: ['gentle spa massage', 'pedicure', 'meditation quiet retreat'],
    synonyms: {
      default: [
        'CrossFit Boxes & Affiliate Gyms',
        'High Intensity Interval Training (HIIT) Studios',
        'Functional Strength & Conditioning Gyms',
        'Olympic Weightlifting & CrossFit Centers'
      ]
    }
  },
  {
    key: 'yoga_pilates_studio',
    patterns: [/\b(yoga|pilates|reformer\s*pilates|hot\s*yoga|barre)\b/i],
    categoryFamily: 'fitness',
    label: 'Yoga & Pilates Studio',
    avoids: ['heavy powerlifting', 'boxing ring', 'towing'],
    synonyms: {
      default: [
        'Reformer Pilates Studios',
        'Hot Yoga & Vinyasa Flow Centers',
        'Pilates & Barre Fitness Studios',
        'Yoga Alliance Certified Studios'
      ],
      IN: [
        'Yoga Studios & Daily Yoga Classes',
        'Power Yoga & Aerobics Centers',
        'Traditional Hatha Yoga & Pranayama Centers',
        'Pilates & Women\'s Fitness Studios'
      ]
    }
  },

  // ── High-Ticket Commercial Contracting ──
  {
    key: 'commercial_roofing_flat',
    patterns: [/\b(commercial\s*roof(?:ing)?|tpo\s*roof(?:ing)?|epdm\s*roof(?:ing)?|flat\s*roof(?:ing)?|industrial\s*roof(?:ing)?)\b/i],
    categoryFamily: 'home-services',
    label: 'Commercial Flat Roofing',
    avoids: ['residential shingle', 'gutter cleaning'],
    synonyms: {
      default: [
        'Commercial Flat Roofing Contractors',
        'TPO & EPDM Roofing Specialists',
        'Industrial Roof Replacement Companies',
        'Commercial Roof Coatings & Fluid Applied'
      ]
    }
  },
  {
    key: 'water_damage_restoration',
    patterns: [/\b(water\s*damage|flood\s*cleanup|mold\s*remediation|fire\s*damage\s*restoration|sewage\s*cleanup)\b/i],
    categoryFamily: 'home-services',
    label: 'Water Damage Restoration',
    avoids: ['house maid cleaning', 'carpet rug sales'],
    synonyms: {
      default: [
        '24/7 Water Damage Restoration',
        'Emergency Flood Extraction & Drying',
        'Certified Mold Remediation Specialists',
        'Fire & Smoke Damage Restoration'
      ]
    }
  },
  {
    key: 'solar_energy_installers',
    patterns: [/\b(solar\s*panels?|solar\s*install(?:er|ation)|solar\s*energy|rooftop\s*solar|commercial\s*solar)\b/i],
    categoryFamily: 'home-services',
    label: 'Solar Panel Installation',
    avoids: ['diesel generator fuel', 'gas heater'],
    synonyms: {
      default: [
        'Residential Solar Panel Installers',
        'Commercial Solar EPC Contractors',
        'Solar Battery & Storage Installers',
        'Rooftop Solar Energy Companies'
      ],
      IN: [
        'Rooftop Solar EPC Contractors',
        'On-Grid & Off-Grid Solar Power Systems',
        'Industrial Solar Plant Installers',
        'Solar Inverter & Battery Dealers'
      ]
    }
  },
  {
    key: 'swimming_pool_builders',
    patterns: [/\b(pool\s*builders?|swimming\s*pool\s*contractors?|inground\s*pools?|gunite\s*pools?|custom\s*pools?)\b/i],
    categoryFamily: 'home-services',
    label: 'Swimming Pool Builders',
    avoids: ['pool cleaning chemicals', 'swimwear shop'],
    synonyms: {
      default: [
        'Custom Inground Swimming Pool Builders',
        'Gunite & Concrete Pool Contractors',
        'Luxury Backyard Pool & Spa Designers',
        'Inground Fiberglass Pool Installers'
      ]
    }
  },
  {
    key: 'foundation_repair_underpinning',
    patterns: [/\b(foundation\s*repair|house\s*underpinning|pier\s*and\s*beam|slab\s*foundation|concrete\s*leveling)\b/i],
    categoryFamily: 'home-services',
    label: 'Foundation Repair & Leveling',
    avoids: ['cosmetic painting', 'carpet installation'],
    synonyms: {
      default: [
        'Foundation Repair Contractors',
        'Concrete Slab Leveling & Polyjacking',
        'House Underpinning & Pier Installation',
        'Basement Wall Stabilization'
      ]
    }
  },

  // ── High-Value Healthcare & Surgeries ──
  {
    key: 'plastic_surgery_cosmetic',
    patterns: [/\b(plastic\s*surgeons?|cosmetic\s*surgeons?|rhinoplasty|breast\s*augmentation|facelift|tummy\s*tuck|liposuction)\b/i],
    categoryFamily: 'health',
    label: 'Plastic & Cosmetic Surgery',
    avoids: ['dental clean', 'nail parlour', 'hair salon haircut'],
    synonyms: {
      default: [
        'Board Certified Plastic Surgeons',
        'Cosmetic Surgery Centers',
        'Rhinoplasty & Facial Plastic Surgeons',
        'Body Contouring & Breast Augmentation Centers'
      ]
    }
  },
  {
    key: 'hair_transplant_clinics',
    patterns: [/\b(hair\s*transplant|fue\s*hair|fut\s*hair|hair\s*restoration\s*clinics?)\b/i],
    categoryFamily: 'health',
    label: 'Hair Transplant & Restoration',
    avoids: ['barbershop fade', 'hair oil shop', 'haircut'],
    synonyms: {
      default: [
        'FUE Hair Transplant Clinics',
        'Advanced Hair Restoration Surgeons',
        'Robotic Hair Transplant Centers',
        'Beard & Eyebrow Transplant Clinics'
      ]
    }
  },
  {
    key: 'ivf_fertility_centers',
    patterns: [/\b(ivf|fertility\s*clinics?|in\s*vitro|test\s*tube\s*baby|reproductive\s*medicine)\b/i],
    categoryFamily: 'health',
    label: 'IVF & Fertility Treatment',
    avoids: ['baby clothes shop', 'toys', 'maternity shoot'],
    synonyms: {
      default: [
        'IVF & Fertility Treatment Centers',
        'Advanced Reproductive Medicine Clinics',
        'Egg Freezing & Infertility Specialists',
        'Test Tube Baby Hospitals & IVF Centers'
      ]
    }
  },

  // ── High-Volume Industrial B2B & Logistics ──
  {
    key: 'scrap_metal_recycling',
    patterns: [/\b(scrap\s*metal|metal\s*recycling|scrap\s*yards?|copper\s*scrap|iron\s*scrap|steel\s*scrap)\b/i],
    categoryFamily: 'industrial',
    label: 'Scrap Metal Recyclers',
    avoids: ['new jewelry showroom', 'antique vintage shop'],
    synonyms: {
      default: [
        'Industrial Scrap Metal Recyclers',
        'Scrap Yards & Copper Buyers',
        'Ferrous & Non-Ferrous Scrap Dealers',
        'Scrap Mandi & Metal Recycling Units'
      ]
    }
  },
  {
    key: 'cnc_machining_precision',
    patterns: [/\b(cnc\s*machining|precision\s*machining|laser\s*cutting|metal\s*stamping|sheet\s*metal\s*fabrication)\b/i],
    categoryFamily: 'industrial',
    label: 'CNC Machining & Fabrication',
    avoids: ['hand sewing machine', 'wood carving hobby'],
    synonyms: {
      default: [
        'Precision CNC Machining Centers',
        'Industrial Laser Cutting Services',
        'Custom Sheet Metal Fabrication Shops',
        'CNC Milling & Lathe Machine Works'
      ]
    }
  },
  {
    key: 'customs_broker_freight',
    patterns: [/\b(customs\s*brokers?|freight\s*forwarders?|3pl\s*warehouse|cargo\s*shipping|container\s*logistics)\b/i],
    categoryFamily: 'logistics',
    label: 'Customs Brokers & Freight',
    avoids: ['passenger taxi', 'bus ticket booking'],
    synonyms: {
      default: [
        'Licensed Customs Brokers',
        'International Freight Forwarding Companies',
        '3PL Warehousing & Logistics Solutions',
        'Ocean & Air Cargo Shipping Agents'
      ]
    }
  }
];

// Generic Umbrella Token Triggers (when query is purely an umbrella noun)
const GENERIC_UMBRELLA_STEMS = [
  'photographer', 'photography', 'photo studio', 'photos',
  'plumber', 'plumbing', 'drain service',
  'electrician', 'electrical', 'electricians',
  'caterer', 'catering', 'food service',
  'restaurant', 'restaurants', 'restaurent', 'dining', 'eatery', 'eateries', 'food court', 'bistro', 'bistros', 'pub', 'pubs', 'gastropub', 'bakery', 'bakeries', 'cafe', 'cafes', 'coffee shop',
  'lawyer', 'attorney', 'solicitor', 'advocate', 'law firm',
  'doctor', 'clinic', 'hospital', 'medical center',
  'dentist', 'dental', 'dental clinic',
  'accountant', 'cpa', 'accounting', 'tax consultant',
  'realtor', 'real estate', 'property broker', 'estate agent',
  'mechanic', 'auto repair', 'garage', 'car service',
  'auto detailing', 'car wash', 'detailing',
  'salon', 'hair salon', 'barbershop', 'beauty parlour',
  'spa', 'day spa', 'med spa',
  'gym', 'fitness center', 'fitness club',
  'vet', 'veterinarian', 'animal hospital', 'pet clinic',
  'hvac', 'air conditioning', 'ac repair', 'furnace',
  'contractor', 'builder', 'remodeling', 'home builder',
  'roofing', 'roofer', 'roof contractor',
  'painter', 'painting', 'decorating',
  'solar', 'restoration', 'pool builder', 'foundation repair',
  'plastic surgery', 'cosmetic surgery', 'hair transplant', 'fertility clinic', 'ivf',
  'scrap metal', 'cnc', 'machine shop', 'customs broker', 'freight forwarder'
];

/**
 * Classifies a user query into Generic Umbrella vs. Particular Niche.
 *
 * @param {string} category Free text category or search input
 * @param {string} countryCode 2-letter ISO country code (e.g. 'US', 'GB', 'IN', 'CA', 'AU', 'AE')
 * @returns {object} Classification result with mode, flags, and targeted vectors/synonyms.
 */
function classifyQuerySpecificity(category, countryCode = 'IN') {
  const code = String(countryCode || 'IN').trim().toUpperCase();
  const clean = String(category || '').trim();
  const lower = clean.toLowerCase();

  // 1. Check for registered Particular Niches
  for (const niche of PARTICULAR_NICHE_REGISTRY) {
    const matched = niche.patterns.some(pattern => pattern.test(lower));
    if (matched) {
      const countrySynonyms = (niche.synonyms && (niche.synonyms[code] || niche.synonyms.default)) || [];
      return {
        isGeneric: false,
        isParticular: true,
        mode: 'laser_domain_purity',
        categoryKey: niche.key,
        categoryFamily: niche.categoryFamily,
        label: niche.label,
        countryCode: code,
        nicheKey: niche.key,
        microSynonyms: countrySynonyms,
        avoids: niche.avoids || [],
        rawQuery: clean
      };
    }
  }

  // 2. Check if it matches a Generic Umbrella
  const isGenericMatch = GENERIC_UMBRELLA_STEMS.some(stem => lower.includes(stem));

  return {
    isGeneric: true,
    isParticular: false,
    mode: 'multi_vector_expansion',
    categoryKey: lower,
    categoryFamily: 'generic',
    label: clean,
    countryCode: code,
    nicheKey: null,
    microSynonyms: [],
    avoids: [],
    rawQuery: clean
  };
}

module.exports = {
  PARTICULAR_NICHE_REGISTRY,
  GENERIC_UMBRELLA_STEMS,
  classifyQuerySpecificity
};
