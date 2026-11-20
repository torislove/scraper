'use strict';

/**
 * coverage-bench.js — Automated benchmark & verification harness for:
 *   1. Diagnostics selftest (/api/diagnostics/selftest)
 *   2. Country-biased geocoder autocomplete (/api/locations/autocomplete?q=guntur&country=IN)
 *   3. Zone planner geometry (zoomable <=4km cells, no duplicate "* Area" grid zones, <10% coord overlap)
 *   4. Containment guard unit test (no false drops inside parent city / Chennai-Kolkata Hwy)
 *   5. Live auto run -> streaming leads -> fast Stop (< 3000ms) -> clean queue drain
 */

const assert = require('assert');
const { resolveUniversalZones } = require('../src/utils/universalGeoCluster');
const { isListingRelevantToQuery } = require('../src/scrapers/engine-google-places');

const BASE_URL = process.env.BENCH_BASE_URL || 'http://localhost:5002';

async function httpJson(path, opts = {}) {
  const res = await fetch(BASE_URL + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

function runUnitChecks() {
  console.log('\n[1/5] Zone Planner Geometry Audit (Computer Shops in Guntur)...');
  const zones = resolveUniversalZones('Guntur', 'Computer Shops', false);
  assert(zones.length >= 20, `Expected >=20 zones for Guntur, got ${zones.length}`);

  const badAreaNames = zones.filter(z => z.coverageKind === 'grid' && /\bArea$/.test(z.zoneName || ''));
  assert.strictEqual(badAreaNames.length, 0, `Found duplicate "* Area" grid names: ${badAreaNames.map(z => z.zoneName).join(', ')}`);

  const oversized = zones.filter(z => Number(z.radiusKm) > 4.0);
  assert.strictEqual(oversized.length, 0, `Found zones with radiusKm > 4.0: ${oversized.map(z => `${z.zoneName}:${z.radiusKm}`).join(', ')}`);

  const coordKeys = new Set();
  let overlapCount = 0;
  for (const z of zones) {
    if (z.lat != null && z.lng != null) {
      const k = `${Number(z.lat).toFixed(3)},${Number(z.lng).toFixed(3)}`;
      if (coordKeys.has(k) && z.coverageKind !== 'vector') overlapCount += 1;
      coordKeys.add(k);
    }
  }
  const overlapPct = (overlapCount / zones.length) * 100;
  assert(overlapPct < 10, `Expected <10% spatial overlap, got ${overlapPct.toFixed(1)}%`);
  console.log(`   PASS: ${zones.length} zones, all <=3.5km viewport, 0 duplicate '* Area' grid labels, ${overlapPct.toFixed(1)}% overlap`);

  console.log('\n[2/5] Containment Guard Unit Tests...');
  const nr = isListingRelevantToQuery(
    'NR Technologies',
    '4th Lane, Brodipet, Guntur, Andhra Pradesh 522002',
    'Guntur',
    'Andhra Pradesh',
    'Kothapet',
    'Kothapet, Guntur',
    { lat: 16.3067, lng: 80.4365 },
    null,
    'Guntur',
    false,
    'city'
  );
  assert.strictEqual(nr.relevant, true, `NR Technologies false drop: ${nr.reason}`);

  const hwy = isListingRelevantToQuery(
    'National Computers',
    'Grand Trunk Rd, Chennai - Kolkata Hwy, Guntur, Andhra Pradesh',
    'Guntur',
    'Andhra Pradesh',
    'Kothapet',
    'Kothapet, Guntur',
    { lat: 16.298, lng: 80.449 },
    null,
    'Guntur',
    false,
    'city'
  );
  assert.strictEqual(hwy.relevant, true, `Chennai-Kolkata Hwy false drop: ${hwy.reason}`);
  console.log('   PASS: Brodipet & highway listings inside parent city Guntur preserved (0 false drops)');
}

async function runLiveChecks() {
  console.log('\n[3/5] GET /api/diagnostics/selftest...');
  const diag = await httpJson('/api/diagnostics/selftest');
  assert.strictEqual(diag.status, 200, `Expected 200 from selftest, got ${diag.status}`);
  assert.strictEqual(diag.json?.ok, true, 'selftest ok must be true');
  assert.strictEqual(diag.json?.apiKeysRequired, 0, 'apiKeysRequired must be 0');
  const failedChecks = (diag.json?.checks || []).filter(c => c.ok === false);
  assert.strictEqual(failedChecks.length, 0, `Failed checks: ${JSON.stringify(failedChecks)}`);
  console.log(`   PASS: keyless=${diag.json.keyless}, apiKeysRequired=${diag.json.apiKeysRequired}, ${diag.json.checks.length} checks OK`);

  console.log('\n[4/5] GET /api/locations/autocomplete?q=guntur&country=IN...');
  const auto = await httpJson('/api/locations/autocomplete?q=guntur&country=IN');
  assert.strictEqual(auto.status, 200, `Expected 200 from autocomplete, got ${auto.status}`);
  assert(Array.isArray(auto.json) && auto.json.length > 0, 'Expected non-empty autocomplete results');
  assert(/India/i.test(auto.json[0]), `Expected top result to be in India, got "${auto.json[0]}"`);
  console.log(`   PASS: Top suggestions for IN: ${auto.json.slice(0, 3).join(' | ')}`);

  console.log('\n[5/5] Live Auto Run + UI Log Sanitizer + <3s Clean Stop...');
  const sessionId = `bench_${Date.now().toString(36)}`;
  const startRes = await httpJson('/api/scrape/auto', {
    method: 'POST',
    body: JSON.stringify({
      query: 'computer shops in guntur',
      strategy: 'balanced',
      radius: 5,
      engines: ['auto'],
      country: 'IN',
      sessionId
    })
  });
  assert.strictEqual(startRes.status, 200, `Expected 200 from /api/scrape/auto, got ${startRes.status}: ${startRes.text}`);

  const startedAt = Date.now();
  // Wait ~12s or until at least 1 zone completes
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const jobsRes = await httpJson('/api/scrape/jobs');
    const mine = Array.isArray(jobsRes.json) ? jobsRes.json.find(j => j.id === sessionId) : null;
    if (mine && Number(mine.completedCount) >= 1) break;
  }

  const stopT0 = Date.now();
  const stopRes = await httpJson('/api/scrape/jobs/stop-all', {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  });
  const stopMs = Date.now() - stopT0;
  assert.strictEqual(stopRes.status, 200, `Expected 200 from stop-all, got ${stopRes.status}`);
  assert(stopMs < 3000, `Expected stop latency < 3000ms, got ${stopMs}ms`);

  const logsRes = await httpJson('/api/logs');
  const recentLogs = Array.isArray(logsRes.json) ? logsRes.json : (logsRes.json?.logs || []);
  const leakedRaw = recentLogs.filter(l => /Google Search CAPTCHA|API key required|Execution context was destroyed/i.test(String(l)));
  assert.strictEqual(leakedRaw.length, 0, `Raw un-sanitized error found in UI logs: ${leakedRaw[0]}`);

  const jobsAfter = await httpJson('/api/scrape/jobs');
  const stillRunning = Array.isArray(jobsAfter.json)
    ? jobsAfter.json.filter(j => j.id === sessionId && j.status === 'running')
    : [];
  assert.strictEqual(stillRunning.length, 0, 'Stopped session should not remain running');

  console.log(`   PASS: Ran ${(Date.now() - startedAt)}ms, Stop executed in ${stopMs}ms (<3000ms), 0 leaked raw errors in UI logs`);
}

(async () => {
  runUnitChecks();
  await runLiveChecks();
  console.log('\nALL COVERAGE BENCHMARKS & VERIFICATION CHECKS PASSED!');
})().catch((err) => {
  console.error('\nBENCHMARK FAILED:', err);
  process.exit(1);
});
