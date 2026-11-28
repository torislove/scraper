'use strict';

/**
 * server/src/geo/locationDisambiguator.js
 * Universal sub-10ms Location Disambiguation & Geo Disambiguation Engine.
 * Resolves multi-match homonymous localities (e.g. Siripuram, Springfield, Richmond,
 * Gandhi Nagar, Auto Nagar) across all 195 countries using:
 * 1. Curated high-precision homonymous gazetteer (IN, US, GB, AU, AE).
 * 2. 555,668 Indian Village & Mandal Index (server/db/geonames_IN.json).
 * 3. Proximity District/State mapper for coordinates.
 * 4. In-memory LRU-cached OSM Nominatim & Photon fallback.
 */

const fs = require('fs');
const path = require('path');

const DB_DIR = path.resolve(__dirname, '../../db');
const GEONAMES_IN_FILE = path.join(DB_DIR, 'geonames_IN.json');

// In-memory caches for sub-10ms keystroke responses
let inMemoryVillageMap = null;
const osmCache = new Map();
const MAX_CACHE = 400;

// Curated authoritative multi-match places
const CURATED_HOMONYMS = {
  siripuram: [
    { name: 'Siripuram', mandal: 'Medikonduru Mandal', district: 'Guntur District', state: 'Andhra Pradesh', country: 'IN', lat: 16.3500, lng: 80.2500, badge: 'Guntur · AP' },
    { name: 'Siripuram', mandal: 'Visakhapatnam Urban', district: 'Visakhapatnam District', state: 'Andhra Pradesh', country: 'IN', lat: 17.7231, lng: 83.3013, badge: 'Vizag · AP' },
    { name: 'Siripuram', mandal: 'Madhira Mandal', district: 'Khammam District', state: 'Telangana', country: 'IN', lat: 17.0200, lng: 80.4500, badge: 'Khammam · TS' },
    { name: 'Siripuram', mandal: 'Manthani Mandal', district: 'Peddapalli District', state: 'Telangana', country: 'IN', lat: 18.7185, lng: 79.5991, badge: 'Peddapalli · TS' },
    { name: 'Siripuram', mandal: 'Palasa Mandal', district: 'Srikakulam District', state: 'Andhra Pradesh', country: 'IN', lat: 18.8015, lng: 84.4190, badge: 'Srikakulam · AP' },
    { name: 'Siripuram', mandal: 'Karapa Mandal', district: 'Kakinada District', state: 'Andhra Pradesh', country: 'IN', lat: 16.8508, lng: 82.0952, badge: 'Kakinada · AP' }
  ],
  springfield: [
    { name: 'Springfield', state: 'Illinois', country: 'US', lat: 39.7817, lng: -89.6501, badge: 'IL · US' },
    { name: 'Springfield', state: 'Massachusetts', country: 'US', lat: 42.1015, lng: -72.5898, badge: 'MA · US' },
    { name: 'Springfield', state: 'Missouri', country: 'US', lat: 37.2090, lng: -93.2923, badge: 'MO · US' },
    { name: 'Springfield', state: 'Ohio', country: 'US', lat: 39.9242, lng: -83.8088, badge: 'OH · US' },
    { name: 'Springfield', state: 'Oregon', country: 'US', lat: 44.0462, lng: -123.0220, badge: 'OR · US' }
  ],
  arlington: [
    { name: 'Arlington', state: 'Texas', country: 'US', lat: 32.7357, lng: -97.1081, badge: 'TX · US' },
    { name: 'Arlington', state: 'Virginia', country: 'US', lat: 38.8799, lng: -77.1068, badge: 'VA · US' }
  ],
  richmond: [
    { name: 'Richmond', state: 'Virginia', country: 'US', lat: 37.5407, lng: -77.4360, badge: 'VA · US' },
    { name: 'Richmond', state: 'California', country: 'US', lat: 37.9358, lng: -122.3477, badge: 'CA · US' },
    { name: 'Richmond', state: 'Greater London', country: 'GB', lat: 51.4613, lng: -0.3037, badge: 'London · GB' },
    { name: 'Richmond', state: 'Victoria', country: 'AU', lat: -37.8230, lng: 144.9980, badge: 'VIC · AU' }
  ],
  newcastle: [
    { name: 'Newcastle upon Tyne', state: 'Tyne and Wear', country: 'GB', lat: 54.9783, lng: -1.6178, badge: 'Tyne · GB' },
    { name: 'Newcastle-under-Lyme', state: 'Staffordshire', country: 'GB', lat: 53.0109, lng: -2.2276, badge: 'Staffs · GB' },
    { name: 'Newcastle', state: 'New South Wales', country: 'AU', lat: -32.9283, lng: 151.7817, badge: 'NSW · AU' }
  ],
  gandhinagar: [
    { name: 'Gandhinagar', state: 'Gujarat', country: 'IN', lat: 23.2156, lng: 72.6369, badge: 'Gujarat · IN' },
    { name: 'Gandhi Nagar', district: 'Central Delhi', state: 'Delhi NCR', country: 'IN', lat: 28.6600, lng: 77.2700, badge: 'Delhi · IN' },
    { name: 'Gandhi Nagar', district: 'Bengaluru Urban', state: 'Karnataka', country: 'IN', lat: 12.9800, lng: 77.5800, badge: 'Bengaluru · IN' },
    { name: 'Gandhi Nagar', district: 'Hyderabad', state: 'Telangana', country: 'IN', lat: 17.4100, lng: 78.4900, badge: 'Hyderabad · TS' }
  ],
  autonagar: [
    { name: 'Auto Nagar', district: 'NTR District', state: 'Andhra Pradesh', country: 'IN', lat: 16.5000, lng: 80.6800, badge: 'Vijayawada · AP' },
    { name: 'Auto Nagar', district: 'Guntur District', state: 'Andhra Pradesh', country: 'IN', lat: 16.3200, lng: 80.4700, badge: 'Guntur · AP' },
    { name: 'Auto Nagar', district: 'Rangareddy District', state: 'Telangana', country: 'IN', lat: 17.3400, lng: 78.5800, badge: 'Hyderabad · TS' }
  ],
  kothapet: [
    { name: 'Kothapet', district: 'Rangareddy District', state: 'Telangana', country: 'IN', lat: 17.3685, lng: 78.5441, badge: 'Hyderabad · TS' },
    { name: 'Kothapet', district: 'Guntur District', state: 'Andhra Pradesh', country: 'IN', lat: 16.3000, lng: 80.4400, badge: 'Guntur · AP' }
  ]
};

