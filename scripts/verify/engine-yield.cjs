/**
 * Engine yield harness.
 *
 * Runs each keyless engine directly (no queue, no orchestrator) for one city
 * and one category, in an isolated data directory, and prints what each engine
 * actually returns: rows, phones, websites, emails, and how long it took.
 *
 * Why this exists: the health board only knows the *last* run of whatever the
 * operator happened to search. This measures every engine on the same query,
 * so a dead engine cannot hide behind a busy one.
 *
 * Usage:
 *   node scripts/verify/engine-yield.cjs --country IN --city Vijayawada --category "Wedding Venues"
 *   node scripts/verify/engine-yield.cjs --country US --city Troy --category Photographers
 *   node scripts/verify/engine-yield.cjs --country IN --city Guntur --category "Wedding Venues" --engines weddingbazaar,mandap
 *   node scripts/verify/engine-yield.cjs --all
 *
 * Writes docs/engine-yield.json. Exits non-zero when an engine errored.
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

const tempRoot = path.join(os.tmpdir(), `scraper-yield-${Date.now()}`);
process.env.SCRAPER_DATA_DIR = path.join(tempRoot, 'data');
process.env.SCRAPER_DB_DIR = path.join(tempRoot, 'db');
fs.mkdirSync(process.env.SCRAPER_DATA_DIR, { recursive: true });
fs.mkdirSync(process.env.SCRAPER_DB_DIR, { recursive: true });

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_FILE = path.join(ROOT, 'docs', 'engine-yield.json');
const PER_ENGINE_TIMEOUT_MS = 180_000;

// ---------------------------------------------------------------- arguments
function arg(name, fallback = null) {
  const prefix = `--${name}=`;
  const inline = process.argv.find(a => a.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
}

const RUN_ALL = process.argv.includes('--all');
const COUNTRY = String(arg('country', 'IN')).toUpperCase();
const CITY = arg('city', 'Vijayawada');
const CATEGORY = arg('category', 'Wedding Venues');
const ONLY = arg('engines', '')
  ? arg('engines').split(',').map(s => s.trim()).filter(Boolean)
  : null;

// ---------------------------------------------------------------- helpers
const silent = () => {};

function countOf(result) {
  if (Array.isArray(result)) return result.length;
  if (result && typeof result === 'object') {
    const direct = Number(result.totalScraped ?? result.newInserted ?? result.found ?? result.count);
    if (Number.isFinite(direct)) return direct;
  }
  return 0;
}

function collectFromResult(result) {
  const rows = Array.isArray(result)
    ? result
    : (result && Array.isArray(result.vendors) ? result.vendors : []);
  const phones = new Set();
  const websites = new Set();
  const emails = new Set();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    for (const p of [row.phone, row.primaryPhone, ...(Array.isArray(row.phones) ? row.phones : [])]) {
      const digits = String(p || '').replace(/\D/g, '');
      if (digits.length >= 8) phones.add(digits);
    }
    if (row.website) websites.add(String(row.website));
    if (row.email) emails.add(String(row.email).toLowerCase());
  }
  return { phones: phones.size, websites: websites.size, emails: emails.size };
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms
    );
    if (typeof timer.unref === 'function') timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ---------------------------------------------------------------- engine table
/**
 * Build the engine list for one run. Every closure captures that run's own
 * country/city/category, so `--all` cannot leak one preset's query into another.
 */
