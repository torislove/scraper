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
  'airbnb.com', 'airbnb.co.uk', 'airbnb.co.in', 'airbnb.ca', 'airbnb.com.au',
  'expedia.com', 'hotels.com', 'trivago.com',
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

/**
 * Directory and programmatic-SEO pages rank well for "<trade> in <town>" but are
 * not businesses. A US probe returned meetaphotographer.com, fash.com,
 * pictage.ai and four "best 10" listing pages; saved as leads they would all be
 * junk rows with a directory phone number.
 *
 * Three outcomes:
 *   'drop'   — the host is a directory/aggregator, or the path is a search page
 *   'origin' — a real business using a programmatic landing page; keep the
 *              domain, rewrite the URL to its root
 *   null     — an ordinary business page, keep as found
 */
const AGGREGATOR_HOST_TOKENS = [
  'directory', 'directories', 'listings', 'listing', 'finder', 'find-a', 'nearme',
  'bestphotographer', 'bestpro', 'top10', 'topten', 'compare', 'reviews',
  'marketplace', 'portal', 'aggregator', 'yellowpages', 'whitepages',
  'meetaphotographer', 'pictage', 'fash', 'poptop', 'addtoevent', 'togather',
  'bark', 'thumbtack', 'houzz', 'angi', 'checkatrade', 'trustatrader',
  'threebestrated', 'expertise', 'porch', 'homeadvisor', 'craftjack',
  'eventective', 'partyslate', 'zola', 'theknot', 'weddingwire', 'hitched',
  'guidesforbrides', 'addtocontact', 'cylex', 'bizify', 'hotfrog', 'brownbook',
  'citylocal', 'scoot', 'touchlocal', 'freeindex', 'yell', 'yello', 'golocal'
];

const DROP_PATH = /^\/(search|listings?|directory|directories|results|places|categories|compare|find|profiles?)\b/i;
const ORIGIN_PATH = /\/(near-me|nearby|best-|top-|local|areas?|locations?)\//i;
const LISTING_TITLE = /^(the\s+)?(best|top)\s+\d+|^\d+\s+(best|top)\b|near me\b|find (a|an|the)\b|list of\b/i;

function classifyResultUrl(url, title = '') {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    return 'drop';
  }
  const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
  if (isExcluded(url)) return 'drop';

  const hostToken = AGGREGATOR_HOST_TOKENS.find(token => host.includes(token));
  if (hostToken) return 'drop';
  if (DROP_PATH.test(parsed.pathname)) return 'drop';
  if (LISTING_TITLE.test(String(title || '').trim())) return 'drop';
  if (ORIGIN_PATH.test(parsed.pathname)) return 'origin';
  return null;
}

function originOf(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}/`;
  } catch (e) {
    return url;
  }
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

const RELEVANCE_STOP = new Set([
  'the', 'and', 'for', 'with', 'near', 'best', 'top', 'local', 'shop', 'shops',
  'store', 'stores', 'service', 'services', 'company', 'companies', 'agency',
  'agencies', 'centre', 'center', 'business', 'businesses', 'india', 'nearby'
]);

/** "photographers" -> ["photograph", "photogra"] so both "photographer" and
 * "photography" match. A naive prefix chop produced "photographe", which
 * matched neither of the two words a photography business actually uses. */
function stemToken(token) {
  let t = token;
  if (t.endsWith('ies') && t.length > 5) t = `${t.slice(0, -3)}y`;
  else if (t.endsWith('ers') && t.length > 5) t = t.slice(0, -3);
  else if (t.endsWith('er') && t.length > 5) t = t.slice(0, -2);
  else if (t.endsWith('ing') && t.length > 6) t = t.slice(0, -3);
  else if (t.endsWith('es') && t.length > 5) t = t.slice(0, -2);
  else if (t.endsWith('s') && t.length > 4) t = t.slice(0, -1);
  return t;
}

function categoryStems(phrase) {
  const stems = new Set();
  for (const token of String(phrase || '').toLowerCase().split(/[^a-z0-9]+/)) {
    if (token.length < 4 || RELEVANCE_STOP.has(token)) continue;
    const stem = stemToken(token);
    stems.add(stem);
    if (stem.length >= 8) stems.add(stem.slice(0, Math.max(5, stem.length - 2)));
    // "dentists" and "dental" share no suffix, so keep a short word-boundary
    // root. It is matched with \b below, so "student" never matches "dent".
    if (token.length >= 6) stems.add(token.slice(0, 4));
  }
  return [...stems];
}

/**
 * A public search for "photographers in Troy" also returns craft blogs and
 * unrelated shops. Keeping only pages whose title, snippet or host mentions the
 * trade stops junk like "azaleasdolls.com" from becoming a lead.
 */
function isRelevantResult(row, stems) {
  if (!stems.length) return true;
  const haystack = `${row.title || ''} ${row.snippet || ''} ${hostOf(row.url)}`.toLowerCase();
  return stems.some(stem => haystack.includes(stem));
}

function unwrapDdgUrl(raw) {
  if (!raw) return '';
  try {
    if (!/duckduckgo\.com/i.test(raw)) return raw.startsWith('//') ? `https:${raw}` : raw;
    const absolute = raw.startsWith('//') ? `https:${raw}` : raw;
    const parsed = new URL(absolute);
    const target = parsed.searchParams.get('uddg');
    if (!target) return absolute;
    const decoded = decodeURIComponent(target);
    return /^https?:\/\//i.test(decoded) ? decoded : absolute;
  } catch (e) {
    return raw;
  }
}

/**
 * Bing's `cc=`/`mkt=` pair is only honoured from a matching edge node. Served
 * from an Indian IP it answered a `cc=US` query with unrelated summer-travel
 * results, so the market parameters are deliberately omitted: the location is
 * already inside the query string, which is the signal Bing actually ranks on.
 */
function bingSearchUrl(query, page) {
  const firstParam = page > 1 ? `&first=${(page - 1) * 10 + 1}` : '';
  return `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en${firstParam}`;
}

function ddgSearchUrl(query, page) {
  const sParam = page > 1 ? `&s=${(page - 1) * 30}` : '';
  return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}${sParam}`;
}

