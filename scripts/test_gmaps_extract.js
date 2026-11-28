'use strict';

const { chromium } = require('../server/node_modules/playwright-extra');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testGmapsExtraction() {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'en-IN'
  });
  const page = await context.newPage();
  const query = 'Restaurants in Colaba, Mumbai';
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(2500);

  // Scroll the feed to load more places
  const feedSelector = 'div[role="feed"]';
  const hasFeed = await page.waitForSelector(feedSelector, { timeout: 6000 }).catch(() => null);
  console.log('Feed element found:', Boolean(hasFeed));

  if (hasFeed) {
    for (let scroll = 0; scroll < 3; scroll++) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.scrollBy(0, 1500);
      }, feedSelector);
      await page.waitForTimeout(800);
    }
  }

  // Extract cards
  const cards = await page.evaluate(() => {
    const items = [];
    const elements = document.querySelectorAll('div.Nv2PK');
    for (const el of elements) {
      const nameEl = el.querySelector('div.qBF1Pd, a.hfpxzc');
      const name = nameEl ? (nameEl.getAttribute('aria-label') || nameEl.innerText.trim()) : '';
      if (!name) continue;

      const linkEl = el.querySelector('a.hfpxzc');
      const mapsLink = linkEl ? linkEl.getAttribute('href') : '';

      const ratingEl = el.querySelector('span.MW4etd');
      const rating = ratingEl ? parseFloat(ratingEl.innerText.trim()) : null;

      const text = el.innerText || '';
      const phoneMatch = text.match(/(?:(?:\+91|0091)[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|\b0\d{2,4}[\s-]?\d{6,8}\b/);
      const phone = phoneMatch ? phoneMatch[0].trim() : '';

      items.push({ name, rating, phone, mapsLink });
    }
    return items;
  });

  console.log(`Extracted ${cards.length} places from Google Maps!`);
  console.log('Sample places with phones:', cards.slice(0, 5));

  await browser.close();
}

testGmapsExtraction().catch(console.error);
