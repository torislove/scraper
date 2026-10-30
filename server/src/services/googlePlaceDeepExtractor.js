/**
 * googlePlaceDeepExtractor.js
 * Opens a Google Maps place and extracts the full public profile:
 * identity, category, address, phone, website, hours, attributes, reviews,
 * owner responses, photos, price level, business status and coordinates.
 *
 * Every field is scraped from the live page. Missing values stay empty.
 */

const { getBrowser, chromium, applyAdvancedStealth, optimizePageForSpeed } = require('../scrapers/browserFactory');
const {
  normalizePhone,
  extractPhones,
  extractPincode,
  splitIndianAddress
} = require('../utils/phoneUtils');

const MAPS_HOST = /google\.[a-z.]+\/maps|maps\.google\./i;

function cleanText(value, max = 2000) {
  return String(value == null ? '' : value)
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim()
    .slice(0, max);
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    if (!item) continue;
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function parseCoords(url) {
  if (!url) return null;
  // Prefer the actual place marker: !3dLAT!4dLNG
  const marker = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (marker) {
    const lat = Number(marker[1]);
    const lng = Number(marker[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const at = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) {
    const lat = Number(at[1]);
    const lng = Number(at[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const query = url.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (query) {
    const lat = Number(query[1]);
    const lng = Number(query[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

function parsePlaceId(url) {
  if (!url) return { placeId: '', cid: '' };
  const ftid = url.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
  const cid = url.match(/[?&]cid=(\d+)/);
  let numericCid = '';
  if (ftid) {
    try {
      numericCid = BigInt(ftid[1].split(':')[1]).toString();
    } catch (e) {
      numericCid = '';
    }
  }
  return {
    placeId: ftid ? ftid[1] : '',
    cid: cid ? cid[1] : numericCid
  };
}

function buildSearchUrl(input) {
  if (typeof input === 'string' && MAPS_HOST.test(input)) return input;
  if (typeof input === 'string' && /^https?:\/\//i.test(input)) return input;

  const vendor = typeof input === 'object' && input ? input : {};
  if (vendor.mapsLink && MAPS_HOST.test(vendor.mapsLink)) return vendor.mapsLink;
  const query = [vendor.name, vendor.address || vendor.city || vendor.location].filter(Boolean).join(' ');
  if (!query) return '';
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

function normalisePhotoUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (!/googleusercontent\.com|ggpht\.com|lh\d\.google\.com/i.test(url)) return '';
  // Reviewer avatars use /a/ or /a-/ paths; place photos use /p/ or gps-cs-s.
  if (/\/a-?\//i.test(url) || /\/a\//i.test(url)) return '';
  if (/=s\d{2}(-|$)/i.test(url) && !/\/p\//i.test(url)) return '';
  let clean = url.split(' ')[0];
  clean = clean.replace(/=s\d+.*$/i, '=w1200-h900-k-no');
  if (!/=w\d+-h\d+/i.test(clean)) clean += '=w1200-h900-k-no';
  return clean;
}

function parseRatingBlock(text) {
  const value = String(text || '');
  // Prefer an explicit "N reviews/ratings" match, then a parenthesised count.
  const countMatch = value.match(/([\d][\d,]*)\s*(?:reviews?|ratings?)/i) ||
    value.match(/\(([\d,]+)\)/) ||
    value.match(/(?<![\d.])([\d][\d,]{1,})(?![\d.])/) ||
    value.match(/(?<![\d.])([\d][\d,]{1,})/);
  const ratingMatch = value.match(/(?:^|\s)([0-5](?:\.\d)?)(?:\s*(?:stars?|★))?/i) ||
    value.match(/([0-5](?:\.\d)?)/);
  const rating = ratingMatch ? Number(ratingMatch[1]) : null;
  const count = countMatch ? Number(countMatch[1].replace(/,/g, '')) : null;
  return {
    rating: Number.isFinite(rating) && rating >= 0 && rating <= 5 ? rating : null,
    count: Number.isFinite(count) ? count : null
  };
}

async function extractPageData(page, vendor) {
  const dom = await page.evaluate(() => {
    const text = (sel, max = 5000) => {
      const el = document.querySelector(sel);
      return el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, max) : '';
    };
    const attr = (sel, name) => {
      const el = document.querySelector(sel);
      return el ? (el.getAttribute(name) || '') : '';
    };
    const aria = (sel) => attr(sel, 'aria-label').replace(/\s+/g, ' ').trim();
    const allText = sel => [...document.querySelectorAll(sel)].map(el => el.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);

    const name = text('h1.DUwDvf') || text('h1');
    const category = text('button.DkEaL') ||
      text('button[jsaction*="pane.rating.category"]') ||
      text('button[jsaction*="category"]') ||
      '';

    const address = (aria('[data-item-id="address"]') || '').replace(/^Address:\s*/i, '');
    const phone = (aria('[data-item-id^="phone:tel:"]') || '').replace(/^Phone:\s*/i, '');
    const website = attr('a[data-item-id="authority"]', 'href');
    const plusCode = (aria('[data-item-id="oloc"]') || '').replace(/^Plus code:\s*/i, '');
    const mapsUrl = location.href;

    const ratingText = text('div.F7nice span[aria-hidden="true"]') || text('div.F7nice');
    const reviewAria = aria('button[jsaction*="pane.rating.moreReviews"]') || aria('button[aria-label*="reviews"]');
    const reviewCountText = text('button[jsaction*="pane.rating.moreReviews"]') ||
      text('div.F7nice span:nth-child(2)') || text('div.F7nice');
    const priceLevel = text('span.mgr77e') || text('div.LBgpqf span');

    const hoursTable = [...document.querySelectorAll('table.eK4R0e tr')].map(tr => {
      const cells = [...tr.querySelectorAll('td')].map(td => td.textContent.replace(/\s+/g, ' ').trim());
      return cells.length >= 2 ? { day: cells[0], hours: cells.slice(1).join(' ') } : null;
    }).filter(Boolean);
    const hoursRaw = (aria('[data-item-id="oh"]') || text('div.t39EBf') || '').replace(/^Hours:\s*/i, '');

    const attributeGroups = [];
    const attrSeen = new Set();
    const pushAttributeGroup = (heading, rawItems) => {
      const cleanHeading = String(heading || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      const items = [...new Set((rawItems || [])
        .map(v => String(v || '').replace(/\s+/g, ' ').trim())
        .filter(v => v && v.length <= 100))].slice(0, 40);
      if (!items.length) return;
      const key = `${cleanHeading}|${items.join('|')}`;
      if (attrSeen.has(key)) return;
      attrSeen.add(key);
      attributeGroups.push({ heading: cleanHeading, items });
    };
    for (const group of document.querySelectorAll('div.LTs0Rc')) {
      const headingEl = group.querySelector('div.iP2t7d, h2, h3, div[role="heading"]');
      const heading = headingEl ? headingEl.textContent : (group.previousElementSibling ? group.previousElementSibling.textContent : '');
      const items = [...group.querySelectorAll('li, button, span[aria-label]')]
        .map(el => el.getAttribute('aria-label') || el.textContent);
      pushAttributeGroup(heading, items);
    }
    const aboutPanel = document.querySelector('div[role="tabpanel"]');
    if (aboutPanel) {
      for (const headingEl of aboutPanel.querySelectorAll('div.iP2t7d, h2, h3')) {
        const heading = headingEl.textContent || '';
        if (!heading || heading.length > 60) continue;
        const container = headingEl.closest('div.LTs0Rc') || headingEl.parentElement;
        if (!container) continue;
        const items = [...container.querySelectorAll('li, button, span[aria-label]')]
          .map(el => el.getAttribute('aria-label') || el.textContent);
        pushAttributeGroup(heading, items);
      }
    }
    if (attributeGroups.length === 0) {
      const items = allText('div.LTs0Rc button').slice(0, 80);
      if (items.length) pushAttributeGroup('', items);
    }

    const reviews = [...document.querySelectorAll('div.jftiEf')].slice(0, 24).map(el => {
      const author = el.querySelector('div.d4r55')?.textContent?.trim() || '';
      const ratingLabel = el.querySelector('span.kvMYJc')?.getAttribute('aria-label') || '';
      const ratingMatch = ratingLabel.match(/([\d.]+)/);
      const textValue = el.querySelector('span.wiI7pd')?.textContent?.trim() || '';
      const date = el.querySelector('span.rsqaWe')?.textContent?.trim() || '';
      const response = el.querySelector('div.CDe7pd')?.textContent?.trim() || '';
      const photos = [...el.querySelectorAll('button.Tya61d, button[style*="background-image"]')]
        .map(b => {
          const style = b.getAttribute('style') || '';
          const match = style.match(/url\(["']?([^"')]+)["']?\)/i);
          if (match) return match[1];
          const img = b.querySelector('img');
          return img ? img.src : '';
        })
        .filter(Boolean);
      return {
        author,
        rating: ratingMatch ? Number(ratingMatch[1]) : null,
        text: textValue,
        date,
        response,
        photos: [...new Set(photos)].slice(0, 4),
        source: 'google_maps'
      };
    }).filter(r => r.text || r.rating || r.author);

    const photoSet = new Set();
    const addPhoto = value => {
      if (!value) return;
      const match = String(value).match(/url\(["']?([^"')]+)["']?\)/i);
      const url = match ? match[1] : String(value);
      if (url) photoSet.add(url);
    };
    [...document.querySelectorAll('img')].forEach(img => {
      const src = img.src || img.getAttribute('data-src') || '';
      if (/googleusercontent|ggpht|lh\d\.google/i.test(src)) addPhoto(src);
    });
    [...document.querySelectorAll('button[style*="background-image"], div[style*="background-image"]')].forEach(el => {
      addPhoto(el.getAttribute('style'));
    });
    [...document.querySelectorAll('button[jsaction*="pane.photo"], div.ZKCDEc img, img[src*="googleusercontent"]')].forEach(el => {
      if (el.tagName === 'IMG') addPhoto(el.src);
    });

    const bodyText = document.body.innerText || '';
    const statusMatch = bodyText.match(/(Permanently closed|Temporarily closed|Open 24 hours|Opens [^.\n]{2,40}|Closes [^.\n]{2,40})/i);
    const popularTimes = [...document.querySelectorAll('[aria-label*="Popular times" i]')]
      .map(el => el.getAttribute('aria-label'))
      .filter(Boolean)
      .slice(0, 10);

    const menuLink = attr('a[data-item-id="menu"]', 'href');
    const orderLinks = [...document.querySelectorAll('a[data-item-id^="order"]')]
      .map(a => ({ label: a.textContent.trim(), url: a.href })).slice(0, 8);
    const bookingLinks = [...document.querySelectorAll('a[data-item-id="reserve"], a[data-item-id*="booking"], a[jsaction*="reserve"]')]
      .map(a => ({ label: a.textContent.trim(), url: a.href })).slice(0, 8);
    const ownerName = text('div.Q7PwXb') || text('a[data-item-id="owner"]');

    return {
      name,
      category,
      address,
      phone,
      website,
      plusCode,
      mapsUrl,
      ratingText,
      reviewAria,
      reviewCountText,
      priceLevel,
      hoursTable,
      hoursRaw,
      attributeGroups,
      reviews,
      photos: [...photoSet].slice(0, 40),
      businessStatus: statusMatch ? statusMatch[0] : '',
      popularTimes,
      menuLink,
      orderLinks,
      bookingLinks,
      ownerName
    };
  });

  const ratingBlock = parseRatingBlock(`${dom.ratingText} ${dom.reviewCountText} ${dom.reviewAria}`);

  const phones = uniqueBy(
    [dom.phone, ...extractPhones(dom.phone)].map(value => normalizePhone(value)).filter(Boolean),
    p => p.e164
  );

  const addressComponents = splitIndianAddress(dom.address);
  const pincode = addressComponents.pincode || extractPincode(dom.address, phones);
  const coords = parseCoords(dom.mapsUrl) || parseCoords(vendor.mapsLink) ||
    (vendor.latitude && vendor.longitude ? { lat: Number(vendor.latitude), lng: Number(vendor.longitude) } : null);

  const attributes = [];
  for (const group of dom.attributeGroups) {
    for (const item of group.items) {
      attributes.push({ group: cleanText(group.heading, 80), name: cleanText(item, 120) });
    }
  }

  const photos = uniqueBy(
    dom.photos.map(normalisePhotoUrl).filter(Boolean),
    url => url
  ).slice(0, 24);

  return {
    name: cleanText(dom.name, 240),
    category: cleanText(dom.category, 120),
    address: cleanText(dom.address, 600),
    addressComponents: { ...addressComponents, pincode },
    pincode,
    plusCode: cleanText(dom.plusCode, 80),
    phone: phones.find(p => p.isMobile) || phones[0] || null,
    phones,
    website: cleanText(dom.website, 800),
    rating: ratingBlock.rating,
    reviewsCount: ratingBlock.count,
    priceLevel: cleanText(dom.priceLevel, 40),
    businessStatus: cleanText(dom.businessStatus, 80),
    ownerName: cleanText(dom.ownerName, 160),
    hours: {
      raw: cleanText(dom.hoursRaw, 300),
      table: uniqueBy(dom.hoursTable, r => `${r.day}|${r.hours}`).slice(0, 10)
    },
    attributes: uniqueBy(attributes, a => `${a.group}|${a.name}`).slice(0, 120),
    attributeGroups: dom.attributeGroups,
    popularTimes: dom.popularTimes,
    photos,
    reviews: dom.reviews,
    menuLink: cleanText(dom.menuLink, 800),
    orderLinks: dom.orderLinks,
    bookingLinks: dom.bookingLinks,
    coordinates: coords,
    mapsLink: dom.mapsUrl,
    ...parsePlaceId(dom.mapsUrl),
    reviewsSource: 'google_maps'
  };
}

/**
 * @param {string|object} input Google Maps URL or vendor-like object
 * @param {{timeoutMs?:number, includePhotos?:boolean, includeReviews?:boolean}} [options]
 */
async function deepExtractPlace(input, options = {}) {
  const started = Date.now();
  const result = {
    ok: false,
    source: 'google_maps',
    url: '',
    fetchedAt: new Date().toISOString(),
    durationMs: 0,
    data: null,
    warnings: []
  };

  const searchUrl = buildSearchUrl(input);
  if (!searchUrl) {
    result.warnings.push('No Google Maps URL or business name supplied.');
    return result;
  }
  result.url = searchUrl;

  if (!chromium) {
    result.warnings.push('Playwright Chromium is not available on this server.');
    return result;
  }

  const browser = await getBrowser();
  if (!browser) {
    result.warnings.push('Browser could not be launched.');
    return result;
  }

  let context = null;
  try {
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 900 },
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' }
    });
    const page = await context.newPage();
    await applyAdvancedStealth(page);
    await optimizePageForSpeed(page);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs || 35000 })
      .catch(() => result.warnings.push('Maps navigation timed out; using partial DOM.'));

    const consent = page.locator('button:has-text("Accept all"), button:has-text("Reject all"), button:has-text("I agree")');
    if (await consent.count() > 0) {
      await consent.first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(600);
    }

    // If we landed on a results feed, open the best/first place.
    const hasHeading = await page.locator('h1').count();
    const feed = page.locator('div[role="feed"]');
    if (feed.count && await feed.count() > 0 && hasHeading === 0) {
      const first = page.locator('a.hfpxzc').first();
      if (await first.count() > 0) {
        await first.click({ timeout: 6000 }).catch(() => {});
        await page.waitForTimeout(2500);
      }
    }

    await page.waitForSelector('h1', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(800);

    // Scroll the details panel to trigger lazy review/attribute rendering.
    await page.evaluate(() => {
      const panel = document.querySelector('div[role="main"]');
      if (panel) panel.scrollTo(0, Math.min(panel.scrollHeight, 1800));
    }).catch(() => {});
    await page.waitForTimeout(700);

    // Best-effort: open the About tab for structured attributes.
    const aboutTab = page.locator('button[role="tab"]:has-text("About")').first();
    let clickedAbout = false;
    if (await aboutTab.count() > 0) {
      await aboutTab.click({ timeout: 2500 }).catch(() => {});
      clickedAbout = true;
      await page.waitForTimeout(900);
    }

    const data = await extractPageData(page, typeof input === 'object' && input ? input : {});

    if (clickedAbout) {
      // Re-read reviews from the overview tab if the About tab replaced them.
      const hasReviews = await page.locator('div.jftiEf').count();
      if (hasReviews === 0) {
        const overviewTab = page.locator('button[role="tab"]:has-text("Overview")').first();
        if (await overviewTab.count() > 0) {
          await overviewTab.click({ timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(700);
          const reRead = await extractPageData(page, typeof input === 'object' && input ? input : {});
          data.reviews = reRead.reviews.length ? reRead.reviews : data.reviews;
          data.photos = reRead.photos.length ? reRead.photos : data.photos;
      data.hours = data.hours.table.length || data.hours.raw ? data.hours : reRead.hours;
        }
      }
    }

    if (!data.name) result.warnings.push('Place name could not be read; the page may be blocked or still loading.');
    if (!data.phone) result.warnings.push('No valid phone number visible on Maps.');
    if (!data.address) result.warnings.push('No address visible on Maps.');

    result.ok = Boolean(data.name);
    result.data = data;
    result.durationMs = Date.now() - started;
    result.fetchedAt = new Date().toISOString();
    return result;
  } catch (e) {
    result.warnings.push(`Deep place extraction failed: ${e.message}`);
    result.durationMs = Date.now() - started;
    return result;
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
  }
}

module.exports = {
  deepExtractPlace,
  parseCoords,
  parsePlaceId,
  buildSearchUrl
};
