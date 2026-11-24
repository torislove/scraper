/**
 * siteEnricher.js
 * Secondary deep crawler for business domains (extracts official emails, social links, storefront media).
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { fastWebsiteExtract } = require('../../utils/fastWebsiteExtractor');
const { normalizePhone } = require('../../utils/phoneUtils');

let logger = console.log;
function setEnricherLogger(l) { if (l) logger = l; }
function addLog(msg) { logger(msg); }

async function scrapeWebsiteForSocials(browser, url, vendorName) {
  if (!url || !url.startsWith('http')) return { email: '', instagram: '', facebook: '', phone: '', instagramFollowers: '', facebookFollowers: '' };

  try {
    addLog(`[Deep Scrape] Investigating website for ${vendorName || 'vendor'}...`);
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const emailMatch = html.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g) || [];
    let validEmails = [...new Set(emailMatch)].filter(e =>
      !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.jpeg') && !e.endsWith('.webp') && !e.endsWith('.gif') && !e.includes('wixpress') && !e.includes('sentry')
    );

    // We no longer scan the entire raw HTML for 10-digit strings because it hallucinates UNIX timestamps (e.g. 1608662146)
    let validPhones = [];

    // Strict text-node scanning for contextual phone numbers (e.g. "Phone: 9876543210" or "Call +91-9876543210")
    const phoneContextRegex = /(?:phone|tel|call|whatsapp|mob|mobile)[\s:.-]*((?:\+\d{1,4}[\s-]?)?(?:\(\d{1,4}\)[\s-]?)?(?:\d{1,4}[\s-]?){2,4}\d{2,4})/gi;
    let match;
    while ((match = phoneContextRegex.exec(html)) !== null) {
      const digits = match[1].replace(/\D/g, '');
      if (digits.length >= 8 && digits.length <= 15) {
        validPhones.push(match[1].trim());
      }
    }

    let instagram = '';
    let facebook = '';

    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      const lowerHref = href.toLowerCase();
      if (lowerHref.startsWith('mailto:')) {
        const mail = lowerHref.replace('mailto:', '').split('?')[0];
        if (mail && mail.includes('@')) validEmails.push(mail);
      }
      if (lowerHref.startsWith('tel:')) {
        const tel = lowerHref.replace('tel:', '').replace(/[^\d+]/g, '');
        if (tel.length >= 10) validPhones.push(tel);
      }

      if (lowerHref.includes('instagram.com/') && !instagram) instagram = href;
      if (lowerHref.includes('facebook.com/') && !facebook && !lowerHref.includes('sharer')) facebook = href;
    });

    validEmails = [...new Set(validEmails)];
    validPhones = [...new Set(validPhones)];

    // Deep JSON / Script extraction for modern React/NextJS sites
    if (!instagram) {
      const rawIgMatch = html.match(/https:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._-]+/gi) || [];
      const validIg = rawIgMatch.find(l => !l.includes('/p/') && !l.includes('/reel/') && !l.includes('explore'));
      if (validIg) instagram = validIg.replace(/["'\\]/g, '');
    }

    let logo = '';
    const images = [];
    try {
      const ogImg = $('meta[property="og:image"]').attr('content');
      const icon = $('link[rel="apple-touch-icon"]').attr('href') ||
        $('link[rel="icon"]').attr('href') ||
        $('link[rel="shortcut icon"]').attr('href');

      const logoEl = $('img[src*="logo" i], img[class*="logo" i], img[alt*="logo" i], header img, nav img').first();
      const logoSrc = logoEl.attr('src');

      const resolveUrl = (rel) => {
        if (!rel) return '';
        if (rel.startsWith('http')) return rel;
        try {
          return new URL(rel, url).href;
        } catch (e) { return ''; }
      };

      logo = resolveUrl(logoSrc) || resolveUrl(icon) || resolveUrl(ogImg);

      if (ogImg && ogImg.startsWith('http')) images.push(ogImg);
      $('img').each((i, el) => {
        const src = $(el).attr('src');
        if (src && src.startsWith('http') && !src.includes('avatar') && !src.includes('user') && !src.includes('profile') && images.length < 6) {
          images.push(src);
        }
      });
    } catch (e) { }

    return {
      email: validEmails.length > 0 ? validEmails[0] : '',
      phone: validPhones.length > 0 ? validPhones[0] : '',
      instagram: '',
      facebook: '',
      instagramFollowers: '',
      facebookFollowers: '',
      images,
      logo
    };
  } catch (err) {
    console.log(`[Cheerio Deep Scrape] Failed or timed out for ${url}`);
    return { email: '', instagram: '', facebook: '', phone: '', instagramFollowers: '', facebookFollowers: '', images: [], logo: '' };
  }
}

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * INTELLIGENT STOREFRONT MEDIA & OFFICIAL LOGO EXTRACTOR
 * Rejects all commenter avatars, reviewer selfie photos, and comment attachments.
 * Prioritizes:
 * 1. Official website domain favicon / high-res brand logo (128px-256px)
 * 2. Header hero storefront photo (from place panel header, strictly NOT reviews)
 * 3. Store gallery photos that are verified non-review images
 * ──────────────────────────────────────────────────────────────────────────────
 */
