/**
 * deepProfileService.js
 * Canonical vendor profile builder.
 *
 * Deep extraction results are merged into the vendor record, but the full
 * grouped profile (including unknown fields, provenance and conflicts) is
 * stored per-vendor in server/data/deep_profiles/ so the main vendor JSON does
 * not grow into an unmanageable blob.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dbAdapter = require('../config/dbAdapter');
const { deepExtractWebsite, normaliseLanguage } = require('./websiteDeepExtractor');
const { deepExtractPlace } = require('./googlePlaceDeepExtractor');
const {
  normalizePhone,
  pickBestPhone,
  isValidEmail,
  extractPincode,
  validateGSTIN,
  validatePAN,
  validateCIN
} = require('../utils/phoneUtils');

const VERSION = '2.0.0';
const { DEEP_PROFILES_DIR: DEEP_DIR } = require('../config/paths');
const JOB_RETENTION_MS = 12 * 60 * 60 * 1000;
const MAX_ARRAY = 60;

if (!fs.existsSync(DEEP_DIR)) {
  try { fs.mkdirSync(DEEP_DIR, { recursive: true }); } catch (e) {}
}

const FIELD_GROUPS = [
  {
    key: 'identity',
    label: 'Identity',
    fields: [
      { key: 'name', label: 'Business name', weight: 5 },
      { key: 'legalName', label: 'Legal / registered name', weight: 1 },
      { key: 'category', label: 'Primary category', weight: 2 },
      { key: 'description', label: 'Description', weight: 3 },
      { key: 'tagline', label: 'Tagline', weight: 1 },
      { key: 'priceRange', label: 'Price range', weight: 1 },
      { key: 'businessStatus', label: 'Business status', weight: 1 },
      { key: 'ownerName', label: 'Owner / operator', weight: 1 }
    ]
  },
  {
    key: 'contact',
    label: 'Contact',
    fields: [
      { key: 'phone', label: 'Primary phone', weight: 8 },
      { key: 'phones', label: 'All phone numbers', weight: 2 },
      { key: 'whatsapp', label: 'WhatsApp', weight: 2 },
      { key: 'email', label: 'Primary email', weight: 6 },
      { key: 'emails', label: 'All emails', weight: 2 }
    ]
  },
  {
    key: 'location',
    label: 'Location',
    fields: [
      { key: 'address', label: 'Full address', weight: 6 },
      { key: 'locality', label: 'Locality / city', weight: 2 },
      { key: 'district', label: 'District', weight: 3 },
      { key: 'state', label: 'State', weight: 3 },
      { key: 'pincode', label: 'Pincode', weight: 2 },
      { key: 'plusCode', label: 'Plus code', weight: 1 },
      { key: 'latitude', label: 'Latitude', weight: 1 },
      { key: 'longitude', label: 'Longitude', weight: 1 }
    ]
  },
  {
    key: 'hours',
    label: 'Hours',
    fields: [
      { key: 'operatingHours', label: 'Operating hours', weight: 2 },
      { key: 'hoursTable', label: 'Day-wise hours', weight: 1 }
    ]
  },
  {
    key: 'social',
    label: 'Web & social',
    fields: [
      { key: 'website', label: 'Website', weight: 3 },
      { key: 'instagram', label: 'Instagram', weight: 3 },
      { key: 'facebook', label: 'Facebook', weight: 2 },
      { key: 'linkedin', label: 'LinkedIn', weight: 1 },
      { key: 'youtube', label: 'YouTube', weight: 1 },
      { key: 'twitter', label: 'X / Twitter', weight: 1 }
    ]
  },
  {
    key: 'reputation',
    label: 'Reputation',
    fields: [
      { key: 'rating', label: 'Rating', weight: 3 },
      { key: 'reviewsCount', label: 'Review count', weight: 2 },
      { key: 'reviews', label: 'Review samples', weight: 3 },
      { key: 'ownerResponses', label: 'Owner responses', weight: 1 }
    ]
  },
  {
    key: 'catalog',
    label: 'Services & amenities',
    fields: [
      { key: 'services', label: 'Services', weight: 3 },
      { key: 'products', label: 'Products', weight: 2 },
      { key: 'amenities', label: 'Amenities', weight: 1 },
      { key: 'payments', label: 'Payments accepted', weight: 1 },
      { key: 'accessibility', label: 'Accessibility', weight: 1 },
      { key: 'languages', label: 'Languages', weight: 1 },
      { key: 'bookingLinks', label: 'Booking links', weight: 2 },
      { key: 'menuLink', label: 'Menu / catalogue link', weight: 1 },
      { key: 'offers', label: 'Offers', weight: 1 }
    ]
  },
  {
    key: 'legal',
    label: 'Legal & tax',
    fields: [
      { key: 'gstin', label: 'GSTIN', weight: 2 },
      { key: 'pan', label: 'PAN', weight: 1 },
      { key: 'cin', label: 'CIN', weight: 1 }
    ]
  },
  {
    key: 'media',
    label: 'Media',
    fields: [
      { key: 'logo', label: 'Logo', weight: 2 },
      { key: 'images', label: 'Website images', weight: 2 },
      { key: 'photos', label: 'Place photos', weight: 1 }
    ]
  },
  {
    key: 'answers',
    label: 'Answers & proof',
    fields: [
      { key: 'faqs', label: 'FAQs', weight: 1 },
      { key: 'certifications', label: 'Certifications', weight: 1 },
      { key: 'awards', label: 'Awards', weight: 1 },
      { key: 'popularTimes', label: 'Popular times', weight: 1 }
    ]
  }
];

const FIELD_DEFS = FIELD_GROUPS.flatMap(group =>
  group.fields.map(field => ({ ...field, group: group.key, groupLabel: group.label, path: `${group.key}.${field.key}` }))
);
const FIELD_BY_PATH = new Map(FIELD_DEFS.map(f => [f.path, f]));
const TOTAL_WEIGHT = FIELD_DEFS.reduce((sum, f) => sum + f.weight, 0);
const CONFLICT_FIELDS = new Set([
  'location.address', 'location.pincode', 'location.state', 'location.district',
  'social.website', 'reputation.rating', 'legal.gstin'
]);

const jobs = new Map();
const vendorLocks = new Set();

function safeId(id) {
  return String(id || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function profilePath(vendorId) {
  return path.join(DEEP_DIR, `${safeId(vendorId)}.json`);
}

function meaningful(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return Boolean(v) && ![
      'unknown', 'n/a', 'na', 'none', 'null', 'undefined',
      'requires manual lookup', 'obfuscated', 'not available'
    ].includes(v);
  }
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  return Boolean(value);
}

function safeString(value, max = 600) {
  if (!meaningful(value)) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function safePhoneValue(value) {
  if (!value || typeof value !== 'string') return '';
  const parsed = normalizePhone(value);
  return parsed ? parsed.e164 : '';
}

function safeRating(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 5 ? Math.round(n * 10) / 10 : '';
}

function safeCoord(value, axis) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  if (axis === 'lat' && (n < 6 || n > 38)) return '';
  if (axis === 'lng' && (n < 68 || n > 98)) return '';
  return n;
}

function safePincode(value) {
  const match = String(value || '').match(/(?<!\d)([1-9]\d{5})(?!\d)/);
  return match ? match[1] : '';
}

function normalisePhoneList(values) {
  const list = [];
  const seen = new Set();
  for (const value of values || []) {
    const parsed = typeof value === 'string'
      ? normalizePhone(value)
      : value && (value.e164 || value.number)
        ? (normalizePhone(value.e164 || value.number) || value)
        : null;
    if (!parsed || !parsed.e164) continue;
    if (seen.has(parsed.e164)) continue;
    seen.add(parsed.e164);
    list.push({
      e164: parsed.e164,
      national: parsed.national || String(parsed.e164).replace(/\D/g, '').slice(-10),
      international: parsed.international || parsed.e164,
      type: parsed.type || 'UNKNOWN',
      isMobile: Boolean(parsed.isMobile),
      isLandline: Boolean(parsed.isLandline),
      whatsapp: Boolean(parsed.whatsapp),
      source: parsed.source || value.source || 'existing'
    });
  }
  return list;
}

function arrayBy(items, keyFn = x => JSON.stringify(x)) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    if (!meaningful(item)) continue;
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.slice(0, MAX_ARRAY);
}

function mergeNamed(existing, incoming, max = MAX_ARRAY) {
  const out = [];
  const seen = new Set();
  for (const item of [...(existing || []), ...(incoming || [])]) {
    if (!item) continue;
    const name = typeof item === 'string' ? item : item.name;
    if (!meaningful(name)) continue;
    const key = String(name).toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(typeof item === 'string' ? { name: item } : item);
  }
  return out.slice(0, max);
}

function mergeLinks(existing, incoming) {
  return arrayBy([...(existing || []), ...(incoming || [])], l => {
    if (typeof l === 'string') return l;
    return l && l.url;
  });
}

function classifyGoogleAttributes(groups = []) {
  const result = { amenities: [], accessibility: [], payments: [], languages: [], other: [] };
  const push = (bucket, value) => { if (value) result[bucket].push(value); };
  for (const group of groups) {
    const heading = String(group.heading || '').toLowerCase();
    for (const raw of group.items || []) {
      const item = safeString(raw, 100);
      if (!item) continue;
      if (/accessib|wheelchair|entrance|parking/.test(heading)) push('accessibility', item);
      else if (/payment|card|upi/.test(heading)) push('payments', item);
      else if (/language/.test(heading)) push('languages', item);
      else if (/amenit|offering|service option|dining|highlight|atmosphere|crowd|planning|children|pets/.test(heading)) push('amenities', item);
      else push('other', item);
    }
  }
  return {
    amenities: arrayBy(result.amenities, String),
    accessibility: arrayBy(result.accessibility, String),
    payments: arrayBy(result.payments, String),
    languages: arrayBy(result.languages, String),
    other: arrayBy(result.other, String)
  };
}

function baseGroups(vendor) {
  const existingPhones = normalisePhoneList([
    ...(Array.isArray(vendor.phones) ? vendor.phones : []),
    vendor.phone
  ]);
  const existingEmails = arrayBy([
    ...(Array.isArray(vendor.emails) ? vendor.emails : []),
    isValidEmail(vendor.email) ? vendor.email : ''
  ], e => String(e).toLowerCase());

  return {
    identity: {
      name: safeString(vendor.name, 240),
      legalName: safeString(vendor.legalName || (vendor.legal && vendor.legal.legalName), 240),
      category: safeString(vendor.category, 120),
      description: safeString(vendor.description, 1600),
      tagline: safeString(vendor.tagline, 300),
      priceRange: safeString(vendor.priceRange, 60),
      businessStatus: safeString(vendor.businessStatus, 100),
      ownerName: safeString(vendor.ownerName, 160)
    },
    contact: {
      phone: existingPhones.find(p => p.isMobile)?.e164 || existingPhones[0]?.e164 || '',
      phones: existingPhones,
      whatsapp: safeString(vendor.whatsappLink, 500),
      email: existingEmails[0] || '',
      emails: existingEmails
    },
    location: {
      address: safeString(vendor.address, 600),
      locality: safeString(vendor.locality || vendor.city, 160),
      district: safeString(vendor.district, 160),
      state: safeString(vendor.state, 160),
      pincode: safePincode(vendor.pincode),
      plusCode: safeString(vendor.plusCode, 80),
      latitude: safeCoord(vendor.latitude, 'lat'),
      longitude: safeCoord(vendor.longitude, 'lng')
    },
    hours: {
      operatingHours: safeString(vendor.operatingHours, 500),
      hoursTable: Array.isArray(vendor.hoursTable) ? vendor.hoursTable.slice(0, 10) : []
    },
    social: {
      website: safeString(vendor.website, 800),
      instagram: safeString(vendor.instagram || (vendor.socials && vendor.socials.instagram), 500),
      facebook: safeString(vendor.facebook || (vendor.socials && vendor.socials.facebook), 500),
      linkedin: safeString(vendor.linkedin || (vendor.socials && vendor.socials.linkedin), 500),
      youtube: safeString(vendor.youtube || (vendor.socials && vendor.socials.youtube), 500),
      twitter: safeString(vendor.twitter || (vendor.socials && vendor.socials.twitter), 500)
    },
    reputation: {
      rating: safeRating(vendor.rating),
      reviewsCount: Number.isFinite(Number(vendor.reviewsCount ?? vendor.reviewCount)) ? Number(vendor.reviewsCount ?? vendor.reviewCount) : '',
      reviews: arrayBy(vendor.topReviews || vendor.reviewSamples || [], r => safeString(r && (r.text || r.reviewBody), 200)),
      ownerResponses: arrayBy(vendor.ownerResponses || [], r => safeString(r && (r.text || r.response), 200))
    },
    catalog: {
      services: mergeNamed([], Array.isArray(vendor.services) ? vendor.services : []),
      products: mergeNamed([], Array.isArray(vendor.products) ? vendor.products : []),
      amenities: arrayBy(vendor.amenities || [], String),
      payments: arrayBy(vendor.payments || [], String),
      accessibility: arrayBy(vendor.accessibility || [], String),
      languages: arrayBy((vendor.languages || []).map(normaliseLanguage), String),
      bookingLinks: mergeLinks([], Array.isArray(vendor.bookingLinks) ? vendor.bookingLinks : []),
      menuLink: safeString(vendor.menuLink, 800),
      offers: arrayBy(vendor.offers || [], o => safeString(o && (o.name || o.title), 160))
    },
    legal: {
      gstin: validateGSTIN(vendor.gstin || (vendor.legal && vendor.legal.gstin)) ? String(vendor.gstin || (vendor.legal && vendor.legal.gstin)).toUpperCase() : '',
      pan: validatePAN(vendor.pan || (vendor.legal && vendor.legal.pan)) ? String(vendor.pan || (vendor.legal && vendor.legal.pan)).toUpperCase() : '',
      cin: validateCIN(vendor.cin || (vendor.legal && vendor.legal.cin)) ? String(vendor.cin || (vendor.legal && vendor.legal.cin)).toUpperCase() : ''
    },
    media: {
      logo: (safeString(vendor.logo, 1000) && !/ui-avatars\.com/i.test(vendor.logo)) ? vendor.logo : '',
      images: arrayBy((vendor.images || []).filter(u => !/ui-avatars\.com/i.test(u)), String),
      photos: arrayBy((vendor.photos || []).filter(u => !/ui-avatars\.com/i.test(u)), String)
    },
    answers: {
      faqs: arrayBy(vendor.faqs || [], f => safeString(f && f.question, 160)),
      certifications: arrayBy(vendor.certifications || [], String),
      awards: arrayBy(vendor.awards || [], String),
      popularTimes: arrayBy(vendor.popularTimes || [], String)
    }
  };
}

function builderFromGroups(groups) {
  const meta = {};
  for (const group of FIELD_GROUPS) {
    for (const field of group.fields) {
      const value = groups[group.key] && groups[group.key][field.key];
      meta[field.path] = {
        status: meaningful(value) ? 'known' : 'unknown',
        source: meaningful(value) ? 'existing' : '',
        confidence: meaningful(value) ? 0.55 : 0,
        updatedAt: null
      };
    }
  }

  const mark = (group, key, value, source, confidence) => {
    if (!groups[group]) groups[group] = {};
    groups[group][key] = value;
    const path = `${group}.${key}`;
    meta[path] = {
      status: meaningful(value) ? 'known' : 'unknown',
      source: meaningful(value) ? source : '',
      confidence: meaningful(value) ? confidence : 0,
      updatedAt: new Date().toISOString()
    };
  };

  return { groups, meta, mark };
}

function applyWebsite(builder, website) {
  if (!website || !website.ok) return;
  const { groups, mark } = builder;
  const w = website;

  if (w.identity.name) mark('identity', 'name', w.identity.name, 'website', 0.9);
  if (w.identity.legalName) mark('identity', 'legalName', w.identity.legalName, 'website_jsonld', 0.95);
  if (w.identity.description) mark('identity', 'description', w.identity.description, 'website', 0.88);
  if (w.identity.tagline) mark('identity', 'tagline', w.identity.tagline, 'website', 0.82);
  if (w.identity.priceRange) mark('identity', 'priceRange', w.identity.priceRange, 'website_jsonld', 0.86);

  const phones = normalisePhoneList([
    ...groups.contact.phones,
    ...(w.contact.phones || []).map(p => ({ ...p, source: 'website' }))
  ]);
  if (phones.length) {
    const best = pickBestPhone(phones) || phones[0];
    mark('contact', 'phones', phones, 'website_contact', 0.94);
    mark('contact', 'phone', best.e164, 'website_contact', best.isMobile ? 0.96 : 0.9);
  }
  const emails = arrayBy([...(groups.contact.emails || []), ...(w.contact.emails || [])], e => String(e).toLowerCase());
  if (emails.length) {
    mark('contact', 'emails', emails, 'website_contact', 0.92);
    mark('contact', 'email', emails[0], 'website_contact', 0.92);
  }
  if (w.contact.whatsapp) mark('contact', 'whatsapp', w.contact.whatsapp, 'website_social', 0.9);

  if (w.address && w.address.full) {
    mark('location', 'address', w.address.full, 'website_address', 0.86);
    if (w.address.locality) mark('location', 'locality', w.address.locality, 'website_address', 0.78);
    if (w.address.city) mark('location', 'city', w.address.city, 'website_address', 0.8);
    if (w.address.district) mark('location', 'district', w.address.district, 'website_address', 0.72);
    if (w.address.state) mark('location', 'state', w.address.state, 'website_address', 0.8);
    if (w.address.pincode) mark('location', 'pincode', w.address.pincode, 'website_address', 0.9);
  }
  if (w.geo && w.geo.lat) {
    mark('location', 'latitude', safeCoord(w.geo.lat, 'lat'), 'website_jsonld', 0.8);
    mark('location', 'longitude', safeCoord(w.geo.lng, 'lng'), 'website_jsonld', 0.8);
  }

  if (w.hours && w.hours.raw) mark('hours', 'operatingHours', w.hours.raw, 'website_jsonld', 0.86);
  if (w.hours && w.hours.specifications && w.hours.specifications.length) {
    mark('hours', 'hoursTable', w.hours.specifications, 'website_jsonld', 0.86);
  }

  if (w.finalUrl) mark('social', 'website', w.finalUrl, 'website', 0.94);
  for (const key of ['instagram', 'facebook', 'linkedin', 'youtube', 'twitter']) {
    if (w.socials && w.socials[key]) mark('social', key, w.socials[key], 'website_social', 0.92);
  }

  if (w.reviews) {
    if (w.reviews.rating != null) mark('reputation', 'rating', safeRating(w.reviews.rating), 'website_jsonld', 0.85);
    if (w.reviews.count != null) mark('reputation', 'reviewsCount', Number(w.reviews.count), 'website_jsonld', 0.85);
    if (w.reviews.topReviews && w.reviews.topReviews.length) {
      mark('reputation', 'reviews', arrayBy(w.reviews.topReviews, r => safeString(r.text, 120)), 'website_jsonld', 0.82);
    }
  }

  if (w.services && w.services.length) {
    mark('catalog', 'services', mergeNamed(groups.catalog.services, w.services), 'website', 0.84);
  }
  if (w.products && w.products.length) {
    mark('catalog', 'products', mergeNamed(groups.catalog.products, w.products), 'website', 0.84);
  }
  if (w.amenities && w.amenities.length) mark('catalog', 'amenities', arrayBy([...groups.catalog.amenities, ...w.amenities], String), 'website_jsonld', 0.8);
  if (w.payments && w.payments.length) mark('catalog', 'payments', arrayBy([...groups.catalog.payments, ...w.payments], String), 'website_jsonld', 0.8);
  if (w.accessibility && w.accessibility.length) mark('catalog', 'accessibility', arrayBy([...groups.catalog.accessibility, ...w.accessibility], String), 'website_jsonld', 0.8);
  if (w.languages && w.languages.length) {
    mark('catalog', 'languages', arrayBy([...groups.catalog.languages, ...w.languages].map(normaliseLanguage), String), 'website_jsonld', 0.8);
  }
  if (w.bookingLinks && w.bookingLinks.length) mark('catalog', 'bookingLinks', mergeLinks(groups.catalog.bookingLinks, w.bookingLinks), 'website', 0.85);
  if (w.offers && w.offers.length) mark('catalog', 'offers', arrayBy([...groups.catalog.offers, ...w.offers], o => o.name || o.title), 'website_jsonld', 0.82);

  if (w.legal) {
    if (w.legal.gstin && validateGSTIN(w.legal.gstin)) mark('legal', 'gstin', w.legal.gstin.toUpperCase(), 'website_legal', 0.99);
    if (w.legal.pan && validatePAN(w.legal.pan)) mark('legal', 'pan', w.legal.pan.toUpperCase(), 'website_legal', 0.97);
    if (w.legal.cin && validateCIN(w.legal.cin)) mark('legal', 'cin', w.legal.cin.toUpperCase(), 'website_legal', 0.99);
  }

  if (w.identity.logo && !/ui-avatars\.com/i.test(w.identity.logo)) {
    mark('media', 'logo', w.identity.logo, w.identity.logoSource || 'website', 0.9);
  }
  if (w.identity.images && w.identity.images.length) {
    mark('media', 'images', arrayBy([...groups.media.images, ...w.identity.images.map(i => i.url || i)], String), 'website', 0.82);
  }

  if (w.faqs && w.faqs.length) mark('answers', 'faqs', arrayBy([...groups.answers.faqs, ...w.faqs], f => safeString(f.question, 120)), 'website_jsonld', 0.88);
  if (w.certifications && w.certifications.length) mark('answers', 'certifications', arrayBy([...groups.answers.certifications, ...w.certifications], String), 'website', 0.8);
  if (w.awards && w.awards.length) mark('answers', 'awards', arrayBy([...groups.answers.awards, ...w.awards], String), 'website', 0.8);
}

function applyGoogle(builder, google) {
  if (!google || !google.ok || !google.data) return;
  const { groups, mark } = builder;
  const g = google.data;

  if (g.name) mark('identity', 'name', g.name, 'google_maps', 0.97);
  if (g.category) mark('identity', 'category', g.category, 'google_maps', 0.93);
  if (g.priceLevel) mark('identity', 'priceRange', g.priceLevel, 'google_maps', 0.85);
  if (g.businessStatus) mark('identity', 'businessStatus', g.businessStatus, 'google_maps', 0.9);
  if (g.ownerName) mark('identity', 'ownerName', g.ownerName, 'google_maps', 0.86);

  const phones = normalisePhoneList([
    ...groups.contact.phones,
    ...(g.phones || []).map(p => ({ ...p, source: 'google_maps' }))
  ]);
  if (phones.length) {
    const best = pickBestPhone(phones) || phones[0];
    mark('contact', 'phones', phones, 'google_maps', 0.95);
    mark('contact', 'phone', best.e164, 'google_maps', best.isMobile ? 0.98 : 0.92);
  }

  if (g.address) mark('location', 'address', g.address, 'google_maps', 0.96);
  if (g.addressComponents) {
    if (g.addressComponents.locality) mark('location', 'locality', g.addressComponents.locality, 'google_maps', 0.85);
    if (g.addressComponents.city) mark('location', 'city', g.addressComponents.city, 'google_maps', 0.9);
    if (g.addressComponents.district) mark('location', 'district', g.addressComponents.district, 'google_maps', 0.82);
    if (g.addressComponents.state) mark('location', 'state', g.addressComponents.state, 'google_maps', 0.9);
  }
  if (g.pincode) mark('location', 'pincode', g.pincode, 'google_maps', 0.97);
  if (g.plusCode) mark('location', 'plusCode', g.plusCode, 'google_maps', 0.95);
  if (g.coordinates && g.coordinates.lat) {
    mark('location', 'latitude', safeCoord(g.coordinates.lat, 'lat'), 'google_maps', 0.98);
    mark('location', 'longitude', safeCoord(g.coordinates.lng, 'lng'), 'google_maps', 0.98);
  }

  if (g.hours) {
    const raw = g.hours.raw || (g.hours.table || []).map(h => `${h.day}: ${h.hours}`).join('; ');
    if (raw) mark('hours', 'operatingHours', raw, 'google_maps', 0.9);
    if (g.hours.table && g.hours.table.length) mark('hours', 'hoursTable', g.hours.table, 'google_maps', 0.94);
  }

  if (g.website) mark('social', 'website', g.website, 'google_maps', 0.9);

  if (g.rating != null) mark('reputation', 'rating', safeRating(g.rating), 'google_maps', 0.96);
  if (g.reviewsCount != null) mark('reputation', 'reviewsCount', Number(g.reviewsCount), 'google_maps', 0.95);
  if (g.reviews && g.reviews.length) {
    mark('reputation', 'reviews', arrayBy(g.reviews, r => safeString(r.text, 120)), 'google_maps', 0.93);
    const responses = g.reviews
      .filter(r => r.response)
      .map(r => ({ author: r.author, text: r.response, review: r.text }));
    if (responses.length) mark('reputation', 'ownerResponses', arrayBy(responses, r => safeString(r.text, 120)), 'google_maps', 0.88);
  }

  const classified = classifyGoogleAttributes(g.attributeGroups || []);
  if (classified.amenities.length) mark('catalog', 'amenities', arrayBy([...groups.catalog.amenities, ...classified.amenities], String), 'google_maps', 0.84);
  if (classified.accessibility.length) mark('catalog', 'accessibility', arrayBy([...groups.catalog.accessibility, ...classified.accessibility], String), 'google_maps', 0.84);
  if (classified.payments.length) mark('catalog', 'payments', arrayBy([...groups.catalog.payments, ...classified.payments], String), 'google_maps', 0.84);
  if (classified.languages.length) mark('catalog', 'languages', arrayBy([...groups.catalog.languages, ...classified.languages], String), 'google_maps', 0.84);
  if (g.menuLink) mark('catalog', 'menuLink', g.menuLink, 'google_maps', 0.9);
  if (g.bookingLinks && g.bookingLinks.length) mark('catalog', 'bookingLinks', mergeLinks(groups.catalog.bookingLinks, g.bookingLinks), 'google_maps', 0.86);

  if (g.photos && g.photos.length) {
    mark('media', 'photos', arrayBy([...groups.media.photos, ...g.photos], String), 'google_maps', 0.9);
    mark('media', 'images', arrayBy([...groups.media.images, ...g.photos], String), 'google_maps', 0.86);
  }
  if (g.popularTimes && g.popularTimes.length) mark('answers', 'popularTimes', arrayBy([...groups.answers.popularTimes, ...g.popularTimes], String), 'google_maps', 0.78);
}

function addressTokens(value) {
  const STOPWORDS = new Set([
    'india', 'ind', 'and', 'the', 'near', 'opp', 'opposite', 'behind', 'beside',
    'road', 'rd', 'street', 'st', 'lane', 'ln', 'floor', 'flr', 'no', 'plot',
    'door', 'building', 'bldg', 'complex', 'block', 'sector'
  ]);
  return new Set(
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter(token => token.length > 1 && !STOPWORDS.has(token))
  );
}

/**
 * Similarity between two addresses. Uses token overlap instead of exact text
 * because Google, the website and the existing record format the same address
 * differently (landmarks, country suffix, spacing).
 */
