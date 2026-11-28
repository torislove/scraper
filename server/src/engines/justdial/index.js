'use strict';

/**
 * engines/justdial/index.js
 * Ultra-Fast Native HTTP JustDial Wave-1 + Wave-2 Directory Engine.
 * Direct mobile JSON API (m.justdial.com), zero Chromium overhead, ~0 MB extra RAM.
 * Extracts verified 10-digit mobile numbers, STD landlines, GPS coordinates, and ratings.
 */

const https = require('https');
const http = require('http');
const { normalizeLead } = require('../contract');
const { parsePhoneDetails } = require('../phoneUtils');
const { justdialSemaphore, sharedHttpsAgent, localHttpAgent } = require('../../services/concurrency');

const EMPTY_JD_CACHE = new Map(); // cacheKey -> expiresAt
const EMPTY_JD_TTL_MS = 10 * 60 * 1000;

const DEVICE_ID = '59e8afb06077a1793194377810Fgs4xk4vux6lnhiElsq4Bu33nFnp4E4wrACo';
const SUGGEST_URL = 'https://www.justdial.com/webmain/ftxt.php';
const RESULTS_URL = 'https://m.justdial.com/verticals/hotel/searchziva?source=2';

const BLOCKED_NUMBERS = new Set(['+919967462575', '+919925252525', '+918124222266', '+918888888888', '+919999999999', '+911141444444']);

function httpsPost(url, postBody) {
  return justdialSemaphore.run(() => new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = https.request({
        hostname: u.hostname,
        port: 443,
        path: `${u.pathname}${u.search}`,
        method: 'POST',
        agent: sharedHttpsAgent,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postBody),
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
        },
        timeout: 6500
      }, (res) => {
        let d = '';
        res.on('data', chunk => { d += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(d));
          } catch (_) {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.write(postBody);
      req.end();
    } catch (_) {
      resolve(null);
    }
  }));
}

function httpsGet(url) {
  return new Promise((resolve) => {
    try {
      https.get(url, { agent: sharedHttpsAgent, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://www.justdial.com/' }, timeout: 5500 }, (res) => {
        let d = ''; res.on('data', chunk => { d += chunk; });
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch (_) { resolve(null); } });
      }).on('error', () => resolve(null));
    } catch (_) { resolve(null); }
  });
}

const NCAT_CACHE = new Map();

async function lookupSingleNcatId(cleanCat, cleanCity) {
  const cacheKey = `${cleanCity.toLowerCase()}::${cleanCat.toLowerCase()}`;
  if (NCAT_CACHE.has(cacheKey)) return NCAT_CACHE.get(cacheKey);

  const params = new URLSearchParams({
    source: '77',
    wap: '77',
    version: '2.9',
    user: '1',
    search: cleanCat,
    city: cleanCity,
    deviceId: DEVICE_ID,
    freetext: '1',
    case: 'auto_search',
    format: '1'
  });

  const data = await httpsGet(`${SUGGEST_URL}?${params.toString()}`);
  if (!data || !Array.isArray(data.results)) {
    NCAT_CACHE.set(cacheKey, null);
    return null;
  }

  const valid = data.results.find(r => r && r.id && (r.type === 1 || r.ncatid));
  const resolved = valid ? Number(valid.id || valid.ncatid) : null;
  NCAT_CACHE.set(cacheKey, resolved);
  return resolved;
}

async function lookupNcatId(category, city) {
  const cleanCat = String(category || '').replace(/\s+in\s+.*$/i, '').trim();
  const cleanCity = String(city || '').trim();
  if (!cleanCat || !cleanCity) return null;

  const direct = await lookupSingleNcatId(cleanCat, cleanCity);
  if (direct) return direct;

  // Compound phrase fallback ("Dentists & Dental Hospitals" -> "Dentists" / "Dental Hospitals", "Water Tank & Sump Cleaning" -> "Water Tank Cleaning")
  const parts = cleanCat.split(/\s*(?:&|\/|\band\b|,)\s*/i).map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.toLowerCase() === cleanCat.toLowerCase()) continue;
    const hit = await lookupSingleNcatId(part, cleanCity);
    if (hit) return hit;
  }
  const headWords = cleanCat.split(/\s+/).filter((w) => w.length >= 4);
  if (headWords.length >= 2) {
    const shortHit = await lookupSingleNcatId(headWords.slice(0, 2).join(' '), cleanCity);
    if (shortHit) return shortHit;
  }
  return null;
}

