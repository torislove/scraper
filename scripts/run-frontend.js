#!/usr/bin/env node
'use strict';

/**
 * Smart frontend launcher for `client` (:5173) and `master` (:5174).
 *
 * Ensures:
 *  1. Stale processes holding the target frontend port are freed automatically.
 *  2. The backend engine (:5002) is auto-started and healthy BEFORE Vite starts,
 *     or reused cleanly if already running/booting.
 *  3. Shutting down cleans up Vite and any backend it auto-started (unless the
 *     companion frontend is still active).
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { freePorts, isPortListening } = require('./free-port');

const ROOT = path.resolve(__dirname, '..');
const LOCK_FILE = path.join(ROOT, 'server', 'data', '.store.lock');
const TARGETS = {
  client: { port: 5173, otherPort: 5174, label: 'Client Scraper' },
  master: { port: 5174, otherPort: 5173, label: 'Master Scraper (11 Countries)' },
  admin: { port: 5175, otherPort: 5173, label: 'Admin Panel' }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e && e.code === 'EPERM';
  }
}

function isBackendLockPidAlive() {
  try {
    if (!fs.existsSync(LOCK_FILE)) return false;
    const raw = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
    const pid = Number(raw && raw.pid) || 0;
    return isPidAlive(pid);
  } catch (e) {
    return false;
  }
}

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

async function waitForHealth(timeoutMs = 35000, isStopping = () => false) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (isStopping()) return false;
    if (await checkHealth()) return true;
    await wait(400);
  }
  return false;
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
      /* process already exited */
    }
  }
  try {
    child.kill('SIGTERM');
  } catch (e) {}
}

async function main() {
  const target = String(process.argv[2] || '').trim().toLowerCase();
  const extraArgs = process.argv.slice(3);
  const spec = TARGETS[target];

  if (!spec) {
    console.error('Usage: node scripts/run-frontend.js <client|master> [vite-args...]');
    process.exit(1);
  }

  let viteChild = null;
  let serverChild = null;
  let startedServer = false;
  let shuttingDown = false;

  const shutdown = async (signal, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    killChildTree(viteChild);

    if (startedServer && serverChild && serverChild.exitCode === null) {
      const otherActive = await isPortListening(spec.otherPort, 250).catch(() => false);
      if (!otherActive) {
        killChildTree(serverChild);
      } else {
        console.log(`[launcher] Keeping Backend Engine alive for companion console on port ${spec.otherPort}.`);
      }
    }

    if (signal && signal !== 'VITE_EXIT') {
      console.log(`\n[launcher] Stopped ${spec.label}.`);
    }
    process.exit(exitCode);
  };

  process.on('SIGINT', () => { void shutdown('SIGINT', 0); });
  process.on('SIGTERM', () => { void shutdown('SIGTERM', 0); });
  if (process.platform === 'win32') {
    process.on('SIGBREAK', () => { void shutdown('SIGBREAK', 0); });
  }

  // 1. Free only our own frontend port so stale listeners never block Vite.
  await freePorts([spec.port]);
  if (shuttingDown) return;

  // 2. Ensure the backend engine (:5002) is running and healthy before Vite starts.
  const backendHealthy = await checkHealth();
  const backendListening = backendHealthy || await isPortListening(5002, 250);
  const backendBooting = !backendListening && isBackendLockPidAlive();

  if (backendHealthy) {
    console.log('[launcher] Connected to running Backend Engine on http://localhost:5002');
  } else if (backendListening || backendBooting) {
    console.log('[launcher] Backend Engine is starting on http://localhost:5002 — waiting for ready signal...');
    const up = await waitForHealth(35000, () => shuttingDown);
    if (shuttingDown) return;
    if (up) {
      console.log('[launcher] Connected to running Backend Engine on http://localhost:5002');
    } else {
      console.warn('[launcher] Backend health check timed out after 35s; starting frontend anyway...');
    }
  } else {
    await freePorts([5002]);
    if (shuttingDown) return;

    console.log('[launcher] Auto-starting Backend Engine on http://localhost:5002 ...');
    startedServer = true;
    serverChild = spawn(process.execPath, ['--max-old-space-size=4096', 'index.js'], {
      cwd: path.join(ROOT, 'server'),
      stdio: 'inherit',
      shell: false,
      windowsHide: true,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    serverChild.on('exit', (code) => {
      if (shuttingDown) return;
      if (code !== 0) {
        console.warn(`[launcher] Backend Engine exited unexpectedly with code ${code}.`);
      }
    });

    const up = await waitForHealth(35000, () => shuttingDown);
    if (shuttingDown) return;
    if (up) {
      console.log('[launcher] Connected to Backend Engine on http://localhost:5002');
    } else {
      console.warn('[launcher] Backend health check timed out after 35s; starting frontend anyway...');
    }
  }

  // 3. Launch Vite directly via Node (no cmd.exe shell wrapper).
  const viteBin = path.join(ROOT, target, 'node_modules', 'vite', 'bin', 'vite.js');
  console.log(`[launcher] Starting ${spec.label} on http://localhost:${spec.port} ...`);
  viteChild = spawn(process.execPath, [viteBin, ...extraArgs], {
    cwd: path.join(ROOT, target),
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  viteChild.on('exit', (code) => {
    void shutdown('VITE_EXIT', typeof code === 'number' ? code : 0);
  });
}

main().catch((err) => {
  console.error('[launcher] Failed to start:', err);
  process.exit(1);
});
