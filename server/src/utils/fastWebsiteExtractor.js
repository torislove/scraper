const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

// Dedicated agent ignoring SSL errors common on local business websites with keepAlive
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  timeout: 5000
});

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8'
};

const EMAIL_BLACKLIST = [
  'wixpress', 'sentry', 'example.com', 'domain.com', 'schema.org',
  'cloudflare', 'bootstrapcdn', 'wordpress', 'google.com', 'w3.org', 'support@wix.com', 'yourname@email.com'
];

/**
 * Extracts phones, emails, socials, and contact metadata from raw HTML.
 */
function extractFromHtml(html, pageUrl) {
  const data = {
    emails: [],
    phones: [],
    mobiles: [],
    instagram: '',
    facebook: '',
    linkedin: '',
    logo: '',
    gstin: '',
    contactPerson: '',
    pincode: '',
    whatsappLink: '',
    candidateLinks: []
  };

  if (!html || typeof html !== 'string') return data;

  const $ = cheerio.load(html);

  // 1. Email Extraction
  const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  emailMatches.forEach(rawEmail => {
    const e = rawEmail.toLowerCase().trim();
    const isBlacklisted = EMAIL_BLACKLIST.some(b => e.includes(b));
    const isImage = /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(e);
    if (!isBlacklisted && !isImage && !data.emails.includes(e) && e.length < 50) {
      data.emails.push(e);
    }
  });

  // mailto: links in DOM
  $('a[href^="mailto:"]').each((_, el) => {
    const mailto = ($(el).attr('href') || '').replace(/^mailto:/i, '').split('?')[0].toLowerCase().trim();
    if (mailto && mailto.includes('@') && !data.emails.includes(mailto) && !EMAIL_BLACKLIST.some(b => mailto.includes(b))) {
      data.emails.push(mailto);
    }
  });

  // 2. Links & Socials & Tel & WhatsApp
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const lower = href.toLowerCase();

    if (lower.includes('instagram.com/') && !data.instagram) {
      if (!lower.includes('/p/') && !lower.includes('/reel/') && !lower.includes('/explore/')) {
        data.instagram = href;
      }
    }
    if (lower.includes('facebook.com/') && !data.facebook) {
      if (!lower.includes('sharer') && !lower.includes('/share')) {
        data.facebook = href;
      }
    }
    if (lower.includes('linkedin.com/company/') && !data.linkedin) {
      data.linkedin = href;
    }

    // Direct WhatsApp Links
    if (lower.includes('wa.me/') || lower.includes('api.whatsapp.com/send')) {
      const waDigits = lower.replace(/\D/g, '').slice(-10);
      if (waDigits.length === 10 && /^[6-9]/.test(waDigits)) {
        data.whatsappLink = `https://wa.me/91${waDigits}`;
        if (!data.mobiles.includes(waDigits)) data.mobiles.push(waDigits);
        const formatted = `+91 ${waDigits.slice(0, 5)} ${waDigits.slice(5)}`;
        if (!data.phones.includes(formatted)) data.phones.push(formatted);
      }
    }

    // Direct tel: links
    if (lower.startsWith('tel:')) {
      const telDigits = lower.replace('tel:', '').replace(/\D/g, '').slice(-10);
      if (telDigits.length === 10) {
        const isMobile = /^[6-9]/.test(telDigits);
        if (isMobile && !data.mobiles.includes(telDigits)) data.mobiles.push(telDigits);
        const formatted = `+91 ${telDigits.slice(0, 5)} ${telDigits.slice(5)}`;
        if (!data.phones.includes(formatted)) data.phones.push(formatted);
      }
    }

    // Discover internal contact/about links for multi-page crawl
    if (/contact|about|reach|touch|location/i.test(lower) && pageUrl) {
      try {
        const fullUrl = new URL(href, pageUrl).toString();
        if (new URL(fullUrl).origin === new URL(pageUrl).origin && fullUrl !== pageUrl) {
          if (!data.candidateLinks.includes(fullUrl)) {
            data.candidateLinks.push(fullUrl);
          }
        }
      } catch (e) {}
    }
  });

  // 3. Indian Phone / Mobile regex directly from text
  const textContent = $('body').text() || html;
  const mobileRegex = /(?:(?:\+|0{0,2})91[\s-]?)?([6-9]\d{4}[\s-]?\d{5})\b/g;
  let match;
  while ((match = mobileRegex.exec(textContent)) !== null) {
    const digits = match[1].replace(/\D/g, '');
    if (digits.length === 10 && /^[6-9]/.test(digits)) {
      if (!data.mobiles.includes(digits)) data.mobiles.push(digits);
      const formatted = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
      if (!data.phones.includes(formatted)) data.phones.push(formatted);
      if (!data.whatsappLink) data.whatsappLink = `https://wa.me/91${digits}`;
    }
  }

  // 4. Logo Extraction
  try {
    const ogImg = $('meta[property="og:image"]').attr('content');
    const appleIcon = $('link[rel="apple-touch-icon"]').attr('href');
    const shortcutIcon = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href');
    const logoImg = $('img[src*="logo" i], img[class*="logo" i], header img, nav img').first().attr('src');
    const rawLogo = ogImg || appleIcon || logoImg || shortcutIcon;
    if (rawLogo) {
      if (rawLogo.startsWith('http')) {
        data.logo = rawLogo;
      } else if (pageUrl) {
        try { data.logo = new URL(rawLogo, pageUrl).href; } catch (e) {}
      }
    }
  } catch (e) {}

  // 5. GSTIN parsing disabled per user requirement

  // 6. Owner / Proprietor / Key Contact
  const ownerMatch = html.match(/(?:founder|director|managing director|md|proprietor|owner|contact person)\s*[:\-–]\s*([a-zA-Z\s.]{3,35})/i);
  if (ownerMatch && ownerMatch[1]) {
    const cleanOwner = ownerMatch[1].replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!/(unknown|details|privacy|policy|terms|contact|email|phone)/i.test(cleanOwner)) {
      data.contactPerson = cleanOwner;
    }
  }

  // 7. Pincode
  const pinMatch = html.match(/\b([1-9][0-9]{5})\b/);
  if (pinMatch) data.pincode = pinMatch[1];

  return data;
}

