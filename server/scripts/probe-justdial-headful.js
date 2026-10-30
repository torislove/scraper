const fs = require('fs');
const path = require('path');
const { launchStealthBrowser, applyAdvancedStealth } = require('../src/scrapers/browserFactory');

const outDir = path.join(__dirname, '../data/diag/pages');
fs.mkdirSync(outDir, { recursive: true });

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const chromePath = CHROME_PATHS.find(p => fs.existsSync(p));
console.log('chrome path', chromePath || 'default chromium');

async function test(label, options) {
  console.log('\n=====', label);
  let browser;
  try {
    const launched = await launchStealthBrowser(options.useProxy || false, options.executablePath || null, options.headless !== false);
    browser = launched.browser;
  } catch (e) {
    console.log('launch failed', e.message);
    return;
  }
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 },
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' }
  });
  const page = await context.newPage();
  await applyAdvancedStealth(page);
  const apiBodies = [];
  page.on('response', async response => {
    if (!/resultsPageListing|rhscurate/i.test(response.url())) return;
    try {
      const text = await response.text();
      apiBodies.push({ url: response.url(), status: response.status(), len: text.length, head: text.slice(0, 120) });
    } catch (e) {}
  });

  try {
    await page.goto('https://www.justdial.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);
    const input = page.locator('input#main-auto').first();
    await input.click();
    await input.fill('Plumbers in Vijayawada');
    await page.waitForTimeout(1200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(15000);
    const info = await page.evaluate(() => ({
      url: location.href,
      cards: document.querySelectorAll('.resultbox_info').length,
      anyResultbox: document.querySelectorAll('[class*="resultbox"]').length,
      tel: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')),
      body: (document.body ? document.body.innerText : '').replace(/\s+/g, ' ').slice(0, 800)
    }));
    console.log(JSON.stringify(info, null, 1));
    console.log('API', JSON.stringify(apiBodies, null, 1));
    fs.writeFileSync(path.join(outDir, `jd-${label.replace(/[^a-z0-9]+/gi, '-')}.html`), await page.content());
  } catch (e) {
    console.log('error', e.message);
  }
  await browser.close().catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
}

(async () => {
  await test('headful-chromium', { headless: false });
  if (chromePath) await test('headful-chrome', { headless: false, executablePath: chromePath });
  process.exit(0);
})();
