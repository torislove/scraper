/**
 * Remove engine self-test rows from the vendor store.
 *
 * Only session ids that start with warm_ / selftest_ / probe_ are stripped.
 * A row that still belongs to a real folder is kept — we just unlink the test
 * folder from it. A row that existed only for a test is deleted.
 *
 * Run with the engine stopped:  node scripts/clean-test-vendors.js
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'scraped_vendors.json');
const isTest = value => /^(warm_|selftest_|probe_)/.test(String(value || ''));

const all = JSON.parse(fs.readFileSync(file, 'utf8'));
const keep = [];
let removed = 0;
let unlinked = 0;

for (const vendor of all) {
  const single = isTest(vendor.sessionId) ? '' : vendor.sessionId || '';
  const list = (Array.isArray(vendor.sessionIds) ? vendor.sessionIds : []).filter(id => !isTest(id));
  const last = isTest(vendor.lastSessionId) ? '' : vendor.lastSessionId || '';

  const hadTest = [vendor.sessionId, vendor.lastSessionId, ...(Array.isArray(vendor.sessionIds) ? vendor.sessionIds : [])]
    .some(isTest);
  if (hadTest) unlinked++;

  const hasRealSession = Boolean(single || last || list.length);
  if (!hasRealSession) {
    removed++;
    continue;
  }

  keep.push({
    ...vendor,
    ...(vendor.sessionId !== undefined ? { sessionId: single || list[0] || last } : {}),
    ...(vendor.sessionIds !== undefined ? { sessionIds: list.length ? list : [single || last].filter(Boolean) } : {}),
    ...(vendor.lastSessionId !== undefined ? { lastSessionId: last || list[0] || single } : {})
  });
}

if (!removed && !unlinked) {
  console.log('Nothing to clean.');
  process.exit(0);
}

const backup = path.join(__dirname, '..', 'data', `scraped_vendors.backup-${Date.now()}.json`);
fs.copyFileSync(file, backup);
fs.writeFileSync(file, JSON.stringify(keep, null, 2));
console.log(`Unlinked test folders from ${unlinked} rows; removed ${removed} test-only rows. Kept ${keep.length}.`);
console.log('Backup:', backup);
