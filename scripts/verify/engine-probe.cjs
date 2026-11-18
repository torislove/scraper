/**
 * Live engine probe — US Troy "photographers".
 * Run: node scripts/verify/engine-probe.cjs
 *
 * Isolated temp data dirs so it cannot touch real leads. Prints what each
 * keyless engine returns for the exact query the operator reported.
 */
const os = require('os');
const fs = require('fs');
const path = require('path');

const tempRoot = path.join(os.tmpdir(), `scraper-probe-${Date.now()}`);
process.env.SCRAPER_DATA_DIR = path.join(tempRoot, 'data');
process.env.SCRAPER_DB_DIR = path.join(tempRoot, 'db');
fs.mkdirSync(process.env.SCRAPER_DATA_DIR, { recursive: true });
fs.mkdirSync(process.env.SCRAPER_DB_DIR, { recursive: true });

const dbAdapter = require('../../server/src/config/dbAdapter');
const { setDeps: setPlacesDeps, scrapeGooglePlaces } = require('../../server/src/scrapers/engine-google-places');
const { setDeps: setLfDeps, scrapeGoogleLocalFinder } = require('../../server/src/scrapers/engine-google-serp-local');
const { setDeps: setWdDeps, scrapeWebDiscovery } = require('../../server/src/scrapers/engine-web-discovery');

const log = (...a) => console.log('   ', ...a);
setPlacesDeps({ logger: log });
setLfDeps({ logger: log });
setWdDeps({ logger: log });

const CITY = 'Troy';
const STATE = 'Michigan';
const DISTRICT = 'Oakland';
const LAT = 42.6064;
const LNG = -83.1499;

function summary(tag, sessionId) {
  const vendors = dbAdapter.getVendorsBySession(sessionId) || [];
  const phones = vendors.flatMap(v => (Array.isArray(v.phones) ? v.phones : []))
    .map(p => (typeof p === 'string' ? { e164: p } : p)).filter(p => p && p.e164);
  console.log(`  ${tag}: ${vendors.length} leads · ${phones.length} phones · ` +
    `${vendors.filter(v => v.website).length} sites · ${vendors.filter(v => v.email || (v.emails || []).length).length} emails · ` +
    `${vendors.filter(v => v.social || v.socialLinks).length} social`);
  console.log('   sample:', vendors.slice(0, 4).map(v => v.name).join(' | ') || '—');
  return { vendors: vendors.length, phones: phones.length };
}

(async () => {
  const run = Date.now().toString(36);

  console.log('\n[1] Google Maps');
  try {
    const r = await scrapeGooglePlaces(
      `photographers in ${CITY}`, 'photographers', CITY, `probe_maps_${run}`,
      LAT, LNG, 8, 'broad', DISTRICT, STATE, null, `${CITY}, ${STATE}, United States`, false, 'city', null
    );
    console.log('   engine result:', JSON.stringify(r).slice(0, 200));
    summary('maps', `probe_maps_${run}`);
  } catch (e) { console.log('   FAILED:', e.message); }

  console.log('\n[2] Google Local Finder');
  try {
    const r = await scrapeGoogleLocalFinder(
      `photographers in ${CITY}`, 'photographers', CITY, `probe_lf_${run}`,
      3, DISTRICT, STATE, { lat: LAT, lng: LNG }, `${CITY}, ${STATE}, United States`, false, false, 'city'
    );
    console.log('   engine result:', JSON.stringify(r).slice(0, 200));
    summary('local-finder', `probe_lf_${run}`);
  } catch (e) { console.log('   FAILED:', e.message); }

  console.log('\n[3] Web Discovery (Bing)');
  try {
    const r = await scrapeWebDiscovery('photographers', CITY, `probe_wd_${run}`, { countryCode: 'US', limit: 8 });
    console.log('   engine result:', JSON.stringify(r).slice(0, 200));
    summary('web-discovery', `probe_wd_${run}`);
  } catch (e) { console.log('   FAILED:', e.message); }

  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch (e) {}
  process.exit(0);
})();
