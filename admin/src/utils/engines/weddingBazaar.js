// ─────────────────────────────────────────────────────────────────────────────
// WeddingBazaar Scraper Engine (Frontend Port)
// Ported from engine-weddingbazaar.js
// ─────────────────────────────────────────────────────────────────────────────

import { v4 as uuidv4 } from 'uuid';
import { proxyFetch, parseHTML, extractContactInfo, calculateLeadScore, determineTier } from '../proxyFetch';

export async function scrapeWeddingBazaar(category, location, onLog = () => {}) {
  const city = location.split(',')[0].trim().toLowerCase().replace(/\s+/g, '-');
  const catParam = category.toLowerCase().replace(/\s+/g, '-');
  const url = `https://www.weddingbazaar.com/${catParam}-in-${city}`;

  onLog(`[WeddingBazaar] Fetching: ${url}`);

  try {
    const html = await proxyFetch(url);
    const doc = parseHTML(html);
    const results = [];

    const cards = doc.querySelectorAll('.vendor-card, .listing-card, .vendor-info, .wedding-vendor-list-item, [class*="VendorCard"]');

    if (cards.length === 0) {
      onLog(`[WeddingBazaar] No vendor cards found for ${location}. Site may require JS rendering.`);
      // Try JSON-LD fallback
      const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      scripts.forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
          const items = Array.isArray(data) ? data : [data];
          items.forEach(item => {
            if (item['@type'] === 'LocalBusiness' || item['@type'] === 'WeddingVenue') {
              const { emails, phones } = extractContactInfo(JSON.stringify(item));
              const score = calculateLeadScore({ phone: phones[0], email: emails[0], website: item.url });
              results.push({
                id: uuidv4(),
                name: item.name || 'Unknown',
                category,
                city: location,
                phone: phones[0] || item.telephone || null,
                email: emails[0] || null,
                address: item.address ? `${item.address.streetAddress || ''} ${item.address.addressLocality || ''}`.trim() : '',
                website: item.url || null,
                images: item.image ? [item.image] : [],
                platform: 'weddingbazaar',
                sourceUrl: url,
                score,
                tier: determineTier(score),
                status: 'new'
              });
            }
          });
        } catch {}
      });
    }

    cards.forEach(card => {
      const nameEl = card.querySelector('h2, h3, .vendor-name, [class*="name"], [class*="title"]');
      if (!nameEl) return;
      const name = nameEl.textContent.trim();
      if (!name || name.length < 2) return;

      const imgEl = card.querySelector('img[data-src], img[src]');
      const images = [];
      if (imgEl) {
        const src = imgEl.getAttribute('data-src') || imgEl.getAttribute('src');
        if (src && src.startsWith('http')) images.push(src);
      }

      const { emails, phones } = extractContactInfo(card.textContent);
      const ratingEl = card.querySelector('.rating, .stars, [class*="rating"]');
      const rating = ratingEl ? parseFloat(ratingEl.textContent.trim()) : null;

      const score = calculateLeadScore({ phone: phones[0] || null, email: emails[0] || null, rating });

      results.push({
        id: uuidv4(),
        name,
        category,
        city: location,
        phone: phones[0] || null,
        email: emails[0] || null,
        rating,
        images,
        platform: 'weddingbazaar',
        sourceUrl: url,
        score,
        tier: determineTier(score),
        status: 'new'
      });
    });

    onLog(`[WeddingBazaar] Found ${results.length} vendors in ${location}`);
    return results;
  } catch (err) {
    onLog(`[WeddingBazaar] Error for ${location}: ${err.message}`);
    return [];
  }
}
