const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('data/diag/pages/mandap-profile.html', 'utf8'));
for (const sel of ['#other-info-section', '#payment-section', '#faq-heading', '#about-heading', '#event-areas-heading', '#venue-location-heading']) {
  const node = $(sel);
  console.log('\n---', sel, 'count', node.length);
  const html = node.parent().html() || node.html() || '';
  console.log(html.replace(/\s+/g, ' ').slice(0, 2200));
}
