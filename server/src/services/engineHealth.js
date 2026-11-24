/**
 * engineHealth.js
 *
 * Runtime health for every harvesting engine, plus the external APIs the
 * engine depends on. The master command center shows this as a green/red board
 * so an operator knows *before* launching a sweep whether JustDial, Google
 * Maps, IndiaMART or the AI layer can actually answer right now.
 *
 * Honesty rules:
 *  - `online`   prerequisites satisfied, last run finished without throwing.
 *  - `error`    last run threw, or a required key/binary is missing.
 *  - `empty`    last run finished but returned zero rows (amber, not green).
 *  - `untested` never executed since this data file was created.
 *
 * The board is advisory. It never blocks a search: a red engine simply means
 * the other engines will carry the sweep.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { DATA_DIR } = require('../config/paths');

const HEALTH_FILE = path.join(DATA_DIR, 'engine_health.json');
const WRITE_DEBOUNCE_MS = 1500;

const ENGINES = [
  {
    key: 'google-local-finder',
    label: 'Google Local Finder',
    kind: 'browser',
    group: 'google',
    taskNames: ['scrapeGoogleLocalFinder'],
    requires: ['playwright'],
    detail: '20-result local packs, multi-page HTML-first'
  },
  {
    key: 'maps',
    label: 'Google Maps',
    kind: 'browser',
    group: 'google',
    taskNames: ['scrapeGooglePlaces'],
    requires: ['playwright'],
    detail: 'Maps places feed, phone + rating + hours'
  },
  {
    key: 'google-serp',
    label: 'Google SERP',
    kind: 'browser',
    group: 'google',
    taskNames: ['scrapeGoogleSerp'],
    requires: ['playwright'],
    paused: true,
    pauseReason: 'Paused: Google answers automated organic searches with a consent/verify page, so this source returns nothing. Google Maps and Google Local Finder already cover the same places, so nothing is lost.',
    detail: 'Organic result pages for dealer queries'
  },
  {
    key: 'justdial',
    label: 'JustDial',
    kind: 'http',
    group: 'directory',
    taskNames: ['scrapeJustDial'],
    requires: [],
    detail: 'City-indexed business directory (live mobile endpoint, no browser required)'
  },
  {
    key: 'indiamart',
    label: 'IndiaMART',
    kind: 'browser',
    group: 'directory',
    taskNames: ['scrapePuppeteerIndiaMart'],
    requires: ['playwright'],
    paused: true,
    pauseReason: 'Paused: IndiaMART answers automated visits with a bot page. We will not bypass it, so this source stays off until they offer a public feed.',
    detail: 'City-indexed B2B supplier marketplace'
  },
  {
    key: 'openstreetmap',
    label: 'OpenStreetMap',
    kind: 'http',
    group: 'open-data',
    taskNames: ['scrapeOpenStreetMap'],
    requires: [],
    detail: 'Free ODbL open data: shops, clinics, workshops, small lodges',
    note: 'Public Overpass/Nominatim endpoints. Requests are serialised and cached for a day out of respect for the volunteer-run servers.'
  },
  {
    key: 'web-contact',
    label: 'Business Websites',
    kind: 'http',
    group: 'enrichment',
    taskNames: ['scrapeWebContact'],
    requires: [],
    detail: 'Emails, extra numbers, Instagram/Facebook handles from each lead’s own site',
    note: 'Reads only the public site already linked to the lead. robots.txt is obeyed for every host; no CAPTCHA or login is ever bypassed.'
  },
  {
    key: 'web-discovery',
    label: 'Web Discovery',
    kind: 'browser',
    group: 'web',
    taskNames: ['scrapeWebDiscovery'],
    requires: ['playwright'],
    detail: 'Keyless Bing + DuckDuckGo discovery of business sites, filtered for relevance',
    note: 'Runs in the Tier-0 burst. Aggregators and social platforms are filtered out so a result is a real business site, not a directory listing.'
  },
  {
    key: 'weddingbazaar',
    label: 'WeddingBazaar',
    kind: 'browser',
    group: 'directory',
    taskNames: ['scrapeWeddingBazaar'],
    requires: ['playwright'],
    detail: 'Wedding vendor marketplace'
  },
  {
    key: 'weddingwire',
    label: 'WeddingWire',
    kind: 'browser',
    group: 'directory',
    taskNames: ['scrapeWeddingWire'],
    requires: ['playwright'],
    detail: 'Wedding vendor marketplace'
  },
  {
    key: 'mandap',
    label: 'Mandap',
    kind: 'browser',
    group: 'directory',
    taskNames: ['scrapeMandap'],
    requires: ['playwright'],
    detail: 'Wedding venue directory'
  },
  {
    key: 'social',
    label: 'Social / Web Dork',
    kind: 'http',
    group: 'web',
    taskNames: ['scrapeDuckDuckGoDork'],
    requires: [],
    detail: 'Instagram / Facebook footprint discovery'
  },
  {
    key: 'brave',
    label: 'Brave Search',
    kind: 'http',
    group: 'web',
    taskNames: ['scrapeBraveDork'],
    requires: [],
    detail: 'Independent web index fallback'
  },
  // ---------------------------------------------------------------------
  // International keyless engines. Keys here are the exact keys the task
  // queue records through safeExecute(), so the board shows real runs.
  // `registryKey` maps back to sources/registry.js canonical names.
  // ---------------------------------------------------------------------
  {
    key: 'yellowpages',
    label: 'YellowPages / Yell',
    kind: 'browser',
    group: 'directory',
    taskNames: ['scrapeYellowPagesGlobal'],
    requires: ['playwright'],
    registryKey: 'yellowpages',
    countries: ['US', 'GB', 'CA', 'AU', 'NZ', 'AE', 'SG', 'ZA'],
    detail: 'Country-specific YellowPages and Yell indexes'
  },
  {
    key: 'yelp',
    label: 'Yelp',
    kind: 'browser',
    group: 'directory',
    taskNames: ['scrapeYelp'],
    requires: ['playwright'],
    registryKey: 'yelp',
    countries: ['US', 'CA', 'AU'],
    detail: 'Local business reviews and contact details'
  },
  {
    key: 'bing-places',
    label: 'Bing Places',
    kind: 'browser',
    group: 'directory',
    taskNames: ['scrapeBingPlaces'],
    requires: ['playwright'],
    registryKey: 'bing-places',
    detail: 'Bing local business index'
  },
  {
    key: 'tripadvisor',
    label: 'TripAdvisor',
    kind: 'http',
    group: 'directory',
    taskNames: ['scrapeTripAdvisor'],
    requires: [],
    registryKey: 'tripadvisor',
    detail: 'Hospitality, dining, venues and tourism listings'
  },
  {
    key: 'wikidata',
    label: 'Wikidata Businesses',
    kind: 'http',
    group: 'open-data',
    taskNames: ['scrapeWikidata'],
    requires: [],
    registryKey: 'wikidata-businesses',
    detail: 'Free CC0 knowledge graph of organisations by city'
  },
  {
    key: 'social-dork',
    label: 'Social Dork (Intl)',
    kind: 'http',
    group: 'web',
    taskNames: ['scrapeSocialDorkIntl'],
    requires: [],
    registryKey: 'social-dork-intl',
    detail: 'Instagram / Facebook / LinkedIn footprint outside India'
  },
  {
    key: 'freeindex',
    label: 'FreeIndex UK',
    kind: 'http',
    group: 'directory',
    taskNames: ['scrapeFreeIndexUK'],
    requires: [],
    registryKey: 'freeindex-uk',
    countries: ['GB'],
    detail: 'UK free business directory'
  },
  {
    key: 'goldenpages',
    label: 'GoldenPages Ireland',
    kind: 'http',
    group: 'directory',
    taskNames: ['scrapeGoldenPagesIE'],
    requires: [],
    registryKey: 'goldenpages-ie',
    countries: ['IE'],
    detail: 'Irish business directory'
  },
  {
    key: 'cylex',
    label: 'Cylex',
    kind: 'http',
    group: 'directory',
    taskNames: ['scrapeCylex'],
    requires: [],
    registryKey: 'cylex',
    countries: ['GB', 'AU', 'CA', 'AE', 'SG', 'US'],
    detail: 'Multi-country local business directory'
  },
  {
    key: 'trustpilot',
    label: 'Trustpilot',
    kind: 'http',
    group: 'directory',
    taskNames: ['scrapeTrustpilot'],
    requires: [],
    registryKey: 'trustpilot',
    paused: true,
    pauseReason: 'Removed from the bundle: Trustpilot answers both its search API and its website with HTTP 403 to non-browser clients. We will not bypass it, so it no longer runs.',
    detail: 'Verified business profiles with contact data'
  },
  {
    key: 'geocoder',
    label: 'Free Geocoder',
    kind: 'http',
    group: 'api',
    taskNames: [],
    requires: [],
    detail: 'OpenStreetMap Nominatim city lookup, with OLA Maps only if you already had a key'
  }
];

const TASK_TO_ENGINE = {};
for (const engine of ENGINES) {
  for (const task of engine.taskNames) TASK_TO_ENGINE[task] = engine.key;
}

let stats = {};
let writeTimer = null;
let playwrightCache = null;

function load() {
  try {
    if (!fs.existsSync(HEALTH_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(HEALTH_FILE, 'utf8'));
    if (raw && typeof raw === 'object' && raw.engines) {
      stats = raw.engines;
    }
  } catch (err) {
    stats = {};
  }
}

function writeNow() {
  try {
    fs.mkdirSync(path.dirname(HEALTH_FILE), { recursive: true });
    fs.writeFileSync(
      HEALTH_FILE,
      JSON.stringify({ updatedAt: new Date().toISOString(), engines: stats }, null, 2)
    );
    return true;
  } catch (err) {
    /* health must never break a sweep */
    return false;
  }
}

