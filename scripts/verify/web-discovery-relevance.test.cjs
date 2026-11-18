#!/usr/bin/env node
/**
 * Web Discovery relevance checks (pure, no network).
 *
 * A public search for "photographers in Troy" returns plenty of pages whose
 * titles say "Photography". The old stemmer chopped the query to
 * "photographe", which matches neither "photographer" nor "photography", so a
 * US run kept zero independent business sites. These checks lock the fix in.
 *
 * Run: node scripts/verify/web-discovery-relevance.test.cjs
 */
const assert = require('assert');
const { _internals } = require('../../server/src/scrapers/engine-web-discovery');

const { categoryStems, isRelevantResult, hostOf, isExcluded, cleanTitle } = _internals;

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

check('photographers stems match photographer and photography', () => {
  const stems = categoryStems('photographers');
  assert.ok(stems.includes('photograph'), `stems: ${stems.join(',')}`);
  const hit = row => isRelevantResult(row, stems);
  assert.ok(hit({ title: 'Troy Photography Studio', url: 'https://a.example', snippet: '' }));
  assert.ok(hit({ title: 'A Wedding Photographer in Troy', url: 'https://b.example', snippet: '' }));
  assert.ok(hit({ title: 'Studio', url: 'https://c.example', snippet: 'Portrait photography for families' }));
});

check('an unrelated page is rejected', () => {
  const stems = categoryStems('photographers');
  assert.strictEqual(isRelevantResult({ title: 'Azalea Dolls Dress Up', url: 'https://azaleasdolls.com', snippet: 'games' }, stems), false);
});

check('plumbers stems match plumbing', () => {
  const stems = categoryStems('plumbers');
  assert.ok(isRelevantResult({ title: 'Troy Plumbing Co', url: 'https://p.example', snippet: '' }, stems));
});

check('restaurants stems match restaurant', () => {
  const stems = categoryStems('restaurants');
  assert.ok(isRelevantResult({ title: 'The Troy Restaurant', url: 'https://r.example', snippet: '' }, stems));
});

check('dentists stems match dental', () => {
  const stems = categoryStems('dentists');
  assert.ok(isRelevantResult({ title: 'Troy Dental Care', url: 'https://d.example', snippet: '' }, stems));
});

check('an empty category keeps every result', () => {
  assert.strictEqual(isRelevantResult({ title: 'Anything', url: 'https://x.example' }, []), true);
});

check('directories and social networks are excluded', () => {
  assert.strictEqual(isExcluded('https://www.yelp.com/biz/foo'), true);
  assert.strictEqual(isExcluded('https://m.facebook.com/foo'), true);
  assert.strictEqual(isExcluded('https://www.instagram.com/foo'), true);
  assert.strictEqual(isExcluded('https://troyshots.example/gallery'), false);
});

check('aggregator pages are dropped, real businesses kept', () => {
  const { classifyResultUrl, originOf } = _internals;
  const drop = [
    ['https://www.yelp.com/search?cflt=photographers', 'THE BEST 10 Photographers in TROY, MI'],
    ['https://meetaphotographer.com/photographers/troy,michigan', 'Photographers in Troy, Michigan'],
    ['https://bestphotographersites.com/michigan/troy/', ''],
    ['https://fash.com/mi/troy/photographers/', ''],
    ['https://pictage.ai/find-a-photographer/mi/troy', ''],
    ['https://www.addtoevent.co.uk/listings/corporate-event-catering/berkshire/slough', ''],
    ['https://www.airbnb.co.in/troy-mi/services/photographers', 'Photographers in Troy']
  ];
  for (const [url, title] of drop) {
    assert.strictEqual(classifyResultUrl(url, title), 'drop', `should drop ${url}`);
  }
  const keep = [
    'https://speaklifephotography.com/troy/',
    'https://www.rachelseventcatering.co.uk/catering-in-slough/',
    'https://troyshots.example/gallery'
  ];
  for (const url of keep) {
    assert.strictEqual(classifyResultUrl(url, 'Troy Photography Studio'), null, `should keep ${url}`);
  }
  // A real business using a programmatic landing page keeps its domain.
  assert.strictEqual(classifyResultUrl('https://benonscatering.co.uk/near-me/slough/', 'Benons'), 'origin');
  assert.strictEqual(originOf('https://benonscatering.co.uk/near-me/slough/'), 'https://benonscatering.co.uk/');
});

check('host parsing strips www', () => {
  assert.strictEqual(hostOf('https://www.TroyShots.example/gallery'), 'troyshots.example');
});

check('titles drop the trailing tagline', () => {
  assert.strictEqual(cleanTitle("Joe's Plumbing | Austin TX | 24/7"), "Joe's Plumbing");
  assert.strictEqual(cleanTitle('Troy Dental – Family Dentist'), 'Troy Dental');
});

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall web discovery relevance checks passed');
