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
  const saved = [];
  let index = 0;
  page.on('response', async r => {
    const u = r.url();
    if (!/searchziva/i.test(u)) return;
    try {
      const text = await r.text();
      if (!text.trim().startsWith('{')) return;
      const body = JSON.parse(text);
      const keys = Object.keys(body);
      const resultData = body.getResultData;
      const entry = { url: u, keys, resultDataKeys: resultData ? Object.keys(resultData) : [] };
      if (resultData) {
        entry.keyword = resultData.keyword;
        entry.total = resultData.totalNumberofResults;
        entry.ishotel = resultData.ishotel;
        entry.dataType = Array.isArray(resultData.results?.data) ? 'array' : typeof resultData.results?.data;
        entry.dataLen = Array.isArray(resultData.results?.data) ? resultData.results.data.length : 0;
        entry.dataSample = Array.isArray(resultData.results?.data) ? resultData.results.data.slice(0, 2) : resultData.results?.data;
        entry.nearme = resultData.nearmeDetails;
      }
      saved.push(entry);
      fs.writeFileSync(path.join(__dirname, `../data/diag/pages/jd-ziva-${index++}.json`), JSON.stringify(body, null, 1));
    } catch (e) {
      saved.push({ url: u, error: e.message });
    }
  });

  await page.goto('https://m.justdial.com/Vijayawada/Plumbers/nct-10378025?source=2&searchcity=Vijayawada', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('nav', e.message));
  await page.waitForTimeout(12000);

  console.log(JSON.stringify(saved, null, 1).slice(0, 12000));
  const cookies = await context.cookies();
  fs.writeFileSync(path.join(__dirname, '../data/diag/pages/jd-mobile-cookies.json'), JSON.stringify(cookies, null, 1));
  console.log('cookies', cookies.map(c => c.name).join(','));
  await browser.close().catch(() => {});
  process.exit(0);
})();
