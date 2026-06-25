const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getNvidiaApiKey } = require('../config/settingsManager');

const cachePath = path.join(__dirname, '../../data/resolved_hierarchies.json');
let resolvedCache = {};

function loadCache() {
  try {
    const dataDir = path.dirname(cachePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(cachePath)) {
      resolvedCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    }
  } catch (e) {
    console.error('[Geographic AI Cache] Failed to load resolved cache:', e.message);
  }
}
loadCache();

function saveCache() {
  try {
    fs.writeFileSync(cachePath, JSON.stringify(resolvedCache, null, 2));
  } catch (e) {
    console.error('[Geographic AI Cache] Failed to save resolved cache:', e.message);
  }
}

async function nvidiaPost(payload, timeout = 30000, maxRetries = 3) {
  const apiKey = getNvidiaApiKey();
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(
        'https://integrate.api.nvidia.com/v1/chat/completions',
        payload,
        {
          headers: { 
            'Authorization': `Bearer ${apiKey}`, 
            'Content-Type': 'application/json' 
          },
          timeout
        }
      );
      return response;
    } catch (err) {
      lastError = err;
      console.warn(`[Nvidia API] Attempt ${attempt} failed: ${err.message}. Retrying in ${attempt * 2}s...`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, attempt * 2000));
      }
    }
  }
  throw lastError;
}

let indiaGeoData = null;
try {
  const dbPath = path.join(__dirname, '../../db/india_villages.json');
  if (fs.existsSync(dbPath)) {
    indiaGeoData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }
} catch (e) {
  console.error('[Intelligent Extractor] Failed to load local india geo JSON:', e.message);
}

/**
 * Intelligent Agent Extractor using Nvidia's DeepSeek-V4-Pro API
 */
async function extractData(rawText, domainHint = '') {
  const defaultData = {
    servicesOffered: [],
    pricingFound: null,
    emails: [],
    phones: [],
    aiCategory: domainHint || 'Unknown',
    extractedAddress: '',
    socialLinks: {},
    businessSummary: 'Auto-extracted vendor profile from official website.',
    score: 0
  };

  if (!rawText || rawText.trim().length === 0) return defaultData;

  try {
    const phoneRegex = /(?:\+91|0)?\s?[6-9]\d{9}/g;
    const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g;
    
    const phonesMatches = [...new Set(rawText.match(phoneRegex) || [])].slice(0, 3);
    const emailsMatches = [...new Set(rawText.match(emailRegex) || [])].slice(0, 3);
    
    let score = 0;
    if (phonesMatches.length > 0) score += 40;
    if (emailsMatches.length > 0) score += 20;

    return {
      ...defaultData,
      emails: emailsMatches,
      phones: phonesMatches,
      score
    };
  } catch (error) {
    console.error(`[Heuristic Extractor] Regex failed: ${error.message}`);
    return defaultData;
  }
}

/**
 * Evaluates Search Engine Results Pages (SERP) to pick the best direct vendor links.
 */
async function evaluateSERP(serpData) {
  if (!serpData || serpData.length === 0) return [];
  // Basic heuristic filtering
  return serpData.filter(s => {
    const d = s.url.toLowerCase();
    return !d.includes('justdial') && !d.includes('wedmegood') && !d.includes('weddingwire') && !d.includes('pinterest');
  }).slice(0, 3).map(s => s.url);
}

/**
 * Generates a refined search query if the previous one failed to find enough leads.
 */
async function generateRefinedQuery(previousQuery, resultsFound) {
  return `${previousQuery} contact info official website`;
}

/**
 * Breaks down a broad location (like a District, Mandal, or City) into an array of specific sub-locations.
 */
function getLevenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  // Allocate only a single 1D array row for memory efficiency
  let prev = Array(b.length + 1).fill(0).map((_, i) => i);
  let curr = [];
  
  for (let i = 1; i <= a.length; i++) {
    curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,      // Insertion
        prev[j] + 1,          // Deletion
        prev[j - 1] + cost    // Substitution
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * Breaks down a broad location (like a District, Mandal, or City) into an array of specific sub-locations.
 * Supports stateHint for sub-millisecond local fuzzy matching.
 */
async function generateLocalities(broadLocation, stateHint = '') {
  if (!broadLocation) return [];
  const searchName = broadLocation.toLowerCase().trim();
  const cleanSearch = searchName.replace(/\s*\(.*?\)\s*/g, '').replace(/[^a-z0-9]/g, '');

  if (indiaGeoData) {
    let targetStates = indiaGeoData;
    if (stateHint) {
      const hintClean = stateHint.toLowerCase().replace(/[^a-z0-9]/g, '');
      const stateObj = indiaGeoData.find(s => s.state && s.state.toLowerCase().replace(/[^a-z0-9]/g, '') === hintClean);
      if (stateObj) {
        targetStates = [stateObj];
      }
    }

    // 1. Exact match pass
    for (const state of targetStates) {
      if (state.state && state.state.toLowerCase() === searchName) {
        if (state.districts) {
          return state.districts.map(d => d.district).filter(Boolean);
        }
      }

      if (!state.districts) continue;
      for (const dist of state.districts) {
        if (!dist || !dist.subDistricts) continue;

        // Match District: Return all mandals
        if (dist.district && dist.district.toLowerCase() === searchName) {
          return dist.subDistricts.map(sd => sd.subDistrict).filter(Boolean);
        }

        for (const sub of dist.subDistricts) {
          if (!sub || !sub.subDistrict) continue;
          const subLower = sub.subDistrict.toLowerCase().trim();
          const cleanSub = subLower.replace(/\s*\(.*?\)\s*/g, '').replace(/[^a-z0-9]/g, '');
          if (subLower === searchName || cleanSub === cleanSearch) {
            if (sub.villages && sub.villages.length > 0) {
              return sub.villages.filter(Boolean);
            } else {
              return [broadLocation];
            }
          }
        }
      }
    }

    // 2. Fuzzy match pass (edit distance <= 3) inside targetStates
    let bestFuzzyMatch = null;
    let minDistance = 4; // Max distance allowed is 3

    for (const state of targetStates) {
      if (!state.districts) continue;
      for (const dist of state.districts) {
        if (!dist || !dist.subDistricts) continue;
        for (const sub of dist.subDistricts) {
          if (!sub || !sub.subDistrict) continue;
          const subLower = sub.subDistrict.toLowerCase().trim();
          const cleanSub = subLower.replace(/\s*\(.*?\)\s*/g, '').replace(/[^a-z0-9]/g, '');
          
          // Length pruning: if length difference is already >= current min distance, skip Levenshtein!
          const lenDiff = Math.abs(cleanSearch.length - cleanSub.length);
          if (lenDiff >= minDistance) continue;
          
          const distVal = getLevenshteinDistance(cleanSearch, cleanSub);
          if (distVal < minDistance) {
            minDistance = distVal;
            bestFuzzyMatch = sub;
          }
        }
      }
    }

    if (bestFuzzyMatch && bestFuzzyMatch.villages && bestFuzzyMatch.villages.length > 0) {
      console.log(`[Geographic Local Lookup] Fuzzy matched "${broadLocation}" to "${bestFuzzyMatch.subDistrict}" (Distance: ${minDistance})`);
      return bestFuzzyMatch.villages.filter(Boolean);
    }
  }

  // Check cache first
  const cacheKey = `localities_${searchName}`;
  if (!resolvedCache[cacheKey]) {
    loadCache();
  }
  if (resolvedCache[cacheKey]) {
    console.log(`[Geographic AI Cache] Localities Cache hit for "${broadLocation}"`);
    return resolvedCache[cacheKey];
  }

  // Fallback: Return the broad location name itself instead of high-latency AI calls
  console.log(`[Geographic Local Lookup] Complete miss for "${broadLocation}". Returning self for sub-second execution.`);
  return [broadLocation];
}

/**
 * Generates nearby towns/localities within a given radius.
 */
async function generateNearbyLocations(location, radiusKm) {
  const lowerLoc = location.toLowerCase().trim();
  const cacheKey = `nearby_${lowerLoc}_${radiusKm}`;
  if (!resolvedCache[cacheKey]) {
    loadCache();
  }
  if (resolvedCache[cacheKey]) {
    console.log(`[Geographic AI Cache] Nearby Cache hit for "${location}"`);
    return resolvedCache[cacheKey];
  }

  const prompt = `You are a geographic AI assistant. The user wants to search for vendors within ${radiusKm}km of "${location}".
Return a JSON array of 5 to 10 major towns, cities, or prominent neighborhoods that fall within this radius. Include the original location as the first element.
Return ONLY a valid JSON array of strings. Do not include markdown formatting or any other text.
Example format: ["Guntur City", "Tenali", "Mangalagiri", "Bapatla"]`;

  try {
    const response = await nvidiaPost({
      model: 'meta/llama-3.3-70b-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 300,
      stream: false
    }, 45000);

    let parsed = response.data.choices[0].message.content.trim();
    if (parsed.includes('```')) {
      const match = parsed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) parsed = match[1];
    }
    const result = JSON.parse(parsed.trim());
    const finalResult = Array.isArray(result) ? result : [location];

    resolvedCache[cacheKey] = finalResult;
    saveCache();

    return finalResult;
  } catch (err) {
    console.error(`[Intelligent Extractor] generateNearbyLocations failed: ${err.message}`);
    return [location]; // Fallback to original
  }
}

