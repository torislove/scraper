/**
 * phoneBackfillService.js
 *
 * Google Maps feed cards do not render phone numbers. The number only exists
 * on the place detail panel (`[data-item-id^="phone:tel:"]`). This service
 * opens those detail pages for the leads of the current run that still have no
 * valid Indian mobile, inside a hard time budget, and merges every number it
 * finds back into the vendor record.
 *
 * Design rules:
 *  - Bounded: one browser, a small page pool, a hard deadline.
 *  - Honest: only libphonenumber-valid Indian numbers are stored.
 *  - Complete: every observed number is kept in `phones[]`, mobile first.
 *  - Non-destructive: never overwrites a number that is already valid.
 */

const dbAdapter = require('../config/dbAdapter');
const { getBrowser, applyAdvancedStealth, optimizePageForSpeed } = require('../scrapers/browserFactory');
const { normalizePhone } = require('../utils/phoneUtils');
const { detectCountry, COUNTRIES } = require('../services/localBrain/countries');
const browserBudget = require('../utils/browserBudget');

/**
 * The lead's own location decides the phone rules. A lead from Austin must be
 * parsed as US and a lead from Tenali as India, regardless of where the app is
 * running. Unknown leads fall back to India, the home market.
 */
function countryForLead(lead) {
  if (!lead) return 'IN';
  const explicit = String(lead.country || lead.countryCode || '').trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(explicit) && COUNTRIES.some(c => c.code === explicit)) return explicit;

  // Infer country from international phone prefix
  const rawPhone = String(lead.phone || (Array.isArray(lead.phones) ? (typeof lead.phones[0] === 'string' ? lead.phones[0] : lead.phones[0]?.e164 || lead.phones[0]?.raw) : '') || '').trim();
  if (rawPhone.startsWith('+1') || /^\+?1[-.\s]?\(?[2-9]\d{2}\)?[-.\s]?\d{3}/.test(rawPhone)) return 'US';
  if (rawPhone.startsWith('+44')) return 'GB';
  if (rawPhone.startsWith('+61')) return 'AU';
  if (rawPhone.startsWith('+971')) return 'AE';
  if (rawPhone.startsWith('+49')) return 'DE';
  if (rawPhone.startsWith('+33')) return 'FR';

  // Direct check for Indian cities, states, pincodes, and aliases
  const cityKey = (lead.city || '').toLowerCase().trim();
  const stateKey = (lead.state || '').toLowerCase().trim();
  const addr = (lead.address || '').toLowerCase();
  
  const { CITY_ALIASES } = require('./localBrain/countries');
  if (CITY_ALIASES && CITY_ALIASES[cityKey]) return CITY_ALIASES[cityKey].country;
  
  if (
    stateKey === 'india' || stateKey === 'telangana' || stateKey === 'andhra pradesh' ||
    stateKey === 'karnataka' || stateKey === 'maharashtra' || stateKey === 'tamil nadu' ||
    stateKey === 'delhi' || stateKey === 'gujarat' || stateKey === 'rajasthan' ||
    cityKey === 'hyderabad' || cityKey === 'secunderabad' || cityKey === 'bangalore' ||
    cityKey === 'bengaluru' || cityKey === 'mumbai' || cityKey === 'chennai' ||
    /\b500\d{3}\b/.test(addr) || /\b[1-9]\d{5}\b/.test(addr) || /\b(?:telangana|hyderabad|secunderabad|andhra|bharat|india)\b/i.test(addr)
  ) {
    return 'IN';
  }

  const hit = detectCountry([lead.country, lead.city, lead.district, lead.state, lead.address].filter(Boolean).join(', '));
  return hit ? hit.code : 'IN';
}

const DEFAULT_BUDGET_MS = 120_000;
const DEFAULT_CONCURRENCY = 6;
const PAGE_TIMEOUT_MS = 12_000;

function hasValidMobile(value, countryCode = 'IN') {
  const parsed = normalizePhone(value, { defaultCountry: countryCode, allowInternational: countryCode !== 'IN' });
  return Boolean(parsed && parsed.isMobile);
}

function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function compactName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const NAME_STOPWORDS = new Set([
  'the', 'and', 'of', 'pvt', 'pvtltd', 'ltd', 'limited', 'private', 'llp', 'inc', 'co', 'company',
  'hospital', 'hospitals', 'super', 'specialty', 'speciality', 'multi', 'multispeciality', 'multispecialty',
  'clinic', 'clinics', 'care', 'centre', 'center', 'institute', 'institution', 'healthcare', 'dr', 'doctor', 'doctors',
  'vijayawada', 'guntur', 'hyderabad', 'andhra', 'pradesh', 'telangana', 'india', 'emergency', 'trauma',
  'diagnostic', 'diagnostics', 'lab', 'labs', 'dental', 'dentist', 'eye', 'maternity', 'pediatric', 'ortho', 'ent',
  'cardio', 'neuro', 'associates', 'group', 'services', 'service', 'enterprise', 'enterprises', 'store', 'shop'
]);

function getDistinctiveTokens(name) {
  return normalizeName(name)
    .split(' ')
    .filter(t => t.length >= 3 && !NAME_STOPWORDS.has(t));
}

/**
 * Dice coefficient over character bigrams. Gives typo tolerance ("Childerns"
 * vs "Childrens") without merging genuinely different businesses.
 */
function bigramSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = new Map();
  for (let i = 0; i < a.length - 1; i++) {
    const gram = a.slice(i, i + 2);
    grams.set(gram, (grams.get(gram) || 0) + 1);
  }
  let hits = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const gram = b.slice(i, i + 2);
    const count = grams.get(gram) || 0;
    if (count > 0) {
      hits += 1;
      grams.set(gram, count - 1);
    }
  }
  return (2 * hits) / ((a.length - 1) + (b.length - 1));
}

function collapseAcronyms(str) {
  return String(str || '').replace(/\b([a-zA-Z])\s+([a-zA-Z])(?:\s+([a-zA-Z]))?(?:\s+([a-zA-Z]))?\b/g, (match) => match.replace(/\s+/g, ''));
}

const ADDRESS_STOPWORDS = new Set([
  'road', 'rd', 'street', 'st', 'cross', 'main', 'lane', 'near', 'opp', 'opposite',
  'beside', 'behind', 'circle', 'complex', 'building', 'floor', 'flr', 'andhra', 'pradesh', 'india',
  'bazar', 'bazaar', 'market', 'colony', 'nagar', 'line', 'junction'
]);

function extractPincode(str) {
  const m = String(str || '').match(/\b([1-9]\d{5})\b/);
  return m ? m[1] : '';
}

