'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SCREENSHOT_DIR = path.join(ROOT, 'docs', 'screenshots');

async function isReachable(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function captureDashboardScreenshots(chromium) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const clientUp = await isReachable('http://127.0.0.1:5173/');
  const masterUp = await isReachable('http://127.0.0.1:5174/');
  const serverUp = await isReachable('http://127.0.0.1:5002/api/health');

  console.log(`[Screenshots] Ports live -> server:5002=${serverUp}, client:5173=${clientUp}, master:5174=${masterUp}`);

  const browser = await chromium.launch({ headless: true });
  const results = {};

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2
    });
    await context.addInitScript(() => {
      try { localStorage.setItem('scraper_hw_popup_seen_v2', 'true'); } catch (e) {}
    });

    async function snap(key, url, { waitMs = 2200, beforeSnap = null, fullPage = false } = {}) {
      const filePath = path.join(SCREENSHOT_DIR, `${key}.png`);
      const page = await context.newPage();
      try {
        console.log(`[Screenshots] Navigating -> ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 }).catch(() =>
          page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 })
        );
        await page.waitForTimeout(waitMs);
        // Dismiss hardware acceleration popup if still shown
        try {
          const closeBtn = page.locator('button[aria-label="Close hardware popup"], .v2-gbc-hw-modal-backdrop button.v2-icon-btn').first();
          if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
            await closeBtn.click();
            await page.waitForTimeout(450);
          }
        } catch {}
        if (typeof beforeSnap === 'function') {
          await beforeSnap(page);
        }
        await page.screenshot({ path: filePath, fullPage });
        const b64 = fs.readFileSync(filePath).toString('base64');
        results[key] = {
          filePath,
          dataUri: `data:image/png;base64,${b64}`
        };
        console.log(`[Screenshots] Saved ${key}.png (${Math.round(fs.statSync(filePath).size / 1024)} KB)`);
      } catch (err) {
        console.warn(`[Screenshots] Warning on ${key}: ${err.message}`);
      } finally {
        await page.close();
      }
    }

    if (clientUp) {
      // 1. Client Landing Page
      await snap('01-client-landing', 'http://127.0.0.1:5173/', {
        waitMs: 2200
      });

      // 2-5. Persistent Client Session so loading a real saved folder populates Cockpit, Map & Leads+Drawer!
      const clientPage = await context.newPage();
      try {
        console.log('[Screenshots] Opening persistent Client Workspace session...');
        await clientPage.goto('http://127.0.0.1:5173/command?tab=folders', { waitUntil: 'networkidle', timeout: 25000 })
          .catch(() => clientPage.goto('http://127.0.0.1:5173/command?tab=folders', { waitUntil: 'domcontentloaded', timeout: 25000 }));
        await clientPage.waitForTimeout(2400);

        const closeModalIfOpen = async () => {
          try {
            const closeBtn = clientPage.locator('button[aria-label="Close hardware popup"], .v2-gbc-hw-modal-backdrop button.v2-icon-btn').first();
            if (await closeBtn.isVisible({ timeout: 400 }).catch(() => false)) {
              await closeBtn.click();
              await clientPage.waitForTimeout(450);
            }
          } catch {}
        };
        await closeModalIfOpen();

        // Sort folders by "Most leads" so the richest folder appears first
        try {
          const sortSelect = clientPage.locator('.v2-runs-toolbar select').first();
          if (await sortSelect.count()) {
            await sortSelect.selectOption('leads').catch(() => {});
            await clientPage.waitForTimeout(600);
          }
        } catch {}

        // Save 05-client-saved-folders.png
        const foldersFile = path.join(SCREENSHOT_DIR, '05-client-saved-folders.png');
        await clientPage.screenshot({ path: foldersFile });
        results['05-client-saved-folders'] = {
          filePath: foldersFile,
          dataUri: `data:image/png;base64,${fs.readFileSync(foldersFile).toString('base64')}`
        };
        console.log(`[Screenshots] Saved 05-client-saved-folders.png (${Math.round(fs.statSync(foldersFile).size / 1024)} KB)`);

        // Click "Load" on first folder card -> populates Cockpit + Map with real leads
        const loadBtn = clientPage.locator('.v2-run-grid button', { hasText: /^Load$/i }).first();
        if (await loadBtn.count()) {
          await loadBtn.click();
          await clientPage.waitForTimeout(2600);
        } else {
          await clientPage.locator('button', { hasText: /Workspace/i }).first().click().catch(() => {});
          await clientPage.waitForTimeout(1800);
        }
        await closeModalIfOpen();

        const cockpitFile = path.join(SCREENSHOT_DIR, '02-client-cockpit.png');
        await clientPage.screenshot({ path: cockpitFile });
        results['02-client-cockpit'] = {
          filePath: cockpitFile,
          dataUri: `data:image/png;base64,${fs.readFileSync(cockpitFile).toString('base64')}`
        };
        console.log(`[Screenshots] Saved 02-client-cockpit.png (${Math.round(fs.statSync(cockpitFile).size / 1024)} KB)`);

        // Switch to Full Screen Map (tab=map) keeping loaded leads
        const fullMapBtn = clientPage.locator('button', { hasText: /Full Screen/i }).first();
        if (await fullMapBtn.count()) {
          await fullMapBtn.click();
          await clientPage.waitForTimeout(2600);
        }
        const mapFile = path.join(SCREENSHOT_DIR, '04-client-map-radar.png');
        await clientPage.screenshot({ path: mapFile });
        results['04-client-map-radar'] = {
          filePath: mapFile,
          dataUri: `data:image/png;base64,${fs.readFileSync(mapFile).toString('base64')}`
        };
        console.log(`[Screenshots] Saved 04-client-map-radar.png (${Math.round(fs.statSync(mapFile).size / 1024)} KB)`);

        // Go back to Saved Lists and click "Open List" -> Leads Table + open Vendor Drawer
        await clientPage.locator('button', { hasText: /Saved Lists/i }).first().click().catch(() => {});
        await clientPage.waitForTimeout(1000);
        try {
          const sortSelect = clientPage.locator('.v2-runs-toolbar select').first();
          if (await sortSelect.count()) {
            await sortSelect.selectOption('leads').catch(() => {});
            await clientPage.waitForTimeout(500);
          }
        } catch {}
        const openListBtn = clientPage.locator('.v2-run-grid button', { hasText: /Open List/i }).first();
        if (await openListBtn.count()) {
          await openListBtn.click();
          await clientPage.waitForTimeout(2200);
        }
        const firstBiz = clientPage.locator('.lx-biz-cell, table tbody tr td:nth-child(2)').first();
        if (await firstBiz.count()) {
          await firstBiz.click({ timeout: 2500 }).catch(() => {});
          await clientPage.waitForTimeout(1400);
        }
        const leadsFile = path.join(SCREENSHOT_DIR, '03-client-leads-drawer.png');
        await clientPage.screenshot({ path: leadsFile });
        results['03-client-leads-drawer'] = {
          filePath: leadsFile,
          dataUri: `data:image/png;base64,${fs.readFileSync(leadsFile).toString('base64')}`
        };
        console.log(`[Screenshots] Saved 03-client-leads-drawer.png (${Math.round(fs.statSync(leadsFile).size / 1024)} KB)`);
      } finally {
        await clientPage.close();
      }
    }

    if (masterUp) {
      // 6. Master Territorial Sweep Launchpad
      await snap('06-master-sweep-launchpad', 'http://127.0.0.1:5174/command?tab=folders', {
        waitMs: 2600,
        beforeSnap: async (page) => {
          try {
            const masterFoldersBtn = page.locator('button', { hasText: /Master Geo Folders/i }).first();
            if (await masterFoldersBtn.count()) {
              await masterFoldersBtn.click({ timeout: 2000 }).catch(() => {});
              await page.waitForTimeout(1000);
            }
          } catch {}
        }
      });

      // 7. Master Engine Health Board
      await snap('07-master-engines-board', 'http://127.0.0.1:5174/command?tab=engines', {
        waitMs: 2600
      });

      // 8. Master AI Learning Center
      await snap('08-master-learning-center', 'http://127.0.0.1:5174/learning', {
        waitMs: 2400
      });

      // 9. Master Client Registry & Notification Desk
      await snap('09-master-clients-desk', 'http://127.0.0.1:5174/clients', {
        waitMs: 2600,
        beforeSnap: async (page) => {
          try {
            const firstClient = page.locator('.mc-client-row, .mc-item, table tbody tr, [class*="client"]').first();
            if (await firstClient.count()) {
              await firstClient.click({ timeout: 1500 }).catch(() => {});
              await page.waitForTimeout(700);
            }
          } catch {}
        }
      });
    }

    // 10. Browser Extension Popup
    const extPopupPath = path.join(ROOT, 'extension', 'popup.html');
    if (fs.existsSync(extPopupPath)) {
      const extPage = await browser.newPage({
        viewport: { width: 336, height: 390 },
        deviceScaleFactor: 2
      });
      try {
        const extUrl = 'file:///' + extPopupPath.replace(/\\/g, '/');
        await extPage.goto(extUrl, { waitUntil: 'load', timeout: 10000 });
        await extPage.waitForTimeout(500);
        // Ensure nice demo hardware values if navigator.deviceMemory isn't exposed in headless
        await extPage.evaluate(() => {
          const hw = document.getElementById('hw-spec');
          const rc = document.getElementById('relay-count');
          if (hw && (!hw.textContent || hw.textContent === 'Detecting...')) hw.textContent = '16 GB · 8 Cores';
          if (rc && rc.textContent === '0') rc.textContent = '142';
        });
        const outPath = path.join(SCREENSHOT_DIR, '10-extension-popup.png');
        await extPage.screenshot({ path: outPath });
        results['10-extension-popup'] = {
          filePath: outPath,
          dataUri: `data:image/png;base64,${fs.readFileSync(outPath).toString('base64')}`
        };
        console.log(`[Screenshots] Saved 10-extension-popup.png`);
      } finally {
        await extPage.close();
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}

module.exports = { captureDashboardScreenshots, SCREENSHOT_DIR };
