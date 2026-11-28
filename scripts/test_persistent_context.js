// scripts/test_persistent_context.js
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const path = require('path');
const os = require('os');

async function testPersistent() {
  const tempProfileDir = path.join(os.tmpdir(), 'chrome_scraper_profile_' + Date.now());
  console.log('[Test] Launching with launchPersistentContext at:', tempProfileDir);

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

  console.log('[Test] Navigating to Google Maps search directly: https://www.google.com/maps/search/Restaurants+in+Guntur');
  await page.goto('https://www.google.com/maps/search/Restaurants+in+Guntur', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  console.log('[Test] Current URL on Maps:', page.url());
  const cards = await page.$$('div.Nv2PK');
  console.log('[Test] Cards found on Google Maps:', cards.length);

  await context.close();
}

testPersistent().catch(console.error);
