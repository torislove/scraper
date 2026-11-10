const { launchStealthBrowser } = require('./browserFactory');
const dbAdapter = require('../config/dbAdapter');
const { verifyWithAI } = require('../utils/aiParser');

// Shared logging utility callback
let logCallback = console.log;
function setLogger(cb) { logCallback = cb; }
function addLog(msg) { logCallback(msg); }

/* Bing wraps outbound links: https://www.bing.com/ck/a?...&u=a1<base64url>. */
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
  } catch (err) {
    return raw;
  }
}

/**
 * One Bing result page, already link-unwrapped.
 * Returns { rows, captcha, error } and never throws.
 */
async function bingRows(query, platformName) {
  let browser = null;
  let context = null;
  try {
    const { browser: stealthBrowser } = await launchStealthBrowser(false);
    browser = stealthBrowser;
    context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Bing paints results a moment after the HTML arrives.
    try { await page.waitForSelector('li.b_algo', { timeout: 8000 }); } catch (e) {}

    const html = await page.content();
    if (html.includes('verify you are a human') || html.includes('captcha')) {
      addLog(`[Bing Dork Engine] Bing served a human-verification page for ${platformName}.`);
      return { rows: [], captcha: true };
    }

    const raw = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('li.b_algo').forEach(el => {
        const titleEl = el.querySelector('h2 a');
        const snippetEl = el.querySelector('.b_caption p') || el.querySelector('.b_algoSlug');
        const title = titleEl ? titleEl.innerText.trim() : '';
        const url = titleEl ? titleEl.getAttribute('href') : '';
        const snippet = snippetEl ? snippetEl.innerText.trim() : (el.innerText || '');
        if (url) results.push({ title, description: snippet, url });
      });
      return results;
    });

    // Bing hides every destination behind /ck/a?u=a1<base64>. Without decoding
    // it first, the domain filter never matches a single real profile.
    return { rows: raw.map(item => ({ ...item, url: unwrapBingUrl(item.url) })), captcha: false };
  } catch (err) {
    addLog(`[Bing Dork Engine] Browser error for ${platformName}: ${err.message}`);
    return { rows: [], error: err.message };
  } finally {
    try { if (context) await context.close(); } catch (e) {}
    try { if (browser) await browser.close(); } catch (e) {}
  }
}

async function scrapeDuckDuckGoDork(platformDomain, exactQuery, category, location, globalAbortSignal = { aborted: false }, sessionId = 'legacy') {
  try {
    const platformName = platformDomain.split('.')[0];

    // Bing now often ignores `site:` for small Indian cities and returns its own
    // generic pages. So: try the precise dork first, then fall back to the plain
    // "<category> <city> instagram" query and keep only real profile links.
    // Both are ordinary public searches — no automation of a blocked surface.
    const queries = [
      `site:${platformDomain} ${exactQuery}`,
      `${exactQuery} ${platformName} profile`
    ];

    let searchResults = [];
    for (const query of queries) {
      addLog(`[Bing Dork Engine] Bing search: "${query}"`);
      const { rows } = await bingRows(query, platformName);
      searchResults = rows.filter(item => item.url && item.url.includes(platformDomain));
      if (searchResults.length) break;
      addLog(`[Bing Dork Engine] No ${platformName} profiles in that page; trying the next query shape.`);
    }

    if (searchResults.length === 0) {
      addLog(`[Bing Dork Engine] No ${platformName} results found for "${exactQuery}"`);
      return { totalScraped: 0, found: 0 };
    }

    const results = searchResults;
    addLog(`[Bing Dork Engine] Found ${results.length} ${platformName} results for "${exactQuery}"`);

    let totalInserted = 0;

    for (const item of results) {
      if (globalAbortSignal.aborted) throw new Error('Master Stop Aborted');
      
      const profileUrl = item.url;
      if (!profileUrl || /\/(reel|explore|p|stories|groups|events|watch)\//.test(profileUrl)) continue;

      const cleanName = (item.title || 'Unknown Vendor')
        .replace(/\s*[\|·\-–]\s*(Facebook|Instagram|YouTube|Pinterest|LinkedIn).*$/i, '')
        .replace(/\s*-\s*(Home|Official Page|Profile|Page).*$/i, '')
        .trim() || 'Unknown Vendor';

      const snippet = item.description || '';
      
      // Extract phone
      const phoneMatch = snippet.match(/(?:\+91[\s\-]?)?[6-9]\d{9}/);
      const phone = phoneMatch ? phoneMatch[0].replace(/\s/g,'').trim() : '';

      // Extract followers/likes
      const follMatch = snippet.match(/([\d.,]+[KkMm]?)\s*\+?\s*(?:followers?|likes?|subscribers?)/i);
      const followers = follMatch ? follMatch[1] : '';

      const vendors = dbAdapter.getVendors();
      const existing = vendors.find(v => 
        v.instagram === profileUrl || 
        v.facebook === profileUrl || 
        v.pinterest === profileUrl || 
        v.youtube === profileUrl || 
        v.linkedin === profileUrl || 
        v.name === cleanName
      );
      
      if (!existing) {
        const newLead = {
          id: `dork_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          userId: 'admin_1',
          sessionId,
          name: cleanName,
          category: category,
          city: location,
          address: '',
          scrapedAt: new Date().toISOString(),
          verified: false,
          pushed: false,
          qualityScore: followers ? 25 : (phone ? 15 : 8),
          phone: phone || '',
          instagram: platformDomain.includes('instagram') ? profileUrl : '',
          instagramFollowers: platformDomain.includes('instagram') ? followers : '',
          facebook: platformDomain.includes('facebook') ? profileUrl : '',
          facebookFollowers: platformDomain.includes('facebook') ? followers : '',
          pinterest: platformDomain.includes('pinterest') ? profileUrl : '',
          youtube: platformDomain.includes('youtube') ? profileUrl : '',
          linkedin: platformDomain.includes('linkedin') ? profileUrl : '',
          source: `Social Dork (${platformName})`
        };
        dbAdapter.saveVendor('admin_1', newLead);
        try {
          const { streamingEnricher } = require('../services/phoneBackfillService');
          streamingEnricher.enqueue(newLead);
        } catch (e) {}
        addLog(`[Bing Dork Engine] ✓ ${platformName}: "${cleanName}"${followers ? ` (${followers})` : ''}${phone ? ` 📞${phone}` : ''}`);
        totalInserted++;
      }
    }

    addLog(`[Bing Dork Engine] Done: ${platformName} inserted ${totalInserted} leads for "${exactQuery}".`);
    return { totalScraped: totalInserted, found: results.length };
  } catch (error) {
    addLog(`[Bing Dork Engine] Failed to scrape ${platformDomain}: ${error.message}`);
    return { totalScraped: 0, error: error.message };
  }
}

module.exports = {
  scrapeDuckDuckGoDork,
  setLogger
};
