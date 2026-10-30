const { getBrowser } = require('./src/scrapers/browserFactory');

(async () => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const testUrl = 'https://www.google.com/maps/search/rental+cars+in+Koramangala,+bangalore?hl=en';
  await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  const cardDetails = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div[role="feed"] div.Nv2PK'));
    return cards.map(card => {
      const nameEl = card.querySelector('div.fontHeadlineSmall, .qBF1Pd');
      const name = nameEl ? nameEl.innerText.trim() : '';

      // Links inside card
      const links = Array.from(card.querySelectorAll('a')).map(a => ({
        href: a.href,
        aria: a.getAttribute('aria-label') || '',
        dataVal: a.getAttribute('data-value') || '',
        text: a.innerText.trim()
      }));

      // Find website link
      const websiteLink = links.find(l => 
        l.dataVal === 'Website' || 
        (l.aria && l.aria.toLowerCase().includes('website')) ||
        (l.text && l.text.toLowerCase().includes('website'))
      );

      // Extract all text and parse phone, address, rating
      const fullText = card.innerText || '';
      
      // Regex for Indian landline (080 ...) and mobile (09..., 9..., +91...)
      // Matches 080 4148 9746, 086600 17739, 096552 14888, +91 99008 51000
      const phoneRegex = /(?:(?:\+91|0091|0)[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|0\d{2,4}[\s-]?\d{6,8}/g;
      const phones = [];
      let m;
      while ((m = phoneRegex.exec(fullText)) !== null) {
        phones.push(m[0].trim());
      }

      // Rating & reviews
      const ratingEl = card.querySelector('span.MW4etd');
      const reviewsEl = card.querySelector('span.UY7F9');

      return {
        name,
        phones: [...new Set(phones)],
        website: websiteLink ? websiteLink.href : '',
        rating: ratingEl ? parseFloat(ratingEl.innerText.trim()) : null,
        reviewsCount: reviewsEl ? parseInt(reviewsEl.innerText.replace(/[^0-9]/g, '')) : null,
        fullTextSnippet: fullText.replace(/\n+/g, ' | ')
      };
    });
  });

  console.log('EXTRACTED CARDS COUNT:', cardDetails.length);
  console.log(JSON.stringify(cardDetails, null, 2));

  await page.close();
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
