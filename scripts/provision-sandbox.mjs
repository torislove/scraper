#!/usr/bin/env node

/**
 * scripts/provision-sandbox.mjs
 * Render, start, or tear down isolated Client + Master user sandboxes
 * cleanly in Docker Compose or Kubernetes.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const action = args[0] && !args[0].startsWith('--') ? args[0] : 'render';
const flag = (name, fallback = '') => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
};

const rawUser = flag('user', 'demo');
const userId = rawUser.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'demo';
const mode = flag('mode', 'k8s').toLowerCase();
const domainSuffix = flag('domain', 'sandbox.scraper.co.in');
const clientPort = flag('client-port', '8101');
const masterPort = flag('master-port', '8201');
const templatePath = path.resolve(__dirname, '../k8s/sandboxes/sandbox-template.yaml');

function renderK8sManifest() {
  const raw = fs.readFileSync(templatePath, 'utf8');
  return raw
    .replaceAll('__SANDBOX_ID__', userId)
    .replaceAll('__DOMAIN_SUFFIX__', domainSuffix)
    .replaceAll('__SESSION_SECRET__', crypto.randomBytes(24).toString('hex'))
    .replaceAll('__MASTER_KEY__', crypto.randomBytes(16).toString('hex'));
}

if (mode === 'k8s') {
  if (action === 'render') {
    const rendered = renderK8sManifest();
    const outDir = path.resolve(__dirname, '../k8s/sandboxes/rendered');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, `${userId}-sandbox.yaml`), rendered, 'utf8');
    process.stdout.write(rendered);
  } else if (action === 'up') {
    const yaml = renderK8sManifest();
    execFileSync('kubectl', ['apply', '-f', '-'], { input: yaml, stdio: ['pipe', 'inherit', 'inherit'] });
    console.log(`[sandbox] Provisioned K8s sandbox: namespace=sandbox-${userId} client=https://client-${userId}.${domainSuffix} master=https://master-${userId}.${domainSuffix}`);
  } else if (action === 'down') {
    execFileSync('kubectl', ['delete', 'namespace', `sandbox-${userId}`, '--ignore-not-found=true'], { stdio: 'inherit' });
    console.log(`[sandbox] Deleted K8s sandbox namespace: sandbox-${userId}`);
  } else {
    console.error('Usage: node scripts/provision-sandbox.mjs <render|up|down> --user <id> --mode k8s|docker');
    process.exit(1);
  }
} else if (mode === 'docker') {
  const composeFile = path.resolve(__dirname, '../docker-compose.sandbox.yaml');
  const env = { ...process.env, SANDBOX_ID: userId, CLIENT_PORT: clientPort, MASTER_PORT: masterPort };
  if (action === 'up') {
    execFileSync('docker', ['compose', '-f', composeFile, '-p', `sandbox_${userId}`, 'up', '-d', '--build'], { env, stdio: 'inherit' });
    console.log(`[sandbox] Docker sandbox running: Client=http://localhost:${clientPort} Master=http://localhost:${masterPort}`);
  } else if (action === 'down') {
    execFileSync('docker', ['compose', '-f', composeFile, '-p', `sandbox_${userId}`, 'down', '-v'], { env, stdio: 'inherit' });
  } else {
    execFileSync('docker', ['compose', '-f', composeFile, '-p', `sandbox_${userId}`, 'config'], { env, stdio: 'inherit' });
  }
}
