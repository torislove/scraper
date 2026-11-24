const path = require('path');
const fs = require('fs');
const playwrightPath = path.resolve(__dirname, '../server/node_modules/playwright');
const { chromium } = require(playwrightPath);

const outDir = 'C:\\Users\\manoj\\Desktop\\EDGE_STORE_IMAGES';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const faviconSvgPath = path.resolve('client/public/favicon.svg');
const faviconSvg = fs.readFileSync(faviconSvgPath, 'utf8');

async function generateAssets() {
  console.log('Launching Playwright Chromium for ultra-crisp store assets...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true
  });

  // 1. Exact 3D Glass Logo (300x300) with White Background
  console.log('[1/5] Generating 300x300 3D Glass Logo (Pure White Background)...');
  const pageLogo = await browser.newPage({ viewport: { width: 300, height: 300 } });
  const logoHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 300px;
          height: 300px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .logo-wrap {
          width: 230px;
          height: 230px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 14px 28px rgba(11, 138, 107, 0.28));
        }
        svg {
          width: 100%;
          height: 100%;
        }
      </style>
    </head>
    <body>
      <div class="logo-wrap">
        ${faviconSvg}
      </div>
    </body>
    </html>
  `;
  await pageLogo.setContent(logoHtml);
  await pageLogo.screenshot({ path: path.join(outDir, 'logo-300x300.png') });
  await pageLogo.close();

  // 2. Small Promotional Tile (440x280) with White Background
  console.log('[2/5] Generating 440x280 Small Promo Tile (White Ceramic)...');
  const pageSmallPromo = await browser.newPage({ viewport: { width: 440, height: 280 } });
  const smallPromoHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800;900&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 440px;
          height: 280px;
          background: #ffffff;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          padding: 24px 28px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          position: relative;
        }
        body::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 6px;
          background: linear-gradient(90deg, #10b981, #059669);
        }
        .top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .brand-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #047857;
          font-size: 11px;
          font-weight: 850;
          padding: 4px 10px;
          border-radius: 999px;
          letter-spacing: 0.05em;
        }
        .brand-badge span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
        }
        .center-row {
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .pin-icon {
          width: 80px;
          height: 80px;
          flex-shrink: 0;
          filter: drop-shadow(0 10px 20px rgba(16, 185, 129, 0.3));
        }
        .titles h1 {
          font-size: 26px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.03em;
          line-height: 1.1;
        }
        .titles h1 span {
          color: #059669;
        }
        .titles p {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          margin-top: 4px;
        }
        .foot-pill {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 11px;
          font-weight: 800;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .foot-pill strong {
          color: #047857;
        }
      </style>
    </head>
    <body>
      <div class="top-row">
        <div class="brand-badge"><span></span> RESIDENTIAL EDGE ENGINE</div>
        <div style="font-size: 11px; font-weight: 800; color: #94a3b8;">11 SOVEREIGN NATIONS</div>
      </div>
      <div class="center-row">
        <div class="pin-icon">${faviconSvg}</div>
        <div class="titles">
          <h1>RAM Turbo <span>v1.3.0</span></h1>
          <p>Scraper.co.in Autonomous Lead Radar</p>
        </div>
      </div>
      <div class="foot-pill">
        <span>⚡ 100% Client RAM · Zero Server Markup</span>
        <strong>Google Maps · JustDial · Yelp</strong>
      </div>
    </body>
    </html>
  `;
  await pageSmallPromo.setContent(smallPromoHtml);
  await pageSmallPromo.screenshot({ path: path.join(outDir, 'small-promo-440x280.png') });
  await pageSmallPromo.close();

  // 3. Large Promotional Tile (1400x560) with White Background
  console.log('[3/5] Generating 1400x560 Large Promo Tile (White Ceramic)...');
  const pageLargePromo = await browser.newPage({ viewport: { width: 1400, height: 560 } });
  const largePromoHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800;900&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 1400px;
          height: 560px;
          background: #ffffff;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          padding: 50px 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          position: relative;
        }
        body::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 10px;
          background: linear-gradient(90deg, #10b981, #059669);
        }
        .left-col {
          max-width: 720px;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ecfdf5;
          border: 1.5px solid #a7f3d0;
          color: #047857;
          font-size: 14px;
          font-weight: 850;
          padding: 6px 16px;
          border-radius: 999px;
          margin-bottom: 20px;
          letter-spacing: 0.04em;
        }
        .badge span {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #10b981;
        }
        h1 {
          font-size: 52px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.04em;
          line-height: 1.08;
          margin-bottom: 16px;
        }
        h1 span {
          color: #059669;
        }
        p {
          font-size: 20px;
          font-weight: 700;
          color: #475569;
          line-height: 1.45;
          margin-bottom: 30px;
        }
        .feature-pills {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .pill {
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          color: #1e293b;
        }
        .pill b {
          color: #059669;
        }
        .right-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }
        .logo-3d {
          width: 240px;
          height: 240px;
          filter: drop-shadow(0 20px 40px rgba(16, 185, 129, 0.35));
        }
        .card-preview {
          background: #f8fafc;
          border: 1.5px solid #cbd5e1;
          border-radius: 16px;
          padding: 14px 24px;
          text-align: center;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
        }
        .card-preview strong {
          display: block;
          font-size: 15px;
          color: #0f172a;
          font-weight: 900;
        }
        .card-preview span {
          font-size: 12px;
          color: #047857;
          font-weight: 800;
        }
      </style>
    </head>
    <body>
      <div class="left-col">
        <div class="badge"><span></span> RESIDENTIAL EDGE HARVESTER</div>
        <h1>Scraper.co.in <span>RAM Turbo</span></h1>
        <p>Extract direct WhatsApp numbers, mobile contacts, and verified local business footprints across 11 sovereign nations using client PC hardware.</p>
        <div class="feature-pills">
          <div class="pill">⚡ <b>4 to 16</b> Dynamic RAM Lanes</div>
          <div class="pill">🛡️ <b>0</b> Cloudflare & IP Bans</div>
          <div class="pill">💎 <b>100%</b> Zero-Server Markup</div>
        </div>
      </div>
      <div class="right-col">
        <div class="logo-3d">${faviconSvg}</div>
        <div class="card-preview">
          <strong>Scraper.co.in RAM Turbo v1.3.0</strong>
          <span>Connected · Always On · 100% Zero-Knowledge</span>
        </div>
      </div>
    </body>
    </html>
  `;
  await pageLargePromo.setContent(largePromoHtml);
  await pageLargePromo.screenshot({ path: path.join(outDir, 'large-promo-1400x560.png') });
  await pageLargePromo.close();

  // 4. Real Live Screenshot 1: Radar Cockpit (1280x800)
  console.log('[4/5] Capturing Real Live Screenshot 1: Radar Cockpit (1280x800)...');
  const pageRadar = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await pageRadar.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });
    await pageRadar.waitForTimeout(1000);
    await pageRadar.screenshot({ path: path.join(outDir, 'screenshot-1-radar-1280x800.png') });
    console.log('  ✓ Captured live radar screenshot');
  } catch (e) {
    console.warn('  Radar capture fallback:', e.message);
  } finally {
    await pageRadar.close();
  }

  // 5. Real Live Screenshot 2: Command Center (1280x800)
  console.log('[5/5] Capturing Real Live Screenshot 2: Command Center (1280x800)...');
  const pageCommand = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await pageCommand.goto('http://localhost:5173/command', { waitUntil: 'networkidle', timeout: 15000 });
    await pageCommand.waitForTimeout(1000);
    await pageCommand.screenshot({ path: path.join(outDir, 'screenshot-2-command-1280x800.png') });
    console.log('  ✓ Captured live command center screenshot');
  } catch (e) {
    console.warn('  Command capture fallback:', e.message);
  } finally {
    await pageCommand.close();
  }

  // 6. Real Live Screenshot 3: Master 11 Countries Cockpit (1280x800)
  console.log('[Extra] Capturing Real Live Screenshot 3: Master 11 Countries (1280x800)...');
  const pageMaster = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await pageMaster.goto('http://localhost:5174/command', { waitUntil: 'networkidle', timeout: 15000 });
    await pageMaster.waitForTimeout(1000);
    await pageMaster.screenshot({ path: path.join(outDir, 'screenshot-3-master-1280x800.png') });
    console.log('  ✓ Captured live master screenshot');
  } catch (e) {
    console.warn('  Master capture fallback:', e.message);
  } finally {
    await pageMaster.close();
  }

  await browser.close();
  console.log('\n======================================================');
  console.log('ALL EXACT ASSETS (WHITE BACKGROUND) GENERATED IN:');
  console.log(outDir);
  console.log('======================================================\n');
}

generateAssets().catch((err) => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
