#!/usr/bin/env node
'use strict';

/**
 * Safely releases stale processes holding local development ports (5002, 5173, 5174).
 *
 * Designed to stay completely silent when a port is already free, and clean up
 * any stale `server/data/.store.lock` left behind after an unclean server exit.
 */

const fs = require('fs');
const net = require('net');
const path = require('path');
const { execFileSync } = require('child_process');

const LOCK_FILE = path.resolve(__dirname, '..', 'server', 'data', '.store.lock');
const FREE_TIMEOUT_MS = 3000;
const POLL_INTERVAL_MS = 100;

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

function cleanupStaleStoreLock() {
  try {
    if (!fs.existsSync(LOCK_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
    const pid = Number(raw && raw.pid) || 0;
    if (!pid || !isPidAlive(pid)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch (e) {
    /* ignore unreadable/concurrent lock */
  }
}

function isPortListening(port, timeoutMs = 250) {
  const probeHost = (host) => new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    let settled = false;
    const finish = (val) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(val);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });

  return Promise.all([probeHost('127.0.0.1'), probeHost('::1')]).then(
    ([v4, v6]) => v4 || v6
  );
}

function findPidsOnPort(port) {
  const pids = new Set();
  const excluded = new Set([0, process.pid, process.ppid].filter(Boolean));

  if (process.platform === 'win32') {
    let out = '';
    try {
      out = execFileSync('netstat', ['-ano'], { encoding: 'utf8', windowsHide: true });
    } catch (e) {
      return [];
    }
    for (const rawLine of out.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line.startsWith('TCP')) continue;
      const cols = line.split(/\s+/);
      if (cols.length < 4) continue;
      const state = String(cols[3] || '').toUpperCase();
      if (state !== 'LISTENING' && state !== 'LISTEN') continue;
      const localAddr = String(cols[1] || '');
      const colonIdx = localAddr.lastIndexOf(':');
      if (colonIdx === -1) continue;
      const linePort = Number(localAddr.slice(colonIdx + 1));
      if (linePort !== port) continue;
      const pid = Number(cols[cols.length - 1]);
      if (Number.isInteger(pid) && !excluded.has(pid)) {
        pids.add(pid);
      }
    }
    return Array.from(pids);
  }

  try {
    const out = execFileSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' });
    for (const token of out.split(/\s+/)) {
      const pid = Number(token.trim());
      if (Number.isInteger(pid) && !excluded.has(pid)) {
        pids.add(pid);
      }
    }
  } catch (e) {
    /* lsof exits 1 when no process matches */
  }
  return Array.from(pids);
}

function terminatePid(pid) {
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  try {
    process.kill(pid, 'SIGTERM');
    return true;
  } catch (e) {
    return false;
  }
}

async function freePort(port) {
  const numPort = Number(port);
  if (!Number.isInteger(numPort) || numPort <= 0 || numPort > 65535) return;

  const pids = findPidsOnPort(numPort);
  const listening = pids.length > 0 || await isPortListening(numPort);

  if (!listening) {
    if (numPort === 5002) cleanupStaleStoreLock();
    return;
  }

  for (const pid of pids) {
    if (terminatePid(pid)) {
      console.log(`[port] Freed stale process (PID ${pid}) on port ${numPort}`);
    }
  }

  const deadline = Date.now() + FREE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const stillHeld = findPidsOnPort(numPort).length > 0 || await isPortListening(numPort);
    if (!stillHeld) {
      if (numPort === 5002) cleanupStaleStoreLock();
      return;
    }
    await wait(POLL_INTERVAL_MS);
  }

  if (numPort === 5002) cleanupStaleStoreLock();
}

async function freePorts(ports = []) {
  for (const port of ports) {
    await freePort(port);
  }
}

if (require.main === module) {
  const ports = process.argv.slice(2).map(Number).filter((p) => Number.isInteger(p) && p > 0);
  if (!ports.length) {
    console.error('Usage: node scripts/free-port.js <port> [port2 ...]');
    process.exit(1);
  }
  freePorts(ports).catch((err) => {
    console.error('[port] Failed to check/free port:', err.message);
    process.exit(1);
  });
}

module.exports = { freePort, freePorts, findPidsOnPort, isPortListening };
