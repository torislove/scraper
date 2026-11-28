'use strict';

/**
 * engines/serp/index.js
 * Zero-Timeout Parallel Deep Web SERP Engine (Bing + Yahoo Search + Base64 Redirect Unwrapping).
 * Replaces JS-blocked Google primp shells and failing DDG calls with high-speed live SERP pagination.
 */

const { normalizeLead } = require('../contract');
const { extractPhonesFromText } = require('../phoneUtils');
const { serpSemaphore } = require('../../services/concurrency');
const { isUnsafeLeadOrUrl, isValidBusinessEmail, SPAM_ARTICLE_TITLE_RE } = require('../../taxonomy/safetyFilter');

const BLOCKED_SERP_RE = /\b(porn|xnxx|xvideos|xhamster|pornhub|eporner|pornmd|erotictube|fuckedtube|iwank|porzo|rat\.xxx|suhag\s*rat|suhagraat|sex\s*videos?|hot\s*sex|xxx|rotten\s*tomatoes|wikipedia|wikimedia|wikihow|britannica|libretexts|engineering\.com|merriam-webster|dictionary\.com|coursera|udemy|edx|khanacademy|geeksforgeeks|tutorialspoint|w3schools|stackoverflow|github\.com|duckduckgo|youtube\.com|play\.google\.com|support\.google\.com|about\.youtube|cricbuzz|zhihu\.com|baidu\.com|answers\.microsoft|t\.me\/|semrush|quora\.com|reddit\.com|indeed\.|glassdoor\.|naukri\.com)\b/i;
const ARTICLE_URL_PATH_RE = /\/(?:wiki|what-is|types-of|kinds-of|definition|glossary|blog|article|articles|news|chapter|lesson|tutorial|course-description|meaning)\b/i;
const ENTITY_HEAD_NOUN_RE = /\b(colleges?|universit\w*|institutes?|polytechnics?|academ(?:y|ies)|schools?|hospitals?|clinics?|cent(?:er|re)s?|doctors?|dentists?|lawyers?|attorneys?|solicitors?|firms?|contractors?|plumbers?|electricians?|services?|companies|co\.|ltd|llp|llc|inc|pvt|restaurants?|hotels?|stores?|shops?|salons?|pharmacies|labs?|agencies?|studios?)\b/i;

function unwrapSerpUrl(rawUrl) {
  const s = String(rawUrl || '').replace(/&amp;/gi, '&').trim();
  if (/bing\.com\/ck\/a/i.test(s)) {
    try {
      const enc = new URL(s).searchParams.get('u');
      if (enc && enc.startsWith('a1')) return Buffer.from(enc.slice(2).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    } catch (_) {}
  }
  if (/r\.search\.yahoo\.com/i.test(s)) {
    const m = s.match(/\/RU=([^/]+)\//i);
    if (m) {
      try { return decodeURIComponent(m[1]); } catch (_) {}
    }
  }
  return s;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

async function fetchBingPage(query, page = 0) {
  const first = page * 10 + 1;
  const url = `https://www.bing.com/search?adlt=strict&q=${encodeURIComponent(query)}&first=${first}`;
  return serpSemaphore.run(async () => {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8' },
        signal: AbortSignal.timeout(4500)
      });
      return res.ok ? await res.text() : '';
    } catch (_) {
      return '';
    }
  });
}

