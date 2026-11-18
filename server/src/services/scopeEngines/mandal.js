/**
 * Mandal (sub-district) engine plan.
 *
 * A mandal sweep is exhaustive inside its own boundary: the HQ plus every
 * revenue village. Directory engines are still queried once at the mandal HQ —
 * JustDial and IndiaMART index the town name, not each village — while the
 * zone map walks every village.
 */

const { baseDirectoryJobs } = require('./base');

const LIMITS = {
  scope: 'mandal',
  zoneBudget: { client: Infinity, master: Infinity },
  justdialSwarm: 0,
  deepEnrich: true
};

function buildPlan(ctx) {
  return {
    scope: 'mandal',
    jobs: baseDirectoryJobs(ctx),
    swarmTowns: [],
    notes: [],
    limits: LIMITS
  };
}

module.exports = { buildPlan, LIMITS };
