/**
 * countrySweepPlan.js — Master territorial sweeps outside India.
 *
 * The Indian planner is gazetteer-driven: 619k villages, 5,920 mandals and 669
 * districts give it exhaustive, named zones. `buildScopeZones` cannot do that
 * for Oakland County or Texas, so it silently returned eight generic sector
 * phrases and reported `resolvedScope: 'city'`. A Master operator asking for a
 * county sweep therefore got a city sweep without being told.
 *
 * This module answers the same question honestly for every other country:
 *
 *   state / region / province
 *     → curated child territories when the taxonomy knows them
 *       (Greater London → its boroughs, Central Region → its planning areas)
 *     → otherwise a sampled lattice over the real administrative bounding box,
 *       labelled `coverage.mode = 'sampled'` so the UI never claims exhaustive
 *       coverage it does not have.
 *
 *   district / county / borough / LGA / emirate
 *     → curated settlements when known (Orange County → Irvine, Anaheim, …)
 *     → otherwise a lattice over the county's own bounding box.
 *
 *   city / town
 *     → the same named-sector + coordinate lattice the client run uses.
 *
 * Everything is keyless: Nominatim/Photon for geometry, the offline taxonomy
 * for names, and the local place index cache for repeat runs.
 */

'use strict';

const { geocodeLocation } = require('../utils/olaMaps');
const { searchPlaces } = require('./globalPlaceIndex');
const { buildGridZones, resolveInternationalZones, pickBestPlace } = require('../utils/internationalGeo');
const { resolveSubdivisions, getCountryTaxonomy } = require('../utils/internationalAdminUnits');

const EARTH_KM_PER_DEG = 111.32;

/** Scope names the UI may send, normalised to the four canonical ids. */
const SCOPE_ALIASES = {
  state: 'state',
  province: 'state',
  region: 'state',
  emirate: 'state',
  district: 'district',
  county: 'district',
  borough: 'district',
  lga: 'district',
  mandal: 'district',
  tehsil: 'district',
  city: 'city',
  town: 'city',
  locality: 'city',
  suburb: 'city'
};

function canonicalScope(scope) {
  const key = String(scope || '').trim().toLowerCase();
  return SCOPE_ALIASES[key] || 'city';
}

function compassLabel(row, col, size) {
  const mid = (size - 1) / 2;
  if (row === mid && col === mid) return 'Central';
  const ns = row < mid ? 'North' : (row > mid ? 'South' : '');
  const ew = col < mid ? 'West' : (col > mid ? 'East' : '');
  if (ns && ew) return `${ns}-${ew}`;
  return ns || ew;
}

function bboxToExtent(bbox, lat) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return null;
  const [south, north, west, east] = bbox.map(Number);
  if (![south, north, west, east].every(Number.isFinite)) return null;
  const latKm = Math.abs(north - south) * EARTH_KM_PER_DEG;
  const lngKm = Math.abs(east - west) * EARTH_KM_PER_DEG * Math.cos((Number(lat) || 0) * Math.PI / 180);
  return {
    latKm,
    lngKm,
    spanKm: Math.max(latKm, lngKm),
    centre: { lat: (south + north) / 2, lng: (west + east) / 2 }
  };
}

/** "Oakland County, Michigan, United States" -> "Michigan" */
function stateFromDisplay(display, countryCode) {
  const parts = String(display || '').split(',').map(part => part.trim()).filter(Boolean);
  if (parts.length < 2) return '';
  void countryCode;
  // The segment before the country is normally the first-level division.
  return parts[parts.length - 2] || '';
}

function shortName(display, fallback) {
  const head = String(display || '').split(',')[0].trim();
  return head || fallback;
}

/**
 * Lattice over a territory's own bounding box.
 * `size` is capped so a state sweep stays a *sampled* grid instead of pretending
 * to enumerate every town.
 */
