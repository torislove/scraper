const { getBrowser } = require('./src/scrapers/browserFactory');

(async () => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const testUrl = 'https://www.google.com/maps/search/rental+cars+in+Koramangala,+bangalore?hl=en';
  console.log('Navigating to Google Maps search:', testUrl);
  await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Check what exists in the DOM
  const data = await page.evaluate(() => {
    const feed = document.querySelector('div[role="feed"]');
    if (!feed) return { error: 'No feed found', htmlSample: document.body.innerHTML.substring(0, 500) };

    const items = [];
    const feedCards = feed.querySelectorAll('div.Nv2PK');
    feedCards.forEach(card => {
      const titleEl = card.querySelector('div.fontHeadlineSmall, .qBF1Pd');
      const linkEl = card.querySelector('a.hfpxzc');
      const ratingEl = card.querySelector('span.MW4etd');
      const reviewsEl = card.querySelector('span.UY7F9');
      
      // All text containers inside the card
      const textContainers = Array.from(card.querySelectorAll('div.W4Efsd'));
      const textLines = textContainers.map(tc => tc.innerText.trim()).filter(Boolean);

      // Search for Indian phone numbers inside all text of this card
      const fullCardText = card.innerText || '';
      const phoneMatch = fullCardText.match(/(?:(?:\+|0{0,2})91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|0\d{2,4}[\s-]?\d{6,8}/g);

      items.push({
        title: titleEl ? titleEl.innerText.trim() : '',
        href: linkEl ? linkEl.getAttribute('href') : '',
        rating: ratingEl ? ratingEl.innerText.trim() : null,
        reviews: reviewsEl ? reviewsEl.innerText.trim() : null,
        textLines,
        phonesDetected: phoneMatch || []
      });
    });

    return { totalCards: feedCards.length, items: items.slice(0, 10) };
  });

  console.log('RESULT:', JSON.stringify(data, null, 2));
  await page.close();
  process.exit(0);
})().catch(err => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
