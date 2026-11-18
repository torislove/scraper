/**
 * State engine plan (Master only).
 *
 * A state sweep covers every district HQ and every sub-district HQ in the zone
 * map. Directory engines are queried from the state HQ plus the major district
 * cities, because a state-level query usually returns the capital's results.
 *
 * Cap: eight extra centres. Enough to reach the biggest cities, small enough to
 * stay a polite client of each directory.
 */

const { baseDirectoryJobs, serpJobs } = require('./base');

const LIMITS = {
  scope: 'state',
  zoneBudget: { client: 0, master: Infinity },
  // No swarm cap: every district city in the state gets a JustDial query.
  justdialSwarm: Infinity,
  deepEnrich: true
};

function buildSwarmTowns({ zones, baseLocation }) {
  const base = String(baseLocation || '').replace(/\s*\([^)]*SWEEP\)/gi, '').trim().toLowerCase();
  const cities = (Array.isArray(zones) ? zones : [])
    .filter(zone => zone.kind === 'district')
    .map(zone => zone.zoneName)
    .filter(name => name && String(name).trim().toLowerCase() !== base);
  return [...new Set(cities)];
}

function buildPlan(ctx) {
  const serp = serpJobs(ctx);
  const swarmJobs = [];
  const swarmTowns = ctx.hasEngine('justdial') ? buildSwarmTowns(ctx) : [];
  const notes = [];

  if (swarmTowns.length) {
    notes.push(`[Orchestrator] 🚀 Swarming JustDial across ${swarmTowns.length} additional centers: ${swarmTowns.join(', ')}`);
    for (const town of swarmTowns) {
      swarmJobs.push({ task: 'scrapeJustDial', args: [ctx.category, town, 'omni', ctx.sessionId] });
    }
  }

  const jobs = [...serp, ...swarmJobs, ...baseDirectoryJobs(ctx, { skipSerp: true })];
  return { scope: 'state', jobs, swarmTowns, notes, limits: LIMITS };
}

module.exports = { buildPlan, LIMITS, buildSwarmTowns };
