const Fuse = require('fuse.js');
const extractor = require('./src/utils/intelligentExtractor');

const locs = extractor.getAllLocalities().map(l => l.name);
const fuse = new Fuse(locs, { threshold: 0.4 });

console.log('Total Locations:', locs.length);
console.log('Does exact Guntur exist in locations?', locs.includes('Guntur'));
const results = fuse.search('guntur');
console.log('Fuse results for "guntur":');
console.log(results.slice(0, 5).map(r => r.item));
