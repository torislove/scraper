/**
 * sweepScopePolicy.js
 *
 * Turns one master sweep request into the exact zone list that will run.
 *
 * India's administrative vocabulary changes by state. This policy therefore
 * stores the *canonical* level (state → district → sub-district → village) and
 * prints the local word in every title: "Tenali Mandal" in Andhra Pradesh,
 * "Pollachi Taluk" in Tamil Nadu, "Barrackpore Block" in West Bengal,
 * "Saharanpur Tehsil" in Uttar Pradesh.
 *
 * Coverage rules (operator requirement: no part of the selected area is skipped):
 *   • state    → every district HQ + every sub-district HQ in every district.
 *   • district → the district HQ + every sub-district HQ + every revenue
 *                village. A district sweep always means every mandal and every
 *                village; the `deep` flag no longer narrows it.
 *   • mandal   → the sub-district HQ + every revenue village / ward in it.
 *   • city     → the city's commercial localities + street grid + 5 km ring.
 *
 * A district plan also carries an explicit `boundary` built from its
 * sub-district anchors: the containment guard uses that union of circles to
 * reject a business that belongs to a neighbouring district, instead of a
 * generous radius measured from one central point.
 *
 * Caps exist only as a safety valve. They are always applied **coverage-first**
 * (every unit gets its HQ before any unit gets a second zone), and the exact
 * numbers are returned so the UI can say "54 of 54 sub-districts covered"
 * instead of pretending.
 */

const {
  classifyLocation,
  stateIndex,
  districtIndex,
  mandalIndex,
  villageIndex,
  getMandalTypology,
  AUTHORITATIVE_CLUSTERS,
  ZONE_COORDINATES,
  buildCityGridZones
} = require('../utils/universalGeoCluster');

const {
  LEVELS,
  parseAdminQuery,
  canonicalScope,
  unitLabel,
  describeTerminology,
  keyOf: adminKey
} = require('./indiaAdminUnits');

/**
 * Coverage caps: none.
 *
 * The old table (state 1200 / district 2600 / mandal 400 / city 250) silently
 * dropped the tail of a territory. A district with 3,000 gazetteer points swept
 * 2,600 of them and told the operator so in a footnote. That is a coverage
 * decision made on the operator's behalf, so it is gone: every resolved zone is
 * dispatched. `capZones` is kept as the single place to reinstate a limit if a
 * future deployment needs one, and it now returns everything.
 */
const CAPS = {
  state: Infinity,
  district: Infinity,
  mandal: Infinity,
  city: Infinity
};

const SUFFIX_WORDS = /\b(states?|districts?|dists?|zillas?|zilas?|jillas?|jilas?|mandals?|mandal cluster|tehsils?|tahsils?|talukas?|taluks?|taluq|blocks?|cd blocks?|circles?|sub[-\s]?districts?|subdivisions?|city|town|village|rural|urban|municipalit(y|ies)|municipality|municipalities|municipal corporations?|corporations?|nagar palikas?|nagar nigams?|gram panchayats?|GPs?|wards?|gmc|vmc|ghmc|bbmp)\b/gi;

