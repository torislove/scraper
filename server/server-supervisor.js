// server/server-supervisor.js
// Resilient keep-alive supervisor for LeadHarvest backend engine
const { spawn } = require('child_process');
const path = require('path');

let child = null;
let restarts = 0;
let shuttingDown = false;

function launch() {
  if (shuttingDown) return;
  console.log(`[Supervisor] Launching backend server (cycle ${restarts + 1})...`);
  child = spawn(process.execPath, ['index.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.warn(`[Supervisor] Server exited (code: ${code}, signal: ${signal}).`);
    restarts++;
    const backoff = Math.min(3000, 800 * Math.min(restarts, 4));
    console.log(`[Supervisor] Auto-recovering backend in ${backoff}ms...`);
    setTimeout(launch, backoff);
  });
}

function handleSignal(sig) {
  shuttingDown = true;
  console.log(`[Supervisor] Received ${sig}, terminating child process...`);
  if (child) {
    child.kill(sig);
  }
  process.exit(0);
}

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));

launch();

