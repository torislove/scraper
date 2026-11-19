const dbAdapter = require('../config/dbAdapter');
const { verifyWithAI } = require('../utils/aiParser');
const { extractPhones, normalizePhone } = require('../utils/phoneUtils');
const { searchBingHtml } = require('./bingSearch');

// Shared logging utility callback
let logCallback = console.log;
function setLogger(cb) { logCallback = cb; }
function addLog(msg) { logCallback(msg); }

/**
 * One Bing result page, already link-unwrapped.
 * Returns { rows, captcha, error } and never throws.
 *
 * Bing is driven through its own search box (`bingSearch.js`) rather than a
 * forged `?q=` URL, which this network answers with unrelated cached pages.
 */
async function bingRows(query, platformName, pageIndex = 0) {
  try {
    const { rows, blocked } = await searchBingHtml(query, {
      maxPages: Math.max(1, pageIndex + 1),
      logger: addLog
    });
    if (blocked) {
      addLog(`[Social Discovery] Bing served a human-verification page for ${platformName}.`);
      return { rows: [], captcha: true };
    }
    // `searchBingHtml` already decodes Bing's /ck/a redirects.
    return {
      rows: rows.map(item => ({ title: item.title, description: item.snippet, url: item.url })),
      captcha: false
    };
  } catch (err) {
    addLog(`[Social Discovery] Bing error for ${platformName}: ${err.message}`);
    return { rows: [], error: err.message };
  }
}

async function scrapeDuckDuckGoDork(
  platformDomain,
  exactQuery,
  category,
  location,
  globalAbortSignal = { aborted: false },
  sessionId = 'legacy',
  countryCode = 'IN',
  userId = 'admin_1'
) {
  try {
    const platformName = platformDomain.split('.')[0];
    const country = String(countryCode || 'IN').toUpperCase();

    // Query variations for multi-page discovery
    const queries = [
      `site:${platformDomain} ${exactQuery}`,
      `${exactQuery} ${platformName} profile`
    ];

    let searchResults = [];
    for (const query of queries) {
      if (globalAbortSignal.aborted) break;
      addLog(`[Social Discovery] Searching: "${query}" (${country})`);
      
      // Page 0 and Page 1 for high yield
      for (let p = 0; p < 2; p++) {
        if (globalAbortSignal.aborted) break;
        const { rows, captcha } = await bingRows(query, platformName, p);
        if (captcha) break;
        const matched = rows.filter(item => item.url && item.url.includes(platformDomain));
        for (const m of matched) {
          if (!searchResults.some(existing => existing.url === m.url)) {
            searchResults.push(m);
          }
        }
        if (rows.length === 0) break;
      }
      
      if (searchResults.length >= 5) break;
    }

    if (searchResults.length === 0) {
      addLog(`[Social Discovery] No ${platformName} results found for "${exactQuery}"`);
      return { totalScraped: 0, found: 0 };
    }

    const results = searchResults;
    addLog(`[Social Discovery] Found ${results.length} ${platformName} candidate profiles for "${exactQuery}"`);

    let totalInserted = 0;

    for (const item of results) {
      if (globalAbortSignal.aborted) throw new Error('Master Stop Aborted');
      
      const profileUrl = item.url;
      if (!profileUrl || /\/(reel|explore|p|stories|groups|events|watch)\//.test(profileUrl)) continue;

      const cleanName = (item.title || 'Unknown Business')
        .replace(/\s*[\|·\-–]\s*(Facebook|Instagram|YouTube|Pinterest|LinkedIn|Twitter|X).*$/i, '')
        .replace(/\s*-\s*(Home|Official Page|Profile|Page|About).*$/i, '')
        .trim() || 'Unknown Business';

      const snippet = item.description || '';
      
      // Extract phones using universal international parser
      const extractedPhones = extractPhones(snippet, {
        defaultCountry: country,
        allowInternational: true,
        trusted: false,
        context: 'social snippet'
      });

      let phone = '';
      let isMobile = false;
      if (extractedPhones.length > 0) {
        phone = extractedPhones[0].displayPhone || extractedPhones[0].e164 || extractedPhones[0].national;
        isMobile = Boolean(extractedPhones[0].isMobile);
      }

      // Fallback for Indian regex if country is IN and extractPhones missed it
      if (!phone && country === 'IN') {
        const phoneMatch = snippet.match(/(?:\+91[\s\-]?)?[6-9]\d{9}/);
        if (phoneMatch) {
          phone = phoneMatch[0].replace(/\s/g,'').trim();
          isMobile = true;
        }
      }

      // Extract followers/likes
      const follMatch = snippet.match(/([\d.,]+[KkMm]?)\s*\+?\s*(?:followers?|likes?|subscribers?)/i);
      const followers = follMatch ? follMatch[1] : '';

      // A social profile without phone or followers or clear business relevance is skipped
      if (!phone && !followers) {
        continue;
      }

      const vendors = dbAdapter.getVendors();
      const existing = vendors.find(v => 
        v.instagram === profileUrl || 
        v.facebook === profileUrl || 
        v.pinterest === profileUrl || 
        v.youtube === profileUrl || 
        v.linkedin === profileUrl || 
        (v.name && v.name.toLowerCase() === cleanName.toLowerCase() && v.city && v.city.toLowerCase() === location.toLowerCase())
      );
      
      if (!existing) {
        const newLead = {
          id: `social_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          userId: userId || 'admin_1',
          sessionId,
          name: cleanName,
          category: category,
          city: location,
          country,
          address: '',
          scrapedAt: new Date().toISOString(),
          verified: false,
          pushed: false,
          qualityScore: followers ? 25 : (phone ? 20 : 10),
          phone: phone || '',
          isMobile,
          instagram: platformDomain.includes('instagram') ? profileUrl : '',
          instagramFollowers: platformDomain.includes('instagram') ? followers : '',
          facebook: platformDomain.includes('facebook') ? profileUrl : '',
          facebookFollowers: platformDomain.includes('facebook') ? followers : '',
          pinterest: platformDomain.includes('pinterest') ? profileUrl : '',
          youtube: platformDomain.includes('youtube') ? profileUrl : '',
          linkedin: platformDomain.includes('linkedin') ? profileUrl : '',
          twitter: (platformDomain.includes('twitter') || platformDomain.includes('x.com')) ? profileUrl : '',
          source: `Social Discovery (${platformName})`
        };
        dbAdapter.saveVendor(userId || 'admin_1', newLead);
        try {
          const { streamingEnricher } = require('../services/phoneBackfillService');
          streamingEnricher.enqueue(newLead);
        } catch (e) {}
        addLog(`[Social Discovery] ✓ ${platformName}: "${cleanName}"${followers ? ` (${followers})` : ''}${phone ? ` 📞${phone}` : ''}`);
        totalInserted++;
      }
    }

    addLog(`[Social Discovery] Done: ${platformName} inserted ${totalInserted} leads for "${exactQuery}".`);
    return { totalScraped: totalInserted, found: results.length };
  } catch (error) {
    addLog(`[Social Discovery] Failed to scrape ${platformDomain}: ${error.message}`);
    return { totalScraped: 0, error: error.message };
  }
}

module.exports = {
  scrapeDuckDuckGoDork,
  setLogger
};
