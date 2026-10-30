const fs = require('fs');
const path = require('path');
const { launchStealthBrowser, applyAdvancedStealth } = require('../src/scrapers/browserFactory');
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

(async () => {
  const { browser } = await launchStealthBrowser(false);
  const context = await browser.newContext({
    userAgent: MOBILE_UA, viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
    locale: 'en-IN', timezoneId: 'Asia/Kolkata', extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' }
  });
  const page = await context.newPage();
  await applyAdvancedStealth(page);

  const requests = [];
  page.on('request', r => {
    if (/searchziva|result|listing/i.test(r.url()) && /m\.justdial\.com/.test(r.url())) {
      requests.push({ method: r.method(), url: r.url(), postData: r.postData(), headers: r.headers() });
    }
  });

  await page.goto('https://m.justdial.com/Vijayawada/Plumbers/nct-10378025?source=2&searchcity=Vijayawada', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('nav', e.message));
  await page.waitForTimeout(10000);

  console.log('REQUESTS', JSON.stringify(requests, null, 1).slice(0, 6000));

  // Find script srcs
  const scripts = await page.evaluate(() => [...document.querySelectorAll('script[src]')].map(s => s.src));
  console.log('\nSCRIPTS', JSON.stringify(scripts, null, 1));
  for (const src of scripts) {
    if (!/result|search|jd/i.test(src)) continue;
    try {
      const res = await page.request.get(src);
      const text = await res.text();
      if (/searchziva|nextdocid|loadmore|next_docid/i.test(text)) {
        const name = src.replace(/[^a-z0-9]+/gi, '-').slice(-60);
        fs.writeFileSync(path.join(__dirname, `../data/diag/pages/jd-script-${name}.js`), text);
        console.log('\nMATCHED SCRIPT', src, text.length);
        const idx = text.indexOf('searchziva');
        console.log(text.slice(Math.max(0, idx - 800), idx + 1600));
      }
    } catch (e) {}
  }

  await browser.close().catch(() => {});
  process.exit(0);
})();
