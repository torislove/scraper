'use strict';

const { chromium } = require('../server/node_modules/playwright-extra');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testCardClickPhone() {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.google.com/maps/search/Restaurants+in+Colaba,+Mumbai', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Click first card
  const firstCard = page.locator('div.Nv2PK a.hfpxzc').first();
  await firstCard.click();
  await page.waitForTimeout(1500);

  const phone = await page.evaluate(() => {
    const phoneBtn = document.querySelector('button[data-item-id*="phone"], button[aria-label*="Phone:"]');
    if (phoneBtn) return phoneBtn.getAttribute('aria-label') || phoneBtn.innerText;
    const match = document.body.innerText.match(/(?:(?:\+91|0091)[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|\b0\d{2,4}[\s-]?\d{6,8}\b/);
    return match ? match[0] : 'not found';
  });

  console.log('Clicked card phone result:', phone);
  await browser.close();
}

testCardClickPhone().catch(console.error);