function keyOf(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Offline gazetteer coordinate for a place name. Master sweeps use this before
 * any network geocode: a fuzzy geocoder once resolved "Guntur District" to a
 * point in Madhya Pradesh, which put every zone anchor and every containment
 * radius in the wrong state.
 */
function gazetteerCenter(name) {
  const raw = String(name || '').toLowerCase().trim();
  if (!raw) return null;
  const stripped = raw.replace(SUFFIX_WORDS, ' ').replace(/\s+/g, ' ').trim();
  const candidates = [raw, stripped, keyOf(raw), keyOf(stripped)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const hit = ZONE_COORDINATES[candidate];
    if (hit && Number.isFinite(Number(hit.lat)) && Number.isFinite(Number(hit.lng))) {
      return { lat: Number(hit.lat), lng: Number(hit.lng) };
    }
  }
  return null;
}

function averageCenter(points) {
  const valid = (points || []).filter(p => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
  if (!valid.length) return null;
  return {
    lat: valid.reduce((sum, p) => sum + Number(p.lat), 0) / valid.length,
    lng: valid.reduce((sum, p) => sum + Number(p.lng), 0) / valid.length
  };
}

function haversineKm(a, b) {
  if (!a || !b) return Infinity;
  const rad = d => (d * Math.PI) / 180;
  const dLat = rad(Number(b.lat) - Number(a.lat));
  const dLng = rad(Number(b.lng) - Number(a.lng));
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(Number(a.lat))) * Math.cos(rad(Number(b.lat))) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Explicit territorial boundary for a district sweep.
 *
 * Each sub-district anchor is a surveyed gazetteer coordinate. Every anchor gets
 * a radius derived from its nearest neighbour, so the union of circles follows
 * the district's real shape and density. A business outside every circle belongs
 * to a neighbouring district (a Narasaraopet shop is ~25 km from Phirangipuram,
 * a Podili shop ~90 km from Pedanandipadu) and must never enter the folder.
 */
function buildDistrictBoundary(mandals, entry) {
  const centers = [];
  const seen = new Set();
  for (const name of mandals || []) {
    const key = String(name || '').toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    const c = gazetteerCenter(name);
    if (!c) continue;
    seen.add(key);
    centers.push({ name, lat: c.lat, lng: c.lng });
  }
  if (centers.length < 2) return null;

  for (const center of centers) {
    let nearest = Infinity;
    for (const other of centers) {
      if (other === center) continue;
      nearest = Math.min(nearest, haversineKm(center, other));
    }
    // Half the distance to the nearest neighbour keeps adjacent sub-districts
    // overlapping; the +3.5 km covers the outer edge of each unit. 8.5 km is the
    // floor for dense city mandals, 13 km the ceiling for large rural ones.
    center.radiusKm = Math.min(13, Math.max(8.5, nearest / 2 + 3.5));
  }

  return {
    kind: 'mandal_union',
    district: entry.district,
    state: entry.state,
    centers,
    note: 'A lead must sit inside at least one sub-district circle of this district.'
  };
}

function lookupCandidates(name) {
  const raw = String(name || '').trim();
  const MUNICIPAL_ACRONYMS = {
    gmc: 'guntur',
    vmc: 'vijayawada',
    ghmc: 'hyderabad',
    bbmp: 'bangalore',
    mcgm: 'mumbai',
    pmc: 'pune',
    pcmc: 'pune'
  };
  const low = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  const alias = MUNICIPAL_ACRONYMS[low];
  const target = alias || raw;
  const stripped = target.replace(SUFFIX_WORDS, ' ').replace(/\s+/g, ' ').trim();
  return [...new Set([raw, target, stripped].map(keyOf).filter(Boolean))];
}

/**
 * True when the typed place exists in at least one gazetteer index. A paid
 * sweep must not silently spend a hundred zones on a typo, so an unrecognised
 * place gets an explicit warning even though the literal text still runs.
 */
function isKnownPlace(name) {
  const candidates = lookupCandidates(name);
  for (const candidate of candidates) {
    if (stateIndex.has(candidate) || districtIndex.has(candidate)
      || mandalIndex.has(candidate) || villageIndex.has(candidate)
      || AUTHORITATIVE_CLUSTERS[candidate]) {
      return true;
    }
  }
  return false;
}

/**
 * Exact lookup, then a conservative fuzzy pass. Indian place names arrive with
 * transliteration variants (Barrackpore / Barrackpur, Srirangapatna /
 * Srirangapattana). A fuzzy hit must either be a near-complete containment
 * (>=80% of the longer key) or within a small edit distance, so "Srirangapatna"
 * can never collapse into "Patna".
 */
function levenshtein(a, b, max = 2) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = new Array(b.length + 1);
  const next = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    next[0] = i;
    let rowMin = next[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      next[j] = Math.min(prev[j] + 1, next[j - 1] + 1, prev[j - 1] + cost);
      if (next[j] < rowMin) rowMin = next[j];
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j += 1) prev[j] = next[j];
  }
  return prev[b.length];
}

function fuzzyMatch(index, probe) {
  if (probe.length < 6) return null;
  let best = null;
  let bestScore = Infinity;
  for (const [key, entry] of index) {
    if (key.length < 5) continue;
    let score = Infinity;
    if (key.includes(probe) || probe.includes(key)) {
      const ratio = Math.min(key.length, probe.length) / Math.max(key.length, probe.length);
      if (ratio >= 0.8) score = Math.abs(key.length - probe.length);
    }
    if (!Number.isFinite(score)) {
      const distance = levenshtein(probe, key, 2);
      if (distance <= 2) score = distance + Math.abs(key.length - probe.length) / 100;
    }
    if (Number.isFinite(score) && score < bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best;
}

function lookup(index, name) {
  const candidates = lookupCandidates(name);
  for (const key of candidates) {
    const entry = index.get(key);
    if (entry) return entry;
  }
  const probe = candidates[candidates.length - 1] || '';
  return fuzzyMatch(index, probe);
}

function zoneKey(z) {
  const name = keyOf(z?.name || z);
  if (!name) return '';
  // Two districts can legitimately share a sub-district name (Bilaspur in HP and
  // Chhattisgarh), and one district can have two different villages with the
  // same name in different mandals. Parent + sub-district keep them apart.
  return [name, keyOf(z?.mandal), keyOf(z?.district), keyOf(z?.state)].filter(Boolean).join('|');
}

/**
 * The offline gazetteer carries more than one row for the same district in a
 * few states (Andhra Pradesh has both "NTR" and "NTR (Vijayawada)"). Those rows
 * must never inflate a state's district count or split one district's mandals,
 * so aliases resolve to one canonical name and their sub-district lists merge.
 */
const DISTRICT_ALIASES = new Map([
  ['ntr', 'NTR'],
  ['ntrvijayawada', 'NTR']
]);

function canonicalDistrictName(name) {
  const k = keyOf(name);
  return DISTRICT_ALIASES.get(k) || String(name || '').trim();
}

function districtVariantKeys(name) {
  const canonicalKey = keyOf(canonicalDistrictName(name));
  const keys = new Set([canonicalKey]);
  for (const [aliasKey, target] of DISTRICT_ALIASES) {
    if (keyOf(target) === canonicalKey) keys.add(aliasKey);
  }
  return keys;
}

/**
 * Merge every gazetteer row for a district into one entry, unioning mandals so
 * an alias row can add coverage but never duplicate a sub-district.
 */
function districtEntry(name) {
  const rows = [];
  for (const key of districtVariantKeys(name)) {
    const entry = districtIndex.get(key);
    if (entry) rows.push(entry);
  }
  if (!rows.length) {
    const fallback = lookup(districtIndex, name);
    if (fallback) rows.push(fallback);
  }
  if (!rows.length) return null;

  const seenMandals = new Set();
  const mandals = [];
  for (const row of rows) {
    for (const mandal of row.mandals || []) {
      const key = keyOf(mandal);
      if (!key || seenMandals.has(key)) continue;
      seenMandals.add(key);
      mandals.push(mandal);
    }
  }
  return {
    district: canonicalDistrictName(rows[0].district || name),
    state: rows[0].state,
    mandals
  };
}

function uniqueZones(zones) {
  const seen = new Set();
  const out = [];
  for (const z of zones) {
    const name = String(z?.name || z || '').trim();
    if (!name) continue;
    const key = zoneKey({ ...z, name });
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      kind: z.kind || 'zone',
      mandal: z.mandal || null,
      district: z.district || null,
      state: z.state || null,
      radiusKm: z.radiusKm || 6.0,
      typology: z.typology || null,
      // Coordinate cells carry their real anchor and an explicit query string.
      // Dropping them here used to erase a city grid's precision and force the
      // orchestrator to guess the anchor again.
      lat: Number.isFinite(Number(z.lat)) ? Number(z.lat) : undefined,
      lng: Number.isFinite(Number(z.lng)) ? Number(z.lng) : undefined,
      queryText: z.queryText || undefined,
      coverageKind: z.coverageKind || undefined,
      engines: Array.isArray(z.engines) ? z.engines : undefined
    });
  }
  return out;
}

