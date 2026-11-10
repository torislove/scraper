/* Prove the website reader on real leads, with per-site detail. */
const { scrapeWebContact } = require('../src/scrapers/engine-web-contact');
const dbAdapter = require('../src/config/dbAdapter');

(async () => {
  const all = dbAdapter.getVendors().filter(v => v.website && /^https?:/i.test(v.website));
  console.log('leads with website:', all.length);
  const sample = all.slice(0, 12);
  sample.forEach(v => console.log(' -', v.name, '::', v.website));
  const started = Date.now();
  const result = await scrapeWebContact(sample, {
    sessionId: 'probe_web_contact',
    concurrency: 4,
    limit: 12,
    budgetMs: 150000
  });
  console.log('result:', JSON.stringify(result));
  console.log('elapsed', ((Date.now() - started) / 1000).toFixed(1) + 's');
  try {
    const engineHealth = require('../src/services/engineHealth');
    engineHealth.recordRun('web-contact', {
      ok: true,
      ms: Date.now() - started,
      count: Number(result.candidates) || Number(result.enriched) || 0
    });
    engineHealth.flushNow();
    console.log('health recorded: candidates =', result.candidates);
  } catch (err) { /* advisory */ }
  process.exit(0);
})();
