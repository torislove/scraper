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
 *   • district → every sub-district HQ in the district. Each sub-district query
 *                is run as "<category> in <sub-district>, <district>" with the
 *                sub-district radius, so its villages and hamlets are inside
 *                the area that query covers.
 *   • mandal   → the sub-district HQ + every revenue village / ward in it.
 *   • city     → the city's commercial localities + street grid + 5 km ring.
 *
 * `deep: true` additionally enumerates every village of a district. It is
 * explicit because a large district can hold 8,000 villages; the default district
 * sweep stays complete by area without spending a query on each hamlet.
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
  AUTHORITATIVE_CLUSTERS
} = require('../utils/universalGeoCluster');

const {
  LEVELS,
  parseAdminQuery,
  canonicalScope,
  unitLabel,
  describeTerminology,
  keyOf: adminKey
} = require('./indiaAdminUnits');

const CAPS = {
  state: 1200,
  district: 200,
  mandal: 400,
  city: 80
};

const SUFFIX_WORDS = /\b(states?|districts?|dists?|zillas?|zilas?|jillas?|jilas?|mandals?|mandal cluster|tehsils?|tahsils?|talukas?|taluks?|taluq|blocks?|cd blocks?|circles?|sub[-\s]?districts?|subdivisions?|city|town|village|rural|urban|municipalities?|municipal corporations?|nagar palikas?|nagar nigams?|gram panchayats?|GPs?|wards?)\b/gi;