async function prewarmNcatIds(categories = [], city = '') {
  const expanded = [];
  for (const c of categories) {
    const clean = String(c || '').trim();
    if (!clean) continue;
    expanded.push(clean);
    for (const part of clean.split(/\s*(?:&|\/|\band\b|,)\s*/i)) {
      if (part.trim()) expanded.push(part.trim());
    }
  }
  const unique = Array.from(new Set(expanded));
  await Promise.all(unique.map((cat) => lookupNcatId(cat, city).catch(() => null)));
}

function extractAllJdPhones(row) {
  const r23 = row[23] && typeof row[23] === 'object' ? row[23] : {};
  const r51 = row[51] && typeof row[51] === 'object' ? row[51] : {};
  const rawChunks = [row[15], r23.m, r23.t, r23.l, r51.contactdial, r51.contactdisplay]
    .filter(Boolean)
    .flatMap((v) => String(v).split(/[,\n;|/]+/));

  let mobile = '';
  let landline = '';
  let primary = '';
  let waLink = '';
  const allPhones = [];
  const seenDigits = new Set();

  for (const cand of rawChunks) {
    const clean = cand.replace(/^tel:/i, '').trim();
    if (!clean || clean.length < 7) continue;
    const info = parsePhoneDetails(clean, 'IN');
    if (BLOCKED_NUMBERS.has(info.mobile) || BLOCKED_NUMBERS.has(info.primary)) continue;
    const key = (info.mobile || info.primary || clean).replace(/\D/g, '').slice(-10);
    if (!key || seenDigits.has(key)) continue;
    seenDigits.add(key);

    if (info.primary) allPhones.push(info.primary);
    if (!primary && info.primary) primary = info.primary;
    if (info.isMobile && !mobile) {
      mobile = info.mobile || info.primary;
      primary = info.primary || info.mobile;
      waLink = info.whatsappLink;
    } else if (info.isLandline && !landline) {
      landline = info.landline || info.primary;
    }
  }
  return { primary, mobile, landline, waLink, allPhones };
}

function parseJustdialRow(row, city, category) {
  if (!Array.isArray(row) || row.length < 16) return null;
  const name = String(row[1] || '').trim();
  if (!name || name.length < 3 || /^(results|sponsored|top results)$/i.test(name)) return null;

  const { primary, mobile, landline, waLink, allPhones } = extractAllJdPhones(row);
  const address = String(row[3] || '').trim();
  const area = String(row[12] || '').trim();

  const rawSite = [row[28], row[36], row[51]?.website, row[51]?.url].find((u) => typeof u === 'string' && /^https?:\/\//i.test(u) && !/justdial\.com/i.test(u)) || '';

  return normalizeLead({
    name,
    phone: primary,
    mobilePhone: mobile,
    landlinePhone: landline,
    phones: allPhones,
    isMobile: Boolean(mobile),
    isLandline: Boolean(landline && !mobile),
    whatsappAvailable: Boolean(waLink || mobile),
    whatsappLink: waLink,
    website: rawSite,
    address: address ? `${address}, ${city}` : `${area}, ${city}`,
    locality: area || city,
    city: city,
    country: 'IN',
    lat: Number(row[4]) || null,
    lng: Number(row[5]) || null,
    rating: Number(row[7]) || null,
    reviewsCount: Number(row[16] || row[20]) || null,
    logo: typeof row[19] === 'string' && row[19].startsWith('http') ? row[19] : '',
    category: String(row[14] || '').trim(),
    matchedSubcategory: String(category || '').trim(),
    source: 'justdial_turbo',
    verified: Boolean(mobile || primary)
  }, 'justdial_turbo');
}

const JD_SIDECAR = new URL(process.env.TLS_SIDECAR_URL || 'http://127.0.0.1:5003');
function fetchJustdialWebFallback({ category, city, maxPages = 3 }) {
  return new Promise((resolve) => {
    try {
      const data = JSON.stringify({ category, city, maxPages });
      const req = http.request({
        hostname: JD_SIDECAR.hostname,
        port: Number(JD_SIDECAR.port) || 5003,
        path: '/scrape/justdial',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        timeout: 12000
      }, (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => { try { resolve(JSON.parse(body)?.leads || []); } catch (_) { resolve([]); } });
      });
      req.on('error', () => resolve([]));
      req.on('timeout', () => { req.destroy(); resolve([]); });
      req.write(data);
      req.end();
    } catch (_) { resolve([]); }
  });
}

