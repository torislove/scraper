const { normalizePhone } = require('./deduplicator');

/**
 * Calculates a 0-100 quality score for a lead based on data richness.
 */
function calculateLeadScore(lead) {
  let score = 15; // Base score

  const phone = normalizePhone(lead.phone || lead.primaryPhone);
  if (phone && phone.length === 10) {
    score += 30; // Verified phone number
    score += 15; // WhatsApp compatible
  }

  if (lead.website && lead.website.startsWith('http')) {
    score += 15;
  }

  const rating = parseFloat(lead.rating || 0);
  if (rating >= 4.5) {
    score += 15;
  } else if (rating >= 4.0) {
    score += 10;
  }

  const reviews = parseInt(lead.reviewCount || lead.reviewsCount || 0, 10);
  if (reviews >= 50) {
    score += 10;
  } else if (reviews >= 10) {
    score += 5;
  }

  if (lead.photos && lead.photos.length > 0) {
    score += 5;
  }

  if (lead.verified || lead.aiVerified) {
    score += 5;
  }

  return Math.min(score, 100);
}

/**
 * Enriches a raw scraped lead with normalized contact, scoring, and CRM defaults.
 */
function enrichLead(rawLead, defaults = {}) {
  const normPhone = normalizePhone(rawLead.phone || rawLead.primaryPhone);
  const score = calculateLeadScore(rawLead);
  
  const whatsappUrl = normPhone && normPhone.length === 10
    ? `https://wa.me/91${normPhone}?text=Hello%20${encodeURIComponent(rawLead.name || 'there')}`
    : '';

  return {
    ...rawLead,
    id: rawLead.id || rawLead._id || `lead_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`,
    phone: normPhone || rawLead.phone || '',
    normalizedPhone: normPhone,
    whatsapp: whatsappUrl,
    crmStage: rawLead.crmStage || defaults.crmStage || 'new',
    crmScore: score,
    qualityScore: score,
    folderId: rawLead.folderId || defaults.folderId || 'default',
    sessionId: rawLead.sessionId || defaults.sessionId || 'legacy',
    sourceEngine: rawLead.sourceEngine || defaults.sourceEngine || 'Google Places + AI',
    scrapedAt: rawLead.scrapedAt || new Date()
  };
}

module.exports = {
  calculateLeadScore,
  enrichLead
};