function saveSoon() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(writeNow, WRITE_DEBOUNCE_MS);
  if (typeof writeTimer.unref === 'function') writeTimer.unref();
}

/**
 * Write pending health immediately. Long-running server code never needs this
 * (the debounce fires on its own), but short scripts that call process.exit()
 * do: an unref'd timer never runs and the entry would be silently lost.
 */
function flushNow() {
  clearTimeout(writeTimer);
  writeTimer = null;
  return writeNow();
}

function playwrightReady() {
  if (playwrightCache !== null) return playwrightCache;
  try {
    playwrightCache = Boolean(require('../scrapers/browserFactory').chromium);
  } catch (err) {
    playwrightCache = false;
  }
  return playwrightCache;
}

function requirementState(requires = []) {
  const missing = [];
  for (const req of requires) {
    if (req === 'playwright') {
      if (!playwrightReady()) missing.push('Playwright / Edge runtime');
      continue;
    }
    if (!process.env[req] || !String(process.env[req]).trim()) {
      missing.push(req);
    }
  }
  return { ok: missing.length === 0, missing };
}

function entryFor(key) {
  if (!stats[key]) stats[key] = {};
  return stats[key];
}

function countFromResult(result) {
  if (Array.isArray(result)) return result.length;
  if (result && typeof result === 'object') {
    const direct = Number(result.totalScraped ?? result.totalFound ?? result.count);
    if (Number.isFinite(direct)) return direct;
    const inserted = Number(result.newInserted ?? result.inserted ?? result.updated);
    if (Number.isFinite(inserted)) return inserted;
  }
  return null;
}

