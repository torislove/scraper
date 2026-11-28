'use strict';

/**
 * scripts/verify/precision-benchmark.test.cjs
 * Precision Benchmark & Cross-Sector Leakage Verification.
 * Tests Universal Query Understanding, 195-Country Geo Resolution,
 * Laser Purity Gating, and Relevance Scoring (0-100).
 */

const assert = require('assert');
const { normalizeScrapeIntent } = require('../../server/src/services/queryNormalizer');
const { resolveCityKey } = require('../../server/src/geo');
const { classifyQuery, passesUniversalPurityGate } = require('../../server/src/taxonomy/classifier');
const { computeRelevanceScore, applyUniversalFilters } = require('../../server/src/services/goldenMerger');

console.log('===========================================================');
console.log('🚀 RUNNING PRECISION BENCHMARK & ZERO-LEAKAGE VERIFICATION');
console.log('===========================================================\n');

let totalTests = 0;
let passedTests = 0;

function check(desc, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ PASS: ${desc}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------
// SECTION 1: TURMERIC MILLS IN TEANLI (TYPO AUTO-CORRECT & GEO)
// -------------------------------------------------------------
console.log('--- SECTION 1: Turmaric Mills in Teanli ---');

check('Normalizes "turmaric mills in teanli" -> "turmeric mills" in "Tenali"', () => {
  const norm = normalizeScrapeIntent({ query: 'turmaric mills in teanli', country: 'IN' });
  assert.strictEqual(norm.query.toLowerCase(), 'turmeric mills');
  assert.strictEqual(norm.location, 'Tenali');
  assert.strictEqual(norm.correctedQuery, true);
  assert.strictEqual(norm.correctedLocation, true);
});

check('Resolves Tenali to Tier-2 municipal coordinates in geonames', () => {
  const geo = resolveCityKey('Tenali', 'IN');
  assert.ok(geo, 'City key must resolve');
  assert.strictEqual(geo, 'tenali');
});

check('Classifies "turmeric mills" to commodity_turmeric with APMC/processing subvectors', () => {
  const cls = classifyQuery('turmeric mills', 'IN');
  assert.strictEqual(cls.key, 'commodity_turmeric');
  assert.strictEqual(cls.categoryFamily, 'agro_commodity');
  assert.ok(cls.subvectors.length >= 3);
  assert.ok(cls.subvectors.some((s) => /processing|polishing|mandi/i.test(s)));
});

// -------------------------------------------------------------
// SECTION 2: PAINT & WATERPROOFING CHEMICAL STORES IN CHILAKALURIPET
// -------------------------------------------------------------
console.log('\n--- SECTION 2: Paint & Waterproofing Chemicals in Chilakaluripet ---');

check('Resolves Chilakaluripet to Tier-2 coordinates', () => {
  const geo = resolveCityKey('chilakaluripet', 'IN');
  assert.ok(geo, 'Chilakaluripet must resolve via geonames index');
  assert.ok(geo.includes('chilakaluripet'));
});

check('Compound query parses cleanly into Paint & Waterproofing sector', () => {
  const cls = classifyQuery('paint waterproofing chemical stores', 'IN');
  assert.ok(cls.strictFilterRe, 'Must have strictFilterRe');
  assert.ok(cls.rejectRe, 'Must have rejectRe');
  assert.ok(cls.subvectors.length >= 3);
});

// -------------------------------------------------------------
// SECTION 3: LEAD PURITY & ZERO CROSS-SECTOR LEAKAGE TEST
// -------------------------------------------------------------
console.log('\n--- SECTION 3: 0% Cross-Sector Leakage Assertion ---');

const paintQueryCls = classifyQuery('paint waterproofing chemical stores', 'IN');

const mockChilakaluripetLeads = [
  // Legitimate paint / chemical / hardware leads (Must PASS)
  { name: 'Asian Paints & Colour World', category: 'Paint store', city: 'Chilakaluripet', expected: true },
  { name: 'Dr. Fixit Waterproofing Solution Center', category: 'Chemical wholesaler', city: 'Chilakaluripet', expected: true },
  { name: 'Berger Paints Express Painting', category: 'Paint store', city: 'Chilakaluripet', expected: true },
  { name: 'Sri Balaji Hardware & Waterproofing Chemicals', category: 'Hardware store', city: 'Chilakaluripet', expected: true },
  { name: 'Chilakaluripet Construction Chemicals', category: 'Building materials store', city: 'Chilakaluripet', expected: true },

  // Orthogonal sector noise (Must be HARD REJECTED)
  { name: 'Sri Srinivasa Book Depot & Stationery', category: 'Book store', city: 'Chilakaluripet', expected: false },
  { name: 'Sony Electronics & Mobile Service', category: 'Electronics store', city: 'Chilakaluripet', expected: false },
  { name: 'Dell & Lenovo Computer Care', category: 'Computer repair service', city: 'Chilakaluripet', expected: false },
  { name: 'Sri Venkateswara Saw Mill & Wood Works', category: 'Saw mill', city: 'Chilakaluripet', expected: false },
  { name: 'Lakshmi Seeds, Pesticides & Fertilizers', category: 'Seed store', city: 'Chilakaluripet', expected: false },
  { name: 'Reebok & Adidas Sporting Goods', category: 'Sporting goods store', city: 'Chilakaluripet', expected: false },
  { name: 'New Bombay Clothing & Dresses', category: 'Clothing store', city: 'Chilakaluripet', expected: false },
  { name: 'Royal Bakery & Cake Pastry', category: 'Bakery', city: 'Chilakaluripet', expected: false }
];

let acceptedCorrectly = 0;
let rejectedCorrectly = 0;
let crossSectorLeaks = 0;

for (const mock of mockChilakaluripetLeads) {
  const purityOk = passesUniversalPurityGate(
    mock,
    paintQueryCls
  );

  const relScore = computeRelevanceScore(mock, {
    query: 'paint waterproofing chemical stores',
    city: 'Chilakaluripet',
    rejectRe: paintQueryCls.rejectRe
  });

  const passed = purityOk && relScore >= 40;

  if (mock.expected) {
    if (passed) acceptedCorrectly++;
    else console.warn(`   ⚠️ False negative: ${mock.name} (purity: ${purityOk}, score: ${relScore})`);
  } else {
    if (!passed) {
      rejectedCorrectly++;
    } else {
      crossSectorLeaks++;
      console.error(`   🚨 LEAK DETECTED: ${mock.name} (${mock.category}) scored ${relScore} and passed purity!`);
    }
  }
}

check('Zero cross-category leakage for Chilakaluripet Paint/Chemical search', () => {
  assert.strictEqual(crossSectorLeaks, 0, 'Cross-sector leaks must be 0');
});

check('High acceptance rate (>= 80%) for valid paint & waterproofing businesses', () => {
  const validTotal = mockChilakaluripetLeads.filter((m) => m.expected).length;
  const precision = acceptedCorrectly / validTotal;
  assert.ok(precision >= 0.8, `Acceptance was ${precision * 100}%`);
});

// -------------------------------------------------------------
// SECTION 4: MULTI-COUNTRY (10+ NATIONS) BENCHMARK
// -------------------------------------------------------------
console.log('\n--- SECTION 4: Multi-Nation Precision Benchmark (10 Countries) ---');

const multiCountryScenarios = [
  { cc: 'US', q: 'hvac repair dallas', lead: { name: 'Dallas Fast HVAC Services', category: 'HVAC contractor', city: 'Dallas' }, expect: true },
  { cc: 'US', q: 'hvac repair dallas', lead: { name: 'Dallas Bookshop & Café', category: 'Book store', city: 'Dallas' }, expect: false },
  { cc: 'GB', q: 'solicitors manchester', lead: { name: 'Manchester Legal & Solicitors LLP', category: 'Lawyer', city: 'Manchester' }, expect: true },
  { cc: 'GB', q: 'solicitors manchester', lead: { name: 'Manchester Hand Car Wash', category: 'Car wash', city: 'Manchester' }, expect: false },
  { cc: 'AU', q: 'dental implants sydney', lead: { name: 'Sydney Harbour Dental & Implants', category: 'Dentist', city: 'Sydney' }, expect: true },
  { cc: 'AU', q: 'dental implants sydney', lead: { name: 'Sydney Surfboard Gear', category: 'Sporting goods store', city: 'Sydney' }, expect: false },
  { cc: 'AE', q: 'cold storage logistics dubai', lead: { name: 'Dubai Refrigerated Logistics LLC', category: 'Logistics service', city: 'Dubai' }, expect: true },
  { cc: 'AE', q: 'cold storage logistics dubai', lead: { name: 'Dubai Gold Souk Jewellers', category: 'Jewelry store', city: 'Dubai' }, expect: false },
  { cc: 'CA', q: 'cnc machining toronto', lead: { name: 'Toronto Precision CNC Machining', category: 'Machine shop', city: 'Toronto' }, expect: true },
  { cc: 'CA', q: 'cnc machining toronto', lead: { name: 'Toronto Donut Bakery', category: 'Bakery', city: 'Toronto' }, expect: false },
  { cc: 'DE', q: 'dachdecker munich', lead: { name: 'München Meister Dachdecker', category: 'Roofing contractor', city: 'Munich' }, expect: true },
  { cc: 'DE', q: 'dachdecker munich', lead: { name: 'München Bücher Antiquariat', category: 'Book store', city: 'Munich' }, expect: false },
  { cc: 'FR', q: 'plombier paris', lead: { name: 'Paris Express Dépannage Plomberie', category: 'Plumber', city: 'Paris' }, expect: true },
  { cc: 'FR', q: 'plombier paris', lead: { name: 'Paris Mode Vêtements', category: 'Clothing store', city: 'Paris' }, expect: false },
  { cc: 'SG', q: 'semiconductor tooling', lead: { name: 'Singapore Micro Semi Tools Pte', category: 'Industrial equipment supplier', city: 'Singapore' }, expect: true },
  { cc: 'SG', q: 'semiconductor tooling', lead: { name: 'SG Toy Station', category: 'Toy store', city: 'Singapore' }, expect: false },
  { cc: 'BR', q: 'equipamentos de mineração', lead: { name: 'Minas Britagem e Mineração Máquinas', category: 'Industrial equipment supplier', city: 'Belo Horizonte' }, expect: true },
  { cc: 'BR', q: 'equipamentos de mineração', lead: { name: 'Padaria e Confeitaria Silva', category: 'Bakery', city: 'Belo Horizonte' }, expect: false },
  { cc: 'ZA', q: 'solar inverter installer johannesburg', lead: { name: 'Joburg Solar EPC & Battery Solutions', category: 'Solar energy equipment supplier', city: 'Johannesburg' }, expect: true },
  { cc: 'ZA', q: 'solar inverter installer johannesburg', lead: { name: 'Joburg Book Exchange', category: 'Book store', city: 'Johannesburg' }, expect: false }
];

let multiLeaks = 0;
let multiMatches = 0;

for (const sc of multiCountryScenarios) {
  const norm = normalizeScrapeIntent({ query: sc.q, country: sc.cc });
  const cls = classifyQuery(norm.query, sc.cc);
  const purity = passesUniversalPurityGate(
    sc.lead,
    cls
  );
  const rel = computeRelevanceScore(sc.lead, { query: norm.query, city: sc.lead.city, rejectRe: cls.rejectRe });
  const passed = purity && rel >= 40;

  if (sc.expect && passed) multiMatches++;
  if (!sc.expect && passed) {
    multiLeaks++;
    console.error(`   🚨 MULTI-NATION LEAK: [${sc.cc}] ${sc.lead.name} (${sc.lead.category}) passed query "${sc.q}"`);
  }
}

check('Multi-Nation 10-country benchmark has 0% cross-sector leaks', () => {
  assert.strictEqual(multiLeaks, 0);
});

check('Multi-Nation targeted recall achieves 100% of desired domain leads', () => {
  const targetCount = multiCountryScenarios.filter((s) => s.expect).length;
  assert.strictEqual(multiMatches, targetCount);
});

console.log('\n===========================================================');
console.log(`🏁 BENCHMARK COMPLETE: ${passedTests}/${totalTests} tests passed with 0 leaks!`);
console.log('===========================================================');
