'use strict';

/**
 * server/src/master/masterGeoEngine.js
 * Sovereign Master Fleet Geographic Resolution Engine (11 Countries).
 * Strictly limited to District (County/LGA/Landkreis/Departement/Region) and
 * State (Province/Bundesland/Region/Emirate) sweeps.
 * Execution order:
 *   District -> [1] HQ Urban Wards -> [2] Towns/Municipalities -> [3] Mandals/Sub-Divisions
 *   State    -> Capital/Major District first -> All Districts (each HQ -> Towns -> Mandals)
 */

const fs = require('fs');
const path = require('path');
const { MASTER_ADMIN_PACK, getCountryAdminLabels } = require('./adminRegistry');
const { resolveDynamicCity } = require('../geo/dynamicZones');
const { fetchNominatimAdmin, fetchQleverSubdivisions, resolveCoordsForPlaces } = require('./masterOsmFetcher');

const CACHE_FILE = path.resolve(__dirname, '../../db/master_geo_cache.json');
const COUNTRY_NAMES = {
  IN: 'India', US: 'United States', GB: 'United Kingdom', AU: 'Australia',
  CA: 'Canada', DE: 'Germany', FR: 'France', AE: 'United Arab Emirates',
  SG: 'Singapore', NZ: 'New Zealand', IE: 'Ireland'
};

let diskCache = null;
function loadCache() {
  if (diskCache) return diskCache;
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (parsed && parsed.version === 2 && parsed.entries) {
        diskCache = parsed;
        return diskCache;
      }
    }
  } catch (_) {}
  diskCache = { version: 2, entries: {} };
  return diskCache;
}

function saveCache() {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(diskCache, null, 2), 'utf8');
  } catch (_) {}
}

