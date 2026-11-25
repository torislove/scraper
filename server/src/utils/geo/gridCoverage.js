/**
 * gridCoverage.js
 * Whole-city coverage grid algorithms (concentric rings, compass cells, subvector coverage).
 */

const querySpecificityClassifier = require('../querySpecificityClassifier');
const {
  zoneCoordinates,
  ZONE_COORDINATES,
  GRID_CELL_KM,
  GRID_KM_PER_DEG_LAT,
  CITY_GRID_RING_KM,
  GRID_MAX_CELLS_PER_AXIS
} = require('./coordinates');
const { buildCategorySubVectorZones } = require('./subvectors');

function distanceKm(a, b) {
  if (!a || !b) return Infinity;
  const dLat = (a.lat - b.lat) * Math.PI / 180;
  const dLng = (a.lng - b.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function compassLabel(centerLat, centerLng, minLat, maxLat, minLng, maxLng) {
  const vertical = centerLat < minLat + (maxLat - minLat) / 3 ? 'South'
    : centerLat > maxLat - (maxLat - minLat) / 3 ? 'North' : '';
  const horizontal = centerLng < minLng + (maxLng - minLng) / 3 ? 'West'
    : centerLng > maxLng - (maxLng - minLng) / 3 ? 'East' : '';
  if (vertical && horizontal) return `${vertical}-${horizontal}`;
  return vertical || horizontal || 'Central';
}

/**
 * Build viewport grid cells over a city footprint.
 * @param {string} cityName display name ("Guntur")
 * @param {string} category search category ("Restaurants")
 * @param {Array<{lat:number,lng:number}>} anchors known locality coordinates
 * @param {{cappedRadiusKm?:number}} options
 * @returns {Array} grid zone objects
 */
function buildCityGridZones(cityName, category, anchors = [], options = {}) {
  const coords = (anchors || []).filter(a => a && Number.isFinite(Number(a.lat)) && Number.isFinite(Number(a.lng)));
  const center = ZONE_COORDINATES[String(cityName || '').toLowerCase().trim()]
    || options.center
    || (coords.length ? {
      lat: coords.reduce((sum, c) => sum + Number(c.lat), 0) / coords.length,
      lng: coords.reduce((sum, c) => sum + Number(c.lng), 0) / coords.length
    } : null);
  if (!center && (!options.boundingbox || options.boundingbox.length !== 4)) return [];

  const cosLat = Math.max(0.2, Math.cos(((center?.lat || 0) * Math.PI) / 180));

  let minLat, maxLat, minLng, maxLng;

  if (Array.isArray(options.boundingbox) && options.boundingbox.length === 4) {
    const [south, north, west, east] = options.boundingbox.map(Number);
    if ([south, north, west, east].every(Number.isFinite)) {
      const ringKm = Number.isFinite(Number(options.ringKm))
        ? Math.max(0, Number(options.ringKm))
        : (options.scope === 'mandal' ? 0.5 : 1.5);
      const ringLat = ringKm / GRID_KM_PER_DEG_LAT;
      const ringLng = ringKm / (GRID_KM_PER_DEG_LAT * cosLat);
      minLat = Math.min(south, north) - ringLat;
      maxLat = Math.max(south, north) + ringLat;
      minLng = Math.min(west, east) - ringLng;
      maxLng = Math.max(west, east) + ringLng;
    }
  }

  if (!Number.isFinite(minLat)) {
    const ringKm = Number.isFinite(Number(options.ringKm))
      ? Math.max(0, Number(options.ringKm))
      : (options.scope === 'mandal' ? 1.0 : CITY_GRID_RING_KM);

    let halfLat;
    let halfLng;
    if (coords.length >= 3) {
      let spanLat = 0;
      let spanLng = 0;
      for (const c of coords) {
        spanLat = Math.max(spanLat, Math.abs(Number(c.lat) - Number(center.lat)) * 2);
        spanLng = Math.max(spanLng, Math.abs(Number(c.lng) - Number(center.lng)) * 2);
      }
      halfLat = Math.max((spanLat / 2) * 1.15, 0.03);
      halfLng = Math.max((spanLng / 2) * 1.15, 0.035);
    } else {
      const baseRadiusKm = Number(options.cappedRadiusKm) || (options.scope === 'mandal' ? 4.5 : 6);
      halfLat = Math.max(baseRadiusKm / GRID_KM_PER_DEG_LAT, 0.03);
      halfLng = Math.max(baseRadiusKm / (GRID_KM_PER_DEG_LAT * cosLat), 0.035);
    }

    halfLat += ringKm / GRID_KM_PER_DEG_LAT;
    halfLng += ringKm / (GRID_KM_PER_DEG_LAT * cosLat);

    minLat = Number(center.lat) - halfLat;
    maxLat = Number(center.lat) + halfLat;
    minLng = Number(center.lng) - halfLng;
    maxLng = Number(center.lng) + halfLng;
  }

  const latMeters = Math.max(0.01, (maxLat - minLat) * GRID_KM_PER_DEG_LAT);
  const lngMeters = Math.max(0.01, (maxLng - minLng) * GRID_KM_PER_DEG_LAT * cosLat);
  const spanKm = Math.max(latMeters, lngMeters);

  // Dynamic Scale-Adaptive Cell Sizing:
  // Dense urban hubs (e.g. Vijayawada, Austin, Manchester) use 4x4–6x6 grids so Maps'
  // 20-card pagination limit is bypassed across neighboring 1.2–1.8km commercial pockets.
  const maxAxis = options.maxAxis || (options.scope === 'mandal' ? 3 : (spanKm < 15 ? 4 : (spanKm < 30 ? 5 : GRID_MAX_CELLS_PER_AXIS)));
  const dynamicCellPitch = Math.max(GRID_CELL_KM, spanKm / maxAxis);

  const cols = Math.max(1, Math.min(maxAxis, Math.round(lngMeters / dynamicCellPitch)));
  const rows = Math.max(1, Math.min(maxAxis, Math.round(latMeters / dynamicCellPitch)));

  const prefix = category ? `${category} ` : '';
  const city = String(cityName || '').trim() || 'City';
  const cells = [];
  const usedNames = new Set();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lat = minLat + (maxLat - minLat) * ((r + 0.5) / rows);
      const lng = minLng + (maxLng - minLng) * ((c + 0.5) / cols);
      const point = { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };

      // Skip grid cells only when virtually overlapping an authoritative pin (<0.85km);
      // 1km+ pockets yield distinct Maps top-20 results in dense bazaars.
      const nearest = coords.reduce((best, a) => {
        const d = distanceKm(point, a);
        return d < best.d ? { d, a } : best;
      }, { d: Infinity, a: null });
      if (nearest.a && nearest.d < 0.85) continue;

      const dir = compassLabel(point.lat, point.lng, minLat, maxLat, minLng, maxLng);
      let zoneName = `${city} ${dir} Sector ${cells.length + 1}`;
      if (usedNames.has(zoneName.toLowerCase())) zoneName = `${city} ${dir} Grid ${cells.length + 1}`;
      usedNames.add(zoneName.toLowerCase());

      cells.push({
        zoneName,
        queryText: `${prefix}near ${point.lat.toFixed(4)},${point.lng.toFixed(4)}`,
        lat: point.lat,
        lng: point.lng,
        radiusKm: Math.max(2.5, dynamicCellPitch / 1.5),
        boundingbox: [minLat, maxLat, minLng, maxLng],
        engines: ['maps'],
        coverageKind: 'grid',
        precisionLevel: 'sector_grid',
        isVectorQuery: true,
        isSingle: false,
        isApproximate: false
      });
    }
  }
  return cells;
}

