/**
 * phoneClassify.js
 *
 * Browser-side twin of the server's India-first phone rules.
 *
 * The client used to decide "is this a mobile?" with `/^[6-9]\d{9}$/` on the
 * last ten digits. That is wrong in India: the Guntur landline
 * `0863 235 3810` ends in `8632353810`, which starts with 8 and falsely became
 * a WhatsApp target. Every mobile/landline decision must come from a real
 * number parser, exactly like `server/src/utils/phoneUtils.js`.
 *
 * Rules:
 *  - Numbers starting with 0 or classified as FIXED_LINE are STD Landlines.
 *    STRICTLY DO NOT add +91 to landlines. Preserve the leading 0 (e.g. "040 2324 3798").
 *    Render a primary 📞 Call button (tel:04023243798) and NEVER a WhatsApp button.
 *  - 10-digit numbers starting with 6, 7, 8, or 9 are Mobiles.
 *    Add +91 prefix (e.g. "+91 98490 67056").
 *    Render 💬 WhatsApp Outreach and 📞 Call button.
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;
const PHONE_LIKE = /\+?\d[\d\s().-]{5,}\d/g;

function candidatesFrom(text) {
  const cleaned = String(text || '')
    .replace(/(?:tel|ph|mob|mobile|call|whatsapp)\s*[:.-]?/gi, ' ')
    .trim();
  const found = cleaned.match(PHONE_LIKE) || [];
  const list = found.map(value => value.trim()).filter(Boolean);
  if (cleaned && !list.length && /\d{7,}/.test(cleaned.replace(/\D/g, ''))) {
    list.push(cleaned.replace(/\D/g, ''));
  }
  // Prefer the longest candidate first: "+91 98452 16275" before "98452".
  return list.sort((a, b) => b.replace(/\D/g, '').length - a.replace(/\D/g, '').length);
}

function isObviousSequence(national) {
  const digits = String(national || '');
  if (digits.length < 10) return false;
  if (/^(\d)\1+$/.test(digits)) return true;
  if (['0123456789', '1234567890', '9876543210', '0987654321',
    '1234512345', '5432154321', '1122334455', '5544332211'].includes(digits)) return true;
  for (let block = 1; block <= 5; block += 1) {
    if (digits.length % block !== 0) continue;
    const unit = digits.slice(0, block);
    if (unit.repeat(digits.length / block) === digits) return true;
  }
  let ascending = true;
  let descending = true;
  for (let i = 0; i < digits.length - 1; i += 1) {
    const diff = (Number(digits[i + 1]) - Number(digits[i]) + 10) % 10;
    if (diff !== 1) ascending = false;
    if (diff !== 9) descending = false;
  }
  return ascending || descending;
}

/**
 * Parse one phone string (or a phone entry object) using Indian rules.
 * @returns {null|{raw:string,display:string,e164:string,national:string,type:string,phoneType:string,isMobile:boolean,isLandline:boolean,callUrl:string,whatsappUrl:string}}
 */
export function parseIndianPhone(value) {
  const rawValue = (value && typeof value === 'object')
    ? (value.displayPhone || value.display || value.e164 || value.national || value.phone || value.raw || '')
    : value;
  const text = String(rawValue == null ? '' : rawValue).trim();
  if (!text || /requires|obfuscated/i.test(text)) return null;

  for (const candidate of candidatesFrom(text)) {
    let parsed;
    try {
      parsed = parsePhoneNumberFromString(candidate, 'IN');
    } catch (error) {
      continue;
    }
    if (!parsed || !parsed.isValid()) continue;
    const country = parsed.country || 'IN';
    if (country !== 'IN') continue;

    const national = parsed.nationalNumber || '';
    if (national.length < 7) continue;
    if (isObviousSequence(national)) continue;

    const type = parsed.getType ? (parsed.getType() || 'UNKNOWN') : 'UNKNOWN';
    const indianMobileShape = national.length === 10 && INDIAN_MOBILE_RE.test(national);
    const rawTrimmed = String(text || '').trim();
    const startsWithZeroTrunk = rawTrimmed.startsWith('0') || rawTrimmed.startsWith('+910') || rawTrimmed.startsWith('(0');

    const isLandline = type === 'FIXED_LINE' || (
      type === 'FIXED_LINE_OR_MOBILE' && (startsWithZeroTrunk || !indianMobileShape || national.startsWith('8644') || national.startsWith('891'))
    ) || (startsWithZeroTrunk && type !== 'MOBILE');

    const isMobile = !isLandline && (
      type === 'MOBILE' ||
      (type === 'FIXED_LINE_OR_MOBILE' && indianMobileShape && !startsWithZeroTrunk) ||
      (type === 'UNKNOWN' && indianMobileShape && !startsWithZeroTrunk)
    );
    if (!isMobile && !isLandline) continue;

    let display = '';
    let callUrl = '';
    if (isLandline) {
      const nationalFmt = parsed.formatNational ? parsed.formatNational() : '';
      display = (nationalFmt && nationalFmt.startsWith('0')) ? nationalFmt : ('0' + national);
      callUrl = `tel:0${national}`;
    } else {
      display = `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
      callUrl = `tel:+91${national}`;
    }

    return {
      raw: text,
      display,
      e164: parsed.number,
      national,
      type: isMobile ? 'MOBILE' : 'FIXED_LINE',
      phoneType: isMobile ? 'mobile' : 'landline',
      isMobile,
      isLandline,
      callUrl,
      whatsappUrl: isMobile ? `https://wa.me/91${national}` : ''
    };
  }

  return null;
}