/**
 * Analyzes a location to determine its geographic scope and returns culturally accurate subdivisions.
 */
async function analyzeGeographicScope(location) {
  if (!location || typeof location !== 'string') return { type: "specific" };
  const lowerLoc = location.toLowerCase().trim();
  
  // Fast Path: Check local database first to bypass AI completely
  if (indiaGeoData) {
    const isState = indiaGeoData.some(s => s.state && s.state.toLowerCase() === lowerLoc);
    if (isState) {
      const stateObj = indiaGeoData.find(s => s.state && s.state.toLowerCase() === lowerLoc);
      return {
        type: "broad",
        options: ["Search Entire State", `Search Only Major Districts`, "Search All Mandals"]
      };
    }
    
    let matchedDistrict = null;
    for (const state of indiaGeoData) {
      if (state.districts) {
        const dMatch = state.districts.find(d => d.district && d.district.toLowerCase() === lowerLoc);
        if (dMatch) {
          matchedDistrict = dMatch.district;
          break;
        }
      }
    }
    if (matchedDistrict) {
      return {
        type: "broad",
        options: ["Search Entire District", `Search Only ${matchedDistrict} City`, "Search All Mandals"]
      };
    }
  }

  const cacheKey = `scope_${lowerLoc}`;
  if (!resolvedCache[cacheKey]) {
    loadCache();
  }
  if (resolvedCache[cacheKey]) {
    console.log(`[Geographic AI Cache] Scope Cache hit for "${location}"`);
    return resolvedCache[cacheKey];
  }

  const prompt = `You are a geographic intelligence AI. The user wants to search for vendors in "${location}".
Determine if this location is a broad region (like a District, State, County, or Province) or a specific localized town/city.
If it is a specific localized town/city, return: {"type": "specific"}
If it is a broad region, you must provide exactly 3 culturally accurate search scope options for the user. 
For example:
- If "Guntur", return: {"type": "broad", "options": ["Search Entire District", "Search Only Guntur City", "Search All Mandals"]}
- If "New York", return: {"type": "broad", "options": ["Search Entire State", "Search Only NYC", "Search All Counties"]}
- If "London", return: {"type": "broad", "options": ["Search Greater London", "Search City of London", "Search All Boroughs"]}
Return ONLY valid JSON format. Do not use markdown wrappers.`;

  try {
    const response = await nvidiaPost({
      model: 'meta/llama-3.3-70b-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 300,
      stream: false
    }, 45000);

    let parsed = response.data.choices[0].message.content.trim();
    if (parsed.includes('```')) {
      const match = parsed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) parsed = match[1];
    }
    const result = JSON.parse(parsed.trim());

    resolvedCache[cacheKey] = result;
    saveCache();

    return result;
  } catch (err) {
    console.error(`[Intelligent Extractor] analyzeGeographicScope failed: ${err.message}`);
    return { type: "specific" }; // Safe fallback
  }
}

/**
 * Fetches localities (villages, towns, nodes) for a given region using OSM Nominatim.
 * Provides precise lat/lng coordinates for geographical gridding.
 */
async function fetchOSMLocalities(region) {
  if (!region) return [];
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: region, format: 'json', addressdetails: 1, limit: 20 },
      headers: { 'User-Agent': 'GomandapScraper/1.0 (contact@gomandap.com)' },
      timeout: 10000
    });
    
    return response.data.map(item => ({
      name: item.name,
      lat: item.lat,
      lng: item.lon, // scrape.js expects lng
      type: item.type
    })).filter(loc => loc.lat && loc.lng);
  } catch (err) {
    console.error('[OSM Engine] fetchOSMLocalities failed:', err.message);
    return [];
  }
}

/**
 * Returns a flattened array of all districts and mandals from the geo database.
 * Formatted for Orama knowledge engine initialization.
 */
let cachedLocalities = null;

