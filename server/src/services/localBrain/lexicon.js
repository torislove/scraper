/**
 * Local lexicon: the vocabulary the offline brain uses besides the category
 * catalog. Everything here is curated, deterministic and shipped with the app.
 *
 * No word list is downloaded at runtime. Regional terms matter because a shop
 * sign in Guntur says "kalyana mandapam", not "banquet hall".
 */

// Regional / colloquial words -> the English concept they mean.
const REGIONAL_TERMS = {
  'kalyana mandapam': 'banquet hall wedding venue',
  'kalyanamandapam': 'banquet hall wedding venue',
  'mandapam': 'banquet hall wedding venue',
  'mandapamu': 'banquet hall wedding venue',
  'pelli': 'wedding',
  'muhurtham': 'wedding',
  'shadi mahal': 'banquet hall wedding venue',
  'shadi': 'wedding',
  'vivah': 'wedding',
  'bhavan': 'function hall',
  'choultry': 'function hall',
  'qubani': 'kebab restaurant',
  'biryani': 'restaurant',
  'mehendi': 'mehndi artist',
  'sangeet': 'event choreographer',
  'haldi': 'event decorator',
  'cctv': 'security camera installer',
  'ac': 'air conditioner repair',
  'borewell': 'borewell drilling',
  'jhula': 'swing decorator',
  'jhadu': 'cleaning service',
  'mistri': 'mason carpenter',
  'darzi': 'tailor',
  'doodh': 'milk dairy',
  'kirana': 'grocery store',
  'dukan': 'shop',
  'mandi': 'market',
  'vahan': 'vehicle',
  'gadi': 'vehicle repair',
  'dawai': 'pharmacy',
  'davakhana': 'hospital clinic',
  'klinik': 'clinic',
  'bhojan': 'restaurant',
  'hotel': 'restaurant lodging',
  'lodge': 'hotel lodging',
  'bangla': 'banquet venue',
  'kutir': 'cottage venue',
  'udyog': 'factory industrial',
  'dukani': 'retail shop',
  'groomer': 'pet grooming dog grooming',
  'pet grooming': 'pet grooming dog grooming'
};

// Extra synonym seeds per family, beyond categoryRouter's FAMILY_KEYWORDS.
const FAMILY_SYNONYMS = {
  photography: ['photographer', 'videographer', 'photo studio', 'drone shoot', 'candid photography', 'photo lab'],
  wedding: ['wedding venue', 'function hall', 'banquet hall', 'kalyana mandapam', 'wedding decorator', 'catering service', 'wedding planner', 'pelli'],
  'home-services': ['plumber', 'electrician', 'carpenter', 'painter', 'ac repair', 'pest control', 'cleaning service', 'packers and movers', 'borewell', 'waterproofing'],
  retail: ['shop', 'showroom', 'store', 'dealer', 'kirana store', 'supermarket', 'boutique'],
  health: ['hospital', 'clinic', 'doctor', 'diagnostic lab', 'pharmacy', 'dental clinic', 'physiotherapy'],
  beauty: ['salon', 'spa', 'beauty parlour', 'barber shop', 'makeup artist', 'nails', 'pet grooming', 'dog grooming', 'pet salon'],
  food: ['restaurant', 'cafe', 'bakery', 'catering', 'fast food', 'biryani', 'sweets shop'],
  auto: ['car showroom', 'bike showroom', 'car service', 'tyre shop', 'spare parts', 'driving school'],
  'real-estate': ['real estate agent', 'property dealer', 'builder', 'apartment project', 'land surveyor'],
  education: ['school', 'college', 'coaching centre', 'tutor', 'training institute', 'play school'],
  professional: ['advocate', 'chartered accountant', 'architect', 'consultant', 'photography studio', 'printing press'],
  industrial: ['factory', 'manufacturer', 'supplier', 'wholesaler', 'fabricator', 'machine tools'],
  generic: ['business', 'vendor', 'shop', 'service provider', 'dealer']
};

// Words that signal shopping/intent but not a category. Kept out of scoring.
const INTENT_WORDS = new Set([
  'buy', 'book', 'hire', 'rent', 'need', 'want', 'looking', 'find', 'cheap',
  'price', 'cost', 'quote', 'enquiry', 'enquire', 'list', 'directory', 'open',
  'closed', 'timing', 'timings', 'offer', 'offers', 'discount', 'delivery'
]);

// Page sections that carry no category signal and would drown the classifier.
const BOILERPLATE = [
  'privacy policy', 'terms and conditions', 'all rights reserved', 'cookie policy',
  'sign in', 'log in', 'subscribe', 'newsletter', 'follow us', 'share this'
];

module.exports = { REGIONAL_TERMS, FAMILY_SYNONYMS, INTENT_WORDS, BOILERPLATE };
