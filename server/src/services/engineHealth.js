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
    detail: 'Organic result pages for dealer queries'
  },
  {
    key: 'justdial',
    label: 'JustDial',
    kind: 'browser',
    group: 'directory',
    taskNames: ['scrapeJustDial'],
    requires: ['playwright'],
    detail: 'City-indexed business directory'
  },
  {
    key: 'indiamart',
    label: 'IndiaMART',
    kind: 'browser',
    group: 'directory',
    taskNames: ['scrapePuppeteerIndiaMart'],
    requires: ['playwright'],
    detail: 'City-indexed B2B supplier marketplace'
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
  {
    key: 'deepseek',
    label: 'NVIDIA DeepSeek AI',
    kind: 'api',
    group: 'ai',
    taskNames: ['scrapeDeepseekAI'],
    requires: ['NVIDIA_API_KEY'],
    detail: 'AI extraction and enrichment layer'
  },
  {
    key: 'scrapy',
    label: 'Scrapy Spider',
    kind: 'python',
    group: 'web',
    taskNames: ['scrapeScrapySpider'],
    requires: [],
    detail: 'Python spider for deep site crawls'
  },
  {
    key: 'ola-maps',
    label: 'OLA Maps Geocoder',
    kind: 'api',
    group: 'api',
    taskNames: [],
    requires: ['OLA_MAPS_API_KEY'],
    detail: 'Offline-first gazetteer fallback geocoding'
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

function saveSoon() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(HEALTH_FILE), { recursive: true });
      fs.writeFileSync(
        HEALTH_FILE,
        JSON.stringify({ updatedAt: new Date().toISOString(), engines: stats }, null, 2)
      );
    } catch (err) {
      /* health must never break a sweep */
    }
  }, WRITE_DEBOUNCE_MS);
  if (typeof writeTimer.unref === 'function') writeTimer.unref();
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
function recordRun(key, { ok = true, error = '', ms = 0, count = null, taskName = '' } = {}) {
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
  } else {
    entry.failures = Number(entry.failures || 0) + 1;
    entry.consecutiveFailures = Number(entry.consecutiveFailures || 0) + 1;
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

  if (!requirement.ok) {
    status = 'error';
    message = `Missing: ${requirement.missing.join(', ')}`;
  } else if (entry.lastError) {
    status = 'error';
    message = entry.lastError;
  } else if (entry.lastSuccessAt) {
    if (entry.lastCount === 0) {
      status = 'empty';
      message = 'Last run returned 0 rows';
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
    runs: Number(entry.runs || 0),
    failures: Number(entry.failures || 0),
    consecutiveFailures: Number(entry.consecutiveFailures || 0),
    lastRunAt: entry.lastRunAt || null,
    lastSuccessAt: entry.lastSuccessAt || null,
    lastErrorAt: entry.lastErrorAt || null,
    lastDurationMs: entry.lastDurationMs ?? null,
    lastCount: entry.lastCount ?? null
  };
}

function getStatus() {
  const engines = ENGINES.map(buildEngineStatus);
  const summary = {
    total: engines.length,
    online: engines.filter(e => e.status === 'online').length,
    empty: engines.filter(e => e.status === 'empty').length,
    error: engines.filter(e => e.status === 'error').length,
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
  healthFile: HEALTH_FILE
};
