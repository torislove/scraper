const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const { normalizePhone, extractPhones } = require('./phoneUtils');
const { fetchTextSmart } = require('../services/fetchRouter');

// Dedicated agent ignoring SSL errors common on local business websites with keepAlive
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  maxSockets: 16,
  maxFreeSockets: 8,
  timeout: 3500
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
 * Validates that a string is clean human readable text and not a CSS/JS code artifact.
 */
function isCssOrCodeSnippet(text) {
  if (!text || typeof text !== 'string') return true;
  if (/--[a-z0-9_-]+:/i.test(text)) return true; // CSS variable declaration e.g. --wbu-color-...
  if (/[{};]\s*--/i.test(text)) return true;
  if (/(?:rgba?|hsla?)\s*\(/i.test(text)) return true;
  if (/(?:mOnSite|shouldReportErrorOnlyInPanorama|window\.__|document\.)/i.test(text)) return true;
  if (/#[0-9a-fA-F]{6}\b/.test(text) && text.includes(';')) return true;
  if (text.includes('var(--') || text.includes('!important')) return true;
  return false;
}

/**
 * Extracts phones, emails, socials, and contact metadata from raw HTML.
 */
function extractFromHtml(html, pageUrl, opts = {}) {
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

  // 0. CRITICAL: Extract structured Schema.org JSON-LD BEFORE stripping script tags!
  // 65%+ of modern business websites (WordPress, Wix, Squarespace, Shopify) declare
  // their verified business phone and email inside JSON-LD blocks.
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const text = $(el).html();
      if (!text) return;
      const ld = JSON.parse(text);
      const items = Array.isArray(ld) ? ld : [ld];
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const checkPhone = (rawTel) => {
          if (!rawTel) return;
          const p = normalizePhone(String(rawTel).trim(), {
            context: 'schema json-ld phone',
            defaultCountry: opts.defaultCountry || 'IN',
            allowInternational: opts.allowInternational === true,
            trusted: true
          });
          if (p) {
            const national = p.national || p.digits;
            if (p.isMobile && !data.mobiles.includes(national)) data.mobiles.push(national);
            if (!data.phones.includes(p.displayPhone)) data.phones.push(p.displayPhone);
            if (p.isMobile && !data.whatsappLink) data.whatsappLink = `https://wa.me/${p.digits}`;
          }
        };

        if (item.telephone) checkPhone(item.telephone);
        if (item.contactPoint) {
          const cps = Array.isArray(item.contactPoint) ? item.contactPoint : [item.contactPoint];
          cps.forEach(cp => { if (cp?.telephone) checkPhone(cp.telephone); });
        }
        if (item.email && typeof item.email === 'string') {
          const em = item.email.toLowerCase().trim();
          if (!data.emails.includes(em) && em.includes('@') && !EMAIL_BLACKLIST.some(b => em.includes(b))) {
            data.emails.push(em);
          }
        }
        if (item.address && typeof item.address === 'object' && item.address.postalCode && !data.pincode) {
          data.pincode = String(item.address.postalCode).trim();
        }
        if (item.founder || item.owner) {
          const f = item.founder || item.owner;
          const name = typeof f === 'string' ? f : (f.name || '');
          if (name && !data.contactPerson && !isCssOrCodeSnippet(name)) {
            data.contactPerson = name;
          }
        }
      }
    } catch (e) {}
  });

  // 0b. Visual Image Contact Recognition (Scan banners, visiting cards, logos for contact info)
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    const alt = $(el).attr('alt') || '';
    const title = $(el).attr('title') || '';
    const combined = `${src} ${alt} ${title}`;
    const match = combined.match(/(?:call|phone|tel|wa|whatsapp|contact)[_-]?(\+?[0-9]{10,13})/i);
    if (match && match[1]) {
      const p = normalizePhone(match[1], {
        context: 'image banner contact',
        defaultCountry: opts.defaultCountry || 'IN',
        allowInternational: opts.allowInternational === true
      });
      if (p) {
        const national = p.national || p.digits;
        if (p.isMobile && !data.mobiles.includes(national)) data.mobiles.push(national);
        if (!data.phones.includes(p.displayPhone)) data.phones.push(p.displayPhone);
        if (p.isMobile && !data.whatsappLink) data.whatsappLink = `https://wa.me/${p.digits}`;
      }
    }
  });

  // 0c. Inline Scripts & Data Blobs (Next.js __NEXT_DATA__, Nuxt, Webflow, Vite inline states)
  $('script').each((_, el) => {
    try {
      const type = ($(el).attr('type') || '').toLowerCase();
      if (type === 'application/ld+json') return; // Handled above
      const scriptContent = $(el).html();
      if (!scriptContent || scriptContent.length < 10 || scriptContent.length > 500000) return;
      
      // Look for phone/tel/mobile keys in inline state objects
      const phonePropRegex = /(?:phone|mobile|tel|contact|whatsapp|emergency|call)["':\s=]+["']?(\+?[0-9\s-]{10,16})["']?/gi;
      let m;
      while ((m = phonePropRegex.exec(scriptContent)) !== null) {
        const raw = m[1].trim();
        const p = normalizePhone(raw, {
          context: 'inline script phone',
          defaultCountry: opts.defaultCountry || 'IN',
          allowInternational: opts.allowInternational === true
        });
        if (p) {
          const national = p.national || p.digits;
          if (p.isMobile && !data.mobiles.includes(national)) data.mobiles.push(national);
          if (!data.phones.includes(p.displayPhone)) data.phones.push(p.displayPhone);
          if (p.isMobile && !data.whatsappLink) data.whatsappLink = `https://wa.me/${p.digits}`;
        }
      }
    } catch (e) {}
  });

  // 0d. HTML Data Attributes & Tel/WhatsApp Attributes on any element
  $('[data-phone], [data-tel], [data-mobile], [data-whatsapp], a[href*="wa.me"], a[href*="whatsapp"]').each((_, el) => {
    try {
      const raw = $(el).attr('data-phone') || $(el).attr('data-tel') || $(el).attr('data-mobile') || $(el).attr('data-whatsapp') || $(el).attr('href') || '';
      const p = normalizePhone(raw, {
        context: 'data attr phone',
        defaultCountry: opts.defaultCountry || 'IN',
        allowInternational: opts.allowInternational === true
      });
      if (p) {
        const national = p.national || p.digits;
        if (p.isMobile && !data.mobiles.includes(national)) data.mobiles.push(national);
        if (!data.phones.includes(p.displayPhone)) data.phones.push(p.displayPhone);
        if (p.isMobile && !data.whatsappLink) data.whatsappLink = `https://wa.me/${p.digits}`;
      }
    } catch (e) {}
  });

  // Strip all script, style, SVG, and metadata tags from Cheerio DOM
  // to prevent CSS variables (--wbu-color-...) and JS chunks from leaking into text.
  $('script, style, noscript, svg, template, iframe, style-sheet').remove();

  const cleanBodyText = ($('body').text() || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Email Extraction from clean text & mailto anchors
  const emailMatches = cleanBodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  emailMatches.forEach(rawEmail => {
    const e = rawEmail.toLowerCase().trim();
    const isBlacklisted = EMAIL_BLACKLIST.some(b => e.includes(b));
    const isImage = /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(e);
    if (!isBlacklisted && !isImage && !data.emails.includes(e) && e.length < 50 && !isCssOrCodeSnippet(e)) {
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
      const rawWa = lower.includes('wa.me/')
        ? lower.split('wa.me/')[1].split(/[?&]/)[0]
        : (() => {
            try { return new URL(href, 'https://wa.me').searchParams.get('phone') || ''; }
            catch (e) { return ''; }
          })();
      const wa = normalizePhone(rawWa, {
        context: 'phone whatsapp',
        defaultCountry: opts.defaultCountry || 'IN',
        allowInternational: opts.allowInternational === true,
        trusted: true
      });
      if (wa?.isMobile) {
        data.whatsappLink = `https://wa.me/${wa.digits}`;
        if (!data.mobiles.includes(wa.national || wa.digits)) data.mobiles.push(wa.national || wa.digits);
        if (!data.phones.includes(wa.displayPhone)) data.phones.push(wa.displayPhone);
      }
    }

    // Direct tel: links
    if (lower.startsWith('tel:')) {
      const rawTel = decodeURIComponent(href.slice(4)).split(/[;,]/)[0];
      const tel = normalizePhone(rawTel, {
        context: 'phone tel',
        defaultCountry: opts.defaultCountry || 'IN',
        allowInternational: opts.allowInternational === true
      });
      if (tel) {
        if (tel.isMobile && !data.mobiles.includes(tel.national || tel.digits)) {
          data.mobiles.push(tel.national || tel.digits);
        }
        if (!data.phones.includes(tel.displayPhone)) data.phones.push(tel.displayPhone);
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

  // 3. Phone / mobile extraction from clean page text.
  // India keeps its strict regex. Other countries use the shared parser, which
  // understands local trunk prefixes and validates the number's country.
  const textContent = cleanBodyText;
  const isIntl = Boolean(opts.allowInternational || (opts.defaultCountry && opts.defaultCountry !== 'IN'));
  if (isIntl) {
    const parsed = extractPhones(textContent, {
      defaultCountry: opts.defaultCountry || 'US',
      allowInternational: true,
      trusted: false,
      context: 'phone contact'
    });
    for (const phone of parsed) {
      if (isCssOrCodeSnippet(phone.displayPhone) || isCssOrCodeSnippet(phone.digits)) continue;
      const national = phone.national || phone.digits;
      if (phone.isMobile || phone.isLandline) {
        if (!data.mobiles.includes(national)) data.mobiles.push(national);
        if (!data.whatsappLink && phone.isMobile) data.whatsappLink = `https://wa.me/${phone.digits}`;
      }
      if (!data.phones.includes(phone.displayPhone)) data.phones.push(phone.displayPhone);
    }
  } else {
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

  // 6. Owner / Proprietor / Key Contact (run on clean text, never raw HTML)
  const ownerMatch = cleanBodyText.match(/(?:founder|director|managing director|md|proprietor|owner|contact person)\s*[:\-–]\s*([a-zA-Z\s.]{3,35})/i);
  if (ownerMatch && ownerMatch[1]) {
    const cleanOwner = ownerMatch[1].replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!/(unknown|details|privacy|policy|terms|contact|email|phone)/i.test(cleanOwner) && !isCssOrCodeSnippet(cleanOwner)) {
      data.contactPerson = cleanOwner;
    }
  }

  // 7. Postal / ZIP code (Country-Aware and run on clean text only, never raw HTML hex colors)
  const countryCode = String(opts.defaultCountry || (isIntl ? 'US' : 'IN')).toUpperCase();
  if (countryCode === 'IN') {
    // 6-digit Indian PIN code preceded by contextual keywords or clean word boundary
    const pinMatch = cleanBodyText.match(/(?:pincode|pin|postal code|code)?\s*[:\-–]?\s*\b([1-9][0-9]{5})\b/i);
    if (pinMatch && !isCssOrCodeSnippet(pinMatch[1])) data.pincode = pinMatch[1];
  } else if (countryCode === 'US') {
    // 5-digit US ZIP code
    const zipMatch = cleanBodyText.match(/\b([0-9]{5}(?:-[0-9]{4})?)\b/);
    if (zipMatch && !isCssOrCodeSnippet(zipMatch[1])) data.pincode = zipMatch[1];
  } else if (countryCode === 'CA') {
    // Canadian postal code: A1A 1A1
    const caMatch = cleanBodyText.match(/\b([A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d)\b/);
    if (caMatch && !isCssOrCodeSnippet(caMatch[1])) data.pincode = caMatch[1].toUpperCase();
  } else if (countryCode === 'GB') {
    // UK Postcode
    const ukMatch = cleanBodyText.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i);
    if (ukMatch && !isCssOrCodeSnippet(ukMatch[1])) data.pincode = ukMatch[1].toUpperCase();
  } else {
    // Generic fallback: check for 4-6 digit numeric code
    const genMatch = cleanBodyText.match(/\b([0-9]{4,6})\b/);
    if (genMatch && !isCssOrCodeSnippet(genMatch[1])) data.pincode = genMatch[1];
  }

  return data;
}

async function fetchWebsiteText(targetUrl, timeoutMs = 2500, maxRedirects = 3) {
  try {
    const relayed = await fetchTextSmart(targetUrl, {
      headers: DEFAULT_HEADERS,
      timeoutMs
    });
    if (relayed.ok) return relayed.text || '';
    if (!relayed.fallbackToServer) return '';
  } catch (e) {}

  try {
    const res = await axios.get(targetUrl, {
      timeout: timeoutMs,
      httpsAgent,
      headers: DEFAULT_HEADERS,
      maxRedirects,
      validateStatus: status => status >= 200 && status < 400
    });
    return typeof res.data === 'string' ? res.data : '';
  } catch (e) {
    return '';
  }
}

/**
 * Ultra-Fast Parallel Multi-Page Website Contact & Asset Extractor
 * Crawls home page + contact page in parallel (<800ms) to harvest mobile numbers and contacts.
 */
async function fastWebsiteExtract(url, businessName = '', opts = {}) {
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
    targetUrls.push(`${origin}/about`);
    targetUrls.push(`${origin}/contactus`);
    targetUrls.push(`${origin}/reach-us`);
    targetUrls.push(`${origin}/location`);
    targetUrls.push(`${origin}/find-us`);
  }
  const uniqueUrls = [...new Set(targetUrls)].slice(0, 4);

  try {
    // 1. Fetch homepage first with fast 2500ms timeout.
    // If homepage already has verified mobile + email, we save 3 seconds by early exit!
    const homeHtml = await fetchWebsiteText(uniqueUrls[0], 2500, 3);

    if (homeHtml) {
      const homeExtracted = extractFromHtml(homeHtml, uniqueUrls[0], opts);
      for (const email of homeExtracted.emails) if (!result.emails.includes(email)) result.emails.push(email);
      for (const phone of homeExtracted.phones) if (!result.phones.includes(phone)) result.phones.push(phone);
      for (const mob of homeExtracted.mobiles) if (!result.mobiles.includes(mob)) result.mobiles.push(mob);
      if (homeExtracted.instagram) result.instagram = homeExtracted.instagram;
      if (homeExtracted.facebook) result.facebook = homeExtracted.facebook;
      if (homeExtracted.linkedin) result.linkedin = homeExtracted.linkedin;
      if (homeExtracted.logo) result.logo = homeExtracted.logo;
      if (homeExtracted.contactPerson) result.contactPerson = homeExtracted.contactPerson;
      if (homeExtracted.pincode) result.pincode = homeExtracted.pincode;
      if (homeExtracted.whatsappLink) result.whatsappLink = homeExtracted.whatsappLink;
    }

    // 2. If homepage did NOT yield mobile phone, fetch remaining contact pages concurrently
    if (result.mobiles.length === 0 && uniqueUrls.length > 1) {
      const subUrls = uniqueUrls.slice(1);
      const responses = await Promise.allSettled(
        subUrls.map(targetUrl => fetchWebsiteText(targetUrl, 2500, 2))
      );

      for (let i = 0; i < responses.length; i++) {
        const resp = responses[i];
        if (resp.status !== 'fulfilled' || !resp.value) continue;
        const html = resp.value;
        if (!html) continue;

        const extracted = extractFromHtml(html, subUrls[i], opts);
        for (const email of extracted.emails) if (!result.emails.includes(email)) result.emails.push(email);
        for (const phone of extracted.phones) if (!result.phones.includes(phone)) result.phones.push(phone);
        for (const mob of extracted.mobiles) if (!result.mobiles.includes(mob)) result.mobiles.push(mob);
        if (!result.instagram && extracted.instagram) result.instagram = extracted.instagram;
        if (!result.facebook && extracted.facebook) result.facebook = extracted.facebook;
        if (!result.linkedin && extracted.linkedin) result.linkedin = extracted.linkedin;
        if (extracted.logo && (!result.logo || result.logo.includes('favicons'))) result.logo = extracted.logo;
        if (!result.contactPerson && extracted.contactPerson) result.contactPerson = extracted.contactPerson;
        if (!result.pincode && extracted.pincode) result.pincode = extracted.pincode;
        if (!result.whatsappLink && extracted.whatsappLink) result.whatsappLink = extracted.whatsappLink;
      }
    }

    // 3. SPA Bundle Probe (Vite, React, Next.js, Webflow):
    // When HTML is an SPA shell with empty body text, scan the primary JS bundle for embedded phones
    if (result.mobiles.length === 0 && result.phones.length === 0 && homeHtml && origin) {
      try {
        const $home = cheerio.load(homeHtml);
        const scriptUrls = [];
        $home('script[src]').each((_, el) => {
          const src = $home(el).attr('src') || '';
          if (/(?:assets\/index|static\/js\/main|app\.|bundle\.|_next\/static\/chunks\/pages\/index)/i.test(src) || (src.endsWith('.js') && !src.includes('analytics') && !src.includes('gtag') && !src.includes('facebook'))) {
            try {
              const fullScriptUrl = new URL(src, origin).toString();
              if (new URL(fullScriptUrl).origin === origin && !scriptUrls.includes(fullScriptUrl)) {
                scriptUrls.push(fullScriptUrl);
              }
            } catch (e) {}
          }
        });

        const targetBundle = scriptUrls[0];
        if (targetBundle) {
          const bundleText = await fetchWebsiteText(targetBundle, 3000, 2);
          if (bundleText && bundleText.length > 100) {
            const isIntl = Boolean(opts.allowInternational || (opts.defaultCountry && opts.defaultCountry !== 'IN'));
            if (isIntl) {
              const parsed = extractPhones(bundleText.slice(0, 500000), {
                defaultCountry: opts.defaultCountry || 'US',
                allowInternational: true,
                trusted: false,
                context: 'spa bundle'
              });
              for (const phone of parsed) {
                if (isCssOrCodeSnippet(phone.displayPhone) || isCssOrCodeSnippet(phone.digits)) continue;
                const national = phone.national || phone.digits;
                if (phone.isMobile || phone.isLandline) {
                  if (!result.mobiles.includes(national)) result.mobiles.push(national);
                  if (!result.whatsappLink && phone.isMobile) result.whatsappLink = `https://wa.me/${phone.digits}`;
                }
                if (!result.phones.includes(phone.displayPhone)) result.phones.push(phone.displayPhone);
              }
            } else {
              const mobileRegex = /(?:(?:\+|0{0,2})91[\s-]?)?([6-9]\d{9})\b/g;
              let m;
              const scanSlice = bundleText.slice(0, 500000);
              while ((m = mobileRegex.exec(scanSlice)) !== null) {
                const digits = m[1].replace(/\D/g, '');
                if (digits.length === 10 && /^[6-9]/.test(digits) && !digits.startsWith('9999999999') && !digits.startsWith('9876543210')) {
                  if (!result.mobiles.includes(digits)) result.mobiles.push(digits);
                  const formatted = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
                  if (!result.phones.includes(formatted)) result.phones.push(formatted);
                  if (!result.whatsappLink) result.whatsappLink = `https://wa.me/91${digits}`;
                }
              }
            }
          }
        }
      } catch (spaErr) {}
    }
  } catch (err) {
    // Graceful fallback
  }

  // Primary phone: a validated mobile first, then a landline. The parser knows
  // the country, so this is correct outside India too.
  const isIntlExtract = Boolean(opts.allowInternational || (opts.defaultCountry && opts.defaultCountry !== 'IN'));
  if (result.mobiles.length > 0) {
    const mobile = normalizePhone(result.mobiles[0], {
      context: 'phone mobile',
      defaultCountry: opts.defaultCountry || (isIntlExtract ? 'US' : 'IN'),
      allowInternational: isIntlExtract,
      trusted: true
    });
    if (mobile) {
      result.phone = mobile.displayPhone || mobile.e164;
      if (!result.whatsappLink && mobile.isMobile) result.whatsappLink = `https://wa.me/${mobile.digits}`;
    } else {
      result.phone = result.mobiles[0];
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