/**
 * Deep Location, Landmark, Address and Brand Matcher.
 * Operates without requiring pincodes: correlates micro-localities,
 * major landmarks (Clock Tower, RTC Bus Stand, etc.), street crossings,
 * and brand acronyms.
 */
function isLeadPlaceMatch(lead, details = {}, panelName = '') {
  const nameA = lead?.name || '';
  const nameB = panelName || details?.placeName || '';
  if (!nameA || !nameB) return false;

  const compA = collapseAcronyms(nameA).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const compB = collapseAcronyms(nameB).toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (compA === compB || compA.includes(compB) || compB.includes(compA)) return true;

  const normA = collapseAcronyms(nameA).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const brandTokens = normA
    .split(' ')
    .filter(t => t.length >= 2 && !NAME_STOPWORDS.has(t));

  const brandHits = brandTokens.filter(t => compB.includes(t)).length;

  const pinA = extractPincode(lead.address) || extractPincode(lead.pincode);
  const pinB = extractPincode(details.address);
  const pinMatch = Boolean(pinA && pinB && pinA === pinB);

  const city = (lead.city || '').toLowerCase().trim();
  const zone = (lead.zoneName || lead.locality || '').toLowerCase().trim();
  const detailAddr = (details.address || '').toLowerCase();
  const locationMatch = Boolean((city && detailAddr.includes(city)) || (zone && detailAddr.includes(zone)));

  const landmarks = [
    'clock tower', 'rtc bus stand', 'bus stand', 'railway station', 'station', 'gandhi chowk',
    'main bazar', 'bazar', 'market yard', 'market', 'municipal office', 'collectorate',
    'civil hospital', 'govt hospital', 'park', 'bridge', 'centre', 'center', 'junction',
    'circle', 'chowrasta', 'temple', 'church', 'mosque'
  ];
  let landmarkMatch = false;
  const leadAddrLower = (lead.address || '').toLowerCase();
  for (const lm of landmarks) {
    if (leadAddrLower.includes(lm) && detailAddr.includes(lm)) {
      landmarkMatch = true;
      break;
    }
  }

  const streetTokens = leadAddrLower
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(t => t.length >= 4 && !NAME_STOPWORDS.has(t) && !ADDRESS_STOPWORDS.has(t) && (!city || !t.includes(city)));
  const streetMatch = streetTokens.some(t => detailAddr.includes(t));

  if (brandHits >= 1) {
    if (locationMatch || landmarkMatch || pinMatch || streetMatch) return true;
    if (brandTokens.length > 0 && brandHits / brandTokens.length >= 0.35) return true;
  }

  const acronymA = nameA.split(/\s+/).map(w => w[0]).join('').toLowerCase();
  if (acronymA.length >= 3 && compB.includes(acronymA) && (locationMatch || landmarkMatch || streetMatch)) return true;

  if (landmarkMatch && streetMatch && locationMatch) return true;

  return bigramSimilarity(compA, compB) >= 0.70;
}

/**
 * Guard against attaching the wrong business's number. Only used when the URL
 * was synthesized from a name search, because a search can land on a competitor.
 */
function namesLikelyMatch(expected, actual) {
  const a = compactName(expected);
  const b = compactName(actual);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;

  const expTokens = getDistinctiveTokens(expected);
  if (expTokens.length > 0) {
    const hits = expTokens.filter(token => b.includes(token)).length;
    // Brand token overlap
    if (hits / expTokens.length >= 0.35) return true;
    // Core distinctive token match (e.g. 'manipal', 'sentini', 'aayush', 'nori')
    if (hits >= 1 && expTokens.some(t => t.length >= 4 && b.includes(t))) return true;
  }

  return bigramSimilarity(a, b) >= 0.70;
}

