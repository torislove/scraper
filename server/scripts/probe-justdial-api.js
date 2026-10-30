const fs = require('fs');
const path = require('path');
const { launchStealthBrowser, applyAdvancedStealth } = require('../src/scrapers/browserFactory');

const outDir = path.join(__dirname, '../data/diag/pages');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const { browser } = await launchStealthBrowser(false);
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 },
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' }
  });
  const page = await context.newPage();
  await applyAdvancedStealth(page);

  const captured = [];
  page.on('response', async response => {
    const url = response.url();
    if (!/justdial\.com\/api\//i.test(url)) return;
    const entry = { url, status: response.status(), request: null, body: '' };
    try {
      entry.request = {
        method: response.request().method(),
        headers: response.request().headers(),
        postData: response.request().postData()
      };
    } catch (e) {}
    try {
      const type = response.headers()['content-type'] || '';
      if (/json|text|javascript/i.test(type)) {
        const text = await response.text();
        entry.body = text.slice(0, 200000);
      }
    } catch (e) { entry.error = e.message; }
    captured.push(entry);
  });

  await page.goto('https://www.justdial.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  const searchInput = page.locator('input#main-auto').first();
  await searchInput.click();
  await searchInput.fill('Plumbers in Vijayawada');
  await page.waitForTimeout(1200);
  await page.keyboard.press('Enter');

  // Give the SPA plenty of time to fetch listings.
  await page.waitForTimeout(15000);

  const info = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    cards: document.querySelectorAll('.resultbox_info').length,
    anyResultbox: document.querySelectorAll('[class*="resultbox"]').length,
    body: (document.body ? document.body.innerText : '').replace(/\s+/g, ' ').slice(0, 1200),
    apiData: window.__NEXT_DATA__ ? 'next' : ''
  }));
  console.log('PAGE', JSON.stringify(info, null, 1));

  fs.writeFileSync(path.join(outDir, 'jd-api-capture.json'), JSON.stringify(captured, null, 1));
  for (const entry of captured) {
    console.log('\nAPI', entry.status, entry.url);
    console.log('  body', entry.body.slice(0, 500));
  }

  const cookies = await context.cookies();
  fs.writeFileSync(path.join(outDir, 'jd-cookies.json'), JSON.stringify(cookies, null, 1));
  console.log('\ncookies', cookies.length);

  await page.screenshot({ path: path.join(outDir, 'jd-listing.png'), fullPage: false }).catch(() => {});
  await browser.close().catch(() => {});
  process.exit(0);
})();
