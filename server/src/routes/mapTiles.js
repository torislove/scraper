'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { DATA_DIR } = require('../config/paths');

const router = express.Router();
const TILE_CACHE_DIR = path.join(DATA_DIR, 'tile-cache');

const STYLE_TEMPLATES = {
  voyager: [
    (z, x, y) => `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
    (z, x, y) => `https://b.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
    (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
  ],
  osm: [
    (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    (z, x, y) => `https://b.tile.openstreetmap.org/${z}/${x}/${y}.png`
  ],
  streets: [
    (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`,
    (z, x, y) => `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`
  ],
  satellite: [
    (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
  ],
  labels: [
    (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${z}/${y}/${x}`
  ],
  light: [
    (z, x, y) => `https://a.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`,
    (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${z}/${y}/${x}`
  ],
  dark: [
    (z, x, y) => `https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`,
    (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${y}/${x}`
  ]
};

function tile2lng(x, z) {
  return (x / Math.pow(2, z)) * 360 - 180;
}

function tile2lat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/**
 * Deterministic 0ms Offline Cartographic Vector SVG Tile Generator.
 * Produces seamlessly stitched vector map tiles with real geo coordinates
 * so Leaflet always renders a crisp map even with zero internet access.
 */
function renderOfflineVectorTile(style, z, x, y) {
  if (style === 'labels') {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"></svg>';
  }
  const latN = tile2lat(y, z);
  const latS = tile2lat(y + 1, z);
  const lngW = tile2lng(x, z);
  const lngE = tile2lng(x + 1, z);
  const lat = (latN + latS) / 2;
  const lng = (lngW + lngE) / 2;
  const latLabel = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lngLabel = `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;

  const isDark = style === 'dark' || style === 'satellite';
  const bg = isDark ? '#0f172a' : '#f4f6f9';
  const blockFill = isDark ? '#162235' : '#e9eef4';
  const roadMajor = isDark ? 'rgba(148, 163, 184, 0.25)' : '#ffffff';
  const roadMinor = isDark ? 'rgba(100, 116, 139, 0.16)' : 'rgba(203, 213, 225, 0.55)';
  const gridHairline = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.2)';
  const labelColor = isDark ? 'rgba(148, 163, 184, 0.6)' : 'rgba(100, 116, 139, 0.65)';

  const hash = Math.abs((x * 73856093) ^ (y * 19349663) ^ (z * 83492791));
  const bx = 24 + (hash % 48);
  const by = 24 + ((hash >> 3) % 48);
  const offset = hash % 56;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="${bg}"/>
  <rect x="${bx}" y="${by}" width="72" height="58" rx="4" fill="${blockFill}"/>
  <rect x="${bx + 96}" y="${by + 68}" width="84" height="64" rx="4" fill="${blockFill}"/>
  <path d="M0 ${64 + (offset % 24)}H256M0 ${176 - (offset % 24)}H256M${72 + (offset % 28)} 0V256M${184 - (offset % 28)} 0V256" fill="none" stroke="${roadMinor}" stroke-width="2"/>
  <path d="M-12 ${118 + (offset % 32)} L268 ${102 + (offset % 32)}" fill="none" stroke="${roadMajor}" stroke-width="5" stroke-linecap="round"/>
  <path d="M${122 + (offset % 24)} -12 L${136 - (offset % 24)} 268" fill="none" stroke="${roadMajor}" stroke-width="4.5" stroke-linecap="round"/>
  <rect x="0.5" y="0.5" width="255" height="255" fill="none" stroke="${gridHairline}" stroke-width="1"/>
  <text x="10" y="18" fill="${labelColor}" font-family="system-ui, sans-serif" font-size="9" font-weight="600">${latLabel}, ${lngLabel}</text>
</svg>`;
}

router.get('/:style/:z/:x/:yRaw', async (req, res) => {
  const safeStyle = String(req.params.style || 'voyager').replace(/[^a-z]/gi, '').toLowerCase() || 'voyager';
  const z = parseInt(req.params.z, 10);
  const x = parseInt(req.params.x, 10);
  const y = parseInt(String(req.params.yRaw || '').replace(/\.(png|svg|jpg|webp)$/i, ''), 10);

  if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y) || z < 0 || z > 22) {
    return res.status(400).send('Invalid tile coordinates');
  }

  if (safeStyle === 'offline' || !STYLE_TEMPLATES[safeStyle]) {
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('X-Tile-Source', 'offline-vector');
    return res.send(renderOfflineVectorTile(safeStyle, z, x, y));
  }

  const cacheDir = path.join(TILE_CACHE_DIR, safeStyle, String(z));
  const binFile = path.join(cacheDir, `${x}_${y}.bin`);
  const metaFile = path.join(cacheDir, `${x}_${y}.json`);

  // 1. Instant local disk cache hit
  try {
    if (fs.existsSync(binFile)) {
      let contentType = 'image/png';
      if (fs.existsSync(metaFile)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
          if (meta?.contentType) contentType = meta.contentType;
        } catch (e) {}
      }
      const cached = fs.readFileSync(binFile);
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=604800');
      res.set('X-Tile-Source', 'disk-cache');
      return res.send(cached);
    }
  } catch (e) { /* fall through to fetch or vector fallback */ }

  // 2. Fast upstream fetch with mirror failover + 4.0s timeout, cached to disk for offline resilience
  const templates = Array.isArray(STYLE_TEMPLATES[safeStyle]) ? STYLE_TEMPLATES[safeStyle] : [STYLE_TEMPLATES[safeStyle]];
  for (const buildUrl of templates) {
    if (typeof buildUrl !== 'function') continue;
    try {
      const url = buildUrl(z, x, y);
      const upstream = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 4000,
        headers: {
          'User-Agent': 'ScraperCoIn-GeoMap/1.0 (+https://scraper.co.in; free-carto)',
          Accept: 'image/avif,image/webp,image/png,image/*;q=0.8'
        }
      });

      if (upstream.status === 200 && upstream.data && upstream.data.byteLength > 100) {
        const contentType = upstream.headers['content-type'] || 'image/png';
        const buf = Buffer.from(upstream.data);
        fs.mkdir(cacheDir, { recursive: true }, (mkdirErr) => {
          if (mkdirErr) return;
          fs.writeFile(binFile, buf, () => {});
          fs.writeFile(metaFile, JSON.stringify({ contentType }), () => {});
        });
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=604800');
        res.set('X-Tile-Source', 'upstream-cached');
        return res.send(buf);
      }
    } catch (err) {
      /* try next mirror */
    }
  }

  // 3. Guaranteed 200 Offline Vector Cartographic SVG fallback
  res.set('Content-Type', 'image/svg+xml');
  res.set('Cache-Control', 'no-cache');
  res.set('X-Tile-Source', 'offline-fallback');
  return res.send(renderOfflineVectorTile(safeStyle, z, x, y));
});

module.exports = router;
