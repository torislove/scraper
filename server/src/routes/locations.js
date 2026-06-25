const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { geocodeLocation, getCache: getGeocodeCache } = require('../utils/olaMaps');

const LOCATIONS_MEMORY_FILE = path.join(__dirname, '../../db/locations_memory.json');

let warmingStatus = {
  active: false,
  stateName: '',
  totalDistricts: 0,
  completedDistricts: 0,
  activeDistrict: '',
  totalMandals: 0,
  completedMandals: 0,
  activeMandal: '',
  resolvedPoints: []
};
let abortWarming = false;

function getLocationsMemory() {
  if (fs.existsSync(LOCATIONS_MEMORY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOCATIONS_MEMORY_FILE, 'utf-8'));
    } catch(e) {
      return {};
    }
  }
  return {};
}

function saveLocationsMemory(data) {
  try {
    if (!fs.existsSync(path.dirname(LOCATIONS_MEMORY_FILE))) {
      fs.mkdirSync(path.dirname(LOCATIONS_MEMORY_FILE), { recursive: true });
    }
    fs.writeFileSync(LOCATIONS_MEMORY_FILE, JSON.stringify(data, null, 2));
  } catch(e) {
    console.error("Failed to save locations memory:", e);
  }
}

async function resolveMandalSublocations(mandalName, stateName = '') {
  const memory = getLocationsMemory();
  const key = mandalName.toLowerCase().trim();
  if (memory[key] && memory[key].length > 0) {
    return memory[key];
  }
  const intelligentExtractor = require('../utils/intelligentExtractor');
  const results = await intelligentExtractor.generateLocalities(mandalName, stateName);
  if (results && results.length > 0) {
    memory[key] = results;
    saveLocationsMemory(memory);
  }
  return results || [mandalName];
}

router.get('/warm-state/status', (req, res) => {
  res.json(warmingStatus);
});

router.post('/warm-state/stop', (req, res) => {
  abortWarming = true;
  warmingStatus.active = false;
  res.json({ message: 'Warming stopped successfully.' });
});

router.post('/warm-state', async (req, res) => {
  const { stateName } = req.body;
  if (!stateName) return res.status(400).json({ error: 'stateName is required' });

  if (warmingStatus.active) {
    return res.status(400).json({ error: 'A state warming process is already active.' });
  }

  // Reset status
  warmingStatus = {
    active: true,
    stateName,
    totalDistricts: 0,
    completedDistricts: 0,
    activeDistrict: 'Initializing...',
    totalMandals: 0,
    completedMandals: 0,
    activeMandal: 'Initializing...',
    resolvedPoints: []
  };
  abortWarming = false;

  // Send immediate response as it runs in background
  res.json({ message: `Auto-parsing initiated in background for state: ${stateName}` });

  // Background Task Execution
  (async () => {
    try {
      const intelligentExtractor = require('../utils/intelligentExtractor');
      console.log(`[Background Warmer] Starting geography resolution for state: ${stateName}`);
      const hierarchyResult = await intelligentExtractor.resolveHierarchy(stateName);
      
      if (!hierarchyResult || !Array.isArray(hierarchyResult.hierarchy)) {
        console.warn(`[Background Warmer] Failed to resolve hierarchy for state: ${stateName}`);
        warmingStatus.active = false;
        return;
      }

      const districts = hierarchyResult.hierarchy;
      warmingStatus.totalDistricts = districts.length;

      for (let i = 0; i < districts.length; i++) {
        if (abortWarming) break;

        const distObj = districts[i];
        const district = distObj.districtName;
        warmingStatus.activeDistrict = district;

        // Ensure we have mandals resolved for this district
        let mandals = distObj.mandals || [];
        if (mandals.length === 0) {
          const distHierarchy = await intelligentExtractor.resolveHierarchy(district);
          if (distHierarchy && distHierarchy.hierarchy && distHierarchy.hierarchy[0]) {
            mandals = distHierarchy.hierarchy[0].mandals || [];
          }
        }
        if (mandals.length === 0) {
          mandals = [district];
        }

        warmingStatus.totalMandals += mandals.length;

        for (let m = 0; m < mandals.length; m++) {
          if (abortWarming) break;

          const mandal = mandals[m];
          warmingStatus.activeMandal = mandal;

          // 1. Resolve villages (adds to locations_memory.json)
          await resolveMandalSublocations(mandal, stateName);

          // 2. Geocode mandal
          const queryStr = `${mandal}, ${district}, ${stateName}`;
          const cacheKey = queryStr.toLowerCase().trim();
          const geocodeCache = getGeocodeCache();
          const isCacheHit = !!(geocodeCache[cacheKey] && geocodeCache[cacheKey].lat);

          try {
            const geo = await geocodeLocation(queryStr);
            if (geo && geo.lat) {
              warmingStatus.resolvedPoints.push({
                name: `${mandal} (${district})`,
                lat: geo.lat,
                lng: geo.lng
              });
            }
          } catch (err) {
            console.error(`[Background Warmer] Failed to geocode "${queryStr}":`, err.message);
          }

          warmingStatus.completedMandals++;

          // Safe throttle to protect Nominatim TOS on cache misses
          if (!isCacheHit) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        warmingStatus.completedDistricts++;
      }
      console.log(`[Background Warmer] Geography resolution complete for state: ${stateName}`);
    } catch (err) {
      console.error(`[Background Warmer Error]`, err.message);
    } finally {
      warmingStatus.active = false;
    }
  })();
});

router.get('/memory', (req, res) => {
  if (fs.existsSync(LOCATIONS_MEMORY_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(LOCATIONS_MEMORY_FILE, 'utf-8'));
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Failed to parse memory file' });
    }
  } else {
    res.json({}); // Return empty if not yet created
  }
});

router.post('/geocode', async (req, res) => {
  try {
    const { locations } = req.body;
    if (!locations || !Array.isArray(locations)) return res.status(400).json({ error: 'Array of locations required' });

    let results = [];
    for (const loc of locations) {
      const geo = await geocodeLocation(loc);
      if (geo && geo.lat) {
        results.push({ name: loc, lat: geo.lat, lng: geo.lng });
      }
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch OSM specific coordinates directly
router.post('/osm', async (req, res) => {
  try {
    const { district } = req.body;
    if (!district) return res.status(400).json({ error: 'district required' });
    const intelligentExtractor = require('../utils/intelligentExtractor');
    const results = await intelligentExtractor.fetchOSMLocalities(district);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
