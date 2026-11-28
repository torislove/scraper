'use strict';

/**
 * server/src/geo/geonamesIndex.js
 * Zero-cost offline GeoNames Urban Neighborhood Index (PPLX / PPL / ADM3-4).
 * Lazily extracts & caches compact country JSON into server/db/geonames_<CC>.json
 * so every lookup runs locally in < 2ms with zero API cost or downtime.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { haversineKm } = require('./osmPolygon');

const execFileAsync = promisify(execFile);
const DB_DIR = path.resolve(__dirname, '../../db');

const ALLOWED_FCODES = new Set([
  'PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLC', 'PPLX', 'PPLL', 'ADM3', 'ADM4', 'ADM5'
]);
const TOWN_FCODES = new Set(['PPLA', 'PPLA2', 'PPLA3', 'PPLC']);
const BAD_NAME_RE = /\b(airport|railway|junction|station|reservoir|dam|forest|hill|lake|cemetery)\b/i;

const ramCache = new Map();
const pendingDownloads = new Map();

function getCachePath(cc) {
  return path.join(DB_DIR, `geonames_${cc.toUpperCase()}.json`);
}

function loadCachedCountry(cc) {
  const code = String(cc || 'IN').toUpperCase();
  if (ramCache.has(code)) return ramCache.get(code);
  const fp = getCachePath(code);
  if (!fs.existsSync(fp)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8'));
    if (Array.isArray(parsed)) {
      ramCache.set(code, parsed);
      return parsed;
    }
  } catch (_) {}
  return null;
}

async function buildCountryIndex(cc) {
  const code = String(cc || 'IN').toUpperCase();
  if (ramCache.has(code)) return ramCache.get(code);
  const existing = loadCachedCountry(code);
  if (existing) return existing;

  if (pendingDownloads.has(code)) return pendingDownloads.get(code);

  const job = (async () => {
    const tmpZip = path.join(os.tmpdir(), `gn_${code}_${Date.now()}.zip`);
    const tmpDir = path.join(os.tmpdir(), `gn_${code}_dir_${Date.now()}`);
    try {
      if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 14000);
      const res = await fetch(`https://download.geonames.org/export/dump/${code}.zip`, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'LeadHarvestGeoEngine/2.0' }
      });
      clearTimeout(timer);
      if (!res.ok) return [];

      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(tmpZip, buf);

      if (process.platform === 'win32') {
        await execFileAsync('powershell', [
          '-NoProfile', '-Command',
          `Expand-Archive -Path '${tmpZip}' -DestinationPath '${tmpDir}' -Force`
        ]);
      } else {
        fs.mkdirSync(tmpDir, { recursive: true });
        await execFileAsync('unzip', ['-q', '-o', tmpZip, '-d', tmpDir]);
      }

      const tsvFile = path.join(tmpDir, `${code}.txt`);
      if (!fs.existsSync(tsvFile)) return [];

      const raw = fs.readFileSync(tsvFile, 'utf8');
      const rows = [];
      for (const line of raw.split('\n')) {
        if (!line) continue;
        const c = line.split('\t');
        const fclass = c[6];
        const fcode = c[7];
        if ((fclass !== 'P' && fclass !== 'A') || !ALLOWED_FCODES.has(fcode)) continue;
        const name = (c[1] || c[2] || '').trim();
        if (!name || name.length < 3 || BAD_NAME_RE.test(name)) continue;
        const lat = Math.round(Number(c[4]) * 10000) / 10000;
        const lng = Math.round(Number(c[5]) * 10000) / 10000;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const pop = Number(c[14] || 0);
        // [name, lat, lng, fcode, pop] — ultra-compact disk format
        rows.push([name, lat, lng, fcode, pop]);
      }

      fs.writeFileSync(getCachePath(code), JSON.stringify(rows), 'utf8');
      ramCache.set(code, rows);
      return rows;
    } catch (_) {
      return [];
    } finally {
      try { fs.unlinkSync(tmpZip); } catch (_) {}
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
      pendingDownloads.delete(code);
    }
  })();

  pendingDownloads.set(code, job);
  return job;
}

async function queryNearbyPlaces(countryCode, centerLat, centerLng, radiusKm = 18, { maxWaitMs = 4500 } = {}) {
  const code = String(countryCode || 'IN').toUpperCase();
  let rows = loadCachedCountry(code);
  if (!rows) {
    // Wait up to maxWaitMs for first-time sync; if huge dump takes longer, continue syncing in background
    const race = await Promise.race([
      buildCountryIndex(code),
      new Promise((resolve) => setTimeout(() => resolve(null), maxWaitMs))
    ]);
    rows = Array.isArray(race) ? race : [];
  }

  const degPad = (radiusKm + 6) / 111.0;
  const minLat = centerLat - degPad;
  const maxLat = centerLat + degPad;
  const minLng = centerLng - degPad * 1.4;
  const maxLng = centerLng + degPad * 1.4;

  const wards = [];
  const otherTowns = [];

  for (const r of rows) {
    const [name, lat, lng, fcode, pop] = r;
    if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) continue;
    const dist = haversineKm(centerLat, centerLng, lat, lng);
    if (dist > radiusKm + 5) continue;

    // Separate independent neighboring cities/towns for Voronoi border protection
    if (dist > 4.5 && (pop >= 18000 || TOWN_FCODES.has(fcode)) && fcode !== 'PPLX') {
      otherTowns.push({ name, lat, lng, pop, distKm: dist });
    }
    if (dist <= radiusKm) {
      const weight = fcode === 'PPLX' ? 95 : /^ADM[345]$/.test(fcode) ? 88 : 75;
      wards.push({ name, lat, lng, source: `geonames_${fcode}`, weight });
    }
  }

  return { wards, otherTowns };
}

function findPlaceByName(placeName, countryCode = 'IN') {
  if (!placeName) return null;
  const code = String(countryCode || 'IN').toUpperCase();
  const rows = loadCachedCountry(code);
  if (!rows || !rows.length) return null;

  const target = String(placeName).trim().toLowerCase();
  const targetClean = target.replace(/[^a-z0-9]/g, '');
  if (!targetClean) return null;

  // 1. Exact match
  for (const r of rows) {
    const nameClean = r[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (nameClean === targetClean) {
      return { name: r[0], lat: r[1], lng: r[2], fcode: r[3], pop: r[4] };
    }
  }

  // 2. Starts with / contains match (prefer higher population or ADM)
  let best = null;
  for (const r of rows) {
    const nameLower = r[0].toLowerCase();
    if (nameLower.startsWith(target) || nameLower.includes(target)) {
      if (!best || (r[4] || 0) > (best.pop || 0)) {
        best = { name: r[0], lat: r[1], lng: r[2], fcode: r[3], pop: r[4] };
      }
    }
  }

  return best;
}

module.exports = {
  buildCountryIndex,
  queryNearbyPlaces,
  findPlaceByName
};
