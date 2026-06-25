const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://www.justdial.com/Hyderabad/Photographers', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));
  
  const hasResultBox = await page.evaluate(() => document.querySelectorAll('.resultbox_info').length);
  console.log('Has .resultbox_info:', hasResultBox);
  
  if (hasResultBox === 0) {
    const names = await page.evaluate(() => {
      const headings = document.querySelectorAll('h2');
      return Array.from(headings).slice(0, 10).map(h => h.innerText);
    });
    console.log('H2 Names:', names);
    
    // Justdial new class names are often dynamic (e.g. `jsx-xxxxx`) but they usually use `h2` for names, 
    // and div containing the phone number
  }
  
  await browser.close();
})();
