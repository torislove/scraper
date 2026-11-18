/**
 * engine-yelp.js — Free, keyless business directory scraper for US, Canada, and Australia.
 *
 * Covers:
 *   - United States: yelp.com
 *   - Canada: yelp.ca
 *   - Australia: yelp.com.au
 *
 * Extracts business name, phone, address, rating, review count, categories,
 * and direct website links using stealth browser execution with JSON-LD
 * fallback. Zero paid API keys.
 */

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

const YELP_DOMAINS = {
  US: 'https://www.yelp.com',
  CA: 'https://www.yelp.ca',
  AU: 'https://www.yelp.com.au'
};

/**
 * Scrapes Yelp for a given category, location, and country.
 */
async function scrapeYelp(category, location, sessionId = 'legacy', opts = {}) {
  const countryCode = String(opts.countryCode || 'US').toUpperCase();
  const domain = YELP_DOMAINS[countryCode] || YELP_DOMAINS.US;

  deps.logger(`[Yelp ${countryCode}] Initiating search: "${category}" in "${location}" via ${domain}...`);

  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: countryCode === 'AU' ? 'en-AU' : (countryCode === 'CA' ? 'en-CA' : 'en-US')
  });

  const page = await context.newPage();
  const results = [];

  try {
    const maxPages = Math.min(4, Math.max(1, Number(opts.maxPages) || 3));
    for (let p = 0; p < maxPages && !deps.abortSignal.aborted; p++) {
      const offset = p * 10;
      const searchUrl = `${domain}/search?find_desc=${encodeURIComponent(category)}&find_loc=${encodeURIComponent(location)}${offset > 0 ? `&start=${offset}` : ''}`;
      deps.logger(`[Yelp ${countryCode}] Loading page ${p + 1}: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      try {
        await page.waitForSelector('main, [data-testid="serp-ia-card"], .businessName', { timeout: 8000 });
      } catch (e) {}

      const html = await page.content();
      if (/verify you are a human|captcha|access denied|blocked/i.test(html)) {
        deps.logger(`[Yelp ${countryCode}] Bot check / captcha detected — stopping politely.`);
        break;
      }

      // 1. Try JSON-LD schema parsing from page
      const jsonLdData = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const items = [];
        for (const s of scripts) {
          try {
            const parsed = JSON.parse(s.innerText);
            if (parsed['@type'] === 'ItemList' && Array.isArray(parsed.itemListElement)) {
              parsed.itemListElement.forEach(el => {
                if (el.item) items.push(el.item);
              });
            } else if (parsed['@type'] === 'LocalBusiness' || parsed['@type'] === 'Restaurant') {
              items.push(parsed);
            }
          } catch (e) {}
        }
        return items;
      });

      if (jsonLdData && jsonLdData.length > 0) {
        deps.logger(`[Yelp ${countryCode}] Found ${jsonLdData.length} listings in JSON-LD metadata on page ${p + 1}.`);
        for (const item of jsonLdData) {
          const addressObj = item.address || {};
          const address = [addressObj.streetAddress, addressObj.addressLocality, addressObj.addressRegion, addressObj.postalCode].filter(Boolean).join(', ');
          if (!results.some(r => r.name.toLowerCase() === (item.name || '').toLowerCase())) {
            results.push({
              name: item.name || '',
              phone: item.telephone || '',
              address: address || location,
              city: addressObj.addressLocality || location,
              state: addressObj.addressRegion || '',
              rating: item.aggregateRating?.ratingValue || null,
              reviewCount: item.aggregateRating?.reviewCount || null,
              website: item.url || '',
              profileUrl: item.url || '',
              image: item.image || '',
              priceRange: item.priceRange || '',
              category: item.servesCuisine || category
            });
          }
        }
      }

      // 2. DOM Parsing for visible SERP cards
      const domItems = await page.evaluate((baseDomain) => {
        const rows = [];
        const cards = document.querySelectorAll('[data-testid="serp-ia-card"], div.businessName, div[class*="container__"]');
        
        cards.forEach(card => {
          const titleAnchor = card.querySelector('a[href*="/biz/"]');
          if (!titleAnchor) return;
          const name = (titleAnchor.innerText || '').trim();
          if (!name || name.length < 2) return;

          const href = titleAnchor.getAttribute('href') || '';
          const profileUrl = href.startsWith('http') ? href : `${baseDomain}${href}`;

          // Rating
          const ratingEl = card.querySelector('[aria-label*="star rating"], [class*="rating"]');
          const ratingMatch = ratingEl ? (ratingEl.getAttribute('aria-label') || ratingEl.innerText).match(/([\d.]+)/) : null;
          const rating = ratingMatch ? Number(ratingMatch[1]) : null;

          // Review Count
          const revEl = card.querySelector('[class*="reviewCount"], span:has-text("reviews")');
          const revMatch = revEl ? revEl.innerText.replace(/,/g, '').match(/(\d+)/) : null;
          const reviewCount = revMatch ? Number(revMatch[1]) : null;

          // Snippet / tags / phone hints
          const textContent = card.innerText || '';
          const phoneMatch = textContent.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
          const phone = phoneMatch ? phoneMatch[0] : '';

          // Neighborhood or address
          const addrEl = card.querySelector('[class*="secondaryAttributes"], [class*="neighborhood"]');
          const address = addrEl ? addrEl.innerText.trim() : '';

          rows.push({
            name,
            phone,
            address,
            profileUrl,
            rating,
            reviewCount
          });
        });
        return rows;
      }, domain);

      for (const d of domItems) {
        if (!results.some(r => r.name.toLowerCase() === d.name.toLowerCase())) {
          results.push(d);
        }
      }

      if (domItems.length === 0 && (!jsonLdData || jsonLdData.length === 0)) {
        break; // No more listings on subsequent pages
      }
    }

  } catch (err) {
    deps.logger(`[Yelp ${countryCode}] Error during execution: ${err.message}`);
  } finally {
    try { await context.close(); } catch (e) {}
  }

  deps.logger(`[Yelp ${countryCode}] Collected ${results.length} raw results.`);

  let created = 0;
  let updated = 0;
  let phoneCount = 0;

  for (const item of results) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;

    const parsedPhones = extractPhones(item.phone || '', {
      defaultCountry: countryCode,
      allowInternational: true,
      trusted: true,
      context: 'phone yelp'
    });

    const vendor = dv.buildDirectoryVendor({
      prefix: 'yelp',
      sessionId,
      source: `Yelp ${countryCode}`,
      sourceEngine: 'yelp',
      name: item.name,
      category,
      city: item.city || location,
      district: item.district || '',
      state: item.state || '',
      address: item.address || `${item.name}, ${location}`,
      country: countryCode,
      website: item.website || '',
      profileUrl: item.profileUrl || '',
      phones: parsedPhones,
      rating: item.rating || null,
      reviewCount: item.reviewCount || null,
      priceRange: item.priceRange || '',
      tags: ['directory', 'yelp', countryCode.toLowerCase()]
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

  deps.logger(`[Yelp ${countryCode}] Finished: ${created} new leads, ${updated} updated, ${phoneCount} with phones.`);
  return {
    totalScraped: results.length,
    newInserted: created,
    updated,
    phoneCount
  };
}

module.exports = {
  scrapeYelp,
  setDeps
};