/**
 * Merge named locality zones with whole-city grid cells.
 * @param {string} cityName
 * @param {string} category
 * @param {string[]} localityNames
 * @param {string} locationLabel location string used in locality queries
 * @param {number} maxZones optional hard cap (Infinity = cover everything)
 */
function buildCityCoverage(cityName, category, localityNames, locationLabel, maxZones = Infinity, countryCode = 'IN') {
  const prefix = category ? `${category} in ` : '';
  const named = (localityNames || []).map((name, idx) => {
    let coord = ZONE_COORDINATES[String(name).toLowerCase().trim()]
      || zoneCoordinates(name, cityName, idx, (localityNames || []).length);
    if (!coord || !Number.isFinite(coord.lat) || !Number.isFinite(coord.lng)) {
      const base = ZONE_COORDINATES[String(cityName || '').toLowerCase().trim()];
      if (base) {
        const angle = (idx + 1) * 2.3999632;
        const r = 0.0085 * Math.sqrt(idx + 1);
        coord = {
          lat: Number((base.lat + r * Math.cos(angle)).toFixed(5)),
          lng: Number((base.lng + r * Math.sin(angle)).toFixed(5))
        };
      }
    }
    return {
      zoneName: name,
      queryText: `${prefix}${name}, ${locationLabel}`,
      lat: coord ? coord.lat : null,
      lng: coord ? coord.lng : null,
      radiusKm: 6.0,
      engines: ['maps'],
      coverageKind: 'locality',
      precisionLevel: 'city_ward',
      isVectorQuery: true,
      isSingle: false
    };
  });

  const anchors = named
    .filter(z => z.lat && z.lng)
    .map(z => ({ lat: z.lat, lng: z.lng, name: z.zoneName }));
  const cityLabel = locationLabel || cityName;
  const subVectors = buildCategorySubVectorZones(category, cityLabel, 6, countryCode).map(z => ({
    ...z,
    radiusKm: 6.0,
    coverageKind: 'vector',
    engines: ['maps']
  }));
  const grid = buildCityGridZones(cityName || locationLabel, category, anchors);
  const mustKeep = [...named, ...subVectors];
  const rawMerged = [...mustKeep, ...grid];
  const seenKeys = new Set();
  const merged = rawMerged.filter(z => {
    const key = `${Math.round(Number(z.lat || 0) * 1000)}:${Math.round(Number(z.lng || 0) * 1000)}:${String(z.queryText || '').toLowerCase().trim()}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  if (merged.length <= maxZones) return merged;

  const center = ZONE_COORDINATES[String(cityName || '').toLowerCase().trim()] || { lat: anchors[0]?.lat, lng: anchors[0]?.lng };
  const minGridReserve = Math.min(grid.length, Math.max(12, Math.floor(maxZones * 0.32)));
  const namedCap = Math.max(named.length, maxZones - minGridReserve);
  const keptMust = mustKeep.slice(0, namedCap);
  const slots = Math.max(minGridReserve, maxZones - keptMust.length);
  const sortedGrid = grid
    .map(z => ({ z, d: center && center.lat ? distanceKm(z, center) : 0 }))
    .sort((a, b) => a.d - b.d);

  if (slots >= sortedGrid.length) return [...keptMust, ...sortedGrid.map(entry => entry.z)];

  const picked = new Set();
  for (let i = 0; i < slots; i++) {
    const idx = Math.round((i * (sortedGrid.length - 1)) / Math.max(1, slots - 1));
    picked.add(sortedGrid[idx].z);
  }
  for (const entry of sortedGrid) {
    if (picked.size >= slots) break;
    picked.add(entry.z);
  }
  return [...keptMust, ...picked];
}


module.exports = {
  distanceKm,
  compassLabel,
  buildCityGridZones,
  buildCityCoverage
};
