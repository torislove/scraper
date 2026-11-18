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
    jobs.push({ task: 'scrapeWeddingWire', args: [category, baseLocation, 'omni', sessionId, ctx.countryCode] });
  }
  if (hasEngine('mandap') && weddingIntent) {
    jobs.push({ task: 'scrapeMandap', args: [category, baseLocation, 'omni', sessionId] });
  }

  if (hasEngine('social') && ctx.countryCode === 'IN') {
    const platforms = ['instagram.com', 'facebook.com', 'linkedin.com'];
    for (const p of platforms) {
      jobs.push({
        task: 'scrapeDuckDuckGoDork',
        args: [p, `${category} ${baseLocation}`, category, baseLocation, sessionId, 'IN', ctx.userId || 'admin_1']
      });
    }
  }

  const countryCode = String(ctx.countryCode || 'IN').toUpperCase();

  // JustDial is India's largest local directory. It is a base job at every
  // scope, so a client city/mandal run and a Master district/state run all
  // query it once at the settlement. District/state plans add a swarm of town
  // queries on top of this.
  if (countryCode === 'IN' && hasEngine('justdial')) {
    jobs.push({ task: 'scrapeJustDial', args: [category, baseLocation, 'omni', sessionId] });
  }

  if (countryCode !== 'IN') {
    // 1. Yelp for US, CA, AU
    if (['US', 'CA', 'AU'].includes(countryCode) && (hasEngine('yelp') || !ctx.engines?.length || ctx.engines.includes('auto'))) {
      jobs.push({
        task: 'scrapeYelp',
        args: [category, baseLocation, sessionId, { countryCode }]
      });
    }

    // 2. Bing Places Local Directory (Global)
    if (hasEngine('bing-places') || hasEngine('bing') || !ctx.engines?.length || ctx.engines.includes('auto')) {
      jobs.push({
        task: 'scrapeBingPlaces',
        args: [category, baseLocation, sessionId, { countryCode }]
      });
    }

    // 3. TripAdvisor Global (Hospitality, dining, venues, events, tourism)
    if (hasEngine('tripadvisor') || weddingIntent || !ctx.engines?.length || ctx.engines.includes('auto')) {
      jobs.push({
        task: 'scrapeTripAdvisor',
        args: [category, baseLocation, sessionId, { countryCode }]
      });
    }

    // 4. Wikidata Open Business Graph (Global SPARQL)
    if (hasEngine('wikidata') || !ctx.engines?.length || ctx.engines.includes('auto')) {
      jobs.push({
        task: 'scrapeWikidata',
        args: [category, baseLocation, sessionId, countryCode]
      });
    }

    // 5. International Social & Web Contact Dorking
    if (hasEngine('social-dork') || hasEngine('social') || !ctx.engines?.length || ctx.engines.includes('auto')) {
      jobs.push({
        task: 'scrapeSocialDorkIntl',
        args: [category, baseLocation, sessionId, countryCode]
      });
    }

    // 6. YellowPages Global (US, UK, CA, AU, NZ, AE, SG, MY, ZA)
    if (hasEngine('yellowpages') || hasEngine('yell') || !ctx.engines?.length || ctx.engines.includes('auto')) {
      jobs.push({
        task: 'scrapeYellowPagesGlobal',
        args: [category, baseLocation, sessionId, { countryCode }]
      });
    }

    // 7. FreeIndex for United Kingdom
    if (['GB', 'UK'].includes(countryCode) && (hasEngine('freeindex') || !ctx.engines?.length || ctx.engines.includes('auto'))) {
      jobs.push({
        task: 'scrapeFreeIndexUK',
        args: [category, baseLocation, sessionId]
      });
    }

    // 8. GoldenPages for Ireland
    if (countryCode === 'IE' && (hasEngine('goldenpages') || !ctx.engines?.length || ctx.engines.includes('auto'))) {
      jobs.push({
        task: 'scrapeGoldenPagesIE',
        args: [category, baseLocation, sessionId]
      });
    }

    // 9. Cylex for UK, AU, CA, AE, SG, US
    if (['GB', 'UK', 'AU', 'CA', 'AE', 'SG', 'US'].includes(countryCode) && (hasEngine('cylex') || !ctx.engines?.length || ctx.engines.includes('auto'))) {
      jobs.push({
        task: 'scrapeCylex',
        args: [category, baseLocation, sessionId, { countryCode }]
      });
    }

    // 10. Trustpilot Verified Businesses
    if (hasEngine('trustpilot') || !ctx.engines?.length || ctx.engines.includes('auto')) {
      jobs.push({
        task: 'scrapeTrustpilot',
        args: [category, baseLocation, sessionId, { countryCode }]
      });
    }
  }
  // Brave is rate-limited on many networks, so it is only queued when the
  // operator explicitly asks for it — auto mode must not add a request that
  // the previous planner never made.
  const wantsBrave = (Array.isArray(ctx.engines) ? ctx.engines : []).some(engine => engine.includes('brave'));
  if (wantsBrave) {
    jobs.push({ task: 'scrapeBraveDork', args: ['instagram.com', `${category} ${baseLocation}`, category, baseLocation, sessionId] });
  }

  if (hasEngine('indiamart') && !weddingIntent && countryCode === 'IN') {
    jobs.push({ task: 'scrapePuppeteerIndiaMart', args: [category, baseLocation, 'omni', sessionId] });
  }

  return jobs;
}

module.exports = { baseDirectoryJobs, serpJobs, isWeddingIntent, WEDDING_INTENT };