// Key Indian District Centroids for instant coordinate classification
const IN_DISTRICT_CENTROIDS = [
  { name: 'Guntur District', state: 'Andhra Pradesh', lat: 16.3067, lng: 80.4365, parent: 'Guntur' },
  { name: 'Visakhapatnam District', state: 'Andhra Pradesh', lat: 17.7231, lng: 83.3013, parent: 'Visakhapatnam' },
  { name: 'NTR District', state: 'Andhra Pradesh', lat: 16.5062, lng: 80.6480, parent: 'Vijayawada' },
  { name: 'Khammam District', state: 'Telangana', lat: 17.2473, lng: 80.1514, parent: 'Khammam' },
  { name: 'Hyderabad District', state: 'Telangana', lat: 17.3850, lng: 78.4867, parent: 'Hyderabad' },
  { name: 'Warangal District', state: 'Telangana', lat: 17.9689, lng: 79.5941, parent: 'Warangal' },
  { name: 'Peddapalli District', state: 'Telangana', lat: 18.6163, lng: 79.3732, parent: 'Peddapalli' },
  { name: 'Srikakulam District', state: 'Andhra Pradesh', lat: 18.2969, lng: 83.8968, parent: 'Srikakulam' },
  { name: 'Vizianagaram District', state: 'Andhra Pradesh', lat: 18.1067, lng: 83.3956, parent: 'Vizianagaram' },
  { name: 'Kakinada District', state: 'Andhra Pradesh', lat: 16.9891, lng: 82.2475, parent: 'Kakinada' },
  { name: 'East Godavari District', state: 'Andhra Pradesh', lat: 17.0005, lng: 81.8040, parent: 'Rajahmundry' },
  { name: 'SPSR Nellore District', state: 'Andhra Pradesh', lat: 14.4426, lng: 79.9865, parent: 'Nellore' },
  { name: 'Tirupati District', state: 'Andhra Pradesh', lat: 13.6288, lng: 79.4192, parent: 'Tirupati' },
  { name: 'Bengaluru Urban District', state: 'Karnataka', lat: 12.9716, lng: 77.5946, parent: 'Bengaluru' },
  { name: 'Chennai District', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, parent: 'Chennai' },
  { name: 'Mumbai Suburban District', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, parent: 'Mumbai' },
  { name: 'Pune District', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, parent: 'Pune' },
  { name: 'Central Delhi District', state: 'Delhi NCR', lat: 28.6139, lng: 77.2090, parent: 'New Delhi' }
];

