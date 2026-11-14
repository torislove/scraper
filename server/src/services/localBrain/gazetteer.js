/**
 * Offline administrative index over server/db/india_villages.json.
 *
 * The JSON file is ~20 MB, so it is read on first use and then kept as compact
 * maps of names only. Villages are not indexed by name (619k entries would cost
 * far more memory than they are worth); they stay attached to their sub-district
 * and are read from there when a sweep needs them.
 *
 * Everything here is local. No geocoding, no network, no API key.
 */

const fs = require('fs');
const path = require('path');

const GAZETTEER_PATH = path.join(__dirname, '../../../db/india_villages.json');

const state = {
  loaded: false,
  loadMs: 0,
  states: new Map(),
  districts: new Map(),
  subDistricts: new Map(),
  raw: null
};

function key(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function add(map, name, value) {
  const k = key(name);
  if (!k) return;
  const existing = map.get(k);
  if (!existing) map.set(k, value);
  else if (Array.isArray(existing)) existing.push(value);
  else map.set(k, [existing, value]);
}

function load() {
  if (state.loaded) return state;
  const started = Date.now();
  try {
    const raw = JSON.parse(fs.readFileSync(GAZETTEER_PATH, 'utf8'));
    state.raw = raw;
    for (const st of raw) {
      const stateName = st.state;
      if (!stateName) continue;
      state.states.set(key(stateName), stateName);
      for (const dist of st.districts || []) {
        const districtName = dist.district;
        if (!districtName) continue;
        const subDistricts = (dist.subDistricts || []).map(sd => sd.subDistrict).filter(Boolean);
        add(state.districts, districtName, { state: stateName, district: districtName, subDistricts });
        for (const sd of dist.subDistricts || []) {
          if (!sd.subDistrict) continue;
          add(state.subDistricts, sd.subDistrict, {
            state: stateName,
            district: districtName,
            subDistrict: sd.subDistrict,
            villages: sd.villages || []
          });
        }
      }
    }
  } catch (err) {
    console.error('[localBrain] gazetteer unavailable:', err.message);
  }
  state.loaded = true;
  state.loadMs = Date.now() - started;
  return state;
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/** Returns { level:'state'|'district'|'mandal'|null, ...details }. */
function lookup(place) {
  const g = load();
  const k = key(place);
  if (!k) return { level: null };

  if (g.states.has(k)) {
    return { level: 'state', state: g.states.get(k) };
  }

  const districts = asArray(g.districts.get(k));
  if (districts.length) {
    const d = districts[0];
    return {
      level: 'district',
      state: d.state,
      district: d.district,
      subDistricts: d.subDistricts,
      ambiguous: districts.length > 1 ? districts.map(x => `${x.district}, ${x.state}`) : undefined
    };
  }

  const mandals = asArray(g.subDistricts.get(k));
  if (mandals.length) {
    const m = mandals[0];
    return {
      level: 'mandal',
      state: m.state,
      district: m.district,
      mandal: m.subDistrict,
      villages: m.villages,
      ambiguous: mandals.length > 1 ? mandals.map(x => `${x.subDistrict}, ${x.district}, ${x.state}`) : undefined
    };
  }

  return { level: null };
}

function districtsOfState(stateName) {
  const g = load();
  const wanted = key(stateName);
  const out = [];
  for (const st of g.raw || []) {
    if (key(st.state) !== wanted) continue;
    for (const dist of st.districts || []) {
      if (dist.district) out.push(dist.district);
    }
  }
  return out;
}

function subDistrictsOfDistrict(districtName) {
  const g = load();
  const found = asArray(g.districts.get(key(districtName)));
  return found.length ? found[0].subDistricts.slice() : [];
}

function villagesOfMandal(mandalName) {
  const g = load();
  const found = asArray(g.subDistricts.get(key(mandalName)));
  return found.length ? (found[0].villages || []).slice() : [];
}

function stats() {
  const g = load();
  return {
    loaded: g.loaded,
    loadMs: g.loadMs,
    states: g.states.size,
    districts: g.districts.size,
    subDistricts: g.subDistricts.size
  };
}

module.exports = {
  load,
  lookup,
  districtsOfState,
  subDistrictsOfDistrict,
  villagesOfMandal,
  stats,
  key
};
