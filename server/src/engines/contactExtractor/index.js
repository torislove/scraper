'use strict';

/**
 * server/src/engines/contactExtractor/index.js
 * High-Speed Pure HTTP + JSON-LD + Microdata Business Contact & Social Extractor.
 * Zero Chromium instances. Fetches homepage + /contact + /contact-us + /about,
 * parses tel:/mailto:/JSON-LD sameAs + spaced Indian mobiles, and falls back to TLS Sidecar.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const { crawlWebsiteContactsTls } = require('../tlsSidecar');
const { renderPageLightpanda } = require('../lightpanda');
const { parsePhoneDetails, extractPhonesFromText, BLACKLISTED_PHONES } = require('../phoneUtils');
const { isValidBusinessEmail, checkDomainMx, getRegistrableDomain, sanitizeSocialUrl } = require('../../taxonomy/safetyFilter');

let activeLightpanda = 0;
const MAX_LIGHTPANDA_CONCURRENT = 2;

const IGNORE_IG = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'about', 'legal', 'accounts', 'developer', 'directory', 'o1']);
const IGNORE_FB = new Set(['2008', 'people', 'p', 'sharer', 'sharer.php', 'share', 'share.php', 'wordpresscom', 'groups', 'events', 'help', 'pages', 'tr', 'plugins', 'dialog', 'privacy', 'policies', 'login', 'recover', 'watch', 'marketplace', 'pg']);
const IGNORE_EMAIL_RE = /\.(png|jpe?g|webp|gif|svg|css|js)$|sentry|example\.com|wixpress|domain\.com|noreply@|john@email\.com|robert@broofa\.com|@broofa\.com|@email\.com|@crazygames\.com|@test\.com|@yourdomain|@company\.com/i;

function normalizeUrl(targetUrl) {
  if (!targetUrl) return '';
  let u = String(targetUrl).trim();
  if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
  return u;
}

function fetchText(targetUrl, timeoutMs = 3000, hops = 0) {
  return new Promise((resolve) => {
    if (hops > 3 || timeoutMs < 400) return resolve('');
    try {
      const u = normalizeUrl(targetUrl);
      if (!u) return resolve('');
      const parsed = new URL(u);
      const transport = parsed.protocol === 'https:' ? https : http;
      const req = transport.get(parsed, {
        timeout: timeoutMs,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          try {
            const redirectUrl = new URL(res.headers.location, parsed).toString();
            return fetchText(redirectUrl, timeoutMs - 400, hops + 1).then(resolve);
          } catch (_) { return resolve(''); }
        }
        if (res.statusCode !== 200) { res.resume(); return resolve(''); }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          data += chunk;
          if (data.length > 220000) { res.destroy(); resolve(data); }
        });
        res.on('end', () => resolve(data));
        res.on('error', () => resolve(data || ''));
      });
      req.on('error', () => resolve(''));
      req.on('timeout', () => { req.destroy(); resolve(''); });
    } catch (_) { resolve(''); }
  });
}

function discoverContactSubpages(homeHtml, baseUrl) {
  const candidates = new Set([`${baseUrl}/contact`, `${baseUrl}/contact-us`, `${baseUrl}/about`, `${baseUrl}/doctors`]);
  if (!homeHtml) return Array.from(candidates).slice(0, 4);
  const hrefRe = /href=["']([^"']*(?:contact|reach|about|doctor|team|branch)[^"']*)["']/gi;
  let m;
  while ((m = hrefRe.exec(homeHtml)) !== null) {
    try {
      const abs = new URL(m[1], baseUrl).toString().split('#')[0];
      if (abs.startsWith(baseUrl) && !/\.(pdf|jpg|png|css|js)$/i.test(abs)) {
        candidates.add(abs);
      }
    } catch (_) {}
    if (candidates.size >= 6) break;
  }
  return Array.from(candidates).slice(0, 4);
}

function extractJsonLdSignals(html, signals) {
  const ldRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = ldRe.exec(html)) !== null) {
    try {
      const raw = JSON.parse(m[1]);
      const items = Array.isArray(raw) ? raw : [raw];
      for (const obj of items) {
        if (!obj || typeof obj !== 'object') continue;
        signals.objects.push(obj);
        if (obj.telephone) signals.phones.push(String(obj.telephone));
        if (obj.email) signals.emails.push(String(obj.email).replace(/^mailto:/i, '').trim().toLowerCase());
        const sameAs = Array.isArray(obj.sameAs) ? obj.sameAs : (obj.sameAs ? [obj.sameAs] : []);
        for (const s of sameAs) signals.links.push(String(s));
      }
    } catch (_) {}
  }
}

function matchSocialHandle(html, extraLinksText, regex, ignoredSet) {
  const combined = `${extraLinksText}\n${html}`;
  let m;
  while ((m = regex.exec(combined)) !== null) {
    const handle = String(m[1] || '').replace(/[/?#].*$/, '').trim();
    if (handle && handle.length >= 3 && !ignoredSet.has(handle.toLowerCase())) {
      return handle;
    }
  }
  return '';
}

function parseContactDataFromHtml(html, countryCode = 'IN') {
  if (!html) return null;
  const ldSignals = { phones: [], emails: [], links: [], objects: [] };
  extractJsonLdSignals(html, ldSignals);

  const mailtoMatches = [];
  const mailRe = /href=["']mailto:([^"'?#\s>]+)/gi;
  let mm;
  while ((mm = mailRe.exec(html)) !== null) {
    try { mailtoMatches.push(decodeURIComponent(mm[1]).trim().toLowerCase()); } catch (_) { mailtoMatches.push(mm[1].trim().toLowerCase()); }
  }

  const telMatches = [];
  const telRe = /href=["']tel:([^"'>]+)["']/gi;
  let tm;
  while ((tm = telRe.exec(html)) !== null) {
    try { telMatches.push(decodeURIComponent(tm[1]).trim()); } catch (_) { telMatches.push(tm[1].trim()); }
  }

  const textEmails = (html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,15}/g) || []).map(e => e.toLowerCase());
  const emails = Array.from(new Set([...ldSignals.emails, ...mailtoMatches, ...textEmails]))
    .filter((e) => !IGNORE_EMAIL_RE.test(e) && isValidBusinessEmail(e))
    .slice(0, 6);

  const strippedText = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

  let mobilePhone = null;
  let landlinePhone = null;
  let whatsappLink = null;

  for (const rawTel of [...ldSignals.phones, ...telMatches]) {
    const info = parsePhoneDetails(rawTel, countryCode);
    if (info.mobile && !mobilePhone) {
      mobilePhone = info.mobile;
      whatsappLink = info.whatsappLink;
    } else if (info.landline && !landlinePhone) {
      landlinePhone = info.landline;
    }
  }

  const fromText = extractPhonesFromText(`${strippedText}\n${html.match(/wa\.me\/[^\s"'<>]+|api\.whatsapp\.com[^\s"'<>]+/gi)?.join(' ') || ''}`, countryCode);
  if (!mobilePhone && fromText.mobilePhone) {
    mobilePhone = fromText.mobilePhone;
    whatsappLink = fromText.whatsappLink;
  }
  if (!landlinePhone && fromText.landlinePhone) landlinePhone = fromText.landlinePhone;
  if (!whatsappLink && fromText.whatsappLink) whatsappLink = fromText.whatsappLink;

  let decisionMaker = null;
  for (const obj of ldSignals.objects || []) {
    if (obj['@type'] === 'Person' || obj.founder || obj.director) {
      const p = obj.founder || obj.director || (obj['@type'] === 'Person' ? obj : null);
      if (p && (p.name || typeof p === 'string')) {
        decisionMaker = {
          name: String(p.name || p).trim(),
          title: String(p.jobTitle || 'Founder / Director').trim(),
          source: 'json-ld'
        };
        break;
      }
    }
  }

  if (!decisionMaker) {
    const dmRe = /\b(?:proprietor|founder|co-founder|owner|managing\s+director|director|ceo|principal)\s*(?::|-|–|—|\bis\b)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/i;
    const dmM = strippedText.match(dmRe);
    if (dmM && dmM[1] && dmM[1].length < 35 && !/^(about|contact|our|the|team|services|home|privacy)/i.test(dmM[1])) {
      const titleMatch = dmM[0].match(/\b(proprietor|founder|owner|managing\s+director|director|ceo|principal)\b/i);
      decisionMaker = {
        name: dmM[1].trim(),
        title: titleMatch ? titleMatch[1].toUpperCase() : 'Owner / Executive',
        source: 'page-text'
      };
    }
  }

  const extraLinksText = ldSignals.links.join('\n');
  const igHandle = matchSocialHandle(html, extraLinksText, /instagram\.com\/([a-zA-Z0-9_.-]+)/gi, IGNORE_IG);
  const fbHandle = matchSocialHandle(html, extraLinksText, /facebook\.com\/([a-zA-Z0-9_.-]+)/gi, IGNORE_FB);
  const liMatch = `${extraLinksText}\n${html}`.match(/linkedin\.com\/((?:company|in)\/[a-zA-Z0-9_.-]+)/i);
  const twMatch = `${extraLinksText}\n${html}`.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]{2,})/i);
  const ytMatch = `${extraLinksText}\n${html}`.match(/youtube\.com\/(?:@|channel\/|c\/)([a-zA-Z0-9_.-]+)/i);

  return {
    emails,
    mobilePhone,
    landlinePhone,
    whatsappLink,
    decisionMaker,
    instagram: igHandle ? sanitizeSocialUrl(`https://instagram.com/${igHandle}`, 'instagram') || null : null,
    facebook: fbHandle ? sanitizeSocialUrl(`https://facebook.com/${fbHandle}`, 'facebook') || null : null,
    linkedin: liMatch ? sanitizeSocialUrl(`https://linkedin.com/${liMatch[1]}`, 'linkedin') || null : null,
    twitter: twMatch && !['intent', 'share', 'home'].includes(twMatch[1].toLowerCase()) ? sanitizeSocialUrl(`https://x.com/${twMatch[1]}`, 'twitter') || null : null,
    youtube: ytMatch ? sanitizeSocialUrl(`https://youtube.com/@${ytMatch[1]}`, 'youtube') || null : null
  };
}

async function mergeParsedContacts(lead, parsed, countryCode) {
  let changed = false;
  if (!parsed) return false;
  if (parsed.emails?.length > 0) {
    const siteHost = getRegistrableDomain(lead.website || '');
    const checked = [];
    for (const em of parsed.emails) {
      if (!isValidBusinessEmail(em)) continue;
      const mx = await checkDomainMx(em);
      if (mx === false) continue;
      checked.push({ email: em.toLowerCase(), verified: mx === true, sameDomain: Boolean(siteHost && em.toLowerCase().endsWith(siteHost)) });
    }
    checked.sort((a, b) => Number(b.sameDomain) - Number(a.sameDomain) || Number(b.verified) - Number(a.verified));
    const orderedEmails = checked.map((x) => x.email);
    const mergedEmails = Array.from(new Set([...(lead.emails || []).filter(isValidBusinessEmail), ...orderedEmails]));
    if (orderedEmails.length > 0 && (!lead.email || !isValidBusinessEmail(lead.email) || mergedEmails.length > (lead.emails?.length || 0))) {
      if (!lead.email || !isValidBusinessEmail(lead.email) || (checked[0].sameDomain && !lead.email.endsWith(siteHost))) {
        lead.email = checked[0].email;
        if (checked[0].verified) lead.emailVerified = true;
      }
      lead.emails = mergedEmails;
      changed = true;
    }
  }
  if (parsed.mobilePhone && !lead.mobilePhone) {
    const d10 = parsed.mobilePhone.replace(/\D/g, '').slice(-10);
    if (!BLACKLISTED_PHONES.has(d10)) {
      lead.mobilePhone = parsed.mobilePhone;
      if (!lead.phone) lead.phone = countryCode === 'IN' ? `+91 ${d10.slice(0, 5)} ${d10.slice(5)}` : parsed.mobilePhone;
      lead.isMobile = true;
      lead.verified = true;
      lead.whatsappAvailable = true;
      lead.whatsappLink = parsed.whatsappLink || `https://wa.me/${parsed.mobilePhone.replace(/\D/g, '')}`;
      changed = true;
    }
  }
  if (parsed.landlinePhone && !lead.landlinePhone) {
    lead.landlinePhone = parsed.landlinePhone;
    if (!lead.phone) lead.phone = parsed.landlinePhone;
    lead.isLandline = true;
    changed = true;
  }
  if (parsed.whatsappLink && !lead.whatsappLink) {
    lead.whatsappLink = parsed.whatsappLink;
    lead.whatsappAvailable = true;
    changed = true;
  }
  if (parsed.decisionMaker && !lead.decisionMaker) {
    lead.decisionMaker = parsed.decisionMaker;
    changed = true;
  }
  for (const field of ['instagram', 'facebook', 'linkedin', 'twitter', 'youtube']) {
    if (parsed[field] && !lead[field]) {
      lead[field] = parsed[field];
      changed = true;
    }
  }
  return changed;
}

async function extractDeepBusinessContacts(lead, countryCode = 'IN') {
  if (!lead || !lead.website) return false;
  const baseUrl = normalizeUrl(lead.website).replace(/\/$/, '');
  let changed = false;

  try {
    const homeHtml = await fetchText(baseUrl, 2800);
    const subPages = discoverContactSubpages(homeHtml, baseUrl);
    const subHtmls = await Promise.all(subPages.map((u) => fetchText(u, 2200).catch(() => '')));
    const combinedHtml = [homeHtml, ...subHtmls].filter(Boolean).join('\n');
    if (combinedHtml.trim()) {
      const parsed = parseContactDataFromHtml(combinedHtml, countryCode);
      if (await mergeParsedContacts(lead, parsed, countryCode)) changed = true;
    }
  } catch (_) {}

  if (!lead.email || !lead.mobilePhone || !lead.instagram || !lead.facebook) {
    try {
      const tlsRes = await crawlWebsiteContactsTls(baseUrl, 3);
      if (tlsRes) {
        const phoneJoined = Array.isArray(tlsRes.phones) ? tlsRes.phones.join(' , ') : '';
        const phoneInfo = extractPhonesFromText(phoneJoined, countryCode);
        const adapted = {
          emails: tlsRes.emails || [],
          mobilePhone: phoneInfo.mobilePhone || null,
          landlinePhone: phoneInfo.landlinePhone || null,
          whatsappLink: tlsRes.whatsapp || phoneInfo.whatsappLink || null,
          instagram: tlsRes.socials?.instagram || null,
          facebook: tlsRes.socials?.facebook || null,
          linkedin: tlsRes.socials?.linkedin || null,
          twitter: tlsRes.socials?.twitter || null,
          youtube: tlsRes.socials?.youtube || null
        };
        if (await mergeParsedContacts(lead, adapted, countryCode)) changed = true;
      }
    } catch (_) {}
  }

  return changed;
}

module.exports = { extractDeepBusinessContacts, parseContactDataFromHtml, normalizeUrl };
