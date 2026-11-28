'use strict';

/**
 * server/src/master/masterOrchestrator.js
 * Coordinates Master Fleet Sweeps (District & State only across 11 countries).
 * Enforces District HQ Urban Wards -> Towns -> Mandals ordering, and
 * delegates execution to the shared PolyglotOrchestrator with Master geo bounds.
 */

const orchestrator = require('../orchestrator');
const {
  validateMasterLocationAsync,
  suggestMasterLocations,
  resolveMasterTerritoryAsync
} = require('./masterGeoEngine');

async function startMasterSweep({
  query,
  location,
  country = 'IN',
  subcategories,
  selectedZones,
  resumeSessionId,
  maxLeads = 0,
  depth = 6,
  extractEmails = true,
  startZoneIndex = 0,
  maxStateDistricts = 12
}) {
  const cleanQuery = String(query || '').trim();
  const cleanLocation = String(location || '').trim();
  const cc = String(country || 'IN').toUpperCase();

  if (!cleanQuery || !cleanLocation) {
    throw new Error('Both category query and District/State location are required for Master Fleet.');
  }

  const territory = await resolveMasterTerritoryAsync(cleanLocation, cc, { maxStateDistricts });
  if (!territory.ok) {
    const err = new Error(territory.error || 'Master Fleet accepts only District or State names.');
    err.statusCode = 400;
    err.suggestions = territory.suggestions || [];
    throw err;
  }

  const geoOverride = {
    isMaster: true,
    scope: territory.scope,
    cityName: territory.locationName,
    locationName: territory.locationName,
    stateName: territory.stateName,
    hqCity: territory.hqCity,
    center: territory.center,
    bounds: territory.bounds,
    zones: territory.zones,
    totalAllPlaces: territory.zones.length,
    mode: `master_${territory.scope}`,
    counts: territory.counts,
    districts: territory.districts,
    labels: territory.labels
  };

  const result = await orchestrator.startSweep({
    query: cleanQuery,
    location: territory.locationName,
    country: cc,
    subcategories,
    zoneMode: `master_${territory.scope}`,
    selectedZones,
    resumeSessionId,
    maxLeads,
    depth,
    extractEmails,
    startZoneIndex,
    geoOverride
  });

  return {
    ...result,
    isMaster: true,
    scope: territory.scope,
    stateName: territory.stateName,
    hqCity: territory.hqCity,
    counts: territory.counts,
    labels: territory.labels,
    districts: territory.districts
  };
}

module.exports = {
  validateMasterLocationAsync,
  suggestMasterLocations,
  resolveMasterTerritoryAsync,
  startMasterSweep
};
