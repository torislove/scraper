'use strict';

/**
 * server/src/taxonomy/safetyFilter.js
 * Zero-Tolerance Enterprise Compliance & Brand-Safety Gate.
 * Blocks all adult/NSFW, escort, gambling, piracy, fake aggregators, and unwrapped Bing tracking URLs
 * across every scrape engine, enricher, journal replay, and CSV export.
 */

const dns = require('dns').promises;

const UNSAFE_TEXT_OR_DOMAIN_RE = new RegExp(
  [
    'porn', 'xnxx', 'xvideos', 'xhamster', 'pornhub', 'eporner', 'pornmd', 'erotictube',
    'fuckedtube', 'iwank', 'porzo', 'redtube', 'youporn', 'spankbang', 'brazzers', 'onlyfans',
    'chaturbate', 'stripchat', 'rat\\.xxx', 'suhag\\s*rat', 'suhagraat', 'sex\\s*videos?',
    'hot\\s*sex', 'desi\\s*sex', 'nude', 'hentai', 'escort', 'call\\s*girl', '1xbet',
    'rotten\\s*tomatoes', 'imdb\\.com', 'wikipedia\\.org', 'wikimedia\\.org', 'wikihow\\.com',
    'play\\.google\\.com', 't\\.me\\/', 'semrush\\.com', 'fucked', 'bing\\.com\\/ck\\/a',
    'britannica\\.com', 'libretexts\\.org', 'merriam-webster\\.com', 'dictionary\\.com',
    'coursera\\.org', 'udemy\\.com', 'edx\\.org', 'khanacademy\\.org', 'byjus\\.com',
    'toppr\\.com', 'vedantu\\.com', 'embibe\\.com', 'geeksforgeeks\\.org', 'tutorialspoint\\.com',
    'w3schools\\.com', 'stackoverflow\\.com', 'github\\.com', 'quora\\.com', 'reddit\\.com',
    'medium\\.com', 'investopedia\\.com', 'webmd\\.com', 'healthline\\.com', 'mayoclinic\\.org',
    'researchgate\\.net', 'academia\\.edu', 'arxiv\\.org', 'jstor\\.org', 'sciencedirect\\.com',
    'springer\\.com', 'indeed\\.', 'glassdoor\\.', 'naukri\\.com', 'reed\\.co\\.uk', 'totaljobs\\.',
    'ziprecruiter\\.com', 'shutterstock\\.com', 'istockphoto\\.com', 'freepik\\.com',
    '\\bengineering\\.com\\b',
    '\\u0938\\u0947\\u0915\\u094d\\u0938', '\\u0938\\u0941\\u0939\\u093e\\u0917'
  ].join('|'),
  'i'
);

const SPAM_ARTICLE_TITLE_RE = /^(?:what\s+(?:is|are)|who\s+(?:is|was|are)|why\s+(?:is|are|do|does)|how\s+(?:to|do|does)|when\s+(?:is|to)|where\s+(?:to|is)|types?\s+of\b|kinds?\s+of\b|definition\s+of\b|meaning\s+of\b|guide\s+to\b|introduction\s+to\b|overview\s+of\b|chapter\s+\d+|lesson\s+\d+|\d+\s*[:.)]\s*(?:what|how|why|types|introduction)|(?:top|best)\s+\d+\b|\d+\s+(?:best|top|types|ways|reasons|facts|examples|tips)\b|list\s+of\b)|\?\s*$|:\s*everything\s+explained\b/i;
const NPM_ASSET_EMAIL_RE = /\.(png|jpe?g|webp|gif|svg|css|js|mjs|ts)$|^(?:react(?:-dom)?|wix-fonts|js-cookie|focus-within-polyfill|gumlet(?:\.js)?|lodash|jquery|webpack|babel|core-js)@|sentry|example\.com|wixpress|domain\.com|^(?:noreply|no-reply|emailaddress)@|john@email\.com|robert@broofa\.com|@broofa\.com|@email\.com|@crazygames\.com|@test\.com|@yourdomain|@company\.com|@eduma\.com|wordpress\.com|squarespace\.com/i;
const JUNK_SOCIAL_URL_RE = /(?:facebook\.com\/(?:2008|profile\.php|people|p|sharer\.php|sharer|share\.php|share|wordpresscom|tr|plugins|dialog|groups|events|help|pages|login|recover|watch|pg)(?:\/|\?|$)|instagram\.com\/(?:p|reel|reels|stories|explore|accounts|about|legal|o1)(?:\/|\?|$)|youtube\.com\/watch\b|youtu\.be\/|(?:twitter|x)\.com\/(?:intent|share|home)(?:\/|\?|$))/i;
const SHARED_DIRECTORY_HOSTS = new Set([
  'facebook.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'x.com', 'twitter.com',
  'justdial.com', 'indiamart.com', 'sulekha.com', 'yell.com', 'yelp.com', 'yelp.com.au',
  'yellowpages.com', 'yellowpages.ca', 'yellowpages.com.au', 'yellowpages-uae.com', 'connect.ae',
  'linktr.ee', 'trustpilot.com', 'cylex.us.com', 'cylex.co.uk', 'cylex.com.au', 'cylex.ae',
  'freeindex.co.uk', 'bbb.org', 'mapquest.com', 'google.com'
]);

const MX_CACHE = new Map();
const MX_TTL_MS = 24 * 60 * 60 * 1000;

