const { spawn } = require('child_process');
const path = require('path');
const dbAdapter = require('../config/dbAdapter');
const { getNvidiaApiKey } = require('../config/settingsManager');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

// Lead Quality Scoring Algorithm
function calculateLeadScore(vendor) {
  let score = 0;
  if (vendor.phone) score += 30;
  if (vendor.address) score += 10;
  if (vendor.website) score += 20;
  if (vendor.rating && parseFloat(vendor.rating) > 4.2) score += 15;
  if (vendor.reviews && parseInt(vendor.reviews.replace(/,/g, '')) > 50) score += 5;
  if (vendor.email) score += 10;
  return Math.min(score, 100);
}

function determineTier(score) {
  if (score >= 80) return 'Premium';
  if (score >= 50) return 'Standard';
  return 'Basic';
}

/**
 * The DeepSeek AI Engine (Python Hybrid Bridge).
 * This node script acts as the bridge that launches the Python Infinity Engine
 * and processes its stdout IPC stream for logs and DB insertions.
 */
async function scrapeDeepseekAI(query, category, location) {
  deps.logger(`[Node.js Bridge] Connecting to Python Infinity Engine...`);
  
  return new Promise((resolve, reject) => {
    // 1. Get Nvidia API key from UI config or env
    const apiKey = getNvidiaApiKey();
    if (!apiKey) {
      deps.logger(`[ERROR] NVIDIA_API_KEY is missing from environment. Aborting Python script launch.`);
      return resolve([]);
    }

    // 2. Launch the python process
    const pythonScriptPath = path.join(__dirname, 'engine-python.py');
    const pythonProcess = spawn('python', [
      pythonScriptPath,
      '--query', query,
      '--category', category,
      '--location', location,
      '--apikey', apiKey
    ]);

    const scrapedResults = [];

    // 3. Listen to Python Output stream
    pythonProcess.stdout.on('data', async (data) => {
      if (deps.abortSignal.aborted) {
        pythonProcess.kill();
        return;
      }

      const outputLines = data.toString().split('\n');
      for (const line of outputLines) {
        if (!line.trim()) continue;
        
        try {
          const payload = JSON.parse(line.trim());
          
          if (payload.type === 'log') {
            deps.logger(payload.message);
          } 
          else if (payload.type === 'lead') {
            const vendor = payload.data;
            const businessName = vendor.businessName || 'Unknown Vendor';
            
            // Build the DB model
            const vendors = dbAdapter.getVendors();
            const existing = vendors.find(v => v.mapsLink === vendor.mapsLink || v.name === businessName);

            if (!existing) {
              const leadScore = calculateLeadScore(vendor);
              const newLead = {
                id: 'place_' + Date.now().toString() + Math.random().toString(36).substring(7),
                name: businessName,
                category: vendor.category || category,
                city: location,
                address: vendor.address || '',
                phone: (vendor.phones && vendor.phones.length > 0) ? vendor.phones[0] : '',
                rating: vendor.qualityScore ? parseFloat((vendor.qualityScore / 20).toFixed(1)) : null,
                mapsLink: vendor.mapsLink || '',
                source: 'DeepSeek Python Engine',
                verified: true,
                aiVerified: true,
                matchedKeywords: [],
                email: (vendor.emails && vendor.emails.length > 0) ? vendor.emails[0] : '',
                instagram: '',
                instagramFollowers: '',
                facebook: '',
                facebookFollowers: '',
                website: '',
                qualityScore: leadScore,
                tier: determineTier(leadScore),
                operatingHours: '',
                topReviews: vendor.businessSummary ? [vendor.businessSummary] : [],
                images: vendor.images || [],
                scrapedAt: new Date().toISOString()
              };

              vendors.push(newLead);
              dbAdapter.saveVendors(vendors);
              scrapedResults.push(newLead);
              try { deps.emitVendorEvent(newLead, 'inserted'); } catch (e) {}
              deps.logger(`[Node.js Bridge] Successfully inserted ${businessName} into DB.`);
            } else {
              deps.logger(`[Node.js Bridge] Skipping ${businessName} (Already in DB).`);
              try { deps.emitVendorEvent(existing, 'duplicate'); } catch (e) {}
            }
          }
        } catch (err) {
          // If python prints raw non-json (e.g. fatal tracebacks), log it
        }
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      deps.logger(`[Python Error] ${data.toString()}`);
    });

    pythonProcess.on('close', (code) => {
      deps.logger(`[Node.js Bridge] Python engine terminated with exit code ${code}`);
      resolve(scrapedResults);
    });

    pythonProcess.on('error', (err) => {
      deps.logger(`[ERROR] Failed to start Python process: ${err.message}. Is Python installed?`);
      resolve(scrapedResults);
    });
  });
}

module.exports = { scrapeDeepseekAI, setDeps };
