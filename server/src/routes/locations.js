const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { geocodeLocation, getCache: getGeocodeCache } = require('../utils/olaMaps');

const LOCATIONS_MEMORY_FILE = path.join(require('../config/paths').DB_DIR, 'locations_memory.json');

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

// Instant pan-India autocomplete (states → districts → mandals → villages)
// Never calls Nominatim, so it is safe to run on every keystroke.
router.get('/suggest', (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const limit = Math.max(1, Math.min(25, Number(req.query.limit) || 10));
    const indiaGeoIndex = require('../utils/indiaGeoIndex');
    const results = indiaGeoIndex.searchLocations(q, limit);
    res.json(results);
  } catch (err) {
    console.error('[Location Suggest Error]', err.message);
    res.json([]);
  }
});

router.get('/stats', (req, res) => {
  try {
    const indiaGeoIndex = require('../utils/indiaGeoIndex');
    indiaGeoIndex.load();
    res.json(indiaGeoIndex.getStats());
  } catch (err) {
    res.status(500).json({ error: err.message });

/**
 * GET /api/locations/hierarchy
 * Returns States, Districts, Mandals from universalGeoCluster local memory index (0ms)
 */
router.get('/hierarchy', (req, res) => {
  try {
    const { stateIndex, districtIndex, mandalIndex, AUTHORITATIVE_CLUSTERS } = require('../utils/universalGeoCluster');
    const { state, district, mandal } = req.query;

    if (mandal) {
      const cleanM = mandal.toLowerCase().replace(/[^a-z0-9]/g, '');
      const entry = mandalIndex.get(cleanM);
      return res.json({
        ok: true,
        type: 'mandal',
        name: entry?.subDistrict || mandal,
        district: entry?.district || '',
        state: entry?.state || '',
        villages: entry?.villages || []
      });
    }

    if (district) {
      const cleanD = district.toLowerCase().replace(/[^a-z0-9]/g, '');
      const entry = districtIndex.get(cleanD);
      return res.json({
        ok: true,
        type: 'district',
        name: entry?.district || district,
        state: entry?.state || '',
        mandals: entry?.mandals || []
      });
    }

    if (state) {
      const cleanS = state.toLowerCase().replace(/[^a-z0-9]/g, '');
      const entry = stateIndex.get(cleanS);
      return res.json({
        ok: true,
        type: 'state',
        name: entry?.state || state,
        districts: entry?.districts || []
      });
    }

    const states = Array.from(stateIndex.values()).map(s => s.state).sort();
    const cities = Object.keys(AUTHORITATIVE_CLUSTERS).map(c => c.charAt(0).toUpperCase() + c.slice(1));
    return res.json({
      ok: true,
      states,
      cities,
      totalStates: stateIndex.size,
      totalDistricts: districtIndex.size,
      totalMandals: mandalIndex.size
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

  }
});

// Universal Search & Autocomplete
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q || q.trim().length === 0) return res.json([]);
    const { autocompleteLocation, geocodeLocation } = require('../utils/olaMaps');
    const autoList = await autocompleteLocation(q);
    const results = autoList.map(text => ({
      display: text,
      name: text
    }));
    res.json(results);
  } catch (err) {
    console.error('[Location Search API Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/autocomplete', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q || q.trim().length === 0) return res.json([]);
    const { autocompleteLocation } = require('../utils/olaMaps');
    const results = await autocompleteLocation(q);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Intelligent Intent & Geographic Territory Detection
router.get('/detect-intent', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ category: '', hasLocation: false, suggestions: [] });

    const intelligentExtractor = require('../utils/intelligentExtractor');
    const { parseNaturalLanguageQuery } = require('../utils/queryParser');
    
    // Parse using NLP query parser
    const parsed = parseNaturalLanguageQuery(q);
    let rawCategory = parsed.category || q;
    let rawLocation = parsed.location || '';

    const indiaGeoIndex = require('../utils/indiaGeoIndex');
    let detectedGeo = null;

    if (rawLocation) {
      detectedGeo = await indiaGeoIndex.resolveHierarchy(rawLocation);
    } else {
      // Check words in query from right to left (location usually comes after 'in' or at end)
      const words = q.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        const candidate = words.slice(i).join(' ').trim();
        const resolved = await indiaGeoIndex.resolveHierarchy(candidate);
        if (resolved) {
          detectedGeo = resolved;
          rawCategory = words.slice(0, i).join(' ') || rawCategory;
          break;
        }
      }
    }

    if (detectedGeo) {
      return res.json({
        category: rawCategory.replace(/\s+in\s*$/i, '').trim(),
        hasLocation: true,
        detectedLocation: detectedGeo
      });
    }

    // No location detected in query -> return prompt asking for city/district with intelligent suggestions
    res.json({
      category: rawCategory.trim(),
      hasLocation: false,
      message: `Which city or district would you like to search for "${rawCategory.trim()}"?`,
      suggestions: [
        { name: 'Chebrolu', district: 'Guntur', state: 'Andhra Pradesh', label: 'Chebrolu, Guntur (AP)', isDefault: true },
        { name: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', label: 'Guntur City (AP)' },
        { name: 'Nalgonda', district: 'Nalgonda', state: 'Telangana', label: 'Nalgonda (Telangana)' },
        { name: 'Vijayawada', district: 'NTR', state: 'Andhra Pradesh', label: 'Vijayawada (NTR, AP)' },
        { name: 'Chirala', district: 'Bapatla', state: 'Andhra Pradesh', label: 'Chirala (Bapatla, AP)' },
        { name: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', label: 'Hyderabad (Telangana)' }
      ]
    });
  } catch (err) {
    console.error('[Detect Intent Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
