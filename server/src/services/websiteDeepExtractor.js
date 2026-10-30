/**
 * websiteDeepExtractor.js
 * Multi-page, structured-data-first extraction for local business websites.
 *
 * Extraction is deliberately conservative: every value that reaches the
 * profile must be observable on the site (or in its JSON-LD). Nothing is
 * guessed, generated or filled with placeholders.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const {
  normalizePhone,
  extractPhones,
  extractEmails,
  pickBestPhone,
  extractGSTINs,
  extractPANs,
  extractCINs,
  extractPincode,
  splitIndianAddress
} = require('../utils/phoneUtils');

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-IN,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

const PAGE_LIMIT = 5;
const REQUEST_TIMEOUT = 8000;
const MAX_BYTES = 4 * 1024 * 1024;

const BLOCKED_HOSTS = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/i;

function absolutize(href, base) {
  if (!href || typeof href !== 'string') return '';
  const value = href.trim();
  if (!value || value.startsWith('#') || /^(mailto|tel|javascript|data):/i.test(value)) return '';
  try {
    return new URL(value, base).toString();
  } catch (e) {
    return '';
  }
}

function isHttpUrl(value, allowPrivate = false) {
  try {
    const u = new URL(value);
    return (u.protocol === 'http:' || u.protocol === 'https:') && (allowPrivate || !BLOCKED_HOSTS.test(u.hostname));
  } catch (e) {
    return false;
  }
}

function cleanText(value, max = 4000) {
  return String(value == null ? '' : value)
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim()
    .slice(0, max);
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    if (!item) continue;
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function splitList(value) {
  if (Array.isArray(value)) return value.flatMap(splitList);
  if (typeof value !== 'string') return [];
  return value.split(/[,;|]/).map(v => cleanText(v, 120)).filter(Boolean);
}

// Language codes are converted to human names so the UI never shows "en-IN"
// next to "Telugu" in the same list.
const LANGUAGE_NAMES = {
  en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil', kn: 'Kannada',
  ml: 'Malayalam', mr: 'Marathi', bn: 'Bengali', gu: 'Gujarati', pa: 'Punjabi',
  or: 'Odia', od: 'Odia', as: 'Assamese', ur: 'Urdu', sd: 'Sindhi',
  ne: 'Nepali', sa: 'Sanskrit', kok: 'Konkani', ks: 'Kashmiri', doi: 'Dogri',
  brx: 'Bodo', mni: 'Meitei (Manipuri)', sat: 'Santali', mai: 'Maithili',
  bho: 'Bhojpuri', raj: 'Rajasthani', hne: 'Chhattisgarhi', mag: 'Magahi',
  bh: 'Bihari', tcy: 'Tulu', kha: 'Khasi', mtr: 'Mewari', awa: 'Awadhi',
  bgc: 'Haryanvi', si: 'Sinhala', my: 'Burmese',
  fr: 'French', de: 'German', es: 'Spanish', ar: 'Arabic', zh: 'Chinese',
  ja: 'Japanese', ru: 'Russian', pt: 'Portuguese', it: 'Italian', ko: 'Korean',
  tr: 'Turkish', he: 'Hebrew', nl: 'Dutch', th: 'Thai', vi: 'Vietnamese',
  id: 'Indonesian', ms: 'Malay', sw: 'Swahili', fa: 'Persian'
};

function normaliseLanguage(value) {
  const raw = cleanText(value, 60);
  if (!raw) return '';
  const lower = raw.toLowerCase().replace(/_/g, '-').trim();
  if (LANGUAGE_NAMES[lower]) return LANGUAGE_NAMES[lower];
  const base = lower.split('-')[0];
  if (LANGUAGE_NAMES[base]) return LANGUAGE_NAMES[base];
  // Unknown ISO codes are dropped rather than displayed as noise.
  if (/^[a-z]{2,3}$/.test(lower)) return '';
  if (/^\d+$/.test(lower)) return '';
  return raw.replace(/\b[a-z]/g, c => c.toUpperCase());
}

function getSchemaTypes(node) {
  const type = node && node['@type'];
  if (!type) return [];
  return (Array.isArray(type) ? type : [type]).map(t => String(t).toLowerCase());
}

function flattenJsonLd(value, out = []) {
  if (!value) return out;
  if (Array.isArray(value)) {
    value.forEach(v => flattenJsonLd(v, out));
    return out;
  }
  if (typeof value !== 'object') return out;
  if (value['@graph']) flattenJsonLd(value['@graph'], out);
  if (value['@type'] || value.name || value.telephone) out.push(value);
  return out;
}

function parseJsonLd($) {
  const nodes = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw || !raw.trim()) return;
    try {
      const parsed = JSON.parse(raw.replace(/^\uFEFF/, '').trim());
      flattenJsonLd(parsed, nodes);
    } catch (e) {
      // Some sites emit multiple objects or trailing commas. Try the common
      // `@graph` fragments before giving up.
      const objectMatches = raw.match(/\{[\s\S]*\}/g) || [];
      for (const fragment of objectMatches.slice(0, 3)) {
        try { flattenJsonLd(JSON.parse(fragment), nodes); } catch (e2) {}
      }
    }
  });
  return nodes;
}

function findSchema(nodes, typeNames) {
  const wanted = typeNames.map(t => t.toLowerCase());
  return nodes.filter(node => getSchemaTypes(node).some(t => wanted.includes(t)));
}

function firstSchema(nodes, typeNames) {
  return findSchema(nodes, typeNames)[0] || null;
}

function schemaNames(nodes, typeNames) {
  const out = [];
  for (const node of findSchema(nodes, typeNames)) {
    const name = cleanText(node.name || node.headline, 200);
    if (name) out.push(name);
  }
  return out;
}

function extractPostalAddress(nodes) {
  const business = firstSchema(nodes, [
    'localbusiness', 'organization', 'store', 'restaurant', 'professionalservice',
    'homeandconstructionbusiness', 'healthandbeautysalon', 'weddingvenue', 'hotel'
  ]) || nodes[0];
  const address = business && business.address;
  if (!address) return null;

  if (typeof address === 'string') {
    const split = splitIndianAddress(address);
    return { ...split, source: 'jsonld' };
  }

  if (typeof address === 'object') {
    const street = cleanText(address.streetAddress, 300);
    const cityName = cleanText(address.addressLocality, 120);
    const subLocality = cleanText(address.addressSubLocality || address.addressNeighborhood, 120);
    const region = cleanText(address.addressRegion, 120);
    const postalCode = cleanText(address.postalCode, 12);
    const country = cleanText(address.addressCountry, 80);
    const full = [street, subLocality, cityName, region, postalCode, country].filter(Boolean).join(', ');
    return {
      full,
      line1: street,
      line2: subLocality || cityName,
      locality: subLocality || cityName,
      city: cityName,
      district: '',
      state: region,
      pincode: postalCode,
      country,
      source: 'jsonld'
    };
  }
  return null;
}

function extractGeo(nodes) {
  const business = firstSchema(nodes, ['localbusiness', 'organization', 'store', 'place', 'restaurant']) || nodes[0];
  const geo = business && business.geo;
  if (!geo) return null;
  const lat = Number(geo.latitude ?? geo.lat);
  const lng = Number(geo.longitude ?? geo.lng ?? geo.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng, source: 'jsonld' };
}

function extractSchemaHours(nodes) {
  const business = firstSchema(nodes, ['localbusiness', 'organization', 'store', 'restaurant', 'professionalservice']) || nodes[0];
  if (!business) return { specifications: [], raw: '' };

  const specifications = [];
  const pushSpec = spec => {
    if (!spec) return;
    if (Array.isArray(spec)) return spec.forEach(pushSpec);
    const days = spec.dayOfWeek || spec.dayOfweek || [];
    const dayList = Array.isArray(days) ? days : [days];
    const opens = cleanText(spec.opens, 12);
    const closes = cleanText(spec.closes, 12);
    for (const day of dayList) {
      const name = cleanText(String(day || '').replace(/^https?:\/\/schema\.org\//i, ''), 30);
      if (name) specifications.push({ day: name, opens, closes });
    }
    if (dayList.length === 0 && (opens || closes)) {
      specifications.push({ day: 'All days', opens, closes });
    }
  };
  pushSpec(business.openingHoursSpecification);

  let raw = '';
  if (Array.isArray(business.openingHours)) {
    raw = business.openingHours.map(v => cleanText(v, 80)).filter(Boolean).join('; ');
  } else if (typeof business.openingHours === 'string') {
    raw = cleanText(business.openingHours, 300);
  }

  return { specifications: uniqueBy(specifications, s => `${s.day}|${s.opens}|${s.closes}`), raw };
}

function extractSchemaSocials(nodes) {
  const out = [];
  for (const node of nodes) {
    if (Array.isArray(node.sameAs)) out.push(...node.sameAs);
    else if (typeof node.sameAs === 'string') out.push(node.sameAs);
  }
  return out.filter(v => typeof v === 'string');
}

function socialKey(href) {
  let host = '';
  try { host = new URL(href).hostname.replace(/^www\./i, '').toLowerCase(); } catch (e) { return null; }
  if (host.includes('instagram.com')) return 'instagram';
  if (host.includes('facebook.com') || host === 'fb.com') return 'facebook';
  if (host.includes('linkedin.com')) return 'linkedin';
  if (host === 'youtube.com' || host === 'youtu.be' || host.includes('youtube.')) return 'youtube';
  if (host === 'twitter.com' || host === 'x.com') return 'twitter';
  if (host.includes('pinterest.')) return 'pinterest';
  if (host.includes('threads.net')) return 'threads';
  if (host === 't.me' || host.includes('telegram.')) return 'telegram';
  if (host === 'wa.me' || host.includes('whatsapp.com')) return 'whatsapp';
  return null;
}

function normaliseSocial(key, href) {
  if (!href) return '';
  try {
    const u = new URL(href);
    const path = u.pathname.replace(/\/+$/, '');
    if (['facebook', 'instagram', 'linkedin', 'youtube', 'pinterest', 'threads'].includes(key)) {
      // Drop obvious sharing endpoints, keep profile URLs.
      if (/\/(sharer|share|intent|plugins|dialog)\b/i.test(path)) return '';
      if (!path || path === '') return '';
    }
    if (key === 'whatsapp') {
      const phone = u.pathname.replace(/\D/g, '');
      return phone ? `https://wa.me/${phone}` : href;
    }
    u.hash = '';
    return u.toString();
  } catch (e) {
    return '';
  }
}

function extractHoursFromText(text) {
  if (!text) return { raw: '', specifications: [] };
  const matches = text.match(/(?:mon|monday)[^.\n]{0,80}(?:sun|sunday)?[^.\n]{0,80}(?:am|pm|hrs|hours|closed)[^.\n]{0,60}/i);
  return { raw: matches ? cleanText(matches[0], 240) : '', specifications: [] };
}

function extractFaqs(nodes) {
  const faqs = [];
  for (const node of findSchema(nodes, ['faqpage'])) {
    const entities = node.mainEntity || node.mainEntityOfPage || [];
    const list = Array.isArray(entities) ? entities : [entities];
    for (const entity of list) {
      const question = cleanText(entity && (entity.name || entity.question), 300);
      const answerNode = entity && (entity.acceptedAnswer || entity.suggestedAnswer);
      const answer = cleanText(
        Array.isArray(answerNode) ? answerNode.map(a => a && a.text).join(' ') : answerNode && answerNode.text,
        2000
      );
      if (question && answer) faqs.push({ question, answer });
    }
  }
  return uniqueBy(faqs, f => f.question.toLowerCase());
}

function extractOffers(nodes) {
  const offers = [];
  for (const node of findSchema(nodes, ['offer', 'aggregateoffer'])) {
    const name = cleanText(node.name || node.description, 300);
    if (!name) continue;
    offers.push({
      name,
      description: cleanText(node.description, 600),
      price: node.price != null ? String(node.price) : '',
      currency: cleanText(node.priceCurrency, 8),
      validUntil: cleanText(node.validThrough || node.availabilityEnds, 40),
      url: cleanText(node.url, 500)
    });
  }
  for (const business of findSchema(nodes, ['localbusiness', 'organization', 'store', 'restaurant'])) {
    for (const offer of (Array.isArray(business.makesOffer) ? business.makesOffer : business.makesOffer ? [business.makesOffer] : [])) {
      const name = cleanText(offer.name || offer.itemOffered && offer.itemOffered.name, 300);
      if (name) {
        offers.push({
          name,
          description: cleanText(offer.description, 600),
          price: offer.price != null ? String(offer.price) : '',
          currency: cleanText(offer.priceCurrency, 8),
          validUntil: cleanText(offer.validThrough, 40),
          url: cleanText(offer.url, 500)
        });
      }
    }
  }
  return uniqueBy(offers, o => `${o.name}|${o.price}|${o.validUntil}`).slice(0, 30);
}

function extractServicesAndProducts(nodes) {
  const services = [];
  const products = [];

  for (const node of findSchema(nodes, ['service'])) {
    const name = cleanText(node.name || node.serviceType, 200);
    if (name) services.push({
      name,
      description: cleanText(node.description, 600),
      category: cleanText(node.serviceType || node.category, 120),
      price: node.offers && node.offers.price != null ? String(node.offers.price) : '',
      url: cleanText(node.url, 500)
    });
  }

  for (const node of nodes) {
    const catalog = node.hasOfferCatalog;
    if (!catalog) continue;
    const items = catalog.itemListElement || catalog.itemList || [];
    for (const item of (Array.isArray(items) ? items : [items])) {
      const itemNode = item && (item.item || item);
      const name = cleanText(itemNode && (itemNode.name || item.name), 200);
      if (!name) continue;
      if (itemNode && getSchemaTypes(itemNode).includes('product')) {
        products.push({
          name,
          description: cleanText(itemNode.description, 600),
          price: itemNode.offers && itemNode.offers.price != null ? String(itemNode.offers.price) : '',
          currency: cleanText(itemNode.offers && itemNode.offers.priceCurrency, 8),
          url: cleanText(itemNode.url, 500)
        });
      } else {
        services.push({
          name,
          description: cleanText(itemNode && itemNode.description, 600),
          category: cleanText(catalog.name, 120),
          price: itemNode && itemNode.offers && itemNode.offers.price != null ? String(itemNode.offers.price) : '',
          url: cleanText(itemNode && itemNode.url, 500)
        });
      }
    }
  }

  for (const node of findSchema(nodes, ['product'])) {
    const name = cleanText(node.name, 200);
    if (!name) continue;
    const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
    products.push({
      name,
      description: cleanText(node.description, 600),
      price: offer && offer.price != null ? String(offer.price) : '',
      currency: cleanText(offer && offer.priceCurrency || node.priceCurrency, 8),
      url: cleanText(node.url, 500)
    });
  }

  return {
    services: uniqueBy(services, s => `${s.name}|${s.price}`).slice(0, 60),
    products: uniqueBy(products, p => `${p.name}|${p.price}`).slice(0, 60)
  };
}

function extractAmenitiesAndPayments(nodes) {
  const amenities = [];
  const payments = [];
  const accessibility = [];
  const languages = [];

  for (const node of nodes) {
    const features = node.amenityFeature;
    for (const feature of (Array.isArray(features) ? features : features ? [features] : [])) {
      const name = cleanText(feature && (feature.name || feature.value), 120);
      if (name) amenities.push(name);
    }
    payments.push(...splitList(node.paymentAccepted));
    const accessibilityFeatures = node.accessibilityFeature || node.accessibilityAPI;
    for (const feature of (Array.isArray(accessibilityFeatures) ? accessibilityFeatures : accessibilityFeatures ? [accessibilityFeatures] : [])) {
      const name = cleanText(String(feature || '').replace(/^https?:\/\/schema\.org\//i, ''), 120);
      if (name) accessibility.push(name);
    }
    const knows = node.knowsLanguage;
    for (const lang of (Array.isArray(knows) ? knows : knows ? [knows] : [])) {
      const raw = typeof lang === 'object'
        ? (lang.name || lang.alternateName || '')
        : lang;
      for (const item of splitList(raw)) {
        const name = normaliseLanguage(item);
        if (name) languages.push(name);
      }
    }
  }

  return {
    amenities: uniqueBy(amenities, a => a.toLowerCase()).slice(0, 40),
    payments: uniqueBy(payments, p => p.toLowerCase()).slice(0, 20),
    accessibility: uniqueBy(accessibility, a => a.toLowerCase()).slice(0, 20),
    languages: uniqueBy(languages, l => l.toLowerCase()).slice(0, 20)
  };
}

function extractReviews(nodes) {
  const topReviews = [];
  let rating = null;
  let count = null;

  for (const node of findSchema(nodes, ['localbusiness', 'organization', 'store', 'restaurant', 'product', 'service'])) {
    const aggregate = node.aggregateRating;
    if (aggregate) {
      const value = Number(aggregate.ratingValue);
      const total = Number(aggregate.reviewCount ?? aggregate.ratingCount);
      if (Number.isFinite(value) && value >= 0 && value <= 5) rating = value;
      if (Number.isFinite(total) && total >= 0) count = Math.round(total);
    }
    const reviews = node.review;
    for (const review of (Array.isArray(reviews) ? reviews : reviews ? [reviews] : [])) {
      const text = cleanText(
        review.reviewBody || review.description || review.text,
        1500
      );
      if (!text) continue;
      const reviewRating = Number(review.reviewRating && (review.reviewRating.ratingValue ?? review.reviewRating));
      topReviews.push({
        author: cleanText(review.author && (review.author.name || review.author), 120),
        rating: Number.isFinite(reviewRating) ? reviewRating : null,
        text,
        date: cleanText(review.datePublished, 40),
        source: 'website_jsonld'
      });
    }
  }

  return { rating, count, topReviews: uniqueBy(topReviews, r => r.text.slice(0, 120)).slice(0, 20) };
}

function extractCertifications(nodes, text) {
  const certifications = [];
  const awards = [];
  for (const node of nodes) {
    const awardValue = node.award;
    for (const award of (Array.isArray(awardValue) ? awardValue : awardValue ? [awardValue] : [])) {
      const value = cleanText(award, 200);
      if (value) awards.push(value);
    }
    const credential = node.hasCredential;
    for (const item of (Array.isArray(credential) ? credential : credential ? [credential] : [])) {
      const value = cleanText(item && (item.name || item), 200);
      if (value) certifications.push(value);
    }
  }
  const isoMatches = String(text || '').match(/\bISO\s?\d{4,5}(?::\d{4})?\b/gi) || [];
  for (const value of isoMatches) certifications.push(value.toUpperCase().replace(/\s+/g, ' '));
  return {
    certifications: uniqueBy(certifications, c => c.toLowerCase()).slice(0, 20),
    awards: uniqueBy(awards, a => a.toLowerCase()).slice(0, 20)
  };
}

function extractImages($, baseUrl, nodes) {
  const images = [];
  const add = (value, source) => {
    const url = absolutize(value, baseUrl);
    if (!url || !/^https?:/i.test(url)) return;
    if (/\.(svg)(\?|$)/i.test(url) && images.length > 3) return;
    images.push({ url, source });
  };

  $('meta[property="og:image"], meta[property="og:image:secure_url"], meta[name="twitter:image"]').each((_, el) => {
    add($(el).attr('content'), 'open_graph');
  });

  for (const node of nodes) {
    const value = node.image || node.logo;
    for (const img of (Array.isArray(value) ? value : value ? [value] : [])) {
      add(typeof img === 'object' ? (img.url || img.contentUrl) : img, 'jsonld');
    }
  }

  $('img').slice(0, 80).each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
    if (!src) return;
    const width = Number($(el).attr('width'));
    if (width && width < 300) return;
    add(src, 'page_image');
  });

  return uniqueBy(images, i => i.url).slice(0, 16);
}

function extractLogo($, baseUrl, nodes) {
  for (const node of nodes) {
    const logo = node.logo;
    const value = typeof logo === 'object' ? (logo.url || logo.contentUrl) : logo;
    const url = absolutize(value, baseUrl);
    if (url) return { url, source: 'jsonld' };
  }

  const apple = $('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]').first().attr('href');
  if (apple) {
    const url = absolutize(apple, baseUrl);
    if (url) return { url, source: 'apple_touch_icon' };
  }

  const icon = $('link[rel~="icon"]').first().attr('href');
  if (icon) {
    const url = absolutize(icon, baseUrl);
    if (url) return { url, source: 'favicon' };
  }

  try {
    const domain = new URL(baseUrl).hostname;
    return { url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`, source: 'favicon_service' };
  } catch (e) {
    return null;
  }
}

function extractBookingLinks($, baseUrl) {
  const links = [];
  $('a[href]').slice(0, 600).each((_, el) => {
    const href = absolutize($(el).attr('href'), baseUrl);
    if (!href) return;
    const label = cleanText($(el).text(), 120).toLowerCase();
    const lower = href.toLowerCase();
    const isBooking =
      /(calendly\.com|cal\.com|booksy\.|fresha\.com|appoint(ment|ly)|reserve|booking|book-now|book_now|wa\.me|api\.whatsapp\.com|zomato\.com|swiggy\.com)/i.test(lower) ||
      /\b(book|appointment|reserve|schedule a visit|enquire|inquire)\b/.test(label);
    if (!isBooking) return;
    links.push({ url: href, label: cleanText($(el).text(), 160), type: socialKey(href) || 'booking' });
  });
  return uniqueBy(links, l => l.url).slice(0, 12);
}

function collectSocials($, baseUrl, nodes) {
  const socials = {};
  const candidates = [];
  for (const raw of extractSchemaSocials(nodes)) {
    const url = absolutize(raw, baseUrl);
    if (url) candidates.push(url);
  }
  $('a[href]').slice(0, 600).each((_, el) => {
    const url = absolutize($(el).attr('href'), baseUrl);
    if (url) candidates.push(url);
  });

  for (const url of candidates) {
    const key = socialKey(url);
    if (!key) continue;
    const normalized = normaliseSocial(key, url);
    if (!normalized) continue;
    if (!socials[key]) {
      socials[key] = normalized;
    } else if (key === 'whatsapp' && normalized.length < socials[key].length) {
      socials[key] = normalized;
    }
  }
  return socials;
}

function collectContacts($, fullHtml, nodes) {
  const phoneMap = new Map();
  const emailSet = new Set();

  const addPhone = (raw) => {
    const single = normalizePhone(raw);
    const parsed = extractPhones(String(raw || ''), { defaultCountry: 'IN' });
    for (const p of [...(single ? [single] : []), ...parsed]) {
      if (!p) continue;
      if (!phoneMap.has(p.e164)) phoneMap.set(p.e164, p);
    }
  };

  $('a[href^="tel:"]').each((_, el) => addPhone($(el).attr('href')));
  for (const node of nodes) {
    const tel = node.telephone || node.phone;
    for (const value of (Array.isArray(tel) ? tel : tel ? [tel] : [])) addPhone(value);
  }

  const bodyText = $('body').text();
  for (const p of extractPhones(bodyText, { defaultCountry: 'IN' })) {
    if (!phoneMap.has(p.e164)) phoneMap.set(p.e164, p);
  }

  $('a[href^="mailto:"]').each((_, el) => {
    const raw = ($(el).attr('href') || '').replace(/^mailto:/i, '').split('?')[0];
    for (const email of extractEmails(raw)) emailSet.add(email);
  });
  for (const node of nodes) {
    for (const email of extractEmails(String(node.email || ''))) emailSet.add(email);
  }
  for (const email of extractEmails(fullHtml)) emailSet.add(email);

  const phones = Array.from(phoneMap.values()).sort((a, b) => Number(b.isMobile) - Number(a.isMobile));
  return { phones, emails: Array.from(emailSet).slice(0, 20), primaryPhone: pickBestPhone(phones) };
}

function extractAddress($, nodes, phones) {
  const structured = extractPostalAddress(nodes);
  if (structured && structured.full) return structured;

  const addressTag = cleanText($('address').first().text(), 500);
  const candidates = [];
  if (addressTag) candidates.push(addressTag);

  const bodyText = $('body').text();
  const pinMatches = bodyText.match(/[^.\n]{10,140}\b[1-9]\d{5}\b/g) || [];
  for (const match of pinMatches.slice(0, 5)) candidates.push(cleanText(match, 220));

  for (const candidate of candidates) {
    if (!extractPincode(candidate, phones)) continue;
    const split = splitIndianAddress(candidate);
    if (split.full) return { ...split, source: 'page_address' };
  }
  return null;
}

function extractDomLists($, headings) {
  const out = [];
  $('h1, h2, h3, h4, h5').each((_, el) => {
    const title = cleanText($(el).text(), 120).toLowerCase();
    if (!headings.some(h => title === h || title.includes(h))) return;
    const scope = $(el).closest('section, div');
    let listItems = scope.length ? scope.find('li') : $(el).parent().find('li');
    if (!listItems.length) listItems = $(el).nextAll('ul, ol').first().find('li');
    listItems.slice(0, 30).each((__, li) => {
      const text = cleanText($(li).text(), 240);
      if (text && text.length >= 3 && text.length <= 200) out.push(text);
    });
  });
  return uniqueBy(out, t => t.toLowerCase()).slice(0, 40);
}

function detectLegalName(nodes) {
  for (const node of nodes) {
    const value = cleanText(node.legalName, 200);
    if (value) return value;
  }
  return '';
}

function detectDescription($, nodes) {
  for (const node of nodes) {
    const value = cleanText(node.description || node.slogan, 1200);
    if (value) return { value, source: 'jsonld' };
  }
  const meta = $('meta[name="description"], meta[property="og:description"]').first().attr('content');
  if (meta) return { value: cleanText(meta, 1200), source: 'meta_description' };
  return { value: '', source: '' };
}

function detectName($, nodes) {
  for (const node of nodes) {
    const value = cleanText(node.name, 200);
    if (value) return { value, source: 'jsonld' };
  }
  const og = $('meta[property="og:site_name"]').first().attr('content');
  if (og) return { value: cleanText(og, 200), source: 'og_site_name' };
  const title = cleanText($('title').text(), 200);
  if (title) {
    const cleaned = title.split(/\s[-–|·]\s/)[0];
    return { value: cleanText(cleaned || title, 200), source: 'title' };
  }
  return { value: '', source: '' };
}

function choosePages($, baseUrl) {
  const base = new URL(baseUrl);
  const links = [];
  const wanted = [
    { key: 'contact', re: /(contact|reach-us|get-in-touch|enquiry|inquiry)/i },
    { key: 'about', re: /(about|our-story|who-we-are|company)/i },
    { key: 'services', re: /(service|what-we-do|solutions|packages)/i },
    { key: 'products', re: /(product|collection|catalog|shop|menu)/i },
    { key: 'faq', re: /(faq|faqs|questions)/i }
  ];

  $('a[href]').slice(0, 500).each((_, el) => {
    const raw = $(el).attr('href');
    const url = absolutize(raw, baseUrl);
    if (!url) return;
    let parsed;
    try { parsed = new URL(url); } catch (e) { return; }
    if (parsed.origin !== base.origin) return;
    if (/\.(pdf|jpg|jpeg|png|webp|gif|svg|zip|mp4|mp3|docx?|xlsx?)$/i.test(parsed.pathname)) return;
    const label = cleanText($(el).text(), 80);
    const haystack = `${parsed.pathname} ${label}`;
    const match = wanted.find(w => w.re.test(haystack));
    if (!match) return;
    if (links.some(l => l.url === url)) return;
    links.push({ url, key: match.key });
  });

  return links.slice(0, PAGE_LIMIT - 1);
}

async function fetchPage(url, options = {}) {
  if (!isHttpUrl(url, options.allowPrivate === true)) {
    return { ok: false, url, error: 'Blocked or invalid URL', status: 0, html: '', ms: 0 };
  }
  const started = Date.now();
  try {
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      maxContentLength: MAX_BYTES,
      maxBodyLength: MAX_BYTES,
      headers: DEFAULT_HEADERS,
      validateStatus: status => status >= 200 && status < 400,
      responseType: 'text',
      transformResponse: [data => data]
    });
    const contentType = String(response.headers['content-type'] || '');
    if (!/text\/html|application\/xhtml|text\/plain/i.test(contentType) && contentType) {
      return { ok: false, url, error: `Unsupported content type: ${contentType}`, status: response.status, html: '', ms: Date.now() - started };
    }
    return {
      ok: true,
      url,
      finalUrl: response.request && response.request.res && response.request.res.responseUrl || url,
      status: response.status,
      html: String(response.data || ''),
      ms: Date.now() - started
    };
  } catch (e) {
    return { ok: false, url, error: e.message, status: e.response ? e.response.status : 0, html: '', ms: Date.now() - started };
  }
}

function emptyResult(url) {
  return {
    ok: false,
    url,
    finalUrl: url,
    fetchedAt: new Date().toISOString(),
    pagesCrawled: 0,
    identity: { name: '', legalName: '', description: '', tagline: '', priceRange: '', logo: '', logoSource: '', images: [] },
    contact: { phones: [], primaryPhone: null, emails: [], whatsapp: '' },
    address: null,
    geo: null,
    socials: {},
    legal: { gstin: '', pan: '', cin: '' },
    hours: { raw: '', specifications: [] },
    services: [],
    products: [],
    amenities: [],
    payments: [],
    accessibility: [],
    languages: [],
    faqs: [],
    offers: [],
    certifications: [],
    awards: [],
    bookingLinks: [],
    reviews: { rating: null, count: null, topReviews: [] },
    provenance: [],
    warnings: [],
    pages: []
  };
}

/**
 * Deep-extract a business website.
 * @param {string} url
 * @param {{maxPages?:number, timeoutMs?:number}} [options]
 */
