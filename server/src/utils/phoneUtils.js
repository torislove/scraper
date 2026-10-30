/**
 * phoneUtils.js
 * India-first contact validation.
 *
 * Rules:
 *  - A phone is only "known" when libphonenumber-js can parse it as a valid
 *    Indian number. Pincodes, order ids, years and 6-digit fragments are
 *    rejected instead of being promoted to phone fields.
 *  - Landlines are preserved (with STD code) but never labelled as mobile.
 *  - Extraction from text requires surrounding digit boundaries so a slice of
 *    a longer number can never become a lead.
 */

const { parsePhoneNumberFromString } = require('libphonenumber-js/max');

const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;
const CONTEXT_PHONE_RE = /(?:\bphone\b|\btel\b|\bcall\b|\bcontact\b|\blandline\b|\bhelpline\b|\bmobile\b|\bwhatsapp\b|\bnumber\b|\bph\b|\bmob\b|\boffice\b|\bdesk\b|\benquir(?:y|ies)\b|\bbooking(?:s)?\b|\breach\b|\bsupport\b|\bcell\b)/i;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi;
const GSTIN_RE = /\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z][0-9A-Z]\b/g;
const PAN_RE = /\b[A-Z]{5}\d{4}[A-Z]\b/g;
const CIN_RE = /\b[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}\b/g;

const BLOCKED_EMAIL_DOMAINS = [
  'example.com', 'example.org', 'example.net', 'domain.com', 'email.com',
  'yourdomain.com', 'yourcompany.com', 'sentry.io', 'wixpress.com',
  'sentry-next.wixpress.com', 'test.com', 'localhost'
];

const BLOCKED_EMAIL_LOCALPARTS = [
  'user', 'email', 'name', 'yourname', 'youremail', 'test', 'example'
];

function digitsOnly(value) {
  return String(value == null ? '' : value).replace(/\D/g, '');
}

/**
 * Reject obvious dummy identifiers that libphonenumber can mistake for an
 * Indian landline: 1234567890, 1111111111, 1212121212, etc.
 */
function isObviousSequence(national) {
  const digits = String(national || '');
  if (digits.length < 10) return false;
  if (/^(\d)\1+$/.test(digits)) return true;
  if (['0123456789', '1234567890', '9876543210', '0987654321',
    '1234512345', '5432154321', '1122334455', '5544332211'].includes(digits)) return true;
  // Repeated block: 1212121212, 1231231231, 9879879879
  for (let block = 1; block <= 5; block++) {
    if (digits.length % block !== 0) continue;
    const unit = digits.slice(0, block);
    if (unit.repeat(digits.length / block) === digits) return true;
  }
  // Strict ascending/descending with wrap-around at 9→0 or 0→9
  let ascending = true;
  let descending = true;
  for (let i = 0; i < digits.length - 1; i++) {
    const diff = (Number(digits[i + 1]) - Number(digits[i]) + 10) % 10;
    if (diff !== 1) ascending = false;
    if (diff !== 9) descending = false;
  }
  return ascending || descending;
}

