const fs = require('fs');
const path = require('path');

const resolvedHierarchiesPath = path.join(__dirname, 'data/resolved_hierarchies.json');
const forwardCachePath = path.join(__dirname, 'data/forwardGeocodeCache.json');

// Clear any previously cached failed (empty) results on disk before requiring olaMaps!
if (fs.existsSync(forwardCachePath)) {
  try {
    const forwardCache = JSON.parse(fs.readFileSync(forwardCachePath, 'utf8'));
    let clearedCount = 0;
    for (const key of Object.keys(forwardCache)) {
      if (forwardCache[key] && forwardCache[key].lat === null) {
        delete forwardCache[key];
        clearedCount++;
      }
    }
    if (clearedCount > 0) {
      console.log(`Cleared ${clearedCount} empty cache entries from forwardGeocodeCache.json for retry.`);
      fs.writeFileSync(forwardCachePath, JSON.stringify(forwardCache, null, 2));
    }
  } catch (err) {
    console.error('Failed to pre-clean forward cache on disk:', err.message);
  }
}

// Now require olaMaps, which will load the cleaned cache from disk
const { geocodeLocation } = require('./src/utils/olaMaps');

// Helper to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('=== GEOGRAPHIC FORWARD GEOCODING CACHE WARMER ===');

  if (!fs.existsSync(resolvedHierarchiesPath)) {
    console.error(`Error: Resolved hierarchies file not found at ${resolvedHierarchiesPath}. Please run warm_all_districts.js first.`);
    process.exit(1);
  }

  let resolvedHierarchies = {};
  try {
    resolvedHierarchies = JSON.parse(fs.readFileSync(resolvedHierarchiesPath, 'utf8'));
  } catch (err) {
    console.error('Error parsing resolved hierarchies:', err.message);
    process.exit(1);
  }

  let forwardCache = {};
  if (fs.existsSync(forwardCachePath)) {
    try {
      forwardCache = JSON.parse(fs.readFileSync(forwardCachePath, 'utf8'));
    } catch (err) {
      forwardCache = {};
    }
  }

  // Define target states to warm
  const targetStates = ['telangana', 'andhra pradesh'];
  const targets = [];

  for (const stateKey of Object.keys(resolvedHierarchies)) {
    if (!targetStates.includes(stateKey.toLowerCase())) continue;

    const stateData = resolvedHierarchies[stateKey];
    const stateName = stateData.stateName || (stateKey === 'telangana' ? 'Telangana' : 'Andhra Pradesh');
    
    if (stateData && Array.isArray(stateData.hierarchy)) {
      for (const distObj of stateData.hierarchy) {
        const district = distObj.districtName;
        const mandals = distObj.mandals || [];

        for (const mandal of mandals) {
          const queryStr = `${mandal.trim()}, ${district.trim()}, ${stateName.trim()}`;
          const cacheKey = queryStr.toLowerCase().trim();
          
          targets.push({
            query: queryStr,
            cacheKey,
            state: stateName,
            district,
            mandal
          });
        }
      }
    }
  }

  console.log(`Found ${targets.length} total targets to warm.`);
  
  let processed = 0;
  let cacheHits = 0;
  let cacheMisses = 0;
  let errors = 0;

  for (const target of targets) {
    processed++;
    
    // Check if already in cache
    if (forwardCache[target.cacheKey] && forwardCache[target.cacheKey].lat) {
      cacheHits++;
      if (processed % 100 === 0 || processed === targets.length) {
        console.log(`[Progress] ${processed}/${targets.length} processed. Cache Hits: ${cacheHits}, Cache Misses: ${cacheMisses}`);
      }
      continue;
    }

    // Cache miss: geocode using Nominatim
    console.log(`[Cache Miss] Geocoding: "${target.query}" (${processed}/${targets.length})`);
    try {
      const result = await geocodeLocation(target.query);
      if (result && result.lat) {
        cacheMisses++;
        console.log(`  -> Resolved: ${result.lat}, ${result.lng}`);
      } else {
        errors++;
        console.warn(`  -> Failed to resolve coordinates.`);
      }
    } catch (err) {
      errors++;
      console.error(`  -> Error resolving "${target.query}":`, err.message);
    }

    // Reload cache memory to ensure we have latest saved content (in case write happened elsewhere)
    if (fs.existsSync(forwardCachePath)) {
      try {
        forwardCache = JSON.parse(fs.readFileSync(forwardCachePath, 'utf8'));
      } catch (e) {}
    }

    // Wait exactly 1 second to respect Nominatim API rate limits
    await sleep(1000);
  }

  console.log('\n=== WARMING COMPLETED ===');
  console.log(`Total Targets: ${targets.length}`);
  console.log(`Cache Hits: ${cacheHits}`);
  console.log(`Cache Misses (New Geocodes): ${cacheMisses}`);
  console.log(`Errors/Unresolved: ${errors}`);
  console.log(`Cache file populated at: ${forwardCachePath}`);
}

run();
