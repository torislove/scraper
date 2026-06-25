// ─────────────────────────────────────────────────────────────────────────────
// JustDial Scraper Engine (Frontend Port)
// Ported from engine-justdial.js (CDP Puppeteer version)
// Uses Proxy → DOMParser instead of a real browser.
// Note: JustDial may show a login wall. The engine gracefully returns [] if blocked.
// ─────────────────────────────────────────────────────────────────────────────

import { v4 as uuidv4 } from 'uuid';
import { proxyFetch, parseHTML, extractContactInfo, calculateLeadScore, determineTier } from '../proxyFetch';

export async function scrapeJustDial(category, location, onLog = () => {}) {
  const city = location.split(',')[0].trim();
  const catSlug = category.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
  const citySlug = city.replace(/\s+/g, '-').toLowerCase();
  const url = `https://www.justdial.com/${citySlug}/${catSlug}`;

  onLog(`[JustDial] Fetching: ${url}`);

  try {
    const html = await proxyFetch(url);
    const doc = parseHTML(html);

    // Check if JustDial is showing a login/CAPTCHA wall
    const bodyText = doc.body?.textContent || '';
    if (bodyText.includes('Login') && bodyText.includes('OTP') && doc.querySelectorAll('.resultbox_info').length === 0) {
      onLog(`[JustDial] Login wall detected for ${city}. Skipping.`);
      return [];
    }

    const results = [];
    const items = doc.querySelectorAll('.resultbox_info, .store-details');

    items.forEach(item => {
      const nameEl = item.querySelector('.resultbox_title_anchor, .fn');
      if (!nameEl) return;
      const name = nameEl.textContent.trim();

      const ratingEl = item.querySelector('.resultbox_totalrate, .green-color');
      const rating = ratingEl ? parseFloat(ratingEl.textContent.trim()) : null;

      const reviewEl = item.querySelector('.resultbox_countrate, .reviewcount');
      const reviewsCount = reviewEl ? parseInt(reviewEl.textContent.replace(/[^0-9]/g, ''), 10) : 0;

      // JustDial hides phone numbers behind data attributes
      const phoneEl = item.querySelector('[data-mobile], .callcontent, .contact-info');
      let phone = null;
      if (phoneEl) {
        const raw = (phoneEl.getAttribute('data-mobile') || phoneEl.textContent).replace(/\D/g, '');
        if (raw.length >= 10) phone = raw.slice(-10);
      }

      const addrEl = item.querySelector('.address-info, .resultbox_address');
      const address = addrEl ? addrEl.textContent.trim() : '';

      const imgEl = item.querySelector('img[data-src], img.jdicon');
      const images = [];
      if (imgEl) {
        const src = imgEl.getAttribute('data-src') || imgEl.src;
        if (src && src.startsWith('http')) images.push(src);
      }

      const { emails } = extractContactInfo(bodyText);
      const score = calculateLeadScore({ phone, address, email: emails[0] || null, rating });

      results.push({
        id: uuidv4(),
        name,
        category,
        city: location,
        phone,
        email: emails[0] || null,
        address,
        rating,
        reviewsCount,
        images,
        platform: 'justdial',
        sourceUrl: url,
        score,
        tier: determineTier(score),
        status: 'new'
      });
    });

    onLog(`[JustDial] Found ${results.length} vendors in ${city}`);
    return results;
  } catch (err) {
    onLog(`[JustDial] Error for ${city}: ${err.message}`);
    return [];
  }
}
