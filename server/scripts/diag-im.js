const { launchStealthBrowser } = require('../src/scrapers/browserFactory');

(async () => {
  const browser = (await launchStealthBrowser(false)).browser;
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 950 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata'
  });
  const page = await ctx.newPage();
  const url = 'https://dir.indiamart.com/search.mp?ss=Banquet%20Halls%20in%20Vijayawada';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('nav err', e.message));
  await page.waitForTimeout(5000);
  console.log('url', page.url());
  console.log('title', await page.title());
  console.log('cards', await page.locator('.card.brs5').count());
  const data = await page.evaluate(() => {
    return [...document.querySelectorAll('.card.brs5')].slice(0, 3).map(card => ({
      text: (card.innerText || '').replace(/\s+/g, ' ').slice(0, 500),
      city: card.getAttribute('data-city'),
      state: card.getAttribute('data-state'),
      rating: card.getAttribute('data-rating'),
      tscode: card.getAttribute('data-tscode'),
      productHref: card.querySelector('.producttitle a') ? card.querySelector('.producttitle a').href : '',
      supplierHref: card.querySelector('.companyname a') ? card.querySelector('.companyname a').href : '',
      supplierName: card.querySelector('.companyname') ? card.querySelector('.companyname').innerText.trim() : '',
      buttons: [...card.querySelectorAll('button, a')].map(b => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 25)
    }));
  });
  console.log(JSON.stringify(data, null, 1));

  const card = page.locator('.card.brs5').first();
  const vm = card.getByText(/view mobile number/i).first();
  console.log('view mobile matches', await vm.count().catch(() => 0));
  if (await vm.count().catch(() => 0)) {
    await vm.click({ timeout: 5000 }).catch(e => console.log('click err', e.message));
    await page.waitForTimeout(3500);
    const after = await page.evaluate(() => ({
      tel: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')),
      dialogs: [...document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="popup"], .contactpopup')].map(n => ({ cls: String(n.className).slice(0, 80), text: (n.innerText || '').replace(/\s+/g, ' ').slice(0, 500) })).filter(d => d.text),
      body: document.body.innerText.replace(/\s+/g, ' ').slice(0, 1000)
    }));
    console.log('AFTER', JSON.stringify(after, null, 1));
  }

  await browser.close().catch(() => {});
  process.exit(0);
})();
