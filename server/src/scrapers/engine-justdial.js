const { firefox } = require('playwright');
const dbAdapter = require('../config/dbAdapter');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

async function scrapeJustDial(category, location) {
  deps.logger(`[JustDial Playwright] Starting Firefox scrape for ${category} in ${location}`);
  let searchUrl = `https://www.justdial.com/${location.split(',')[0].trim()}/${category.replace(/ /g, '-')}`;
  if (category.startsWith('http')) {
    searchUrl = category;
  }
  
  deps.logger(`[JustDial Playwright] Target URL: ${searchUrl}`);
  
  let browser = null;
  try {
    // Launch Playwright Firefox
    browser = await firefox.launch({
      headless: true
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0'
    });

    const page = await context.newPage();
    
    // Intercept/abort images, media, and fonts to optimize speed
    await context.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'media', 'font'].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    deps.logger(`[JustDial Playwright] Navigating to: ${searchUrl}`);
    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch(e) {
      deps.logger(`[JustDial Playwright] Navigation timed out, continuing anyway. Error: ${e.message}`);
    }

    // Wait a brief moment for dynamic elements to initialize
    await page.waitForTimeout(3000);

    // Dismiss login modal if exists
    try {
      const closeSelectors = ['.jdicon-close', '.login-close', '.modal-close', 'button[aria-label="Close"]'];
      for (const sel of closeSelectors) {
        const el = await page.$(sel);
        if (el) {
          await el.click();
        }
      }
    } catch(e) {}

    let newCount = 0;
    
    const extractRoutine = async () => {
      let currentNewCount = 0;
      try {
        const results = await page.evaluate(() => {
          // New selectors from writeup
          const cards = document.querySelectorAll('.resultbox');
          const data = [];
          
          cards.forEach(card => {
            // Business Name
            const nameEl = card.querySelector('.resultbox_title_anchor, .resultbox_title, h2');
            const name = nameEl ? nameEl.innerText.trim() : '';
            
            // Business Address
            const addrEl = card.querySelector('.resultbox_address, address');
            const address = addrEl ? addrEl.innerText.trim() : '';

            // Rating
            const ratingEl = card.querySelector('.resultbox_totalrate');
            const rating = ratingEl ? ratingEl.innerText.trim() : '';

            // Phone
            const phoneEl = card.querySelector('.callNowAnchor, .callbutton, a[href^="tel:"]');
            let phone = '';
            if (phoneEl) {
              const href = phoneEl.getAttribute('href');
              if (href && href.startsWith('tel:')) {
                phone = href.replace('tel:', '').trim();
              }
              if (!phone) {
                // Scan classNames for numeric digits
                const classes = Array.from(phoneEl.classList);
                for (const cls of classes) {
                  const match = cls.match(/\d{10,12}/);
                  if (match) {
                    phone = match[0];
                    break;
                  }
                }
              }
              if (!phone) {
                phone = phoneEl.innerText.trim();
              }
            }

            if (name) {
              data.push({ name, phone, rating, address });
            }
          });
          return data;
        });

        const vendors = await dbAdapter.getVendors();

        for (const res of results) {
          if (deps.abortSignal.aborted) break;
          
          let phone = res.phone.replace(/[^0-9+]/g, '');
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
        deps.logger(`[JustDial Playwright Error in Extractor] ${e.message}`);
      }
      return currentNewCount;
    };

    deps.logger('[JustDial Playwright] Auto-scrolling and extracting data...');
    let previousHeight = 0;
    let retries = 0;
    let loopCount = 0;

    // Scroll more times to scrape more vendors (faster because images are blocked)
    while (!deps.abortSignal.aborted && retries < 5 && loopCount < 15) {
      loopCount++;
      const extractedThisRound = await extractRoutine();
      newCount += extractedThisRound;
      
      const newHeight = await page.evaluate('document.body.scrollHeight');
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      // Wait for dynamic lazy-loading
      await page.waitForTimeout(2000);
      
      if (newHeight === previousHeight || extractedThisRound === 0) {
        retries++;
      } else {
        retries = 0;
      }
      previousHeight = newHeight;
    }
    
    deps.logger(`[JustDial Playwright] Extraction complete. Added ${newCount} new vendors.`);

  } catch (error) {
    deps.logger(`[JustDial Playwright Error] ${error.message}`);
  } finally {
    if (browser) {
      await browser.close().catch(e=>console.log("Could not close browser", e));
    }
  }
}

module.exports = { scrapeJustDial, setDeps };