async function lookupBusinessInJustdial(name, area = '', city = '') {
  if (!name || !city) return null;
  const cleanName = String(name).replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  const body = `action=result&ncatid=&ccode=in&searchcity=${encodeURIComponent(city)}&search=${encodeURIComponent(cleanName)}&source=2&pn=1`;
  const data = await httpsPost(RESULTS_URL, body);
  const rows = data?.getResultData?.results?.data || [];
  const normTarget = cleanName.toLowerCase();
  const firstWord = normTarget.split(/\s+/).find((w) => w.length >= 3) || normTarget;
  for (const row of rows.slice(0, 4)) {
    const rName = String(row?.[1] || '').toLowerCase();
    if (!rName.includes(firstWord)) continue;
    const { primary, mobile, landline, waLink } = extractAllJdPhones(row);
    if (mobile || landline || primary) {
      return {
        phone: primary || mobile || landline,
        mobilePhone: mobile || '',
        landlinePhone: landline || '',
        whatsappLink: waLink || '',
        rating: Number(row[7]) || null,
        reviewsCount: Number(row[16] || row[20]) || null
      };
    }
  }
  return null;
}

function fetchJustdialDesktopSsrRows({ category, city, zoneName = '', ncatid }) {
  if (!ncatid || !city) return Promise.resolve([]);
  const toSlug = (s) => String(s || '').trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const citySlug = toSlug(city);
  const catSlug = toSlug(category || 'Services');
  const areaSlug = toSlug(zoneName);
  const urlPath = areaSlug && areaSlug.toLowerCase() !== citySlug.toLowerCase()
    ? `https://www.justdial.com/${citySlug}/${catSlug}-in-${areaSlug}/nct-${ncatid}`
    : `https://www.justdial.com/${citySlug}/${catSlug}/nct-${ncatid}`;

  return justdialSemaphore.run(() => new Promise((resolve) => {
    try {
      const payload = JSON.stringify({ url: urlPath, timeout: 6 });
      const req = http.request({
        hostname: JD_SIDECAR.hostname,
        port: Number(JD_SIDECAR.port) || 5003,
        path: '/fetch',
        method: 'POST',
        agent: localHttpAgent,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        timeout: 7500
      }, (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const html = parsed?.text || parsed?.html || '';
            const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
            if (!m) return resolve([]);
            const nd = JSON.parse(m[1]);
            resolve(nd?.props?.pageProps?.listData?.results?.data || []);
          } catch (_) {
            resolve([]);
          }
        });
      });
      req.on('error', () => resolve([]));
      req.on('timeout', () => { req.destroy(); resolve([]); });
      req.write(payload);
      req.end();
    } catch (_) {
      resolve([]);
    }
  }));
}

