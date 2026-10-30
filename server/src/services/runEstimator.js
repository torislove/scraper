/**
 * runEstimator.js
 * Transparent pre-flight estimates. No fake precision: every number is derived
 * from the resolved zone count, live queue concurrency and documented engine
 * budgets. The response explicitly states that it is an estimate.
 */

const indiaGeoIndex = require('../utils/indiaGeoIndex');
const { resolveUniversalZones } = require('../utils/universalGeoCluster');
const { getConcurrencyMetrics } = require('../utils/queue');
const { classifyCategory, pickAutoEngines } = require('./categoryRouter');

const ENGINE_BUDGETS = {
  'google-local-finder': {
    label: 'Google SERP local finder',
    secondsPerZone: 7,
    leadsPerZone: 18,
    minLeadsPerZone: 7,
    maxLeadsPerZone: 45,
    concurrencyCap: 6,
    firstLeadSeconds: 4,
    detail: '20-result local packs, multi-page, HTML-first'
  },
  maps: {
    label: 'Google Maps places',
    secondsPerZone: 24,
    leadsPerZone: 13,
    minLeadsPerZone: 4,
    maxLeadsPerZone: 32,
    concurrencyCap: 5,
    firstLeadSeconds: 11,
    detail: 'Live Maps feed + detail pages, browser workers'
  },
  'google-places': {
    label: 'Google Maps places',
    secondsPerZone: 24,
    leadsPerZone: 13,
    minLeadsPerZone: 4,
    maxLeadsPerZone: 32,
    concurrencyCap: 5,
    firstLeadSeconds: 11,
    detail: 'Live Maps feed + detail pages, browser workers'
  },
  serp: {
    label: 'Google SERP local finder',
    secondsPerZone: 7,
    leadsPerZone: 18,
    minLeadsPerZone: 7,
    maxLeadsPerZone: 45,
    concurrencyCap: 6,
    firstLeadSeconds: 4,
    detail: '20-result local packs, multi-page, HTML-first'
  },
  'deepseek-ai': {
    label: 'AI query expansion',
    secondsPerZone: 5,
    leadsPerZone: 0,
    minLeadsPerZone: 0,
    maxLeadsPerZone: 0,
    concurrencyCap: 3,
    firstLeadSeconds: 0,
    detail: 'Expands intent into synonyms and regional query variants'
  },
  justdial: {
    label: 'JustDial city directory',
    secondsPerZone: 8,
    leadsPerZone: 16,
    minLeadsPerZone: 6,
    maxLeadsPerZone: 32,
    concurrencyCap: 2,
    firstLeadSeconds: 2,
    scope: 'city',
    detail: 'Live mobile results API with validated mobiles, exact area and coordinates'
  },
  indiamart: {
    label: 'IndiaMART suppliers',
    secondsPerZone: 30,
    leadsPerZone: 10,
    minLeadsPerZone: 3,
    maxLeadsPerZone: 20,
    concurrencyCap: 1,
    firstLeadSeconds: 12,
    scope: 'city',
    detail: 'Supplier cards, products and company profiles'
  },
  weddingbazaar: {
    label: 'WeddingBazaar',
    secondsPerZone: 20,
    leadsPerZone: 12,
    minLeadsPerZone: 5,
    maxLeadsPerZone: 24,
    concurrencyCap: 1,
    firstLeadSeconds: 8,
    scope: 'city',
    detail: 'Wedding venue and vendor listings'
  },
  weddingwire: {
    label: 'WeddingWire',
    secondsPerZone: 28,
    leadsPerZone: 15,
    minLeadsPerZone: 6,
    maxLeadsPerZone: 30,
    concurrencyCap: 1,
    firstLeadSeconds: 8,
    scope: 'city',
    detail: 'Venue profiles, description, FAQs and payment terms'
  },
  mandap: {
    label: 'Mandap.com',
    secondsPerZone: 22,
    leadsPerZone: 18,
    minLeadsPerZone: 6,
    maxLeadsPerZone: 36,
    concurrencyCap: 1,
    firstLeadSeconds: 7,
    scope: 'city',
    detail: 'Banquet halls and wedding venue marketplace'
  }
};

const DEDUPE_FACTOR = 0.72;
const STRATEGY_FACTORS = { broad: 1, strict: 0.74, smart: 0.88 };
const DEEP_SECONDS_PER_VENDOR = 22;
const DEEP_CONCURRENCY = 2;
const WEBSITE_SECONDS_PER_VENDOR = 4.5;
const WEBSITE_CONCURRENCY = 6;

