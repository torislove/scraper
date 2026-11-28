'use strict';

/**
 * server/src/master/masterOsmFetcher.js
 * Zero-cost Nominatim + QLever OSM helpers for Master District/State subdivision discovery.
 */

const { haversineKm } = require('../geo/osmPolygon');

const USER_AGENT = 'LeadHarvestMasterGeo/2.0 (local-workspace)';
const QLEVER_URL = 'https://qlever.cs.uni-freiburg.de/api/osm-planet';

async function fetchNominatimAdmin(query, cc, featuretype = '') {
  try {
    const ft = featuretype ? `&featuretype=${encodeURIComponent(featuretype)}` : '';
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&extratags=1&limit=5&countrycodes=${cc.toLowerCase()}${ft}&q=${encodeURIComponent(query)}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

async function fetchQleverSubdivisions(bbox, center, timeoutMs = 4500) {
  if (!bbox) return { towns: [], mandals: [] };
  const { minLat: s, minLng: w, maxLat: n, maxLng: e } = bbox;
  const sparql = `PREFIX osmkey: <https://www.openstreetmap.org/wiki/Key:>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
SELECT DISTINCT ?name ?place ?geom WHERE {
  ?osm osmkey:place ?place .
  VALUES ?place { "city" "town" "village" "municipality" }
  ?osm osmkey:name ?name .
  ?osm geo:hasGeometry/geo:asWKT ?geom .
  FILTER(geof:sfIntersects(?geom, "POLYGON((${w} ${s}, ${e} ${s}, ${e} ${n}, ${w} ${n}, ${w} ${s}))"^^geo:wktLiteral))
} LIMIT 300`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${QLEVER_URL}?query=${encodeURIComponent(sparql)}`, {
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (!res.ok) return { towns: [], mandals: [] };
    const data = await res.json();
    const towns = [];
    const mandals = [];
    for (const row of data?.results?.bindings || []) {
      const name = String(row.name?.value || '').trim();
      const place = String(row.place?.value || '').toLowerCase();
      const m = String(row.geom?.value || '').match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (!name || !m || name.length > 42) continue;
      const item = { name, lat: Number(m[2]), lng: Number(m[1]), placeTag: place };
      if (place === 'city' || place === 'town' || place === 'municipality') towns.push(item);
      else mandals.push(item);
    }
    if (center) {
      const byDist = (a, b) => haversineKm(center.lat, center.lng, a.lat, a.lng) - haversineKm(center.lat, center.lng, b.lat, b.lng);
      towns.sort(byDist);
      mandals.sort(byDist);
    }
    return { towns: towns.slice(0, 28), mandals: mandals.slice(0, 36) };
  } catch (_) {
    return { towns: [], mandals: [] };
  }
}

async function resolveCoordsForPlaces(names, contextLabel, cc, fallbackCenter) {
  const results = [];
  const remaining = names.filter(Boolean);
  const batchLimit = Math.min(remaining.length, 16);
  await Promise.all(remaining.slice(0, batchLimit).map(async (name, i) => {
    const hits = await fetchNominatimAdmin(`${name}, ${contextLabel}`, cc);
    const hit = hits[0];
    if (hit && hit.lat && hit.lon) {
      results[i] = { name, lat: Number(hit.lat), lng: Number(hit.lon) };
    } else if (fallbackCenter) {
      const angle = ((i + 1) * 137.5 * Math.PI) / 180;
      const distDeg = 0.08 + (i % 5) * 0.03;
      results[i] = {
        name,
        lat: Number((fallbackCenter.lat + Math.cos(angle) * distDeg).toFixed(5)),
        lng: Number((fallbackCenter.lng + Math.sin(angle) * distDeg).toFixed(5))
      };
    }
  }));
  for (let i = batchLimit; i < remaining.length; i++) {
    const angle = ((i + 1) * 137.5 * Math.PI) / 180;
    const distDeg = 0.12 + (i % 6) * 0.03;
    results[i] = {
      name: remaining[i],
      lat: Number(((fallbackCenter?.lat || 0) + Math.cos(angle) * distDeg).toFixed(5)),
      lng: Number(((fallbackCenter?.lng || 0) + Math.sin(angle) * distDeg).toFixed(5))
    };
  }
  return results.filter(Boolean);
}

module.exports = {
  fetchNominatimAdmin,
  fetchQleverSubdivisions,
  resolveCoordsForPlaces
};
