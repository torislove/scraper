'use strict';

/**
 * server/src/geo/dynamicZones.js
 * Zero-Cost, Zero-Rate-Limit OSM + Offline GeoNames Zone Resolver ($0 forever):
 *  - Cache file: server/db/geo_cache.json (stores ALL clean parsed places so smart/all switches in <1ms)
 *  - Primary boundary: 1-call Nominatim Polygon/BBox
 *  - Primary places: QLever OSM Planet SPARQL (400-1200ms) + Offline GeoNames + Curated Anchor Merge
 *  - Fallback: Wikipedia GeoSearch CDN + Overpass mirror race + Polygon Gap Grid
 */

const fs = require('fs');
const path = require('path');
const { resolveCityBoundary, classifyCityTierLabel } = require('./osmPolygon');
const { queryNearbyPlaces } = require('./geonamesIndex');
const { fetchQleverOsmZones, fetchOverpassWards, fetchWikipediaPlaces } = require('./externalHarvesters');
const { buildCityZonePlan } = require('./coveragePlanner');

const DB_DIR = path.resolve(__dirname, '../../db');
const CACHE_FILE = path.join(DB_DIR, 'geo_cache.json');

const memoryCache = new Map();
const inFlight = new Map();

function loadDiskCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) {
        if (v && Array.isArray(v.allZones) && v.allZones.length > 0) memoryCache.set(k, v);
      }
    }
  } catch (_) {}
}

function saveDiskCache() {
  try {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    const obj = {};
    for (const [k, v] of memoryCache.entries()) obj[k] = v;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj), 'utf8');
  } catch (_) {}
}

loadDiskCache();