function readPlaceDetails(page) {
  return page.evaluate(() => {
    const out = { rawPhones: [], website: '', address: '', hours: '', rating: '', reviews: '', placeName: '' };

    // Detail panel phone row. Google has shipped several shapes over the years
    // (data-item-id, aria-label, tooltip, a tel: link, and a copy button whose
    // label is the number itself), so read all of them.
    const phoneSelectors = [
      '[data-item-id^="phone:tel:"]',
      'button[data-item-id*="phone"]',
      'div.Io6YTe',
      '.Io6YTe',
      'div.kR99db',
      'div.fdkmkc',
      'button.CsEnBe',
      'a[href^="tel:"]',
      'a[href*="wa.me/"]',
      'a[href*="api.whatsapp.com/send"]',
      'button[aria-label*="Phone" i]',
      '[aria-label*="Phone" i]',
      'button[aria-label*="Call" i]',
      '[aria-label*="Call" i]',
      'button[data-tooltip*="phone" i]',
      'button[data-tooltip*="Call" i]',
      'button[data-tooltip*="number" i]',
      'button[data-tooltip*="mobile" i]',
      '[data-tooltip*="Copy phone" i]'
    ];
    document.querySelectorAll(phoneSelectors.join(',')).forEach(el => {
      const label = el.getAttribute('aria-label') || '';
      const tooltip = el.getAttribute('data-tooltip') || '';
      const text = (el.textContent || '').trim();
      const match = `${label} ${tooltip}`.match(/(?:Phone|Call|Mobile|Number)[:\s]+(.+)$/i);
      if (match && match[1]) out.rawPhones.push(match[1].trim());
      if (label && !/^(phone|call|mobile)$/i.test(label.trim())) out.rawPhones.push(label.trim());
      if (tooltip && !/^(copy )?(phone|call|number|mobile)$/i.test(tooltip.trim())) out.rawPhones.push(tooltip.trim());
      if (text && /\d/.test(text) && !/^(closed|open|hours|locate|share|save|direction|menu|reviews|dine|takeaway|delivery|wheelchair|\$|₹)/i.test(text)) {
        out.rawPhones.push(text);
      }
      const itemId = el.getAttribute('data-item-id') || '';
      if (itemId.startsWith('phone:tel:')) out.rawPhones.push(itemId.replace('phone:tel:', ''));
      const href = el.getAttribute('href') || '';
      if (href.startsWith('tel:')) out.rawPhones.push(href.replace(/^tel:/i, ''));
      const waMatch = href.match(/(?:wa\.me\/|phone=)(\+?\d{8,15})/);
      if (waMatch && waMatch[1]) out.rawPhones.push(waMatch[1]);
      // The copy button's own label is often the number.
      const parentLabel = el.parentElement?.getAttribute('aria-label') || '';
      if (parentLabel && /\d/.test(parentLabel)) out.rawPhones.push(parentLabel);
    });

    // Also specifically extract every text element matching Google Maps info classes
    document.querySelectorAll('div.Io6YTe, .Io6YTe, div.kR99db, div.fdkmkc, div.fontBodyMedium').forEach(el => {
      const txt = (el.textContent || '').trim();
      if (txt && (/[+\d()]{7,}/.test(txt) || /\d{3,}[-.\s]?\d{3,}/.test(txt))) {
        if (!/^(closed|open|hours|locate|share|save|direction|menu|reviews|dine|takeaway|delivery|wheelchair|\$|₹)/i.test(txt)) {
          out.rawPhones.push(txt);
        }
      }
    });

    // Universal scan of container text for all 245 countries (India, US, UK, CA, AU, UAE, SG, Global)
    try {
      const container = document.querySelector('div[role="main"], div.m6QErb') || document.body;
      if (container) {
        const text = container.innerText || '';
        const phonePatterns = [
          // India: +91 / 0 + 10-digit mobile or landline
          /(?:(?:\+91|0091)[- ]?)?[6-9]\d{4}[- ]?\d{5}|0[6-9]\d{4}[- ]?\d{5}|0\d{2,4}[-\s]?\d{3,4}[-\s]?\d{3,4}/g,
          // International E.164: +1 to +999
          /(?:\+|00)[1-9]\d{0,3}[- ]?(?:\(?\d{1,5}\)?[- ]?)?\d{2,5}[- ]?\d{2,5}(?:[- ]?\d{1,4})?/g,
          // North America (US/CA): (xxx) xxx-xxxx or xxx-xxx-xxxx
          /(?:\+1[-. ]?)?(?:\([2-9]\d{2}\)|[2-9]\d{2})[-. ]?[2-9]\d{2}[-. ]?\d{4}/g,
          // UK / Australia / Middle East: 0xxx xxx xxxx
          /0[1-9]\d{1,4}[- ]?\d{3,4}[- ]?\d{3,4}/g
        ];
        for (const regex of phonePatterns) {
          let m;
          while ((m = regex.exec(text)) !== null) {
            const raw = m[0] ? m[0].trim() : '';
            if (raw.replace(/\D/g, '').length >= 7) {
              out.rawPhones.push(raw);
            }
          }
        }
      }
    } catch (e) {}

    // Authority / official website links & Bio/Linktree profiles
    const websiteEl = document.querySelector('a[data-item-id="authority"], a[aria-label*="Website" i], a[data-tooltip*="Open website" i], a[data-tooltip*="website" i], a[data-value="Website"], a[href*="linktr.ee"], a[href*="bio.link"], a[data-item-id="menu"]');
    if (websiteEl) out.website = websiteEl.getAttribute('href') || '';
    if (!out.website) {
      const bioEl = document.querySelector('a[href*="linktr.ee"], a[href*="bio.link"], a[href*="campsite.bio"], a[href*="instagram.com"], a[href*="facebook.com"]');
      if (bioEl) out.website = bioEl.getAttribute('href') || '';
    }

    // Full physical address with street, door, locality, PIN
    const addrEl = document.querySelector('[data-item-id="address"], button[aria-label*="Address:"], button[data-tooltip*="address"]');
    if (addrEl) {
      const label = addrEl.getAttribute('aria-label') || '';
      out.address = label.replace(/^Address:\s*/i, '').trim() || (addrEl.textContent || '').trim();
    }

    const hoursEl = document.querySelector('[data-item-id="oh"]');
    if (hoursEl) {
      const label = hoursEl.getAttribute('aria-label') || '';
      out.hours = label.replace(/^Hours:\s*/i, '').trim() || (hoursEl.textContent || '').trim();
    }

    const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
    if (ratingEl) out.rating = (ratingEl.textContent || '').trim();
    const reviewEl = document.querySelector('div.F7nice span[aria-label*="review"]');
    if (reviewEl) {
      const m = (reviewEl.getAttribute('aria-label') || '').match(/([\d,]+)/);
      if (m) out.reviews = m[1].replace(/,/g, '');
    }

    // The panel title is the only reliable way to prove that a synthesized
    // search URL landed on the business we asked for, not on a different one.
    const nameEl = document.querySelector('h1.DUwDvf, div.fontHeadlineLarge, div[role="main"] h1, h1');
    if (nameEl) {
      const txt = (nameEl.textContent || '').trim();
      if (txt && !/^results$/i.test(txt)) {
        out.placeName = txt;
      }
    }

    return out;
  }).catch(() => ({ rawPhones: [], website: '', address: '', hours: '', rating: '', reviews: '', placeName: '' }));
}

function calculateQualityScore(lead) {
  let score = 0;
  const phone = lead.phone || '';
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length >= 10 && !phone.toLowerCase().includes('require') && !phone.toLowerCase().includes('lookup')) {
    score += 35;
  }
  if (lead.whatsappAvailable || cleanPhone.slice(-10).length === 10) {
    score += 15;
  }
  if (lead.address && lead.address.length > 10) {
    score += 15;
  }
  if (lead.website && lead.website.startsWith('http') && !lead.website.includes('google.com')) {
    score += 15;
  }
  if (lead.email && lead.email.includes('@')) {
    score += 10;
  }
  if (lead.instagram || lead.facebook) {
    score += 5;
  }
  if (lead.rating && Number(lead.rating) >= 4.0) {
    score += 5;
  }
  if (lead.gstin || lead.contactPerson) {
    score += 5;
  }
  return Math.min(100, Math.max(10, score));
}

function determineTier(score) {
  if (score >= 80) return 'Platinum';
  if (score >= 60) return 'Gold';
  if (score >= 40) return 'Silver';
  return 'Bronze';
}

function pickNumbers(rawValues, countryCode = 'IN') {
  const all = [];
  for (const raw of rawValues || []) {
    if (!raw) continue;
    let parsed = normalizePhone(raw, { context: 'phone tel', defaultCountry: countryCode, allowInternational: true });
    
    // Fallback: If not parsed, try removing leading zero trunk for national format or stripping punctuation
    if (!parsed) {
      const stripped = String(raw).replace(/\D+/g, '');
      if (countryCode === 'IN') {
        if (stripped.length === 11 && stripped.startsWith('0')) {
          parsed = normalizePhone(stripped.slice(1), { defaultCountry: 'IN' });
        } else if (stripped.length === 12 && stripped.startsWith('91')) {
          parsed = normalizePhone('+' + stripped, { defaultCountry: 'IN' });
        } else if (stripped.length === 10) {
          parsed = normalizePhone(stripped, { defaultCountry: 'IN' });
        }
      } else if (countryCode === 'GB' && stripped.startsWith('0')) {
        parsed = normalizePhone('+44' + stripped.slice(1), { defaultCountry: 'GB' });
      } else if (countryCode === 'AU' && stripped.startsWith('0')) {
        parsed = normalizePhone('+61' + stripped.slice(1), { defaultCountry: 'AU' });
      } else if (countryCode === 'US' && stripped.length === 10) {
        parsed = normalizePhone('+1' + stripped, { defaultCountry: 'US' });
      }
    }

    if (!parsed) {
      parsed = normalizePhone(raw, { allowInternational: true });
    }

    if (!parsed) continue;
    if (all.some(p => p.national === parsed.national || p.e164 === parsed.e164)) continue;
    all.push(parsed);
  }
  all.sort((a, b) => Number(b.isMobile) - Number(a.isMobile));
  return all;
}