function looksBlocked(html) {
  return /verify you are a human|unusual traffic|captcha|are you a robot|access denied/i.test(html);
}

async function readBingPage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  try { await page.waitForSelector('li.b_algo', { timeout: 6000 }); } catch (e) {}
  const html = await page.content();
  if (looksBlocked(html)) return { rows: [], blocked: true };
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
  return { rows, blocked: false };
}

async function readDdgPage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  try { await page.waitForSelector('a.result__a', { timeout: 6000 }); } catch (e) {}
  const html = await page.content();
  if (looksBlocked(html)) return { rows: [], blocked: true };
  const rows = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.result').forEach(el => {
      const link = el.querySelector('a.result__a');
      const snippetEl = el.querySelector('.result__snippet');
      if (!link) return;
      out.push({
        title: (link.innerText || '').trim(),
        url: link.getAttribute('href') || '',
        snippet: snippetEl ? snippetEl.innerText.trim() : ''
      });
    });
    return out;
  });
  return { rows, blocked: false };
}

async function searchBing(query, country = 'IN', maxPages = 3) {
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();
  const allRows = [];
  let bingBlocked = false;
  const push = (row, url) => {
    if (!url || allRows.some(x => x.url === url)) return;
    allRows.push({ ...row, url });
  };
  try {
    // ── Primary: Bing, plain URL (no cc/mkt — see bingSearchUrl) ──────────
    for (let p = 1; p <= maxPages; p++) {
      if (deps.abortSignal && deps.abortSignal.aborted) break;
      try {
        const { rows, blocked } = await readBingPage(page, bingSearchUrl(query, p));
        if (blocked) {
          bingBlocked = true;
          deps.logger('[Web Discovery] Bing served a verification page — falling back to DuckDuckGo instead of trying to bypass it.');
          break;
        }
        if (!rows.length) break;
        for (const r of rows) push(r, unwrapBingUrl(r.url));
      } catch (pageErr) {
        deps.logger(`[Web Discovery] Bing page ${p} warning: ${pageErr.message}`);
        break;
      }
    }

    // ── Fallback: DuckDuckGo HTML (independent index, same query) ─────────
    if (allRows.length === 0) {
      deps.logger(`[Web Discovery] Bing returned ${bingBlocked ? 'a challenge' : 'no rows'}; trying DuckDuckGo HTML.`);
      for (let p = 1; p <= maxPages; p++) {
        if (deps.abortSignal && deps.abortSignal.aborted) break;
        try {
          const { rows, blocked } = await readDdgPage(page, ddgSearchUrl(query, p));
          if (blocked) {
            deps.logger('[Web Discovery] DuckDuckGo served a challenge — stopping (no bypass attempted).');
            if (allRows.length === 0) return { rows: [], blocked: true };
            break;
          }
          if (!rows.length) break;
          for (const r of rows) push(r, unwrapDdgUrl(r.url));
        } catch (pageErr) {
          deps.logger(`[Web Discovery] DuckDuckGo page ${p} warning: ${pageErr.message}`);
          break;
        }
      }
    }

    return { rows: allRows, blocked: false };
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
  const limit = Math.max(5, Math.min(30, Number(opts.limit) || 15));
  const place = dv.cleanText(location, 120);
  const phrase = dv.cleanText(category, 80);
  if (!place || !phrase) {
    return { totalScraped: 0, newInserted: 0, updated: 0, phoneCount: 0 };
  }

  const query = `${phrase} in ${place}`;
  deps.logger(`[Web Discovery] Searching public results for "${query}" (${country}, multi-page).`);

  let rows = [];
  try {
    const result = await searchBing(query, country, 3);
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
  const stems = categoryStems(phrase);
  for (const row of rows) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;
    const host = hostOf(row.url);
    if (!host || seenHosts.has(host) || isExcluded(row.url)) continue;
    if (!isRelevantResult(row, stems)) continue;
    const verdict = classifyResultUrl(row.url, row.title);
    if (verdict === 'drop') continue;
    const url = verdict === 'origin' ? originOf(row.url) : row.url;
    seenHosts.add(host);
    candidates.push({ ...row, url, host });
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
      country,
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
      const enriched = await scrapeWebContact(saved, { sessionId, limit: saved.length, budgetMs: 45000, countryCode: country });
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

module.exports = {
  scrapeWebDiscovery,
  setDeps,
  // exported for tests
  _internals: {
    categoryStems, stemToken, isRelevantResult, hostOf, isExcluded, cleanTitle,
    searchBing, unwrapBingUrl, unwrapDdgUrl, bingSearchUrl, ddgSearchUrl, looksBlocked,
    classifyResultUrl, originOf
  }
};
