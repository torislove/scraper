const fs = require('fs');
const path = require('path');
const { launchStealthBrowser, applyAdvancedStealth } = require('../src/scrapers/browserFactory');
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

(async () => {
  const { browser } = await launchStealthBrowser(false);
  const context = await browser.newContext({
    userAgent: MOBILE_UA, viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true,
    locale: 'en-IN', timezoneId: 'Asia/Kolkata', extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' }
  });
  const page = await context.newPage();
  await applyAdvancedStealth(page);

  let firstRequest = null;
  let firstData = null;
  page.on('response', async r => {
    if (!/searchziva/i.test(r.url())) return;
    try {
      const text = await r.text();
      if (!text.trim().startsWith('{')) return;
      const body = JSON.parse(text);
      if (!body.getResultData) return;
      firstRequest = firstRequest || { url: r.url(), headers: r.request().headers() };
      firstData = firstData || body.getResultData;
    } catch (e) {}
  });

  await page.goto('https://m.justdial.com/Vijayawada/Plumbers/nct-10378025?source=2&searchcity=Vijayawada', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('nav', e.message));
  await page.waitForTimeout(10000);

  console.log('FIRST REQUEST URL', firstRequest?.url);
  console.log('HEADERS', JSON.stringify(firstRequest?.headers, null, 1));
  console.log('DATA', firstData ? { keyword: firstData.keyword, total: firstData.totalNumberofResults, count: firstData.results?.data?.length, nextdocidcount: firstData.nextdocidcount } : null);

  if (!firstData) { await browser.close(); process.exit(0); }

  const base = firstRequest.url;
  const nextdocid = firstData.nextdocid;
  const variants = {
    base,
    page2: `${base}&page=2`,
    start10: `${base}&start=10`,
    nextdocidFull: `${base}&nextdocid=${encodeURIComponent(nextdocid)}`,
    nextdocidFirst: `${base}&nextdocid=${encodeURIComponent(String(nextdocid).split(',')[0])}`,
    nextdocidPage2: `${base}&nextdocid=${encodeURIComponent(nextdocid)}&page=2`,
    withMeta: `${base}&searchcity=Vijayawada&ncatid=10378025&keyword=Plumbers&city=Vijayawada&nextdocid=${encodeURIComponent(String(nextdocid).split(',')[0])}&page=2`
  };

  for (const [name, url] of Object.entries(variants)) {
    const result = await page.evaluate(async ({ url }) => {
      try {
        const res = await fetch(url, { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        const text = await res.text();
        let data = null;
        try { data = JSON.parse(text); } catch (e) {}
        const rd = data && data.getResultData;
        return {
          status: res.status,
          len: text.length,
          head: text.slice(0, 80),
          keyword: rd && rd.keyword,
          total: rd && rd.totalNumberofResults,
          count: rd && Array.isArray(rd.results?.data) ? rd.results.data.length : null,
          firstNames: rd && Array.isArray(rd.results?.data) ? rd.results.data.slice(0, 3).map(r => r[1]) : null
        };
      } catch (e) { return { error: e.message }; }
    }, { url });
    console.log('\nVARIANT', name, JSON.stringify(result, null, 1));
  }

  fs.writeFileSync(path.join(__dirname, '../data/diag/pages/jd-ziva-request.json'), JSON.stringify({ request: firstRequest, data: firstData }, null, 1));
  await browser.close().catch(() => {});
  process.exit(0);
})();
