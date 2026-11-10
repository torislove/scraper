/*
 * Prove the two web-footprint engines with an honest health entry.
 * Uses a real city + category, writes nothing that should stay in the store
 * (test folders are cleaned afterwards by clean-test-vendors.js).
 */
const { scrapeDuckDuckGoDork, setLogger } = require('../src/scrapers/engine-social-dork');
const { scrapeBraveDork, setDeps } = require('../src/scrapers/engine-brave-dork');
const engineHealth = require('../src/services/engineHealth');
const dbAdapter = require('../src/config/dbAdapter');

setLogger(msg => console.log(msg));
setDeps({ logger: msg => console.log(msg) });

const CATEGORY = process.argv[2] || 'Dental clinics';
const LOCATION = process.argv[3] || 'Guntur, Andhra Pradesh';
const STAMP = Date.now().toString(36);

async function run(key, label, fn) {
  const started = Date.now();
  try {
    const result = await fn();
    const count = Number(result?.totalScraped ?? 0);
    const found = Number(result?.found ?? 0);
    engineHealth.recordRun(key, {
      ok: true,
      ms: Date.now() - started,
      count: found || count,
      note: result?.note || ''
    });
    console.log(`[probe] ${label} inserted=${count} seen=${found} ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } catch (err) {
    engineHealth.recordRun(key, { ok: false, ms: Date.now() - started, error: err.message });
    console.log(`[probe] ${label} FAILED ${err.message}`);
  }
}

(async () => {
  await run('social', 'Social dork', () =>
    scrapeDuckDuckGoDork('instagram.com', `${CATEGORY} ${LOCATION}`, CATEGORY, LOCATION, { aborted: false }, `selftest_social_${STAMP}`));

  await run('brave', 'Brave dork', () =>
    scrapeBraveDork('instagram.com', `${CATEGORY} ${LOCATION}`, CATEGORY, LOCATION, `selftest_brave_${STAMP}`));

  try { dbAdapter.flushSync(); } catch (e) {}
  engineHealth.flushNow();
  process.exit(0);
})();
