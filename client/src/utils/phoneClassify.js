/**
 * phoneClassify.js
 * Universal sovereign phone classification facade.
 * Strictly <= 250 lines.
 */

import { safeStr } from '../v2/utils/safeTypes';
import { parseAdaptivePhone, candidatesFrom, isObviousSequence, INDIAN_MOBILE_RE, PHONE_LIKE } from './phoneBase';
import { parseIndianPhone, isIndianMobile, isIndianLandline } from './phoneIndia';

export { parseAdaptivePhone, parseIndianPhone, isIndianMobile, isIndianLandline, candidatesFrom, isObviousSequence, INDIAN_MOBILE_RE, PHONE_LIKE };

export function getDisplayPhone(vendor) {
  if (!vendor) return null;
  if (typeof vendor !== 'object') {
    const s = safeStr(vendor);
    return s && !s.toLowerCase().includes('requires') ? s : null;
  }
  const mob = safeStr(vendor.mobilePhone);
  if (mob && !mob.toLowerCase().includes('requires')) return mob;
  const ph = safeStr(vendor.phone);
  if (ph && !ph.toLowerCase().includes('requires')) return ph;
  const land = safeStr(vendor.landlinePhone);
  if (land && !land.toLowerCase().includes('requires')) return land;

  if (Array.isArray(vendor.phones) && vendor.phones.length > 0) {
    for (const p of vendor.phones) {
      const val = safeStr(typeof p === 'string' ? p : p?.displayPhone || p?.e164 || p?.national || p?.raw);
      if (val && !val.toLowerCase().includes('requires')) return val;
    }
  }
  const wa = safeStr(vendor.whatsapp);
  if (wa && !wa.toLowerCase().includes('requires')) return wa;
  const pri = safeStr(vendor.phone_primary);
  if (pri && !pri.toLowerCase().includes('requires')) return pri;
  return null;
}

const KNOWN_MARKET_CITIES = [
  { re: /\b(london|manchester|birmingham|leeds|edinburgh|glasgow|bristol|liverpool)\b/i, cc: 'GB' },
  { re: /\b(dallas|austin|houston|new york|chicago|miami|los angeles|san francisco|atlanta|seattle)\b/i, cc: 'US' },
  { re: /\b(sydney|melbourne|brisbane|perth|adelaide|canberra|parramatta|gold coast)\b/i, cc: 'AU' },
  { re: /\b(dubai|abu dhabi|sharjah|ajman)\b/i, cc: 'AE' }
];

export function resolveLeadCountry(vendor, activeCountry = 'IN') {
  const vCc = safeStr(vendor?.country || vendor?.countryCode).toUpperCase();
  const aCc = safeStr(activeCountry || 'IN').toUpperCase();
  const locText = `${safeStr(vendor?.city)} ${safeStr(vendor?.address)}`;
  for (const m of KNOWN_MARKET_CITIES) {
    if (m.re.test(locText)) return m.cc;
  }
  return vCc || aCc || 'IN';
}

export function getAllDisplayPhones(vendor, defaultCountry = 'IN') {
  if (!vendor) return { mobile: null, landline: null, primary: null, all: [] };
  const hint = resolveLeadCountry(vendor, defaultCountry);
  const rawList = [
    vendor.mobilePhone,
    vendor.landlinePhone,
    vendor.phone,
    ...(Array.isArray(vendor.phones) ? vendor.phones : []),
    vendor.phone_primary
  ].filter(Boolean);

  let mobile = null;
  let landline = null;
  const all = [];
  const seenDigits = new Set();

  for (const item of rawList) {
    let rawStr = safeStr(typeof item === 'string' ? item : (item?.displayPhone || item?.display || item?.e164 || item?.national || item?.raw || ''));
    if (!rawStr || /requires|obfuscated|lookup|hidden/i.test(rawStr)) continue;
    const compact = rawStr.replace(/[^\d+]/g, '');
    // Recover legacy UK 0800 freephone numbers previously mis-tagged as +91 800...
    if (hint === 'GB' && /^\+?91800\d{7}$/.test(compact)) {
      rawStr = `0${compact.replace(/\D/g, '').slice(2)}`;
    } else if (hint !== 'IN' && /^\+?91\d{8,}$/.test(compact)) {
      // Drop legacy poisoned +91 numbers attached to GB/US/AU/AE businesses
      continue;
    }
    const formatted = formatLeadPhone(rawStr, hint);
    if (!formatted || !formatted.display) continue;
    if (hint !== 'IN' && formatted.country && formatted.country !== hint) {
      // Never allow third-country numbers (+1/+61) to masquerade as local mobiles on GB/AU/AE/US leads
      continue;
    }
    const dKey = safeStr(formatted.e164 || formatted.display).replace(/\D/g, '').slice(-10);
    if (dKey && seenDigits.has(dKey)) continue;
    if (dKey) seenDigits.add(dKey);
    all.push(formatted);
    if (formatted.isMobile && !mobile) mobile = formatted;
    else if (!formatted.isMobile && !landline) landline = formatted;
  }

  return { mobile, landline, primary: mobile || landline || all[0] || null, all };
}

