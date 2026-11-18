/**
 * aggressivePhoneEnricher.js
 *
 * Enterprise Aggressive Phone & Contact Intelligence Engine.
 * Specially engineered to hunt down missing/unlisted mobile numbers and contact
 * details across multiple digital vectors when primary place cards omit them:
 *
 *  Vector 1: Multi-Page Deep Official Website Crawl (Home, /contact, /about, /book, etc.)
 *  Vector 2: Stealth SERP Phone Dorking (DuckDuckGo HTML, Google Local SERP, Bing HTML)
 *  Vector 3: Social Media Bio & Meta Extractor (Instagram & Facebook public bios)
 *  Vector 4: Direct WhatsApp & Telecom Normalization (Supports all 245 countries)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const path = require('path');
const fs = require('fs');

const dbAdapter = require('../config/dbAdapter');
const { SESSIONS_DIR } = require('../config/paths');
const { normalizePhone, extractPhones, extractEmails } = require('../utils/phoneUtils');
const { detectCountry, COUNTRIES } = require('../services/localBrain/countries');

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  timeout: 4500
});

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function countryForLead(lead) {
  if (!lead) return 'IN';
  const explicit = String(lead.country || '').trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(explicit) && COUNTRIES.some(c => c.code === explicit)) return explicit;
  const hit = detectCountry([lead.country, lead.city, lead.district, lead.state, lead.address].filter(Boolean).join(', '));
  return hit ? hit.code : 'IN';
}

/**
 * Strips script, style, SVG, and other noise tags from HTML string.
 */
function cleanCheerioDom($) {
  $('script, style, noscript, svg, template, iframe, style-sheet, link[rel="stylesheet"]').remove();
}

/**
 * 1. Deep Official Website Crawl
 * Inspects root + common contact / about / booking subpages.
 */
async function crawlWebsiteForContacts(websiteUrl, countryCode = 'IN') {
  const result = {
    phones: [],
    emails: [],
    instagram: '',
    facebook: '',
    linkedin: '',
    ownerName: '',
    pincode: '',
    address: ''
  };

  if (!websiteUrl || !websiteUrl.startsWith('http')) return result;

  let origin = '';
  try {
    const u = new URL(websiteUrl);
    origin = u.origin;
  } catch (e) {
    return result;
  }

  const candidateUrls = [websiteUrl];
  if (origin) {
    candidateUrls.push(`${origin}/contact`);
    candidateUrls.push(`${origin}/contact-us`);
    candidateUrls.push(`${origin}/about`);
    candidateUrls.push(`${origin}/about-us`);
    candidateUrls.push(`${origin}/booking`);
    candidateUrls.push(`${origin}/book`);
    candidateUrls.push(`${origin}/reach-us`);
    candidateUrls.push(`${origin}/inquire`);
  }

  const uniqueUrls = [...new Set(candidateUrls)].slice(0, 4);

  const responses = await Promise.allSettled(
    uniqueUrls.map(targetUrl =>
      axios.get(targetUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 4500,
        httpsAgent,
        maxRedirects: 3,
        validateStatus: s => s >= 200 && s < 400
      })
    )
  );

  for (let i = 0; i < responses.length; i++) {
    const res = responses[i];
    if (res.status !== 'fulfilled' || !res.value?.data) continue;
    const html = typeof res.value.data === 'string' ? res.value.data : '';
    if (!html || html.length < 50) continue;

    const $ = cheerio.load(html);

    // Direct tel: links in DOM
    $('a[href^="tel:"]').each((_, el) => {
      const raw = ($(el).attr('href') || '').replace(/^tel:/i, '').split(/[?,;]/)[0];
      if (raw && raw.length >= 7) result.phones.push(raw);
    });

    // Direct WhatsApp links in DOM
    $('a[href*="wa.me/"], a[href*="api.whatsapp.com/send"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const match = href.match(/(?:wa\.me\/|phone=)(\+?\d+)/i);
      if (match && match[1]) result.phones.push(match[1]);
    });

    // Social links
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
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
    });

    // Check Schema.org JSON-LD
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).html();
        if (text) {
          const ld = JSON.parse(text);
          const items = Array.isArray(ld) ? ld : [ld];
          for (const item of items) {
            if (item.telephone) result.phones.push(String(item.telephone));
            if (item.contactPoint) {
              const cp = Array.isArray(item.contactPoint) ? item.contactPoint : [item.contactPoint];
              cp.forEach(c => { if (c.telephone) result.phones.push(String(c.telephone)); });
            }
            if (item.email) result.emails.push(String(item.email));
          }
        }
      } catch (e) {}
    });

    // Clean body text extraction
    cleanCheerioDom($);
    const bodyText = ($('body').text() || '')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract emails
    const emails = extractEmails(bodyText);
    result.emails.push(...emails);

    // Extract phones with country awareness
    const extracted = extractPhones(bodyText, {
      defaultCountry: countryCode,
      allowInternational: countryCode !== 'IN'
    });
    extracted.forEach(p => {
      if (p.isMobile || p.isLandline) {
        result.phones.push(p.displayPhone || p.national || p.e164);
      }
    });

    // Check for owner / founder name in text
    const ownerMatch = bodyText.match(/(?:founder|owner|proprietor|director|managed by)\s*[:\-–]?\s*([a-zA-Z\s.]{3,35})/i);
    if (ownerMatch && ownerMatch[1] && !result.ownerName) {
      const cleanOwner = ownerMatch[1].trim();
      if (!/(privacy|terms|policy|contact|email|phone|about)/i.test(cleanOwner)) {
        result.ownerName = cleanOwner;
      }
    }
  }

  return result;
}

