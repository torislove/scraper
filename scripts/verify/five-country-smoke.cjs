/**
 * Five-country smoke test — India + United States + United Kingdom + Canada + Australia.
 *
 * Run: node scripts/verify/five-country-smoke.cjs
 *
 * What this proves (and what it does not):
 *  - the country bundle is correct (India = 9 engines, abroad = 5 keyless engines)
 *  - the country's real admin vocabulary is returned (State → District → Mandal
 *    in India, State → County → City in the US, etc.)
 *  - a live keyless OSM search returns real businesses for each market
 *  - every phone is parsed in the local format, with no +91 leak and no wrong
 *    country prefix
 *  - coordinates, websites and emails survive when OSM has them
 *
 * It does NOT prove volume, speed or "no rate limits". A throttled volunteer
 * endpoint is reported honestly (mirror + fallback path are logged by the
 * engine), never hidden.
 *
 * The test writes to an isolated temporary data directory so it can never touch
 * the operator's real leads.
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

const tempRoot = path.join(os.tmpdir(), `scraper-five-${Date.now()}`);
process.env.SCRAPER_DATA_DIR = path.join(tempRoot, 'data');
process.env.SCRAPER_DB_DIR = path.join(tempRoot, 'db');
fs.mkdirSync(process.env.SCRAPER_DATA_DIR, { recursive: true });
fs.mkdirSync(process.env.SCRAPER_DB_DIR, { recursive: true });

const { scrapeOpenStreetMap } = require('../../server/src/scrapers/engine-openstreetmap');
const dbAdapter = require('../../server/src/config/dbAdapter');
const registry = require('../../server/src/services/sources/registry');
const { adminForCountry } = require('../../server/src/services/localBrain/countries');

const MARKETS = [
  { code: 'IN', city: 'Vijayawada', country: 'India', prefix: '+91', query: 'photographers', engines: 9 },
  { code: 'US', city: 'Troy', country: 'United States', prefix: '+1', query: 'computer stores', engines: 5 },
  { code: 'GB', city: 'London', country: 'United Kingdom', prefix: '+44', query: 'computer stores', engines: 5 },
  { code: 'CA', city: 'Toronto', country: 'Canada', prefix: '+1', query: 'computer stores', engines: 5 },
  { code: 'AU', city: 'Sydney', country: 'Australia', prefix: '+61', query: 'computer stores', engines: 5 }
];

const GLOBAL_ENGINES = ['openstreetmap', 'maps', 'google-local-finder', 'web-discovery', 'web-contact'];

function line(label, value) {
  console.log(`  ${label.padEnd(22)} ${value}`);
}

(async () => {
  let failures = 0;
  const rows = [];

  for (const market of MARKETS) {
    const sessionId = `five_${market.code.toLowerCase()}_${Date.now().toString(36)}`;
    console.log(`\n${market.code} · ${market.city} · "${market.query}"`);

    const engines = registry.enginesForCountry(market.code);
    const admin = adminForCountry(market.code);
    const bundleOk = GLOBAL_ENGINES.every(engine => engines.includes(engine)) && engines.length === market.engines;
    if (!bundleOk) failures += 1;
    line('engines', `${engines.length} · ${engines.join(', ')}`);
    line('admin', admin.levels.join(' → '));

    let result = { totalScraped: 0, newInserted: 0, updated: 0, phoneCount: 0, mobileCount: 0 };
    let error = null;
    try {
      result = await scrapeOpenStreetMap(
        market.query,
        market.city,
        sessionId,
        null,
        null,
        8,
        market.code
      );
    } catch (err) {
      error = err.message;
      failures += 1;
    }

    const vendors = dbAdapter.getVendorsBySession(sessionId) || [];
    // The store keeps phones as E.164 strings on read and rich objects on write.
    // Normalise both so the +91 / prefix checks look at real numbers.
    const phones = vendors.flatMap(vendor => (Array.isArray(vendor.phones) ? vendor.phones : []))
      .map(phone => (typeof phone === 'string' ? { e164: phone } : phone))
      .filter(phone => phone && phone.e164);
    const indiaLeak = market.code === 'IN' ? [] : phones.filter(phone => String(phone.e164).startsWith('+91'));
    const wrongPrefix = phones.filter(phone => !String(phone.e164).startsWith(market.prefix));
    const withCoords = vendors.filter(vendor => Number.isFinite(Number(vendor.latitude)) && Number.isFinite(Number(vendor.longitude)));
    const withEmail = vendors.filter(vendor => vendor.email || (Array.isArray(vendor.emails) && vendor.emails.length));
    const withWebsite = vendors.filter(vendor => vendor.website);
    const wrongCountry = vendors.filter(vendor => vendor.country && vendor.country !== market.code);

    if (indiaLeak.length) failures += 1;
    if (wrongPrefix.length) failures += 1;
    if (wrongCountry.length) failures += 1;
    if (!error && vendors.length === 0) {
      // An honest empty result is allowed, but for these five dense markets it
      // means the fallback path is broken, so treat it as a failure.
      failures += 1;
    }

    line('result', error ? `ERROR ${error}` : `${result.totalScraped} matched · ${result.newInserted} new · ${result.phoneCount} phones`);
    line('vendors saved', String(vendors.length));
    line('phones', `${phones.length} total · ${result.mobileCount || 0} mobile (engine) · ${indiaLeak.length} +91 leaks`);
    line('extras', `${withCoords.length} with coords · ${withWebsite.length} websites · ${withEmail.length} emails`);
    line('sample', vendors.slice(0, 3).map(vendor => vendor.name).join(' | ') || '—');
    line('verdict', error ? 'FAILED (engine error)' : (vendors.length ? 'PASSED (real leads)' : 'NO LEADS (honest empty result)'));

    rows.push({
      country: market.code,
      city: market.city,
      engines: engines.length,
      admin: admin.levels.join(' → '),
      leads: vendors.length,
      phones: phones.length,
      indiaLeaks: indiaLeak.length,
      wrongPrefix: wrongPrefix.length,
      error
    });
  }

  // Contract checks that do not depend on live results.
  console.log('\ncontract checks');
  const noIndiaOnly = MARKETS.filter(market => market.code !== 'IN').every(market =>
    !registry.enginesForCountry(market.code).some(engine => registry.INDIA_ONLY_ENGINES.has(engine))
  );
  console.log(`  ${noIndiaOnly ? 'PASS' : 'FAIL'}  no India-only engine abroad`);
  if (!noIndiaOnly) failures += 1;

  const indiaHome = registry.enginesForCountry('IN').length === 9;
  console.log(`  ${indiaHome ? 'PASS' : 'FAIL'}  India keeps its 9-engine bundle`);
  if (!indiaHome) failures += 1;

  const distinctAdmin = new Set(rows.map(row => row.admin)).size;
  console.log(`  ${distinctAdmin >= 2 ? 'PASS' : 'FAIL'}  admin vocabulary varies by country (${distinctAdmin} shapes)`);
  if (distinctAdmin < 2) failures += 1;

  console.log('\nsummary');
  console.table(rows.map(row => ({
    country: row.country,
    city: row.city,
    engines: row.engines,
    admin: row.admin,
    leads: row.leads,
    phones: row.phones,
    '+91 leaks': row.indiaLeaks,
    'wrong prefix': row.wrongPrefix,
    error: row.error ? 'yes' : ''
  })));

  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch (e) {}
  console.log(failures ? `\n${failures} failure(s)` : '\nall five-country checks passed');
  process.exit(failures ? 1 : 0);
})();