function capZones(zones, cap) {
  return {
    zones: zones.slice(0, cap),
    total: zones.length,
    capped: zones.length > cap
  };
}

function unitZone(name, kind, meta, radiusKm) {
  const typology = meta && meta.subDistrict ? getMandalTypology(meta.subDistrict) : null;
  return {
    name,
    kind,
    mandal: meta && meta.mandal ? meta.mandal : null,
    district: meta && meta.district ? meta.district : null,
    state: meta && meta.state ? meta.state : null,
    radiusKm: radiusKm != null ? radiusKm : (typology ? typology.radiusKm : null),
    typology: typology ? typology.type : null
  };
}

// A district whose gazetteer village list is this thin is under-reported.
// Widening its zones and adding a coordinate grid keeps coverage honest instead
// of silently skipping half the district.
const THIN_DISTRICT_MIN_VILLAGES = 120;

function buildDistrictZones(name, options = {}) {
  const entry = districtEntry(name);
  if (!entry) return null;

  const term = unitLabel(LEVELS.SUBDISTRICT, entry.state, options.explicitTerm);
  // Duplicate gazetteer rows and alias rows must not run the same mandal twice.
  const seenMandals = new Set();
  const mandals = [];
  for (const mandal of entry.mandals || []) {
    const key = keyOf(mandal);
    if (!key || seenMandals.has(key)) continue;
    seenMandals.add(key);
    mandals.push(mandal);
  }
  const hqCity = entry.district;

  // Tier 1 — the district HQ itself, so the parent city is always covered even
  // if the gazetteer lists no sub-districts.
  const rawList = [{
    name: hqCity,
    kind: 'district',
    mandal: null,
    district: entry.district,
    state: entry.state,
    radiusKm: 8.0
  }];

  // Tier 2 — every sub-district HQ. A "<category> in <mandal>, <district>"
  // query is localised by Google to that sub-district, so its villages and
  // hamlets are genuinely inside the area covered by the query.
  const { AUTHORITATIVE_CLUSTERS } = require('../utils/universalGeoCluster');
  const villageBuckets = [];
  for (const mName of mandals) {
    const mEntry = lookup(mandalIndex, mName);
    const typology = getMandalTypology(mName);
    rawList.push({
      name: mName,
      kind: 'mandal',
      mandal: mName,
      district: entry.district,
      state: entry.state,
      radiusKm: typology.radiusKm,
      typology: typology.type
    });
    // If this mandal is a recognized urban commercial hub (e.g. Tenali, Mangalagiri),
    // inject its known commercial sub-clusters so the district sweep penetrates deep town markets
    const mKey = keyOf(mName);
    const mCluster = AUTHORITATIVE_CLUSTERS[mKey];
    if (Array.isArray(mCluster) && mCluster.length > 0) {
      // Every known commercial sub-cluster, not just the first six.
      for (const loc of mCluster) {
        rawList.push({
          name: loc,
          kind: 'locality',
          mandal: mName,
          district: entry.district,
          state: entry.state,
          radiusKm: 6.0,
          typology: 'urban'
        });
      }
    }
    if (mEntry && Array.isArray(mEntry.villages)) {
      villageBuckets.push({ mandal: mName, villages: mEntry.villages, typology });
    }
  }

  // Tier 3 — full village enumeration is always on for a district. The operator
  // asked for a district sweep to mean every mandal AND every village, so the
  // `deep` flag no longer decides coverage; it only remains as an API field for
  // older callers. Villages are added round-robin across sub-districts so a cap
  // can never starve a whole unit.
  let shadowedVillages = 0;
  {
    const farthest = villageBuckets.reduce((max, b) => Math.max(max, b.villages.length), 0);
    for (let round = 0; round < farthest; round += 1) {
      for (const bucket of villageBuckets) {
        const v = bucket.villages[round];
        if (!v) continue;
        // A village whose name is the mandal HQ is already covered by that
        // mandal's own query; count it as covered instead of issuing a
        // duplicate query under a different label.
        if (keyOf(v) === keyOf(bucket.mandal)) { shadowedVillages += 1; continue; }
        rawList.push({
          name: v,
          kind: 'village',
          mandal: bucket.mandal,
          district: entry.district,
          state: entry.state,
          radiusKm: 6.0,
          typology: bucket.typology.type
        });
      }
    }
  }

  let unique = uniqueZones(rawList);
  const villagesTotal = villageBuckets.reduce((sum, b) => sum + b.villages.length, 0);

  // Tier 4 — thin-district safety net. Full village enumeration closes the gaps
  // on its own, so this now runs only when the gazetteer's village list itself
  // looks incomplete. Widening radii plus an urban grid keeps such a district
  // honest instead of silently skipping half of it.
  const thinDistrict = mandals.length > 0
    && villagesTotal < Math.max(THIN_DISTRICT_MIN_VILLAGES, mandals.length * 3);
  let gridAdded = 0;
  if (thinDistrict) {
    unique = unique.map(zone => (zone.kind === 'mandal'
      ? { ...zone, radiusKm: Math.max(Number(zone.radiusKm) || 0, 14) }
      : zone));
    const hub = ZONE_COORDINATES[String(hqCity || '').toLowerCase().trim()];
    if (hub) {
      const grid = buildCityGridZones(hqCity, '', [], {
        center: { lat: Number(hub.lat), lng: Number(hub.lng) },
        cappedRadiusKm: 12,
        ringKm: 6
      });
      const gridZones = grid.map(cell => ({
        name: cell.zoneName,
        kind: 'grid',
        district: entry.district,
        state: entry.state,
        radiusKm: 2.6,
        lat: cell.lat,
        lng: cell.lng,
        queryText: cell.queryText,
        coverageKind: 'grid'
      }));
      const before = unique.length;
      unique = uniqueZones([...unique, ...gridZones]);
      gridAdded = unique.length - before;
    }
  }

  const capped = capZones(unique, CAPS.district);

  const warnings = [];
  if (thinDistrict) {
    warnings.push(
      `The offline gazetteer lists only ${villagesTotal} villages for ${entry.district} District (${mandals.length} ${term.toLowerCase()} units). Each unit's radius is widened and ${gridAdded} coordinate cells fill the gaps so unlisted areas are still swept.`
    );
  }
  if (capped.capped) {
    warnings.push(`District resolves to ${capped.total} territorial points; the swarm covers the first ${CAPS.district}. Narrow the category or run a mandal sweep for the remainder.`);
  }

  return {
    resolvedScope: 'district',
    title: `${entry.district} District`,
    unitTerm: term,
    terminology: describeTerminology(entry.state),
    state: entry.state,
    district: entry.district,
    // Authoritative sweep anchor from the offline gazetteer. Network geocoding
    // is only a fallback in the orchestrator.
    center: gazetteerCenter(entry.district),
    boundary: buildDistrictBoundary(mandals, entry),
    zones: capped.zones,
    coverage: {
      districts: 1,
      subDistricts: mandals.length,
      subDistrictsCovered: capped.zones.filter(z => z.kind === 'mandal').length,
      villages: villagesTotal,
      villagesCovered: Math.min(
        villagesTotal,
        capped.zones.filter(z => z.kind === 'village').length + shadowedVillages
      )
    },
    stats: {
      totalZones: capped.total,
      returnedZones: capped.zones.length,
      capped: capped.capped,
      cap: capped.zones.length,
      mandalsCount: mandals.length,
      villagesCount: villagesTotal,
      thinDistrict,
      gridZones: gridAdded
    },
    policy: {
      mode: 'district_all_mandals_all_villages',
      label: `Every ${term} and every village in ${entry.district} District`,
      note: `Full district coverage: one query for the district HQ, one for every ${term}, and one for every revenue village in the gazetteer — ${villagesTotal} villages in total.`
    },
    warnings
  };
}