function addressSimilarity(a, b) {
  const A = addressTokens(a);
  const B = addressTokens(b);
  if (!A.size || !B.size) return 0;
  let intersection = 0;
  for (const token of A) {
    if (B.has(token)) intersection++;
  }
  const jaccard = intersection / (A.size + B.size - intersection);
  const containment = intersection / Math.min(A.size, B.size);
  return Math.max(jaccard, containment * 0.9);
}

function collectConflicts({ vendor, website, google, groups }) {
  const conflicts = [];
  const add = (field, label, values, chosen, chosenSource, reason) => {
    const unique = arrayBy(values.filter(v => meaningful(v.value)), v => `${v.source}|${v.value}`);
    if (unique.length < 2) return;
    conflicts.push({ field, label, values: unique, chosen, chosenSource, reason });
  };

  const g = google && google.ok ? google.data : null;
  const w = website && website.ok ? website : null;

  // Pincodes
  const pins = [];
  if (vendor.pincode) pins.push({ value: safePincode(vendor.pincode), source: 'existing' });
  if (w && w.address && w.address.pincode) pins.push({ value: safePincode(w.address.pincode), source: 'website' });
  if (g && g.pincode) pins.push({ value: safePincode(g.pincode), source: 'google_maps' });
  const distinctPins = arrayBy(pins.filter(p => p.value), p => p.value);
  if (distinctPins.length > 1) {
    add('location.pincode', 'Pincode', distinctPins, groups.location.pincode, 'merged', 'Sources report different pincodes');
  }

  // States
  const states = [];
  if (vendor.state) states.push({ value: safeString(vendor.state, 80), source: 'existing' });
  if (w && w.address && w.address.state) states.push({ value: safeString(w.address.state, 80), source: 'website' });
  if (g && g.addressComponents && g.addressComponents.state) states.push({ value: safeString(g.addressComponents.state, 80), source: 'google_maps' });
  if (arrayBy(states.filter(s => s.value), s => s.value.toLowerCase()).length > 1) {
    add('location.state', 'State', states, groups.location.state, 'merged', 'Sources report different states');
  }

  // Rating drift
  const ratings = [];
  if (safeRating(vendor.rating)) ratings.push({ value: safeRating(vendor.rating), source: 'existing' });
  if (w && w.reviews && w.reviews.rating != null) ratings.push({ value: safeRating(w.reviews.rating), source: 'website' });
  if (g && g.rating != null) ratings.push({ value: safeRating(g.rating), source: 'google_maps' });
  const ratingValues = [...new Set(ratings.map(r => Number(r.value)))].filter(Number.isFinite);
  if (ratingValues.length > 1 && Math.max(...ratingValues) - Math.min(...ratingValues) > 0.3) {
    add('reputation.rating', 'Rating', ratings, groups.reputation.rating, 'google_maps', 'Ratings differ by more than 0.3');
  }

  // Website domain conflicts
  const sites = [];
  if (vendor.website) sites.push({ value: vendor.website, source: 'existing' });
  if (g && g.website) sites.push({ value: g.website, source: 'google_maps' });
  const hosts = arrayBy(sites.filter(s => s.value), s => {
    try { return new URL(s.value).hostname.replace(/^www\./i, ''); } catch (e) { return ''; }
  });
  if (hosts.length > 1) {
    add('social.website', 'Website', sites, groups.social.website, 'google_maps', 'More than one website domain was found');
  }

  // GSTIN
  const gstins = [];
  if (validateGSTIN(vendor.gstin)) gstins.push({ value: String(vendor.gstin).toUpperCase(), source: 'existing' });
  if (w && validateGSTIN(w.legal && w.legal.gstin)) gstins.push({ value: String(w.legal.gstin).toUpperCase(), source: 'website' });
  if (arrayBy(gstins, x => x.value).length > 1) {
    add('legal.gstin', 'GSTIN', gstins, groups.legal.gstin, 'website_legal', 'Different GSTINs were observed');
  }

  // Address text conflict (only when both look complete)
  const addresses = [];
  if (vendor.address) addresses.push({ value: vendor.address, source: 'existing' });
  if (w && w.address && w.address.full) addresses.push({ value: w.address.full, source: 'website' });
  if (g && g.address) addresses.push({ value: g.address, source: 'google_maps' });
  const candidates = addresses.filter(a => a.value && a.value.length > 25);
  let addressConflict = false;
  for (let i = 0; i < candidates.length && !addressConflict; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const pinA = safePincode(candidates[i].value);
      const pinB = safePincode(candidates[j].value);
      // Different pincodes already produce their own, more precise conflict.
      if (pinA && pinB && pinA !== pinB) continue;
      if (addressSimilarity(candidates[i].value, candidates[j].value) < 0.62) {
        addressConflict = true;
        break;
      }
    }
  }
  if (addressConflict) {
    add('location.address', 'Address', addresses, groups.location.address, 'google_maps', 'Addresses differ across sources');
  }

  return conflicts;
}

