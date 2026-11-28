// scripts/test_google_typing.js
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function testTyping() {
  console.log('[Test] Launching Chrome with persistent profile or real user flow...');
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
    viewport: { width: 1280, height: 900 }
  });

  const page = await context.newPage();

  console.log('[Test] 1. Visiting https://www.google.com home page...');
  await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);

  console.log(`[Test] Home page URL: ${page.url()}`);
  console.log(`[Test] Is challenged on home page?: ${page.url().includes('google.com/sorry')}`);

  // Find search textarea or input
  const searchInput = await page.$('textarea[name="q"], input[name="q"]');
  console.log(`[Test] Found search input on home page?: ${Boolean(searchInput)}`);

  if (searchInput) {
    console.log('[Test] Typing "Restaurants in Guntur" into search box...');
    await searchInput.fill('Restaurants in Guntur');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    console.log(`[Test] After search URL: ${page.url()}`);
    console.log(`[Test] Page Title: ${await page.title()}`);
    console.log(`[Test] Is challenged after search?: ${page.url().includes('google.com/sorry')}`);

    const morePlaces = await page.$('a:has-text("More places"), a:has-text("More businesses"), a[href*="tbm=lcl"]');
    console.log(`[Test] Found "More places" button?: ${Boolean(morePlaces)}`);

    if (morePlaces) {
      console.log('[Test] Clicking "More places"...');
      await morePlaces.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      console.log(`[Test] After More places URL: ${page.url()}`);

      const cards = await page.$$('div.VkpGBb, div.rl_item, div[jscontroller="e6hkjf"]');
      console.log(`[Test] Place cards on Page 1: ${cards.length}`);

      const gTable = await page.$('table.AaVjTc, div[role="navigation"]');
      console.log(`[Test] Found Gooooooogle pagination table?: ${Boolean(gTable)}`);

      const nextBtn = await page.$('a#pnnext, a[aria-label="Next page"], table.AaVjTc a#pnnext, a:has-text("Next")');
      console.log(`[Test] Found Next button in Gooooooogle?: ${Boolean(nextBtn)}`);
    }
  }

  await browser.close();
}

testTyping().catch(console.error);
