/**
 * Screenshots the landing page and reports layout problems.
 *
 *   node scripts/shot-landing.js [url]
 */

const path = require('path');
const fs = require('fs');

const { chromium } = require(
  require.resolve('playwright', { paths: [path.join(__dirname, '..', 'server')] })
);

const URL = process.argv[2] || 'http://127.0.0.1:5173/';
const OUT = path.join(__dirname, '..', 'scratch', 'shots');

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 900, height: 1000 },
  { name: 'mobile', width: 390, height: 844 }
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const report = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));

    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.lp-root', { timeout: 20000 });
    // let scroll-reveals settle
    for (let y = 0; y < 8000; y += 700) {
      await page.evaluate(v => window.scrollTo(0, v), y);
      await page.waitForTimeout(120);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);

    const layout = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflow = doc.scrollWidth - doc.clientWidth;
      const sections = [...document.querySelectorAll('.lp-section, .lp-hero, .lp-final')].map(s => s.id || s.className.split(' ')[0]);
      const empty = [...document.querySelectorAll('.lp-card, .lp-plan, .lp-step')].filter(el => !el.innerText.trim()).length;
      return {
        overflow,
        sections,
        emptyBlocks: empty,
        h1: document.querySelector('.lp-h1')?.innerText || null,
        plans: document.querySelectorAll('.lp-plan').length,
        faq: document.querySelectorAll('.lp-faq-item').length,
        compareRows: document.querySelectorAll('.lp-compare-row').length,
        height: doc.scrollHeight
      };
    });

    const file = path.join(OUT, `landing-${vp.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    report.push({ viewport: vp.name, ...layout, errors: errors.slice(0, 6), file });
    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify(report, null, 2));
  const bad = report.filter(r => r.overflow > 2 || r.errors.length);
  process.exit(bad.length ? 1 : 0);
})().catch(err => {
  console.error('shot failed:', err.message);
  process.exit(2);
});
