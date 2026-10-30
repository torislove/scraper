const fs = require('fs');
const cheerio = require('cheerio');
for (const key of ['mandap-profile', 'wb-profile', 'ww-profile']) {
  const file = `data/diag/pages/${key}.html`;
  if (!fs.existsSync(file)) continue;
  const $ = cheerio.load(fs.readFileSync(file, 'utf8'));
  const text = $('body').text().replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
  console.log('\n\n==========', key, 'len', text.length);
  const markers = ['Venue Amenities', 'Payment Policies', 'Other Information', 'Services offered', 'Venue Overview', 'Facilities and Capacity', 'Amenities', 'About'];
  for (const m of markers) {
    const i = text.indexOf(m);
    if (i >= 0) {
      console.log(`\n--- ${m} @${i}`);
      console.log(text.slice(i, i + 900));
    }
  }
}