function computeCompleteness(groups, conflicts = []) {
  const conflictFields = new Set(conflicts.map(c => c.field));
  const byGroup = {};
  let known = 0;
  let total = 0;
  let weighted = 0;

  for (const group of FIELD_GROUPS) {
    byGroup[group.key] = { label: group.label, known: 0, total: group.fields.length, percent: 0 };
    for (const field of group.fields) {
      total++;
      const value = groups[group.key] && groups[group.key][field.key];
      const isKnown = meaningful(value);
      if (isKnown) {
        known++;
        byGroup[group.key].known++;
      }
      if (isKnown) weighted += conflictFields.has(field.path) ? field.weight * 0.5 : field.weight;
    }
    byGroup[group.key].percent = Math.round((byGroup[group.key].known / Math.max(1, byGroup[group.key].total)) * 100);
  }

  const percent = Math.round((weighted / Math.max(1, TOTAL_WEIGHT)) * 100);
  return {
    percent,
    known,
    total,
    weighted: Math.round(weighted * 10) / 10,
    totalWeight: TOTAL_WEIGHT,
    byGroup,
    bucket: percent >= 85 ? 'excellent' : percent >= 70 ? 'strong' : percent >= 50 ? 'fair' : 'thin'
  };
}

function buildFieldStatus(groups, meta, conflicts) {
  const conflictMap = new Map(conflicts.map(c => [c.field, c]));
  const status = {};
  for (const field of FIELD_DEFS) {
    const value = groups[field.group] && groups[field.group][field.key];
    if (!meaningful(value)) status[field.path] = 'unknown';
    else if (conflictMap.has(field.path)) status[field.path] = 'conflict';
    else status[field.path] = (meta[field.path] && meta[field.path].status) || 'known';
  }
  return status;
}

