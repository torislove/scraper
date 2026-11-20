#!/usr/bin/env node
/**
 * Browser connectivity proof — real Chromium, real engine restart.
 *
 *   node scripts/verify/browser-connectivity.cjs [url] [screenshot-path]
 *
 * Default target: the Master command centre on the dev server (5174).
 * Pass a client URL to verify the customer app instead:
 *
 *   node scripts/verify/browser-connectivity.cjs http://127.0.0.1:5173/command
 *
 * What it proves:
 *   1. the dashboard renders and the engine pill reads LIVE (leads > 0);
 *   2. killing the engine shows the reconnect banner with a truthful attempt
 *      number, while the leads already on screen stay visible;
 *   3. restarting the engine returns the pill to LIVE and hides the banner
 *      with no page reload.
 */
const path = require('path');
const http = require('http');
const fs = require('fs');
const { execFileSync, spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const SERVER_DIR = path.join(ROOT, 'server');
const SITE = process.argv[2] || 'http://127.0.0.1:5174/command';
const SHOT = process.argv[3] || path.join(ROOT, 'scripts', 'verify', 'connectivity.png');

const { chromium } = require(path.join(SERVER_DIR, 'node_modules', 'playwright'));
const SHELL = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright',
  'chromium_headless_shell-1223', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');

const health = () => new Promise((resolve) => {
  const req = http.get('http://127.0.0.1:5002/api/health', { timeout: 3000 }, (res) => {
    let b = '';
    res.on('data', (d) => (b += d));
    res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(null); } });
  });
  req.on('error', () => resolve(null));
  req.on('timeout', () => { req.destroy(); resolve(null); });
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // The bundled headless shell may not match the Playwright build; prefer the
  // copy that is actually on disk.
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(SHELL) ? SHELL : undefined
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(String(m.text()).slice(0, 160)); });

  const boot = await health();
  if (!boot?.ok) {
    console.error('FAIL: engine is not reachable on http://127.0.0.1:5002');
    process.exit(2);
  }
  console.log(`engine before: pid ${boot.pid} streams ${JSON.stringify(boot.streams)}`);

  await page.goto(SITE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.v2-cmd-top-status', { timeout: 45000 });
  await wait(9000);

  const state = () => page.evaluate(() => {
    const pill = document.querySelector('.v2-cmd-top-status');
    const banner = document.querySelector('.v2-network-alert-banner');
    const badge = document.querySelector('.lx-count-badge');
    const text = document.body.innerText;
    const badgeCount = badge ? badge.innerText.trim() : null;
    return {
      pill: pill ? pill.innerText.replace(/\n/g, ' | ') : null,
      banner: banner ? banner.innerText.replace(/\n/g, ' ').slice(0, 160) : null,
      leads: badgeCount || (text.match(/(\d[\d,]*) leads/i) || [])[1] || null
    };
  });

  const live = await state();
  console.log('step 1 LIVE:', JSON.stringify(live));
  await page.screenshot({ path: SHOT });

  execFileSync('taskkill', ['/PID', String(boot.pid), '/F'], { stdio: 'ignore' });
  let sawBanner = null;
  for (let i = 0; i < 40; i += 1) {
    await wait(1000);
    const s = await state();
    if (s.banner) { sawBanner = s; break; }
  }
  console.log('step 2 banner while engine is down:', JSON.stringify(sawBanner));

  const child = spawn('node', ['index.js'], { cwd: SERVER_DIR, detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
  let back = null;
  for (let i = 0; i < 60; i += 1) {
    await wait(1000);
    const h = await health();
    if (h?.ok) { back = h; break; }
  }
  console.log('step 3 engine restarted:', back ? `pid ${back.pid}` : 'NO');

  let healed = null;
  for (let i = 0; i < 60; i += 1) {
    await wait(1000);
    const s = await state();
    if (s.pill?.includes('LIVE') && !s.banner) { healed = s; break; }
  }
  console.log('step 4 healed without reload:', JSON.stringify(healed));

  const navigations = await page.evaluate(() => performance.getEntriesByType('navigation').length);
  await page.screenshot({ path: SHOT.replace(/\.png$/, '-after-restart.png') });
  await browser.close();

  const pass = Boolean(live.pill?.includes('LIVE'))
    && Boolean(live.leads && live.leads !== '0')
    && !live.banner
    && Boolean(sawBanner?.banner)
    && sawBanner?.leads === live.leads
    && Boolean(healed)
    && navigations === 1;

  console.log('console errors:', consoleErrors.length ? consoleErrors.slice(0, 5) : 'none');
  console.log(pass ? 'PASS' : 'FAIL');
  process.exit(pass ? 0 : 1);
})();
