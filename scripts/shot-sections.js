/**
 * Captures individual landing sections at a fixed viewport so details are
 * readable (the full-page shot scales everything down too far).
 *
 *   node scripts/shot-sections.js [url]
 */

const path = require('path');
const fs = require('fs');

const { chromium } = require(
  require.resolve('playwright', { paths: [path.join(__dirname, '..', 'server')] })
);

const URL = process.argv[2] || 'http://127.0.0.1:5173/';
const OUT = path.join(__dirname, '..', 'scratch', 'shots');
const W = Number(process.env.W || 1440);
const H = Number(process.env.H || 950);

const TARGETS = [
  { name: 'hero', selector: '.lp-hero' },
  { name: 'gap', selector: '#difference' },
  { name: 'cards', selector: '#why' },
  { name: 'compare', selector: '#compare' },
  { name: 'steps', selector: '#how' },
  { name: 'dash', selector: '#dashboard' },
  { name: 'money', selector: '#money' },
  { name: 'who', selector: '#who' },
  { name: 'credits', selector: '#credits' },
  { name: 'pricing', selector: '#pricing' },
  { name: 'faq', selector: '#faq' },
  { name: 'final', selector: '.lp-final' }
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: W, height: H } });

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('.lp-root', { timeout: 20000 });

  for (const target of TARGETS) {
    const el = await page.$(target.selector);
    if (!el) {
      console.log(`missing ${target.selector}`);
      continue;
    }
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1400);
    await el.screenshot({ path: path.join(OUT, `sec-${target.name}.png`) });
    console.log(`ok ${target.name}`);
  }

  // Numeric sanity: the hero stats should read as real numbers, not blanks.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(2200);
  const stats = await page.evaluate(() =>
    [...document.querySelectorAll('.lp-stat b')].map(el => el.innerText.trim())
  );
  console.log('hero stats:', JSON.stringify(stats));

  await browser.close();
})().catch(err => {
  console.error('sections failed:', err.message);
  process.exit(1);
});
