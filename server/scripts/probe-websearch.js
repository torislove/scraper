/* Quick QA probe: can this machine read public search-result HTML?
 * Usage: node scripts/probe-websearch.js "banquet halls in Guntur contact"
 */
const axios = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function bing(query) {
  const { data, status } = await axios.get(`https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en-IN`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-IN,en;q=0.9' },
    timeout: 20000
  });
  const $ = cheerio.load(data);
  const rows = [];
  $('li.b_algo').each((i, el) => {
    const a = $(el).find('h2 a').first();
    const href = a.attr('href');
    if (href && /^https?:/.test(href)) rows.push({ title: a.text().trim(), url: href });
  });
  return { status, bytes: data.length, rows };
}

async function duck(query) {
  const { data, status } = await axios.get('https://html.duckduckgo.com/html/', {
    params: { q: query },
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-IN,en;q=0.9' },
    timeout: 20000
  });
  const $ = cheerio.load(data);
  const rows = [];
  $('.result__a').each((i, el) => {
    const href = $(el).attr('href') || '';
    if (href) rows.push({ title: $(el).text().trim(), url: href });
  });
  return { status, bytes: data.length, rows };
}

(async () => {
  const query = process.argv[2] || 'banquet halls in Guntur contact';
  for (const [name, fn] of [['bing', bing], ['duck', duck]]) {
    try {
      const r = await fn(query);
      console.log(`[${name}] status=${r.status} bytes=${r.bytes} rows=${r.rows.length}`);
      r.rows.slice(0, 5).forEach(row => console.log(`  ${row.title} :: ${row.url}`));
    } catch (err) {
      console.log(`[${name}] ERROR ${err.message}`);
    }
  }
  process.exit(0);
})();
