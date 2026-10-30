const fs = require('fs');
const cheerio = require('cheerio');

function show(key) {
  const file = `data/diag/pages/${key}.json`;
  if (!fs.existsSync(file)) return;
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log('\n=====', key, 'ld blocks', j.ld.length);
  j.ld.forEach((raw, i) => {
    let obj;
    try { obj = JSON.parse(raw); } catch (e) { return; }
    const graph = obj['@graph'] || [obj];
    for (const node of graph) {
      const t = node['@type'];
      if (JSON.stringify(t).match(/Venue|LocalBusiness|Event|Place|Organization/)) {
        console.log(`--- block ${i} type ${JSON.stringify(t)} keys`, Object.keys(node).join(','));
        console.log(JSON.stringify(node).slice(0, 1800));
      }
    }
  });
}
show('mandap-profile');
show('wb-profile');
show('ww-profile');

const ww = JSON.parse(fs.readFileSync('data/diag/pages/ww-cards.json', 'utf8'));
const $ = cheerio.load(ww.cards[0].html);
console.log('\nWW TILE classes');
const classes = new Set();
$('*').each((i, el) => {
  const c = $(el).attr('class') || '';
  c.split(/\s+/).filter(Boolean).forEach(x => classes.add(x));
});
console.log([...classes].filter(c => /rating|review|price|location|title|distance/i.test(c)).join('\n'));
console.log('WW TILE text', $('body').text().replace(/\s+/g, ' ').trim().slice(0, 600));
$('*').each((i, el) => {
  const c = $(el).attr('class') || '';
  if (/rating|review|price/i.test(c)) {
    console.log('NODE', el.tagName, c.slice(0, 90), '::', $(el).text().replace(/\s+/g, ' ').trim().slice(0, 120));
  }
});
