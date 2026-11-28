// scripts/test_persistent_search.js
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const path = require('path');
const os = require('os');

async function testPersistentSearch() {
  const tempProfileDir = path.join(os.tmpdir(), 'chrome_scraper_profile_' + Date.now());
  console.log('[Test] Launching persistent context at:', tempProfileDir);

  const context = await chromium.launchPersistentContext(tempProfileDir, {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    channel: 'chrome',
    viewport: { width: 1280, height: 900 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const page = context.pages()[0] || await context.newPage();

  console.log('[Test] Navigating to Google Search: https://www.google.com/search?q=Restaurants+in+Guntur&hl=en&gl=in');
  await page.goto('https://www.google.com/search?q=Restaurants+in+Guntur&hl=en&gl=in', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  console.log('[Test] URL:', page.url());
  console.log('[Test] Title:', await page.title());
  console.log('[Test] Is /sorry?:', page.url().includes('google.com/sorry'));

  await context.close();
}

testPersistentSearch().catch(console.error);
