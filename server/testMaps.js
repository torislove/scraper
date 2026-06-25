const playwrightExtra = require('playwright-extra');
const chromium = playwrightExtra.chromium;
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.google.com/maps/search/banquet+halls+in+guntur');
  await page.waitForTimeout(5000);
  
  const counts = [];
  for (let i = 0; i < 5; i++) {
    await page.locator('div[role="feed"]').evaluate(node => node.scrollBy(0, 5000));
    await page.waitForTimeout(1000);
    counts.push(await page.locator('a.hfpxzc').count());
  }
  console.log('Card counts after scrolling:', counts);
  await browser.close();
})();
