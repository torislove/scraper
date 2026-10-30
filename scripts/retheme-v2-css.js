/**
 * Retheme legacy green-dark surfaces in v2.css to the navy palette.
 * Layout is untouched: only colour literals change.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'client', 'src', 'v2', 'v2.css');
let css = fs.readFileSync(file, 'utf8');
const before = css;

const rgbMap = {
  '10, 14, 16': '13, 21, 38',
  '8, 11, 12': '10, 16, 30',
  '17, 24, 27': '20, 32, 56',
  '7, 10, 11': '8, 13, 24',
  '11, 16, 18': '14, 22, 40',
  '12, 17, 19': '15, 23, 41',
  '14, 20, 22': '18, 28, 48',
  '8, 12, 13': '10, 16, 29'
};

for (const [oldRgb, newRgb] of Object.entries(rgbMap)) {
  css = css.split(`rgba(${oldRgb},`).join(`rgba(${newRgb},`);
}

css = css.split('#0b1012').join('#0d1526');
css = css.split('#25302b').join('#1e293b');
css = css.split('#26322c').join('#1e293b');

fs.writeFileSync(file, css);
console.log(before === css ? 'No colour changes needed.' : 'Legacy surfaces retheme applied.');
