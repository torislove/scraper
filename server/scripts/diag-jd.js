const { launchStealthBrowser } = require('../src/scrapers/browserFactory');

(async () => {
  const browser = (await launchStealthBrowser(false)).browser;
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata'
  });
  const page = await ctx.newPage();
  await page.goto('https://www.justdial.com/Vijayawada/Banquet-Halls', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.scrollBy(0, 1200));
  await page.waitForTimeout(2000);

  const data = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.resultbox_info, .resultbox, li[class*="resultbox"]')];
    return cards.slice(0, 4).map(card => {
      const nameEl = card.querySelector('.resultbox_title_anchor, .resultbox_title, h2, h3');
      const addrEl = card.querySelector('.resultbox_address, .address, .resultbox_address_anchor');
      const ratingEl = card.querySelector('.resultbox_totalrating, .rating, .resultbox_rating');
      const linkEl = card.querySelector('.resultbox_title_anchorbox, .resultbox_title_anchor, a[href*="justdial.com"]');
      return {
        name: nameEl ? nameEl.innerText.trim() : '',
        address: addrEl ? addrEl.innerText.trim() : '',
        rating: ratingEl ? ratingEl.innerText.trim() : '',
        href: linkEl ? linkEl.getAttribute('href') : '',
        text: (card.innerText || '').replace(/\s+/g, ' ').slice(0, 700),
        buttons: [...card.querySelectorAll('button, a, span[role="button"]')].map(b => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 25),
        html: card.outerHTML.slice(0, 1500)
      };
    });
  });
  console.log(JSON.stringify(data, null, 1));

  // Try clicking first card's phone CTA
  try {
    const card = page.locator('.resultbox_info').first();
    const ctas = card.locator('button, a, span[role="button"]');
    const n = await ctas.count();
    console.log('CTA count', n);
    for (let i = 0; i < n; i++) {
      const t = (await ctas.nth(i).innerText().catch(() => '')).trim();
      if (/show number|call|contact|get number|view number/i.test(t)) {
        console.log('Clicking CTA:', t);
        await ctas.nth(i).click({ timeout: 4000 }).catch(e => console.log('click err', e.message));
        await page.waitForTimeout(2500);
      }
    }
    const after = await page.evaluate(() => ({ text: document.body.innerText.slice(0, 1200), tel: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')).slice(0, 10) }));
    console.log('AFTER', JSON.stringify(after, null, 1));
  } catch (e) { console.log('cta err', e.message); }

  await browser.close().catch(() => {});
  process.exit(0);
})();
