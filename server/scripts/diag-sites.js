const { launchStealthBrowser } = require('../src/scrapers/browserFactory');
const fs = require('fs');
const path = require('path');

const targets = [
  { key: 'justdial', url: 'https://www.justdial.com/Vijayawada/Banquet-Halls' },
  { key: 'indiamart', url: 'https://dir.indiamart.com/search.mp?ss=Banquet%20Halls%20in%20Vijayawada' },
  { key: 'weddingbazaar_cat', url: 'https://www.weddingbazaar.com/banquet-halls-in-vijayawada' },
  { key: 'weddingbazaar_venue', url: 'https://www.weddingbazaar.com/wedding-venues/vijayawada' },
  { key: 'weddingwire', url: 'https://www.weddingwire.in/wedding-vendors/vijayawada' },
  { key: 'weddingwire_venue', url: 'https://www.weddingwire.in/wedding-venues/vijayawada' },
  { key: 'mandap', url: 'https://www.mandap.com/wedding-venues/vijayawada' }
];

const outDir = path.join(__dirname, '../data/diag');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = (await launchStealthBrowser(false)).browser;
  const summary = {};
  for (const t of targets) {
    const record = { url: t.url, ok: false };
    try {
      const ctx = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 900 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata'
      });
      const page = await ctx.newPage();
      const resp = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => ({ status: () => 'ERR ' + e.message }));
      await page.waitForTimeout(4500);
      await page.evaluate(() => window.scrollBy(0, 900)).catch(() => {});
      await page.waitForTimeout(1800);
      record.status = typeof resp.status === 'function' ? resp.status() : String(resp.status());
      record.finalUrl = page.url();
      record.title = await page.title().catch(() => '');
      record.bodyText = (await page.evaluate(() => document.body.innerText).catch(() => '')).replace(/\s+/g, ' ').slice(0, 900);
      record.counts = await page.evaluate(() => {
        const sels = [
          '.resultbox_info', '.resultbox', 'li[class*="resultbox"]',
          'li.lst_nd', 'div.lst_nd', '.prd-card', 'li[class*="prd"]',
          '.vendor-card', '.listing-card', 'article',
          '[class*="vendor"]', '[class*="card"]', '[class*="listing"]',
          '[data-testid]', 'a[href*="/wedding-"]'
        ];
        const out = {};
        for (const s of sels) { try { out[s] = document.querySelectorAll(s).length; } catch (e) { out[s] = -1; } }
        return out;
      });
      record.samples = await page.evaluate(() => {
        const nodes = [...document.querySelectorAll('article, [class*="card"], [class*="vendor"], li')]
          .filter(n => (n.innerText || '').length > 40)
          .slice(0, 4);
        return nodes.map(n => ({ cls: n.className && String(n.className).slice(0, 120), text: (n.innerText || '').replace(/\s+/g, ' ').slice(0, 300) }));
      });
      record.html = (await page.content()).slice(0, 120000);
      record.ok = true;
      await ctx.close();
    } catch (e) {
      record.error = e.message;
    }
    summary[t.key] = record;
    fs.writeFileSync(path.join(outDir, `${t.key}.json`), JSON.stringify(record, null, 1));
    console.log(`== ${t.key} == status=${record.status} final=${record.finalUrl || ''} title=${record.title || ''}`);
    console.log('counts', JSON.stringify(record.counts || {}));
    console.log('text', (record.bodyText || record.error || '').slice(0, 300));
  }
  await browser.close();
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(Object.fromEntries(Object.entries(summary).map(([k, v]) => [k, { status: v.status, finalUrl: v.finalUrl, title: v.title, counts: v.counts, samples: v.samples, text: (v.bodyText || '').slice(0, 300), error: v.error }])), null, 1));
})();
