/**
 * internationalGeo.js — real coverage zones for every country outside India.
 *
 * The Indian planner is gazetteer-driven: 619k villages, mandals and districts
 * give it precise named zones. None of that exists for Troy, Michigan or
 * Slough, Berkshire, so `resolveUniversalZones` fell back to eight generic
 * sector phrases and the run looked like it only had six workers.
 *
 * This module replaces that fallback with a real geographic grid:
 *
 *   1. Resolve the place through Nominatim (country-filtered) and Photon.
 *   2. Take the resolved bounding box when the geocoder returns one; otherwise
 *      use a radius around the centre.
 *   3. Cut it into a 5×5 lattice of coordinate zones. Each zone is a genuine
 *      search area with its own centre, so Maps and Local Finder can be
 *      dispatched in parallel exactly like Indian mandal villages.
 *
 * Everything is keyless and cached by the underlying place index.
 */

const { searchPlaces } = require('../services/globalPlaceIndex');
const { geocodeLocation } = require('./olaMaps');
const { resolveSubdivisions, getCountryTaxonomy } = require('./internationalAdminUnits');

const EARTH_KM_PER_DEG = 111.32;

function norm(value) {
  return String(value == null ? '' : value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Troy, Michigan" -> "troy" */
function firstSegment(value) {
  return norm(String(value || '').split(',')[0]);
}

/**
 * Pick the result that matches what the operator typed. A country-filtered
 * Photon search for "Troy" returns New York first and Michigan second; if the
 * operator typed "Troy, Michigan" we must not anchor the run in New York.
 */
function pickBestPlace(places, location) {
  if (!Array.isArray(places) || !places.length) return null;
  const whole = norm(location);
  const head = firstSegment(location);
  const tail = norm(String(location || '').split(',').slice(1).join(' '));

  const scored = places.map((place, index) => {
    const display = norm(place.display || '');
    let score = 0;
    if (tail && display.includes(tail)) score += 6;
    if (head && norm(place.value) === head) score += 4;
    if (whole && display.startsWith(whole)) score += 3;
    if (place.level === 'city') score += 2;
    if (place.lat != null && place.lng != null) score += 1;
    return { place, score, index };
  });
  scored.sort((a, b) => (b.score - a.score) || (a.index - b.index));
  return scored[0].place;
}

function compassLabel(row, col, size) {
  const mid = (size - 1) / 2;
  if (row === mid && col === mid) return 'Central';
  const ns = row < mid ? 'North' : (row > mid ? 'South' : '');
  const ew = col < mid ? 'West' : (col > mid ? 'East' : '');
  if (ns && ew) return `${ns}-${ew}`;
  return ns || ew;
}

/**
 * Build high-yield named commercial sectors for an international city.
 * These are marked coverageKind: 'vector' so they always run immediately in Fast mode
 * and are dispatched with Priority 30 for instantaneous sub-second lead arrivals.
 */
function buildInternationalNamedZones(anchor, category, location, opts = {}) {
  const radiusKm = Math.max(4, Math.min(25, Number(opts.radiusKm) || 8));
  const latDelta = (radiusKm * 0.45) / EARTH_KM_PER_DEG;
  const lngDelta = (radiusKm * 0.45) / (EARTH_KM_PER_DEG * Math.max(0.2, Math.cos(anchor.lat * Math.PI / 180)));
  const cleanName = String(anchor.name || '').replace(/^(?:city|town|village|municipality|borough)\s+of\s+/i, '').trim() || anchor.name;
  const stateOrCountry = anchor.state || anchor.country || '';
  const locSuffix = stateOrCountry ? `, ${stateOrCountry}` : '';

  const sectors = [
    {
      name: `${cleanName} Downtown & Commercial Core`,
      query: `${category} in Downtown ${cleanName}${locSuffix}`,
      lat: anchor.lat,
      lng: anchor.lng,
      radiusKm: Math.max(4, radiusKm * 0.5)
    },
    {
      name: `${cleanName} Central Business District`,
      query: `${category} in Central ${cleanName}${locSuffix}`,
      lat: anchor.lat,
      lng: anchor.lng,
      radiusKm: Math.max(4, radiusKm * 0.5)
    },
    {
      name: `${cleanName} North`,
      query: `${category} in North ${cleanName}${locSuffix}`,
      lat: anchor.lat + latDelta,
      lng: anchor.lng,
      radiusKm: Math.max(4, radiusKm * 0.5)
    },
    {
      name: `${cleanName} South`,
      query: `${category} in South ${cleanName}${locSuffix}`,
      lat: anchor.lat - latDelta,
      lng: anchor.lng,
      radiusKm: Math.max(4, radiusKm * 0.5)
    },
    {
      name: `${cleanName} East`,
      query: `${category} in East ${cleanName}${locSuffix}`,
      lat: anchor.lat,
      lng: anchor.lng + lngDelta,
      radiusKm: Math.max(4, radiusKm * 0.5)
    },
    {
      name: `${cleanName} West`,
      query: `${category} in West ${cleanName}${locSuffix}`,
      lat: anchor.lat,
      lng: anchor.lng - lngDelta,
      radiusKm: Math.max(4, radiusKm * 0.5)
    },
    {
      name: `${cleanName} Metro / Commercial Corridors`,
      query: `${category} in ${cleanName}${locSuffix}`,
      lat: anchor.lat,
      lng: anchor.lng,
      radiusKm: radiusKm
    }
  ];

  const baseZones = sectors.map(s => ({
    zoneName: s.name,
    queryText: s.query,
    district: anchor.district || '',
    state: anchor.state || '',
    country: anchor.country,
    lat: s.lat,
    lng: s.lng,
    kind: 'named',
    coverageKind: 'vector',
    isVectorQuery: true,
    isSingle: false,
    radiusKm: s.radiusKm,
    isApproximate: false
  }));

  // Check if authoritative subdivisions exist for this territory (e.g. County/District/Borough)
  const knownSubs = resolveSubdivisions(anchor.country, location) || resolveSubdivisions(anchor.country, anchor.name) || [];
  const subZones = knownSubs.map(sub => ({
    zoneName: `${sub}, ${cleanName}`,
    queryText: `${category} in ${sub}, ${cleanName}${locSuffix}`,
    district: anchor.district || cleanName,
    state: anchor.state || '',
    country: anchor.country,
    lat: anchor.lat,
    lng: anchor.lng,
    kind: 'named',
    coverageKind: 'vector',
    isVectorQuery: true,
    isSingle: false,
    radiusKm: Math.max(4, radiusKm * 0.4),
    isApproximate: false
  }));

  return [...subZones, ...baseZones];
}

function clampCoordinatesToLand(lat, lng, anchor) {
  // Lake Michigan / Indiana Coastal Water Guard (shoreline slopes from ~41.61 near Gary to ~41.72 near Michigan City)
  if (lng >= -87.55 && lng <= -86.75) {
    const shoreLat = 41.718 - Math.max(0, (-86.89 - lng) * 0.22);
    if (lat > shoreLat) {
      // Coordinate is inside Lake Michigan! Clamp south onto land.
      lat = Math.min(shoreLat - 0.006, anchor?.lat || 41.708);
      if (anchor?.lng) lng = (lng + anchor.lng) / 2;
    }
  }
  return { lat, lng };
}

/**
 * Build a square lattice of coordinate zones around a centre.
 * @param {{lat:number,lng:number,name:string,district?:string,state?:string,country:string}} anchor
 * @param {string} category
 * @param {string} location
 * @param {object} [opts]
 */
function buildGridZones(anchor, category, location, opts = {}) {
  // No coverage cap. `size` is how dense the lattice is, not how much of the
  // territory is skipped; the caller decides the density it needs.
  const size = Math.max(3, Math.min(12, Number(opts.size) || 5));
  const radiusKm = Math.max(3, Math.min(60, Number(opts.radiusKm) || 8));
  const spanKm = radiusKm * 2;
  const stepKm = spanKm / size;
  const latStep = stepKm / EARTH_KM_PER_DEG;
  const lngStep = stepKm / (EARTH_KM_PER_DEG * Math.max(0.2, Math.cos(anchor.lat * Math.PI / 180)));
  const stateOrCountry = anchor.state || anchor.country || '';
  const locSuffix = stateOrCountry ? `, ${stateOrCountry}` : '';

  const zones = [];
  const labelCounts = new Map();

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      let rawLat = anchor.lat + (row - (size - 1) / 2) * latStep;
      let rawLng = anchor.lng + (col - (size - 1) / 2) * lngStep;
      const { lat, lng } = clampCoordinatesToLand(rawLat, rawLng, anchor);
      const label = compassLabel(row, col, size);
      const count = (labelCounts.get(label) || 0) + 1;
      labelCounts.set(label, count);
      const zoneName = count === 1
        ? `${anchor.name} ${label}`
        : `${anchor.name} ${label} ${count}`;

      zones.push({
        zoneName,
        // The natural search query paired with exact coordinate viewport
        queryText: `${category} in ${anchor.name}${locSuffix}`,
        district: anchor.district || '',
        state: anchor.state || '',
        country: anchor.country,
        lat,
        lng,
        kind: 'grid',
        coverageKind: 'grid',
        isVectorQuery: false,
        isSingle: false,
        radiusKm: Math.max(1.8, stepKm / 2),
        isApproximate: false
      });
    }
  }

  // Center-out concentric sorting: Zone 1 is ALWAYS the central anchor (commercial core).
  // Outer sectors follow in order of increasing distance from the city centre.
  zones.sort((a, b) => {
    const da = Math.hypot(a.lat - anchor.lat, a.lng - anchor.lng);
    const db = Math.hypot(b.lat - anchor.lat, b.lng - anchor.lng);
    return da - db;
  });

  return zones;
}