function getAllLocalities() {
  if (cachedLocalities) return cachedLocalities;
  const locs = [];
  if (!indiaGeoData) return locs;

  for (const state of indiaGeoData) {
    if (state.state) {
      locs.push({ type: 'state', name: state.state });
    }
    
    // Only fetch Andhra Pradesh and Telangana for performance, or fetch all if needed
    // Let's fetch all Districts and SubDistricts (Mandals)
    if (!state.districts) continue;
    for (const dist of state.districts) {
      if (dist.district) {
        locs.push({ type: 'district', name: dist.district });
      }
      if (!dist.subDistricts) continue;
      for (const sub of dist.subDistricts) {
        if (sub.subDistrict) {
          locs.push({ type: 'mandal', name: sub.subDistrict, district: dist.district });
        }
      }
    }
  }
  
  // Deduplicate
  const uniqueLocs = [];
  const seen = new Set();
  for (const loc of locs) {
    if (!seen.has(loc.name.toLowerCase())) {
      seen.add(loc.name.toLowerCase());
      uniqueLocs.push(loc);
    }
  }
  
  cachedLocalities = uniqueLocs;
  return cachedLocalities;
}

const Fuse = require('fuse.js');

let geoFuse = null;
function getGeoFuse() {
  if (geoFuse) return geoFuse;
  console.log('[Intelligent Extractor] Initializing Fuse.js geographic auto-correct index...');
  const localities = getAllLocalities();
  geoFuse = new Fuse(localities, {
    keys: ['name'],
    threshold: 0.3,
    includeScore: true
  });
  console.log(`[Intelligent Extractor] Fuzzy index compiled with ${localities.length} geographic nodes.`);
  return geoFuse;
}

let knownNamesMap = null;
function getKnownNamesMap() {
  if (knownNamesMap) return knownNamesMap;
  knownNamesMap = new Map();
  const localities = getAllLocalities();
  for (const loc of localities) {
    knownNamesMap.set(loc.name.toLowerCase(), loc.name);
  }
  return knownNamesMap;
}

function correctLocationTypo(locationName) {
  if (!locationName || typeof locationName !== 'string') return locationName;
  const clean = locationName.trim();
  if (clean.length < 3) return locationName;
  
  const lowerClean = clean.toLowerCase();
  
  // 1. Exact-match bypass: check known names map instantly (<0.01ms)
  try {
    const knownMap = getKnownNamesMap();
    if (knownMap.has(lowerClean)) {
      return knownMap.get(lowerClean);
    }
  } catch (e) {
    console.error('[Geo Typo Auto-Correct] Exact-match cache lookup failed:', e.message);
  }
  
  // 2. Fuzzy fallback: lazy load/query Fuse.js index
  try {
    const fuse = getGeoFuse();
    const results = fuse.search(clean);
    if (results && results.length > 0) {
      const best = results[0];
      if (best.score <= 0.3) {
        console.log(`[Geo Typo Auto-Correct] Typo detected! Corrected "${clean}" to "${best.item.name}" (Score: ${best.score.toFixed(3)})`);
        return best.item.name;
      }
    }
  } catch (e) {
    console.error('[Geo Typo Auto-Correct] Search failed:', e.message);
  }
  return locationName;
}


