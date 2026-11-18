/**
 * engine-trustpilot.js — Global Business Reputation & Contact Scraper via Trustpilot
 *
 * Covers: US, GB, CA, AU, IE, NZ, SG, ZA, and worldwide.
 *
 * Uses Trustpilot's public read-only search endpoint (no API key required):
 *   - Verified business display names
 *   - TrustScore ratings & review counts
 *   - Official company websites
 *   - Physical addresses
 *   - Business category tags
 * Zero paid subscriptions.
 */

const axios = require('axios');
const dv = require('./directoryVendor');
const { extractPhones } = require('../utils/phoneUtils');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

/**
 * Scrapes Trustpilot public business search
 */
async function scrapeTrustpilot(category, location, sessionId = 'legacy', opts = {}) {
  const countryCode = String(opts.countryCode || 'US').toUpperCase();
  deps.logger(`[Trustpilot ${countryCode}] Searching for "${category}" in "${location}"...`);

  const results = [];
  try {
    const query = `${category} ${location}`;
    // Trustpilot public read endpoint
    const url = `https://api.trustpilot.com/v1/business-units/search?query=${encodeURIComponent(query)}&country=${countryCode}&limit=25`;

    const resp = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      timeout: 12000
    });

    const units = resp.data?.businessUnits || [];
    deps.logger(`[Trustpilot ${countryCode}] Found ${units.length} verified business units.`);

    for (const unit of units) {
      const loc = unit.location || {};
      const addr = [loc.address, loc.city, loc.zipCode, loc.country].filter(Boolean).join(', ');

      results.push({
        name: unit.displayName || '',
        phone: unit.contact?.phone || '',
        email: unit.contact?.email || '',
        website: unit.websiteUrl ? (unit.websiteUrl.startsWith('http') ? unit.websiteUrl : `https://${unit.websiteUrl}`) : '',
        address: addr || `${unit.displayName}, ${location}`,
        city: loc.city || location,
        country: loc.country || countryCode,
        rating: unit.trustScore ? Number((unit.trustScore / 2).toFixed(1)) : null, // 0-10 -> 0-5
        reviewCount: unit.numberOfReviews ? Number(unit.numberOfReviews) : null,
        profileUrl: `https://www.trustpilot.com/review/${unit.identifyingName || ''}`,
        categories: Array.isArray(unit.categories) ? unit.categories.map(c => c.displayName || c.name).filter(Boolean) : []
      });
    }

  } catch (err) {
    deps.logger(`[Trustpilot ${countryCode}] Search note: ${err.message}`);
  }

  let created = 0;
  let updated = 0;
  let phoneCount = 0;

  for (const item of results) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;

    const parsedPhones = extractPhones(item.phone || '', {
      defaultCountry: countryCode,
      allowInternational: true,
      trusted: true,
      context: 'phone trustpilot'
    });

    const vendor = dv.buildDirectoryVendor({
      prefix: 'tp',
      sessionId,
      source: `Trustpilot ${countryCode}`,
      sourceEngine: 'trustpilot',
      name: item.name,
      category,
      city: item.city || location,
      address: item.address,
      country: item.country || countryCode,
      website: item.website || '',
      email: item.email || '',
      profileUrl: item.profileUrl || '',
      phones: parsedPhones,
      rating: item.rating,
      reviewCount: item.reviewCount,
      tags: ['trustpilot', 'verified-business', countryCode.toLowerCase(), ...(item.categories || [])]
    });

    if (!vendor.name) continue;

    const result = dv.saveDirectoryVendor(vendor, sessionId);
    if (!result.vendor) continue;

    if (result.vendor.phone) phoneCount++;
    if (result.created) {
      created++;
      try { deps.emitVendorEvent(result.vendor, 'inserted'); } catch (e) {}
    } else {
      updated++;
      try { deps.emitVendorEvent(result.vendor, 'updated'); } catch (e) {}
    }
  }

  deps.logger(`[Trustpilot ${countryCode}] Complete: ${created} new leads, ${updated} updated, ${phoneCount} with phones.`);
  return {
    totalScraped: results.length,
    newInserted: created,
    updated,
    phoneCount
  };
}

module.exports = {
  scrapeTrustpilot,
  setDeps
};
