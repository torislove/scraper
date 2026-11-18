/**
 * engine-social-dork-intl.js — International Social & Contact Dorking Engine
 *
 * Covers ALL countries: US, GB, CA, AU, AE, SG, NZ, ZA, IE, MY, and beyond.
 *
 * Uses free, keyless search querying (DuckDuckGo HTML / Bing HTML) with
 * specialized international contact dorks to uncover:
 *   - Direct business telephone numbers
 *   - Email addresses
 *   - Physical addresses
 *   - LinkedIn, Facebook, and Instagram official company pages
 *   - Direct business domains
 *
 * Zero paid APIs, zero subscriptions.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const dv = require('./directoryVendor');
const { extractPhones } = require('../utils/phoneUtils');
const { fastWebsiteExtract } = require('../utils/fastWebsiteExtractor');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

function decodeBingUrl(href) {
  if (!href) return '';
  if (!href.includes('bing.com/ck/')) return href;
  const match = href.match(/[?&]u=a1([a-zA-Z0-9_-]+)/);
  if (!match) return href;
  try {
    let b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return Buffer.from(b64, 'base64').toString('utf8');
  } catch (e) {
    return href;
  }
}

// Country phone prefix hints for high-precision regex extraction
const COUNTRY_PHONE_PREFIXES = {
  US: '\\+?1[-.\\s]?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}',
  CA: '\\+?1[-.\\s]?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}',
  GB: '(?:\\+44|0)(?:\\d\\s?){9,10}',
  AU: '(?:\\+61|0)(?:[2-478]\\s?\\d{4}\\s?\\d{4}|1300\\s?\\d{3}\\s?\\d{3}|1800\\s?\\d{3}\\s?\\d{3})',
  AE: '(?:\\+971|0)(?:[234679]\\s?\\d{7}|5[02456]\\s?\\d{7})',
  SG: '(?:\\+65|65)?\\s?[689]\\d{7}',
  NZ: '(?:\\+64|0)(?:[3479]\\s?\\d{7}|2[0-2789]\\s?\\d{6,8})',
  ZA: '(?:\\+27|0)(?:[1-578]\\d{8})',
  IE: '(?:\\+353|0)(?:[1-9]\\d{6,8})',
  MY: '(?:\\+60|0)(?:[1-9]\\d{7,8})',
  IN: '(?:\\+91|0)?[6-9]\\d{9}'
};

/**
 * Executes international contact dorking sweep
 */
async function scrapeSocialDorkIntl(category, location, sessionId = 'legacy', countryCode = 'US') {
  const code = String(countryCode || 'US').toUpperCase();
  deps.logger(`[Social Dork ${code}] Launching contact intelligence sweep for "${category}" in "${location}"...`);

  const dorks = [
    `${category} in ${location} phone contact`,
    `site:linkedin.com/company "${category}" "${location}"`,
    `site:facebook.com "${category}" "${location}" contact phone`
  ];

  const results = [];
  const phoneRegexStr = COUNTRY_PHONE_PREFIXES[code] || COUNTRY_PHONE_PREFIXES.US;
  const phoneRegex = new RegExp(phoneRegexStr, 'g');

  for (const dork of dorks) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;

    try {
      const market = code === 'IN' ? 'en-IN' : `en-${code}`;
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(dork)}&setlang=en&mkt=${market}&count=15`;
      const resp = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 12000
      });

      const $ = cheerio.load(resp.data);
      $('li.b_algo, div.b_algo').each((_, el) => {
        const titleAnchor = $(el).find('h2 a');
        const snippetEl = $(el).find('.b_caption p, .b_snippet, p');
        
        const title = (titleAnchor.text() || '').trim();
        const snippet = (snippetEl.text() || '').trim();
        const rawLink = titleAnchor.attr('href') || '';
        const link = decodeBingUrl(rawLink);

        if (!title || title.length < 3) return;

        // Clean company name
        const cleanName = title
          .replace(/\s*[-–|].*$/, '')
          .replace(/\s*\|\s*LinkedIn.*$/i, '')
          .replace(/\s*\|\s*Facebook.*$/i, '')
          .replace(/\s*-\s*Wikipedia.*$/i, '')
          .trim();

        // Skip generic directories or wiki
        if (/wikipedia|dictionary|thesaurus/i.test(cleanName)) return;

        // Extract phone from snippet
        const phoneMatches = snippet.match(phoneRegex);
        const phone = phoneMatches && phoneMatches.length > 0 ? phoneMatches[0] : '';

        // Extract email from snippet
        const emailMatches = snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const email = emailMatches ? emailMatches[0] : '';

        // If from LinkedIn/Facebook, record as social link, otherwise company site
        let website = '';
        let linkedin = '';
        let facebook = '';

        if (link.includes('linkedin.com/company')) {
          linkedin = link;
        } else if (link.includes('facebook.com/')) {
          facebook = link;
        } else if (!link.includes('bing.com') && link.startsWith('http')) {
          website = link;
        }

        if (cleanName && (phone || website || linkedin || facebook || email)) {
          results.push({
            name: cleanName,
            phone,
            email,
            website,
            address: `${cleanName}, ${location}`,
            socials: { linkedin, facebook }
          });
        }
      });

    } catch (err) {
      deps.logger(`[Social Dork ${code}] Dork query warning: ${err.message}`);
    }
  }

  deps.logger(`[Social Dork ${code}] Discovered ${results.length} candidate leads.`);

  let created = 0;
  let updated = 0;
  let phoneCount = 0;

  for (const item of results) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;

    const parsedPhones = extractPhones(item.phone || '', {
      defaultCountry: code,
      allowInternational: true,
      trusted: true,
      context: 'phone social dork'
    });

    const vendor = dv.buildDirectoryVendor({
      prefix: 'soc',
      sessionId,
      source: `Social Dork ${code}`,
      sourceEngine: 'social-dork-intl',
      name: item.name,
      category,
      city: location,
      address: item.address,
      country: code,
      website: item.website || '',
      email: item.email || '',
      socials: item.socials,
      phones: parsedPhones,
      tags: ['social-dork', 'web-intel', code.toLowerCase()]
    });

    if (!vendor.name) continue;

    const result = dv.saveDirectoryVendor(vendor, sessionId);
    if (!result.vendor) continue;

    if (result.vendor.phone) phoneCount++;
    if (result.created) {
      created++;
      try { deps.emitVendorEvent(result.vendor, 'inserted'); } catch (e) {}
    } else {
      updated++;
      try { deps.emitVendorEvent(result.vendor, 'updated'); } catch (e) {}
    }
  }

  deps.logger(`[Social Dork ${code}] Complete: ${created} new leads, ${updated} updated, ${phoneCount} with phones.`);
  return {
    totalScraped: results.length,
    newInserted: created,
    updated,
    phoneCount
  };
}

module.exports = {
  scrapeSocialDorkIntl,
  setDeps
};