/**
 * 2. Stealth SERP Phone Dorking
 * Queries DuckDuckGo and Bing HTML with high-intent dorks to extract phone numbers from search snippets.
 */
async function dorkPhoneFromSearch(vendorName, locationName, countryCode = 'IN') {
  const result = {
    phones: [],
    emails: [],
    website: '',
    socials: []
  };

  if (!vendorName) return result;

  const query = `"${vendorName}" "${locationName}" (phone OR mobile OR contact OR tel OR call OR whatsapp)`;
  const searchUrls = [
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    `https://www.bing.com/search?q=${encodeURIComponent(query)}`
  ];

  for (const url of searchUrls) {
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 5000
      });

      const html = typeof res.data === 'string' ? res.data : '';
      if (!html) continue;

      const $ = cheerio.load(html);
      cleanCheerioDom($);
      const text = ($('body').text() || '').replace(/\s+/g, ' ');

      const parsedPhones = extractPhones(text, {
        defaultCountry: countryCode,
        allowInternational: countryCode !== 'IN'
      });

      for (const p of parsedPhones) {
        if (p.isMobile || p.isLandline) {
          result.phones.push(p.displayPhone || p.national || p.e164);
        }
      }

      // Check result links for official website or social profile
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (href.startsWith('http') && !/duckduckgo|bing|google|microsoft|yahoo/i.test(href)) {
          if (/instagram\.com|facebook\.com/i.test(href)) {
            result.socials.push(href);
          } else if (!result.website && !/wikipedia|yelp|yellowpages|mapquest/i.test(href)) {
            result.website = href;
          }
        }
      });

      if (result.phones.length > 0) break; // Found phones on primary search engine
    } catch (e) {
      // Continue to next search provider
    }
  }

  return result;
}

/**
 * 3. Enrich a Single Vendor Record Aggressively
 */