async function extractStorefrontMediaAndLogo(page, websiteUrl, businessName) {
  try {
    const media = await page.evaluate(() => {
      // Helper: Check if element is inside review / comments DOM tree
      const isInsideReviewOrComment = (el) => {
        return !!el.closest([
          '[data-review-id]',
          '.jftiEf',
          '[aria-label*="Reviews" i]',
          '[aria-label*="Review by" i]',
          '.MyEned',
          '.ODSEW-ShBeI',
          'div[jsaction*="review"]',
          '.wiI7pd',
          '.m6QErb[aria-label*="Reviews" i]',
          '.fontBodySmall',
          'button[aria-label*="Review" i]'
        ].join(', '));
      };

      // Helper: Check if URL represents a user profile avatar or commenter photo
      const isReviewerAvatarUrl = (src) => {
        if (!src) return true;
        const s = src.toLowerCase();
        // Commenter/User account avatars from Google
        if (s.includes('googleusercontent.com/a/') || s.includes('googleusercontent.com/a-/')) return true;
        if (s.includes('default_avatar') || s.includes('/avatar/') || s.includes('avatar.png')) return true;
        // User profile avatar thumbnail size parameters
        if (/=s(24|32|36|40|48|56|64|72|80|96|120)-c-rp-mo/.test(s)) return true;
        if (s.includes('/mo/') && s.includes('googleusercontent.com')) return true;
        return false;
      };

      // Helper: Check if image element or its container says "Photo by [person]" or "Review by [person]"
      const hasReviewerLabel = (el) => {
        const alt = (el.getAttribute('alt') || '').toLowerCase();
        const aria = (el.closest('button')?.getAttribute('aria-label') || el.getAttribute('aria-label') || '').toLowerCase();
        if (alt.includes('review by') || alt.includes('photo by') || alt.includes('profile photo') || alt.includes('user photo')) return true;
        if (aria.includes('review by') || aria.includes('photo by') || aria.includes('profile photo')) return true;
        return false;
      };

      // 1. Target the Google Maps Official Hero Header Image
      // Header hero photos appear in the top hero button / header gallery outside of reviews
      let heroPhoto = '';
      const heroSelectors = [
        'button[jsaction*="heroHeader"] img',
        'div.lMbq3e img',
        'div.Z6G0Re button img',
        'button.aoRNLd img',
        'div[role="main"] button[aria-label*="Photo of"] img'
      ];

      for (const sel of heroSelectors) {
        const candidate = document.querySelector(sel);
        if (candidate && candidate.src) {
          const src = candidate.src;
          if (!isInsideReviewOrComment(candidate) && !isReviewerAvatarUrl(src) && !hasReviewerLabel(candidate)) {
            // Found official hero storefront cover
            heroPhoto = src;
            break;
          }
        }
      }

      // 2. Target genuine store photos strictly excluding reviews
      const storePhotos = [];
      const allImgs = document.querySelectorAll('button[aria-label^="Photo of"] img, img[src*="googleusercontent.com/p/"]');
      for (const img of allImgs) {
        if (storePhotos.length >= 6) break;
        const src = img.src;
        if (!src) continue;
        if (isInsideReviewOrComment(img)) continue;
        if (isReviewerAvatarUrl(src)) continue;
        if (hasReviewerLabel(img)) continue;

        // Skip duplicates
        if (!storePhotos.includes(src)) {
          storePhotos.push(src);
        }
      }

      if (heroPhoto && !storePhotos.includes(heroPhoto)) {
        storePhotos.unshift(heroPhoto);
      }

      return {
        heroPhoto: heroPhoto || (storePhotos.length > 0 ? storePhotos[0] : ''),
        storePhotos
      };
    }).catch(() => ({ heroPhoto: '', storePhotos: [] }));

    // 3. Intelligent Brand Logo Determination:
    // If business has a website, generate high-resolution Google Favicon (crystal clear official logo)
    let officialLogo = '';
    if (websiteUrl && websiteUrl.startsWith('http')) {
      try {
        const parsed = new URL(websiteUrl);
        const host = parsed.hostname.replace(/^www\./, '');
        if (host && !['facebook.com', 'instagram.com', 'google.com', 'wa.me'].includes(host)) {
          officialLogo = `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
        }
      } catch (e) { }
    }

    // Fallback to clean storefront cover photo. Never invent an avatar URL:
    // the UI renders initials when a real logo is missing.
    const finalPhoto = media.heroPhoto || (media.storePhotos.length > 0 ? media.storePhotos[0] : '');
    const finalLogo = officialLogo || finalPhoto || '';

    return {
      logo: finalLogo,
      photo: finalPhoto,
      avatar: finalLogo || finalPhoto,
      images: media.storePhotos
    };
  } catch (err) {
    return {
      logo: '',
      photo: '',
      avatar: '',
      images: []
    };
  }
}

module.exports = {
  scrapeWebsiteForSocials,
  extractStorefrontMediaAndLogo,
  setEnricherLogger
};
