const fs = require('fs');
const path = require('path');
const { launchStealthBrowser, applyAdvancedStealth } = require('../src/scrapers/browserFactory');

const outDir = path.join(__dirname, '../data/diag/pages');
fs.mkdirSync(outDir, { recursive: true });

const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

(async () => {
  const { browser } = await launchStealthBrowser(false);
  const context = await browser.newContext({
    userAgent: MOBILE_UA,
    viewport: { width: 412, height: 915 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2.6,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' }
  });
  const page = await context.newPage();
  await applyAdvancedStealth(page);
  const api = [];
  page.on('response', async response => {
    const url = response.url();
    if (!/justdial/i.test(url)) return;
    if (!/(api|listing|search|result|phone|number|contact)/i.test(url)) return;
    let body = '';
    try { body = (await response.text()).slice(0, 3000); } catch (e) {}
    api.push({ url, status: response.status(), body });
  });

  const url = 'https://m.justdial.com/Vijayawada/Plumbers/nct-10378025?source=2';
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => { console.log('nav error', e.message); return null; });
  await page.waitForTimeout(12000);

  const info = await page.evaluate(() => {
    const clean = v => String(v || '').replace(/\s+/g, ' ').trim();
    const all = [...document.querySelectorAll('div,li,article')].filter(el => {
      const t = clean(el.innerText);
      return t.length > 60 && t.length < 1200 && /(call|contact|enquire|direction|open|closed|km)/i.test(t);
    });
    return {
      url: location.href,
      title: document.title,
      cards: document.querySelectorAll('.resultbox_info').length,
      listingCls: [...document.querySelectorAll('[class*="list"]')].map(el => el.className).filter(Boolean).slice(0, 40),
      tel: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')),
      body: (document.body ? document.body.innerText : '').replace(/\s+/g, ' ').slice(0, 2500),
      candidates: all.slice(0, 8).map(el => ({ cls: el.className, text: clean(el.innerText).slice(0, 300) }))
    };
  });
  console.log(JSON.stringify(info, null, 1));
  console.log('\nAPI', JSON.stringify(api.slice(-30), null, 1));
  fs.writeFileSync(path.join(outDir, 'jd-mobile-rendered.html'), await page.content());
  fs.writeFileSync(path.join(outDir, 'jd-mobile-rendered.json'), JSON.stringify({ info, api }, null, 1));
  await browser.close().catch(() => {});
  process.exit(0);
})();