async function openDetailPage(context, url, leadOrName = '') {
  const leadObj = typeof leadOrName === 'object' && leadOrName !== null ? leadOrName : { name: String(leadOrName || '') };
  const expectedName = leadObj.name || '';
  const page = await context.newPage();
  await applyAdvancedStealth(page).catch(() => {});
  await optimizePageForSpeed(page).catch(() => {});
  const target = url.includes('hl=') ? url : `${url}${url.includes('?') ? '&' : '?'}hl=en`;
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS }).catch(() => {});
  await Promise.race([
    page.waitForSelector('[data-item-id^="phone:tel:"], button[aria-label*="Phone" i], button[aria-label*="Call" i], a[href^="tel:"], div.Io6YTe, button.CsEnBe', { timeout: 6000 }),
    page.waitForSelector('[data-item-id="address"]', { timeout: 6000 }),
    page.waitForSelector('div.Nv2PK', { timeout: 4000 })
  ]).catch(() => {});

  // A synthesized name search usually opens a result list. Click the card that
  // actually matches this lead's name or address/locality instead of blindly taking the first one.
  const cards = await page.$$('div.Nv2PK').catch(() => []);
  if (cards.length) {
    let chosen = null;
    if (expectedName) {
      for (const card of cards.slice(0, 10)) {
        const text = await card.innerText().catch(() => '');
        if (text && isLeadPlaceMatch(leadObj, { address: text, placeName: text }, text)) { chosen = card; break; }
      }
    }
    if (!chosen) chosen = cards[0];
    const clickable = (await chosen.$('a.hfpxzc').catch(() => null)) || chosen;
    await clickable.click().catch(() => {});
    await Promise.race([
      page.waitForSelector('h1.DUwDvf, div[role="main"] h1', { timeout: 3500 }),
      page.waitForSelector('[data-item-id^="phone:tel:"], button[aria-label*="Phone" i], button[aria-label*="Call" i], a[href^="tel:"], div.Io6YTe, button.CsEnBe', { timeout: 3500 }),
      page.waitForFunction(() => window.location.href.includes('/maps/place/'), { timeout: 3500 })
    ]).catch(() => {});
  }

  // Give the panel a beat to hydrate after the selector appears.
  await page.waitForTimeout(250).catch(() => {});
  try {
    await page.waitForFunction(() => {
      const text = document.body?.innerText || '';
      return /(?:(?:\+|00)[1-9]\d{0,3}|\b[6-9]\d{4}|\b[2-9]\d{2})[\s-]?\d{3,5}/.test(text) ||
             document.querySelector('[data-item-id^="phone:tel:"], a[href^="tel:"], a[href*="wa.me"], button[aria-label*="Phone" i], button[aria-label*="Call" i], div.Io6YTe, button.CsEnBe');
    }, { timeout: 1500 }).catch(() => {});
  } catch (e) {}
  return page;
}

/**
 * @param {object} options
 * @param {Array} options.leads            lead objects (shared with the DB store)
 * @param {string} options.sessionId
 * @param {number} [options.budgetMs]
 * @param {number} [options.concurrency]
 * @param {(vendor:object, type:string)=>void} [options.emit]
 * @param {(message:string)=>void} [options.log]
 */
