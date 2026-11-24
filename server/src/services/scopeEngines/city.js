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
  zoneBudget: { client: 24, master: 48 },
  justdialSwarm: 0,
  deepEnrich: true
};

function buildPlan(ctx) {
  const jobs = baseDirectoryJobs(ctx);
  const notes = [];
  const swarmTowns = [];

  // Zone Swarm for Social Discovery:
  // Swarm commercial zones & pockets in parallel for Instagram & Facebook across all countries
  if (ctx.hasEngine && (ctx.hasEngine('social') || ctx.hasEngine('social-dork') || ctx.hasEngine('social-dork-intl'))) {
    const rawZones = Array.isArray(ctx.zones) && ctx.zones.length ? ctx.zones : (Array.isArray(ctx.plan?.zones) ? ctx.plan.zones : []);
    const seenNames = new Set();
    const targetZones = rawZones
      .map(z => ({ name: z.zoneName || z.name, lat: z.lat, lng: z.lng, coverageKind: z.coverageKind }))
      .filter(z => {
        if (!z.name) return false;
        const norm = String(z.name).trim().toLowerCase();
        if (norm === String(ctx.baseLocation || '').trim().toLowerCase()) return false;
        // Exclude synthetic compass grid cells (Grid 54, Sector 3, near 16.5, etc.)
        if (z.coverageKind === 'grid' || /\b(grid|sector\s*\d+|near\s*\d+|coord)\b/i.test(norm)) return false;
        if (seenNames.has(norm)) return false;
        seenNames.add(norm);
        return true;
      })
      .slice(0, 2);

    if (targetZones.length > 0) {
      notes.push(`[Scope Engines] 🌐 Swarming Social Discovery across ${targetZones.length} zones: ${targetZones.map(z => z.name).slice(0, 10).join(', ')}${targetZones.length > 10 ? ` +${targetZones.length - 10} more` : ''}`);
      for (const zone of targetZones) {
        swarmTowns.push(zone.name);
        const socialPlatforms = ['instagram.com', 'facebook.com', 'x.com'];
        if (ctx.countryCode && String(ctx.countryCode).toUpperCase() !== 'IN') {
          socialPlatforms.push('tiktok.com');
        }
        for (const p of socialPlatforms) {
          jobs.push({
            task: 'scrapeDuckDuckGoDork',
            args: [p, `${ctx.category} ${zone.name}`, ctx.category, zone.name, ctx.sessionId, ctx.countryCode || 'IN', ctx.userId || 'admin_1', { zoneName: zone.name, lat: zone.lat, lng: zone.lng }]
          });
        }
      }
    }
  }

  return {
    scope: 'city',
    jobs,
    swarmTowns,
    notes,
    limits: LIMITS
  };
}

module.exports = { buildPlan, LIMITS };
