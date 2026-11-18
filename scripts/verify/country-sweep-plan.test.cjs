#!/usr/bin/env node
/**
 * Country sweep plan checks (pure, no network).
 *
 * The bug this locks in: `/master-sweep` called the India-only gazetteer
 * planner for every country, so "Oakland County, Michigan" came back as eight
 * generic city phrases labelled `resolvedScope: 'city'`. A Master county sweep
 * must be a county sweep, and it must say whether its coverage is exhaustive or
 * sampled.
 *
 * Run: node scripts/verify/country-sweep-plan.test.cjs
 */
const assert = require('assert');
const { canonicalScope, latticeOverExtent, bboxToExtent } = require('../../server/src/services/countrySweepPlan');

let failures = 0;
function check(label, fn) {
  try {
    fn();
    console.log(`  ok   ${label}`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL ${label}: ${error.message}`);
  }
}

check('scope aliases map onto the four canonical ids', () => {
  assert.strictEqual(canonicalScope('county'), 'district');
  assert.strictEqual(canonicalScope('Province'), 'state');
  assert.strictEqual(canonicalScope('borough'), 'district');
  assert.strictEqual(canonicalScope('emirate'), 'state');
  assert.strictEqual(canonicalScope('town'), 'city');
  assert.strictEqual(canonicalScope('nonsense'), 'city');
});

check('bbox becomes a real extent', () => {
  // Roughly Oakland County, Michigan.
  const extent = bboxToExtent([42.36, 42.89, -83.69, -83.02], 42.6);
  assert.ok(extent.spanKm > 40 && extent.spanKm < 80, `span ${extent.spanKm}`);
  assert.ok(Math.abs(extent.centre.lat - 42.625) < 0.01);
});

check('a lattice covers the extent and names every zone uniquely', () => {
  const extent = bboxToExtent([42.36, 42.89, -83.69, -83.02], 42.6);
  const zones = latticeOverExtent(extent, { territory: 'Oakland County', category: 'photographers', scope: 'district', size: 5 });
  assert.strictEqual(zones.length, 25, `got ${zones.length}`);
  const names = new Set(zones.map(zone => zone.name));
  assert.strictEqual(names.size, zones.length, 'duplicate zone names');
  for (const zone of zones) {
    assert.ok(Number.isFinite(zone.lat) && Number.isFinite(zone.lng), 'zone without coordinates');
    assert.ok(zone.radiusKm > 0, 'zone without radius');
    assert.ok(zone.queryText.includes('Oakland County'), 'query lost its territory');
  }
});

check('the centre zone is swept first', () => {
  const extent = bboxToExtent([42.36, 42.89, -83.69, -83.02], 42.6);
  const zones = latticeOverExtent(extent, { territory: 'Oakland County', category: 'x', scope: 'district', size: 5 });
  assert.ok(/Central/.test(zones[0].name), `first zone was ${zones[0].name}`);
});

check('a sampled state lattice stays bounded', () => {
  // Texas-scale bbox: the plan must not try to enumerate every town.
  const extent = bboxToExtent([25.8, 36.5, -106.6, -93.5], 31.0);
  const zones = latticeOverExtent(extent, { territory: 'Texas', category: 'x', scope: 'state', size: 6 });
  assert.strictEqual(zones.length, 36, `got ${zones.length}`);
  assert.ok(zones[0].radiusKm > 50, 'state zones should be wide');
});

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall country sweep plan checks passed');