async function backfillPhones(leadsOrOptions = {}, maybeOptions = {}) {
  let leads = [];
  let options = {};
  if (Array.isArray(leadsOrOptions)) {
    leads = leadsOrOptions;
    options = maybeOptions || {};
  } else {
    options = leadsOrOptions || {};
    leads = Array.isArray(options.leads) ? options.leads : [];
  }
  const sessionId = options.sessionId || '';
  const budgetMs = Math.max(10_000, Number(options.budgetMs) || DEFAULT_BUDGET_MS);
  const concurrency = Math.max(1, Math.min(10, Number(options.concurrency) || DEFAULT_CONCURRENCY));
  const emit = typeof options.emit === 'function' ? options.emit : (typeof options.onProgress === 'function' ? options.onProgress : () => {});
  const log = typeof options.log === 'function' ? options.log : (typeof options.addLog === 'function' ? options.addLog : () => {});
  const shouldAbort = typeof options.shouldAbort === 'function' ? options.shouldAbort : () => false;
  const startedAt = Date.now();

  let candidates = leads
    .map(lead => {
      if (!lead) return null;
      let url = lead.mapsLink || lead.googleMapsUrl || lead.sourceUrl || '';
      const synthesized = (!url || !url.includes('google.')) && Boolean(lead.name);
      if (synthesized) {
        url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.name} ${lead.address || lead.city || ''}`)}`;
      }
      return { lead, url, synthesized };
    })
    .filter(item => {
      if (!item || !item.url) return false;
      const { lead } = item;
      const needsPhone = !hasValidMobile(lead.phone, countryForLead(lead));
      const needsProfile = !lead.website || !lead.address || lead.address === 'Unknown' || !lead.operatingHours;
      return needsPhone || needsProfile;
    })
    .sort((a, b) => Number(!hasValidMobile(a.lead.phone, countryForLead(a.lead))) === Number(!hasValidMobile(b.lead.phone, countryForLead(b.lead)))
      ? 0
      : (hasValidMobile(a.lead.phone, countryForLead(a.lead)) ? 1 : -1));

  if (options.maxLeads && Number.isFinite(options.maxLeads) && options.maxLeads > 0) {
    candidates = candidates.slice(0, options.maxLeads);
  }

  const summary = {
    sessionId,
    candidates: candidates.length,
    attempted: 0,
    filled: 0,
    mobilesFound: 0,
    landlinesFound: 0,
    timedOut: 0,
    elapsedMs: 0,
    budgetMs
  };

  if (!candidates.length) {
    summary.elapsedMs = Date.now() - startedAt;
    return summary;
  }

  const browser = await getBrowser();
  if (!browser) {
    log('[Phone Backfill] Browser unavailable, skipping place-detail pass.');
    summary.elapsedMs = Date.now() - startedAt;
    return summary;
  }

  let context = null;
  try {
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' }
    });

    let cursor = 0;

    const worker = async () => {
      while (Date.now() - startedAt < budgetMs && !shouldAbort()) {
        const index = cursor++;
        if (index >= candidates.length) return;
        const { lead, url, synthesized } = candidates[index];

        let page = null;
        try {
          page = await openDetailPage(context, url, lead);
          const details = await readPlaceDetails(page);

          // A synthesized name search can open a different business. Never copy
          // a stranger's number into this lead.
          if (synthesized) {
            const isPlacePage = /\/maps\/place\//.test(page.url());
            let panelName = details.placeName || '';
            if (!panelName && isPlacePage) {
              const match = page.url().match(/\/maps\/place\/([^/@?]+)/);
              if (match) panelName = decodeURIComponent(match[1].replace(/\+/g, ' '));
            }
            if (panelName && !isLeadPlaceMatch(lead, details, panelName)) {
              log(`[Phone Backfill] Skipped "${lead.name}" — search opened "${panelName}" instead.`);
              continue;
            }
            if (!panelName && !isPlacePage && details.rawPhones.length === 0) {
              log(`[Phone Backfill] Skipped "${lead.name}" — no detail place opened.`);
              continue;
            }
          }

          const countryCode = countryForLead(lead);
          const numbers = pickNumbers(details.rawPhones, countryCode);
          summary.attempted++;

          const mobiles = numbers.filter(n => n.isMobile);
          const landlines = numbers.filter(n => n.isLandline);
          const existingPhones = Array.isArray(lead.phones) ? lead.phones : [];
          const formatted = numbers.map(n => n.displayPhone || n.e164);
          const mergedPhones = [...new Set([...existingPhones, ...formatted])];

          let changed = false;
          const bestPhoneObj = mobiles[0] || landlines[0] || numbers[0];
          if (bestPhoneObj && !lead.phone) {
            lead.phone = bestPhoneObj.isMobile
              ? bestPhoneObj.e164
              : (bestPhoneObj.displayPhone || bestPhoneObj.e164);
            lead.phoneType = bestPhoneObj.isMobile ? 'mobile' : 'landline';
            lead.isMobile = Boolean(bestPhoneObj.isMobile);
            lead.isLandline = Boolean(!bestPhoneObj.isMobile);
            lead.callUrl = bestPhoneObj.callUrl || `tel:${bestPhoneObj.digits || bestPhoneObj.national}`;
            if (bestPhoneObj.isMobile) {
              lead.whatsappAvailable = true;
              lead.whatsappLink = `https://wa.me/${bestPhoneObj.digits}`;
            }
            lead.verified = true;
            lead.aiVerified = true;
            changed = true;
          } else if (mobiles.length && !hasValidMobile(lead.phone, countryCode)) {
            lead.phone = mobiles[0].e164;
            lead.phoneType = 'mobile';
            lead.isMobile = true;
            lead.isLandline = false;
            lead.whatsappAvailable = true;
            lead.whatsappLink = `https://wa.me/${mobiles[0].digits}`;
            lead.callUrl = `tel:${mobiles[0].digits}`;
            lead.verified = true;
            lead.aiVerified = true;
            changed = true;
          }
          if (mergedPhones.length !== existingPhones.length) {
            lead.phones = mergedPhones;
            changed = true;
          }
          if (!lead.phoneType && numbers[0]) {
            lead.phoneType = numbers[0].isMobile ? 'mobile' : 'landline';
            changed = true;
          }
          // Same page also carries the website, full address and hours that the
          // feed card often truncates or omits.
          if (details.website && !lead.website) { lead.website = details.website; changed = true; }
          if (details.address && (!lead.address || lead.address.length < 12)) { lead.address = details.address; changed = true; }
          if (details.hours && !lead.operatingHours) { lead.operatingHours = details.hours; changed = true; }
          if (details.rating && !lead.rating) { lead.rating = Number(details.rating) || lead.rating; changed = true; }
          if (details.reviews && !lead.reviewsCount) { lead.reviewsCount = Number(details.reviews) || lead.reviewsCount; changed = true; }

          // Fast Deep Website & Asset Extraction
          const effectiveUrl = lead.website || details.website;
          if (effectiveUrl && effectiveUrl.startsWith('http') && !effectiveUrl.includes('google.com')) {
            try {
              const { fastWebsiteExtract } = require('../utils/fastWebsiteExtractor');
              const webData = await Promise.race([
                fastWebsiteExtract(effectiveUrl, lead.name, { defaultCountry: countryCode, allowInternational: countryCode !== 'IN' }),
                new Promise(res => setTimeout(() => res(null), 1500))
              ]);
              if (webData) {
                if (webData.emails && webData.emails.length > 0) {
                  lead.emails = [...new Set([...(lead.emails || []), ...webData.emails])];
                  lead.email = lead.emails[0] || lead.email;
                  changed = true;
                }
                if (webData.instagram && !lead.instagram) { lead.instagram = webData.instagram; changed = true; }
                if (webData.facebook && !lead.facebook) { lead.facebook = webData.facebook; changed = true; }
                if (webData.logo && !lead.logo) { lead.logo = webData.logo; lead.avatar = webData.logo; changed = true; }
                if (webData.phones && webData.phones.length > 0) {
                  const morePhones = pickNumbers(webData.phones, countryCode);
                  if (morePhones.length > 0) {
                    const newMobiles = morePhones.filter(n => n.isMobile);
                    if (newMobiles.length && !hasValidMobile(lead.phone, countryCode)) {
                      lead.phone = newMobiles[0].e164;
                      lead.whatsappAvailable = true;
                      lead.whatsappLink = `https://wa.me/${newMobiles[0].digits}`;
                      lead.verified = true;
                      changed = true;
                    }
                    const moreFormatted = morePhones.map(n => n.displayPhone || n.e164);
                    lead.phones = [...new Set([...(lead.phones || []), ...moreFormatted])];
                    changed = true;
                  }
                }
              }
            } catch (e) {}
          }

          const newScore = calculateQualityScore(lead);
          lead.qualityScore = newScore;
          lead.tier = determineTier(newScore);

          if (changed) {
            lead.phoneSource = lead.phoneSource || (mobiles.length ? 'google-place-detail' : lead.phoneSource);
            lead.profileEnrichedAt = new Date().toISOString();
            lead.phoneBackfillAt = lead.profileEnrichedAt;
            lead.lastScrapedAt = lead.profileEnrichedAt;
            summary.filled++;
            if (mobiles.length) summary.mobilesFound++;
            else if (numbers.length) summary.landlinesFound++;

            try {
              const vendorId = lead.id;
              const stored = dbAdapter.getVendors().find(v => v.id === vendorId);
              if (stored) {
                Object.assign(stored, {
                  phone: lead.phone,
                  phones: lead.phones,
                  whatsappAvailable: lead.whatsappAvailable,
                  whatsappLink: lead.whatsappLink,
                  verified: lead.verified,
                  aiVerified: lead.aiVerified,
                  phoneType: lead.phoneType,
                  phoneSource: lead.phoneSource,
                  profileEnrichedAt: lead.profileEnrichedAt,
                  website: lead.website,
                  address: lead.address,
                  operatingHours: lead.operatingHours,
                  rating: lead.rating,
                  reviewsCount: lead.reviewsCount,
                  email: lead.email,
                  emails: lead.emails,
                  instagram: lead.instagram,
                  facebook: lead.facebook,
                  logo: lead.logo,
                  avatar: lead.avatar || lead.logo,
                  qualityScore: lead.qualityScore,
                  tier: lead.tier
                });
                dbAdapter.saveVendor(stored.userId || lead.userId || 'admin_1', stored);
              }
            } catch (error) {
              log(`[Phone Backfill] Could not persist ${lead.name}: ${error.message}`);
            }

            emit(lead, 'updated');
            if (mobiles.length) log(`[Phone Backfill] 📞 ${lead.name}: ${mobiles[0].e164}`);
          }
        } catch (error) {
          // A single bad place page must never stop the pass.
        } finally {
          if (page) await page.close().catch(() => {});
        }
      }

      summary.timedOut = Math.max(0, candidates.length - summary.attempted);
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  } catch (error) {
    log(`[Phone Backfill] Pass failed: ${error.message}`);
  } finally {
    if (context) await context.close().catch(() => {});
    summary.elapsedMs = Date.now() - startedAt;
  }

  log(`[Phone Backfill] Done: ${summary.filled}/${summary.candidates} leads completed with a phone (${summary.mobilesFound} mobile, ${summary.landlinesFound} landline) in ${Math.round(summary.elapsedMs / 1000)}s.`);
  return summary;
}

