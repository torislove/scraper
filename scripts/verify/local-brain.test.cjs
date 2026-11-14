/**
 * Local brain + international source tests.
 *
 * Run: node scripts/verify/local-brain.test.cjs
 *
 * These are deliberate contract tests, not a smoke test:
 *  - classification must survive location words and regional vocabulary
 *  - synonym expansion must find kalyana mandapam terms without the internet
 *  - relevance must reject unrelated pages
 *  - scope must tell a district from a town, in India and abroad
 *  - the model must be small and must not reference any network or key
 *  - the source registry must never mark a blocked directory as running
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const brain = require(path.join(root, 'server/src/services/localBrain'));
const registry = require(path.join(root, 'server/src/services/sources/registry'));
const { normalizePhone, extractPhones } = require(path.join(root, 'server/src/utils/phoneUtils'));

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

console.log('\nlocal brain');
const status = brain.status();
test('model loads offline', () => assert.ok(status.ready, 'model not ready'));
test('model stays small (<= 1 MB)', () => assert.ok(status.modelBytes <= 1024 * 1024, `${status.modelKB} KB`));
test('model reports no network and no keys', () => {
  assert.strictEqual(status.network, 'none');
  assert.strictEqual(status.apiKeys, 'none');
});
test('gazetteer has every Indian district', () => assert.ok(status.gazetteer.districts >= 600, String(status.gazetteer.districts)));

test('classifies a plain category', () => {
  const result = brain.classify('plumber');
  assert.strictEqual(result.category, 'Plumbers');
  assert.strictEqual(result.family, 'home-services');
});

test('ignores location words in the query', () => {
  const result = brain.classify('plumbers in Tenali');
  assert.strictEqual(result.category, 'Plumbers');
});

test('understands regional wedding vocabulary', () => {
  const result = brain.classify('kalyana mandapam');
  assert.strictEqual(result.family, 'wedding');
  assert.match(result.category || '', /Kalyana|Banquet/i);
});

test('routes a wedding photographer to the wedding family', () => {
  const result = brain.classify('wedding photographer');
  assert.strictEqual(result.family, 'wedding');
});

test('synonyms include regional terms without a network call', () => {
  const terms = brain.synonyms('banquet hall', 'Hyderabad, Telangana');
  assert.ok(terms.some(term => /kalyana mandapam/i.test(term)), terms.join(' | '));
  assert.ok(terms.includes('banquet hall'));
});

test('relevance accepts a matching page and rejects an unrelated one', () => {
  const plumbing = '<html><body>Emergency plumber in Austin. Call us for pipe repair, drain cleaning and water heaters. Licensed and insured.</body></html>';
  const bakery = '<html><body>Fresh sourdough bread and croissants baked every morning. Visit our bakery cafe for coffee and pastries.</body></html>';
  assert.strictEqual(brain.relevance('Hargrove Plumbing', plumbing, 'plumber', []), true);
  assert.strictEqual(brain.relevance('Sunrise Bakery', bakery, 'plumber', []), false);
});

console.log('\nscope detection');
test('Indian district is broad', () => {
  const scope = brain.analyzeScope('Guntur');
  assert.strictEqual(scope.type, 'broad');
  assert.strictEqual(scope.level, 'district');
});
test('Indian state is broad', () => {
  assert.strictEqual(brain.analyzeScope('Andhra Pradesh').level, 'state');
});
test('Indian town is specific', () => {
  assert.strictEqual(brain.analyzeScope('Tenali').type, 'specific');
});
test('US state is broad', () => {
  const scope = brain.analyzeScope('Texas');
  assert.strictEqual(scope.type, 'broad');
  assert.strictEqual(scope.country, 'US');
});
test('London gets a broad UK scope', () => {
  const scope = brain.analyzeScope('London');
  assert.strictEqual(scope.type, 'broad');
  assert.strictEqual(scope.country, 'GB');
});
test('Dubai gets a broad UAE scope', () => {
  assert.strictEqual(brain.analyzeScope('Dubai').country, 'AE');
});

console.log('\ninternational phone parsing');
test('US mobile parses as valid international', () => {
  const phone = normalizePhone('+1 (512) 555-0148', { defaultCountry: 'US', allowInternational: true });
  assert.ok(phone, 'no parse');
  assert.strictEqual(phone.country, 'US');
  assert.strictEqual(phone.e164, '+15125550148');
  assert.ok(phone.isMobile);
});
test('UK London landline parses as landline, not mobile', () => {
  const phone = normalizePhone('+44 20 7946 0958', { defaultCountry: 'GB', allowInternational: true });
  assert.ok(phone, 'no parse');
  assert.ok(phone.isLandline);
  assert.ok(!phone.isMobile);
  assert.strictEqual(phone.whatsapp, false);
});
test('US site text extracts a number', () => {
  const phones = extractPhones('Call +1 512 555 0148 for a free estimate.', { defaultCountry: 'US', allowInternational: true });
  assert.ok(phones.length >= 1, 'no phones');
  assert.strictEqual(phones[0].e164, '+15125550148');
});
test('India numbers still parse exactly as before', () => {
  const phone = normalizePhone('98482 11982', { context: 'phone mobile', trusted: true });
  assert.ok(phone && phone.isMobile);
  assert.strictEqual(phone.e164, '+919848211982');
});

console.log('\nsource registry');
test('every supported country has at least one engine', () => {
  for (const code of registry.SOURCE_COUNTRIES) {
    assert.ok(registry.enginesForCountry(code).length > 0, `${code} has none`);
  }
});
test('India-only engines do not run abroad', () => {
  const us = registry.enginesForCountry('US');
  assert.ok(!us.includes('justdial'));
  assert.ok(!us.includes('indiamart'));
});
test('blocked directories are never enabled', () => {
  const blocked = registry.SOURCES.filter(source => source.access === 'blocked');
  assert.ok(blocked.length > 0);
  for (const source of blocked) {
    assert.strictEqual(source.enabled, false, `${source.id} is marked blocked but enabled`);
  }
});
test('no source claims to bypass a block', () => {
  const text = fs.readFileSync(path.join(root, 'server/src/services/sources/registry.js'), 'utf8').toLowerCase();
  assert.ok(!text.includes('captcha solver'));
  assert.ok(!text.includes('captcha bypass'));
  // Blocked sources must say so explicitly.
  assert.ok(text.includes('not bypassed'));
});
test('US and UK have keyless coverage', () => {
  for (const code of ['US', 'GB', 'CA', 'AU', 'AE', 'SG', 'NZ', 'IE', 'MY', 'ZA']) {
    const engines = registry.enginesForCountry(code);
    assert.ok(engines.includes('openstreetmap'), `${code}: OSM missing`);
    assert.ok(engines.includes('web-discovery'), `${code}: web discovery missing`);
  }
});

console.log('\nno-network guarantees');
test('aiParser has no transformer or Datamuse dependency', () => {
  const source = fs.readFileSync(path.join(root, 'server/src/utils/aiParser.js'), 'utf8')
    .split('\n')
    .filter(line => !/^\s*(\*|\/\/)/.test(line))
    .join('\n');
  assert.ok(!/require\(['"]@xenova|api\.datamuse\.com/i.test(source));
});
test('intelligentExtractor has no NVIDIA call', () => {
  const source = fs.readFileSync(path.join(root, 'server/src/utils/intelligentExtractor.js'), 'utf8');
  assert.ok(!/nvidia|integrate\.api\.nvidia/i.test(source));
});
test('settings manager has no NVIDIA key', () => {
  const source = fs.readFileSync(path.join(root, 'server/src/config/settingsManager.js'), 'utf8');
  assert.ok(!/getNvidiaApiKey/.test(source));
});

console.log(`\n${passed} passed, ${failed} failed`);
console.log(`model: ${status.modelKB} KB · ${status.categories} categories · ${status.families} families · gazetteer ${status.gazetteer.subDistricts} sub-districts`);
process.exit(failed ? 1 : 0);
