'use strict';

/**
 * scripts/verify/geo-disambiguation.test.cjs
 * Comprehensive benchmark for:
 * 1. Multi-location Disambiguation (Siripuram AP/TS, Springfield US, Richmond, etc.).
 * 2. Real-time Search Suggest with coordinates and Mandal/District qualification.
 * 3. Live scrape zero-yield remediation (Tenali and Siripuram inside Guntur rejectTerms).
 * 4. 195-country Dynamic Purchasing Power Parity (PPP) Pricing Engine.
 */

const assert = require('assert');
const { disambiguateLocation } = require('../../server/src/geo/locationDisambiguator');
const searchSuggest = require('../../server/src/services/searchSuggest');
const { isWithinCityBounds } = require('../../server/src/geo');
const { getCountryPricing } = require('../../shared/data/pricingModels');

async function runTests() {
  console.log('🧪 Starting Universal Disambiguation & Geo Verification Suite...\n');
  let passed = 0;

  // TEST 1: Disambiguate "siripuram" in India
  console.log('Test 1: Disambiguating "siripuram" in India (5+ distinct entities)');
  const siriHits = await disambiguateLocation('siripuram', 'IN');
  assert(Array.isArray(siriHits) && siriHits.length >= 4, `Expected at least 4 Siripuram matches, got ${siriHits?.length}`);
  const hasGuntur = siriHits.some(h => String(h.district || h.label || '').toLowerCase().includes('guntur'));
  const hasVizag = siriHits.some(h => String(h.district || h.label || '').toLowerCase().includes('visakhapatnam'));
  const hasKhammam = siriHits.some(h => String(h.district || h.label || '').toLowerCase().includes('khammam'));
  assert(hasGuntur, 'Missing Siripuram, Guntur');
  assert(hasVizag, 'Missing Siripuram, Visakhapatnam');
  assert(hasKhammam, 'Missing Siripuram, Khammam');
  console.log(`  ✓ Passed: Found ${siriHits.length} Siripuram entities (Guntur, Vizag, Khammam confirmed)\n`);
  passed++;

  // TEST 2: Disambiguate "springfield" in United States
  console.log('Test 2: Disambiguating "springfield" in US');
  const springHits = await disambiguateLocation('springfield', 'US');
  assert(Array.isArray(springHits) && springHits.length >= 3, `Expected at least 3 Springfield matches, got ${springHits?.length}`);
  const states = springHits.map(h => h.state);
  assert(states.includes('Illinois') && states.includes('Massachusetts') && states.includes('Missouri'), 'Missing core US Springfield states');
  console.log(`  ✓ Passed: Found Springfield in ${states.join(', ')}\n`);
  passed++;

  // TEST 3: Search suggestions for "turmeric mills in siripuram"
  console.log('Test 3: Keystroke suggestions for "turmeric mills in siripuram"');
  const suggestResult = await searchSuggest.suggest({ q: 'turmeric mills in siripuram', country: 'IN' });
  assert(Array.isArray(suggestResult.suggestions) && suggestResult.suggestions.length > 0, 'Expected non-empty suggestions');
  const disambiguatedSuggestions = suggestResult.suggestions.filter(s => s.isDisambiguated);
  assert(disambiguatedSuggestions.length >= 3, `Expected >= 3 disambiguated suggestions, got ${disambiguatedSuggestions.length}`);
  assert(disambiguatedSuggestions[0].coordinates?.lat, 'First disambiguated suggestion must contain coordinates');
  console.log(`  ✓ Passed: Generated ${disambiguatedSuggestions.length} qualified suggestions with coordinates\n`);
  passed++;

  // TEST 4: Zero-Yield Fix: Guntur rejectTerms must NOT veto Tenali agribusiness
  console.log('Test 4: Target Location "Tenali" against Guntur rejectTerms in isWithinCityBounds');
  const gunturConf = {
    city: 'Guntur',
    state: 'Andhra Pradesh',
    country: 'IN',
    center: { lat: 16.3067, lng: 80.4365 },
    rejectTerms: ['mumbai', 'maharashtra', 'mangalagiri', 'tenali', 'vijayawada']
  };
  const tenaliLead = {
    name: 'Sri Lakshmi Turmeric Mill',
    address: 'Bose Road, Tenali, Andhra Pradesh 522201',
    city: 'Tenali',
    country: 'IN',
    lat: 16.2435,
    lng: 80.6410
  };
  const allowed = isWithinCityBounds(tenaliLead, 'IN', gunturConf, 'Tenali');
  assert.strictEqual(allowed, true, 'Tenali lead should NOT be vetoed when user searches Tenali');
  console.log('  ✓ Passed: Tenali lead successfully accepted without false reject veto\n');
  passed++;

  // TEST 5: Zero-Yield Fix: Siripuram lead against Guntur rejectTerms
  console.log('Test 5: Target Location "Siripuram, Guntur" in isWithinCityBounds');
  const siriLead = {
    name: 'Balaji Agro Flour & Turmeric Mill',
    address: 'Medikonduru Road, Siripuram, Guntur District, Andhra Pradesh 522018',
    city: 'Siripuram',
    country: 'IN',
    lat: 16.3500,
    lng: 80.2500
  };
  const siriAllowed = isWithinCityBounds(siriLead, 'IN', gunturConf, 'Siripuram, Guntur');
  assert.strictEqual(siriAllowed, true, 'Siripuram lead should NOT be vetoed');
  console.log('  ✓ Passed: Siripuram lead successfully accepted\n');
  passed++;

  // TEST 6: Global 195-Country PPP Pricing Validation
  console.log('Test 6: Validating PPP pricing model across key markets');
  const pIN = getCountryPricing('IN');
  assert.strictEqual(pIN.currency, 'INR');
  assert.strictEqual(pIN.clientProMonthly, 1999);
  assert(pIN.rails.some(r => r.includes('UPI')), 'India must have UPI rail');

  const pUS = getCountryPricing('US');
  assert.strictEqual(pUS.currency, 'USD');
  assert.strictEqual(pUS.clientProMonthly, 29);

  const pAE = getCountryPricing('AE');
  assert.strictEqual(pAE.currency, 'AED');
  assert.strictEqual(pAE.clientProMonthly, 109);

  const pBR = getCountryPricing('BR');
  assert.strictEqual(pBR.currency, 'BRL');
  assert(pBR.rails.some(r => r.includes('Pix')), 'Brazil must have Pix rail');

  const pFR = getCountryPricing('FR');
  assert.strictEqual(pFR.currency, 'EUR');
  assert(pFR.rails.some(r => r.includes('SEPA')), 'France must have SEPA rail');

  console.log('  ✓ Passed: Localized PPP pricing and native payment rails verified across IN, US, AE, BR, FR\n');
  passed++;

  console.log(`=========================================`);
  console.log(`🎉 ALL ${passed}/${passed} BENCHMARK TESTS PASSED (100% SUCCESS)`);
  console.log(`=========================================`);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