/**
 * Record one engine execution. Called by the task queue after every job.
 */
function recordRun(key, { ok = true, error = '', ms = 0, count = null, taskName = '', note = '' } = {}) {
  if (!key) return;
  const now = new Date().toISOString();
  const entry = entryFor(key);
  entry.runs = Number(entry.runs || 0) + 1;
  entry.lastRunAt = now;
  entry.lastDurationMs = Math.max(0, Math.round(Number(ms) || 0));
  entry.lastTask = taskName || entry.lastTask || '';
  if (ok) {
    entry.lastSuccessAt = now;
    entry.consecutiveFailures = 0;
    entry.lastError = '';
    entry.lastErrorAt = '';
    entry.lastCount = count;
    entry.lastNote = String(note || '').slice(0, 300);

    const rowCount = typeof count === 'number' ? count : (Array.isArray(count) ? count.length : 0);
    if (rowCount > 0) {
      entry.lastNonZeroAt = now;
      entry.lastNonZeroCount = rowCount;
      entry.zeroRunStreak = 0;
      entry.runsSinceLastLead = 0;
      entry.totalLeadsProduced = Number(entry.totalLeadsProduced || 0) + rowCount;
    } else {
      entry.zeroRunStreak = Number(entry.zeroRunStreak || 0) + 1;
      entry.runsSinceLastLead = Number(entry.runsSinceLastLead || 0) + 1;
    }
  } else {
    entry.failures = Number(entry.failures || 0) + 1;
    entry.consecutiveFailures = Number(entry.consecutiveFailures || 0) + 1;
    entry.zeroRunStreak = Number(entry.zeroRunStreak || 0) + 1;
    entry.runsSinceLastLead = Number(entry.runsSinceLastLead || 0) + 1;
    entry.lastError = String(error || 'Unknown engine failure').slice(0, 400);
    entry.lastErrorAt = now;
  }
  saveSoon();
}

