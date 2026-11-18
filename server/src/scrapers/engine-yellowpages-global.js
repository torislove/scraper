/**
 * engine-yellowpages-global.js — Global Directory Discovery for 11 Monetized Markets
 *
 * Covers:
 *   - United States: yellowpages.com
 *   - United Kingdom: yell.com
 *   - Canada: yellowpages.ca
 *   - Australia: yellowpages.com.au
 *   - New Zealand: yellowpages.co.nz
 *   - UAE: yellowpages.ae
 *   - Singapore: yellowpages.com.sg
 *   - Malaysia: yellowpages.com.my
 *   - South Africa: yellowpages.co.za
 *
 * Extracts business name, phone, address, rating, and website links without
 * key requirements, feeding leads into the central vendor store.
 */

const { getBrowser } = require('./browserFactory');
const dv = require('./directoryVendor');
const { extractPhones } = require('../utils/phoneUtils');
const { fastWebsiteExtract } = require('../utils/fastWebsiteExtractor');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

/**
 * Scrapes US YellowPages (yellowpages.com)
 */
async function scrapeYellowPagesUS(category, location, sessionId, opts = {}) {
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];
  const maxPages = Math.min(4, Math.max(1, Number(opts.maxPages) || 3));

  try {
    for (let p = 1; p <= maxPages && !deps.abortSignal.aborted; p++) {
      const searchUrl = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(category)}&geo_location_terms=${encodeURIComponent(location)}${p > 1 ? `&page=${p}` : ''}`;
      deps.logger(`[YellowPages US] Loading page ${p}: "${category}" in "${location}"...`);

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      try { await page.waitForSelector('.result, .v-card', { timeout: 8000 }); } catch (e) {}

      const html = await page.content();
      if (/verify you are a human|captcha|access denied/i.test(html)) {
        deps.logger(`[YellowPages US] Bot check encountered — stopping politely.`);
        break;
      }

      const items = await page.evaluate(() => {
        const rows = [];
        const cards = document.querySelectorAll('.result, .info, .v-card');
        cards.forEach(card => {
          const nameEl = card.querySelector('.business-name, h2 a, a.business-name');
          const phoneEl = card.querySelector('.phones, .phone');
          const streetEl = card.querySelector('.street-address');
          const locEl = card.querySelector('.locality');
          const webEl = card.querySelector('a.track-visit-website');
          const ratingEl = card.querySelector('.result-rating, .rating-stars');

          if (!nameEl) return;
          const name = (nameEl.innerText || '').trim();
          const phone = phoneEl ? (phoneEl.innerText || '').trim() : '';
          const street = streetEl ? (streetEl.innerText || '').trim() : '';
          const loc = locEl ? (locEl.innerText || '').trim() : '';
          const address = [street, loc].filter(Boolean).join(', ');
          const website = webEl ? webEl.getAttribute('href') : '';
          const profileUrl = nameEl.getAttribute('href')
            ? (nameEl.getAttribute('href').startsWith('http') ? nameEl.getAttribute('href') : `https://www.yellowpages.com${nameEl.getAttribute('href')}`)
            : '';
          const rating = ratingEl ? (ratingEl.getAttribute('class') || '').replace(/[^0-9.]/g, '') : '';

          if (name && (phone || address || website)) {
            rows.push({ name, phone, address, website, profileUrl, rating });
          }
        });
        return rows;
      });

      let added = 0;
      for (const item of items) {
        if (deps.abortSignal && deps.abortSignal.aborted) break;
        if (!results.some(r => r.name.toLowerCase() === item.name.toLowerCase())) {
          results.push({ ...item, country: 'US', source: 'YellowPages US' });
          added++;
        }
      }

      if (added === 0) break;
    }
  } catch (err) {
    deps.logger(`[YellowPages US] Error: ${err.message}`);
  } finally {
    try { await context.close(); } catch (e) {}
  }

  return results;
}

/**
 * Scrapes UK Yell (yell.com)
 */