function buildMandalBoundary(entry, urbanLocalities = [], villages = [], boundingbox = null) {
  const centers = [];
  const seen = new Set();
  const { ZONE_COORDINATES } = require('../utils/universalGeoCluster');

  for (const loc of urbanLocalities) {
    const key = String(loc || '').toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    const c = ZONE_COORDINATES[key] || gazetteerCenter(loc);
    if (c && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng))) {
      seen.add(key);
      centers.push({ name: loc, lat: Number(c.lat), lng: Number(c.lng), radiusKm: 3.2 });
    }
  }

  const mCenter = gazetteerCenter(entry.subDistrict) || ZONE_COORDINATES[String(entry.subDistrict || '').toLowerCase().trim()];
  if (mCenter && !seen.has(keyOf(entry.subDistrict))) {
    seen.add(keyOf(entry.subDistrict));
    centers.push({ name: entry.subDistrict, lat: Number(mCenter.lat), lng: Number(mCenter.lng), radiusKm: 4.0 });
  }

  for (const v of villages) {
    const key = keyOf(v);
    if (!key || seen.has(key)) continue;
    const c = gazetteerCenter(v);
    if (c && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng))) {
      seen.add(key);
      centers.push({ name: v, lat: Number(c.lat), lng: Number(c.lng), radiusKm: 3.5 });
    }
  }

  let computedBox = boundingbox;
  if ((!computedBox || computedBox.length !== 4) && centers.length >= 2) {
    const lats = centers.map(c => c.lat);
    const lngs = centers.map(c => c.lng);
    computedBox = [
      Number((Math.min(...lats) - 0.015).toFixed(5)),
      Number((Math.max(...lats) + 0.015).toFixed(5)),
      Number((Math.min(...lngs) - 0.015).toFixed(5)),
      Number((Math.max(...lngs) + 0.015).toFixed(5))
    ];
  }

  return {
    kind: 'mandal_boundary',
    mandal: entry.subDistrict,
    district: entry.district,
    state: entry.state,
    centers,
    boundingbox: computedBox,
    note: 'Dynamic mandal boundary: lead must be contained inside the mandal envelope or constituent ward/village nodes.'
  };
}

