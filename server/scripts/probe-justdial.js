const fs = require('fs');
const path = require('path');
const { launchStealthBrowser, applyAdvancedStealth } = require('../src/scrapers/browserFactory');

const outDir = path.join(__dirname, '../data/diag/pages');
fs.mkdirSync(outDir, { recursive: true });

const urls = [
  'https://www.justdial.com/Vijayawada/Plumbers',
  'https://www.justdial.com/Vijayawada/Plumbers/nct-10378025',
  'https://www.justdial.com/Vijayawada/Plumbers-in-Vijayawada',
  'https://www.justdial.com/Guntur/Electricians',
  'https://www.justdial.com/Vijayawada/Plumbing-Services'
];

(async () => {
  const { browser } = await launchStealthBrowser(false);
  for (const headlessNote of ['headless']) {
    for (const url of urls) {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 900 },
        locale: 'en-IN',
        timezoneId: 'Asia/Kolkata',
        extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' }
      });
      const page = await context.newPage();
      await applyAdvancedStealth(page);
      let status = 0;
      page.on('response', r => { if (r.url() === page.url()) status = r.status(); });
      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        status = response ? response.status() : 0;
        await page.waitForTimeout(6000);
        const info = await page.evaluate(() => {
          const clean = v => String(v || '').replace(/\s+/g, ' ').trim();
          return {
            url: location.href,
            title: document.title,
            bodyLen: document.body ? document.body.innerText.length : 0,
            excerpt: clean(document.body ? document.body.innerText : '').slice(0, 400),
            cards: document.querySelectorAll('.resultbox_info').length,
            resultbox: document.querySelectorAll('.resultbox').length,
            anyCardClass: [...document.querySelectorAll('[class*="resultbox"]')].length,
            captcha: /captcha|access denied|blocked|unusual traffic/i.test(document.body ? document.body.innerText : ''),
            scripts: document.querySelectorAll('script').length
          };
        });
        console.log('\n===', url);
        console.log(JSON.stringify({ status, ...info }, null, 1));
        const file = url.replace(/https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 80);
        fs.writeFileSync(path.join(outDir, `probe-${file}.html`), await page.content());
      } catch (error) {
        console.log('\n===', url, 'ERROR', error.message);
      }
      await context.close().catch(() => {});
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  await browser.close().catch(() => {});
  process.exit(0);
})();
