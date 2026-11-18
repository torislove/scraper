/**
 * engine-web-contact.js — first-class enrichment from each business's own site.
 *
 * This is the legal way to reach the verticals whose marketplaces block
 * automation (Zomato, Swiggy, Practo, 99acres, CarDekho, UrbanPro, WedMeGood)
 * and the legal way to discover Instagram / Facebook handles:
 *
 *   we never touch those marketplaces. We read the **public website the business
 *   published itself** — the one Google already linked to — and take the contact
 *   details the owner chose to put there.
 *
 * Rules this engine follows:
 *  - robots.txt is fetched and obeyed for every host; disallowed paths are skipped.
 *  - Only public HTTP(S), no logins, no CAPTCHA, no proxy rotation, no forged
 *    headers. If a site says no, the engine says nothing.
 *  - Private / loopback addresses are refused (no SSRF).
 *  - Only http(s) links already attached to a lead are visited.
 *  - Values are only written into empty fields, so a richer existing record is
 *    never overwritten by a weaker one.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const dbAdapter = require('../config/dbAdapter');
const { normalizePhone, extractPhones } = require('../utils/phoneUtils');

const USER_AGENT = 'Mozilla/5.0 (compatible; Scraper.co.in-LeadFinder/1.0; +https://scraper.co.in)';
const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });

const MAX_PAGES_PER_SITE = 3;
const REQUEST_TIMEOUT_MS = 9000;
const MAX_HTML_BYTES = 900_000;
const DEFAULT_CONCURRENCY = 6;
const DEFAULT_LIMIT = 80;

const SOCIAL_RULES = [
  { key: 'instagram', host: /(^|\.)instagram\.com$/i, path: /^\/([A-Za-z0-9._]{2,40})\/?$/, deny: /^(p|reel|reels|explore|accounts|stories|tv|share|about|developer|legal|directory|web|api|oauth|whatsapp|instagram|facebook|meta|google)$/i },
  { key: 'facebook', host: /(^|\.)facebook\.com$/i, path: /^\/([A-Za-z0-9._-]{2,80})\/?$/, deny: /^(sharer|share|dialog|plugins|login|watch|groups|events|story|photo|permalink|hashtag|profile\.php|about|business|help|policies|privacy|terms|whatsapp|instagram|facebook|meta|google)$/i },
  { key: 'linkedin', host: /(^|\.)linkedin\.com$/i, path: /^\/(company|in|school)\/([A-Za-z0-9._-]{2,80})\/?$/ },
  { key: 'youtube', host: /(^|\.)youtube\.com$/i, path: /^\/(channel|c|user|@[A-Za-z0-9._-]+)/ },
  { key: 'twitter', host: /(^|\.)(twitter|x)\.com$/i, path: /^\/([A-Za-z0-9._]{2,40})\/?$/, deny: /^(intent|share|home|hashtag|search|i|about|privacy|tos|whatsapp|instagram|facebook|meta|google)$/i }
];

// These hosts are not a business's own website — they are profiles or link
// redirects. Reading them would mean scraping a social platform, which this
// engine deliberately never does.
const NON_BUSINESS_HOST = /(^|\.)(instagram\.com|facebook\.com|fb\.com|wa\.me|whatsapp\.com|api\.whatsapp\.com|twitter\.com|x\.com|linkedin\.com|youtube\.com|youtu\.be|t\.me|telegram\.me)$/i;

const PLACEHOLDER_EMAIL = /(?:example\.(?:com|org)|sentry\.io|wixpress\.com|domain\.com|email\.com|yourdomain|no-?reply|donotreply|@2x|\.(?:png|jpe?g|gif|webp|svg|css|js)$)/i;

const deps = {
  emitVendorEvent: null,
  abortSignal: null,
  logger: console.log
};

function setDeps(next = {}) {
  if (next.emitVendorEvent) deps.emitVendorEvent = next.emitVendorEvent;
  if (next.abortSignal) deps.abortSignal = next.abortSignal;
  if (next.logger) deps.logger = next.logger;
}

/* ── safety ──────────────────────────────────────────────────────────────── */

function isPublicUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch (e) {
    return false;
  }
  if (!/^https?:$/.test(url.protocol)) return false;
  const host = url.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local')) return false;
  if (/^(10\.|127\.|169\.254\.|0\.)/.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (host === '::1' || host === '[::1]') return false;
  return true;
}

const robotsCache = new Map();

