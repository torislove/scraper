const { launchBraveBrowser } = require('../core/browserFactory');
const dbAdapter = require('../../config/dbAdapter');
const fidelity = require('../../services/categoryFidelity');
const intelligentExtractor = require('../../utils/intelligentExtractor');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

async function scrapeBraveDork(domain, query, category, location, sessionId = 'legacy') {
  const dorkQuery = `site:${domain} ${category} ${location}`;
  const url = `https://search.brave.com/search?q=${encodeURIComponent(dorkQuery)}`;

  deps.logger(`[Brave Dork Engine] Starting scrape for ${domain} - Query: ${dorkQuery}`);
  
  let browser = null;
  let context = null;

  try {
    const launched = await launchBraveBrowser(true); // use proxy only if the operator opted in
    browser = launched.browser;

    context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);

    // Brave answers automated queries with 429 long before it shows a page. That
    // is a rate limit, not an empty result: say so instead of pretending the
    // engine found nothing.
    const status = response ? response.status() : 0;
    if (status === 429) {
      deps.logger('[Brave Dork Engine] Brave answered HTTP 429 (rate limit). Skipping this pass honestly.');
      return {
        totalScraped: 0,
        found: 0,
        note: 'Brave is rate-limiting automated searches from this network (HTTP 429). Other engines still run; Brave retries on the next search.'
      };
    }

    if (deps.abortSignal.aborted) return { totalScraped: 0, found: 0 };

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
          id: `brave_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          userId: 'admin_1',
          sessionId,
          name: name,
          category: category,
          city: location,
          address: '',
          phone: extracted.phones.length > 0 ? extracted.phones[0] : '',
          email: extracted.emails.length > 0 ? extracted.emails[0] : '',
          pricing: extracted.pricingFound || '',
          socialLink: v.link,
          source: `Brave Dork (${domain})`,
          aiVerified: extracted.score >= 40,
          qualityScore: extracted.score,
          createdAt: new Date().toISOString(),
          scrapedAt: new Date().toISOString()
        };
        if (!fidelity.isVendorRelevant(created, category)) {
          try {
            const { archiveDivergentLead } = require('../../services/divergentLeadService');
            archiveDivergentLead(created, category);
          } catch (e) {}
          continue;
        }
        dbAdapter.saveVendor('admin_1', created);
        try { deps.emitVendorEvent(created, 'inserted'); } catch (e) {}
        newCount++;
      }
    }
    deps.logger(`[Brave Dork Engine] Complete for ${domain}. Inserted ${newCount} new vendors.`);
    return { totalScraped: newCount, found: results.length };
  } catch (error) {
    deps.logger(`[Brave Dork Error] ${error.message}`);
    return {
      totalScraped: 0,
      found: 0,
      note: `Brave pass could not finish: ${String(error.message).slice(0, 160)}`
    };
  } finally {
    try { if (context) await context.close(); } catch(e){}
    try { if (browser) await browser.close(); } catch(e){}
  }
}

module.exports = {
  scrapeBraveDork,
  setDeps
};
