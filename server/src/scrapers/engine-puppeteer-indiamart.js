/**
 * IndiaMART engine (Playwright).
 *
 * IndiaMART intermittently serves a stripped shell to headless browsers. This
 * engine retries with a warmed session and multiple query shapes, parses the
 * structured .card.brs5 attributes (city, state, rating, supplier slug,
 * product/supplier URLs), and only accepts numbers that pass libphonenumber.
 *
 * The supplier city is stored exactly as IndiaMART reports it. Suppliers that
 * only "Deal in" the target city are recorded with serviceAreas instead of a
 * fake address, so a Jaipur supplier is never shown as a Vijayawada venue.
 */

const crypto = require('crypto');
const dbAdapter = require('../config/dbAdapter');
const { getBrowser, chromium, applyAdvancedStealth } = require('./browserFactory');
const { extractPhones, pickBestPhone } = require('../utils/phoneUtils');
const dv = require('./directoryVendor');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0'
];

const ATTEMPT_BUILDERS = [
  city => `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(city.category)}&cq=${encodeURIComponent(city.name)}`,
  city => `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(`${city.category} in ${city.name}`)}`,
  city => `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(city.category)}&cq=${encodeURIComponent(city.name)}&v=4`
];

function parseRating(value) {
  const match = String(value || '').match(/([0-5](?:\.\d)?)/);
  if (!match) return '';
  const n = Number(match[1]);
  return Number.isFinite(n) && n >= 0 && n <= 5 ? n : '';
}

function parsePrice(text) {
  const match = String(text || '').match(/(₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)\s*(?:\/\s*([a-zA-Z ]{2,20}))?/i);
  if (!match) return '';
  return dv.parsePrice(`${match[1]}${match[2]}${match[3] ? ` / ${match[3].trim()}` : ''}`, '');
}

function cardTextHasCategory(text, category) {
  const value = String(text || '').toLowerCase();
  const cat = String(category || '').toLowerCase();
  if (!cat) return true;
  if (value.includes(cat)) return true;
  const tokens = cat.split(/\s+/).filter(t => t.length > 3);
  return tokens.some(token => value.includes(token));
}

