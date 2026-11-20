/**
 * fastGoogleHttp.js
 *
 * Tier-1 Sub-Second Google Local Finder HTTP Harvester.
 * Fetches Google SERP Local Pack directly via stealth HTTP (0MB browser RAM, ~400ms latency)
 * and parses cards with Cheerio. Seamlessly signals fallback to Playwright browser when needed.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const { fetchTextSmart } = require('../services/fetchRouter');

const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });

// Phase 6 — short-lived LRU cache for the HTTP tier. Only successful, non-empty
// lead sets are cached, so a throttled or empty page is never remembered. A
// repeat page inside ten minutes is answered from memory instead of another
// Google request; this removes latency without changing coverage.
const HTTP_CACHE_TTL_MS = 10 * 60 * 1000;
const HTTP_CACHE_MAX = 200;
const httpCache = new Map();
let httpCacheHits = 0;
let httpCacheMisses = 0;

function httpCacheKey(query, pageIndex) {
  return `${String(query || '').toLowerCase().replace(/\s+/g, ' ').trim()}|${Number(pageIndex) || 0}`;
}

function readHttpCache(key) {
  const hit = httpCache.get(key);
  if (!hit) {
    httpCacheMisses++;
    return null;
  }
  if (Date.now() - hit.at > HTTP_CACHE_TTL_MS) {
    httpCache.delete(key);
    httpCacheMisses++;
    return null;
  }
  // Refresh recency so the entry survives while it is still useful.
  httpCache.delete(key);
  httpCache.set(key, hit);
  httpCacheHits++;
  return hit.payload;
}

function writeHttpCache(key, payload) {
  if (!payload || payload.fallbackToBrowser) return;
  if (!Array.isArray(payload.leads) || payload.leads.length === 0) return;
  httpCache.set(key, { at: Date.now(), payload });
  while (httpCache.size > HTTP_CACHE_MAX) {
    const oldest = httpCache.keys().next().value;
    httpCache.delete(oldest);
  }
}

function getHttpCacheStats() {
  return {
    size: httpCache.size,
    max: HTTP_CACHE_MAX,
    ttlMs: HTTP_CACHE_TTL_MS,
    hits: httpCacheHits,
    misses: httpCacheMisses
  };
}

function clearHttpCache() {
  httpCache.clear();
}


const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
];

async function fetchGoogleLocalHttp(query, pageIndex = 0, categoryFallback = 'Business', countryOverride = null) {
  const startIndex = pageIndex * 20;
  const country = countryOverride
    ? { code: String(countryOverride).toUpperCase() }
    : require('../services/localBrain/countries').detectCountry(query);
  const gl = (country?.code || 'IN').toLowerCase();
  const cacheKey = `${httpCacheKey(query, pageIndex)}|${gl}`;
  const cached = readHttpCache(cacheKey);
  if (cached) {
    return {
      ...cached,
      leads: Array.isArray(cached.leads) ? cached.leads.map(lead => ({ ...lead })) : [],
      cached: true
    };
  }
  const acceptLanguage = gl === 'in' ? 'en-IN,en-US;q=0.9,en;q=0.8' : 'en-US,en;q=0.9';
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=lcl&start=${startIndex}&hl=en&gl=${gl}`;
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  try {
    const reqHeaders = {
      'User-Agent': ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': acceptLanguage,
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': ua.includes('Mobile') ? '?1' : '?0',
      'sec-ch-ua-platform': ua.includes('Windows') ? '"Windows"' : ua.includes('Mac') ? '"macOS"' : '"Android"'
    };

    let html = '';
    const relayed = await fetchTextSmart(searchUrl, { headers: reqHeaders, timeoutMs: 6000 });
    if (relayed.ok) {
      html = relayed.text || '';
    } else if (relayed.fallbackToServer) {
      const res = await axios.get(searchUrl, {
        headers: reqHeaders,
        httpsAgent,
        timeout: 6000
      });
      html = typeof res.data === 'string' ? res.data : '';
    } else {
      return { leads: [], fallbackToBrowser: true, reason: relayed.code || 'relay_unavailable' };
    }

    if (!html || html.includes('/sorry') || html.includes('google.com/sorry')) {
      return { leads: [], fallbackToBrowser: true, reason: 'captcha' };
    }

    const $ = cheerio.load(html);
    const cardElements = $('div.VkpGBb, div.rl_item, div[jscontroller="e6hkjf"]');

    if (cardElements.length === 0) {
      return { leads: [], fallbackToBrowser: true, reason: 'no_cards_in_http' };
    }

    const leads = [];

    cardElements.each((_, el) => {
      try {
        const card = $(el);
        const nameEl = card.find('div.dbg0pd, div[role="heading"] span, .OSrXXb, span.LrzXr, h3').first();
        const name = nameEl.text().trim();
        if (!name || name.length < 2) return;

        let rating = null;
        let reviewsCount = null;
        const ratingEl = card.find('span.yi40Hd, span.z3HNkc').first();
        if (ratingEl.length) {
          const rMatch = ratingEl.text().trim().match(/^([0-9.]+)/);
          if (rMatch) rating = parseFloat(rMatch[1]);
        }

        const reviewsEl = card.find('span.RDApEe').first();
        if (reviewsEl.length) {
          const revMatch = reviewsEl.text().trim().match(/([0-9,]+)/);
          if (revMatch) reviewsCount = parseInt(revMatch[1].replace(/,/g, ''), 10);
        }

        let category = categoryFallback;
        let address = '';
        const detailsContainer = card.find('.rllt__details').first();
        if (detailsContainer.length) {
          const lines = detailsContainer.text().split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length > 0) {
            const parts = lines[0].split('·').map(p => p.trim());
            if (parts.length > 1) category = parts[parts.length - 1];
          }
          if (lines.length > 1) address = lines[1];
        }

        let phone = '';
        const cardText = card.text();
        const phoneMatch = cardText.match(/(?:[+0]91[-\s]?)?[6-9]\d{4}[-\s]?\d{5}\b/) || cardText.match(/\b0\d{2,4}[-\s]?\d{3,4}[-\s]?\d{3,4}\b/) || cardText.match(/\b0\d{2,4}[-\s]?\d{6,8}\b/);
        if (phoneMatch) {
          phone = phoneMatch[0].trim();
        }

        let website = '';
        const webLink = card.find('a.ab_button[href^="http"], a[data-attrid="visit_website"], a[href^="http"]:not([href*="google.com"])').first();
        if (webLink.length) {
          website = webLink.attr('href') || '';
        }

        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ', ' + address)}`;

        leads.push({
          name,
          category,
          rating,
          reviewsCount,
          address,
          phone,
          website,
          mapsLink,
          isHttpFirst: true
        });
      } catch (cardErr) {}
    });

    const payload = { leads, fallbackToBrowser: false, count: leads.length };
    writeHttpCache(cacheKey, payload);
    return payload;
  } catch (err) {
    return { leads: [], fallbackToBrowser: true, error: err.message };
  }
}

module.exports = {
  fetchGoogleLocalHttp,
  getHttpCacheStats,
  clearHttpCache
};

