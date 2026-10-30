const { launchStealthBrowser } = require('../src/scrapers/browserFactory');

(async () => {
  const browser = (await launchStealthBrowser(false)).browser;
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 1000 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata'
  });
  const page = await ctx.newPage();
  for (let p = 1; p <= 3; p++) {
    const url = `https://www.mandap.com/vijayawada/banquet-halls?page=${p}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(3500);
    const names = await page.evaluate(() => [...document.querySelectorAll('article h3 a.venue-name')].map(a => a.textContent.trim()));
    console.log('PAGE', p, 'count', names.length, JSON.stringify(names.slice(0, 6)));
  }

  // WeddingBazaar: how many cards after scrolling, and is there a next page?
  await page.goto('https://www.weddingbazaar.com/wedding-venues-in-vijayawada', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4000);
  let last = 0;
  for (let i = 0; i < 10; i++) {
    const count = await page.evaluate(() => [...document.querySelectorAll('.MuiCard-root')].filter(c => c.querySelector('h3')).length);
    console.log('WB scroll', i, 'cards', count);
    if (count === last && i > 2) break;
    last = count;
    await page.evaluate(() => window.scrollBy(0, 1400)).catch(() => {});
    await page.waitForTimeout(1400);
  }
  const wbLinks = await page.evaluate(() => ({
    profileAnchors: [...document.querySelectorAll('a[href*="/wedding-venues/"]')].map(a => a.getAttribute('href')).slice(0, 10),
    next: [...document.querySelectorAll('a,button')].map(b => (b.innerText || '').trim()).filter(t => /next|more|load/i.test(t)).slice(0, 10),
    pagination: [...document.querySelectorAll('[class*="pagination" i] a, nav a')].map(a => ({ text: (a.innerText || '').trim(), href: a.getAttribute('href') })).slice(0, 12)
  }));
  console.log('WB LINKS', JSON.stringify(wbLinks, null, 1));

  // WeddingWire: tile count / pagination
  await page.goto('https://www.weddingwire.in/wedding-venues/vijayawada', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(5000);
  for (let i = 0; i < 6; i++) { await page.evaluate(() => window.scrollBy(0, 1300)); await page.waitForTimeout(1300); }
  const wwInfo = await page.evaluate(() => ({
    tiles: document.querySelectorAll('li.vendorTile').length,
    next: [...document.querySelectorAll('a,button')].map(b => ({ text: (b.innerText || '').trim().slice(0, 40), href: b.getAttribute && b.getAttribute('href') })).filter(x => /next|more|load|page/i.test(x.text)).slice(0, 15),
    pagination: [...document.querySelectorAll('a[href*="page="], a[href*="/p"]')].map(a => ({ text: (a.innerText || '').trim().slice(0, 20), href: a.getAttribute('href') })).slice(0, 12)
  }));
  console.log('WW INFO', JSON.stringify(wwInfo, null, 1));

  await browser.close().catch(() => {});
  process.exit(0);
})();
