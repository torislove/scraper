// ─────────────────────────────────────────────────────────────────────────────
// WeddingWire Scraper Engine (Frontend Port)
// Ported from engine-weddingwire.js
// ─────────────────────────────────────────────────────────────────────────────

import { v4 as uuidv4 } from 'uuid';
import { proxyFetch, parseHTML, extractContactInfo, calculateLeadScore, determineTier } from '../proxyFetch';

const CATEGORY_MAP = {
  'photographers': 'wedding-photographers',
  'photographer': 'wedding-photographers',
  'wedding photographers': 'wedding-photographers',
  'venues': 'wedding-venues',
  'venue': 'wedding-venues',
  'wedding venues': 'wedding-venues',
  'planners': 'wedding-planners',
  'wedding planners': 'wedding-planners',
  'decorators': 'wedding-decorators',
  'wedding decorators': 'wedding-decorators',
  'makeup': 'bridal-makeup',
  'makeup artists': 'bridal-makeup',
  'bridal makeup': 'bridal-makeup',
  'caterers': 'wedding-catering',
  'wedding caterers': 'wedding-catering',
  'caterer': 'wedding-catering',
};

export async function scrapeWeddingWire(category, location, onLog = () => {}) {
  const citySlug = location.split(',')[0].trim().toLowerCase().replace(/\s+/g, '-');
  const normalizedCat = category.toLowerCase().trim();
  let catSlug = CATEGORY_MAP[normalizedCat];
  
  if (!catSlug) {
    // Check if any key matches as substring
    for (const key in CATEGORY_MAP) {
      if (normalizedCat.includes(key)) {
        catSlug = CATEGORY_MAP[key];
        break;
      }
    }
  }
  
  if (!catSlug) {
    catSlug = normalizedCat.replace(/\s+/g, '-');
  }

  // Base URL
  const url = `https://www.weddingwire.in/${catSlug}/${citySlug}`;
  onLog(`[WeddingWire] Fetching: ${url}`);

  try {
    const html = await proxyFetch(url);
    const doc = parseHTML(html);
    const results = [];

    // Selectors from original playwright script and standard WW elements
    const cards = doc.querySelectorAll('.vendorTile, .storefront-list-item, .directory-item, [class*="vendorTile"], [class*="StorefrontTile"]');

    if (cards.length === 0) {
      onLog(`[WeddingWire] No cards found using selectors. Parsing JSON-LD scripts...`);
      // Try JSON-LD fallback
      const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      scripts.forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
          const items = Array.isArray(data) ? data : [data];
          items.forEach(item => {
            // Find graph list or local business items
            const processItem = (obj) => {
              if (obj && (obj['@type'] === 'LocalBusiness' || obj['@type'] === 'WeddingVenue' || obj['@type'] === 'ProfessionalService')) {
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
                  platform: 'weddingwire',
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
      const nameEl = card.querySelector('.vendorTile__title, .storefront-title, h2, h3, [class*="Title"], [class*="name"]');
      if (!nameEl) return;
      const name = nameEl.textContent.trim();
      if (!name || name.length < 2) return;

      const addrEl = card.querySelector('.vendorTile__location, .storefront-location, [class*="location"], [class*="address"]');
      const address = addrEl ? addrEl.textContent.trim() : '';

      const ratingEl = card.querySelector('.rating__count, .reviews-count, [class*="rating"], [class*="star"]');
      const rating = ratingEl ? parseFloat(ratingEl.textContent.trim()) : null;

      const imgEl = card.querySelector('img');
      const images = [];
      if (imgEl) {
        const src = imgEl.getAttribute('data-src') || imgEl.getAttribute('src');
        if (src && src.startsWith('http')) images.push(src);
      }

      const linkEl = card.querySelector('a');
      const profileLink = linkEl ? linkEl.getAttribute('href') : '';
      const sourceUrl = profileLink && profileLink.startsWith('http') ? profileLink : `https://www.weddingwire.in${profileLink}`;

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
        platform: 'weddingwire',
        sourceUrl,
        score,
        tier: determineTier(score),
        status: 'new'
      });
    });

    onLog(`[WeddingWire] Found ${results.length} vendors in ${location}`);
    return results;
  } catch (err) {
    onLog(`[WeddingWire] Error for ${location}: ${err.message}`);
    return [];
  }
}
