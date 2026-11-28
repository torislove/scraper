const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
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

const os = require('os');
const UV_POOL = String(Math.min(16, Math.max(4, (os.cpus()?.length || 4))));

function startNode(name, cwd, args, autoRestart = true, portToEnsure = null) {
  const launch = async () => {
    if (shuttingDown) return null;
    if (portToEnsure) {
      try { await freePorts([portToEnsure]); } catch (_) {}
    }
    if (shuttingDown) return null;
    const child = spawn(process.execPath, args, {
      cwd,
      stdio: 'inherit',
      shell: false,
      windowsHide: true,
      env: { ...process.env, FORCE_COLOR: '1', UV_THREADPOOL_SIZE: UV_POOL }
    });

    child.on('exit', (code, signal) => {
      if (shuttingDown) return;
      if (signal) {
        console.log(`[${name}] stopped with signal ${signal}`);
      } else if (code !== 0) {
        console.log(`[${name}] exited with code ${code}`);
      }
      if (autoRestart && !shuttingDown) {
        setTimeout(async () => {
          if (shuttingDown) return;
          if (portToEnsure && (await isPortListening(portToEnsure, 300).catch(() => false))) {
            console.log(`[dev.js] Port ${portToEnsure} (${name}) is now handled by another dev process; yielding gracefully.`);
            return;
          }
          console.log(`[dev.js] Restarting ${name}...`);
          launch();
        }, 1200);
      }
    });

    children.push(child);
    return child;
  };
  return launch();
}

