/**
 * Headless smoke test for the two bundles.
 *
 *   node scripts/smoke-bundles.js
 *
 * Requires two engines already running (see docs/DESKTOP_APP.md):
 *   web     : SCRAPER_CLIENT_DIST=client/dist          PORT=5014
 *   desktop : SCRAPER_CLIENT_DIST=client/dist-desktop  PORT=5013
 */

const path = require('path');

// Playwright ships with the engine, not the repo root.
const { chromium } = require(
  require.resolve('playwright', { paths: [path.join(__dirname, '..', 'server')] })
);

const WEB = process.env.WEB_URL || 'http://127.0.0.1:5014';
const DESKTOP = process.env.DESKTOP_URL || 'http://127.0.0.1:5013';

async function inspect(browser, url, expect) {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  let ok = false;
  for (let i = 0; i < 40; i++) {
    const state = await page.evaluate(() => ({
      landing: !!document.querySelector('.v2-landing'),
      cockpit: !!document.querySelector('.v2-cockpit'),
      badge: !!document.querySelector('.v2-desktop-badge'),
      path: location.pathname,
      title: document.title
    }));
    if (state.landing || state.cockpit) {
      ok = state[expect] === true;
      return { url, ...state, pass: ok && state.path === (expect === 'landing' ? '/' : '/command'), errors };
    }
    await page.waitForTimeout(500);
  }

  const state = await page.evaluate(() => ({ path: location.pathname, title: document.title }));
  return { url, ...state, pass: false, errors, note: 'no SPA root rendered' };
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  results.push(await inspect(browser, `${WEB}/`, 'landing'));
  results.push(await inspect(browser, `${WEB}/command`, 'cockpit'));
  results.push(await inspect(browser, `${DESKTOP}/`, 'cockpit'));
  results.push(await inspect(browser, `${DESKTOP}/command`, 'cockpit'));
  await browser.close();

  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter(r => !r.pass);
  process.exit(failed.length ? 1 : 0);
})().catch(err => {
  console.error('smoke failed:', err.message);
  process.exit(2);
});
