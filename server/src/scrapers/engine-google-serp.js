const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const { HttpsProxyAgent } = require('https-proxy-agent');
const cheerio = require('cheerio');
const { getBrowser, launchStealthBrowser } = require('./browserFactory');
const { getProxyList } = require('./proxyManager');
const dbAdapter = require('../config/dbAdapter');

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

async function scrapeGoogleSerp(query, category, location, sessionId = "legacy", isClient = false, userId = null) {
  addLog(`[Universal Web Search] Starting organic web search for: "${query}"`);
  
  let browser = null;
  let context = null;
  let isStandaloneBrowser = false;
  
  let results = [];
  let page = null;
  
  try {
    try {
      // Try direct Google connection
      browser = await getBrowser();
      context = await browser.newContext();
      page = await context.newPage();
      
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      const consentBtn = page.locator('button:has-text("Accept all"), button:has-text("Reject all"), button:has-text("I agree"), button:has-text("Agree")');
      if (await consentBtn.count() > 0) {
        await consentBtn.first().click({ timeout: 5000 }).catch(() => {});
      }
      
      let html = await page.content();
      let isBlocked = html.includes('captcha') || html.includes('unusual traffic') || html.includes('not a robot');
      let hasSearch = await page.$('#search') !== null;
      
      if (isBlocked || !hasSearch) {
        addLog(`[Universal Web Search] Direct Google search was blocked or timed out (CAPTCHA/Consent). Retrying Google with proxy...`);
        await context.close().catch(() => {});
        context = null;
        
        let proxyAttempts = 3;
        let success = false;
        
        for (let attempt = 1; attempt <= proxyAttempts; attempt++) {
          try {
            addLog(`[Universal Web Search] Google proxy attempt ${attempt}/${proxyAttempts}...`);
            if (context) {
              await context.close().catch(() => {});
              context = null;
            }
            if (isStandaloneBrowser && browser) {
              await browser.close().catch(() => {});
              browser = null;
            }
            
            const launched = await launchStealthBrowser(true);
            browser = launched.browser;
            isStandaloneBrowser = true;
            context = await browser.newContext();
            page = await context.newPage();
            
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
            
            const consentBtn = page.locator('button:has-text("Accept all"), button:has-text("Reject all"), button:has-text("I agree"), button:has-text("Agree")');
            if (await consentBtn.count() > 0) {
              await consentBtn.first().click({ timeout: 5000 }).catch(() => {});
            }
            
            html = await page.content();
            isBlocked = html.includes('captcha') || html.includes('unusual traffic') || html.includes('not a robot');
            hasSearch = await page.$('#search') !== null;
            
            if (!isBlocked && hasSearch) {
              addLog(`[Universal Web Search] Google proxy attempt ${attempt} succeeded!`);
              success = true;
              break;
            } else {
              addLog(`[Universal Web Search] Google proxy attempt ${attempt} was blocked or returned no results.`);
            }
          } catch (proxyErr) {
            addLog(`[Universal Web Search] Google proxy attempt ${attempt} failed: ${proxyErr.message}`);
          }
        }
        
        if (!success) {
          throw new Error("All Google proxy fallback attempts failed or were blocked.");
        }
      }
      
      await page.waitForSelector('#search', { timeout: 15000 });
      
      results = await page.evaluate(() => {
        const links = [];
        const resultDivs = document.querySelectorAll('#search div.g');
        resultDivs.forEach(div => {
          const aTag = div.querySelector('a');
          const h3 = div.querySelector('h3');
          const descDiv = div.querySelector('div[style="-webkit-line-clamp:2"]');
          if (aTag && h3) {
            const href = aTag.getAttribute('href');
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
      
      addLog(`[Universal Web Search] Found ${results.length} Google search results.`);
    } catch (googleErr) {
      addLog(`[Universal Web Search] Google search failed: ${googleErr.message}. Falling back to Bing Search...`);
      
      if (isStandaloneBrowser && browser) {
        await browser.close().catch(() => {});
        browser = null;
      } else if (context) {
        await context.close().catch(() => {});
        context = null;
      }
      isStandaloneBrowser = false;
      
      // Try direct Bing connection
      browser = await getBrowser();
      context = await browser.newContext();
      page = await context.newPage();
      
      const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=20`;
      await page.goto(bingUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      let hasBingSearch = await page.$('li.b_algo') !== null;
      if (!hasBingSearch) {
        addLog(`[Universal Web Search] Direct Bing search blocked or timed out. Retrying Bing with proxy...`);
        await context.close().catch(() => {});
        context = null;
        
        const launched = await launchStealthBrowser(true);
        browser = launched.browser;
        isStandaloneBrowser = true;
        context = await browser.newContext();
        page = await context.newPage();
        await page.goto(bingUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      }
      
      await page.waitForSelector('li.b_algo', { timeout: 15000 });
      
      results = await page.evaluate(() => {
        const links = [];
        document.querySelectorAll('li.b_algo').forEach(el => {
          const titleEl = el.querySelector('h2 a');
          const snippetEl = el.querySelector('.b_caption p') || el.querySelector('.b_algoSlug');
          const title = titleEl ? titleEl.innerText.trim() : '';
          let url = titleEl ? titleEl.getAttribute('href') : '';
          
          // Decode Bing redirect URL to extract target website
          if (url && url.includes('bing.com/ck/a')) {
            const match = url.match(/[\?&]u=a1([a-zA-Z0-9_\-]+)/);
            if (match && match[1]) {
              try {
                let base64Str = match[1].replace(/_/g, '/').replace(/-/g, '+');
                while (base64Str.length % 4 !== 0) base64Str += '=';
                url = atob(base64Str);
              } catch (e) {}
            }
          }
          
          const snippet = snippetEl ? snippetEl.innerText.trim() : (el.innerText || '');
          if (url && url.startsWith('http') && !url.includes('bing.com')) {
            links.push({
              title,
              url,
              description: snippet
            });
          }
        });
        return links;
      });
      
      addLog(`[Universal Web Search] Found ${results.length} Bing search results.`);
    }
    
    // Close browser as we will use fast Cheerio for deep scanning
    if (isStandaloneBrowser && browser) {
      await browser.close().catch(() => {});
    } else if (context) {
      await context.close().catch(() => {});
    }
    browser = null;
    context = null;
    
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
        
        const vendorObj = {
          id: 'web_' + Date.now().toString() + Math.random().toString(36).substring(7),
          name: result.title,
          category: category,
          city: location || 'Unknown',
          address: result.description,
          phone: phones.length > 0 ? `+91 ${phones[0].slice(-10)}` : null,
          email: emails.length > 0 ? emails[0] : null,
          website: result.url,
          source: 'Universal Web',
          verified: false,
          pushed: false,
          scrapedAt: new Date().toISOString(),
          userId: userId || 'admin_1'
        };
        
        if (vendorObj.phone || vendorObj.email) {
          dbAdapter.saveVendor(userId, vendorObj);
          if (typeof emitVendorEvent === 'function') emitVendorEvent(vendorObj, 'inserted');
          addLog(`[Universal Web Search] Extracted contact info from ${result.url}: ${vendorObj.phone || 'No Phone'}, ${vendorObj.email || 'No Email'}`);
        }
        
      } catch (err) {
        // Many sites will block axios or timeout, we just ignore and continue
      }
    });
    
    await Promise.allSettled(scanPromises);
    addLog(`[Universal Web Search] Finished processing organic results for "${query}"`);
    
  } catch (error) {
    addLog(`[Universal Web Search ERROR] Failed to scrape: ${error.message}`);
    if (browser) await browser.close();
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
