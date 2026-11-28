'use strict';

const { chromium } = require('../server/node_modules/playwright-extra');
const stealth = require('../server/node_modules/puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testGoogleSearchNormal() {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();
  const url = 'https://www.google.com/search?q=Restaurants+in+Colaba+Mumbai&hl=en&gl=in';
  console.log('Navigating to standard Google Search:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(2000);
  console.log('Final URL:', page.url());
  console.log('Title:', await page.title());

  const isSorry = page.url().includes('google.com/sorry');
  console.log('Is blocked by sorry:', isSorry);

  if (!isSorry) {
    const morePlaces = await page.evaluate(() => {
      const moreBtn = document.querySelector('a:has-text("More places"), [data-async-trigger="reviewDialog"], a[href*="udm="], a[href*="tbm=lcl"]');
      const headings = Array.from(document.querySelectorAll('div[role="heading"] span, h3')).map(h => h.innerText.trim()).filter(Boolean);
      return {
        hasMoreBtn: Boolean(moreBtn),
        headings: headings.slice(0, 10)
      };
    });
    console.log('Google Search Result:', morePlaces);
  }

  await browser.close();
}

testGoogleSearchNormal().catch(console.error);
