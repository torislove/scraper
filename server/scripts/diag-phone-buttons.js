const { launchStealthBrowser } = require('../src/scrapers/browserFactory');

(async () => {
  const browser = (await launchStealthBrowser(false)).browser;
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 950 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata'
  });
  const page = await ctx.newPage();

  // IndiaMART
  await page.goto('https://dir.indiamart.com/search.mp?ss=banquet+hall&cq=Vijayawada', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4500);
  const card = page.locator('.card.brs5').first();
  console.log('cards', await page.locator('.card.brs5').count());
  console.log('CARD TEXT', (await card.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 500));
  console.log('CARD HTML', (await card.evaluate(el => el.outerHTML).catch(() => '')).slice(0, 5000));

  const vm = card.getByText(/view mobile number/i).first();
  console.log('view mobile count', await vm.count().catch(() => 0));
  if (await vm.count().catch(() => 0)) {
    await vm.click({ timeout: 5000 }).catch(e => console.log('click err', e.message));
    await page.waitForTimeout(3000);
    const state = await page.evaluate(() => ({
      tel: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')),
      dialogs: [...document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="popup"]')].map(n => ({ cls: String(n.className).slice(0, 80), text: (n.innerText || '').replace(/\s+/g, ' ').slice(0, 400) })).filter(d => d.text),
      body: document.body.innerText.replace(/\s+/g, ' ').slice(0, 800)
    }));
    console.log('AFTER', JSON.stringify(state, null, 1));
  }

  // Mandap phone click
  await page.goto('https://www.mandap.com/vijayawada/banquet-halls', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4500);
  console.log('mandap articles', await page.locator('article').count());
  const mcard = page.locator('article').first();
  console.log('MANDAP TEXT', (await mcard.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400));
  const btn = mcard.getByText(/view phone number/i).first();
  console.log('mandap btn count', await btn.count().catch(() => 0));
  if (await btn.count().catch(() => 0)) {
    await btn.click({ timeout: 5000 }).catch(e => console.log('click err', e.message));
    await page.waitForTimeout(2500);
    const state = await page.evaluate(() => ({
      tel: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')),
      text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 1000),
      dialogs: [...document.querySelectorAll('[role="dialog"], [class*="modal"]')].map(n => (n.innerText || '').replace(/\s+/g, ' ').slice(0, 400)).filter(Boolean)
    }));
    console.log('MANDAP AFTER', JSON.stringify(state, null, 1));
  }

  // WeddingBazaar contact button
  await page.goto('https://www.weddingbazaar.com/wedding-venues-in-vijayawada', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(5000);
  console.log('wb cards', await page.locator('.MuiCard-root').count());
  const wcard = page.locator('.MuiCard-root').filter({ has: page.locator('h3') }).first();
  console.log('WB TEXT', (await wcard.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400));
  const wbtn = wcard.getByText(/view contact/i).first();
  console.log('wb btn count', await wbtn.count().catch(() => 0));
  if (await wbtn.count().catch(() => 0)) {
    await wbtn.click({ timeout: 5000 }).catch(e => console.log('click err', e.message));
    await page.waitForTimeout(2500);
    const state = await page.evaluate(() => ({
      tel: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')),
      dialogs: [...document.querySelectorAll('[role="dialog"], [class*="modal"]')].map(n => (n.innerText || '').replace(/\s+/g, ' ').slice(0, 500)).filter(Boolean),
      body: document.body.innerText.replace(/\s+/g, ' ').slice(0, 900)
    }));
    console.log('WB AFTER', JSON.stringify(state, null, 1));
  }

  await browser.close().catch(() => {});
  process.exit(0);
})();
