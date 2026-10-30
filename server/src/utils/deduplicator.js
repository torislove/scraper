const crypto = require('crypto');

/**
 * Normalizes Indian phone numbers into a standard 10-digit format.
 * Strips "+91", leading "0", hyphens, spaces, and non-digits.
 */
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned.length === 10 ? cleaned : cleaned;
}

/**
 * Normalizes business names for fuzzy matching.
 */
function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates an authoritative fingerprint for duplicate checking.
 */
function generateFingerprint(lead) {
  const normPhone = normalizePhone(lead.phone || lead.primaryPhone);
  const normName = normalizeName(lead.name);
  const normCity = String(lead.city || lead.mandal || '').toLowerCase().trim();

  // If phone exists, phone + city is 99.9% reliable
  if (normPhone && normPhone.length >= 10) {
    return crypto.createHash('sha1').update(`${normPhone}:${normCity}`).digest('hex');
  }

  // Fallback to name + city
  return crypto.createHash('sha1').update(`${normName}:${normCity}`).digest('hex');
}

/**
 * Merges two lead objects, preferring non-empty / richer data.
 */
function mergeLeadRecords(existing, incoming) {
  const merged = { ...existing };

  for (const [key, val] of Object.entries(incoming)) {
    if (val !== null && val !== undefined && val !== '') {
      // If existing doesn't have it, or incoming has more data
      if (!existing[key] || (Array.isArray(val) && val.length > (existing[key]?.length || 0))) {
        merged[key] = val;
      }
    }
  }

  // Merge phone arrays
  const allPhones = new Set([
    ...(existing.phones || []),
    ...(incoming.phones || []),
    existing.phone,
    incoming.phone
  ].filter(Boolean));
  merged.phones = Array.from(allPhones);

  return merged;
}

/**
 * Deduplicates an array of leads against an existing pool or itself.
 * Returns { uniqueLeads: [], duplicateCount: number }
 */
function deduplicateBatch(leads, existingMap = new Map()) {
  const uniqueMap = new Map(existingMap);
  let duplicateCount = 0;
  const processed = [];

  for (const lead of leads) {
    const fp = generateFingerprint(lead);
    lead.fingerprint = fp;
    lead.normalizedPhone = normalizePhone(lead.phone);
    lead.normalizedName = normalizeName(lead.name);

    if (uniqueMap.has(fp)) {
      duplicateCount++;
      const existing = uniqueMap.get(fp);
      const merged = mergeLeadRecords(existing, lead);
      uniqueMap.set(fp, merged);
    } else {
      uniqueMap.set(fp, lead);
      processed.push(lead);
    }
  }

  return {
    uniqueLeads: Array.from(uniqueMap.values()),
    duplicateCount
  };
}

module.exports = {
  normalizePhone,
  normalizeName,
  generateFingerprint,
  mergeLeadRecords,
  deduplicateBatch
};
