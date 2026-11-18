#!/usr/bin/env node
/**
 * Scope engine plan checks (pure, no network).
 *
 * Verifies that territory — not a pile of inline conditionals — decides which
 * engines run, and that client and Master runs differ deliberately:
 *
 *   city/mandal   directory engines once at the settlement, never a swarm
 *   district      + JustDial from every resolved town              (Master only)
 *   state         + JustDial from every district city              (Master only)
 *   client + district/state  falls back to the city plan and says so
 *
 * Run: node scripts/verify/scope-engines.test.cjs
 */
const assert = require('assert');
const { planScopeEngines, normaliseScope } = require('../../server/src/services/scopeEngines');
const { makeHasEngine } = require('../../server/src/services/scopeEngines/engineMatch');

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

const baseCtx = {
  engines: ['auto'],
  category: 'Photographers',
  searchPhrase: 'Photographers',
  baseLocation: 'Guntur',
  sessionId: 'test_scope',
  zones: [],
  plan: { resolvedScope: 'city' },
  isMaster: false
};

const towns = ['Guntur', 'Tenali', 'Mangalagiri', 'Sattenapalle', 'Narasaraopet', 'Bapatla', 'Ponnur', 'Chilakaluripet']
  .map(name => ({ zoneName: name, kind: 'mandal' }));

console.log('engine aliases');
check('UI labels map onto engine keys', () => {
  const has = makeHasEngine(['Google Maps', 'JustDial', 'local-finder', 'Deep SERP']);
  assert.equal(has('maps'), true);
  assert.equal(has('justdial'), true);
  assert.equal(has('local_finder'), true);
  assert.equal(has('google-serp'), true);
  assert.equal(has('indiamart'), false);
});
check('auto mode enables every engine except explicit-only Brave', () => {
  const has = makeHasEngine([]);
  assert.equal(has('justdial'), true);
  const plan = planScopeEngines({ ...baseCtx, engines: [] });
  assert.equal(plan.jobs.some(job => job.task === 'scrapeBraveDork'), false);
});
check('scope aliases', () => {
  assert.equal(normaliseScope('village'), 'city');
  assert.equal(normaliseScope('taluk'), 'mandal');
  assert.equal(normaliseScope('DISTRICT'), 'district');
  assert.equal(normaliseScope(undefined), 'city');
});

console.log('\ncity plan (client)');
check('one JustDial query at the city, no swarm', () => {
  const plan = planScopeEngines({ ...baseCtx, zones: towns });
  assert.equal(plan.scope, 'city');
  assert.equal(plan.swarmTowns.length, 0);
  // No coverage cap: every resolved zone is dispatched.
  assert.equal(plan.limits.zoneBudget.client, Infinity);
  // JustDial runs once at the settlement in every scope, client included.
  assert.equal(plan.jobs.filter(job => job.task === 'scrapeJustDial').length, 1);
});
check('directory engines are queried once at the city', () => {
  const plan = planScopeEngines({ ...baseCtx, zones: towns });
  const serp = plan.jobs.filter(job => job.task === 'scrapeGoogleSerp');
  assert.equal(serp.length, 2);
  assert.equal(serp[0].args[2], 'Guntur');
});

console.log('\nmandal plan (client)');
check('mandal sweep has no swarm and no zone cap', () => {
  const plan = planScopeEngines({ ...baseCtx, plan: { resolvedScope: 'mandal' }, zones: towns });
  assert.equal(plan.scope, 'mandal');
  assert.equal(plan.swarmTowns.length, 0);
  // One JustDial query at the mandal HQ, no swarm.
  assert.equal(plan.jobs.filter(job => job.task === 'scrapeJustDial').length, 1);
  assert.equal(plan.limits.zoneBudget.client, Infinity);
  assert.equal(plan.limits.zoneBudget.master, Infinity);
});

