'use strict';

/**
 * engines/directories/index.js
 * Sovereign Directory & POI Coordinator across all 11 Nations:
 * - IN: JustDial Mobile JSON API (prewarmed ncatid + early-stop)
 * - US / CA: YellowPages TLS Sidecar + Deep SERP + OSM POI
 * - GB / AU / DE / FR / AE / SG / NZ / IE: OSM Commercial POIs + Deep Web SERP
 */

const { scrapeJustdialTurbo, scrapeJustdialSingleZone } = require('../justdial');
const { scrapeYellowpagesTls, scrapeDirectoryTls } = require('../tlsSidecar');
const { scrapeOsmCommercialPois } = require('../osmPoi');
const { scrapeDeepWebSerp } = require('../serp');
const { scrapeSulekha } = require('../sulekha');

async function scrapeSovereignSingleZone({
  country = 'IN',
  category,
  city,
  zoneName,
  zone = null,
  zoneIndex = 0,
  intentType = 'service',
  subcategories = [],
  onLead,
  signal,
  log = () => {}
}) {
  const cc = String(country || 'IN').toUpperCase();
  const fullLoc = zoneName ? `${zoneName}, ${city}` : city;
  const tasks = [];

  if (cc === 'IN') {
    const jdSubcats = zoneIndex < 36 ? subcategories.slice(0, 3) : subcategories.slice(0, 1);
    tasks.push(scrapeJustdialSingleZone({ category, city, zoneName, zone, zoneIndex, subcategories: jdSubcats, onLead, signal }).catch(() => null));
    if (zoneIndex < 16) {
      tasks.push(scrapeDeepWebSerp({ category, city: fullLoc, country: cc, maxPages: 2, onLead, signal }).catch(() => null));
    }
  } else if (cc === 'US' || cc === 'CA') {
    const queries = Array.from(new Set([category, ...(subcategories || []).slice(0, 5)].filter(Boolean)));
    for (const q of queries) {
      tasks.push(scrapeYellowpagesTls({ category: q, city: fullLoc, country: cc, maxPages: 4, onLead, log }).catch(() => null));
    }
    if (zoneIndex < 16) {
      tasks.push(scrapeDeepWebSerp({ category, city: fullLoc, country: cc, maxPages: 2, onLead, signal }).catch(() => null));
    }
  } else if (zoneIndex < 12) {
    const intlQueries = Array.from(new Set([category, ...(subcategories || []).slice(0, 2)].filter(Boolean)));
    for (const q of intlQueries) {
      if (cc === 'GB' || cc === 'AU' || cc === 'AE') {
        tasks.push(scrapeDirectoryTls({ category: q, city: zoneName || city, country: cc, maxPages: 1, onLead, log }).catch(() => null));
      }
      if (zoneIndex < 6) {
        tasks.push(scrapeDirectoryTls({ category: q, city: fullLoc, country: 'BING_LOCAL', maxPages: 1, onLead, log }).catch(() => null));
        tasks.push(scrapeDeepWebSerp({ category: q, city: fullLoc, country: cc, maxPages: 1, onLead, signal }).catch(() => null));
      }
    }
  }

  // Wave-0 already queries city-wide OSM bounds; only run per-zone OSM outside HQ or for non-IN markets
  if (zone && (cc !== 'IN' ? zoneIndex % 4 === 0 : (zone.isMasterTown || zone.isMandal) && zoneIndex % 6 === 0)) {
    tasks.push(scrapeOsmCommercialPois({ category, city, country: cc, intentType, zone, onLead, signal }).catch(() => null));
  }

  await Promise.allSettled(tasks);
  return [];
}

async function scrapeSovereignDirectory({
  country = 'IN',
  category,
  subcategories = [],
  city,
  zones = [],
  bounds = null,
  intentType = 'service',
  onLead,
  signal,
  log = () => {}
}) {
  const cc = String(country || 'IN').toUpperCase();
  const topQueries = Array.from(new Set([category, ...(subcategories || [])].filter(Boolean)));

  // Always launch QLever OSM Commercial POIs immediately across all 11 nations (~500ms, $0)
  const poiPromise = scrapeOsmCommercialPois({ category, city, country: cc, intentType, bounds, onLead, signal }).catch(() => null);
  const serpBurst = topQueries.slice(0, 5).map((q) =>
    scrapeDeepWebSerp({ category: q, city, country: cc, maxPages: 3, onLead, signal }).catch(() => null)
  );

  if (cc === 'IN') {
    await Promise.allSettled([
      poiPromise,
      ...serpBurst,
      ...topQueries.slice(0, 3).map((q) =>
        scrapeSulekha({ category: q, city, maxPages: 5, onLead, signal }).catch(() => null)
      ),
      ...topQueries.slice(0, 10).map((q) =>
        scrapeJustdialTurbo({ category: q, city, zones: zones.slice(0, 24), onLead, signal }).catch(() => null)
      )
    ]);
    return { success: true };
  }

  if (cc === 'US' || cc === 'CA') {
    await Promise.allSettled([
      poiPromise,
      ...serpBurst,
      ...topQueries.slice(0, 6).map((q) =>
        scrapeYellowpagesTls({ category: q, city, country: cc, onLead, log }).catch(() => null)
      )
    ]);
    return { success: true };
  }

  if (cc === 'GB' || cc === 'AU' || cc === 'AE') {
    await Promise.allSettled([
      poiPromise,
      ...serpBurst,
      ...topQueries.slice(0, 4).map((q) =>
        scrapeDirectoryTls({ category: q, city, country: cc, maxPages: 2, onLead, log }).catch(() => null)
      ),
      ...topQueries.slice(0, 2).map((q) =>
        scrapeDirectoryTls({ category: q, city, country: 'BING_LOCAL', maxPages: 1, onLead, log }).catch(() => null)
      )
    ]);
    return { success: true };
  }

  await Promise.allSettled([poiPromise, ...serpBurst]);
  return { success: true };
}

module.exports = {
  scrapeSovereignDirectory,
  scrapeSovereignSingleZone
};
