const fs = require('fs');
const path = require('path');
const { launchStealthBrowser, applyAdvancedStealth } = require('../src/scrapers/browserFactory');

const outDir = path.join(__dirname, '../data/diag/pages');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const { browser } = await launchStealthBrowser(false);
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 },
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' }
  });
  const page = await context.newPage();
  await applyAdvancedStealth(page);

  const responses = [];
  page.on('response', async response => {
    const url = response.url();
    if (/justdial/i.test(url) && /(search|listing|api|next\/data|result)/i.test(url)) {
      responses.push({ url, status: response.status(), type: response.request().resourceType() });
    }
  });

  console.log('1. homepage');
  await page.goto('https://www.justdial.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);
  console.log('title', await page.title(), 'cookies', (await context.cookies()).length);

  const inputs = await page.evaluate(() => [...document.querySelectorAll('input')].map(i => ({
    id: i.id, name: i.name, placeholder: i.placeholder, type: i.type, cls: i.className, value: i.value
  })).slice(0, 20));
  console.log('inputs', JSON.stringify(inputs, null, 1));

  // Type into the main search box.
  const searchInput = page.locator('input#input_search, input[placeholder*="Search"], input[name="search"]').first();
  const hasSearch = await searchInput.count().catch(() => 0);
  console.log('search input?', hasSearch);
  if (hasSearch) {
    await searchInput.click();
    await searchInput.fill('Plumbers in Vijayawada');
    await page.waitForTimeout(1500);
    const suggestions = await page.evaluate(() => [...document.querySelectorAll('li, div[role="option"], [class*="suggest"]')]
      .map(el => (el.innerText || '').replace(/\s+/g, ' ').trim())
      .filter(t => t && t.length > 3 && t.length < 120).slice(0, 20));
    console.log('suggestions', JSON.stringify(suggestions, null, 1));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(8000);
    console.log('after enter url', page.url(), 'title', await page.title());
    const info = await page.evaluate(() => ({
      bodyLen: document.body ? document.body.innerText.length : 0,
      cards: document.querySelectorAll('.resultbox_info').length,
      anyResultbox: document.querySelectorAll('[class*="resultbox"]').length,
      tel: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')),
      excerpt: (document.body ? document.body.innerText : '').replace(/\s+/g, ' ').slice(0, 600)
    }));
    console.log('search result', JSON.stringify(info, null, 1));
    fs.writeFileSync(path.join(outDir, 'jd-search-result.html'), await page.content());
    console.log('NETWORK', JSON.stringify(responses.slice(-40), null, 1));
  }

  // Try clicking a heatmap/search suggestion or directly using search URL patterns.
  const direct = [
    'https://www.justdial.com/Vijayawada/Plumbers/nct-10378025?v=nctol',
    'https://www.justdial.com/Vijayawada/Plumbers?city=Vijayawada'
  ];
  for (const url of direct) {
    console.log('\n2. direct', url);
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => null);
    await page.waitForTimeout(5000);
    const info = await page.evaluate(() => ({
      title: document.title,
      bodyLen: document.body ? document.body.innerText.length : 0,
      cards: document.querySelectorAll('.resultbox_info').length,
      anyResultbox: document.querySelectorAll('[class*="resultbox"]').length,
      nextData: Boolean(document.getElementById('__NEXT_DATA__')),
      excerpt: (document.body ? document.body.innerText : '').replace(/\s+/g, ' ').slice(0, 400)
    }));
    console.log(JSON.stringify({ status: response ? response.status() : 0, url: page.url(), ...info }, null, 1));
  }

  fs.writeFileSync(path.join(outDir, 'jd-network.json'), JSON.stringify(responses, null, 1));
  await browser.close().catch(() => {});
  process.exit(0);
})();
