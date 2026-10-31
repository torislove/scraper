/**
 * measure-run.js
 *
 * Fires one real client search at the local engine and measures how long it
 * takes to surface leads. Prints a compact report so throughput changes can be
 * compared honestly instead of guessed.
 *
 * Usage:
 *   node scripts/measure-run.js "computer dealers in guntur"
 *   node scripts/measure-run.js "plumbers in tenali" --radius 5 --seconds 420
 */

const BASE = process.env.SCRAPER_ENGINE || 'http://127.0.0.1:5002';

const args = process.argv.slice(2);
const query = args.find(a => !a.startsWith('--')) || 'computer dealers in guntur';
const flag = (name, fallback) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
};

const radius = Number(flag('radius', 5));
const maxSeconds = Number(flag('seconds', 420));
const target = Number(flag('target', 0)); // stop early once this many leads land

const sessionId = `measure_${Date.now().toString(36)}`;
const headers = {
  'Content-Type': 'application/json',
  'x-user-id': 'anonymous',
  'x-workspace-scope': 'client'
};

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function leadCount(vendors, id) {
  return vendors.filter(v =>
    v.sessionId === id ||
    v.lastSessionId === id ||
    (Array.isArray(v.sessionIds) && v.sessionIds.includes(id))
  ).length;
}

(async () => {
  console.log(`[measure] "${query}" radius=${radius}km session=${sessionId}`);
  const started = Date.now();

  const startRes = await fetch(`${BASE}/api/scrape/omni`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      sessionId,
      radius,
      gridDensity: 'standard',
      enabledEngines: ['auto']
    })
  });
  const startBody = await startRes.text();
  if (!startRes.ok) {
    console.error(`[measure] start failed ${startRes.status}: ${startBody.slice(0, 400)}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[measure] accepted in ${Date.now() - started}ms`);

  let firstLeadAt = 0;
  let peak = 0;
  let stableTicks = 0;
  const marks = [];
  let finished = false;
  let status = 'running';

  while (!finished && Date.now() - started < maxSeconds * 1000) {
    await sleep(2000);
    let jobs = [];
    let vendors = [];
    try {
      [jobs, vendors] = await Promise.all([getJson('/api/scrape/jobs'), getJson('/api/vendors')]);
    } catch (error) {
      console.warn(`[measure] poll error: ${error.message}`);
      continue;
    }

    const count = leadCount(vendors, sessionId);
    if (count > 0 && !firstLeadAt) {
      firstLeadAt = Date.now() - started;
      console.log(`[measure] first lead at ${(firstLeadAt / 1000).toFixed(1)}s`);
    }
    if (count !== peak) {
      stableTicks = 0;
      peak = count;
      marks.push({ t: Date.now() - started, leads: count });
    } else {
      stableTicks += 1;
    }

    const job = jobs.find(j => j.id === sessionId);
    status = job?.status || 'unknown';
    const active = Boolean(job?.sessionActive);

    if (target > 0 && count >= target) {
      finished = true;
      status = `${status} (target ${target} reached)`;
    } else if (!active && status !== 'unknown' && stableTicks >= 1) {
      finished = true;
    }
  }

  const seconds = (Date.now() - started) / 1000;
  const vendors = await getJson('/api/vendors');
  const leads = leadCount(vendors, sessionId);

  console.log('');
  console.log('──────────────── RUN REPORT ────────────────');
  console.log(`query        : ${query}`);
  console.log(`status       : ${finished ? status : 'timed out'}`);
  console.log(`duration     : ${seconds.toFixed(1)}s`);
  console.log(`leads        : ${leads}`);
  console.log(`throughput   : ${(leads / seconds).toFixed(2)} leads/s`);
  console.log(`first lead   : ${firstLeadAt ? `${(firstLeadAt / 1000).toFixed(1)}s` : 'none'}`);
  console.log(`10th lead    : ${(marks.find(m => m.leads >= 10)?.t / 1000 || 0).toFixed(1)}s`);
  console.log(`50th lead    : ${(marks.find(m => m.leads >= 50)?.t / 1000 || 0).toFixed(1)}s`);
  console.log('────────────────────────────────────────────');

  try {
    const logs = await getJson('/api/logs');
    const relevant = (Array.isArray(logs) ? logs : [])
      .filter(line => /zone|engine|phase|completed|orchestrator|deep/i.test(String(line?.message || line)))
      .slice(-18);
    console.log('\nrecent engine log:');
    for (const line of relevant) {
      console.log('  ' + String(line?.message || line).slice(0, 180));
    }
  } catch (error) {
    console.warn('[measure] log fetch skipped:', error.message);
  }
})().catch(error => {
  console.error('[measure] failed:', error.message);
  process.exitCode = 1;
});
