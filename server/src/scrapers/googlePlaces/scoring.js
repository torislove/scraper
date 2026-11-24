/**
 * scoring.js
 * Lead Quality Scoring Algorithm (0 - 100) and Quality Tier Classification.
 */

// Lead Quality Scoring Algorithm (0 - 100)
function calculateLeadScore(vendor) {
  let score = 0;
  const phone = vendor.phone || '';
  const cleanPhone = phone.replace(/\D/g, '');

  // 1. Phone availability (35 pts)
  if (cleanPhone.length >= 10 && !phone.toLowerCase().includes('require') && !phone.toLowerCase().includes('lookup')) {
    score += 35;
  }

  // 2. WhatsApp Readiness (15 pts)
  if (vendor.whatsappAvailable || (cleanPhone.slice(-10).length === 10)) {
    score += 15;
  }

  // 3. Street Address / Location details (10 pts)
  if (vendor.address && vendor.address.length > 8 && !vendor.address.toLowerCase().startsWith('india')) {
    score += 10;
  }

  // 4. Website presence (15 pts)
  if (vendor.website && vendor.website.startsWith('http') && !vendor.website.includes('google.com')) {
    score += 15;
  }

  // 5. Reputation: Rating >= 4.0 (15 pts)
  const ratingNum = parseFloat(vendor.rating);
  if (!isNaN(ratingNum) && ratingNum >= 4.0) {
    score += 15;
  } else if (!isNaN(ratingNum) && ratingNum >= 3.5) {
    score += 8;
  }

  // 6. Review volume >= 10 (5 pts)
  const revStr = (vendor.reviewsCount || vendor.reviews || '').toString().replace(/,/g, '');
  const revNum = parseInt(revStr, 10);
  if (!isNaN(revNum) && revNum >= 10) {
    score += 5;
  }

  // 7. Verified Email or Social Links (5 pts)
  if (vendor.email || vendor.instagram || vendor.facebook || (vendor.emails && vendor.emails.length > 0)) {
    score += 5;
  }

  return Math.min(Math.max(score, 10), 100);
}

function determineTier(score) {
  if (score >= 85) return 'Diamond';
  if (score >= 70) return 'Gold';
  if (score >= 50) return 'Silver';
  return 'Bronze';
}

module.exports = {
  calculateLeadScore,
  determineTier
};
