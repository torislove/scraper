const playwrightExtra = require('playwright-extra');
const chromium = playwrightExtra.chromium;
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.google.com/search?q=synonyms+for+ice+cream+vendors+in+india');
  
  // Try to find Google's featured snippet or bold words
  const boldWords = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.hgKElc b, .Z0LcW, .vmod b')).map(b => b.innerText);
  });
  console.log('Google extracted synonyms:', boldWords);
  await browser.close();
})();
