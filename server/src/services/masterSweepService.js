/**
 * masterSweepService.js — dedicated orchestrator service for Master territorial sweeps.
 *
 * Exclusively handles District-wide and State-wide sweeps, boundary geometry,
 * mandal distribution, and the Out-of-Bound (OOB) rejection vault.
 * Client search requests never enter this service.
 */

const fs = require('fs');
const path = require('path');
const { SESSIONS_DIR } = require('../config/paths');
const dbAdapter = require('../config/dbAdapter');
const leadArchive = require('./leadArchive');
const outOfBoundsVault = require('./outOfBoundsVault');
const sweepScopePolicy = require('./sweepScopePolicy');
const { persistSessionVault } = require('./sessionVaultService');
const { addScrapeJob } = require('../utils/queue');
const { resolveScopeEngine } = require('./scopeEngines');

function buildMasterPlan(scope, name, options = {}) {
  const plan = sweepScopePolicy.buildScopeZones(scope, name, {
    category: options.category || 'General',
    isMaster: true,
    ...options
  });
  return plan;
}

function startMasterSweep({
  scope = 'district',
  name,
  category = 'General',
  sessionId,
  userId = 'master',
  enabledEngines = null,
  options = {}
}) {
  if (!name || !String(name).trim()) {
    throw new Error('Target location/name is required for a master sweep.');
  }

  const plan = buildMasterPlan(scope, name, { category, ...options });
  if (!plan) {
    throw new Error(`Could not build a master sweep plan for scope "${scope}" on "${name}".`);
  }

  const sid = sessionId || `master_${scope}_${Date.now().toString(36)}`;
  dbAdapter.registerSessionOwner(sid, userId);
  dbAdapter.registerSessionScope(sid, { userId, isMaster: true });

  const engines = Array.isArray(enabledEngines) && enabledEngines.length
    ? enabledEngines
    : ['maps', 'google-local-finder', 'justdial', 'openstreetmap'];

  // Dispatch orchestrator with unmetered master flag
  addScrapeJob(
    'scrapeOmniOrchestrator',
    [
      category,
      name,
      'broad',
      options.radius || 0,
      options.gridDensity || 0,
      engines,
      sid,
      userId,
      {},
      plan,
      true, // isMaster
      options.country || 'IN'
    ],
    10,
    { sessionId: sid, userId, isMaster: true, unmetered: true }
  );

  return {
    ok: true,
    sessionId: sid,
    scope,
    name,
    category,
    plan
  };
}

module.exports = {
  buildMasterPlan,
  startMasterSweep
};
