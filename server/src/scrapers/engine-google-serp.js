const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const { HttpsProxyAgent } = require('https-proxy-agent');
const cheerio = require('cheerio');
const { getBrowser } = require('./browserFactory');
const { getProxyList } = require('./proxyManager');
const db = require('../config/localDb');

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

async function scrapeGoogleSerp(query, category, location) {
  addLog(`[Cyber Search Matrix] Starting index scan for: "${query}"`);
  
  let browser = null;
  let context = null;
  
  try {
    browser = await getBrowser();
    context = await browser.newContext();
    
    const page = await context.newPage();
    
    // Navigate to Google
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Check if consent button appears
    try {
      const consentBtn = await page.$('button:has-text("Accept all"), button:has-text("I agree"), #L2AGLb');
      if (consentBtn) await consentBtn.click();
    } catch (e) {}

    // Wait for search results with fallback selector
    try {
      await page.waitForSelector('#search, #rso, div[role="main"]', { timeout: 8000 });
    } catch (e) {
      // Continue even if selector wait timed out
    }
    
    // Extract organic results
    const results = await page.evaluate(() => {
      const links = [];
      const resultDivs = document.querySelectorAll('#search div.g, #rso div.g, div.MjjYud');
      
      resultDivs.forEach(div => {
        const aTag = div.querySelector('a');
        const h3 = div.querySelector('h3');
        const descDiv = div.querySelector('div[style*="-webkit-line-clamp"], div.VwiC3b');
        
        if (aTag && h3) {
          const href = aTag.getAttribute('href');
          // Filter out google's own links or irrelevant links
          if (href && href.startsWith('http') && !href.includes('google.com')) {
            links.push({
              title: h3.innerText,
              url: href,
              description: descDiv ? descDiv.innerText : ''
            });
          }
        }
      });
      return links;
    });
    
    addLog(`[Cyber Search Matrix] Identified ${results.length} organic nodes for "${query}". Extracting contact telemetry...`);
    
    // Close context as we will use fast Cheerio for deep scanning
    if (context) {
      try { await context.close(); } catch (e) {}
    }
    
    // Concurrently fetch and scan websites
    const proxyList = getProxyList();
    
    const scanPromises = results.map(async (result) => {
      try {
        const USER_AGENTS = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0'
        ];
        const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        
        let axiosConfig = { 
          timeout: 15000,
          headers: { 
            'User-Agent': randomUA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Upgrade-Insecure-Requests': '1',
            'DNT': '1'
          }
        };

        if (proxyList && proxyList.length > 0) {
          const rawProxy = proxyList[Math.floor(Math.random() * proxyList.length)];
          try {
            axiosConfig.httpsAgent = new HttpsProxyAgent(rawProxy);
          } catch(e) {}
        }

        const response = await axios.get(result.url, axiosConfig);
        
        const $ = cheerio.load(response.data);
        // Remove scripts and styles before extracting text to reduce noise
        $('script, style, noscript').remove();
        const bodyText = $('body').text();
        const { emails, phones } = extractContactInfo(bodyText);
        const clean10 = phones.length > 0 ? phones[0].slice(-10) : null;
        const vendorObj = {
          name: result.title,
          category: category,
          city: location || 'Unknown',
          address: result.description,
          phone: clean10 ? `+91 ${clean10}` : null,
          secondaryPhone: phones.length > 1 ? `+91 ${phones[1].slice(-10)}` : null,
          email: emails.length > 0 ? emails[0] : null,
          website: result.url,
          source: 'Cyber Intelligence Matrix',
          verified: false,
          pushed: false,
          qualityScore: clean10 ? 85 : 60,
          whatsappLink: clean10 ? `https://wa.me/91${clean10}?text=Hi%20${encodeURIComponent(result.title || '')}%2C%20I%20found%20your%20business%20on%20Scraper.co.in%20and%20wanted%20to%20connect.` : null,
          whatsappAvailable: Boolean(clean10),
          scrapedAt: new Date().toISOString()
        };
        
        if (vendorObj.phone || vendorObj.email) {
          db.addVendor(vendorObj);
          if (typeof emitVendorEvent === 'function') emitVendorEvent(vendorObj);
          addLog(`[Cyber Search Matrix] Extracted contact telemetry from ${result.url}: ${vendorObj.phone || 'No Phone'}, ${vendorObj.email || 'No Email'}`);
        }
        
      } catch (err) {
        // Many sites will block axios or timeout, we just ignore and continue
      }
    });
    
    await Promise.allSettled(scanPromises);
    addLog(`[Cyber Search Matrix] Finished processing organic nodes for "${query}"`);
    
  } catch (error) {
    addLog(`[Cyber Search Matrix Notice] Scan completed or deferred: ${error.message}`);
    if (context) {
      try { await context.close(); } catch (e) {}
    }
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
