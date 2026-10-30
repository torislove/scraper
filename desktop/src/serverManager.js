/**
 * Owns the lifecycle of the local engine (server/index.js).
 *
 * The engine is spawned with the Electron binary running in Node mode, so the
 * customer never has to install Node.js. It binds an ephemeral loopback port
 * and announces it on stdout with a `[ready] {...}` line.
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const log = require('electron-log');

function killTree(pid) {
  return new Promise(resolve => {
    if (!pid) return resolve();
    if (process.platform === 'win32') {
      exec(`taskkill /PID ${pid} /T /F`, { windowsHide: true }, () => resolve());
    } else {
      try {
        process.kill(-pid, 'SIGKILL');
      } catch (e) {
        try { process.kill(pid, 'SIGKILL'); } catch (err) { /* gone */ }
      }
      resolve();
    }
  });
}

async function waitForHealth(baseUrl, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/app/info`, { signal: AbortSignal.timeout(2500) });
      if (res.ok) return await res.json();
    } catch (e) {
      /* keep polling */
    }
    await new Promise(r => setTimeout(r, 400));
  }
  return null;
}

function startServer(options) {
  const {
    entry,
    cwd,
    env,
    timeoutMs = 120000,
    onStatus = () => {},
    onExit = () => {}
  } = options;

  if (!fs.existsSync(entry)) {
    return Promise.reject(new Error(`Engine entry not found: ${entry}`));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let ready = null;
    let buffer = '';

    const child = spawn(process.execPath, [entry], {
      cwd,
      env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      killTree(child.pid);
      reject(new Error('The engine did not start in time.'));
    }, timeoutMs);

    function fail(err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      killTree(child.pid);
      reject(err);
    }

    function handleLine(line) {
      const text = line.trim();
      if (!text) return;

      if (text.startsWith('[ready]')) {
        try {
          ready = JSON.parse(text.slice('[ready]'.length).trim());
        } catch (e) {
          ready = null;
        }
        if (ready && !settled) {
          settled = true;
          clearTimeout(timer);
          const baseUrl = `http://127.0.0.1:${ready.port}`;
          log.info('[engine] listening on', baseUrl);
          resolve({ child, port: ready.port, baseUrl, stop: () => stop() });
        }
        return;
      }

      const level = /error|fail|exception/i.test(text) ? 'warn' : 'info';
      log[level]('[engine]', text);
    }

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      lines.forEach(handleLine);
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => {
      const text = String(chunk).trim();
      if (text) log.warn('[engine:err]', text);
    });

    child.on('error', err => fail(err));

    child.on('exit', (code, signal) => {
      log.warn('[engine] exited', { code, signal });
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(new Error(`The engine stopped during startup (code ${code}).`));
      } else {
        onExit({ code, signal });
      }
    });

    async function stop() {
      if (!child || child.exitCode !== null) return;
      try { child.kill(); } catch (e) { /* already gone */ }
      await new Promise(r => setTimeout(r, 1200));
      if (child.exitCode === null) await killTree(child.pid);
    }

    onStatus('Starting engine…');
  });
}

async function bootEngine(opts) {
  const handle = await startServer(opts);
  const info = await waitForHealth(handle.baseUrl);
  if (!info) {
    await handle.stop();
    throw new Error('The engine started but did not respond to health checks.');
  }
  return { ...handle, info };
}

module.exports = { startServer, bootEngine, waitForHealth, killTree };