function latticeOverExtent(extent, opts = {}) {
  const territory = String(opts.territory || '').trim();
  const category = String(opts.category || '').trim();
  // No coverage cap: a caller may ask for a 12×12 lattice (144 zones) when the
  // territory is a whole county. The old 8-cell ceiling silently under-covered
  // large counties.
  const size = Math.max(3, Math.min(12, Number(opts.size) || 5));
  const spanKm = Math.max(6, extent.spanKm);
  const stepKm = spanKm / size;
  const latStep = stepKm / EARTH_KM_PER_DEG;
  const lngStep = stepKm / (EARTH_KM_PER_DEG * Math.max(0.2, Math.cos(extent.centre.lat * Math.PI / 180)));

  const zones = [];
  const labelCounts = new Map();
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const lat = extent.centre.lat + (row - (size - 1) / 2) * latStep;
      const lng = extent.centre.lng + (col - (size - 1) / 2) * lngStep;
      if (lat < -85 || lat > 85 || lng < -180 || lng > 180) continue;
      // A 5×5 grid has two "North" rows and two "West" columns; a counter keeps
      // every zone name unique so the folder and containment map never merge
      // two different search areas under one label.
      const label = compassLabel(row, col, size);
      const count = (labelCounts.get(label) || 0) + 1;
      labelCounts.set(label, count);
      const zoneName = count === 1 ? `${territory} ${label}` : `${territory} ${label} ${count}`;
      zones.push({
        name: zoneName,
        queryText: category ? `${category} in ${territory}` : territory,
        lat,
        lng,
        radiusKm: Math.max(2.5, stepKm / 1.6),
        kind: 'lattice',
        scope: opts.scope || 'district',
        district: territory,
        state: opts.state || ''
      });
    }
  }
  // Centre-out so the densest commercial core is always swept first.
  zones.sort((a, b) => {
    const da = Math.hypot(a.lat - extent.centre.lat, a.lng - extent.centre.lng);
    const db = Math.hypot(b.lat - extent.centre.lat, b.lng - extent.centre.lng);
    return da - db;
  });
  return zones;
}

/**
 * One zone per curated settlement, geocoded in parallel (bounded).
 * A settlement that will not geocode is skipped and reported, never guessed.
 */
async function settlementZones(settlements, territory, opts = {}) {
  const country = String(opts.countryCode || '').toUpperCase();
  const category = String(opts.category || '').trim();
  const concurrency = Math.max(2, Math.min(6, Number(opts.concurrency) || 4));
  const zones = [];
  const failed = [];

  let cursor = 0;
  const workers = new Array(Math.min(concurrency, settlements.length)).fill(0).map(async () => {
    while (cursor < settlements.length) {
      const index = cursor;
      cursor += 1;
      const settlement = settlements[index];
      try {
        const geo = await geocodeLocation(`${settlement}, ${territory}`, { countryCode: country });
        if (!geo || !Number.isFinite(Number(geo.lat)) || !Number.isFinite(Number(geo.lng))) {
          failed.push(settlement);
          continue;
        }
        zones.push({
          name: `${settlement}, ${territory}`,
          queryText: category ? `${category} in ${settlement}, ${territory}` : `${settlement}, ${territory}`,
          lat: Number(geo.lat),
          lng: Number(geo.lng),
          radiusKm: Math.max(5, Number(opts.radiusKm) || 8),
          kind: 'settlement',
          scope: opts.scope || 'district',
          district: territory,
          state: opts.state || ''
        });
      } catch (error) {
        failed.push(settlement);
      }
    }
  });
  await Promise.all(workers);
  return { zones, failed };
}

function buildPolicy(scope, country, coverage) {
  const taxonomy = getCountryTaxonomy(country);
  const terms = taxonomy?.terms || {};
  const label = scope === 'state'
    ? (terms.stateLabel || 'State / Region')
    : scope === 'district'
      ? (terms.districtLabel || 'District / County')
      : 'City / Town';
  return {
    id: `intl-${scope}-${coverage.mode}`,
    label: `${label} sweep (${coverage.mode})`,
    note: coverage.mode === 'exhaustive'
      ? `Every ${label.toLowerCase()} the offline taxonomy knows for this territory is swept as its own zone.`
      : coverage.mode === 'curated'
        ? `Curated child territories for this ${label.toLowerCase()} are swept one by one.`
        : `Sampled ${coverage.zones} × ${coverage.zones} lattice across the real administrative bounding box (about ${Math.round(coverage.stepKm)} km spacing). Run the child district sweeps for exhaustive coverage.`
  };
}