console.log('\ndistrict plan (Master)');
check('district swarms JustDial across every resolved town', () => {
  const plan = planScopeEngines({
    ...baseCtx, isMaster: true, plan: { resolvedScope: 'district', district: 'Guntur' }, zones: towns
  });
  assert.equal(plan.scope, 'district');
  // 8 towns, minus the base location "Guntur" -> 7 swarm centres. No cap.
  assert.equal(plan.swarmTowns.length, 7);
  assert.deepEqual(plan.swarmTowns.slice(0, 2), ['Tenali', 'Mangalagiri']);
  // 7 swarm towns + 1 base JustDial query at the district HQ.
  assert.equal(plan.jobs.filter(job => job.task === 'scrapeJustDial').length, 8);
});
check('district has no zone cap', () => {
  const plan = planScopeEngines({
    ...baseCtx, isMaster: true, plan: { resolvedScope: 'district', district: 'Guntur' }, zones: towns
  });
  assert.equal(plan.limits.zoneBudget.master, Infinity);
  assert.equal(plan.limits.zoneBudget.client, 0);
});

console.log('\nstate plan (Master)');
check('state swarms JustDial across every district city', () => {
  const zones = [...towns, ...['Vijayawada', 'Visakhapatnam', 'Tirupati', 'Kurnool', 'Rajahmundry']
    .map(name => ({ zoneName: name, kind: 'district' }))];
  const plan = planScopeEngines({
    ...baseCtx, isMaster: true, plan: { resolvedScope: 'state' }, zones
  });
  assert.equal(plan.scope, 'state');
  assert.equal(plan.swarmTowns.length, 5);
  assert.equal(plan.swarmTowns.includes('Tenali'), false);
  // 5 district-city swarm queries + 1 base JustDial query.
  assert.equal(plan.jobs.filter(job => job.task === 'scrapeJustDial').length, 6);
});

console.log('\nclient vs Master guard');
check('client district plan falls back to city and explains why', () => {
  const plan = planScopeEngines({
    ...baseCtx, isMaster: false, plan: { resolvedScope: 'district', district: 'Guntur' }, zones: towns
  });
  assert.equal(plan.scope, 'city');
  assert.equal(plan.requestedScope, 'district');
  assert.equal(plan.clientAllowed, false);
  // The fallback is a city plan: one JustDial query at the city, no swarm.
  assert.equal(plan.jobs.filter(job => job.task === 'scrapeJustDial').length, 1);
  assert.match(plan.notes.join(' '), /Master-only/);
});
check('master keeps the requested scope', () => {
  const plan = planScopeEngines({ ...baseCtx, isMaster: true, plan: { resolvedScope: 'state' }, zones: towns });
  assert.equal(plan.requestedScope, 'state');
  assert.equal(plan.clientAllowed, true);
});

console.log('\ndispatch shape');
check('every job is { task, args[] }', () => {
  const plan = planScopeEngines({ ...baseCtx, isMaster: true, plan: { resolvedScope: 'district' }, zones: towns });
  for (const job of plan.jobs) {
    assert.equal(typeof job.task, 'string');
    assert.ok(job.task.length > 0);
    assert.ok(Array.isArray(job.args));
  }
});
check('explicit Brave selection queues one dork job', () => {
  const plan = planScopeEngines({ ...baseCtx, engines: ['brave'] });
  assert.equal(plan.jobs.filter(job => job.task === 'scrapeBraveDork').length, 1);
});
check('wedding category queues wedding portals, others do not', () => {
  const wedding = planScopeEngines({ ...baseCtx, engines: ['auto'], category: 'Wedding Photographers' });
  assert.equal(wedding.jobs.some(job => job.task === 'scrapeWeddingBazaar'), true);
  const plumbing = planScopeEngines({ ...baseCtx, engines: ['auto'], category: 'Plumbers' });
  assert.equal(plumbing.jobs.some(job => job.task === 'scrapeWeddingBazaar'), false);
  assert.equal(plumbing.jobs.some(job => job.task === 'scrapePuppeteerIndiaMart'), true);
});

console.log(failures === 0 ? '\nPASS' : `\nFAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
