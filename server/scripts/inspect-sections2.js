const fs = require('fs');
const cheerio = require('cheerio');
for (const key of ['mandap-profile', 'wb-profile', 'ww-profile']) {
  const file = `data/diag/pages/${key}.html`;
  if (!fs.existsSync(file)) continue;
  const $ = cheerio.load(fs.readFileSync(file, 'utf8'));
  console.log('\n====', key);
  const ids = new Set();
  $('[id]').each((i, el) => {
    const id = $(el).attr('id');
    if (id && /section|amenit|payment|info|overview|capacity|service/i.test(id)) ids.add(id);
  });
  console.log([...ids].join('\n'));
  const headings = [];
  $('h1,h2,h3,h4').each((i, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t && t.length < 60) headings.push(`${el.tagName}#${$(el).attr('id') || ''} :: ${t}`);
  });
  console.log(headings.slice(0, 30).join('\n'));
}
