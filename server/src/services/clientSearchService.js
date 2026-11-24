/**
 * clientSearchService.js — dedicated service for Client searches.
 *
 * Exclusively handles individual cities, mandals, towns, and localities.
 * Resolves district queries gracefully to primary urban centers so all 80+ zones
 * run in high-speed parallel without crashing or throwing 403 blocks.
 * Master sweep operations never enter this service.
 */

const dbAdapter = require('../config/dbAdapter');
const categoryRouter = require('./categoryRouter');
const { parseUniversalQuery } = require('../utils/universalQueryEngine');
const { classifyLocation, resolveUniversalZones } = require('../utils/universalGeoCluster');
const { addScrapeJob } = require('../utils/queue');

function buildClientPlan({ query, category, location, country = 'IN' }) {
  const fullInput = query || `${category || ''} in ${location || ''}`.trim();
  const parsedNL = parseUniversalQuery(fullInput);
  let resolvedCat = parsedNL.category || category;
  let resolvedLoc = parsedNL.location || location;

  if (!resolvedCat || !resolvedLoc) {
    throw new Error('Category and location are required. Send e.g. "plumbers in Vijayawada".');
  }

  // Graceful district handling: route district queries to primary urban center
  if (country === 'IN') {
    const locClassification = classifyLocation(resolvedLoc);
    if (locClassification.type === 'district') {
      const hqCity = locClassification.name.replace(/\b(district|dist|zila|jilla)\b/gi, '').trim() || resolvedLoc;
      resolvedLoc = hqCity;
    } else if (locClassification.type === 'state') {
      const capitalCity = (Array.isArray(locClassification.subZones) && locClassification.subZones[0]) || 'Hyderabad';
      resolvedLoc = capitalCity;
    }
  }

  const classification = categoryRouter.classifyCategory(resolvedCat);
  const resolvedEngines = country === 'IN'
    ? categoryRouter.pickAutoEngines(classification)
    : require('./sources/registry').enginesForCountry(country);

  const zones = resolveUniversalZones(resolvedLoc, resolvedCat, false, country) || [];

  return {
    category: resolvedCat,
    location: resolvedLoc,
    family: classification.family,
    familyLabel: classification.label,
    engines: resolvedEngines,
    zones,
    country
  };
}

function startClientSearch({
  query,
  category,
  location,
  sessionId,
  userId = 'anonymous',
  enabledEngines = null,
  options = {}
}) {
  const plan = buildClientPlan({
    query,
    category,
    location,
    country: options.country || 'IN'
  });

  const sid = sessionId || `client_omni_${Date.now().toString(36)}`;
  dbAdapter.registerSessionOwner(sid, userId);
  dbAdapter.registerSessionScope(sid, { userId, isMaster: false });

  const engines = (Array.isArray(enabledEngines) && enabledEngines.length)
    ? enabledEngines
    : plan.engines;

  addScrapeJob(
    'scrapeOmniOrchestrator',
    [
      plan.category,
      plan.location,
      options.strategy || 'broad',
      options.radius || 0,
      options.gridDensity || 0,
      engines,
      sid,
      userId,
      {},
      null, // standard client auto plan
      false, // isMaster = false
      plan.country
    ],
    10,
    { sessionId: sid, userId, isMaster: false, unmetered: true }
  );

  return {
    ok: true,
    sessionId: sid,
    plan
  };
}

module.exports = {
  buildClientPlan,
  startClientSearch
};
