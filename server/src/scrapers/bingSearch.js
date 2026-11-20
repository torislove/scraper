/**
 * Bing HTML search, driven like a person.
 *
 * Why this module exists
 * ----------------------
 * A direct `GET https://www.bing.com/search?q=...` no longer returns results
 * for that query from this network. Bing answers with an unrelated cached page
 * — a "quote of the day" list, Hindi nursery-rhyme videos, or Indian pizza
 * chains — and it ignores `cc=` / `mkt=` because the edge node is Indian. That
 * silently poisoned every engine built on top of Bing:
 *
 *   - Web Discovery saved junk hosts as leads
 *   - TripAdvisor found no `tripadvisor.*` URLs, so it always returned 0 rows
 *   - Bing Places discarded its Maps cards and fell back to the same junk
 *
 * Typing the query into Bing's own search box and pressing Enter works. Bing
 * then sets `form=QBLH`, a `cvid` and session cookies, and returns real local
 * results (`speaklifephotography.com/troy/`, Yelp, Thumbtack).
 *
 * So: one shared helper, used by every Bing-based engine, that drives the box
 * instead of forging a URL. It goes through `browserFactory`, so it uses the
 * same stealth browser, the same system Chrome/Edge fallback and the same
 * lifetime as every other engine.
 *
 * Politeness
 * ----------
 * Bing throttles after a couple of rapid searches. Calls are therefore
 * serialised with a minimum gap, identical queries are cached for a few
 * minutes, and one blocked response is retried once after a longer pause. A
 * second block is reported honestly as `blocked: true` — nothing here tries to
 * defeat a challenge.
 */

const { getBrowser } = require('./browserFactory');
const fetchRouter = require('../services/fetchRouter');
const cheerio = require('cheerio');

const SEARCH_BOX = 'textarea#sb_form_q, input#sb_form_q, input[name="q"]';
const RESULT_SELECTOR = 'li.b_algo';
const NEXT_PAGE_SELECTOR = 'a.sb_pagN';
const SUBMIT_BUTTON = '#sb_form_go';

const MIN_GAP_MS = 1800;
const RETRY_PAUSE_MS = 6000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 40;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ---- serialised queue: one Bing session at a time -------------------------
let queueTail = Promise.resolve();
let lastStartedAt = 0;

function withSlot(task) {
  const run = async () => {
    const wait = MIN_GAP_MS - (Date.now() - lastStartedAt);
    if (wait > 0) await sleep(wait);
    lastStartedAt = Date.now();
    return task();
  };
  const result = queueTail.then(run, run);
  queueTail = result.then(() => {}, () => {});
  return result;
}

// ---- short cache ----------------------------------------------------------
const cache = new Map();

function cacheKey(query, maxPages) {
  return `${String(query).toLowerCase().trim()}|${maxPages}`;
}

function readCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key, value) {
  if (value.blocked || !value.rows.length) return;
  cache.set(key, { at: Date.now(), value });
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

// Bing wraps every result in a /ck/a? redirect whose `u` parameter is the real
// target, base64url-encoded behind an `a1` prefix.
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
  } catch (error) {
    return raw;
  }
}

function looksBlocked(html) {
  return /verify you are a human|unusual traffic|captcha|are you a robot|access denied/i.test(html);
}

function readRows(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll('li.b_algo').forEach(el => {
      const link = el.querySelector('h2 a');
      if (!link) return;
      const snippetEl = el.querySelector('.b_caption p') || el.querySelector('.b_algoSlug');
      out.push({
        title: (link.innerText || '').trim(),
        url: link.getAttribute('href') || '',
        snippet: snippetEl ? snippetEl.innerText.trim() : ''
      });
    });
    return out;
  });
}

