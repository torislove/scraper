'use strict';

/**
 * engines/sulekha/index.js
 * Sulekha (IN) directory scraper via the TLS sidecar (:5003/fetch).
 * Parses server-rendered business cards: businessName, tel: link, category chip and area.
 */

const http = require('http');
const { normalizeLead } = require('../contract');
const { parsePhoneDetails } = require('../phoneUtils');
const { serpSemaphore, localHttpAgent } = require('../../services/concurrency');

const CARD_RE = /businessId="(\d+)"[^>]*?businessName="([^"]*)"[\s\S]{0,1800}?href="tel:([^"]+)"/g;
const CHIP_RE = /bg-gray-100 inline leading-6 p-1 px-2 py-0 rounded text-gray-600">([^<]{2,60})</g;

function toSlug(s) {
  return String(s || '').toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const SULEKHA_SIDECAR = new URL(process.env.TLS_SIDECAR_URL || 'http://127.0.0.1:5003');
function fetchViaSidecar(url, timeoutMs = 16000) {
  return serpSemaphore.run(() => new Promise((resolve) => {
    try {
      const payload = JSON.stringify({ url, timeout: 8 });
      const req = http.request({
        hostname: SULEKHA_SIDECAR.hostname,
        port: Number(SULEKHA_SIDECAR.port) || 5003,
        path: '/fetch',
        method: 'POST',
        agent: localHttpAgent,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        timeout: timeoutMs
      }, (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          try { const j = JSON.parse(body); resolve(j?.text || j?.html || ''); } catch (_) { resolve(''); }
        });
      });
      req.on('error', () => resolve(''));
      req.on('timeout', () => { req.destroy(); resolve(''); });
      req.write(payload);
      req.end();
    } catch (_) { resolve(''); }
  }));
}

function decodeEntities(s) {
  return String(s || '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
}

function parseSulekhaCards(html, city, queryLabel) {
  const out = [];
  if (!html) return out;
  CARD_RE.lastIndex = 0;
  let m;
  while ((m = CARD_RE.exec(html)) !== null) {
    const name = decodeEntities(m[2]);
    if (!name || name.length < 3) continue;
    const before = html.slice(Math.max(0, m.index - 3500), m.index);
    let chip = '';
    let cm;
    CHIP_RE.lastIndex = 0;
    while ((cm = CHIP_RE.exec(before)) !== null) chip = decodeEntities(cm[1]);
    const areaMatch = before.match(/alt="[^"]*? in ([^",]+), [^"]*"/g);
    let area = '';
    if (areaMatch && areaMatch.length) {
      const last = areaMatch[areaMatch.length - 1].match(/ in ([^",]+),/);
      if (last) area = decodeEntities(last[1]);
    }
    const info = parsePhoneDetails(decodeURIComponent(m[3]), 'IN');
    out.push(normalizeLead({
      name,
      phone: info.primary,
      mobilePhone: info.mobile,
      landlinePhone: info.landline,
      isMobile: info.isMobile,
      isLandline: info.isLandline,
      whatsappAvailable: Boolean(info.whatsappLink),
      whatsappLink: info.whatsappLink,
      address: area ? `${area}, ${city}` : city,
      locality: area || city,
      city,
      country: 'IN',
      category: chip,
      matchedSubcategory: queryLabel,
      source: 'sulekha_directory',
      verified: Boolean(info.primary)
    }, 'sulekha_directory'));
  }
  return out;
}

async function scrapeSulekha({ category, city, maxPages = 5, onLead, signal }) {
  const catSlug = toSlug(category);
  const citySlug = toSlug(city);
  if (!catSlug || !citySlug) return [];
  const seen = new Set();
  const leads = [];
  for (let page = 1; page <= maxPages; page++) {
    if (signal?.aborted) break;
    const url = page === 1
      ? `https://www.sulekha.com/${catSlug}/${citySlug}`
      : `https://www.sulekha.com/${catSlug}/${citySlug}?page=${page}`;
    let html = '';
    for (let attempt = 0; attempt < 4 && !signal?.aborted; attempt++) {
      html = await fetchViaSidecar(url, 9000);
      if (html.includes('businessName=')) break;
      await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
    }
    const cards = parseSulekhaCards(html, city, category);
    let added = 0;
    for (const lead of cards) {
      const key = `${lead.name.toLowerCase()}_${(lead.mobilePhone || lead.phone || '').replace(/\D/g, '')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      added++;
      leads.push(lead);
      if (typeof onLead === 'function') onLead(lead);
    }
    if (added === 0) break;
  }
  return leads;
}

module.exports = { scrapeSulekha, parseSulekhaCards };
