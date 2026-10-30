const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('data/diag/pages/ww-profile.html', 'utf8'));

const heading = $('#description');
console.log('heading', heading[0] && heading[0].tagName, heading.text().trim());
const section = heading.closest('section');
console.log('section length', section.length, 'class', section.attr('class'));

console.log('\n--- h3/h4 inside description section');
section.find('h2,h3,h4').each((i, el) => console.log(el.tagName, JSON.stringify($(el).text().replace(/\s+/g, ' ').trim().slice(0, 80))));

console.log('\n--- li inside');
section.find('li').slice(0, 40).each((i, el) => console.log('LI', JSON.stringify($(el).text().replace(/\s+/g, ' ').trim().slice(0, 100))));

console.log('\n--- div class list');
const classes = new Set();
section.find('*').each((i, el) => {
  const c = $(el).attr('class') || '';
  c.split(/\s+/).filter(Boolean).forEach(x => classes.add(x));
});
console.log([...classes].filter(c => /amenit|feature|description|venue|detail|list|pill|tag/i.test(c)).join('\n'));

console.log('\n--- p texts');
section.find('p').slice(0, 20).each((i, el) => console.log('P', JSON.stringify($(el).text().replace(/\s+/g, ' ').trim().slice(0, 160))));

const faqHeading = $('#faqs');
console.log('\nfaq heading', faqHeading[0] && faqHeading[0].tagName, faqHeading.text().trim());
const faqSection = faqHeading.closest('section');
console.log('faq section', faqSection.length, faqSection.attr('class'));
console.log('faq items', faqSection.find('.storefrontFaqs__itemTitle').length);
faqSection.find('[class*="Faq"], [class*="faq"]').slice(0, 10).each((i, el) => console.log('FAQNODE', el.tagName, ($(el).attr('class') || '').slice(0, 80), '::', $(el).text().replace(/\s+/g, ' ').trim().slice(0, 120)));
