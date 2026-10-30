const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

// Dedicated agent ignoring SSL errors common on local business websites
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

/**
 * Ultra-Fast Website Contact & Asset Extractor
 * Fetches raw HTML in <800ms to extract all emails, phones, social links, and brand logos.
 * @param {string} url - Target website URL
 * @param {string} businessName - Trade name for avatar fallback
 * @returns {Promise<{ emails: string[], phones: string[], instagram: string, facebook: string, linkedin: string, logo: string }>}
 */
async function fastWebsiteExtract(url, businessName = '') {
  const result = {
    emails: [],
    phones: [],
    instagram: '',
    facebook: '',
    linkedin: '',
    logo: ''
  };

  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return result;
  }

  // Google 128px high-res favicon as reliable brand logo default
  try {
    const domain = new URL(url).hostname;
    result.logo = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch (e) {}

  try {
    const response = await axios.get(url, {
      timeout: 5000,
      httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      maxRedirects: 4
    });

    const html = response.data;
    if (typeof html !== 'string') return result;

    const $ = cheerio.load(html);

    // 1. Extract ALL valid email addresses
    const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const validEmails = [];
    const blacklist = [
      'wixpress', 'sentry', 'example.com', 'domain.com', 'schema.org', 
      'cloudflare', 'bootstrapcdn', 'wordpress', 'google.com', 'w3.org'
    ];

    emailMatches.forEach(rawEmail => {
      const e = rawEmail.toLowerCase().trim();
      const isBlacklisted = blacklist.some(b => e.includes(b));
      const isImage = /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(e);
      if (!isBlacklisted && !isImage && !validEmails.includes(e) && e.length < 50) {
        validEmails.push(e);
      }
    });

    // Check mailto: links in DOM
    $('a[href^="mailto:"]').each((_, el) => {
      const mailto = $(el).attr('href').replace(/^mailto:/i, '').split('?')[0].toLowerCase().trim();
      if (mailto && mailto.includes('@') && !validEmails.includes(mailto)) {
        validEmails.push(mailto);
      }
    });

    result.emails = validEmails;

    // 2. Extract Social Media Links
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const lower = href.toLowerCase();

      if (lower.includes('instagram.com/') && !result.instagram) {
        if (!lower.includes('/p/') && !lower.includes('/reel/') && !lower.includes('/explore/')) {
          result.instagram = href;
        }
      }
      if (lower.includes('facebook.com/') && !result.facebook) {
        if (!lower.includes('sharer') && !lower.includes('/share')) {
          result.facebook = href;
        }
      }
      if (lower.includes('linkedin.com/company/') && !result.linkedin) {
        result.linkedin = href;
      }

      // Check tel: links
      if (lower.startsWith('tel:')) {
        const tel = lower.replace('tel:', '').replace(/[^\d+]/g, '');
        if (tel.length >= 10 && !result.phones.includes(tel)) {
          result.phones.push(tel);
        }
      }
    });

    // 3. Extract High-Res Storefront Logo
    try {
      const ogImg = $('meta[property="og:image"]').attr('content');
      const appleIcon = $('link[rel="apple-touch-icon"]').attr('href');
      const shortcutIcon = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href');
      const logoImg = $('img[src*="logo" i], img[class*="logo" i], header img, nav img').first().attr('src');

      const rawLogo = ogImg || appleIcon || logoImg || shortcutIcon;
      if (rawLogo) {
        if (rawLogo.startsWith('http')) {
          result.logo = rawLogo;
        } else {
          try {
            result.logo = new URL(rawLogo, url).href;
          } catch (e) {}
        }
      }
    } catch (e) {}
  } catch (err) {
    // Network timeout or blocked connection - fallback gracefully
  }

  result.email = result.emails.length > 0 ? result.emails[0] : '';
  result.phone = result.phones.length > 0 ? result.phones[0] : '';

  return result;
}

module.exports = {
  fastWebsiteExtract
};
