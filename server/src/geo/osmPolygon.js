'use strict';

/**
 * server/src/geo/osmPolygon.js
 * Zero-cost Nominatim municipal boundary polygon & bounding-box resolver.
 * Uses pure-JS GeoJSON point-in-polygon checks (0 external dependencies).
 */

const USER_AGENT = 'LeadHarvestGeoEngine/2.0 (local-workspace)';

const URBAN_TYPES = new Set([
  'city', 'town', 'municipality', 'local_authority', 'borough',
  'suburb', 'administrative', 'village'
]);

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bboxMetrics(bbox) {
  const [minLat, maxLat, minLng, maxLng] = bbox.map(Number);
  const midLat = (minLat + maxLat) / 2;
  const heightKm = Math.max(2, Math.abs(maxLat - minLat) * 111.0);
  const widthKm = Math.max(2, Math.abs(maxLng - minLng) * 111.0 * Math.cos((midLat * Math.PI) / 180));
  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    heightKm,
    widthKm,
    areaKm2: Math.round(heightKm * widthKm)
  };
}

function clampNodeBbox(lat, lng, rawBbox, type, importance = 0) {
  const m = bboxMetrics(rawBbox);
  // Larger megacities (e.g. Mumbai node hit) need ~0.18 deg span vs compact towns (~0.045 deg)
  const capDeg = type === 'town' || type === 'village'
    ? 0.045
    : importance >= 0.65
      ? 0.17
      : 0.09;
  if (Math.abs(m.maxLat - m.minLat) <= capDeg * 2.2) return m;
  return bboxMetrics([lat - capDeg, lat + capDeg, lng - capDeg * 1.1, lng + capDeg * 1.1]);
}

function scoreNominatimHit(hit) {
  const type = String(hit?.addresstype || hit?.type || '').toLowerCase();
  if (type === 'state' || type === 'country' || type === 'state_district' || type === 'county') return -100;
  const bb = Array.isArray(hit?.boundingbox) ? hit.boundingbox.map(Number) : null;
  if (!bb || bb.length !== 4) return -50;
  const latSpan = Math.abs(bb[1] - bb[0]);
  const lngSpan = Math.abs(bb[3] - bb[2]);
  if (latSpan > 0.9 || lngSpan > 0.9) return -40;

  let score = Number(hit.importance || 0.2) * 10;
  const geoType = hit?.geojson?.type;
  if (hit.osm_type === 'relation' && (geoType === 'Polygon' || geoType === 'MultiPolygon')) score += 45;
  else if (hit.osm_type === 'way' && geoType === 'Polygon') score += 25;
  if (['city', 'municipality', 'local_authority', 'town'].includes(type)) score += 25;
  if (!URBAN_TYPES.has(type) && hit.class !== 'boundary' && hit.class !== 'place') score -= 15;
  return score;
}

function classifyCityTierLabel(totalPlaces, areaKm2 = 100) {
  if (totalPlaces >= 250 || areaKm2 >= 560) return { id: 'tier1', label: 'Tier 1 · Megacity Hub' };
  if (totalPlaces >= 80 || areaKm2 >= 230) return { id: 'tier2', label: 'Tier 2 · Regional Metro' };
  if (totalPlaces >= 35 || areaKm2 >= 85) return { id: 'tier3', label: 'Tier 3 · Mid-Size City' };
  return { id: 'tier4', label: 'Tier 4 · Compact Town' };
}

function pointInRing(lat, lng, ring) {
  if (!Array.isArray(ring) || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointInGeoJson(lat, lng, geojson) {
  if (!geojson) return true;
  if (geojson.type === 'Polygon' && Array.isArray(geojson.coordinates?.[0])) {
    return pointInRing(lat, lng, geojson.coordinates[0]);
  }
  if (geojson.type === 'MultiPolygon' && Array.isArray(geojson.coordinates)) {
    return geojson.coordinates.some((poly) => Array.isArray(poly?.[0]) && pointInRing(lat, lng, poly[0]));
  }
  return true;
}

async function resolveCityBoundary(city, countryCode = 'IN') {
  const cc = String(countryCode || 'IN').toLowerCase();
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(city)}` +
    `&countrycodes=${cc}&polygon_geojson=1&polygon_threshold=0.006&limit=6`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const hits = await res.json();
    if (!Array.isArray(hits) || hits.length === 0) return null;

    const ranked = hits
      .map((h) => ({ hit: h, score: scoreNominatimHit(h) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0]?.score > -30 ? ranked[0].hit : hits[0];
    const lat = Number(best.lat);
    const lng = Number(best.lon);
    const addrt = String(best.addresstype || best.type || '').toLowerCase();
    const importance = Number(best.importance || 0);
    const isPoly = best.geojson?.type === 'Polygon' || best.geojson?.type === 'MultiPolygon';
    const bounds = isPoly
      ? bboxMetrics(best.boundingbox)
      : clampNodeBbox(lat, lng, best.boundingbox, addrt, importance);

    return {
      source: 'nominatim',
      displayName: best.name || city,
      osmType: best.osm_type,
      osmId: Number(best.osm_id || 0),
      center: { lat, lng },
      bounds,
      geojson: isPoly ? best.geojson : null
    };
  } catch (_) {
    clearTimeout(timer);
    return null;
  }
}

module.exports = {
  haversineKm,
  bboxMetrics,
  classifyCityTierLabel,
  isPointInGeoJson,
  resolveCityBoundary
};
