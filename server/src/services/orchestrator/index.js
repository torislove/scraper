/**
 * orchestrator/index.js
 * Unified facade re-exporting the modular search orchestrator and spatial boundary guards.
 */

const {
  getDistanceKm,
  formatEta,
  zoneCoverageKind,
  isGridZone,
  zoneKey,
  placeKey,
  SCOPE_REACH_KM,
  sweepReachKm,
  normalizeAdminName,
  normalizeMandalName,
  isInsideDistrictBoundary,
  isInsideSweepArea,
  leadBelongsToZone,
  nearestBoundaryZone,
  enforceMasterZoneContainment
} = require('./boundaryGuards');

const { runOmniSearchOrchestrator } = require('./orchestratorCore');

module.exports = {
  runOmniSearchOrchestrator,
  getDistanceKm,
  formatEta,
  zoneCoverageKind,
  isGridZone,
  zoneKey,
  placeKey,
  SCOPE_REACH_KM,
  sweepReachKm,
  normalizeAdminName,
  normalizeMandalName,
  isInsideDistrictBoundary,
  isInsideSweepArea,
  leadBelongsToZone,
  nearestBoundaryZone,
  enforceMasterZoneContainment
};
