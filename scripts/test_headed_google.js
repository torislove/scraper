// scripts/test_headed_google.js
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function testHeaded() {
  console.log('[Test] Launching system Chrome in HEADED mode (Real Browser)...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
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

  const query = 'Restaurants in Guntur';
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&gl=in`;
  console.log(`[Test] Navigating to: ${searchUrl}`);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  console.log(`[Test] Current URL: ${page.url()}`);
  console.log(`[Test] Page Title: ${await page.title()}`);
  const isSorry = page.url().includes('google.com/sorry');
  console.log(`[Test] Is challenged by /sorry?: ${isSorry}`);

  if (!isSorry) {
    const morePlaces = await page.$('a:has-text("More places"), a:has-text("More businesses"), a[href*="tbm=lcl"]');
    console.log(`[Test] Found "More places" button?: ${Boolean(morePlaces)}`);

    if (morePlaces) {
      const text = await morePlaces.innerText();
      console.log(`[Test] More places text: "${text.trim()}"`);
      await morePlaces.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      console.log(`[Test] After clicking More places, URL: ${page.url()}`);

      const cards = await page.$$('div.VkpGBb, div.rl_item, div[jscontroller="e6hkjf"]');
      console.log(`[Test] Cards found on Page 1: ${cards.length}`);

      const gTable = await page.$('table.AaVjTc, div[role="navigation"]');
      console.log(`[Test] Found Gooooooogle pagination table?: ${Boolean(gTable)}`);

      const nextBtn = await page.$('a#pnnext, a[aria-label="Next page"], table.AaVjTc a#pnnext, a:has-text("Next")');
      console.log(`[Test] Found Next button in Gooooooogle?: ${Boolean(nextBtn)}`);
    }
  }

  await browser.close();
}

testHeaded().catch(console.error);
