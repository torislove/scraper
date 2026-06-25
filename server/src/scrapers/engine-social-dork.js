const { launchStealthBrowser } = require('./browserFactory');
const dbAdapter = require('../config/dbAdapter');
const { verifyWithAI } = require('../utils/aiParser');

// Shared logging utility callback
let logCallback = console.log;
function setLogger(cb) { logCallback = cb; }
function addLog(msg) { logCallback(msg); }

async function scrapeDuckDuckGoDork(platformDomain, exactQuery, category, location, globalAbortSignal = { aborted: false }) {
  let browser = null;
  let context = null;
  let page = null;
  
  try {
    const platformName = platformDomain.split('.')[0];
    const query = `site:${platformDomain} ${exactQuery}`;
    addLog(`[Bing Dork Engine] 🔍 Bing Dork search: "${query}"`);

    let searchResults = [];
    try {
      const { browser: stealthBrowser } = await launchStealthBrowser(true);
      browser = stealthBrowser;
      context = await browser.newContext();
      page = await context.newPage();
      
      await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      const html = await page.content();
      if (html.includes('verify you are a human') || html.includes('captcha')) {
        addLog(`[Bing Dork Engine] 🚨 Bing served a Captcha. The proxy might be burned.`);
        return;
      }
      
      searchResults = await page.evaluate((domain) => {
        const results = [];
        document.querySelectorAll('li.b_algo').forEach(el => {
          const titleEl = el.querySelector('h2 a');
          const snippetEl = el.querySelector('.b_caption p') || el.querySelector('.b_algoSlug');
          
          const title = titleEl ? titleEl.innerText.trim() : '';
          const url = titleEl ? titleEl.getAttribute('href') : '';
          const snippet = snippetEl ? snippetEl.innerText.trim() : (el.innerText || '');
          
          if (url.includes(domain)) {
            results.push({ title, description: snippet, url });
          }
        });
        return results;
      }, platformDomain);
      
    } catch (apiError) {
      addLog(`[Bing Dork Engine] Proxy/Browser error for ${platformName}: ${apiError.message}`);
      return;
    } finally {
      if (context) await context.close();
      if (browser) await browser.close();
    }

    if (searchResults.length === 0) {
      addLog(`[Bing Dork Engine] No ${platformName} results found for "${exactQuery}"`);
      return;
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
          id: `dork_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: cleanName,
          category: category,
          city: location,
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
        };
        vendors.push(newLead);
        dbAdapter.saveVendors(vendors);
        addLog(`[Bing Dork Engine] ✓ ${platformName}: "${cleanName}"${followers ? ` (${followers})` : ''}${phone ? ` 📞${phone}` : ''}`);
        totalInserted++;
      }
    }

    addLog(`[Bing Dork Engine] Done: ${platformName} inserted ${totalInserted} leads for "${exactQuery}".`);
  } catch (error) {
    addLog(`[Bing Dork Engine] Failed to scrape ${platformDomain}: ${error.message}`);
  }
}

module.exports = {
  scrapeDuckDuckGoDork,
  setLogger
};
