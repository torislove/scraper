const Fuse = require('fuse.js');
const extractor = require('./src/utils/intelligentExtractor');

const locs = extractor.getAllLocalities().map(l => l.name);
const fuse = new Fuse(locs, { threshold: 0.4 });

console.log(fuse.search('ner').slice(0, 3).map(r => r.item));
