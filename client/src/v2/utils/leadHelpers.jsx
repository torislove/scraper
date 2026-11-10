import React from 'react';

/**
 * Extract clean neighborhood / area / locality from a lead object,
 * using explicit fields first and falling back to parsed address segments.
 */
export function extractLeadArea(lead, fallbackCity) {
  if (!lead) return '';
  const city = (fallbackCity || lead.city || '').trim().toLowerCase();
  
  // 1. Explicit locality/suburb/zone fields
  for (const cand of [lead.locality, lead.suburb, lead.zoneName, lead.area, lead.mandal, lead.village]) {
    if (cand && typeof cand === 'string') {
      const trimmed = cand.trim();
      if (trimmed && trimmed.toLowerCase() !== city && !/^(other|unknown|null|undefined)$/i.test(trimmed)) {
        return trimmed;
      }
    }
  }

  // 2. Parse address string if available
  const address = lead.address || '';
  if (address) {
    const segs = address.split(',').map(s => s.trim()).filter(Boolean);
    const clean = segs.filter(s => !/^\d{6}$/.test(s) && !/^(Telangana|Andhra Pradesh|Karnataka|Maharashtra|Tamil Nadu|India)$/i.test(s));
    if (clean.length >= 2) {
      const cand = clean[clean.length - 2];
      if (cand && cand.length >= 3 && cand.length <= 40 && !/^(near|opp|behind|plot|door|flat|shop|floor|no\.)/i.test(cand) && cand.toLowerCase() !== city) {
        return cand;
      }
    }
    if (clean.length >= 1) {
      const cand = clean[clean.length - 1];
      if (cand && cand.length >= 3 && cand.length <= 40 && cand.toLowerCase() !== city) {
        return cand;
      }
    }
  }

  return '';
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
