const { launchBraveBrowser } = require('./browserFactory');
const dbAdapter = require('../config/dbAdapter');
const intelligentExtractor = require('../utils/intelligentExtractor');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

async function scrapeBraveDork(domain, query, category, location) {
  const dorkQuery = `site:${domain} "${category}" "${location}"`;
  const url = `https://search.brave.com/search?q=${encodeURIComponent(dorkQuery)}`;

  deps.logger(`[Brave Dork Engine] Starting scrape for ${domain} - Query: ${dorkQuery}`);
  
  let browser = null;
  let context = null;

  try {
    const launched = await launchBraveBrowser(true); // use proxy
    browser = launched.browser;

    context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    if (deps.abortSignal.aborted) return;

    const results = await page.$$eval('.snippet', nodes => {
      return nodes.map(node => {
        const titleEl = node.querySelector('.title');
        const descEl = node.querySelector('.snippet-description');
        const linkEl = node.querySelector('a');

        return {
          title: titleEl ? titleEl.innerText.trim() : '',
          snippet: descEl ? descEl.innerText.trim() : '',
          link: linkEl ? linkEl.href : ''
        };
      }).filter(v => v.title && v.link);
    });

    deps.logger(`[Brave Dork Engine] Found ${results.length} raw results on ${domain}.`);
    let newCount = 0;
    
    for (const v of results) {
      if (deps.abortSignal.aborted) break;
      
      let name = v.title.split('-')[0].split('|')[0].trim();
      if (!name) continue;

      // Intelligent extraction from snippet text
      const extracted = intelligentExtractor.extractData(v.snippet, domain);

      const vendors = dbAdapter.getVendors();
      const existing = vendors.find(x => x.name === name && x.city === location);
      if (!existing) {
        const created = {
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          name: name,
          category: category,
          city: location,
          address: `Discovered via ${domain} in ${location}`,
          phone: extracted.phones.length > 0 ? extracted.phones[0] : 'Requires Manual Lookup',
          email: extracted.emails.length > 0 ? extracted.emails[0] : '',
          pricing: extracted.pricingFound || '',
          socialLink: v.link,
          source: `Brave Dork (${domain})`,
          aiVerified: extracted.score >= 40,
          qualityScore: extracted.score,
          scrapedAt: new Date().toISOString()
        };
        vendors.push(created);
        dbAdapter.saveVendors(vendors);
        try { deps.emitVendorEvent(created, 'inserted'); } catch (e) {}
        newCount++;
      }
    }
    deps.logger(`[Brave Dork Engine] Complete for ${domain}. Inserted ${newCount} new vendors.`);
  } catch (error) {
    deps.logger(`[Brave Dork Error] ${error.message}`);
  } finally {
    try { if (context) await context.close(); } catch(e){}
    try { if (browser) await browser.close(); } catch(e){}
  }
}

module.exports = {
  scrapeBraveDork,
  setDeps
};
