// ─────────────────────────────────────────────────────────────────────────────
// Google SERP Engine (Frontend Port)
// Ported from engine-google-serp.js (Playwright version)
// Fetches Google search results via proxy and parses with DOMParser.
// ─────────────────────────────────────────────────────────────────────────────

import { v4 as uuidv4 } from 'uuid';
import { proxyFetch, parseHTML, extractContactInfo, calculateLeadScore, determineTier } from '../proxyFetch';

export async function scrapeGoogleSerp(category, location, onLog = () => {}) {
  const query = `${category} in ${location} contact phone`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20&hl=en`;

  onLog(`[Google SERP] Searching: "${query}"`);

  try {
    const html = await proxyFetch(url);
    const doc = parseHTML(html);
    const results = [];

    // Extract organic search results
    const resultDivs = doc.querySelectorAll('div.g, div[data-hveid]');

    resultDivs.forEach(div => {
      const aTag = div.querySelector('a[href]');
      const h3 = div.querySelector('h3');
      if (!aTag || !h3) return;

      const name = h3.textContent.trim();
      const href = aTag.getAttribute('href');
      if (!href || href.startsWith('/search') || href.startsWith('#')) return;

      // Filter out known aggregator sites
      const lowerHref = href.toLowerCase();
      if (lowerHref.includes('justdial') || lowerHref.includes('wikipedia') ||
          lowerHref.includes('facebook.com/pages') || lowerHref.includes('indiamart') ||
          lowerHref.includes('wedmegood')) return;

      const snippetEl = div.querySelector('.VwiC3b, .st, span[data-ved]');
      const snippet = snippetEl ? snippetEl.textContent.trim() : '';

      const { emails, phones } = extractContactInfo(snippet + ' ' + div.textContent);

      const score = calculateLeadScore({ phone: phones[0] || null, email: emails[0] || null, website: href });

      if (name.length < 3 || name.length > 100) return;

      results.push({
        id: uuidv4(),
        name,
        category,
        city: location,
        phone: phones[0] || null,
        email: emails[0] || null,
        website: href,
        images: [],
        platform: 'google',
        sourceUrl: url,
        score,
        tier: determineTier(score),
        status: 'new'
      });
    });

    // Also scan Google's local business panel (Knowledge Panel)
    const localCards = doc.querySelectorAll('.VkpGBb, .uMdZh, .rllt__details');
    localCards.forEach(card => {
      const nameEl = card.querySelector('.OSrXXb, .dbg0pd, span[role="text"]');
      if (!nameEl) return;
      const name = nameEl.textContent.trim();
      if (!name) return;

      const { phones } = extractContactInfo(card.textContent);
      const score = calculateLeadScore({ phone: phones[0] || null });

      results.push({
        id: uuidv4(),
        name,
        category,
        city: location,
        phone: phones[0] || null,
        platform: 'google_local',
        sourceUrl: url,
        score,
        tier: determineTier(score),
        status: 'new'
      });
    });

    onLog(`[Google SERP] Found ${results.length} results for "${query}"`);
    return results;
  } catch (err) {
    onLog(`[Google SERP] Error: ${err.message}`);
    return [];
  }
}
