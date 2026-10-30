/**
 * sweepScopePolicy.js
 *
 * Turns one master sweep request into the exact zone list that will run.
 *
 * The operator's rule (Indian reality):
 *   • district  → every mandal, no village enumeration. Google already returns
 *                 village shops for a mandal-level query, so listing 300
 *                 villages would only multiply duplicate requests.
 *   • mandal    → every village / ward in that mandal.
 *   • state     → every district (each district HQ city is its own query) plus
 *                 the major mandals, up to a practical cap.
 *   • city      → the city's commercial localities.
 *
 * Caps are explicit and returned in the payload, so the UI can say
 * "56 of 56 mandate covered" or "300 of 412 zones (cap reached)" instead of
 * silently pretending the sweep is complete.
 */

const {
  classifyLocation,
  stateIndex,
  districtIndex,
  mandalIndex
} = require('../utils/universalGeoCluster');

const CAPS = {
  state: 300,
  district: 120,
  mandal: 160,
  city: 60
};

const SUFFIX_WORDS = /\b(district|zilla|mandal|mandal cluster|tehsil|tahsil|taluk|taluka|circle|block|state|city|town|village|rural|urban)\b/gi;

function keyOf(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function lookupCandidates(name) {
  const raw = String(name || '').trim();
  const stripped = raw.replace(SUFFIX_WORDS, ' ').replace(/\s+/g, ' ').trim();
  return [...new Set([raw, stripped].map(keyOf).filter(Boolean))];
}

function lookup(index, name) {
  for (const key of lookupCandidates(name)) {
    const entry = index.get(key);
    if (entry) return entry;
  }
  return null;
}

function uniqueZones(zones) {
  const seen = new Set();
  const out = [];
  for (const zone of zones) {
    const name = String(zone?.name || zone || '').trim();
    if (!name) continue;
    const key = keyOf(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name, kind: zone.kind || 'zone' });
  }
  return out;
}

function zone(name, kind) {
  return { name: String(name || '').trim(), kind };
}

function capZones(zones, cap) {
  return {
    zones: zones.slice(0, cap),
    total: zones.length,
    capped: zones.length > cap
  };
}

function buildDistrictZones(name) {
  const entry = lookup(districtIndex, name);
  if (!entry) return null;

  // District => every mandal (the "major" administrative hubs). We deliberately
  // do NOT expand villages here: a mandal-headquarters query already returns
  // the surrounding village shops through Google/Maps.
  const mandals = uniqueZones((entry.mandals || []).map(m => zone(m, 'mandal')));
  const capped = capZones(mandals, CAPS.district);

  return {
    resolvedScope: 'district',
    title: `${entry.district} District`,
    state: entry.state,
    district: entry.district,
    zones: capped.zones,
    stats: {
      totalZones: capped.total,
      returnedZones: capped.zones.length,
      capped: capped.capped,
      cap: CAPS.district
    },
    policy: {
      mode: 'mandal_hubs_only',
      label: 'All mandals · villages covered by each mandal query',
      note: 'Each mandal query already returns the shops of its villages, so villagers are never missed.'
    },
    warnings: capped.capped
      ? [`District has ${capped.total} mandals; the swarm will cover the first ${CAPS.district}. Run a second sweep for the remainder.`]
      : []
  };
}

function buildMandalZones(name) {
  const entry = lookup(mandalIndex, name);
  if (!entry) return null;

  const villages = Array.isArray(entry.villages) && entry.villages.length
    ? entry.villages
    : [entry.subDistrict];
  const all = uniqueZones(villages.map(v => zone(v, 'village')));
  const capped = capZones(all, CAPS.mandal);

  return {
    resolvedScope: 'mandal',
    title: `${entry.subDistrict} Mandal`,
    state: entry.state,
    district: entry.district,
    zones: capped.zones,
    stats: {
      totalZones: capped.total,
      returnedZones: capped.zones.length,
      capped: capped.capped,
      cap: CAPS.mandal
    },
    policy: {
      mode: 'all_villages',
      label: 'Every village and ward in the mandal',
      note: 'Mandal sweeps are exhaustive: every revenue village is queried.'
    },
    warnings: capped.capped
      ? [`Mandal has ${capped.total} villages; this swarm covers ${CAPS.mandal}.`]
      : []
  };
}

