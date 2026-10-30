const { launchStealthBrowser } = require('../src/scrapers/browserFactory');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../data/diag/pages');
fs.mkdirSync(outDir, { recursive: true });

function slim(html) {
  return String(html || '').replace(/\s+/g, ' ').slice(0, 9000);
}

(async () => {
  const browser = (await launchStealthBrowser(false)).browser;
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 1000 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata'
  });
  const page = await ctx.newPage();

  // ── MANDAP ──
  await page.goto('https://www.mandap.com/vijayawada/banquet-halls', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(5000);
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.scrollBy(0, 1100)); await page.waitForTimeout(1000); }
  const mandap = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('article')];
    return cards.slice(0, 3).map(card => {
      const anchors = [...card.querySelectorAll('a[href]')].map(a => ({ href: a.getAttribute('href'), text: (a.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80), cls: String(a.className || '').slice(0, 90) }));
      const imgs = [...card.querySelectorAll('img')].map(i => i.getAttribute('src') || '').filter(Boolean).slice(0, 10);
      const btns = [...card.querySelectorAll('button')].map(b => (b.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
      const maps = anchors.filter(a => /google\.com\/maps|maps\.app|goo\.gl\/maps/i.test(a.href || ''));
      return {
        text: (card.innerText || '').replace(/\s+/g, ' ').slice(0, 700),
        h3: (card.querySelector('h3') || {}).innerText || '',
        anchors, maps, imgs, btns,
        html: card.outerHTML.replace(/\s+/g, ' ').slice(0, 12000)
      };
    });
  });
  fs.writeFileSync(path.join(outDir, 'mandap-cards.json'), JSON.stringify(mandap, null, 1));
  console.log('MANDAP cards', mandap.length);
  for (const c of mandap) {
    console.log('--- MANDAP', c.h3, '|', c.text.slice(0, 220));
    console.log('  maps', JSON.stringify(c.maps));
    console.log('  anchors', JSON.stringify(c.anchors.slice(0, 8)));
    console.log('  btns', JSON.stringify(c.btns));
  }

  // reveal phone on first card and capture dialog/network
  try {
    const first = page.locator('article').first();
    const btn = first.getByText(/view phone number/i).first();
    if (await btn.count()) {
      await btn.click({ timeout: 5000 }).catch(e => console.log('click err', e.message));
      await page.waitForTimeout(2500);
      const after = await page.evaluate(() => ({
        tel: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')),
        dialogs: [...document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="popup"]')].map(n => ({ cls: String(n.className || '').slice(0, 80), text: (n.innerText || '').replace(/\s+/g, ' ').slice(0, 400) })).filter(d => d.text),
        cardText: (document.querySelector('article') || {}).innerText
      }));
      console.log('MANDAP AFTER', JSON.stringify(after, null, 1).slice(0, 2500));
    }
  } catch (e) { console.log('mandap phone err', e.message); }

  // ── WEDDINGBAZAAR ──
  await page.goto('https://www.weddingbazaar.com/wedding-venues-in-vijayawada', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(5500);
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.scrollBy(0, 1100)); await page.waitForTimeout(1200); }
  const wb = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.MuiCard-root')].filter(c => (c.innerText || '').length > 60);
    return cards.slice(0, 3).map(card => {
      const anchors = [...card.querySelectorAll('a[href]')].map(a => ({ href: a.getAttribute('href'), text: (a.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80), cls: String(a.className || '').slice(0, 90) }));
      const imgs = [...card.querySelectorAll('img')].map(i => i.getAttribute('src') || '').filter(Boolean).slice(0, 10);
      const btns = [...card.querySelectorAll('button')].map(b => (b.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
      return {
        text: (card.innerText || '').replace(/\s+/g, ' ').slice(0, 700),
        anchors, imgs, btns,
        headings: [...card.querySelectorAll('h1,h2,h3,h4')].map(h => ({ tag: h.tagName, cls: String(h.className || '').slice(0, 100), text: (h.innerText || '').trim().slice(0, 120) })),
        html: card.outerHTML.replace(/\s+/g, ' ').slice(0, 12000)
      };
    });
  });
  fs.writeFileSync(path.join(outDir, 'wb-cards.json'), JSON.stringify(wb, null, 1));
  console.log('\nWB cards', wb.length);
  for (const c of wb) {
    console.log('--- WB', JSON.stringify(c.headings), '|', c.text.slice(0, 260));
    console.log('  anchors', JSON.stringify(c.anchors.slice(0, 6)));
    console.log('  btns', JSON.stringify(c.btns));
  }

  // ── WEDDINGWIRE ──
  await page.goto('https://www.weddingwire.in/wedding-venues/vijayawada', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(6000);
  for (let i = 0; i < 4; i++) { await page.evaluate(() => window.scrollBy(0, 1100)); await page.waitForTimeout(1200); }
  const ww = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('li.vendorTile, .vendorTile')];
    return {
      count: tiles.length,
      cards: tiles.slice(0, 3).map(card => {
        const anchors = [...card.querySelectorAll('a[href]')].map(a => ({ href: a.getAttribute('href'), text: (a.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80), cls: String(a.className || '').slice(0, 90) }));
        const imgs = [...card.querySelectorAll('img')].map(i => i.getAttribute('src') || i.getAttribute('data-src') || '').filter(Boolean).slice(0, 10);
        return {
          text: (card.innerText || '').replace(/\s+/g, ' ').slice(0, 700),
          anchors, imgs,
          html: card.outerHTML.replace(/\s+/g, ' ').slice(0, 12000)
        };
      })
    };
  });
  fs.writeFileSync(path.join(outDir, 'ww-cards.json'), JSON.stringify(ww, null, 1));
  console.log('\nWW tiles', ww.count);
  for (const c of ww.cards) {
    console.log('--- WW', c.text.slice(0, 260));
    console.log('  anchors', JSON.stringify(c.anchors.slice(0, 6)));
  }

  fs.writeFileSync(path.join(outDir, 'body-ww.txt'), await page.evaluate(() => document.body.innerText).catch(() => ''));
  fs.writeFileSync(path.join(outDir, 'body-mandap.txt'), '');
  await browser.close().catch(() => {});
  process.exit(0);
})();