function provenanceFor(website, google) {
  const items = [];
  if (website && website.ok) {
    for (const item of website.provenance || []) {
      items.push({ ...item, source: item.source || 'website' });
    }
  }
  if (google && google.ok && google.data) {
    const g = google.data;
    const push = (field, value, confidence) => {
      if (!meaningful(value)) return;
      items.push({
        field,
        value,
        source: 'google_maps',
        confidence,
        url: google.url || g.mapsLink,
        extractedAt: google.fetchedAt
      });
    };
    push('identity.name', g.name, 0.97);
    push('identity.category', g.category, 0.93);
    push('contact.phone', g.phone && g.phone.e164, 0.98);
    push('location.address', g.address, 0.96);
    push('location.pincode', g.pincode, 0.97);
    push('location.plusCode', g.plusCode, 0.95);
    push('social.website', g.website, 0.9);
    push('reputation.rating', g.rating, 0.96);
    push('reputation.reviewsCount', g.reviewsCount, 0.95);
    push('hours.operatingHours', g.hours && g.hours.raw, 0.9);
    push('identity.businessStatus', g.businessStatus, 0.9);
  }
  return arrayBy(items, i => `${i.field}|${JSON.stringify(i.value).slice(0, 80)}|${i.source}`).slice(0, 200);
}

