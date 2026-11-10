const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../db/india_villages.json');
const data = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));

console.log('TOTAL STATES/UTs:', data.length);
console.log('---------------------------------------------------------');

let totalD = 0;
let totalM = 0;
let totalV = 0;

data.forEach((s, idx) => {
  const dCount = (s.districts || []).length;
  let mCount = 0;
  let vCount = 0;
  (s.districts || []).forEach(d => {
    mCount += (d.subDistricts || []).length;
    (d.subDistricts || []).forEach(sd => {
      vCount += (sd.villages || []).length;
    });
  });
  totalD += dCount;
  totalM += mCount;
  totalV += vCount;
  console.log(`${(idx + 1).toString().padStart(2, ' ')}. ${s.state.padEnd(32)} -> Districts: ${dCount.toString().padStart(2, ' ')} | SubDistricts: ${mCount.toString().padStart(4, ' ')} | Villages: ${vCount}`);
});

console.log('---------------------------------------------------------');
console.log(`GRAND TOTAL: ${totalD} Districts | ${totalM} SubDistricts | ${totalV} Villages`);