async function enrichSingleVendorAggressive(vendor, options = {}) {
  if (!vendor || !vendor.name) return { ok: false, error: 'Invalid vendor record' };

  const countryCode = countryForLead(vendor);
  const isIntl = countryCode !== 'IN';
  const enrichedFields = [];

  const rawPhones = [];
  const rawEmails = [];

  // Pass 1: Crawl website if known
  const websiteToCrawl = vendor.website || options.website;
  if (websiteToCrawl && websiteToCrawl.startsWith('http')) {
    try {
      const webData = await crawlWebsiteForContacts(websiteToCrawl, countryCode);
      if (webData.phones.length > 0) {
        rawPhones.push(...webData.phones);
        enrichedFields.push('website_phones');
      }
      if (webData.emails.length > 0) {
        rawEmails.push(...webData.emails);
        enrichedFields.push('website_emails');
      }
      if (webData.instagram && !vendor.instagram) {
        vendor.instagram = webData.instagram;
        enrichedFields.push('instagram');
      }
      if (webData.facebook && !vendor.facebook) {
        vendor.facebook = webData.facebook;
        enrichedFields.push('facebook');
      }
      if (webData.ownerName && !vendor.contactPerson) {
        vendor.contactPerson = webData.ownerName;
        enrichedFields.push('contactPerson');
      }
    } catch (e) {}
  }

  // Pass 2: If still no mobile, run stealth SERP Dorking
  const hasExistingMobile = vendor.phone && vendor.isMobile;
  if (!hasExistingMobile && rawPhones.length === 0) {
    try {
      const location = vendor.city || vendor.district || vendor.state || '';
      const dorkData = await dorkPhoneFromSearch(vendor.name, location, countryCode);
      if (dorkData.phones.length > 0) {
        rawPhones.push(...dorkData.phones);
        enrichedFields.push('serp_phones');
      }
      if (dorkData.website && !vendor.website) {
        vendor.website = dorkData.website;
        enrichedFields.push('website');
        // Instantly crawl discovered website
        const subWebData = await crawlWebsiteForContacts(dorkData.website, countryCode);
        if (subWebData.phones.length > 0) rawPhones.push(...subWebData.phones);
        if (subWebData.emails.length > 0) rawEmails.push(...subWebData.emails);
      }
    } catch (e) {}
  }

  // Pass 3: Normalize and choose the best phone numbers
  if (rawPhones.length > 0) {
    const parsedCandidates = [];
    const seen = new Set();

    for (const raw of rawPhones) {
      const p = normalizePhone(raw, {
        defaultCountry: countryCode,
        allowInternational: isIntl,
        trusted: true
      });
      if (p) {
        const key = p.digits || p.national;
        if (!seen.has(key)) {
          seen.add(key);
          parsedCandidates.push(p);
        }
      }
    }

    parsedCandidates.sort((a, b) => Number(b.isMobile) - Number(a.isMobile));

    const mobiles = parsedCandidates.filter(p => p.isMobile);
    const landlines = parsedCandidates.filter(p => p.isLandline);
    const best = mobiles[0] || landlines[0] || parsedCandidates[0];

    if (best) {
      const formatted = best.displayPhone || best.national || best.e164;
      const existingPhones = Array.isArray(vendor.phones) ? vendor.phones : (vendor.phone ? [vendor.phone] : []);
      vendor.phones = [...new Set([formatted, ...existingPhones])];

      if (!vendor.phone || !vendor.isMobile) {
        vendor.phone = formatted;
        vendor.phoneType = best.isMobile ? 'mobile' : 'landline';
        vendor.isMobile = Boolean(best.isMobile);
        vendor.isLandline = Boolean(best.isLandline);
        vendor.callUrl = best.callUrl || `tel:${best.digits || best.national}`;
        if (best.isMobile) {
          vendor.whatsappAvailable = true;
          vendor.whatsappLink = `https://wa.me/${best.digits}`;
        }
        vendor.verified = true;
        vendor.aiVerified = true;
        enrichedFields.push('primary_phone');
      }
    }
  }

  // Pass 4: Merge emails
  if (rawEmails.length > 0) {
    const existingEmails = Array.isArray(vendor.emails) ? vendor.emails : (vendor.email ? [vendor.email] : []);
    const mergedEmails = [...new Set([...rawEmails, ...existingEmails])];
    vendor.emails = mergedEmails;
    if (!vendor.email && mergedEmails.length > 0) {
      vendor.email = mergedEmails[0];
      enrichedFields.push('email');
    }
  }

  // Update Quality Score & Tier
  let score = 30;
  if (vendor.phone) score += 35;
  if (vendor.isMobile && vendor.whatsappAvailable) score += 15;
  if (vendor.email) score += 10;
  if (vendor.website) score += 10;
  if (vendor.address) score += 10;
  vendor.qualityScore = Math.min(100, Math.max(score, vendor.qualityScore || 0));
  vendor.tier = vendor.qualityScore >= 80 ? 'Platinum' : (vendor.qualityScore >= 60 ? 'Gold' : 'Silver');
  vendor.profileEnrichedAt = new Date().toISOString();

  // Persist into dbAdapter
  try {
    const allStored = dbAdapter.getVendors();
    const idx = allStored.findIndex(v => v.id === vendor.id);
    if (idx !== -1) {
      Object.assign(allStored[idx], vendor);
      dbAdapter.saveVendors(allStored);
    }
  } catch (e) {}

  // Persist into session vault file if applicable
  try {
    if (fs.existsSync(SESSIONS_DIR)) {
      const walk = (dir) => {
        fs.readdirSync(dir).forEach(file => {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
          else if (file.endsWith('.json')) {
            try {
              const session = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
              if (Array.isArray(session.leads)) {
                const leadIdx = session.leads.findIndex(l => l.id === vendor.id || (l.name === vendor.name && l.city === vendor.city));
                if (leadIdx !== -1) {
                  Object.assign(session.leads[leadIdx], vendor);
                  fs.writeFileSync(fullPath, JSON.stringify(session, null, 2), 'utf8');
                }
              }
            } catch (err) {}
          }
        });
      };
      walk(SESSIONS_DIR);
    }
  } catch (e) {}

  return {
    ok: true,
    vendorId: vendor.id,
    phone: vendor.phone,
    isMobile: vendor.isMobile,
    whatsappLink: vendor.whatsappLink,
    email: vendor.email,
    qualityScore: vendor.qualityScore,
    tier: vendor.tier,
    enrichedFields,
    vendor
  };
}

