import React from 'react';

/**
 * Check whether a raw locality label is clean human-readable neighborhood text
 * (excluding internal grid IDs, sub-vector prefixes with `·`, rating snippets,
 * door/shop numbers, and scraped webpage menu noise).
 */
export function isCleanLocalityLabel(raw, fallbackCity = '') {
  if (!raw || typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  const city = String(fallbackCity || '').trim().toLowerCase();

  if (trimmed.length < 3 || trimmed.length > 36) return false;
  if (lower === city || /^(other|unknown|null|undefined|area|india)$/i.test(trimmed)) return false;
  if (trimmed.includes('·')) return false;
  if (/\b(?:North|South|East|West|North-East|North-West|South-East|South-West|NW|NE|SW|SE)\s+(?:Sector|Grid|\d+)\b/i.test(trimmed)) return false;
  if (/\b(?:Central Commercial Hub|Main Market & Bazaar Area|Railway Station & Bus Stand|Main Arterial|Industrial & Trade Zone|Top Rated Specialists)\b/i.test(trimmed)) return false;
  if (/\b(?:Home|Downloads|About|Contact\s+Us|Select\s+Page|We\s+would\s+love|http|https|www\.|Batchus\s+Plaza)\b/i.test(trimmed)) return false;
  if (/^\d+(?:\.\d+)?\s*\(/.test(trimmed)) return false;
  if (/^\d+$/.test(trimmed)) return false;
  if (/^(?:no\.?\s*\d+|\d+\/\d+|near|opp|behind|plot|door|flat|shop|floor|beside)\b/i.test(trimmed)) return false;
  return true;
}

/**
 * Extract clean neighborhood / area / locality from a lead object,
 * using explicit fields first and falling back to parsed address segments.
 */
export function extractLeadArea(lead, fallbackCity) {
  if (!lead) return '';
  const city = String(fallbackCity || lead.city || '').trim();

  // 1. Explicit locality/suburb/area fields (prioritize real locality over zoneName)
  for (const cand of [lead.locality, lead.suburb, lead.area, lead.mandal, lead.village, lead.zoneName]) {
    if (isCleanLocalityLabel(cand, city)) {
      return cand.trim();
    }
  }

  // 2. Parse address string if available
  const address = lead.address || '';
  if (address) {
    const segs = address.split(',').map(s => s.trim()).filter(Boolean);
    const clean = segs.filter(s => !/^\d{5,6}$/.test(s) && !/^(Telangana|Andhra Pradesh|Karnataka|Maharashtra|Tamil Nadu|India)$/i.test(s));
    if (clean.length >= 2 && isCleanLocalityLabel(clean[clean.length - 2], city)) {
      return clean[clean.length - 2];
    }
    if (clean.length >= 1 && isCleanLocalityLabel(clean[clean.length - 1], city)) {
      return clean[clean.length - 1];
    }
  }

  return '';
}

/**
 * Format area · city · district cleanly without duplicate adjacent tokens like "Guntur, Guntur".
 */
export function formatCleanAreaDisplay(lead, fallbackCity) {
  if (!lead) return '—';
  const parts = [
    extractLeadArea(lead, fallbackCity),
    lead.city || lead.village,
    lead.district
  ].map(s => String(s || '').trim()).filter(Boolean);

  const seen = new Set();
  const unique = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }
  return unique.join(', ') || '—';
}

/**
 * Provenance chip for Phase 3 carry-forward. A lead that was verified in an
 * earlier search of the same area + category is reused instead of re-charged.
 */
export function CarriedBadge({ lead }) {
  if (!lead || !lead.carriedForward) return null;
  const from = lead.carriedFrom || {};
  const sessionId = from.sessionId || (Array.isArray(from.sessionIds) ? from.sessionIds[0] : '');
  const when = from.scrapedAt || from.addedAt;
  const date = when ? new Date(when) : null;
  const detail = [
    sessionId ? `from ${sessionId}` : null,
    date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : null
  ].filter(Boolean).join(' · ');
  return (
    <span className="v2-carried-badge" title={`Previously verified in an earlier search of this area${detail ? ` (${detail})` : ''}`}>
      ✓ Verified earlier
    </span>
  );
}

export function qualityOf(vendor) {
  if (!vendor || typeof vendor !== 'object') return null;
  const score = vendor?.profileQuality?.score;
  if (score != null && Number.isFinite(Number(score))) return Number(score);
  const legacy = vendor?.qualityScore;
  if (legacy != null && Number.isFinite(Number(legacy))) return Number(legacy);

  // Dynamic fallback calculation
  let s = 0;
  const rawPhones = [vendor.phone, vendor.primaryPhone, ...(Array.isArray(vendor.phones) ? vendor.phones : [])].filter(Boolean);
  const phoneStr = rawPhones.join(' ');
  const cleanPhone = phoneStr.replace(/\D/g, '');
  const isMob = vendor.phoneType === 'mobile' || vendor.isMobile || /^[6-9]\d{9}/.test(cleanPhone.slice(-10));
  const isLand = vendor.phoneType === 'landline' || vendor.isLandline || (!isMob && cleanPhone.length >= 8);

  if (isMob) s += 35;
  else if (isLand) s += 25;
  else if (rawPhones.length > 0) s += 15;

  if (vendor.whatsappAvailable || vendor.whatsappLink || isMob) s += 15;

  const addr = String(vendor.address || vendor.formattedAddress || vendor.street || '').trim();
  if (addr.length > 15 && !/^(india|telangana|andhra pradesh)$/i.test(addr)) s += 10;
  else if (addr.length > 5) s += 5;

  const pin = vendor.pincode || (addr.match(/\b\d{6}\b/) ? addr.match(/\b\d{6}\b/)[0] : '');
  if (pin && /^\d{6}$/.test(String(pin).trim())) s += 5;

  const lat = Number(vendor.latitude ?? vendor.lat);
  const lng = Number(vendor.longitude ?? vendor.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) s += 5;

  const ratingVal = parseFloat(vendor.rating);
  if (!Number.isNaN(ratingVal)) {
    if (ratingVal >= 4.5) s += 10;
    else if (ratingVal >= 4.0) s += 7;
    else if (ratingVal >= 3.5) s += 4;
    else if (ratingVal > 0) s += 2;
  }

  const rawReviews = vendor.reviewsCount || vendor.reviewCount || vendor.reviews || '';
  const revNum = parseInt(String(rawReviews).replace(/,/g, ''), 10);
  if (!Number.isNaN(revNum)) {
    if (revNum >= 50) s += 5;
    else if (revNum >= 10) s += 3;
    else if (revNum >= 1) s += 1;
  }

  const website = String(vendor.website || vendor.sourceUrl || '').trim();
  if (website.startsWith('http') && !website.includes('google.com') && !website.includes('justdial.com')) s += 10;
  if (vendor.email || (Array.isArray(vendor.emails) && vendor.emails.length)) s += 3;
  if (vendor.instagram || vendor.facebook || vendor.socials?.instagram || vendor.socials?.facebook) s += 2;

  return Math.min(100, Math.max(10, s));
}

export function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (!Number.isFinite(nLat1) || !Number.isFinite(nLon1) || !Number.isFinite(nLat2) || !Number.isFinite(nLon2)) return null;
  const R = 6371; // km
  const dLat = (nLat2 - nLat1) * Math.PI / 180;
  const dLon = (nLon2 - nLon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(nLat1 * Math.PI / 180) * Math.cos(nLat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function cleanTreeLabel(value) {
  return String(value || '')
    .replace(/\b(revenue|village|mandal|tehsil|taluk|block|district)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A lead belongs to a mandal even when the engine left `mandal` empty. The
 * folder stores the surveyed boundary centres, so coordinates are enough.
 * This mirrors the server-side hierarchy builder exactly, which keeps the
 * sidebar counts and the filtered table in agreement.
 */
export function resolveLeadMandal(lead, boundary) {
  const explicit = cleanTreeLabel(lead?.mandal);
  if (explicit) return explicit;
  const lat = Number(lead?.latitude);
  const lng = Number(lead?.longitude);
  const centers = Array.isArray(boundary?.centers) ? boundary.centers : [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !centers.length) return 'Unassigned mandal';

  let best = null;
  let bestKm = Infinity;
  for (const center of centers) {
    const km = calculateHaversineKm(center.lat, center.lng, lat, lng);
    if (km != null && km < bestKm) { bestKm = km; best = center; }
  }
  return best ? (cleanTreeLabel(best.name) || 'Unassigned mandal') : 'Unassigned mandal';
}

export function resolveLeadVillage(lead) {
  return cleanTreeLabel(lead?.village)
    || cleanTreeLabel(lead?.locality)
    || cleanTreeLabel(lead?.suburb)
    || cleanTreeLabel(lead?.zoneName)
    || 'All areas';
}

/**
 * Group every lead into a district → mandal → village tree.
 * Out-of-Bound folders group by rejection category instead, so the operator
 * sees why each vendor was rejected.
 */
export function buildFolderTree(leads, { boundary = null, isOutOfBound = false, fallbackDistrict = '' } = {}) {
  const list = Array.isArray(leads) ? leads : [];
  const groups = new Map();
  let district = cleanTreeLabel(fallbackDistrict);

  for (const lead of list) {
    const groupName = isOutOfBound
      ? (String(lead.oobCategory || 'Outside target boundary').trim() || 'Outside target boundary')
      : resolveLeadMandal(lead, boundary);
    const childName = isOutOfBound
      ? (cleanTreeLabel(lead.district) || 'Unknown district')
      : resolveLeadVillage(lead);
    if (!district) district = cleanTreeLabel(lead.district);

    const groupKey = groupName.toLowerCase();
    if (!groups.has(groupKey)) groups.set(groupKey, { name: groupName, count: 0, children: new Map() });
    const group = groups.get(groupKey);
    group.count += 1;
    const childKey = childName.toLowerCase();
    group.children.set(childKey, {
      name: childName,
      count: (group.children.get(childKey)?.count || 0) + 1
    });
  }

  const nodes = [...groups.values()]
    .map(group => ({
      name: group.name,
      count: group.count,
      children: [...group.children.values()]
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    total: list.length,
    district: district || (isOutOfBound ? 'Rejected leads' : 'District'),
    isOutOfBound,
    groups: nodes
  };
}

