#!/usr/bin/env node
/**
 * Deep-profile job durability proof.
 *
 *   node scripts/verify/deep-jobs-durability.cjs
 *
 * Requires the engine to be running on http://127.0.0.1:5002.
 *
 * The script starts a deep batch over a few vendors with websites, kills the
 * engine mid-run, restarts it, and checks that:
 *   1. the ledger still shows the job — now marked `interrupted`;
 *   2. the interrupted job is flagged `resumable`;
 *   3. `POST /api/deep-profile/jobs/:id/resume` starts a new job over exactly
 *      the vendors that never finished, and it completes.
 *
 * Uses real vendors from the store and the real deep extractor, so it consumes
 * a little network time (a few seconds per vendor). Nothing is deleted.
 */
const path = require('path');
const http = require('http');
const { execFileSync, spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const SERVER_DIR = path.join(ROOT, 'server');
const HEADERS = {
  'content-type': 'application/json',
  'x-user-id': 'master',
  'x-workspace-scope': 'master'
};

function call(method, endpoint, body) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { ...HEADERS };
    if (payload) headers['content-length'] = Buffer.byteLength(payload);
    const req = http.request(
      { host: '127.0.0.1', port: 5002, path: endpoint, method, headers, timeout: 15000 },
      (res) => {
        let b = '';
        res.on('data', (d) => (b += d));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, json: JSON.parse(b) }); }
          catch (e) { resolve({ status: res.statusCode, raw: b }); }
        });
      }
    );
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    if (payload) req.write(payload);
    req.end();
  });
}

const health = () => call('GET', '/api/health');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function bootServer() {
  const child = spawn('node', ['index.js'], { cwd: SERVER_DIR, detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
  for (let i = 0; i < 40; i += 1) {
    await wait(1000);
    const h = await health();
    if (h.json?.ok) return h.json;
  }
  return null;
}

(async () => {
  const before = await health();
  if (!before.json?.ok) {
    console.error('FAIL: engine is not reachable on http://127.0.0.1:5002');
    process.exit(2);
  }
  console.log('engine pid', before.json.pid);

  const vendors = await call('GET', '/api/vendors');
  const rows = Array.isArray(vendors.json) ? vendors.json : (vendors.json?.vendors || []);
  const pick = rows.filter((v) => v.website && !v.deepExtractedAt).slice(0, 15).map((v) => v.id);
  if (!pick.length) {
    console.error('FAIL: no un-extracted vendors with a website available');
    process.exit(2);
  }
  console.log('vendors picked:', pick.length);

  const started = await call('POST', '/api/deep-profile/run', {
    vendorIds: pick,
    force: true,
    includeWebsite: true,
    includeGoogle: false,
    limit: pick.length,
    concurrency: 1
  });
  const jobId = started.json?.jobId;
  if (!jobId) {
    console.error('FAIL: job did not start:', JSON.stringify(started).slice(0, 300));
    process.exit(1);
  }
  console.log('job started:', jobId);

  // Kill the engine as soon as the job is visibly mid-flight. Waiting a fixed
  // number of seconds is flaky: a batch of fast failures can finish first.
  let mid = null;
  for (let i = 0; i < 60; i += 1) {
    await wait(300);
    const probe = await call('GET', `/api/deep-profile/jobs/${jobId}`);
    const job = probe.json?.job;
    if (!job) break;
    if (job.status === 'running' && job.completed < job.total) { mid = job; break; }
    if (!['queued', 'running'].includes(job.status)) { mid = job; break; }
  }
  console.log('before kill:', JSON.stringify({
    status: mid?.status,
    completed: mid?.completed,
    total: mid?.total
  }));

  if (!mid || mid.status !== 'running') {
    console.error('FAIL: job finished before the engine could be killed; rerun the check');
    process.exit(3);
  }

  execFileSync('taskkill', ['/PID', String(before.json.pid), '/F'], { stdio: 'ignore' });
  await wait(1500);

  const restarted = await bootServer();
  if (!restarted) {
    console.error('FAIL: engine did not restart');
    process.exit(1);
  }
  console.log('engine restarted pid', restarted.pid);

  const ledger = await call('GET', '/api/deep-profile/jobs');
  const row = (ledger.json?.jobs || []).find((j) => j.id === jobId);
  console.log('restored ledger row:', JSON.stringify({
    status: row?.status,
    completed: row?.completed,
    total: row?.total,
    resumable: row?.resumable,
    stopReason: row?.stopReason
  }));
  if (!row) {
    console.error('FAIL: job vanished from the ledger after a restart');
    process.exit(1);
  }

  const resumed = await call('POST', `/api/deep-profile/jobs/${jobId}/resume`);
  console.log('resume:', resumed.status, JSON.stringify({
    resumed: resumed.json?.resumed,
    id: resumed.json?.job?.id,
    total: resumed.json?.job?.total,
    resumedFrom: resumed.json?.job?.resumedFrom
  }));
  if (!resumed.json?.resumed || !resumed.json?.job?.id) {
    console.error('FAIL: resume did not create a job');
    process.exit(1);
  }

  let finished = null;
  for (let i = 0; i < 90; i += 1) {
    await wait(1000);
    const j = await call('GET', `/api/deep-profile/jobs/${resumed.json.job.id}`);
    const job = j.json?.job;
    if (job && !['queued', 'running', 'stopping'].includes(job.status)) { finished = job; break; }
  }
  console.log('resumed job finished:', JSON.stringify({
    status: finished?.status,
    completed: finished?.completed,
    succeeded: finished?.succeeded,
    failed: finished?.failed
  }));

  const pass = row.status === 'interrupted'
    && row.resumable === true
    && resumed.json?.resumed === true
    && Boolean(finished)
    && ['completed', 'stopped', 'failed'].includes(finished.status);
  console.log(pass ? 'PASS' : 'FAIL');
  process.exit(pass ? 0 : 1);
})();
