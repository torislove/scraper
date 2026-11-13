#!/usr/bin/env node
/**
 * One-off repair: make every stored lead's phone flags agree with its phone.
 *
 * Background
 * ----------
 * Engines, the streaming phone backfill and the session vault each rewrote
 * `phone` / `phoneType` at different moments, but not all of them also updated
 * `isMobile` / `isLandline`. That produced rows like:
 *
 *     { phone: '+91 77993 34918', phoneType: 'mobile',
 *       isMobile: false, isLandline: true }
 *
 * A perfectly valid mobile was then scored as a landline and denied a WhatsApp
 * link. New writes are fixed at the dbAdapter/vault boundary; this script
 * repairs the rows that already exist.
 *
 * Safety
 * ------
 * - Read-only unless a flag actually changes.
 * - Every file is copied to server/data/phone-flags-backup-<stamp>/ first.
 * - Atomic write (tmp + rename).
 * - Only phone-related fields are touched. No lead is added, merged or removed.
 * - Stop the engine before running: only the lock holder may write the store.
 *
 * Usage
 * -----
 *     node server/scripts/repair-phone-flags.js            # report only
 *     node server/scripts/repair-phone-flags.js --apply    # write changes
 */

const fs = require('fs');
const path = require('path');
const { DATA_DIR, SESSIONS_DIR } = require('../src/config/paths');
const { syncPhoneFlags } = require('../src/utils/phoneUtils');

const APPLY = process.argv.includes('--apply');
const STAMP = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
const BACKUP_DIR = path.join(DATA_DIR, `phone-flags-backup-${STAMP}`);

const VENDORS_FILE = path.join(DATA_DIR, 'scraped_vendors.json');
const FLAG_FIELDS = ['phoneType', 'isMobile', 'isLandline', 'whatsappAvailable', 'whatsappLink', 'callUrl'];

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; }
}

function writeAtomic(file, value) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function backup(file) {
  if (!fs.existsSync(file)) return;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const rel = path.relative(DATA_DIR, file).replace(/[\\/]/g, '__');
  fs.copyFileSync(file, path.join(BACKUP_DIR, rel));
}

/** Returns true when at least one phone flag changed. */
function repairLead(lead) {
  if (!lead || typeof lead !== 'object') return false;
  const before = {};
  for (const field of FLAG_FIELDS) before[field] = lead[field];
  syncPhoneFlags(lead);
  return FLAG_FIELDS.some(field => lead[field] !== before[field]);
}

function listSessionFiles() {
  const out = [];
  if (!fs.existsSync(SESSIONS_DIR)) return out;
  for (const user of fs.readdirSync(SESSIONS_DIR, { withFileTypes: true })) {
    if (!user.isDirectory()) continue;
    const dir = path.join(SESSIONS_DIR, user.name);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.json')) out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function main() {
  const report = { vendors: { rows: 0, changed: 0 }, sessions: { files: 0, rows: 0, changed: 0 } };
  const samples = [];

  const vendors = readJson(VENDORS_FILE);
  if (Array.isArray(vendors)) {
    report.vendors.rows = vendors.length;
    let dirty = false;
    for (const vendor of vendors) {
      if (!repairLead(vendor)) continue;
      dirty = true;
      report.vendors.changed += 1;
      if (samples.length < 10) samples.push({ where: 'store', name: vendor.name, phone: vendor.phone, phoneType: vendor.phoneType, isMobile: vendor.isMobile, isLandline: vendor.isLandline });
    }
    if (dirty && APPLY) {
      backup(VENDORS_FILE);
      writeAtomic(VENDORS_FILE, vendors);
    }
  }

  for (const file of listSessionFiles()) {
    const session = readJson(file);
    const leads = session && (Array.isArray(session.leads) ? session.leads : null);
    if (!Array.isArray(leads) || !leads.length) continue;
    report.sessions.files += 1;
    let dirty = false;
    for (const lead of leads) {
      report.sessions.rows += 1;
      if (!repairLead(lead)) continue;
      dirty = true;
      report.sessions.changed += 1;
      if (samples.length < 20) samples.push({ where: 'session', name: lead.name, phone: lead.phone, phoneType: lead.phoneType, isMobile: lead.isMobile, isLandline: lead.isLandline });
    }
    if (dirty && APPLY) {
      backup(file);
      writeAtomic(file, session);
    }
  }

  console.log(`mode: ${APPLY ? 'APPLY' : 'REPORT ONLY (pass --apply to write)'}`);
  console.log(`store:   ${report.vendors.rows} rows, ${report.vendors.changed} phone flag sets repaired`);
  console.log(`sessions: ${report.sessions.files} folders, ${report.sessions.rows} rows, ${report.sessions.changed} phone flag sets repaired`);
  if (samples.length) {
    console.log('sample repairs:');
    for (const s of samples) console.log(' ', JSON.stringify(s));
  }
  if (APPLY && (report.vendors.changed || report.sessions.changed)) {
    console.log(`backup: ${BACKUP_DIR}`);
  }
}

main();
