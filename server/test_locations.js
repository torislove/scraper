const extractor = require('./src/utils/intelligentExtractor');
const locs = extractor.getAllLocalities();
console.log(`Total localities found: ${locs.length}`);
if (locs.length > 0) {
  console.log('Sample localities:', locs.slice(0, 10));
} else {
  console.log('No localities found. Check JSON path.');
}
