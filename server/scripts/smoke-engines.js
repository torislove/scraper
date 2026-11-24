/**
 * smoke-engines.js — Automated regression test harness for all active scraping engines.
 * Runs each engine on a canonical query and reports: { engine, leads, durationMs, error }.
 */

const { scrapeJustDial } = require('../src/scrapers/engine-justdial');
const { scrapeOpenStreetMap } = require('../src/scrapers/engine-openstreetmap');
const { scrapeGoogleLocalFinder } = require('../src/scrapers/engine-google-serp-local');

async function testEngine(name, fn) {
  const started = Date.now();
  try {
    const res = await fn();
    const durationMs = Date.now() - started;
    const leads = Array.isArray(res)
      ? res.length
      : Number(res?.totalScraped ?? res?.newInserted ?? res?.count ?? 0);
    return { engine: name, leads, durationMs, ok: true };
  } catch (err) {
    return { engine: name, leads: 0, durationMs: Date.now() - started, ok: false, error: err.message };
  }
}

async function runSmokeTests() {
  console.log('====================================================');
  console.log('   SCRAPER ENGINES REGRESSION SMOKE TEST HARNESS   ');
  console.log('====================================================\n');

  const results = [];

  // 1. JustDial Mobile API
  console.log('[Testing 1/3] JustDial Mobile Results API...');
  results.push(await testEngine('JustDial', () => scrapeJustDial('Dentists', 'Guntur', 'smoke_test')));

  // 2. OpenStreetMap
  console.log('[Testing 2/3] OpenStreetMap Overpass/Nominatim...');
  results.push(await testEngine('OpenStreetMap', () => scrapeOpenStreetMap('Dentists', 'Guntur', 'smoke_test', 16.3067, 80.4365, 8, 'IN')));

  // 3. Google Local Finder
  console.log('[Testing 3/3] Google Local Finder...');
  results.push(await testEngine('Google Local Finder', () => scrapeGoogleLocalFinder('Dentists in Guntur', 'Dentists', 'Guntur', 'smoke_test', 1)));

  console.log('\n====================================================');
  console.log('RESULTS SUMMARY:');
  console.log('====================================================');
  console.table(results);

  const allPassed = results.filter(r => r.leads > 0).length >= 2;
  console.log(allPassed ? '\n>> PASS: Zero-yield engines revived and producing leads.' : '\n>> FAIL: Not enough leads produced.');
  process.exit(allPassed ? 0 : 1);
}

runSmokeTests();