function buildEngines({ country, city, category }) {
  const IN = country === 'IN';
  const engines = [];
  const add = (key, label, run) => engines.push({ key, label, run });

  if (IN) {
    const { scrapeJustDial, setDeps: setJdDeps } = require('../../server/src/scrapers/engine-justdial');
    const { scrapeWeddingBazaar, setDeps: setWbDeps } = require('../../server/src/scrapers/engine-weddingbazaar');
    const { scrapeWeddingWire, setDeps: setWwDeps } = require('../../server/src/scrapers/engine-weddingwire');
    const { scrapeMandap, setDeps: setMdDeps } = require('../../server/src/scrapers/engine-mandap');
    const { scrapeDuckDuckGoDork } = require('../../server/src/scrapers/engine-social-dork');

    setJdDeps({ logger: silent });
    setWbDeps({ logger: silent });
    setWwDeps({ logger: silent });
    setMdDeps({ logger: silent });

    add('justdial', 'JustDial', () => scrapeJustDial(category, city, 'omni', `yield-jd-${Date.now()}`));
    add('weddingbazaar', 'WeddingBazaar', () => scrapeWeddingBazaar(category, city, `yield-wb-${Date.now()}`));
    add('weddingwire', 'WeddingWire', () => scrapeWeddingWire(category, city, `yield-ww-${Date.now()}`, country));
    add('mandap', 'Mandap', () => scrapeMandap(category, city, `yield-md-${Date.now()}`));
    add('social', 'Social Dork', () => scrapeDuckDuckGoDork(
      'instagram.com',
      `${category} ${city}`,
      category,
      city,
      { aborted: false },
      `yield-sd-${Date.now()}`,
      country,
      'admin_1'
    ));
  }

  const { scrapeOpenStreetMap, setDeps: setOsmDeps } = require('../../server/src/scrapers/engine-openstreetmap');
  const { scrapeWebDiscovery, setDeps: setWdDeps } = require('../../server/src/scrapers/engine-web-discovery');
  setOsmDeps({ logger: silent });
  setWdDeps({ logger: silent });

  add('openstreetmap', 'OpenStreetMap', () => scrapeOpenStreetMap(
    category, city, `yield-osm-${Date.now()}`, null, null, 10, country
  ));
  add('web-discovery', 'Web Discovery', () => scrapeWebDiscovery(
    category, city, `yield-wd-${Date.now()}`, { countryCode: country, limit: 8 }
  ));

  if (!IN) {
    const { scrapeYellowPagesGlobal, setDeps: setYpDeps } = require('../../server/src/scrapers/engine-yellowpages-global');
    const { scrapeYelp, setDeps: setYelpDeps } = require('../../server/src/scrapers/engine-yelp');
    const { scrapeBingPlaces, setDeps: setBingDeps } = require('../../server/src/scrapers/engine-bing-places');
    const { scrapeTripAdvisor, setDeps: setTaDeps } = require('../../server/src/scrapers/engine-tripadvisor');
    const { scrapeWikidata, setDeps: setWkDeps } = require('../../server/src/scrapers/engine-wikidata-businesses');
    const { scrapeSocialDorkIntl, setDeps: setSdDeps } = require('../../server/src/scrapers/engine-social-dork-intl');
    const { scrapeCylex, setDeps: setCxDeps } = require('../../server/src/scrapers/engine-cylex');
    const { scrapeTrustpilot, setDeps: setTpDeps } = require('../../server/src/scrapers/engine-trustpilot');

    setYpDeps({ logger: silent });
    setYelpDeps({ logger: silent });
    setBingDeps({ logger: silent });
    setTaDeps({ logger: silent });
    setWkDeps({ logger: silent });
    setSdDeps({ logger: silent });
    setCxDeps({ logger: silent });
    setTpDeps({ logger: silent });

    add('yellowpages', 'YellowPages / Yell', () => scrapeYellowPagesGlobal(category, city, `yield-yp-${Date.now()}`, { countryCode: country }));
    add('yelp', 'Yelp', () => scrapeYelp(category, city, `yield-ye-${Date.now()}`, { countryCode: country }));
    add('bing-places', 'Bing Places', () => scrapeBingPlaces(category, city, `yield-bp-${Date.now()}`, { countryCode: country }));
    add('tripadvisor', 'TripAdvisor', () => scrapeTripAdvisor(category, city, `yield-ta-${Date.now()}`, { countryCode: country }));
    add('wikidata', 'Wikidata', () => scrapeWikidata(category, city, `yield-wk-${Date.now()}`, country));
    add('social-dork', 'Social Dork (Intl)', () => scrapeSocialDorkIntl(category, city, `yield-sdi-${Date.now()}`, country));
    add('cylex', 'Cylex', () => scrapeCylex(category, city, `yield-cx-${Date.now()}`, { countryCode: country }));
    add('trustpilot', 'Trustpilot', () => scrapeTrustpilot(category, city, `yield-tp-${Date.now()}`, { countryCode: country }));

    if (country === 'GB') {
      const { scrapeFreeIndexUK, setDeps: setFiDeps } = require('../../server/src/scrapers/engine-freeindex-uk');
      setFiDeps({ logger: silent });
      add('freeindex', 'FreeIndex UK', () => scrapeFreeIndexUK(category, city, `yield-fi-${Date.now()}`));
    }
    if (country === 'IE') {
      const { scrapeGoldenPagesIE, setDeps: setGpDeps } = require('../../server/src/scrapers/engine-goldenpages-ie');
      setGpDeps({ logger: silent });
      add('goldenpages', 'GoldenPages IE', () => scrapeGoldenPagesIE(category, city, `yield-gp-${Date.now()}`));
    }
  }

  return engines.filter(e => !ONLY || ONLY.includes(e.key));
}