/** True only for a validated Indian mobile. Landlines are never mobile. */
export function isIndianMobile(value) {
  const parsed = parseIndianPhone(value);
  return Boolean(parsed && parsed.isMobile);
}

/** True only for a validated Indian landline (STD fixed line). */
export function isIndianLandline(value) {
  const parsed = parseIndianPhone(value);
  return Boolean(parsed && parsed.isLandline);
}

export function getDisplayPhone(vendor) {
  if (!vendor) return null;
  if (vendor.phone && !String(vendor.phone).includes('Requires')) return vendor.phone;
  if (Array.isArray(vendor.phones) && vendor.phones.length > 0) {
    for (const p of vendor.phones) {
      const val = typeof p === 'string' ? p : p?.e164 || p?.national || p?.raw;
      if (val && !String(val).includes('Requires')) return val;
    }
    const first = vendor.phones[0];
    const val = typeof first === 'string' ? first : first?.e164 || first?.national || first?.raw;
    if (val && !String(val).includes('Requires')) return val;
  }
  if (vendor.whatsapp && !String(vendor.whatsapp).includes('Requires')) return vendor.whatsapp;
  if (vendor.phone_primary && !String(vendor.phone_primary).includes('Requires')) return vendor.phone_primary;
  return null;
}

export function isMobilePhone(phoneStr) {
  if (!phoneStr) return false;
  const parsed = parseIndianPhone(phoneStr);
  if (parsed) return Boolean(parsed.isMobile);
  const digits = String(phoneStr).replace(/\D/g, '');
  const last10 = digits.slice(-10);
  return last10.length === 10 && /^[6-9]/.test(last10);
}

export function whatsappNumber(phoneStr) {
  const parsed = parseIndianPhone(phoneStr);
  return parsed && parsed.isMobile ? parsed.national : '';
}

export function classifyPhone(phoneStr) {
  if (!phoneStr || String(phoneStr).includes('Requires')) {
    return { type: 'none', phoneType: 'none', raw: '', digits: '', display: 'No contact', isMobile: false, isLandline: false, hasWhatsapp: false };
  }
  const parsed = parseIndianPhone(phoneStr);
  if (parsed && parsed.isMobile) {
    const national = parsed.national;
    return {
      type: 'mobile',
      phoneType: 'mobile',
      isMobile: true,
      isLandline: false,
      hasWhatsapp: true,
      raw: phoneStr,
      digits: national,
      display: `+91 ${national.slice(0, 5)} ${national.slice(5)}`,
      whatsappUrl: (name, city, category, rating) => {
        const text = `Hi ${name || 'there'}, I found your ${category || 'business'} listing${city ? ` in ${city}` : ''}${rating ? ` (${rating}★)` : ''} and wanted to connect.`;
        return `https://wa.me/91${national}?text=${encodeURIComponent(text)}`;
      }
    };
  }
  return {
    type: 'landline',
    phoneType: 'landline',
    isMobile: false,
    isLandline: true,
    hasWhatsapp: false,
    raw: phoneStr,
    digits: String(phoneStr).replace(/\D/g, ''),
    display: phoneStr,
    callUrl: `tel:${phoneStr}`
  };
}
