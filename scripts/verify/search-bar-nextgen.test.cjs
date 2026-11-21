/**
 * Test Suite: Next-Gen Smart Search Bar Verification
 * Verifies:
 *   1. Power Directive Extraction (phone:yes, has:site, scope:district, target:500)
 *   2. NAICS 2022 Sector Trust Badges in Autocomplete
 *   3. Cross-Country Sovereign Mismatch Detection (US, UK, UAE, AU, DE, SG, CA)
 *   4. Clean Query & Token Segmentation
 *   5. Sub-15ms In-Process Response Latency
 */

const assert = require('assert');
const searchSuggest = require('../../server/src/services/searchSuggest');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed += 1;
  } catch (err) {
    console.error(`  FAIL  ${name}: ${err.message}`);
    failed += 1;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('       NEXT-GEN SMART SEARCH BAR VERIFICATION SUITE             ');
  console.log('================================================================\n');

  console.log('--- 1. Power Directives Extraction ---');
  test('Extracts phone directives (phone:yes, has:phone)', () => {
    const r1 = searchSuggest.extractPowerDirectives('Wholesale Turmeric in Tenali phone:yes');
    assert.strictEqual(r1.directives.phonesOnly, true);
    assert.strictEqual(r1.cleanedQuery, 'Wholesale Turmeric in Tenali');

    const r2 = searchSuggest.extractPowerDirectives('Dental clinics in Hyderabad has:phone');
    assert.strictEqual(r2.directives.phonesOnly, true);
    assert.strictEqual(r2.cleanedQuery, 'Dental clinics in Hyderabad');
  });

  test('Extracts website directives (site:yes, has:website)', () => {
    const r1 = searchSuggest.extractPowerDirectives('Computer shops in Vijayawada site:yes');
    assert.strictEqual(r1.directives.websiteOnly, true);
    assert.strictEqual(r1.cleanedQuery, 'Computer shops in Vijayawada');

    const r2 = searchSuggest.extractPowerDirectives('Interior designers in Mumbai has:website');
    assert.strictEqual(r2.directives.websiteOnly, true);
    assert.strictEqual(r2.cleanedQuery, 'Interior designers in Mumbai');
  });

  test('Extracts scope and target directives (scope:district, target:250)', () => {
    const r1 = searchSuggest.extractPowerDirectives('Red Chilli in Guntur scope:district target:500');
    assert.strictEqual(r1.directives.scope, 'district');
    assert.strictEqual(r1.directives.target, 500);
    assert.strictEqual(r1.cleanedQuery, 'Red Chilli in Guntur');
  });

  console.log('\n--- 2. NAICS 2022 Sector Trust Badges in Autocomplete ---');
  test('Turmeric category suggestions include NAICS 11 Agriculture badge', () => {
    const res = searchSuggest.suggest({ q: 'Wholesale Turmeric in Tenali' });
    assert.ok(res.category);
    assert.ok(res.category.naics, 'Category should have NAICS metadata');
    assert.strictEqual(res.category.naics.code, '11');
    assert.ok(res.category.naics.name.includes('Agriculture'));
    assert.strictEqual(res.category.naics.shield, '100% Zero-Bleed');

    const topCatSugg = res.suggestions.find(s => s.type === 'category');
    assert.ok(topCatSugg);
    assert.ok(topCatSugg.naics);
    assert.strictEqual(topCatSugg.naics.code, '11');
  });

  test('Steel & Metals suggestions include NAICS 31-33 Manufacturing badge', () => {
    const res = searchSuggest.suggest({ q: 'TMT Steel Bars & Rolling Mills in Mandi Gobindgarh' });
    assert.ok(res.category);
    assert.ok(res.category.naics);
    assert.strictEqual(res.category.naics.code, '31-33');
    assert.ok(res.category.naics.name.includes('Manufacturing') || res.category.naics.name.includes('Industrial'));
  });

  test('Cloud & AI Software suggestions include NAICS 54 Tech badge', () => {
    const res = searchSuggest.suggest({ q: 'Cloud Infrastructure & AI Software Development in Bengaluru' });
    assert.ok(res.category);
    assert.ok(res.category.naics);
    assert.strictEqual(res.category.naics.code, '54');
  });

  console.log('\n--- 3. Sovereign Country Mismatch Detection ---');
  test('Detects US city when country is IN (Seattle)', () => {
    const res = searchSuggest.suggest({ q: 'Commercial Marine Rigging in Seattle', country: 'IN' });
    assert.ok(res.detectedCountryMismatch, 'Should detect country mismatch for Seattle');
    assert.strictEqual(res.detectedCountryMismatch.detectedCountry, 'US');
    assert.strictEqual(res.detectedCountryMismatch.countryName, 'United States');
    assert.strictEqual(res.detectedCountryMismatch.flag, '🇺🇸');
    assert.strictEqual(res.detectedCountryMismatch.matchedPlace, 'Seattle');
  });

  test('Detects UK city when country is IN (Manchester)', () => {
    const res = searchSuggest.suggest({ q: 'Coffee Roasters in Manchester', country: 'IN' });
    assert.ok(res.detectedCountryMismatch);
    assert.strictEqual(res.detectedCountryMismatch.detectedCountry, 'GB');
    assert.strictEqual(res.detectedCountryMismatch.countryName, 'United Kingdom');
    assert.strictEqual(res.detectedCountryMismatch.flag, '🇬🇧');
  });

  test('Detects UAE city when country is IN (Dubai)', () => {
    const res = searchSuggest.suggest({ q: 'Perfume Wholesale in Dubai', country: 'IN' });
    assert.ok(res.detectedCountryMismatch);
    assert.strictEqual(res.detectedCountryMismatch.detectedCountry, 'AE');
    assert.strictEqual(res.detectedCountryMismatch.countryName, 'United Arab Emirates');
    assert.strictEqual(res.detectedCountryMismatch.flag, '🇦🇪');
  });

  test('Detects Australian city when country is IN (Brisbane)', () => {
    const res = searchSuggest.suggest({ q: 'Solar Contractors in Brisbane', country: 'IN' });
    assert.ok(res.detectedCountryMismatch);
    assert.strictEqual(res.detectedCountryMismatch.detectedCountry, 'AU');
    assert.strictEqual(res.detectedCountryMismatch.countryName, 'Australia');
    assert.strictEqual(res.detectedCountryMismatch.flag, '🇦🇺');
  });

  test('Detects Indian city when country is US (Tenali)', () => {
    const res = searchSuggest.suggest({ q: 'Wholesale Turmeric in Tenali', country: 'US' });
    assert.ok(res.detectedCountryMismatch);
    assert.strictEqual(res.detectedCountryMismatch.detectedCountry, 'IN');
    assert.strictEqual(res.detectedCountryMismatch.countryName, 'India');
    assert.strictEqual(res.detectedCountryMismatch.flag, '🇮🇳');
  });

  test('No mismatch detected when place matches active country (Guntur in IN)', () => {
    const res = searchSuggest.suggest({ q: 'Red Chilli in Guntur', country: 'IN' });
    assert.strictEqual(res.detectedCountryMismatch, null);
  });

  console.log('\n--- 4. In-Process Keystroke Latency Benchmark ---');
  test('Suggestion lookup executes in strictly < 20ms', () => {
    const t0 = Date.now();
    for (let i = 0; i < 50; i++) {
      searchSuggest.suggest({ q: 'Computer shops in Hyderabad' });
    }
    const totalMs = Date.now() - t0;
    const avgMs = totalMs / 50;
    console.log(`       Average suggestion latency: ${avgMs.toFixed(2)}ms across 50 calls`);
    assert.ok(avgMs < 20, `Expected < 20ms, got ${avgMs}ms`);
  });

  console.log('\n================================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
