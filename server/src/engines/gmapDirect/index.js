'use strict';

/**
 * server/src/engines/gmapDirect/index.js
 * Direct Google Maps `tbm=map` Parallel Paginated Extractor & Single-Place Lookup.
 * Calls Chrome-TLS Python Sidecar (:5003/scrape/gmap & /lookup/gmap-place) to capture
 * paginated cards (offsets 0..100) and all `tel:` / `+91` / `0`-prefixed phones directly.
 */

const http = require('http');
const { normalizeLead } = require('../contract');
const { parsePhoneDetails } = require('../phoneUtils');
const { gmapRpcSemaphore, rescueRpcSemaphore, localHttpAgent } = require('../../services/concurrency');

const SIDECAR_URL = new URL(process.env.TLS_SIDECAR_URL || 'http://127.0.0.1:5003');
function postSidecarJson(pathName, payload, timeoutMs = 12000) {
  return new Promise((resolve) => {
    try {
      const body = JSON.stringify(payload);
      const req = http.request({
        hostname: SIDECAR_URL.hostname,
        port: Number(SIDECAR_URL.port) || 5003,
        path: pathName,
        method: 'POST',
        agent: localHttpAgent,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: timeoutMs
      }, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (_) { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.write(body);
      req.end();
    } catch (_) {
      resolve(null);
    }
  });
}

function classifyAndBuildGmapLead(raw, zone, baseCity, countryCode, matchedCategory) {
  if (!raw || !raw.name || String(raw.businessStatus || '').toUpperCase() === 'CLOSED_PERMANENTLY') return null;
  const cc = String(countryCode || 'IN').toUpperCase();
  const candidates = Array.from(new Set([raw.phone, ...(Array.isArray(raw.phones) ? raw.phones : [])].filter(Boolean)));
  let mobile = '';
  let landline = '';
  let primary = '';
  let waLink = '';
  let mobileVerified = 'No';
  const phonesList = [];

  for (const cand of candidates) {
    const info = parsePhoneDetails(cand, cc);
    if (info.primary) phonesList.push(info.primary);
    if (!primary && info.primary) primary = info.primary;
    if (info.isMobile && !mobile) {
      mobile = info.mobile || info.primary;
      primary = info.primary || info.mobile;
      waLink = info.whatsappLink;
      mobileVerified = 'Yes';
    } else if (info.isLandline && !landline) {
      landline = info.landline || info.primary;
    } else if (info.mobileVerified === 'Unverified' && mobileVerified === 'No') {
      mobileVerified = 'Unverified';
    }
  }

  return normalizeLead({
    name: raw.name,
    phone: primary || raw.phone || '',
    mobilePhone: mobile,
    mobileVerified,
    landlinePhone: landline,
    phones: Array.from(new Set(phonesList)),
    isMobile: Boolean(mobile),
    isLandline: Boolean(landline && !mobile),
    whatsappAvailable: Boolean(waLink || mobile),
    whatsappLink: waLink,
    website: raw.website || '',
    address: raw.address || '',
    locality: raw.locality || '',
    searchZone: zone?.name || '',
    city: baseCity,
    country: cc,
    lat: raw.lat ?? zone?.lat ?? null,
    lng: raw.lng ?? zone?.lng ?? null,
    rating: raw.rating ?? null,
    reviewsCount: raw.reviewsCount ?? null,
    businessStatus: raw.businessStatus || 'OPERATIONAL',
    placeId: raw.placeId || '',
    mapsLink: raw.mapsLink || '',
    category: String(raw.category || '').trim(),
    matchedSubcategory: matchedCategory,
    source: 'gmap_direct_rpc',
    verified: Boolean(mobile || primary)
  }, 'gmap_direct_rpc');
}

async function scrapeDirectGoogleMapsBatch({
  queries = [],
  zone,
  baseCity,
  countryCode = 'IN',
  radius = 12000,
  maxPages = 6,
  secondaryMaxPages = 2,
  concurrency = 6,
  signal,
  onLead
}) {
  if (signal?.aborted || !queries.length) return [];
  const cc = String(countryCode || 'IN').toUpperCase();
  const hasCity = zone?.name?.toLowerCase().includes(String(baseCity || '').toLowerCase());
  const seen = new Set();
  const results = [];

  const cleanQueries = queries.map((q) => String(q || '').trim()).filter(Boolean);
  const step = Math.max(1, Math.min(6, Number(concurrency || 3)));
  for (let i = 0; i < cleanQueries.length; i += step) {
    if (signal?.aborted) break;
    const batch = cleanQueries.slice(i, i + step);
    await Promise.all(batch.map(async (cleanQ, idxInBatch) => {
      if (signal?.aborted) return;
      const qIdx = i + idxInBatch;
      const pagesForQuery = qIdx <= 1 ? maxPages : Math.max(1, Math.min(maxPages, secondaryMaxPages));
      const fullQuery = zone?.name
        ? (hasCity ? `${cleanQ} in ${zone.name}` : `${cleanQ} in ${zone.name}, ${baseCity}`)
        : `${cleanQ} in ${baseCity}`;

      const res = await gmapRpcSemaphore.run(() => {
        if (signal?.aborted) return null;
        return postSidecarJson('/scrape/gmap', {
          query: fullQuery,
          lat: zone?.lat ?? null,
          lng: zone?.lng ?? null,
          radius,
          country: cc,
          maxPages: pagesForQuery
        }, 12000);
      });

      for (const raw of res?.leads || []) {
        if (signal?.aborted) break;
        const lead = classifyAndBuildGmapLead(raw, zone, baseCity, cc, cleanQ);
        if (!lead) continue;
        const key = lead.placeId || `${lead.name.toLowerCase()}::${(lead.mobilePhone || lead.phone || '').replace(/\D/g, '')}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(lead);
        if (typeof onLead === 'function') await onLead(lead);
      }
    }));
  }
  return results;
}

async function lookupPlaceInGoogleMaps({ name, locality = '', city = '', lat = null, lng = null, country = 'IN', placeId = '' }) {
  if (!name && !placeId) return null;
  const res = await rescueRpcSemaphore.run(() =>
    postSidecarJson('/lookup/gmap-place', { name, locality, city, lat, lng, country, placeId }, 7500)
  );
  if (!res?.place) return null;
  return classifyAndBuildGmapLead(res.place, { name: locality, lat, lng }, city, country, res.place.category || '');
}

module.exports = {
  scrapeDirectGoogleMapsBatch,
  lookupPlaceInGoogleMaps
};
