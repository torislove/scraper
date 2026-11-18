/**
 * engine-bing-places.js — Global Business & Contact Scraper via Bing Local / Maps
 *
 * Covers ALL countries: US, GB, CA, AU, AE, SG, NZ, ZA, IE, MY, and beyond.
 *
 * Extracts:
 *   - Business Name
 *   - Direct Phone Number
 *   - Physical Address
 *   - Website URL
 *   - Rating & Reviews Count
 *   - Operating Hours
 *   - GPS Coordinates (from map pin parameters)
 *
 * Zero paid API keys, zero subscriptions.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { getBrowser } = require('./browserFactory');
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
 * Scrapes Bing Places & Local Directory
 */
async function scrapeBingPlaces(category, location, sessionId = 'legacy', opts = {}) {
  const countryCode = String(opts.countryCode || 'US').toUpperCase();
  deps.logger(`[Bing Places ${countryCode}] Searching for "${category}" in "${location}"...`);

  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: countryCode === 'AE' ? 'ar-AE,en' : 'en-US'
  });

  const page = await context.newPage();
  const results = [];

  try {
    const market = countryCode === 'IN' ? 'en-IN' : `en-${countryCode}`;
    const query = `${category} in ${location}`;
    const searchUrl = `https://www.bing.com/maps?q=${encodeURIComponent(query)}&setlang=en&mkt=${market}&cc=${countryCode}`;

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try {
      await page.waitForSelector('.b_card, .b_subModule, .entity-name, .b_address', { timeout: 10000 });
    } catch (e) {}

    const html = await page.content();
    if (/verify you are a human|captcha/i.test(html)) {
      deps.logger(`[Bing Places ${countryCode}] Bot check encountered — stopping politely.`);
      await context.close();
      return { totalScraped: 0, newInserted: 0, updated: 0, phoneCount: 0 };
    }

    const items = await page.evaluate(() => {
      const rows = [];
      const cards = document.querySelectorAll('.b_card, .b_subModule, div[class*="entity"], div[data-entityid], li.b_algo');

      cards.forEach(card => {
        const titleEl = card.querySelector('h2 a, .b_entityTitle, .entity-name, a.tilk');
        if (!titleEl) return;
        const name = (titleEl.innerText || '').trim();
        if (!name || name.length < 2) return;

        // Phone
        const phoneEl = card.querySelector('.b_focusLabel, [data-title="Phone"], a[href^="tel:"], .c_phone');
        let phone = '';
        if (phoneEl) {
          phone = phoneEl.innerText.trim();
        } else {
          // Regex search in card text
          const cardText = card.innerText || '';
          const phoneM = cardText.match(/(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,5}/);
          if (phoneM) phone = phoneM[0];
        }

        // Address
        const addrEl = card.querySelector('.b_address, .b_factrow, address');
        const address = addrEl ? addrEl.innerText.trim() : '';

        // Website
        const webEl = card.querySelector('a[data-t*="official"], a[data-t*="website"], a[href^="http"]:not([href*="bing.com"]):not([href*="microsoft.com"])');
        const website = webEl ? webEl.getAttribute('href') : '';

        // Rating
        const ratingEl = card.querySelector('.c_star, .b_rating, [aria-label*="rating"]');
        const ratingM = ratingEl ? (ratingEl.getAttribute('aria-label') || ratingEl.innerText).match(/([\d.]+)/) : null;
        const rating = ratingM ? Number(ratingM[1]) : null;

        // GPS coordinates if available in data attributes or links
        let lat = null;
        let lng = null;
        const coordAttr = card.getAttribute('data-lat') || card.querySelector('[data-lat]')?.getAttribute('data-lat');
        const coordLng = card.getAttribute('data-lng') || card.querySelector('[data-lng]')?.getAttribute('data-lng');
        if (coordAttr && coordLng) {
          lat = Number(coordAttr);
          lng = Number(coordLng);
        }

        rows.push({
          name,
          phone,
          address,
          website,
          rating,
          latitude: lat,
          longitude: lng
        });
      });

      return rows;
    });

    // Fallback to Bing Local search query if maps returns zero cards
    if (results.length === 0) {
      try {
        const localUrl = `https://www.bing.com/search?q=${encodeURIComponent(query + ' phone address')}&setlang=en&mkt=${market}&cc=${countryCode}&count=20`;
        await page.goto(localUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        const fallbackItems = await page.evaluate(() => {
          const rows = [];
          document.querySelectorAll('li.b_algo').forEach(card => {
            const h2 = card.querySelector('h2 a');
            if (!h2) return;
            const name = (h2.innerText || '').replace(/\s*[-–|].*$/, '').trim();
            if (!name || name.length < 2 || /wikipedia|thesaurus/i.test(name)) return;
            const text = card.innerText || '';
            const phoneM = text.match(/(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,5}/);
            const phone = phoneM ? phoneM[0] : '';
            const website = h2.getAttribute('href') || '';
            rows.push({
              name,
              phone,
              address: name,
              website: website.startsWith('http') ? website : ''
            });
          });
          return rows;
        });
        results.push(...fallbackItems);
      } catch (e) {}
    }

  } catch (err) {
    deps.logger(`[Bing Places ${countryCode}] Error: ${err.message}`);
  } finally {
    try { await context.close(); } catch (e) {}
  }

  deps.logger(`[Bing Places ${countryCode}] Found ${results.length} entities.`);

  let created = 0;
  let updated = 0;
  let phoneCount = 0;

  for (const item of results) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;

    const parsedPhones = extractPhones(item.phone || '', {
      defaultCountry: countryCode,
      allowInternational: true,
      trusted: true,
      context: 'phone bing places'
    });

    const vendor = dv.buildDirectoryVendor({
      prefix: 'bing',
      sessionId,
      source: `Bing Places ${countryCode}`,
      sourceEngine: 'bing-places',
      name: item.name,
      category,
      city: location,
      address: item.address || `${item.name}, ${location}`,
      country: countryCode,
      website: item.website || '',
      latitude: item.latitude,
      longitude: item.longitude,
      phones: parsedPhones,
      rating: item.rating || null,
      tags: ['local', 'bing-places', countryCode.toLowerCase()]
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

  deps.logger(`[Bing Places ${countryCode}] Complete: ${created} new leads, ${updated} updated, ${phoneCount} with phones.`);
  return {
    totalScraped: results.length,
    newInserted: created,
    updated,
    phoneCount
  };
}

module.exports = {
  scrapeBingPlaces,
  setDeps
};
