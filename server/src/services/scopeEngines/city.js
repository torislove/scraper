/**
 * City / town / village engine plan.
 *
 * One settlement per search. Directory engines are queried once for the city;
 * the heavy lifting is done by the zone map (localities + street grid + ring).
 * Client searches are capped at 64 zones; Master may use 80.
 */

const { baseDirectoryJobs } = require('./base');

const LIMITS = {
  scope: 'city',
  zoneBudget: { client: Infinity, master: Infinity },
  justdialSwarm: 0,
  deepEnrich: true
};

function buildPlan(ctx) {
  return {
    scope: 'city',
    jobs: baseDirectoryJobs(ctx),
    swarmTowns: [],
    notes: [],
    limits: LIMITS
  };
}

module.exports = { buildPlan, LIMITS };