export function formatLeadPhone(valueOrVendor, countryHint = 'IN') {
  const rawValue = (valueOrVendor && typeof valueOrVendor === 'object') ? getDisplayPhone(valueOrVendor) : valueOrVendor;
  const text = safeStr(rawValue);
  if (!text || /requires|obfuscated|lookup|hidden/i.test(text)) return null;

  const hint = safeStr(
    (valueOrVendor && typeof valueOrVendor === 'object' ? (valueOrVendor.country || valueOrVendor.countryCode) : '') || countryHint || 'IN'
  ).toUpperCase();
  const explicitOtherIntl = /^\+(?!91)\d/.test(text);

  if (!explicitOtherIntl && (hint === 'IN' || /^\+?91\b/.test(text))) {
    const parsedIn = parseIndianPhone(text);
    if (parsedIn) return { ...parsedIn, country: 'IN' };
  }

  const adaptive = parseAdaptivePhone(text, hint || 'IN');
  if (adaptive) {
    if (adaptive.country === 'IN') {
      const parsedIn = parseIndianPhone(adaptive.e164 || text);
      if (parsedIn) return { ...parsedIn, country: 'IN' };
    }
    return {
      raw: text,
      display: adaptive.display || text,
      e164: adaptive.e164 || text,
      callUrl: adaptive.callUrl || `tel:${text}`,
      whatsappUrl: adaptive.whatsappUrl || '',
      isMobile: Boolean(adaptive.isMobile),
      isLandline: Boolean(adaptive.isLandline),
      country: adaptive.country || hint || 'IN'
    };
  }

  const startsWithZero = text.startsWith('0') || text.startsWith('+910');
  const digits = text.replace(/\D/g, '');
  if (digits.length < 7) return null;
  if (hint === 'IN' && startsWithZero) {
    return { raw: text, display: text, e164: text, callUrl: `tel:${digits}`, whatsappUrl: '', isMobile: false, isLandline: true, country: 'IN' };
  }
  return {
    raw: text,
    display: text,
    e164: text.startsWith('+') ? text : `+${digits}`,
    callUrl: `tel:${text}`,
    whatsappUrl: '',
    isMobile: false,
    isLandline: true,
    country: hint || 'IN'
  };
}

export function isMobilePhone(phoneStr, countryHint = 'IN') {
  if (!phoneStr) return false;
  const resolved = formatLeadPhone(phoneStr, countryHint);
  if (resolved) return Boolean(resolved.isMobile);
  const text = safeStr(phoneStr);
  if (text.startsWith('0') || text.startsWith('+910')) return false;
  return false;
}

export function whatsappNumber(phoneStr, countryHint = 'IN') {
  if (!phoneStr) return '';
  const resolved = formatLeadPhone(phoneStr, countryHint);
  if (resolved && resolved.isMobile) {
    if (resolved.whatsappUrl) return resolved.whatsappUrl.replace(/^https:\/\/wa\.me\//, '');
    return safeStr(resolved.e164).replace(/\D/g, '');
  }
  return '';
}

export function classifyPhone(phoneStr, countryHint = null) {
  const safePhoneStr = safeStr(phoneStr);
  if (!safePhoneStr || safePhoneStr.toLowerCase().includes('requires')) {
    return { type: 'none', phoneType: 'none', raw: '', digits: '', display: 'No contact', isMobile: false, isLandline: false, hasWhatsapp: false };
  }
  const resolved = formatLeadPhone(phoneStr, countryHint || 'IN');
  if (resolved) {
    const isMobile = Boolean(resolved.isMobile);
    const digits = resolved.e164 ? safeStr(resolved.e164).replace(/\D/g, '') : safePhoneStr.replace(/\D/g, '');
    return {
      type: isMobile ? 'mobile' : 'landline',
      phoneType: isMobile ? 'mobile' : 'landline',
      isMobile,
      isLandline: !isMobile,
      hasWhatsapp: isMobile,
      raw: safePhoneStr,
      digits,
      display: resolved.display || safePhoneStr,
      callUrl: resolved.callUrl || `tel:${digits || safePhoneStr}`,
      whatsappUrl: isMobile
        ? (name, city, category, rating) => {
            const text = `Hi ${safeStr(name) || 'there'}, I found your ${safeStr(category) || 'business'} listing${city ? ` in ${safeStr(city)}` : ''}${rating ? ` (${rating}★)` : ''} and wanted to connect.`;
            return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
          }
        : undefined
    };
  }
  return {
    type: 'landline',
    phoneType: 'landline',
    isMobile: false,
    isLandline: true,
    hasWhatsapp: false,
    raw: safePhoneStr,
    digits: safePhoneStr.replace(/\D/g, ''),
    display: safePhoneStr,
    callUrl: `tel:${safePhoneStr}`
  };
}