const normKey = (v) => String(v || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[(),]/g, ' ')
  .replace(/\b(district|dist|zilla|county|parish|borough|shire|lga|region|landkreis|kreis|bezirk|departement|province|state|emirate)\b/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const slugLower = (v) => String(v || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

function findStaticState(raw, cc) {
  const pack = MASTER_ADMIN_PACK[cc];
  if (!pack?.states) return null;
  const q = slugLower(raw);
  const qNorm = normKey(raw);
  return pack.states.find((s) => {
    const sLow = slugLower(s.name);
    if (sLow === q || normKey(s.name) === qNorm) return true;
    return Array.isArray(s.aliases) && s.aliases.some((a) => slugLower(a) === q);
  }) || null;
}

function findStaticDistrict(raw, cc) {
  const pack = MASTER_ADMIN_PACK[cc];
  if (!pack?.districts) return null;
  const q = slugLower(raw);
  const qNorm = normKey(raw);
  for (const [k, info] of Object.entries(pack.districts)) {
    const kSlug = slugLower(k);
    const kNorm = normKey(k);
    if (kSlug === q || kNorm === qNorm || slugLower(info.hq) === qNorm) {
      const exactFromState = (pack.states || [])
        .flatMap((s) => s.districts || [])
        .find((d) => slugLower(d) === kSlug);
      const canonicalName = exactFromState || k.replace(/\b\w/g, (m) => m.toUpperCase()).replace(/\bOf\b/g, 'of');
      return { key: k, canonicalName, ...info };
    }
  }
  for (const st of pack.states || []) {
    for (const dName of st.districts || []) {
      if (slugLower(dName) === q || normKey(dName) === qNorm) {
        return {
          key: dName.toLowerCase(),
          canonicalName: dName,
          state: st.name,
          hq: dName.replace(/\b(District|County|Region|Emirate|Landkreis)\b/gi, '').replace(/\(\d+\)/g, '').trim() || dName,
          center: null,
          towns: [],
          mandals: []
        };
      }
    }
  }
  return null;
}

async function validateMasterLocationAsync(rawLocation, countryCode = 'IN') {
  const cc = String(countryCode || 'IN').toUpperCase();
  const labels = getCountryAdminLabels(cc);
  const clean = String(rawLocation || '').trim();
  if (!clean) {
    return {
      ok: false,
      error: `Enter a ${labels.level2} or ${labels.level1} name.`,
      suggestions: suggestMasterLocations('', cc)
    };
  }

  const staticState = findStaticState(clean, cc);
  if (staticState) {
    return {
      ok: true,
      scope: 'state',
      country: cc,
      canonicalName: staticState.name,
      stateName: staticState.name,
      labels
    };
  }

  const staticDist = findStaticDistrict(clean, cc);
  if (staticDist) {
    return {
      ok: true,
      scope: 'district',
      country: cc,
      canonicalName: staticDist.canonicalName,
      districtName: staticDist.canonicalName,
      stateName: staticDist.state,
      hqCity: staticDist.hq,
      labels
    };
  }

  // Live check for international / uncovered districts or states via Nominatim
  const hits = await fetchNominatimAdmin(`${clean}, ${COUNTRY_NAMES[cc] || cc}`, cc);
  for (const h of hits) {
    const addType = String(h.addresstype || h.type || '').toLowerCase();
    const adminLevel = Number(h.extratags?.admin_level || 0);
    if (addType === 'state' || addType === 'region' && adminLevel === 4 || (h.class === 'boundary' && adminLevel === 4)) {
      const stateName = h.name || h.address?.state || clean;
      return { ok: true, scope: 'state', country: cc, canonicalName: stateName, stateName, nominatimHit: h, labels };
    }
    if (
      addType === 'county' || addType === 'state_district' || addType === 'district' ||
      addType === 'municipality' || addType === 'ceremonial_county' ||
      (h.class === 'boundary' && (adminLevel === 5 || adminLevel === 6))
    ) {
      const districtName = h.name || h.address?.state_district || h.address?.county || clean;
      const hqCity = h.address?.city || h.address?.town || districtName.replace(/\b(District|County|Landkreis)\b/gi, '').trim();
      return {
        ok: true,
        scope: 'district',
        country: cc,
        canonicalName: districtName,
        districtName,
        stateName: h.address?.state || '',
        hqCity: hqCity || districtName,
        nominatimHit: h,
        labels
      };
    }
  }

  // Reject bare neighborhoods / micro-localities and hint parent District/State if known
  const firstHit = hits[0];
  const parentDistrict = firstHit?.address?.state_district || firstHit?.address?.county || '';
  const parentState = firstHit?.address?.state || '';
  const hinted = [parentDistrict, parentState].filter(Boolean);
  return {
    ok: false,
    error: `Master Fleet only accepts ${labels.level2} or ${labels.level1} searches. "${clean}" is not a recognized ${labels.level2} or ${labels.level1}.`,
    suggestions: hinted.length > 0 ? hinted : suggestMasterLocations(clean, cc).slice(0, 6).map((s) => s.name)
  };
}

function suggestMasterLocations(prefix = '', countryCode = 'IN', limit = 12) {
  const cc = String(countryCode || 'IN').toUpperCase();
  const labels = getCountryAdminLabels(cc);
  const pack = MASTER_ADMIN_PACK[cc] || { states: [], districts: {} };
  const q = slugLower(prefix);
  const out = [];
  const seen = new Set();

  for (const st of pack.states || []) {
    if (!q || slugLower(st.name).includes(q) || (st.aliases || []).some((a) => slugLower(a).includes(q))) {
      const key = `state:${st.name.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({
          name: st.name,
          displayName: st.name,
          stateName: st.name,
          country: cc,
          scope: 'state',
          badge: labels.level1,
          subtitle: `${(st.districts || []).length} ${labels.level2}s · Full ${labels.level1} Sweep`
        });
      }
    }
    for (const d of st.districts || []) {
      const staticInfo = findStaticDistrict(d, cc);
      const hq = staticInfo?.hq || '';
      if (!q || slugLower(d).includes(q) || slugLower(st.name).includes(q) || (hq && slugLower(hq).includes(q))) {
        const key = `dist:${d.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          const fullDistLabel = d.toLowerCase() === st.name.toLowerCase() ? `${d}, ${st.name}` : `${d}, ${st.name}`;
          out.push({
            name: d,
            displayName: fullDistLabel,
            stateName: st.name,
            country: cc,
            scope: 'district',
            badge: `${labels.level2} · ${cc}`,
            subtitle: `${d}, ${st.name}${hq ? ` · HQ: ${hq}` : ''} · Towns & ${labels.level3}`
          });
        }
      }
    }
  }
  return out.slice(0, limit);
}

async function buildDistrictPlan(districtMeta, cc, labels) {
  const distName = districtMeta.canonicalName || districtMeta.districtName;
  const hqCity = districtMeta.hqCity || districtMeta.hq || distName;
  const staticDist = findStaticDistrict(distName, cc);
  const center = staticDist?.center || (districtMeta.nominatimHit
    ? { lat: Number(districtMeta.nominatimHit.lat), lng: Number(districtMeta.nominatimHit.lon) }
    : null);

  // Stage 1: District Headquarters Urban Wards (uses Client geo engine in read-only mode)
  let hqPlan = null;
  try {
    hqPlan = await resolveDynamicCity(hqCity, cc);
  } catch (_) {}
  const resolvedCenter = hqPlan?.center || center || { lat: 20.5937, lng: 78.9629 };
  const districtBbox = {
    minLat: resolvedCenter.lat - 0.55,
    maxLat: resolvedCenter.lat + 0.55,
    minLng: resolvedCenter.lng - 0.55,
    maxLng: resolvedCenter.lng + 0.55
  };

  const rawHqWards = Array.isArray(hqPlan?.zones) && hqPlan.zones.length > 0
    ? hqPlan.zones
    : [{ name: `${hqCity} Central`, lat: resolvedCenter.lat, lng: resolvedCenter.lng, radiusKm: 3.0 }];

  const hqZones = rawHqWards.map((z) => ({
    name: z.name,
    lat: z.lat,
    lng: z.lng,
    radiusKm: z.radiusKm || 2.5,
    stage: 'hq_wards',
    stageLabel: `${hqCity} HQ Wards`,
    districtName: distName,
    stateName: districtMeta.stateName || staticDist?.state || '',
    searchLocation: hqCity,
    priority: 1
  }));

  // Stage 2 & Stage 3: Towns + Mandals/Sub-Divisions from static pack + live QLever OSM
  const osmSubdivs = await fetchQleverSubdivisions(districtBbox, resolvedCenter);
  const hqNorm = normKey(hqCity);
  const seenTowns = new Set([hqNorm]);
  const townNames = [];
  for (const t of [...(staticDist?.towns || []), ...osmSubdivs.towns.map((x) => x.name)]) {
    const nk = normKey(t);
    if (!nk || seenTowns.has(nk)) continue;
    seenTowns.add(nk);
    townNames.push(t);
  }
  const osmTownMap = new Map(osmSubdivs.towns.map((t) => [normKey(t.name), t]));
  const missingTownCoords = townNames.filter((t) => !osmTownMap.has(normKey(t)));
  const resolvedMissingTowns = missingTownCoords.length > 0
    ? await resolveCoordsForPlaces(missingTownCoords, `${distName}, ${COUNTRY_NAMES[cc] || cc}`, cc, resolvedCenter)
    : [];
  const missingTownMap = new Map(resolvedMissingTowns.map((t) => [normKey(t.name), t]));

  const townZones = townNames.slice(0, 24).map((name) => {
    const pt = osmTownMap.get(normKey(name)) || missingTownMap.get(normKey(name)) || resolvedCenter;
    return {
      name: `${name} (Town)`,
      rawUnitName: name,
      lat: pt.lat,
      lng: pt.lng,
      radiusKm: 4.5,
      stage: 'towns',
      stageLabel: 'Towns & Municipalities',
      districtName: distName,
      stateName: districtMeta.stateName || staticDist?.state || '',
      searchLocation: `${name}, ${distName}`,
      priority: 2
    };
  });

  const seenMandals = new Set([...seenTowns]);
  const mandalNames = [];
  for (const m of [...(staticDist?.mandals || []), ...osmSubdivs.mandals.map((x) => x.name)]) {
    const nk = normKey(m);
    if (!nk || seenMandals.has(nk)) continue;
    seenMandals.add(nk);
    mandalNames.push(m);
  }
  const osmMandalMap = new Map(osmSubdivs.mandals.map((m) => [normKey(m.name), m]));
  const missingMandals = mandalNames.filter((m) => !osmMandalMap.has(normKey(m)));
  const resolvedMissingMandals = missingMandals.length > 0
    ? await resolveCoordsForPlaces(missingMandals.slice(0, 20), `${distName}, ${COUNTRY_NAMES[cc] || cc}`, cc, resolvedCenter)
    : [];
  const missingMandalMap = new Map(resolvedMissingMandals.map((m) => [normKey(m.name), m]));

  const mandalZones = mandalNames.slice(0, 36).map((name, idx) => {
    const pt = osmMandalMap.get(normKey(name)) || missingMandalMap.get(normKey(name)) || {
      lat: Number((resolvedCenter.lat + Math.cos(idx) * 0.25).toFixed(5)),
      lng: Number((resolvedCenter.lng + Math.sin(idx) * 0.25).toFixed(5))
    };
    return {
      name: `${name} (${labels.level3.split('/')[0].trim()})`,
      rawUnitName: name,
      lat: pt.lat,
      lng: pt.lng,
      radiusKm: 6.0,
      stage: 'mandals',
      stageLabel: labels.level3,
      districtName: distName,
      stateName: districtMeta.stateName || staticDist?.state || '',
      searchLocation: `${name}, ${distName}`,
      priority: 3
    };
  });

  const zones = [...hqZones, ...townZones, ...mandalZones];
  return {
    scope: 'district',
    districtName: distName,
    stateName: districtMeta.stateName || staticDist?.state || '',
    hqCity,
    center: resolvedCenter,
    bounds: districtBbox,
    counts: { hqWards: hqZones.length, towns: townZones.length, mandals: mandalZones.length, total: zones.length },
    zones
  };
}

async function resolveMasterTerritoryAsync(rawLocation, countryCode = 'IN', { maxStateDistricts = 12 } = {}) {
  const cc = String(countryCode || 'IN').toUpperCase();
  const labels = getCountryAdminLabels(cc);
  const validation = await validateMasterLocationAsync(rawLocation, cc);
  if (!validation.ok) {
    return { ok: false, error: validation.error, suggestions: validation.suggestions, labels };
  }

  const cache = loadCache();
  const cacheKey = `${cc}:${validation.scope}:${slugLower(validation.canonicalName)}`;
  const cached = cache.entries[cacheKey];
  if (cached && cached.ts && Date.now() - cached.ts < 7 * 86400 * 1000 && cached.data?.zones?.length > 0) {
    return { ok: true, ...cached.data, cached: true };
  }

  let payload;
  if (validation.scope === 'district') {
    const distPlan = await buildDistrictPlan(validation, cc, labels);
    payload = {
      country: cc,
      scope: 'district',
      locationName: distPlan.districtName,
      stateName: distPlan.stateName,
      hqCity: distPlan.hqCity,
      labels,
      center: distPlan.center,
      bounds: distPlan.bounds,
      counts: distPlan.counts,
      districts: [distPlan],
      zones: distPlan.zones
    };
  } else {
    const staticSt = findStaticState(validation.stateName, cc);
    let districtNames = staticSt?.districts ? [...staticSt.districts] : [];
    const cap = staticSt?.capitalDistrict;
    if (cap) {
      districtNames = [cap, ...districtNames.filter((d) => d.toLowerCase() !== cap.toLowerCase())];
    }
    if (districtNames.length === 0) {
      districtNames = [`${validation.stateName} Central`];
    }
    const targetDistricts = districtNames.slice(0, maxStateDistricts);
    const districtPlans = [];
    for (const dName of targetDistricts) {
      const v = await validateMasterLocationAsync(dName, cc);
      const distMeta = v.ok ? v : { canonicalName: dName, districtName: dName, stateName: validation.stateName, hqCity: dName.replace(/\b(District|County)\b/gi, '').trim() };
      const plan = await buildDistrictPlan(distMeta, cc, labels);
      districtPlans.push(plan);
    }
    const allZones = districtPlans.flatMap((d) => d.zones);
    const primary = districtPlans[0]?.center || { lat: 20.5937, lng: 78.9629 };
    payload = {
      country: cc,
      scope: 'state',
      locationName: validation.stateName,
      stateName: validation.stateName,
      hqCity: districtPlans[0]?.hqCity || validation.stateName,
      labels,
      center: primary,
      bounds: {
        minLat: Math.min(...districtPlans.map((d) => d.bounds.minLat)),
        maxLat: Math.max(...districtPlans.map((d) => d.bounds.maxLat)),
        minLng: Math.min(...districtPlans.map((d) => d.bounds.minLng)),
        maxLng: Math.max(...districtPlans.map((d) => d.bounds.maxLng))
      },
      counts: {
        districts: districtPlans.length,
        hqWards: districtPlans.reduce((s, d) => s + d.counts.hqWards, 0),
        towns: districtPlans.reduce((s, d) => s + d.counts.towns, 0),
        mandals: districtPlans.reduce((s, d) => s + d.counts.mandals, 0),
        total: allZones.length
      },
      districts: districtPlans.map((d) => ({
        districtName: d.districtName,
        hqCity: d.hqCity,
        center: d.center,
        counts: d.counts,
        zones: d.zones
      })),
      zones: allZones
    };
  }

  cache.entries[cacheKey] = { ts: Date.now(), data: payload };
  saveCache();
  return { ok: true, ...payload, cached: false };
}

module.exports = {
  validateMasterLocationAsync,
  suggestMasterLocations,
  resolveMasterTerritoryAsync
};
