import { v4 as uuidv4 } from 'uuid';
import { API_URL } from '../apiConfig';

const PROXY_URL = `${API_URL}/proxy`;

/**
 * Utility to proxy fetch requests to bypass CORS
 */
async function fetchProxied(url) {
  const response = await fetch(`${PROXY_URL}?url=${encodeURIComponent(url)}`);
  if (!response.ok) throw new Error(`Proxy error: ${response.statusText}`);
  return response.text();
}

/**
 * Parse JustDial HTML using native browser DOMParser
 */
export async function scrapeJustDialFrontend(category, location) {
  try {
    const formattedCat = category.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
    const formattedLoc = location.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
    
    const url = `https://www.justdial.com/${formattedLoc}/${formattedCat}`;
    const html = await fetchProxied(url);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const results = [];
    
    // JustDial specific class parsing (lightweight DOM querying)
    const items = doc.querySelectorAll('.resultbox_info');
    
    items.forEach((item) => {
      const nameEl = item.querySelector('.resultbox_title_anchor');
      if (!nameEl) return;
      
      const name = nameEl.textContent.trim();
      const rawRating = item.querySelector('.resultbox_totalrate')?.textContent?.trim();
      const rating = rawRating ? parseFloat(rawRating) : null;
      const reviews = item.querySelector('.resultbox_countrate')?.textContent?.replace(/[^0-9]/g, '');
      
      let phone = null;
      const phoneEl = item.querySelector('.callcontent');
      if (phoneEl) {
         const rawPhone = phoneEl.textContent.replace(/[^0-9]/g, '');
         if (rawPhone.length >= 10) phone = rawPhone.slice(-10);
      }
      
      const images = [];
      const imgEls = item.querySelectorAll('img');
      imgEls.forEach(img => {
        const src = img.getAttribute('data-src') || img.src;
        if (src && !src.includes('placeholder') && !src.includes('avatar')) {
          images.push(src);
        }
      });
      
      results.push({
        id: uuidv4(),
        name,
        category,
        city: location,
        rating,
        reviewsCount: reviews ? parseInt(reviews, 10) : 0,
        phone,
        images,
        platform: 'justdial',
        sourceUrl: url,
        status: 'new'
      });
    });
    
    return results;
  } catch (err) {
    console.error('[ScraperEngine] JustDial error:', err);
    return [];
  }
}

/**
 * Parse Google SERP HTML using native browser DOMParser
 */
export async function scrapeGoogleFrontend(category, location) {
  try {
    const query = encodeURIComponent(`${category} in ${location}`);
    const url = `https://www.google.com/search?q=${query}&hl=en`;
    const html = await fetchProxied(url);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const results = [];
    
    // Google SERP Business Profile parsing
    const cards = doc.querySelectorAll('.VkpGBb, .uMdZh');
    
    cards.forEach((card) => {
      const nameEl = card.querySelector('.OSrXXb, .dbg0pd');
      if (!nameEl) return;
      
      const name = nameEl.textContent.trim();
      let phone = null;
      let rating = null;
      
      const textNodes = Array.from(card.querySelectorAll('span'));
      for (const span of textNodes) {
        const txt = span.textContent;
        // Phone regex
        const phoneMatch = txt.replace(/[^0-9]/g, '');
        if (phoneMatch.length >= 10 && phoneMatch.length <= 13) {
          phone = phoneMatch.slice(-10);
        }
        // Rating
        if (txt.includes('(') && txt.includes(')')) {
           const potentialRating = parseFloat(txt);
           if (!isNaN(potentialRating) && potentialRating <= 5) rating = potentialRating;
        }
      }
      
      results.push({
        id: uuidv4(),
        name,
        category,
        city: location,
        phone,
        rating,
        platform: 'google',
        sourceUrl: url,
        status: 'new'
      });
    });
    
    return results;
  } catch (err) {
    console.error('[ScraperEngine] Google error:', err);
    return [];
  }
}