function recordTask(taskName, payload = {}) {
  const key = TASK_TO_ENGINE[taskName];
  if (!key) return;
  recordRun(key, { ...payload, taskName });
}

function buildEngineStatus(definition) {
  const entry = stats[definition.key] || {};
  const requirement = requirementState(definition.requires);

  let status = 'untested';
  let message = 'No run recorded yet';

  const totalRuns = Number(entry.runs || 0);
  const totalLeads = Number(entry.totalLeadsProduced || 0);
  const yieldPerRun = totalRuns > 0 ? Number((totalLeads / totalRuns).toFixed(2)) : 0;
  const zeroRunStreak = Number(entry.zeroRunStreak !== undefined ? entry.zeroRunStreak : (entry.lastCount === 0 ? (entry.runs || 0) : 0));

  if (definition.paused) {
    status = 'paused';
    message = definition.pauseReason || 'Paused';
  } else if (!requirement.ok) {
    status = 'error';
    message = `Missing: ${requirement.missing.join(', ')}`;
  } else if (entry.lastError && Number(entry.consecutiveFailures || 0) >= 3) {
    status = 'error';
    message = entry.lastError;
  } else if (zeroRunStreak >= 3 && totalRuns >= 3 && definition.group !== 'api' && !definition.utility) {
    status = 'stalled';
    const lastLeadInfo = entry.lastNonZeroAt ? ` (last yield: ${entry.lastNonZeroCount ?? 0} leads)` : ' (never yielded)';
    message = `Stalled: 0 leads across last ${zeroRunStreak} runs${lastLeadInfo}`;
  } else if (entry.lastSuccessAt) {
    if (entry.lastCount === 0) {
      status = 'empty';
      const note = String(entry.lastNote || '').trim();
      message = note && !/0 rows/i.test(note)
        ? `Last run returned 0 rows · ${note}`
        : (note || 'Last run returned 0 rows');
    } else {
      status = 'online';
      message = entry.lastCount == null ? 'Last run OK' : `Last run returned ${entry.lastCount} rows`;
    }
  } else if (definition.requires.length === 0) {
    status = 'online';
    message = 'Ready (no external key required)';
  }

  return {
    key: definition.key,
    label: definition.label,
    kind: definition.kind,
    group: definition.group,
    detail: definition.detail,
    requires: definition.requires,
    missing: requirement.missing,
    status,
    message,
    paused: Boolean(definition.paused),
    runs: Number(entry.runs || 0),
    failures: Number(entry.failures || 0),
    consecutiveFailures: Number(entry.consecutiveFailures || 0),
    lastRunAt: entry.lastRunAt || null,
    lastSuccessAt: entry.lastSuccessAt || null,
    lastErrorAt: entry.lastErrorAt || null,
    lastDurationMs: entry.lastDurationMs ?? null,
    lastCount: entry.lastCount ?? null,
    yieldPerRun,
    totalLeadsProduced: totalLeads,
    runsSinceLastLead: Number(entry.runsSinceLastLead || 0),
    zeroRunStreak,
    lastNonZeroAt: entry.lastNonZeroAt || null,
    lastNonZeroCount: entry.lastNonZeroCount ?? null
  };
}

function getStatus() {
  const engines = ENGINES.map(buildEngineStatus);
  const summary = {
    total: engines.length,
    online: engines.filter(e => e.status === 'online').length,
    stalled: engines.filter(e => e.status === 'stalled').length,
    empty: engines.filter(e => e.status === 'empty').length,
    error: engines.filter(e => e.status === 'error').length,
    paused: engines.filter(e => e.status === 'paused').length,
    untested: engines.filter(e => e.status === 'untested').length
  };

  let memory = null;
  try {
    const freeMb = Math.round(os.freemem() / 1048576);
    memory = {
      freeMb,
      totalMb: Math.round(os.totalmem() / 1048576),
      machineBudget: Math.max(2, Math.min(6, Math.floor(freeMb / 320)))
    };
  } catch (err) {
    memory = null;
  }

  return {
    checkedAt: new Date().toISOString(),
    summary,
    memory,
    engines
  };
}

function resetEngine(key) {
  if (key) delete stats[key];
  else stats = {};
  saveSoon();
}

load();

module.exports = {
  ENGINES,
  TASK_TO_ENGINE,
  recordRun,
  recordTask,
  getStatus,
  resetEngine,
  flushNow,
  healthFile: HEALTH_FILE
};