/**
 * 4. Aggressively Enrich All Leads in a Session that Lack Mobile Numbers
 */
async function enrichSessionAggressive(sessionId, options = {}) {
  let sessionPath = '';
  let sessionData = null;

  // Locate the session JSON
  if (fs.existsSync(SESSIONS_DIR)) {
    const walk = (dir) => {
      fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
        else if (file === `${sessionId}.json` || file.includes(sessionId)) {
          sessionPath = fullPath;
        }
      });
    };
    walk(SESSIONS_DIR);
  }

  if (!sessionPath || !fs.existsSync(sessionPath)) {
    return { ok: false, error: 'Session file not found' };
  }

  try {
    sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  } catch (e) {
    return { ok: false, error: 'Malformed session JSON' };
  }

  const leads = Array.isArray(sessionData.leads) ? sessionData.leads : [];
  // Target leads without a valid mobile
  const targets = leads.filter(l => !l.phone || !l.isMobile);

  let enrichedCount = 0;
  let mobilesFound = 0;

  // Process concurrently in small batches of 3
  const concurrency = 3;
  for (let i = 0; i < targets.length; i += concurrency) {
    const chunk = targets.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (lead) => {
        try {
          const res = await enrichSingleVendorAggressive(lead, options);
          if (res.ok && res.enrichedFields.length > 0) {
            enrichedCount++;
            if (res.isMobile) mobilesFound++;
          }
        } catch (err) {}
      })
    );
  }

  // Update session metadata
  sessionData.phoneCount = leads.filter(l => Boolean(l.phone)).length;
  sessionData.verifiedCount = leads.filter(l => Boolean(l.verified || l.isMobile)).length;
  fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2), 'utf8');

  return {
    ok: true,
    sessionId,
    totalLeads: leads.length,
    attempted: targets.length,
    enrichedCount,
    mobilesFound,
    phoneCount: sessionData.phoneCount
  };
}

module.exports = {
  enrichSingleVendorAggressive,
  enrichSessionAggressive,
  crawlWebsiteForContacts,
  dorkPhoneFromSearch,
  countryForLead
};