async function scrapeJustdialTurbo({ category, city, zones = [], onLead, signal }) {
  if (signal?.aborted) return { success: false, leads: [] };

  const ncatid = await lookupNcatId(category, city);
  if (!ncatid) {
    const fallbackRows = await fetchJustdialWebFallback({ category, city, maxPages: 3 });
    const fbLeads = fallbackRows.map((r) => normalizeLead(r, 'justdial_tls')).filter(Boolean);
    if (typeof onLead === 'function') fbLeads.forEach((l) => onLead(l));
    return { success: fbLeads.length > 0, count: fbLeads.length, leads: fbLeads };
  }

  const seenKeys = new Set();
  const leads = [];

  const ingestRows = (rows) => {
    let added = 0;
    for (const row of rows || []) {
      if (signal?.aborted) break;
      const lead = parseJustdialRow(row, city, category);
      if (!lead) continue;
      const key = `${lead.name.toLowerCase()}_${(lead.mobilePhone || lead.phone || '').replace(/\D/g, '')}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      added++;
      leads.push(lead);
      if (typeof onLead === 'function') onLead(lead);
    }
    return added;
  };

  // Wave 1: City-wide burst (stops immediately once JustDial starts repeating pages)
  for (let pn = 1; pn <= 20; pn += 5) {
    if (signal?.aborted) break;
    let newInBatch = 0;
    await Promise.all([pn, pn + 1, pn + 2, pn + 3, pn + 4].map(async (pageNo) => {
      if (signal?.aborted || pageNo > 20) return;
      const body = `action=result&ncatid=${ncatid}&ccode=in&searchcity=${encodeURIComponent(city)}&source=2&pn=${pageNo}`;
      const data = await httpsPost(RESULTS_URL, body);
      newInBatch += ingestRows(data?.getResultData?.results?.data || []);
    }));
    if (newInBatch === 0) break;
  }

  // Wave 1b: Desktop SSR city page booster
  if (!signal?.aborted) {
    const ssrRows = await fetchJustdialDesktopSsrRows({ category, city, ncatid });
    ingestRows(ssrRows);
  }

  return { success: true, count: leads.length, leads };
}

async function scrapeJustdialSingleZone({ category, city = '', zoneName = '', zone = null, zoneIndex = 0, subcategories = [], onLead, signal }) {
  if (signal?.aborted) return [];
  const queries = Array.from(new Set([category, ...(subcategories || [])].map((s) => String(s || '').trim()).filter(Boolean)));
  await prewarmNcatIds(queries, city);

  const lat = Number(zone?.lat);
  const lng = Number(zone?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
  const geoSuffix = hasCoords ? `&lat=${lat}&lng=${lng}&median_latitude=${lat}&median_longitude=${lng}` : '';

  const leads = [];
  const seen = new Set();
  const seenNcats = new Set();

  const emitRow = (row, cat) => {
    const lead = parseJustdialRow(row, city, cat);
    if (!lead) return false;
    const key = `${lead.name.toLowerCase()}_${(lead.mobilePhone || lead.phone || '').replace(/\D/g, '')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    leads.push(lead);
    if (typeof onLead === 'function') onLead(lead);
    return true;
  };

  // Sweep unique sub-category ncatids in this geo-pinned zone with duplicate-page early stop
  for (let i = 0; i < queries.length; i += 4) {
    if (signal?.aborted) break;
    const batch = queries.slice(i, i + 4);
    await Promise.all(
      batch.map(async (cat, bIdx) => {
        if (signal?.aborted) return;
        const ncatid = await lookupNcatId(cat, city);
        const dedupeTag = ncatid ? `ncat:${ncatid}` : `ft:${cat.toLowerCase()}`;
        if (seenNcats.has(dedupeTag)) return;
        seenNcats.add(dedupeTag);

        const emptyKey = `${city.toLowerCase()}::${zoneName.toLowerCase()}::${dedupeTag}`;
        if ((EMPTY_JD_CACHE.get(emptyKey) || 0) > Date.now()) return;

        // Desktop SSR area booster for top 24 commercial hubs on primary category
        if (i === 0 && bIdx === 0 && zoneIndex < 24 && ncatid && zoneName) {
          const ssrRows = await fetchJustdialDesktopSsrRows({ category: cat, city, zoneName, ncatid });
          for (const row of ssrRows) emitRow(row, cat);
        }

        const maxPages = ncatid ? 12 : 4;
        let totalCatRows = 0;
        for (let pn = 1; pn <= maxPages; pn += 4) {
          if (signal?.aborted) break;
          const wave = [pn, pn + 1, pn + 2, pn + 3].filter((p) => p <= maxPages);
          let waveRows = 0;
          let waveNew = 0;
          await Promise.all(
            wave.map(async (pageNo) => {
              if (signal?.aborted) return;
              const body = ncatid
                ? `action=result&ncatid=${ncatid}&ccode=in&searchcity=${encodeURIComponent(city)}&areaname=${encodeURIComponent(zoneName)}${geoSuffix}&source=2&pn=${pageNo}`
                : `action=result&ncatid=&ccode=in&searchcity=${encodeURIComponent(city)}&search=${encodeURIComponent(cat)}&areaname=${encodeURIComponent(zoneName)}${geoSuffix}&source=2&pn=${pageNo}`;
              const data = await httpsPost(RESULTS_URL, body);
              const rows = data?.getResultData?.results?.data || [];
              waveRows += rows.length;
              totalCatRows += rows.length;
              for (const row of rows) {
                if (emitRow(row, cat)) waveNew++;
              }
            })
          );
          if (waveRows === 0 || waveNew === 0) break;
        }
        if (totalCatRows === 0) EMPTY_JD_CACHE.set(emptyKey, Date.now() + EMPTY_JD_TTL_MS);
      })
    );
  }
  return leads;
}

module.exports = {
  scrapeJustdialTurbo,
  scrapeJustdialSingleZone,
  lookupNcatId,
  prewarmNcatIds,
  lookupBusinessInJustdial,
  parseJustdialRow
};
