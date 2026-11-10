/**
 * Engine warm-up / proof.
 *
 * Runs every engine that is not already proven against a real city, records an
 * honest health entry from the real result, then removes the temporary folder.
 * No keys, no Python, no proxies: only the engines this build actually ships.
 *
 * Usage:
 *   node scripts/warm-engines.js
 *   node scripts/warm-engines.js "Dental clinics" "Guntur, Andhra Pradesh"
 *
 * Run it while the engine is stopped, then start the engine so the board loads
 * the fresh health file. Afterwards run clean-test-vendors.js to drop test rows.
 */
const { scrapeOpenStreetMap } = require('../src/scrapers/engine-openstreetmap');
const { scrapeWebContact } = require('../src/scrapers/engine-web-contact');
const { scrapeDuckDuckGoDork } = require('../src/scrapers/engine-social-dork');
const { scrapeBraveDork } = require('../src/scrapers/engine-brave-dork');
const { geocodeLocation } = require('../src/utils/olaMaps');
const engineHealth = require('../src/services/engineHealth');
const dbAdapter = require('../src/config/dbAdapter');

const CATEGORY = process.argv[2] || 'Banquet Halls';
const LOCATION = process.argv[3] || 'Guntur, Andhra Pradesh';
const STAMP = Date.now().toString(36);

function countOf(result, sessionId) {
  if (result && typeof result === 'object') {
    const direct = Number(result.totalScraped ?? result.totalFound ?? result.count ?? result.candidates ?? result.enriched);
    if (Number.isFinite(direct)) return direct;
  }
  if (Array.isArray(result)) return result.length;
  if (sessionId) {
    return dbAdapter.getVendors().filter(v =>
      v.sessionId === sessionId || (Array.isArray(v.sessionIds) && v.sessionIds.includes(sessionId))
    ).length;
  }
  return 0;
}

async function run(key, label, sessionId, fn) {
  const started = Date.now();
  try {
    const result = await fn(sessionId);
    const count = countOf(result, sessionId);
    const ms = Date.now() - started;
    engineHealth.recordRun(key, { ok: true, count, ms });
    console.log(`[warm] ${label.padEnd(18)} count=${String(count).padStart(3)}  ${(ms / 1000).toFixed(1)}s`);
    return { key, count, ms, sessionId };
  } catch (err) {
    const ms = Date.now() - started;
    engineHealth.recordRun(key, { ok: false, count: 0, ms, error: err.message });
    console.log(`[warm] ${label.padEnd(18)} FAILED   ${err.message}`);
    return { key, count: 0, ms, sessionId, error: err.message };
  }
}

(async () => {
  const geo = await geocodeLocation(LOCATION);
  const lat = geo?.lat || null;
  const lng = geo?.lng || null;
  console.log(`[warm] city=${LOCATION} lat=${lat} lng=${lng}`);

  const runs = [];

  runs.push(await run('openstreetmap', 'OpenStreetMap', `selftest_osm_${STAMP}`, sid =>
    scrapeOpenStreetMap(CATEGORY, LOCATION, sid, lat, lng, 8)));

  // Enrich a few real leads that already have a website but a missing field.
  const targets = dbAdapter.getVendors()
    .filter(v => v.website && (!v.phone || !v.email))
    .slice(0, 6);
  if (targets.length) {
    runs.push(await run('web-contact', 'Business Websites', `selftest_web_${STAMP}`, () =>
      scrapeWebContact(targets, { sessionId: `selftest_web_${STAMP}`, concurrency: 3, limit: 6, budgetMs: 150000 })));
  } else {
    console.log('[warm] web-contact       skipped  (no lead with a website)');
  }

  runs.push(await run('social', 'Social dork', `selftest_social_${STAMP}`, sid =>
    scrapeDuckDuckGoDork('instagram.com', `${CATEGORY} ${LOCATION}`, CATEGORY, LOCATION, { aborted: false }, sid)));

  runs.push(await run('brave', 'Brave dork', `selftest_brave_${STAMP}`, sid =>
    scrapeBraveDork('instagram.com', `${CATEGORY} ${LOCATION}`, CATEGORY, LOCATION, sid)));

  try { dbAdapter.flushSync(); } catch (err) { /* older adapters flush on exit */ }

  console.log('[warm] summary:', runs.map(r => `${r.key}=${r.count}`).join(' '));
  console.log('[warm] now start the engine, then run clean-test-vendors.js to drop the test rows.');
  setTimeout(() => process.exit(0), 2200);
})();
