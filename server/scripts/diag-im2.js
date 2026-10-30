const { launchStealthBrowser } = require('../src/scrapers/browserFactory');

const attempts = [
  { key: 'home-then-search', steps: ['https://www.indiamart.com/', 'https://dir.indiamart.com/search.mp?ss=banquet+hall&cq=Vijayawada'] },
  { key: 'search-direct', steps: ['https://dir.indiamart.com/search.mp?ss=Banquet+Halls+in+Vijayawada'] },
  { key: 'mobile', steps: ['https://m.indiamart.com/search.mp?ss=banquet+hall&cq=Vijayawada'] },
  { key: 'impcat', steps: ['https://dir.indiamart.com/impcat/banquet-hall.html?cq=Vijayawada'] }
];

(async () => {
  const browser = (await launchStealthBrowser(false)).browser;
  for (const a of attempts) {
    const ctx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 950 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata',
      extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' }
    });
    const page = await ctx.newPage();
    for (const url of a.steps) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('nav', e.message));
      await page.waitForTimeout(5000);
    }
    const state = await page.evaluate(() => ({
      title: document.title,
      url: location.href,
      cards: document.querySelectorAll('.card.brs5').length,
      bodyLen: document.body.innerText.length,
      body: document.body.innerText.replace(/\s+/g, ' ').slice(0, 300),
      htmlLen: document.documentElement.outerHTML.length
    }));
    console.log(a.key, JSON.stringify(state));
    await ctx.close().catch(() => {});
  }
  await browser.close().catch(() => {});
  process.exit(0);
})();