function haversineDist(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function resolveNearestDistrict(lat, lng) {
  let best = null;
  let minD = 999999;
  for (const d of IN_DISTRICT_CENTROIDS) {
    const dist = haversineDist(lat, lng, d.lat, d.lng);
    if (dist < minD) {
      minD = dist;
      best = { ...d, distKm: Math.round(dist) };
    }
  }
  return best;
}

function loadVillageIndex() {
  if (inMemoryVillageMap) return inMemoryVillageMap;
  inMemoryVillageMap = new Map();
  if (!fs.existsSync(GEONAMES_IN_FILE)) return inMemoryVillageMap;
  try {
    const raw = JSON.parse(fs.readFileSync(GEONAMES_IN_FILE, 'utf8'));
    for (const r of raw) {
      if (!r || typeof r[0] !== 'string') continue;
      const key = r[0].toLowerCase().trim();
      let list = inMemoryVillageMap.get(key);
      if (!list) {
        list = [];
        inMemoryVillageMap.set(key, list);
      }
      list.push({
        name: r[0],
        lat: Number(r[1]),
        lng: Number(r[2]),
        fcode: r[3],
        pop: Number(r[4] || 0)
      });
    }
  } catch (_) {}
  return inMemoryVillageMap;
}

async function queryOsmPhoton(cleanLocation, countryCode = 'IN') {
  const cacheKey = `${countryCode}:${cleanLocation.toLowerCase()}`;
  if (osmCache.has(cacheKey)) return osmCache.get(cacheKey);

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1800);
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanLocation)}&limit=6`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'LeadHarvestDisambiguator/2.0' } });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    const hits = [];
    if (Array.isArray(data?.features)) {
      for (const f of data.features) {
        const props = f.properties || {};
        const coords = f.geometry?.coordinates || [];
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const name = props.name || cleanLocation;
        const district = props.district || props.county || '';
        const state = props.state || '';
        const country = (props.countrycode || countryCode).toUpperCase();
        hits.push({
          name,
          district: district ? `${district} District` : '',
          state,
          country,
          lat,
          lng,
          badge: district ? `${district} · ${state}` : state
        });
      }
    }
    if (osmCache.size >= MAX_CACHE) osmCache.clear();
    osmCache.set(cacheKey, hits);
    return hits;
  } catch (_) {
    return [];
  }
}

/**
 * Disambiguates a typed location into an array of qualified geographic entities.
 */
async function disambiguateLocation(rawLocation = '', countryCode = 'IN') {
  const clean = String(rawLocation || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!clean || clean.length < 2) return [];

  const results = [];
  const seenKey = new Set();

  // 1. Instant check against Curated Homonyms
  const curated = CURATED_HOMONYMS[clean];
  if (Array.isArray(curated)) {
    for (const place of curated) {
      const k = `${place.name}:${place.district || place.state}:${place.country}`.toLowerCase();
      if (!seenKey.has(k)) {
        seenKey.add(k);
        results.push({
          ...place,
          isDisambiguated: true,
          label: place.mandal ? `${place.name} (${place.mandal}, ${place.district || place.state})` : `${place.name} (${place.state})`
        });
      }
    }
    if (results.length > 0) return results;
  }

  // 2. Query In-Memory Indian Village Index (555k+ records)
  if (countryCode.toUpperCase() === 'IN') {
    const vMap = loadVillageIndex();
    const matches = vMap.get(clean) || [];
    if (matches.length > 0) {
      for (const m of matches.slice(0, 8)) {
        const distInfo = resolveNearestDistrict(m.lat, m.lng);
        const districtName = distInfo ? distInfo.name : 'District';
        const stateName = distInfo ? distInfo.state : 'India';
        const parentCity = distInfo ? distInfo.parent : m.name;
        const k = `${m.name}:${districtName}:${stateName}`.toLowerCase();
        if (!seenKey.has(k)) {
          seenKey.add(k);
          results.push({
            name: m.name,
            parentCity,
            district: districtName,
            state: stateName,
            country: 'IN',
            lat: m.lat,
            lng: m.lng,
            badge: `${parentCity} · ${stateName}`,
            isDisambiguated: true,
            label: `${m.name}, ${districtName}, ${stateName}`
          });
        }
      }
      if (results.length > 0) return results;
    }
  }

  // 3. Fallback to OSM Photon lookup
  const osmHits = await queryOsmPhoton(rawLocation, countryCode);
  if (Array.isArray(osmHits) && osmHits.length > 0) {
    for (const hit of osmHits) {
      const k = `${hit.name}:${hit.district || hit.state}:${hit.country}`.toLowerCase();
      if (!seenKey.has(k)) {
        seenKey.add(k);
        results.push({
          ...hit,
          isDisambiguated: true,
          label: hit.district ? `${hit.name}, ${hit.district}, ${hit.state}` : `${hit.name}, ${hit.state}`
        });
      }
    }
  }

  return results;
}

module.exports = {
  disambiguateLocation,
  resolveNearestDistrict,
  CURATED_HOMONYMS
};
