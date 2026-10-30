const { exec } = require('child_process');
const path = require('path');
const dbAdapter = require('../config/dbAdapter');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

async function scrapeScrapySpider(category, location) {
  deps.logger(`[Spider Core] Starting isolated Spider Matrix for ${category} in ${location}`);
  
  const pythonScript = path.join(__dirname, 'scrapy_spider.py');
  const safeQuery = category.replace(/"/g, '\\"');
  const safeLoc = location.replace(/"/g, '\\"');

  return new Promise((resolve) => {
    const process = exec(`python "${pythonScript}" "${safeQuery}" "${safeLoc}"`);

    process.stdout.on('data', async (data) => {
      if (deps.abortSignal.aborted) {
        process.kill();
        resolve();
      }
      
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.includes('SCRAPY_LEAD:')) {
          try {
            const jsonStr = line.split('SCRAPY_LEAD: ')[1].trim();
            const lead = JSON.parse(jsonStr);
            
            // Save to DB
            const existingVendors = await dbAdapter.getVendors();
            const isDup = existingVendors.find(v => v.website === lead.website || v.phone === lead.phone);
            if (!isDup) {
              existingVendors.push(lead);
              await dbAdapter.saveVendors(existingVendors);
              deps.logger(`[Spider Core] Captured entity: ${lead.name}`);
              try { deps.emitVendorEvent(lead, 'inserted'); } catch (e) {}
            }
          } catch (e) {
            deps.logger(`[Spider Core Alert] Failed to parse entity: ${e.message}`);
          }
        }
      }
    });

    process.stderr.on('data', (data) => {
      // Scrapy outputs standard info to stderr, ignore unless explicit error
    });

    process.on('close', (code) => {
      deps.logger(`[Spider Core] Spider Matrix completed cycle (Code ${code}).`);
      resolve();
    });
  });
}

module.exports = { scrapeScrapySpider, setDeps };
