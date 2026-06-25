const { launchStealthBrowser } = require('./browserFactory');
const dbAdapter = require('../config/dbAdapter');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

async function scrapeWeddingBazaar(category, location) {
  const city = location.split(',')[0].trim().toLowerCase().replace(/ /g, '-');
  const catParam = category.toLowerCase().replace(/ /g, '-');
  const url = `https://www.weddingbazaar.com/${catParam}-in-${city}`;
  
  deps.logger(`[WeddingBazaar Engine] Starting scrape for ${category} in ${location}`);
  
  let browser = null;
  let context = null;

  try {
    const launched = await launchStealthBrowser(true); // use proxy
    browser = launched.browser;

    context = await browser.newContext({
      viewport: { width: 1280 + Math.floor(Math.random()*100), height: 800 + Math.floor(Math.random()*100) },
      userAgent: launched.userAgent
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(6000);

    for (let i = 0; i < 6; i++) {
      if (deps.abortSignal.aborted) break;
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(1500);
    }
    
    if (deps.abortSignal.aborted) return;

    const results = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.vendor-card, .listing-card, article')).map(node => {
        const nameEl = node.querySelector('h2, h3, .vendor-name');
        const name = nameEl ? nameEl.innerText.trim() : null;
        const addrEl = node.querySelector('.vendor-location, .locality');
        const address = addrEl ? addrEl.innerText.trim() : '';
        const ratingEl = node.querySelector('.rating, .vendor-rating');
        const rating = ratingEl ? ratingEl.innerText.trim() : null;
        const linkEl = node.querySelector('a');
        const profileLink = linkEl ? linkEl.href : '';
        return { name, address, rating, profileLink };
      }).filter(v => v.name);
    });

    deps.logger(`[WeddingBazaar Engine] Found ${results.length} raw results.`);
    let newCount = 0;
    
    const vendors = dbAdapter.getVendors();
    for (const v of results) {
      if (deps.abortSignal.aborted) break;
      const existing = vendors.find(x => x.name === v.name && x.city === location);
      if (!existing) {
        let parsedRating = null;
        if (v.rating && v.rating !== '-') {
          parsedRating = parseFloat(v.rating);
          if (isNaN(parsedRating)) parsedRating = null;
        }
        const pincodeMatch = v.address ? v.address.match(/\b\d{6}\b/) : null;
        const created = {
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          name: v.name,
          category: category,
          city: location,
          address: v.address || `Located in ${location}`,
          pincode: pincodeMatch ? pincodeMatch[0] : '',
          phone: 'Requires Manual Lookup / Login',
          rating: parsedRating,
          mapsLink: v.profileLink || '',
          source: 'WeddingBazaar',
          scrapedAt: new Date().toISOString()
        };
        vendors.push(created);
        dbAdapter.saveVendors(vendors);
        try { deps.emitVendorEvent(created, 'inserted'); } catch (e) {}
        newCount++;
      }
    }
    deps.logger(`[WeddingBazaar Engine] Complete. Inserted ${newCount} new vendors.`);
  } catch (error) {
    deps.logger(`[WeddingBazaar Error] ${error.message}`);
  } finally {
    try { if (context) await context.close(); } catch(e){}
    try { if (browser) await browser.close(); } catch(e){}
  }
}

module.exports = {
  scrapeWeddingBazaar,
  setDeps
};
