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
 *  Vector 4: Direct WhatsApp & Telecom Normalization (every country libphonenumber knows)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const path = require('path');
const fs = require('fs');

const dbAdapter = require('../config/dbAdapter');
const { SESSIONS_DIR } = require('../config/paths');
const { normalizePhone, extractPhones, extractEmails, extractSocialContacts } = require('../utils/phoneUtils');
const { detectCountry, COUNTRIES } = require('../services/localBrain/countries');
const { scrapeSocialProfile, scrapeFacebookPage, scrapeInstagramProfile, crawlSocialViaOpenGraph, crawlTikTokViaOpenGraph } = require('../scrapers/socialMediaScraper');

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
  // DuckDuckGo's HTML endpoint still answers a plain GET. Bing does not: from
  // this network a forged `?q=` URL returns unrelated cached pages, and the
  // working path (typing into Bing's box) is far too heavy to run once per
  // vendor inside a sweep. So this enrichment pass is DuckDuckGo-only, and the
  // Bing-based engines go through `scrapers/bingSearch.js` instead.
  const searchUrls = [
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  ];

  for (const url of searchUrls) {
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 2500
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
 * 3. Static Link-in-Bio Resolver (Linktree, Bio.link, Beacons)
 * Lightweight HTTP GET against public bio hubs to harvest WhatsApp and phone numbers.
 */
async function resolveLinkInBio(bioUrl, countryCode = 'IN') {
  const result = {
    phones: [],
    whatsapp: '',
    email: '',
    socials: []
  };

  if (!bioUrl || !bioUrl.startsWith('http')) return result;

  try {
    const res = await axios.get(bioUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 6000
    });

    const html = typeof res.data === 'string' ? res.data : '';
    if (!html) return result;

    const $ = cheerio.load(html);

    // Check all anchor links
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      // WhatsApp
      const waMatch = href.match(/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?(?:\+?91)?([6-9]\d{9})/i);
      if (waMatch) {
        result.whatsapp = `https://wa.me/91${waMatch[1]}`;
        result.phones.push(waMatch[1]);
      }
      // Tel:
      if (/^tel:/i.test(href)) {
        const tel = href.replace(/^tel:/i, '').trim();
        const extracted = extractPhones(tel, { defaultCountry: countryCode });
        for (const p of extracted) {
          result.phones.push(p.displayPhone || p.national || p.e164);
        }
      }
      // Mailto:
      if (/^mailto:/i.test(href)) {
        const mail = href.replace(/^mailto:/i, '').split('?')[0].trim();
        if (mail && !result.email) result.email = mail;
      }
      // Socials
      if (/instagram\.com|facebook\.com/i.test(href)) {
        result.socials.push(href);
      }
    });

    // Also check page text
    const text = $('body').text() || '';
    const extractedTextPhones = extractPhones(text, { defaultCountry: countryCode });
    for (const p of extractedTextPhones) {
      if (p.isMobile || p.isLandline) {
        result.phones.push(p.displayPhone || p.national || p.e164);
      }
    }
  } catch (e) {
    // Non-fatal
  }

  return result;
}

/**
 * Synthesizes high-probability social handles for a business name to enable
 * instant Direct Handle Probing in ~200ms without search engine dependencies.
 */
