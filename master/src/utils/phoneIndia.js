/**
 * phoneIndia.js
 * India-specific phone parsing rules (+91 / STD Landline 0-trunk).
 * Strictly <= 250 lines.
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { safeStr } from '../v2/utils/safeTypes';
import { candidatesFrom, isObviousSequence, INDIAN_MOBILE_RE } from './phoneBase';

export function parseIndianPhone(value) {
  const rawValue = (value && typeof value === 'object')
    ? (value.displayPhone || value.display || value.e164 || value.national || value.phone || value.raw || '')
    : value;
  const text = safeStr(rawValue);
  if (!text || /requires|obfuscated/i.test(text)) return null;

  for (const candidate of candidatesFrom(text)) {
    let parsed;
    try {
      parsed = parsePhoneNumberFromString(candidate, 'IN');
    } catch (_) {
      continue;
    }
    if (!parsed || !parsed.isValid()) continue;
    const country = parsed.country || 'IN';
    if (country !== 'IN') continue;

    const national = safeStr(parsed.nationalNumber);
    if (national.length < 7) continue;
    if (isObviousSequence(national)) continue;

    const type = parsed.getType ? (parsed.getType() || 'UNKNOWN') : 'UNKNOWN';
    const indianMobileShape = national.length === 10 && INDIAN_MOBILE_RE.test(national);
    const rawTrimmed = text.trim();
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

export function isIndianMobile(value) {
  const parsed = parseIndianPhone(value);
  return Boolean(parsed && parsed.isMobile);
}

export function isIndianLandline(value) {
  const parsed = parseIndianPhone(value);
  return Boolean(parsed && parsed.isLandline);
}
