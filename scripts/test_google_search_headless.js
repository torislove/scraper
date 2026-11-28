// scripts/test_google_search_headless.js
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function testGoogleSearch() {
  console.log('[Test] Launching system Chrome in headless mode with stealth...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,900'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'en-IN'
  });

  const page = await context.newPage();

  // Test 1: Direct Google Search
  const query = 'Restaurants in Guntur';
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&gl=in`;
  console.log(`[Test] 1. Navigating to: ${searchUrl}`);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);

  console.log(`[Test] Current URL: ${page.url()}`);
  console.log(`[Test] Page Title: ${await page.title()}`);

  const isSorry = page.url().includes('google.com/sorry');
  console.log(`[Test] Is challenged by /sorry?: ${isSorry}`);

  if (!isSorry) {
    // Look for "More places" or "More businesses"
    const morePlaces = await page.$('a:has-text("More places"), a:has-text("More businesses"), a[href*="tbm=lcl"]');
    console.log(`[Test] Found "More places" button?: ${Boolean(morePlaces)}`);

    if (morePlaces) {
      const text = await morePlaces.innerText();
      console.log(`[Test] More places text: "${text.trim()}"`);
      await morePlaces.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      console.log(`[Test] After clicking More places, URL: ${page.url()}`);
    }
  }

  // Test 2: Local Finder directly with tbm=lcl
  const lclUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=lcl&start=0&hl=en&gl=in`;
  console.log(`\n[Test] 2. Navigating directly to Local Finder: ${lclUrl}`);
  await page.goto(lclUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);

  console.log(`[Test] Local Finder URL: ${page.url()}`);
  console.log(`[Test] Local Finder Title: ${await page.title()}`);
  console.log(`[Test] Is challenged by /sorry?: ${page.url().includes('google.com/sorry')}`);

  // Check cards in Local Finder
  const cards = await page.$$('div.VkpGBb, div.rl_item, div[jscontroller="e6hkjf"], div.rllt__details');
  console.log(`[Test] Found place cards in Local Finder: ${cards.length}`);

  // Check for "Gooooooogle" pagination table
  const gTable = await page.$('table.AaVjTc, div[role="navigation"], table#nav');
  console.log(`[Test] Found Gooooooogle pagination table?: ${Boolean(gTable)}`);

  const pages = await page.$$eval('table.AaVjTc td, td.b a, a.fl', els => els.map(e => e.innerText.trim()).filter(t => /^\d+$/.test(t)));
  console.log(`[Test] Gooooooogle page numbers found:`, pages);

  const nextBtn = await page.$('a#pnnext, a[aria-label="Next page"], table.AaVjTc a#pnnext, a:has-text("Next")');
  console.log(`[Test] Found "Next" button in Gooooooogle table?: ${Boolean(nextBtn)}`);

  await browser.close();
}

testGoogleSearch().catch(console.error);