function cleanRawPhone(raw) {
  return String(raw == null ? '' : raw)
    .replace(/^\s*tel:/i, '')
    .replace(/^\s*phone:\s*/i, '')
    .replace(/^\s*mobile:\s*/i, '')
    .replace(/(?:ext\.?|extension|x)\s*\d{1,6}\s*$/i, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

/**
 * Normalize one phone number.
 * @returns {null|{raw:string,e164:string,national:string,international:string,country:string,type:string,isMobile:boolean,isLandline:boolean,isValid:boolean,digits:string,whatsapp:boolean}}
 */
function normalizePhone(raw, opts = {}) {
  const original = cleanRawPhone(raw);
  if (!original) return null;

  let compact = original.replace(/[^\d+]/g, '');
  if (compact.includes('+') && !compact.startsWith('+')) {
    compact = compact.replace(/(?!^)\+/g, '');
  }
  if (!compact) return null;

  // Reject obvious non-phone identifiers before normalization.
  if (/^\d{6}$/.test(compact)) return null;                 // pincode / order fragment
  if (/^(?:19|20)\d{2}$/.test(compact)) return null;        // year
  if (/^0{3,}/.test(compact)) return null;

  if (!compact.startsWith('+')) {
    if (compact.startsWith('00')) {
      compact = '+' + compact.slice(2);
    } else if (compact.length === 12 && compact.startsWith('91')) {
      compact = '+' + compact;
    } else if (compact.length === 11 && compact.startsWith('0')) {
      compact = '+91' + compact.slice(1);
    } else if (compact.length === 10) {
      compact = '+91' + compact;
    } else if (compact.length === 13 && compact.startsWith('091')) {
      compact = '+91' + compact.slice(3);
    }
  }

  let parsed;
  try {
    parsed = parsePhoneNumberFromString(compact, opts.defaultCountry || 'IN');
  } catch (e) {
    return null;
  }
  if (!parsed || !parsed.isValid()) return null;

  const country = parsed.country || 'IN';
  if (country !== 'IN' && !opts.allowInternational) return null;

  const national = parsed.nationalNumber || '';
  const type = parsed.getType ? (parsed.getType() || 'UNKNOWN') : 'UNKNOWN';

  // Guard against pincode-like short fragments that libphonenumber may accept
  // when a very permissive default country is used.
  if (national.length < 7) return null;
  if (isObviousSequence(national)) return null;

  const indianMobileShape = country === 'IN' && national.length === 10 && INDIAN_MOBILE_RE.test(national);
  const isLandline = type === 'FIXED_LINE';
  const isMobile =
    !isLandline &&
    (type === 'MOBILE' ||
      (type === 'FIXED_LINE_OR_MOBILE' && indianMobileShape) ||
      (type === 'UNKNOWN' && indianMobileShape));
  const isTollFree = type === 'TOLL_FREE';

  if (country === 'IN' && !isMobile && !isLandline && !isTollFree) return null;

  // Free-text landlines need phone context ("call", "tel", "contact", ...) or phone formatting.
  // This is the main guard against 10-digit order ids being promoted to leads.
  if (isLandline && opts.trusted === false) {
    const context = String(opts.context || '');
    const hasPhoneFormat = /(?:tel:|ph:|mob:|\+91|\(0\d{2,4}\)|0\d{2,4}[-\s]\d{5,8})/i.test(original);
    if (!hasPhoneFormat && !CONTEXT_PHONE_RE.test(context)) {
      return null;
    }
  }

  return {
    raw: original,
    e164: parsed.number,
    national,
    international: parsed.formatInternational(),
    country,
    type,
    isMobile,
    isLandline,
    isTollFree,
    isValid: true,
    digits: digitsOnly(parsed.number),
    whatsapp: isMobile && country === 'IN' && INDIAN_MOBILE_RE.test(national)
  };
}

function isIndianMobile(phoneStr) {
  if (!phoneStr) return false;
  const parsed = normalizePhone(phoneStr);
  return Boolean(parsed && parsed.isMobile);
}

/**
 * Extract every valid phone from free text (HTML text, meta tags, snippets).
 * @returns {Array<ReturnType<typeof normalizePhone>>}
 */
function extractPhones(text, opts = {}) {
  if (!text || typeof text !== 'string') return [];
  const source = text
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .slice(0, 500000);

  const candidates = new Map();

  const addCandidate = (raw, index) => {
    const context = source.slice(Math.max(0, index - 70), Math.min(source.length, index + raw.length + 70));
    const key = raw.replace(/\s+/g, ' ').trim();
    if (!candidates.has(key)) candidates.set(key, context);
  };

  // Broad run of digits with separators. Validation below rejects noise.
  const broad = /(?:\+?\s?\d[\d\s().-]{5,22}\d)/g;
  let m;
  while ((m = broad.exec(source)) !== null) {
    const raw = m[0].replace(/\s+/g, ' ').trim();
    const d = digitsOnly(raw);
    if (d.length >= 7 && d.length <= 15) addCandidate(raw, m.index);
  }

  // Explicit Indian mobile pattern with optional country/0 prefix.
  const mobile = /(?<![\d])(?:\+?\s?91[\s.-]?|0)?[6-9]\d{4}[\s.-]?\d{5}(?![\d])/g;
  while ((m = mobile.exec(source)) !== null) {
    addCandidate(m[0].trim(), m.index);
  }

  const result = [];
  const seen = new Set();
  for (const [candidate, context] of candidates.entries()) {
    const parsed = normalizePhone(candidate, { ...opts, defaultCountry: 'IN', trusted: opts.trusted === true, context });
    if (!parsed) continue;
    const key = parsed.national || parsed.e164;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(parsed);
  }

  // Prefer mobile numbers first, then landlines.
  result.sort((a, b) => Number(b.isMobile) - Number(a.isMobile));
  return result;
}

function pickBestPhone(phones = []) {
  const valid = phones.filter(Boolean);
  return (
    valid.find(p => p && p.isMobile) ||
    valid.find(p => p && p.isLandline) ||
    valid[0] ||
    null
  );
}

function toWhatsAppLink(phone, businessName = '') {
  const parsed = typeof phone === 'string' ? normalizePhone(phone) : phone;
  if (!parsed || !parsed.isMobile) return '';
  const text = businessName
    ? `Hi ${businessName}, I found your business on scraper.co.in and wanted to connect.`
    : '';
  return `https://wa.me/${parsed.digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const value = email.trim().toLowerCase();
  if (value.length < 6 || value.length > 254) return false;
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$/.test(value)) return false;
  const [local, domain] = value.split('@');
  if (!local || !domain) return false;
  if (BLOCKED_EMAIL_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) return false;
  if (BLOCKED_EMAIL_LOCALPARTS.includes(local)) return false;
  if (/\.(png|jpe?g|gif|webp|svg|css|js)$/i.test(domain)) return false;
  if (domain.includes('..') || local.includes('..')) return false;
  return true;
}

function extractEmails(text) {
  if (!text || typeof text !== 'string') return [];
  const cleaned = text.replace(/&#64;/g, '@').replace(/%40/gi, '@').slice(0, 500000);
  const matches = cleaned.match(EMAIL_RE) || [];
  const seen = new Set();
  const out = [];
  for (const raw of matches) {
    const email = raw.trim().toLowerCase().replace(/[.,;:]+$/, '');
    if (!isValidEmail(email) || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

// ── Legal identifiers ───────────────────────────────────────────────────────

function validateGSTIN(value) {
  const gstin = String(value || '').toUpperCase().trim();
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z][0-9A-Z]$/.test(gstin)) return false;
  const stateCode = Number(gstin.slice(0, 2));
  if (stateCode < 1 || stateCode > 38) return false;

  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = chars.indexOf(gstin[i]);
    if (value < 0) return false;
    const factor = i % 2 === 0 ? 1 : 2;
    const product = value * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }
  const checksum = (36 - (sum % 36)) % 36;
  return chars[checksum] === gstin[14];
}

function extractGSTINs(text) {
  const matches = String(text || '').toUpperCase().match(GSTIN_RE) || [];
  return [...new Set(matches.filter(validateGSTIN))];
}

function validatePAN(value) {
  return /^[A-Z]{5}\d{4}[A-Z]$/.test(String(value || '').toUpperCase().trim());
}

function extractPANs(text) {
  const matches = String(text || '').toUpperCase().match(PAN_RE) || [];
  return [...new Set(matches.filter(validatePAN))];
}

function validateCIN(value) {
  return /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(String(value || '').toUpperCase().trim());
}

function extractCINs(text) {
  const matches = String(text || '').toUpperCase().match(CIN_RE) || [];
  return [...new Set(matches.filter(validateCIN))];
}

/**
 * Extract the most plausible Indian pincode from an address.
 * Never derives a pincode from a phone number.
 */
function extractPincode(address, phones = []) {
  if (!address || typeof address !== 'string') return '';
  const phoneDigits = new Set(
    (phones || []).map(p => (typeof p === 'string' ? digitsOnly(p) : p && p.national)).filter(Boolean)
  );
  const matches = address.match(/(?<![\d])([1-9]\d{5})(?![\d])/g) || [];
  for (const candidate of matches) {
    if (phoneDigits.has(candidate)) continue;
    // Pincodes never start with 0. 6-digit numbers starting 6-9 are far more
    // likely to be phone fragments, but only reject them when they overlap a
    // known phone (checked above). Otherwise accept: many real pincodes start 6-9.
    return candidate;
  }
  return '';
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const STATE_ALIASES = {
  ap: 'Andhra Pradesh', ts: 'Telangana', up: 'Uttar Pradesh', mp: 'Madhya Pradesh',
  mh: 'Maharashtra', ka: 'Karnataka', tn: 'Tamil Nadu', kl: 'Kerala', gj: 'Gujarat',
  rj: 'Rajasthan', wb: 'West Bengal', br: 'Bihar', jh: 'Jharkhand', cg: 'Chhattisgarh',
  od: 'Odisha', pb: 'Punjab', hr: 'Haryana', hp: 'Himachal Pradesh', uk: 'Uttarakhand',
  ga: 'Goa', dl: 'Delhi', jk: 'Jammu and Kashmir', la: 'Ladakh', py: 'Puducherry',
  ch: 'Chandigarh'
};

function normaliseAddressPart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchIndianState(part) {
  const key = normaliseAddressPart(part);
  if (!key) return '';
  if (STATE_ALIASES[key]) return STATE_ALIASES[key];
  for (const state of INDIAN_STATES) {
    const stateKey = state.toLowerCase();
    if (key === stateKey || key.endsWith(` ${stateKey}`)) return state;
  }
  return '';
}

/**
 * Look up a place token in the India geo index to learn whether it is a city,
 * district or village. This lets address parsing put "Vijayawada" in the city
 * slot instead of treating it as the state.
 */
function lookupAddressPlace(name) {
  try {
    const geo = require('./indiaGeoIndex');
    const rows = geo.searchLocations(name, 6);
    const key = normaliseAddressPart(name);
    return rows.find(row => normaliseAddressPart(row.name) === key) || rows[0] || null;
  } catch (error) {
    return null;
  }
}

function splitIndianAddress(address) {
  if (!address || typeof address !== 'string') {
    return { full: '', line1: '', line2: '', locality: '', city: '', district: '', state: '', pincode: '' };
  }
  const full = address.replace(/\s+/g, ' ').trim();
  const pincode = extractPincode(full);

  // Remove the pincode from its segment (commonly appended to the state,
  // e.g. "Andhra Pradesh 520008") before classifying segments.
  const parts = full
    .split(',')
    .map(part => part.replace(/\b[1-9]\d{5}\b/g, '').trim())
    .filter(Boolean);

  let state = '';
  let stateIndex = -1;
  for (let i = parts.length - 1; i >= Math.max(0, parts.length - 3); i--) {
    const matched = matchIndianState(parts[i]);
    if (matched) {
      state = matched;
      stateIndex = i;
      break;
    }
  }

  const before = stateIndex >= 0 ? parts.slice(0, stateIndex) : parts;

  let city = '';
  let cityRow = null;
  let district = '';
  for (let i = before.length - 1; i >= 0; i--) {
    const row = lookupAddressPlace(before[i]);
    const type = row && row.type;
    if (!district && type === 'district') {
      district = before[i];
      continue;
    }
    if (!city && (type === 'city' || type === 'town')) {
      city = before[i];
      cityRow = row;
      continue;
    }
  }

  if (!city) city = before[before.length - 1] || '';
  if (!district) district = (cityRow && cityRow.district) || city;

  const cityIndex = city ? before.lastIndexOf(city) : -1;
  const locality = cityIndex > 0
    ? before[cityIndex - 1]
    : (before.length > 1 ? before[before.length - 2] : '');

  return {
    full,
    line1: parts[0] || '',
    line2: parts[1] || '',
    locality: locality && locality !== city ? locality : '',
    city,
    district,
    state,
    pincode
  };
}

module.exports = {
  INDIAN_MOBILE_RE,
  isIndianMobile,
  normalizePhone,
  extractPhones,
  pickBestPhone,
  toWhatsAppLink,
  isValidEmail,
  extractEmails,
  validateGSTIN,
  validatePAN,
  validateCIN,
  extractGSTINs,
  extractPANs,
  extractCINs,
  extractPincode,
  splitIndianAddress,
  digitsOnly
};