async function scrapeYellUK(category, location, sessionId, opts = {}) {
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];
  const maxPages = Math.min(4, Math.max(1, Number(opts.maxPages) || 3));

  try {
    for (let p = 1; p <= maxPages && !deps.abortSignal.aborted; p++) {
      const searchUrl = `https://www.yell.com/ucs/UcsSearchAction.do?keywords=${encodeURIComponent(category)}&location=${encodeURIComponent(location)}${p > 1 ? `&pageNum=${p}` : ''}`;
      deps.logger(`[Yell UK] Loading page ${p}: "${category}" in "${location}"...`);

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      try { await page.waitForSelector('.businessCapsule, article', { timeout: 8000 }); } catch (e) {}

      const html = await page.content();
      if (/verify you are a human|captcha|access denied/i.test(html)) {
        deps.logger(`[Yell UK] Bot check encountered — stopping politely.`);
        break;
      }

      const items = await page.evaluate(() => {
        const rows = [];
        const cards = document.querySelectorAll('.businessCapsule, article.businessCapsule');
        cards.forEach(card => {
          const nameEl = card.querySelector('.businessCapsule--title, h2');
          const phoneEl = card.querySelector('.business--telephone, .businessCapsule--callProvider');
          const addrEl = card.querySelector('.businessCapsule--address, address');
          const webEl = card.querySelector('a[data-tracking="WEBSITE:btn"]');
          const ratingEl = card.querySelector('.starRating--average');

          if (!nameEl) return;
          const name = (nameEl.innerText || '').trim();
          const phone = phoneEl ? (phoneEl.innerText || '').trim() : '';
          const address = addrEl ? (addrEl.innerText || '').trim() : '';
          const website = webEl ? webEl.getAttribute('href') : '';
          const profileLink = card.querySelector('a.businessCapsule--title');
          const profileUrl = profileLink ? (profileLink.getAttribute('href').startsWith('http') ? profileLink.getAttribute('href') : `https://www.yell.com${profileLink.getAttribute('href')}`) : '';
          const rating = ratingEl ? (ratingEl.innerText || '').trim() : '';

          if (name && (phone || address || website)) {
            rows.push({ name, phone, address, website, profileUrl, rating });
          }
        });
        return rows;
      });

      let added = 0;
      for (const item of items) {
        if (deps.abortSignal && deps.abortSignal.aborted) break;
        if (!results.some(r => r.name.toLowerCase() === item.name.toLowerCase())) {
          results.push({ ...item, country: 'GB', source: 'Yell UK' });
          added++;
        }
      }

      if (added === 0) break;
    }
  } catch (err) {
    deps.logger(`[Yell UK] Error: ${err.message}`);
  } finally {
    try { await context.close(); } catch (e) {}
  }

  return results;
}

/**
 * Generic Country YellowPages portal scraper (Canada, Australia, NZ, UAE, SG, MY, ZA)
 */
