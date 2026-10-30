const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load environment variables
const backendEnvPath = path.join(__dirname, '../../backend/.env');
if (fs.existsSync(backendEnvPath)) {
  require('dotenv').config({ path: backendEnvPath });
} else {
  require('dotenv').config();
}

const { getNvidiaApiKey } = require('./src/config/settingsManager');

const cachePath = path.join(__dirname, 'data/resolved_hierarchies.json');
let resolvedCache = {};
if (fs.existsSync(cachePath)) {
  try {
    resolvedCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (e) {
    resolvedCache = {};
  }
}

async function nvidiaPost(prompt, maxTokens = 1500) {
  const apiKey = getNvidiaApiKey();
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await axios.post(
        'https://integrate.api.nvidia.com/v1/chat/completions',
        {
          model: 'meta/llama-3.3-70b-instruct',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: maxTokens,
          stream: false
        },
        { 
          headers: { 
            'Authorization': `Bearer ${apiKey}`, 
            'Content-Type': 'application/json' 
          }, 
          timeout: 45000 
        }
      );
      const content = response.data.choices[0].message.content.trim();
      let cleanJson = content;
      if (cleanJson.includes('```')) {
        const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          cleanJson = match[1];
        }
      }
      return JSON.parse(cleanJson.trim());
    } catch (err) {
      console.warn(`[Nvidia API] Attempt ${attempt} failed: ${err.message}. Retrying...`);
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }
}

const telanganaDistricts = [
  "Adilabad", "Bhadradri Kothagudem", "Hanumakonda", "Hyderabad", "Jagtial", 
  "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", 
  "Khammam", "Kumuram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial", 
  "Medak", "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", 
  "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", 
  "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", 
  "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri"
];

const apDistricts = [
  "Alluri Sitharama Raju", "Anakapalli", "Ananthapuramu", "Annamayya", "Bapatla", 
  "Chittoor", "East Godavari", "Eluru", "Guntur", "Kakinada", 
  "Konaseema", "Krishna", "Kurnool", "Nandyal", "NTR", 
  "Palnadu", "Parvathipuram Manyam", "Prakasam", "Sri Potti Sriramulu Nellore", "Sri Sathya Sai", 
  "Srikakulam", "Tirupati", "Visakhapatnam", "Vizianagaram", "West Godavari", 
  "YSR"
];

async function resolveDistrict(districtName, stateName) {
  const lowerDistrict = districtName.toLowerCase().trim();
  
  // Check if already cached with valid mandals
  if (resolvedCache[lowerDistrict] && 
      resolvedCache[lowerDistrict].hierarchy && 
      resolvedCache[lowerDistrict].hierarchy[0] && 
      resolvedCache[lowerDistrict].hierarchy[0].mandals && 
      resolvedCache[lowerDistrict].hierarchy[0].mandals.length > 0) {
    console.log(`[Cache Hit] District "${districtName}" already cached.`);
    return;
  }

  console.log(`[AI Request] Resolving mandals for district: ${districtName} (${stateName})...`);
  const prompt = `You are a highly precise Global Geographic Intelligence AI.
The user wants to find divisions of the district: "${districtName}" in "${stateName}".
Generate a JSON object with this EXACT structure:
{
  "level": "district",
  "stateName": "${stateName}",
  "hierarchy": [
    {
      "districtName": "${districtName}",
      "mandals": ["Mandal 1", "Mandal 2", "Mandal 3", "Mandal 4"]
    }
  ]
}
Return the actual current administrative mandals (up to 20-30 mandals) in this district.
Return ONLY valid JSON. Do not include markdown code block formatting (no \`\`\`json wrappers).`;

  try {
    const result = await nvidiaPost(prompt, 1500);
    if (result && result.level && Array.isArray(result.hierarchy) && result.hierarchy[0]) {
      resolvedCache[lowerDistrict] = result;
      
      // Update state-level cache too if it is present
      const lowerState = stateName.toLowerCase().trim();
      if (resolvedCache[lowerState] && resolvedCache[lowerState].hierarchy) {
        const distIdx = resolvedCache[lowerState].hierarchy.findIndex(d => d.districtName.toLowerCase() === lowerDistrict);
        if (distIdx !== -1) {
          resolvedCache[lowerState].hierarchy[distIdx].mandals = result.hierarchy[0].mandals;
        }
      }
      
      fs.writeFileSync(cachePath, JSON.stringify(resolvedCache, null, 2));
      console.log(`[Success] Resolved ${result.hierarchy[0].mandals.length} mandals for ${districtName}`);
    }
  } catch (err) {
    console.error(`[Error] Failed to resolve district ${districtName}:`, err.message);
  }
}

async function run() {
  console.log('--- GEOGRAPHIC CACHE WARMER ---');
  console.log('Resolving Telangana districts...');
  
  // Resolve districts in chunks of 5 parallel requests
  const concurrency = 5;
  
  // Combine all districts
  const allTargets = [
    ...telanganaDistricts.map(d => ({ name: d, state: 'Telangana' })),
    ...apDistricts.map(d => ({ name: d, state: 'Andhra Pradesh' }))
  ];
  
  for (let i = 0; i < allTargets.length; i += concurrency) {
    const chunk = allTargets.slice(i, i + concurrency);
    console.log(`\nProcessing chunk ${Math.floor(i / concurrency) + 1} of ${Math.ceil(allTargets.length / concurrency)}...`);
    
    await Promise.all(chunk.map(target => resolveDistrict(target.name, target.state)));
    
    // Add a delay between chunks to be safe with rate limits
    if (i + concurrency < allTargets.length) {
      console.log('Waiting 3 seconds before next chunk...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  console.log('\n--- Cache Warming Completed ---');
}

run();
