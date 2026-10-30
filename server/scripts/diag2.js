const { launchStealthBrowser } = require('../src/scrapers/browserFactory');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../data/diag');
fs.mkdirSync(outDir, { recursive: true });

async function snapshot(page, key, extra) {
  const rec = {
    url: page.url(),
    title: await page.title().catch(() => ''),
    ...extra
  };
  fs.writeFileSync(path.join(outDir, key + '.json'), JSON.stringify(rec, null, 1));
  console.log(`== ${key} == ${rec.title} :: ${rec.url}`);
  if (rec.counts) console.log(JSON.stringify(rec.counts));
  if (rec.samples) console.log(JSON.stringify(rec.samples).slice(0, 2000));
  if (rec.links) console.log(JSON.stringify(rec.links.slice(0, 30)));
  return rec;
}

(async () => {
  const browser = (await launchStealthBrowser(false)).browser;
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata'
  });
  const page = await ctx.newPage();

  // 1. JustDial card structure
  await page.goto('https://www.justdial.com/Vijayawada/Banquet-Halls', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3500);
  await snapshot(page, 'jd-detail', await page.evaluate(() => {
    const card = document.querySelector('.resultbox_info');
    const anchor = document.querySelector('.resultbox_title_anchor');
    const title = document.querySelector('.resultbox_title');
    const addr = document.querySelector('.resultbox_address');
    const rating = document.querySelector('.resultbox_totalrating');
    return {
      cardCount: document.querySelectorAll('.resultbox_info').length,
      cardHtml: card ? card.outerHTML.slice(0, 4000) : '',
      titleTag: title ? title.tagName + '.' + title.className : '',
      titleText: title ? title.textContent.trim() : '',
      anchorTag: anchor ? anchor.tagName + '.' + anchor.className : '',
      anchorHref: anchor ? anchor.getAttribute('href') : '',
      addrText: addr ? addr.textContent.trim() : '',
      ratingText: rating ? rating.textContent.trim() : '',
      telHrefs: [...document.querySelectorAll('a[href^="tel:"]')].slice(0, 5).map(a => a.getAttribute('href'))
    };
  }));

  // 2. IndiaMART
  for (const [key, url] of [
    ['im-search-city', 'https://dir.indiamart.com/search.mp?ss=banquet+hall&cq=Vijayawada'],
    ['im-city-page', 'https://dir.indiamart.com/vijayawada/banquet-hall.html']
  ]) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await snapshot(page, key, await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.card.brs5, .cardbody')].filter(n => (n.innerText || '').length > 50);
      return {
        counts: {
          cardBrs: document.querySelectorAll('.card.brs5').length,
          cardbody: document.querySelectorAll('.cardbody').length,
          listing: document.querySelectorAll('[class*="listing"]').length,
          anchors: document.querySelectorAll('a[href]').length
        },
        samples: cards.slice(0, 4).map(n => ({ cls: String(n.className).slice(0, 80), text: (n.innerText || '').replace(/\s+/g, ' ').slice(0, 400) })),
        html: cards[0] ? cards[0].outerHTML.slice(0, 5000) : ''
      };
    }));
  }

  // 3. WeddingBazaar
  await page.goto('https://www.weddingbazaar.com/wedding-venues-in-vijayawada', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3500);
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.scrollBy(0, 1000)); await page.waitForTimeout(1200); }
  await snapshot(page, 'wb-detail', await page.evaluate(() => {
    const anchors = [...document.querySelectorAll('a[href*="wedding-venues/"], a[href*="/venue"], a[href*="-in-vijayawada"]')];
    const seen = new Set();
    const links = [];
    for (const a of anchors) {
      const href = a.href || '';
      if (!href || seen.has(href)) continue;
      const txt = (a.innerText || '').replace(/\s+/g, ' ').trim();
      if (!txt || txt.length < 3) continue;
      seen.add(href);
      links.push({ href, text: txt.slice(0, 160), cls: String(a.className || '').slice(0, 80) });
    }
    const dataTest = [...new Set([...document.querySelectorAll('[data-testid]')].map(n => n.getAttribute('data-testid')))].slice(0, 40);
    const textBlocks = [...document.querySelectorAll('div, li')]
      .filter(n => n.children.length <= 3 && (n.innerText || '').length > 60 && (n.innerText || '').length < 260)
      .slice(0, 8)
      .map(n => ({ cls: String(n.className || '').slice(0, 100), text: (n.innerText || '').replace(/\s+/g, ' ') }));
    return { links, dataTest, textBlocks, counts: { anchors: anchors.length, cards: document.querySelectorAll('[class*="card"]').length } };
  }));

  // 4. WeddingWire venue page
  await page.goto('https://www.weddingwire.in/wedding-venues/vijayawada', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await snapshot(page, 'ww-detail', await page.evaluate(() => {
    const dataTest = [...new Set([...document.querySelectorAll('[data-testid]')].map(n => n.getAttribute('data-testid')))].slice(0, 50);
    const anchors = [...document.querySelectorAll('a[href*="/wedding-venues/"]')].slice(0, 40).map(a => ({ href: a.href, text: (a.innerText || '').replace(/\s+/g, ' ').slice(0, 100) }));
    const blocks = [...document.querySelectorAll('[data-testid], div')]
      .filter(n => (n.innerText || '').length > 80 && (n.innerText || '').length < 300)
      .slice(0, 10)
      .map(n => ({ cls: String(n.className || '').slice(0, 80), testid: n.getAttribute('data-testid'), text: (n.innerText || '').replace(/\s+/g, ' ') }));
    return { dataTest, anchors, blocks };
  }));

  // 5. Mandap city discovery
  await page.goto('https://www.mandap.com', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await snapshot(page, 'mandap-home', await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href]')]
      .map(a => ({ href: a.href, text: (a.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80) }))
      .filter(l => /vijayawada|andhra|venue/i.test(l.href + ' ' + l.text))
      .slice(0, 60);
    const inputs = [...document.querySelectorAll('input')].map(i => ({ placeholder: i.placeholder, name: i.name, type: i.type })).slice(0, 20);
    return { links, inputs, counts: { anchors: document.querySelectorAll('a[href]').length } };
  }));

  await browser.close();
})();
