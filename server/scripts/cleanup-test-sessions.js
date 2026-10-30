/**
 * Remove test-session rows that were polluted by an old broken WeddingWire
 * engine (Bangalore/Mumbai addresses mislabeled as Vijayawada venues).
 *
 * Usage: node scripts/cleanup-test-sessions.js [sessionId ...]
 * Defaults to dirtest_01.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../data/scraped_vendors.json');
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['dirtest_01'];
const matches = value => {
  const text = String(value || '');
  return targets.some(target => target.endsWith('*')
    ? text.startsWith(target.slice(0, -1))
    : text === target);
};

const all = JSON.parse(fs.readFileSync(file, 'utf8'));
const keep = all.filter(vendor => !matches(vendor.sessionId) && !matches(vendor.lastSessionId) &&
  !(Array.isArray(vendor.sessionIds) && vendor.sessionIds.some(matches)));
const removed = all.length - keep.length;

if (!removed) {
  console.log('Nothing to remove.');
  process.exit(0);
}

const backup = file.replace(/\.json$/, `.backup-${Date.now()}.json`);
fs.copyFileSync(file, backup);
fs.writeFileSync(file, JSON.stringify(keep, null, 2));
console.log(`Removed ${removed} vendors for ${targets.join(', ')}. Kept ${keep.length}. Backup: ${backup}`);
