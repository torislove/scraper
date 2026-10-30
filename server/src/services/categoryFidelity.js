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

const GENERIC_NAME = /^(?:results?|search results?|top results?|sponsored(?: listing| by)?|advertisement|ad\b|featured(?: listing)?|listing(?: results?)?|view all|load more|show more|booking\.com\??|justdial|indiamart|weddingbazaar|mandap\.com|sulekha|near me|best .* near me)$/i;

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
  return words.some(word => text.includes(word));
}

const ROLES = [
  {
    id: 'photographer',
    label: 'Photography',
    match: ['photograph', 'photographer', 'photography', 'photo studio', 'photo shoot', 'photoshoot', 'videograph', 'cinematograph', 'candid photography', 'drone photography', 'camera'],
    wants: ['photograph', 'photography', 'photo studio', 'photoshoot', 'photo shoot', 'videograph', 'cinematograph', 'candid', 'camera', 'lens', 'digital studio', 'photo'],
    avoids: ['banquet', 'function hall', 'kalyana mandapam', 'mandapam', 'convention hall', 'convention center', 'convention', 'marriage hall', 'wedding hall', 'party hall', 'lawns', 'resort', 'hotel', 'restaurant', 'caterer', 'catering', 'decorator', 'decoration', 'makeup', 'make up', 'mehendi', 'mehndi', 'invitation', 'tent house', 'travels', 'jewell', 'jewel', 'bakery', 'sweet']
  },
  {
    id: 'venue',
    label: 'Venue',
    match: ['banquet', 'function hall', 'kalyana mandapam', 'mandapam', 'convention hall', 'convention center', 'convention', 'marriage hall', 'wedding hall', 'wedding venue', 'party hall', 'reception hall', 'lawns', 'farm house', 'resort', 'event venue', 'function room', 'community hall', 'auditorium'],
    wants: ['banquet', 'function hall', 'kalyana', 'mandapam', 'mandap', 'convention', 'marriage hall', 'wedding hall', 'party hall', 'reception hall', 'lawns', 'farm house', 'resort', 'venue', 'auditorium', 'community hall'],
    avoids: ['photograph', 'photography', 'photo studio', 'videograph', 'cinematograph', 'caterer', 'catering service', 'decorator', 'decoration', 'makeup', 'make up', 'mehendi', 'mehndi', 'dj ', 'invitation card', 'bakery']
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
  if (!requestedRole) return true;

  const text = vendorHaystack(vendor);
  if (!text) return true;

  const wants = hasAny(text, requestedRole.wants.map(norm));
  const avoids = hasAny(text, requestedRole.avoids.map(norm));

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
  filterRelevantVendors,
  isVenueCategory
};
