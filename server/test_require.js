const extractor = require('./src/utils/intelligentExtractor');
console.log('Available functions:', Object.keys(extractor));
console.log('Is fetchOSMLocalities a function?', typeof extractor.fetchOSMLocalities === 'function');
