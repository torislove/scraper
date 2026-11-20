const { spawn, execFileSync } = require('child_process');
const http = require('http');
const path = require('path');
const { freePorts, isPortListening } = require('./scripts/free-port');

const root = __dirname;
const children = [];
let shuttingDown = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function checkHealth(url = 'http://127.0.0.1:5002/api/health', timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForHealth(timeoutMs = 35000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (shuttingDown) return false;
    if (await checkHealth()) return true;
    await wait(400);
  }
  return false;
}

async function waitForPort(port, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (shuttingDown) return false;
    if (await isPortListening(port, 300)) return true;
    await wait(300);
  }
  return false;
}

function startNode(name, cwd, args) {
  const child = spawn(process.execPath, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (signal) {
      console.log(`[${name}] stopped with signal ${signal}`);
    } else if (code !== 0) {
      console.log(`[${name}] exited with code ${code}`);
    }
  });

  children.push(child);
  return child;
}

function killChildTree(child) {
  if (!child || child.exitCode !== null || child.killed) return;
  const pid = child.pid;
  if (!pid) return;
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true
      });
      return;
    } catch (e) {
      /* process already gone */
    }
  }
  try {
    child.kill('SIGTERM');
  } catch (e) {}
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[dev.js] Shutting down all services (${signal})...`);
  for (const child of children) {
    killChildTree(child);
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
if (process.platform === 'win32') {
  process.on('SIGBREAK', () => shutdown('SIGBREAK'));
}

async function main() {
  const skipMaster = process.argv.includes('--no-master') || process.argv.includes('--client-only');
  const ports = skipMaster ? [5002, 5173] : [5002, 5173, 5174];

  await freePorts(ports);
  if (shuttingDown) return;

  console.log('[dev.js] Starting Backend Engine on http://localhost:5002 ...');
  startNode('server', path.join(root, 'server'), ['--max-old-space-size=4096', 'index.js']);

  const backendUp = await waitForHealth(35000);
  if (shuttingDown) return;
  if (!backendUp) {
    console.warn('[dev.js] Backend health check timed out after 35s; starting frontends anyway...');
  }

  const clientVite = path.join(root, 'client', 'node_modules', 'vite', 'bin', 'vite.js');
  const masterVite = path.join(root, 'master', 'node_modules', 'vite', 'bin', 'vite.js');

  console.log('[dev.js] Starting Client Console on http://localhost:5173 ...');
  startNode('client', path.join(root, 'client'), [clientVite]);

  if (!skipMaster) {
    console.log('[dev.js] Starting Master Console on http://localhost:5174 ...');
    startNode('master', path.join(root, 'master'), [masterVite]);
  }

  await waitForPort(5173, 20000);
  if (!skipMaster) await waitForPort(5174, 20000);
  if (shuttingDown) return;

  console.log('');
  console.log('┌──────────────────────────────────────────────────────────┐');
  console.log('│  Scraper.co.in — All Services Connected & Ready          │');
  console.log('├──────────────────────────────────────────────────────────┤');
  console.log('│  Backend Engine : http://localhost:5002/api/health       │');
  console.log('│  Client Console : http://localhost:5173/command          │');
  if (!skipMaster) {
    console.log('│  Master Console : http://localhost:5174/command          │');
  }
  console.log('│  Press Ctrl+C to cleanly stop all processes.             │');
  console.log('└──────────────────────────────────────────────────────────┘');
  console.log('');
}

main().catch((err) => {
  console.error('[dev.js] Launcher error:', err);
  shutdown('ERROR');
});
