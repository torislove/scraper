const { launchStealthBrowser } = require('../src/scrapers/browserFactory');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../data/diag/pages');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { key: 'mandap-profile', url: 'https://www.mandap.com/vijayawada/c-s-r-garden-in-tadepalle' },
  { key: 'wb-profile', url: 'https://www.weddingbazaar.com/wedding-venues/vijayawada/gemini-bhavan' },
  { key: 'ww-profile', url: 'https://www.weddingwire.in/banquet-halls/v-convention-hall-vijayawada--e304889' }
];

(async () => {
  const browser = (await launchStealthBrowser(false)).browser;
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 1000 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata'
  });
  const page = await ctx.newPage();

  for (const t of targets) {
    const telSeen = [];
    page.removeAllListeners('response');
    await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('nav err', e.message));
    await page.waitForTimeout(5000);
    for (let i = 0; i < 2; i++) { await page.evaluate(() => window.scrollBy(0, 1000)).catch(() => {}); await page.waitForTimeout(1200); }
    const info = await page.evaluate(() => {
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent.slice(0, 3000));
      const tel = [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href'));
      const text = document.body.innerText.replace(/\s+/g, ' ');
      const phoneish = text.match(/(?:\+91[\s-]?)?\d{5}[\s-]?\d{5}|\+91[\s-]?\d{10}|\b0\d{2,4}[\s-]?\d{6,8}\b/g) || [];
      const btnTexts = [...document.querySelectorAll('button, a')].map(b => (b.innerText || '').replace(/\s+/g, ' ').trim()).filter(x => /phone|contact|call|number/i.test(x)).slice(0, 10);
      return { title: document.title, url: location.href, ld, tel, phoneish: [...new Set(phoneish)].slice(0, 20), btnTexts, text: text.slice(0, 2500), htmlLen: document.documentElement.outerHTML.length };
    });
    fs.writeFileSync(path.join(outDir, t.key + '.json'), JSON.stringify(info, null, 1));
    fs.writeFileSync(path.join(outDir, t.key + '.html'), await page.content().catch(() => ''));
    console.log('\n====', t.key, info.title, info.url, 'htmlLen', info.htmlLen);
    console.log('tel', JSON.stringify(info.tel));
    console.log('phoneish', JSON.stringify(info.phoneish));
    console.log('btns', JSON.stringify(info.btnTexts));
    console.log('ld', JSON.stringify(info.ld).slice(0, 1500));
    console.log('text', info.text.slice(0, 900));
  }

  await browser.close().catch(() => {});
  process.exit(0);
})();
