/**
 * Administrative-hierarchy contract tests.
 *
 * Run: node scripts/verify/admin-divisions.test.cjs
 *
 * Proves three things:
 *  1. Every one of the 245 countries returns a complete hierarchy.
 *  2. The major markets use their real words, not Indian ones.
 *  3. India's local word changes with the state (Mandal / Taluka / Tehsil / …).
 *
 * No network, no browser, no keys.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const {
  COUNTRIES,
  adminForCountry,
  adminPath,
  indiaSubdivisionTerm
} = require(path.join(root, 'server/src/services/localBrain/countries'));
const { ADMIN_DIVISIONS } = require(path.join(root, 'server/src/services/localBrain/adminDivisions'));
const registry = require(path.join(root, 'server/src/services/sources/registry'));

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
test('all 245 countries return a complete hierarchy', () => {
  assert.strictEqual(COUNTRIES.length, 245);
  for (const country of COUNTRIES) {
    const admin = adminForCountry(country.code);
    for (const key of ['top', 'second', 'local', 'subdivision']) {
      assert.ok(admin[key] && String(admin[key]).trim(), `${country.code} missing ${key}`);
    }
    assert.strictEqual(admin.levels.length, 3, `${country.code} levels: ${admin.levels}`);
    assert.ok(adminPath(country.code).includes('→'), `${country.code} path missing arrow`);
  }
});
test('no country falls back to an empty or Indian label', () => {
  for (const country of COUNTRIES) {
    const admin = adminForCountry(country.code);
    if (country.code === 'IN') continue;
    assert.ok(!/Mandal|Taluka/i.test(admin.local), `${country.code} leaks Indian words: ${admin.local}`);
    // Pakistan genuinely uses tehsils; everywhere else must not.
    if (country.code !== 'PK') {
      assert.ok(!/Tehsil|Block/i.test(admin.local), `${country.code} leaks Indian words: ${admin.local}`);
    }
  }
});
test('curated table has no malformed rows', () => {
  for (const [code, admin] of Object.entries(ADMIN_DIVISIONS)) {
    assert.strictEqual(code, code.toUpperCase(), `${code} is not uppercase`);
    for (const key of ['top', 'second', 'local', 'subdivision']) {
      assert.ok(admin[key], `${code} missing ${key}`);
    }
  }
});

console.log('\nmajor markets use their real words');
test('United States: State → County → City', () => {
  assert.deepStrictEqual(adminForCountry('US').levels, ['State', 'County', 'City']);
});
test('United Kingdom: Nation → County → Town', () => {
  assert.deepStrictEqual(adminForCountry('GB').levels, ['Nation', 'County', 'Town']);
});
test('Canada: Province → Census division → City', () => {
  assert.deepStrictEqual(adminForCountry('CA').levels, ['Province', 'Census division', 'City']);
});
test('France: Region → Department → Commune', () => {
  assert.deepStrictEqual(adminForCountry('FR').levels, ['Region', 'Department', 'Commune']);
});
test('Japan: Prefecture → City or district → Ward', () => {
  assert.deepStrictEqual(adminForCountry('JP').levels, ['Prefecture', 'City or district', 'Ward']);
});
test('UAE: Emirate → Municipality → Area', () => {
  assert.deepStrictEqual(adminForCountry('AE').levels, ['Emirate', 'Municipality', 'Area']);
});
test('Germany: State → District → Municipality', () => {
  assert.deepStrictEqual(adminForCountry('DE').levels, ['State', 'District', 'Municipality']);
});
test('Brazil: State → Municipality → Neighbourhood', () => {
  assert.deepStrictEqual(adminForCountry('BR').levels, ['State', 'Municipality', 'Neighbourhood']);
});
test('Nigeria: State → Local government area → Town', () => {
  assert.deepStrictEqual(adminForCountry('NG').levels, ['State', 'Local government area', 'Town']);
});
test('Australia: State → Local government area → Suburb', () => {
  assert.deepStrictEqual(adminForCountry('AU').levels, ['State', 'Local government area', 'Suburb']);
});

console.log('\nIndia adapts to the state');
test('default India hierarchy names all three local words', () => {
  const admin = adminForCountry('IN');
  assert.strictEqual(admin.top, 'State');
  assert.strictEqual(admin.second, 'District');
  assert.ok(/Mandal/.test(admin.local), 'Mandal missing');
  assert.ok(/Taluka/.test(admin.local), 'Taluka missing');
  assert.ok(/Tehsil/.test(admin.local), 'Tehsil missing');
});
test('Andhra Pradesh and Telangana use Mandal', () => {
  assert.strictEqual(indiaSubdivisionTerm('Andhra Pradesh'), 'Mandal');
  assert.strictEqual(indiaSubdivisionTerm('Telangana'), 'Mandal');
  assert.strictEqual(indiaSubdivisionTerm('AP'), 'Mandal');
});
test('Maharashtra, Gujarat, Karnataka and Goa use Taluka', () => {
  for (const state of ['Maharashtra', 'Gujarat', 'Karnataka', 'Goa']) {
    assert.strictEqual(indiaSubdivisionTerm(state), 'Taluka', state);
  }
});
test('Tamil Nadu and Kerala use Taluk', () => {
  assert.strictEqual(indiaSubdivisionTerm('Tamil Nadu'), 'Taluk');
  assert.strictEqual(indiaSubdivisionTerm('Kerala'), 'Taluk');
});
test('north Indian states use Tehsil', () => {
  for (const state of ['Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan', 'Chhattisgarh', 'Uttarakhand', 'Himachal Pradesh', 'Punjab', 'Haryana']) {
    assert.strictEqual(indiaSubdivisionTerm(state), 'Tehsil', state);
  }
});
test('eastern and north-eastern states use Block', () => {
  for (const state of ['Bihar', 'Jharkhand', 'West Bengal', 'Odisha', 'Assam', 'Meghalaya']) {
    assert.strictEqual(indiaSubdivisionTerm(state), 'Block', state);
  }
});
test('state name with a suffix still resolves', () => {
  assert.strictEqual(indiaSubdivisionTerm('Maharashtra State'), 'Taluka');
  assert.strictEqual(indiaSubdivisionTerm('Guntur District, Andhra Pradesh'), 'Mandal');
});

console.log('\nAPI payloads');
test('coverage report rows carry the admin block', () => {
  const report = registry.coverageReport();
  assert.strictEqual(report.length, 245);
  for (const row of report) {
    assert.ok(row.admin && row.admin.levels.length === 3, `${row.code} missing admin`);
    assert.ok(row.adminPath.includes('→'), `${row.code} missing adminPath`);
  }
});
test('Canada row in the coverage report says Province', () => {
  const row = registry.coverageReport().find(item => item.code === 'CA');
  assert.strictEqual(row.admin.top, 'Province');
  assert.strictEqual(row.adminPath, 'Province → Census division → City');
});

console.log('\nfrontend copy');
test('the plan documents every-country scraping', () => {
  const plan = fs.readFileSync(path.join(root, 'docs/ADMIN-DIVISIONS-PLAN.md'), 'utf8');
  assert.ok(plan.includes('245'));
  assert.ok(/landing/i.test(plan), 'landing page section missing');
  assert.ok(/dashboard/i.test(plan), 'dashboard section missing');
});
test('admin table is the only place Indian words are defined', () => {
  const source = fs.readFileSync(path.join(root, 'server/src/services/localBrain/adminDivisions.js'), 'utf8');
  assert.ok(source.includes("'Mandal / Taluka / Tehsil'"));
  assert.ok(source.includes("'Taluka'"));
  assert.ok(source.includes("'Tehsil'"));
});

console.log(`\n${passed} passed, ${failed} failed`);
console.log(`countries: ${COUNTRIES.length} · curated admin rows: ${Object.keys(ADMIN_DIVISIONS).length}`);
process.exit(failed ? 1 : 0);