function buildStateZones(name) {
  const entry = lookup(stateIndex, name);
  if (!entry) return null;

  const districts = uniqueZones((entry.districts || []).map(d => zone(d, 'district')));

  // Every district is a zone (its HQ city is searched by name). Then add the
  // district's major mandals so the state sweep is not district-HQ-only.
  const mandalZones = [];
  for (const district of districts) {
    const distEntry = lookup(districtIndex, district.name);
    if (!distEntry || !Array.isArray(distEntry.mandals)) continue;
    const wanted = [district.name];
    const rest = distEntry.mandals.filter(m => keyOf(m) !== keyOf(district.name));
    wanted.push(...rest.slice(0, 8));
    for (const m of wanted) mandalZones.push(zone(m, 'mandal'));
  }

  const combined = uniqueZones([...districts.map(d => zone(d.name, 'district')), ...mandalZones]);
  const capped = capZones(combined, CAPS.state);

  return {
    resolvedScope: 'state',
    title: entry.state,
    state: entry.state,
    district: null,
    zones: capped.zones,
    stats: {
      totalZones: capped.total,
      returnedZones: capped.zones.length,
      capped: capped.capped,
      cap: CAPS.state,
      districts: districts.length
    },
    policy: {
      mode: 'districts_plus_major_mandals',
      label: 'All districts + district HQ cities + up to 9 major mandals each',
      note: 'Every district is covered; deep village coverage is a district sweep.'
    },
    warnings: capped.capped
      ? [`State resolves to ${capped.total} major zones; the swarm covers ${CAPS.state}. Continue with district sweeps for the rest.`]
      : []
  };
}

function buildCityZones(name) {
  const classification = classifyLocation(name);
  if (!classification || (classification.type !== 'city' && classification.type !== 'town' && classification.type !== 'mandal')) {
    return null;
  }

  const subZones = Array.isArray(classification.subZones) ? classification.subZones : [];
  if (!subZones.length) return null;
  const all = uniqueZones(subZones.map(z => zone(z, 'locality')));
  const capped = capZones(all, CAPS.city);

  return {
    resolvedScope: 'city',
    title: classification.name || name,
    state: classification.state || null,
    district: classification.district || null,
    zones: capped.zones,
    stats: {
      totalZones: capped.total,
      returnedZones: capped.zones.length,
      capped: capped.capped,
      cap: CAPS.city
    },
    policy: {
      mode: 'commercial_localities',
      label: 'Commercial localities inside the city',
      note: 'City sweeps cover the shopping corridors where listed businesses cluster.'
    },
    warnings: capped.capped
      ? [`City has ${capped.total} localities; this swarm covers ${CAPS.city}.`]
      : []
  };
}

/**
 * Resolve a master sweep scope + name into zones.
 * Returns null when nothing in the local gazetteer matched.
 */
function buildScopeZones(scope, name) {
  const wanted = ['state', 'district', 'mandal', 'city'].includes(scope) ? scope : 'district';
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;

  let result = null;
  if (wanted === 'state') result = buildStateZones(trimmed);
  else if (wanted === 'mandal') result = buildMandalZones(trimmed);
  else if (wanted === 'city') result = buildCityZones(trimmed);
  else result = buildDistrictZones(trimmed);

  // Graceful fallback: the declared scope may be wrong ("Guntur" typed as
  // state). Try the other levels before giving up.
  if (!result) {
    const fallbackOrder = wanted === 'state'
      ? ['district', 'mandal', 'city']
      : wanted === 'district'
        ? ['mandal', 'city', 'state']
        : wanted === 'mandal'
          ? ['district', 'city', 'state']
          : ['mandal', 'district', 'state'];

    for (const next of fallbackOrder) {
      result = next === 'state'
        ? buildStateZones(trimmed)
        : next === 'mandal'
          ? buildMandalZones(trimmed)
          : next === 'city'
            ? buildCityZones(trimmed)
            : buildDistrictZones(trimmed);
      if (result) {
        result.warnings = [
          `"${trimmed}" is not a ${wanted}; resolved as ${result.resolvedScope} instead.`,
          ...(result.warnings || [])
        ];
        break;
      }
    }
  }

  if (!result) {
    const classification = classifyLocation(trimmed);
    const subZones = Array.isArray(classification?.subZones) ? classification.subZones : [];
    result = {
      resolvedScope: classification?.type || wanted,
      title: classification?.name || trimmed,
      state: classification?.state || null,
      district: classification?.district || null,
      zones: uniqueZones((subZones.length ? subZones : [trimmed]).map(z => zone(z, 'zone'))).slice(0, CAPS[wanted] || 60),
      stats: {
        totalZones: subZones.length || 1,
        returnedZones: Math.min(subZones.length || 1, CAPS[wanted] || 60),
        capped: false,
        cap: CAPS[wanted] || 60
      },
      policy: {
        mode: 'classifier_fallback',
        label: 'Resolved by the local classifier',
        note: 'Place was not in the gazetteer; the classifier-derived zones are used.'
      },
      warnings: ['Place not found in the offline gazetteer — using the classifier fallback.']
    };
  }

  return result;
}

module.exports = { buildScopeZones, CAPS };
