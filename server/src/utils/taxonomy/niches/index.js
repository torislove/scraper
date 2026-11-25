/**
 * niches/index.js
 * Specific commercial niches (dental, real estate, chartered accountant, jewellery, etc.).
 */

const SPECIFIC_NICHES = {
  dental: {
    key: 'dental',
    label: 'Dentists & Dental Clinics',
    patterns: [/\b(dentist|dentists|dental|teeth|tooth|orthodont|orthodontist|root\s*canal|dental\s*clinic|dental\s*hospital|dental\s*hospitals|implant\s*cent(?:er|re))\b/i],
    subvectors: [
      'Dental Clinics',
      'Dental Hospitals & Centers',
      'Orthodontic & Implant Centers',
      'Root Canal & Teeth Care Clinics',
      'Cosmetic Dentistry & Smile Studios'
    ],
    avoids: [
      'hospital', 'multispeciality', 'general hospital', 'children hospital', 'pediatric hospital',
      'maternity', 'gynec', 'gynaec', 'orthopedic', 'diagnostic', 'pathology', 'lab', 'laboratory',
      'x-ray', 'scan centre', 'scan center', 'blood bank', 'dialysis', 'cancer', 'skin clinic',
      'dermatology', 'ent clinic', 'physiotherapy', 'ayurvedic', 'homeopathy', 'psychiatry'
    ],
    anchors: ['dent', 'dental', 'dentist', 'teeth', 'tooth', 'orthodont', 'implant', 'oral', 'smile', 'b d s', 'm d s', 'bds', 'mds', 'maxillofacial', 'root canal', 'dentistry']
  },
  eye_care: {
    key: 'eye_care',
    label: 'Eye Hospitals & Ophthalmologists',
    patterns: [/\b(eye\s*hospital|eye\s*clinic|ophthalmologist|ophthalmology|eye\s*care|optometrist|lasik|cataract)\b/i],
    subvectors: [
      'Eye Hospitals',
      'Ophthalmology Clinics',
      'Laser & Lasik Eye Centers',
      'Optometry & Vision Care Clinics'
    ],
    avoids: ['dental', 'dentist', 'teeth', 'maternity', 'orthopedic', 'pathology lab', 'skin clinic', 'pediatric hospital'],
    anchors: ['eye', 'ophthal', 'vision', 'retina', 'cornea', 'cataract', 'lasik', 'optical']
  },
  pediatric: {
    key: 'pediatric',
    label: 'Children & Pediatric Hospitals',
    patterns: [/\b(pediatric|paediatric|child\s*specialist|children\s*hospital|infant\s*care)\b/i],
    subvectors: [
      'Children & Pediatric Hospitals',
      'Child Care & Vaccination Clinics',
      'Neonatal & Infant Care Centers'
    ],
    avoids: ['dental', 'dentist', 'teeth', 'eye hospital', 'orthopedic', 'adult', 'geriatric'],
    anchors: ['pediatric', 'paediatric', 'child', 'children', 'infant', 'neonatal', 'vaccination']
  },
  maternity_gynecology: {
    key: 'maternity_gynecology',
    label: 'Maternity Hospitals & Gynecologists',
    patterns: [/\b(gynecologist|gynaecologist|maternity|maternity\s*hospital|ivf|fertility|test\s*tube\s*baby|pregnancy)\b/i],
    subvectors: [
      'Maternity Hospitals',
      'Gynecology & Obstetrics Clinics',
      'IVF & Fertility Centers',
      'Fetal Medicine & Women Care'
    ],
    avoids: ['dental', 'dentist', 'teeth', 'eye hospital', 'orthopedic', 'men', 'mens health'],
    anchors: ['maternity', 'gynec', 'gynaec', 'obstetric', 'pregnancy', 'ivf', 'fertility', 'fetal']
  },
  orthopedic: {
    key: 'orthopedic',
    label: 'Orthopedic Hospitals & Joint Surgeons',
    patterns: [/\b(orthopedic|orthopaedic|bone\s*and\s*joint|joint\s*replacement|fracture|spine\s*center)\b/i],
    subvectors: [
      'Orthopedic Hospitals',
      'Joint Replacement Centers',
      'Spine & Fracture Clinics',
      'Bone & Sports Injury Care'
    ],
    avoids: ['dental', 'dentist', 'teeth', 'eye hospital', 'maternity', 'gynec', 'dermatology'],
    anchors: ['orthopedic', 'orthopaedic', 'joint', 'knee', 'spine', 'bone', 'fracture', 'arthroscopy']
  },
  diagnostic_pathology: {
    key: 'diagnostic_pathology',
    label: 'Diagnostic Centers & Pathology Labs',
    patterns: [/\b(pathology\s*lab|diagnostic\s*cent(?:er|re)|blood\s*test|clinical\s*laboratory|x\s*ray\s*lab|scan\s*cent(?:er|re)|mri|ct\s*scan)\b/i],
    subvectors: [
      'Diagnostic Centers & Pathology Labs',
      'Clinical & Blood Testing Laboratories',
      'Digital X-Ray & Imaging Centers',
      'MRI & CT Scan Diagnostics'
    ],
    avoids: ['dental', 'dentist', 'teeth', 'maternity', 'pediatric hospital', 'eye hospital', 'orthopedic'],
    anchors: ['diagnostic', 'pathology', 'lab', 'laboratory', 'blood test', 'x-ray', 'scan', 'mri', 'imaging']
  },
  dermatology: {
    key: 'dermatology',
    label: 'Dermatologists & Skin Clinics',
    patterns: [/\b(dermatologist|dermatology|skin\s*specialist|skin\s*clinic|cosmetologist|cosmetology)\b/i],
    subvectors: ['Skin & Dermatology Clinics', 'Cosmetology & Laser Clinics', 'Hair & Skin Care Centers'],
    avoids: ['dental', 'dentist', 'teeth', 'orthopedic', 'pediatric hospital', 'eye hospital'],
    anchors: ['derma', 'dermatologist', 'skin clinic', 'cosmetology', 'laser skin']
  },
  plumbing: {
    key: 'plumbing',
    label: 'Plumbers & Plumbing Contractors',
    patterns: [/\b(plumber|plumbers|plumbing|pipe\s*fitting|drainage\s*cleaning)\b/i],
    subvectors: ['Plumbers & Sanitary Contractors', 'Pipeline & Drainage Specialists', 'Bathroom Fitting & Water Tank Cleaners'],
    avoids: ['electrician', 'electrical', 'paint', 'painter', 'carpenter', 'interior', 'solar', 'cctv'],
    anchors: ['plumb', 'plumber', 'plumbing', 'pipe', 'drainage', 'sanitary repair', 'leakage']
  },
  electrical: {
    key: 'electrical',
    label: 'Electricians & Electrical Contractors',
    patterns: [/\b(electrician|electricians|electrical\s*contractor|wiring\s*works|motor\s*rewinding)\b/i],
    subvectors: ['Electricians & Home Wiring Contractors', 'Motor Rewinding & Electrical Repair', 'Industrial Electrical Contractors'],
    avoids: ['plumber', 'pipe', 'paint', 'painter', 'carpenter', 'furniture', 'pest control'],
    anchors: ['electrician', 'electrical', 'wiring', 'switchgear', 'motor rewinding']
  },
  painting: {
    key: 'painting',
    label: 'Painting Contractors & Whitewash',
    patterns: [/\b(painter|painters|house\s*painting|wall\s*painter|whitewash)\b/i],
    subvectors: ['House Painting Contractors', 'Wall Texture & Waterproofing Painters', 'Whitewash & Commercial Painters'],
    avoids: ['plumber', 'electrician', 'carpenter', 'pest control'],
    anchors: ['paint', 'painter', 'painting', 'whitewash', 'wall paint', 'texture']
  },
  cctv_security: {
    key: 'cctv_security',
    label: 'CCTV & Security Surveillance',
    patterns: [/\b(cctv|surveillance|security\s*camera|biometric|dvr|nvr|access\s*control)\b/i],
    subvectors: ['CCTV Camera Dealers & Installers', 'Security Surveillance & DVR Setup', 'Biometric & Access Control Systems'],
    avoids: ['laptop store', 'computer showroom', 'photo studio', 'mobile repair'],
    anchors: ['cctv', 'surveillance', 'security camera', 'biometric', 'dvr', 'nvr', 'hikvision', 'cp plus']
  },
  photography_studio: {
    key: 'photography_studio',
    label: 'Photography & Photo Studios',
    patterns: [/\b(wedding\s*photograph|photo\s*studio|candid\s*photograph|photoshoot|videograph|photographer|photography|drone\s*shoot|digital\s*studio|portrait\s*studio|camera\s*rent)\b/i],
    subvectors: [
      'Wedding & Candid Photographers',
      'Professional Photo Studios & Digital Labs',
      'Pre Wedding & Maternity Photoshoots',
      'Drone Videographers & Cinematographers',
      'Event & Birthday Photographers',
      'Portrait & Passport Size Photo Studios',
      'Baby Shoots & Kids Photography',
      'Cinematic Video Editors & Album Makers',
      'Commercial & Product Photographers'
    ],
    avoids: ['banquet', 'function hall', 'caterer', 'makeup', 'xerox', 'photocopy', 'framing', 'cctv'],
    anchors: ['photograph', 'photo studio', 'candid', 'photoshoot', 'cinematograph', 'videograph', 'drone shoot']
  },
  venues_function_halls: {
    key: 'venues_function_halls',
    label: 'Function Halls & Venues',
    patterns: [/\b(function\s*hall|banquet\s*hall|kalyana\s*mandapam|convention\s*cent(?:er|re)|marriage\s*hall)\b/i],
    subvectors: ['AC Function Halls & Banquet Halls', 'Kalyana Mandapams & Marriage Halls', 'Convention Centers & Event Venues'],
    avoids: ['photographer', 'photo studio', 'caterer', 'makeup', 'electronics', 'appliance'],
    anchors: ['function hall', 'banquet', 'mandapam', 'convention', 'marriage hall', 'party hall', 'auditorium']
  },
  catering: {
    key: 'catering',
    label: 'Catering Services',
    patterns: [/\b(caterer|caterers|catering|wedding\s*cater|outdoor\s*catering)\b/i],
    subvectors: ['Wedding Caterers', 'Outdoor & Event Catering Services', 'Buffet & Corporate Caterers'],
    avoids: ['restaurant', 'hotel', 'lodge', 'function hall', 'photo studio'],
    anchors: ['caterer', 'caterers', 'catering', 'food contract']
  },
  biryani_restaurant: {
    key: 'biryani_restaurant',
    label: 'Biryani & Mandi Restaurants',
    patterns: [/\b(biryani|dum\s*biryani|mandi\s*house|hyderabadi\s*biryani)\b/i],
    subvectors: ['Hyderabadi Dum Biryani Restaurants', 'Mandi & Arabian Restaurants', 'Biryani & Kebab Centers'],
    avoids: ['bakery', 'cake shop', 'pure veg', 'sweet shop', 'ice cream'],
    anchors: ['biryani', 'mandi', 'dum biryani', 'kebab']
  },
  bakery_cakes: {
    key: 'bakery_cakes',
    label: 'Bakeries & Cake Shops',
    patterns: [/\b(bakery|bakers|cake\s*shop|pastry\s*shop|confectionery)\b/i],
    subvectors: ['Bakeries & Live Cake Studios', 'Pastry & Confectionery Shops', 'Designer & Birthday Cake Bakers'],
    avoids: ['biryani', 'bar', 'wine', 'pure veg restaurant', 'tiffin center'],
    anchors: ['bakery', 'bakers', 'bake', 'cake', 'pastry', 'confection']
  },
  lawyer_advocate: {
    key: 'lawyer_advocate',
    label: 'Advocates & Legal Services',
    patterns: [/\b(advocate|advocates|lawyer|lawyers|law\s*firm|legal\s*consultant)\b/i],
    subvectors: ['Advocates & Legal Advisors', 'High Court Advocates & Law Chambers', 'Civil & Criminal Law Firms'],
    avoids: ['chartered accountant', 'ca firm', 'tax consultant', 'real estate broker'],
    anchors: ['advocate', 'lawyer', 'law firm', 'legal associates', 'attorney']
  },
  candid_wedding_photography: {
    key: 'candid_wedding_photography',
    label: 'Candid Wedding Photographers',
    patterns: [/\b(candid\s*photograph|candid\s*wedding|pre\s*wedding\s*shoot|destination\s*wedding\s*photograph)\b/i],
    subvectors: [
      'Candid Wedding Photographers',
      'Pre Wedding Cinematic Photoshoots',
      'Destination Wedding Photography Studios',
      'Candid Film & Video Teams'
    ],
    avoids: ['xerox', 'photocopy', 'passport size only', 'flex printing', 'framing shop', 'cctv'],
    anchors: ['candid', 'wedding photographer', 'pre wedding', 'cinematic']
  },
  drone_videography: {
    key: 'drone_videography',
    label: 'Drone Videographers',
    patterns: [/\b(drone\s*shoot|drone\s*videograph|aerial\s*videograph|drone\s*camera)\b/i],
    subvectors: [
      '4K Drone Videographers',
      'Aerial Drone Cinematographers',
      'Event Drone Shoot Teams',
      'Drone Survey & Filmmakers'
    ],
    avoids: ['studio portrait', 'passport photo', 'album printing', 'framing'],
    anchors: ['drone', 'aerial', 'cinematography', '4k shoot']
  },
  baby_photoshoot: {
    key: 'baby_photoshoot',
    label: 'Baby & Kids Photoshoots',
    patterns: [/\b(baby\s*shoot|baby\s*photograph|newborn\s*photograph|infant\s*photograph|kids\s*photograph)\b/i],
    subvectors: [
      'Baby Photoshoot Studios',
      'Newborn & Infant Photography',
      'Maternity & Toddler Photoshoots',
      'Kids Birthday Photoshoot Studios'
    ],
    avoids: ['drone shoot', 'wedding photography only', 'cctv', 'passport photo'],
    anchors: ['baby shoot', 'newborn', 'kids photography', 'maternity']
  },
  camera_dslr_gear: {
    key: 'camera_dslr_gear',
    label: 'Camera & DSLR Stores',
    patterns: [/\b(camera\s*shop|camera\s*store|dslr\s*camera|camera\s*lens|camera\s*repair|mirrorless\s*camera)\b/i],
    subvectors: [
      'Camera Showrooms & Multi-Brand DSLR Stores',
      'Mirrorless Cameras & Cinema Rig Dealers',
      'Camera Lens, Gimbal & Drone Equipment Stores',
      'Camera & Lens Repair / Sensor Cleaning Centers'
    ],
    avoids: ['cctv', 'security camera', 'surveillance', 'biometric', 'dvr', 'nvr', 'mobile repair'],
    anchors: ['camera shop', 'dslr', 'mirrorless', 'camera lens', 'canon', 'nikon', 'sony alpha']
  },
  pure_veg_restaurant: {
    key: 'pure_veg_restaurant',
    label: 'Pure Veg Restaurants',
    patterns: [/\b(pure\s*veg|vegetarian\s*restaurant|jain\s*food|south\s*indian\s*thali|veg\s*meals)\b/i],
    subvectors: [
      'Pure Vegetarian Family Dining',
      'Traditional South Indian Meals & Thali',
      'North Indian Pure Veg Restaurants',
      'Jain Meals & Sattvic Dining'
    ],
    avoids: ['biryani', 'chicken', 'non veg', 'bar', 'butcher', 'meat shop'],
    anchors: ['pure veg', 'vegetarian', 'veg restaurant', 'thali', 'brahmin meals']
  },
  cafe_coffee_shop: {
    key: 'cafe_coffee_shop',
    label: 'Cafes & Coffee Shops',
    patterns: [/\b(cafe|cafes|coffee\s*shop|coffee\s*shops|espresso\s*bar|tea\s*lounge)\b/i],
    subvectors: [
      'Specialty Coffee Shops',
      'Artisan Cafes & Espresso Bars',
      'Boutique Co-working Cafes',
      'Tea & Snack Lounges'
    ],
    avoids: ['biryani', 'meals mess', 'dhaba', 'bar', 'butcher'],
    anchors: ['cafe', 'coffee', 'espresso', 'tea lounge']
  },
  tiffin_breakfast: {
    key: 'tiffin_breakfast',
    label: 'Tiffin & Breakfast Centers',
    patterns: [/\b(tiffin|tiffins|breakfast\s*center|idli\s*dosa|tiffin\s*hotel)\b/i],
    subvectors: [
      'South Indian Tiffin Centers',
      'Breakfast Idli Dosa Points',
      'Morning Tiffin Hotels & Fast Food'
    ],
    avoids: ['biryani', 'bar', 'bakery cake', 'meat shop'],
    anchors: ['tiffin', 'breakfast', 'idli', 'dosa']
  },
  cables_switchgear: {
    key: 'cables_switchgear',
    label: 'Cables & Switchgear',
    patterns: [/\b(cables?\s*and\s*wires?|switchgear|industrial\s*panel|ht\s*lt\s*cables?|polycab|finolex|havells)\b/i],
    subvectors: [
      'Authorized Cable & Wire Distributors',
      'Industrial Switchgear Dealers',
      'HT/LT Electrical Cable Suppliers',
      'Electric Control Panels & Switchgear'
    ],
    avoids: ['home appliance repair', 'mobile repair', 'plumber', 'sanitaryware'],
    anchors: ['cables', 'wires', 'switchgear', 'polycab', 'finolex', 'industrial panel']
  },
  inverter_battery: {
    key: 'inverter_battery',
    label: 'Inverter & Batteries',
    patterns: [/\b(inverter|inverters|inverter\s*battery|ups\s*battery|luminous|exide|amaron)\b/i],
    subvectors: [
      'Inverter & Battery Dealers',
      'Luminous & Exide Battery Showrooms',
      'Solar Inverter & Online UPS Suppliers',
      'Car & Inverter Battery Replacement'
    ],
    avoids: ['mobile battery only', 'watch battery', 'laptop shop'],
    anchors: ['inverter', 'battery', 'luminous', 'exide', 'amaron', 'ups']
  },
  industrial_lighting: {
    key: 'industrial_lighting',
    label: 'Industrial & LED Lighting',
    patterns: [/\b(industrial\s*lighting|led\s*lights?|flood\s*lights?|commercial\s*lighting|street\s*lights?)\b/i],
    subvectors: [
      'Commercial LED Lighting Showrooms',
      'Industrial Flood Lights & High Bay Fixtures',
      'Architectural & Decorative Lighting Suppliers',
      'Street Light & Solar LED Suppliers'
    ],
    avoids: ['car light', 'camera light', 'plumber'],
    anchors: ['led lights', 'industrial lighting', 'flood light', 'commercial fixtures']
  },
  computer_laptop_repair: {
    key: 'computer_laptop_repair',
    label: 'Laptop & Computer Repair',
    patterns: [/\b(laptop\s*repair|computer\s*repair|screen\s*replacement|motherboard\s*repair|laptop\s*service)\b/i],
    subvectors: [
      'Laptop Chip-Level Repair Centers',
      'Screen & Motherboard Replacement Centers',
      'Computer & Laptop OS / Data Recovery Services',
      'Authorised Laptop Service Centers'
    ],
    avoids: ['cctv installation', 'mobile repair only', 'tv repair', 'appliances'],
    anchors: ['repair service', 'computer repair', 'laptop repair', 'computer service', 'laptop service', 'pc repair', 'macbook repair', 'chip level', 'motherboard repair', 'screen replacement', 'data recovery', 'it repair', 'laptop care', 'computer clinic'],
    tokenGroups: [['laptop', 'computer', 'desktop', 'macbook', 'pc', 'motherboard'], ['repair', 'service', 'care', 'fix', 'recovery', 'clinic', 'technician']]
  },
  gaming_pc_builders: {
    key: 'gaming_pc_builders',
    label: 'Gaming PC Builders & Rigs',
    patterns: [/\b(gaming\s*pc|pc\s*builder|custom\s*pc|gaming\s*rig|gpu\s*dealer)\b/i],
    subvectors: [
      'Custom Gaming PC Builders',
      'Graphic Card & Liquid Cooling Specialists',
      'High Performance Desktop PC Stores',
      'Gaming Peripherals & Mechanical Keyboards'
    ],
    avoids: ['cctv', 'mobile repair', 'photocopy'],
    anchors: ['gaming pc', 'pc builder', 'custom pc', 'graphic card']
  },
  mobile_phone_repair: {
    key: 'mobile_phone_repair',
    label: 'Mobile Phone Repair & Service',
    patterns: [/\b(mobile\s*(?:phone\s*)?repair|phone\s*repair|cell\s*phone\s*repair|smartphone\s*repair|mobile\s*service|phone\s*service|iphone\s*(?:repair|service)|display\s*replacement|screen\s*change|screen\s*replacement)\b/i],
    subvectors: [
      'Mobile phone repair shop',
      'Mobile Phone Repair & Service Centers',
      'Phone Screen & Display Replacement Centers',
      'iPhone & Smartphone Service Centers',
      'Chip-Level Mobile Repair & Glass Change',
      'Phone Repair Service'
    ],
    avoids: ['automobile garage', 'car repair', 'auto repair', 'cctv installation'],
    anchors: [
      'mobile phone repair', 'phone repair', 'mobile repair', 'cell phone repair',
      'smartphone repair', 'iphone repair', 'iphone service', 'mobile service', 'phone service',
      'mobile care', 'phone care', 'phone fix', 'ifix', 'icore', 'icare',
      'screen replacement', 'display change', 'display replacement', 'glass change',
      'touch & display', 'mobile clinic', 'mobile point', 'cell point', 'mobile solution'
    ],
    tokenGroups: [
      ['mobile', 'phone', 'cell', 'cellphone', 'smartphone', 'iphone', 'android', 'display', 'screen', 'touch'],
      ['repair', 'service', 'care', 'fix', 'clinic', 'point', 'solution', 'unlock', 'doctor', 'hub', 'center', 'centre', 'shop']
    ]
  },
  mobile_phone_shop: {
    key: 'mobile_phone_shop',
    label: 'Mobile Phone Shops & Showrooms',
    patterns: [/\b(mobile\s*(?:phone\s*)?(?:shop|shops|store|stores|showroom|showrooms|dealer|dealers|retail|world|hub|zone)|smartphone\s*(?:shop|store|showroom)|cell\s*phone\s*store|phone\s*(?:shop|store|showroom))\b/i],
    subvectors: [
      'Mobile Phone Showrooms & Multi-Brand Stores',
      'Cell Phone Store & Smartphone Dealers',
      'Authorised Mobile Distributors & Retail Hubs',
      'Mobile Phone Accessories & Gadgets'
    ],
    avoids: ['automobile', 'car showroom', 'tyre', 'tractor'],
    anchors: [
      'mobile', 'mobiles', 'cell phone', 'cellphone', 'smartphone', 'iphone', 'telecom', 'telecome',
      'sangeetha', 'poorvika', 'lot mobiles', 'big c', 'happi', 'aptronics', 'croma', 'reliance digital',
      'phone shop', 'phone store', 'cellular', 'mobile store', 'mobile shop', 'mobile showroom'
    ],
    tokenGroups: [
      ['mobile', 'mobiles', 'phone', 'phones', 'cell', 'cellphone', 'smartphone', 'iphone', 'telecom', 'cellular'],
      ['shop', 'store', 'showroom', 'mart', 'world', 'hub', 'zone', 'planet', 'palace', 'junction', 'gallery', 'point', 'dealer', 'retail', 'communications']
    ]
  },
  tmt_steel: {
    key: 'tmt_steel',
    label: 'TMT Steel & Structural Iron',
    patterns: [/\b(tmt\s*steel|tmt\s*bars?|iron\s*and\s*steel|structural\s*steel|steel\s*traders?)\b/i],
    subvectors: [
      'Iron & Steel TMT Dealers',
      'TMT Bar Distributors & Stockists (Tata Tiscon, JSW, Jindal)',
      'Structural Steel, Angles & Channels Wholesalers',
      'Steel Pipes, Tubes & MS Sheets Wholesalers'
    ],
    avoids: ['tiles', 'granite', 'paint', 'plywood', 'cement', 'sanitaryware'],
    anchors: ['tmt steel', 'tmt bars', 'iron and steel', 'tata tiscon', 'jsw steel']
  },
  cement_stockists: {
    key: 'cement_stockists',
    label: 'Cement Wholesalers & Dealers',
    patterns: [/\b(cement\s*dealer|cement\s*stockist|cement\s*wholesale|ultratech|acc\s*cement|ramco\s*cement)\b/i],
    subvectors: [
      'Cement Wholesalers & Stockists (UltraTech, ACC, Ramco)',
      'Bulk Cement Suppliers for Construction',
      'Authorized Cement Dealers'
    ],
    avoids: ['tmt steel', 'tiles', 'sanitaryware', 'paint'],
    anchors: ['cement dealer', 'cement stockist', 'ultratech', 'acc cement']
  },
  ac_repair_hvac: {
    key: 'ac_repair_hvac',
    label: 'AC Repair & HVAC Services',
    patterns: [/\b(ac\s*repair|ac\s*service|ac\s*installation|air\s*conditioner\s*repair|hvac)\b/i],
    subvectors: [
      'AC Repair & Servicing Technicians',
      'Air Conditioning Installation & Gas Filling',
      'Commercial HVAC Maintenance & Ducting',
      'Inverter AC PCB Board Repair'
    ],
    avoids: ['plumber', 'painting', 'carpentry', 'pest control'],
    anchors: ['ac repair', 'ac service', 'air condition', 'hvac', 'cooling', 'refrigeration', 'gas filling', 'chill']
  },
  pest_control: {
    key: 'pest_control',
    label: 'Pest Control Services',
    patterns: [/\b(pest\s*control|termite\s*treatment|cockroach\s*control|bed\s*bug\s*treatment)\b/i],
    subvectors: [
      'Termite & Pest Control Services',
      'Cockroach & Bed Bug Disinfection Specialists',
      'Commercial Herbal Pest Control Services',
      'Anti-Termite Pre-Construction Treatment'
    ],
    avoids: ['plumber', 'electrician', 'painting', 'carpenter'],
    anchors: ['pest', 'termite', 'cockroach', 'disinfect', 'fumigat', 'exterminat']
  },
  packers_movers: {
    key: 'packers_movers',
    label: 'Packers and Movers',
    patterns: [/\b(packers\s*and\s*movers|packers\s*&\s*movers|house\s*shifting|household\s*relocation)\b/i],
    subvectors: [
      'Packers & Movers Household Shifting Services',
      'Intercity Relocation & Transport Services',
      'Office Shifting & Corporate Movers',
      'Car & Bike Transport Carriers'
    ],
    avoids: ['courier parcel only', 'taxi only', 'travel agency'],
    anchors: ['packer', 'mover', 'moving', 'shifting', 'relocation', 'logistics', 'transport']
  },
  borewell_drilling: {
    key: 'borewell_drilling',
    label: 'Borewell Drilling & Submersibles',
    patterns: [/\b(borewell|bore\s*well|submersible\s*pump|borewell\s*drilling)\b/i],
    subvectors: [
      'Borewell Drilling Contractors',
      'Submersible Pump Dealers & Repair',
      'Borewell Cleaning & Flushing Services',
      'Agricultural & Commercial Borewell Drillers'
    ],
    avoids: ['home electrician only', 'interior design'],
    anchors: ['borewell', 'submersible pump', 'drilling contractor']
  },
  cardiology: {
    key: 'cardiology',
    label: 'Cardiologists & Heart Hospitals',
    patterns: [/\b(cardiology|cardiologist|heart\s*hospital|heart\s*specialist|ecg|echo|angioplasty)\b/i],
    subvectors: [
      'Cardiology Hospitals & Heart Surgery Centers',
      'Consultant Cardiologists & Heart Clinics',
      'ECG, Echo & TMT Cardiac Diagnostic Centers'
    ],
    avoids: ['dental', 'eye care', 'orthopedic', 'dermatology'],
    anchors: ['cardio', 'heart specialist', 'cardiology hospital', 'ecg']
  },
  ent_specialist: {
    key: 'ent_specialist',
    label: 'ENT Specialists',
    patterns: [/\b(ent\s*specialist|ent\s*clinic|ent\s*hospital|ear\s*nose\s*throat|audiologist|hearing\s*aid)\b/i],
    subvectors: [
      'ENT (Ear Nose Throat) Specialist Clinics',
      'ENT Hospitals & Micro Ear Surgery Centers',
      'Hearing Aid Clinics & Audiology Centers'
    ],
    avoids: ['dental', 'eye care', 'orthopedic', 'dermatology'],
    anchors: ['ent clinic', 'ent specialist', 'ear nose throat', 'hearing aid']
  },
  neurology_spine: {
    key: 'neurology_spine',
    label: 'Neurologists & Spine Centers',
    patterns: [/\b(neurologist|neurology|neuro\s*hospital|neurosurgery|brain\s*and\s*spine)\b/i],
    subvectors: [
      'Neurology & Brain Care Hospitals',
      'Neurosurgeons & Spine Surgery Centers',
      'Neurology Consultation Clinics'
    ],
    avoids: ['dental', 'eye care', 'dermatology', 'skin clinic'],
    anchors: ['neuro', 'neurologist', 'neurosurgery', 'brain care']
  },
  pharmacy_chemist: {
    key: 'pharmacy_chemist',
    label: 'Pharmacies & Chemists',
    patterns: [/\b(pharmacy|pharmacies|medical\s*store|medical\s*stores|chemist|chemists|drug\s*store)\b/i],
    subvectors: [
      '24 Hours Open Pharmacies',
      'Retail Medical Stores & Chemists',
      'Wholesale Medicine Distributors & Stockists',
      'Surgical Equipment & Medical Device Dealers'
    ],
    avoids: ['hospital in-patient', 'surgery center', 'dental clinic'],
    anchors: ['pharmacy', 'medical store', 'chemist', 'drugstore']
  },
  gyms_fitness: {
    key: 'gyms_fitness',
    label: 'Gyms & Fitness Centers',
    patterns: [/\b(gym|gyms|fitness\s*center|fitness\s*club|crossfit|workout|weight\s*training)\b/i],
    subvectors: [
      'Gyms & Fitness Centers',
      'Crossfit & Functional Strength Studios',
      'Ladies Fitness & Weight Loss Gyms',
      'Personal Training & Bodybuilding Gyms'
    ],
    avoids: ['sports equipment wholesale only', 'yoga only'],
    anchors: ['gym', 'fitness center', 'workout', 'weight training']
  },
  yoga_meditation: {
    key: 'yoga_meditation',
    label: 'Yoga & Meditation Studios',
    patterns: [/\b(yoga|yoga\s*center|yoga\s*studio|meditation|pranayama)\b/i],
    subvectors: [
      'Yoga Studios & Wellness Centers',
      'Traditional Hatha & Vinyasa Yoga Classes',
      'Meditation & Mindfulness Centers'
    ],
    avoids: ['bodybuilding gym only', 'sports store'],
    anchors: ['yoga studio', 'yoga center', 'meditation']
  },
  salons_beauty_parlour: {
    key: 'salons_beauty_parlour',
    label: 'Beauty Parlours & Salons',
    patterns: [/\b(beauty\s*parlour|beauty\s*parlor|ladies\s*salon|hair\s*salon|hair\s*stylist)\b/i],
    subvectors: [
      'Beauty Parlours & Ladies Salons',
      'Unisex Hair Salons & Hair Stylists',
      'Bridal Makeup Artists & Pre-Bridal Care',
      'Hair Spa & Keratin Treatment Salons'
    ],
    avoids: ['chemical factory', 'hospital'],
    anchors: ['beauty parlour', 'ladies salon', 'hair salon', 'bridal makeup']
  },
  real_estate_agents: {
    key: 'real_estate_agents',
    label: 'Real Estate Agents & Brokers',
    patterns: [/\b(real\s*estate\s*agent|property\s*dealer|real\s*estate\s*broker|property\s*consultant)\b/i],
    subvectors: [
      'Real Estate Agents & Property Dealers',
      'Residential Apartment & Villa Brokers',
      'Commercial Property & Office Space Leasing',
      'Open Plots & Gated Community Property Consultants'
    ],
    avoids: ['civil contractor only', 'building material store'],
    anchors: ['real estate agent', 'property dealer', 'property consultant']
  },
  builders_civil_contractors: {
    key: 'builders_civil_contractors',
    label: 'Builders & Civil Contractors',
    patterns: [/\b(builder|builders|civil\s*contractor|construction\s*company|building\s*contractor)\b/i],
    subvectors: [
      'Builders & Civil Construction Contractors',
      'Residential Apartment Developers',
      'Commercial Building Construction Companies',
      'Villa & Duplex Home Contractors'
    ],
    avoids: ['hardware store only', 'paint store'],
    anchors: ['builder', 'civil contractor', 'construction company', 'developer']
  },
  car_mechanic_garages: {
    key: 'car_mechanic_garages',
    label: 'Car Mechanics & Multi-Brand Garages',
    patterns: [/\b(car\s*mechanic|car\s*service|car\s*garage|auto\s*repair|car\s*repair)\b/i],
    subvectors: [
      'Multi-Brand Car Mechanics & Garages',
      'Authorized Car Service Centers',
      'Car Suspension & Brake Repair Specialists',
      'Car Electrical & Engine Tuning Workshops'
    ],
    avoids: ['bike mechanic only', 'car showroom only', 'towing only'],
    anchors: ['car mechanic', 'car service', 'car garage', 'auto repair', 'automobile', 'workshop', 'mechanic', 'motors']
  },
  footwear_shoes: {
    key: 'footwear_shoes',
    label: 'Footwear & Shoes',
    patterns: [/\b(footwear|shoes\s*wholesale|shoe\s*showroom|leather\s*shoes|sports\s*shoes)\b/i],
    subvectors: [
      'Footwear Wholesalers & Distributors',
      'Multi-Brand Shoe Showrooms',
      'Sports Shoes & Sneaker Stores',
      'Formal Leather Shoes & Casual Footwear'
    ],
    avoids: ['clothing only', 'saree', 'steel', 'clinic'],
    anchors: ['footwear', 'shoe showroom', 'leather shoes', 'sports shoes']
  },
  sofas_furniture: {
    key: 'sofas_furniture',
    label: 'Sofas & Wooden Furniture',
    patterns: [/\b(furniture|wooden\s*furniture|sofas?|sofa\s*set|wardrobe|dining\s*table)\b/i],
    subvectors: [
      'Furniture Showrooms & Manufacturers',
      'Custom Sofa Makers & Recliner Studios',
      'Wooden Furniture & Teak Wood Works',
      'Modular Wardrobes & Dining Sets'
    ],
    avoids: ['steel tmt', 'turmeric', 'spices', 'clinic'],
    anchors: ['furniture', 'sofa', 'wooden furniture', 'wardrobe']
  },
  mattress_sleep: {
    key: 'mattress_sleep',
    label: 'Mattress & Sleep Studios',
    patterns: [/\b(mattress|mattresses|orthopedic\s*mattress|kurlon|sleepwell|wakefit)\b/i],
    subvectors: [
      'Mattress & Sleep Comfort Studios',
      'Orthopedic Memory Foam Mattress Stores',
      'Kurlon & Sleepwell Authorized Showrooms'
    ],
    avoids: ['steel', 'turmeric', 'clinic'],
    anchors: ['mattress', 'kurlon', 'sleepwell', 'orthopedic mattress']
  },
  jewellery_gold_diamonds: {
    key: 'jewellery_gold_diamonds',
    label: 'Jewellery & Gold Merchants',
    patterns: [/\b(jeweller|jewellers|jewellery|gold\s*shop|gold\s*merchant|bullion|diamond\s*jewellery)\b/i],
    subvectors: [
      'Jewellery Showrooms & Certified Hallmark Gold',
      'Gold & Diamond Jewellers',
      'Silver Jewellery & Article Showrooms',
      'Bullion Traders & Certified Gold Coins'
    ],
    avoids: ['pawn shop only', 'steel', 'turmeric', 'cement'],
    anchors: ['jeweller', 'jewellery', 'gold shop', 'diamond jewellery', 'bullion']
  },
  chartered_accountant: {
    key: 'chartered_accountant',
    label: 'Chartered Accountants',
    patterns: [/\b(chartered\s*accountant|ca\s*firm|statutory\s*audit|chartered\s*accountants)\b/i],
    subvectors: ['Chartered Accountants & CA Firms', 'Auditing & Statutory Compliance Firms'],
    avoids: ['advocate', 'lawyer', 'court', 'criminal lawyer'],
    anchors: ['chartered accountant', 'ca firm', 'auditor', 'statutory audit']
  }
};

function extractSpecificNiche(query) {
  const text = String(query || '').toLowerCase().trim();
  for (const [key, niche] of Object.entries(SPECIFIC_NICHES)) {
    if (niche.patterns.some(p => p.test(text))) {
      return { key, ...niche };
    }
  }
  return null;
}

module.exports = {
  SPECIFIC_NICHES,
  extractSpecificNiche
};
