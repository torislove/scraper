/**
 * geo/index.js
 * Unified facade re-exporting all modular geo-spatial clustering and zonal intelligence.
 */

const { AUTHORITATIVE_CLUSTERS } = require('./clusters/india');
const { INTERNATIONAL_AUTHORITATIVE_CLUSTERS } = require('./clusters/international');
const {
  districtIndex,
  mandalIndex,
  villageIndex,
  stateIndex,
  initIndiaGeoMemory
} = require('./villageIndexer');
const {
  ZONE_COORDINATES,
  MANDAL_TYPOLOGY,
  getMandalTypology,
  STATE_CENTERS,
  cachedZoneCoords,
  spreadCoords,
  zoneCoordinates,
  GRID_CELL_KM,
  GRID_KM_PER_DEG_LAT,
  CITY_GRID_RING_KM,
  GRID_MAX_CELLS_PER_AXIS
} = require('./coordinates');
const {
  CATEGORY_SUBVECTORS,
  GENERIC_SUBVECTORS,
  INTERNATIONAL_GENERIC_SUBVECTORS,
  normalizeCategoryKey,
  buildCategorySubVectorZones
} = require('./subvectors');
const {
  distanceKm,
  compassLabel,
  buildCityGridZones,
  buildCityCoverage
} = require('./gridCoverage');
const { getUniversalCategoryVectors } = require('./universalCategoryVectors');
const {
  resolveUniversalZones,
  keyOf,
  classifyLocation
} = require('./resolvers');

module.exports = {
  resolveUniversalZones,
  buildCityGridZones,
  buildCityCoverage,
  buildCategorySubVectorZones,
  getUniversalCategoryVectors,
  classifyLocation,
  zoneCoordinates,
  cachedZoneCoords,
  spreadCoords,
  distanceKm,
  compassLabel,
  keyOf,
  initIndiaGeoMemory,
  AUTHORITATIVE_CLUSTERS,
  INTERNATIONAL_AUTHORITATIVE_CLUSTERS,
  ZONE_COORDINATES,
  STATE_CENTERS,
  mandalIndex,
  districtIndex,
  villageIndex,
  stateIndex,
  MANDAL_TYPOLOGY,
  getMandalTypology,
  CATEGORY_SUBVECTORS,
  GENERIC_SUBVECTORS,
  INTERNATIONAL_GENERIC_SUBVECTORS,
  normalizeCategoryKey,
  GRID_CELL_KM,
  GRID_KM_PER_DEG_LAT,
  CITY_GRID_RING_KM,
  GRID_MAX_CELLS_PER_AXIS
};
