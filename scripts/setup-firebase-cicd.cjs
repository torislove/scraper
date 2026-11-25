#!/usr/bin/env node
'use strict';

/**
 * setup-firebase-cicd.cjs
 *
 * Interactive 1-command setup for:
 *   1. Firebase CLI login check
 *   2. Creating multi-site Hosting targets (scraper-37c72-master, scraper-37c72-admin)
 *   3. Generating FIREBASE_TOKEN via `firebase login:ci` and saving to GitHub Secrets
 *   4. Building and deploying Client, Master, and Admin live to Firebase Hosting
 */

const { execFileSync, spawn, spawnSync } = require('child_process');
const fs = require('fs');

const PROJECT_ID = 'scraper-37c72';
const REPO = 'torislove/scraper';
const EXTRA_SITES = ['scraper-37c72-master', 'scraper-37c72-admin'];

const isWin = process.platform === 'win32';
const FIREBASE_BIN = isWin ? 'firebase.cmd' : 'firebase';
const NPM_BIN = isWin ? 'npm.cmd' : 'npm';

function resolveGhBin() {
  if (!isWin) return 'gh';
  const winDefault = 'C:\\Program Files\\GitHub CLI\\gh.exe';
  if (fs.existsSync(winDefault)) return winDefault;
  return 'gh';
}

function runCapture(cmd, args) {
  return spawnSync(cmd, args, {
    encoding: 'utf8',
    shell: isWin
  });
}

function runInteractive(cmd, args) {
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: isWin
  });
  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
}

function captureInteractiveToken(cmd, args) {
  return new Promise((resolve, reject) => {
    let combined = '';
    const child = spawn(cmd, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: isWin
    });
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      combined += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      combined += text;
      process.stderr.write(text);
    });
    child.on('error', reject);
    child.on('close', () => resolve(combined));
  });
}

async function main() {
  console.log('=============================================================');
  console.log(' Scraper.co.in - Firebase Multi-Site + GitHub Auto-CI/CD Setup');
  console.log('=============================================================\n');

  console.log('[1/4] Checking Firebase CLI authentication...');
  const loginCheck = runCapture(FIREBASE_BIN, ['login:list']);
  const loginText = `${loginCheck.stdout || ''}\n${loginCheck.stderr || ''}`;
  if (loginCheck.status !== 0 || /No authorized accounts/i.test(loginText)) {
    console.log('-> Opening browser for Firebase login...');
    runInteractive(FIREBASE_BIN, ['login']);
  } else {
    console.log('-> Firebase CLI is already signed in.');
  }

  console.log(`\n[2/4] Ensuring Multi-Site Hosting targets exist in ${PROJECT_ID}...`);
  const sitesRes = runCapture(FIREBASE_BIN, ['hosting:sites:list', '--project', PROJECT_ID]);
  const sitesText = `${sitesRes.stdout || ''}\n${sitesRes.stderr || ''}`;
  for (const siteId of EXTRA_SITES) {
    if (sitesText.includes(siteId)) {
      console.log(`-> Site ${siteId} already exists.`);
    } else {
      console.log(`-> Creating Firebase Hosting site: ${siteId} ...`);
      const createRes = spawnSync(
        FIREBASE_BIN,
        ['hosting:sites:create', siteId, '--project', PROJECT_ID],
        { stdio: 'inherit', shell: isWin }
      );
      if (createRes.status !== 0) {
        console.warn(`   (Note: ${siteId} returned code ${createRes.status} - continuing if it already exists)`);
      }
    }
  }

  console.log(`\n[3/4] Generating Firebase CI token and saving FIREBASE_TOKEN to GitHub (${REPO})...`);
  const ciOutput = await captureInteractiveToken(FIREBASE_BIN, ['login:ci']);
  const cleanAnsi = ciOutput.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
  const match = cleanAnsi.match(/(1\/\/[A-Za-z0-9_-]{20,})/);
  const ghBin = resolveGhBin();

  if (match && match[1]) {
    const token = match[1];
    execFileSync(ghBin, ['secret', 'set', 'FIREBASE_TOKEN', '--repo', REPO, '--body', token], {
      stdio: 'inherit'
    });
    console.log(`-> Saved FIREBASE_TOKEN to GitHub Secrets (${REPO}).`);
  } else {
    console.warn('-> Could not auto-detect 1// token from output. You can set it manually with:');
    console.warn(`   "${ghBin}" secret set FIREBASE_TOKEN --repo ${REPO}`);
  }

  console.log('\n[4/4] Building and deploying Client, Master, and Admin live to Firebase Hosting...');
  runInteractive(NPM_BIN, ['run', 'deploy:web']);

  console.log('\n=============================================================');
  console.log(' SUCCESS! All 3 sites deployed & GitHub Auto-CI/CD is active!');
  console.log('  Client + Landing : https://scraper-37c72.web.app  (-> scraper.co.in)');
  console.log('  Master Fleet     : https://scraper-37c72-master.web.app (-> master.scraper.co.in)');
  console.log('  Admin Console    : https://scraper-37c72-admin.web.app (-> admin.scraper.co.in)');
  console.log('=============================================================');
}

main().catch((err) => {
  console.error('Setup failed:', err.message || err);
  process.exit(1);
});
