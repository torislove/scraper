/**
 * duckduckgoSearch.js
 *
 * Lightweight, Keyless DuckDuckGo HTML Search Scraper.
 * Acts as high-resilience second-line fallback when Bing encounters challenges or rate limits.
 * Extracts clean search result rows (title, snippet, target url).
 */

const axios = require('axios');
const cheerio = require('cheerio');

const DDG_ENDPOINT = 'https://html.duckduckgo.com/html/';
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Searches DuckDuckGo HTML endpoint and unwraps redirect links.
 * Returns { rows: [{ title, description, url }], blocked: boolean, error?: string }
 */
async function searchDuckDuckGoHtml(query, options = {}) {
  const timeoutMs = options.timeoutMs || 8000;
  const logger = options.logger || console.log;

  try {
    const res = await axios.post(
      DDG_ENDPOINT,
      `q=${encodeURIComponent(query)}&b=`,
      {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://html.duckduckgo.com',
          'Referer': 'https://html.duckduckgo.com/'
        },
        timeout: timeoutMs,
        validateStatus: s => s >= 200 && s < 400
      }
    );

    const html = typeof res.data === 'string' ? res.data : '';
    if (!html) {
      return { rows: [], blocked: false };
    }

    const $ = cheerio.load(html);
    const rows = [];

    // Check for DDG bot challenge/block
    const isBlocked = html.includes('anomaly-modal') || (html.includes('robot') && html.includes('captcha'));
    if (isBlocked) {
      return { rows: [], blocked: true };
    }

    $('.result').each((i, el) => {
      const titleLink = $(el).find('a.result__title, a.result__url, h2 a');
      const snippetEl = $(el).find('.result__snippet');
      let rawHref = titleLink.attr('href') || '';

      if (!rawHref) return;

      // Unpack DDG redirect: /l/?kh=-1&uddg=https%3A%2F%2F...
      let unwrapUrl = rawHref;
      if (unwrapUrl.includes('uddg=')) {
        const m = unwrapUrl.match(/uddg=([^&]+)/);
        if (m) {
          try {
            unwrapUrl = decodeURIComponent(m[1]);
          } catch (e) {}
        }
      }

      if (unwrapUrl.startsWith('//')) {
        unwrapUrl = `https:${unwrapUrl}`;
      }

      const title = $(el).find('.result__title, h2').text().trim();
      const description = snippetEl.text().trim();

      if (unwrapUrl && (title || description)) {
        rows.push({
          title,
          description,
          url: unwrapUrl
        });
      }
    });

    return { rows, blocked: false };
  } catch (err) {
    logger(`[DuckDuckGo Search] Request error for "${query}": ${err.message}`);
    return { rows: [], blocked: false, error: err.message };
  }
}

module.exports = {
  searchDuckDuckGoHtml
};