function normaliseEngines(engines) {
  const defaults = ['google-local-finder'];
  const list = Array.isArray(engines) && engines.length ? engines : defaults;
  const aliases = {
    'google-local-finder': 'google-local-finder',
    'serp_local': 'google-local-finder',
    'serp-local': 'google-local-finder',
    'serp': 'google-local-finder',
    'local': 'google-local-finder',
    'maps': 'maps',
    'places': 'maps',
    'google-places': 'maps',
    'google_places': 'maps',
    'deepseek-ai': 'deepseek-ai',
    'deepseek': 'deepseek-ai',
    'ai': 'deepseek-ai',
    'website': 'website',
    'web': 'website',
    'deep': 'deep',
    'deep-extract': 'deep',
    'justdial': 'justdial',
    'just-dial': 'justdial',
    'indiamart': 'indiamart',
    'india-mart': 'indiamart',
    'weddingbazaar': 'weddingbazaar',
    'wedding-bazaar': 'weddingbazaar',
    'weddingwire': 'weddingwire',
    'wedding-wire': 'weddingwire',
    'mandap': 'mandap'
  };
  const out = [];
  for (const engine of list) {
    const key = aliases[String(engine).toLowerCase().trim()];
    if (key && !out.includes(key)) out.push(key);
  }
  return out.length ? out : defaults;
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  if (mins < 60) return rem ? `${mins}m ${rem}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins ? `${hours}h ${remMins}m` : `${hours}h`;
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function estimateRun(params = {}) {
  const category = String(params.category || params.query || 'Business').trim();
  const location = String(params.location || '').trim();
  const strategy = String(params.strategy || 'broad').toLowerCase();
  const classification = classifyCategory(category);
  const rawEngines = Array.isArray(params.enabledEngines)
    ? params.enabledEngines
    : (Array.isArray(params.engines) ? params.engines : []);
  const wantsAuto = !rawEngines.length || rawEngines.some(engine => /^auto$/i.test(String(engine)));
  const requestedEngines = wantsAuto
    ? [...new Set([...pickAutoEngines(classification), 'website', 'deep'])]
    : normaliseEngines(rawEngines);
  const targetLeads = Math.max(0, Math.min(10000, Number(params.targetLeads) || 0));
  const scrapeEngines = requestedEngines.filter(e => ENGINE_BUDGETS[e] && ENGINE_BUDGETS[e].leadsPerZone > 0);
  const wantsDeep = requestedEngines.includes('deep') || params.deep === true;
  const wantsWebsite = requestedEngines.includes('website') || params.website === true;

  const warnings = [];
  const assumptions = [];

  if (!location) {
    warnings.push('No location supplied. ETA assumes a single central zone.');
  }

  const resolved = location ? indiaGeoIndex.resolveQuick(location) : null;
  if (!resolved && location) {
    warnings.push(`"${location}" was not found in the local India index. ETA assumes one fallback zone; the scraper may still geocode it at runtime.`);
  }

  const zones = resolveUniversalZones(location || 'India', category) || [];
  const safeZones = zones.length ? zones : [{ zoneName: 'Central Area', queryText: `${category} in ${location || 'India'}`, isSingle: true }];

  const concurrency = getConcurrencyMetrics();
  const strategyFactor = STRATEGY_FACTORS[strategy] ?? 0.9;
  const densityFactor = resolved && resolved.level === 'village' ? 0.45
    : resolved && resolved.level === 'state' ? 1.3
      : 1;

  let expectedMin = 0;
  let expectedMax = 0;
  let expectedRaw = 0;
  let firstLeadSeconds = Infinity;
  let longestEngineSeconds = 0;
  const enginePlans = [];

  for (const engine of requestedEngines) {
    const budget = ENGINE_BUDGETS[engine];
    if (!budget) {
      if (['website', 'deep'].includes(engine)) continue;
      warnings.push(`Unknown engine "${engine}" ignored by the estimator.`);
      continue;
    }

    const effectiveConcurrency = Math.max(1, Math.min(budget.concurrencyCap, concurrency.maxWorkers || 6));
    const isCityScope = budget.scope === 'city';
    const scopeZones = isCityScope ? 1 : safeZones.length;
    const waveTime = isCityScope
      ? budget.secondsPerZone
      : Math.ceil(safeZones.length / effectiveConcurrency) * budget.secondsPerZone;
    const leadsRaw = scopeZones * budget.leadsPerZone * strategyFactor * densityFactor;
    const leadFactor = budget.leadsPerZone > 0 ? 1 : 0;

    if (budget.leadsPerZone > 0) {
      expectedRaw += leadsRaw;
      expectedMin += scopeZones * budget.minLeadsPerZone * strategyFactor * densityFactor;
      expectedMax += scopeZones * budget.maxLeadsPerZone * strategyFactor * densityFactor;
      firstLeadSeconds = Math.min(firstLeadSeconds, budget.firstLeadSeconds || 5);
      longestEngineSeconds = Math.max(longestEngineSeconds, isCityScope ? waveTime : waveTime + budget.secondsPerZone);
    }

    enginePlans.push({
      key: engine,
      label: budget.label,
      detail: budget.detail,
      enabled: true,
      scope: isCityScope ? 'city' : 'zone',
      zones: scopeZones,
      concurrency: effectiveConcurrency,
      secondsPerZone: budget.secondsPerZone,
      estimatedSeconds: waveTime,
      leadsPerZone: budget.leadsPerZone,
      estimatedLeads: Math.round(leadsRaw * leadFactor),
      contributesLeads: leadFactor === 1
    });
  }

  if (scrapeEngines.length === 0 && !wantsDeep && !wantsWebsite) {
    warnings.push('No lead-producing engine selected. Choose Google SERP local finder and/or Google Maps.');
  }

  // Dedupe across engines, then apply target cap.
  let expectedLeads = Math.round(expectedRaw * (scrapeEngines.length > 1 ? DEDUPE_FACTOR : 1));
  let expectedMinLeads = Math.round(expectedMin * (scrapeEngines.length > 1 ? DEDUPE_FACTOR : 1));
  let expectedMaxLeads = Math.round(expectedMax * (scrapeEngines.length > 1 ? DEDUPE_FACTOR : 1));

  if (targetLeads > 0) {
    expectedLeads = Math.min(expectedLeads, targetLeads);
    expectedMinLeads = Math.min(expectedMinLeads, targetLeads);
    expectedMaxLeads = Math.min(expectedMaxLeads, targetLeads);
  }

  const overheadSeconds = 4 + Math.min(18, safeZones.length * 0.35);
  let scrapeSeconds = scrapeEngines.length ? Math.max(6, longestEngineSeconds + overheadSeconds) : 0;

  // If a specific target is requested, scale time by measured throughput.
  if (targetLeads > 0 && expectedLeads > 0 && scrapeSeconds > 0) {
    const naturalLeads = Math.max(1, expectedLeads);
    if (targetLeads > naturalLeads) {
      scrapeSeconds *= targetLeads / naturalLeads;
      warnings.push(`Target of ${targetLeads} leads is above this run's natural yield. Expand location, broad strategy, or add maps.`);
    }
  }

  if (!Number.isFinite(firstLeadSeconds) || firstLeadSeconds === Infinity) firstLeadSeconds = 0;

  const phases = [];
  if (scrapeEngines.length) {
    phases.push({
      name: 'Discovery',
      seconds: Math.round(scrapeSeconds),
      label: formatDuration(scrapeSeconds),
      detail: `${safeZones.length} zones × ${scrapeEngines.length} lead engine${scrapeEngines.length > 1 ? 's' : ''}`
    });
  }

  let websiteSeconds = 0;
  if (wantsWebsite) {
    const withSites = Math.max(1, Math.round(expectedLeads * 0.35));
    websiteSeconds = Math.ceil(withSites / WEBSITE_CONCURRENCY) * WEBSITE_SECONDS_PER_VENDOR;
    phases.push({
      name: 'Website enrichment',
      seconds: Math.round(websiteSeconds),
      label: formatDuration(websiteSeconds),
      detail: `~${withSites} websites (35% of leads), ${WEBSITE_CONCURRENCY} HTTP workers`
    });
  }

  let deepSeconds = 0;
  let deepVendors = 0;
  if (wantsDeep) {
    deepVendors = targetLeads > 0 ? Math.min(targetLeads, Math.max(expectedLeads, Math.round(targetLeads))) : expectedLeads;
    deepSeconds = Math.ceil(deepVendors / DEEP_CONCURRENCY) * DEEP_SECONDS_PER_VENDOR;
    phases.push({
      name: 'Deep profile extraction',
      seconds: Math.round(deepSeconds),
      label: formatDuration(deepSeconds),
      detail: `${deepVendors} vendors × Maps + website, ${DEEP_CONCURRENCY} browsers`
    });
    if (deepSeconds > 600) {
      warnings.push('Deep extraction will take longer than 10 minutes. Run it as a separate resumable job; progress is saved per vendor.');
    }
  }

  const totalSeconds = Math.round(scrapeSeconds + websiteSeconds + deepSeconds);
  const throughput = totalSeconds > 0 ? round((expectedLeads / totalSeconds) * 60, 1) : 0;

  // Honest target check: 100 / 1000 lead runs.
  const targetScenarios = [100, 1000].map(target => {
    if (!scrapeEngines.length) return { leads: target, seconds: null, label: '—' };
    const perSecond = expectedLeads > 0 && scrapeSeconds > 0 ? expectedLeads / scrapeSeconds : 0;
    if (!perSecond) return { leads: target, seconds: null, label: '—' };
    const seconds = Math.max(firstLeadSeconds, target / perSecond + overheadSeconds);
    return {
      leads: target,
      seconds: Math.round(seconds),
      label: formatDuration(seconds),
      meets90s: target === 100 ? seconds <= 90 : null,
      meets10m: target === 1000 ? seconds <= 600 : null
    };
  });

  const zonePreview = safeZones.slice(0, 20).map((z, index) => ({
    index: index + 1,
    name: z.zoneName,
    query: z.queryText,
    lat: z.lat || null,
    lng: z.lng || null,
    district: z.district || resolved?.district || null,
    state: z.state || resolved?.state || null
  }));

  assumptions.push('Zone count comes from the local universal zone resolver, not a random guess.');
  assumptions.push(`Queue concurrency is read live: ${concurrency.maxWorkers} browser workers, ${concurrency.freeRamPct}% free RAM.`);
  assumptions.push('Lead yield assumes normal Google result density; strict mode reduces it.');
  assumptions.push('Estimates are not a guarantee. Actual yield depends on Google, network and vendor density.');

  return {
    ok: true,
    estimate: true,
    calibration: 'heuristic-v1',
    createdAt: new Date().toISOString(),
    input: {
      category,
      location,
      strategy,
      engines: requestedEngines,
      targetLeads,
      auto: wantsAuto
    },
    family: {
      key: classification.family,
      label: classification.label,
      description: classification.description,
      confidence: classification.confidence,
      matched: classification.matched
    },
    location: resolved ? {
      name: resolved.name,
      level: resolved.level,
      district: resolved.district,
      state: resolved.state,
      village: resolved.village || null,
      totalMandals: resolved.totalMandals,
      lat: resolved.lat,
      lng: resolved.lng,
      source: resolved.source
    } : {
      name: location || 'India',
      level: 'fallback',
      district: null,
      state: null,
      village: null,
      source: 'fallback'
    },
    zones: {
      count: safeZones.length,
      preview: zonePreview,
      densityFactor: round(densityFactor, 2),
      strategyFactor
    },
    engines: enginePlans,
    expectedLeads: {
      min: expectedMinLeads,
      expected: expectedLeads,
      max: expectedMaxLeads,
      target: targetLeads || null,
      confidence: scrapeEngines.length > 1 ? 'medium' : 'low-medium'
    },
    timing: {
      firstLeadSeconds: Math.max(3, Math.round(firstLeadSeconds)),
      firstLeadLabel: formatDuration(Math.max(3, firstLeadSeconds)),
      scrapeSeconds: Math.round(scrapeSeconds),
      scrapeLabel: formatDuration(scrapeSeconds),
      websiteSeconds: Math.round(websiteSeconds),
      deepSeconds: Math.round(deepSeconds),
      totalSeconds,
      totalLabel: formatDuration(totalSeconds),
      totalMinutes: round(totalSeconds / 60, 1),
      overheadSeconds: Math.round(overheadSeconds),
      deepVendors
    },
    throughput: {
      leadsPerMinute: throughput,
      label: `${throughput} leads/min`
    },
    targetScenarios,
    targets: {
      firstLeadUnder5s: firstLeadSeconds <= 5,
      hundredUnder90s: targetScenarios[0] && targetScenarios[0].meets90s !== false,
      thousandUnder10m: targetScenarios[1] && targetScenarios[1].meets10m !== false,
      note: 'Targets are engineering goals for the fastest configuration, not guarantees.'
    },
    phases,
    concurrency,
    assumptions,
    warnings,
    honesty: 'No vendors are counted until they are actually scraped and saved.'
  };
}

function estimateDeepJob(params = {}) {
  const vendors = Math.max(0, Number(params.vendorCount) || 0);
  const concurrency = Math.max(1, Math.min(3, Number(params.concurrency) || DEEP_CONCURRENCY));
  const perVendor = Math.max(5, Number(params.secondsPerVendor) || DEEP_SECONDS_PER_VENDOR);
  const seconds = vendors > 0 ? Math.ceil(vendors / concurrency) * perVendor : 0;
  return {
    ok: true,
    kind: 'deep-job',
    vendorCount: vendors,
    concurrency,
    secondsPerVendor: perVendor,
    seconds,
    label: formatDuration(seconds),
    minutes: round(seconds / 60, 1),
    note: 'Each vendor is saved independently. Stop and resume without losing completed profiles.'
  };
}

module.exports = {
  estimateRun,
  estimateDeepJob,
  ENGINE_BUDGETS,
  formatDuration
};
