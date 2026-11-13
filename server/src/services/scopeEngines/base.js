/**
 * Directory engines shared by every scope.
 *
 * A "directory job" is a city-level query against a listing site (Google
 * Search, marketplace, social dork). Those sites index a city, not a ward, so
 * queueing them once per sweep is correct at every scope. Scope-specific
 * modules add their own extras on top of this base.
 */

const WEDDING_INTENT = /wedding|marriage|shaadi|shadi|vivah|pelli|kalyana|kalyan|banquet|mandap|reception|engagement|haldi|sangeet|mehendi|bridal|bride|groom|caterer|catering|decorat|florist|invitation|lehenga|saree|jewel|honeymoon|event planner|event management|tent house|venue|function hall|convention/i;

function isWeddingIntent(category) {
  return WEDDING_INTENT.test(String(category || ''));
}

/**
 * @param {object} ctx
 * @param {string} ctx.category
 * @param {string} ctx.searchPhrase
 * @param {string} ctx.baseLocation
 * @param {string} ctx.sessionId
 * @param {(key: string) => boolean} ctx.hasEngine
 * @param {boolean} ctx.weddingIntent
 * @returns {Array<{ task: string, args: any[] }>}
 */
function serpJobs(ctx) {
  const { category, searchPhrase, baseLocation, sessionId, hasEngine } = ctx;
  if (!hasEngine('google-serp') && !hasEngine('serp')) return [];
  return [
    { task: 'scrapeGoogleSerp', args: [`${searchPhrase} in ${baseLocation}`, category, baseLocation, sessionId] },
    { task: 'scrapeGoogleSerp', args: [`top ${searchPhrase} in ${baseLocation} official website`, category, baseLocation, sessionId] }
  ];
}

function baseDirectoryJobs(ctx, { skipSerp = false } = {}) {
  const { category, baseLocation, sessionId, hasEngine, weddingIntent } = ctx;
  const jobs = skipSerp ? [] : serpJobs(ctx);
  if (hasEngine('weddingbazaar') && weddingIntent) {
    jobs.push({ task: 'scrapeWeddingBazaar', args: [category, baseLocation, 'omni', sessionId] });
  }
  if (hasEngine('weddingwire') && weddingIntent) {
    jobs.push({ task: 'scrapeWeddingWire', args: [category, baseLocation, 'omni', sessionId] });
  }
  if (hasEngine('mandap') && weddingIntent) {
    jobs.push({ task: 'scrapeMandap', args: [category, baseLocation, 'omni', sessionId] });
  }

  if (hasEngine('social')) {
    jobs.push({ task: 'scrapeDuckDuckGoDork', args: ['instagram.com', `${category} ${baseLocation}`, category, baseLocation, sessionId] });
    jobs.push({ task: 'scrapeDuckDuckGoDork', args: ['facebook.com', `${category} ${baseLocation}`, category, baseLocation, sessionId] });
  }
  // Brave is rate-limited on many networks, so it is only queued when the
  // operator explicitly asks for it — auto mode must not add a request that
  // the previous planner never made.
  const wantsBrave = (Array.isArray(ctx.engines) ? ctx.engines : []).some(engine => engine.includes('brave'));
  if (wantsBrave) {
    jobs.push({ task: 'scrapeBraveDork', args: ['instagram.com', `${category} ${baseLocation}`, category, baseLocation, sessionId] });
  }

  if (hasEngine('indiamart') && !weddingIntent) {
    jobs.push({ task: 'scrapePuppeteerIndiaMart', args: [category, baseLocation, 'omni', sessionId] });
  }

  return jobs;
}

module.exports = { baseDirectoryJobs, serpJobs, isWeddingIntent, WEDDING_INTENT };
