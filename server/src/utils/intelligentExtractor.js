const axios = require('axios');
const fs = require('fs');
const path = require('path');
const brain = require('../services/localBrain');
const { extractPhones } = require('./phoneUtils');

const cachePath = path.join(require('../config/paths').DATA_DIR, 'resolved_hierarchies.json');
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
 * Heuristic profile extraction from a vendor's own website.
 *
 * This has always been a local regex/heuristic pass — the old comment claiming
 * it called "DeepSeek-V4-Pro" was wrong. It now also uses the shared phone
 * parser, so mobile vs landline is decided by libphonenumber rather than by a
 * `[6-9]` shape regex.
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
    const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g;
    
    // Country-aware parser: pass { defaultCountry, allowInternational } from the
    // caller when the search is outside India. Defaults stay India-first.
    const parsedPhones = extractPhones(rawText, {
      allowInternational: true,
      trusted: false,
      context: 'phone contact call',
      defaultCountry: 'IN'
    }).slice(0, 3).map(p => p.e164);
    const phonesMatches = [...new Set(parsedPhones)];
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
 * Nearby places for a radius, resolved entirely from the local gazetteer.
 *
 * This used to ask an LLM to invent 5–10 towns, which is exactly the kind of
 * thing a language model gets subtly wrong. Now:
 *   - mandal/village -> sibling mandals in the same district
 *   - district        -> its mandals
 *   - state           -> its districts
 *   - unknown         -> just the location itself
 * The radius only caps how many results are returned.
 */
async function generateNearbyLocations(location, radiusKm) {
  const name = String(location || '').trim();
  if (!name) return [];
  const cacheKey = `nearby_${name.toLowerCase()}_${radiusKm}`;
  if (!resolvedCache[cacheKey]) loadCache();
  if (resolvedCache[cacheKey]) return resolvedCache[cacheKey];

  const hit = brain._gazetteer.lookup(name);
  let places = [name];
  if (hit.level === 'mandal') {
    places = [name, ...brain._gazetteer.subDistrictsOfDistrict(hit.district).filter(p => p.toLowerCase() !== name.toLowerCase())];
  } else if (hit.level === 'district') {
    places = [name, ...(hit.subDistricts || [])];
  } else if (hit.level === 'state') {
    places = [name, ...brain._gazetteer.districtsOfState(hit.state)];
  }

  // ~1.2 places per radius-km keeps dense districts bounded (max 12).
  const cap = Math.max(1, Math.min(12, Math.round((Number(radiusKm) || 10) * 1.2)));
  const result = [...new Set(places)].slice(0, cap);

  resolvedCache[cacheKey] = result;
  saveCache();
  return result;
}

/**
 * Analyzes a location to determine its geographic scope and returns
 * culturally accurate subdivisions. Answered locally by the gazetteer and the
 * curated country table — no network round trip, no key.
 */
async function analyzeGeographicScope(location) {
  if (!location || typeof location !== 'string') return { type: 'specific' };
  return brain.analyzeScope(location);
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
    // 0. Handle composite queries like "Chebrolu, Guntur" or "Chirala, Bapatla" or "Tenali, Guntur"
    const tokens = locationName.split(/[,\s]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
    if (tokens.length >= 2) {
      for (const state of indiaGeoData) {
        if (!state.districts) continue;
        for (const dist of state.districts) {
          const distNameLower = (dist.district || '').toLowerCase();
          if (tokens.includes(distNameLower)) {
            if (dist.subDistricts) {
              for (const sub of dist.subDistricts) {
                const subNameLower = (sub.subDistrict || '').toLowerCase();
                if (tokens.includes(subNameLower)) {
                  console.log(`[Geographic Local Lookup] Resolved composite "${locationName}" -> Mandal: ${sub.subDistrict}, District: ${dist.district}, State: ${state.state}`);
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
            const mandals = (dist.subDistricts || []).map(sd => sd.subDistrict).filter(Boolean);
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
    }

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
          if (sub.subDistrict && (sub.subDistrict.toLowerCase() === searchName || sub.subDistrict.toLowerCase().replace(/[^a-z0-9]/g, '') === searchNameClean)) {
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

  // Outside the Indian gazetteer: resolve country/region locally so the UI can
  // still offer a sensible scope, and never invent administrative divisions.
  const country = brain.detectCountry(locationName);
  if (country) {
    return {
      level: 'specific',
      stateName: null,
      country: country.code,
      countryName: country.name,
      hierarchy: [{ districtName: locationName, mandals: [locationName] }]
    };
  }

  return {
    level: 'specific',
    stateName: null,
    hierarchy: [{ districtName: locationName, mandals: [locationName] }]
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

