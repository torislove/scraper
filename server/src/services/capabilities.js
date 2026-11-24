/**
 * capabilities.js — Single Source of Truth for Platform Capabilities
 * Defines which capabilities belong to Master Edition vs Client Edition.
 */

const MASTER_ONLY_CAPABILITIES = new Set([
  'district_sweep',
  'state_sweep',
  'master_sweep_preview',
  'engine_health_reset',
  'client_desk_management',
  'cross_client_leads',
  'cross_client_sessions',
  'live_client_sessions',
  'master_notifications_broadcast',
  'learned_taxonomy_inspection',
  'deep_batch_override'
]);

const CLIENT_ONLY_CAPABILITIES = new Set([
  'client_notifications_read',
  'workspace_status'
]);

function isMasterCapability(featureKey) {
  return MASTER_ONLY_CAPABILITIES.has(featureKey);
}

function getCapabilities(isMaster = false) {
  return {
    isMaster,
    canDistrictSweep: isMaster,
    canStateSweep: isMaster,
    canResetEngineHealth: isMaster,
    canManageClients: isMaster,
    canViewCrossClientLeads: isMaster,
    scopeResolutionLimit: isMaster ? 'state' : 'city_mandal'
  };
}

module.exports = {
  MASTER_ONLY_CAPABILITIES,
  CLIENT_ONLY_CAPABILITIES,
  isMasterCapability,
  getCapabilities
};
