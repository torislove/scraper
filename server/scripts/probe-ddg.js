/* Can a keyless HTML search endpoint give us organic business results? */
const axios = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const QUERY = 'dental clinic guntur contact number';

async function tryDdg() {
  const started = Date.now();
  try {
    const res = await axios.post('https://html.duckduckgo.com/html/', new URLSearchParams({ q: QUERY }).toString(), {
      timeout: 20000,
      proxy: false,
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IN,en;q=0.9'
      },
      validateStatus: () => true
    });
    const $ = cheerio.load(String(res.data || ''));
    const rows = [];
    $('.result__a').each((i, el) => {
      if (rows.length >= 8) return;
      const href = $(el).attr('href') || '';
      const title = $(el).text().trim();
      if (title) rows.push({ title, href: href.slice(0, 120) });
    });
    console.log(`[ddg] status=${res.status} ${Date.now() - started}ms results=${rows.length}`);
    rows.slice(0, 5).forEach(r => console.log('   -', r.title, '::', r.href));
  } catch (err) {
    console.log('[ddg] ERROR', err.code || err.message, `${Date.now() - started}ms`);
  }
}

async function tryDdgLite() {
  const started = Date.now();
  try {
    const res = await axios.get(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(QUERY)}`, {
      timeout: 20000, proxy: false, headers: { 'User-Agent': UA }, validateStatus: () => true
    });
    const $ = cheerio.load(String(res.data || ''));
    const rows = $('a.result-link').map((i, el) => $(el).text().trim()).get();
    console.log(`[ddg-lite] status=${res.status} ${Date.now() - started}ms results=${rows.length}`);
    rows.slice(0, 5).forEach(r => console.log('   -', r));
  } catch (err) {
    console.log('[ddg-lite] ERROR', err.code || err.message);
  }
}

(async () => {
  await tryDdg();
  await tryDdgLite();
  process.exit(0);
})();
