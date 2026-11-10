const { getBrowser, applyAdvancedStealth, optimizePageForSpeed } = require('../src/scrapers/browserFactory');

const queries = [
  'Restaurants in Guntur',
  'Restaurants near 16.36,80.38',
  'Restaurants near 16.25,80.49',
  'Restaurants in Nallapadu, Guntur',
  'Restaurants in Pedapalakaluru, Guntur',
  'Restaurants in Guntur South'
];

(async () => {
  const browser = await getBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  for (const q of queries) {
    const page = await context.newPage();
    await applyAdvancedStealth(page);
    await optimizePageForSpeed(page);
    const url = `https://www.google.com/maps/search/${encodeURIComponent(q)}?hl=en`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await page.waitForSelector('a.hfpxzc, div[role="feed"]', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const names = await page.evaluate(() => Array.from(document.querySelectorAll('a.hfpxzc'))
      .map(a => a.getAttribute('aria-label') || '').filter(Boolean).slice(0, 12));
    console.log(`\n=== ${q} (${names.length}) ===`);
    names.forEach(n => console.log(' -', n));
    await page.close();
  }
  await context.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
