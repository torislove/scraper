/**
 * territoryHelper.js
 * High-performance territorial query engine for Scraper.co.in
 * Indexes all 36 Indian States & UTs, 633 Districts, 5,920 Mandals, and 619,290 Villages
 */

const fs = require('fs');
const path = require('path');

const VILLAGES_FILE = path.join(__dirname, '../../db/india_villages.json');

let cachedData = null;
let stateSummaries = null;

function loadTerritoryData() {
  if (cachedData) return cachedData;
  try {
    if (fs.existsSync(VILLAGES_FILE)) {
      cachedData = JSON.parse(fs.readFileSync(VILLAGES_FILE, 'utf-8'));
    } else {
      cachedData = [];
    }
  } catch (err) {
    console.error('[TerritoryHelper] Failed to load india_villages.json:', err.message);
    cachedData = [];
  }
  return cachedData;
}

function getTerritorySummary() {
  if (stateSummaries) return stateSummaries;
  const data = loadTerritoryData();
  stateSummaries = data.map(s => {
    const districts = (s.districts || []).map(d => ({
      name: d.district,
      mandalCount: (d.subDistricts || []).length,
      villageCount: (d.subDistricts || []).reduce((acc, sub) => acc + (sub.villages ? sub.villages.length : 0), 0)
    }));
    return {
      state: s.state,
      districtCount: districts.length,
      districts: districts
    };
  });
  return stateSummaries;
}

function searchTerritory(query, limit = 25) {
  if (!query || typeof query !== 'string') return [];
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const data = loadTerritoryData();
  const results = [];

  for (const s of data) {
    if (results.length >= limit) break;
    const stateName = s.state || '';
    const stateMatch = stateName.toLowerCase().includes(q);

    for (const d of (s.districts || [])) {
      if (results.length >= limit) break;
      const districtName = d.district || '';
      const districtMatch = districtName.toLowerCase().includes(q);

      if (districtMatch) {
        results.push({
          type: 'district',
          name: districtName,
          state: stateName,
          mandals: (d.subDistricts || []).length,
          villages: (d.subDistricts || []).reduce((acc, sub) => acc + (sub.villages ? sub.villages.length : 0), 0)
        });
        continue;
      }

      for (const sd of (d.subDistricts || [])) {
        if (results.length >= limit) break;
        const subName = sd.subDistrict || '';
        if (subName.toLowerCase().includes(q)) {
          results.push({
            type: 'mandal',
            name: subName,
            district: districtName,
            state: stateName,
            villages: (sd.villages || []).length
          });
          continue;
        }

        // Village check
        for (const v of (sd.villages || [])) {
          if (results.length >= limit) break;
          if (v && v.toLowerCase().includes(q)) {
            results.push({
              type: 'village',
              name: v,
              mandal: subName,
              district: districtName,
              state: stateName
            });
          }
        }
      }
    }
  }

  return results;
}

module.exports = {
  loadTerritoryData,
  getTerritorySummary,
  searchTerritory
};

