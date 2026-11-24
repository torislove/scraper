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
  const jobs = baseDirectoryJobs(ctx);
  const notes = [];
  const swarmTowns = [];

  // Zone Swarm for Social Discovery:
  // Swarm mandal villages & revenue clusters in parallel for Instagram & Facebook
  if (ctx.hasEngine && (ctx.hasEngine('social') || ctx.hasEngine('social-dork') || ctx.hasEngine('social-dork-intl'))) {
    const rawZones = Array.isArray(ctx.zones) && ctx.zones.length ? ctx.zones : (Array.isArray(ctx.plan?.zones) ? ctx.plan.zones : []);
    const seenNames = new Set();
    const targetZones = rawZones
      .map(z => ({ name: z.zoneName || z.name, lat: z.lat, lng: z.lng, coverageKind: z.coverageKind }))
      .filter(z => {
        if (!z.name) return false;
        const norm = String(z.name).trim().toLowerCase();
        if (norm === String(ctx.baseLocation || '').trim().toLowerCase()) return false;
        if (z.coverageKind === 'grid' || /\b(grid|sector\s*\d+|near\s*\d+|coord)\b/i.test(norm)) return false;
        if (seenNames.has(norm)) return false;
        seenNames.add(norm);
        return true;
      })
      .slice(0, 2);

    if (targetZones.length > 0) {
      notes.push(`[Scope Engines] 🌐 Swarming Social Discovery across ${targetZones.length} mandal villages: ${targetZones.map(z => z.name).slice(0, 10).join(', ')}${targetZones.length > 10 ? ` +${targetZones.length - 10} more` : ''}`);
      for (const zone of targetZones) {
        swarmTowns.push(zone.name);
        for (const p of ['instagram.com', 'facebook.com', 'x.com']) {
          jobs.push({
            task: 'scrapeDuckDuckGoDork',
            args: [p, `${ctx.category} ${zone.name}`, ctx.category, zone.name, ctx.sessionId, ctx.countryCode || 'IN', ctx.userId || 'admin_1', { zoneName: zone.name, lat: zone.lat, lng: zone.lng }]
          });
        }
      }
    }
  }

  return {
    scope: 'mandal',
    jobs,
    swarmTowns,
    notes,
    limits: LIMITS
  };
}

module.exports = { buildPlan, LIMITS };