let sidecarChild = null;
function startPythonTlsSidecar() {
  const scriptPath = path.join(root, 'server', 'python', 'tls_engine.py');
  if (!fs.existsSync(scriptPath)) return;
  const trySpawn = (cmd, baseArgs, fallbackCmd = null) => {
    if (shuttingDown) return;
    const child = spawn(cmd, [...baseArgs, scriptPath, '5003'], {
      cwd: root,
      stdio: 'inherit',
      shell: false,
      windowsHide: true
    });
    sidecarChild = child;
    child.on('error', () => {
      if (fallbackCmd && !shuttingDown) {
        trySpawn(fallbackCmd.cmd, fallbackCmd.args, null);
      } else {
        console.warn('[dev.js] Python TLS Sidecar not started (python executable not found). Using Node HTTP fallback.');
      }
    });
    child.on('exit', (code) => {
      if (sidecarChild === child) sidecarChild = null;
      if (shuttingDown || code === 0) return;
      console.log(`[tls-sidecar] exited with code ${code}; restarting in 2s...`);
      setTimeout(() => trySpawn(cmd, baseArgs, null), 2000);
    });
    children.push(child);
  };
  const pyCandidates = process.platform === 'win32'
    ? [
        { cmd: path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe'), args: [] },
        { cmd: 'py', args: ['-3.11'] },
        { cmd: 'py', args: ['-3'] },
        { cmd: 'python', args: [] }
      ]
    : [{ cmd: 'python3', args: [] }, { cmd: 'python', args: [] }];

  let chosen = pyCandidates[pyCandidates.length - 1];
  for (const cand of pyCandidates) {
    try {
      if (cand.cmd.includes(path.sep) && !fs.existsSync(cand.cmd)) continue;
      execFileSync(cand.cmd, [...cand.args, '-c', 'import primp, curl_cffi'], { stdio: 'ignore', windowsHide: true, timeout: 4000 });
      chosen = cand;
      break;
    } catch (_) {}
  }
  console.log(`[dev.js] Starting Python TLS Sidecar via ${chosen.cmd} ${chosen.args.join(' ')}`);
  trySpawn(chosen.cmd, chosen.args, { cmd: 'python', args: [] });
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
  const skipAdmin = process.argv.includes('--no-admin');
  const ports = [5002, 5003, 5173];
  if (!skipMaster) ports.push(5174);
  if (!skipAdmin) ports.push(5175);

  await freePorts(ports);
  if (shuttingDown) return;

  console.log('[dev.js] Starting Python TLS Sidecar on http://127.0.0.1:5003 ...');
  startPythonTlsSidecar();

  const totalRamGb = os.totalmem() / (1024 * 1024 * 1024);
  const safeHeapMb = totalRamGb <= 4.5 ? 768 : (totalRamGb <= 10.5 ? 1536 : (totalRamGb <= 22 ? 2048 : 2560));
  console.log(`[dev.js] Starting Backend Engine on http://localhost:5002 (V8 Heap Cap: ${safeHeapMb}MB, OS RAM: ${totalRamGb.toFixed(1)}GB) ...`);
  startNode('server', path.join(root, 'server'), ['--expose-gc', `--max-old-space-size=${safeHeapMb}`, 'index.js'], true, 5002);

  const backendUp = await waitForHealth(35000);
  if (shuttingDown) return;
  if (!backendUp) {
    console.warn('[dev.js] Backend health check timed out after 35s; starting frontends anyway...');
  }

  const clientVite = path.join(root, 'client', 'node_modules', 'vite', 'bin', 'vite.js');
  const masterVite = path.join(root, 'master', 'node_modules', 'vite', 'bin', 'vite.js');
  const adminVite = path.join(root, 'admin', 'node_modules', 'vite', 'bin', 'vite.js');

  console.log('[dev.js] Starting Client Scraper on http://localhost:5173 ...');
  startNode('client', path.join(root, 'client'), [clientVite], true, 5173);

  if (!skipMaster) {
    console.log('[dev.js] Starting Master Scraper (11 Countries) on http://localhost:5174 ...');
    startNode('master', path.join(root, 'master'), [masterVite], true, 5174);
  }

  if (!skipAdmin) {
    console.log('[dev.js] Starting Admin Panel on http://localhost:5175 ...');
    startNode('admin', path.join(root, 'admin'), [adminVite], true, 5175);
  }

  await waitForPort(5173, 20000);
  if (!skipMaster) await waitForPort(5174, 20000);
  if (!skipAdmin) await waitForPort(5175, 20000);
  if (shuttingDown) return;

  // Watchdog: keep Python TLS Sidecar (:5003) alive if it ever freezes under heavy concurrency
  let sidecarMisses = 0;
  setInterval(async () => {
    if (shuttingDown) return;
    const healthy = await checkHealth('http://127.0.0.1:5003/health', 2500);
    if (healthy) {
      sidecarMisses = 0;
      return;
    }
    sidecarMisses += 1;
    if (sidecarMisses >= 2) {
      sidecarMisses = 0;
      console.warn('[dev.js] TLS Sidecar :5003 unresponsive; cleanly recycling process...');
      if (sidecarChild) killChildTree(sidecarChild);
      try { await freePorts([5003]); } catch (_) {}
      if (!shuttingDown) startPythonTlsSidecar();
    }
  }, 15000).unref();

  console.log('');
  console.log('┌──────────────────────────────────────────────────────────┐');
  console.log('│  Scraper.co.in — All Services Connected & Ready          │');
  console.log('├──────────────────────────────────────────────────────────┤');
  console.log('│  Backend Engine : http://localhost:5002/api/health       │');
  console.log('│  TLS Sidecar    : http://127.0.0.1:5003/health           │');
  console.log('│  Client Scraper : http://localhost:5173/command          │');
  if (!skipMaster) {
    console.log('│  Master Scraper : http://localhost:5174/command (11 Ctr) │');
  }
  if (!skipAdmin) {
    console.log('│  Admin Panel    : http://localhost:5175/                 │');
  }
  console.log('│  Press Ctrl+C to cleanly stop all processes.             │');
  console.log('└──────────────────────────────────────────────────────────┘');
  console.log('');
}

main().catch((err) => {
  console.error('[dev.js] Launcher error:', err);
  shutdown('ERROR');
});