async function resolveHierarchy(locationName) {
  if (!locationName || typeof locationName !== 'string') {
    return { level: 'specific', stateName: null, hierarchy: [] };
  }
  const searchName = locationName.toLowerCase().trim();
  const searchNameClean = searchName.replace(/[^a-z0-9]/g, '');

  if (!resolvedCache[searchName]) {
    loadCache();
  }

  if (resolvedCache[searchName]) {
    console.log(`[Geographic AI Cache] Hierarchy Cache hit for "${locationName}"`);
    return resolvedCache[searchName];
  }

  // Use local DB for ALL states including Telangana and Andhra Pradesh (post-2022 data is in the JSON)
  if (indiaGeoData) {
    // 1a. Check if it's a State name
    for (const state of indiaGeoData) {
      if (state.state && state.state.toLowerCase().replace(/[^a-z0-9]/g, '') === searchNameClean) {
        const hierarchy = [];
        if (state.districts) {
          for (const dist of state.districts) {
            if (dist.district) {
              const mandals = (dist.subDistricts || [])
                .map(sd => sd.subDistrict)
                .filter(Boolean);
              hierarchy.push({
                districtName: dist.district,
                mandals: mandals.length > 0 ? mandals : [dist.district]
              });
            }
          }
        }
        return {
          level: 'state',
          stateName: state.state,
          hierarchy
        };
      }
    }

    // 1b. Check if it's a District name
    for (const state of indiaGeoData) {
      if (!state.districts) continue;
      for (const dist of state.districts) {
        if (dist.district && dist.district.toLowerCase().replace(/[^a-z0-9]/g, '') === searchNameClean) {
          const mandals = (dist.subDistricts || [])
            .map(sd => sd.subDistrict)
            .filter(Boolean);
          return {
            level: 'district',
            stateName: state.state,
            hierarchy: [{
              districtName: dist.district,
              mandals: mandals.length > 0 ? mandals : [dist.district]
            }]
          };
        }
      }
    }

    // 1c. Check if it's a Mandal (subDistrict) name
    for (const state of indiaGeoData) {
      if (!state.districts) continue;
      for (const dist of state.districts) {
        if (!dist.subDistricts) continue;
        for (const sub of dist.subDistricts) {
          if (sub.subDistrict && sub.subDistrict.toLowerCase() === searchName) {
            return {
              level: 'mandal',
              stateName: state.state,
              hierarchy: [{
                districtName: dist.district,
                mandals: [sub.subDistrict]
              }]
            };
          }
        }
      }
    }
  }

  // Engage DeepSeek AI for global/reorganized resolution
  console.log(`[Geographic AI] Database miss or new region: "${locationName}". Engaging DeepSeek AI...`);
  
  // Decide whether the query is state-level or district-level for AI fallback
  const knownIndianStates = ['telangana', 'andhra pradesh', 'karnataka', 'tamil nadu', 'maharashtra', 'kerala', 'gujarat', 'rajasthan', 'punjab', 'haryana', 'uttar pradesh', 'bihar', 'west bengal', 'odisha', 'madhya pradesh', 'assam', 'himachal pradesh', 'uttarakhand', 'jharkhand', 'chhattisgarh', 'goa', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'sikkim', 'tripura', 'arunachal pradesh', 'delhi', 'jammu and kashmir', 'ladakh', 'chandigarh', 'puducherry'];
  const isStateQuery = searchName.includes('state') || knownIndianStates.includes(searchName);

  let prompt = '';
  if (isStateQuery) {
    prompt = `You are a highly precise Global Geographic Intelligence AI.
The user wants to find divisions of the state: "${locationName}".
Generate a JSON object with this EXACT structure:
{
  "level": "state",
  "stateName": "${locationName}",
  "hierarchy": [
    { "districtName": "District 1", "mandals": [] },
    { "districtName": "District 2", "mandals": [] }
  ]
}
Return the actual current list of reorganized administrative districts (as of 2026, e.g. 33 districts for Telangana, 26 districts for Andhra Pradesh). Leave the "mandals" array empty for all districts.
Return ONLY valid JSON. Do not include markdown code block formatting (no \`\`\`json wrappers).`;
  } else {
    prompt = `You are a highly precise Global Geographic Intelligence AI.
The user wants to find divisions of the district: "${locationName}".
Generate a JSON object with this EXACT structure:
{
  "level": "district",
  "stateName": "Name of State",
  "hierarchy": [
    {
      "districtName": "${locationName}",
      "mandals": ["Mandal 1", "Mandal 2", "Mandal 3", "Mandal 4"]
    }
  ]
}
Return the actual current administrative mandals (up to 20-30 mandals) in this district.
Return ONLY valid JSON. Do not include markdown code block formatting (no \`\`\`json wrappers).`;
  }

  try {
    const response = await nvidiaPost({
      model: 'meta/llama-3.3-70b-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1500,
      stream: false
    }, 45000);
    const rawContent = response.data.choices[0].message.content;
    let cleanJson = rawContent.trim();
    if (cleanJson.includes('```')) {
      const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        cleanJson = match[1];
      }
    }
    const parsed = JSON.parse(cleanJson.trim());
    if (parsed && parsed.level && Array.isArray(parsed.hierarchy)) {
      resolvedCache[searchName] = parsed;
      saveCache();
      return parsed;
    }
  } catch(e) {
    console.error('[Geographic AI] AI hierarchy resolution failed:', e.message);
  }

  // Fallback if AI fails
  return {
    level: 'specific',
    stateName: null,
    hierarchy: [{
      districtName: locationName,
      mandals: [locationName]
    }]
  };
}

module.exports = {
  extractData,
  evaluateSERP,
  generateRefinedQuery,
  generateLocalities,
  generateNearbyLocations,
  analyzeGeographicScope,
  fetchOSMLocalities,
  getAllLocalities,
  correctLocationTypo,
  resolveHierarchy
};

// Note: Pre-compilation removed to unblock startup and enable lazy loading on demand

