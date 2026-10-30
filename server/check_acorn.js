const fs = require('fs');
const code = fs.readFileSync('src/scrapers/engine-google-places.js', 'utf8');

// Use acorn or espree if available, or regex
try {
  const acorn = require('acorn');
  acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
  console.log('Acorn: parsed successfully!');
} catch (e) {
  console.log('Acorn parse error:', e.message, 'at line', e.loc ? e.loc.line : '');
}