function buildMandalZones(name, options = {}) {
  const entry = lookup(mandalIndex, name);
  if (!entry) return null;

  const term = unitLabel(LEVELS.SUBDISTRICT, entry.state, options.explicitTerm);
  const typology = getMandalTypology(entry.subDistrict);
  const category = options.category || '';
  const {
    AUTHORITATIVE_CLUSTERS,
    buildCategorySubVectorZones,
    buildCityGridZones,
    ZONE_COORDINATES
  } = require('../utils/universalGeoCluster');

  // Check if subDistrict or stripped name matches an authoritative urban cluster
  // (e.g. Guntur, Vijayawada Urban, Warangal, Pune, Coimbatore, etc.)
  const subDistrictKey = keyOf(entry.subDistrict);
  const strippedSubDistrictKey = keyOf(entry.subDistrict.replace(SUFFIX_WORDS, ' ').replace(/\s+/g, ' ').trim());
  const clusterKey = Object.keys(AUTHORITATIVE_CLUSTERS).find(k => k === subDistrictKey || k === strippedSubDistrictKey);
  const urbanLocalities = clusterKey ? AUTHORITATIVE_CLUSTERS[clusterKey] : [];

  // Duplicate village rows in the gazetteer must not become duplicate queries.
  const seenVillages = new Set();
  const villages = [];
  for (const village of entry.villages || []) {
    const key = keyOf(village);
    if (!key || seenVillages.has(key)) continue;
    seenVillages.add(key);
    villages.push(village);
  }

  const rawList = [{
    name: entry.subDistrict,
    kind: 'mandal',
    mandal: entry.subDistrict,
    district: entry.district,
    state: entry.state,
    radiusKm: typology.radiusKm,
    typology: typology.type
  }];

  // 1. Dual-Status Localities: Urban commercial centers (e.g. Brodipet, Arundelpet, Lakshmipuram)
  if (urbanLocalities.length > 0) {
    for (const loc of urbanLocalities) {
      rawList.push({
        name: loc,
        kind: 'locality',
        mandal: entry.subDistrict,
        district: entry.district,
        state: entry.state,
        radiusKm: 6.0,
        typology: 'urban'
      });
    }
  }

  // 2. Category Sub-Vectors (e.g. Wedding Photography, Photo Studio, Baby Shoots, or CNC, Hardware)
  if (category) {
    const vectorZones = buildCategorySubVectorZones(category, entry.subDistrict, 24);
    for (const vz of vectorZones) {
      rawList.push({
        name: vz.zoneName,
        kind: 'vector',
        mandal: entry.subDistrict,
        district: entry.district,
        state: entry.state,
        radiusKm: 6.0,
        queryText: vz.queryText,
        coverageKind: 'vector'
      });
    }
  }

  // 3. Constituent Rural Revenue Villages
  for (const v of villages) {
    if (keyOf(v) === keyOf(entry.subDistrict)) continue;
    rawList.push({
      name: v,
      kind: 'village',
      mandal: entry.subDistrict,
      district: entry.district,
      state: entry.state,
      radiusKm: 6.0,
      typology: typology.type
    });
  }

  // 4. Viewport grid cells for dense urban / dual-status mandal to ensure zero geometric gaps
  let mandalBbox = options.boundingbox || null;
  const hub = ZONE_COORDINATES[String(entry.subDistrict || '').toLowerCase().trim()] || gazetteerCenter(entry.subDistrict);

  if (urbanLocalities.length > 0 || typology.type === 'urban') {
    if (hub) {
      const localityAnchors = urbanLocalities.map(loc => {
        const c = ZONE_COORDINATES[loc.toLowerCase()] || gazetteerCenter(loc);
        return c ? { lat: Number(c.lat), lng: Number(c.lng) } : null;
      }).filter(Boolean);

      const grid = buildCityGridZones(entry.subDistrict, category, localityAnchors, {
        center: { lat: Number(hub.lat), lng: Number(hub.lng) },
        boundingbox: mandalBbox,
        scope: 'mandal',
        cappedRadiusKm: 4.5,
        ringKm: 0.5
      });
      for (const cell of grid) {
        rawList.push({
          name: cell.zoneName,
          kind: 'grid',
          mandal: entry.subDistrict,
          district: entry.district,
          state: entry.state,
          radiusKm: cell.radiusKm || 2.5,
          lat: cell.lat,
          lng: cell.lng,
          boundingbox: cell.boundingbox || mandalBbox,
          queryText: cell.queryText,
          coverageKind: 'grid'
        });
      }
    }
  }

  const unique = uniqueZones(rawList);
  const capped = capZones(unique, CAPS.mandal);
  const isDual = urbanLocalities.length > 0;
  const mandalBoundary = buildMandalBoundary(entry, urbanLocalities, villages, mandalBbox);

  return {
    resolvedScope: 'mandal',
    title: isDual ? `${entry.subDistrict} Mandal & Urban Center` : `${entry.subDistrict} ${term}`,
    unitTerm: term,
    terminology: describeTerminology(entry.state),
    state: entry.state,
    district: entry.district,
    center: gazetteerCenter(entry.subDistrict),
    boundary: mandalBoundary,
    zones: capped.zones,
    coverage: {
      districts: 1,
      subDistricts: 1,
      subDistrictsCovered: 1,
      localities: urbanLocalities.length,
      villages: villages.length,
      villagesCovered: capped.zones.filter(z => z.kind === 'village').length
    },
    stats: {
      totalZones: capped.total,
      returnedZones: capped.zones.length,
      capped: capped.capped,
      cap: capped.zones.length,
      urbanLocalitiesCount: urbanLocalities.length,
      villagesCount: villages.length,
      isDualStatus: isDual
    },
    policy: {
      mode: isDual ? 'dual_status_urban_rural_swarm' : 'all_villages_swarm',
      label: isDual
        ? `Dual-Status Sweep: Urban localities, commercial clusters & rural villages in ${entry.subDistrict}`
        : `Every village and ward in ${entry.subDistrict} ${term}`,
      note: isDual
        ? `Comprehensive dual-status sweep: includes ${urbanLocalities.length} urban commercial localities, category sub-vectors, and all ${villages.length} revenue villages.`
        : `Exhaustive ${term} sweep: the HQ query plus every revenue village / hamlet in the ${term}.`
    },
    warnings: capped.capped
      ? [`${term} has ${capped.total} points; this swarm covers ${CAPS.mandal}.`]
      : []
  };
}

