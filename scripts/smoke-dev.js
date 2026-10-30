/**
 * Checks that the dev stack (Vite :5173 + engine :5002) actually works in a
 * browser: pages render, API calls resolve, no console errors.
 *
 *   node scripts/smoke-dev.js
 */

const path = require('path');

const { chromium } = require(
  require.resolve('playwright', { paths: [path.join(__dirname, '..', 'server')] })
);

const BASE = process.env.DEV_URL || 'http://127.0.0.1:5173';

async function check(browser, route, marker) {
  const page = await browser.newPage();
  const errors = [];
  const failed = [];

  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('response', r => {
    if (r.url().includes('/api/') && r.status() >= 400) {
      failed.push(`${r.status()} ${r.url()}`);
    }
  });

  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  let hit = false;
  for (let i = 0; i < 60; i++) {
    hit = await page.evaluate(sel => !!document.querySelector(sel), marker);
    if (hit) break;
    await page.waitForTimeout(500);
  }

  const info = await page.evaluate(() => ({
    path: location.pathname,
    title: document.title,
    rows: document.querySelectorAll('.v2-cp-table tbody tr').length,
    context: document.querySelector('.v2-cmd-context')?.innerText || null
  }));

  await page.close();
  return { route, rendered: hit, ...info, errors: errors.slice(0, 5), failedCalls: failed.slice(0, 5) };
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  results.push(await check(browser, '/', '.v2-landing'));
  results.push(await check(browser, '/command', '.v2-cockpit'));
  await browser.close();

  console.log(JSON.stringify(results, null, 2));
  const bad = results.filter(r => !r.rendered || r.errors.length || r.failedCalls.length);
  process.exit(bad.length ? 1 : 0);
})().catch(err => {
  console.error('dev smoke failed:', err.message);
  process.exit(2);
});
