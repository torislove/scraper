/**
 * probe-feed-scroll.js — find the real Google Maps results scroller and verify
 * that scrolling loads more than the initial ~20 cards.
 *
 * Read-only diagnostic. Prints the scrollable ancestor, then scrolls it with
 * three strategies while accumulating unique place links.
 */
const { getBrowser, applyAdvancedStealth, optimizePageForSpeed } = require('../src/scrapers/browserFactory');

const query = process.argv[2] || 'Restaurants in Guntur';

async function snapshot(page) {
  return page.evaluate(() => {
    const feed = document.querySelector('div[role="feed"]');
    if (!feed) return { error: 'no feed' };

    const isScrollable = el => {
      if (!el) return false;
      const style = getComputedStyle(el);
      return /(auto|scroll)/.test(`${style.overflowY}${style.overflow}`) && el.scrollHeight > el.clientHeight + 40;
    };
    let scroller = null;
    let node = feed.parentElement;
    while (node && node !== document.body) {
      if (isScrollable(node)) { scroller = node; break; }
      node = node.parentElement;
    }

    const cards = Array.from(document.querySelectorAll('div[role="feed"] div.Nv2PK'));
    const links = Array.from(document.querySelectorAll('div[role="feed"] a.hfpxzc'))
      .map(a => (a.getAttribute('href') || '').split('&')[0]);

    return {
      cards: cards.length,
      uniqueLinks: new Set(links).size,
      scroller: scroller ? {
        tag: scroller.tagName,
        cls: String(scroller.className || '').slice(0, 90),
        aria: scroller.getAttribute('aria-label') || '',
        scrollTop: Math.round(scroller.scrollTop),
        scrollHeight: scroller.scrollHeight,
        clientHeight: scroller.clientHeight
      } : null,
      windowScrollY: Math.round(window.scrollY),
      docScrollHeight: document.scrollingElement ? document.scrollingElement.scrollHeight : -1
    };
  });
}

(async () => {
  const browser = await getBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await applyAdvancedStealth(page);
  await optimizePageForSpeed(page);
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await page.waitForSelector('div[role="feed"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1800);

  const allLinks = new Set();
  const harvest = async label => {
    const links = await page.evaluate(() => Array.from(document.querySelectorAll('div[role="feed"] a.hfpxzc'))
      .map(a => (a.getAttribute('href') || '').split('&')[0]).filter(Boolean));
    links.forEach(l => allLinks.add(l));
    console.log(label, { dom: links.length, seen: allLinks.size, ...(await snapshot(page)) });
  };

  await harvest('start');

  for (let i = 1; i <= 8; i++) {
    await page.evaluate(() => {
      const feed = document.querySelector('div[role="feed"]');
      if (!feed) return;
      let node = feed.parentElement;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(`${style.overflowY}${style.overflow}`) && node.scrollHeight > node.clientHeight + 40) {
          node.scrollTop = node.scrollHeight;
          return;
        }
        node = node.parentElement;
      }
      window.scrollTo(0, document.body.scrollHeight);
    });
    const box = await page.locator('div[role="feed"]').boundingBox().catch(() => null);
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, 2500).catch(() => {});
    }
    await page.waitForTimeout(1300);
    await harvest(`step ${i}`);
  }

  console.log('\nTOTAL unique place links seen:', allLinks.size);
  await context.close();
  await browser.close().catch(() => {});
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
