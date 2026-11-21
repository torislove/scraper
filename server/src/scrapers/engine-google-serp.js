const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const cheerio = require('cheerio');
const { getBrowser } = require('./browserFactory');
const dbAdapter = require('../config/dbAdapter');
const fidelity = require('../services/categoryFidelity');
const { fastWebsiteExtract } = require('../utils/fastWebsiteExtractor');
const { normalizePhone } = require('../utils/phoneUtils');

const AGGREGATOR_DOMAINS = [
  'google.', 'justdial.com', 'indiamart.com', 'sulekha.com', 'weddingwire.in',
  'weddingbazaar.com', 'mandap.com', 'tripadvisor.', 'makemytrip.com',
  'booking.com', 'wikipedia.org', 'youtube.com', 'quikr.com', 'olx.in',
  'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com',
  'pinterest.com', 'reddit.com', 'yellowpages', 'magicbricks.com', '99acres.com', 'housing.com'
];

// Configure robust retry logic for Cheerio
axiosRetry(axios, { 
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429 || error.response?.status >= 500;
  }
});

let addLog = console.log;
let emitVendorEvent = () => {};

function setDeps(deps) {
  if (deps.logger) addLog = deps.logger;
  if (deps.emitVendorEvent) emitVendorEvent = deps.emitVendorEvent;
}

// Helper: Extract emails and phones using regex
function extractContactInfo(text) {
  const emails = [];
  const phones = [];
  
  if (!text) return { emails, phones };

  // Email regex
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
  const foundEmails = text.match(emailRegex) || [];
  foundEmails.forEach(e => {
    if (!emails.includes(e.toLowerCase()) && !e.includes('.png') && !e.includes('.jpg')) {
      emails.push(e.toLowerCase());
    }
  });

  // Indian Phone Number regex (+91, 0, or just 10 digits)
  const phoneRegex = /(?:\+91|0)?[ -]?\d{4}[ -]?\d{3}[ -]?\d{3}|(?:\+91|0)?[ -]?\d{5}[ -]?\d{5}/g;
  const foundPhones = text.match(phoneRegex) || [];
  foundPhones.forEach(p => {
    const cleanPhone = p.replace(/\D/g, '');
    if (cleanPhone.length >= 10 && cleanPhone.length <= 12) {
      if (!phones.includes(cleanPhone)) {
        phones.push(cleanPhone);
      }
    }
  });

  return { emails, phones };
}