/**
 * Ultra-Fast Parallel Multi-Page Website Contact & Asset Extractor
 * Crawls home page + contact page in parallel (<800ms) to harvest mobile numbers and contacts.
 */
async function fastWebsiteExtract(url, businessName = '') {
  const result = {
    emails: [],
    phones: [],
    mobiles: [],
    phone: '',
    email: '',
    instagram: '',
    facebook: '',
    linkedin: '',
    logo: '',
    gstin: '',
    contactPerson: '',
    pincode: '',
    whatsappLink: ''
  };

  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return result;
  }

  let domain = '';
  let origin = '';
  try {
    const parsedUrl = new URL(url);
    domain = parsedUrl.hostname;
    origin = parsedUrl.origin;
    result.logo = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch (e) {
    return result;
  }

  // Build target candidate URLs: Homepage + common Contact/About routes in parallel
  const targetUrls = [url];
  if (origin) {
    targetUrls.push(`${origin}/contact`);
    targetUrls.push(`${origin}/contact-us`);
    targetUrls.push(`${origin}/about-us`);
  }
  const uniqueUrls = [...new Set(targetUrls)].slice(0, 3);

  try {
    const responses = await Promise.allSettled(
      uniqueUrls.map(targetUrl =>
        axios.get(targetUrl, {
          timeout: 4000,
          httpsAgent,
          headers: DEFAULT_HEADERS,
          maxRedirects: 3,
          validateStatus: status => status >= 200 && status < 400
        })
      )
    );

    for (let i = 0; i < responses.length; i++) {
      const resp = responses[i];
      if (resp.status !== 'fulfilled' || !resp.value?.data) continue;
      const html = typeof resp.value.data === 'string' ? resp.value.data : '';
      if (!html) continue;

      const extracted = extractFromHtml(html, uniqueUrls[i]);

      // Merge results
      for (const email of extracted.emails) {
        if (!result.emails.includes(email)) result.emails.push(email);
      }
      for (const phone of extracted.phones) {
        if (!result.phones.includes(phone)) result.phones.push(phone);
      }
      for (const mob of extracted.mobiles) {
        if (!result.mobiles.includes(mob)) result.mobiles.push(mob);
      }

      if (!result.instagram && extracted.instagram) result.instagram = extracted.instagram;
      if (!result.facebook && extracted.facebook) result.facebook = extracted.facebook;
      if (!result.linkedin && extracted.linkedin) result.linkedin = extracted.linkedin;
      if (extracted.logo && (!result.logo || result.logo.includes('favicons'))) result.logo = extracted.logo;

      if (!result.contactPerson && extracted.contactPerson) result.contactPerson = extracted.contactPerson;
      if (!result.pincode && extracted.pincode) result.pincode = extracted.pincode;
      if (!result.whatsappLink && extracted.whatsappLink) result.whatsappLink = extracted.whatsappLink;
    }
  } catch (err) {
    // Graceful fallback
  }

  // Prioritize Indian mobile number for primary phone
  if (result.mobiles.length > 0) {
    result.phone = `+91 ${result.mobiles[0].slice(0, 5)} ${result.mobiles[0].slice(5)}`;
    if (!result.whatsappLink) {
      result.whatsappLink = `https://wa.me/91${result.mobiles[0]}`;
    }
  } else if (result.phones.length > 0) {
    result.phone = result.phones[0];
  }

  result.email = result.emails.length > 0 ? result.emails[0] : '';

  return result;
}

module.exports = {
  fastWebsiteExtract,
  extractFromHtml
};