async function fetchYahooPage(query, page = 0) {
  const b = page * 10 + 1;
  const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}&b=${b}`;
  return serpSemaphore.run(async () => {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8' },
        signal: AbortSignal.timeout(4500)
      });
      return res.ok ? await res.text() : '';
    } catch (_) {
      return '';
    }
  });
}

function parseBingCards(html) {
  const items = [];
  if (!html) return items;
  const blocks = html.split(/<li\s+class=["']b_algo["']/i);
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    const linkMatch = b.match(/<h2>\s*<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    const snipMatch = b.match(/<div class=["']b_caption["'][\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    if (!linkMatch) continue;
    const rawUrl = linkMatch[1];
    const title = linkMatch[2].replace(/<[^>]+>/g, '').trim();
    const snippet = snipMatch ? snipMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    if (title && rawUrl && !/bing\.com\/search/i.test(rawUrl)) items.push({ rawUrl, title, snippet });
  }
  return items;
}

function parseYahooCards(html) {
  const items = [];
  if (!html) return items;
  const blocks = html.split(/class=["'][^"']*\bcompTitle\b[^"']*["']/i);
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i].slice(0, 1800);
    const linkMatch = b.match(/<a[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const rawUrl = linkMatch[1];
    const title = linkMatch[2].replace(/<[^>]+>/g, '').trim();
    const snipMatch = b.match(/class=["'][^"']*\bcompText\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const snippet = snipMatch ? snipMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    if (title && rawUrl && !/yahoo\.com\/search/i.test(rawUrl)) items.push({ rawUrl, title, snippet });
  }
  return items;
}

function cardsToLeads(cards, category, city, country) {
  const leads = [];
  const catTokens = String(category || '')
    .toLowerCase()
    .split(/[\s,&/()-]+/)
    .map(w => (w.endsWith('s') && w.length > 4 ? w.slice(0, -1) : w))
    .filter(w => w.length >= 4);
  const cityToken = String(city || '').toLowerCase().trim();

  for (const card of cards) {
    const { title, rawUrl, snippet } = card;
    const realUrl = unwrapSerpUrl(rawUrl);
    if (BLOCKED_SERP_RE.test(realUrl) || BLOCKED_SERP_RE.test(title) || /bing\.com\/ck\/a/i.test(realUrl)) continue;
    // Reject non-ASCII CJK/Cyrillic Bing honeypot pages when searching Latin-script categories/cities
    if (/[\u4e00-\u9fff\u3040-\u30ff]/.test(title)) continue;
    if (SPAM_ARTICLE_TITLE_RE.test(title) || ARTICLE_URL_PATH_RE.test(realUrl)) continue;

    const cleanTitle = title
      .split(' - ')[0]
      .split(' | ')[0]
      .split(' : ')[0]
      .replace(/^Best\s+/i, '')
      .replace(/^Top\s+\d+\s+/i, '')
      .trim();
    if (!cleanTitle || cleanTitle.length < 3 || SPAM_ARTICLE_TITLE_RE.test(cleanTitle)) continue;
    // Reject pure domain-as-title ("Engineering.com") or bare single topic word ("Engineering")
    if (/^[a-z0-9.-]+\.[a-z]{2,5}$/i.test(cleanTitle)) continue;
    if (cleanTitle.split(/\s+/).length === 1 && !ENTITY_HEAD_NOUN_RE.test(cleanTitle)) continue;

    const hay = `${title} ${snippet} ${realUrl}`.toLowerCase();
    const baseCity = String(city || '').split(',')[0].trim();
    const hasCatMatch = catTokens.length === 0 || catTokens.some(t => hay.includes(t));
    const hasCityMatch = !baseCity || hay.includes(baseCity.toLowerCase()) || (cityToken && hay.includes(cityToken));
    const categoryNeedsEntity = ENTITY_HEAD_NOUN_RE.test(String(category || ''));
    const resultHasEntity = ENTITY_HEAD_NOUN_RE.test(`${cleanTitle} ${snippet}`);
    if (!hasCatMatch) continue;
    if (categoryNeedsEntity && !resultHasEntity) continue;

    const text = `${title} ${snippet}`;
    const phoneInfo = extractPhonesFromText(text, country);
    const emailMatches = (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,15}/g) || []).filter(isValidBusinessEmail);
    const email = emailMatches[0] ? emailMatches[0].toLowerCase() : '';

    let website = '';
    try {
      const u = new URL(realUrl.startsWith('//') ? 'https:' + realUrl : realUrl);
      if (!/justdial|indiamart|sulekha|yelp|practo|lybrate|yell\.com|yellowpages|yahoo\.com|bing\.com/i.test(u.hostname)) {
        website = u.origin;
      }
    } catch (_) {}

    const bestPhone = phoneInfo.mobilePhone || phoneInfo.landlinePhone || '';
    // Require local city presence OR verified local phone (blocks global articles & encyclopedias)
    if (!hasCityMatch && !bestPhone) continue;

    const candidate = normalizeLead({
      name: cleanTitle,
      phone: bestPhone,
      mobilePhone: phoneInfo.mobilePhone || '',
      landlinePhone: phoneInfo.landlinePhone || '',
      phones: phoneInfo.phones || [],
      isMobile: Boolean(phoneInfo.mobilePhone),
      isLandline: Boolean(phoneInfo.landlinePhone && !phoneInfo.mobilePhone),
      whatsappAvailable: Boolean(phoneInfo.mobilePhone),
      whatsappLink: phoneInfo.whatsappLink || '',
      email,
      emails: email ? [email] : [],
      website,
      address: `${baseCity || city}, ${country}`,
      locality: baseCity || city,
      city: baseCity || city,
      country,
      category: '',
      matchedSubcategory: category,
      source: 'deep_web_serp',
      verified: Boolean(phoneInfo.mobilePhone)
    }, 'deep_web_serp');
    if (isUnsafeLeadOrUrl(candidate)) continue;
    leads.push(candidate);
  }
  return leads;
}

async function scrapeDeepWebSerp({
  category,
  city,
  country = 'IN',
  maxPages = 2,
  onLead,
  signal
}) {
  const cleanCat = String(category || '').replace(/[&\/]+/g, ' ').replace(/\s+/g, ' ').trim();
  const cc = String(country || 'IN').toUpperCase();
  const dirSites = cc === 'IN'
    ? 'site:indiamart.com OR site:sulekha.com OR site:tradeindia.com'
    : (cc === 'GB') ? 'site:yell.com OR site:checkatrade.com'
    : (cc === 'AU') ? 'site:truelocal.com.au OR site:yellowpages.com.au'
    : (cc === 'AE') ? 'site:yellowpages-uae.com OR site:hidubai.com'
    : 'site:yelp.com OR site:bbb.org';
  const queries = [
    `${cleanCat} ${city} phone contact`,
    `${dirSites} ${cleanCat} ${city}`
  ];

  await Promise.all(
    queries.map(async (query) => {
      for (let page = 0; page < Math.max(1, maxPages); page++) {
        if (signal?.aborted) break;
        const [bingHtml, yahooHtml] = await Promise.all([
          fetchBingPage(query, page),
          fetchYahooPage(query, page)
        ]);
        const cards = [...parseBingCards(bingHtml), ...parseYahooCards(yahooHtml)];
        if (cards.length === 0) break;
        for (const lead of cardsToLeads(cards, category, city, country)) {
          if (signal?.aborted) break;
          if (typeof onLead === 'function') onLead(lead);
        }
      }
    })
  );
}

module.exports = {
  scrapeDeepWebSerp,
  parseBingCards,
  parseYahooCards,
  unwrapSerpUrl
};
