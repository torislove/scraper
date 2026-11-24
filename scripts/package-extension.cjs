#!/usr/bin/env node
'use strict';

/**
 * package-extension.cjs — Automated Multi-Store Cross-Browser Extension Packager
 * ==============================================================================
 * Builds ready-to-upload .zip distribution archives for:
 *   1. Google Chrome Web Store ($5 one-time developer registration)
 *   2. Microsoft Edge Add-ons (Free Microsoft Partner Center registration)
 *   3. Mozilla Firefox Add-ons / AMO (Free registration or self-hosted signed .xpi)
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const EXT_SRC = path.join(ROOT, 'extension');
const OUT_DIR = path.join(ROOT, 'dist', 'extensions');
const TMP_DIR = path.join(ROOT, 'dist', '.tmp-ext-build');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyRecursive(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    // Skip backup files or editor artifacts
    if (entry.name.endsWith('.bak') || entry.name.endsWith('.tmp')) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function createZip(sourceDir, zipPath) {
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  ensureDir(path.dirname(zipPath));

  try {
    // Windows 10/11 native bsdtar produces clean, standard zip archives
    execFileSync('tar.exe', ['-a', '-c', '-f', zipPath, '-C', sourceDir, '.'], {
      stdio: 'pipe',
      windowsHide: true
    });
  } catch (err) {
    // Fallback to PowerShell Compress-Archive
    const psCmd = `Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${zipPath}' -Force`;
    execFileSync('powershell.exe', ['-NoProfile', '-Command', psCmd], { stdio: 'pipe' });
  }

  const stat = fs.statSync(zipPath);
  return (stat.size / 1024).toFixed(1);
}

function main() {
  console.log('====================================================');
  console.log('   CROSS-BROWSER EXTENSION MULTI-STORE PACKAGER     ');
  console.log('====================================================\n');

  ensureDir(OUT_DIR);
  cleanDir(TMP_DIR);
  ensureDir(TMP_DIR);

  const manifestRaw = fs.readFileSync(path.join(EXT_SRC, 'manifest.json'), 'utf8');
  const baseManifest = JSON.parse(manifestRaw);
  const version = baseManifest.version || '1.3.0';

  // Store Schema Validation Checks
  if (baseManifest.description && baseManifest.description.length > 132) {
    throw new Error(`Manifest description length (${baseManifest.description.length}) exceeds 132 characters limit!`);
  }
  if (baseManifest.name && baseManifest.name.length > 45) {
    throw new Error(`Manifest name length (${baseManifest.name.length}) exceeds 45 characters limit!`);
  }

  console.log(`Source Extension Version: v${version}`);
  console.log(`Manifest Description Length: ${baseManifest.description.length}/132 chars (Valid ✓)`);
  console.log(`Manifest Version: MV${baseManifest.manifest_version}\n`);

  // 1. Google Chrome Web Store Build
  console.log('[1/3] Packaging Google Chrome Web Store build...');
  const chromeTmp = path.join(TMP_DIR, 'chrome');
  copyRecursive(EXT_SRC, chromeTmp);
  const chromeZip = path.join(OUT_DIR, `scraper-ram-turbo-chrome-v${version}.zip`);
  const chromeLatest = path.join(OUT_DIR, 'scraper-ram-turbo-chrome.zip');
  const chromeKb = createZip(chromeTmp, chromeZip);
  fs.copyFileSync(chromeZip, chromeLatest);
  console.log(`  ✓ Built: ${path.basename(chromeZip)} (${chromeKb} KB)`);

  // 2. Microsoft Edge Add-ons Build
  console.log('\n[2/3] Packaging Microsoft Edge Add-ons build...');
  const edgeTmp = path.join(TMP_DIR, 'edge');
  copyRecursive(EXT_SRC, edgeTmp);
  const edgeZip = path.join(OUT_DIR, `scraper-ram-turbo-edge-v${version}.zip`);
  const edgeLatest = path.join(OUT_DIR, 'scraper-ram-turbo-edge.zip');
  const edgeKb = createZip(edgeTmp, edgeZip);
  fs.copyFileSync(edgeZip, edgeLatest);
  console.log(`  ✓ Built: ${path.basename(edgeZip)} (${edgeKb} KB)`);

  // 3. Mozilla Firefox Add-ons (AMO) Build
  console.log('\n[3/3] Packaging Mozilla Firefox (AMO) build...');
  const firefoxTmp = path.join(TMP_DIR, 'firefox');
  copyRecursive(EXT_SRC, firefoxTmp);

  // Firefox MV3 Optimization:
  // - AMO linter requires specific gecko ID
  // - Removes 'offscreen' from permissions (Firefox handles fallback tab rendering directly)
  // - Maps background.scripts for AMO compatibility
  const ffManifestPath = path.join(firefoxTmp, 'manifest.json');
  const ffManifest = JSON.parse(fs.readFileSync(ffManifestPath, 'utf8'));

  ffManifest.browser_specific_settings = {
    gecko: {
      id: 'scraper-ram-turbo@scraper.co.in',
      strict_min_version: '115.0'
    }
  };

  // Filter out permissions not yet supported in Firefox AMO validation
  if (Array.isArray(ffManifest.permissions)) {
    ffManifest.permissions = ffManifest.permissions.filter((p) => p !== 'offscreen');
  }

  // Ensure background compatibility for AMO
  if (ffManifest.background) {
    ffManifest.background.scripts = ['background.js'];
  }

  fs.writeFileSync(ffManifestPath, JSON.stringify(ffManifest, null, 2), 'utf8');

  const firefoxZip = path.join(OUT_DIR, `scraper-ram-turbo-firefox-v${version}.zip`);
  const firefoxLatest = path.join(OUT_DIR, 'scraper-ram-turbo-firefox.zip');
  const firefoxKb = createZip(firefoxTmp, firefoxZip);
  fs.copyFileSync(firefoxZip, firefoxLatest);
  console.log(`  ✓ Built: ${path.basename(firefoxZip)} (${firefoxKb} KB)`);

  // Cleanup temp files
  cleanDir(TMP_DIR);

  console.log('\n====================================================');
  console.log('   ALL 3 STORE PACKAGES SUCCESSFULLY CREATED:');
  console.log(`   Location: ${OUT_DIR}`);
  console.log('   1. scraper-ram-turbo-chrome.zip');
  console.log('   2. scraper-ram-turbo-edge.zip');
  console.log('   3. scraper-ram-turbo-firefox.zip');
  console.log('====================================================\n');
}

main();