/**
 * Real-Time Streaming Enrichment Worker
 * Enriches leads concurrently as they are harvested, so the UI updates with +91 mobiles
 * and full street addresses in 1-2 seconds without waiting for the swarm to end.
 */
class StreamingEnrichmentManager {
  constructor() {
    this.sessionId = null;
    this.queue = [];
    this.seenIds = new Set();
    this.seenWebsites = new Set();
    this.active = false;
    this.browser = null;
    this.context = null;
    this.emit = () => {};
    this.log = () => {};
    this.activeWorkers = 0;
    this.maxConcurrency = browserBudget.ENRICH_RESERVE || 2;
    this.retryTimer = null;
    this.unsubscribeBudget = null;
  }

  async start({ sessionId, emit, log, concurrency }) {
    this.sessionId = sessionId;
    this.emit = typeof emit === 'function' ? emit : () => {};
    this.log = typeof log === 'function' ? log : () => {};
    this.queue = [];
    this.seenIds = new Set();
    this.seenWebsites = new Set();
    this.active = true;
    // Enrichment never gets more than the reserved share of the one browser
    // budget. The old 8/10 workers fought the zone swarm for the same cores.
    this.maxConcurrency = Math.max(
      1,
      Math.min(browserBudget.ENRICH_RESERVE || 4, Number(concurrency) || 4)
    );

    if (this.unsubscribeBudget) {
      try { this.unsubscribeBudget(); } catch (e) {}
      this.unsubscribeBudget = null;
    }
    this.unsubscribeBudget = browserBudget.onSlotChange(() => this._pump());
    browserBudget.setEnrichmentActive(0);
    
    try {
      this.browser = await getBrowser();
      if (this.browser) {
        this.context = await this.browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          viewport: { width: 1280, height: 900 },
          locale: 'en-US',
          extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' }
        });
      }
    } catch (e) {
      this.log(`[Realtime Streamer] Browser context init: ${e.message}`);
    }
  }

  enqueue(lead) {
    if (!this.active || !lead) return;
    const leadId = lead.id || lead.name;

    // 1. Parallel Fast Website & Asset Scraping (<800ms Cheerio, Zero Playwright overhead)
    const websiteUrl = lead.website || '';
    if (websiteUrl && websiteUrl.startsWith('http') && !websiteUrl.includes('google.com') && !this.seenWebsites.has(websiteUrl)) {
      this.seenWebsites.add(websiteUrl);
      this._processWebsite(lead, websiteUrl).catch(() => {});
    }

    if (this.seenIds.has(leadId)) return;
    
    // 2. Playwright Google Maps Place Detail Probe (Parallel resolution across ALL engines)
    let url = lead.mapsLink || lead.googleMapsUrl || '';
    if (!url || (!url.includes('google.') && !url.includes('goo.gl'))) {
      const queryPart = [lead.name, lead.address || lead.locality || lead.city || ''].filter(Boolean).join(' ');
      url = `https://www.google.com/maps/search/${encodeURIComponent(queryPart)}?hl=en`;
      lead.mapsLink = url;
    }
    
    const needsMobile = !hasValidMobile(lead.phone, countryForLead(lead));
    const needsAddress = !lead.address || lead.address.length < 15;
    const needsWebsite = !lead.website || !lead.website.startsWith('http');
    if (!needsMobile && !needsAddress && !needsWebsite) return;

    this.seenIds.add(leadId);
    this.queue.push(lead);
    this._pump();
  }

  /**
   * Start enrichment workers only while the shared browser budget has a free
   * slot. If discovery is using all five, the lead waits a few hundred ms
   * instead of opening a sixth Chromium page.
   */
  _pump() {
    if (!this.active || !this.context) return;
    if (!this.queue.length) return;
    if (this.activeWorkers >= this.maxConcurrency) return;

    if (browserBudget.enrichmentLimit() <= 0) {
      this._scheduleRetry();
      return;
    }

    this._spawnWorker();
    if (this.activeWorkers < this.maxConcurrency && this.queue.length) {
      // A slot may still be free for a second worker.
      this._pump();
    }
  }

  _scheduleRetry() {
    if (this.retryTimer || !this.active) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this._pump();
    }, 500);
    if (typeof this.retryTimer.unref === 'function') this.retryTimer.unref();
  }

  async _processWebsite(lead, url) {
    if (!url || !url.startsWith('http')) return;
    try {
      const { fastWebsiteExtract } = require('../utils/fastWebsiteExtractor');
      const countryCode = countryForLead(lead);
      const webData = await fastWebsiteExtract(url, lead.name, { defaultCountry: countryCode, allowInternational: countryCode !== 'IN' });
      if (!webData) return;

      let changed = false;
      if (Array.isArray(webData.emails) && webData.emails.length > 0) {
        lead.emails = [...new Set([...(Array.isArray(lead.emails) ? lead.emails : []), ...webData.emails])];
        if (!lead.email && lead.emails[0]) {
          lead.email = lead.emails[0];
          changed = true;
        }
      }
      if (webData.instagram && !lead.instagram) { lead.instagram = webData.instagram; changed = true; }
      if (webData.facebook && !lead.facebook) { lead.facebook = webData.facebook; changed = true; }
      if (webData.linkedin && !lead.linkedin) { lead.linkedin = webData.linkedin; changed = true; }
      if (webData.logo && !lead.logo) { lead.logo = webData.logo; lead.avatar = lead.avatar || webData.logo; changed = true; }
      if (webData.contactPerson && !lead.contactPerson) { lead.contactPerson = webData.contactPerson; changed = true; }
      if (webData.pincode && !lead.pincode) { lead.pincode = webData.pincode; changed = true; }
      if (webData.whatsappLink && !lead.whatsappLink) {
        lead.whatsappLink = webData.whatsappLink;
        lead.whatsappAvailable = true;
        changed = true;
      }

      if (Array.isArray(webData.phones) && webData.phones.length > 0) {
        const moreNumbers = pickNumbers(webData.phones, countryCode);
        if (moreNumbers.length > 0) {
          const newMobiles = moreNumbers.filter(n => n.isMobile);
          const newLandlines = moreNumbers.filter(n => n.isLandline);
          const bestPhone = newMobiles[0] || newLandlines[0] || moreNumbers[0];

          if (bestPhone && !lead.phone) {
            lead.phone = bestPhone.isMobile ? bestPhone.e164 : (bestPhone.displayPhone || bestPhone.e164);
            lead.phoneType = bestPhone.isMobile ? 'mobile' : 'landline';
            lead.callUrl = bestPhone.callUrl || `tel:${bestPhone.digits || bestPhone.national}`;
            if (bestPhone.isMobile) {
              lead.whatsappAvailable = true;
              lead.whatsappLink = `https://wa.me/${bestPhone.digits}`;
            }
            lead.verified = true;
            changed = true;
          } else if (newMobiles.length && !hasValidMobile(lead.phone, countryCode)) {
            lead.phone = newMobiles[0].e164;
            lead.phoneType = 'mobile';
            lead.whatsappAvailable = true;
            lead.whatsappLink = `https://wa.me/${newMobiles[0].digits}`;
            lead.callUrl = `tel:${newMobiles[0].digits}`;
            lead.verified = true;
            changed = true;
          }
          const formatted = moreNumbers.map(n => n.displayPhone || n.e164);
          lead.phones = [...new Set([...(Array.isArray(lead.phones) ? lead.phones : []), ...formatted])];
          changed = true;
        }
      }

      if (changed) {
        const newScore = calculateQualityScore(lead);
        lead.qualityScore = newScore;
        lead.tier = determineTier(newScore);
        lead.websiteEnrichedAt = new Date().toISOString();

        try {
          const allVendors = dbAdapter.getVendors();
          const stored = allVendors.find(v => v.id === lead.id || (v.name === lead.name && v.sessionId === lead.sessionId));
          // If the lead is not in the store yet, persist the enriched copy
          // instead of throwing the work away.
          const target = stored || lead;
          Object.assign(target, {
            email: lead.email,
            emails: lead.emails,
            instagram: lead.instagram,
            facebook: lead.facebook,
            linkedin: lead.linkedin,
            logo: lead.logo,
            avatar: lead.avatar || lead.logo,
            phone: lead.phone,
            phoneType: lead.phoneType || target.phoneType,
            callUrl: lead.callUrl || target.callUrl,
            phones: lead.phones,
            whatsappAvailable: lead.whatsappAvailable,
            whatsappLink: lead.whatsappLink,
            contactPerson: lead.contactPerson || target.contactPerson,
            pincode: lead.pincode || target.pincode,
            qualityScore: lead.qualityScore,
            tier: lead.tier,
            websiteEnrichedAt: lead.websiteEnrichedAt
          });
          dbAdapter.saveVendor(target.userId || lead.userId || 'admin_1', target);
        } catch (e) {}

        this.emit(lead, 'updated');
        this.log(`[Web Scout] 🌐 ${lead.name} enriched from ${url}: ${lead.email || 'No email'} · ${lead.instagram || lead.facebook || 'Social synced'}`);
      }
    } catch (err) {
      // Ignore fast website scrape errors
    }
  }

  async _spawnWorker() {
    if (!this.active || !this.context) return;
    if (this.activeWorkers >= this.maxConcurrency) return;
    if (browserBudget.enrichmentLimit() <= 0) {
      this._scheduleRetry();
      return;
    }

    this.activeWorkers++;
    browserBudget.setEnrichmentActive(this.activeWorkers);

    while (this.active && this.queue.length > 0) {
      const lead = this.queue.shift();
      if (!lead) continue;

      let page = null;
      try {
        const url = lead.mapsLink || lead.googleMapsUrl || lead.sourceUrl;
        page = await openDetailPage(this.context, url, lead);
        const details = await readPlaceDetails(page);
        const countryCode = countryForLead(lead);
        const numbers = pickNumbers(details.rawPhones, countryCode);
        const mobiles = numbers.filter(n => n.isMobile);
        const landlines = numbers.filter(n => n.isLandline);
        const existingPhones = Array.isArray(lead.phones) ? lead.phones : [];
        const formatted = numbers.map(n => n.displayPhone || n.e164);
        const mergedPhones = [...new Set([...existingPhones, ...formatted])];

        let changed = false;
        const bestPhoneObj = mobiles[0] || landlines[0] || numbers[0];
        if (bestPhoneObj && !lead.phone) {
          lead.phone = bestPhoneObj.isMobile
            ? bestPhoneObj.e164
            : (bestPhoneObj.displayPhone || bestPhoneObj.e164);
          lead.phoneType = bestPhoneObj.isMobile ? 'mobile' : 'landline';
          lead.isMobile = Boolean(bestPhoneObj.isMobile);
          lead.isLandline = Boolean(!bestPhoneObj.isMobile);
          lead.callUrl = bestPhoneObj.callUrl || `tel:${bestPhoneObj.digits || bestPhoneObj.national}`;
          if (bestPhoneObj.isMobile) {
            lead.whatsappAvailable = true;
            lead.whatsappLink = `https://wa.me/${bestPhoneObj.digits}`;
          }
          lead.verified = true;
          lead.aiVerified = true;
          changed = true;
        } else if (mobiles.length && !hasValidMobile(lead.phone, countryCode)) {
          lead.phone = mobiles[0].e164;
          lead.phoneType = 'mobile';
          lead.isMobile = true;
          lead.isLandline = false;
          lead.whatsappAvailable = true;
          lead.whatsappLink = `https://wa.me/${mobiles[0].digits}`;
          lead.callUrl = `tel:${mobiles[0].digits}`;
          lead.verified = true;
          lead.aiVerified = true;
          changed = true;
        }
        if (mergedPhones.length !== existingPhones.length) {
          lead.phones = mergedPhones;
          changed = true;
        }
        if (!lead.phoneType && numbers[0]) {
          lead.phoneType = numbers[0].isMobile ? 'mobile' : 'landline';
          changed = true;
        }
        if (details.website && !lead.website) { lead.website = details.website; changed = true; }
        if (details.address && (!lead.address || lead.address.length < 15)) { lead.address = details.address; changed = true; }
        if (details.hours && !lead.operatingHours) { lead.operatingHours = details.hours; changed = true; }
        if (details.rating && !lead.rating) { lead.rating = Number(details.rating) || lead.rating; changed = true; }
        if (details.reviews && !lead.reviewsCount) { lead.reviewsCount = Number(details.reviews) || lead.reviewsCount; changed = true; }

        // Fast Deep Website & Asset Extraction
        const effectiveUrl = lead.website || details.website;
        if (effectiveUrl && effectiveUrl.startsWith('http') && !effectiveUrl.includes('google.com')) {
          try {
            const { fastWebsiteExtract } = require('../utils/fastWebsiteExtractor');
            const webData = await fastWebsiteExtract(effectiveUrl, lead.name, { defaultCountry: countryCode, allowInternational: countryCode !== 'IN' });
            if (webData) {
              if (webData.emails && webData.emails.length > 0) {
                lead.emails = [...new Set([...(lead.emails || []), ...webData.emails])];
                lead.email = lead.emails[0] || lead.email;
                changed = true;
              }
              if (webData.instagram && !lead.instagram) { lead.instagram = webData.instagram; changed = true; }
              if (webData.facebook && !lead.facebook) { lead.facebook = webData.facebook; changed = true; }
              if (webData.linkedin && !lead.linkedin) { lead.linkedin = webData.linkedin; changed = true; }
              if (webData.logo && !lead.logo) { lead.logo = webData.logo; lead.avatar = webData.logo; changed = true; }
              if (webData.contactPerson && !lead.contactPerson) { lead.contactPerson = webData.contactPerson; changed = true; }
              if (webData.pincode && !lead.pincode) { lead.pincode = webData.pincode; changed = true; }
              if (webData.whatsappLink && !lead.whatsappLink) {
                lead.whatsappLink = webData.whatsappLink;
                lead.whatsappAvailable = true;
                changed = true;
              }
              if (webData.phones && webData.phones.length > 0) {
                const morePhones = pickNumbers(webData.phones, countryCode);
                if (morePhones.length > 0) {
                  const newMobiles = morePhones.filter(n => n.isMobile);
                  if (newMobiles.length && !hasValidMobile(lead.phone, countryCode)) {
                    lead.phone = newMobiles[0].e164;
                    lead.whatsappAvailable = true;
                    lead.whatsappLink = `https://wa.me/${newMobiles[0].digits}`;
                    lead.verified = true;
                    changed = true;
                  }
                  const moreFormatted = morePhones.map(n => n.displayPhone || n.e164);
                  lead.phones = [...new Set([...(lead.phones || []), ...moreFormatted])];
                  changed = true;
                }
              }
            }
          } catch (e) {}
        }

        // Recalculate lead quality score & tier
        const newScore = calculateQualityScore(lead);
        lead.qualityScore = newScore;
        lead.tier = determineTier(newScore);

        if (changed) {
          lead.phoneSource = lead.phoneSource || (mobiles.length ? 'google-place-detail' : lead.phoneSource);
          lead.profileEnrichedAt = new Date().toISOString();
          lead.phoneBackfillAt = lead.profileEnrichedAt;
          lead.lastScrapedAt = lead.profileEnrichedAt;

          try {
            const allVendors = dbAdapter.getVendors();
            const stored = allVendors.find(v => v.id === lead.id || (v.name === lead.name && v.sessionId === lead.sessionId));
            const target = stored || lead;
            Object.assign(target, {
              phone: lead.phone,
              phones: lead.phones,
              whatsappAvailable: lead.whatsappAvailable,
              whatsappLink: lead.whatsappLink,
              verified: lead.verified,
              aiVerified: lead.aiVerified,
              phoneType: lead.phoneType,
              phoneSource: lead.phoneSource,
              profileEnrichedAt: lead.profileEnrichedAt,
              website: lead.website,
              address: lead.address,
              operatingHours: lead.operatingHours,
              rating: lead.rating,
              reviewsCount: lead.reviewsCount,
              email: lead.email,
              emails: lead.emails,
              instagram: lead.instagram,
              facebook: lead.facebook,
              logo: lead.logo,
              avatar: lead.avatar || lead.logo,
              gstin: lead.gstin || target.gstin,
              contactPerson: lead.contactPerson || target.contactPerson,
              pincode: lead.pincode || target.pincode,
              qualityScore: lead.qualityScore,
              tier: lead.tier
            });
            dbAdapter.saveVendor(target.userId || lead.userId || 'admin_1', target);
            this.emit(target, 'updated');
          } catch (e) {}

          if (mobiles.length) {
            this.log(`[Realtime Scout] 📞 ${lead.name}: ${mobiles[0].e164}${lead.whatsappAvailable ? ' (WhatsApp)' : ''}${lead.website ? ` · ${lead.website}` : ''}`);
          }
        }
      } catch (err) {
        // Individual page error
      } finally {
        if (page) await page.close().catch(() => {});
      }
    }

    this.activeWorkers--;
    browserBudget.setEnrichmentActive(this.activeWorkers);
    if (this.queue.length) this._pump();
  }

  async drain(timeoutMs = 60000) {
    const start = Date.now();
    while ((this.queue.length > 0 || this.activeWorkers > 0) && (Date.now() - start < timeoutMs)) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  async stop(force = false) {
    if (!force && (this.queue.length > 0 || this.activeWorkers > 0)) {
      await this.drain(30000).catch(() => {});
    }
    this.active = false;
    this.queue = [];
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.unsubscribeBudget) {
      try { this.unsubscribeBudget(); } catch (e) {}
      this.unsubscribeBudget = null;
    }
    this.activeWorkers = 0;
    browserBudget.setEnrichmentActive(0);
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
  }
}

const streamingEnricher = new StreamingEnrichmentManager();

const { fastWebsiteExtract } = require('../utils/fastWebsiteExtractor');

module.exports = { backfillPhones, hasValidMobile, countryForLead, streamingEnricher, calculateQualityScore, determineTier, fastWebsiteExtract, __internals: { openDetailPage, readPlaceDetails, getBrowser, namesLikelyMatch, isLeadPlaceMatch } };
