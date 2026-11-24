/**
 * Scope engines — one plan per territory, one rule for client vs Master.
 *
 * A search's territory decides which engines run and how far they fan out:
 *
 *   city     directory engines once for the settlement; zone map does the work
 *   mandal   same, but the zone map walks every village in the sub-district
 *   district JustDial also queried from up to 6 mandal towns        (Master)
 *   state    JustDial also queried from up to 8 district cities     (Master)
 *
 * Client searches are city/town/village/mandal only. If a client run somehow
 * arrives with a district or state plan it falls back to the city plan and says
 * so, instead of quietly starting a multi-hour sweep.
 */

const city = require('./city');
const mandal = require('./mandal');
const district = require('./district');
const state = require('./state');
const { makeHasEngine, normaliseEngines } = require('./engineMatch');
const { isWeddingIntent } = require('./base');

const MODULES = { city, mandal, district, state };
const MASTER_ONLY = new Set(['district', 'state']);
const ALIASES = {
  village: 'city',
  town: 'city',
  locality: 'city',
  metro: 'city',
  subdistrict: 'mandal',
  tehsil: 'mandal',
  taluk: 'mandal'
};

function normaliseScope(scope) {
  const key = String(scope || '').trim().toLowerCase();
  if (MODULES[key]) return key;
  return ALIASES[key] || 'city';
}

/**
 * @param {object} ctx
 * @param {string[]} ctx.engines        engine labels selected by the operator
 * @param {string}   ctx.category
 * @param {string}   ctx.searchPhrase
 * @param {string}   ctx.baseLocation
 * @param {string}   ctx.sessionId
 * @param {Array}    ctx.zones          resolved zones for this sweep
 * @param {object}   ctx.plan           scope plan (resolvedScope, district…)
 * @param {boolean}  ctx.isMaster
 */
function planScopeEngines(ctx = {}) {
  const hasEngine = makeHasEngine(ctx.engines);
  const requested = normaliseScope(ctx.plan?.resolvedScope || ctx.scope);
  const notes = [];
  let scope = requested;

  if (!ctx.isMaster && MASTER_ONLY.has(requested)) {
    scope = 'city';
    notes.push(`[Notice] "${requested}" resolution is an exclusive Master Edition capability. This sweep will execute at city and mandal resolution.`);
  }

  const module = MODULES[scope] || city;
  const plan = module.buildPlan({
    ...ctx,
    scope,
    hasEngine,
    engines: normaliseEngines(ctx.engines),
    weddingIntent: ctx.weddingIntent != null ? ctx.weddingIntent : isWeddingIntent(ctx.category)
  });

  return {
    ...plan,
    requestedScope: requested,
    clientAllowed: !MASTER_ONLY.has(requested) || Boolean(ctx.isMaster),
    scopeNotice: (!ctx.isMaster && MASTER_ONLY.has(requested))
      ? `Notice: "${requested}" resolution is an exclusive Master Edition capability. This search is running at city and mandal resolution.`
      : null,
    notes: [...notes, ...plan.notes]
  };
}

function listScopeEngines() {
  return [
    {
      id: 'city',
      label: 'City & Municipality Sweep',
      unitTerm: 'Commercial Zone',
      coverage: 'Localities, commercial centres, street grid, and peripheral rings',
      clientAllowed: true,
      maxZones: 400
    },
    {
      id: 'mandal',
      label: 'Mandal & Tehsil Sweep',
      unitTerm: 'Revenue Village',
      coverage: 'Mandal headquarter, commercial wards, and every revenue village',
      clientAllowed: true,
      maxZones: 400
    },
    {
      id: 'district',
      label: 'Whole District Master Sweep',
      unitTerm: 'Mandal & Village',
      coverage: 'Every mandal HQ, every revenue village, with surveyed boundary containment',
      clientAllowed: false,
      maxZones: 2600
    },
    {
      id: 'state',
      label: 'State-Wide Master Sweep',
      unitTerm: 'District & Tehsil',
      coverage: 'Every district HQ, major sub-district centres, and high-density trade hubs',
      clientAllowed: false,
      maxZones: 2600
    }
  ];
}

module.exports = { planScopeEngines, normaliseScope, MASTER_ONLY, MODULES, listScopeEngines };
