'use strict';

/**
 * scripts/warm-osm-cities.mjs
 * Pre-warms server/db/geo_cache.json with zero-cost OSM QLever + Nominatim Polygon
 * zone resolution for flagship hubs across all 11 Sovereign Nations.
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const geo = require('../server/src/geo');
const { COUNTRY_CITIES } = require('../server/src/routes/geoRoutes');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const pairs = [];
  for (const [cc, cities] of Object.entries(COUNTRY_CITIES)) {
    for (const city of cities) pairs.push([city, cc]);
  }
  console.log(`[warm-osm] Warming ${pairs.length} cities across 11 nations...`);

  for (const [city, cc] of pairs) {
    try {
      const res = await geo.resolveZonesAsync(city, cc, { zoneMode: 'smart' });
      console.log(
        `  [${cc}] ${city.padEnd(14)} -> smart=${String(res.smartCount).padStart(3)} | all=${String(res.totalAllPlaces).padStart(3)} | ${res.resolutionMeta?.cached ? 'CACHE' : 'LIVE '}`
      );
      if (!res.resolutionMeta?.cached) await sleep(350);
    } catch (err) {
      console.log(`  [${cc}] ${city} -> err: ${err.message}`);
    }
  }
  console.log('[warm-osm] Done.');
}

main();