function cacheKey(city, countryCode) {
  const c = String(city || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cc = String(countryCode || 'IN').toUpperCase();
  return `${cc}:${c}`;
}

function formatModeResult(entry, zoneMode = 'smart', cached = false) {
  const mode = zoneMode === 'all' ? 'all' : 'smart';
  const zones = mode === 'all' ? entry.allZones : entry.smartZones;
  return {
    cityName: entry.cityName,
    country: entry.country,
    center: entry.center,
    bounds: entry.bounds,
    tier: entry.tier,
    mode,
    totalAllPlaces: entry.allZones.length,
    smartCount: entry.smartZones.length,
    zones,
    resolutionMeta: {
      ...(entry.resolutionMeta || {}),
      cached,
      mode
    }
  };
}

async function resolveDynamicCity(
  location,
  countryCode = 'IN',
  { zoneMode = 'smart', curatedCity = null, fallbackCentroid = { lat: 20.5937, lng: 78.9629 } } = {}
) {
  const cleanCity = String(location || curatedCity?.city || '').trim();
  const cc = String(countryCode || curatedCity?.country || 'IN').toUpperCase();

  if (!cleanCity) {
    return {
      cityName: 'Global',
      country: cc,
      center: fallbackCentroid,
      bounds: null,
      tier: { id: 'tier4', label: 'Tier 4 · Compact Town' },
      mode: 'smart',
      totalAllPlaces: 1,
      smartCount: 1,
      zones: [{ name: 'Central Zone', lat: fallbackCentroid.lat, lng: fallbackCentroid.lng, radiusKm: 3.0 }],
      resolutionMeta: { cached: false, source: 'centroid' }
    };
  }

  const key = cacheKey(cleanCity, cc);
  if (memoryCache.has(key)) {
    return formatModeResult(memoryCache.get(key), zoneMode, true);
  }

  if (inFlight.has(key)) {
    const entry = await inFlight.get(key);
    return formatModeResult(entry, zoneMode, false);
  }

  const task = (async () => {
    const boundary = await resolveCityBoundary(cleanCity, cc);
    const center = boundary?.center || curatedCity?.center || fallbackCentroid;
    const curatedBounds = curatedCity?.bounds
      ? {
          ...curatedCity.bounds,
          heightKm: Math.abs(curatedCity.bounds.maxLat - curatedCity.bounds.minLat) * 111,
          widthKm: Math.abs(curatedCity.bounds.maxLng - curatedCity.bounds.minLng) * 111 * Math.cos(((curatedCity.center?.lat || center.lat) * Math.PI) / 180)
        }
      : null;
    if (curatedBounds) {
      curatedBounds.areaKm2 = Math.round(curatedBounds.heightKm * curatedBounds.widthKm);
    }

    // If Nominatim returned a tiny inner-CBD polygon (e.g. "City of Sydney" 26km² vs Greater Sydney bounds),
    // prefer the broader metropolitan curated bounds without clipping outer suburbs to the CBD polygon!
    const useCuratedMetroBounds = Boolean(
      curatedBounds && (!boundary?.bounds || boundary.bounds.areaKm2 < curatedBounds.areaKm2 * 0.45)
    );
    const bounds = useCuratedMetroBounds
      ? curatedBounds
      : boundary?.bounds || {
          minLat: center.lat - 0.08,
          maxLat: center.lat + 0.08,
          minLng: center.lng - 0.08,
          maxLng: center.lng + 0.08,
          heightKm: 18,
          widthKm: 18,
          areaKm2: 320
        };
    const geojson = useCuratedMetroBounds ? null : boundary?.geojson || null;

    const radiusKm = Math.max(8, Math.min(24, Math.max(bounds.heightKm || 14, bounds.widthKm || 14) * 0.6));

    // Primary OSM QLever (9.5s generous budget — zero rate limits) + Offline GeoNames
    const [qleverRes, gnRes] = await Promise.allSettled([
      fetchQleverOsmZones(bounds, cleanCity, 9500),
      queryNearbyPlaces(cc, center.lat, center.lng, radiusKm, { maxWaitMs: 3200 })
    ]);

    let qlever = qleverRes.status === 'fulfilled' ? qleverRes.value : [];
    const gn = gnRes.status === 'fulfilled' ? gnRes.value : { wards: [], otherTowns: [] };

    // Only hit secondary Overpass/Wikipedia fallbacks if QLever returned fewer than 12 places
    let fallbackPlaces = [];
    if (qlever.length < 12) {
      const [ovRes, wpRes] = await Promise.allSettled([
        fetchOverpassWards({ bounds }, cleanCity, 3000),
        fetchWikipediaPlaces(center.lat, center.lng, radiusKm, cleanCity, 2400)
      ]);
      if (ovRes.status === 'fulfilled') fallbackPlaces.push(...ovRes.value);
      if (wpRes.status === 'fulfilled') fallbackPlaces.push(...wpRes.value);
    }

    const curatedCandidates = Array.isArray(curatedCity?.zones)
      ? curatedCity.zones.map((z) => ({ ...z, placeTag: 'suburb', source: 'curated', weight: 100 }))
      : [];

    const candidates = [...curatedCandidates, ...qlever, ...gn.wards, ...fallbackPlaces];
    const { allZones, smartZones } = buildCityZonePlan({
      cityName: boundary?.displayName || curatedCity?.city || cleanCity,
      center,
      bounds,
      geojson,
      candidates,
      otherTowns: gn.otherTowns
    });

    const entry = {
      cityName: boundary?.displayName || curatedCity?.city || cleanCity,
      country: cc,
      center,
      bounds: {
        minLat: bounds.minLat,
        maxLat: bounds.maxLat,
        minLng: bounds.minLng,
        maxLng: bounds.maxLng
      },
      tier: classifyCityTierLabel(allZones.length, bounds.areaKm2 || 150),
      allZones: allZones.length > 0 ? allZones : curatedCandidates,
      smartZones: smartZones.length > 0 ? smartZones : curatedCandidates,
      resolutionMeta: {
        boundarySource: boundary ? (geojson ? 'OSM Municipal Relation Polygon' : 'Nominatim Urban Bounds') : 'Curated Pack',
        hasPolygon: Boolean(geojson),
        areaKm2: Math.round(bounds.areaKm2 || 150),
        counts: {
          qleverOsm: qlever.length,
          geoNames: gn.wards.length,
          curated: curatedCandidates.length,
          allPlaces: allZones.length,
          smartZones: smartZones.length
        }
      }
    };

    // Cache permanently if QLever resolved places OR non-OSM fallback is strong (don't freeze 0-QLever transient failures)
    if (entry.allZones.length >= 2 && (qlever.length > 0 || !boundary)) {
      memoryCache.set(key, entry);
      saveDiskCache();
    }
    return entry;
  })();

  inFlight.set(key, task);
  try {
    const entry = await task;
    return formatModeResult(entry, zoneMode, false);
  } finally {
    inFlight.delete(key);
  }
}

function getCachedCity(location, countryCode, zoneMode = 'smart') {
  const key = cacheKey(location, countryCode);
  const entry = memoryCache.get(key);
  return entry ? formatModeResult(entry, zoneMode, true) : null;
}

module.exports = {
  resolveDynamicCity,
  getCachedCity
};
