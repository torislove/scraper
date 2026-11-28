'use strict';

/**
 * engines/socialDork/index.js
 * High-Speed Zero-Browser Multi-Platform Social Hunter (Instagram, Facebook & LinkedIn).
 * Uses Bing + Yahoo + TLS Sidecar with Bing ck/a & Yahoo RU base64 unwrapping (zero DDG deadlocks).
 */

const { normalizeLead } = require('../contract');
const { extractPhonesFromText, parsePhoneDetails } = require('../phoneUtils');
const { serpSemaphore } = require('../../services/concurrency');
const { isUnsafeLeadOrUrl, isValidBusinessEmail, SPAM_ARTICLE_TITLE_RE } = require('../../taxonomy/safetyFilter');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const BLOCKED_NOISE_RE = /\b(porn|xnxx|xvideos|xhamster|pornhub|eporner|pornmd|erotictube|fuckedtube|iwank|porzo|rat\.xxx|suhag\s*rat|suhagraat|sex\s*videos?|hot\s*sex|xxx|rotten\s*tomatoes|wikipedia\.org|t\.me\/|play\.google\.com|semrush\.com|youtube\.com\/watch|reddit\.com|quora\.com)\b/i;

function unwrapSearchUrl(rawUrl) {
  const s = String(rawUrl || '').replace(/&amp;/gi, '&').trim();
  if (/bing\.com\/ck\/a/i.test(s)) {
    try {
      const enc = new URL(s).searchParams.get('u');
      if (enc && enc.startsWith('a1')) {
        const b64 = enc.slice(2).replace(/-/g, '+').replace(/_/g, '/');
        return Buffer.from(b64, 'base64').toString('utf8');
      }
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

async function searchSocialEngineHtml(query) {
  const bingUrl = `https://www.bing.com/search?adlt=strict&q=${encodeURIComponent(query)}`;
  const yahooUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;

  return serpSemaphore.run(async () => {
    const [bingRes, yahooRes] = await Promise.all([
      fetch(bingUrl, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' }, signal: AbortSignal.timeout(4000) }).then((r) => (r.ok ? r.text() : '')).catch(() => ''),
      fetch(yahooUrl, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' }, signal: AbortSignal.timeout(4000) }).then((r) => (r.ok ? r.text() : '')).catch(() => '')
    ]);
    if (bingRes && bingRes.includes('b_algo')) return bingRes;
    if (yahooRes && yahooRes.includes('compTitle')) return yahooRes;

    try {
      const sidecarBase = (process.env.TLS_SIDECAR_URL || 'http://127.0.0.1:5003').replace(/\/+$/, '');
      const tlsRes = await fetch(`${sidecarBase}/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: bingUrl, timeout: 5 }),
        signal: AbortSignal.timeout(6000)
      });
      const data = tlsRes.ok ? await tlsRes.json() : null;
      if (data?.text && data.text.includes('b_algo')) return data.text;
    } catch (_) {}
    return '';
  });
}

function parseSocialCards(html) {
  const results = [];
  if (!html) return results;

  if (html.includes('b_algo')) {
    const bingBlocks = html.split(/<li\s+class=["']b_algo["']/i);
    for (let i = 1; i < bingBlocks.length; i++) {
      const b = bingBlocks[i];
      const linkMatch = b.match(/<h2>\s*<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      const snipMatch = b.match(/<div class=["']b_caption["'][\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
      if (linkMatch) {
        results.push({
          rawUrl: linkMatch[1],
          title: linkMatch[2].replace(/<[^>]+>/g, '').trim(),
          snippet: snipMatch ? snipMatch[1].replace(/<[^>]+>/g, '').trim() : ''
        });
      }
    }
    return results;
  }

  if (html.includes('compTitle')) {
    const blocks = html.split(/class=["'][^"']*\bcompTitle\b[^"']*["']/i);
    for (let i = 1; i < blocks.length; i++) {
      const b = blocks[i].slice(0, 1800);
      const linkMatch = b.match(/<a[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      const snipMatch = b.match(/class=["'][^"']*\bcompText\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (linkMatch) {
        results.push({
          rawUrl: linkMatch[1],
          title: linkMatch[2].replace(/<[^>]+>/g, '').trim(),
          snippet: snipMatch ? snipMatch[1].replace(/<[^>]+>/g, '').trim() : ''
        });
      }
    }
  }
  return results;
}

function extractInternationalPhone(text, countryCode = 'IN') {
  const res = extractPhonesFromText(text, countryCode);
  const p = res.mobilePhone ? parsePhoneDetails(res.mobilePhone, countryCode) : null;
  return {
    primary: p?.primary || res.mobilePhone || res.landlinePhone || '',
    mobile: res.mobilePhone || '',
    landline: res.landlinePhone || '',
    isMobile: Boolean(res.mobilePhone),
    whatsapp: res.whatsappLink || ''
  };
}

async function scrapeSocialDorks({
  category,
  location,
  countryCode = 'IN',
  onLead,
  signal
}) {
  const baseCity = String(location || '').split(',')[0].trim();
  const platforms = [
    { name: 'Instagram', site: 'instagram.com', field: 'instagram' },
    { name: 'Facebook', site: 'facebook.com', field: 'facebook' },
    { name: 'LinkedIn', site: 'linkedin.com/company', field: 'linkedin' }
  ];

  await Promise.all(
    platforms.map(async (plat) => {
      if (signal?.aborted) return;
      const query = `site:${plat.site} ${category} ${baseCity}`.trim();
      const html = await searchSocialEngineHtml(query);
      if (!html) return;

      const cards = parseSocialCards(html);
      for (const card of cards) {
        if (signal?.aborted) break;
        const { title, rawUrl, snippet } = card;
        if (!title || title.length < 3) continue;
        const targetUrl = unwrapSearchUrl(rawUrl);
        if (BLOCKED_NOISE_RE.test(title) || BLOCKED_NOISE_RE.test(targetUrl) || /bing\.com\/ck\/a/i.test(targetUrl)) continue;

        const cleanName = title
          .split('•')[0]
          .split('|')[0]
          .split('(@')[0]
          .replace(new RegExp(`-\\s*${plat.name}.*`, 'i'), '')
          .trim();

        if (!cleanName || cleanName.length < 3 || /^(home|log in|explore|photos|linkedin)$/i.test(cleanName) || SPAM_ARTICLE_TITLE_RE.test(cleanName)) continue;

        const combinedText = `${title} ${snippet}`;
        const phoneInfo = extractInternationalPhone(combinedText, countryCode);
        const emailMatch = (combinedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,15}/g) || []).find(isValidBusinessEmail);

        let cleanUrl = '';
        if (plat.field === 'linkedin') {
          const lm = targetUrl.match(/linkedin\.com\/((?:company|in)\/[a-zA-Z0-9_.-]+)/i);
          if (lm) cleanUrl = `https://linkedin.com/${lm[1]}`;
        } else {
          const urlMatch = targetUrl.match(new RegExp(`https?://(?:www\\.)?${plat.site}/([a-zA-Z0-9_.-]+)`, 'i'));
          if (urlMatch && !['p', 'reel', 'reels', 'stories', 'explore', 'sharer', 'pages'].includes(urlMatch[1].toLowerCase())) {
            cleanUrl = `https://${plat.site}/${urlMatch[1]}`;
          }
        }
        // Strict authenticity gate: social engine only emits real verified profiles on that social platform
        if (!cleanUrl) continue;
        // Guard against Bing honeypot/unrelated results: require city or category stem in title/snippet/url
        const catStems = String(category || '').toLowerCase().split(/\s+/).filter((w) => w.length >= 4).map((w) => w.slice(0, 5));
        const relevanceText = `${cleanName} ${snippet} ${targetUrl}`.toLowerCase();
        if (catStems.length > 0 && !catStems.some((s) => relevanceText.includes(s))) continue;

        const lead = normalizeLead({
          name: cleanName,
          phone: phoneInfo.primary,
          mobilePhone: phoneInfo.mobile,
          landlinePhone: phoneInfo.landline,
          isMobile: phoneInfo.isMobile,
          whatsappAvailable: Boolean(phoneInfo.whatsapp),
          whatsappLink: phoneInfo.whatsapp,
          email: emailMatch ? emailMatch.toLowerCase() : '',
          emails: emailMatch ? [emailMatch.toLowerCase()] : [],
          address: baseCity,
          locality: baseCity,
          city: baseCity,
          country: countryCode,
          category: '',
          matchedSubcategory: category,
          [plat.field]: cleanUrl,
          source: `social_${plat.field}`,
          verified: Boolean(phoneInfo.primary)
        }, `social_${plat.field}`);
        if (isUnsafeLeadOrUrl(lead)) continue;

        if (typeof onLead === 'function') onLead(lead);
      }
    })
  );
}

module.exports = {
  scrapeSocialDorks,
  extractInternationalPhone
};