async function extractCards(page) {
  return page.evaluate(() => {
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
    return [...document.querySelectorAll('.card.brs5')].map(card => {
      const supplierAnchor = card.querySelector('.companyname a, a.cardlinks[href*="indiamart.com"]');
      const productAnchor = card.querySelector('.producttitle a, .prd-name a, a[href*="/proddetail/"]');
      const text = clean(card.innerText).slice(0, 1400);
      const telLinks = [...card.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href') || '');
      const ratingMatch = text.match(/([0-5](?:\.\d)?)\s*\(([\d,]+)\)/);
      const responseMatch = text.match(/\((\d{1,3})%\s*Response Rate\)/i);
      const memberMatch = text.match(/Member:\s*(\d+)\s*yrs?/i);
      const dealsMatch = text.match(/Deals? in ([A-Za-z .]+?)(?:\s+GST|\s+Email|\s+Mobile|\s+Member|$)/i);
      return {
        supplierName: clean(supplierAnchor ? supplierAnchor.innerText : ''),
        supplierUrl: supplierAnchor ? (supplierAnchor.getAttribute('href') || '') : '',
        productName: clean(productAnchor ? productAnchor.innerText : ''),
        productUrl: productAnchor ? (productAnchor.getAttribute('href') || '') : '',
        city: clean(card.getAttribute('data-city') || ''),
        state: clean(card.getAttribute('data-state') || ''),
        rating: clean(card.getAttribute('data-rating') || ''),
        tscode: clean(card.getAttribute('data-tscode') || ''),
        image: clean(card.getAttribute('data-origimg') || ''),
        text,
        telHrefs: telLinks,
        reviewCount: ratingMatch ? Number(ratingMatch[2].replace(/,/g, '')) : '',
        ratingText: ratingMatch ? ratingMatch[1] : '',
        responseRate: responseMatch ? Number(responseMatch[1]) : '',
        memberYears: memberMatch ? Number(memberMatch[1]) : '',
        dealsIn: dealsMatch ? clean(dealsMatch[1]) : '',
        hasGst: /\bGST\b/i.test(text),
        hasTrustSeal: /TrustSEAL/i.test(text),
        hasShowMobile: /view mobile number|show number|view number/i.test(text)
      };
    }).filter(card => card.supplierName);
  }).catch(() => []);
}

async function revealPhone(page, index) {
  try {
    const card = page.locator('.card.brs5').nth(index);
    const button = card.getByText(/view mobile number|show number|view number/i).first();
    if (!(await button.count().catch(() => 0))) return null;
    await button.click({ timeout: 3500 });
    await page.waitForTimeout(2200);

    const state = await page.evaluate(() => {
      const tel = [...document.querySelectorAll('a[href^="tel:"]')]
        .map(a => a.getAttribute('href') || '').filter(Boolean);
      const dialogs = [...document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="popup"]')]
        .map(node => (node.innerText || '').replace(/\s+/g, ' ').slice(0, 500))
        .filter(Boolean);
      return { tel, dialogs };
    }).catch(() => ({ tel: [], dialogs: [] }));

    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(400);

    for (const href of state.tel) {
      const phones = extractPhones(href, { context: 'contact number tel' });
      const best = pickBestPhone(phones);
      if (best) return best;
    }
    for (const dialog of state.dialogs) {
      const phones = extractPhones(dialog, { context: 'contact number' });
      const best = pickBestPhone(phones);
      if (best) return best;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function loadSearchPage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(error => {
    deps.logger(`[IndiaMART] Navigation warning: ${error.message}`);
  });
  await page.waitForSelector('.card.brs5', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(2200);

  for (const selector of ['button:has-text("Close")', 'button[aria-label="Close"]', '.popup-close', '.close']) {
    const button = page.locator(selector).first();
    if (await button.count().catch(() => 0)) {
      await button.click({ timeout: 1000 }).catch(() => {});
    }
  }

  return page.locator('.card.brs5').count().catch(() => 0);
}

async function scrapePuppeteerIndiaMart(category, location, sessionId = 'legacy') {
  const parsedLocation = dv.parseCityState(location);
  const city = parsedLocation.city || dv.cleanText(String(location || '').split(',')[0], 120);

  if (!chromium) {
    deps.logger('[IndiaMART] Playwright is not available on this server.');
    return [];
  }

  const browser = await getBrowser();
  if (!browser) {
    deps.logger('[IndiaMART] Browser could not be launched.');
    return [];
  }

  const inserted = [];
  let rawCards = [];
  let workingUrl = '';

  for (let attempt = 0; attempt < ATTEMPT_BUILDERS.length && !deps.abortSignal.aborted; attempt++) {
    const url = ATTEMPT_BUILDERS[attempt]({ category, name: city });
    const userAgent = USER_AGENTS[attempt % USER_AGENTS.length];
    deps.logger(`[IndiaMART] Attempt ${attempt + 1}/${ATTEMPT_BUILDERS.length}: ${url}`);

    const context = await browser.newContext({
      userAgent,
      viewport: { width: 1366, height: 900 },
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      extraHTTPHeaders: {
        'Accept-Language': 'en-IN,en;q=0.9',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    try {
      const page = await context.newPage();
      await applyAdvancedStealth(page);

      // Warm up on the IndiaMART homepage; a cold direct hit is the most
      // common cause of the stripped 30 KB shell.
      if (attempt > 0) {
        await page.goto('https://www.indiamart.com/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(2500);
      }

      const count = await loadSearchPage(page, url);
      deps.logger(`[IndiaMART] Attempt ${attempt + 1} delivered ${count} cards`);

      if (count > 0) {
        rawCards = await extractCards(page);
        workingUrl = page.url();

        // Reveal up to 6 phone numbers per pass.
        for (let i = 0; i < Math.min(rawCards.length, 6) && !deps.abortSignal.aborted; i++) {
          if (!rawCards[i].hasShowMobile) continue;
          const best = await revealPhone(page, i);
          if (best) rawCards[i].phone = best;
        }
        break;
      }
    } catch (error) {
      deps.logger(`[IndiaMART] Attempt ${attempt + 1} failed: ${error.message}`);
    } finally {
      try { await context.close(); } catch (e) {}
    }
  }

  if (!rawCards.length) {
    deps.logger('[IndiaMART] All attempts were blocked (0 live cards). No data written. This is an upstream anti-bot response, not an empty result set.');
    return [];
  }

  const existing = dbAdapter.getVendors();
  const targetCity = city.toLowerCase();

  for (const card of rawCards) {
    if (deps.abortSignal.aborted) break;

    const supplierCity = card.city || '';
    const dealsIn = card.dealsIn || '';
    const mentionsTarget =
      supplierCity.toLowerCase() === targetCity ||
      (dealsIn && dealsIn.toLowerCase().includes(targetCity)) ||
      String(card.text || '').toLowerCase().includes(targetCity);

    if (!mentionsTarget) {
      deps.logger(`[IndiaMART] Skipped "${card.supplierName}" (${supplierCity || 'unknown city'}) — outside ${city}`);
      continue;
    }
    if (!cardTextHasCategory(card.text, category)) {
      continue;
    }

    const phone = card.phone || null;
    const phones = phone ? [phone] : [];
    const reviewCount = card.reviewCount || '';
    const rating = parseRating(card.rating || card.ratingText);
    const address = dv.cleanText([supplierCity, card.state].filter(Boolean).join(', '), 400);

    // Skip if an identical supplier profile already exists for this session.
    const duplicate = existing.find(vendor =>
      vendor.profileSourceUrl && card.supplierUrl &&
      vendor.profileSourceUrl.toLowerCase() === card.supplierUrl.toLowerCase() &&
      (vendor.sessionIds || [vendor.sessionId]).includes(sessionId)
    );
    if (duplicate) continue;

    const vendor = dv.buildDirectoryVendor({
      prefix: 'im',
      sessionId,
      source: 'IndiaMART',
      sourceEngine: 'indiamart',
      name: card.supplierName,
      category,
      subcategory: card.productName || '',
      description: dv.cleanText(
        `${card.productName ? `Supplier of ${card.productName}. ` : ''}${card.text}`,
        1200
      ),
      address,
      locality: supplierCity || city,
      city: supplierCity || city,
      district: supplierCity && supplierCity.toLowerCase() !== targetCity ? supplierCity : parsedLocation.district,
      state: card.state || parsedLocation.state,
      pincode: dv.extractPincode(card.text),
      rating,
      reviewCount,
      priceRange: parsePrice(card.text),
      images: card.image ? [card.image] : [],
      logo: card.image || '',
      profileUrl: dv.ensureAbsolute(card.supplierUrl, 'https://www.indiamart.com'),
      phones,
      tags: [
        card.hasGst ? 'GST' : '',
        card.hasTrustSeal ? 'TrustSEAL' : '',
        card.memberYears ? `Member ${card.memberYears} yrs` : ''
      ].filter(Boolean),
      otherInfo: {
        productName: card.productName,
        productUrl: card.productUrl,
        supplierSlug: card.tscode,
        serviceAreas: dealsIn ? [dealsIn] : (supplierCity.toLowerCase() !== targetCity ? [city] : []),
        responseRate: card.responseRate ? `${card.responseRate}%` : '',
        memberYears: card.memberYears || ''
      },
      sourceProvenance: [{
        field: 'listing',
        source: 'IndiaMART',
        sourceUrl: workingUrl,
        extractedAt: new Date().toISOString()
      }]
    });

    if (!vendor.name) continue;
    const result = dv.saveDirectoryVendor(vendor, sessionId);
    inserted.push(result.vendor);
    try { deps.emitVendorEvent(result.vendor, result.created ? 'inserted' : 'updated'); } catch (e) {}
  }

  deps.logger(`[IndiaMART] Complete. ${rawCards.length} live supplier cards, ${inserted.length} stored/refreshed (${inserted.filter(v => v.phone).length} with validated phones).`);
  return inserted;
}

module.exports = { scrapePuppeteerIndiaMart, setDeps };
