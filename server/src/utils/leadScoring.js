/**
 * leadScoring.js
 *
 * Deterministic Lead Quality & Tier Scoring Engine for Scraper.co.in
 * Commercial B2B Assessment across Telecom, WhatsApp, Location, Reputation & Web Presence.
 */

const { normalizePhone } = require('./phoneUtils');

/**
 * Calculate deterministic Lead Quality Score (0 - 100) and assigned Tier.
 *
 * @param {Object} vendor - The vendor/lead object to score.
 * @returns {Object} { score, tier, breakdown, bucket }
 */
function calculateLeadQuality(vendor) {
  if (!vendor || typeof vendor !== 'object') {
    return { score: 10, tier: 'Bronze', bucket: 'thin', breakdown: {} };
  }

  let telecomScore = 0;
  let whatsappScore = 0;
  let locationScore = 0;
  let reputationScore = 0;
  let digitalScore = 0;

  // 1. Telecom Contact (Max 35 pts)
  const rawPhones = [
    vendor.phone,
    vendor.primaryPhone,
    ...(Array.isArray(vendor.phones) ? vendor.phones : [])
  ].filter(Boolean);

  let isMobile = vendor.phoneType === 'mobile' || vendor.isMobile === true;
  let isLandline = vendor.phoneType === 'landline' || vendor.isLandline === true;

  if (!isMobile && !isLandline) {
    for (const ph of rawPhones) {
      const parsed = normalizePhone(ph);
      if (parsed?.isMobile) {
        isMobile = true;
        break;
      }
      if (parsed?.isLandline) {
        isLandline = true;
      }
    }
  }

  if (isMobile) {
    telecomScore += 35;
  } else if (isLandline) {
    telecomScore += 25;
  } else if (rawPhones.length > 0) {
    telecomScore += 15;
  }

  // Bonus for secondary backup numbers
  const uniqueDigits = new Set(
    rawPhones.map(p => String(p).replace(/\D/g, '').slice(-10)).filter(d => d.length >= 8)
  );
  if (uniqueDigits.size >= 2) {
    telecomScore = Math.min(35, telecomScore + 5);
  }

  // 2. WhatsApp Readiness (Max 15 pts)
  if (vendor.whatsappAvailable || vendor.whatsappLink || isMobile) {
    whatsappScore += 15;
  }

  // 3. Location & Spatial Fidelity (Max 20 pts)
  const addr = String(vendor.address || vendor.formattedAddress || vendor.street || '').trim();
  if (addr.length > 15 && !/^(india|telangana|andhra pradesh)$/i.test(addr)) {
    locationScore += 10;
  } else if (addr.length > 5) {
    locationScore += 5;
  }

  const pincode = vendor.pincode || (addr.match(/\b\d{6}\b/) ? addr.match(/\b\d{6}\b/)[0] : '');
  if (pincode && /^\d{6}$/.test(String(pincode).trim())) {
    locationScore += 5;
  }

  const lat = Number(vendor.latitude ?? vendor.lat);
  const lng = Number(vendor.longitude ?? vendor.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
    locationScore += 5;
  }

  // 4. Reputation & Social Proof (Max 15 pts)
  const ratingVal = parseFloat(vendor.rating);
  if (!Number.isNaN(ratingVal)) {
    if (ratingVal >= 4.5) reputationScore += 10;
    else if (ratingVal >= 4.0) reputationScore += 7;
    else if (ratingVal >= 3.5) reputationScore += 4;
    else if (ratingVal > 0) reputationScore += 2;
  }

  const rawReviews = vendor.reviewsCount || vendor.reviewCount || vendor.reviews || '';
  const revNum = parseInt(String(rawReviews).replace(/,/g, ''), 10);
  if (!Number.isNaN(revNum)) {
    if (revNum >= 50) reputationScore += 5;
    else if (revNum >= 10) reputationScore += 3;
    else if (revNum >= 1) reputationScore += 1;
  }

  // 5. Digital Footprint (Max 15 pts)
  const website = String(vendor.website || vendor.sourceUrl || '').trim();
  if (
    website.startsWith('http') &&
    !website.includes('google.com') &&
    !website.includes('justdial.com') &&
    !website.includes('facebook.com')
  ) {
    digitalScore += 10;
  }

  const email = String(vendor.email || (Array.isArray(vendor.emails) ? vendor.emails[0] : '')).trim();
  if (email && email.includes('@') && email.includes('.')) {
    digitalScore += 3;
  }

  if (vendor.instagram || vendor.facebook || vendor.socials?.instagram || vendor.socials?.facebook) {
    digitalScore += 2;
  }

  const rawTotal = telecomScore + whatsappScore + locationScore + reputationScore + digitalScore;
  const score = Math.min(100, Math.max(10, rawTotal));
  const tier = determineTier(score);

  return {
    score,
    tier,
    bucket: score >= 85 ? 'rich' : score >= 60 ? 'fair' : 'thin',
    breakdown: {
      telecom: telecomScore,
      whatsapp: whatsappScore,
      location: locationScore,
      reputation: reputationScore,
      digital: digitalScore
    },
    updatedAt: new Date().toISOString()
  };
}

/**
 * Determine Tier by Quality Score.
 */
function determineTier(score) {
  const n = Number(score) || 0;
  if (n >= 85) return 'Platinum';
  if (n >= 70) return 'Gold';
  if (n >= 50) return 'Silver';
  return 'Bronze';
}

module.exports = {
  calculateLeadQuality,
  determineTier
};

