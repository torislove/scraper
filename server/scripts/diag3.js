const { launchStealthBrowser } = require('../src/scrapers/browserFactory');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../data/diag/pages');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { key: 'wb', url: 'https://www.weddingbazaar.com/wedding-venues-in-vijayawada', wait: 6000, scroll: 4 },
  { key: 'ww', url: 'https://www.weddingwire.in/wedding-venues/vijayawada', wait: 6000, scroll: 4 },
  { key: 'mandap', url: 'https://www.mandap.com/vijayawada/wedding-venues', wait: 5000, scroll: 3 }
];

(async () => {
  const browser = (await launchStealthBrowser(false)).browser;
  for (const t of targets) {
    const ctx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 1000 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata'
    });
    const page = await ctx.newPage();
    await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(t.wait);
    for (let i = 0; i < t.scroll; i++) { await page.evaluate(() => window.scrollBy(0, 1200)).catch(() => {}); await page.waitForTimeout(1200); }
    const html = await page.content();
    fs.writeFileSync(path.join(outDir, `${t.key}-full.html`), html);
    const text = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync(path.join(outDir, `${t.key}-full.txt`), text);

    const info = await page.evaluate(() => {
      const anchors = [...document.querySelectorAll('a[href]')]
        .map(a => ({ href: a.getAttribute('href'), text: (a.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 100), cls: String(a.className || '').slice(0, 80) }))
        .filter(a => a.text.length > 3 && a.text.length < 90);
      const interesting = anchors.filter(a => /vijayawada|venue|banquet|hall|wedding-venues/i.test(a.href || '') || /vijayawada/i.test(a.text));
      const chains = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let n = 0;
      while (walker.nextNode() && chains.length < 6) {
        const el = walker.currentNode;
        if (el.children.length > 2) continue;
        const txt = (el.innerText || '').replace(/\s+/g, ' ').trim();
        if (txt.length > 40 && txt.length < 400 && /vijayawada/i.test(txt) && /(₹|per plate|capacity|parking|reviews)/i.test(txt)) {
          const chain = [];
          let p = el;
          for (let i = 0; i < 5 && p; i++, p = p.parentElement) chain.push(`${p.tagName}.${String(p.className || '').slice(0, 120)}`);
          chains.push({ text: txt.slice(0, 260), chain });
        }
        n++;
      }
      return {
        textLen: document.body.innerText.length,
        counts: {
          anchors: document.querySelectorAll('a[href]').length,
          muiCards: document.querySelectorAll('[class*="MuiCard"]').length,
          venueLinks: document.querySelectorAll('a[href*="/venue"]').length,
          dataTestIds: [...new Set([...document.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid')))].slice(0, 30)
        },
        interesting: interesting.slice(0, 40),
        chains
      };
    });
    console.log(`== ${t.key} == textLen=${info.textLen} ${JSON.stringify(info.counts)}`);
    console.log('interesting', JSON.stringify(info.interesting).slice(0, 3000));
    console.log('chains', JSON.stringify(info.chains).slice(0, 3000));
    console.log('body', text.replace(/\s+/g, ' ').slice(0, 600));
    await ctx.close().catch(() => {});
  }
  await browser.close().catch(() => {});
  process.exit(0);
})();