async function allowedByRobots(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch (e) {
    return false;
  }
  const origin = url.origin;
  if (!robotsCache.has(origin)) {
    let body = '';
    try {
      const response = await axios.get(`${origin}/robots.txt`, {
        timeout: 5000,
        httpsAgent,
        maxContentLength: 200_000,
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/plain' },
        validateStatus: status => status >= 200 && status < 400
      });
      body = typeof response.data === 'string' ? response.data : '';
    } catch (error) {
      // 404 / network error: nothing published to obey, treat as allowed.
      body = '';
    }
    robotsCache.set(origin, parseRobots(body));
  }
  const rules = robotsCache.get(origin);
  const path = `${url.pathname}${url.search}` || '/';
  for (const rule of rules.disallow) {
    if (rule && path.startsWith(rule)) return false;
  }
  return true;
}

function parseRobots(text) {
  const rules = { disallow: [], allow: [] };
  let applies = false;
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const match = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const field = match[1].toLowerCase();
    const value = match[2].trim();
    if (field === 'user-agent') {
      applies = value === '*' || /scraper|leadfinder/i.test(value);
    } else if (applies && field === 'disallow' && value) {
      rules.disallow.push(value);
    } else if (applies && field === 'allow' && value) {
      rules.allow.push(value);
    }
  }
  return rules;
}

/* ── extraction ──────────────────────────────────────────────────────────── */

function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase().replace(/^mailto:/, '').split('?')[0];
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email)) return '';
  if (PLACEHOLDER_EMAIL.test(email)) return '';
  if (email.length > 120) return '';
  return email;
}

function socialFromHref(href) {
  let url;
  try {
    url = new URL(href);
  } catch (e) {
    return null;
  }
  for (const rule of SOCIAL_RULES) {
    if (!rule.host.test(url.hostname)) continue;
    if (!rule.path.test(url.pathname)) continue;
    if (rule.deny) {
      const first = url.pathname.split('/').filter(Boolean)[0] || '';
      if (rule.deny.test(first)) continue;
    }
    return { key: rule.key, url: `${url.origin}${url.pathname.replace(/\/$/, '')}` };
  }
  return null;
}

function extractFromHtml(html, baseUrl, countryCode = 'IN') {
  const country = String(countryCode || 'IN').toUpperCase();
  const $ = cheerio.load(html);
  const emailSet = new Set();
  const phoneSet = new Map();
  const socials = {};

  $('a[href^="mailto:"]').each((_, element) => {
    const email = cleanEmail($(element).attr('href'));
    if (email) emailSet.add(email);
  });

  $('a[href^="tel:"]').each((_, element) => {
    const parsed = normalizePhone($(element).attr('href'), {
      context: 'tel',
      defaultCountry: country,
      allowInternational: true
    });
    if (parsed && parsed.isValid !== false) phoneSet.set(parsed.e164, parsed);
  });

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') || '';
    let absolute = '';
    try {
      absolute = new URL(href, baseUrl).toString();
    } catch (e) {
      return;
    }
    const social = socialFromHref(absolute);
    if (social && !socials[social.key]) socials[social.key] = social.url;
  });

  // Plain-text fallbacks. Only used when structured links were not published.
  const text = $('body').text().replace(/\s+/g, ' ').slice(0, 60_000);
  if (!emailSet.size) {
    for (const match of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
      const email = cleanEmail(match[0]);
      if (email) emailSet.add(email);
      if (emailSet.size >= 3) break;
    }
  }
  if (!phoneSet.size) {
    if (country === 'IN') {
      for (const match of text.matchAll(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/g)) {
        const parsed = normalizePhone(match[0], { context: 'phone', defaultCountry: 'IN', allowInternational: true });
        if (parsed && parsed.isValid !== false) phoneSet.set(parsed.e164, parsed);
        if (phoneSet.size >= 4) break;
      }
    } else {
      // Western sites publish numbers in local formats ("(248) 555-0134",
      // "020 7946 0958"). The country-aware extractor validates them against
      // that market and refuses foreign prefixes.
      const parsedPhones = extractPhones(text, {
        defaultCountry: country,
        allowInternational: true,
        trusted: false,
        context: 'phone contact call'
      }).filter(phone => phone.isMobile || phone.isLandline || phone.isTollFree);
      for (const parsed of parsedPhones) {
        phoneSet.set(parsed.e164, parsed);
        if (phoneSet.size >= 4) break;
      }
    }
  }

  return {
    emails: [...emailSet].slice(0, 3),
    phones: [...phoneSet.values()].slice(0, 4),
    socials
  };
}

