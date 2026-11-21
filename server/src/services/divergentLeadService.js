/**
 * divergentLeadService.js
 *
 * Silently archives valid commercial businesses discovered during scraping
 * that belong to a DIFFERENT industry than the requested search query.
 *
 * Guarantees:
 * 1. Active Search Purity: Divergent leads are NEVER linked to the active
 *    search sessionId and NEVER emitted to the active user's live stream or map.
 * 2. Zero Data Waste: High-value commercial leads (with name, phone, address,
 *    coordinates, or website) are categorized into their TRUE industry folder
 *    (e.g., Electrical Goods, Hardware, Textiles, Healthcare) and stored in the
 *    database for future searches and instant cache hits.
 * 3. Invisible to the active user: Stored under background system ownership.
 */

const dbAdapter = require('../config/dbAdapter');
const indiaTradeIntelligence = require('../utils/indiaTradeIntelligence');

/**
 * Detects the most accurate category for a business that didn't match the active query.
 */
function detectTrueCategory(vendor) {
  if (!vendor) return 'General Commercial';

  const name = String(vendor.name || '').trim();
  const subcategory = String(vendor.subcategory || vendor.placeCategory || '').trim();
  const rawCat = String(vendor.category || '').trim();
  const haystack = `${name} ${subcategory} ${rawCat}`.trim();

  // 1. Authoritative trade sector detection
  const sector = indiaTradeIntelligence.detectTradeSector(haystack) 
    || indiaTradeIntelligence.detectTradeSector(subcategory) 
    || indiaTradeIntelligence.detectTradeSector(name);

  if (sector && sector.label) {
    return sector.label;
  }

  // 2. Role detection via categoryFidelity
  try {
    const { detectRole } = require('./categoryFidelity');
    const role = detectRole(subcategory) || detectRole(name) || detectRole(haystack);
    if (role && role.label) {
      return role.label;
    }
  } catch (e) {}

  // 3. Fallback to Google Place Category / Subcategory if clean
  if (subcategory && subcategory.length > 2 && subcategory.length < 60) {
    const cleanSub = subcategory.replace(/[^a-zA-Z0-9 &,-]/g, '').trim();
    if (cleanSub) return cleanSub;
  }

  return 'General Commercial Directory';
}

/**
 * Checks if the vendor has actionable business details (phone, address, coordinates, or website).
 */
function hasValidBusinessDetails(vendor) {
  if (!vendor || !vendor.name) return false;
  const name = String(vendor.name).trim();
  if (name.length < 2) return false;

  const hasPhone = Boolean(vendor.phone && String(vendor.phone).trim().length >= 5);
  const hasAddress = Boolean(vendor.address && String(vendor.address).trim().length >= 8);
  const hasWebsite = Boolean(vendor.website && String(vendor.website).startsWith('http'));
  const hasCoords = Number.isFinite(vendor.latitude) && Number.isFinite(vendor.longitude);
  const hasMaps = Boolean(vendor.mapsLink && String(vendor.mapsLink).includes('google'));

  // Must have at least two contact/location attributes or one verified phone
  return hasPhone || (hasAddress && (hasCoords || hasWebsite || hasMaps));
}

/**
 * Silently archives a divergent business into its proper database category folder.
 *
 * @param {object} vendor
 * @param {string} requestedCategory The query category that this vendor did NOT match
 * @returns {{ saved: boolean, category?: string, name?: string }}
 */
function archiveDivergentLead(vendor, requestedCategory = '') {
  if (!vendor || !hasValidBusinessDetails(vendor)) {
    return { saved: false, reason: 'insufficient-details' };
  }

  try {
    const trueCategory = detectTrueCategory(vendor);
    
    // Clone and sanitize so it never contaminates the active user's session
    const archived = {
      ...vendor,
      id: vendor.id || ('div_' + Date.now().toString(36) + Math.random().toString(36).substring(7)),
      category: trueCategory,
      originalQueryCategory: requestedCategory || vendor.category || '',
      divergentDiscoveredAt: new Date().toISOString(),
      source: vendor.source ? `${vendor.source} (Archived Intelligence)` : 'Background Harvester',
      sessionId: 'background_archive',
      lastSessionId: 'background_archive',
      sessionIds: ['background_archive'],
      userId: 'admin_1',
      userIds: ['admin_1'],
      isBackgroundArchive: true
    };

    // Save quietly to database store
    dbAdapter.saveVendor('admin_1', archived);

    return {
      saved: true,
      category: trueCategory,
      name: archived.name
    };
  } catch (err) {
    return { saved: false, error: err.message };
  }
}

module.exports = {
  detectTrueCategory,
  hasValidBusinessDetails,
  archiveDivergentLead
};
