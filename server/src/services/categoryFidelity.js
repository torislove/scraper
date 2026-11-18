/**
 * categoryFidelity.js
 *
 * The scraper must never answer a different question than the one the user
 * asked. Directories are noisy: a wedding-photographer search on a venue
 * directory happily returns banquet halls, and a Maps feed can include
 * "related" businesses. This module is the single gate that decides whether a
 * vendor actually matches the requested category.
 *
 * It is deliberately deterministic and conservative:
 *  - Generic UI labels ("Results", "Sponsored Listing") are always rejected.
 *  - A vendor whose own name/URL/category clearly belongs to another role in
 *    the same market (venue vs photographer vs caterer ...) is rejected.
 *  - If the role cannot be determined, the vendor is kept. We never invent a
 *    rejection when there is no evidence.
 */

const GENERIC_NAME = /^(?:results?|search results?|top results?|sponsored(?: listing| by)?|advertisement|ad\b|featured(?: listing)?|listing(?: results?)?|view all|load more|show more|booking\.com\??|justdial|indiamart|weddingbazaar|mandap\.com|sulekha|near me|best .* near me|top\s+\d+.*|best\s+\d+.*|\d+\s+best.*|list\s+of\s+.*)$/i;

function clean(value) {
  return String(value == null ? '' : value)
    // JustDial and Google sometimes embed private-use icon glyphs / emoji
    // variation selectors in labels ("Sponsored", "Results").
    .replace(/[\uE000-\uF8FF\u200B-\u200F\uFE0F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function norm(value) {
  return clean(value).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasAny(text, words) {
  if (!text || !Array.isArray(words)) return false;
  const lower = text.toLowerCase();
  return words.some(word => {
    if (!word) return false;
    const w = word.toLowerCase().trim();
    if (!w) return false;
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Every token must start on a word boundary. Suffixes are still allowed so
    // "dentist" matches "dentists" and "decor" matches "decorators", but a
    // token can no longer match *inside* an unrelated word: "oral" must never
    // match "floral", and "ac" must never match "practice".
    if (w.length <= 3) {
      return new RegExp('(?:^|[\\s,;./\\[\\]()#+-])' + escaped + '(?:[\\s,;./\\[\\]()#+-]|$)', 'i').test(lower);
    }
    return new RegExp('(?:^|[\\s,;./\\[\\]()#+-])' + escaped, 'i').test(lower);
  });
}

const ROLES = [
  {
    id: 'album_printing',
    label: 'Album Printing & Color Lab',
    match: ['album printing', 'wedding album printing', 'album print', 'album lab', 'color lab', 'colour lab', 'digital color lab', 'digital album', 'photo album maker', 'album manufacturing', 'photo book printing', 'photobook', 'photo book', 'karizma album', 'canvera', 'album binding', 'photo printing lab', 'photo printing press', 'album maker', 'photo album'],
    wants: ['album', 'color lab', 'colour lab', 'printing lab', 'print lab', 'digital lab', 'photo lab', 'album lab', 'photobook', 'photo book', 'karizma', 'canvera', 'press', 'offset', 'printing works', 'album maker', 'album manufacture', 'binding', 'lamination', 'digital press', 'print solution', 'photo print', 'photo printing', 'printing services', 'printing'],
    avoids: ['photo studio', 'photography studio', 'wedding photographer', 'wedding photography', 'candid photography', 'candid photographer', 'cinematography', 'videography', 'video shoot', 'photoshoot', 'photo shoot', 'banquet', 'function hall', 'kalyana mandapam', 'mandapam', 'convention hall', 'caterer', 'catering', 'decorator', 'makeup']
  },
  {
    id: 'printing',
    label: 'Printing & Press',
    match: ['printing', 'printing press', 'flex printing', 'offset printing', 'digital printing', 'screen printing', 'visiting card printing', 'banner printing', 'brochure printing', 'dtp works', 'pamphlet printing'],
    wants: ['printing', 'printer', 'printers', 'press', 'offset', 'flex', 'banner', 'dtp', 'graphics', 'screen printing', 'digital printing', 'visiting card', 'brochure', 'lamination', 'binding'],
    avoids: ['photo studio', 'wedding photographer', 'banquet', 'function hall', 'caterer', 'makeup']
  },
  {
    id: 'photographer',
    label: 'Photography',
    match: ['photograph', 'photographer', 'photography', 'photo studio', 'photo studios', 'photo shoot', 'photoshoot', 'videograph', 'videographer', 'cinematograph', 'candid photography', 'drone photography', 'digital studio', 'camera'],
    wants: ['photograph', 'photography', 'photo studio', 'photoshoot', 'photo shoot', 'videograph', 'videographer', 'cinematograph', 'candid', 'digital studio', 'digital photo lab', 'portrait studio', 'wedding studio'],
    avoids: [
      'banquet', 'function hall', 'kalyana mandapam', 'mandapam', 'convention hall', 'convention center',
      'convention', 'marriage hall', 'wedding hall', 'party hall', 'wedding venue', 'event venue', 'venue', 'venues',
      'lawns', 'resort', 'hotel', 'restaurant', 'caterer', 'catering', 'decorator', 'decoration', 'makeup', 'make up', 'mehendi',
      'mehndi', 'invitation', 'tent house', 'travels', 'jewell', 'jewel', 'bakery', 'sweet',
      'bridal shop', 'bridal store', 'bridal salon',
      'xerox', 'photocopy', 'colour print', 'color print', 'flex print', 'offset', 'meeseva', 'mee seva',
      'digital seva', 'internet cafe', 'internet center', 'photo frame', 'framing', 'glass house', 'cctv', 'mobile repair'
    ]
  },
  {
    id: 'venue',
    label: 'Venue',
    match: ['banquet', 'function hall', 'function halls', 'ac function hall', 'ac function halls', 'kalyana mandapam', 'mandapam', 'convention hall', 'convention center', 'convention centers', 'convention centre', 'convention centres', 'ac convention centre', 'ac convention center', 'ac convention centres', 'ac convention centers', 'marriage hall', 'marriage halls', 'ac marriage hall', 'wedding hall', 'wedding venue', 'party hall', 'party halls', 'reception hall', 'lawns', 'farm house', 'resort', 'event venue', 'function room', 'community hall', 'community halls', 'auditorium', 'shadi mahal'],
    wants: ['banquet', 'function hall', 'function halls', 'kalyana', 'mandapam', 'mandap', 'convention', 'convention centre', 'convention center', 'convention centres', 'convention centers', 'marriage hall', 'marriage halls', 'wedding hall', 'party hall', 'party halls', 'reception hall', 'lawns', 'farm house', 'resort', 'venue', 'venues', 'auditorium', 'community hall', 'shadi mahal', 'palace', 'gardens', 'inn', 'hotel', 'residency', 'lodge'],
    avoids: ['photograph', 'photography', 'photo studio', 'videograph', 'cinematograph', 'caterer', 'catering service', 'decorator', 'decoration', 'makeup', 'make up', 'mehendi', 'mehndi', 'dj ', 'invitation card', 'bakery', 'ac repair', 'ac service', 'air conditioner dealer', 'air conditioning repair', 'air conditioner repair', 'ac dealer', 'hvac', 'compressor', 'refrigerator', 'fridge', 'electronics', 'electronic', 'appliance', 'appliances', 'sonovision', 'vijaydigital', 'croma', 'bajaj electronics', 'reliance digital', 'vijay sales', 'mattupalli', 'mobile store', 'mobile shop', 'motor dealer', 'car dealer', 'truck dealer', 'vehicle dealer', 'automobile', 'servo', 'hardware', 'computer shop', 'laptop shop', 'repair shop', 'retail and repair']
  },
  {
    id: 'caterer',
    label: 'Catering',
    match: ['caterer', 'catering', 'catering service', 'food catering'],
    wants: ['caterer', 'catering', 'catering service', 'food'],
    avoids: ['banquet hall', 'function hall', 'kalyana mandapam', 'mandapam', 'convention hall', 'marriage hall', 'wedding hall', 'party hall', 'lawns', 'resort', 'hotel ', 'photograph', 'photo studio', 'videograph', 'decorator', 'makeup']
  },
  {
    id: 'decorator',
    label: 'Decoration',
    match: ['decorator', 'decoration', 'flower decoration', 'stage decoration', 'event decor'],
    wants: ['decorator', 'decoration', 'decor', 'flower', 'stage'],
    avoids: ['banquet hall', 'function hall', 'kalyana mandapam', 'convention hall', 'marriage hall', 'wedding hall', 'party hall', 'lawns', 'resort', 'hotel ', 'photograph', 'photo studio', 'caterer', 'catering', 'makeup']
  },
  {
    id: 'makeup',
    label: 'Makeup',
    match: ['makeup', 'make up', 'makeup artist', 'bridal makeup', 'hair stylist', 'beautician'],
    wants: ['makeup', 'make up', 'makeup artist', 'bridal makeup', 'hair', 'beauty', 'beautician', 'salon'],
    avoids: ['banquet hall', 'function hall', 'kalyana mandapam', 'convention hall', 'marriage hall', 'wedding hall', 'party hall', 'lawns', 'resort', 'hotel ', 'photograph', 'photo studio', 'caterer', 'decorator']
  },
  {
    id: 'planner',
    label: 'Event planning',
    match: ['wedding planner', 'event planner', 'event management', 'wedding planning', 'event organiser', 'event organizer'],
    wants: ['planner', 'planning', 'event management', 'event organiser', 'event organizer', 'events'],
    avoids: ['banquet hall', 'function hall', 'kalyana mandapam', 'convention hall', 'marriage hall', 'wedding hall', 'party hall', 'lawns', 'resort', 'hotel ', 'photograph', 'photo studio', 'caterer', 'decorator', 'makeup']
  },
  {
    id: 'invitation',
    label: 'Invitations',
    match: ['invitation', 'invitation card', 'wedding card', 'invitation printing'],
    wants: ['invitation', 'wedding card', 'printing', 'cards'],
    avoids: ['banquet hall', 'function hall', 'kalyana mandapam', 'convention hall', 'marriage hall', 'wedding hall', 'party hall', 'lawns', 'resort', 'hotel ', 'photograph', 'photo studio', 'caterer', 'decorator']
  },
  {
    id: 'music',
    label: 'Music & DJ',
    match: ['dj', 'disc jockey', 'wedding band', 'music band', 'orchestra', 'sangeet'],
    wants: ['dj', 'disc jockey', 'band', 'orchestra', 'music', 'sound', 'sangeet'],
    avoids: ['banquet hall', 'function hall', 'kalyana mandapam', 'convention hall', 'marriage hall', 'wedding hall', 'party hall', 'lawns', 'resort', 'hotel ', 'photograph', 'photo studio', 'caterer', 'decorator']
  },
  {
    id: 'plumber',
    label: 'Plumber & Sanitary',
    match: ['plumber', 'plumbing', 'sanitary', 'pipe fitting', 'water tank cleaner', 'drainage', 'borewell plumber'],
    wants: ['plumb', 'plumber', 'plumbing', 'pipe fitting', 'sanitary service', 'drain', 'tap repair', 'water tank clean', 'leakage', 'borewell', 'pipeline', 'sewer', 'bathroom fitting', 'water supply repair'],
    avoids: ['wholesale', 'market', 'traders', 'dealer', 'interior', 'interiors', 'solar', 'battery', 'batteries', 'ups', 'inverter', 'paint', 'paints', 'painter', 'painting', 'cctv', 'camera', 'security cam', 'furniture', 'cupboard', 'wardrobe', 'wallpaper', 'media', 'pixel', 'photo', 'studio', 'wedding', 'jewel', 'beauty', 'salon', 'glass shop', 'architect', 'architecture', 'air condition', 'catering', 'restaurant', 'sweet', 'electronics', 'electronic', 'technologies', 'construction', 'tailor', 'boutique', 'car repair', 'dentist', 'clinic', 'hospital']
  },
  {
    id: 'electrician',
    label: 'Electrician',
    match: ['electrician', 'electrical', 'wiring', 'motor rewinding', 'electrical contractor'],
    wants: ['electric', 'electrician', 'electrical', 'wiring', 'wire', 'switch', 'panel', 'lighting', 'rewind', 'motor'],
    avoids: ['plumb', 'sanitary', 'pipe', 'interior', 'solar panel', 'furniture', 'cupboard', 'photo', 'wedding', 'catering', 'beauty', 'salon', 'glass shop', 'architect', 'paint', 'wallpaper', 'boutique']
  },
  {
    id: 'painter',
    label: 'Painting',
    match: ['painter', 'painting', 'whitewash', 'wall painter', 'painting contractor'],
    wants: ['paint', 'painter', 'painting', 'whitewash', 'wall paint', 'color', 'texture', 'waterproofing'],
    avoids: ['plumb', 'electrician', 'solar', 'battery', 'furniture', 'photo', 'cctv', 'interior designer', 'caterer', 'venue', 'jewel', 'car repair', 'dentist']
  },
  {
    id: 'interior',
    label: 'Interior Design',
    match: ['interior', 'interiors', 'modular kitchen', 'false ceiling', 'interior decorator', 'home interiors', 'cupboard design'],
    wants: ['interior', 'interiors', 'modular kitchen', 'false ceiling', 'wardrobe', 'cupboard', 'decor', 'decorator', 'architect', 'wallpaper'],
    avoids: ['plumber', 'electrician', 'solar', 'battery', 'cctv camera', 'photo studio', 'wedding venue', 'catering', 'car repair', 'dentist', 'clinic', 'hospital']
  },
  {
    id: 'solar',
    label: 'Solar & Inverters',
    match: ['solar', 'solar energy', 'solar panel', 'solar rooftop', 'solar power', 'battery', 'batteries', 'inverter', 'ups'],
    wants: ['solar', 'solar power', 'solar system', 'inverter', 'battery', 'batteries', 'ups', 'photovoltaic', 'rooftop solar'],
    avoids: ['plumber', 'plumbing', 'pipe', 'interior design', 'furniture', 'paint', 'photo studio', 'wedding', 'caterer', 'venue', 'dental', 'beauty', 'salon']
  },
  {
    id: 'cctv',
    label: 'CCTV & Surveillance',
    match: ['cctv', 'surveillance', 'security camera', 'security system'],
    wants: ['cctv', 'camera', 'surveillance', 'security system', 'biometric', 'access control', 'spy cam'],
    avoids: ['plumber', 'sanitary', 'pipe', 'interior designer', 'furniture', 'paint', 'wedding venue', 'caterer', 'sweet', 'bakery']
  },
  {
    id: 'carpenter',
    label: 'Carpenter',
    match: ['carpenter', 'carpentry', 'wood work', 'furniture maker'],
    wants: ['carpenter', 'carpentry', 'wood', 'furniture', 'door', 'window', 'timber'],
    avoids: ['plumber', 'sanitary', 'electrician', 'solar', 'battery', 'cctv', 'photo studio', 'catering']
  },
  {
    id: 'acrepair',
    label: 'AC Repair & HVAC',
    match: ['ac repair', 'air conditioning', 'ac service', 'hvac', 'refrigerator repair', 'fridge repair'],
    wants: ['ac repair', 'air conditioner', 'ac service', 'hvac', 'cooling', 'fridge', 'refrigerator', 'compressor', 'gas refilling'],
    avoids: ['plumber', 'sanitary', 'pipe', 'interior design', 'furniture', 'photo studio', 'wedding hall', 'catering']
  },
  {
    id: 'waterpurifier',
    label: 'Water Purifier & RO',
    match: ['water purifier', 'ro service', 'ro repair', 'aquaguard', 'water filter', 'ro plant'],
    wants: ['water purifier', 'ro ', 'aquaguard', 'water filter', 'membrane', 'purifier repair', 'mineral water'],
    avoids: ['solar', 'battery', 'interior', 'photo studio', 'wedding', 'caterer', 'venue', 'dentist']
  },
  {
    id: 'fabrication',
    label: 'Fabrication & Welding',
    match: ['fabrication', 'welder', 'welding', 'steel fabricator', 'iron grill', 'shed work', 'aluminium fabrication'],
    wants: ['fabricat', 'welder', 'welding', 'grill', 'gate', 'shed', 'steel', 'iron', 'aluminium', 'railing'],
    avoids: ['plumber', 'photo studio', 'wedding', 'caterer', 'venue', 'beauty', 'dentist', 'clinic']
  },
  {
    id: 'borewell',
    label: 'Borewell & Drilling',
    match: ['borewell', 'drilling', 'bore well', 'submersible pump', 'borewell drilling'],
    wants: ['borewell', 'bore well', 'drilling', 'submersible', 'rig', 'motor pump'],
    avoids: ['tap repair', 'bathroom fitting', 'photo studio', 'wedding', 'caterer', 'interior']
  },
  {
    id: 'cardetailing',
    label: 'Car Detailing & Wash',
    match: ['car wash', 'car detailing', 'ceramic coating', 'car polish', 'teflon coating', 'water wash'],
    wants: ['car wash', 'detailing', 'ceramic', 'coating', 'polish', 'foam wash', 'spa', 'auto clean'],
    avoids: ['spare parts', 'tyre shop', 'car dealer', 'photo studio', 'wedding', 'dentist']
  },
  {
    id: 'pestcontrol',
    label: 'Pest Control',
    match: ['pest control', 'termite', 'fumigation', 'cockroach control', 'bedbug'],
    wants: ['pest control', 'termite', 'pest', 'fumigation', 'disinfection', 'rodent'],
    avoids: ['plumber', 'electrician', 'photo studio', 'wedding', 'caterer', 'venue']
  },
  {
    id: 'packers',
    label: 'Packers & Movers',
    match: ['packer', 'mover', 'packers and movers', 'relocation', 'shifting service'],
    wants: ['packers', 'movers', 'relocation', 'shifting', 'transport', 'cargo', 'household shifting'],
    avoids: ['plumber', 'electrician', 'photo studio', 'wedding', 'caterer', 'venue']
  },
  {
    id: 'dental',
    label: 'Dental & Dentist',
    match: ['dentist', 'dental', 'orthodont', 'teeth', 'root canal', 'dental clinic'],
    wants: ['dental', 'dentist', 'teeth', 'tooth', 'orthodont', 'oral', 'implant', 'smile'],
    // Strict carry-forward matching: only unambiguous dental anchors. A bare
    // "smile" would pull a photo studio ("Smile Studio") into a dentist folder,
    // and "oral" used to match inside "floral". Carrying an earlier lead is a
    // claim about a business we are not looking at right now, so the evidence
    // must be decisive.
    strictWants: [
      'dental', 'dentist', 'teeth', 'tooth', 'orthodont', 'periodont', 'endodont',
      'prosthodont', 'oral care', 'oral health', 'oral clinic', 'oral surgery',
      'dental implant', 'implant clinic', 'smile dental', 'smile care', 'smile clinic'
    ],
    // A city directory happily lists hospitals next to a dental clinic category.
    // A dental search must never answer with an eye hospital or a maternity
    // home, so the other medical specialities are negative signals.
    avoids: [
      'plumber', 'electrician', 'photo studio', 'wedding', 'caterer', 'venue', 'car repair',
      'kalyana', 'mandap', 'mandapam', 'floral', 'decorator',
      'eye', 'ophthal', 'maternity', 'gynec', 'cardio', 'derma', 'skin clinic',
      'ent hospital', 'physio', 'pediatric', 'paediatric', 'child hospital', 'general hospital',
      'diagnostic', 'scan centre', 'scan center', 'dialysis', 'cancer', 'orthopaedic', 'orthopedic',
      'general hospital', 'multi speciality'
    ]
  },
  {
    id: 'doctor',
    label: 'Doctor & Physician & Clinic',
    match: [
      'doctor', 'doctors', 'physician', 'physicians', 'general physician', 'general practitioner',
      'consultant doctor', 'pediatrician', 'paediatrician', 'child doctor', 'gynecologist',
      'gynaecologist', 'cardiologist', 'dermatologist', 'skin doctor', 'orthopedic', 'orthopaedic',
      'orthopedic doctor', 'ent doctor', 'ent specialist', 'neurologist', 'urologist',
      'psychiatrist', 'surgeon', 'clinic', 'polyclinic', 'consultation clinic', 'medical clinic'
    ],
    wants: [
      'dr ', 'dr.', 'doctor', 'doctors', 'physician', 'clinic', 'polyclinic', 'consultant',
      'specialist', 'hospital', 'health center', 'nursing home', 'pediatric', 'paediatric',
      'gynec', 'gynaec', 'cardio', 'derma', 'ortho', 'surgeon', 'mbbs', 'md ', 'ms ', 'dnb',
      'dm ', 'mch', 'mrcp', 'frcs', 'health clinic', 'medical centre', 'medical center'
    ],
    avoids: [
      'pharmacy', 'chemist', 'druggist', 'medical store', 'medicals', 'medical shop',
      'general store', 'drug store', 'ayurvedic pharmacy', 'homeo pharmacy', 'surgical',
      'surgicals', 'surgical shop', 'surgical store', 'diagnostic', 'diagnostics', 'scan center',
      'scan centre', 'imaging', 'blood bank', 'pathology lab', 'optical', 'opticals',
      'optician', 'spectacles', 'veterinary', 'pet clinic', 'pet hospital', 'animal hospital',
      'pest control', 'dentist', 'dental'
    ]
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy & Medical Store',
    match: [
      'pharmacy', 'chemist', 'druggist', 'medical store', 'medicals', 'medical shop', 'drug store',
      'dispensary', 'chemist shop', 'ayurvedic medical store'
    ],
    wants: [
      'pharmacy', 'chemist', 'druggist', 'medical store', 'medicals', 'medical shop', 'drug store',
      'dispensary', 'medicines', 'apollo pharmacy', 'medplus'
    ],
    avoids: [
      'physician consultation', 'consulting room', 'operation theatre'
    ]
  },
  {
    id: 'hospital',
    label: 'Hospital & Healthcare & Specialist Medical Centers',
    match: [
      'hospital', 'hospitals', 'multispeciality hospital', 'super speciality hospital',
      'nursing home', 'medical college hospital', 'general hospital', 'dental hospital',
      'eye hospital', 'children hospital', 'maternity hospital', 'orthopedic hospital',
      'ent hospital', 'cancer hospital', 'heart hospital', 'health center'
    ],
    wants: [
      'hospital', 'hospitals', 'multispeciality', 'super speciality', 'healthcare',
      'medical centre', 'medical center', 'nursing home', 'medical college',
      'dental', 'dentist', 'teeth', 'tooth', 'orthodont', 'oral clinic',
      'eye', 'ophthal', 'retina', 'lasik', 'vision',
      'maternity', 'child', 'children', 'pediatric', 'paediatric', 'women care',
      'ortho', 'orthopaedic', 'bone', 'joint', 'spine',
      'ent', 'ear', 'nose', 'throat',
      'cardio', 'heart', 'cardiac', 'vascular',
      'neuro', 'neurology', 'brain',
      'kidney', 'nephro', 'urology', 'dialysis',
      'cancer', 'onco', 'oncology',
      'skin clinic', 'derma', 'cosmetic clinic',
      'clinic', 'polyclinic', 'institute', 'centre', 'center', 'health care', 'care'
    ],
    avoids: [
      'pharmacy', 'chemist', 'druggist', 'medical store', 'surgical store', 'veterinary', 'pet hospital', 'pet clinic'
    ]
  },
  {
    id: 'diagnostic',
    label: 'Diagnostic Center & Pathology Lab',
    match: [
      'diagnostic', 'diagnostics', 'pathology lab', 'scan centre', 'scan center',
      'blood testing lab', 'diagnostic center', 'imaging center'
    ],
    wants: [
      'diagnostic', 'pathology', 'scan centre', 'scan center', 'blood test', 'x-ray', 'mri',
      'ct scan', 'ultrasound', 'lab', 'laboratory', 'imaging'
    ],
    avoids: [
      'pharmacy', 'chemist', 'medical store', 'surgical shop', 'general store'
    ]
  },
  {
    id: 'lawyer',
    label: 'Lawyer & Advocate',
    match: [
      'lawyer', 'lawyers', 'advocate', 'advocates', 'legal consultant', 'law firm', 'attorney',
      'solicitor', 'notary', 'legal advisor'
    ],
    wants: [
      'lawyer', 'advocate', 'legal', 'law firm', 'attorney', 'notary', 'high court', 'civil court',
      'criminal lawyer', 'corporate lawyer'
    ],
    avoids: [
      'hospital', 'doctor', 'pharmacy', 'restaurant', 'hotel', 'shop'
    ]
  },
  {
    id: 'realestate',
    label: 'Real Estate & Property',
    match: [
      'real estate', 'property dealer', 'realtor', 'property consultant', 'property agent',
      'plots', 'apartments', 'real estate agent', 'builders', 'developer'
    ],
    wants: [
      'real estate', 'property', 'realtor', 'plots', 'apartments', 'flats', 'villas', 'lands',
      'builders', 'developer', 'housing', 'estates'
    ],
    avoids: [
      'hotel', 'restaurant', 'doctor', 'pharmacy', 'repair shop'
    ]
  },
  {
    id: 'gym',
    label: 'Gym & Fitness',
    match: [
      'gym', 'gymnasium', 'fitness centre', 'fitness center', 'workout', 'bodybuilding',
      'crossfit', 'health club', 'yoga'
    ],
    wants: [
      'gym', 'fitness', 'workout', 'bodybuilding', 'crossfit', 'trainer', 'exercise', 'yoga',
      'strength training', 'aerobics'
    ],
    avoids: [
      'doctor', 'pharmacy', 'restaurant', 'medical store'
    ]
  },
  {
    id: 'school',
    label: 'School & College',
    match: [
      'school', 'schools', 'high school', 'public school', 'international school', 'college',
      'colleges', 'academy', 'vidyalaya'
    ],
    wants: [
      'school', 'college', 'vidyalaya', 'academy', 'institution', 'education', 'campus'
    ],
    avoids: [
      'stationery shop', 'book store', 'uniform store', 'tuition center'
    ]
  },
  {
    id: 'restaurant',
    label: 'Restaurant & Eatery',
    match: [
      'restaurant', 'restaurants', 'cafe', 'dhaba', 'eatery', 'dining', 'bistro', 'food court'
    ],
    wants: [
      'restaurant', 'cafe', 'dhaba', 'eatery', 'dining', 'food', 'biryani', 'kitchen', 'bistro', 'tiffin'
    ],
    avoids: [
      'grocery', 'supermarket', 'medical store', 'pharmacy', 'electronic store'
    ]
  },
  {
    id: 'hotel',
    label: 'Hotel & Lodging',
    match: [
      'hotel', 'hotels', 'lodge', 'lodging', 'guest house', 'inn', 'residency', 'stay'
    ],
    wants: [
      'hotel', 'lodge', 'lodging', 'guest house', 'residency', 'inn', 'rooms', 'stay'
    ],
    avoids: [
      'function hall', 'kalyana mandapam', 'marriage hall', 'pharmacy'
    ]
  },
  {
    id: 'autorepair',
    label: 'Auto Repair & Garage',
    match: [
      'car repair', 'auto repair', 'garage', 'bike service', 'motorcycle repair', 'car service',
      'mechanic', 'auto works'
    ],
    wants: [
      'car repair', 'auto repair', 'garage', 'mechanic', 'service station', 'bike service',
      'motorcycle repair', 'auto works', 'dent removal', 'car workshop'
    ],
    avoids: [
      'car wash', 'car detailing', 'spare parts store', 'tyre shop', 'car dealer'
    ]
  },
  {
    id: 'ca',
    label: 'Chartered Accountant & Tax',
    match: [
      'chartered accountant', 'ca firm', 'auditor', 'tax consultant', 'gst consultant', 'income tax'
    ],
    wants: [
      'chartered accountant', 'ca ', 'ca.', 'auditor', 'tax consultant', 'audit firm', 'taxation', 'accounting'
    ],
    avoids: [
      'bank', 'atm', 'doctor', 'pharmacy'
    ]
  }
];

function detectRole(category) {
  const text = norm(category);
  if (!text) return null;
  for (const role of ROLES) {
    if (hasAny(text, role.match.map(norm))) return role;
  }
  return null;
}

function isGenericName(name) {
  const value = clean(name);
  if (!value || value.length < 2) return true;
  // Reject GPS coordinate strings (e.g., 16°19'35.8"N 80°26'16.4"E or 16.3266, 80.4378)
  if (/\d+°\d+['′"]\d+.*[NSEW]|-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/i.test(value)) return true;
  if (GENERIC_NAME.test(value)) return true;
  if (/^(?:top|best)\s+\d+\b/i.test(value)) return true;
  if (/^\d+\s+best\b/i.test(value)) return true;
  if (/^list\s+of\b/i.test(value)) return true;
  // "Results", "Sponsored?", "Results - JustDial": presentation punctuation
  // must not defeat the guard.
  const stripped = value.replace(/[\s?.!:,;·—–-]+$/g, '').trim();
  if (stripped !== value && GENERIC_NAME.test(stripped)) return true;
  // "Results for Plumbers", "Sponsored Listing" and similar UI chrome.
  if (/^(?:results?|sponsored|advertisement|featured)\b/i.test(stripped)) return true;
  return false;
}

function vendorHaystack(vendor) {
  if (!vendor) return '';
  return norm([
    vendor.name,
    vendor.normalizedName,
    vendor.subcategory,
    vendor.description,
    vendor.website,
    vendor.profileUrl,
    vendor.profileSourceUrl,
    vendor.sourceUrl,
    vendor.profileHref
  ].filter(Boolean).join(' '));
}

/**
 * Whether the vendor's own supplied category is a clear conflict.
 * Engines often overwrite `category` with the requested value, so this only
 * compares when the value looks like a real source category.
 */
function conflictsWithRequestedRole(vendor, requestedRole, requestedCategory) {
  if (!requestedRole) return false;
  const own = norm(vendor.category);
  const requested = norm(requestedCategory);
  if (!own || !requested) return false;
  if (own === requested || own.includes(requested) || requested.includes(own)) return false;
  const ownRole = detectRole(vendor.category);
  return Boolean(ownRole && ownRole.id !== requestedRole.id);
}

/**
 * @param {object} vendor
 * @param {string} requestedCategory  exact category the user searched for
 * @returns {boolean} true when the vendor may be shown for that search
 */
function isVendorRelevant(vendor, requestedCategory) {
  if (!vendor) return false;
  if (isGenericName(vendor.name)) return false;

  const requestedRole = detectRole(requestedCategory);
  if (!requestedRole) {
    // Universal Category & Token Matching Guard for all vendor types
    const cleanReq = norm(requestedCategory).replace(/\b(in|near|best|top|all|the|and|for|city|town|district|mandal)\b/g, '').trim();
    const reqTokens = cleanReq.split(/\s+/).filter(t => t.length > 2);
    if (reqTokens.length > 0) {
      const vText = norm([vendor.name, vendor.subcategory, vendor.description].filter(Boolean).join(' '));
      // Common noise rejection: pure retail/stores appearing in service searches
      const isServiceSearch = reqTokens.some(t => ['repair', 'service', 'services', 'contractor', 'contractors', 'works', 'agency', 'consultant', 'cleaner', 'cleaning'].includes(t));
      if (isServiceSearch) {
        if (hasAny(norm(vendor.name), ['wholesale', 'dealers', 'retail store', 'supermarket', 'mart', 'general store'])) {
          return false;
        }
      }
    }
    return true;
  }

  const text = vendorHaystack(vendor);
  if (!text) return true;

  const wants = hasAny(text, requestedRole.wants.map(norm));
  const avoids = hasAny(text, requestedRole.avoids.map(norm));

  // Special high-fidelity rule for Photography & Studios:
  // ABSOLUTELY NEVER allow Xerox, MeeSeva, Photocopying, Digital Seva, Photo Framing, or Camera Repair shops into Photographers!
  if (requestedRole.id === 'photographer') {
    const nameText = norm(vendor.name);
    const subcategoryText = norm(vendor.subcategory || '');
    const combinedName = `${nameText} ${subcategoryText}`;

    // Hard negative check
    if (hasAny(combinedName, [
      'xerox', 'photocopy', 'colour print', 'color print', 'flex print', 'flex printing',
      'offset', 'meeseva', 'mee seva', 'digital seva', 'internet cafe', 'internet center',
      'photo frame', 'photo framing', 'glass house', 'cctv', 'mobile repair'
    ])) {
      return false;
    }

    if (avoids) return false;

    // Trust dedicated wedding/photography directory entries
    if (vendor.sourceEngine === 'weddingwire' || vendor.source === 'WeddingWire') {
      return true;
    }

    // Direct token & stem check for photo, studio, shoot, wedding, video:
    if (/photograph|photo|studio|shoot|candid|cinematograph|videograph|wedding|portrait|visual|film|camera|lens/i.test(text)) {
      return true;
    }

    // Expanded wants for photography:
    const photographyWants = [
      ...requestedRole.wants.map(norm),
      'photo', 'photos', 'pix', 'pics', 'studio', 'studios', 'shoot', 'shoots', 'lens', 'camera', 'film', 'films',
      'capture', 'visual', 'visuals', 'media', 'portrait', 'portraits',
      'candid', 'imaging', 'production', 'productions', 'creative', 'wedding'
    ];
    if (hasAny(text, photographyWants)) return true;

    return wants;
  }

  // Special high-fidelity rule for Doctors & Physicians:
  // ABSOLUTELY NEVER allow pharmacies, chemists, medical stores, surgical supply shops,
  // or pet/veterinary clinics into a Doctors result list!
  if (requestedRole.id === 'doctor') {
    const nameText = norm(vendor.name);
    const subcategoryText = norm(vendor.subcategory || '');
    const combinedName = `${nameText} ${subcategoryText}`;
    
    // Hard negative check: if business is explicitly a pharmacy or medical store, reject unconditionally
    if (hasAny(combinedName, [
      'pharmacy', 'chemist', 'druggist', 'medical store', 'medical and general',
      'medicals', 'medical shop', 'drug store', 'ayurvedic medical', 'surgical',
      'surgicals', 'surgical shop', 'surgical store', 'diagnostic', 'diagnostics',
      'scan center', 'scan centre', 'imaging', 'blood bank', 'pathology lab',
      'optical', 'opticals', 'optician', 'spectacles', 'veterinary', 'pet clinic',
      'pet hospital', 'animal hospital'
    ])) {
      return false;
    }
    
    // Must have a positive doctor anchor (Dr, Clinic, Hospital, Physician, Specialist, MBBS, etc.)
    const strongDoctorAnchor = hasAny(combinedName, [
      'dr ', 'dr.', 'doctor', 'physician', 'clinic', 'polyclinic', 'consultant',
      'specialist', 'hospital', 'nursing home', 'pediatric', 'paediatric',
      'gynec', 'gynaec', 'cardio', 'derma', 'ortho', 'surgeon', 'mbbs', 'md ',
      'ms ', 'dnb', 'dm ', 'mch', 'health centre', 'health center'
    ]);
    if (strongDoctorAnchor) {
      if (avoids) return false;
      return true;
    }
    if (avoids) return false;
    return wants;
  }

  // Special high-fidelity rule for venues (function halls, convention centres, marriage halls):
  // Never allow non-venue commercial entities (electronics stores, truck dealers, appliance shops) into a venue list.
  if (requestedRole.id === 'venue') {
    const nameText = norm(vendor.name);
    const strongNameAnchor = hasAny(nameText, [
      'convention', 'function hall', 'function halls', 'banquet', 'mandapam', 'mandap', 
      'kalyana', 'marriage hall', 'marriage halls', 'wedding hall', 'wedding venue', 
      'party hall', 'reception hall', 'auditorium', 'shadi mahal'
    ]);
    if (strongNameAnchor) {
      if (avoids) return false;
      return true;
    }
    if (avoids) return false;
    return wants;
  }

  // A strong positive signal wins over a negative one. "Banquet Hall
  // Photography" is a photographer, not a venue.
  if (wants) return true;
  if (avoids) return false;

  if (conflictsWithRequestedRole(vendor, requestedRole, requestedCategory)) return false;
  return true;
}

function filterRelevantVendors(vendors, requestedCategory) {
  if (!Array.isArray(vendors)) return [];
  const role = detectRole(requestedCategory);
  if (!role) return vendors;
  return vendors.filter(vendor => isVendorRelevant(vendor, requestedCategory));
}

/**
 * Strict positive match. `isVendorRelevant()` deliberately keeps a row when it
 * has no evidence either way (a live scrape may legitimately surface a business
 * whose name says nothing). That policy is wrong for carrying earlier leads into
 * a new folder: "no evidence" must mean "do not carry", or a dental search ends
 * up carrying cement traders that happen to be in the same city.
 *
 * Returns true only when the row itself carries a positive signal for the
 * requested role (name, stored sub-category/category, description or URL).
 */
function hasStrongCategorySignal(vendor, requestedCategory) {
  if (!vendor) return false;
  if (isGenericName(vendor.name)) return false;

  const role = detectRole(requestedCategory);
  const text = norm([
    vendor.name,
    vendor.normalizedName,
    vendor.subcategory,
    vendor.description,
    vendor.profileUrl,
    vendor.sourceUrl
  ].filter(Boolean).join(' '));

  if (role) {
    if (!text) return false;
    if (role.id === 'doctor' && hasAny(text, ['pharmacy', 'chemist', 'druggist', 'medical store', 'medicals', 'medical shop', 'surgical', 'veterinary'])) {
      return false;
    }
    // A row whose own stored category names a *different* role (e.g. a
    // decorator stored as "Caterers") can never be carried into this search,
    // even if some unrelated token appears in its URL or description.
    const storedRole = detectRole(vendor.category);
    if (storedRole && storedRole.id !== role.id) return false;
    const wants = hasAny(text, (role.strictWants || role.wants).map(norm));
    if (!wants) return false;
    // A strong positive wins, same rule as isVendorRelevant(): "dental hospital"
    // is dental even though "hospital" also appears in another role's avoids.
    return true;
  }

  // Unknown role (a product/brand query): the stored category must name the
  // same thing, never merely share the city.
  const wanted = norm(requestedCategory);
  const found = norm(vendor.category);
  if (!wanted || !found) return false;
  return wanted === found || wanted.includes(found) || found.includes(wanted);
}

function isVenueCategory(category) {
  const role = detectRole(category);
  return Boolean(role && role.id === 'venue');
}

function describeCategory(category) {
  const role = detectRole(category);
  return {
    role: role ? role.id : 'general',
    label: role ? role.label : 'General',
    venue: Boolean(role && role.id === 'venue')
  };
}

module.exports = {
  ROLES,
  detectRole,
  describeCategory,
  isGenericName,
  isVendorRelevant,
  hasStrongCategorySignal,
  filterRelevantVendors,
  isVenueCategory
};
