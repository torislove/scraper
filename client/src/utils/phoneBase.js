/**
 * phoneBase.js
 * Adaptive international candidate extraction and libphonenumber parsing.
 * Strictly <= 250 lines.
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { safeStr } from '../v2/utils/safeTypes';

export const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;
export const PHONE_LIKE = /\+?\d[\d\s().-]{5,}\d/g;

export function candidatesFrom(text) {
  const cleaned = safeStr(text)
    .replace(/(?:tel|ph|mob|mobile|call|whatsapp)\s*[:.-]?/gi, ' ')
    .trim();
  const found = cleaned.match(PHONE_LIKE) || [];
  const list = found.map(value => value.trim()).filter(Boolean);
  if (cleaned && !list.length && /\d{7,}/.test(cleaned.replace(/\D/g, ''))) {
    list.push(cleaned.replace(/\D/g, ''));
  }
  return list.sort((a, b) => b.replace(/\D/g, '').length - a.replace(/\D/g, '').length);
}

export function isObviousSequence(national) {
  const digits = safeStr(national);
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

export function parseAdaptivePhone(value, defaultCountry = 'IN') {
  const rawValue = (value && typeof value === 'object')
    ? (value.displayPhone || value.display || value.e164 || value.national || value.phone || value.raw || '')
    : value;
  const text = safeStr(rawValue);
  if (!text || /requires|obfuscated/i.test(text)) return null;

  for (const candidate of candidatesFrom(text)) {
    let parsed;
    try {
      parsed = parsePhoneNumberFromString(candidate, defaultCountry || 'IN');
    } catch (_) {
      continue;
    }
    if (!parsed || !parsed.isValid()) {
      try {
        parsed = parsePhoneNumberFromString(candidate);
      } catch (_) {
        continue;
      }
    }
    if (!parsed || !parsed.isValid()) continue;

    const defCc = String(defaultCountry || 'IN').toUpperCase();
    const country = parsed.country || defCc;
    if (!candidate.trim().startsWith('+') && country !== defCc) continue;
    const national = safeStr(parsed.nationalNumber);
    if (national.length < 5) continue;
    if (isObviousSequence(national)) continue;

    const type = parsed.getType ? (parsed.getType() || 'UNKNOWN') : 'UNKNOWN';
    const isLandline = type === 'FIXED_LINE'
      || type === 'VOIP'
      || type === 'UAN'
      || type === 'SHARED_COST'
      || type === 'TOLL_FREE'
      || type === 'PREMIUM_RATE'
      || type === 'PERSONAL_NUMBER';
    const isMobile = type === 'MOBILE' || (!isLandline && type === 'FIXED_LINE_OR_MOBILE' && (country === 'US' || country === 'CA'));
    const digits = safeStr(parsed.number).replace(/\D/g, '');

    const display = parsed.formatInternational ? parsed.formatInternational() : parsed.number;
    const callUrl = `tel:${digits ? (digits.startsWith('+') ? digits : `+${digits}`) : text}`;

    let whatsappUrl = '';
    if (isMobile) {
      const cleanDigits = digits.startsWith('+') ? digits.slice(1) : digits;
      whatsappUrl = `https://wa.me/${cleanDigits}`;
    }

    return {
      raw: text,
      display,
      e164: parsed.number,
      national,
      country,
      type: isMobile ? 'MOBILE' : 'FIXED_LINE',
      phoneType: isMobile ? 'mobile' : 'landline',
      isMobile,
      isLandline,
      callUrl,
      whatsappUrl
    };
  }

  return null;
}
