/**
 * Rebuild the vendor store from backup snapshots without losing a single row.
 *
 * The scraper's store was accidentally replaced twice by an engine that saved
 * only its own run's rows. This script unions every snapshot plus the live file:
 * a row is merged when the same business is found (same mobile, otherwise same
 * name + city), and the row with more real information wins.
 *
 * Usage: node scripts/restore-vendors.js [file ...]
 * Output is written to data/scraped_vendors.json after backing it up.
 */
const fs = require('fs');
const path = require('path');
const { normalizePhone } = require('../src/utils/phoneUtils');

const dataDir = path.join(__dirname, '..', 'data');
const live = path.join(dataDir, 'scraped_vendors.json');

const args = process.argv.slice(2);
let sources = args.length
  ? args.map(a => (path.isAbsolute(a) ? a : path.join(process.cwd(), a)))
  : fs.readdirSync(dataDir)
    .filter(f => /^scraped_vendors\.backup-.*\.json$/.test(f))
    .map(f => path.join(dataDir, f))
    .concat([live]);

const isTest = value => /^(warm_|selftest_|probe_)/.test(String(value || ''));

function readRows(file) {
  try {
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.log('skip unreadable:', file, err.message);
    return [];
  }
}

function digits(value) {
  const d = String(value || '').replace(/\D/g, '');
  if (d.length < 10) return '';
  return d.slice(-10);
}

function keyOf(v) {
  const phone = digits(v.phone) || digits(Array.isArray(v.mobileNumbers) && v.mobileNumbers[0]);
  if (phone) return `p:${phone}`;
  const name = String(v.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const city = String(v.city || v.location || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return name ? `n:${name}|${city}` : '';
}

function score(v) {
  const fields = ['phone', 'email', 'website', 'address', 'city', 'category', 'subcategory', 'instagram', 'facebook', 'rating', 'reviewCount', 'openingHours'];
  let s = 0;
  for (const f of fields) {
    const value = v[f];
    if (Array.isArray(value) ? value.length : value) s++;
  }
  return s;
}

function phoneCandidates(row) {
  if (!row) return [];
  const list = [
    row.phone,
    ...(Array.isArray(row.phones) ? row.phones : []),
    ...(Array.isArray(row.mobileNumbers) ? row.mobileNumbers : []),
    row.mobile
  ];
  return list.filter(value => value != null && String(value).trim());
}

function isMobilePhone(value) {
  const parsed = normalizePhone(value, { context: 'phone mobile', trusted: true });
  return Boolean(parsed && parsed.isMobile);
}

/**
 * Two snapshots of the same business can disagree on the phone. Never let the
 * "richer" row overwrite a validated mobile with a landline, a blank or junk.
 */
function pickBestPhone(existing, row) {
  const candidates = [...phoneCandidates(existing), ...phoneCandidates(row)];
  const mobile = candidates.find(isMobilePhone);
  if (mobile) return mobile;
  return candidates[0] || '';
}

const merged = new Map();
let seenRows = 0;
let testRows = 0;

for (const file of sources) {
  const rows = readRows(file);
  console.log(`${path.basename(file)}: ${rows.length} rows`);
  for (const row of rows) {
    if (!row || !row.name) continue;
    if ([row.sessionId, row.lastSessionId, ...(Array.isArray(row.sessionIds) ? row.sessionIds : [])].some(isTest)) {
      testRows++;
      continue;
    }
    seenRows++;
    const key = keyOf(row);
    if (!key) continue;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, row);
      continue;
    }
    const winner = score(row) > score(existing) ? { ...existing, ...row } : { ...row, ...existing };
    winner.phone = pickBestPhone(existing, row);
    merged.set(key, winner);
  }
}

const out = Array.from(merged.values());
if (!out.length) {
  console.log('Nothing to restore — refusing to write an empty store.');
  process.exit(1);
}

const backup = live.replace(/\.json$/, `.backup-${Date.now()}.json`);
if (fs.existsSync(live)) fs.copyFileSync(live, backup);
fs.writeFileSync(live, JSON.stringify(out, null, 2));

const withMobile = out.filter(v => digits(v.phone)).length;
console.log(`read ${seenRows} real rows (${testRows} test rows skipped), merged into ${out.length} unique businesses`);
console.log(`with a validated mobile: ${withMobile}`);
console.log('written:', live);
console.log('previous live file backed up to:', backup);
