/**
 * WeddingBazaar engine.
 *
 * Live source structure (verified 2026):
 *  - List:   https://www.weddingbazaar.com/wedding-venues-in-<city>
 *  - Card:   .MuiCard-root with an h3 (VendorListingCard_VendorName__*),
 *            locality, rating, price, parking and hall capacity.
 *  - Detail: server-rendered JSON-LD EventVenue (description, address, images,
 *            amenities, capacity) plus Venue Amenities / Payment Policies /
 *            Other Information / Services sections.
 *
 * Contact numbers are login-gated on WeddingBazaar. The engine leaves phone
 * empty and lets the deep-enrichment pipeline resolve it from Maps/website.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { getBrowser } = require('./browserFactory');
const dv = require('./directoryVendor');
const fidelity = require('../services/categoryFidelity');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

const MAX_DETAIL_PAGES = 14;
const DETAIL_CONCURRENCY = 5;

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-IN,en;q=0.9',
  'Cache-Control': 'no-cache'
};

function citySlug(location) {
  return dv.slug(String(location || '').split(',')[0]) || 'india';
}

function listingUrl(location) {
  return `https://www.weddingbazaar.com/wedding-venues-in-${citySlug(location)}`;
}

function collectLeafTexts($, container) {
  const items = [];
  container.find('*').each((i, el) => {
    if ($(el).children().length) return;
    const value = dv.cleanText($(el).text(), 240);
    if (value && !/^(services offered|venue amenities|payment policies|other information)$/i.test(value)) items.push(value);
  });
  return dv.uniqueStrings(items, 80);
}

function findSection($, label) {
  const heading = $('h2,h3').filter((i, el) => dv.cleanText($(el).text(), 80).toLowerCase() === label.toLowerCase()).first();
  return heading.length ? heading.parent() : null;
}

function parseKeyValues($, container) {
  const out = {};
  if (!container) return out;
  const leaves = [];
  container.find('*').each((i, el) => {
    if ($(el).children().length) return;
    const value = dv.cleanText($(el).text(), 300);
    if (value) leaves.push(value);
  });
  for (const leaf of leaves) {
    const idx = leaf.indexOf(' - ');
    if (idx > 0 && idx < 70) {
      out[dv.cleanText(leaf.slice(0, idx), 80)] = dv.cleanText(leaf.slice(idx + 3), 220);
    }
  }
  return out;
}

function parseWeddingBazaarDetail(html, sourceUrl) {
  const $ = cheerio.load(html);

  let venue = null;
  $('script[type="application/ld+json"]').each((i, el) => {
    let parsed;
    try { parsed = JSON.parse($(el).html() || ''); } catch (e) { return; }
    const nodes = parsed && parsed['@graph'] ? parsed['@graph'] : [parsed];
    for (const node of Array.isArray(nodes) ? nodes : []) {
      if (node && /EventVenue|LocalBusiness|Place/.test(String(node['@type'] || ''))) venue = node;
    }
  });
  venue = venue || {};

  const amenitiesSection = findSection($, 'Venue Amenities');
  const paymentsSection = findSection($, 'Payment Policies');
  const otherSection = findSection($, 'Other Information');
  const servicesSection = findSection($, 'Services offered');

  const amenities = amenitiesSection ? collectLeafTexts($, amenitiesSection) : [];
  if (Array.isArray(venue.amenityFeature)) {
    for (const feature of venue.amenityFeature) {
      if (feature && feature.name && feature.value !== false) amenities.push(dv.cleanText(feature.name, 80));
    }
  }

  const payments = [];
  if (paymentsSection) {
    for (const leaf of collectLeafTexts($, paymentsSection)) {
      for (const part of leaf.split(/(?<!\d)(?=(?:\d{1,3}%|cancellation policy))/i)) {
        const value = dv.cleanText(part, 200);
        if (value) payments.push(value);
      }
    }
  }

  const otherInfo = parseKeyValues($, otherSection);
  const serviceLeaves = servicesSection ? collectLeafTexts($, servicesSection) : [];
  const services = [];
  for (let i = 0; i < serviceLeaves.length; i++) {
    const current = serviceLeaves[i];
    const next = serviceLeaves[i + 1] || '';
    const isPrice = value => /^(?:₹|rs\.?|inr)/i.test(value);
    if (isPrice(next) && !isPrice(current)) {
      services.push(`${current}: ${next}`);
      i++;
    } else {
      services.push(current);
    }
  }

  const address = venue.address || {};
  const fullAddress = dv.joinAddressParts([
    address.streetAddress,
    address.addressLocality,
    address.addressRegion,
    address.postalCode
  ]);

  const images = [];
  for (const image of Array.isArray(venue.image) ? venue.image : [venue.image]) {
    if (!image) continue;
    if (typeof image === 'string') images.push(image);
    else if (image.url) images.push(image.url);
  }
  $('img[src*="img.weddingbazaar.com"]').each((i, el) => {
    const src = $(el).attr('src') || '';
    if (src) images.push(src);
  });

  const capacity = venue.maximumAttendeeCapacity
    ? `${venue.maximumAttendeeCapacity} guests`
    : '';

  const price = venue.offers && venue.offers.price
    ? dv.parsePrice(`₹${venue.offers.price}`, '')
    : '';

  return {
    description: dv.cleanMultiline(venue.description, 2600),
    address: fullAddress,
    locality: dv.cleanText(address.addressLocality, 160),
    state: dv.cleanText(address.addressRegion, 120),
    pincode: dv.cleanText(address.postalCode, 10) || dv.extractPincode(fullAddress),
    capacity,
    priceRange: price,
    amenities,
    payments,
    services,
    otherInfo,
    images: dv.uniqueStrings(images, 30),
    sourceUrl
  };
}

async function extractListCards(page) {
  return page.evaluate(() => {
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
    return [...document.querySelectorAll('.MuiCard-root')]
      .filter(card => card.querySelector('h3'))
      .map(card => {
        const nameEl = card.querySelector('h3');
        const name = clean(nameEl ? nameEl.innerText : '');
        if (!name) return null;

        let anchor = null;
        let node = card;
        for (let depth = 0; depth < 4 && node; depth++) {
          if (node.tagName === 'A' && node.getAttribute('href')) { anchor = node; break; }
          const candidate = node.querySelector && node.querySelector('a[href*="/wedding-venues/"]');
          if (candidate) { anchor = candidate; break; }
          node = node.parentElement;
        }

        const images = [...card.querySelectorAll('img[src*="img.weddingbazaar.com"]')]
          .map(img => img.getAttribute('src') || '')
          .filter(Boolean);

        return {
          name,
          profileHref: anchor ? (anchor.getAttribute('href') || '') : '',
          text: clean(card.innerText).slice(0, 900),
          images: [...new Set(images)].slice(0, 10)
        };
      }).filter(Boolean);
  }).catch(() => []);
}

function parseCardText(text, name) {
  const rest = dv.cleanText(String(text || '').replace(name, '').replace(/^\d+\+\s*Shortlist/i, ''), 500);
  const reviewMatch = rest.match(/([\d,]+)\s+Reviews?\b/i);
  const noReviews = /No reviews yet/i.test(rest);
  const ratingMatch = rest.match(/\b([0-5](?:\.\d)?)\b\s*(?=[\d,]+\s+Reviews?|No reviews yet)/i);

  let locality = '';
  const beforeRating = rest.split(/\b[0-5](?:\.\d)?\b\s*(?:[\d,]+\s+Reviews?|No reviews yet)/i)[0];
  if (beforeRating) locality = dv.cleanText(beforeRating, 160);
  if (!locality) {
    const fallback = rest.match(/^([A-Za-z0-9 .,'&()\/-]{3,90}?)(?:\s+[0-5](?:\.\d)|\s+No reviews)/i);
    if (fallback) locality = dv.cleanText(fallback[1], 160);
  }

  const price = rest.match(/(₹\s*[\d,]+(?:\s*[-–]\s*[\d,]+)?)\s*(Per\s+Plate|Per\s+Day)?/i);
  const parking = rest.match(/(\d+)\s*Car parking/i);
  const capacity = rest.match(/([\d,]+)\s*Hall capacity/i);

  const reviewCount = reviewMatch ? dv.parseReviewCount(reviewMatch[1]) : (noReviews ? 0 : '');
  // WeddingBazaar renders a default "4.5" placeholder next to "No reviews yet".
  // That is not a real reputation signal, so it must stay unknown.
  const hasReviews = Boolean(reviewMatch) && Number(reviewCount) > 0;

  return {
    locality,
    rating: hasReviews ? dv.parseRating(ratingMatch ? ratingMatch[1] : '') : '',
    reviewCount,
    priceRange: price ? dv.parsePrice(price[1], price[2] ? price[2].replace(/\s+/g, ' ').toLowerCase() : '') : '',
    parking: parking ? `${parking[1]} car parking` : '',
    capacity: capacity ? `${capacity[1].replace(/,/g, '')} guests` : ''
  };
}

async function fetchDetail(url) {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: { ...HTTP_HEADERS, Referer: 'https://www.weddingbazaar.com/' }
  });
  return parseWeddingBazaarDetail(response.data, url);
}

async function scrapeWeddingBazaar(category, location, sessionId = 'legacy') {
  // WeddingBazaar's public listing URL is the *venue* directory. Running it for
  // photographers/caterers returns banquet halls, so only venue searches use it.
  if (!fidelity.isVenueCategory(category)) {
    deps.logger(`[WeddingBazaar] Skipped: "${category}" is not a venue category.`);
    return { totalScraped: 0, newInserted: 0, updated: 0, skipped: 'not-a-venue-category' };
  }
  const url = listingUrl(location);
  const cityPart = citySlug(location);
  const parsedLocation = dv.parseCityState(location);
  const city = parsedLocation.city || dv.cleanText(String(location || '').split(',')[0], 120);

  deps.logger(`[WeddingBazaar] Starting live scrape: ${url}`);

  const browser = await getBrowser();
  if (!browser) {
    deps.logger('[WeddingBazaar] Browser could not be launched.');
    return { totalScraped: 0, newInserted: 0, updated: 0 };
  }

  // WeddingBazaar randomly serves a stripped 130 KB shell (~50% of requests).
  // A warmed session makes it *more* likely, so each attempt gets a brand-new
  // isolated context and an alternate canonical URL.
  const ATTEMPTS = [
    { url: `https://www.weddingbazaar.com/wedding-venues-in-${cityPart}`, referer: '' },
    { url: `https://www.weddingbazaar.com/wedding-venues/${cityPart}`, referer: '' },
    { url: `https://www.weddingbazaar.com/wedding-venues-in-${cityPart}`, referer: 'https://www.google.com/' },
    { url: `https://www.weddingbazaar.com/wedding-venues-in-${cityPart}?ref=google`, referer: 'https://www.google.com/' },
    { url: `https://www.weddingbazaar.com/wedding-venues/${cityPart}?ref=google`, referer: '' }
  ];

  let cards = [];

  for (let attempt = 0; attempt < ATTEMPTS.length && !deps.abortSignal.aborted; attempt++) {
    const target = ATTEMPTS[attempt];
    let context = null;
    try {
      deps.logger(`[WeddingBazaar] List attempt ${attempt + 1}/${ATTEMPTS.length}: ${target.url}`);
      context = await browser.newContext({
        userAgent: HTTP_HEADERS['User-Agent'],
        viewport: { width: 1366, height: 950 },
        locale: 'en-IN',
        timezoneId: 'Asia/Kolkata',
        extraHTTPHeaders: {
          'Accept-Language': 'en-IN,en;q=0.9',
          ...(target.referer ? { Referer: target.referer } : {})
        }
      });
      const page = await context.newPage();
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForSelector('.MuiCard-root h3', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2200);

      const diag = await page.evaluate(() => ({
        title: document.title,
        url: location.href,
        cards: document.querySelectorAll('.MuiCard-root').length,
        h3: document.querySelectorAll('.MuiCard-root h3').length,
        bodyLen: document.body.innerText.length,
        heading: document.querySelector('h1') ? document.querySelector('h1').innerText.slice(0, 80) : '',
        sample: document.body.innerText.replace(/\s+/g, ' ').slice(0, 160)
      })).catch(() => null);
      if (diag) deps.logger(`[WeddingBazaar] Page state: ${JSON.stringify(diag)}`);

      let stable = 0;
      let previous = 0;
      for (let scroll = 0; scroll < 8 && !deps.abortSignal.aborted; scroll++) {
        const count = await page.evaluate(() => [...document.querySelectorAll('.MuiCard-root')].filter(c => c.querySelector('h3')).length);
        if (count >= 36) break;
        if (count === previous) stable++; else stable = 0;
        previous = count;
        await page.evaluate(() => window.scrollBy(0, 1200)).catch(() => {});
        await page.waitForTimeout(1100);
        if (stable >= 2) break;
      }

      cards = await extractListCards(page);
      deps.logger(`[WeddingBazaar] Attempt ${attempt + 1}: ${cards.length} live cards`);
      if (cards.length) break;
    } catch (error) {
      deps.logger(`[WeddingBazaar] List attempt ${attempt + 1} failed: ${error.message}`);
    } finally {
      try { if (context) await context.close(); } catch (e) {}
    }
  }

  if (!cards.length) {
    deps.logger('[WeddingBazaar] No live cards returned. Leaving the database untouched.');
    return { totalScraped: 0, newInserted: 0, updated: 0 };
  }

  // Detail pages are server-rendered and reachable without the browser session.
  const details = new Map();
  let cursor = 0;
  const queue = cards.slice(0, MAX_DETAIL_PAGES);
  const workers = Array.from({ length: Math.min(DETAIL_CONCURRENCY, Math.max(1, queue.length)) }, async () => {
    while (cursor < queue.length && !deps.abortSignal.aborted) {
      const card = queue[cursor++];
      const profileUrl = dv.ensureAbsolute(card.profileHref, 'https://www.weddingbazaar.com');
      if (!profileUrl) continue;
      try {
        details.set(profileUrl, await fetchDetail(profileUrl));
      } catch (error) {
        deps.logger(`[WeddingBazaar] Detail failed for ${card.name}: ${error.message}`);
      }
    }
  });
  await Promise.allSettled(workers);

  let created = 0;
  let updated = 0;

  for (const card of cards) {
    if (deps.abortSignal.aborted) break;
    const profileUrl = dv.ensureAbsolute(card.profileHref, 'https://www.weddingbazaar.com');
    const detail = details.get(profileUrl) || null;
    const parsed = parseCardText(card.text, card.name);
    const locality = parsed.locality || (detail && detail.locality) || city;
    const address = detail && detail.address ? detail.address : locality;
    const amenities = [
      ...(detail ? detail.amenities : []),
      parsed.parking
    ].filter(Boolean);

    const vendor = dv.buildDirectoryVendor({
      prefix: 'wb',
      sessionId,
      source: 'WeddingBazaar',
      sourceEngine: 'weddingbazaar',
      name: card.name,
      category: category || 'Wedding Venue',
      subcategory: (detail && detail.otherInfo && detail.otherInfo['property type']) || '',
      description: detail ? detail.description : '',
      address,
      locality,
      city,
      district: parsedLocation.district,
      state: (detail && detail.state) || parsedLocation.state,
      pincode: (detail && detail.pincode) || dv.extractPincode(address),
      rating: parsed.rating,
      reviewCount: parsed.reviewCount,
      priceRange: parsed.priceRange || (detail && detail.priceRange) || '',
      capacity: parsed.capacity || (detail && detail.capacity) || '',
      amenities,
      services: detail ? detail.services : [],
      payments: detail ? detail.payments : [],
      images: detail && detail.images.length ? detail.images : card.images,
      logo: (detail && detail.images[0]) || card.images[0] || '',
      profileUrl,
      mapsUrl: '',
      otherInfo: detail ? detail.otherInfo : {},
      sourceProvenance: [{
        field: 'listing',
        source: 'WeddingBazaar',
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      }]
    });

    if (!vendor.name) continue;
    if (!fidelity.isVendorRelevant(vendor, category)) continue;
    const result = dv.saveDirectoryVendor(vendor, sessionId);
    if (!result.vendor) continue;
    if (result.created) {
      created++;
      try { deps.emitVendorEvent(result.vendor, 'inserted'); } catch (e) {}
    } else {
      updated++;
      try { deps.emitVendorEvent(result.vendor, 'updated'); } catch (e) {}
    }
  }

  deps.logger(`[WeddingBazaar] Complete. ${cards.length} live venues, ${created} new, ${updated} refreshed, ${details.size} detailed.`);
  return { totalScraped: cards.length, newInserted: created, updated, detailed: details.size };
}

module.exports = { scrapeWeddingBazaar, setDeps };