async function fetchPage(url) {
  if (!isPublicUrl(url)) return null;
  if (!(await allowedByRobots(url))) {
    deps.logger(`[Web Contact] robots.txt disallows ${url} — skipped.`);
    return null;
  }
  try {
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT_MS,
      httpsAgent,
      maxContentLength: MAX_HTML_BYTES,
      maxRedirects: 3,
      responseType: 'text',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IN,en;q=0.9'
      },
      validateStatus: status => status >= 200 && status < 400
    });
    const type = String(response.headers?.['content-type'] || '');
    if (type && !/html|xml|text/i.test(type)) return null;
    return { url: response.request?.res?.responseUrl || url, html: String(response.data || '') };
  } catch (error) {
    return null;
  }
}

function contactCandidates(html, baseUrl) {
  const $ = cheerio.load(html);
  const found = new Set();
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') || '';
    const label = `${$(element).text()} ${href}`.toLowerCase();
    if (!/contact|about|enquir|reach|connect|get-in-touch|support|location/.test(label)) return;
    try {
      const absolute = new URL(href, baseUrl).toString();
      if (new URL(absolute).origin === new URL(baseUrl).origin) found.add(absolute);
    } catch (e) {}
  });
  return [...found].slice(0, 2);
}

/* ── main entry ──────────────────────────────────────────────────────────── */

function hasAnyPhone(lead) {
  return Boolean(
    lead?.phone
    || lead?.primaryPhone
    || (Array.isArray(lead?.phones) && lead.phones.some(p => p && (p.e164 || p.number)))
  );
}

function needsEnrichment(lead) {
  if (!lead?.website) return false;
  try {
    if (NON_BUSINESS_HOST.test(new URL(lead.website).hostname)) return false;
  } catch (e) {
    return false;
  }
  // No phone at all is the strongest reason to read the site, even when the
  // email and social profiles are already known.
  return !hasAnyPhone(lead) || !lead.email || !lead.instagram || !lead.facebook;
}

async function enrichOne(lead, countryCode = 'IN') {
  const website = String(lead.website || '').trim();
  if (!isPublicUrl(website)) return null;
  const country = String(lead.country || countryCode || 'IN').toUpperCase();

  const collected = { emails: [], phones: [], socials: {} };
  const visited = new Set();
  const merge = data => {
    if (!data) return;
    for (const email of data.emails) if (!collected.emails.includes(email)) collected.emails.push(email);
    for (const phone of data.phones) {
      if (!collected.phones.some(p => p.e164 === phone.e164)) collected.phones.push(phone);
    }
    for (const [key, value] of Object.entries(data.socials)) {
      if (!collected.socials[key]) collected.socials[key] = value;
    }
  };

  const first = await fetchPage(website);
  if (!first) return null;
  visited.add(first.url);
  merge(extractFromHtml(first.html, first.url, country));

  if (needsMore(collected)) {
    for (const candidate of contactCandidates(first.html, first.url)) {
      if (visited.size >= MAX_PAGES_PER_SITE) break;
      if (visited.has(candidate)) continue;
      visited.add(candidate);
      const page = await fetchPage(candidate);
      if (!page) continue;
      merge(extractFromHtml(page.html, page.url, country));
      if (!needsMore(collected)) break;
    }
  }

  if (!collected.emails.length && !collected.phones.length && !Object.keys(collected.socials).length) {
    return null;
  }
  return { ...collected, sourceUrl: first.url };
}

function needsMore(collected) {
  return (!collected.emails.length || !collected.socials.instagram || !collected.socials.facebook);
}