async function deepExtractWebsite(url, options = {}) {
  const result = emptyResult(url);
  if (!isHttpUrl(url, options.allowPrivate === true)) {
    result.warnings.push('Invalid or private website URL');
    return result;
  }

  const homepage = await fetchPage(url, options);
  result.pages.push({ url, status: homepage.status, ok: homepage.ok, ms: homepage.ms, error: homepage.error || null });
  if (!homepage.ok || !homepage.html) {
    result.warnings.push(homepage.error || 'Homepage could not be fetched');
    return result;
  }

  result.ok = true;
  result.finalUrl = homepage.finalUrl || url;
  result.pagesCrawled = 1;

  const $home = cheerio.load(homepage.html);
  const homeNodes = parseJsonLd($home);
  const baseUrl = result.finalUrl || url;

  // Crawl a small, targeted set of internal pages in parallel.
  const pagesToFetch = choosePages($home, baseUrl).slice(0, Math.max(0, Math.min(4, (options.maxPages || PAGE_LIMIT) - 1)));
  const pageResults = await Promise.all(pagesToFetch.map(p => fetchPage(p.url, options)));
  const htmlParts = [homepage.html];
  const allNodes = [...homeNodes];

  pageResults.forEach((page, index) => {
    const pageUrl = pagesToFetch[index].url;
    result.pages.push({
      url: pageUrl,
      status: page.status,
      ok: page.ok,
      ms: page.ms,
      error: page.error || null
    });
    if (page.ok && page.html) {
      result.pagesCrawled++;
      htmlParts.push(page.html);
      try {
        const $page = cheerio.load(page.html);
        allNodes.push(...parseJsonLd($page));
      } catch (e) {}
    }
  });

  const fullHtml = htmlParts.join('\n');
  const $all = cheerio.load(fullHtml);
  const bodyText = $all('body').text();

  const name = detectName($home, homeNodes);
  const description = detectDescription($home, homeNodes);
  const legalName = detectLegalName(homeNodes);
  const logo = extractLogo($home, baseUrl, homeNodes);
  const images = extractImages($home, baseUrl, homeNodes);
  const contacts = collectContacts($all, fullHtml, allNodes);
  const address = extractAddress($all, allNodes, contacts.phones);
  const geo = extractGeo(allNodes);
  const hours = extractSchemaHours(allNodes);
  const socials = collectSocials($all, baseUrl, allNodes);
  const servicesProducts = extractServicesAndProducts(allNodes);
  const attributes = extractAmenitiesAndPayments(allNodes);
  const reviews = extractReviews(allNodes);
  const faqs = extractFaqs(allNodes);
  const offers = extractOffers(allNodes);
  const certs = extractCertifications(allNodes, bodyText);
  const bookingLinks = extractBookingLinks($all, baseUrl);

  const domServices = extractDomLists($all, ['our services', 'services', 'what we do', 'packages']);
  const domProducts = extractDomLists($all, ['our products', 'products', 'catalog', 'menu']);
  for (const nameValue of domServices) {
    if (!servicesProducts.services.some(s => s.name.toLowerCase() === nameValue.toLowerCase())) {
      servicesProducts.services.push({ name: nameValue, description: '', category: 'Website', price: '', url: '' });
    }
  }
  for (const nameValue of domProducts) {
    if (!servicesProducts.products.some(p => p.name.toLowerCase() === nameValue.toLowerCase())) {
      servicesProducts.products.push({ name: nameValue, description: '', price: '', currency: '', url: '' });
    }
  }

  const gstins = extractGSTINs(bodyText);
  const pans = extractPANs(bodyText).filter(pan => !gstins.some(g => g.includes(pan)));
  const cins = extractCINs(bodyText);

  if (hours.raw === '') {
    const textHours = extractHoursFromText(bodyText);
    if (textHours.raw) hours.raw = textHours.raw;
  }

  const priceRange = cleanText(
    (findSchema(allNodes, ['localbusiness', 'organization', 'store', 'restaurant'])[0] || {}).priceRange,
    80
  );
  const currencies = splitList(
    (findSchema(allNodes, ['localbusiness', 'organization', 'store', 'restaurant'])[0] || {}).currenciesAccepted
  );
  if (currencies.length && attributes.payments.length === 0) attributes.payments.push(...currencies);

  result.identity = {
    name: name.value,
    legalName,
    description: description.value,
    tagline: cleanText((homeNodes.find(n => n.slogan) || {}).slogan, 300),
    priceRange,
    logo: logo ? logo.url : '',
    logoSource: logo ? logo.source : '',
    images
  };
  result.contact = {
    phones: contacts.phones,
    primaryPhone: contacts.primaryPhone,
    emails: contacts.emails,
    whatsapp: socials.whatsapp || ''
  };
  result.address = address;
  result.geo = geo;
  result.socials = socials;
  result.legal = {
    gstin: gstins[0] || '',
    pan: pans[0] || '',
    cin: cins[0] || ''
  };
  result.hours = hours;
  result.services = servicesProducts.services.slice(0, 80);
  result.products = servicesProducts.products.slice(0, 80);
  result.amenities = attributes.amenities;
  result.payments = attributes.payments;
  result.accessibility = attributes.accessibility;
  result.languages = attributes.languages;
  if ($home('html').attr('lang')) {
    const lang = normaliseLanguage($home('html').attr('lang'));
    if (lang) result.languages = uniqueBy([...result.languages, lang], l => l.toLowerCase());
  }
  result.faqs = faqs;
  result.offers = offers;
  result.certifications = certs.certifications;
  result.awards = certs.awards;
  result.bookingLinks = bookingLinks;
  result.reviews = reviews;
  result.fetchedAt = new Date().toISOString();

  // Provenance is attached only for fields with an observable value.
  const prov = (field, value, source, confidence) => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return;
    result.provenance.push({ field, value, source, confidence, url: baseUrl, extractedAt: result.fetchedAt });
  };
  prov('name', result.identity.name, 'website', 0.92);
  prov('legalName', legalName, 'website_jsonld', 0.95);
  prov('description', result.identity.description, description.source || 'website', 0.88);
  prov('phone', contacts.primaryPhone && contacts.primaryPhone.e164, 'website_contact', 0.95);
  prov('phones', contacts.phones.map(p => p.e164), 'website_contact', 0.94);
  prov('email', result.contact.emails[0], 'website_contact', 0.93);
  prov('address', address && address.full, 'website_address', 0.86);
  prov('gstin', result.legal.gstin, 'website_legal', 0.99);
  prov('pan', result.legal.pan, 'website_legal', 0.97);
  prov('cin', result.legal.cin, 'website_legal', 0.99);
  prov('instagram', socials.instagram, 'website_social', 0.92);
  prov('facebook', socials.facebook, 'website_social', 0.92);
  prov('linkedin', socials.linkedin, 'website_social', 0.9);
  prov('youtube', socials.youtube, 'website_social', 0.9);
  prov('openingHours', hours.raw, 'website_jsonld', 0.88);
  prov('services', result.services.map(s => s.name), 'website_jsonld', 0.84);
  prov('products', result.products.map(p => p.name), 'website_jsonld', 0.84);
  prov('rating', reviews.rating, 'website_jsonld', 0.85);
  prov('reviewsCount', reviews.count, 'website_jsonld', 0.85);
  prov('logo', result.identity.logo, logo && logo.source, 0.9);

  if (result.pagesCrawled === 1) result.warnings.push('No contact/about page discovered; homepage only.');
  if (!contacts.phones.length) result.warnings.push('No valid Indian phone found on website.');
  if (!address) result.warnings.push('No address with a valid pincode found on website.');

  return result;
}

module.exports = {
  deepExtractWebsite,
  fetchPage,
  isHttpUrl,
  normaliseLanguage
};
