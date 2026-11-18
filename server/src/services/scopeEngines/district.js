/**
 * District engine plan (Master only).
 *
 * A district sweep already walks every mandal and every village, so directory
 * engines are the only part that has to be widened: JustDial is queried from
 * the district HQ plus the largest mandal towns, because a single "X in
 * District" query misses the towns that JustDial indexes separately.
 *
 * The swarm is capped: extra centres improve yield, but each one is another
 * automated request against a third-party site, and politeness wins over a
 * handful of rows.
 */

const { baseDirectoryJobs, serpJobs } = require('./base');

const LIMITS = {
  scope: 'district',
  zoneBudget: { client: 0, master: Infinity },
  // No swarm cap: JustDial is queried from the HQ and every resolved town.
  justdialSwarm: Infinity,
  deepEnrich: true
};

function cleanBaseName(baseLocation) {
  return String(baseLocation || '').replace(/\s*\([^)]*SWEEP\)/gi, '').trim().toLowerCase();
}

function buildSwarmTowns({ zones, plan, baseLocation }) {
  const skip = new Set([cleanBaseName(baseLocation), String(plan?.district || '').trim().toLowerCase()].filter(Boolean));
  const towns = (Array.isArray(zones) ? zones : [])
    .map(zone => zone.zoneName)
    .filter(name => name && !skip.has(String(name).trim().toLowerCase()));
  return [...new Set(towns)];
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

  // Same dispatch order as before the split: search, JustDial swarm, then the
  // marketplace/social engines.
  const jobs = [...serp, ...swarmJobs, ...baseDirectoryJobs(ctx, { skipSerp: true })];
  return { scope: 'district', jobs, swarmTowns, notes, limits: LIMITS };
}

module.exports = { buildPlan, LIMITS, buildSwarmTowns };
