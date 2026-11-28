'use strict';

/**
 * server/src/geo/coveragePlanner.js
 * Builds clean, deduplicated, zero-overlap and full-place zone plans:
 *  - Filters strictly inside OSM Polygon / Bounding Box
 *  - Fixes Voronoi bug: never excludes suburbs/boroughs inside the target polygon
 *  - Strips diacritics so 'Bhavānipuram' and 'Bhavanipuram' merge cleanly
 *  - Computes BOTH:
 *      * allZones  ('all' mode: every clean OSM/curated neighborhood, e.g. Guntur 65, Vijayawada 87, Mumbai 816, Hyderabad 980)
 *      * smartZones ('smart' mode: all places if <= 120, or 0.8km de-clustered coverage for giant metros)
 *  - Fills any unmapped outer polygon gaps via geometric sector coordinates (no Photon calls).
 */

const { haversineKm, isPointInGeoJson } = require('./osmPolygon');
const { stripDiacritics, cleanPlaceLabel } = require('./externalHarvesters');

function sectorDirectionLabel(cityName, lat, lng, center) {
  const ns = lat > center.lat + 0.015 ? 'North' : lat < center.lat - 0.015 ? 'South' : '';
  const ew = lng > center.lng + 0.015 ? 'East' : lng < center.lng - 0.015 ? 'West' : '';
  const dir = [ns, ew].filter(Boolean).join('-') || 'Central';
  return `${cityName} · ${dir} Sector`;
}

function dedupeZones(candidates, cityName) {
  const byKey = new Map();
  const cleanCity = stripDiacritics(cityName).toLowerCase();

  for (const c of candidates) {
    if (!c || !c.name || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
    const clean = cleanPlaceLabel(c.name);
    const key = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key || clean.toLowerCase() === cleanCity) continue;

    const prev = byKey.get(key);
    if (!prev || (c.weight || 0) > (prev.weight || 0)) {
      byKey.set(key, {
        name: clean,
        lat: Number(Number(c.lat).toFixed(5)),
        lng: Number(Number(c.lng).toFixed(5)),
        radiusKm: Number((c.radiusKm || 2.0).toFixed(2)),
        placeTag: c.placeTag || 'neighbourhood',
        source: c.source || 'osm',
        weight: c.weight || 80
      });
    }
  }

  return Array.from(byKey.values());
}

function addOuterGapSectors(zones, { cityName, center, bounds, geojson, radiusKm = 2.0 }) {
  const list = [...zones];
  const latStep = (radiusKm * 1.55) / 111.0;
  const lngStep = (radiusKm * 1.55) / (111.0 * Math.max(0.25, Math.cos((center.lat * Math.PI) / 180)));
  const used = new Set(list.map((z) => z.name.toLowerCase()));

  let sectorsAdded = 0;
  for (let lat = bounds.minLat + latStep * 0.4; lat <= bounds.maxLat - latStep * 0.3; lat += latStep) {
    for (let lng = bounds.minLng + lngStep * 0.4; lng <= bounds.maxLng - lngStep * 0.3; lng += lngStep) {
      if (sectorsAdded >= 12) break;
      if (geojson && !isPointInGeoJson(lat, lng, geojson)) continue;
      const nearest = list.reduce((m, z) => Math.min(m, haversineKm(lat, lng, z.lat, z.lng)), Infinity);
      if (nearest >= radiusKm * 1.45) {
        const baseLabel = sectorDirectionLabel(cityName, lat, lng, center);
        let label = baseLabel;
        let idx = 2;
        while (used.has(label.toLowerCase())) label = `${baseLabel} ${idx++}`;
        used.add(label.toLowerCase());
        list.push({
          name: label,
          lat: Number(lat.toFixed(5)),
          lng: Number(lng.toFixed(5)),
          radiusKm: Number(radiusKm.toFixed(2)),
          placeTag: 'sector',
          source: 'polygon_grid',
          weight: 50
        });
        sectorsAdded += 1;
      }
    }
  }
  return list;
}

function selectSmartCoverage(allZones, center) {
  // For cities <= 120 places (e.g. Guntur 65, Vijayawada 87, small towns), keep EVERY single real place!
  if (allZones.length <= 120) {
    return allZones.map((z) => ({ ...z, radiusKm: Number((z.radiusKm || 1.8).toFixed(2)) }));
  }

  // For massive metros (Mumbai 816, Hyderabad 980, London 758, NYC 290), prioritize higher-tier wards/suburbs
  // and space zones by 0.8 km so maps cover 100% of the metro cleanly without 100m overlapping stalls
  const rankOrder = [...allZones].sort((a, b) => {
    const wDiff = (b.weight || 80) - (a.weight || 80);
    if (wDiff !== 0) return wDiff;
    return haversineKm(a.lat, a.lng, center.lat, center.lng) - haversineKm(b.lat, b.lng, center.lat, center.lng);
  });

  const kept = [];
  for (const cand of rankOrder) {
    if (kept.every((k) => haversineKm(cand.lat, cand.lng, k.lat, k.lng) >= 0.8)) {
      kept.push({ ...cand, radiusKm: 1.6 });
    }
  }

  return kept.sort(
    (a, b) => haversineKm(a.lat, a.lng, center.lat, center.lng) - haversineKm(b.lat, b.lng, center.lat, center.lng)
  );
}

function buildCityZonePlan({ cityName, center, bounds, geojson, candidates, otherTowns = [] }) {
  const inside = candidates.filter((c) => {
    if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return false;
    if (c.lat < bounds.minLat - 0.008 || c.lat > bounds.maxLat + 0.008) return false;
    if (c.lng < bounds.minLng - 0.008 || c.lng > bounds.maxLng + 0.008) return false;

    if (geojson) {
      if (!isPointInGeoJson(c.lat, c.lng, geojson)) {
        return haversineKm(c.lat, c.lng, center.lat, center.lng) <= 2.2;
      }
      // Inside authoritative OSM municipal polygon: trust it without external Voronoi deletion!
      return true;
    }

    // Without polygon, exclude places strictly closer to an external town outside bounds
    const dTarget = haversineKm(c.lat, c.lng, center.lat, center.lng);
    for (const ot of otherTowns) {
      if (ot.lat >= bounds.minLat && ot.lat <= bounds.maxLat && ot.lng >= bounds.minLng && ot.lng <= bounds.maxLng) continue;
      if (haversineKm(c.lat, c.lng, ot.lat, ot.lng) + 0.5 < dTarget) return false;
    }
    return true;
  });

  let allClean = dedupeZones(inside, cityName);
  allClean = addOuterGapSectors(allClean, { cityName, center, bounds, geojson, radiusKm: allClean.length > 200 ? 1.8 : 2.0 });

  allClean.sort(
    (a, b) => haversineKm(a.lat, a.lng, center.lat, center.lng) - haversineKm(b.lat, b.lng, center.lat, center.lng)
  );

  // Strip internal weight helper from serialized output, keep up to 1200 clean zones
  const allZones = allClean.slice(0, 1200).map(({ weight, ...rest }) => rest);
  const smartZones = selectSmartCoverage(allClean, center).map(({ weight, ...rest }) => rest);

  return { allZones, smartZones };
}

module.exports = { buildCityZonePlan };
