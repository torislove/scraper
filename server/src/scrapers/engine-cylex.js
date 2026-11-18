/**
 * engine-cylex.js — Multi-National Business Directory Scraper via Cylex Network
 *
 * Covers:
 *   - United Kingdom: cylex.co.uk
 *   - Australia: cylex.com.au
 *   - Canada: cylex.ca
 *   - UAE: cylex.ae
 *   - Singapore: cylex.com.sg
 *   - USA: cylex.us.com
 *
 * Extracts business name, phone, address, website, rating, and categories.
 * Zero paid APIs.
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

const CYLEX_DOMAINS = {
  GB: 'https://www.cylex.co.uk',
  UK: 'https://www.cylex.co.uk',
  AU: 'https://www.cylex.com.au',
  CA: 'https://www.cylex.ca',
  AE: 'https://www.cylex.ae',
  SG: 'https://www.cylex.com.sg',
  US: 'https://www.cylex.us.com'
};

/**
 * Scrapes Cylex for category and city
 */
async function scrapeCylex(category, location, sessionId = 'legacy', opts = {}) {
  const countryCode = String(opts.countryCode || 'GB').toUpperCase();
  const domain = CYLEX_DOMAINS[countryCode] || CYLEX_DOMAINS.GB;

  deps.logger(`[Cylex ${countryCode}] Searching for "${category}" in "${location}" via ${domain}...`);

  const results = [];
  const maxPages = Math.min(4, Math.max(1, Number(opts.maxPages) || 3));

  for (let p = 1; p <= maxPages && !deps.abortSignal.aborted; p++) {
    try {
      const searchUrl = `${domain}/s?q=${encodeURIComponent(category)}&c=${encodeURIComponent(location)}${p > 1 ? `&p=${p}` : ''}`;
      const resp = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 15000
      });

      const $ = cheerio.load(resp.data);
      let pageCount = 0;
      $('.listing-card, .company-item, .search-item, div[class*="company"]').each((_, el) => {
        const titleAnchor = $(el).find('h2 a, h3 a, a.company-name, a[class*="name"]');
        if (!titleAnchor.length) return;

        const name = titleAnchor.text().trim();
        if (!name || name.length < 2) return;

        const profilePath = titleAnchor.attr('href') || '';
        const profileUrl = profilePath.startsWith('http') ? profilePath : `${domain}${profilePath}`;

        // Phone
        const phoneEl = $(el).find('a[href^="tel:"], .phone, .tel, span[class*="phone"]');
        const phone = phoneEl.text().replace(/^tel:/i, '').trim();

        // Address
        const addrEl = $(el).find('address, .address, .street-address, [class*="address"]');
        const address = addrEl.text().trim();

        // Website
        const webEl = $(el).find('a[data-website], a[href^="http"]:not([href*="cylex"])');
        const website = webEl.attr('href') || '';

        // Rating
        const starEl = $(el).find('.rating-val, .rating, [class*="star"]');
        const ratingMatch = starEl.text().match(/([\d.]+)/);
        const rating = ratingMatch ? Number(ratingMatch[1]) : null;

        if (name && (phone || address || website)) {
          if (!results.some(r => r.name.toLowerCase() === name.toLowerCase())) {
            results.push({
              name,
              phone,
              address: address || `${name}, ${location}`,
              website,
              profileUrl,
              rating
            });
            pageCount++;
          }
        }
      });

      if (pageCount === 0) break; // Reached end of directory listings
    } catch (err) {
      deps.logger(`[Cylex ${countryCode}] Page ${p} note: ${err.message}`);
      break;
    }
  }

  deps.logger(`[Cylex ${countryCode}] Found ${results.length} raw business listings.`);

  let created = 0;
  let updated = 0;
  let phoneCount = 0;

  for (const item of results) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;

    const parsedPhones = extractPhones(item.phone || '', {
      defaultCountry: countryCode,
      allowInternational: true,
      trusted: true,
      context: 'phone cylex'
    });

    const vendor = dv.buildDirectoryVendor({
      prefix: 'cyl',
      sessionId,
      source: `Cylex ${countryCode}`,
      sourceEngine: 'cylex',
      name: item.name,
      category,
      city: location,
      address: item.address,
      country: countryCode,
      website: item.website || '',
      profileUrl: item.profileUrl || '',
      phones: parsedPhones,
      rating: item.rating,
      tags: ['directory', 'cylex', countryCode.toLowerCase()]
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

  deps.logger(`[Cylex ${countryCode}] Complete: ${created} new leads, ${updated} updated, ${phoneCount} with phones.`);
  return {
    totalScraped: results.length,
    newInserted: created,
    updated,
    phoneCount
  };
}

module.exports = {
  scrapeCylex,
  setDeps
};
