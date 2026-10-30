const { launchStealthBrowser } = require('../src/scrapers/browserFactory');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../data/diag/pages');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  'https://www.weddingwire.in/banquet-halls/innotel-hotel--e319021',
  'https://www.weddingwire.in/banquet-halls/fortune-murali-park--e15463'
];

(async () => {
  const browser = (await launchStealthBrowser(false)).browser;
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 1000 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata'
  });
  const page = await ctx.newPage();

  for (const target of targets) {
    const key = target.split('/').pop();
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => console.log('nav', e.message));
    await page.waitForSelector('h2#description', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const info = await page.evaluate(() => {
      const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
      const sectionFor = id => {
        const node = document.getElementById(id);
        return node ? (node.closest('section') || node.parentElement) : null;
      };
      const description = sectionFor('description');
      const faqs = sectionFor('faqs');

      const blocks = [];
      if (description) {
        description.querySelectorAll('p, h2, h3, h4, ul, ol').forEach(el => {
          if (el.tagName === 'UL' || el.tagName === 'OL') {
            blocks.push({ tag: el.tagName, items: [...el.querySelectorAll('li')].map(li => clean(li.innerText)).filter(Boolean) });
          } else {
            blocks.push({ tag: el.tagName, text: clean(el.innerText).slice(0, 300) });
          }
        });
      }

      const faqList = [];
      if (faqs) {
        faqs.querySelectorAll('.storefrontFaqs__item').forEach(item => {
          const q = item.querySelector('.storefrontFaqs__itemTitle');
          const block = item.querySelector('.storefrontFaqs__itemBlock');
          const lists = [...item.querySelectorAll('.storefrontFaqs__itemList')].map(v => clean(v.innerText)).filter(Boolean);
          faqList.push({
            q: q ? clean(q.innerText) : '',
            a: block ? clean(block.innerText) : '',
            lists,
            html: item.outerHTML.replace(/\s+/g, ' ').slice(0, 1200)
          });
        });
      }

      return { title: document.title, blocks, faqList, descriptionText: description ? clean(description.innerText).slice(0, 3000) : '' };
    });

    fs.writeFileSync(path.join(outDir, key + '.detail.json'), JSON.stringify(info, null, 1));
    console.log('\n=====', key, info.title);
    console.log('--- BLOCKS');
    for (const b of info.blocks) {
      if (b.items) console.log(`LIST(${b.items.length})`, JSON.stringify(b.items.slice(0, 25)));
      else console.log(b.tag, JSON.stringify(b.text));
    }
    console.log('--- FAQ (first 8)');
    for (const f of info.faqList.slice(0, 8)) {
      console.log('Q:', f.q);
      console.log('  A:', f.a.slice(0, 220));
      console.log('  LISTS:', JSON.stringify(f.lists.slice(0, 20)));
    }
  }

  await browser.close().catch(() => {});
  process.exit(0);
})();
