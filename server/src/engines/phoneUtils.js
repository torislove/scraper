'use strict';

/**
 * server/src/engines/phoneUtils.js
 * Shared sovereign phone normalization & text extraction helper.
 * Correctly distinguishes Indian 0-prefixed 11-digit mobiles (072074 86771 -> +91 72074 86771)
 * from true STD city landlines (040, 080 2..., 0863, 084552..., etc.).
 */

const { parsePhoneNumber } = require('libphonenumber-js/max');

const BLACKLISTED_PHONES = new Set([
  '7326059369', '6393138454', '9938012595', '9967462575',
  '8124222266', '8888888888', '9999999999', '1141444444',
  '9925252525', '1800200000', '1800102030'
]);

const KNOWN_IN_STD_RE = /^(?:84552|84542|84582|841[4-8]2|8632|864[2-9]|8662|86722|87422|88122|8912)/;

function formatInMobile(d10) {
  return `+91 ${d10.slice(0, 5)} ${d10.slice(5)}`;
}

function isDummyPhoneDigits(digits) {
  const d = String(digits || '').replace(/\D/g, '');
  if (d.length < 6) return false;
  const last10 = d.slice(-10);
  if (/^(.)\1{5,}$/.test(last10)) return true;
  if (last10.length === 10) {
    const freq = {};
    for (const ch of last10) freq[ch] = (freq[ch] || 0) + 1;
    if (Math.max(...Object.values(freq)) >= 9) return true; // e.g. 6666666667
    if (last10 === '1234567890' || last10 === '0123456789' || last10 === '9876543210') return true;
  }
  return false;
}

function parsePhoneDetails(rawPhone, countryCode = 'IN') {
  const empty = { primary: '', mobile: '', landline: '', isMobile: false, isLandline: false, mobileVerified: 'No', whatsappLink: '' };
  if (!rawPhone) return empty;
  const raw = String(rawPhone).trim();
  if (!raw || /requires|obfuscated/i.test(raw)) return empty;

  const cc = String(countryCode || 'IN').toUpperCase();
  const rawDigits = raw.replace(/\D/g, '');
  const rawLast10 = rawDigits.slice(-10);
  if (BLACKLISTED_PHONES.has(rawLast10) || isDummyPhoneDigits(rawDigits)) return empty;

  try {
    const parsed = parsePhoneNumber(raw, cc);
    if (parsed && parsed.isValid()) {
      const type = parsed.getType ? parsed.getType() : 'UNKNOWN';
      const e164 = parsed.format('E.164');
      const national = parsed.formatNational();
      const natDigits = String(parsed.nationalNumber || '').replace(/\D/g, '');
      const e164Digits = e164.replace(/\D/g, '');

      if (cc === 'IN') {
        const isTrueFixed = type === 'FIXED_LINE' || (type !== 'MOBILE' && KNOWN_IN_STD_RE.test(natDigits));
        const isInMobile = !isTrueFixed && (type === 'MOBILE' || (natDigits.length === 10 && /^[6-9]\d{9}$/.test(natDigits)));
        if (isInMobile) {
          return {
            primary: formatInMobile(natDigits),
            mobile: e164,
            landline: '',
            isMobile: true,
            isLandline: false,
            mobileVerified: 'Yes',
            whatsappLink: `https://wa.me/${e164Digits}`
          };
        }
        return {
          primary: national || e164,
          mobile: '',
          landline: national || e164,
          isMobile: false,
          isLandline: true,
          mobileVerified: 'No',
          whatsappLink: ''
        };
      }

      if (cc !== 'IN' && (/^(?:\+|00)?91\d{8,}/.test(rawDigits) || parsed.country === 'IN')) {
        return empty;
      }

      const isLocalCountry = parsed.country === cc;
      const isFixed = type === 'FIXED_LINE'
        || type === 'VOIP'
        || type === 'SHARED_COST'
        || type === 'TOLL_FREE'
        || type === 'PREMIUM_RATE'
        || type === 'UAN'
        || type === 'PERSONAL_NUMBER';
      // US/CA NANP shares prefixes between mobile & fixed lines; FIXED_LINE_OR_MOBILE is Unverified (never fake-stamp wa.me)
      const isStrictMobile = isLocalCountry && type === 'MOBILE';
      const isNanpAmbiguous = isLocalCountry && !isFixed && type === 'FIXED_LINE_OR_MOBILE' && (cc === 'US' || cc === 'CA');
      if (!isLocalCountry && !raw.startsWith('+')) {
        return empty;
      }
      return {
        primary: national || e164,
        mobile: isStrictMobile ? e164 : '',
        landline: isFixed ? (national || e164) : '',
        isMobile: isStrictMobile,
        isLandline: isFixed,
        mobileVerified: isStrictMobile ? 'Yes' : (isNanpAmbiguous ? 'Unverified' : 'No'),
        whatsappLink: isStrictMobile ? `https://wa.me/${e164Digits}` : ''
      };
    }
  } catch (_) {}

  let cleanDigits = raw.replace(/\D/g, '');
  if (cc === 'IN') {
    if (cleanDigits.length === 11 && cleanDigits.startsWith('0')) cleanDigits = cleanDigits.slice(1);
    else if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) cleanDigits = cleanDigits.slice(2);
    if (cleanDigits.length === 10 && /^[6-9]/.test(cleanDigits) && !BLACKLISTED_PHONES.has(cleanDigits) && !KNOWN_IN_STD_RE.test(cleanDigits)) {
      return {
        primary: formatInMobile(cleanDigits),
        mobile: `+91${cleanDigits}`,
        landline: '',
        isMobile: true,
        isLandline: false,
        mobileVerified: 'Yes',
        whatsappLink: `https://wa.me/91${cleanDigits}`
      };
    }
    if (raw.startsWith('0') || (cleanDigits.length >= 7 && cleanDigits.length <= 11)) {
      return { primary: raw, mobile: '', landline: raw, isMobile: false, isLandline: true, mobileVerified: 'No', whatsappLink: '' };
    }
  }

  return { primary: raw, mobile: '', landline: '', isMobile: false, isLandline: false, mobileVerified: 'No', whatsappLink: '' };
}

