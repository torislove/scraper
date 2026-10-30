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
const fs = require('fs');
const path = require('path');
const os = require('os');

const STEALTH_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
];

const activeBrowsers = new Set();
let globalBrowser = null;

// Desktop builds deliberately do not ship Chromium (~300 MB). Microsoft Edge
// is present on every Windows 10/11 machine, so we drive that instead.
const USE_SYSTEM_EDGE =
  process.env.SCRAPER_BROWSER_CHANNEL === 'msedge' || process.env.SCRAPER_DESKTOP === '1';

async function launchStealthBrowser(useProxy = true, executablePath = null, isHeadless = true) {
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
    } catch (e) {}
  }

  const launchArgs = [
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

  // Isolated profile for background scraping
  const userDataDir = path.join(os.homedir(), '.gomandap_scraper_profile_playwright');

  const launchOptions = {
    headless: isHeadless,
    args: launchArgs,
    ...(proxyConfig ? { proxy: proxyConfig } : {})
  };

  if (executablePath && typeof executablePath === 'string') {
    launchOptions.executablePath = executablePath;
  } else {
    // Windows auto-detection: prefer an already-installed Chromium so the
    // packaged app never depends on `playwright install`.
    const possiblePaths = [
      process.env.SCRAPER_CHROME_PATH,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ].filter(Boolean);
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        launchOptions.executablePath = p;
        break;
      }
    }
    // Last resort on Windows: let Playwright resolve Edge by channel.
    if (!launchOptions.executablePath && USE_SYSTEM_EDGE) {
      launchOptions.channel = 'msedge';
    }
  }

  // Launch a standard, isolated headless browser instance.
  const browser = await chromium.launch(launchOptions);
  try {
    activeBrowsers.add(browser);
    browser.on('disconnected', () => activeBrowsers.delete(browser));
  } catch (e) {}

  return { browser, userAgent, fakeIP, isPersistent: false };
}

async function launchBraveBrowser(useProxy = true) {
  const bravePath = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
  try {
    return await launchStealthBrowser(useProxy, bravePath);
  } catch (error) {
    console.warn(`[Brave] Could not launch Brave from ${bravePath}. Ensure it is installed. Falling back to default chromium.`);
    return await launchStealthBrowser(useProxy);
  }
}

async function launchFirefoxBrowser(useProxy = false, isHeadless = true) {
  try {
    const { firefox } = require('playwright');
    if (firefox) {
      const possibleFirefoxPaths = [
        'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
        'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'
      ];
      let executablePath = null;
      for (const p of possibleFirefoxPaths) {
        if (fs.existsSync(p)) {
          executablePath = p;
          break;
        }
      }

      const launchOpts = {
        headless: isHeadless,
        ...(executablePath ? { executablePath } : {})
      };

      const browser = await firefox.launch(launchOpts);
      activeBrowsers.add(browser);
      browser.on('disconnected', () => activeBrowsers.delete(browser));
      return {
        browser,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
        fakeIP: getRandomIP(),
        isPersistent: false
      };
    }
  } catch (err) {
    console.warn(`[Firefox] Playwright Firefox launch failed: ${err.message}. Falling back to Stealth Chromium.`);
  }
  return await launchStealthBrowser(useProxy);
}

async function getBrowser() {
  if (!globalBrowser || !globalBrowser.isConnected()) {
    const { browser } = await launchStealthBrowser(false);
    globalBrowser = browser;
  }
  return globalBrowser;
}

async function applyAdvancedStealth(page) {
  try {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });

      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter) {
        if (parameter === 37445) return 'Intel Inc.';
        if (parameter === 37446) return 'Intel Iris OpenGL Engine';
        return getParameter.call(this, parameter);
      };
    });
  } catch (e) {}
}

async function optimizePageForSpeed(page) {
  try {
    await page.route('**/*', (route) => {
      const req = route.request();
      const resourceType = req.resourceType();
      const url = req.url().toLowerCase();

      // Tier 2 Playwright: Aggressive resource blocking (strips 90% page weight, <400ms loads)
      if (['image', 'media', 'font', 'stylesheet', 'other'].includes(resourceType)) {
        return route.abort();
      }
      if (
        url.includes('google-analytics.com') ||
        url.includes('googletagmanager.com') ||
        url.includes('doubleclick.net') ||
        url.includes('facebook.net') ||
        url.includes('analytics') ||
        url.includes('metrics') ||
        url.includes('adservice') ||
        url.includes('favicon')
      ) {
        return route.abort();
      }
      return route.continue();
    });
  } catch (e) {}
}

async function closeAllBrowsers() {
  console.log(`[BrowserFactory] Terminating ${activeBrowsers.size} active browser instances...`);
  const promises = [];
  for (const b of activeBrowsers) {
    try {
      promises.push(b.close().catch(() => {}));
    } catch (e) {}
  }
  activeBrowsers.clear();
  if (globalBrowser) {
    try {
      promises.push(globalBrowser.close().catch(() => {}));
    } catch (e) {}
    globalBrowser = null;
  }
  await Promise.allSettled(promises);
  console.log('[BrowserFactory] All browser instances terminated cleanly.');
}

function getOptimalLaunchConfig(req = null) {
  const ua = req?.headers?.['user-agent'] || '';
  const isMobile = /Mobile|Android|iPhone/i.test(ua);
  const lowMem = os.freemem() < 512 * 1024 * 1024; // < 512MB free

  return {
    headless: true,
    args: lowMem ? ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] : [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--enable-gpu'
    ],
    viewport: isMobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
    isMobile
  };
}

module.exports = {
  launchStealthBrowser,
  launchBraveBrowser,
  launchFirefoxBrowser,
  getBrowser,
  applyAdvancedStealth,
  optimizePageForSpeed,
  closeAllBrowsers,
  getOptimalLaunchConfig,
  chromium
};
