/**
 * engine-tripadvisor.js — Global Business & Hospitality Scraper via TripAdvisor
 *
 * Covers ALL countries: US, GB, CA, AU, AE, SG, NZ, ZA, IE, MY, IN, and beyond.
 * Particularly powerful for:
 *   - Wedding Venues & Banquet Halls
 *   - Event Planners & Catering
 *   - Restaurants, Cafes & Bars
 *   - Hotels, Resorts & Spas
 *   - Photographers & Tours
 *
 * Extracts structured JSON-LD (schema.org/LocalBusiness, Restaurant, Hotel):
 *   - Name, Phone, Address, Geo Lat/Lng, Rating, Reviews, Website, Price Range
 * Zero paid API keys.
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

function decodeBingUrl(href) {
  if (!href) return '';
  if (!href.includes('bing.com/ck/')) return href;
  const match = href.match(/[?&]u=a1([a-zA-Z0-9_-]+)/);
  if (!match) return href;
  try {
    let b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return Buffer.from(b64, 'base64').toString('utf8');
  } catch (e) {
    return href;
  }
}

/**
 * Searches Bing for TripAdvisor listing URLs, then parses JSON-LD metadata from public profiles
 */
async function scrapeTripAdvisor(category, location, sessionId = 'legacy', opts = {}) {
  const countryCode = String(opts.countryCode || 'US').toUpperCase();
  deps.logger(`[TripAdvisor ${countryCode}] Searching: "${category}" in "${location}"...`);

  const results = [];
  const query = `site:tripadvisor.com "${category}" "${location}"`;

  try {
    const market = countryCode === 'IN' ? 'en-IN' : `en-${countryCode}`;
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en&mkt=${market}&count=20`;

    const resp = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000
    });

    const $ = cheerio.load(resp.data);
    const urls = [];

    $('li.b_algo h2 a').each((_, el) => {
      const rawHref = $(el).attr('href');
      const href = decodeBingUrl(rawHref);
      if (href && href.includes('tripadvisor.') && !href.includes('/Search?') && !href.includes('/UserReview-')) {
        urls.push(href);
      }
    });

    deps.logger(`[TripAdvisor ${countryCode}] Discovered ${urls.length} candidate listing URLs.`);

    // Fetch up to 8 candidate pages and extract JSON-LD
    const toFetch = urls.slice(0, 8);
    for (const listingUrl of toFetch) {
      if (deps.abortSignal && deps.abortSignal.aborted) break;

      try {
        const pageResp = await axios.get(listingUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          timeout: 12000
        });

        const p$ = cheerio.load(pageResp.data);
        p$('script[type="application/ld+json"]').each((_, s) => {
          try {
            const json = JSON.parse(p$(s).html() || '{}');
            const data = Array.isArray(json) ? json[0] : json;

            if (data && (data['@type'] === 'Restaurant' || data['@type'] === 'Hotel' || data['@type'] === 'LocalBusiness' || data['@type'] === 'TouristAttraction')) {
              const addr = data.address || {};
              const fullAddress = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode].filter(Boolean).join(', ');

              results.push({
                name: data.name || '',
                phone: data.telephone || '',
                address: fullAddress || location,
                city: addr.addressLocality || location,
                state: addr.addressRegion || '',
                website: data.url || listingUrl,
                profileUrl: listingUrl,
                rating: data.aggregateRating?.ratingValue ? Number(data.aggregateRating.ratingValue) : null,
                reviewCount: data.aggregateRating?.reviewCount ? Number(data.aggregateRating.reviewCount) : null,
                priceRange: data.priceRange || '',
                latitude: data.geo?.latitude ? Number(data.geo.latitude) : null,
                longitude: data.geo?.longitude ? Number(data.geo.longitude) : null,
                image: data.image || ''
              });
            }
          } catch (e) {}
        });

      } catch (err) {
        // Continue politely on network or single-page error
      }
    }

  } catch (err) {
    deps.logger(`[TripAdvisor ${countryCode}] Search error: ${err.message}`);
  }

  deps.logger(`[TripAdvisor ${countryCode}] Parsed ${results.length} rich venue/business records.`);

  let created = 0;
  let updated = 0;
  let phoneCount = 0;

  for (const item of results) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;

    const parsedPhones = extractPhones(item.phone || '', {
      defaultCountry: countryCode,
      allowInternational: true,
      trusted: true,
      context: 'phone tripadvisor'
    });

    const vendor = dv.buildDirectoryVendor({
      prefix: 'ta',
      sessionId,
      source: `TripAdvisor ${countryCode}`,
      sourceEngine: 'tripadvisor',
      name: item.name,
      category,
      city: item.city || location,
      address: item.address,
      country: countryCode,
      website: item.website || '',
      profileUrl: item.profileUrl || '',
      latitude: item.latitude,
      longitude: item.longitude,
      phones: parsedPhones,
      rating: item.rating,
      reviewCount: item.reviewCount,
      priceRange: item.priceRange,
      tags: ['hospitality', 'tripadvisor', countryCode.toLowerCase()]
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

  deps.logger(`[TripAdvisor ${countryCode}] Finished: ${created} new leads, ${updated} updated, ${phoneCount} with phones.`);
  return {
    totalScraped: results.length,
    newInserted: created,
    updated,
    phoneCount
  };
}

module.exports = {
  scrapeTripAdvisor,
  setDeps
};
