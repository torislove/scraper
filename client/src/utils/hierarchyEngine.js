// ─────────────────────────────────────────────────────────────────────────────
// Gomandap Hierarchy Engine (Frontend Port)
// Ported from server/src/utils/intelligentExtractor.js + scrape.js
// Uses bundled india_villages.json for zero-latency India lookups.
// Falls back to OSM Nominatim for global/unknown locations.
// ─────────────────────────────────────────────────────────────────────────────

// The JSON is bundled by Vite at build time — instant, zero network calls
import indiaGeoData from '../../../server/db/india_villages.json';

const MEMORY_KEY = 'gomandap_location_memory';

function getLocationsMemory() {
  try {
    return JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveLocationsMemory(mem) {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
  } catch {}
}

/**
 * Returns a flattened list of all known localities (states, districts, mandals).
 * Used by Fuse.js and Orama for instant search suggestions.
 */
export function getAllLocalities() {
  const locs = [];
  if (!indiaGeoData) return locs;

  for (const state of indiaGeoData) {
    if (state.state) locs.push({ type: 'state', name: state.state });
    if (!state.districts) continue;
    for (const dist of state.districts) {
      if (dist.district) locs.push({ type: 'district', name: dist.district });
      if (!dist.subDistricts) continue;
      for (const sub of dist.subDistricts) {
        if (sub.subDistrict) {
          locs.push({ type: 'mandal', name: sub.subDistrict, district: dist.district });
        }
      }
    }
  }

  const unique = [];
  const seen = new Set();
  for (const loc of locs) {
    const key = loc.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(loc);
    }
  }
  return unique;
}

/**
 * Breaks down a broad location (State → Districts → Mandals → Villages).
 * Mirror of generateLocalities() from intelligentExtractor.js.
 */
export function generateLocalities(broadLocation) {
  if (!broadLocation || !indiaGeoData) return [broadLocation];
  const searchName = broadLocation.toLowerCase().trim();

  for (const state of indiaGeoData) {
    // Match STATE → return all its districts
    if (state.state && state.state.toLowerCase() === searchName) {
      if (state.districts) {
        const districts = state.districts.map(d => `${d.district}, ${state.state}`).filter(Boolean);
        const mandals = [];
        for (const dist of state.districts) {
          if (dist.subDistricts) {
            for (const sub of dist.subDistricts) {
              if (sub.subDistrict) {
                mandals.push(`${sub.subDistrict}, ${dist.district}, ${state.state}`);
              }
            }
          }
        }
        return [...districts, ...mandals];
      }
    }

    if (!state.districts) continue;
    for (const dist of state.districts) {
      if (!dist.subDistricts) continue;

      // Match DISTRICT → return all Mandals
      if (dist.district && dist.district.toLowerCase() === searchName) {
        return dist.subDistricts.map(sd => sd.subDistrict).filter(Boolean);
      }

      for (const sub of dist.subDistricts) {
        // Match MANDAL → return all Villages
        if (sub.subDistrict && sub.subDistrict.toLowerCase() === searchName) {
          if (sub.villages && sub.villages.length > 0) {
            return sub.villages.filter(Boolean);
          }
          return [broadLocation];
        }

        // Match exact VILLAGE → return itself
        if (sub.villages) {
          for (const v of sub.villages) {
            if (v && v.toLowerCase() === searchName) return [broadLocation];
          }
        }
      }
    }
  }

  return null; // Signal: not found in local JSON → call OSM fallback
}

/**
 * Fetches localities from OSM Nominatim for regions not in the local JSON.
 * Note: Nominatim allows direct browser fetch (no CORS block).
 */
export async function fetchOSMLocalities(region, onLog = () => {}) {
  if (!region) return [];
  onLog(`[OSM Engine] Fetching sub-localities for: ${region}...`);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(region)}&format=json&addressdetails=1&limit=20`,
      { headers: { 'User-Agent': 'GomandapScraper/2.0 (contact@gomandap.com)' } }
    );
    if (!res.ok) throw new Error(`OSM HTTP ${res.status}`);
    const data = await res.json();
    return data.map(item => ({
      name: item.name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type
    })).filter(loc => loc.name && loc.lat && loc.lng);
  } catch (err) {
    onLog(`[OSM Engine] fetchOSMLocalities failed: ${err.message}`);
    return [];
  }
}

/**
 * Geocodes a location string using OSM Nominatim.
 * Ported from olaMaps.js (uses OSM which is free + no CORS).
 */
export async function geocodeLocation(locationQuery, onLog = () => {}) {
  if (!locationQuery?.trim()) return null;
  onLog(`[Geocoding] Resolving coordinates for: ${locationQuery}`);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=1&addressdetails=1`,
      { headers: { 'User-Agent': 'GomandapScraper/2.0 (contact@gomandap.com)' } }
    );
    if (!res.ok) throw new Error(`OSM HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.length > 0) {
      const best = data[0];
      return {
        formattedLocation: best.display_name,
        lat: parseFloat(best.lat),
        lng: parseFloat(best.lon),
        boundingbox: best.boundingbox ? best.boundingbox.map(parseFloat) : null
      };
    }
    return { formattedLocation: locationQuery, lat: null, lng: null, boundingbox: null };
  } catch (err) {
    onLog(`[Geocoding Error] ${err.message}`);
    return { formattedLocation: locationQuery, lat: null, lng: null, boundingbox: null };
  }
}

/**
 * Master function: Resolves a location into an array of specific sub-locations.
 * Checks memory cache first, then local JSON, then OSM.
 * Ported from getSubLocations() in scrape.js.
 */
export async function getSubLocations(locationName, onLog = () => {}) {
  if (!locationName) return [];
  const key = locationName.toLowerCase().trim();

  const memory = getLocationsMemory();
  if (memory[key]) {
    onLog(`[Hierarchy] Cache hit for "${locationName}" (${memory[key].length} targets)`);
    return memory[key];
  }

  const localResults = generateLocalities(locationName);
  if (localResults !== null && localResults.length > 0) {
    onLog(`[Hierarchy] Local JSON hit for "${locationName}": ${localResults.length} sub-locations`);
    memory[key] = localResults;
    saveLocationsMemory(memory);
    return localResults;
  }

  // OSM fallback
  onLog(`[Hierarchy] No local data for "${locationName}". Querying OSM...`);
  const osmResults = await fetchOSMLocalities(locationName, onLog);
  if (osmResults.length > 0) {
    const names = osmResults.map(r => r.name).filter(Boolean);
    memory[key] = names;
    saveLocationsMemory(memory);
    return names;
  }

  return [locationName]; // Ultimate fallback: just use what was given
}
