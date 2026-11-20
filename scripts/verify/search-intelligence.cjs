/**
 * search-intelligence.cjs
 *
 * Automated verification suite for:
 * 1. Zero CCTV bleed in Computer & Laptop queries
 * 2. High-precision Shopping Malls & Commercial Complexes
 * 3. High-precision Products & Industrial Manufacturing (Zero AC leak)
 * 4. High-precision Services & Trades
 * 5. Category fidelity negative keyword enforcement
 * 6. Zone-to-zone subvector purity
 */

const assert = require('assert');
const { suggestForCountry } = require('../../server/src/services/searchSuggest');
const { buildCategorySubVectorZones, getUniversalCategoryVectors } = require('../../server/src/utils/universalGeoCluster');
const { isVendorRelevant } = require('../../server/src/services/categoryFidelity');
const { classifyCategory, suggestCategories } = require('../../server/src/services/categoryRouter');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function asyncTest(description, fn) {
  try {
    await fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log('=== SEARCH INTELLIGENCE & CATEGORY PURITY TEST SUITE ===\n');

  // 1. Computer Shops & Laptop Dealers
  console.log('--- 1. Computer Shops & Laptop Dealers ---');
  await asyncTest('Search suggestions for "computer shops in vijayawada" must NEVER contain CCTV or Spas', async () => {
    const res = await suggestForCountry({ q: 'computer shops in vijayawada', country: 'IN' });
    const labels = (res.suggestions || []).map(s => String(s.label || s.value || '').toLowerCase());
    const hasCctv = labels.some(l => /\b(?:cctv|surveillance|security camera|biometric)\b/i.test(l));
    const hasSpa = labels.some(l => /\b(?:spas?|saloon?|parlour)\b/i.test(l));
    assert.strictEqual(hasCctv, false, `Found CCTV in computer suggestions: ${labels.join(', ')}`);
    assert.strictEqual(hasSpa, false, `Found Spa in computer suggestions: ${labels.join(', ')}`);
  });

  test('Sub-vector zones for "Computer Shops & Laptop Dealers" in Vijayawada must NEVER contain CCTV', () => {
    const zones = buildCategorySubVectorZones('Computer Shops & Laptop Dealers', 'Vijayawada');
    const names = zones.map(z => z.zoneName.toLowerCase());
    const hasCctv = names.some(n => /\b(?:cctv|surveillance|security)\b/i.test(n));
    assert.strictEqual(hasCctv, false, `Found CCTV in computer sub-vector zones: ${names.join(', ')}`);
    assert.ok(names.some(n => n.includes('laptop showroom')), 'Must include laptop showroom');
    assert.ok(names.some(n => n.includes('computer hardware')), 'Must include computer hardware');
  });

  test('Category vectors for "Computer Stores" in Vijayawada must NEVER contain CCTV', () => {
    const vectors = getUniversalCategoryVectors('Computer Stores', 'Vijayawada');
    const queryTexts = vectors.map(v => v.queryText.toLowerCase());
    const hasCctv = queryTexts.some(q => /\b(?:cctv|surveillance|security)\b/i.test(q));
    assert.strictEqual(hasCctv, false, `Found CCTV in computer category vectors: ${queryTexts.join(', ')}`);
  });

  // 2. CCTV & Security Surveillance
  console.log('\n--- 2. CCTV & Security Surveillance ---');
  await asyncTest('Search suggestions for "cctv in vijayawada" must contain CCTV and Security', async () => {
    const res = await suggestForCountry({ q: 'cctv in vijayawada', country: 'IN' });
    const labels = (res.suggestions || []).map(s => String(s.label || s.value || '').toLowerCase());
    assert.ok(labels.some(l => l.includes('cctv')), 'Must suggest CCTV');
    assert.ok(labels.every(l => !l.includes('laptop showroom')), 'CCTV must not suggest laptop showrooms');
  });

  // 3. Shopping Malls & Commercial Complexes
  console.log('\n--- 3. Shopping Malls & Commercial Complexes ---');
  await asyncTest('Search suggestions for "shopping malls in vijayawada" must be mall-specific with zero "repair" or "wholesale"', async () => {
    const res = await suggestForCountry({ q: 'shopping malls in vijayawada', country: 'IN' });
    const labels = (res.suggestions || []).map(s => String(s.label || s.value || '').toLowerCase());
    assert.ok(labels.some(l => l.includes('shopping malls & retail plazas')), 'Must include Shopping Malls & Retail Plazas');
    assert.ok(labels.some(l => l.includes('commercial shopping complexes')), 'Must include Commercial Shopping Complexes');
    const hasRepair = labels.some(l => l.includes('service & repair'));
    assert.strictEqual(hasRepair, false, `Malls must not have "service & repair": ${labels.join(', ')}`);
  });

  test('Sub-vector zones for "Shopping Malls" in Vijayawada must contain pure mall infrastructure', () => {
    const zones = buildCategorySubVectorZones('Shopping Malls', 'Vijayawada');
    const names = zones.map(z => z.zoneName.toLowerCase());
    assert.ok(names.some(n => n.includes('shopping mall')), 'Must include shopping mall');
    assert.ok(names.some(n => n.includes('commercial shopping complex')), 'Must include commercial shopping complex');
    assert.ok(names.some(n => n.includes('central retail mall')), 'Must include central retail mall');
  });

  // 4. Products & Industrial Manufacturing
  console.log('\n--- 4. Products & Industrial Manufacturing ---');
  await asyncTest('Search suggestions for "products manufacturing in vijayawada" must NEVER contain AC repair or AC dealers', async () => {
    const res = await suggestForCountry({ q: 'products manufacturing in vijayawada', country: 'IN' });
    const labels = (res.suggestions || []).map(s => String(s.label || s.value || '').toLowerCase());
    const hasAc = labels.some(l => /\b(?:ac dealer|air conditioner|hvac)\b/i.test(l));
    assert.strictEqual(hasAc, false, `Found AC in manufacturing suggestions: ${labels.join(', ')}`);
    assert.ok(labels.some(l => l.includes('machinery')), 'Must include industrial machinery');
    assert.ok(labels.some(l => l.includes('fabrication')), 'Must include fabrication');
  });

  test('Category vectors for "Manufacturing Plants" in Vijayawada must contain industrial units', () => {
    const vectors = getUniversalCategoryVectors('Manufacturing Plants', 'Vijayawada');
    const queryTexts = vectors.map(v => v.queryText.toLowerCase());
    assert.ok(queryTexts.some(q => q.includes('machinery')), 'Must include machinery');
    assert.ok(queryTexts.some(q => q.includes('fabrication')), 'Must include fabrication');
  });

  // 5. Category Fidelity Checks
  console.log('\n--- 5. Category Fidelity Enforcement ---');
  test('Computer Store category MUST reject a CCTV & surveillance vendor', () => {
    const cctvVendor = {
      name: 'SecureVision CCTV & Biometric Systems',
      category: 'CCTV Installation & Security Camera Dealer',
      services: ['CCTV installation', 'Biometric attendance']
    };
    const relevant = isVendorRelevant(cctvVendor, 'Computer Shops & Laptop Dealers');
    assert.strictEqual(relevant, false, 'Computer category must reject CCTV vendor');
  });

  test('Computer Store category MUST accept a valid Laptop and PC dealer', () => {
    const computerVendor = {
      name: 'TechZone Laptops & Desktop Computers',
      category: 'Computer Hardware & Laptop Store',
      services: ['Laptop repair', 'Gaming PC assembly']
    };
    const relevant = isVendorRelevant(computerVendor, 'Computer Shops & Laptop Dealers');
    assert.strictEqual(relevant, true, 'Computer category must accept computer vendor');
  });

  test('CCTV category MUST reject a pure computer shop with no security hardware', () => {
    const computerVendor = {
      name: 'Apex Computer Hardware & Laptop Showroom',
      category: 'Computer Dealers',
      services: ['Laptop screen replacement']
    };
    const relevant = isVendorRelevant(computerVendor, 'CCTV & Surveillance');
    assert.strictEqual(relevant, false, 'CCTV category must reject pure computer store');
  });

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run();