function buildStateZones(name) {
  const entry = lookup(stateIndex, name);
  if (!entry) return null;

  const rawDistricts = Array.isArray(entry.districts) ? entry.districts : [];
  // Collapse alias rows (NTR / NTR (Vijayawada)) before counting or planning,
  // otherwise Andhra Pradesh claims 27 districts instead of 26.
  const districtNames = [];
  const seenDistricts = new Set();
  for (const raw of rawDistricts) {
    const canonical = canonicalDistrictName(raw);
    const key = keyOf(canonical);
    if (!key || seenDistricts.has(key)) continue;
    seenDistricts.add(key);
    districtNames.push(canonical);
  }
  const uniqueDistrictNames = uniqueZones(districtNames.map(d => ({ name: d, kind: 'district', state: entry.state })));

  // Tier 1 — every district HQ.
  const rawList = uniqueDistrictNames.map(z => ({
    name: z.name,
    kind: 'district',
    district: z.name,
    state: entry.state,
    radiusKm: 8.0
  }));

  // Tier 2 — every sub-district HQ of every district. Villages are deliberately
  // not enumerated at state level: each sub-district query already covers its
  // own villages, and a state has hundreds of thousands of them.
  const uniqueSubDistrictKeys = new Set();
  for (const dist of uniqueDistrictNames) {
    const distEntry = districtEntry(dist.name);
    if (!distEntry || !Array.isArray(distEntry.mandals)) continue;
    for (const m of distEntry.mandals) {
      if (keyOf(m) === keyOf(dist.name)) continue;
      const uniqueKey = `${keyOf(m)}|${keyOf(dist.name)}`;
      if (uniqueSubDistrictKeys.has(uniqueKey)) continue;
      uniqueSubDistrictKeys.add(uniqueKey);
      const typology = getMandalTypology(m);
      rawList.push({
        name: m,
        kind: 'mandal',
        mandal: m,
        district: dist.name,
        state: entry.state,
        radiusKm: typology.radiusKm,
        typology: typology.type
      });
    }
  }
  const subDistrictCount = uniqueSubDistrictKeys.size;

  const unique = uniqueZones(rawList);
  const capped = capZones(unique, CAPS.state);
  const districtZones = capped.zones.filter(z => z.kind === 'district');
  const coveredSubDistricts = new Set(
    capped.zones
      .filter(z => z.kind === 'mandal')
      .map(z => `${keyOf(z.name)}|${keyOf(z.district)}`)
  );

  return {
    resolvedScope: 'state',
    title: entry.state,
    unitTerm: unitLabel(LEVELS.SUBDISTRICT, entry.state),
    terminology: describeTerminology(entry.state),
    state: entry.state,
    district: null,
    center: averageCenter(districtNames.map(d => gazetteerCenter(d))),
    zones: capped.zones,
    coverage: {
      districts: districtNames.length,
      districtsCovered: districtZones.length,
      subDistricts: subDistrictCount,
      subDistrictsCovered: coveredSubDistricts.size
    },
    stats: {
      totalZones: capped.total,
      returnedZones: capped.zones.length,
      capped: capped.capped,
      cap: capped.zones.length,
      districts: districtNames.length,
      subDistricts: subDistrictCount
    },
    policy: {
      mode: 'state_districts_subdistricts_swarm',
      label: `All districts + every ${unitLabel(LEVELS.SUBDISTRICT, entry.state)}`,
      note: `State-wide swarm: every district HQ plus every sub-district HQ. Each sub-district query covers its own villages.`
    },
    warnings: capped.capped
      ? [`State resolves to ${capped.total} points; the swarm covers the first ${CAPS.state}. Run district sweeps for deeper village enumeration.`]
      : []
  };
}