/**
 * Resolve an international search into a real zone set.
 *
 * @param {string} location      "Troy", "Troy, Michigan", "Slough, Berkshire"
 * @param {string} category
 * @param {string} countryCode   ISO-2 selected in the UI
 * @param {object} [opts]        { radiusKm, size }
 * @returns {Promise<{zones:Array, anchor:object|null}>}
 */
async function resolveInternationalZones(location, category, countryCode, opts = {}) {
  const country = String(countryCode || '').toUpperCase();
  if (!location || !country) return { zones: [], anchor: null };

  let anchor = null;
  let bbox = null;

  // 1. Nominatim via the shared geocoder. It honours the country filter, so
  //    "Troy" in a US run never lands in Tamil Nadu.
  try {
    const geo = await geocodeLocation(location, { countryCode: country });
    if (geo && Number.isFinite(Number(geo.lat)) && Number.isFinite(Number(geo.lng))) {
      anchor = {
        lat: Number(geo.lat),
        lng: Number(geo.lng),
        name: String(geo.formattedLocation || location).split(',')[0].trim() || location,
        district: '',
        state: '',
        country
      };
      if (Array.isArray(geo.boundingbox) && geo.boundingbox.length === 4) {
        bbox = geo.boundingbox.map(Number);
      }
    }
  } catch (error) {
    // Fall through to Photon.
  }

  // 2. Photon fallback (and richer admin labels).
  try {
    const places = await searchPlaces(location, { country, limit: 5 });
    const best = pickBestPlace(places, location);
    if (best && best.lat != null && best.lng != null) {
      if (!anchor) {
        anchor = {
          lat: Number(best.lat),
          lng: Number(best.lng),
          name: best.name || location,
          district: best.district || '',
          state: best.state || '',
          country
        };
      } else {
        anchor.district = anchor.district || best.district || '';
        anchor.state = anchor.state || best.state || '';
      }
    }
  } catch (error) {
    // Anchor may already exist from Nominatim.
  }

  if (!anchor) return { zones: [], anchor: null };

  // A real bounding box gives the honest extent of the settlement. Convert it
  // to a radius so the lattice covers the whole town, not a fixed 8 km guess.
  let radiusKm = Number(opts.radiusKm) || 8;
  if (bbox) {
    const [south, north, west, east] = bbox;
    const latKm = Math.abs(north - south) * EARTH_KM_PER_DEG;
    const lngKm = Math.abs(east - west) * EARTH_KM_PER_DEG * Math.cos(anchor.lat * Math.PI / 180);
    const derived = Math.max(latKm, lngKm) / 2;
    const maxRadius = opts.isMaster ? 150 : 40;
    if (Number.isFinite(derived) && derived >= 2) radiusKm = Math.min(maxRadius, derived);
  }

  const gridOpts = opts.isMaster ? { ...opts, size: Math.max(5, Number(opts.size) || 5), radiusKm } : { ...opts, radiusKm };
  const namedZones = buildInternationalNamedZones(anchor, category, location, { ...opts, radiusKm });
  const gridZones = buildGridZones(anchor, category, location, gridOpts);
  const zones = [...namedZones, ...gridZones];
  return { zones, anchor, namedZones, gridZones };
}

module.exports = {
  resolveInternationalZones,
  buildInternationalNamedZones,
  buildGridZones,
  clampCoordinatesToLand,
  pickBestPlace
};
