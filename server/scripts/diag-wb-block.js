const { launchStealthBrowser, applyAdvancedStealth } = require('../src/scrapers/browserFactory');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function probe(page, url, waitMs) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('nav err', e.message));
  await page.waitForTimeout(waitMs);
  const info = await page.evaluate(() => ({
    title: document.title,
    url: location.href,
    bodyLen: document.body.innerText.length,
    cards: document.querySelectorAll('.MuiCard-root').length,
    h3: document.querySelectorAll('.MuiCard-root h3').length,
    anchors: document.querySelectorAll('a[href*="/wedding-venues/"]').length,
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 400),
    htmlLen: document.documentElement.outerHTML.length
  }));
  console.log(JSON.stringify(info, null, 1));
  return info;
}

(async () => {
  const browser = (await launchStealthBrowser(false)).browser;

  // 1. fresh context, direct
  let ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1366, height: 950 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata' });
  let page = await ctx.newPage();
  console.log('\n== 1 direct venues-in');
  await probe(page, 'https://www.weddingbazaar.com/wedding-venues-in-vijayawada', 6000);
  console.log('\n== 1b wait longer + scroll');
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.scrollBy(0, 1200)).catch(() => {}); await page.waitForTimeout(1200); }
  const counts = await page.evaluate(() => ({ cards: document.querySelectorAll('.MuiCard-root').length, h3: document.querySelectorAll('.MuiCard-root h3').length, textLen: document.body.innerText.length }));
  console.log(counts);
  await ctx.close();

  // 2. warm homepage then list
  ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1366, height: 950 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata' });
  page = await ctx.newPage();
  console.log('\n== 2 homepage');
  await probe(page, 'https://www.weddingbazaar.com/', 4000);
  console.log('\n== 2b venues-in after warm');
  await probe(page, 'https://www.weddingbazaar.com/wedding-venues-in-vijayawada', 6000);
  await ctx.close();

  // 3. canonical /wedding-venues/vijayawada
  ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1366, height: 950 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata' });
  page = await ctx.newPage();
  console.log('\n== 3 canonical /wedding-venues/vijayawada');
  await probe(page, 'https://www.weddingbazaar.com/wedding-venues/vijayawada', 6000);
  await ctx.close();

  // 4. stealth init script
  ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1366, height: 950 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata' });
  page = await ctx.newPage();
  await applyAdvancedStealth(page);
  console.log('\n== 4 stealth script');
  await probe(page, 'https://www.weddingbazaar.com/wedding-venues-in-vijayawada', 6000);
  await ctx.close();

  // 5. google referer
  ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1366, height: 950 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata', extraHTTPHeaders: { Referer: 'https://www.google.com/' } });
  page = await ctx.newPage();
  console.log('\n== 5 google referer');
  await probe(page, 'https://www.weddingbazaar.com/wedding-venues-in-vijayawada', 6000);
  await ctx.close();

  await browser.close().catch(() => {});
  process.exit(0);
})();
