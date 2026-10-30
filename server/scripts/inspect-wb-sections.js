const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('data/diag/pages/wb-profile.html', 'utf8'));

for (const label of ['Services offered', 'Venue Amenities', 'Payment Policies', 'Other Information', 'Venue Overview']) {
  const heading = $('h1,h2,h3,h4').filter((i, el) => $(el).text().replace(/\s+/g, ' ').trim().toLowerCase() === label.toLowerCase()).first();
  console.log('\n=====', label, 'found', heading.length, 'tag', heading.length ? heading[0].tagName : '');
  if (!heading.length) continue;
  let parent = heading.parent();
  for (let depth = 0; depth < 3; depth++) {
    const text = parent.text().replace(/\s+/g, ' ').trim();
    console.log(`-- depth ${depth} tag ${parent[0].tagName} class ${(parent.attr('class') || '').slice(0, 80)} len ${text.length}`);
    console.log(text.slice(0, 700));
    parent = parent.parent();
  }
}

console.log('\n===== other-info spans');
$('#other-info-section span, [id*="other-info"] span').slice(0, 20).each((i, el) => console.log('SPAN', JSON.stringify($(el).text().replace(/\s+/g, ' ').trim())));
