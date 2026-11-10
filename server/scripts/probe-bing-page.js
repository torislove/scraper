/* Inspect what Bing actually returns through the stealth browser. */
const { launchStealthBrowser } = require('../src/scrapers/browserFactory');
const fs = require('fs');
const path = require('path');

(async () => {
  const { browser } = await launchStealthBrowser(true);
  const context = await browser.newContext();
  const page = await context.newPage();
  const url = 'https://www.bing.com/search?q=' + encodeURIComponent('site:instagram.com banquet hall Guntur');
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);
  console.log('status', response && response.status());
  console.log('title', await page.title());
  console.log('url', page.url());
  const info = await page.evaluate(() => ({
    algos: document.querySelectorAll('li.b_algo').length,
    results: document.querySelectorAll('#b_results').length,
    captcha: /captcha|verify you are a human|unusual traffic/i.test(document.body.innerText),
    text: document.body.innerText.slice(0, 400)
  }));
  console.log(JSON.stringify(info, null, 2));
  const html = await page.content();
  const out = path.join(__dirname, '..', 'db', 'probe-bing.html');
  fs.writeFileSync(out, html);
  console.log('saved', out, html.length);
  await browser.close();
  process.exit(0);
})();
