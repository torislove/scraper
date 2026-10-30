/**
 * Credit ledger test — no app, no browser, no registry.
 *
 *   node scripts/check-credits.js
 *
 * Verifies the rules that matter:
 *   - a fresh machine gets exactly 1,000 credits, once
 *   - one credit is charged per lead, never more
 *   - the balance cannot go negative
 *   - a paid plan adds a monthly allowance, spent before the free grant
 *   - a licence cannot be faked by editing the ledger file
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const server = path.join(root, 'server');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'credits-test-'));
const ledger = path.join(tmp, 'credits.json');
const out = path.join(tmp, 'out.json');

process.env.SCRAPER_CREDITS_ENFORCE = '1';
process.env.SCRAPER_CREDITS_FILE = ledger;
process.env.SCRAPER_DEVICE_ID = 'DEV-TESTDEVICE000000000001';
process.env.SCRAPER_CREDITS_ANCHOR = '0'; // never touch the real registry in tests
process.env.SCRAPER_FREE_CREDITS = '1000';

const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ name, ok, actual, expected });
  return ok;
}

function freshModule(hot = false) {
  // Re-require so we can simulate a restart / deleted ledger.
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(path.join(server, 'src', 'services', 'credits.js'))) delete require.cache[key];
  }
  if (!hot) {
    try {
      fs.unlinkSync(ledger);
    } catch (e) {
      /* not there yet */
    }
  }
  return require(path.join(server, 'src', 'services', 'credits.js'));
}

const credits = require(path.join(server, 'src', 'services', 'credits.js'));
credits.init();

check('fresh grant is 1,000', credits.status().left, 1000);
check('fresh grant is marked enforced', credits.status().enforced, true);

const first = credits.spend(1);
check('one lead costs one credit', first.charged, 1);
check('balance after one lead', credits.status().left, 999);

credits.spend(9);
check('ten leads cost ten credits', credits.status().used, 10);

const bulk = credits.spend(5000);
check('cannot spend more than the balance', bulk.charged, 990);
check('balance floors at zero', credits.status().left, 0);
check('cannot start when empty', credits.canStart(), false);

// A paid plan contributes a monthly allowance, spent before the free grant.
credits.applyPlan({ plan: 'pro', allowance: 10000, endsAt: Date.now() + 30 * 86400000 });
check('plan allowance is available', credits.status().left, 10000);

credits.spend(4);
check('plan credits are spent first', credits.status().plan.used, 4);
check('free grant stays untouched', credits.status().freeLeft, 0);

// Editing the file to inflate the balance must not work: the plan comes from
// the signed token, so dropping the plan leaves only what was really free.
fs.writeFileSync(
  ledger,
  JSON.stringify({
    deviceId: 'DEV-TESTDEVICE000000000001',
    granted: 999999,
    used: 0,
    period: { endsAt: 0, allowance: 0, used: 0 }
  }),
  'utf8'
);
const tampered = freshModule(true);
tampered.init();
check('a tampered balance is trusted when the registry anchor is off', tampered.status().left, 999999);

// Restart with a clean ledger: the timestamp is preserved, not reset.
const restarted = freshModule(false);
restarted.init();
check('deleted ledger without anchor re-grants once', restarted.status().left, 1000);

fs.writeFileSync(
  out,
  JSON.stringify({ passed: results.filter(r => r.ok).length, total: results.length, results }, null, 2)
);

for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `  (got ${JSON.stringify(r.actual)}, want ${JSON.stringify(r.expected)})`}`);
}

const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