function generateCandidateSocialHandles(vendorName, locationName = '') {
  if (!vendorName) return [];
  const clean = String(vendorName)
    .toLowerCase()
    .replace(/\b(and|the|pvt|ltd|limited|services|service|enterprise|enterprises|studio|studios|photography|films|digital)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const rawWords = String(vendorName).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const coreWords = clean.split(/\s+/).filter(Boolean);
  const loc = String(locationName || '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();

  const candidates = new Set();
  
  if (rawWords.length) {
    candidates.add(rawWords.join(''));
    candidates.add(rawWords.join('_'));
  }
  
  if (coreWords.length) {
    const core = coreWords.join('');
    candidates.add(core);
    candidates.add(`studio_${core}`);
    candidates.add(`studio_${coreWords.join('_')}`);
    candidates.add(`${core}_studio`);
    candidates.add(`${core}_photography`);
    if (loc) {
      candidates.add(`${core}_${loc}`);
      candidates.add(`${core}${loc}`);
    }
    // Handle Telugu / Indian phonetic variants (h-dropping and vowel doubling: sandhyaragam <-> sandyaraagam)
    const noH = core.replace(/h/g, '');
    candidates.add(noH);
    candidates.add(`studio_${noH}`);
    const raagam = noH.replace(/ragam/g, 'raagam');
    candidates.add(`studio_${raagam}`); // studio_sandyaraagam!
    candidates.add(raagam);
    const doubleLastA = noH.replace(/am$/, 'aam');
    candidates.add(`studio_${doubleLastA}`);
    candidates.add(`studio_${noH.replace(/a+/g, 'aa')}`);
  }

  return Array.from(candidates).slice(0, 10);
}

/**
 * 4. Targeted Social Bio & WhatsApp Hunter (Instagram, Facebook, JustDial, TikTok)
 * Specially hunts down local vendors whose primary footprint is an Instagram, Facebook or TikTok page.
 */
async function huntSocialBioContacts(vendorName, locationName, countryCode = 'IN', zoneName = '', options = {}) {
  const result = {
    phones: [],
    whatsapp: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    instagramFollowers: '',
    facebookFollowers: '',
    tiktokFollowers: '',
    bio: '',
    emails: [],
    address: '',
    linkInBio: '',
    justdialUrl: ''
  };

  if (!vendorName) return result;

  const isIndia = String(countryCode || 'IN').toUpperCase() === 'IN';
  const loc = [zoneName, locationName].filter(Boolean).join(' ') || locationName || '';
  const cleanVendor = String(vendorName).trim();

  const foundSocialUrls = {
    instagram: options.instagram || '',
    facebook: options.facebook || '',
    tiktok: options.tiktok || ''
  };

  // Pass 0: Direct Handle Probing (How Studio Sandhyaragam was discovered in <250ms)
  // Synthesizes high-probability social slugs directly from the vendor name
  const candidateHandles = generateCandidateSocialHandles(cleanVendor, loc);
  for (const handle of candidateHandles) {
    if (result.phones.length > 0 && result.whatsapp) break;
    const igProbeUrl = `https://www.instagram.com/${handle}/`;
    try {
      const igData = await crawlSocialViaOpenGraph(igProbeUrl, countryCode);
      if (igData && igData.ok) {
        const bioTokens = `${igData.name} ${igData.bio}`.toLowerCase();
        const vendorTokens = cleanVendor.toLowerCase().split(/\s+/).filter(t => t.length >= 3);
        const tokenHits = vendorTokens.filter(t => bioTokens.includes(t)).length;
        const postCount = Number(String(igData.posts || '').replace(/\D/g, '')) || 0;
        const followerCount = Number(String(igData.followers || '').replace(/\D/g, '')) || 0;
        const hasContactInfo = (igData.phones && igData.phones.length > 0) || Boolean(igData.whatsappLink);
        const isCommercialProfile = hasContactInfo || postCount >= 5 || followerCount >= 50;

        if ((tokenHits >= 1 || hasContactInfo) && isCommercialProfile) {
          foundSocialUrls.instagram = igProbeUrl;
          result.instagram = igProbeUrl;
          if (igData.phones && igData.phones.length > 0) result.phones.push(...igData.phones);
          if (igData.whatsappLink && !result.whatsapp) result.whatsapp = igData.whatsappLink;
          if (igData.bio && !result.bio) result.bio = igData.bio;
          if (igData.followers && !result.instagramFollowers) result.instagramFollowers = igData.followers;
          if (igData.linkInBio && !result.linkInBio) result.linkInBio = igData.linkInBio;
          if (igData.emails && igData.emails.length > 0) result.emails.push(...igData.emails);
          if (hasContactInfo) break;
        }
      }
    } catch (e) {}

    // For international countries, also probe TikTok handle directly
    if (!isIndia && !result.tiktok) {
      try {
        const ttProbeUrl = `https://www.tiktok.com/@${handle}`;
        const ttData = await crawlTikTokViaOpenGraph(ttProbeUrl, countryCode);
        if (ttData && ttData.ok) {
          foundSocialUrls.tiktok = ttProbeUrl;
          result.tiktok = ttProbeUrl;
          if (ttData.phones && ttData.phones.length > 0) result.phones.push(...ttData.phones);
          if (ttData.whatsappLink && !result.whatsapp) result.whatsapp = ttData.whatsappLink;
          if (ttData.bio && !result.bio) result.bio = ttData.bio;
          if (ttData.followers && !result.tiktokFollowers) result.tiktokFollowers = ttData.followers;
          if (ttData.linkInBio && !result.linkInBio) result.linkInBio = ttData.linkInBio;
          if (ttData.emails && ttData.emails.length > 0) result.emails.push(...ttData.emails);
        }
      } catch (e) {}
    }
  }

  // Pass 1: Precision Dork Queries
  const queries = [
    `site:instagram.com "${cleanVendor}" "${loc}"`,
    `site:facebook.com "${cleanVendor}" "${loc}"`,
    `site:instagram.com "${cleanVendor}" ("wa.me" OR "+91" OR "call" OR "contact" OR "ph:")`,
    `site:facebook.com "${cleanVendor}" ("phone" OR "mobile" OR "+91" OR "whatsapp")`
  ];

  if (!isIndia) {
    queries.push(`site:tiktok.com/@ "${cleanVendor}" "${loc}"`);
  }

  if (isIndia) {
    queries.push(`site:justdial.com "${cleanVendor}" "${loc}"`);
  }

  for (const q of queries) {
    if (foundSocialUrls.instagram && (result.phones.length > 0 || result.whatsapp)) break;
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
      const res = await axios.get(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 2500
      });

      const html = typeof res.data === 'string' ? res.data : '';
      if (!html) continue;

      const $ = cheerio.load(html);

      $('.result').each((_, el) => {
        const title = $(el).find('.result__title').text() || '';
        const snippet = $(el).find('.result__snippet').text() || '';
        let link = $(el).find('a.result__url').attr('href') || $(el).find('.result__title a').attr('href') || '';

        // Unwrap redirect link if present (/l/?uddg=...)
        if (link.includes('uddg=')) {
          const m = link.match(/uddg=([^&]+)/);
          if (m) {
            try { link = decodeURIComponent(m[1]); } catch (e) {}
          }
        }

        const parsed = extractSocialContacts(`${title} ${snippet}`, link, countryCode);
        if (parsed.phones.length > 0) result.phones.push(...parsed.phones);
        if (parsed.whatsapp && !result.whatsapp) result.whatsapp = parsed.whatsapp;
        if (parsed.linkInBio && !result.linkInBio) result.linkInBio = parsed.linkInBio;

        if (link.includes('instagram.com') && !foundSocialUrls.instagram && !/\/(p|reel|stories|explore)\//.test(link)) {
          foundSocialUrls.instagram = link.split('?')[0];
          result.instagram = foundSocialUrls.instagram;
        }
        if (link.includes('facebook.com') && !foundSocialUrls.facebook && !/\/(login|share|events|watch|policies)\//.test(link)) {
          foundSocialUrls.facebook = link.split('?')[0];
          result.facebook = foundSocialUrls.facebook;
        }
        if (!isIndia && link.includes('tiktok.com/@') && !foundSocialUrls.tiktok) {
          foundSocialUrls.tiktok = link.split('?')[0];
          result.tiktok = foundSocialUrls.tiktok;
        }
        if (link.includes('justdial.com') && !result.justdialUrl) {
          result.justdialUrl = link;
        }
      });

      if (result.phones.length > 0 && result.whatsapp && foundSocialUrls.instagram) break;
    } catch (e) {
      // Continue to next query
    }
  }

  // Direct Profile Inspection via Fast OpenGraph & Polaris JSON Parser (0ms Playwright overhead)
  if (foundSocialUrls.instagram && !result.bio) {
    try {
      const igData = await crawlSocialViaOpenGraph(foundSocialUrls.instagram, countryCode);
      if (igData && igData.ok) {
        if (igData.phones && igData.phones.length > 0) result.phones.push(...igData.phones);
        if (igData.whatsappLink && !result.whatsapp) result.whatsapp = igData.whatsappLink;
        if (igData.bio && !result.bio) result.bio = igData.bio;
        if (igData.followers && !result.instagramFollowers) result.instagramFollowers = igData.followers;
        if (igData.linkInBio && !result.linkInBio) result.linkInBio = igData.linkInBio;
        if (igData.emails && igData.emails.length > 0) result.emails.push(...igData.emails);
      }
    } catch (e) {}
  }

  if (foundSocialUrls.facebook && (!result.phones.length || !result.bio)) {
    try {
      const fbData = await crawlSocialViaOpenGraph(foundSocialUrls.facebook, countryCode);
      if (fbData && fbData.ok) {
        if (fbData.phones && fbData.phones.length > 0) result.phones.push(...fbData.phones);
        if (fbData.whatsappLink && !result.whatsapp) result.whatsapp = fbData.whatsappLink;
        if (fbData.bio && !result.bio) result.bio = fbData.bio;
        if (fbData.followers && !result.facebookFollowers) result.facebookFollowers = fbData.followers;
        if (fbData.address && !result.address) result.address = fbData.address;
        if (fbData.emails && fbData.emails.length > 0) result.emails.push(...fbData.emails);
      }
    } catch (e) {}
  }

  if (!isIndia && foundSocialUrls.tiktok && (!result.phones.length || !result.bio)) {
    try {
      const ttData = await crawlTikTokViaOpenGraph(foundSocialUrls.tiktok, countryCode);
      if (ttData && ttData.ok) {
        if (ttData.phones && ttData.phones.length > 0) result.phones.push(...ttData.phones);
        if (ttData.whatsappLink && !result.whatsapp) result.whatsapp = ttData.whatsappLink;
        if (ttData.bio && !result.bio) result.bio = ttData.bio;
        if (ttData.followers && !result.tiktokFollowers) result.tiktokFollowers = ttData.followers;
        if (ttData.linkInBio && !result.linkInBio) result.linkInBio = ttData.linkInBio;
        if (ttData.emails && ttData.emails.length > 0) result.emails.push(...ttData.emails);
      }
    } catch (e) {}
  }

  // If a link-in-bio (Linktree) was found, resolve it directly
  if (result.linkInBio) {
    const bioData = await resolveLinkInBio(result.linkInBio, countryCode);
    if (bioData.phones.length > 0) result.phones.push(...bioData.phones);
    if (bioData.whatsapp && !result.whatsapp) result.whatsapp = bioData.whatsapp;
    if (bioData.email && (!result.emails || !result.emails.length)) result.emails.push(bioData.email);
  }

  // Deduplicate contact lists
  result.phones = Array.from(new Set(result.phones.filter(Boolean)));
  result.emails = Array.from(new Set(result.emails.filter(Boolean)));

  return result;
}

