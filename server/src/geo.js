'use strict';

/**
 * server/src/geo.js
 * Sovereign 11-Nation Municipal Zone Resolver & Strict Geographic Boundary Gate.
 * Merges Authoritative 11-Nation Packs with Zero-Cost QLever OSM Planet + Nominatim Polygons.
 */

const citiesIn = require('./geo/cities_in');
const citiesUs = require('./geo/cities_us');
const citiesGb = require('./geo/cities_gb');
const citiesAu = require('./geo/cities_au');
const citiesCa = require('./geo/cities_ca');
const citiesDe = require('./geo/cities_de');
const citiesFr = require('./geo/cities_fr');
const citiesAe = require('./geo/cities_ae');
const citiesSg = require('./geo/cities_sg');
const citiesNz = require('./geo/cities_nz');
const citiesIe = require('./geo/cities_ie');
const { resolveDynamicCity, getCachedCity } = require('./geo/dynamicZones');
const { haversineKm } = require('./geo/osmPolygon');
const { parseAddress, US_STATE_NAMES, AU_STATE_NAMES } = require('./services/addressParser');
const { WORLD_COUNTRIES, ALL_COUNTRY_CODES, COUNTRY_CENTROIDS, getCountry } = require('./geo/worldCountries');
const { findPlaceByName } = require('./geo/geonamesIndex');

const KNOWN_CITIES = {
  ...citiesIn,
  ...citiesUs,
  ...citiesGb,
  ...citiesAu,
  ...citiesCa,
  ...citiesDe,
  ...citiesFr,
  ...citiesAe,
  ...citiesSg,
  ...citiesNz,
  ...citiesIe
};

const ACTIVE_MARKETS = ALL_COUNTRY_CODES;

