let chromium, stealth;

try {
  const { chromium: playwrightChromium } = require('playwright-extra');
  chromium = playwrightChromium;
  stealth = require('puppeteer-extra-plugin-stealth')();
  chromium.use(stealth);
  console.log('[Playwright] Browser engines loaded with Stealth.');
} catch (e) {
  console.warn('[Playwright] Not available on this server.');
}

const { getProxyList, getRandomIP } = require('./proxyManager');

const STEALTH_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
];

const fs = require('fs');

async function launchStealthBrowser(useProxy = true, executablePath = null, isHeadless = true, isLowResource = false) {
  if (!chromium) throw new Error('Playwright not available on this server.');

  const userAgent = STEALTH_USER_AGENTS[Math.floor(Math.random() * STEALTH_USER_AGENTS.length)];
  const fakeIP = getRandomIP();

  let proxyConfig = undefined;
  const proxyList = getProxyList();
  if (useProxy && proxyList.length > 0) {
    const rawProxy = proxyList[Math.floor(Math.random() * proxyList.length)];
    try {
      new URL(rawProxy);
      proxyConfig = { server: rawProxy };
    } catch(e) {}
  }

  // Original Admin browser args:
  const adminArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-http2',
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    `--user-agent=${userAgent}`,
    // Force Hardware Acceleration & Graphics Card
    '--enable-gpu',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--enable-accelerated-2d-canvas'
  ];

  // Low Resource Client browser args:
  const lowResourceArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-zygote',
    '--single-process',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    `--user-agent=${userAgent}`
  ];

  const launchArgs = isLowResource ? lowResourceArgs : adminArgs;

  const path = require('path');
  const os = require('os');
  const userDataDir = path.join(os.homedir(), '.gomandap_scraper_profile_playwright');

  const launchOptions = {
    headless: isHeadless,
    args: launchArgs,
    ...(proxyConfig ? { proxy: proxyConfig } : {})
  };

  if (executablePath && typeof executablePath === 'string') {
    launchOptions.executablePath = executablePath;
  } else {
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable'
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        launchOptions.executablePath = p;
        break;
      }
    }
  }
  
  const browser = await chromium.launch(launchOptions);

  if (isLowResource) {
    const originalNewContext = browser.newContext.bind(browser);
    browser.newContext = async function(options) {
      const context = await originalNewContext(options);
      
      // Intercept routes to block heavy resources (saving RAM and bandwidth)
      await context.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        if (['image', 'media', 'font'].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      return context;
    };
  }
  
  return { browser, userAgent, fakeIP, isPersistent: false };
}

async function launchBraveBrowser(useProxy = true, executablePath = null, isHeadless = true, isLowResource = false) {
  const bravePath = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  try {
    return await launchStealthBrowser(useProxy, bravePath, isHeadless, isLowResource);
  } catch (error) {
    console.warn(`[Brave] Could not launch Brave. Falling back to default chromium.`);
    return await launchStealthBrowser(useProxy, null, isHeadless, isLowResource);
  }
}

async function launchFirefoxBrowser(useProxy = false) {
  throw new Error('Firefox not available. Reverting to Puppeteer Chromium Native Intelligence.');
}

let globalBrowser = null;
let globalLowResourceBrowser = null;

async function getBrowser(isLowResource = false) {
  if (isLowResource) {
    if (!globalLowResourceBrowser || !globalLowResourceBrowser.isConnected()) {
      const { browser } = await launchStealthBrowser(false, null, true, true); 
      globalLowResourceBrowser = browser;
    }
    return globalLowResourceBrowser;
  } else {
    if (!globalBrowser || !globalBrowser.isConnected()) {
      const { browser } = await launchStealthBrowser(false, null, true, false); 
      globalBrowser = browser;
    }
    return globalBrowser;
  }
}

async function applyAdvancedStealth(page) {
  try {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) return 'Intel Inc.';
        if (parameter === 37446) return 'Intel Iris OpenGL Engine';
        return getParameter.call(this, parameter);
      };
    });
  } catch(e) {}
}

module.exports = {
  launchStealthBrowser,
  launchBraveBrowser,
  launchFirefoxBrowser,
  getBrowser,
  applyAdvancedStealth,
  chromium
};
