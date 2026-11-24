/**
 * Directory engines shared by every scope.
 *
 * A "directory job" is a city-level query against a listing site (Google
 * Search, marketplace, social dork). Those sites index a city, not a ward, so
 * queueing them once per sweep is correct at every scope. Scope-specific
 * modules add their own extras on top of this base.
 */

const WEDDING_INTENT = /wedding|marriage|shaadi|shadi|vivah|pelli|kalyana|kalyan|banquet|mandap|reception|engagement|haldi|sangeet|mehendi|bridal|bride|groom|caterer|catering|decorat|florist|invitation|lehenga|saree|jewel|honeymoon|event planner|event management|tent house|venue|function hall|convention/i;

// The registry names a few engines differently from the task keys used here.
// Without this map the country bundle could never be consulted, and every
// international engine ran in every country regardless of whether the registry
// said it serves that market.
const BUNDLE_KEY = {
  wikidata: 'wikidata-businesses',
  social: 'social-dork-intl',
  'social-dork': 'social-dork-intl',
  freeindex: 'freeindex-uk',
  goldenpages: 'goldenpages-ie',
  bing: 'bing-places',
  yell: 'yellowpages'
};

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

  const countryCode = String(ctx.countryCode || 'IN').toUpperCase();

  // The country bundle is authoritative, not advisory. `hasEngine` answers
  // "did the operator tick this?", the bundle answers "does this engine serve
  // this market at all?". Both must be true. This is what makes removing an
  // engine from the registry actually stop it running.
  let bundle = null;
  try {
    const { enginesForCountry } = require('../sources/registry');
    bundle = new Set(enginesForCountry(countryCode));
  } catch (error) {
    bundle = null; // registry unavailable: fall back to hasEngine alone
  }
  const allowed = key => {
    if (!hasEngine(key)) return false;
    if (!bundle) return true;
    return bundle.has(BUNDLE_KEY[key] || key);
  };

  const jobs = skipSerp ? [] : serpJobs({ ...ctx, hasEngine: allowed });

  if (allowed('weddingbazaar') && weddingIntent) {
    jobs.push({ task: 'scrapeWeddingBazaar', args: [category, baseLocation, 'omni', sessionId] });
  }
  if (allowed('weddingwire') && weddingIntent) {
    jobs.push({ task: 'scrapeWeddingWire', args: [category, baseLocation, 'omni', sessionId, countryCode] });
  }
  if (allowed('mandap') && weddingIntent) {
    jobs.push({ task: 'scrapeMandap', args: [category, baseLocation, 'omni', sessionId] });
  }

  if (allowed('social') || allowed('social-dork') || allowed('social-dork-intl')) {
    const platforms = ['instagram.com', 'facebook.com', 'x.com'];
    if (countryCode !== 'IN') {
      platforms.push('tiktok.com');
    }
    for (const p of platforms) {
      jobs.push({
        task: 'scrapeDuckDuckGoDork',
        args: [p, `${category} ${baseLocation}`, category, baseLocation, sessionId, countryCode || 'IN', ctx.userId || 'admin_1', { zoneName: baseLocation }]
      });
    }
  }

  // JustDial is India's largest local directory. It is a base job at every
  // scope, so a client city/mandal run and a Master district/state run all
  // query it once at the settlement. District/state plans add a swarm of town
  // queries on top of this.
  if (countryCode === 'IN' && allowed('justdial')) {
    jobs.push({ task: 'scrapeJustDial', args: [category, baseLocation, 'omni', sessionId] });
  }

  if (countryCode !== 'IN') {
    // 1. Yelp for US, CA, AU
    if (['US', 'CA', 'AU'].includes(countryCode) && allowed('yelp')) {
      jobs.push({
        task: 'scrapeYelp',
        args: [category, baseLocation, sessionId, { countryCode }]
      });
    }

    // 2. Bing Places Local Directory (Global)
    if (allowed('bing-places')) {
      jobs.push({
        task: 'scrapeBingPlaces',
        args: [category, baseLocation, sessionId, { countryCode }]
      });
    }

    // 3. TripAdvisor Global (Hospitality, dining, venues, events, tourism)
    if (allowed('tripadvisor') || weddingIntent) {
      if (allowed('tripadvisor')) {
        jobs.push({
          task: 'scrapeTripAdvisor',
          args: [category, baseLocation, sessionId, { countryCode }]
        });
      }
    }

    // 4. Wikidata Open Business Graph (Global SPARQL)
    if (allowed('wikidata')) {
      jobs.push({
        task: 'scrapeWikidata',
        args: [category, baseLocation, sessionId, countryCode]
      });
    }

    // 5. International Social & Web Contact Dorking
    if (allowed('social-dork')) {
      jobs.push({
        task: 'scrapeSocialDorkIntl',
        args: [category, baseLocation, sessionId, countryCode]
      });
    }

    // 6. YellowPages Global (US, UK, CA, AU, NZ, AE, SG, ZA)
    if (allowed('yellowpages')) {
      jobs.push({
        task: 'scrapeYellowPagesGlobal',
        args: [category, baseLocation, sessionId, { countryCode }]
      });
    }

    // 7. FreeIndex for United Kingdom
    if (['GB', 'UK'].includes(countryCode) && allowed('freeindex')) {
      jobs.push({
        task: 'scrapeFreeIndexUK',
        args: [category, baseLocation, sessionId]
      });
    }

    // 8. GoldenPages for Ireland
    if (countryCode === 'IE' && allowed('goldenpages')) {
      jobs.push({
        task: 'scrapeGoldenPagesIE',
        args: [category, baseLocation, sessionId]
      });
    }

    // 9. Cylex for UK, AU, CA, AE, SG, US
    if (['GB', 'UK', 'AU', 'CA', 'AE', 'SG', 'US'].includes(countryCode) && allowed('cylex')) {
      jobs.push({
        task: 'scrapeCylex',
        args: [category, baseLocation, sessionId, { countryCode }]
      });
    }

    // 10. Trustpilot Verified Businesses
    if (allowed('trustpilot')) {
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

  if (countryCode === 'IN' && allowed('indiamart') && !weddingIntent) {
    jobs.push({ task: 'scrapePuppeteerIndiaMart', args: [category, baseLocation, 'omni', sessionId] });
  }

  return jobs;
}

module.exports = { baseDirectoryJobs, serpJobs, isWeddingIntent, WEDDING_INTENT };
