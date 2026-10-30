const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('data/diag/pages/ww-profile.html', 'utf8'));

for (const sel of ['#description', '#reviews', '#faqs']) {
  const node = $(sel);
  console.log('\n=====', sel, 'count', node.length);
  if (!node.length) continue;
  const parent = node.parent();
  console.log('parent tag', parent[0].tagName, 'class', (parent.attr('class') || '').slice(0, 80));
  console.log(parent.text().replace(/\s+/g, ' ').trim().slice(0, 1600));
  console.log('--- leaf texts');
  const leaves = [];
  parent.find('*').each((i, el) => {
    if ($(el).children().length) return;
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t && t.length < 120) leaves.push(`${el.tagName}.${($(el).attr('class') || '').slice(0, 40)} :: ${t}`);
  });
  console.log(leaves.slice(0, 60).join('\n'));
}