/**
 * @param {object} input
 * @param {string} input.scope        state | district | city (aliases accepted)
 * @param {string} input.name         "Oakland County, Michigan" | "Texas" | "Troy"
 * @param {string} input.countryCode  ISO-2
 * @param {string} [input.category]   search phrase, used in zone query text
 * @param {boolean} [input.deep]      add a 3×3 lattice inside every settlement
 * @param {number} [input.radiusKm]
 * @returns {Promise<object|null>}    the same shape `/master-sweep` already consumes
 */
async function buildCountrySweepPlan(input = {}) {
  const scope = canonicalScope(input.scope);
  const name = String(input.name || '').trim();
  const countryCode = String(input.countryCode || '').toUpperCase();
  if (!name || !countryCode) return null;
  if (countryCode === 'IN') return null; // India keeps the gazetteer planner.

  const category = String(input.category || '').trim();
  const warnings = [];

  // 1. Anchor the territory itself. The country filter is what stops "Troy"
  //    resolving to Tamil Nadu during a US sweep.
  let geo = null;
  try {
    geo = await geocodeLocation(name, { countryCode });
  } catch (error) {
    warnings.push(`Geocoder error for "${name}": ${error.message}`);
  }

  if (!geo || !Number.isFinite(Number(geo.lat))) {
    // Photon fallback before giving up.
    try {
      const places = await searchPlaces(name, { country: countryCode, limit: 5 });
      const best = pickBestPlace(places, name);
      if (best && best.lat != null && best.lng != null) {
        geo = {
          lat: Number(best.lat),
          lng: Number(best.lng),
          formattedLocation: best.display || name,
          boundingbox: null
        };
      }
    } catch (error) {
      warnings.push(`Place index error for "${name}": ${error.message}`);
    }
  }
  if (!geo || !Number.isFinite(Number(geo.lat))) return null;

  const display = String(geo.formattedLocation || name);
  const territory = shortName(display, name);
  const address = geo.address || {};
  const state = address.state || address.province || address.region || address.county || stateFromDisplay(display, countryCode);
  const extent = bboxToExtent(geo.boundingbox, geo.lat);

  // 2. Curated child territories first — they are real names the directories
  //    index, so each zone is a high-yield query instead of a coordinate box.
  const curated = scope === 'city' ? [] : resolveSubdivisions(countryCode, name);
  let zones = [];
  let coverage = { mode: 'sampled', zones: 0, stepKm: 0 };
  let failed = [];

  if (curated.length) {
    const built = await settlementZones(curated, territory, {
      countryCode,
      category,
      scope,
      state,
      radiusKm: Number(input.radiusKm) || 9
    });
    zones = built.zones;
    failed = built.failed;
    coverage = { mode: 'curated', zones: zones.length, stepKm: 0, territories: curated.length };
    if (failed.length) {
      warnings.push(`${failed.length} curated settlement(s) could not be geocoded and were skipped: ${failed.slice(0, 6).join(', ')}.`);
    }
  }

  // 3. Otherwise a lattice over the territory's own bounding box. This is the
  //    honest fallback: real coordinates, real extent, labelled as sampled.
  if (!zones.length) {
    if (!extent) {
      warnings.push(`No administrative bounding box was returned for "${name}"; the lattice uses a fixed radius around the centre.`);
    }
    const effectiveExtent = extent || {
      latKm: 16,
      lngKm: 16,
      spanKm: 16,
      centre: { lat: Number(geo.lat), lng: Number(geo.lng) }
    };
    // Size grows with scope. These are *densities*, not caps: every cell is
    // dispatched. A state is 10×10 = 100 sampled cells, a county 7×7 = 49, a
    // city 5×5 = 25.
    const size = scope === 'state' ? 10 : (scope === 'district' ? 7 : 5);
    zones = latticeOverExtent(effectiveExtent, { territory, category, scope, state, size });
    coverage = {
      mode: 'sampled',
      zones: size,
      stepKm: effectiveExtent.spanKm / size,
      extentKm: Math.round(effectiveExtent.spanKm)
    };
  }

  // 4. `deep` expands every zone into a 3×3 lattice, mirroring India's
  //    "every village" mode without inventing villages that do not exist.
  if (input.deep === true && zones.length) {
    const expanded = [];
    for (const zone of zones) {
      const extentForZone = {
        latKm: (zone.radiusKm || 6) * 2,
        lngKm: (zone.radiusKm || 6) * 2,
        spanKm: (zone.radiusKm || 6) * 2,
        centre: { lat: zone.lat, lng: zone.lng }
      };
      const inner = latticeOverExtent(extentForZone, {
        territory: zone.name,
        category,
        scope: zone.scope,
        state: zone.state,
        size: 3
      });
      expanded.push(...inner);
    }
    zones = expanded;
    coverage = { ...coverage, mode: coverage.mode === 'curated' ? 'curated-deep' : 'sampled-deep', expanded: zones.length };
  }

  if (!zones.length) return null;

  // 5. City scope reuses the client planner (named sectors + 5×5 lattice).
  if (scope === 'city') {
    try {
      const resolved = await resolveInternationalZones(name, category, countryCode, {
        radiusKm: Number(input.radiusKm) || 8,
        isMaster: true
      });
      if (resolved.zones.length) {
        zones = resolved.zones.map(zone => ({
          name: zone.zoneName,
          queryText: zone.queryText,
          lat: zone.lat,
          lng: zone.lng,
          radiusKm: zone.radiusKm,
          kind: zone.kind,
          scope: 'city',
          district: zone.district || territory,
          state: zone.state || state
        }));
        coverage = { mode: 'lattice', zones: resolved.gridZones?.length || zones.length, stepKm: 0 };
      }
    } catch (error) {
      warnings.push(`City lattice fallback used: ${error.message}`);
    }
  }

  const policy = buildPolicy(scope, countryCode, coverage);
  const taxonomy = getCountryTaxonomy(countryCode);
  const terms = taxonomy?.terms || {};

  // Containment reach. A curated territory still needs the *parent* extent:
  // eight London boroughs span Greater London, so a 20 km ring around the
  // centroid would reject Croydon and Kingston. A sampled lattice uses its own
  // bounding box, and a city run keeps the radius the operator asked for.
  const parentSpan = extent ? extent.spanKm : 0;
  const reachKm = coverage.mode.startsWith('sampled')
    ? Math.max(10, parentSpan ? parentSpan * 0.75 : (Number(input.radiusKm) || 9) * 2.4)
    : Math.max(12, parentSpan ? parentSpan * 0.75 : (Number(input.radiusKm) || 9) * 2.4, (Number(input.radiusKm) || 9) * 2);

  return {
    country: countryCode,
    requestedScope: input.scope,
    resolvedScope: scope,
    title: name,
    district: territory,
    state,
    center: { lat: Number(geo.lat), lng: Number(geo.lng) },
    // No India-style territorial boundary outside India: containment is radial
    // from the sweep centre with a reach derived from the real extent.
    boundary: null,
    reachKm,
    unitTerm: terms.subdistrictLabel || 'Locality',
    requestedTerm: terms[`${scope === 'state' ? 'state' : scope === 'district' ? 'district' : 'subdistrict'}Label`] || null,
    terminology: terms,
    coverage,
    policy,
    stats: {
      zones: zones.length,
      capped: false,
      sampled: coverage.mode.startsWith('sampled'),
      geocodedTerritories: zones.filter(zone => zone.kind === 'settlement').length
    },
    warnings,
    zones
  };
}

module.exports = {
  buildCountrySweepPlan,
  canonicalScope,
  latticeOverExtent,
  bboxToExtent,
  settlementZones
};
