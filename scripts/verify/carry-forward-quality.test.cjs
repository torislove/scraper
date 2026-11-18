#!/usr/bin/env node
/**
 * Carry-forward quality guard checks (pure, no network, no store writes).
 *
 * A repeat search reuses rows the machine already found. That is only safe when
 * the row still has a way to reach the business and the quality engine did not
 * already judge it thin. These checks lock the guard in place.
 *
 * Run: node scripts/verify/carry-forward-quality.test.cjs
 */
const assert = require('assert');
const { _internals } = require('../../server/src/services/carryForwardService');

const { carryForwardQuality } = _internals;

let failures = 0;
function check(label, fn) {
  try {
    fn();
    console.log(`  ok   ${label}`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL ${label}: ${error.message}`);
  }
}

check('a lead with a mobile and an address is reused', () => {
  const row = { name: 'Troy Studio', phone: '+1 518 555 0100', address: '1 River St, Troy' };
  assert.strictEqual(carryForwardQuality(row).ok, true);
});

check('a lead with only a website is reused', () => {
  assert.strictEqual(carryForwardQuality({ name: 'A', website: 'https://a.example' }).ok, true);
});

check('a lead with only an email is reused', () => {
  assert.strictEqual(carryForwardQuality({ name: 'A', emails: ['a@example.com'] }).ok, true);
});

check('a lead with only an address is reused', () => {
  assert.strictEqual(carryForwardQuality({ name: 'A', formattedAddress: '2 Main St' }).ok, true);
});

check('a name-only row is rejected', () => {
  const result = carryForwardQuality({ name: 'Ghost Studio' });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'no-contact');
});

check('a row below the quality floor is rejected', () => {
  const result = carryForwardQuality({
    name: 'Thin Studio',
    phone: '+1 518 555 0100',
    profileQuality: { score: 12 }
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'low-score');
});

check('a legacy qualityScore is honoured', () => {
  const result = carryForwardQuality({ name: 'Old', phone: '+1 518 555 0100', qualityScore: 20 });
  assert.strictEqual(result.ok, false);
});

check('a high-quality row with a mobile passes', () => {
  const result = carryForwardQuality({
    name: 'Good Studio',
    phone: '+1 518 555 0100',
    profileQuality: { score: 82 }
  });
  assert.strictEqual(result.ok, true);
});

check('a zero score is treated as unknown, not as a failure', () => {
  const result = carryForwardQuality({ name: 'A', phone: '+1 518 555 0100', profileQuality: { score: 0 } });
  assert.strictEqual(result.ok, true);
});

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall carry-forward quality checks passed');
