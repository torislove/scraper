const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating...');
  await page.goto('https://www.google.com/maps/search/Photographers+near+16.3067,80.4365', { waitUntil: 'domcontentloaded' });
  
  console.log('Waiting for cards...');
  await page.waitForSelector('a.hfpxzc');
  console.log('Extracting cards...');
  const allCards = await page.locator('a.hfpxzc').all();
  console.log(`Found ${allCards.length} cards`);
  
  for (let i = 0; i < Math.min(15, allCards.length); i++) {
    try {
      const name = await allCards[i].getAttribute('aria-label');
      console.log(`Clicking card ${i}:`, name);
      await allCards[i].click();
      await page.waitForTimeout(500);
      const address = await page.locator('[data-item-id="address"]').getAttribute('aria-label').catch(()=>'No address');
      console.log(` -> Address:`, address);
    } catch (err) {
      console.log(`Failed to click card ${i}:`, err.message);
    }
  }

  await browser.close();

  await browser.close();
})();
