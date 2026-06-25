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

async function scrapeJustDial(category, location) {
  deps.logger(`[JustDial Puppeteer] Starting scrape for ${category} in ${location}`);
  let searchUrl = `https://www.justdial.com/${location.split(',')[0].trim()}/${category.replace(/ /g, '-')}`;
  if (category.startsWith('http')) {
    searchUrl = category;
  }
  
  deps.logger(`[JustDial Puppeteer] Target URL: ${searchUrl}`);
  
  const path = require('path');
  const os = require('os');
  const userDataDir = 'C:\\Users\\manoj\\AppData\\Local\\Google\\Chrome\\User Data';

  let browser = null;
  let isCDP = false;
  try {
    try {
      browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
      deps.logger('[JustDial Puppeteer] Successfully connected to existing Chrome via CDP.');
      isCDP = true;
    } catch (err) {
      deps.logger('[JustDial Puppeteer] Could not connect to CDP on 9222. Launching new fallback browser.');
      const path = require('path');
      const os = require('os');
      const fallbackUserDataDir = path.join(os.homedir(), '.gomandap_puppeteer_fallback');
      browser = await puppeteer.launch({
        headless: false,
        userDataDir: fallbackUserDataDir,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
      });
    }

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    
    deps.logger(`[JustDial Puppeteer] Direct navigation to: ${searchUrl}`);
    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch(e) {
      deps.logger(`[JustDial Puppeteer] goto timed out, but continuing.`);
    }

    // Attempt to dismiss login modals if any
    try {
      const closeSelectors = ['.jdicon-close', '.login-close', '.modal-close', 'button[aria-label="Close"]'];
      for (const sel of closeSelectors) {
        const el = await page.$(sel);
        if (el) {
          await page.evaluate(btn => btn.click(), el);
        }
      }
    } catch(e) {}

    let newCount = 0;
    
    const extractRoutine = async () => {
      let currentNewCount = 0;
      try {
        const results = await page.evaluate(() => {
          const cards = document.querySelectorAll('.resultbox_info');
          const data = [];
          cards.forEach(card => {
            const nameEl = card.querySelector('.resultbox_title_anchor');
            const name = nameEl ? nameEl.innerText.trim() : '';
            const rawPhoneEl = card.querySelector('.callcontent');
            let rawPhone = rawPhoneEl ? rawPhoneEl.innerText.trim() : '';
            
            const ratingEl = card.querySelector('.resultbox_totalrating');
            const rating = ratingEl ? ratingEl.innerText.trim() : '';

            const addrEl = card.querySelector('.resultbox_address');
            const address = addrEl ? addrEl.innerText.trim() : '';

            if (name) {
              data.push({ name, rawPhone, rating, address });
            }
          });
          return data;
        });

        const vendors = await dbAdapter.getVendors();

        for (const res of results) {
          if (deps.abortSignal.aborted) break;
          
          let phone = res.rawPhone.replace(/[^0-9+]/g, '');
          if (phone && !phone.startsWith('+91')) {
            phone = '+91' + phone.slice(-10);
          }

          const existing = vendors.find(v => v.name.toLowerCase() === res.name.toLowerCase() || (phone && v.phone === phone));
          if (!existing) {
            const vendorObj = {
              name: res.name,
              category: category,
              city: location.split(',')[0].trim(),
              address: res.address,
              phone: phone || 'Requires Manual Reveal',
              rating: res.rating,
              source: 'JustDial',
              verified: false
            };
            const inserted = await dbAdapter.addVendor(vendorObj);
            deps.emitVendorEvent(inserted);
            currentNewCount++;
          }
        }
        
      } catch (e) {
        deps.logger(`[JustDial Puppeteer Error in Extractor] ${e.message}`);
      }
      return currentNewCount;
    };

    deps.logger('[JustDial Puppeteer] Auto-scrolling and extracting data...');
    let previousHeight = 0;
    let retries = 0;
    let loopCount = 0;

    while (!deps.abortSignal.aborted && retries < 5 && loopCount < 15) {
      loopCount++;
      const extractedThisRound = await extractRoutine();
      newCount += extractedThisRound;
      
      const newHeight = await page.evaluate('document.body.scrollHeight');
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await new Promise(r => setTimeout(r, 2000)); // Wait for lazy load
      
      if (newHeight === previousHeight || extractedThisRound === 0) {
        retries++;
      } else {
        retries = 0;
      }
      previousHeight = newHeight;
    }
    
    deps.logger(`[JustDial Puppeteer] Extraction complete. Added ${newCount} new vendors.`);

  } catch (error) {
    deps.logger(`[JustDial Puppeteer Error] ${error.message}`);
  } finally {
    if (!isCDP && browser) {
      await browser.close().catch(e=>console.log("Could not close browser", e));
    } else if (isCDP && browser) {
      browser.disconnect();
    }
  }
}

module.exports = { scrapeJustDial, setDeps };
