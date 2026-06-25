/**
 * Debug script - run with: node debugDork.js
 * This saves the actual Google search page so we can see what's on it.
 */
const playwrightExtra = require('playwright-extra');
const chromium = playwrightExtra.chromium;
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const fs = require('fs');

(async () => {
  const query = 'venues in guntur facebook';
  console.log(`[DEBUG] Searching: "${query}"`);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-http2', '--disable-blink-features=AutomationControlled'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    viewport: { width: 1366, height: 768 }
  });

  const page = await context.newPage();
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;
  console.log(`[DEBUG] Opening: ${url}`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const title = await page.title();
  console.log(`[DEBUG] Page title: "${title}"`);

  // Save the HTML
  const html = await page.content();
  fs.writeFileSync('debug_google_page.html', html);
  console.log(`[DEBUG] Saved HTML to debug_google_page.html (${html.length} chars)`);

  // Extract ALL hrefs
  const allHrefs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]')).map(a => a.href).filter(h => h && h.length > 10);
  });
  console.log(`[DEBUG] Total <a> tags found: ${allHrefs.length}`);

  // Find facebook/instagram links
  const fbLinks = allHrefs.filter(h => h.includes('facebook.com') && !h.includes('google.com'));
  const igLinks = allHrefs.filter(h => h.includes('instagram.com') && !h.includes('google.com'));
  const redirectLinks = allHrefs.filter(h => h.includes('google.com/url?q='));
  const googleSearchLinks = allHrefs.filter(h => h.includes('google.com/search'));

  console.log(`\n[DEBUG] Direct facebook.com links: ${fbLinks.length}`);
  fbLinks.forEach(l => console.log(' FB:', l));

  console.log(`\n[DEBUG] Direct instagram.com links: ${igLinks.length}`);
  igLinks.forEach(l => console.log(' IG:', l));

  console.log(`\n[DEBUG] Google redirect (/url?q=) links: ${redirectLinks.length}`);
  redirectLinks.slice(0, 10).forEach(l => console.log(' REDIRECT:', l));

  console.log(`\n[DEBUG] All google.com/search links: ${googleSearchLinks.length}`);

  // Check for CAPTCHA
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log(`\n[DEBUG] Body text preview:\n${bodyText}`);

  // Check all cite tags (green URL text Google shows)
  const citeTexts = await page.evaluate(() => Array.from(document.querySelectorAll('cite')).map(c => c.textContent.trim()));
  console.log(`\n[DEBUG] <cite> tags found: ${citeTexts.length}`);
  citeTexts.slice(0, 15).forEach(c => console.log(' CITE:', c));

  // Check all h3 headings
  const h3Texts = await page.evaluate(() => Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim()));
  console.log(`\n[DEBUG] <h3> headings: ${h3Texts.length}`);
  h3Texts.forEach(h => console.log(' H3:', h));

  await browser.close();
  console.log('\n[DEBUG] Done. Check debug_google_page.html for full HTML.');
})();
