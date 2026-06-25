(async () => {
  try {
    const playwrightExtra = require('playwright-extra');
    const stealth = require('puppeteer-extra-plugin-stealth')();
    const chromium = playwrightExtra.chromium;
    chromium.use && chromium.use(stealth);
    console.log('Playwright module loaded, attempting to launch Chromium...');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    console.log('Chromium launched successfully:', !!browser);
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://example.com', { timeout: 30000 });
    const title = await page.title();
    console.log('Page title:', title);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Playwright launch error:');
    console.error(err && err.stack ? err.stack : err);
    process.exit(2);
  }
})();
