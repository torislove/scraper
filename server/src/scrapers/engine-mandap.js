/**
 * Mandap.com engine.
 *
 * Live source structure (verified 2026):
 *  - List:  https://www.mandap.com/<city>/<category-slug>?page=N  (12 cards/page)
 *  - Card:  <article> with h3 > a.venue-name, a Google Maps deep link that
 *           carries the full postal address, rating, price, photos.
 *  - Detail: server-rendered JSON-LD (LocalBusiness) plus "Other Information",
 *           "Payment Policies", "Event Areas" and FAQ sections.
 *
 * Mandap hides the venue phone behind an OTP wall. The only tel: link on the
 * page is Mandap's own helpline, so this engine never stores it. Phone numbers
 * are resolved later by the deep-enrichment pipeline (Maps / website).
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

const MAX_PAGES = 3;
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

function categorySlugs(category) {
  const value = dv.slug(category);
  const slugs = [];
  if (/banquet|hall/.test(value)) slugs.push('banquet-halls');
  if (/kalyana|mandap|marriage/.test(value)) slugs.push('kalyana-mandapams');
  if (/convention/.test(value)) slugs.push('convention-halls');
  if (/lawn|farm/.test(value)) slugs.push('lawns');
  if (/resort/.test(value)) slugs.push('resorts');
  if (/hotel/.test(value)) slugs.push('hotels');
  if (/venue|event/.test(value)) slugs.push('wedding-venues');
  // Never fall back to a generic venue listing for a non-venue search.
  // Mandap.com only knows venues; returning its venue directory for a
  // photographer query is exactly the wrong-category bug.
  if (slugs.length === 0) return [];
  return [...new Set(slugs.filter(Boolean))].slice(0, 3);
}

function nameFromProfileUrl(url) {
  try {
    const path = new URL(url, 'https://www.mandap.com').pathname;
    const slugPart = path.split('/').filter(Boolean).pop() || '';
    const cleaned = slugPart.replace(/-in-.*$/i, '').replace(/-/g, ' ').trim();
    if (!cleaned) return '';
    return cleaned.replace(/\b\w/g, c => c.toUpperCase());
  } catch (e) {
    return '';
  }
}

function parseMapsQuery(href) {
  if (!href) return '';
  try {
    const url = new URL(href, 'https://www.mandap.com');
    return dv.cleanText(url.searchParams.get('query') || url.searchParams.get('q') || '', 800);
  } catch (e) {
    return '';
  }
}

async function extractListCards(page) {
  return page.evaluate(() => {
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
    return [...document.querySelectorAll('article')].map(card => {
      const nameEl = card.querySelector('h3 a.venue-name, h3');
      let name = clean(nameEl ? nameEl.innerText : '');
      if (/\d+°\d+['′"]\d+.*[NSEW]|-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/i.test(name)) {
        name = '';
      }
      const nameAnchor = card.querySelector('h3 a.venue-name') || card.querySelector('a[href*="/in-"]');
      if (!name && nameAnchor && nameAnchor.getAttribute('href')) {
        const seg = nameAnchor.getAttribute('href').split('/').filter(Boolean).pop() || '';
        name = seg.replace(/\.[a-z0-9]+$/i, '').replace(/-in-.*$/i, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
      }
      if (!name || /\d+°\d+['′"]\d+.*[NSEW]|-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/i.test(name)) return null;
      const mapsAnchor = [...card.querySelectorAll('a[href*="google.com/maps"]')][0];
      const ratingEl = card.querySelector('img[src*="rating-star"]');
      const ratingText = ratingEl && ratingEl.parentElement ? clean(ratingEl.parentElement.innerText) : '';
      const priceEl = [...card.querySelectorAll('p')].find(p => /[₹]|Rs\.?|INR/i.test(p.innerText || ''));
      const price = priceEl ? clean(priceEl.innerText) : '';
      const unitEl = priceEl && priceEl.parentElement
        ? [...priceEl.parentElement.querySelectorAll('span')].find(s => /per\s+(plate|day|person|event)/i.test(s.innerText || ''))
        : null;
      const unit = unitEl ? clean(unitEl.innerText) : '';
      const images = [...card.querySelectorAll('img[src*="img.mandap.com/photos"]')]
        .map(img => img.getAttribute('src') || '')
        .filter(src => src && !/listingfallback|vendor_categories|static\/vendor/i.test(src));
      return {
        name,
        profileHref: nameAnchor ? (nameAnchor.getAttribute('href') || '') : '',
        mapsHref: mapsAnchor ? (mapsAnchor.getAttribute('href') || '') : '',
        locality: mapsAnchor ? clean(mapsAnchor.innerText) : '',
        rating: ratingText,
        price,
        unit,
        images: [...new Set(images)].slice(0, 12),
        text: clean(card.innerText).slice(0, 900)
      };
    }).filter(Boolean);
  }).catch(() => []);
}

function extractLd(blocks) {
  const out = { venue: null, faq: [] };
  for (const raw of blocks) {
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { continue; }
    const nodes = parsed && parsed['@graph'] ? parsed['@graph'] : [parsed];
    for (const node of Array.isArray(nodes) ? nodes : []) {
      if (!node || typeof node !== 'object') continue;
      if (node['@type'] === 'FAQPage' && Array.isArray(node.mainEntity)) {
        out.faq = node.mainEntity
          .filter(q => q && q.name && q.acceptedAnswer && q.acceptedAnswer.text)
          .map(q => ({ question: dv.cleanText(q.name, 300), answer: dv.cleanText(q.acceptedAnswer.text, 1200) }))
          .slice(0, 12);
      }
      if (String(node['@type'] || '').match(/LocalBusiness|Hotel|Resort|Place/)) {
        out.venue = node;
      } else if (String(node['@type'] || '').match(/EventVenue/) && !out.venue) {
        out.venue = node;
      }
    }
  }
  return out;
}

function splitKeyValue(text) {
  const value = dv.cleanText(text, 300);
  const idx = value.indexOf(' - ');
  if (idx < 0) return null;
  return {
    key: dv.cleanText(value.slice(0, idx), 80),
    value: dv.cleanText(value.slice(idx + 3), 220)
  };
}

function parseMandapDetail(html, sourceUrl) {
  const $ = cheerio.load(html);
  const ldBlocks = [];
  $('script[type="application/ld+json"]').each((i, el) => ldBlocks.push($(el).html() || ''));
  const ld = extractLd(ldBlocks);
  const venue = ld.venue || {};

  const otherInfo = {};
  const amenities = [];
  $('#other-info-section span').each((i, el) => {
    const pair = splitKeyValue($(el).text());
    if (!pair) return;
    otherInfo[pair.key] = pair.value;
    if (/property type|allowed cuisine|price type/i.test(pair.key)) {
      amenities.push(`${pair.key}: ${pair.value}`);
    }
  });

  const payments = [];
  $('#payment-section span').each((i, el) => {
    const value = dv.cleanText($(el).text(), 220);
    if (value && !/^payment policies$/i.test(value)) payments.push(value);
  });

  const description = dv.cleanMultiline(
    (venue.description || '').replace(/^"|"$/g, '') ||
    $('#about-heading').parent().find('p').first().text(),
    2600
  );

  const eventAreas = [];
  $('#event-areas-heading').parent().find('div.flex.h-24, div[class*="h-24"]').each((i, el) => {
    const name = dv.cleanText($(el).find('p[title], p').first().text(), 160);
    const seatMatch = dv.cleanText($(el).text(), 200).match(/(\d[\d,]*)\s*Seating/i);
    const floatMatch = dv.cleanText($(el).text(), 200).match(/(\d[\d,]*)\s*Floating/i);
    if (name) {
      eventAreas.push({
        name,
        seating: seatMatch ? Number(seatMatch[1].replace(/,/g, '')) : null,
        floating: floatMatch ? Number(floatMatch[1].replace(/,/g, '')) : null
      });
    }
  });

  const fullAddress = dv.cleanText(
    $('#venue-location-heading').parent().find('p').first().text() ||
    (venue.address && venue.address.streetAddress) || '',
    800
  );

  const images = [];
  const addImage = value => {
    if (!value) return;
    if (typeof value === 'string') images.push(value);
    else if (value.url) images.push(value.url);
  };
  if (Array.isArray(venue.image)) venue.image.forEach(addImage);
  else addImage(venue.image);
  $('img[src*="img.mandap.com/photos"]').each((i, el) => {
    const src = $(el).attr('src') || '';
    if (src && !/listingfallback|vendor_categories|static\/vendor/i.test(src)) images.push(src);
  });

  const additional = Array.isArray(venue.additionalProperty) ? venue.additionalProperty : [];
  const capacityValues = additional
    .filter(p => /capacity/i.test(p.name || ''))
    .map(p => `${p.value} (${dv.cleanText(p.name, 60)})`);
  if (eventAreas.length) {
    const maxSeat = Math.max(...eventAreas.map(a => a.seating || 0), 0);
    const maxFloat = Math.max(...eventAreas.map(a => a.floating || 0), 0);
    if (maxSeat || maxFloat) capacityValues.push(`${maxSeat || maxFloat} guests`);
  }

  const faqs = ld.faq.length ? ld.faq : [];
  for (const item of faqs) {
    if (/guests?.*accommodate/i.test(item.question) && !capacityValues.length) {
      const match = item.answer.match(/(\d[\d,]*)\s*guests?/i);
      if (match) capacityValues.push(`${match[1].replace(/,/g, '')} guests`);
    }
  }

  return {
    description,
    address: fullAddress,
    locality: dv.cleanText(venue.address && venue.address.addressLocality, 160),
    state: dv.cleanText(venue.address && venue.address.addressRegion, 120),
    pincode: dv.cleanText(venue.address && venue.address.postalCode, 10) || dv.extractPincode(fullAddress),
    priceRange: dv.parsePrice(venue.priceRange || '', ''),
    capacity: capacityValues.join(' · '),
    amenities: dv.uniqueStrings([
      ...amenities,
      ...additional.map(p => `${dv.cleanText(p.name, 80)}: ${dv.cleanText(p.value, 120)}`)
    ], 60),
    payments,
    services: eventAreas.map(a => `${a.name}${a.seating ? ` (${a.seating} seating)` : ''}${a.floating ? ` (${a.floating} floating)` : ''}`),
    images: dv.uniqueStrings(images, 30),
    faqs,
    otherInfo,
    sourceUrl
  };
}

async function fetchDetail(url) {
  const response = await axios.get(url, { timeout: 15000, headers: { ...HTTP_HEADERS, Referer: 'https://www.mandap.com/' } });
  return parseMandapDetail(response.data, url);
}

async function scrapeMandap(category, location, sessionId = 'legacy') {
  const city = dv.cleanText(String(location || '').split(',')[0], 120) || 'India';
  const parsedLocation = dv.parseCityState(location);
  const cityPart = citySlug(location);
  const slugs = categorySlugs(category);

  if (!slugs.length) {
    deps.logger(`[Mandap] Skipped: "${category}" is not a venue category. Mandap.com only lists venues.`);
    return { totalScraped: 0, newInserted: 0, updated: 0, skipped: 'not-a-venue-category' };
  }

  deps.logger(`[Mandap] Starting live scrape for "${category}" in "${location}" (${slugs.join(', ')})`);

  const browser = await getBrowser();
  if (!browser) {
    deps.logger('[Mandap] Browser could not be launched.');
    return { totalScraped: 0, newInserted: 0, updated: 0 };
  }

  let context = null;
  const cardsByProfile = new Map();

  try {
    context = await browser.newContext({
      userAgent: HTTP_HEADERS['User-Agent'],
      viewport: { width: 1366, height: 900 },
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' }
    });
    const page = await context.newPage();

    for (const slug of slugs) {
      if (deps.abortSignal.aborted) break;
      if (cardsByProfile.size >= 60) break;

      for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
        if (deps.abortSignal.aborted) break;
        const url = `https://www.mandap.com/${cityPart}/${slug}?page=${pageNo}`;
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
          await page.waitForSelector('article h3 a.venue-name', { timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(1200);

          const cards = await extractListCards(page);
          if (!cards.length) {
            deps.logger(`[Mandap] 0 cards at ${url}`);
            break;
          }

          let fresh = 0;
          for (const card of cards) {
            const profileUrl = dv.ensureAbsolute(card.profileHref, 'https://www.mandap.com');
            // Mandap sometimes renders "Results" in the heading while the real
            // name lives in the profile URL slug. Recover it instead of saving
            // a generic UI label as a business.
            let cardName = dv.cleanText(card.name, 240);
            if (fidelity.isGenericName(cardName)) cardName = nameFromProfileUrl(profileUrl);
            if (!cardName) continue;
            if (!fidelity.isVendorRelevant({ name: cardName, profileUrl }, category)) continue;
            const key = profileUrl || `${dv.normalizeName(cardName)}|${cityPart}`;
            if (cardsByProfile.has(key)) continue;
            cardsByProfile.set(key, { ...card, name: cardName, profileUrl, listUrl: url });
            fresh++;
          }
          deps.logger(`[Mandap] ${slug} page ${pageNo}: ${cards.length} cards, ${fresh} new`);

          if (cards.length < 8) break;
        } catch (error) {
          deps.logger(`[Mandap] List error at ${url}: ${error.message}`);
          break;
        }
      }
    }
  } catch (error) {
    deps.logger(`[Mandap] Fatal list error: ${error.message}`);
  } finally {
    try { if (context) await context.close(); } catch (e) {}
  }

  const cards = [...cardsByProfile.values()];
  deps.logger(`[Mandap] Collected ${cards.length} unique venues. Enriching up to ${Math.min(cards.length, MAX_DETAIL_PAGES)} detail pages...`);

  // Enrich with detail pages (axios, concurrent) — richer descriptions,
  // amenities, payments, capacity and full gallery.
  const detailQueue = cards.slice(0, MAX_DETAIL_PAGES);
  const details = new Map();
  let cursor = 0;
  const workers = Array.from({ length: Math.min(DETAIL_CONCURRENCY, Math.max(1, detailQueue.length)) }, async () => {
    while (cursor < detailQueue.length && !deps.abortSignal.aborted) {
      const index = cursor++;
      const card = detailQueue[index];
      if (!card.profileUrl) continue;
      try {
        details.set(card.profileUrl, await fetchDetail(card.profileUrl));
      } catch (error) {
        deps.logger(`[Mandap] Detail failed for ${card.name}: ${error.message}`);
      }
    }
  });
  await Promise.allSettled(workers);

  let created = 0;
  let updated = 0;
  const sourceTag = 'Mandap.com';

  for (const card of cards) {
    if (deps.abortSignal.aborted) break;
    const detail = details.get(card.profileUrl) || null;
    const mapsQuery = parseMapsQuery(card.mapsHref);
    const addressFromMaps = dv.stripVenueNameFromAddress(mapsQuery, card.name);
    const address = detail && detail.address
      ? dv.stripVenueNameFromAddress(detail.address, card.name)
      : addressFromMaps;
    const pincode = (detail && detail.pincode) || dv.extractPincode(address) || dv.extractPincode(card.mapsHref);
    const rating = dv.parseRating(card.rating);
    const priceRange = dv.parsePrice(card.price, card.unit) || (detail && detail.priceRange) || '';

    const vendor = dv.buildDirectoryVendor({
      prefix: 'md',
      sessionId,
      source: sourceTag,
      sourceEngine: 'mandap',
      name: card.name,
      category: category || 'Wedding Venue',
      subcategory: (detail && detail.otherInfo && detail.otherInfo['Property type']) || '',
      description: detail ? detail.description : '',
      address,
      locality: card.locality || (detail && detail.locality) || city,
      city: parsedLocation.city || city,
      district: parsedLocation.district,
      state: (detail && detail.state) || parsedLocation.state,
      pincode,
      rating,
      reviewCount: '',
      priceRange,
      capacity: detail ? detail.capacity : '',
      amenities: detail ? detail.amenities : [],
      services: detail ? detail.services : [],
      payments: detail ? detail.payments : [],
      images: (detail && detail.images.length ? detail.images : card.images),
      logo: (detail && detail.images[0]) || card.images[0] || '',
      profileUrl: card.profileUrl,
      mapsUrl: card.mapsHref,
      tags: /featured/i.test(card.text) ? ['Featured'] : [],
      otherInfo: detail ? { ...detail.otherInfo, faqs: detail.faqs } : {},
      sourceProvenance: [{
        field: 'listing',
        source: sourceTag,
        sourceUrl: card.listUrl,
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

  deps.logger(`[Mandap] Complete. ${cards.length} live venues, ${created} new, ${updated} refreshed. Phone stays unknown (OTP-gated on source).`);
  return { totalScraped: cards.length, newInserted: created, updated, detailed: details.size };
}

module.exports = { scrapeMandap, setDeps };
