/**
 * engine-web-discovery.js — autonomous, legal web discovery for any country.
 *
 * What it does:
 *   1. Searches a public search engine (Bing HTML) for "<category> in <place>".
 *   2. Keeps real business websites; drops directories, social networks and
 *      aggregators (they are handled by their own engines, or are blocked).
 *   3. Saves each website as a lead, then hands those leads to the existing
 *      robots-aware `web-contact` engine to read phone/email/address from the
 *      business's own site.
 *
 * Why this shape:
 *   - It works in every country without an API key.
 *   - It never bypasses a bot wall: if Bing or a target site returns a challenge,
 *     the engine stops and reports it.
 *   - The business's own website is the most reliable public source of a phone
 *     number, so this is the backbone of western coverage when a directory
 *     blocks automated access.
 */

const { getBrowser } = require('./browserFactory');
const dv = require('./directoryVendor');
const { scrapeWebContact, setDeps: setWebContactDeps } = require('./engine-web-contact');
const { extractPhones } = require('../utils/phoneUtils');

const deps = {
  logger: console.log,
  emitVendorEvent: null,
  abortSignal: null
};

function setDeps(next = {}) {
  if (next.logger) deps.logger = next.logger;
  if (next.emitVendorEvent) deps.emitVendorEvent = next.emitVendorEvent;
  if (next.abortSignal) deps.abortSignal = next.abortSignal;
}

// Aggregators, social networks and directories. They are either handled by a
// dedicated engine or blocked; keeping them out of discovery avoids junk rows.
const EXCLUDED_HOSTS = [
  'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com',
  'youtube.com', 'pinterest.com', 'tiktok.com', 'reddit.com', 'quora.com',
  'wikipedia.org', 'wikimedia.org', 'tripadvisor.com', 'yelp.com', 'yellowpages.com',
  'yellowpages.ca', 'yellowpages.com.au', 'yellowpages.co.nz', 'yellowpages.co.za',
  'yellowpages-uae.com', 'yellowpages.com.sg', 'yellowpages.my', 'yell.com',
  'justdial.com', 'indiamart.com', 'sulekha.com', 'tradeindia.com', 'thomasnet.com',
  'bbb.org', 'manta.com', 'mapquest.com', 'foursquare.com', 'healthgrades.com',
  'zocdoc.com', 'thumbtack.com', 'angi.com', 'houzz.com', 'glassdoor.com',
  'indeed.com', 'amazon.com', 'flipkart.com', 'ebay.com', 'booking.com',
  'agoda.com', 'makemytrip.com', 'goibibo.com', 'zomato.com', 'swiggy.com'
];

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch (e) {
    return '';
  }
}

function isExcluded(url) {
  const host = hostOf(url);
  if (!host) return true;
  return EXCLUDED_HOSTS.some(blocked => host === blocked || host.endsWith(`.${blocked}`));
}

function unwrapBingUrl(raw) {
  if (!raw) return '';
  try {
    if (!/bing\.com/i.test(raw)) return raw;
    const parsed = new URL(raw);
    const encoded = parsed.searchParams.get('u');
    if (!encoded) return raw;
    let base64 = (encoded.startsWith('a1') ? encoded.slice(2) : encoded)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    return /^https?:\/\//i.test(decoded) ? decoded : raw;
  } catch (e) {
    return raw;
  }
}