async function scrapeYellowPagesInternational(category, location, countryCode, sessionId, opts = {}) {
  const PORTALS = {
    CA: { domain: 'https://www.yellowpages.ca', searchUrl: (c, l, p = 1) => `https://www.yellowpages.ca/search/si/${p}/${encodeURIComponent(c)}/${encodeURIComponent(l)}`, cardSel: '.listing' },
    AU: { domain: 'https://www.yellowpages.com.au', searchUrl: (c, l, p = 1) => `https://www.yellowpages.com.au/search/listings?clue=${encodeURIComponent(c)}&locationClue=${encodeURIComponent(l)}${p > 1 ? `&page=${p}` : ''}`, cardSel: '.listing' },
    NZ: { domain: 'https://yellow.co.nz', searchUrl: (c, l, p = 1) => `https://yellow.co.nz/search?what=${encodeURIComponent(c)}&where=${encodeURIComponent(l)}${p > 1 ? `&page=${p}` : ''}`, cardSel: 'div[class*="ListingCard"]' },
    AE: { domain: 'https://www.yellowpages.ae', searchUrl: (c, l, p = 1) => `https://www.yellowpages.ae/search?q=${encodeURIComponent(c)}&l=${encodeURIComponent(l)}${p > 1 ? `&page=${p}` : ''}`, cardSel: '.listing-item, .search-item' },
    SG: { domain: 'https://www.yellowpages.com.sg', searchUrl: (c, l, p = 1) => `https://www.yellowpages.com.sg/search?keyword=${encodeURIComponent(c)}&location=${encodeURIComponent(l)}${p > 1 ? `&pg=${p}` : ''}`, cardSel: '.business-card, .search-result' },
    MY: { domain: 'https://www.yellowpages.my', searchUrl: (c, l, p = 1) => `https://www.yellowpages.my/search?q=${encodeURIComponent(c)}&location=${encodeURIComponent(l)}${p > 1 ? `&page=${p}` : ''}`, cardSel: '.listing' },
    ZA: { domain: 'https://www.yellowpages.co.za', searchUrl: (c, l, p = 1) => `https://www.yellowpages.co.za/search?what=${encodeURIComponent(c)}&where=${encodeURIComponent(l)}${p > 1 ? `&page=${p}` : ''}`, cardSel: '.listing-item, .result' }
  };

  const portal = PORTALS[countryCode];
  if (!portal) return [];

  deps.logger(`[YellowPages ${countryCode}] Searching "${category}" in "${location}" via ${portal.domain}...`);

  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];
  const maxPages = Math.min(3, Math.max(1, Number(opts.maxPages) || 2));

  try {
    for (let p = 1; p <= maxPages && !deps.abortSignal.aborted; p++) {
      const url = portal.searchUrl(category, location, p);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      try { await page.waitForSelector(portal.cardSel, { timeout: 8000 }); } catch (e) {}

      const html = await page.content();
      if (/verify you are a human|captcha|access denied/i.test(html)) {
        deps.logger(`[YellowPages ${countryCode}] Bot check encountered — stopping politely.`);
        break;
      }

      const items = await page.evaluate((sel, base) => {
        const rows = [];
        const cards = document.querySelectorAll(sel);
        cards.forEach(card => {
          const nameEl = card.querySelector('h3 a, h2 a, .listing__name, .business-name, a[class*="name"]');
          const phoneEl = card.querySelector('a[href^="tel:"], .phone, [class*="phone"]');
          const addrEl = card.querySelector('address, .address, [class*="address"]');
          const webEl = card.querySelector('a[href^="http"]:not([href*="yellow"]):not([href*="google"])');

          if (!nameEl) return;
          const name = (nameEl.innerText || '').trim();
          const phone = phoneEl ? (phoneEl.innerText || phoneEl.getAttribute('href') || '').replace(/^tel:/i, '').trim() : '';
          const address = addrEl ? (addrEl.innerText || '').trim() : '';
          const website = webEl ? webEl.getAttribute('href') : '';
          const profileUrl = nameEl.getAttribute('href') ? (nameEl.getAttribute('href').startsWith('http') ? nameEl.getAttribute('href') : `${base}${nameEl.getAttribute('href')}`) : '';

          if (name && (phone || address || website)) {
            rows.push({ name, phone, address, website, profileUrl });
          }
        });
        return rows;
      }, portal.cardSel, portal.domain);

      let added = 0;
      for (const item of items) {
        if (deps.abortSignal && deps.abortSignal.aborted) break;
        if (!results.some(r => r.name.toLowerCase() === item.name.toLowerCase())) {
          results.push({ ...item, country: countryCode, source: `YellowPages ${countryCode}` });
          added++;
        }
      }

      if (added === 0) break;
    }
  } catch (err) {
    deps.logger(`[YellowPages ${countryCode}] Notice: ${err.message}`);
  } finally {
    try { await context.close(); } catch (e) {}
  }

  return results;
}

/**
 * Universal Global YellowPages Scraper
 * Routes based on countryCode
 */
async function scrapeYellowPagesGlobal(category, location, sessionId = 'legacy', opts = {}) {
  const country = String(opts.countryCode || 'US').toUpperCase();
  let rawListings = [];

  if (country === 'GB' || country === 'UK') {
    rawListings = await scrapeYellUK(category, location, sessionId, opts);
  } else if (country === 'US') {
    rawListings = await scrapeYellowPagesUS(category, location, sessionId, opts);
  } else {
    rawListings = await scrapeYellowPagesInternational(category, location, country, sessionId, opts);
  }

  deps.logger(`[YellowPages Global] Collected ${rawListings.length} raw listings (${country}).`);

  let created = 0;
  let updated = 0;
  let phoneCount = 0;

  for (const item of rawListings) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;

    const parsedPhones = extractPhones(item.phone || '', {
      defaultCountry: country,
      allowInternational: true,
      trusted: true,
      context: 'phone yellowpages'
    });

    const vendor = dv.buildDirectoryVendor({
      prefix: 'yp',
      sessionId,
      source: item.source || `YellowPages ${country}`,
      sourceEngine: 'yellowpages',
      name: item.name,
      category,
      city: location,
      address: item.address || `${item.name}, ${location}`,
      country,
      website: item.website || '',
      profileUrl: item.profileUrl || '',
      phones: parsedPhones,
      rating: item.rating ? Number(item.rating) : null,
      tags: ['directory', 'yellowpages', country.toLowerCase()]
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

  deps.logger(`[YellowPages Global] Finished: ${created} new leads, ${updated} updated, ${phoneCount} phones.`);
  return {
    totalScraped: rawListings.length,
    newInserted: created,
    updated,
    phoneCount
  };
}

module.exports = {
  scrapeYellowPagesGlobal,
  scrapeYellowPagesUS,
  scrapeYellUK,
  scrapeYellowPagesInternational,
  setDeps
};
