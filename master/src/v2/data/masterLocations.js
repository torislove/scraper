/**
 * master/src/v2/data/masterLocations.js
 * Client-side 5-Country Administrative Labels & Master District/State Presets
 * across active markets (IN, US, GB, AU, AE) for zero-latency autocomplete & disambiguation.
 */

export const MASTER_ADMIN_LABELS = {
  IN: { level1: 'State / UT', level2: 'District', level3: 'Mandal / Taluk & Town', hint: 'e.g. Guntur District, Andhra Pradesh' },
  US: { level1: 'State', level2: 'County / Borough', level3: 'Township / City / CDP', hint: 'e.g. Harris County, Texas' },
  GB: { level1: 'Nation / Region', level2: 'County / Metro Borough', level3: 'Borough / Market Town / Parish', hint: 'e.g. Greater London, England' },
  AU: { level1: 'State / Territory', level2: 'Region / LGA', level3: 'Suburb / Town / Shire', hint: 'e.g. Greater Sydney, New South Wales' },
  AE: { level1: 'Emirate', level2: 'Emirate / Region', level3: 'Sector / Community', hint: 'e.g. Dubai Emirate, UAE' }
};

export const MASTER_QUICK_CATALOG = {
  IN: {
    states: ['Andhra Pradesh', 'Telangana', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'West Bengal', 'Kerala'],
    districts: [
      { name: 'Guntur District', state: 'Andhra Pradesh', hq: 'Guntur' },
      { name: 'NTR District', state: 'Andhra Pradesh', hq: 'Vijayawada' },
      { name: 'Krishna District', state: 'Andhra Pradesh', hq: 'Machilipatnam' },
      { name: 'Visakhapatnam District', state: 'Andhra Pradesh', hq: 'Visakhapatnam' },
      { name: 'Tirupati District', state: 'Andhra Pradesh', hq: 'Tirupati' },
      { name: 'Hyderabad District', state: 'Telangana', hq: 'Hyderabad' },
      { name: 'Rangareddy District', state: 'Telangana', hq: 'Hyderabad' },
      { name: 'Warangal District', state: 'Telangana', hq: 'Warangal' },
      { name: 'Pune District', state: 'Maharashtra', hq: 'Pune' },
      { name: 'Mumbai Suburban District', state: 'Maharashtra', hq: 'Mumbai' },
      { name: 'Bengaluru Urban District', state: 'Karnataka', hq: 'Bengaluru' },
      { name: 'Chennai District', state: 'Tamil Nadu', hq: 'Chennai' },
      { name: 'Jaipur District', state: 'Rajasthan', hq: 'Jaipur' },
      { name: 'Ahmedabad District', state: 'Gujarat', hq: 'Ahmedabad' }
    ]
  },
  US: {
    states: ['Texas', 'California', 'New York', 'Illinois', 'Florida'],
    districts: [
      { name: 'Harris County', state: 'Texas', hq: 'Houston' },
      { name: 'Dallas County', state: 'Texas', hq: 'Dallas' },
      { name: 'Travis County', state: 'Texas', hq: 'Austin' },
      { name: 'Los Angeles County', state: 'California', hq: 'Los Angeles' },
      { name: 'San Diego County', state: 'California', hq: 'San Diego' },
      { name: 'Orange County', state: 'California', hq: 'Anaheim' },
      { name: 'New York County', state: 'New York', hq: 'New York' },
      { name: 'Cook County', state: 'Illinois', hq: 'Chicago' },
      { name: 'Miami-Dade County', state: 'Florida', hq: 'Miami' }
    ]
  },
  GB: {
    states: ['England', 'Scotland'],
    districts: [
      { name: 'Greater London', state: 'England', hq: 'London' },
      { name: 'Greater Manchester', state: 'England', hq: 'Manchester' },
      { name: 'West Midlands', state: 'England', hq: 'Birmingham' },
      { name: 'West Yorkshire', state: 'England', hq: 'Leeds' },
      { name: 'Kent', state: 'England', hq: 'Maidstone' },
      { name: 'Surrey', state: 'England', hq: 'Guildford' },
      { name: 'City of Edinburgh', state: 'Scotland', hq: 'Edinburgh' },
      { name: 'Glasgow City', state: 'Scotland', hq: 'Glasgow' }
    ]
  },
  AU: {
    states: ['New South Wales', 'Victoria', 'Queensland'],
    districts: [
      { name: 'Greater Sydney', state: 'New South Wales', hq: 'Sydney' },
      { name: 'City of Parramatta', state: 'New South Wales', hq: 'Parramatta' },
      { name: 'Greater Melbourne', state: 'Victoria', hq: 'Melbourne' },
      { name: 'Greater Geelong', state: 'Victoria', hq: 'Geelong' },
      { name: 'City of Brisbane', state: 'Queensland', hq: 'Brisbane' },
      { name: 'City of Gold Coast', state: 'Queensland', hq: 'Gold Coast' }
    ]
  },
  AE: {
    states: ['Dubai', 'Abu Dhabi', 'Sharjah'],
    districts: [
      { name: 'Dubai Emirate', state: 'Dubai', hq: 'Dubai' },
      { name: 'Abu Dhabi Region', state: 'Abu Dhabi', hq: 'Abu Dhabi' },
      { name: 'Al Ain Region', state: 'Abu Dhabi', hq: 'Al Ain' },
      { name: 'Sharjah Emirate', state: 'Sharjah', hq: 'Sharjah' }
    ]
  }
};

