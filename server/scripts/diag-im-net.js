const { launchStealthBrowser } = require('../src/scrapers/browserFactory');

(async () => {
  const browser = (await launchStealthBrowser(false)).browser;
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 950 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata'
  });
  const page = await ctx.newPage();
  const seen = [];
  page.on('response', async res => {
    const url = res.url();
    const ct = res.headers()['content-type'] || '';
    if (!/json|javascript/.test(ct)) return;
    if (!/indiamart|imimg/.test(url)) return;
    if (/\.js(\?|$)/.test(url)) return;
    let body = '';
    try { body = (await res.text()).slice(0, 300); } catch (e) {}
    seen.push({ status: res.status(), url: url.slice(0, 260), ct, body });
    if (/product|search|listing|catalog|supplier/i.test(url)) console.log('RESP', res.status(), url.slice(0, 240), '\n  ', body.replace(/\s+/g, ' ').slice(0, 200));
  });
  await page.goto('https://dir.indiamart.com/search.mp?ss=Banquet+Halls+in+Vijayawada', { waitUntil: 'networkidle', timeout: 60000 }).catch(e => console.log('nav err', e.message));
  await page.waitForTimeout(5000);
  console.log('total json responses', seen.length);
  for (const s of seen) console.log(s.status, s.url, '::', s.body.replace(/\s+/g, ' ').slice(0, 120));
  await browser.close().catch(() => {});
  process.exit(0);
})();