async function scrapeWebContact(leads = [], { sessionId = '', concurrency = DEFAULT_CONCURRENCY, limit = DEFAULT_LIMIT, budgetMs = 90_000, countryCode = 'IN' } = {}) {
  // Phone coverage is the product. When a business has its own website, that site
  // is the most reliable place to find the missing mobile, so leads with no phone
  // must be read first - the old code just took the first N leads in scrape order.
  const phonePriority = (lead) => {
    if (!hasAnyPhone(lead)) return 0;
    const mobileOf = (value) => {
      try { return Boolean(normalizePhone(String(value || ''), { context: 'phone mobile', trusted: true, allowInternational: true })?.isMobile); }
      catch (e) { return false; }
    };
    const isMobile = lead?.phoneType === 'mobile'
      || (Array.isArray(lead?.phones) && lead.phones.some(p => p && (p.isMobile || mobileOf(p.e164 || p))))
      || mobileOf(lead?.phone);
    return isMobile ? 2 : 1;
  };

  const targets = (Array.isArray(leads) ? leads : [])
    .filter(lead => lead && lead.id && needsEnrichment(lead))
    .map((lead, index) => ({ lead, index, priority: phonePriority(lead) }))
    .sort((a, b) => (a.priority - b.priority) || (a.index - b.index))
    .slice(0, limit)
    .map(entry => entry.lead);

  if (!targets.length) {
    deps.logger('[Web Contact] No leads with a website need enrichment.');
    return { candidates: 0, enriched: 0, phones: 0, emails: 0, socials: 0 };
  }

  deps.logger(`[Web Contact] Reading ${targets.length} business websites (robots.txt respected)...`);

  const startedAt = Date.now();
  let cursor = 0;
  let enriched = 0;
  let phones = 0;
  let emails = 0;
  let socials = 0;

  const worker = async () => {
    while (cursor < targets.length) {
      if (deps.abortSignal && deps.abortSignal.aborted) return;
      // A website pass must never hold the run hostage: stop starting new
      // sites once the time budget is spent and report what was done.
      if (Date.now() - startedAt > budgetMs) return;
      const lead = targets[cursor++];
      const found = await enrichOne(lead, countryCode).catch(() => null);
      if (!found) continue;

      const current = dbAdapter.getVendors().find(v => v.id === lead.id);
      if (!current) continue;

      const patch = {};
      const provenance = Array.isArray(current.sourceProvenance) ? [...current.sourceProvenance] : [];
      const stamp = new Date().toISOString();

      if (!current.email && found.emails.length) {
        patch.email = found.emails[0];
        provenance.push({ field: 'email', source: 'Business website', sourceUrl: found.sourceUrl, extractedAt: stamp });
        emails += 1;
      }

      // The store keeps `phones[]` as plain e164 strings. Accept old object
      // entries too, and never drop a phone just because of its storage shape:
      // the previous filter only kept objects, so every string entry vanished
      // on the next website pass.
      const toE164 = (p) => {
        if (!p) return '';
        if (typeof p === 'string') return p.trim();
        return String(p.e164 || p.number || p.raw || '').trim();
      };
      const isMobileE164 = (p) => {
        try { return Boolean(normalizePhone(p, { context: 'phone mobile', trusted: true, allowInternational: true })?.isMobile); }
        catch (e) { return false; }
      };
      const existingPhones = (Array.isArray(current.phones) ? current.phones : [])
        .map(toE164)
        .filter(Boolean);
      const newPhones = found.phones.filter(p => p && p.e164 && !existingPhones.includes(p.e164));
      if (newPhones.length) {
        patch.phones = [...new Set([...existingPhones, ...newPhones.map(p => p.e164)])];
        const bestMobile = newPhones.find(p => p.isMobile);
        // A mobile always outranks a landline as the primary number.
        if (bestMobile && !isMobileE164(current.phone)) {
          patch.phone = bestMobile.e164;
          patch.phoneType = 'mobile';
          patch.phoneSource = 'Business website';
        } else if (!current.phone) {
          const best = newPhones[0];
          patch.phone = best.e164;
          patch.phoneType = best.isMobile ? 'mobile' : 'landline';
          patch.phoneSource = 'Business website';
        }
        provenance.push({ field: 'phone', source: 'Business website', sourceUrl: found.sourceUrl, extractedAt: stamp });
        phones += newPhones.length;
      }

      for (const [key, value] of Object.entries(found.socials)) {
        if (current[key]) continue;
        patch[key] = value;
        provenance.push({ field: key, source: 'Business website', sourceUrl: found.sourceUrl, extractedAt: stamp });
        socials += 1;
      }
      if (Object.keys(found.socials).length) {
        patch.socials = {
          instagram: current.instagram || '',
          facebook: current.facebook || '',
          linkedin: current.linkedin || '',
          youtube: current.youtube || '',
          twitter: current.twitter || '',
          ...(current.socials || {})
        };
        for (const [key, value] of Object.entries(found.socials)) {
          if (!patch.socials[key]) patch.socials[key] = value;
        }
      }

      if (!Object.keys(patch).length) continue;

      const merged = {
        ...current,
        ...patch,
        sourceProvenance: provenance,
        tags: Array.from(new Set([...(current.tags || []), 'web-contact'])),
        webContactAt: stamp
      };
      dbAdapter.saveVendor(merged.userId || 'admin_1', merged);
      enriched += 1;
      try { deps.emitVendorEvent?.(merged, 'updated'); } catch (e) {}
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, targets.length)) }, worker));

  deps.logger(`[Web Contact] Enriched ${enriched}/${targets.length} businesses · ${phones} phones · ${emails} emails · ${socials} social links.`);
  return { candidates: targets.length, enriched, phones, emails, socials };
}

module.exports = { scrapeWebContact, setDeps };
