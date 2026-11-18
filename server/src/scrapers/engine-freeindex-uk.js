/**
 * engine-freeindex-uk.js — United Kingdom Business Directory Scraper via FreeIndex.co.uk
 *
 * Covers: United Kingdom (GB)
 *
 * FreeIndex has 1.5M+ UK verified local businesses across all categories.
 * Phone numbers, addresses, websites, and review ratings are freely accessible
 * without logins or paid keys.
 */

const axios = require('axios');
const cheerio = require('cheerio');
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
 * Scrapes FreeIndex UK for given category and city/town
 */
async function scrapeFreeIndexUK(category, location, sessionId = 'legacy') {
  deps.logger(`[FreeIndex UK] Searching for "${category}" in "${location}"...`);

  const results = [];
  try {
    const searchUrl = `https://www.freeindex.co.uk/search.htm?q=${encodeURIComponent(category)}&loc=${encodeURIComponent(location)}`;
    const resp = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9'
      },
      timeout: 15000
    });

    const $ = cheerio.load(resp.data);
    $('.search-result-content, .listing-card, div[class*="searchresult"]').each((_, el) => {
      const titleAnchor = $(el).find('h2 a, .title a, a[class*="title"]');
      if (!titleAnchor.length) return;

      const name = titleAnchor.text().trim();
      if (!name || name.length < 2) return;

      const profilePath = titleAnchor.attr('href') || '';
      const profileUrl = profilePath.startsWith('http') ? profilePath : `https://www.freeindex.co.uk${profilePath}`;

      // Phone
      const phoneEl = $(el).find('.searchresult-phone, .phone, a[href^="tel:"], span[class*="phone"]');
      const phone = phoneEl.text().replace(/^tel:/i, '').trim();

      // Address
      const addrEl = $(el).find('.searchresult-address, address, .location');
      const address = addrEl.text().trim();

      // Website
      const webEl = $(el).find('a.searchresult-website, a[title*="website"], a[class*="website"]');
      const website = webEl.attr('href') || '';

      // Rating
      const starEl = $(el).find('.stars-rating, .rating');
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
    deps.logger(`[FreeIndex UK] Search notice: ${err.message}`);
  }

  deps.logger(`[FreeIndex UK] Found ${results.length} raw UK business profiles.`);

  let created = 0;
  let updated = 0;
  let phoneCount = 0;

  for (const item of results) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;

    const parsedPhones = extractPhones(item.phone || '', {
      defaultCountry: 'GB',
      allowInternational: true,
      trusted: true,
      context: 'phone freeindex'
    });

    const vendor = dv.buildDirectoryVendor({
      prefix: 'fidx',
      sessionId,
      source: 'FreeIndex UK',
      sourceEngine: 'freeindex-uk',
      name: item.name,
      category,
      city: location,
      address: item.address,
      country: 'GB',
      website: item.website || '',
      profileUrl: item.profileUrl || '',
      phones: parsedPhones,
      rating: item.rating,
      tags: ['directory', 'uk-local', 'freeindex']
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

  deps.logger(`[FreeIndex UK] Complete: ${created} new leads, ${updated} updated, ${phoneCount} with phones.`);
  return {
    totalScraped: results.length,
    newInserted: created,
    updated,
    phoneCount
  };
}

module.exports = {
  scrapeFreeIndexUK,
  setDeps
};
