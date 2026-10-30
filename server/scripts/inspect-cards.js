const fs = require('fs');
const cheerio = require('cheerio');
for (const key of ['mandap', 'wb']) {
  const file = `data/diag/pages/${key}-full.html`;
  if (!fs.existsSync(file)) continue;
  const $ = cheerio.load(fs.readFileSync(file, 'utf8'));
  const sel = key === 'mandap' ? 'article' : '.MuiCard-root';
  const cards = $(sel);
  console.log('====', key, 'cards', cards.length);
  const card = cards.first();
  console.log(card.html().slice(0, 5000));
}