async function scrapeGoogleSerp(query, category, location, sessionId = 'legacy') {
  addLog(`[Cyber Search Matrix] Starting index scan for: "${query}"`);

  const countryCode = (require('../services/localBrain/countries').detectCountry(location || query) || { code: 'IN' }).code;
  const countryGl = String(countryCode).toLowerCase();
  
  let browser = null;
  let context = null;
  
  try {
    browser = await getBrowser();
    context = await browser.newContext();
    
    const page = await context.newPage();
    
    // Deep Multi-Page Google Search Pagination Loop (pages 1 to 4)
    const maxPages = 4;
    const results = [];
    const seenUrls = new Set();

    for (let p = 0; p < maxPages; p++) {
      const startIndex = p * 20;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${startIndex}&num=20&hl=en&gl=${countryGl}`;
      addLog(`[Cyber Search Matrix] Scanning Google Search page ${p + 1} (nodes ${startIndex + 1}-${startIndex + 20})...`);
      
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      
      // Check if consent button appears
      try {
        const consentBtn = await page.$('button:has-text("Accept all"), button:has-text("I agree"), #L2AGLb, button:has-text("Reject all")');
        if (consentBtn) await consentBtn.click();
      } catch (e) {}

      // Wait for search results with fallback selector
      try {
        await page.waitForSelector('#search, #rso, div[role="main"]', { timeout: 6000 });
        await page.waitForSelector('div.MjjYud, #rso div.g', { timeout: 4000 });
      } catch (e) {}
      
      // Extract organic results
      const pageLinks = await page.evaluate((blockedDomains) => {
        const links = [];
        const resultDivs = document.querySelectorAll('#search div.g, #rso div.g, div.MjjYud');
        
        resultDivs.forEach(div => {
          const aTag = div.querySelector('a');
          const h3 = div.querySelector('h3');
          const descDiv = div.querySelector('div[style*="-webkit-line-clamp"], div.VwiC3b');
          
          if (aTag && h3) {
            const href = aTag.getAttribute('href');
            if (href && href.startsWith('http')) {
              const lowerHref = href.toLowerCase();
              const isBlocked = blockedDomains.some(d => lowerHref.includes(d));
              if (!isBlocked) {
                const rawTitle = (h3.innerText || '').trim();
                const cleanTitle = rawTitle.replace(/\s*[-–|•]\s*(official\s*(?:website|site)|home|about\s*us|welcome|contact\s*us|index).*$/i, '').trim();
                links.push({
                  title: cleanTitle || rawTitle,
                  url: href,
                  description: descDiv ? descDiv.innerText : ''
                });
              }
            }
          }
        });
        return links;
      }, AGGREGATOR_DOMAINS);

      let addedThisPage = 0;
      for (const item of pageLinks) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          results.push(item);
          addedThisPage++;
        }
      }

      if (addedThisPage === 0) {
        addLog(`[Cyber Search Matrix] Reached end of Google Search organic results at page ${p + 1}.`);
        break;
      }
    }
    
    addLog(`[Cyber Search Matrix] Identified ${results.length} organic nodes for "${query}". Extracting contact telemetry...`);
    
    // Close context as we will use fast Cheerio for deep scanning
    if (context) {
      try { await context.close(); } catch (e) {}
    }
    
    // Concurrently fetch and scan websites
    let inserted = 0;
    
    const scanPromises = results.map(async (result) => {
      try {
        const webData = await fastWebsiteExtract(result.url, result.title, { defaultCountry: countryCode, allowInternational: countryCode !== 'IN' });
        const parsedMobiles = (webData.mobiles || [])
          .map(raw => normalizePhone(raw, { context: 'phone mobile', defaultCountry: countryCode, allowInternational: countryCode !== 'IN', trusted: true }))
          .filter(n => n && n.isMobile);
        const primaryMobile = parsedMobiles[0] || null;
        const secondaryMobile = parsedMobiles[1] || null;
        const hasMobile = Boolean(primaryMobile);

        const vendorObj = {
          id: `serp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          userId: 'admin_1',
          sessionId,
          name: result.title,
          category: category,
          city: location || 'Unknown',
          address: result.description,
          phone: primaryMobile ? primaryMobile.displayPhone : (webData.phone || null),
          phones: webData.phones || [],
          secondaryPhone: secondaryMobile ? secondaryMobile.displayPhone : null,
          email: webData.email || (webData.emails && webData.emails[0]) || null,
          emails: webData.emails || [],
          website: result.url,
          logo: webData.logo || `https://www.google.com/s2/favicons?domain=${new URL(result.url).hostname}&sz=128`,
          contactPerson: webData.contactPerson || '',
          gstin: webData.gstin || '',
          pincode: webData.pincode || '',
          source: 'Cyber Intelligence Matrix',
          verified: hasMobile,
          pushed: false,
          qualityScore: hasMobile ? 90 : 60,
          whatsappLink: primaryMobile ? `https://wa.me/${primaryMobile.digits}?text=Hi%20${encodeURIComponent(result.title || '')}%2C%20I%20found%20your%20business%20and%20wanted%20to%20connect.` : null,
          whatsappAvailable: hasMobile,
          scrapedAt: new Date().toISOString()
        };
        
        if (fidelity.isVendorRelevant(vendorObj, category)) {
          try {
            const isDup = dbAdapter.isDuplicate(vendorObj);
            dbAdapter.saveVendor('admin_1', vendorObj);
            inserted++;
            if (typeof emitVendorEvent === 'function') emitVendorEvent(vendorObj, isDup ? 'updated' : 'inserted');
            try {
              const { streamingEnricher } = require('../services/phoneBackfillService');
              streamingEnricher.enqueue(vendorObj);
            } catch (e) {}
          } catch (saveErr) {}
          addLog(`[Cyber Search Matrix] Extracted multi-page contacts from ${result.url}: ${vendorObj.phone || 'No Mobile'}, ${vendorObj.email || 'No Email'}`);
        } else {
          try {
            const { archiveDivergentLead } = require('../services/divergentLeadService');
            archiveDivergentLead(vendorObj, category);
          } catch (e) {}
        }
      } catch (err) {
        // Skip failed site
      }
    });
    
    await Promise.allSettled(scanPromises);
    addLog(`[Cyber Search Matrix] Finished processing organic nodes for "${query}"`);
    return { totalScraped: inserted, found: results.length };
    
  } catch (error) {
    addLog(`[Cyber Search Matrix Notice] Scan completed or deferred: ${error.message}`);
    if (context) {
      try { await context.close(); } catch (e) {}
    }
    return { totalScraped: 0, found: 0 };
  }
}

// Support command line execution
if (require.main === module) {
  const query = process.argv[2] || "Photographers in Delhi";
  const category = process.argv[3] || "Photographers";
  const location = process.argv[4] || "Delhi";
  
  // Mock addLog and db for standalone execution
  global.addLog = console.log;
  scrapeGoogleSerp(query, category, location).then(() => {
    console.log("Standalone execution completed.");
    process.exit(0);
  });
}

module.exports = { scrapeGoogleSerp, setDeps };
