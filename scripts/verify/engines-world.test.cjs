/**
 * Worldwide engine + country contract tests.
 *
 * Run: node scripts/verify/engines-world.test.cjs
 *
 * These tests answer one question: if a user picks any of the 245 countries,
 * can the app actually run the engines it claims? They are contract tests, not
 * a smoke test:
 *  - the country list is complete and India stays first
 *  - every country has a keyless bundle and no blocked source leaks in
 *  - India-only engines never run abroad
 *  - every engine name resolves to a real module
 *  - country detection returns the right ISO code
 *  - phone parsing follows the search country (no +91 abroad)
 *  - the engines no longer hardcode an India-only Google bias
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const registry = require(path.join(root, 'server/src/services/sources/registry'));
const { COUNTRIES, detectCountry } = require(path.join(root, 'server/src/services/localBrain/countries'));
const { normalizePhone } = require(path.join(root, 'server/src/utils/phoneUtils'));
const { extractFromHtml } = require(path.join(root, 'server/src/utils/fastWebsiteExtractor'));

const ENGINE_MODULES = {
  openstreetmap: 'engine-openstreetmap',
  maps: 'engine-google-places',
  'google-local-finder': 'engine-google-serp-local',
  'web-discovery': 'engine-web-discovery',
  'web-contact': 'engine-web-contact',
  justdial: 'engine-justdial',
  weddingbazaar: 'engine-weddingbazaar',
  weddingwire: 'engine-weddingwire',
  mandap: 'engine-mandap'
};

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

console.log('\ncountry coverage');
test('245 countries are known', () => {
  assert.strictEqual(COUNTRIES.length, 245, `got ${COUNTRIES.length}`);
  assert.strictEqual(new Set(COUNTRIES.map(c => c.code)).size, 245, 'duplicate ISO codes');
});
test('India is first and primary', () => {
  assert.strictEqual(COUNTRIES[0].code, 'IN');
  assert.strictEqual(COUNTRIES[0].phone, '+91');
});
test('every country has at least five keyless engines', () => {
  const thin = [];
  for (const country of COUNTRIES) {
    const engines = registry.enginesForCountry(country.code);
    if (engines.length < 5) thin.push(`${country.code}:${engines.length}`);
  }
  assert.strictEqual(thin.length, 0, `thin coverage: ${thin.slice(0, 10).join(', ')}`);
});
test('India keeps its nine-engine bundle', () => {
  const engines = registry.enginesForCountry('IN');
  for (const expected of ['openstreetmap', 'maps', 'google-local-finder', 'web-discovery', 'web-contact', 'justdial', 'weddingbazaar', 'weddingwire', 'mandap']) {
    assert.ok(engines.includes(expected), `India missing ${expected}`);
  }
});
test('India-only engines never run abroad', () => {
  const indiaOnly = [...registry.INDIA_ONLY_ENGINES];
  for (const country of COUNTRIES) {
    if (country.code === 'IN') continue;
    const engines = registry.enginesForCountry(country.code);
    for (const engine of indiaOnly) {
      assert.ok(!engines.includes(engine), `${country.code} wrongly runs ${engine}`);
    }
  }
});
test('blocked sources are never enabled or bundled', () => {
  for (const source of registry.SOURCES) {
    if (source.access !== 'blocked') continue;
    assert.strictEqual(source.enabled, false, `${source.id} is blocked but enabled`);
    for (const country of COUNTRIES) {
      const engines = registry.enginesForCountry(country.code);
      if (source.engine) assert.ok(!engines.includes(source.engine), `${country.code} runs blocked ${source.engine}`);
    }
  }
});
test('coverage report covers all 245 countries', () => {
  const report = registry.coverageReport();
  assert.strictEqual(report.length, 245);
  assert.ok(report.every(row => row.runningEngines.length >= 5));
});

console.log('\nengine modules');
test('every bundled engine resolves to a real module', () => {
  const seen = new Set();
  for (const country of COUNTRIES) {
    for (const engine of registry.enginesForCountry(country.code)) seen.add(engine);
  }
  for (const engine of seen) {
    const file = ENGINE_MODULES[engine];
    assert.ok(file, `no module mapping for ${engine}`);
    const mod = require(path.join(root, `server/src/scrapers/${file}.js`));
    const hasFn = Object.values(mod).some(value => typeof value === 'function');
    assert.ok(hasFn, `${file}.js exports no function`);
  }
});

console.log('\ncountry detection');
test('detects curated markets', () => {
  const samples = {
    Berlin: 'DE', 'São Paulo': 'BR', Tokyo: 'JP', Cairo: 'EG', Lagos: 'NG',
    London: 'GB', Sydney: 'AU', Toronto: 'CA', Dubai: 'AE', Singapore: 'SG',
    'New York': 'US', Paris: 'FR', 'Mexico City': 'MX', Nairobi: 'KE'
  };
  for (const [place, expected] of Object.entries(samples)) {
    const hit = detectCountry(place);
    assert.ok(hit, `${place} not detected`);
    assert.strictEqual(hit.code, expected, `${place} -> ${hit.code}, expected ${expected}`);
  }
});
test('India words resolve to IN', () => {
  for (const place of ['India', 'Bharat', 'Vijayawada', 'Tenali']) {
    const hit = detectCountry(place);
    assert.ok(hit, `${place} not detected`);
    assert.strictEqual(hit.code, 'IN', `${place} -> ${hit.code}`);
  }
});

console.log('\nphone rules follow the country');
test('US local number becomes +1, not +91', () => {
  const parsed = normalizePhone('(512) 555-0134', { context: 'phone tel', defaultCountry: 'US', allowInternational: true });
  assert.ok(parsed, 'US number rejected');
  assert.strictEqual(parsed.e164, '+15125550134');
  assert.strictEqual(parsed.country, 'US');
  assert.ok(parsed.isMobile);
});
test('German trunk number stays +49', () => {
  const parsed = normalizePhone('030 12345678', { context: 'phone tel', defaultCountry: 'DE', allowInternational: true });
  assert.ok(parsed, 'German number rejected');
  assert.strictEqual(parsed.e164, '+493012345678');
});
test('India behaviour is unchanged', () => {
  const mobile = normalizePhone('9876501234', { context: 'phone tel' });
  assert.ok(mobile && mobile.isMobile, 'Indian mobile rejected');
  assert.strictEqual(mobile.e164, '+919876501234');
  const landline = normalizePhone('080 4148 9746', { context: 'phone tel' });
  assert.ok(landline && landline.isLandline, 'Indian landline rejected');
});
test('US tel: and wa.me links parse without +91', () => {
  const html = '<a href="tel:+15125550134">Call</a><a href="https://wa.me/15125550199">WA</a><p>Email: hello@example.org</p>';
  const data = extractFromHtml(html, 'https://example.org', { defaultCountry: 'US', allowInternational: true });
  assert.ok(data.phones.includes('+1 512 555 0134'), `phones: ${data.phones.join('|')}`);
  assert.strictEqual(data.whatsappLink, 'https://wa.me/15125550199');
  assert.deepStrictEqual(data.emails, ['hello@example.org']);
});

console.log('\nno India-only bias in the engines');
test('Google engines derive gl from the country', () => {
  const files = [
    'server/src/utils/fastGoogleHttp.js',
    'server/src/scrapers/engine-google-serp-local.js',
    'server/src/scrapers/engine-google-places.js',
    'server/src/scrapers/engine-google-serp.js'
  ];
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(!/gl=in\b/.test(source), `${file} hardcodes gl=in`);
    assert.ok(/detectCountry/.test(source), `${file} does not derive the country`);
  }
});
test('WhatsApp links are built from validated digits', () => {
  const files = [
    'server/src/utils/fastWebsiteExtractor.js',
    'server/src/scrapers/engine-google-serp-local.js',
    'server/src/scrapers/engine-google-places.js',
    'server/src/scrapers/engine-google-serp.js',
    'server/src/services/phoneBackfillService.js'
  ];
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const lines = source.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (!/wa\.me\/91/.test(lines[i])) continue;
      // The only allowed +91 link is the India-only branch of the website
      // extractor, where the number is already an Indian mobile.
      assert.ok(
        file.endsWith('fastWebsiteExtractor.js') && /data\.mobiles|digits/.test(lines[i]),
        `${file}:${i + 1} hardcodes wa.me/91`
      );
    }
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
console.log(`countries: ${COUNTRIES.length} · India engines: ${registry.enginesForCountry('IN').length} · world engines: ${registry.enginesForCountry('US').length}`);
process.exit(failed ? 1 : 0);
