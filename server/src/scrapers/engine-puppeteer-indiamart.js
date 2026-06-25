const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const dbAdapter = require('../config/dbAdapter');
const { injectManualLoginUI } = require('../utils/manualIntervention');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

async function scrapePuppeteerIndiaMart(category, location) {
  deps.logger(`[Puppeteer Stealth] Starting IndiaMart deep scrape for ${category} in ${location}`);
  const searchUrl = `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(category)}+in+${encodeURIComponent(location)}`;
  
  const path = require('path');
  const os = require('os');
  const userDataDir = 'C:\\Users\\manoj\\AppData\\Local\\Google\\Chrome\\User Data';

  let browser = null;
  let isCDP = false;
  try {
    try {
      browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
      deps.logger('[Puppeteer] Successfully connected to existing Chrome via CDP.');
      isCDP = true;
    } catch (err) {
      deps.logger('[Puppeteer] Could not connect to CDP on 9222. Launching new browser.');
      browser = await puppeteer.launch({
        headless: false,
        userDataDir: userDataDir,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
      });
    }

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();
    
    // Randomize user agent slightly to evade basic fingerprinting
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    deps.logger(`[Puppeteer Stealth] Navigating to IndiaMart homepage for login...`);
    try {
      await page.goto('https://www.indiamart.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch(e) {
      deps.logger(`[IndiaMart] goto timed out, continuing to UI injection.`);
    }
    
    await page.waitForTimeout(3000); // Wait for the page to settle

    // Now navigate to search
    const currentUrl = page.url();
    if (currentUrl.includes('google.com') || currentUrl === 'about:blank' || currentUrl.includes('indiamart.com')) {
      deps.logger(`[Puppeteer Stealth] Navigating to search: ${searchUrl}`);
    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch(e) {}
    }

    // Extract basic leads from listing
    const extractedLeads = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('.ls_co_nm, .mng_title').forEach((el) => {
        const name = el.innerText.trim();
        const parent = el.closest('li') || el.closest('.lst_nd');
        if (parent) {
          const addressEl = parent.querySelector('.clg, .desc_loc');
          const address = addressEl ? addressEl.innerText.trim() : 'India';
          const linkEl = parent.querySelector('a');
          const website = linkEl ? linkEl.href : '';
          
          results.push({ name, address, website });
        }
      });
      return results;
    });

    deps.logger(`[Puppeteer Stealth] Found ${extractedLeads.length} leads on IndiaMart. Processing...`);

    const existingVendors = await dbAdapter.getVendors();

    for (const lead of extractedLeads) {
      if (deps.abortSignal.aborted) break;

      const newLead = {
        name: lead.name,
        category: category,
        city: location,
        address: lead.address,
        phone: null, // IndiaMart usually requires clicking "View Number", which we skip for broad scrape, rely on Crawlee to deep-scan website
        email: null,
        website: lead.website,
        source: 'IndiaMART (Puppeteer)',
        verified: false,
        pushed: false
      };

      const isDup = existingVendors.find(v => v.website === newLead.website || v.name === newLead.name);
      if (!isDup && newLead.name) {
        existingVendors.push(newLead);
        await dbAdapter.saveVendors(existingVendors);
        try { deps.emitVendorEvent(newLead, 'inserted'); } catch (e) {}
      }
    }

  } catch (error) {
    deps.logger(`[IndiaMart Error] ${error.message}`);
  } finally {
    if (browser && !isCDP) try { await browser.close(); } catch(e){}
  }
}

module.exports = { scrapePuppeteerIndiaMart, setDeps };