async function runSearchViaRelay(query, { maxPages, timeoutMs, log, abortSignal }) {
  const rows = [];
  const seen = new Set();
  let pages = 0;

  for (let p = 1; p <= maxPages; p++) {
    if (abortSignal.aborted) break;
    const first = (p - 1) * 10 + 1;
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&form=QBLH&first=${first}`;

    const fetched = await fetchRouter.tryFetchHtml(url, { timeoutMs });
    if (!fetched.ok) {
      log(`[BingSearch] Relay page ${p} failed: ${fetched.error}`);
      break;
    }

    if (looksBlocked(fetched.html)) {
      return { rows: [], blocked: true, pages };
    }

    const $ = cheerio.load(fetched.html);
    let found = 0;

    $('li.b_algo').each((_i, el) => {
      const link = $(el).find('h2 a').first();
      if (!link.length) return;
      const href = link.attr('href') || '';
      const target = unwrapBingUrl(href);
      if (!target || seen.has(target)) return;
      seen.add(target);
      const snippetEl = $(el).find('.b_caption p').first().length
        ? $(el).find('.b_caption p').first()
        : $(el).find('.b_algoSlug').first();
      rows.push({
        title: link.text().trim(),
        url: target,
        snippet: snippetEl.length ? snippetEl.text().trim() : ''
      });
      found += 1;
    });

    pages += 1;
    if (!found) break;
  }

  return { rows, blocked: false, pages };
}

async function runSearch(query, { maxPages, timeoutMs, log, abortSignal }) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    locale: 'en-US',
    timezoneId: 'Asia/Kolkata'
  });

  const rows = [];
  const seen = new Set();
  let pages = 0;

  try {
    const page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);

    await page.goto('https://www.bing.com/', { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    // Type the query into the box. This is the part that makes Bing rank it.
    // The box is a textarea, which swallows a bare Enter, so we click first and
    // fall back to the submit button before giving up.
    let typed = false;
    try {
      await page.waitForSelector(SEARCH_BOX, { timeout: 8000 });
      await page.click(SEARCH_BOX);
      await page.fill(SEARCH_BOX, query);
      await page.keyboard.press('Enter');

      const hasResults = () => page
        .waitForSelector(RESULT_SELECTOR, { timeout: 12000 })
        .then(() => true)
        .catch(() => false);

      typed = await hasResults();
      if (!typed) {
        await page.click(SUBMIT_BUTTON).catch(() => {});
        typed = await hasResults();
      }
    } catch (error) {
      log(`[BingSearch] Search box path failed (${error.message}); falling back to a direct URL.`);
    }

    if (!typed) {
      // The direct URL is the degraded path. Keep going, but the caller should
      // expect poor relevance; nothing here pretends otherwise.
      log('[BingSearch] Search box produced no results; trying the direct-URL path.');
      await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(query)}&form=QBLH`, {
        waitUntil: 'domcontentloaded',
        timeout: timeoutMs
      });
      await page.waitForSelector(RESULT_SELECTOR, { timeout: 6000 }).catch(() => {});
    }

    const html = await page.content();
    if (looksBlocked(html)) {
      return { rows: [], blocked: true, pages: 0 };
    }

    const collect = async () => {
      const pageRows = await readRows(page);
      pages += 1;
      for (const row of pageRows) {
        const url = unwrapBingUrl(row.url);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        rows.push({ ...row, url });
      }
      return pageRows.length;
    };

    if ((await collect()) === 0) {
      return { rows, blocked: false, pages };
    }

    // Pagination: click Bing's own "next" arrow rather than forging `&first=`,
    // for the same reason the first page uses the box — the URL form is not
    // honoured from this network.
    for (let p = 2; p <= maxPages; p++) {
      if (abortSignal.aborted) break;
      const next = await page.$(NEXT_PAGE_SELECTOR);
      if (!next) break;
      try {
        await next.click();
        await page.waitForSelector(RESULT_SELECTOR, { timeout: 8000 }).catch(() => {});
        if (!(await collect())) break;
      } catch (error) {
        log(`[BingSearch] Page ${p} failed: ${error.message}`);
        break;
      }
    }
  } finally {
    try { await context.close(); } catch (error) { /* context already gone */ }
  }

  return { rows, blocked: false, pages };
}

/**
 * Run one Bing search the way a browser does.
 *
 * @param {string} query
 * @param {object} [options]
 * @param {number} [options.maxPages=1]  pages of ~10 results to collect
 * @param {number} [options.timeoutMs=25000]
 * @param {function} [options.logger]
 * @param {object} [options.abortSignal]
 * @param {boolean} [options.noCache=false]
 * @returns {Promise<{rows: Array<{title: string, url: string, snippet: string}>, blocked: boolean, pages: number, cached?: boolean}>}
 */
async function searchBingHtml(query, options = {}) {
  const maxPages = Math.max(1, Math.min(5, Number(options.maxPages) || 1));
  const timeoutMs = Number(options.timeoutMs) || 25000;
  const log = options.logger || (() => {});
  const abortSignal = options.abortSignal || { aborted: false };

  const key = cacheKey(query, maxPages);
  if (!options.noCache) {
    const hit = readCache(key);
    if (hit) return { ...hit, cached: true };
  }

  // Transport choice: the user's browser first when it is connected, because
  // a residential IP gets real results where this server's IP gets a cached
  // page. Server Playwright stays as the fallback when it is allowed.
  const attempt = async () => {
    const capability = fetchRouter.resolveCapability();
    if (capability.canFetch) {
      const relayed = await runSearchViaRelay(query, { maxPages, timeoutMs, log, abortSignal });
      if (relayed.rows.length || relayed.blocked) return relayed;
      if (!capability.canUseServer) return relayed;
      log('[BingSearch] Relay returned no rows; falling back to the server browser.');
    }
    return runSearch(query, { maxPages, timeoutMs, log, abortSignal });
  };

  let result = await withSlot(attempt);

  // One polite retry: Bing throttles bursty clients, and a short pause is
  // usually enough. A second block is reported as-is.
  if (result.blocked) {
    log('[BingSearch] Throttled; pausing once before a single retry.');
    await sleep(RETRY_PAUSE_MS);
    result = await withSlot(attempt);
  }

  writeCache(key, result);
  return result;
}

module.exports = {
  searchBingHtml,
  unwrapBingUrl,
  looksBlocked,
  _internals: { SEARCH_BOX, RESULT_SELECTOR, NEXT_PAGE_SELECTOR, SUBMIT_BUTTON, MIN_GAP_MS }
};
