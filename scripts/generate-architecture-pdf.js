'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const PLAYWRIGHT_PATH = path.join(ROOT, 'server', 'node_modules', 'playwright');

const { chromium } = require(PLAYWRIGHT_PATH);
const { captureDashboardScreenshots } = require('./pdf-builder/captureScreenshots');
const { buildHtmlDocument, buildMarkdownDocument } = require('./pdf-builder/buildContent');

async function main() {
  fs.mkdirSync(DOCS_DIR, { recursive: true });

  console.log('[PDF Generator] Step 1/4: Capturing live dashboard screenshots...');
  const screenshots = await captureDashboardScreenshots(chromium);

  console.log('[PDF Generator] Step 2/4: Building HTML & Markdown documentation...');
  const htmlPath = path.join(DOCS_DIR, 'scraper.co.in guide.html');
  const mdPath = path.join(DOCS_DIR, 'scraper.co.in guide.md');
  const pdfPath = path.join(DOCS_DIR, 'scraper.co.in guide.pdf');

  // Remove previous temporary filenames if present so docs/ stays clean
  for (const legacy of [
    'SCRAPER-COMPLETE-SYSTEM-GUIDE.html',
    'SCRAPER-COMPLETE-SYSTEM-GUIDE.md',
    'SCRAPER-COMPLETE-SYSTEM-GUIDE.pdf'
  ]) {
    const legacyPath = path.join(DOCS_DIR, legacy);
    if (fs.existsSync(legacyPath)) {
      try { fs.unlinkSync(legacyPath); } catch {}
    }
  }

  const html = buildHtmlDocument(screenshots);
  const md = buildMarkdownDocument();

  fs.writeFileSync(htmlPath, html, 'utf8');
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log(`[PDF Generator] Wrote ${path.relative(ROOT, htmlPath)} (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
  console.log(`[PDF Generator] Wrote ${path.relative(ROOT, mdPath)} (${Math.round(Buffer.byteLength(md) / 1024)} KB)`);

  console.log('[PDF Generator] Step 3/4: Rendering PDF via Playwright Chromium...');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 60000 });
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(800);

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      margin: {
        top: '15mm',
        right: '11mm',
        bottom: '16mm',
        left: '11mm'
      },
      headerTemplate: `
        <div style="width:100%;font-family:Inter,Segoe UI,sans-serif;font-size:8px;color:#64748b;padding:0 12mm;display:flex;justify-content:space-between;align-items:center;">
          <span><b>scraper.co.in guide</b> · Complete Architecture, Search Bar, Zones &amp; Dashboard Manual</span>
          <span>docs/scraper.co.in guide.pdf</span>
        </div>
      `,
      footerTemplate: `
        <div style="width:100%;font-family:Inter,Segoe UI,sans-serif;font-size:8px;color:#475569;padding:0 12mm;display:flex;justify-content:space-between;align-items:center;">
          <span><b>By Kadiyala Manoj &amp; Mannava Praneeth Chowdary</b></span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `
    });
  } finally {
    await browser.close();
  }

  console.log('[PDF Generator] Step 4/4: Verifying output PDF...');
  const stat = fs.statSync(pdfPath);
  const head = fs.readFileSync(pdfPath).subarray(0, 8).toString('utf8');
  console.log(`[PDF Generator] SUCCESS -> ${pdfPath}`);
  console.log(`[PDF Generator] Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB (${stat.size} bytes), Header: ${head}`);
}

main().catch((err) => {
  console.error('[PDF Generator] Fatal Error:', err);
  process.exit(1);
});
