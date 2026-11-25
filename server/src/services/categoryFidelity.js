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

const GENERIC_NAME = /^(?:results?|search results?|top results?|sponsored(?: listing| by)?|advertisement|ad\b|featured(?: listing)?|listing(?: results?)?|view all|load more|show more|booking\.com\??|justdial|indiamart|weddingbazaar|mandap\.com|sulekha|near me|best .* near me|top\s+\d+.*|best\s+\d+.*|\d+\s+best.*|list\s+of\s+.*|home|homepage|under construction|your domain is expired|domain expired|domain for sale|buy this domain|coming soon|default page|welcome to nginx|apache2 default page|404 not found|untitled|index of \/?|website under construction)$/i;

const indiaTradeIntelligence = require('../utils/indiaTradeIntelligence');
const naicsTaxonomy = require('../utils/naicsTaxonomy');

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
    id: 'camera_store',
    label: 'Camera & DSLR Stores',
    match: ['camera shop', 'camera shops', 'camera store', 'camera stores', 'camera dealer', 'camera dealers', 'camera showroom', 'dslr', 'mirrorless camera', 'camera lens', 'camera repair', 'action camera'],
    wants: ['camera', 'dslr', 'mirrorless', 'canon', 'nikon', 'sony', 'fujifilm', 'gopro', 'lens', 'tripod', 'gimbal', 'camera shop', 'camera store', 'camera dealer', 'camera showroom', 'photography equipment'],
    avoids: ['cctv', 'security camera', 'surveillance', 'biometric', 'dvr', 'nvr', 'wedding photographer', 'makeup', 'banquet', 'function hall', 'caterer', 'plumber', 'dentist']
  },
  {
    id: 'photographer',
    label: 'Photography',
    match: ['photograph', 'photographer', 'photography', 'photo studio', 'photo studios', 'photo shoot', 'photoshoot', 'videograph', 'videographer', 'cinematograph', 'candid photography', 'drone photography', 'digital studio'],
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
    id: 'mobile_repair',
    label: 'Mobile Phone Repair & Service',
    match: ['mobile repair', 'phone repair', 'mobile phone repair', 'cell phone repair', 'smartphone repair', 'iphone repair', 'iphone service', 'mobile service center', 'display replacement', 'screen replacement'],
    wants: ['mobile', 'phone', 'cell phone', 'cellphone', 'smartphone', 'iphone', 'android', 'repair', 'service', 'display', 'screen', 'touch', 'glass', 'unlock', 'care', 'fix', 'point', 'clinic'],
    avoids: ['car repair', 'auto repair', 'garage', 'tyre', 'plumber', 'dentist', 'beauty parlour', 'salon', 'restaurant', 'biryani', 'real estate', 'banquet', 'function hall', 'wedding']
  },
  {
    id: 'mobile_shop',
    label: 'Mobile Phone Shops & Showrooms',
    match: ['mobile shop', 'mobile shops', 'mobile phone shop', 'mobile phone shops', 'mobile showroom', 'mobile showrooms', 'mobile store', 'phone shop', 'phone store', 'cell phone store', 'smartphone showroom', 'smartphone store'],
    wants: ['mobile', 'mobiles', 'phone', 'phones', 'cell phone', 'cellphone', 'smartphone', 'iphone', 'telecom', 'cellular', 'showroom', 'store', 'shop', 'communications', 'accessories', 'sangeetha', 'poorvika', 'lot', 'big c', 'happi', 'croma'],
    avoids: ['car showroom', 'bike showroom', 'tyre', 'tractor', 'plumber', 'dentist', 'restaurant', 'function hall']
  },
  {
    id: 'computer_store',
    label: 'Computer & Laptop Stores',
    match: ['computer shop', 'computer store', 'computer dealer', 'computer hardware', 'computer repair', 'laptop shop', 'laptop store', 'laptop dealer', 'laptop repair', 'desktop pc', 'gaming pc', 'macbook', 'computer accessories', 'pc builder'],
    wants: ['computer', 'laptop', 'desktop', 'pc', 'macbook', 'hardware', 'motherboard', 'ssd', 'ram', 'processor', 'monitor', 'keyboard', 'mouse', 'repair', 'service', 'accessories', 'peripherals', 'gaming rig', 'it store'],
    avoids: ['cctv', 'surveillance', 'security camera', 'security system', 'biometric', 'dvr', 'nvr', 'access control', 'intercom', 'spy cam', 'wedding', 'mandap', 'spa', 'saloon', 'parlour', 'plumber', 'dentist']
  },
  {
    id: 'shopping_mall',
    label: 'Shopping Malls & Commercial Complexes',
    match: ['shopping mall', 'shopping malls', 'mall', 'malls', 'shopping complex', 'commercial complex', 'retail plaza', 'hypermarket'],
    wants: ['mall', 'shopping mall', 'shopping complex', 'commercial complex', 'plaza', 'hypermarket', 'arcade', 'retail center', 'retail centre', 'multiplex mall', 'central mall'],
    avoids: ['repair service', 'plumber', 'cctv', 'dentist', 'clinic', 'welder', 'scrap']
  },
  {
    id: 'industrial_mfg',
    label: 'Industrial & Machinery Manufacturing',
    match: ['manufacturer', 'manufacturing', 'machinery', 'factory', 'oem', 'industrial equipment', 'packaging material', 'corrugated box', 'processing plant'],
    wants: ['manufactur', 'factory', 'industrial', 'machinery', 'fabricat', 'oem', 'plant', 'mill', 'packaging', 'production', 'engineering works', 'tooling'],
    avoids: ['beauty parlour', 'spa', 'barber', 'salon', 'wedding', 'mandap', 'bridal', 'dental', 'clinic']
  },
  {
    id: 'cctv',
    label: 'CCTV & Surveillance',
    match: ['cctv', 'surveillance', 'security camera', 'security system'],
    wants: ['cctv', 'camera', 'surveillance', 'security system', 'biometric', 'access control', 'spy cam', 'dvr', 'nvr'],
    avoids: ['computer shop', 'laptop showroom', 'gaming pc', 'desktop pc', 'plumber', 'sanitary', 'pipe', 'interior designer', 'furniture', 'paint', 'wedding venue', 'caterer', 'sweet', 'bakery']
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
    match: ['dentist', 'dental', 'orthodont', 'teeth', 'root canal', 'dental clinic', 'dental hospital', 'dental hospitals', 'dentistry'],
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
      'nursing home', 'medical college hospital', 'general hospital',
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
  },
  {
    id: 'agriculture_spices',
    label: 'Agriculture, Spices & Agro Commodities',
    match: [
      'turmeric', 'haldi', 'pasupu', 'spices', 'spice', 'masala', 'chilli', 'chillies',
      'mirchi', 'raw cotton', 'cotton ginning', 'cotton bale', 'cotton seed', 'ginning', 'rice mill', 'paddy', 'grain', 'grains', 'pulses',
      'dal mill', 'oil mill', 'groundnut', 'jaggery', 'bellam', 'tobacco', 'agro commodity',
      'agricultural', 'apmc', 'mandi', 'krishi', 'fertilizer', 'seeds', 'grain merchant',
      'cold storage', 'spice wholesale', 'turmeric wholesale'
    ],
    wants: [
      'turmeric', 'haldi', 'pasupu', 'curcumin', 'spices', 'spice', 'masala', 'chilli', 'mirchi', 'raw cotton', 'cotton ginning',
      'ginning', 'rice mill', 'paddy', 'grain', 'grains', 'pulses', 'dal mill', 'oil mill',
      'groundnut', 'jaggery', 'bellam', 'tobacco', 'agro', 'agricultural', 'mandi', 'apmc', 'market yard',
      'cold storage', 'produce', 'krishi', 'seeds', 'fertilizer', 'processing unit', 'polishing unit'
    ],
    avoids: [
      'iron and steel', 'iron & steel', 'steel', 'tmt', 'railing', 'tiles', 'sanitaryware',
      'saree', 'sari', 'sarees', 'handloom', 'handlooms', 'textile', 'textiles', 'cloth',
      'garment', 'readymade', 'electrical', 'electricals', 'electric', 'electronics', 'electronic',
      'switchgear', 'switch', 'switches', 'wire', 'wires', 'cable', 'cables', 'lighting',
      'fixtures', 'fans', 'appliances', 'spares', 'power tools', 'hardware', 'hotel', 'lodge',
      'banquet', 'mandapam', 'function hall', 'cement', 'hospital', 'clinic', 'dentist',
      'car repair', 'garage', 'photo studio', 'salon', 'parlour', 'vox ceiling', 'metal store',
      'metal house', 'marbles', 'granites'
    ]
  },
  {
    id: 'metals_steel',
    label: 'Iron, Steel, Metals & TMT',
    match: [
      'iron and steel', 'iron & steel', 'tmt steel', 'tmt bars', 'steel dealer',
      'steel trader', 'structural steel', 'metal store', 'sheet metal', 'pipes and tubes',
      'foundry', 'casting', 'metal fabricat', 'steel railing'
    ],
    wants: [
      'iron', 'steel', 'tmt', 'metal', 'pipes', 'tubes', 'structural', 'railing',
      'fabrication', 'sheets', 'foundry', 'dealer', 'traders', 'corporation', 'steels'
    ],
    avoids: [
      'turmeric', 'spices', 'chilli', 'grain', 'saree', 'textile', 'clothing',
      'pharmacy', 'hospital', 'clinic', 'hotel', 'restaurant', 'photo studio'
    ]
  },
  {
    id: 'textiles_sarees',
    label: 'Textiles, Sarees, Handlooms & Apparel',
    match: [
      'cotton knitwear', 'cotton garments', 'cotton garment', 'cotton apparel', 'knitwear', 'hosiery',
      'saree', 'sari', 'sarees', 'handloom', 'handlooms', 'textile', 'textiles',
      'fabric', 'fabrics', 'cloth', 'garment', 'garments', 'spinning mill', 'weaving',
      'silk', 'cotton cloth', 'readymade', 'apparel', 'boutique'
    ],
    wants: [
      'saree', 'sarees', 'handloom', 'silk', 'textile', 'textiles', 'cloth',
      'garment', 'garments', 'readymade', 'apparel', 'knitwear', 'hosiery', 'dress', 'fabrics', 'showroom', 'matching'
    ],
    avoids: [
      'turmeric', 'spices', 'chilli', 'grain', 'steel', 'iron', 'tmt', 'cement',
      'tiles', 'sanitaryware', 'hardware', 'hospital', 'clinic', 'pharmacy', 'hotel', 'electrical'
    ]
  },
  {
    id: 'building_materials',
    label: 'Building Materials, Tiles, Cement & Sanitaryware',
    match: [
      'building materials', 'cement dealer', 'cement stockist', 'sanitaryware',
      'tiles showroom', 'tiles dealer', 'granite', 'marble', 'vitrified', 'plywood',
      'hardware and tools', 'bathroom fittings'
    ],
    wants: [
      'building material', 'cement', 'tiles', 'granite', 'marble', 'sanitaryware',
      'plywood', 'laminates', 'hardware', 'bathroom fittings', 'ceramic', 'vitrified'
    ],
    avoids: [
      'turmeric', 'spices', 'chilli', 'grain', 'saree', 'textile', 'clothing',
      'hospital', 'clinic', 'pharmacy', 'hotel', 'restaurant'
    ]
  },
  {
    id: 'electrical_goods',
    label: 'Electrical Goods, Lighting & Cables',
    match: [
      'electrical goods', 'switchgear', 'cables and wires', 'industrial lighting',
      'electrical switch', 'electrical wholesale'
    ],
    wants: [
      'electrical', 'electricals', 'cables', 'wires', 'switchgear', 'switches',
      'lighting', 'panel', 'fans', 'appliances', 'fittings'
    ],
    avoids: [
      'turmeric', 'spices', 'chilli', 'grain', 'saree', 'textile', 'clothing',
      'hospital', 'clinic', 'dentist', 'hotel', 'plumber'
    ]
  },
  {
    id: 'furniture_decor',
    label: 'Furniture & Woodwork',
    match: [
      'furniture', 'wooden furniture', 'sofas', 'mattresses', 'office furniture', 'wardrobes'
    ],
    wants: [
      'furniture', 'sofa', 'wood', 'wooden', 'mattress', 'furnishing', 'office furniture', 'interior'
    ],
    avoids: [
      'turmeric', 'spices', 'steel tmt', 'saree', 'clinic', 'dentist', 'hospital'
    ]
  },
  {
    id: 'footwear_shoes',
    label: 'Footwear & Shoes',
    match: [
      'footwear', 'shoes wholesale', 'shoe showroom', 'leather shoes', 'sandals', 'chappal'
    ],
    wants: [
      'footwear', 'shoes', 'shoe', 'sandals', 'chappals', 'boots', 'sneakers'
    ],
    avoids: [
      'turmeric', 'spices', 'steel', 'cement', 'clinic', 'hospital'
    ]
  },
  {
    id: 'marine_rigging',
    label: 'Marine Rigging & Maritime Equipment',
    match: ['marine rigging', 'marine supply', 'rigging', 'boat rigging', 'ship rigging', 'maritime supply', 'marine contractor'],
    wants: ['marine', 'rigging', 'boat', 'vessel', 'ship', 'maritime', 'dock', 'yacht', 'harbor', 'harbour', 'naval', 'anchoring'],
    avoids: ['bakery', 'cupcake', 'cafe', 'restaurant', 'salon', 'barber', 'dental', 'clinic', 'dentist', 'locksmith', 'bridal', 'saree']
  },
  {
    id: 'coffee_roaster',
    label: 'Specialty Coffee & Roasteries',
    match: ['coffee roaster', 'coffee roasters', 'specialty coffee', 'roastery', 'coffee bean wholesale', 'artisan coffee'],
    wants: ['coffee', 'roaster', 'roastery', 'espresso', 'beans', 'brew', 'cafe', 'barista'],
    avoids: ['auto repair', 'garage', 'clutch', 'brake', 'dentist', 'clinic', 'plumber', 'locksmith', 'salon', 'tire', 'tyre']
  },
  {
    id: 'perfume_fragrance',
    label: 'Perfumes, Fragrances & Cosmetics',
    match: ['perfume', 'perfumes', 'fragrance', 'cologne', 'attar', 'oud', 'cosmetics wholesale', 'luxury perfume'],
    wants: ['perfume', 'perfumes', 'fragrance', 'scent', 'cologne', 'attar', 'oud', 'beauty', 'cosmetics'],
    avoids: ['tire', 'tyre', 'battery replacement', 'auto repair', 'plumber', 'dentist', 'garage', 'brake']
  },
  {
    id: 'cleanroom_semiconductor',
    label: 'Semiconductor & Cleanroom Equipment',
    match: ['cleanroom', 'clean room', 'semiconductor equipment', 'microelectronics', 'wafer fabrication', 'semiconductor cleanroom'],
    wants: ['cleanroom', 'clean room', 'semiconductor', 'microelectronics', 'wafer', 'fabrication', 'hvac cleanroom', 'filtration', 'silicon', 'technology'],
    avoids: ['spa', 'reflexology', 'massage', 'salon', 'barber', 'bakery', 'dentist', 'restaurant']
  },
  {
    id: 'automotive_engineering',
    label: 'Automotive Powertrain & Engineering',
    match: ['powertrain', 'powertrain engineering', 'transmission engineering', 'automotive engineering', 'ev powertrain'],
    wants: ['powertrain', 'transmission', 'automotive engineering', 'engine engineering', 'motor engineering', 'drivetrain', 'chassis', 'vehicle engineering'],
    avoids: ['salon', 'barber', 'hairdresser', 'spa', 'bakery', 'dentist', 'boutique', 'bridal']
  },
  {
    id: 'biotech_lab',
    label: 'Biotechnology & Analytical Laboratories',
    match: ['biotechnology lab', 'biotech laboratory', 'analytical testing lab', 'testing laboratories', 'bioanalytics', 'biotechnology analytical'],
    wants: ['biotechnology', 'biotech', 'analytical testing', 'testing lab', 'laboratory', 'laboratories', 'bioanalytics', 'molecular', 'bioscience', 'testing'],
    avoids: ['locksmith', 'safe co', 'key cutter', 'salon', 'barber', 'bakery', 'garage', 'tire', 'dental clinic']
  },
  {
    id: 'cold_storage_logistics',
    label: 'Cold Storage & Refrigerated Logistics',
    match: ['cold storage logistics', 'refrigerated logistics', 'cold storage warehousing', 'cold chain'],
    wants: ['cold storage', 'refrigerat', 'warehouse', 'warehousing', 'logistics', 'freight', 'cold chain', 'temperature controlled'],
    avoids: ['bridal', 'wedding dress', 'saree', 'boutique', 'salon', 'dental', 'bakery', 'dentist']
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

  const text = vendorHaystack(vendor);
  const subcategory = String(vendor.subcategory || '');

  // 1. Cross-Industry Anti-Bleed Conflict Check:
  // Detect trade sector for the requested query and test against vendor profile
  const tradeSector = indiaTradeIntelligence.detectTradeSector(requestedCategory);
  if (tradeSector) {
    if (indiaTradeIntelligence.isIndustryConflict(tradeSector.key, text, subcategory)) {
      return false;
    }
  }

  // 1a. Specific Niche Mandatory Positive Anchor Guard:
  // Supports both contiguous anchor phrases AND flexible token-group co-occurrence
  // (e.g. "Mobile phone repair shop" or "Sri Sai Mobile Care" matches [mobile/phone] + [repair/care/shop]).
  const specificNiche = indiaTradeIntelligence.extractSpecificNiche(requestedCategory);
  if (specificNiche) {
    const combined = `${norm(vendor.name)} ${norm(vendor.subcategory || '')} ${norm(vendor.placeCategory || '')} ${norm(vendor.description || '')}`;
    const hasPhraseAnchor = hasAny(combined, (specificNiche.anchors || []).map(norm));
    const hasTokenGroupAnchor = Array.isArray(specificNiche.tokenGroups) && specificNiche.tokenGroups.length > 0
      ? specificNiche.tokenGroups.every(group => hasAny(combined, group.map(norm)))
      : false;
    // Also accept if the candidate shares substantive tokens with the requested query and has no avoid conflict
    const queryWords = norm(requestedCategory).split(/\s+/).filter(w => w.length >= 3 && !['the', 'and', 'for', 'with', 'near', 'best', 'top', 'shop', 'shops', 'store', 'stores', 'showroom', 'showrooms', 'center', 'centre', 'service', 'services'].includes(w));
    const hasCoreWordMatch = queryWords.length > 0 && queryWords.some(w => combined.includes(w));
    if (!hasPhraseAnchor && !hasTokenGroupAnchor && !(hasCoreWordMatch && !(specificNiche.avoids && hasAny(combined, specificNiche.avoids.map(norm))))) {
      return false; // REJECT: zero positive evidence for the specific niche requested
    }
    if (specificNiche.avoids && hasAny(combined, specificNiche.avoids.map(norm))) {
      return false; // REJECT: contains explicit conflicting sibling sector keywords
    }
  }

  // 2. Closed-World NAICS Sector Mutual Exclusion Check:
  // Deterministically verify whether candidate vendor belongs to a mathematically incompatible sector
  const queryNaics = naicsTaxonomy.classifyToNaics(requestedCategory);
  const vendorNaics = naicsTaxonomy.classifyToNaics(vendor);
  if (queryNaics && vendorNaics) {
    if (naicsTaxonomy.isMutuallyExclusive(queryNaics.sectorCode, vendorNaics.sectorCode)) {
      return false;
    }
  }

  const requestedRole = detectRole(requestedCategory);
  if (!requestedRole) {
    // Universal Category & Token Matching Guard for all vendor types
    const cleanReq = norm(requestedCategory)
      .replace(/\b(in|near|best|top|all|the|and|for|city|town|district|mandal|suburb|county|state|province)\b/g, '')
      .replace(/\b(wholesale|wholesalers|wholesaler|supplier|suppliers|contractor|contractors|dealer|dealers|distributor|distributors|company|store|stores|shop|shops|factory|manufacturers?|provider|commercial|industrial|residential|artisan|specialty|luxury|custom|retail|centre|center|services?)\b/g, '')
      .trim();
    const reqTokens = cleanReq.split(/\s+/).filter(t => t.length > 2);
    if (reqTokens.length > 0) {
      const vText = norm([vendor.name, vendor.subcategory, vendor.description, vendor.placeCategory].filter(Boolean).join(' '));
      // Cross-Industry Incompatibility Rejection:
      // If the vendor belongs to an obvious mismatched sector and shares ZERO substantive tokens with the requested category
      const hasTokenMatch = naicsTaxonomy.hasAnchorMatch(requestedCategory, vendor) || reqTokens.some(t => vText.includes(t));
      if (!hasTokenMatch) {
        const isMismatchedSector = /\b(bakery|cupcake|cafe|restaurant|sweet\s*shop|sweets|gelato|gelateria|pastry|ice\s*cream|deli|bistro|salon|barber|hairdresser|spa|massage|reflexology|dentist|dental|orthodontic|locksmith|safe\s*co|tyre|tire|brake|clutch|auto\s*repair|car\s*repair|auto\s*body|paint\s*workshop|bodywork|garage|bicycle|bike\s*repair|fietsen|dry\s*clean|laundry|bridal\s*boutique|wedding\s*dress|florist|flower\s*shop|pet\s*clinic|veterinary|grooming|dairy|dairy\s*farm|milk\s*dairy|cattle|poultry|livestock|footwear|shoe\s*repair|shoe\s*store|shoes|cobbler)\b/i.test(vText);
        if (isMismatchedSector) {
          return false;
        }
      }

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

  if (!text) return true;

  const wants = hasAny(text, requestedRole.wants.map(norm));
  const avoids = hasAny(text, requestedRole.avoids.map(norm));

  // Special high-fidelity rule for Agriculture, Spices & Agro Commodities:
  // ABSOLUTELY NEVER allow Iron & Steel, Sarees/Handloom, Tiles/Sanitaryware,
  // Electricals, Hotels, or Hospitals into an Agricultural/Spices result list!
  if (requestedRole.id === 'agriculture_spices') {
    const combined = `${norm(vendor.name)} ${norm(subcategory)}`;
    if (hasAny(combined, [
      'iron and steel', 'iron & steel', 'steel', 'tmt', 'railing', 'tiles', 'sanitaryware',
      'saree', 'sari', 'sarees', 'handloom', 'handlooms', 'textile', 'textiles', 'cloth',
      'garment', 'readymade', 'electrical', 'electricals', 'electric', 'electronics', 'electronic',
      'switchgear', 'switch', 'switches', 'wire', 'wires', 'cable', 'cables', 'lighting',
      'fixtures', 'fans', 'appliances', 'spares', 'power tools', 'hardware', 'hotel', 'lodge',
      'banquet', 'mandapam', 'function hall', 'cement', 'hospital', 'clinic', 'dentist',
      'car repair', 'garage', 'photo studio', 'salon', 'parlour', 'vox ceiling', 'metal store',
      'metal house', 'marbles', 'granites'
    ])) {
      return false;
    }

    if (avoids) return false;

    // Check specific commodity entity
    const commodity = indiaTradeIntelligence.extractSpecificCommodity(requestedCategory);
    if (commodity) {
      // Mandatory Core Commodity Match:
      // When searching for a specific commodity (e.g. Turmeric, Chilli, Cotton, Rice),
      // the vendor MUST have positive evidence of that commodity or its immediate spices/agro sector.
      // Generic commercial qualifiers ("trader", "wholesaler", "merchant") alone CANNOT satisfy relevance.
      const hasSpecificNoun = commodity.patterns.some(p => p.test(text));
      const hasImmediateSector = /\b(spices?|masala|mandi|market yard|apmc|processing unit|polishing unit|cold storage|agro\s*commodit|agricultural produce)\b/i.test(text);
      if (hasSpecificNoun || hasImmediateSector) {
        return true;
      }
      return false;
    }

    // Positive wants check: if business has positive agriculture/spices tokens
    return wants;
  }

  // Special high-fidelity rule for Iron, Steel & Metals:
  // ABSOLUTELY NEVER allow Spices/Turmeric, Sarees, Hotels or Clinics into a Steel result list!
  if (requestedRole.id === 'metals_steel') {
    const combined = `${norm(vendor.name)} ${norm(subcategory)}`;
    if (hasAny(combined, [
      'turmeric', 'spices', 'chilli', 'grain', 'paddy', 'saree', 'handloom', 'cloth',
      'textile', 'hotel', 'lodge', 'hospital', 'clinic', 'dentist', 'pharmacy',
      'sweet', 'sweets', 'sweet shop', 'bakery', 'restaurant', 'cafe', 'dining',
      'salon', 'beauty parlour', 'auto garage', 'car repair', 'mechanic'
    ])) {
      return false;
    }
    if (avoids) return false;
    return wants;
  }

  // Special high-fidelity rule for Textiles, Sarees & Apparel:
  if (requestedRole.id === 'textiles_sarees') {
    const combined = `${norm(vendor.name)} ${norm(subcategory)}`;
    if (hasAny(combined, [
      'turmeric', 'spices', 'chilli', 'steel', 'iron', 'tmt', 'cement', 'tiles',
      'sanitaryware', 'hardware', 'hospital', 'clinic', 'pharmacy', 'hotel'
    ])) {
      return false;
    }
    if (avoids) return false;
    return wants;
  }

  // Special high-fidelity rule for Building Materials & Tiles:
  if (requestedRole.id === 'building_materials') {
    const combined = `${norm(vendor.name)} ${norm(subcategory)}`;
    if (hasAny(combined, [
      'turmeric', 'spices', 'chilli', 'grain', 'saree', 'handloom', 'cloth',
      'textile', 'hospital', 'clinic', 'pharmacy', 'hotel'
    ])) {
      return false;
    }
    if (avoids) return false;
    return wants;
  }

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

  // Special high-fidelity rule for Dental Clinics & Dentists:
  // ABSOLUTELY NEVER allow general hospitals, pathology labs, diagnostic centers,
  // maternity homes, or eye clinics into a Dental result list!
  if (requestedRole.id === 'dental') {
    const combinedName = `${norm(vendor.name)} ${norm(vendor.subcategory || '')} ${norm(vendor.placeCategory || '')}`;
    
    // Hard negative check: drop non-dental medical facilities
    if (hasAny(combinedName, [
      'laboratory', 'pathology', 'diagnostic', 'scan cent', 'x ray', 'x-ray',
      'blood test', 'ultrasound', 'maternity', 'gynec', 'gynaec', 'child hospital',
      'pediatric hospital', 'paediatric hospital', 'eye hospital', 'ophthalm',
      'orthopedic hospital', 'fracture hospital', 'cancer', 'dialysis', 'ent hospital',
      'nursing home', 'psychiatry', 'rehabilitation'
    ])) {
      return false;
    }
    
    // Mandatory positive dental anchor
    const hasDentalAnchor = hasAny(combinedName, [
      'dent', 'dental', 'dentist', 'dentists', 'teeth', 'tooth', 'orthodont', 'implant',
      'root canal', 'oral care', 'oral health', 'oral surgery', 'bds', 'mds', 'dentistry'
    ]) || hasAny(norm(vendor.name), ['smile dental', 'smile clinic', 'dentelite', 'smiles', 'dent plus', 'roots super'])
       || /\b(b\.?d\.?s|m\.?d\.?s)\b/i.test(vendor.name || '');
    
    if (!hasDentalAnchor) {
      return false;
    }
    if (avoids) return false;
    return true;
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

    // Cross-industry conflict check
    const tradeSector = indiaTradeIntelligence.detectTradeSector(requestedCategory);
    if (tradeSector && indiaTradeIntelligence.isIndustryConflict(tradeSector.key, text, vendor.subcategory || '')) {
      return false;
    }

    if (role.id === 'doctor' && hasAny(text, ['pharmacy', 'chemist', 'druggist', 'medical store', 'medicals', 'medical shop', 'surgical', 'veterinary'])) {
      return false;
    }
    // A row whose own stored category names a *different* role (e.g. a
    // decorator stored as "Caterers") can never be carried into this search,
    // even if some unrelated token appears in its URL or description.
    const storedRole = detectRole(vendor.category);
    if (storedRole && storedRole.id !== role.id) return false;

    // Strict avoids check
    if (role.avoids && hasAny(text, role.avoids.map(norm))) return false;

    // Check specific commodity if applicable
    const commodity = indiaTradeIntelligence.extractSpecificCommodity(requestedCategory);
    if (commodity) {
      const hasSpecificNoun = commodity.patterns.some(p => p.test(text));
      const hasImmediateSector = /\b(spices?|masala|mandi|market yard|apmc|processing unit|polishing unit|cold storage|agro\s*commodit|agricultural produce)\b/i.test(text);
      return Boolean(hasSpecificNoun || hasImmediateSector);
    }

    const wants = hasAny(text, (role.strictWants || role.wants).map(norm));
    if (!wants) return false;
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
