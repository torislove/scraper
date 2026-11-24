/**
 * engine-goldenpages-ie.js — Ireland Business Directory Scraper via GoldenPages.ie
 *
 * Covers: Ireland (IE)
 *
 * Primary national directory of Irish businesses across Dublin, Cork, Galway, Limerick, etc.
 * Zero paid APIs, public web scraping.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const dv = require('../core/directoryVendor');
const { extractPhones } = require('../../utils/phoneUtils');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

/**
 * Scrapes GoldenPages Ireland
 */
async function scrapeGoldenPagesIE(category, location, sessionId = 'legacy') {
  deps.logger(`[GoldenPages IE] Searching for "${category}" in "${location}"...`);

  const results = [];
  try {
    const searchUrl = `https://www.goldenpages.ie/q/business/advanced/where/${encodeURIComponent(location)}/what/${encodeURIComponent(category)}/1`;
    const resp = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IE,en;q=0.9'
      },
      timeout: 15000
    });

    const $ = cheerio.load(resp.data);
    $('.listing, .business-card, div[data-listing-id]').each((_, el) => {
      const titleAnchor = $(el).find('h2 a, .listing-title a, a[class*="title"]');
      if (!titleAnchor.length) return;

      const name = titleAnchor.text().trim();
      if (!name || name.length < 2) return;

      const profilePath = titleAnchor.attr('href') || '';
      const profileUrl = profilePath.startsWith('http') ? profilePath : `https://www.goldenpages.ie${profilePath}`;

      // Phone
      const phoneEl = $(el).find('.phone_link, a[href^="tel:"], .listing-phone, [class*="phone"]');
      const phone = phoneEl.text().replace(/^tel:/i, '').trim();

      // Address
      const addrEl = $(el).find('.address, address, [class*="address"]');
      const address = addrEl.text().trim();

      // Website
      const webEl = $(el).find('a.website_link, a[title*="Website"], a[href^="http"]:not([href*="goldenpages"])');
      const website = webEl.attr('href') || '';

      // Rating
      const starEl = $(el).find('.star_rating, .rating');
      const ratingMatch = starEl.text().match(/([\d.]+)/);
      const rating = ratingMatch ? Number(ratingMatch[1]) : null;

      if (name && (phone || address || website)) {
        results.push({
          name,
          phone,
          address: address || `${name}, ${location}`,
          website,
          profileUrl,
          rating
        });
      }
    });

  } catch (err) {
    deps.logger(`[GoldenPages IE] Search warning: ${err.message}`);
  }

  deps.logger(`[GoldenPages IE] Found ${results.length} raw Irish business listings.`);

  let created = 0;
  let updated = 0;
  let phoneCount = 0;

  for (const item of results) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;

    const parsedPhones = extractPhones(item.phone || '', {
      defaultCountry: 'IE',
      allowInternational: true,
      trusted: true,
      context: 'phone goldenpages'
    });

    const vendor = dv.buildDirectoryVendor({
      prefix: 'gpie',
      sessionId,
      source: 'GoldenPages Ireland',
      sourceEngine: 'goldenpages-ie',
      name: item.name,
      category,
      city: location,
      address: item.address,
      country: 'IE',
      website: item.website || '',
      profileUrl: item.profileUrl || '',
      phones: parsedPhones,
      rating: item.rating,
      tags: ['directory', 'ireland', 'goldenpages']
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

  deps.logger(`[GoldenPages IE] Complete: ${created} new leads, ${updated} updated, ${phoneCount} with phones.`);
  return {
    totalScraped: results.length,
    newInserted: created,
    updated,
    phoneCount
  };
}

module.exports = {
  scrapeGoldenPagesIE,
  setDeps
};
