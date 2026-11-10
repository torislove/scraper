/* List vendor-store rows that only exist because of engine self-tests. */
const dbAdapter = require('../src/config/dbAdapter');

const vendors = dbAdapter.getVendors();
const isTest = value => /^(warm_|selftest_|probe_)/.test(String(value || ''));
const rows = vendors.filter(v => {
  const ids = [v.sessionId, ...(Array.isArray(v.sessionIds) ? v.sessionIds : [])].filter(Boolean);
  return ids.some(isTest);
});
console.log('vendors total:', vendors.length, 'test-tagged:', rows.length);
const bySession = {};
for (const v of rows) {
  for (const id of [v.sessionId, ...(Array.isArray(v.sessionIds) ? v.sessionIds : [])]) {
    if (isTest(id)) bySession[id] = (bySession[id] || 0) + 1;
  }
}
console.log(bySession);