function buildCityZones(name, options = {}) {
  const cleanName = String(name || '').trim();
  const cleanKey = keyOf(cleanName);
  const strippedKey = keyOf(cleanName.replace(SUFFIX_WORDS, ' ').replace(/\s+/g, ' ').trim());

  // A city still belongs to a state, and that state's word for a sub-district
  // matters in the UI ("Taluk" in Coimbatore, not "Mandal"). Look the city up
  // as a district HQ first, then as a sub-district HQ.
  const cityContext = (() => {
    const candidates = lookupCandidates(cleanName);
    for (const candidate of candidates) {
      const district = districtIndex.get(candidate);
      if (district && district.state) return { state: district.state, district: district.district };
    }
    for (const candidate of candidates) {
      const mandal = mandalIndex.get(candidate);
      if (mandal && mandal.state) return { state: mandal.state, district: mandal.district };
    }
    return { state: null, district: null };
  })();

  // If this city is also an authoritative dual-status mandal / municipal corporation,
  // return the complete dual-status swarm (localities + trade vectors + constituent villages + GPS mesh)
  const isDualMandalCity = mandalIndex.has(cleanKey) || mandalIndex.has(strippedKey);
  if (isDualMandalCity) {
    const mandalRes = buildMandalZones(cleanName, options);
    if (mandalRes && Array.isArray(mandalRes.zones) && mandalRes.zones.length > 30) {
      return mandalRes;
    }
  }

  const { AUTHORITATIVE_CLUSTERS, resolveUniversalZones } = require('../utils/universalGeoCluster');
  const matchedClusterKey = Object.keys(AUTHORITATIVE_CLUSTERS).find(k => k === cleanKey || k === strippedKey);
  const targetCountry = options.countryCode || options.country || 'IN';
  if (matchedClusterKey) {
    const rawZones = resolveUniversalZones(cleanName, options.category || '', options.isMaster || false, targetCountry);
    if (Array.isArray(rawZones) && rawZones.length > 0) {
      const all = uniqueZones(rawZones.map(z => ({
        name: z.zoneName || z.name,
        kind: z.coverageKind || 'locality',
        radiusKm: z.radiusKm || 6.0,
        lat: z.lat,
        lng: z.lng
      })));
      const capped = capZones(all, CAPS.city);
      const title = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      return {
        resolvedScope: 'city',
        title,
        unitTerm: 'City',
        terminology: describeTerminology(cityContext.state),
        state: cityContext.state,
        district: cityContext.district || title,
        center: averageCenter(capped.zones) || gazetteerCenter(cleanName),
        zones: capped.zones,
        coverage: { cities: 1, localities: capped.total, localitiesCovered: capped.zones.length },
        stats: {
          totalZones: capped.total,
          returnedZones: capped.zones.length,
          capped: capped.capped,
          cap: capped.zones.length
        },
        policy: {
          mode: 'commercial_localities_and_grid',
          label: 'Every commercial corridor and street grid inside the city',
          note: 'Full urban sweep across the city footprint plus the 5 km ring; coordinate cells fill gaps between named localities.'
        },
        warnings: capped.capped
          ? [`City has ${capped.total} localities; this swarm covers ${CAPS.city}.`]
          : []
      };
    }
  }

  const classification = classifyLocation(name);
  if (!classification || !['city', 'town', 'mandal', 'metro', 'village'].includes(classification.type)) {
    return null;
  }

  const subZones = Array.isArray(classification.subZones) ? classification.subZones : [];
  const rawZones = subZones.length ? subZones : resolveUniversalZones(cleanName, options.category || '', options.isMaster || false, targetCountry).map(z => z.zoneName || z.name);
  if (!Array.isArray(rawZones) || rawZones.length < 1) return null;

  const all = uniqueZones(rawZones.map(z => ({ name: z, kind: 'locality' })));
  const capped = capZones(all, CAPS.city);
  return {
    resolvedScope: 'city',
    title: classification.name || name,
    unitTerm: 'City',
    terminology: describeTerminology(classification.state || cityContext.state),
    state: classification.state || cityContext.state,
    district: classification.district || cityContext.district || null,
    center: gazetteerCenter(classification.name || cleanName) || gazetteerCenter(cleanName),
    zones: capped.zones,
    coverage: { cities: 1, localities: capped.total, localitiesCovered: capped.zones.length },
    stats: {
      totalZones: capped.total,
      returnedZones: capped.zones.length,
      capped: capped.capped,
      cap: capped.zones.length
    },
    policy: {
      mode: 'commercial_localities_and_grid',
      label: 'Every commercial corridor and street grid inside the city',
      note: 'City sweeps cover the city footprint plus the 5 km ring.'
    },
    warnings: capped.capped
      ? [`City has ${capped.total} localities; this swarm covers ${CAPS.city}.`]
      : []
  };
}