// ---------------------------------------------------------------- run
async function runOne(engine) {
  const startedAt = Date.now();
  try {
    const result = await withTimeout(engine.run(), PER_ENGINE_TIMEOUT_MS, engine.label);
    return {
      key: engine.key,
      label: engine.label,
      ok: true,
      rows: countOf(result),
      ms: Date.now() - startedAt,
      skipped: (result && typeof result === 'object' && result.skipped) || null,
      ...collectFromResult(result)
    };
  } catch (error) {
    return {
      key: engine.key,
      label: engine.label,
      ok: false,
      rows: 0,
      ms: Date.now() - startedAt,
      error: String(error.message || error).slice(0, 300)
    };
  }
}

const PRESETS = [
  { country: 'IN', city: 'Vijayawada', category: 'Wedding Venues' },
  { country: 'IN', city: 'Guntur', category: 'Wedding Venues' },
  { country: 'US', city: 'Troy, Michigan', category: 'Photographers' },
  { country: 'GB', city: 'Manchester', category: 'Caterers' },
  { country: 'CA', city: 'Toronto', category: 'Wedding Planners' },
  { country: 'AU', city: 'Sydney', category: 'Caterers' },
  { country: 'AE', city: 'Dubai', category: 'Event Organizers' },
  { country: 'SG', city: 'Singapore', category: 'Caterers' },
  { country: 'NZ', city: 'Auckland', category: 'Wedding Venues' },
  { country: 'ZA', city: 'Cape Town', category: 'Caterers' },
  { country: 'IE', city: 'Dublin', category: 'Caterers' },
  { country: 'DE', city: 'Berlin', category: 'Catering' }
];

async function main() {
  // Merge with the previous report instead of overwriting it. Measuring one
  // engine at a time is the only practical way to run this harness (each
  // engine can take two minutes), so a single-engine run must not erase the
  // results the other engines already produced for the same city.
  let previous = null;
  try {
    previous = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  } catch (e) {
    previous = null;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    perEngineTimeoutMs: PER_ENGINE_TIMEOUT_MS,
    runs: []
  };

  const runs = RUN_ALL ? PRESETS : [{ country: COUNTRY, city: CITY, category: CATEGORY }];
  let failures = 0;

  for (const preset of runs) {
    const engines = buildEngines(preset);
    const results = [];
    console.log(`\n=== ${preset.country} · ${preset.city} · ${preset.category} ===`);

    for (const engine of engines) {
      process.stdout.write(`  ${engine.label.padEnd(24)} `);
      const result = await runOne(engine);
      results.push(result);

      if (!result.ok) {
        failures++;
        console.log(`ERROR  ${result.error}`);
      } else if (result.rows === 0) {
        console.log(`0 rows${result.skipped ? ` (${result.skipped})` : ''}  ${result.ms}ms`);
      } else {
        console.log(
          `${String(result.rows).padStart(3)} rows  ${String(result.ms).padStart(6)}ms  ` +
          `phones:${result.phones} sites:${result.websites} emails:${result.emails}`
        );
      }
    }

    report.runs.push({ ...preset, results });
  }

  // Fold this run's engines into the previous report, keeping every engine
  // that was measured earlier for the same city.
  const keyOf = run => `${run.country}|${run.city}|${run.category}`.toLowerCase();
  const carried = new Map((previous?.runs || []).map(run => [keyOf(run), run]));
  for (const run of report.runs) {
    const prev = carried.get(keyOf(run));
    if (!prev) continue;
    const byEngine = new Map((prev.results || []).map(r => [r.key, r]));
    for (const r of run.results) byEngine.set(r.key, r);
    run.results = [...byEngine.values()];
    carried.delete(keyOf(run));
  }
  for (const leftover of carried.values()) report.runs.push(leftover);

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${path.relative(ROOT, OUT_FILE)}`);

  if (failures > 0) {
    console.log(`\n${failures} engine(s) errored.`);
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error('Harness failed:', error);
  process.exit(1);
});