function applyGroupsToVendor(vendor, groups, profile) {
  const contact = groups.contact || {};
  const location = groups.location || {};
  const social = groups.social || {};
  const reputation = groups.reputation || {};
  const catalog = groups.catalog || {};
  const legal = groups.legal || {};
  const media = groups.media || {};
  const identity = groups.identity || {};
  const hours = groups.hours || {};
  const answers = groups.answers || {};

  // Conservative merge: an absent deep value must never erase data that was
  // already discovered by the feed scraper or a previous enrichment pass.
  const keep = (current, next) => (meaningful(next) ? next : (current == null ? '' : current));

  // A Maps/deep pass can surface UI chrome ("Results", "Sponsored") as the
  // page title. Never let that replace a real business name.
  const fidelity = require('./categoryFidelity');
  if (meaningful(identity.name) && !fidelity.isGenericName(identity.name)) {
    vendor.name = identity.name;
  } else if (fidelity.isGenericName(vendor.name) && meaningful(vendor.normalizedName)) {
    vendor.name = vendor.normalizedName.replace(/\b\w/g, c => c.toUpperCase());
  }
  vendor.legalName = keep(vendor.legalName, identity.legalName);
  vendor.category = keep(vendor.category, identity.category);
  vendor.description = keep(vendor.description, identity.description);
  vendor.tagline = keep(vendor.tagline, identity.tagline);
  vendor.priceRange = keep(vendor.priceRange, identity.priceRange);
  vendor.businessStatus = keep(vendor.businessStatus, identity.businessStatus);
  vendor.ownerName = keep(vendor.ownerName, identity.ownerName);

  const existingPhones = normalisePhoneList([
    ...(Array.isArray(vendor.phones) ? vendor.phones : []),
    vendor.phone
  ]);
  const incomingPhones = Array.isArray(contact.phones) ? contact.phones : [];
  // Prioritize mobiles first in the normalized list
  const combinedPhones = normalisePhoneList([...existingPhones, ...incomingPhones]);
  combinedPhones.sort((a, b) => Number(b.isMobile) - Number(a.isMobile));
  vendor.phones = combinedPhones;

  const bestPhoneObj = vendor.phones.find(p => p && p.isMobile) || vendor.phones.find(p => p && p.isLandline) || vendor.phones[0] || null;
  const incomingPhone = safePhoneValue(contact.phone);

  const hasExistingPhone = meaningful(vendor.phone) && !String(vendor.phone).includes('Requires') && !String(vendor.phone).includes('No mobile');
  const existingIsMobile = hasExistingPhone && /^[6-9]\d{9}$/.test(String(vendor.phone).replace(/\D/g, '').slice(-10));

  // IMMUTABLE PHONE PRESERVATION RULE:
  // 1. Once a valid mobile number is extracted, it can NEVER be overwritten by empty/null/landline.
  // 2. If website or deep crawl only finds a landline, keep existing mobile as primary.
  // 3. If a new mobile is found, upgrade landline to mobile.
  if (bestPhoneObj?.isMobile) {
    vendor.phone = bestPhoneObj.e164;
  } else if (existingIsMobile) {
    // Keep existing mobile number untouched!
  } else if (bestPhoneObj?.e164) {
    vendor.phone = bestPhoneObj.e164;
  } else if (incomingPhone) {
    vendor.phone = incomingPhone;
  } else if (hasExistingPhone) {
    // Keep existing phone intact
  } else {
    vendor.phone = '';
  }

  const existingEmails = (Array.isArray(vendor.emails) ? vendor.emails : []).filter(isValidEmail);
  const incomingEmails = (Array.isArray(contact.emails) ? contact.emails : []).filter(isValidEmail);
  vendor.emails = arrayBy([...incomingEmails, ...existingEmails, isValidEmail(vendor.email) ? vendor.email : ''].filter(Boolean), e => String(e).toLowerCase());
  vendor.email = isValidEmail(contact.email)
    ? contact.email
    : (isValidEmail(vendor.email) ? vendor.email : (vendor.emails[0] || ''));
  const bestPhone = vendor.phones.find(p => p.isMobile) || vendor.phones[0] || null;
  vendor.whatsappAvailable = Boolean(bestPhone && bestPhone.isMobile);
  vendor.whatsappLink = contact.whatsapp || (bestPhone && bestPhone.whatsapp
    ? `https://wa.me/${String(bestPhone.e164).replace(/\D/g, '')}${vendor.name ? `?text=${encodeURIComponent(`Hi ${vendor.name}, I found your business on scraper.co.in and wanted to connect.`)}` : ''}`
    : '');

  vendor.address = keep(vendor.address, location.address);
  if (meaningful(location.city)) vendor.city = location.city;
  else if (!meaningful(vendor.city)) vendor.city = location.district || location.locality || '';
  vendor.locality = keep(vendor.locality, location.locality);
  vendor.district = keep(vendor.district, location.district);
  vendor.state = keep(vendor.state, location.state);
  vendor.pincode = safePincode(location.pincode) || safePincode(vendor.pincode);
  vendor.plusCode = keep(vendor.plusCode, location.plusCode);
  vendor.latitude = safeCoord(location.latitude, 'lat') || safeCoord(vendor.latitude, 'lat');
  vendor.longitude = safeCoord(location.longitude, 'lng') || safeCoord(vendor.longitude, 'lng');

  vendor.operatingHours = keep(vendor.operatingHours, hours.operatingHours);
  vendor.hoursTable = arrayBy([
    ...(Array.isArray(vendor.hoursTable) ? vendor.hoursTable : []),
    ...(Array.isArray(hours.hoursTable) ? hours.hoursTable : [])
  ], r => `${r && r.day}|${r && r.hours}`);

  vendor.website = keep(vendor.website, social.website);
  vendor.instagram = keep(vendor.instagram, social.instagram);
  vendor.facebook = keep(vendor.facebook, social.facebook);
  vendor.linkedin = keep(vendor.linkedin, social.linkedin);
  vendor.youtube = keep(vendor.youtube, social.youtube);
  vendor.twitter = keep(vendor.twitter, social.twitter);
  vendor.socials = {
    website: vendor.website,
    instagram: vendor.instagram,
    facebook: vendor.facebook,
    linkedin: vendor.linkedin,
    youtube: vendor.youtube,
    twitter: vendor.twitter
  };

  vendor.rating = safeRating(reputation.rating) || safeRating(vendor.rating);
  vendor.reviewsCount = meaningful(reputation.reviewsCount)
    ? Number(reputation.reviewsCount)
    : (meaningful(vendor.reviewsCount) ? vendor.reviewsCount : '');
  vendor.topReviews = arrayBy([
    ...(Array.isArray(vendor.topReviews) ? vendor.topReviews : []),
    ...(Array.isArray(reputation.reviews) ? reputation.reviews : [])
  ], r => safeString(r && (r.text || r.reviewBody || r.author), 200));
  vendor.ownerResponses = arrayBy([
    ...(Array.isArray(vendor.ownerResponses) ? vendor.ownerResponses : []),
    ...(Array.isArray(reputation.ownerResponses) ? reputation.ownerResponses : [])
  ], r => safeString(r && (r.text || r.response || r), 200));

  vendor.services = mergeNamed(Array.isArray(vendor.services) ? vendor.services : [], Array.isArray(catalog.services) ? catalog.services : []);
  vendor.products = mergeNamed(Array.isArray(vendor.products) ? vendor.products : [], Array.isArray(catalog.products) ? catalog.products : []);
  vendor.amenities = arrayBy([...(vendor.amenities || []), ...(catalog.amenities || [])], String);
  vendor.payments = arrayBy([...(vendor.payments || []), ...(catalog.payments || [])], String);
  vendor.accessibility = arrayBy([...(vendor.accessibility || []), ...(catalog.accessibility || [])], String);
  vendor.languages = arrayBy([...(vendor.languages || []), ...(catalog.languages || [])].map(normaliseLanguage), String);
  vendor.bookingLinks = mergeLinks(Array.isArray(vendor.bookingLinks) ? vendor.bookingLinks : [], Array.isArray(catalog.bookingLinks) ? catalog.bookingLinks : []);
  vendor.menuLink = keep(vendor.menuLink, catalog.menuLink);
  vendor.offers = arrayBy([...(vendor.offers || []), ...(catalog.offers || [])], o => safeString(o && (o.name || o.title || o), 160));

  vendor.gstin = validateGSTIN(legal.gstin) ? String(legal.gstin).toUpperCase() : keep(vendor.gstin, '');
  vendor.pan = validatePAN(legal.pan) ? String(legal.pan).toUpperCase() : keep(vendor.pan, '');
  vendor.cin = validateCIN(legal.cin) ? String(legal.cin).toUpperCase() : keep(vendor.cin, '');
  vendor.legal = {
    gstin: vendor.gstin,
    pan: vendor.pan,
    cin: vendor.cin,
    legalName: vendor.legalName
  };

  const incomingLogo = media.logo && !/ui-avatars\.com/i.test(media.logo) ? media.logo : '';
  if (incomingLogo) vendor.logo = incomingLogo;
  vendor.images = arrayBy([
    ...(Array.isArray(vendor.images) ? vendor.images : []),
    ...(Array.isArray(media.images) ? media.images : [])
  ].filter(u => u && !/ui-avatars\.com/i.test(u)), String);
  vendor.photos = arrayBy([
    ...(Array.isArray(vendor.photos) ? vendor.photos : []),
    ...(Array.isArray(media.photos) ? media.photos : [])
  ].filter(u => u && !/ui-avatars\.com/i.test(u)), String);
  if (vendor.logo && !/ui-avatars\.com/i.test(vendor.logo)) vendor.avatar = vendor.logo;
  else if (!vendor.avatar) vendor.avatar = vendor.logo || '';

  vendor.faqs = arrayBy([...(vendor.faqs || []), ...(answers.faqs || [])], f => safeString(f && (f.question || f), 160));
  vendor.certifications = arrayBy([...(vendor.certifications || []), ...(answers.certifications || [])], String);
  vendor.awards = arrayBy([...(vendor.awards || []), ...(answers.awards || [])], String);
  vendor.popularTimes = arrayBy([...(vendor.popularTimes || []), ...(answers.popularTimes || [])], String);

  vendor.deepExtractedAt = profile.extractedAt;
  vendor.deepVersion = profile.version;
  vendor.deepSources = profile.sources;
  vendor.deepWarnings = profile.warnings;
  vendor.deepAlternateNames = profile.alternateNames;
  vendor.deepAlternatePhones = profile.alternatePhones;
  vendor.conflicts = profile.conflicts;
  vendor.fieldStatus = profile.fieldStatus;
  vendor.profileQuality = {
    score: profile.completeness.percent,
    bucket: profile.completeness.bucket,
    knownFields: profile.completeness.known,
    totalFields: profile.completeness.total,
    byGroup: profile.completeness.byGroup,
    updatedAt: profile.extractedAt
  };
  vendor.enrichmentSources = Object.entries(profile.sources || {})
    .filter(([, value]) => value && value.ok)
    .map(([key]) => key);
}