function cleanTitle(title) {
  const raw = String(title || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  // "Joe's Plumbing | Austin TX | 24/7" -> "Joe's Plumbing"
  const first = raw.split(/\s*[|·•]\s*|\s+[–—]\s+/)[0].trim();
  return (first || raw).slice(0, 120);
}

async function searchBing(query) {
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en`, {
      waitUntil: 'domcontentloaded',
      timeout: 25000
    });
    try { await page.waitForSelector('li.b_algo', { timeout: 7000 }); } catch (e) {}

    const html = await page.content();
    if (/verify you are a human|unusual traffic|captcha/i.test(html)) {
      deps.logger('[Web Discovery] Bing served a verification page — stopping instead of trying to bypass it.');
      return { rows: [], blocked: true };
    }

    const rows = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('li.b_algo').forEach(el => {
        const link = el.querySelector('h2 a');
        const snippetEl = el.querySelector('.b_caption p') || el.querySelector('.b_algoSlug');
        if (!link) return;
        out.push({
          title: (link.innerText || '').trim(),
          url: link.getAttribute('href') || '',
          snippet: snippetEl ? snippetEl.innerText.trim() : ''
        });
      });
      return out;
    });
    return { rows: rows.map(row => ({ ...row, url: unwrapBingUrl(row.url) })), blocked: false };
  } finally {
    try { await context.close(); } catch (e) {}
  }
}

/**
 * @param {string} category
 * @param {string} location
 * @param {string} sessionId
 * @param {object} opts { countryCode, limit }
 */
async function scrapeWebDiscovery(category, location, sessionId = 'legacy', opts = {}) {
  const country = String(opts.countryCode || 'IN').toUpperCase();
  const limit = Math.max(3, Math.min(15, Number(opts.limit) || 8));
  const place = dv.cleanText(location, 120);
  const phrase = dv.cleanText(category, 80);
  if (!place || !phrase) {
    return { totalScraped: 0, newInserted: 0, updated: 0, phoneCount: 0 };
  }

  const query = `${phrase} in ${place}`;
  deps.logger(`[Web Discovery] Searching public results for "${query}" (${country}).`);

  let rows = [];
  try {
    const result = await searchBing(query);
    if (result.blocked) {
      return { totalScraped: 0, newInserted: 0, updated: 0, phoneCount: 0, blocked: true };
    }
    rows = result.rows;
  } catch (error) {
    deps.logger(`[Web Discovery] Search failed: ${error.message}`);
    return { totalScraped: 0, newInserted: 0, updated: 0, phoneCount: 0, error: error.message };
  }

  const seenHosts = new Set();
  const candidates = [];
  for (const row of rows) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;
    const host = hostOf(row.url);
    if (!host || seenHosts.has(host) || isExcluded(row.url)) continue;
    seenHosts.add(host);
    candidates.push({ ...row, host });
    if (candidates.length >= limit) break;
  }

  deps.logger(`[Web Discovery] ${rows.length} results, ${candidates.length} independent business site(s) kept.`);
  if (!candidates.length) {
    return { totalScraped: 0, newInserted: 0, updated: 0, phoneCount: 0 };
  }

  let created = 0;
  let updated = 0;
  const saved = [];

  for (const candidate of candidates) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;
    if (!/^https?:\/\//i.test(candidate.url)) continue;

    const snippetPhones = extractPhones(candidate.snippet || '', {
      defaultCountry: country,
      allowInternational: true,
      trusted: false,
      context: 'phone contact'
    }).filter(phone => phone.isMobile || phone.isLandline);

    const name = cleanTitle(candidate.title) || `${phrase} in ${place}`;
    const vendor = dv.buildDirectoryVendor({
      prefix: 'web',
      sessionId,
      source: 'Web Discovery',
      sourceEngine: 'web-discovery',
      name,
      category: phrase,
      city: place,
      state: '',
      website: candidate.url,
      profileUrl: candidate.url,
      phones: snippetPhones,
      description: candidate.snippet || '',
      tags: ['web-discovery', 'official-website']
    });

    if (!vendor.name) continue;
    const result = dv.saveDirectoryVendor(vendor, sessionId);
    if (!result.vendor) continue;
    saved.push(result.vendor);
    if (result.created) {
      created += 1;
      try { deps.emitVendorEvent?.(result.vendor, 'inserted'); } catch (e) {}
    } else {
      updated += 1;
      try { deps.emitVendorEvent?.(result.vendor, 'updated'); } catch (e) {}
    }
  }

  // Read the business's own site for the phone/email the snippet did not show.
  let phoneCount = 0;
  if (saved.length) {
    try {
      setWebContactDeps({ logger: deps.logger, emitVendorEvent: deps.emitVendorEvent, abortSignal: deps.abortSignal });
      const enriched = await scrapeWebContact(saved, { sessionId, limit: saved.length, budgetMs: 45000 });
      phoneCount = enriched.phones || 0;
    } catch (error) {
      deps.logger(`[Web Discovery] Website enrichment skipped: ${error.message}`);
    }
  }

  deps.logger(`[Web Discovery] Saved ${created} new + ${updated} merged website lead(s), ${phoneCount} phone(s) found on-site.`);
  return {
    totalScraped: candidates.length,
    newInserted: created,
    updated,
    phoneCount
  };
}

module.exports = { scrapeWebDiscovery, setDeps };