function buildFor(scope, name, options) {
  if (scope === LEVELS.STATE) return buildStateZones(name, options);
  if (scope === LEVELS.SUBDISTRICT) return buildMandalZones(name, options);
  if (scope === LEVELS.CITY || scope === LEVELS.VILLAGE) return buildCityZones(name, options);
  return buildDistrictZones(name, options);
}

/**
 * Resolve a master sweep scope + name into zones.
 *
 * `scope` may be the API's canonical word (state / district / mandal / city) or
 * any Indian synonym (taluk, taluka, tehsil, tahsil, block, circle, zilla,
 * municipality...). An explicit suffix in the typed name wins, so
 * "Pollachi Taluk" is never treated as a district even if the UI sent
 * scope=district — exactly what an operator in Tamil Nadu expects.
 */
function buildScopeZones(scope, name, options = {}) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;

  const parsed = parseAdminQuery(trimmed);
  const isExplicitMandalScope = canonicalScope(scope) === LEVELS.SUBDISTRICT;
  const requested = isExplicitMandalScope ? LEVELS.SUBDISTRICT : (parsed.level || canonicalScope(scope) || LEVELS.DISTRICT);
  const placeName = parsed.name || trimmed;
  const buildOptions = {
    ...options,
    // Only a sub-district unit has a state-specific name worth carrying through
    // ("Pollachi Taluk" must stay Taluk). "Pradesh State" or "Guntur Zilla"
    // still print as State / District.
    explicitTerm: requested === LEVELS.SUBDISTRICT ? (parsed.term || options.explicitTerm) : options.explicitTerm
  };

  let result = buildFor(requested, placeName, buildOptions);

  // Graceful fallback: the declared scope may be wrong ("Guntur" typed as
  // state). Try the other levels before giving up, in a sensible order.
  if (!result) {
    const fallbackOrder = requested === LEVELS.STATE
      ? [LEVELS.DISTRICT, LEVELS.SUBDISTRICT, LEVELS.CITY]
      : requested === LEVELS.DISTRICT
        ? [LEVELS.SUBDISTRICT, LEVELS.CITY, LEVELS.STATE]
        : requested === LEVELS.SUBDISTRICT
          ? [LEVELS.DISTRICT, LEVELS.CITY, LEVELS.STATE]
          : [LEVELS.SUBDISTRICT, LEVELS.DISTRICT, LEVELS.STATE];

    for (const next of fallbackOrder) {
      result = buildFor(next, placeName, buildOptions);
      if (result) {
        result.warnings = [
          `"${placeName}" is not a ${requested}; resolved as ${result.resolvedScope} instead.`,
          ...(result.warnings || [])
        ];
        break;
      }
    }
  }

  if (!result) {
    const classification = classifyLocation(placeName);
    const subZones = Array.isArray(classification?.subZones) ? classification.subZones : [];
    const cap = CAPS[requested] || Infinity;
    result = {
      resolvedScope: classification?.type || requested,
      title: classification?.name || placeName,
      unitTerm: unitLabel(requested, classification?.state || null, parsed.term),
      terminology: describeTerminology(classification?.state || null),
      state: classification?.state || null,
      district: classification?.district || null,
      zones: uniqueZones((subZones.length ? subZones : [placeName]).map(z => ({ name: z, kind: 'zone' }))).slice(0, cap),
      coverage: null,
      stats: {
        totalZones: subZones.length || 1,
        returnedZones: Math.min(subZones.length || 1, cap),
        capped: false,
        cap
      },
      policy: {
        mode: 'classifier_fallback',
        label: 'Resolved by the local classifier',
        note: 'Place was not in the offline gazetteer; the classifier-derived zones are used.'
      },
      warnings: ['Place not found in the offline gazetteer — using the classifier fallback.']
    };
  }

  // Every response carries the vocabulary the UI should print.
  if (!result.unitTerm) result.unitTerm = unitLabel(requested, result.state, parsed.term);
  if (!result.terminology) result.terminology = describeTerminology(result.state);

  // Honesty gate: a city plan built from words that match nothing in any
  // gazetteer index is a literal search, not a confirmed place. Keep running
  // (the operator may know a town the offline data missed) but say so loudly
  // before credits are spent. A fuzzy sub-district match (Barrackpore →
  // Barrackpur I) already resolved to a real unit, so it is not warned.
  if (result.resolvedScope === 'city' && !isKnownPlace(placeName)) {
    result.unverifiedPlace = true;
    result.warnings = [
      `"${placeName}" was not found in the offline India gazetteer. Check the spelling — this will literally search the words you typed.`,
      ...(result.warnings || [])
    ];
  }

  result.requestedScope = requested;
  result.requestedTerm = parsed.term || result.unitTerm;
  return result;
}

module.exports = { buildScopeZones, CAPS, LEVELS };
