'use strict';

const { chromium } = require('playwright');

async function testFrontend(name, url) {
  console.log(`\nTesting ${name} at ${url}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    // Allow React state & SSE connection to initialize
    await page.waitForTimeout(3000);

    // Check for reconnect alert banner
    const alertBanner = await page.$('.v2-network-alert-banner.is-error, .v2-network-alert-banner.is-offline');
    const isAlertVisible = alertBanner ? await alertBanner.isVisible() : false;

    // Check status badge
    const statusPill = await page.$('.v2-cmd-top-status, .v2-cmd-status, [class*="status"]');
    const statusText = statusPill ? await statusPill.innerText() : 'NOT_FOUND';

    // Check title or main element
    const title = await page.title();

    console.log(`[PASS] ${name} Loaded successfully!`);
    console.log(`  - Page Title: "${title}"`);
    console.log(`  - Status Badge: "${statusText.replace(/\n/g, ' ').trim()}"`);
    console.log(`  - Reconnect Alert Banner Visible: ${isAlertVisible ? 'YES (UNEXPECTED)' : 'NO (CLEAN)'}`);
    console.log(`  - Console Errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log(`    First error: ${errors[0]}`);
    }

    return { name, url, title, statusText, isAlertVisible, errors: errors.length };
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    return { name, url, error: err.message };
  } finally {
    await browser.close();
  }
}

async function run() {
  const clientRes = await testFrontend('Client Portal (Command)', 'http://localhost:5173/command');
  const masterRes = await testFrontend('Master Command Center', 'http://localhost:5174/');

  console.log('\n======================================================');
  console.log('FRONTEND CONNECTIVITY & LIVENESS VERIFICATION SUMMARY');
  console.log('======================================================');
  console.table([clientRes, masterRes]);
}

run().catch(console.error);
