'use strict';

const { chromium } = require('../server/node_modules/playwright-extra');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function inspectGoogleDOM() {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'en-IN'
  });
  const page = await context.newPage();
  const url = 'https://www.google.com/search?q=Restaurants+in+Colaba+Mumbai&tbm=lcl&hl=en&gl=in';
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(2000);
  console.log('Final URL:', page.url());
  console.log('Title:', await page.title());

  const evalResult = await page.evaluate(() => {
    // Collect all elements with text that looks like a business name
    const cards = document.querySelectorAll('div.VkpGBb, div.rl_item, div[jscontroller="e6hkjf"], div.rllt__details');
    const names = [];
    document.querySelectorAll('div.dbg0pd, div[role="heading"] span, .OSrXXb, span.LrzXr, div.rllt__details > div:first-child').forEach(el => {
      const text = el.innerText.trim();
      if (text.length > 2 && !names.includes(text)) names.push(text);
    });
    
    // Check next page in Gooooooogle pagination table
    const nextBtn = document.querySelector('a#pnnext, a[aria-label="Next page"], table.AaVjTc a#pnnext, a[id="pnnext"]');
    const paginationTable = document.querySelector('table.AaVjTc');
    
    // Check all phone numbers on page
    const bodyText = document.body.innerText;
    const phoneMatches = bodyText.match(/(?:(?:\+91|0091)[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|\b0\d{2,4}[\s-]?\d{6,8}\b/g) || [];

    return {
      cardSelectorCount: cards.length,
      sampleNames: names.slice(0, 10),
      hasNextBtn: Boolean(nextBtn),
      nextHref: nextBtn ? nextBtn.getAttribute('href') : null,
      hasPaginationTable: Boolean(paginationTable),
      phoneSample: phoneMatches.slice(0, 5)
    };
  });

  console.log('DOM Evaluation Result:', evalResult);
  await browser.close();
}

inspectGoogleDOM().catch(err => {
  console.error('Inspect error:', err);
});