function extractPhonesFromText(text, countryCode = 'IN') {
  if (!text) return { mobilePhone: '', landlinePhone: '', whatsappLink: '', phones: [] };
  const cc = String(countryCode || 'IN').toUpperCase();
  const candidates = new Set();

  const waRe = /(?:wa\.me\/|api\.whatsapp\.com\/send\?[^"'\s]*?phone=)(?:\+?(\d{10,15}))/gi;
  let m;
  let waMob = '';
  let waLink = '';
  while ((m = waRe.exec(text)) !== null) {
    const info = parsePhoneDetails(`+${m[1]}`, cc);
    if (info.mobile) {
      waMob = info.mobile;
      waLink = info.whatsappLink;
      break;
    }
  }

  const pattern = cc === 'IN'
    ? /(?:\+91|0091|0)?[\s.-]*(?:[6-9]\d{4}[\s.-]?\d{5}|[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{4}|[6-9]\d{9})\b|\b0[1-5]\d{1,4}[\s.-]?\d{6,8}\b|\b0(?:40|80|22|11|44|33|79|20|863|864)[\s.-]?[2-6]\d{5,7}\b/g
    : /\+?\d[\d\s().-]{7,16}\d/g;

  const rawMatches = text.match(pattern) || [];
  let bestMobile = waMob;
  let bestLandline = '';
  for (const cand of rawMatches) {
    const info = parsePhoneDetails(cand, cc);
    if (info.mobile && !bestMobile) {
      bestMobile = info.mobile;
      waLink = info.whatsappLink;
    } else if (info.landline && !bestLandline) {
      bestLandline = info.landline;
    }
    if ((info.isMobile || info.isLandline) && info.primary) candidates.add(info.primary);
    if (candidates.size >= 6) break;
  }

  return {
    mobilePhone: bestMobile,
    landlinePhone: bestLandline,
    whatsappLink: waLink || (bestMobile ? `https://wa.me/${bestMobile.replace(/\D/g, '')}` : ''),
    phones: Array.from(candidates)
  };
}

module.exports = {
  BLACKLISTED_PHONES,
  parsePhoneDetails,
  extractPhonesFromText
};
