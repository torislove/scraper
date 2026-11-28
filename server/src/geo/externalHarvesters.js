'use strict';

/**
 * server/src/geo/externalHarvesters.js
 * Zero-cost, zero-rate-limit OSM & Open-Data Zone Harvesters:
 *  1. Primary: QLever OSM Planet SPARQL (400-1200ms, full OSM suburbs/quarters/neighbourhoods/wards)
 *  2. Secondary Fallback (if QLever unavailable): Wikipedia GeoSearch CDN (~600ms) + Wikidata + Overpass
 */

const USER_AGENT = 'LeadHarvestGeoEngine/2.0 (local-workspace)';
const QLEVER_URL = 'https://qlever.cs.uni-freiburg.de/api/osm-planet';
const OVERPASS_MIRRORS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];

const STRICT_NOISE_RE = /\b(constituency|assembly|lok\s*sabha|rajya\s*sabha|mandal|district|tehsil|taluka|fire|loco\s*shed|workshop|railway|airport|academy|stadium|ground|tower|statue|temple|church|mosque|masjid|hospital|college|school|university|bridge|lake|pond|canal|dam|bhavan|highway|bus\s*stand|depot|rly|bpc|oldage\s*home|old\s*age|office|gate|junction|jn|police)\b/i;

const PLACE_WEIGHTS = {
  suburb: 96,
  borough: 95,
  ward: 94,
  quarter: 92,
  neighbourhood: 88,
  locality: 74
};

function stripDiacritics(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.\u2018\u2019`]/g, '')
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanPlaceLabel(name) {
  return stripDiacritics(String(name || '').replace(/\s*,\s*[^,]+$/, ''));
}

function isCleanPlaceName(name, cityName = '') {
  const clean = stripDiacritics(name);
  if (!clean || clean.length < 3 || clean.length > 42) return false;
  if (/^\d+$/.test(clean) || /^Q\d+$/i.test(clean)) return false;
  if (cityName && clean.toLowerCase() === stripDiacritics(cityName).toLowerCase()) return false;
  if (STRICT_NOISE_RE.test(clean)) return false;
  return true;
}

function parseWktPoint(wkt) {
  const m = String(wkt || '').match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!m) return null;
  return { lng: Number(m[1]), lat: Number(m[2]) };
}

async function fetchQleverOsmZones(bounds, cityName = '', timeoutMs = 4500) {
  if (!bounds) return [];
  const { minLat: s, minLng: w, maxLat: n, maxLng: e } = bounds;
  const sparql = `PREFIX osmkey: <https://www.openstreetmap.org/wiki/Key:>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
SELECT DISTINCT ?name ?place ?geom WHERE {
  ?osm osmkey:place ?place .
  VALUES ?place { "suburb" "quarter" "neighbourhood" "borough" "ward" "locality" }
  ?osm osmkey:name ?name .
  ?osm geo:hasGeometry/geo:asWKT ?geom .
  FILTER(geof:sfIntersects(?geom, "POLYGON((${w} ${s}, ${e} ${s}, ${e} ${n}, ${w} ${n}, ${w} ${s}))"^^geo:wktLiteral))
} LIMIT 3000`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${QLEVER_URL}?query=${encodeURIComponent(sparql)}`, {
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
      signal: ctrl.signal
    });
    if (!res.ok) return [];
    const data = await res.json();
    const out = [];
    for (const row of data?.results?.bindings || []) {
      const name = cleanPlaceLabel(row.name?.value);
      const place = String(row.place?.value || 'neighbourhood').toLowerCase();
      const pt = parseWktPoint(row.geom?.value);
      if (!pt || !isCleanPlaceName(name, cityName)) continue;
      out.push({
        name,
        lat: pt.lat,
        lng: pt.lng,
        placeTag: place,
        source: `osm_${place}`,
        weight: PLACE_WEIGHTS[place] || 84
      });
    }
    return out;
  } catch (_) {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOverpassWards({ bounds }, cityName = '', timeoutMs = 3200) {
  if (!bounds) return [];
  const q = `[out:json][timeout:3];node["place"~"^(suburb|quarter|neighbourhood|borough|ward)$"](${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng});out body;`;
  const body = 'data=' + encodeURIComponent(q);
  for (const mirror of OVERPASS_MIRRORS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
        body,
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const json = await res.json();
      if (!Array.isArray(json?.elements)) continue;
      return json.elements
        .map((el) => {
          const name = cleanPlaceLabel(el.tags?.['name:en'] || el.tags?.name || '');
          const place = el.tags?.place || 'neighbourhood';
          if (!isCleanPlaceName(name, cityName)) return null;
          return {
            name,
            lat: Number(el.lat),
            lng: Number(el.lon),
            placeTag: place,
            source: 'osm_overpass',
            weight: PLACE_WEIGHTS[place] || 85
          };
        })
        .filter((z) => z && Number.isFinite(z.lat) && Number.isFinite(z.lng));
    } catch (_) {
      clearTimeout(timer);
    }
  }
  return [];
}

async function fetchWikipediaPlaces(lat, lng, radiusKm = 12, cityName = '', timeoutMs = 2400) {
  const gsRadius = Math.max(2500, Math.min(10000, Math.round(radiusKm * 900)));
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&list=geosearch` +
    `&gscoord=${lat}|${lng}&gsradius=${gsRadius}&gslimit=100&format=json`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: ctrl.signal });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.query?.geosearch || [])
      .map((p) => {
        const name = cleanPlaceLabel(p.title);
        if (!isCleanPlaceName(name, cityName)) return null;
        return {
          name,
          lat: Number(p.lat),
          lng: Number(p.lon),
          placeTag: 'locality',
          source: 'wikipedia_geo',
          weight: 55
        };
      })
      .filter(Boolean);
  } catch (_) {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  stripDiacritics,
  cleanPlaceLabel,
  isCleanPlaceName,
  fetchQleverOsmZones,
  fetchOverpassWards,
  fetchWikipediaPlaces
};
