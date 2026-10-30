const fs = require('fs');
const cheerio = require('cheerio');
const dv = require('../src/scrapers/directoryVendor');
const $ = cheerio.load(fs.readFileSync('data/diag/pages/wb-profile.html', 'utf8'));

function findSection(label) {
  const heading = $('h2,h3').filter((i, el) => dv.cleanText($(el).text(), 80).toLowerCase() === label.toLowerCase()).first();
  return heading.length ? heading.parent() : null;
}

for (const label of ['Services offered', 'Payment Policies', 'Venue Amenities']) {
  const section = findSection(label);
  console.log('\n=====', label, 'found', Boolean(section && section.length));
  if (!section) continue;
  const leaves = [];
  section.find('*').each((i, el) => {
    if ($(el).children().length) return;
    const value = dv.cleanText($(el).text(), 240);
    if (value) leaves.push(value);
  });
  console.log(JSON.stringify(leaves, null, 1));
}
