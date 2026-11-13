#!/usr/bin/env node
/**
 * Live check that the scope engine plan is what actually runs.
 *
 * Launches a real Master mandal sweep, watches it to completion, and asserts:
 *   - the run finishes and writes leads
 *   - the log carries the "[Scope Engines] mandal plan" line
 *   - no JustDial swarm is queued for a mandal sweep
 *
 * Run: node scripts/verify/scope-engines-live.cjs [mandal] [category]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const MANDAL = process.argv[2] || 'Tenali';
const CATEGORY = process.argv[3] || 'Electricians';
const EXISTING = process.argv.includes('--existing');
const HOST = '127.0.0.1';
const PORT = 5002;

function call(method, path, body) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'x-user-id': 'master', 'x-workspace-scope': 'master' };
    if (payload) { headers['content-type'] = 'application/json'; headers['content-length'] = Buffer.byteLength(payload); }
    const req = http.request({ host: HOST, port: PORT, path, method, headers, timeout: 60000 }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (text += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(text) }); }
        catch (e) { resolve({ status: res.statusCode, raw: text }); }
      });
    });
    req.on('error', (error) => resolve({ status: 0, error: error.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    if (payload) req.write(payload);
    req.end();
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sleepers = {};

(async () => {
  const sessionId = `verify_scope_${Date.now().toString(36)}`;
  if (EXISTING) {
    console.log('--existing: skipping the launch, checking the last run in the log only');
  } else {
    const launch = await call('POST', '/api/scrape/master-sweep', {
      category: CATEGORY,
      scope: 'mandal',
      name: MANDAL,
      sessionId
    });
    console.log('launch:', launch.status, JSON.stringify(launch.json || launch).slice(0, 260));
    if (launch.status !== 200) process.exit(1);
  }

  let last = null;
  let done = EXISTING;
  if (!EXISTING) {
    for (let i = 0; i < 90; i += 1) {
      await wait(6000);
      const list = await call('GET', '/api/sessions/list');
      const rows = Array.isArray(list.json) ? list.json : (list.json?.sessions || []);
      const session = rows.find((row) => row.id === sessionId);
      if (!session) { console.log('session not visible yet'); continue; }
      last = session;
      const zones = `${session.metadata?.completedZones || 0}/${session.metadata?.totalZones || 0}`;
      console.log(`  ${session.status} | leads ${session.leadCount} | zones ${zones}`);
      if (!['queued', 'running', 'paused'].includes(session.status)) { done = true; break; }
    }
  }

  // /api/logs is a rolling buffer, and the plan line is written before the
  // first lead arrives — a long sweep can push it out. Fall back to the engine's
  // own stdout log so the check is about behaviour, not about buffer size.
  const logs = await call('GET', '/api/logs?limit=5000');
  const entries = Array.isArray(logs.json) ? logs.json : (logs.json?.logs || []);
  let text = entries.map((entry) => (typeof entry === 'string' ? entry : entry.message || '')).join('\n');
  if (!/\[Scope Engines\]/.test(text)) {
    try { text += `\n${fs.readFileSync(path.join(__dirname, '..', '..', 'server-out.log'), 'utf8').slice(-400000)}`; } catch (e) {}
  }
  const planLine = (text.match(/\[Scope Engines\][^\n]*/g) || []).filter((line) => line.includes('mandal'));
  const swarmLine = (text.match(/Swarming JustDial[^\n]*/g) || []);
  const queuedJustDial = (text.match(/Queued simultaneous directory engine: scrapeJustDial/g) || []).length;

  console.log('\nscope engine log:');
  for (const line of planLine.slice(-3)) console.log(' ', line.trim());
  console.log('justdial swarm lines:', swarmLine.length, '| queued justdial jobs:', queuedJustDial);

  let failures = 0;
  if (!done) { console.log('FAIL: sweep did not finish in time'); failures += 1; }
  if (last && !(last.leadCount > 0)) { console.log('FAIL: sweep produced no leads'); failures += 1; }
  if (!planLine.length) { console.log('FAIL: no mandal scope-engine plan line in the log'); failures += 1; }
  if (queuedJustDial > 0) { console.log('FAIL: a mandal sweep queued a JustDial swarm'); failures += 1; }

  console.log(failures === 0 ? '\nPASS' : `\nFAIL (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
})();