function keyOf(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function lookupCandidates(name) {
  const raw = String(name || '').trim();
  const stripped = raw.replace(SUFFIX_WORDS, ' ').replace(/\s+/g, ' ').trim();
  return [...new Set([raw, stripped].map(keyOf).filter(Boolean))];
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
  // Chhattisgarh). The parent keeps them apart.
  return [name, keyOf(z?.district), keyOf(z?.state)].filter(Boolean).join('|');
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
      radiusKm: z.radiusKm || null,
      typology: z.typology || null
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

function buildDistrictZones(name, options = {}) {
  const entry = lookup(districtIndex, name);
  if (!entry) return null;

  const term = unitLabel(LEVELS.SUBDISTRICT, entry.state, options.explicitTerm);
  const mandals = Array.isArray(entry.mandals) ? entry.mandals : [];
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
    if (mEntry && Array.isArray(mEntry.villages)) {
      villageBuckets.push({ mandal: mName, villages: mEntry.villages, typology });
    }
  }

  // Tier 3 — optional deep enumeration: every village, round-robin across
  // sub-districts so a cap can never starve a whole unit.
  if (options.deep) {
    const farthest = villageBuckets.reduce((max, b) => Math.max(max, b.villages.length), 0);
    for (let round = 0; round < farthest; round += 1) {
      for (const bucket of villageBuckets) {
        const v = bucket.villages[round];
        if (!v || keyOf(v) === keyOf(bucket.mandal)) continue;
        rawList.push({
          name: v,
          kind: 'village',
          mandal: bucket.mandal,
          district: entry.district,
          state: entry.state,
          radiusKm: Math.min(bucket.typology.radiusKm, 5.0),
          typology: bucket.typology.type
        });
      }
    }
  }

  const unique = uniqueZones(rawList);
  const capped = capZones(unique, CAPS.district);
  const villagesTotal = villageBuckets.reduce((sum, b) => sum + b.villages.length, 0);

  return {
    resolvedScope: 'district',
    title: `${entry.district} District`,
    unitTerm: term,
    terminology: describeTerminology(entry.state),
    state: entry.state,
    district: entry.district,
    zones: capped.zones,
    coverage: {
      districts: 1,
      subDistricts: mandals.length,
      subDistrictsCovered: capped.zones.filter(z => z.kind === 'mandal').length,
      villages: villagesTotal,
      villagesCovered: capped.zones.filter(z => z.kind === 'village').length
    },
    stats: {
      totalZones: capped.total,
      returnedZones: capped.zones.length,
      capped: capped.capped,
      cap: CAPS.district,
      mandalsCount: mandals.length
    },
    policy: {
      mode: options.deep ? 'district_deep_villages' : 'every_subdistrict',
      label: `Every ${term} in ${entry.district} District`,
      note: `One query per ${term} plus the district HQ. Each ${term} query covers its own villages and hamlets; enable deep mode to add every revenue village as a separate zone.`
    },
    warnings: capped.capped
      ? [`District resolves to ${capped.total} territorial points; the swarm covers the first ${CAPS.district}.`]
      : []
  };
}

function buildMandalZones(name, options = {}) {
  const entry = lookup(mandalIndex, name);
  if (!entry) return null;

  const term = unitLabel(LEVELS.SUBDISTRICT, entry.state, options.explicitTerm);
  const typology = getMandalTypology(entry.subDistrict);
  const villages = Array.isArray(entry.villages) ? entry.villages : [];

  const rawList = [{
    name: entry.subDistrict,
    kind: 'mandal',
    mandal: entry.subDistrict,
    district: entry.district,
    state: entry.state,
    radiusKm: typology.radiusKm,
    typology: typology.type
  }];

  for (const v of villages) {
    if (keyOf(v) === keyOf(entry.subDistrict)) continue;
    rawList.push({
      name: v,
      kind: 'village',
      mandal: entry.subDistrict,
      district: entry.district,
      state: entry.state,
      radiusKm: Math.min(typology.radiusKm, 5.0),
      typology: typology.type
    });
  }

  const unique = uniqueZones(rawList);
  const capped = capZones(unique, CAPS.mandal);

  return {
    resolvedScope: 'mandal',
    title: `${entry.subDistrict} ${term}`,
    unitTerm: term,
    terminology: describeTerminology(entry.state),
    state: entry.state,
    district: entry.district,
    zones: capped.zones,
    coverage: {
      districts: 1,
      subDistricts: 1,
      subDistrictsCovered: 1,
      villages: villages.length,
      villagesCovered: capped.zones.filter(z => z.kind === 'village').length
    },
    stats: {
      totalZones: capped.total,
      returnedZones: capped.zones.length,
      capped: capped.capped,
      cap: CAPS.mandal,
      villagesCount: villages.length
    },
    policy: {
      mode: 'all_villages_swarm',
      label: `Every village and ward in ${entry.subDistrict} ${term}`,
      note: `Exhaustive ${term} sweep: the HQ query plus every revenue village / hamlet in the ${term}.`
    },
    warnings: capped.capped
      ? [`${term} has ${capped.total} villages; this swarm covers ${CAPS.mandal}.`]
      : []
  };
}

function buildStateZones(name) {
  const entry = lookup(stateIndex, name);
  if (!entry) return null;

  const districts = Array.isArray(entry.districts) ? entry.districts : [];
  const uniqueDistrictNames = uniqueZones(districts.map(d => ({ name: d, kind: 'district', state: entry.state })));

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
  let subDistrictCount = 0;
  for (const dist of uniqueDistrictNames) {
    const distEntry = lookup(districtIndex, dist.name);
    if (!distEntry || !Array.isArray(distEntry.mandals)) continue;
    for (const m of distEntry.mandals) {
      if (keyOf(m) === keyOf(dist.name)) continue;
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
      subDistrictCount += 1;
    }
  }

  const unique = uniqueZones(rawList);
  const capped = capZones(unique, CAPS.state);
  const districtZones = capped.zones.filter(z => z.kind === 'district');

  return {
    resolvedScope: 'state',
    title: entry.state,
    unitTerm: unitLabel(LEVELS.SUBDISTRICT, entry.state),
    terminology: describeTerminology(entry.state),
    state: entry.state,
    district: null,
    zones: capped.zones,
    coverage: {
      districts: districts.length,
      districtsCovered: districtZones.length,
      subDistricts: subDistrictCount,
      subDistrictsCovered: capped.zones.filter(z => z.kind === 'mandal').length
    },
    stats: {
      totalZones: capped.total,
      returnedZones: capped.zones.length,
      capped: capped.capped,
      cap: CAPS.state,
      districts: districts.length,
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

function buildCityZones(name) {
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

  const { AUTHORITATIVE_CLUSTERS, resolveUniversalZones } = require('../utils/universalGeoCluster');
  const matchedClusterKey = Object.keys(AUTHORITATIVE_CLUSTERS).find(k => k === cleanKey || k === strippedKey);
  if (matchedClusterKey) {
    const rawZones = resolveUniversalZones(cleanName, '', false);
    if (Array.isArray(rawZones) && rawZones.length > 0) {
      const all = uniqueZones(rawZones.map(z => ({
        name: z.zoneName || z.name,
        kind: z.coverageKind || 'locality',
        radiusKm: z.radiusKm || 4.0,
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
        zones: capped.zones,
        coverage: { cities: 1, localities: capped.total, localitiesCovered: capped.zones.length },
        stats: {
          totalZones: capped.total,
          returnedZones: capped.zones.length,
          capped: capped.capped,
          cap: CAPS.city
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
  const rawZones = subZones.length ? subZones : resolveUniversalZones(cleanName, '', false).map(z => z.zoneName || z.name);
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
    zones: capped.zones,
    coverage: { cities: 1, localities: capped.total, localitiesCovered: capped.zones.length },
    stats: {
      totalZones: capped.total,
      returnedZones: capped.zones.length,
      capped: capped.capped,
      cap: CAPS.city
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
  if (scope === LEVELS.STATE) return buildStateZones(name);
  if (scope === LEVELS.SUBDISTRICT) return buildMandalZones(name, options);
  if (scope === LEVELS.CITY || scope === LEVELS.VILLAGE) return buildCityZones(name);
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
  const requested = parsed.level || canonicalScope(scope) || LEVELS.DISTRICT;
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
    const cap = CAPS[requested] || 60;
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
