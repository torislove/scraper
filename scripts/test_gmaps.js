'use strict';

const { chromium } = require('../server/node_modules/playwright-extra');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testGoogleMaps() {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();
  const url = 'https://www.google.com/maps/search/Restaurants+in+Colaba,+Mumbai';
  console.log('Navigating to Google Maps:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(3000);
  console.log('Final URL:', page.url());
  console.log('Title:', await page.title());

  const evalResult = await page.evaluate(() => {
    const feeds = document.querySelectorAll('div[role="feed"] > div, div.Nv2PK');
    const names = [];
    document.querySelectorAll('div.qBF1Pd, a.hfpxzc').forEach(el => {
      const name = el.getAttribute('aria-label') || el.innerText.trim();
      if (name && !names.includes(name)) names.push(name);
    });
    return {
      feedCount: feeds.length,
      sampleNames: names.slice(0, 10),
      isSorry: window.location.href.includes('google.com/sorry')
    };
  });

  console.log('Google Maps Result:', evalResult);
  await browser.close();
}

testGoogleMaps().catch(console.error);
