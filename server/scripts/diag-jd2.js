const { launchStealthBrowser } = require('../src/scrapers/browserFactory');

(async () => {
  const browser = (await launchStealthBrowser(false)).browser;
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata'
  });
  const page = await ctx.newPage();
  await page.goto('https://www.justdial.com/Vijayawada/Banquet-Halls', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(5000);

  const card = page.locator('.resultbox_info').first();
  console.log('show number matches in card:', await card.getByText('Show Number', { exact: true }).count());
  await card.getByText('Show Number', { exact: true }).first().click({ timeout: 5000 }).catch(e => console.log('click1 err', e.message));
  await page.waitForTimeout(3000);
  const state1 = await page.evaluate(() => ({
    tel: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')),
    dialogs: [...document.querySelectorAll('[role="dialog"], .modal, [class*="popup"], [class*="modal"]')].map(n => (n.innerText || '').replace(/\s+/g, ' ').slice(0, 300)),
    bodySnippet: document.body.innerText.replace(/\s+/g, ' ').slice(0, 600)
  }));
  console.log('STATE1', JSON.stringify(state1, null, 1));

  // maybe a login wall appeared; inspect top-level dialogs html
  const dialogHtml = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"], .modal, [class*="popup"]');
    return d ? d.outerHTML.slice(0, 3000) : '';
  });
  console.log('DIALOG', dialogHtml);

  await browser.close().catch(() => {});
  process.exit(0);
})();
