const { launchStealthBrowser } = require('../src/scrapers/browserFactory');

(async () => {
  const browser = (await launchStealthBrowser(false)).browser;
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 1000 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata'
  });
  const page = await ctx.newPage();
  await page.goto('https://www.weddingwire.in/wedding-venues/vijayawada', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(5000);
  for (let i = 0; i < 4; i++) { await page.evaluate(() => window.scrollBy(0, 1200)); await page.waitForTimeout(1200); }

  const info = await page.evaluate(() => {
    const tile = document.querySelector('li.vendorTile');
    if (!tile) return { none: true };
    const nodes = [];
    tile.querySelectorAll('*').forEach(el => {
      const direct = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
      if (!direct) return;
      nodes.push({ tag: el.tagName, cls: String(el.className || '').slice(0, 100), text: direct.slice(0, 140) });
    });
    return {
      name: tile.getAttribute('data-ec-name'),
      info: tile.getAttribute('data-vendor-info'),
      text: tile.innerText.replace(/\s+/g, ' ').slice(0, 800),
      nodes
    };
  });
  console.log(JSON.stringify(info, null, 1).slice(0, 9000));
  await browser.close().catch(() => {});
  process.exit(0);
})();