function resolveCityKey(rawLocation, countryCode = '') {
  if (!rawLocation) return null;
  const lower = String(rawLocation).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!lower) return null;
  const ccFilter = countryCode ? String(countryCode).toUpperCase() : '';

  // Tier 1: Curated Known City Packs
  for (const [key, conf] of Object.entries(KNOWN_CITIES)) {
    if (ccFilter && conf.country !== ccFilter) continue;
    const cityClean = conf.city.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (lower === key || lower === cityClean) return key;
  }
  for (const [key, conf] of Object.entries(KNOWN_CITIES)) {
    if (ccFilter && conf.country !== ccFilter) continue;
    const cityClean = conf.city.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (lower.includes(cityClean)) return key;
  }

  // Tier 2: Offline GeoNames Global Index (matches towns, mandals, and municipalities worldwide)
  const gnPlace = findPlaceByName(rawLocation, ccFilter || 'IN');
  if (gnPlace) {
    const gnKey = `gn_${gnPlace.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    if (!KNOWN_CITIES[gnKey]) {
      const radiusKm = gnPlace.pop > 100000 ? 12 : gnPlace.pop > 30000 ? 8 : 5;
      const degPad = radiusKm / 111.0;
      KNOWN_CITIES[gnKey] = {
        city: gnPlace.name,
        country: ccFilter || 'IN',
        center: { lat: gnPlace.lat, lng: gnPlace.lng },
        bounds: {
          north: gnPlace.lat + degPad,
          south: gnPlace.lat - degPad,
          east: gnPlace.lng + degPad * 1.3,
          west: gnPlace.lng - degPad * 1.3
        },
        radiusKm,
        isGeoNames: true,
        zones: [
          { name: gnPlace.name, lat: gnPlace.lat, lng: gnPlace.lng, radiusKm, isCentral: true }
        ]
      };
    }
    return gnKey;
  }

  return null;
}

function prioritizeTargetWard(zones, location) {
  const locLower = String(location || '').toLowerCase();
  const list = [...(zones || [])];
  const idx = list.findIndex(
    (z) => locLower.includes(z.name.toLowerCase()) || z.name.toLowerCase().includes(locLower)
  );
  if (idx > 0) {
    const [matched] = list.splice(idx, 1);
    list.unshift(matched);
  }
  return list;
}

/**
 * Synchronous zone resolver (reads disk/memory OSM cache first, then KNOWN_CITIES).
 */
function resolveZones(location, countryCode = 'IN', zoneMode = 'smart') {
  const normCountry = String(countryCode || 'IN').toUpperCase();
  const key = resolveCityKey(location, normCountry) || resolveCityKey(location);
  const cityData = key ? KNOWN_CITIES[key] : null;
  const targetName = cityData?.city || String(location || '').trim();

  const cached = getCachedCity(targetName, normCountry, zoneMode);
  if (cached && cached.zones?.length > 0) {
    return { ...cached, zones: prioritizeTargetWard(cached.zones, location) };
  }

  if (cityData) {
    return {
      cityName: cityData.city,
      country: cityData.country,
      center: cityData.center,
      bounds: cityData.bounds,
      mode: zoneMode,
      totalAllPlaces: cityData.zones.length,
      smartCount: cityData.zones.length,
      zones: prioritizeTargetWard(cityData.zones, location)
    };
  }

  const cleanLoc = String(location || '').trim();
  const centroid = COUNTRY_CENTROIDS[normCountry] || { lat: 0, lng: 0 };
  return {
    cityName: cleanLoc || 'Global',
    country: normCountry,
    center: centroid,
    mode: zoneMode,
    totalAllPlaces: 1,
    smartCount: 1,
    zones: [{ name: cleanLoc || 'Central Zone', lat: centroid.lat, lng: centroid.lng, radiusKm: 4.0, isCustom: true }]
  };
}

/**
 * Full Async Zero-Cost OSM Planet + Nominatim Polygon + Offline GeoNames resolver.
 */
async function resolveZonesAsync(location, countryCode = 'IN', { zoneMode = 'smart' } = {}) {
  let normCountry = String(countryCode || 'IN').toUpperCase();
  const sameCountryKey = resolveCityKey(location, normCountry);
  const globalKey = sameCountryKey || resolveCityKey(location);
  const curatedCity = globalKey ? KNOWN_CITIES[globalKey] : null;
  if (!sameCountryKey && curatedCity?.country && ACTIVE_MARKETS.includes(curatedCity.country)) {
    normCountry = curatedCity.country;
  }
  const queryCity = curatedCity?.city || String(location || '').trim();
  const centroid = COUNTRY_CENTROIDS[normCountry] || COUNTRY_CENTROIDS.IN;

  const resolved = await resolveDynamicCity(queryCity, normCountry, {
    zoneMode,
    curatedCity,
    fallbackCentroid: centroid
  });

  return {
    ...resolved,
    country: resolved.country || normCountry,
    rejectTerms: curatedCity?.rejectTerms || [],
    zones: prioritizeTargetWard(resolved.zones, location)
  };
}

const COUNTRY_BOUNDS = {
  IN: { minLat: 6.5, maxLat: 35.8, minLng: 68.0, maxLng: 97.5 },
  US: { minLat: 18.9, maxLat: 71.5, minLng: -179.0, maxLng: -66.8 },
  GB: { minLat: 49.8, maxLat: 60.9, minLng: -8.7, maxLng: 1.8 },
  AU: { minLat: -43.7, maxLat: -10.5, minLng: 112.8, maxLng: 153.7 },
  AE: { minLat: 22.6, maxLat: 26.2, minLng: 51.5, maxLng: 56.5 }
};

const STATE_BOUNDS = {
  TX: { minLat: 25.83, maxLat: 36.50, minLng: -106.65, maxLng: -93.50 },
  CA: { minLat: 32.53, maxLat: 42.01, minLng: -124.48, maxLng: -114.13 },
  FL: { minLat: 24.52, maxLat: 31.00, minLng: -87.64, maxLng: -80.03 },
  NY: { minLat: 40.49, maxLat: 45.02, minLng: -79.77, maxLng: -71.85 },
  IL: { minLat: 36.97, maxLat: 42.51, minLng: -91.52, maxLng: -87.01 }
};

function isWithinCityBounds(lead, targetLocation, resolvedGeo = null) {
  const targetCc = String(resolvedGeo?.country || lead?.country || '').toUpperCase();
  const key = resolveCityKey(targetLocation, targetCc);
  const conf = (key && KNOWN_CITIES[key]) || resolvedGeo;

  const addr = String(lead.address || '').toLowerCase();
  const cityField = String(lead.city || '').toLowerCase();
  const targetLocLow = String(targetLocation || '').trim().toLowerCase();
  const expectedUsState = US_STATE_NAMES[targetLocLow] || (conf?.state && US_STATE_NAMES[String(conf.state).toLowerCase()]) || '';

  const lat = Number(lead.latitude || lead.lat);
  const lng = Number(lead.longitude || lead.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);

  // Fail-closed Country coordinate check
  if (hasCoords && COUNTRY_BOUNDS[targetCc]) {
    const cb = COUNTRY_BOUNDS[targetCc];
    if (lat < cb.minLat || lat > cb.maxLat || lng < cb.minLng || lng > cb.maxLng) {
      return false;
    }
  }

  // Fail-closed State coordinate + address state check (prevents OK/LA/NM/MX bleed into Texas sweeps)
  if (targetCc === 'US' && expectedUsState) {
    if (hasCoords && STATE_BOUNDS[expectedUsState]) {
      const sb = STATE_BOUNDS[expectedUsState];
      if (lat < sb.minLat || lat > sb.maxLat || lng < sb.minLng || lng > sb.maxLng) return false;
    }
    if (lead.address) {
      const parsed = parseAddress(lead.address, 'US', lead.city || '');
      if (parsed.state && parsed.state !== expectedUsState) return false;
      if (/\b(?:mexico|tamaulipas|chihuahua|coahuila|nuevo leon)\b/i.test(addr)) return false;
    }
  }

  // Cross-state / Cross-border isolation for AU, IN, GB, AE
  if (targetCc === 'AU' && conf?.state && lead.address) {
    const parsedAu = parseAddress(lead.address, 'AU', lead.city || '');
    const confStateCode = AU_STATE_NAMES[String(conf.state).toLowerCase()] || String(conf.state).toUpperCase();
    const parsedStateCode = AU_STATE_NAMES[String(parsedAu.state).toLowerCase()] || String(parsedAu.state).toUpperCase();
    if (parsedStateCode && confStateCode && parsedStateCode !== confStateCode) return false;
  }
  if (targetCc === 'IN' && conf?.state && lead.address) {
    const parsedIn = parseAddress(lead.address, 'IN', lead.city || '');
    if (parsedIn.state && parsedIn.state.toLowerCase() !== String(conf.state).toLowerCase()) return false;
  }
  if (targetCc === 'GB' && lead.address) {
    if (/\b(?:republic\s+of\s+ireland|dublin|galway|cork|limerick)\b/i.test(addr)) return false;
  }
  if (targetCc === 'AE' && lead.address) {
    if (/\b(?:saudi\s*arabia|riyadh|jeddah|dammam|qatar|doha|bahrain|manama|oman|muscat|kuwait)\b/i.test(addr)) return false;
  }

  if (!conf) return true;
  const targetCityLower = String(conf.city || conf.cityName || targetLocation || '').toLowerCase();
  const hasTargetCity = targetCityLower && (addr.includes(targetCityLower) || cityField.includes(targetCityLower));

  if (!hasTargetCity && Array.isArray(conf.rejectTerms)) {
    for (const term of conf.rejectTerms) {
      if (addr.includes(term)) return false;
    }
  }

  if (hasCoords && conf.bounds) {
    const { minLat, maxLat, minLng, maxLng } = conf.bounds;
    const pad = 0.03;
    if (lat < minLat - pad || lat > maxLat + pad || lng < minLng - pad || lng > maxLng + pad) {
      return false;
    }
  } else if (hasCoords && conf.center && !STATE_BOUNDS[expectedUsState]) {
    const cLat = Number(conf.center.lat);
    const cLng = Number(conf.center.lng);
    if (Number.isFinite(cLat) && Number.isFinite(cLng) && (cLat !== 0 || cLng !== 0)) {
      if (haversineKm(lat, lng, cLat, cLng) > 65) return false;
    }
  }
  return true;
}

module.exports = {
  ACTIVE_MARKETS,
  KNOWN_CITIES,
  COUNTRY_CENTROIDS,
  resolveCityKey,
  resolveZones,
  resolveZonesAsync,
  isWithinCityBounds
};