async function checkDomainMx(emailOrDomain) {
  const raw = String(emailOrDomain || '').trim().toLowerCase();
  const domain = raw.includes('@') ? raw.split('@')[1] : raw;
  if (!domain) return false;
  const cached = MX_CACHE.get(domain);
  if (cached && cached.expiresAt > Date.now()) return cached.ok;
  try {
    const records = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, rej) => setTimeout(() => rej(new Error('mx_timeout')), 1400))
    ]);
    const ok = Array.isArray(records) && records.length > 0;
    MX_CACHE.set(domain, { ok, expiresAt: Date.now() + MX_TTL_MS });
    return ok;
  } catch (err) {
    const hardFail = err && (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'NXDOMAIN');
    if (hardFail) {
      MX_CACHE.set(domain, { ok: false, expiresAt: Date.now() + MX_TTL_MS });
      return false;
    }
    return null;
  }
}

function getRegistrableDomain(rawUrlOrHost) {
  if (!rawUrlOrHost) return '';
  try {
    const u = new URL(String(rawUrlOrHost).startsWith('http') ? rawUrlOrHost : `https://${rawUrlOrHost}`);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    return host;
  } catch (_) {
    return '';
  }
}

function isSharedDirectoryHost(rawUrlOrHost) {
  const host = getRegistrableDomain(rawUrlOrHost);
  if (!host) return true;
  if (SHARED_DIRECTORY_HOSTS.has(host)) return true;
  for (const h of SHARED_DIRECTORY_HOSTS) {
    if (host.endsWith(`.${h}`)) return true;
  }
  return false;
}

function sanitizeSocialUrl(rawUrl, platform = '') {
  const u = String(rawUrl || '').trim();
  if (!u || JUNK_SOCIAL_URL_RE.test(u)) return '';
  if (platform === 'facebook' || /facebook\.com\//i.test(u)) {
    const m = u.match(/facebook\.com\/([^/?#]+)/i);
    const h = m ? m[1] : '';
    if (!h || h.length < 3 || /^(?:2008|profile\.php|people|p|sharer(?:\.php)?|share(?:\.php)?|wordpresscom|tr|plugins|dialog|pages)$/i.test(h)) return '';
  }
  if (platform === 'instagram' || /instagram\.com\//i.test(u)) {
    const m = u.match(/instagram\.com\/([^/?#]+)/i);
    const h = m ? m[1] : '';
    if (!h || h.length < 3 || /^(?:p|reel|reels|stories|explore|accounts|o1)$/i.test(h)) return '';
  }
  if (platform === 'youtube' || /youtube\.com\//i.test(u)) {
    const m = u.match(/youtube\.com\/(?:@|channel\/|c\/)?([^/?#]+)/i);
    const h = m ? m[1] : '';
    if (!h || h.length < 3) return '';
    if (/^UC[a-zA-Z0-9_-]{20,}$/.test(h)) return `https://youtube.com/channel/${h}`;
  }
  return u;
}

function isValidBusinessEmail(raw) {
  const email = String(raw || '').trim().toLowerCase();
  if (!email || email.length > 75 || NPM_ASSET_EMAIL_RE.test(email)) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64 || !domain || domain.includes('..')) return false;
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(domain)) return false;
  const labels = domain.split('.');
  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,15}$/.test(tld)) return false;
  if (/^\d+$/.test(labels[0])) return false;
  return true;
}

const NAME_STOPWORDS = new Set([
  'the', 'and', 'of', 'for', 'in', 'at', 'by', 'ltd', 'inc', 'llc', 'pvt', 'limited',
  'corp', 'co', 'company', 'services', 'service', 'center', 'centre', 'group', 'international',
  'engineering', 'college', 'colleges', 'university', 'school', 'schools', 'institute', 'academy',
  'hospital', 'hospitals', 'clinic', 'clinics', 'dental', 'medical', 'plumbing', 'london', 'texas'
]);

function namesMatchLoosely(a, b) {
  const tok = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !NAME_STOPWORDS.has(w));
  const ta = tok(a);
  const tb = new Set(tok(b));
  if (ta.length === 0 || tb.size === 0) return false;
  if (ta.length === 1 && ta[0].length <= 12 && !tb.has(ta[0])) return false;
  let hits = 0;
  for (const w of ta) {
    if (tb.has(w)) hits++;
  }
  return ta.length === 1 ? (hits === 1 && tb.size <= 3) : hits >= Math.min(2, ta.length);
}

function isUnsafeLeadOrUrl(lead) {
  if (!lead) return true;
  if (lead.name && SPAM_ARTICLE_TITLE_RE.test(String(lead.name).trim())) return true;
  const fields = [
    lead.name,
    lead.title,
    lead.website,
    lead.instagram,
    lead.facebook,
    lead.linkedin,
    lead.youtube,
    lead.twitter,
    lead.email
  ];
  for (const val of fields) {
    if (!val) continue;
    if (UNSAFE_TEXT_OR_DOMAIN_RE.test(String(val))) return true;
  }
  return false;
}

module.exports = {
  UNSAFE_TEXT_OR_DOMAIN_RE,
  SPAM_ARTICLE_TITLE_RE,
  JUNK_SOCIAL_URL_RE,
  isValidBusinessEmail,
  checkDomainMx,
  getRegistrableDomain,
  isSharedDirectoryHost,
  sanitizeSocialUrl,
  namesMatchLoosely,
  isUnsafeLeadOrUrl
};
