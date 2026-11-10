/* Inspect the leads of one session: names, phones, sources. */
const dbAdapter = require('../src/config/dbAdapter');

const sessionId = process.argv[2];
if (!sessionId) {
  console.log('usage: node scripts/inspect-session.js <sessionId>');
  process.exit(1);
}

const rows = dbAdapter.getVendors().filter(v =>
  v.sessionId === sessionId || (Array.isArray(v.sessionIds) && v.sessionIds.includes(sessionId))
);

const mobiles = rows.filter(v => /^\+?91?[\s-]?[6-9]\d{9}$/.test(String(v.phone || '').replace(/\s/g, '')));
const bySource = {};
for (const v of rows) bySource[v.source || 'unknown'] = (bySource[v.source || 'unknown'] || 0) + 1;

console.log('session:', sessionId);
console.log('leads:', rows.length, '| with mobile:', mobiles.length);
console.log('sources:', bySource);
console.log('sample:');
rows.slice(0, 25).forEach(v => {
  console.log(` - ${String(v.name).slice(0, 46).padEnd(46)} | ${String(v.phone || 'Unknown').padEnd(14)} | ${String(v.city || '').slice(0, 18).padEnd(18)} | ${v.source || ''}`);
});
process.exit(0);
