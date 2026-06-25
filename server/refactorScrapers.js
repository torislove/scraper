const fs = require('fs');
const path = require('path');

const scraperFiles = [
  'engine-weddingwire.js',
  'engine-weddingbazaar.js',
  'engine-mandap.js',
  'engine-justdial.js',
  'engine-deepseek.js',
  'engine-brave-dork.js'
];

for (const file of scraperFiles) {
  const filePath = path.join(__dirname, 'src', 'scrapers', file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace import
  content = content.replace(/const StagingLead = require\('\.\.\/models\/StagingLead'\);/g, "const localDb = require('../config/localDb');");

  // Fix deepseek
  if (file === 'engine-deepseek.js') {
    content = content.replace(/const existing = await StagingLead\.findOne\(\{[\s\S]*?name: vendor\.name[\s\S]*?\}\);/g, `const vendors = localDb.getVendors();\n            const existing = vendors.find(v => v.name === vendor.name);`);
    content = content.replace(/const newLead = new StagingLead\(\{/g, `const newLead = {`);
    content = content.replace(/await newLead\.save\(\);/g, `vendors.push(newLead); localDb.saveVendors(vendors);`);
  } else if (file === 'engine-justdial.js') {
    content = content.replace(/let existing = await StagingLead\.findOne\(\{ name: v\.name, city: location \}\);/g, `const vendors = localDb.getVendors();\n      let existing = vendors.find(x => x.name === v.name && x.city === location);`);
    content = content.replace(/existing = await StagingLead\.findOne\(\{ phone: v\.phone \}\);/g, `existing = vendors.find(x => x.phone === v.phone);`);
    content = content.replace(/const created = await StagingLead\.create\(\{/g, `const newLead = {`);
    content = content.replace(/addLog\(`\[JustDial\] ✓ Saved new vendor/g, `vendors.push(newLead); localDb.saveVendors(vendors);\n        addLog(\`[JustDial] ✓ Saved new vendor`);
  } else {
    // For standard scrapers like weddingwire, weddingbazaar, mandap, brave-dork
    content = content.replace(/const existing = await StagingLead\.findOne\(\{ name(: v\.name|), city: location \}\);/g, `const vendors = localDb.getVendors();\n      const existing = vendors.find(x => x.name === (typeof v !== 'undefined' ? v.name : name) && x.city === location);`);
    content = content.replace(/const created = await StagingLead\.create\(\{/g, `const newLead = {`);
    content = content.replace(/try \{ emitVendorEvent\(created, 'inserted'\); \} catch \(e\) \{\}/g, `vendors.push(newLead); localDb.saveVendors(vendors);\n        try { emitVendorEvent(newLead, 'inserted'); } catch (e) {}`);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}
console.log('All scraper files refactored!');
