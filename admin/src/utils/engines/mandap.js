// ─────────────────────────────────────────────────────────────────────────────
// Mandap.com Scraper Engine (Frontend Port)
// Ported from engine-mandap.js
// ─────────────────────────────────────────────────────────────────────────────

import { v4 as uuidv4 } from 'uuid';
import { proxyFetch, parseHTML, extractContactInfo, calculateLeadScore, determineTier } from '../proxyFetch';

export async function scrapeMandap(category, location, onLog = () => {}) {
  const city = location.split(',')[0].trim().toLowerCase().replace(/\s+/g, '-');
  const url = `https://www.mandap.com/wedding-venues/${city}`;

  onLog(`[Mandap.com] Fetching: ${url}`);

  try {
    const html = await proxyFetch(url);
    const doc = parseHTML(html);
    const results = [];

    const cards = doc.querySelectorAll('.venue-card, .mandap-card, .listing-card, [class*="VenueCard"], [class*="venueCard"]');

    if (cards.length === 0) {
      onLog(`[Mandap.com] No cards found using selectors. Parsing JSON-LD scripts...`);
      // Try JSON-LD fallback
      const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      scripts.forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
          const items = Array.isArray(data) ? data : [data];
          items.forEach(item => {
            const processItem = (obj) => {
              if (obj && (obj['@type'] === 'LocalBusiness' || obj['@type'] === 'WeddingVenue' || obj['@type'] === 'EventVenue')) {
                const textForContact = JSON.stringify(obj);
                const { emails, phones } = extractContactInfo(textForContact);
                const score = calculateLeadScore({ phone: phones[0], email: emails[0], website: obj.url });
                results.push({
                  id: uuidv4(),
                  name: obj.name || 'Unknown',
                  category,
                  city: location,
                  phone: phones[0] || obj.telephone || null,
                  email: emails[0] || null,
                  address: obj.address ? `${obj.address.streetAddress || ''} ${obj.address.addressLocality || ''}`.trim() : '',
                  website: obj.url || null,
                  images: obj.image ? (Array.isArray(obj.image) ? obj.image : [obj.image]) : [],
                  platform: 'mandap',
                  sourceUrl: url,
                  score,
                  tier: determineTier(score),
                  status: 'new'
                });
              }
            };

            if (item['@graph'] && Array.isArray(item['@graph'])) {
              item['@graph'].forEach(processItem);
            } else {
              processItem(item);
            }
          });
        } catch {}
      });
    }

    cards.forEach(card => {
      const nameEl = card.querySelector('.venue-name, h2, h3, [class*="name"], [class*="title"]');
      if (!nameEl) return;
      const name = nameEl.textContent.trim();
      if (!name || name.length < 2) return;

      const addrEl = card.querySelector('.venue-location, p, [class*="location"], [class*="address"]');
      const address = addrEl ? addrEl.textContent.trim() : '';

      const ratingEl = card.querySelector('.rating, [class*="rating"], [class*="star"]');
      const rating = ratingEl ? parseFloat(ratingEl.textContent.trim()) : null;

      const imgEl = card.querySelector('img');
      const images = [];
      if (imgEl) {
        const src = imgEl.getAttribute('data-src') || imgEl.getAttribute('src');
        if (src && src.startsWith('http')) images.push(src);
      }

      const linkEl = card.querySelector('a');
      const profileLink = linkEl ? linkEl.getAttribute('href') : '';
      const sourceUrl = profileLink && profileLink.startsWith('http') ? profileLink : `https://www.mandap.com${profileLink}`;

      const { emails, phones } = extractContactInfo(card.textContent);
      const score = calculateLeadScore({ phone: phones[0] || null, email: emails[0] || null, rating });

      results.push({
        id: uuidv4(),
        name,
        category,
        city: location,
        phone: phones[0] || null,
        email: emails[0] || null,
        address,
        rating,
        images,
        platform: 'mandap',
        sourceUrl,
        score,
        tier: determineTier(score),
        status: 'new'
      });
    });

    onLog(`[Mandap.com] Found ${results.length} vendors in ${location}`);
    return results;
  } catch (err) {
    onLog(`[Mandap.com] Error for ${location}: ${err.message}`);
    return [];
  }
}
