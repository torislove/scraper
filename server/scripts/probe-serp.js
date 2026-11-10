/*
 * Does the Google organic engine actually return rows now that it runs without
 * a public proxy? Prints the honest count and flushes the health entry.
 */
const { scrapeGoogleSerp } = require('../src/scrapers/engine-google-serp');
const engineHealth = require('../src/services/engineHealth');

(async () => {
  const started = Date.now();
  const sessionId = `probe_serp_${Date.now().toString(36)}`;
  try {
    const result = await scrapeGoogleSerp('Dental clinics in Guntur', 'Dental clinics', 'Guntur, Andhra Pradesh', sessionId);
    const count = Number(result?.totalScraped ?? result?.count ?? 0);
    console.log('serp result:', JSON.stringify(result)?.slice(0, 400));
    engineHealth.recordRun('google-serp', { ok: true, ms: Date.now() - started, count });
    console.log('serp count =', count, `in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } catch (err) {
    engineHealth.recordRun('google-serp', { ok: false, ms: Date.now() - started, error: err.message });
    console.log('serp FAILED:', err.message);
  }
  engineHealth.flushNow();
  process.exit(0);
})();
