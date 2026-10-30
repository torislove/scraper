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
    timezoneId: 'Asia/Kolkata'
  });
  const page = await context.newPage();
  await applyAdvancedStealth(page);

  const interesting = [];
  page.on('response', response => {
    const url = response.url();
    if (!/justdial\.com/i.test(url)) return;
    if (!/(phone|number|contact|ajax|api|listing|result)/i.test(url)) return;
    interesting.push({ url, status: response.status() });
  });

  await page.goto('https://www.justdial.com/Vijayawada/Plumbers', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(error => console.log('nav', error.message));
  await page.waitForTimeout(3500);

  for (const sel of ['.jdicon-close', '.login-close', '.modal-close', 'button[aria-label="Close"]', 'button:has-text("Not now")']) {
    const btn = page.locator(sel).first();
    if (await btn.count().catch(() => 0)) await btn.click({ timeout: 1200 }).catch(() => {});
  }

  const before = await page.evaluate(() => {
    const clean = v => String(v || '').replace(/\s+/g, ' ').trim();
    const cards = [...document.querySelectorAll('.resultbox_info')];
    return {
      url: location.href,
      title: document.title,
      cardCount: cards.length,
      resultbox: document.querySelectorAll('.resultbox').length,
      showButtons: [...document.querySelectorAll('span, a, button')].filter(el => /^show number$/i.test(clean(el.innerText))).length,
      telLinks: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')),
      nextLinks: [...document.querySelectorAll('a')].filter(a => /next/i.test(clean(a.innerText)) || /page=/i.test(a.getAttribute('href') || '')).slice(0, 10).map(a => ({ text: clean(a.innerText), href: a.getAttribute('href') })),
      cards: cards.slice(0, 3).map((card, index) => ({
        index,
        text: clean(card.innerText).slice(0, 500),
        html: card.outerHTML.replace(/\s+/g, ' ').slice(0, 1800),
        tel: [...card.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')),
        show: [...card.querySelectorAll('span, a, button')].filter(el => /show number/i.test(clean(el.innerText))).map(el => ({ tag: el.tagName, cls: el.className, text: clean(el.innerText).slice(0, 80) }))
      }))
    };
  });
  fs.writeFileSync(path.join(outDir, 'justdial-before.json'), JSON.stringify({ ...before, interesting }, null, 1));
  console.log('CARD COUNT', before.cardCount, 'SHOW', before.showButtons, 'TEL', before.telLinks.length);
  console.log('NEXT', JSON.stringify(before.nextLinks));
  for (const card of before.cards) {
    console.log('\nCARD', card.index, card.text);
    console.log('SHOW', JSON.stringify(card.show));
    console.log('TEL', JSON.stringify(card.tel));
  }

  for (let i = 0; i < Math.min(3, before.cardCount); i++) {
    const card = page.locator('.resultbox_info').nth(i);
    const show = card.getByText(/^show number$/i).first();
    const count = await show.count().catch(() => 0);
    console.log('\nCLICK CARD', i, 'show?', count);
    if (!count) continue;
    const started = Date.now();
    await show.click({ timeout: 3500 }).catch(error => console.log('click error', error.message));
    let tel = '';
    for (let tick = 0; tick < 20; tick++) {
      await page.waitForTimeout(150);
      tel = await card.evaluate(node => {
        const link = node.querySelector('a[href^="tel:"]');
        return link ? link.getAttribute('href') : '';
      }).catch(() => '');
      if (tel) break;
    }
    console.log('CARD', i, 'tel', tel, 'ms', Date.now() - started);
    const pageTel = await page.evaluate(() => [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')));
    console.log('page tels', JSON.stringify(pageTel));
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }

  const after = await page.evaluate(() => {
    const clean = v => String(v || '').replace(/\s+/g, ' ').trim();
    return {
      cardCount: document.querySelectorAll('.resultbox_info').length,
      telLinks: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')),
      modal: [...document.querySelectorAll('[class*="modal"], [class*="popup"]')].map(el => ({ cls: el.className, text: clean(el.innerText).slice(0, 300) })).slice(0, 5)
    };
  });
  fs.writeFileSync(path.join(outDir, 'justdial-after.json'), JSON.stringify({ after, interesting }, null, 1));
  console.log('\nAFTER', JSON.stringify(after, null, 1));
  console.log('NETWORK', JSON.stringify(interesting.slice(0, 30), null, 1));

  await browser.close().catch(() => {});
  process.exit(0);
})();