function saveProfileFile(vendorId, profile) {
  const file = profilePath(vendorId);
  try {
    fs.writeFileSync(file, JSON.stringify(profile));
    return file;
  } catch (e) {
    console.error('[DeepProfile] Failed to write profile file:', e.message);
    return '';
  }
}

function loadProfileFile(vendorId) {
  const file = profilePath(vendorId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

/**
 * Pure merge of extraction sources into a canonical profile.
 * Exported for tests and for replaying saved extraction payloads.
 */
function buildProfileFromSources(vendor, website, google, options = {}) {
  const groups = baseGroups(vendor);
  const builder = builderFromGroups(groups);
  applyWebsite(builder, website);
  applyGoogle(builder, google);

  const conflicts = collectConflicts({ vendor, website, google, groups: builder.groups });
  const completeness = computeCompleteness(builder.groups, conflicts);
  const fieldStatus = buildFieldStatus(builder.groups, builder.meta, conflicts);
  const provenance = provenanceFor(website, google);
  const warnings = arrayBy([
    ...((website && website.warnings) || []).map(w => `Website: ${w}`),
    ...((google && google.warnings) || []).map(w => `Google Maps: ${w}`)
  ], String);

  const alternateNames = arrayBy([
    vendor.name,
    website && website.identity && website.identity.name,
    website && website.identity && website.identity.legalName,
    google && google.data && google.data.name
  ].filter(Boolean).map(v => safeString(v, 200)), v => v.toLowerCase()).slice(0, 6);

  const alternatePhones = normalisePhoneList([
    ...(vendor.phones || []),
    ...((website && website.contact && website.contact.phones) || []),
    ...((google && google.data && google.data.phones) || [])
  ]).map(p => ({ e164: p.e164, national: p.national, type: p.type, source: p.source }));

  const profile = {
    version: VERSION,
    vendorId: vendor.id,
    extractedAt: new Date().toISOString(),
    sources: {
      website: website ? {
        ok: Boolean(website.ok),
        url: website.finalUrl || website.url,
        pagesCrawled: website.pagesCrawled || 0,
        fetchedAt: website.fetchedAt,
        warnings: website.warnings || []
      } : { ok: false, url: options.websiteUrl || vendor.website || '', skipped: options.includeWebsite === false },
      google: google ? {
        ok: Boolean(google.ok),
        url: google.url,
        fetchedAt: google.fetchedAt,
        durationMs: google.durationMs,
        warnings: google.warnings || []
      } : { ok: false, url: vendor.mapsLink || '', skipped: options.includeGoogle === false }
    },
    groups: builder.groups,
    fieldMeta: builder.meta,
    fieldStatus,
    completeness,
    quality: { score: completeness.percent, bucket: completeness.bucket },
    conflicts,
    provenance,
    warnings,
    alternateNames,
    alternatePhones,
    googleAttributes: google && google.data ? (google.data.attributeGroups || []) : [],
    errors: options.errors || []
  };

  return { profile, groups: builder.groups, meta: builder.meta, conflicts, completeness };
}

/**
 * Deep-extract one vendor and persist the merged profile.
 */
async function deepExtractVendor(vendorId, options = {}) {
  if (vendorLocks.has(vendorId)) {
    return { ok: false, vendorId, skipped: true, reason: 'A deep extraction is already running for this vendor.' };
  }
  vendorLocks.add(vendorId);

  try {
    const vendors = dbAdapter.getVendors();
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) {
      return { ok: false, vendorId, skipped: true, reason: 'Vendor no longer exists (fresh run purge).' };
    }

    let websiteUrl = options.websiteUrl || vendor.website || '';
    const usableWebsite = (value) => Boolean(value) && /^https?:\/\//i.test(value) &&
      !/instagram\.com|facebook\.com|linkedin\.com|google\.com|wa\.me|whatsapp\.com|youtube\.com|twitter\.com|x\.com/i.test(value);
    let includeWebsite = options.includeWebsite !== false && usableWebsite(websiteUrl);
    const includeGoogle = options.includeGoogle !== false && Boolean(vendor.mapsLink || vendor.name);

    let website = null;
    let google = null;
    const errors = [];

    const runWebsite = async (url) => {
      try {
        return await deepExtractWebsite(url, { maxPages: options.maxWebsitePages || 5 });
      } catch (e) {
        errors.push(`Website: ${e.message}`);
        return null;
      }
    };

    const runGoogle = async () => {
      try {
        return await deepExtractPlace(vendor, { timeoutMs: options.googleTimeoutMs || 35000 });
      } catch (e) {
        errors.push(`Google Maps: ${e.message}`);
        return null;
      }
    };

    if (includeWebsite && includeGoogle) {
      // Website already known: crawl both sources in parallel.
      const [w, g] = await Promise.all([runWebsite(websiteUrl), runGoogle()]);
      website = w;
      google = g;
    } else if (includeGoogle) {
      // Feed cards rarely expose a website. Open Maps first, then crawl the
      // website the place profile reveals in the same enrichment pass.
      google = await runGoogle();
      const discovered = google && google.data && google.data.website;
      if (options.includeWebsite !== false && usableWebsite(discovered)) {
        websiteUrl = discovered;
        includeWebsite = true;
        website = await runWebsite(discovered);
      }
    } else if (includeWebsite) {
      website = await runWebsite(websiteUrl);
    }

    const websiteOk = Boolean(website && website.ok);
    const googleOk = Boolean(google && google.ok);

    if (!websiteOk && !googleOk) {
      vendor.deepAttemptedAt = new Date().toISOString();
      vendor.deepLastError = errors.join(' | ') || 'No extraction source succeeded.';
      dbAdapter.saveVendor(vendor.userId || 'admin_1', vendor);
      return { ok: false, vendorId, error: vendor.deepLastError };
    }

    const { profile, groups, conflicts } = buildProfileFromSources(vendor, website, google, {
      websiteUrl,
      includeWebsite,
      includeGoogle,
      errors
    });

    applyGroupsToVendor(vendor, groups, profile);

    const file = saveProfileFile(vendorId, profile);
    vendor.deepProfileFile = file ? path.relative(require('../config/paths').DATA_DIR, file).replace(/\\/g, '/') : '';
    vendor.deepAttemptedAt = profile.extractedAt;
    vendor.deepLastError = errors.join(' | ') || '';
    dbAdapter.saveVendor(vendor.userId || 'admin_1', vendor);

    return {
      ok: true,
      vendorId,
      name: vendor.name,
      completeness: profile.completeness.percent,
      bucket: profile.completeness.bucket,
      sources: profile.sources,
      conflicts: conflicts.length,
      warnings: profile.warnings.length,
      errors
    };
  } catch (e) {
    console.error('[DeepProfile] Extraction failed:', e.message);
    return { ok: false, vendorId, error: e.message };
  } finally {
    vendorLocks.delete(vendorId);
  }
}

/**
 * Read the full grouped profile for a vendor. Builds a live view from the
 * vendor record when no deep profile file exists yet.
 */
function getVendorProfile(vendorId) {
  const vendor = dbAdapter.getVendors().find(v => v.id === vendorId);
  if (!vendor) return null;

  const stored = loadProfileFile(vendorId);
  const groups = stored && stored.groups ? stored.groups : baseGroups(vendor);
  const conflicts = stored && Array.isArray(stored.conflicts) ? stored.conflicts : (Array.isArray(vendor.conflicts) ? vendor.conflicts : []);
  const completeness = computeCompleteness(groups, conflicts);
  const meta = stored && stored.fieldMeta ? stored.fieldMeta : builderFromGroups(baseGroups(vendor)).meta;
  const fieldStatus = buildFieldStatus(groups, meta, conflicts);

  return {
    vendorId,
    name: vendor.name || '',
    version: stored ? stored.version : VERSION,
    extractedAt: stored ? stored.extractedAt : null,
    attemptedAt: vendor.deepAttemptedAt || null,
    hasDeepProfile: Boolean(stored),
    sources: stored ? stored.sources : {
      website: { ok: false, url: vendor.website || '', skipped: !vendor.website },
      google: { ok: false, url: vendor.mapsLink || '', skipped: !vendor.mapsLink }
    },
    groups,
    fieldGroups: FIELD_GROUPS,
    fieldStatus,
    fieldMeta: meta,
    completeness,
    quality: { score: completeness.percent, bucket: completeness.bucket },
    conflicts,
    provenance: stored ? (stored.provenance || []) : [],
    warnings: stored ? (stored.warnings || []) : [],
    alternateNames: stored ? (stored.alternateNames || []) : [],
    alternatePhones: stored ? (stored.alternatePhones || []) : [],
    googleAttributes: stored ? (stored.googleAttributes || []) : [],
    lastError: vendor.deepLastError || '',
    unknownFields: FIELD_DEFS.filter(f => !meaningful(groups[f.group] && groups[f.group][f.key])).map(f => f.path)
  };
}

function startJob(options = {}) {
  // Remove old completed jobs to keep memory bounded.
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (job.finishedAt && now - new Date(job.finishedAt).getTime() > JOB_RETENTION_MS) jobs.delete(id);
  }

  const allVendors = dbAdapter.getVendors();
  let ids;
  if (Array.isArray(options.vendorIds) && options.vendorIds.length) {
    ids = [...new Set(options.vendorIds.map(String))].filter(id => allVendors.some(v => v.id === id));
  } else {
    ids = allVendors.map(v => v.id);
  }

  if (!options.force) {
    ids = ids.filter(id => {
      const vendor = allVendors.find(v => v.id === id);
      return !vendor || !vendor.deepExtractedAt;
    });
  }

  if (options.onlyWithWebsite) {
    ids = ids.filter(id => {
      const vendor = allVendors.find(v => v.id === id);
      return vendor && vendor.website;
    });
  }

  const limit = Math.max(1, Math.min(750, Number(options.limit) || 100));
  ids = ids.slice(0, limit);

  const id = `deep_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const job = {
    id,
    status: ids.length ? 'queued' : 'completed',
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    total: ids.length,
    completed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    currentVendor: '',
    vendorIds: ids,
    options: {
      force: Boolean(options.force),
      includeWebsite: options.includeWebsite !== false,
      includeGoogle: options.includeGoogle !== false,
      websiteUrl: options.websiteUrl || null,
      concurrency: Math.max(1, Math.min(4, Number(options.concurrency) || 2)),
      limit
    },
    results: [],
    errors: [],
    stopRequested: false
  };

  jobs.set(id, job);

  if (ids.length) {
    setImmediate(() => runJob(job));
  } else {
    job.finishedAt = new Date().toISOString();
  }

  return sanitizeJob(job);
}

async function runJob(job) {
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  let index = 0;
  const concurrency = Math.max(1, Math.min(3, Number(job.options.concurrency) || 2));

  const worker = async () => {
    while (!job.stopRequested) {
      const current = index++;
      if (current >= job.vendorIds.length) break;
      const vendorId = job.vendorIds[current];
      job.currentVendor = vendorId;

      try {
        const result = await deepExtractVendor(vendorId, job.options);
        if (result.skipped) job.skipped++;
        else if (result.ok) job.succeeded++;
        else job.failed++;

        if (job.results.length < 200) job.results.push(result);
        if (!result.ok && job.errors.length < 50) {
          job.errors.push({ vendorId, error: result.error || result.reason || 'Unknown error' });
        }
      } catch (e) {
        job.failed++;
        if (job.errors.length < 50) job.errors.push({ vendorId, error: e.message });
      } finally {
        job.completed++;
      }
    }
  };

  try {
    await Promise.all(Array.from({ length: concurrency }, worker));
    job.status = job.stopRequested ? 'stopped' : 'completed';
  } catch (e) {
    job.status = 'failed';
    job.errors.push({ vendorId: '', error: e.message });
  } finally {
    job.finishedAt = new Date().toISOString();
    job.currentVendor = '';
  }
}

function sanitizeJob(job) {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    total: job.total,
    completed: job.completed,
    succeeded: job.succeeded,
    failed: job.failed,
    skipped: job.skipped,
    progressPercent: job.total ? Math.round((job.completed / job.total) * 100) : 100,
    currentVendor: job.currentVendor,
    options: job.options,
    results: job.results || [],
    errors: job.errors || []
  };
}

function getJob(jobId) {
  const job = jobs.get(jobId);
  return job ? sanitizeJob(job) : null;
}

function listJobs() {
  return Array.from(jobs.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20)
    .map(sanitizeJob);
}

function stopJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return null;
  if (['queued', 'running'].includes(job.status)) {
    job.stopRequested = true;
    job.status = 'stopping';
  }
  return sanitizeJob(job);
}

/**
 * Stop every active deep job. A new fresh-data run purges the leads that an
 * older deep job is still walking, so leaving that job alive only produces a
 * burst of "Vendor not found" results and wasted browser time.
 */
function stopAll(reason = 'superseded') {
  let stopped = 0;
  for (const job of jobs.values()) {
    if (['queued', 'running'].includes(job.status)) {
      job.stopRequested = true;
      job.status = 'stopping';
      job.stopReason = reason;
      stopped += 1;
    }
  }
  return stopped;
}

function getHealth() {
  let profileFiles = 0;
  try {
    profileFiles = fs.readdirSync(DEEP_DIR).filter(f => f.endsWith('.json')).length;
  } catch (e) {}

  const vendors = dbAdapter.getVendors() || [];
  const extracted = vendors.filter(v => v.deepExtractedAt);
  const avgCompleteness = extracted.length
    ? Math.round(extracted.reduce((sum, v) => sum + (Number(v.profileQuality && v.profileQuality.score) || 0), 0) / extracted.length)
    : 0;

  return {
    status: 'ok',
    version: VERSION,
    now: new Date().toISOString(),
    vendors: vendors.length,
    deepExtracted: extracted.length,
    profileFiles,
    avgCompleteness,
    activeJobs: Array.from(jobs.values()).filter(j => ['queued', 'running', 'stopping'].includes(j.status)).length,
    jobHistory: jobs.size,
    fieldGroups: FIELD_GROUPS.length,
    trackedFields: FIELD_DEFS.length,
    locks: vendorLocks.size
  };
}

module.exports = {
  VERSION,
  FIELD_GROUPS,
  FIELD_DEFS,
  buildProfileFromSources,
  applyGroupsToVendor,
  deepExtractVendor,
  getVendorProfile,
  startJob,
  getJob,
  listJobs,
  stopJob,
  stopAll,
  getHealth,
  computeCompleteness,
  baseGroups,
  // exported for tests
  _internal: { meaningful, safePincode, classifyGoogleAttributes, mergeNamed, addressTokens, addressSimilarity }
};
