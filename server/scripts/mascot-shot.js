const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load', timeout: 45000 });
  await page.waitForSelector('.mascot-3d-canvas', { timeout: 20000 });
  await page.waitForTimeout(2200);

  const count = await page.evaluate(() => (window.__diggyEngines || []).length);
  console.log('engines', count);

  const outDir = 'C:\\Users\\manoj\\AppData\\Local\\Temp\\opencode';
  for (const mode of ['idle', 'dig', 'fly', 'dance', 'celebrate', 'peek']) {
    await page.evaluate(m => {
      const engine = (window.__diggyEngines || []).find(item => item.host.clientWidth >= 200)
        || (window.__diggyEngines || [])[0];
      if (engine) engine.setMode(m);
    }, mode);
    await page.waitForTimeout(900);
    const stage = page.locator('.mascot-3d-stage').first();
    await stage.screenshot({ path: path.join(outDir, `diggy-${mode}.png`) });
    console.log('shot', mode);
  }

  await browser.close();
})().catch(error => {
  console.error('FAILED', error.message);
  process.exit(1);
});