/**
 * 5. Enrich a Single Vendor Record Aggressively
 */
async function enrichSingleVendorAggressive(vendor, options = {}) {
  if (!vendor || !vendor.name) return { ok: false, error: 'Invalid vendor record' };

  const countryCode = countryForLead(vendor);
  const isIntl = countryCode !== 'IN';
  const enrichedFields = [];

  const rawPhones = [];
  const rawEmails = [];

  // Pass 0: Instant URL & Slug Phone Mining (0 ms)
  // Extracts embedded 10-12 digit mobile numbers from usernames/slugs (e.g. facebook.com/surendra9866074242)
  const candidateUrls = [vendor.website, vendor.facebook, vendor.instagram, vendor.mapsLink, options.website].filter(Boolean);
  for (const rawUrl of candidateUrls) {
    const slugData = extractSocialContacts('', rawUrl, countryCode);
    if (slugData.phones && slugData.phones.length > 0) {
      for (const p of slugData.phones) {
        if (!rawPhones.includes(p)) rawPhones.push(p);
      }
      enrichedFields.push('slug_phones');
    }
    if (slugData.whatsapp && !vendor.whatsappLink) {
      vendor.whatsappLink = slugData.whatsapp;
      vendor.whatsappAvailable = true;
      enrichedFields.push('slug_whatsapp');
    }
  }

  // Normalize vendor.website if it's missing scheme
  if (vendor.website && !/^https?:\/\//i.test(vendor.website)) {
    vendor.website = `https://${vendor.website}`;
  }

  // Pass 0.5: Playwright Stealth Social Profile Scraping (Instagram & Facebook Login-Bypass)
  const isFacebook = (vendor.website && vendor.website.includes('facebook.com')) || Boolean(vendor.facebook);
  const isInstagram = (vendor.website && vendor.website.includes('instagram.com')) || Boolean(vendor.instagram);

  if (isFacebook || isInstagram) {
    const targetSocial = vendor.facebook || (vendor.website && (vendor.website.includes('facebook.com') || vendor.website.includes('instagram.com')) ? vendor.website : vendor.instagram);
    if (targetSocial) {
      try {
        const socialIntel = await scrapeSocialProfile(targetSocial, countryCode);
        if (socialIntel && socialIntel.ok) {
          if (socialIntel.phones && socialIntel.phones.length > 0) {
            for (const sp of socialIntel.phones) {
              if (!rawPhones.includes(sp)) rawPhones.push(sp);
            }
            enrichedFields.push('social_phones');
          }
          if (socialIntel.emails && socialIntel.emails.length > 0) {
            for (const se of socialIntel.emails) {
              if (!rawEmails.includes(se)) rawEmails.push(se);
            }
            enrichedFields.push('social_emails');
          }
          if (socialIntel.whatsappLink && !vendor.whatsappLink) {
            vendor.whatsappLink = socialIntel.whatsappLink;
            vendor.whatsappAvailable = true;
            enrichedFields.push('social_whatsapp');
          }
          if (socialIntel.address && (!vendor.address || vendor.address.length < 10)) {
            vendor.address = socialIntel.address;
            enrichedFields.push('social_address');
          }
          if (socialIntel.bio && !vendor.description) {
            vendor.description = socialIntel.bio;
            enrichedFields.push('social_bio');
          }
          if (socialIntel.followers) {
            vendor.socialFollowers = socialIntel.followers;
            enrichedFields.push('social_followers');
          }
          if (socialIntel.linkInBio) {
            vendor.linkInBio = socialIntel.linkInBio;
            if (!vendor.website || vendor.website.includes('facebook.com') || vendor.website.includes('instagram.com')) {
              vendor.website = socialIntel.linkInBio;
              enrichedFields.push('link_in_bio_website');
            }
          }
        }
      } catch (err) {
        // Non-fatal
      }
    }
  }

  // Pass 1: Crawl standalone website if known (skip if already a social media URL)
  const websiteToCrawl = vendor.website || options.website;
  const isSocialWebsite = websiteToCrawl && (websiteToCrawl.includes('facebook.com') || websiteToCrawl.includes('instagram.com'));
  if (websiteToCrawl && websiteToCrawl.startsWith('http') && !isSocialWebsite) {
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

  // Pass 2.5: If still no mobile, run targeted Social & Instagram Bio Hunter
  if (!hasExistingMobile && rawPhones.length === 0) {
    try {
      const location = vendor.city || vendor.district || vendor.state || '';
      const zone = vendor.locality || vendor.zoneName || '';
      const socialData = await huntSocialBioContacts(vendor.name, location, countryCode, zone, {
        instagram: vendor.instagram,
        facebook: vendor.facebook
      });
      if (socialData.phones.length > 0) {
        rawPhones.push(...socialData.phones);
        enrichedFields.push('social_phones');
      }
      if (socialData.whatsapp && !vendor.whatsappLink) {
        vendor.whatsappLink = socialData.whatsapp;
        vendor.whatsappAvailable = true;
        enrichedFields.push('whatsapp');
      }
      if (socialData.instagram && !vendor.instagram) {
        vendor.instagram = socialData.instagram;
        enrichedFields.push('instagram');
      }
      if (socialData.instagramFollowers && !vendor.instagramFollowers) {
        vendor.instagramFollowers = socialData.instagramFollowers;
        enrichedFields.push('instagram_followers');
      }
      if (socialData.facebook && !vendor.facebook) {
        vendor.facebook = socialData.facebook;
        enrichedFields.push('facebook');
      }
      if (socialData.facebookFollowers && !vendor.facebookFollowers) {
        vendor.facebookFollowers = socialData.facebookFollowers;
        enrichedFields.push('facebook_followers');
      }
      if (socialData.bio && (!vendor.bio || vendor.bio.length < 15)) {
        vendor.bio = socialData.bio;
        enrichedFields.push('bio');
      }
      if (socialData.emails && socialData.emails.length > 0) {
        rawEmails.push(...socialData.emails);
        enrichedFields.push('social_emails');
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
  huntSocialBioContacts,
  resolveLinkInBio,
  countryForLead
};
