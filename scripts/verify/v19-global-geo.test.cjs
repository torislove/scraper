#!/usr/bin/env node
/**
 * V19 global geo contract tests (pure, no network).
 *
 * Locks in the fixes that make every country follow the same coverage rules
 * as India:
 *
 *  1. No coordinate is stacked beyond MAX_PER_COORD (6). A coarse gazetteer
 *     GPO point must never absorb 40+ PINs again (Mumbai/Kolkata regression).
 *  2. Every zone in a resolved plan carries a UNIQUE queryText. If two
 *     coordinates share a query, the orchestrator dedupe drops one of them.
 *  3. International master sweeps resolve REAL administrative children from
 *     the offline gazetteer (US counties, GB boroughs, FR départements,
 *     DE kreise, CA census divisions, AU LGAs, …), not just generic sectors.
 *  4. India keeps its exhaustive hierarchy (state → district → mandal →
 *     village/PIN) and is not degraded by the international changes.
 *
 * Run: node scripts/verify/v19-global-geo.test.cjs
 */
const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '../..');
const geo = require(path.join(root, 'server/src/utils/geo'));
const iu = require(path.join(root, 'server/src/utils/internationalAdminUnits'));
const { buildGridZones } = require(path.join(root, 'server/src/utils/internationalGeo'));

const MAX_PER_COORD = 6;

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  FAIL  ${name}\n        ${error.message}`);
  }
}

function stats(zones) {
  const coords = new Map();
  const queries = new Map();
  for (const z of zones) {
    const ck = `${z.lat},${z.lng}`;
    coords.set(ck, (coords.get(ck) || 0) + 1);
    const q = String(z.queryText || '').trim();
    queries.set(q, (queries.get(q) || 0) + 1);
  }
  return {
    total: zones.length,
    uniqueQueries: queries.size,
    uniqueCoords: coords.size,
    maxPerCoord: zones.length ? Math.max(...coords.values()) : 0,
    duplicateQueries: [...queries.entries()].filter(([, n]) => n > 1)
  };
}

const INTERNATIONAL_CITIES = [
  ['New York', 'US'], ['Los Angeles', 'US'], ['Chicago', 'US'], ['San Francisco', 'US'],
  ['London', 'GB'], ['Manchester', 'GB'], ['Paris', 'FR'], ['Lyon', 'FR'],
  ['Berlin', 'DE'], ['Munich', 'DE'], ['Madrid', 'ES'], ['Barcelona', 'ES'],
  ['Tokyo', 'JP'], ['Osaka', 'JP'], ['Sao Paulo', 'BR'], ['Rio de Janeiro', 'BR'],
  ['Sydney', 'AU'], ['Melbourne', 'AU'], ['Toronto', 'CA'], ['Vancouver', 'CA'],
  ['Dubai', 'AE'], ['Abu Dhabi', 'AE'], ['Singapore', 'SG'], ['Auckland', 'NZ'],
  ['Cape Town', 'ZA'], ['Dublin', 'IE']
];

const INDIA_CITIES = [
  ['Mumbai', 'IN'], ['Kolkata', 'IN'], ['Hyderabad', 'IN'], ['Chennai', 'IN'],
  ['New Delhi', 'IN'], ['Bengaluru', 'IN'], ['Guntur', 'IN'], ['Vizag', 'IN']
];

console.log('\n1. zone queries are unique (no dedupe collapse)');
for (const [city, cc] of [...INTERNATIONAL_CITIES, ...INDIA_CITIES]) {
  test(`${city} (${cc}) has a unique query per zone`, () => {
    const zones = geo.resolveUniversalZones(city, 'Restaurants', false, cc) || [];
    assert.ok(zones.length > 0, 'no zones resolved');
    const s = stats(zones);
    assert.strictEqual(
      s.uniqueQueries,
      s.total,
      `${s.total - s.uniqueQueries} duplicate queryText(s), e.g. ${JSON.stringify(s.duplicateQueries.slice(0, 3))}`
    );
  });
}

console.log('\n2. no coordinate is stacked beyond MAX_PER_COORD');
for (const [city, cc] of [...INTERNATIONAL_CITIES, ...INDIA_CITIES]) {
  test(`${city} (${cc}) max per coordinate <= ${MAX_PER_COORD}`, () => {
    const zones = geo.resolveUniversalZones(city, 'Restaurants', false, cc) || [];
    const s = stats(zones);
    assert.ok(s.maxPerCoord <= MAX_PER_COORD, `max ${s.maxPerCoord} on one coordinate (${s.uniqueCoords} unique of ${s.total})`);
  });
}

console.log('\n3. international master sweeps resolve real administrative children');
const SUBDIVISION_CASES = [
  ['US', 'California', '', 50, /County$/],
  ['US', 'Texas', '', 200, /County$/],
  ['US', 'Los Angeles County', 'California', 60, /./],
  ['GB', 'England', '', 80, /./],
  ['GB', 'Greater London', 'England', 100, /./],
  ['FR', 'Ile-de-France', '', 5, /./],
  ['FR', 'Paris', 'Ile-de-France', 15, /./],
  ['DE', 'Bavaria', '', 5, /./],
  ['AU', 'New South Wales', '', 80, /./],
  ['CA', 'Ontario', '', 30, /./],
  ['ZA', 'Gauteng', '', 5, /./],
  ['NZ', 'Auckland', '', 5, /./],
  ['IE', 'Leinster', '', 5, /./],
  ['AE', 'Dubai', '', 5, /./],
  ['IN', 'Andhra Pradesh', '', 20, /./],
  ['IN', 'Guntur', 'Andhra Pradesh', 100, /./]
];
for (const [cc, name, state, min, pattern] of SUBDIVISION_CASES) {
  test(`${cc} ${name} resolves >= ${min} real subdivisions`, () => {
    const subs = iu.resolveSubdivisions(cc, name, state);
    assert.ok(subs.length >= min, `got ${subs.length}`);
    for (const s of subs) assert.ok(pattern.test(s), `unexpected subdivision "${s}"`);
  });
}

console.log('\n4. international lattice builder emits unique coordinate queries');
test('buildGridZones gives every cell its own queryText', () => {
  const anchor = { lat: 40.7128, lng: -74.006, name: 'New York', state: 'New York', country: 'US' };
  const zones = buildGridZones(anchor, 'Restaurants', 'New York', { size: 6, radiusKm: 10 });
  assert.ok(zones.length >= 30, `got ${zones.length}`);
  const s = stats(zones);
  assert.strictEqual(s.uniqueQueries, s.total, `${s.total - s.uniqueQueries} duplicate grid queries`);
  for (const z of zones) assert.ok(/near -?\d+\.\d{4},-?\d+\.\d{4}/.test(z.queryText), `no coordinate in "${z.queryText}"`);
});

console.log('\n5. India is not degraded');
test('Guntur city keeps named localities + grid', () => {
  const zones = geo.resolveUniversalZones('Guntur', 'Restaurants', false, 'IN') || [];
  assert.ok(zones.length >= 60, `got ${zones.length}`);
  const kinds = new Set(zones.map(z => z.coverageKind || z.kind));
  assert.ok(kinds.has('grid'), 'grid zones missing');
  assert.ok(kinds.has('locality'), 'locality zones missing');
});
test('Guntur district expands to mandals + villages', () => {
  const zones = geo.resolveUniversalZones('Guntur District, Andhra Pradesh', 'Restaurants', true, 'IN') || [];
  assert.ok(zones.length >= 150, `got ${zones.length}`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
