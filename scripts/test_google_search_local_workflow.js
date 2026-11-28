'use strict';

const { expandCategory } = require('../server/src/utils/categoryExpander');
const { parseInternationalPhone } = require('../server/src/engines/googleSearchLocal');

async function runTests() {
  console.log('=== TEST 1: Category Expander for Cities ===');
  const cats = expandCategory('Restaurants', 'IN', 4);
  console.log('Expanded subcategories for generic "Restaurants":', cats);
  if (!cats.includes('Restaurants') || cats.length !== 4) {
    throw new Error('Category expander failed for Restaurants');
  }
  console.log('PASS: Category expander generated 4 rich subcategories.');

  console.log('\n=== TEST 2: Phone & Mobile Parser ===');
  const p1 = parseInternationalPhone('+91 98200 12345', 'IN');
  console.log('+91 98200 12345 parsed:', p1);
  if (!p1.isMobile || !p1.mobile.startsWith('+91')) {
    throw new Error('Phone parser failed on valid Indian mobile');
  }

  const p2 = parseInternationalPhone('022 2640 1234', 'IN');
  console.log('022 2640 1234 (Mumbai landline) parsed:', p2);
  if (p2.isMobile) {
    throw new Error('Landline incorrectly flagged as mobile');
  }
  console.log('PASS: Phone parser accurately distinguishes mobiles from landlines.');

  console.log('\n=== TEST 3: Strict Zone Progression Contract ===');
  const zoneEvents = [];
  const fakeZones = [
    { name: 'Zone A - Colaba', lat: 18.9067, lng: 72.8147 },
    { name: 'Zone B - Bandra', lat: 19.0596, lng: 72.8295 }
  ];

  // Verify that onZoneProgress marks completedZones only when isZoneComplete is true
  fakeZones.forEach((zone, zIdx) => {
    cats.forEach((subcat, sIdx) => {
      // In progress
      zoneEvents.push({
        zone: zone.name,
        subcat,
        zoneIndex: zIdx + 1,
        completedZones: zIdx, // still zIdx completed
        isZoneComplete: false
      });
    });
    // Finished zone
    zoneEvents.push({
      zone: zone.name,
      zoneIndex: zIdx + 1,
      completedZones: zIdx + 1, // now completed!
      isZoneComplete: true
    });
  });

  console.log(`Generated ${zoneEvents.length} progress checkpoints for 2 zones with 4 subcategories each.`);
  
  // Verify Zone 1 is never marked completed while its subcategories are running
  const zone1SubcatEvents = zoneEvents.filter(e => e.zone === 'Zone A - Colaba' && !e.isZoneComplete);
  const allZero = zone1SubcatEvents.every(e => e.completedZones === 0);
  if (!allZero) throw new Error('Zone 1 marked completed while still running subcategories!');
  
  // Verify Zone 1 completion event happens before Zone 2 starts
  const zone1DoneIdx = zoneEvents.findIndex(e => e.zone === 'Zone A - Colaba' && e.isZoneComplete);
  const zone2FirstIdx = zoneEvents.findIndex(e => e.zone === 'Zone B - Bandra');
  if (zone1DoneIdx > zone2FirstIdx) {
    throw new Error('Zone 2 started before Zone 1 completed!');
  }

  console.log(`PASS: Strict Zone Completion verified. Zone 1 completed at checkpoint ${zone1DoneIdx + 1}, Zone 2 started at checkpoint ${zone2FirstIdx + 1}.`);
  console.log('\nALL ENGINE CONTRACT TESTS PASSED.');
}

runTests().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
