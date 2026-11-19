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

const cheerio = require('cheerio');
const dv = require('./directoryVendor');
const { extractPhones } = require('../utils/phoneUtils');
const { searchBingHtml } = require('./bingSearch');
const { getBrowser } = require('./browserFactory');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

/**
 * Finds TripAdvisor listing URLs through the shared Bing helper, then reads the
 * public profile pages in the stealth browser and parses their JSON-LD.
 *
 * Bing is not queried with a forged URL: from this network that returns cached
 * unrelated pages. `bingSearch.js` types the query into Bing's own box.
 * TripAdvisor itself refuses plain HTTP clients, so the profile pages are read
 * through `browserFactory` as well, with a consent-wall check that skips
 * instead of fighting the wall.
 */
async function scrapeTripAdvisor(category, location, sessionId = 'legacy', opts = {}) {
  const countryCode = String(opts.countryCode || 'US').toUpperCase();
  deps.logger(`[TripAdvisor ${countryCode}] Searching: "${category}" in "${location}"...`);

  const results = [];
  const query = `site:tripadvisor.com "${category}" "${location}"`;

  try {
    const { rows, blocked } = await searchBingHtml(query, {
      maxPages: 2,
      logger: deps.logger,
      abortSignal: deps.abortSignal
    });

    if (blocked) {
      deps.logger(`[TripAdvisor ${countryCode}] Bing served a challenge — skipping instead of bypassing it.`);
    }

    const urls = [];
    for (const row of rows) {
      const href = row.url || '';
      if (!href.includes('tripadvisor.')) continue;
      if (href.includes('/Search?') || href.includes('/UserReview-')) continue;
      if (urls.includes(href)) continue;
      urls.push(href);
    }

    deps.logger(`[TripAdvisor ${countryCode}] Discovered ${urls.length} candidate listing URLs.`);

    const toFetch = urls.slice(0, 6);
    if (toFetch.length) {
      const browser = await getBrowser();
      const context = await browser.newContext({ locale: 'en-US' });
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(20000);
        for (const listingUrl of toFetch) {
          if (deps.abortSignal && deps.abortSignal.aborted) break;
          try {
            await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
            const html = await page.content();
            if (/before you continue|consent|verify you are a human|unusual traffic|captcha/i.test(html.slice(0, 4000))) {
              deps.logger(`[TripAdvisor ${countryCode}] Consent/verification wall on ${listingUrl} — skipping.`);
              continue;
            }
            const p$ = cheerio.load(html);
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
              } catch (e) { /* malformed JSON-LD block */ }
            });
          } catch (err) {
            deps.logger(`[TripAdvisor ${countryCode}] Listing read warning: ${err.message}`);
          }
        }
      } finally {
        try { await context.close(); } catch (e) {}
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
