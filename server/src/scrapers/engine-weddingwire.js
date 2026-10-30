/**
 * WeddingWire engine.
 *
 * Live source structure (verified 2026):
 *  - List:  https://www.weddingwire.in/wedding-venues/<city>
 *  - Tile:  li.vendorTile with data-vendor-info JSON (price, locality, city,
 *           region, postal code, sector), title anchor, gallery, capacity.
 *  - Detail: JSON-LD LocalBusiness (address, geo, price range, images),
 *           #description (About / Facilities and Capacity / amenities list),
 *           and #faqs (catering, event spaces, payments, advance %).
 *
 * WeddingWire requires a browser session (403 on plain HTTP) and gates phone
 * numbers behind login, so phone stays empty for deep enrichment to resolve.
 */

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

const MAX_DETAIL_PAGES = 10;
const DETAIL_WORKERS = 2;
const LIST_ATTEMPTS = 3;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function citySlug(location) {
  return dv.slug(String(location || '').split(',')[0]) || 'india';
}

function listingUrl(location) {
  return `https://www.weddingwire.in/wedding-venues/${citySlug(location)}`;
}

async function extractTiles(page) {
  return page.evaluate(() => {
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
    return [...document.querySelectorAll('li.vendorTile')].map(tile => {
      const titleAnchor = tile.querySelector('a.vendorTile__title');
      let name = clean(tile.getAttribute('data-ec-name') || (titleAnchor ? titleAnchor.innerText : ''));
      if (/\d+°\d+['′"]\d+.*[NSEW]|-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/i.test(name)) {
        name = '';
      }
      if (!name && titleAnchor && titleAnchor.getAttribute('href')) {
        const seg = titleAnchor.getAttribute('href').split('/').filter(Boolean).pop() || '';
        name = seg.replace(/\.[a-z0-9]+$/i, '').replace(/-in-.*$/i, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
      }
      if (!name || /\d+°\d+['′"]\d+.*[NSEW]|-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/i.test(name)) return null;

      let info = {};
      try { info = JSON.parse(tile.getAttribute('data-vendor-info') || '{}'); } catch (e) {}

      const locality = clean(tile.querySelector('.vendorTile__location') ? tile.querySelector('.vendorTile__location').innerText : '');
      const price = clean(tile.querySelector('.vendorTileFooter__price') ? tile.querySelector('.vendorTileFooter__price').innerText : '');
      const capacity = clean(tile.querySelector('.vendorTileFooter__capacity') ? tile.querySelector('.vendorTileFooter__capacity').innerText : '');

      const images = [...tile.querySelectorAll('img[src*="weddingwire.in/vendor"]')]
        .map(img => img.getAttribute('src') || '')
        .filter(Boolean);

      let description = clean(tile.innerText);
      description = description
        .replace(name, '')
        .replace(locality, '')
        .replace(price, '')
        .replace(capacity, '')
        .replace(/Guests/gi, '')
        .replace(/Request pricing/gi, '')
        .replace(/View \d+ more photos?/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        name,
        profileHref: titleAnchor ? (titleAnchor.getAttribute('href') || '') : '',
        locality,
        price,
        capacity,
        description: description.slice(0, 700),
        info,
        images: [...new Set(images)].slice(0, 12)
      };
    }).filter(Boolean);
  }).catch(() => []);
}

/**
 * Parse a WeddingWire storefront page inside the browser context so JSON-LD
 * and section DOM are both available.
 */
async function extractDetail(page) {
  return page.evaluate(() => {
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
    const ldBlocks = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent || '');

    // WeddingWire puts the id on the heading (h2#description), not the wrapper
    // section. Resolve the enclosing section so the body copy and list items
    // are actually included.
    const sectionFor = id => {
      const node = document.getElementById(id);
      if (!node) return null;
      return node.closest('section') || node.parentElement || node;
    };

    const descriptionSection = sectionFor('description');
    const faqSection = sectionFor('faqs');
    const reviewSection = sectionFor('reviews');

    const amenities = descriptionSection
      ? [...descriptionSection.querySelectorAll('li')].map(li => clean(li.innerText)).filter(Boolean)
      : [];

    const faqPairs = [];
    if (faqSection) {
      const questions = [...faqSection.querySelectorAll('.storefrontFaqs__itemTitle')];
      for (const question of questions) {
        const item = question.closest('.storefrontFaqs__item') || question.parentElement;
        const block = item ? item.querySelector('.storefrontFaqs__itemBlock') : null;
        const answer = block ? clean(block.innerText) : '';
        const answerItems = item
          ? [...item.querySelectorAll('.storefrontFaqs__itemList')].map(li => clean(li.innerText)).filter(Boolean)
          : [];
        if (question.innerText) {
          faqPairs.push({
            question: clean(question.innerText),
            answer,
            answerItems: [...new Set(answerItems)].slice(0, 30)
          });
        }
      }
    }

    const tel = [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href') || '');

    return {
      title: document.title,
      url: location.href,
      ldBlocks,
      amenities: [...new Set(amenities)].slice(0, 60),
      faqPairs: faqPairs.slice(0, 20),
      tel,
      descriptionText: descriptionSection ? clean(descriptionSection.innerText).replace(/^About\s+/i, '').slice(0, 4000) : '',
      faqText: faqSection ? clean(faqSection.innerText).slice(0, 4000) : '',
      reviewText: reviewSection ? clean(reviewSection.innerText).slice(0, 2000) : '',
      bodyText: clean(document.body.innerText).slice(0, 6000)
    };
  }).catch(() => null);
}

function parseLd(blocks) {
  const out = {};
  for (const raw of blocks) {
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { continue; }
    const nodes = Array.isArray(parsed) ? parsed : (parsed && parsed['@graph'] ? parsed['@graph'] : [parsed]);
    for (const node of Array.isArray(nodes) ? nodes : []) {
      if (!node || typeof node !== 'object') continue;
      if (/LocalBusiness|EventVenue|Place|Hotel/.test(String(node['@type'] || ''))) out.venue = node;
      if (node['@type'] === 'FAQPage' && Array.isArray(node.mainEntity)) out.faq = node.mainEntity;
    }
  }
  return out;
}

function buildFromDetail(raw, card) {
  const ld = parseLd(raw.ldBlocks || []);
  const venue = ld.venue || {};
  const address = venue.address || {};
  const geo = venue.geo || {};

  const addressText = dv.joinAddressParts([
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

  const capMatch = raw.descriptionText.match(/capacity\s+(?:to\s+accommodate\s+)?(?:from\s+)?(\d[\d,]*)\s*(?:to|-|–)\s*(\d[\d,]*)/i);
  let capacity = '';
  if (capMatch) {
    const low = capMatch[1].replace(/,/g, '');
    const high = capMatch[2].replace(/,/g, '');
    capacity = low === high ? `${low} guests` : `${low}–${high} guests`;
  } else if (venue.maximumAttendeeCapacity) {
    capacity = `${venue.maximumAttendeeCapacity} guests`;
  }

  const payments = [];
  const services = [];
  const otherInfo = {};
  const faqAmenities = [];
  const uniquePush = (list, value, max = 60) => {
    const cleaned = dv.cleanText(value, max);
    if (cleaned && !list.includes(cleaned)) list.push(cleaned);
  };

  for (const faq of raw.faqPairs || []) {
    const q = faq.question.toLowerCase();
    const a = faq.answer;
    const items = (faq.answerItems || []).filter(Boolean);
    if (!a && !items.length) continue;

    if (/rental only pricing/.test(q)) {
      otherInfo['Rental price per day'] = a || items.join(', ');
    } else if (/price of non-veg menu|non-veg menu/.test(q)) {
      otherInfo['Non-veg menu price'] = a;
    } else if (/forms? of payment|payment.*accept/.test(q)) {
      const values = items.length ? items : a.split(/[,/]| and /i);
      values.forEach(v => uniquePush(payments, v, 40));
    } else if (/advance payment/.test(q)) {
      uniquePush(payments, `Advance: ${a}${/%$/.test(a) ? '' : '%'}`, 80);
    } else if (/what all menus|menus? & catering|menus? and catering|catering options/.test(q)) {
      const values = items.length ? items : a.split(/\s{2,}|[;]/);
      values.forEach(v => uniquePush(services, `Cuisine: ${v}`, 80));
    } else if (/amenities/.test(q)) {
      const values = items.length ? items : a.split(/[,;]/);
      values.forEach(v => uniquePush(faqAmenities, v, 80));
    } else if (/describe your event spaces/.test(q)) {
      const values = items.length ? items : a.split(/[,;]/);
      values.forEach(v => uniquePush(services, `Event space: ${v}`, 80));
    } else if (/vendors can you provide in-house/.test(q)) {
      items.forEach(v => uniquePush(services, `In-house: ${v}`, 80));
    } else if (/external vendors/.test(q)) {
      otherInfo['External vendors allowed'] = items.length ? items.join(', ') : a;
    } else if (/guest rooms/.test(q)) {
      otherInfo['Guest room capacity'] = items.join(', ') || a;
    } else if (/cancellation policy/.test(q)) {
      otherInfo['Cancellation policy'] = a;
    } else if (/price range of veg menu/.test(q)) {
      otherInfo['Veg menu price'] = a;
    } else if (/alcohol/.test(q)) {
      otherInfo['Alcohol permitted'] = a;
    } else if (/in-house|in house/.test(q) && a) {
      otherInfo['In-house vendors'] = a;
    } else if (/covid/.test(q) && a) {
      otherInfo['COVID-19 compliance'] = a;
    }
  }

  const cuisineLike = /north indian|mughlai|south indian|chinese|thai|continental|italian|seafood|street food|drinks|dessert|cuisine/i;
  const amenities = [...new Set([
    ...faqAmenities,
    ...(raw.amenities || []).filter(item => !cuisineLike.test(item))
  ])];

  const reviewMatch = raw.reviewText.match(/([0-5](?:\.\d)?)\s*(?:out of 5|\/\s*5)/i);
  const reviewCountMatch = raw.reviewText.match(/([\d,]+)\s+Reviews?/i);

  return {
    description: raw.descriptionText,
    address: addressText || card.locality,
    locality: dv.cleanText(address.addressLocality, 160) || card.locality,
    state: dv.cleanText(address.addressRegion, 120),
    pincode: dv.cleanText(address.postalCode, 10) || dv.extractPincode(addressText),
    latitude: Number.isFinite(Number(geo.latitude)) ? Number(geo.latitude) : null,
    longitude: Number.isFinite(Number(geo.longitude)) ? Number(geo.longitude) : null,
    rating: reviewCountMatch || reviewMatch ? dv.parseRating(reviewMatch ? reviewMatch[1] : '') : '',
    reviewCount: reviewCountMatch ? dv.parseReviewCount(reviewCountMatch[1]) : '',
    priceRange: dv.parsePrice(venue.priceRange || card.price, ''),
    capacity: capacity || dv.parseCapacity(card.capacity),
    amenities,
    payments,
    services,
    otherInfo,
    images: dv.uniqueStrings([...images, ...(card.images || [])], 30),
    faqs: (raw.faqPairs || []).slice(0, 14)
  };
}

async function scrapeWeddingWire(category, location, sessionId = 'legacy') {
  // WeddingWire's listing URL is the venue directory only.
  if (!fidelity.isVenueCategory(category)) {
    deps.logger(`[WeddingWire] Skipped: "${category}" is not a venue category.`);
    return { totalScraped: 0, newInserted: 0, updated: 0, skipped: 'not-a-venue-category' };
  }
  const url = listingUrl(location);
  const parsedLocation = dv.parseCityState(location);
  const city = parsedLocation.city || dv.cleanText(String(location || '').split(',')[0], 120);

  deps.logger(`[WeddingWire] Starting live scrape: ${url}`);

  const browser = await getBrowser();
  if (!browser) {
    deps.logger('[WeddingWire] Browser could not be launched.');
    return { totalScraped: 0, newInserted: 0, updated: 0 };
  }

  let context = null;
  let cards = [];

  try {
    context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1366, height: 950 },
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' }
    });
    const page = await context.newPage();

    for (let attempt = 1; attempt <= LIST_ATTEMPTS && !deps.abortSignal.aborted; attempt++) {
      try {
        deps.logger(`[WeddingWire] List attempt ${attempt}/${LIST_ATTEMPTS}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForSelector('li.vendorTile', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1800);

        for (let scroll = 0; scroll < 6; scroll++) {
          const count = await page.evaluate(() => document.querySelectorAll('li.vendorTile').length);
          if (count >= 36) break;
          await page.evaluate(() => window.scrollBy(0, 1300)).catch(() => {});
          await page.waitForTimeout(1200);
        }

        cards = await extractTiles(page);
        deps.logger(`[WeddingWire] Attempt ${attempt}: ${cards.length} live venue tiles`);
        if (cards.length) break;
      } catch (error) {
        deps.logger(`[WeddingWire] List attempt ${attempt} failed: ${error.message}`);
      }
    }

    if (!cards.length) {
      deps.logger('[WeddingWire] No live tiles returned. Leaving the database untouched.');
      return { totalScraped: 0, newInserted: 0, updated: 0 };
    }

    // Detail pages: same browser session, small worker pool.
    const details = new Map();
    const queue = cards.slice(0, MAX_DETAIL_PAGES);
    let cursor = 0;

    const worker = async () => {
      const detailPage = await context.newPage();
      try {
        while (cursor < queue.length && !deps.abortSignal.aborted) {
          const card = queue[cursor++];
          const profileUrl = dv.ensureAbsolute(card.profileHref, 'https://www.weddingwire.in');
          if (!profileUrl) continue;
          try {
            await detailPage.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
            await detailPage.waitForSelector('h2#description', { timeout: 12000 }).catch(() => {});
            await detailPage.waitForTimeout(1200);
            const raw = await extractDetail(detailPage);
            if (raw && raw.descriptionText) details.set(profileUrl, raw);
          } catch (error) {
            deps.logger(`[WeddingWire] Detail failed for ${card.name}: ${error.message}`);
          }
        }
      } finally {
        try { await detailPage.close(); } catch (e) {}
      }
    };

    await Promise.allSettled(Array.from({ length: Math.min(DETAIL_WORKERS, queue.length) }, worker));

    let created = 0;
    let updated = 0;

    for (const card of cards) {
      if (deps.abortSignal.aborted) break;
      const profileUrl = dv.ensureAbsolute(card.profileHref, 'https://www.weddingwire.in');
      const raw = details.get(profileUrl) || null;
      const detail = raw ? buildFromDetail(raw, card) : null;
      const info = card.info || {};
      const locality = detail && detail.locality ? detail.locality : (card.locality || info.city || city);
      const address = detail && detail.address
        ? detail.address
        : dv.joinAddressParts([card.locality, info.region, info.address?.postal_code]);

      const vendor = dv.buildDirectoryVendor({
        prefix: 'ww',
        sessionId,
        source: 'WeddingWire',
        sourceEngine: 'weddingwire',
        name: card.name,
        category: category || 'Wedding Venue',
        subcategory: info.sector || '',
        description: detail ? detail.description : card.description,
        address,
        locality,
        city: info.address?.city || city,
        district: parsedLocation.district,
        state: (detail && detail.state) || info.address?.region || parsedLocation.state,
        pincode: (detail && detail.pincode) || info.address?.postal_code || '',
        latitude: detail ? detail.latitude : null,
        longitude: detail ? detail.longitude : null,
        rating: detail ? detail.rating : '',
        reviewCount: detail ? detail.reviewCount : '',
        priceRange: (detail && detail.priceRange) || dv.parsePrice(card.price, ''),
        capacity: (detail && detail.capacity) || dv.parseCapacity(card.capacity),
        amenities: detail ? detail.amenities : [],
        services: detail ? detail.services : [],
        payments: detail ? detail.payments : [],
        images: (detail && detail.images.length ? detail.images : card.images),
        logo: (detail && detail.images[0]) || card.images[0] || '',
        profileUrl,
        mapsUrl: detail && detail.latitude && detail.longitude
          ? `https://www.google.com/maps/search/?api=1&query=${detail.latitude},${detail.longitude}`
          : '',
        otherInfo: detail ? { ...detail.otherInfo, faqs: detail.faqs } : {},
        tags: info.productTier ? [info.productTier] : [],
        sourceProvenance: [{
          field: 'listing',
          source: 'WeddingWire',
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

    deps.logger(`[WeddingWire] Complete. ${cards.length} live venues, ${created} new, ${updated} refreshed, ${details.size} detailed.`);
    return { totalScraped: cards.length, newInserted: created, updated, detailed: details.size };
  } catch (error) {
    deps.logger(`[WeddingWire] Fatal error: ${error.message}`);
    return { totalScraped: 0, newInserted: 0, updated: 0 };
  } finally {
    try { if (context) await context.close(); } catch (e) {}
  }
}

module.exports = { scrapeWeddingWire, setDeps };
