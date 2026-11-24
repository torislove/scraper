const { chromium } = require('../node_modules/playwright');
const fs = require('fs');
const path = require('path');

const outDir = 'C:\\Users\\manoj\\.gemini\\antigravity\\brain\\ec3471c4-04a3-46e6-92ea-3a96ef18e48b\\screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const routes = [
  { name: '01_home', url: 'http://localhost:5173/' },
  { name: '02_solutions', url: 'http://localhost:5173/solutions' },
  { name: '03_architecture', url: 'http://localhost:5173/architecture' },
  { name: '04_global_coverage', url: 'http://localhost:5173/global-coverage' },
  { name: '05_hardware', url: 'http://localhost:5173/hardware' }
];

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const auditData = {};

  for (const r of routes) {
    console.log('Navigating to', r.url);
    await page.goto(r.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1200);

    const screenshotPath = path.join(outDir, `${r.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Saved screenshot:', screenshotPath);

    // Extract text metrics from the page
    const metrics = await page.evaluate(() => {
      const texts = [];
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => ({
        tag: h.tagName,
        text: h.innerText.trim()
      }));
      const paragraphs = Array.from(document.querySelectorAll('p, .lx-kinetic-subcopy')).map(p => p.innerText.trim()).filter(Boolean);
      const allText = document.body.innerText;
      const wordCount = allText.split(/\s+/).filter(Boolean).length;
      return {
        wordCount,
        headings,
        paragraphs: paragraphs.slice(0, 10)
      };
    });

    auditData[r.name] = metrics;
  }

  const auditPath = path.join(outDir, 'audit_metrics.json');
  fs.writeFileSync(auditPath, JSON.stringify(auditData, null, 2));
  console.log('Saved audit metrics:', auditPath);

  await browser.close();
  console.log('Done!');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
