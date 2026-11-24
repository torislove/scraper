/**
 * dedupLogic.js
 * Near-duplicate vendor detection and multi-phone / review merging.
 */

const { normalizePhone } = require('../phoneUtils');
const { normalizeBrandToken, nameSimilarity } = require('./brandIntel');

const SHARED_DIRECTORY_NUMBERS = new Set([
  '08062210155',
  '18602080808',
  '18001234567'
]);

function sameCity(a, b) {
  const ca = String(a.city || a.locality || '').toLowerCase().trim();
  const cb = String(b.city || b.locality || '').toLowerCase().trim();
  if (!ca || !cb) return true;
  return ca === cb || ca.includes(cb) || cb.includes(ca);
}

function areNearDuplicates(leadA, leadB) {
  if (!leadA || !leadB) return false;
  if (!sameCity(leadA, leadB)) return false;

  const tokenA = normalizeBrandToken(leadA.name);
  const tokenB = normalizeBrandToken(leadB.name);
  const similarity = nameSimilarity(leadA.name, leadB.name);

  if (tokenA && tokenB && tokenA.length >= 4 && tokenB.length >= 4) {
    if (tokenA === tokenB) return true;
    if (tokenA.length >= 6 && tokenB.length >= 6) {
      if (tokenA.includes(tokenB) || tokenB.includes(tokenA)) return true;
    }
  }

  const phonesA = (Array.isArray(leadA.phones) ? leadA.phones : [leadA.phone]).filter(Boolean);
  const phonesB = (Array.isArray(leadB.phones) ? leadB.phones : [leadB.phone]).filter(Boolean);
  for (const pa of phonesA) {
    const cleanA = String(pa).replace(/\D/g, '').slice(-10);
    if (cleanA.length !== 10 || SHARED_DIRECTORY_NUMBERS.has(cleanA)) continue;
    for (const pb of phonesB) {
      const cleanB = String(pb).replace(/\D/g, '').slice(-10);
      if (cleanB.length !== 10 || cleanA !== cleanB) continue;
      if (similarity >= 0.6) return true;
    }
  }

  return false;
}

function mergeVendorLeads(primary, secondary) {
  const merged = { ...primary };

  const rawPhones = [
    primary.phone,
    secondary.phone,
    ...(Array.isArray(primary.phones) ? primary.phones : []),
    ...(Array.isArray(secondary.phones) ? secondary.phones : [])
  ].filter(Boolean);

  const seenDigits = new Set();
  const cleanPhones = [];
  for (const p of rawPhones) {
    const parsed = normalizePhone(p);
    const key = parsed ? parsed.national : String(p).replace(/\D/g, '').slice(-10);
    if (key && key.length >= 7 && !seenDigits.has(key)) {
      seenDigits.add(key);
      cleanPhones.push(parsed ? parsed.displayPhone : p);
    }
  }

  cleanPhones.sort((a, b) => {
    const pA = normalizePhone(a);
    const pB = normalizePhone(b);
    const scoreA = pA?.isMobile ? 3 : (pA?.isLandline ? 2 : 1);
    const scoreB = pB?.isMobile ? 3 : (pB?.isLandline ? 2 : 1);
    return scoreB - scoreA;
  });

  const MAX_PHONES_PER_LEAD = 6;
  if (cleanPhones.length > MAX_PHONES_PER_LEAD) cleanPhones.length = MAX_PHONES_PER_LEAD;
  merged.phones = cleanPhones.length ? cleanPhones : (primary.phones || [primary.phone].filter(Boolean));
  merged.phone = cleanPhones[0] || primary.phone || secondary.phone || null;

  const revA = Number(primary.reviewsCount || primary.reviews || 0);
  const revB = Number(secondary.reviewsCount || secondary.reviews || 0);
  if (revB > revA) {
    merged.reviewsCount = revB;
    merged.rating = secondary.rating || primary.rating;
  }

  const addrA = String(primary.address || '');
  const addrB = String(secondary.address || '');
  if (addrB.length > addrA.length && !addrB.includes('undefined')) {
    merged.address = secondary.address;
  }

  if (!merged.website && secondary.website) merged.website = secondary.website;
  if (!merged.placeId && secondary.placeId) merged.placeId = secondary.placeId;

  return merged;
}

module.exports = {
  SHARED_DIRECTORY_NUMBERS,
  sameCity,
  areNearDuplicates,
  mergeVendorLeads
};