export function getMasterLabels(cc = 'IN') {
  return MASTER_ADMIN_LABELS[String(cc || 'IN').toUpperCase()] || MASTER_ADMIN_LABELS.IN;
}

export function localSuggestMasterLocations(prefix = '', cc = 'IN', limit = 10) {
  const code = String(cc || 'IN').toUpperCase();
  const labels = getMasterLabels(code);
  const pack = MASTER_QUICK_CATALOG[code] || MASTER_QUICK_CATALOG.IN;
  const q = String(prefix || '').toLowerCase().trim();
  const list = [];
  for (const s of pack.states) {
    if (!q || s.toLowerCase().includes(q)) {
      list.push({
        name: s,
        displayName: s,
        country: code,
        scope: 'state',
        badge: labels.level1,
        subtitle: `Full ${labels.level1} Sweep (All ${labels.level2}s)`
      });
    }
  }
  for (const d of pack.districts) {
    if (!q || d.name.toLowerCase().includes(q) || d.state.toLowerCase().includes(q) || d.hq.toLowerCase().includes(q)) {
      const displayName = d.name.toLowerCase() === d.state.toLowerCase() ? d.name : `${d.name}, ${d.state}`;
      list.push({
        name: d.name,
        displayName,
        stateName: d.state,
        country: code,
        scope: 'district',
        badge: labels.level2,
        subtitle: `${d.state} · HQ: ${d.hq} · HQ Wards → Towns → ${labels.level3}`
      });
    }
  }
  return list.slice(0, limit);
}

export function localValidateMasterLocation(raw, cc = 'IN') {
  const code = String(cc || 'IN').toUpperCase();
  const labels = getMasterLabels(code);
  const clean = String(raw || '').trim();
  if (!clean) return { ok: false, error: `Enter a ${labels.level2} or ${labels.level1}.`, suggestions: localSuggestMasterLocations('', code, 5).map((x) => x.name) };
  const pack = MASTER_QUICK_CATALOG[code] || MASTER_QUICK_CATALOG.IN;
  const low = clean.toLowerCase();
  const stateHit = pack.states.find((s) => s.toLowerCase() === low || `${s.toLowerCase()} state` === low);
  if (stateHit) return { ok: true, scope: 'state', canonicalName: stateHit, stateName: stateHit, labels };
  const distHit = pack.districts.find((d) => d.name.toLowerCase() === low || d.name.toLowerCase().replace(/\b(district|county|region|emirate)\b/gi, '').trim() === low);
  if (distHit) return { ok: true, scope: 'district', canonicalName: distHit.name, districtName: distHit.name, stateName: distHit.state, labels };
  if (/\b(district|dist\.?|county|borough|shire|region|province|state|emirate|pradesh|nadu|maharashtra|karnataka|telangana|kerala|gujarat|rajasthan|texas|california|florida)\b/i.test(clean)) {
    return { ok: true, scope: 'district', canonicalName: clean, labels };
  }
  return {
    ok: false,
    error: `Master Fleet requires a ${labels.level2} or ${labels.level1} name (e.g. ${labels.hint}).`,
    suggestions: localSuggestMasterLocations(clean, code, 4).map((x) => x.name)
  };
}
