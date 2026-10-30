const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('data/diag/pages/imtest.html', 'utf8'));
console.log('links', $('a').length);
const hits = [];
$('a').each((i, el) => {
  const t = $(el).text().replace(/\s+/g, ' ').trim();
  const h = $(el).attr('href') || '';
  if (/banquet|hall|mandap|wedding/i.test(t + ' ' + h)) hits.push({ t: t.slice(0, 90), h: h.slice(0, 160) });
});
console.log(JSON.stringify(hits.slice(0, 40), null, 1));
console.log('body', $('body').text().replace(/\s+/g, ' ').slice(0, 1200));
