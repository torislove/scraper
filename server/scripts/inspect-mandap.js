const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('data/diag/pages/mandap-full.html', 'utf8'));
const c = $('article').first();
console.log('TEXT', c.text().replace(/\s+/g, ' ').trim().slice(0, 600));
console.log('--- elements');
c.find('h1,h2,h3,h4,a,button').each((i, e) => {
  console.log(e.name, JSON.stringify($(e).attr('class') || ''), '|', $(e).text().replace(/\s+/g, ' ').trim().slice(0, 140), '|', $(e).attr('href') || '');
});
