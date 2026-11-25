/**
 * omniSearchOrchestrator.js
 *
 * Universal Omni Search Orchestrator for Scraper.co.in.
 * Coordinates multi-engine swarming (Google Places, Google Local Finder, OpenStreetMap,
 * JustDial, Social Dorking, IndiaMart, Wedding Portals), progressive streaming,
 * dynamic boundary containment, and durable folder persistence.
 */

const dbAdapter = require('../../config/dbAdapter');
const { persistSessionVault, matchesMasterFilters } = require('../sessionVaultService');
const outOfBoundsVault = require('../outOfBoundsVault');
const categoryRouter = require('../categoryRouter');
const brandIntel = require('../brandIntel');
const engineHealth = require('../engineHealth');
const requestGuard = require('../../utils/requestGuard');
const taxonomyLearner = require('../taxonomyLearner');
const { isVendorRelevant } = require('../categoryFidelity');
const { collectCarryForward, findRepeatCoveredZones } = require('../carryForwardService');
const indiaTradeIntelligence = require('../../utils/indiaTradeIntelligence');
const { areNearDuplicates, mergeVendorLeads } = indiaTradeIntelligence;
const { calculateLeadQuality, determineTier } = require('../../utils/leadScoring');
const { streamingEnricher, backfillPhones, hasValidMobile, countryForLead } = require('../phoneBackfillService');
const { resolveUniversalZones, zoneCoordinates, ZONE_COORDINATES, buildCityGridZones, classifyLocation, mandalIndex } = require('../../utils/universalGeoCluster');
const { resolveInternationalZones } = require('../../utils/internationalGeo');
const { geocodeLocation, getCache: getGeoCache } = require('../../utils/olaMaps');
const { clearStaleQueue, getPersistentQueue, getActiveJobs, addScrapeJob: queueAddScrapeJob, getConcurrencyMetrics, isSessionAborted } = require('../../utils/queue');
const etaModel = require('../../utils/etaModel');
const { normalizePhone: parsePhone } = require('../../utils/phoneUtils');
const { planScopeEngines } = require('../scopeEngines');
const { makeHasEngine } = require('../scopeEngines/engineMatch');
const brain = require('../localBrain');
const sources = require('../sources/registry');
const { scrapeWebContact } = require('../../scrapers/engine-web-contact');
const { isListingRelevantToQuery, warmZoneContextPool } = require('../../scrapers/engine-google-places');
const serpBreaker = require('../serpBreaker');
const browserBudget = require('../../utils/browserBudget');

const {
  getDistanceKm,
  formatEta,
  zoneCoverageKind,
  isGridZone,
  zoneKey,
  placeKey,
  sweepReachKm,
  isInsideDistrictBoundary,
  isInsideSweepArea,
  leadBelongsToZone,
  nearestBoundaryZone,
  enforceMasterZoneContainment
} = require('./boundaryGuards');

async function runOmniSearchOrchestrator(
  category,
  baseLocation,
  strategy,
  radius,
  gridDensity,
  enabledEngines,
  sessionId,
  userId = 'anonymous',
  filters = {},
  plan = null,
  isMaster = false,
  deps = {},
  countryHint = null
) {
  const activeSessions = deps.activeSessions || {};
  const sessionAbortSignals = deps.sessionAbortSignals || new Map();
  const globalAbortSignal = deps.globalAbortSignal || { aborted: false };
  const addScrapeJob = deps.addScrapeJob || queueAddScrapeJob;
  const addLog = deps.addLog || console.log;
  const emitVendorEvent = deps.emitVendorEvent || (() => {});
  const emitGridEvent = deps.emitGridEvent || (() => {});
  const emitDispatchEvent = deps.emitDispatchEvent || (() => {});
  const emitProgressEvent = deps.emitProgressEvent || (() => {});
  // Live map "active scanning zone" broadcast. `scrape.js` has always supplied
  // this in `deps` (line ~431) and calls it below, but it was never read here,
  // so the first zone threw "emitActivePointEvent is not defined" and the
  // whole sweep aborted before the first engine ran.
  const emitActivePointEvent = deps.emitActivePointEvent || (() => {});

  // Scope guard for every folder write & live emission (upgraded once anchor is geocoded).
  let allowSweepLead = () => true;

  // <1ms Real-Time Cross-Engine Telecom Index: merges Mobile + Landline numbers
  // across JustDial, Google Maps, OpenStreetMap, Website Crawler & Directories instantaneously.
  const livePhoneIndex = new Map();
  const normBizKey = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const guardedEmitVendorEvent = (vendor, eventType = 'inserted') => {
    if (!vendor || !vendor.name) return;
    try {
      if (typeof allowSweepLead === 'function' && !allowSweepLead(vendor)) return;
    } catch (e) {}

    try {
      if (sessionId && !vendor.sessionId) vendor.sessionId = sessionId;
      const cCode = String(vendor.country || countryHint || 'IN').toUpperCase();
      const rawCandidates = [
        vendor.mobilePhone,
        vendor.landlinePhone,
        vendor.phone,
        ...(Array.isArray(vendor.phones) ? vendor.phones : [])
      ].filter(Boolean);

      let foundMob = null;
      let foundLand = null;
      const cleanList = [];
      for (const raw of rawCandidates) {
        const strVal = typeof raw === 'object' ? (raw.displayPhone || raw.e164 || raw.national || raw.raw || '') : String(raw);
        if (!strVal) continue;
        const parsed = parsePhone(strVal, {
          defaultCountry: cCode,
          allowInternational: cCode !== 'IN',
          context: 'phone tel'
        });
        if (parsed) {
          const disp = parsed.displayPhone || parsed.e164;
          if (disp && !cleanList.includes(disp)) cleanList.push(disp);
          if (parsed.isMobile && !foundMob) foundMob = parsed;
          if (parsed.isLandline && !foundLand) foundLand = parsed;
        }
      }

      if (foundMob && !vendor.mobilePhone) vendor.mobilePhone = foundMob.displayPhone || foundMob.e164;
      if (foundLand && !vendor.landlinePhone) vendor.landlinePhone = foundLand.displayPhone || foundLand.e164;

      const bKey = normBizKey(vendor.name);
      if (bKey.length >= 4) {
        const prev = livePhoneIndex.get(bKey);
        if (prev) {
          if (!vendor.mobilePhone && prev.mobilePhone) {
            vendor.mobilePhone = prev.mobilePhone;
            if (!cleanList.includes(prev.mobilePhone)) cleanList.unshift(prev.mobilePhone);
            if (!vendor.whatsappLink && prev.whatsappLink) {
              vendor.whatsappLink = prev.whatsappLink;
              vendor.whatsappAvailable = true;
            }
          }
          if (!vendor.landlinePhone && prev.landlinePhone) {
            vendor.landlinePhone = prev.landlinePhone;
            if (!cleanList.includes(prev.landlinePhone)) cleanList.push(prev.landlinePhone);
          }
          if (!vendor.website && prev.website) vendor.website = prev.website;
          if (!vendor.email && prev.email) vendor.email = prev.email;
        }
        livePhoneIndex.set(bKey, {
          mobilePhone: vendor.mobilePhone || prev?.mobilePhone || '',
          landlinePhone: vendor.landlinePhone || prev?.landlinePhone || '',
          whatsappLink: vendor.whatsappLink || prev?.whatsappLink || '',
          website: vendor.website || prev?.website || '',
          email: vendor.email || prev?.email || ''
        });
      }

      const bestPrimary = vendor.mobilePhone || vendor.landlinePhone || vendor.phone || cleanList[0] || '';
      if (bestPrimary) {
        vendor.phone = bestPrimary;
        vendor.verified = true;
      }
      if (cleanList.length) {
        vendor.phones = [...new Set([...cleanList, ...(Array.isArray(vendor.phones) ? vendor.phones.filter(p => typeof p === 'string') : [])])];
      }
      if (vendor.mobilePhone) {
        vendor.isMobile = true;
        vendor.phoneType = 'mobile';
        if (!vendor.whatsappLink && foundMob?.digits) {
          vendor.whatsappLink = `https://wa.me/${foundMob.digits}`;
          vendor.whatsappAvailable = true;
        }
      } else if (vendor.landlinePhone) {
        vendor.isLandline = true;
        if (!vendor.phoneType || vendor.phoneType === 'unknown') vendor.phoneType = 'landline';
      }
    } catch (e) {}

    try {
      emitVendorEvent(vendor, eventType);
    } catch (e) { /* streaming is best-effort */ }
  };

  // Streaming update hook.
  const onProgress = (vendor, type = 'updated') => {
    guardedEmitVendorEvent(vendor, type);
  };

  if (sessionId && userId && userId !== 'anonymous' && userId !== 'admin_1') {
    try { dbAdapter.registerSessionOwner(sessionId, userId); } catch (e) {}
  }
  if (sessionId && typeof dbAdapter.registerSessionScope === 'function' && !dbAdapter.getSessionScope(sessionId)) {
    try { dbAdapter.registerSessionScope(sessionId, { userId, isMaster }); } catch (e) {}
  }

  const sessionAbortSignal = { aborted: false };
  if (sessionId) {
    sessionAbortSignals.set(sessionId, sessionAbortSignal);
  }

  // One truth for "has this run been stopped?". The stop route sets
  // activeSessions[id].aborted and sessionAbortSignals.get(sessionId).aborted,
  // so the orchestrator sees it even though the signal object itself is local.
  const isAborted = () => Boolean(
    sessionAbortSignal.aborted
    || (sessionId && sessionAbortSignals.get(sessionId)?.aborted)
    || (sessionId && isSessionAborted(sessionId))
    || activeSessions[sessionId]?.aborted
    || activeSessions[sessionId]?.status === 'aborted'
    || (globalAbortSignal.aborted && !sessionId)
  );

  // Rejected rows are archived as evidence but removed from the live table, so
  // an out-of-area business can never appear in the customer's folder.
  let pendingOob = [];
  const quarantineLead = (lead, reason, source) => {
    if (!lead) return;
    pendingOob.push({ lead, reason: reason || 'outside search area' });
    try {
      dbAdapter.saveOutOfBoundsVendor({
        ...lead,
        runId: sessionId,
        sessionId,
        source: source || 'Containment Guard (Out of Bounds)',
        outOfBoundsDistance: reason
      }, sessionId);
    } catch (e) {}
    try {
      dbAdapter.dropFromSession(lead.id, sessionId);
    } catch (e) {}
  };

  const requestedEngines = Array.isArray(enabledEngines) ? enabledEngines.filter(Boolean) : [];
  const classification = categoryRouter.classifyCategory(category);
  const autoMode = !requestedEngines.length || requestedEngines.some(engine => /^auto$/i.test(String(engine)));

  // Country-aware dispatch. The country selected in the UI is authoritative;
  // text detection is only a fallback for callers that do not send one. This is
  // what stopped a US "Troy" run from falling back to India and parsing every
  // phone with +91 rules.
  const { COUNTRIES: WORLD_COUNTRIES } = require('../localBrain/countries');
  const explicitCountry = sources.normaliseCountry(countryHint);
  const detectedLocationProfile = brain.countryProfile(baseLocation);
  let resolvedCountry = explicitCountry;
  if (detectedLocationProfile && detectedLocationProfile.code && (!explicitCountry || (explicitCountry === 'IN' && detectedLocationProfile.code !== 'IN'))) {
    resolvedCountry = detectedLocationProfile.code;
  }
  const countryProfile = (resolvedCountry && WORLD_COUNTRIES.find(item => item.code === resolvedCountry))
    || detectedLocationProfile
    || { code: 'IN', name: 'India' };
  const countryCode = countryProfile.code;
  const requestedActive = autoMode
    ? (countryCode === 'IN'
        ? categoryRouter.pickAutoEngines(classification)
        : sources.enginesForCountry(countryCode))
    : [...new Set(requestedEngines)];

  const activeEngines = requestedActive.filter(engine => sources.engineSupportedInCountry(engine, countryCode));
  // Hard bundle guard: outside India only the verified country bundle may run.
  // This prevents unverified local-only engines from running in foreign jurisdictions.
  if (countryCode !== 'IN') {
    const bundle = new Set(sources.enginesForCountry(countryCode).map(key => sources.canonicalEngine(key) || key));
    for (let i = activeEngines.length - 1; i >= 0; i -= 1) {
      let canonical = sources.canonicalEngine(activeEngines[i]) || String(activeEngines[i]).toLowerCase();
      if (canonical === 'social') {
        canonical = 'social-dork-intl';
        activeEngines[i] = 'social-dork-intl';
      }
      if (!bundle.has(canonical)) activeEngines.splice(i, 1);
    }
  }
  // Auto runs always include the keyless global discovery engine. It is what
  // gives US/UK/CA/AU runs coverage when their directories block automation.
  if (autoMode && sources.engineSupportedInCountry('web-discovery', countryCode) && !activeEngines.includes('web-discovery')) {
    activeEngines.push('web-discovery');
  }
  const droppedEngines = requestedActive.filter(engine => !activeEngines.includes(engine));
  if (droppedEngines.length) {
    addLog(`[Orchestrator] ${countryProfile.name}: skipped ${droppedEngines.length} engine(s) not available there â€” ${droppedEngines.join(', ')}.`);
  }
  const regionLabel = countryCode === 'IN'
    ? 'India'
    : (brain.analyzeScope(baseLocation).label || countryProfile.name);

  // Product/brand intent is searched with the dealer phrase that directories
  // actually index ("graphic card dealer", "Tamarind wholesaler"), while the
  // folder keeps the operator's original words. Known service families are NEVER
  // mangled with dealer phrases.
  const isExcludedFromProduct = ['food', 'hospitality', 'health', 'personal-care', 'education', 'professional', 'wedding', 'home-services', 'event'].includes(classification.family)
    || brandIntel.isServiceQuery(category);
  const productIntent = !isExcludedFromProduct && classification.intent
    && ['product', 'brand', 'brand_product'].includes(classification.intent.intentKind);
  const searchPhrase = productIntent
    ? brandIntel.bestSearchPhrase(classification.intent, category)
    : category;
  if (productIntent && searchPhrase && searchPhrase.toLowerCase() !== category.toLowerCase()) {
    addLog(`[Orchestrator] Intent: ${classification.intent.intentKind} Â· searching dealer phrase "${searchPhrase}" (folder keeps "${category}")`);
  }

  addLog(`[Orchestrator] Starting Universal Omni Search session: ${sessionId} (User: ${userId})`);
  addLog(`[Orchestrator] Query: "${category}" in "${baseLocation}". Family: ${classification.label} (${classification.family}). Strategy: ${strategy}`);
  addLog(`[Orchestrator] Auto engine plan: ${activeEngines.join(', ')}${autoMode ? ' (automatic)' : ' (manual)'}`);

  // Open the search folder immediately so an interrupted run still leaves a
  // dated artifact with its query and metadata. It is overwritten with the
  // complete lead list when the scrape phase finishes.
  try {
    persistSessionVault({
      sessionId,
      userId,
      category,
      location: baseLocation,
      leads: [],
      metadata: {
        status: 'running',
        startedAt: new Date().toISOString(),
        services: classification.label,
        engines: activeEngines,
        filters: filters && Object.keys(filters).length ? filters : undefined
      }
    });
  } catch (error) {
    addLog(`[Orchestrator] Folder could not be opened: ${error.message}`);
  }

  // Start Real-Time Streaming Detail & Phone Enricher concurrently with swarm
  try {
    streamingEnricher.start({
      sessionId,
      emit: (vendor, type) => { guardedEmitVendorEvent(vendor, type); },
      log: addLog,
      concurrency: Math.min(6, Math.max(3, browserBudget.getStatus().enrichReserve || 4))
    }).catch(() => {});
  } catch (enricherErr) {
    addLog(`[Orchestrator] Realtime enricher init: ${enricherErr.message}`);
  }

  // Clear jobs left over from crashed or finished runs, but never the jobs of
  // a session that is still running (client search + master sweep can coexist).
  await clearStaleQueue(sid => Boolean(activeSessions[sid] && activeSessions[sid].status === 'running'));
  addLog(`[Orchestrator] Dropped stale queued jobs; live sessions are untouched.`);

  // Per-run out-of-bounds ledger. The panel shows what THIS search rejected,
  // capped at 500 rows, instead of 1,300 rows accumulated over months.
  try {
    dbAdapter.resetOutOfBounds(sessionId);
  } catch (e) {}

  // Ensure database sync is flushed to disk
  if (typeof dbAdapter.flushSync === 'function') {
    dbAdapter.flushSync();
  }

  try {
    // 1. Instant Gazetteer-first resolution (0ms local memory): check plan/gazetteer BEFORE
    // network geocoding so Vijayawada, Guntur, Hyderabad, London, New York, Dubai, Sydney
    // start Tier-0 & Zone 1 immediately with zero geocoder round-trip wait.
    const gazetteerHit = (() => {
      const clean = String(baseLocation || '').toLowerCase().trim();
      const stripped = clean.replace(/\b(city|town|district|dist|mandal|tehsil|taluk|taluka|block)\b/gi, '').replace(/\s+/g, ' ').trim();
      const hub = ZONE_COORDINATES[clean] || ZONE_COORDINATES[stripped];
      if (hub && Number.isFinite(Number(hub.lat))) {
        return { lat: Number(hub.lat), lng: Number(hub.lng), district: baseLocation, state: regionLabel };
      }
      if (countryCode === 'IN') {
        try {
          const indiaGeoIndex = require('../../utils/indiaGeoIndex');
          const matches = indiaGeoIndex.searchLocations(baseLocation, 1);
          if (matches && matches[0] && Number.isFinite(Number(matches[0].lat))) {
            return {
              lat: Number(matches[0].lat),
              lng: Number(matches[0].lng),
              district: matches[0].district || baseLocation,
              state: matches[0].state || regionLabel
            };
          }
        } catch (e) {}
      }
      return null;
    })();

    let baseGeo = null;
    if (plan?.center && Number.isFinite(Number(plan.center.lat))) {
      baseGeo = { lat: Number(plan.center.lat), lng: Number(plan.center.lng), district: plan.district || baseLocation, state: plan.state || regionLabel };
    } else if (gazetteerHit) {
      baseGeo = gazetteerHit;
    } else {
      try {
        baseGeo = await Promise.race([
          geocodeLocation(baseLocation, countryCode === 'IN' ? {} : { countryCode }),
          new Promise(resolve => setTimeout(() => resolve(null), 2200))
        ]);
      } catch (e) {}
      if (!baseGeo || !baseGeo.lat) baseGeo = null;
    }

    let planCenter = (plan?.center && Number.isFinite(Number(plan.center.lat)))
      ? { lat: Number(plan.center.lat), lng: Number(plan.center.lng) }
      : (gazetteerHit ? { lat: gazetteerHit.lat, lng: gazetteerHit.lng } : (baseGeo ? { lat: Number(baseGeo.lat), lng: Number(baseGeo.lng) } : null));

    const sweepScope = plan?.resolvedScope || (isMaster ? 'district' : 'city');

    // A master district sweep keeps every rejected vendor in a visible
    // `master_oob_<district>` folder. Client searches do not create one.
    const flushOob = () => {
      if (!isMaster || !pendingOob.length) return;
      const rows = pendingOob;
      pendingOob = [];
      try {
        outOfBoundsVault.recordRejections({
          district: plan?.district || plan?.boundary?.district || baseLocation,
          state: plan?.state || plan?.boundary?.state || '',
          category,
          sessionId,
          rows
        });
      } catch (e) {
        addLog(`[Out of Bound] Folder notice: ${e.message}`);
      }
    };

    const scopeSpread = plan?.resolvedScope === 'state'
      ? 2.2
      : plan?.resolvedScope === 'district'
        ? 0.35
        : 0.09;

    // 2. Resolve Universal Geographic Zones (0.01ms instantaneous local memory indexing).
    // A master sweep supplies a frozen plan, so its exact zone policy is honoured
    // instead of re-resolving from the location string.
    //
    // Outside India the gazetteer knows nothing, so a real 5Ã—5 coordinate lattice
    // is built from the geocoded bounding box. Without it a US run only had the
    // eight generic sector phrases (six after dedupe) and never dispatched a
    // worker swarm.
    let internationalZones = null;
    if (countryCode !== 'IN' && !(Array.isArray(plan?.zones) && plan.zones.length)) {
      try {
        const resolved = await resolveInternationalZones(baseLocation, category, countryCode, {
          radiusKm: Math.max(6, Number(radius) || 8)
        });
        if (resolved.zones.length) {
          internationalZones = resolved.zones;
          if (!planCenter && resolved.anchor) {
            planCenter = { lat: resolved.anchor.lat, lng: resolved.anchor.lng };
          }
          addLog(`[Orchestrator] ${countryCode} coverage lattice: ${resolved.zones.length} coordinate zones around ${resolved.anchor.name}.`);
        }
      } catch (geoError) {
        addLog(`[Orchestrator] ${countryCode} zone lattice skipped: ${geoError.message}`);
      }
    }

    const buildZones = (center) => (Array.isArray(plan?.zones) && plan.zones.length)
      ? plan.zones.map((z, index) => {
          // A resumed plan can carry either `name` or `zoneName`, so normalise
          // once instead of assuming the launch-time shape.
          const zoneName = z.name || z.zoneName || '';
          const zoneNameLower = String(zoneName).toLowerCase();
          let suffix = '';
          const targetDistrict = z.district || plan.district;
          const targetState = z.state || plan.state;

          // The suffix tells Google which real place the query belongs to.
          // A mandal/city sweep must localise to the sweep itself ("Morrispet,
          // Tenali Mandal"), never to the parent district. A district sweep
          // localises to the district, and a state sweep disambiguates each
          // sub-district with its own district + state.
          if (plan.resolvedScope === 'state') {
            const parts = [targetDistrict, targetState].filter(Boolean);
            if (parts.length) suffix = `, ${parts.join(', ')}`;
          } else if (targetDistrict && zoneNameLower !== String(targetDistrict).toLowerCase()) {
            suffix = plan.resolvedScope === 'district'
              ? `, ${targetDistrict}`
              : `, ${baseLocation || targetDistrict}`;
          } else if (plan.resolvedScope !== 'district' && baseLocation) {
            suffix = `, ${baseLocation}`;
          }

          const explicitLat = Number(z.lat ?? z.latitude);
          const explicitLng = Number(z.lng ?? z.longitude);
          const hasExplicitCoords = Number.isFinite(explicitLat) && Number.isFinite(explicitLng) && !(explicitLat === 0 && explicitLng === 0);
          const coords = hasExplicitCoords
            ? { lat: explicitLat, lng: explicitLng, isApproximate: Boolean(z.isApproximate || z.approx) }
            : zoneCoordinates(zoneName, targetDistrict, index, plan.zones.length, {
                center,
                spread: scopeSpread
              });
          const covKind = z.coverageKind || (z.kind === 'grid' ? 'grid' : 'locality');
          return {
            zoneName,
            queryText: z.queryText || `${searchPhrase} in ${zoneName}${suffix}`,
            district: targetDistrict || null,
            state: targetState || null,
            lat: coords?.lat || null,
            lng: coords?.lng || null,
            isApproximate: Boolean(coords?.isApproximate),
            kind: z.kind || covKind,
            coverageKind: covKind,
            engines: Array.isArray(z.engines) ? z.engines : null,
            mandal: z.mandal || null,
            radiusKm: Number(z.radiusKm) || 6.0,
            typology: z.typology || null,
            scope: plan.resolvedScope || (isMaster ? 'district' : null),
            isVectorQuery: true,
            isSingle: false
          };
        })
      : (internationalZones || resolveUniversalZones(baseLocation, category, isMaster, countryCode));

    let zones = buildZones(planCenter);

    // Cross-check the anchor against the zones that have a real gazetteer
    // coordinate. If the anchor drifts far from their centroid, the anchor is
    // wrong â€” rebuild the approximate cells around the real cluster instead of
    // scattering a district's villages into another state.
    try {
      const precise = zones.filter(z => !z.isApproximate && Number.isFinite(Number(z.lat)) && Number.isFinite(Number(z.lng)));
      if (precise.length >= 3) {
        const centroid = {
          lat: precise.reduce((sum, z) => sum + Number(z.lat), 0) / precise.length,
          lng: precise.reduce((sum, z) => sum + Number(z.lng), 0) / precise.length
        };
        const driftLimit = plan?.resolvedScope === 'state' ? 500
          : plan?.resolvedScope === 'district' ? 120
            : plan?.resolvedScope === 'city' ? 40 : 20;
        const drift = planCenter
          ? getDistanceKm(Number(planCenter.lat), Number(planCenter.lng), centroid.lat, centroid.lng)
          : Infinity;
        if (!planCenter || drift > driftLimit) {
          addLog(`[Orchestrator] Anchor correction: "${baseLocation}" was ${Number.isFinite(drift) ? drift.toFixed(0) + 'km' : 'unset'} from the zone cluster; rebuilding around ${centroid.lat.toFixed(3)}, ${centroid.lng.toFixed(3)}.`);
          planCenter = centroid;
          zones = buildZones(planCenter);
        }
      }
    } catch (anchorError) {}

    // Pre-flight Trade Sector Zone Gate:
    // Drop any zone whose name or query contains negative avoids of the trade sector
    const sectorAvoids = indiaTradeIntelligence.getNegativeAvoidsForQuery(category);
    if (Array.isArray(sectorAvoids) && sectorAvoids.length > 0) {
      const beforeCount = zones.length;
      zones = zones.filter(z => {
        const zName = String(z.zoneName || z.name || '').toLowerCase();
        const zQuery = String(z.queryText || '').toLowerCase();
        const combined = `${zName} ${zQuery}`;
        return !sectorAvoids.some(avoid => combined.includes(avoid.toLowerCase()));
      });
      if (zones.length < beforeCount) {
        addLog(`[Trade Intelligence] Pruned ${beforeCount - zones.length} conflicting subvector zone(s) to preserve 100% sector purity.`);
      }
    }

    // One guard is used by every write path â€” live snapshot, reconciliation and
    // the final folder â€” so a row can never enter through the side door after
    // the containment pass has already judged it out of bounds.
    allowSweepLead = (lead) => isInsideSweepArea(lead, planCenter, sweepScope, {
      boundary: plan?.boundary,
      reachKm: plan?.reachKm,
      location: baseLocation
    });

    addLog(`[Orchestrator] Resolved ${zones.length} universal zones for "${baseLocation}": ${zones.map(z => z.zoneName).join(', ')}`);

    // Zero-latency instant coordinate fallback from pre-indexed zones or hubs
    if (planCenter && (!baseGeo || !baseGeo.lat)) {
      baseGeo = {
        lat: planCenter.lat,
        lng: planCenter.lng,
        district: plan.district || baseLocation,
        state: plan.state || regionLabel
      };
    } else if (planCenter && baseGeo && Number.isFinite(Number(baseGeo.lat))) {
      const anchorDrift = getDistanceKm(Number(baseGeo.lat), Number(baseGeo.lng), planCenter.lat, planCenter.lng);
      if (anchorDrift > (plan?.resolvedScope === 'state' ? 500 : 40)) {
        addLog(`[Orchestrator] Map anchor aligned to the sweep centre (${planCenter.lat.toFixed(3)}, ${planCenter.lng.toFixed(3)}); the geocoder was ${anchorDrift.toFixed(0)}km away.`);
        baseGeo = {
          lat: planCenter.lat,
          lng: planCenter.lng,
          district: plan.district || baseLocation,
          state: plan.state || regionLabel
        };
      }
    }
    if (!baseGeo || !baseGeo.lat) {
      const firstWithCoords = zones.find(z => z.lat && z.lng);
      if (firstWithCoords) {
        baseGeo = {
          lat: Number(firstWithCoords.lat),
          lng: Number(firstWithCoords.lng),
          district: firstWithCoords.district || baseLocation,
          state: firstWithCoords.state || regionLabel
        };
      } else {
        const cleanKey = baseLocation.toLowerCase().trim();
        const strippedKey = cleanKey.replace(/\b(city|town|district|dist|mandal)\b/gi, '').trim().replace(/[^a-z0-9]/g, '');
        const hub = ZONE_COORDINATES[cleanKey] || ZONE_COORDINATES[strippedKey];
        if (hub) {
          baseGeo = {
            lat: Number(hub.lat),
            lng: Number(hub.lng),
            district: baseLocation,
            state: regionLabel,
            country: countryCode
          };
        }
      }
    }

    // Universal coverage fallback: a city the gazetteer does not know only has
    // the eight generic sector queries. Once the geocoder returns a centre, add
    // the coordinate grid so even an unknown town gets whole-area coverage.
    try {
      if (countryCode === 'IN' && !plan && baseGeo && baseGeo.lat && zones.length < 12) {
        const scopeType = classifyLocation(baseLocation).type;
        if (['city', 'metro', 'mandal'].includes(scopeType)) {
          const extra = buildCityGridZones(baseLocation, category, [], {
            center: { lat: Number(baseGeo.lat), lng: Number(baseGeo.lng) },
            cappedRadiusKm: 7
          });
          if (extra.length) {
            zones.push(...extra);
            addLog(`[Orchestrator] Coverage grid added for unknown city "${baseLocation}": ${extra.length} coordinate zones.`);
          }
        }
      }
    } catch (gridError) {
      addLog(`[Orchestrator] Coverage grid skipped: ${gridError.message}`);
    }

    // Two-pass coverage. Fast runs the named localities and query vectors that
    // carry almost every real lead, then stops. Deep keeps the coordinate grid
    // as a second pass. A grid cell is never silently dropped: in Fast it is
    // recorded as deferred so the folder can offer the grid pass later.
    const coverageMode = String(gridDensity || '').toLowerCase() === 'fast' ? 'fast' : 'deep';
    const namedZones = zones.filter(zone => !isGridZone(zone));
    const gridZones = zones.filter(zone => isGridZone(zone));

    // Center-out concentric sorting: prioritize Zone 1 (Commercial Core / Downtown)
    // so the operator receives the highest-yield leads in the first seconds.
    if (baseGeo && Number.isFinite(Number(baseGeo.lat)) && Number.isFinite(Number(baseGeo.lng))) {
      const cLat = Number(baseGeo.lat);
      const cLng = Number(baseGeo.lng);
      const zoneDist = (z) => {
        if (Number.isFinite(Number(z.lat)) && Number.isFinite(Number(z.lng))) {
          return Math.hypot(Number(z.lat) - cLat, Number(z.lng) - cLng);
        }
        const label = String(z.zoneName || z.name || '').toLowerCase();
        if (label.includes('central') || label.includes('downtown') || label.includes('main market') || label.includes('bazaar')) {
          return 0.001;
        }
        return 0.5;
      };
      namedZones.sort((a, b) => zoneDist(a) - zoneDist(b));
      gridZones.sort((a, b) => zoneDist(a) - zoneDist(b));
    }

    // Named zones run first (high-yield commercial hubs), then the peripheral
    // grid. Fast mode used to stop after the named zones, which silently dropped
    // whole quadrants of a city; it now keeps the same order but sweeps the grid
    // too. Ordering is the speed control, not truncation.
    const intentPhrases = categoryRouter.getColloquialIntentQueries
      ? categoryRouter.getColloquialIntentQueries(category, baseLocation, countryCode)
      : [];
    const intentZones = intentPhrases.map((phrase, idx) => ({
      zoneName: phrase,
      queryText: phrase,
      isVectorQuery: true,
      coverageKind: 'intent',
      lat: baseGeo?.lat || null,
      lng: baseGeo?.lng || null,
      radiusKm: 5,
      isIntent: true
    }));

    const activeZones = [...intentZones, ...namedZones, ...gridZones];
    const deferredZones = [];
    const deferredKeys = new Set();
    addLog(
      `[Orchestrator] Coverage mode: ${coverageMode.toUpperCase()} â€” ${activeZones.length} active zones `
      + `(${namedZones.length} named, ${activeZones.length - namedZones.length} grid)`
      + '.'
    );

    // Phase 6 â€” repeat-search scheduling. A zone that already yielded three or
    // more validated mobiles for this category in the last 24 hours is still
    // covered, but it queues behind fresh ground. Coverage never shrinks.
    let repeatCoveredZones = new Set();
    if (!isMaster) {
      try {
        repeatCoveredZones = findRepeatCoveredZones({ category, location: baseLocation });
        if (repeatCoveredZones.size) {
          addLog(`[Repeat Search] ${repeatCoveredZones.size} zone(s) already covered with 3+ verified mobiles in the last 24h â€” queued last, coverage kept.`);
        }
      } catch (repeatError) {
        addLog(`[Repeat Search] Notice: ${repeatError.message}`);
      }
    }

    try {
      emitDispatchEvent(zones.map(z => z.zoneName), sessionId);
    } catch (e) {}

    // Run boundary for text-query ("vector") zones.
    let cityReachKm = 0;
    if (baseGeo && Number.isFinite(Number(baseGeo.lat))) {
      for (const zone of zones) {
        if (!Number.isFinite(Number(zone.lat)) || !Number.isFinite(Number(zone.lng))) continue;
        cityReachKm = Math.max(cityReachKm, getDistanceKm(
          Number(baseGeo.lat), Number(baseGeo.lng), Number(zone.lat), Number(zone.lng)
        ));
      }
    }
    const vectorBoundaryKm = Math.max(12, Math.min(45, cityReachKm + 5));

    // Emit the full zone coverage, not just the base pin, so the command map
    // can display every coverage zone properly across India and all global countries.
    const anchorCoord = (baseGeo && Number.isFinite(Number(baseGeo.lat)))
      ? { lat: Number(baseGeo.lat), lng: Number(baseGeo.lng), district: baseGeo.district, state: baseGeo.state, boundingbox: baseGeo.boundingbox }
      : (planCenter || (zones.find(z => z.lat && z.lng) ? { lat: Number(zones.find(z => z.lat && z.lng).lat), lng: Number(zones.find(z => z.lat && z.lng).lng) } : null));

    if (anchorCoord && Number.isFinite(anchorCoord.lat) && Number.isFinite(anchorCoord.lng)) {
      try {
        const zonePoints = zones.map((zone, index) => {
          const rawLat = zone.lat ?? zone.latitude;
          const rawLng = zone.lng ?? zone.longitude;
          const hasCoords = Number.isFinite(Number(rawLat)) && Number.isFinite(Number(rawLng));
          const zName = zone.zoneName || zone.name || `Zone ${index + 1}`;
          const zQuery = zone.queryText || zone.query || `${searchPhrase} in ${zName}`;
          return {
            zoneName: zName,
            name: zName,
            query: zQuery,
            queryText: zQuery,
            lat: hasCoords ? Number(rawLat) : anchorCoord.lat,
            lng: hasCoords ? Number(rawLng) : anchorCoord.lng,
            radiusKm: zone.radiusKm || 6.0,
            approx: !hasCoords || Boolean(zone.isApproximate || zone.approx),
            index: index + 1,
            centerLoc: baseLocation,
            district: zone.district || anchorCoord.district || baseLocation,
            state: zone.state || anchorCoord.state || regionLabel,
            deferred: deferredKeys.has(zoneKey(zone)),
            pass: isGridZone(zone) ? 'grid' : 'named'
          };
        });
        emitGridEvent([{
          sessionId,
          lat: anchorCoord.lat,
          lng: anchorCoord.lng,
          distanceFromCenter: 0,
          ring: 0,
          angle: 0,
          centerLoc: baseLocation,
          activeRadius: Number(radius) || 5,
          isExactPoint: true,
          boundingbox: anchorCoord.boundingbox,
          zones: zonePoints
        }, ...zonePoints]);
        addLog(`[Orchestrator] ðŸ›°ï¸ Coverage grid emitted: ${zonePoints.length} zones anchored around ${anchorCoord.lat.toFixed(4)}, ${anchorCoord.lng.toFixed(4)}.`);
      } catch (e) {}
    }

    let totalZones = plan?.resumed ? (plan.originalTotalZones || activeZones.length) : activeZones.length;
    let completedZones = plan?.resumed ? (plan.initialCompletedCount || 0) : 0;
    const startTime = Date.now();
    const adaptiveSplitDone = new Set();
    let adaptiveSplitsUsed = 0;
    const MAX_ADAPTIVE_SPLITS = 16;
    const cellStates = {};

    // Honest ETA: measured browser-seconds per zone divided by the slots the
    // budget is actually allowing right now (not a fixed 5, not zones Ã— 6 s).
    const etaPerZone = etaModel.secondsPerZoneFor(activeEngines);
    const etaSlots = etaModel.liveBrowserSlots(getConcurrencyMetrics());

    const initialEtaMs = etaModel.modelEtaMs(Math.max(0, totalZones - completedZones), etaSlots, etaPerZone);
    const initialEtaStr = formatEta(initialEtaMs);

    activeSessions[sessionId] = {
      ...(activeSessions[sessionId] || {}),
      sessionId,
      userId,
      isMaster: Boolean(isMaster),
      category,
      location: baseLocation,
      family: classification.family,
      engines: activeEngines,
      baseLat: baseGeo?.lat || null,
      baseLng: baseGeo?.lng || null,
      status: 'running',
      totalDistricts: 1,
      completedDistricts: 0,
      activeDistrict: baseLocation,
      totalMandals: totalZones,
      completedMandals: completedZones,
      activeMandal: activeZones[0]?.zoneName || 'Zone 1',
      totalMandalsAcrossAll: totalZones,
      overallTotalMandals: totalZones,
      overallCompletedMandals: completedZones,
      eta: initialEtaStr,
      etaText: initialEtaStr,
      etaMs: initialEtaMs,
      pendingJobs: Math.max(0, totalZones - completedZones),
      runningJobs: 0,
      sessionActive: true,
      aborted: false,
      finished: false,
      completedTargetsMap: activeSessions[sessionId]?.completedTargetsMap || {},
      completedZoneIndices: activeSessions[sessionId]?.completedZoneIndices || (plan?.resumed ? (plan.completedZoneIndices || []) : []),
      completedZoneNames: activeSessions[sessionId]?.completedZoneNames || (plan?.resumed ? (plan.completedZoneNames || []) : []),
      coverageMode,
      scope: plan?.resolvedScope || (isMaster ? 'district' : 'city'),
      district: plan?.district || null,
      state: plan?.state || null,
      title: plan?.title || baseLocation,
      boundary: plan?.boundary || null,
      deferredZones: deferredZones.map(z => z.zoneName),
      activeZoneNames: activeZones.map(z => z.zoneName),
      fullHierarchy: [{
        districtName: baseLocation,
        mandals: activeZones.map(z => z.zoneName)
      }],
      zones,
      startTime
    };

    // Emit initial progress
    try {
      const firstActive = activeZones[0];
      let firstLat = Number(firstActive?.lat ?? firstActive?.latitude);
      let firstLng = Number(firstActive?.lng ?? firstActive?.longitude);
      if ((!Number.isFinite(firstLat) || !Number.isFinite(firstLng)) && firstActive) {
        const { ZONE_COORDINATES } = require('../../utils/universalGeoCluster');
        const fKey = String(firstActive.zoneName || firstActive.name || '').toLowerCase().trim();
        const fallbackC = ZONE_COORDINATES[fKey] || anchorCoord;
        if (fallbackC) {
          firstLat = Number(fallbackC.lat);
          firstLng = Number(fallbackC.lng);
        }
      }
      const firstActivePayload = firstActive ? {
        name: firstActive.zoneName || firstActive.name || 'Zone 1',
        lat: firstLat,
        lng: firstLng,
        radiusKm: firstActive.radiusKm || 6.0,
        index: 1,
        total: totalZones
      } : null;

      emitProgressEvent({
        sessionId,
        totalDistricts: 1,
        completedDistricts: 0,
        activeDistrict: baseLocation,
        totalMandals: totalZones,
        completedMandals: 0,
        activeMandal: firstActive?.zoneName || 'Zone 1',
        activeZone: firstActivePayload,
        totalMandalsAcrossAll: totalZones,
        overallCompletedMandals: 0,
        eta: initialEtaStr,
        etaText: initialEtaStr,
        etaMs: initialEtaMs,
        pendingJobs: Math.max(0, totalZones - completedZones),
        runningJobs: 0,
        queuedZones: Math.max(0, totalZones - completedZones),
        doneZones: completedZones,
        runningZones: 0,
        sessionActive: true
      });
      if (firstActivePayload && Number.isFinite(firstLat) && Number.isFinite(firstLng)) {
        emitActivePointEvent({
          zoneName: firstActivePayload.name,
          locationName: firstActivePayload.name,
          lat: firstLat,
          lng: firstLng,
          index: 1,
          total: totalZones,
          sessionId,
          active: true
        });
      }
    } catch (e) {}

    const geocodeCache = getGeoCache();
    const radiusKm = Number(radius) || 6.0;
    // Engine alias matching lives in scopeEngines/engineMatch.js, so the scope
    // plan and the orchestrator can never disagree about what is enabled.
    const hasEngine = makeHasEngine(activeEngines);

    // 2a. TIER 0 TURBO-BURST: Instant Sub-Second Leads (<1.5s)
    // Runs direct keyless HTTP engines (JustDial Mobile JSON + Google Local HTTP + OSM + Web Discovery)
    // immediately without queuing delays, delivering verified mobile leads right at second 0!
    const cleanBaseCity = baseLocation
      .replace(/\s*\([^)]*SWEEP\)/gi, '')
      .replace(/\s+\b(District|Dist|Mandal|Tehsil|Taluk|Block)\b/gi, '')
      .trim();
    const tier0JustDialBase = countryCode === 'IN' && hasEngine('justdial') && Boolean(cleanBaseCity);

    if (
      hasEngine('justdial')
      || hasEngine('openstreetmap')
      || hasEngine('web-discovery')
      || hasEngine('local_finder')
      || hasEngine('maps')
    ) {
      const runBurst = async (engineKey, label, fn) => {
        const t0 = Date.now();
        try {
          const result = await fn();
          const count = result && typeof result === 'object'
            ? Number(result.totalScraped ?? result.newInserted ?? result.count ?? 0)
            : 0;
          engineHealth.recordRun(engineKey, {
            ok: true,
            ms: Date.now() - t0,
            count,
            note: `${label} turbo-burst`
          });
          requestGuard.observe(engineKey, { ok: true, result });
          return result;
        } catch (error) {
          engineHealth.recordRun(engineKey, { ok: false, error: error.message, ms: Date.now() - t0 });
          requestGuard.observe(engineKey, { ok: false, error: error.message });
          addLog(`[Turbo-Burst] ${label} skipped: ${error.message}`);
          return null;
        }
      };

      const { runWithContext } = require('../runContext');
      runWithContext(
        { userId, sessionId, isMaster, country: countryCode },
        () => (async () => {
          try {
            addLog(`[Turbo-Burst] âš¡ Launching Tier-0 direct HTTP burst for instant first leads...`);
            const burstTasks = [];

            if (tier0JustDialBase) {
              const { scrapeJustDial, setDeps: setJdDeps } = require('../../scrapers/engine-justdial');
              if (typeof setJdDeps === 'function') {
                setJdDeps({ logger: addLog, emitVendorEvent: guardedEmitVendorEvent, abortSignal: sessionAbortSignal });
              }
              burstTasks.push(runBurst('justdial', 'JustDial Mobile API', () => scrapeJustDial(
                category,
                cleanBaseCity,
                'omni',
                sessionId
              )));
            }

            if ((hasEngine('local_finder') || hasEngine('maps')) && cleanBaseCity && !serpBreaker.isBlocked()) {
              const { fetchGoogleLocalHttp } = require('../../utils/fastGoogleHttp');
              burstTasks.push(runBurst('google-local-finder', 'Google Local HTTP', async () => {
                const httpRes = await fetchGoogleLocalHttp(`${searchPhrase} in ${cleanBaseCity}`, 0, category, countryCode);
                if (!httpRes || httpRes.fallbackToBrowser || !Array.isArray(httpRes.leads) || !httpRes.leads.length) {
                  return { count: 0 };
                }
                let inserted = 0;
                const owner = dbAdapter.getSessionOwner(sessionId) || userId || 'admin_1';
                for (const item of httpRes.leads) {
                  if (isAborted() || !item || !item.name) continue;
                  if (!isVendorRelevant({ name: item.name, address: item.address, category: item.category || category }, category)) {
                    try {
                      const { archiveDivergentLead } = require('../divergentLeadService');
                      archiveDivergentLead(item, category);
                    } catch (e) {}
                    continue;
                  }
                  if (!isMaster && cleanBaseCity) {
                    const containment = isListingRelevantToQuery(
                      item.name, item.address, '', regionLabel, cleanBaseCity, cleanBaseCity,
                      null, baseGeo?.boundingbox || null, cleanBaseCity, false, 'city'
                    );
                    if (!containment.relevant) continue;
                  }
                  const parsed = item.phone
                    ? parsePhone(item.phone, { defaultCountry: countryCode, allowInternational: countryCode !== 'IN', context: 'phone tel' })
                    : null;
                  const displayPhone = parsed ? (parsed.displayPhone || parsed.e164) : '';
                  const isMob = Boolean(parsed && parsed.isMobile);
                  const isLand = Boolean(parsed && parsed.isLandline);
                  const score = displayPhone ? (isMob ? 88 : 78) : (item.website ? 65 : 48);
                  const candidate = {
                    id: `glh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
                    name: item.name,
                    category,
                    address: item.address || '',
                    city: cleanBaseCity,
                    state: regionLabel,
                    country: countryCode,
                    phone: displayPhone,
                    mobilePhone: isMob ? displayPhone : '',
                    landlinePhone: isLand ? displayPhone : '',
                    phones: displayPhone ? [displayPhone] : [],
                    phoneType: parsed ? (isMob ? 'mobile' : 'landline') : '',
                    isMobile: isMob,
                    isLandline: isLand,
                    callUrl: parsed ? (parsed.callUrl || `tel:${parsed.digits}`) : '',
                    whatsappAvailable: isMob,
                    whatsappLink: isMob && parsed?.digits
                      ? `https://wa.me/${parsed.digits}?text=Hi%20${encodeURIComponent(item.name)}%2C%20I%20found%20your%20business%20on%20Scraper.co.in%20and%20wanted%20to%20connect.`
                      : '',
                    rating: item.rating ?? null,
                    reviewsCount: item.reviewsCount ?? null,
                    website: item.website || '',
                    mapsLink: item.mapsLink || '',
                    qualityScore: score,
                    tier: determineTier(score),
                    source: 'Google Local Finder',
                    sourceEngine: 'google-local-finder',
                    verified: Boolean(displayPhone),
                    scrapedAt: new Date().toISOString(),
                    sessionId,
                    userId: owner
                  };
                  const existing = dbAdapter.findMatch(candidate);
                  if (!existing) {
                    dbAdapter.saveVendor(owner, candidate);
                    try { guardedEmitVendorEvent(candidate, 'inserted'); } catch (e) {}
                    if (!isMob) {
                      try { streamingEnricher.enqueue(candidate); } catch (e) {}
                    }
                    inserted++;
                  } else {
                    let enrichedExisting = false;
                    if (isMob && !existing.mobilePhone) { existing.mobilePhone = displayPhone; existing.phone = displayPhone; existing.isMobile = true; enrichedExisting = true; }
                    if (isLand && !existing.landlinePhone) { existing.landlinePhone = displayPhone; existing.isLandline = true; if (!existing.phone) existing.phone = displayPhone; enrichedExisting = true; }
                    if (enrichedExisting || (!existing.phone && candidate.phone)) {
                      existing.phone = existing.phone || candidate.phone;
                      existing.phones = [...new Set([...(existing.phones || []), candidate.phone])];
                      existing.sessionId = sessionId;
                      dbAdapter.saveVendor(owner, existing);
                      try { guardedEmitVendorEvent(existing, 'updated'); } catch (e) {}
                    }
                  }
                }
                if (inserted > 0) {
                  addLog(`[Turbo-Burst] Google Local HTTP streamed ${inserted} instant lead(s) at second 0.`);
                }
                return { count: inserted, totalScraped: inserted, newInserted: inserted };
              }));
            }

            if (hasEngine('openstreetmap')) {
              const { scrapeOpenStreetMap, setDeps: setOsmDeps } = require('../../scrapers/engine-openstreetmap');
              if (typeof setOsmDeps === 'function') setOsmDeps({ logger: addLog, emitVendorEvent: guardedEmitVendorEvent, abortSignal: sessionAbortSignal });
              burstTasks.push(runBurst('openstreetmap', 'OpenStreetMap', () => scrapeOpenStreetMap(
                category,
                cleanBaseCity,
                sessionId,
                baseGeo?.lat || null,
                baseGeo?.lng || null,
                Math.max(6, radiusKm + 5),
                countryCode
              )));
            }
            if (hasEngine('web-discovery')) {
              const { scrapeWebDiscovery, setDeps: setWdDeps } = require('../../scrapers/engine-web-discovery');
              if (typeof setWdDeps === 'function') setWdDeps({ logger: addLog, emitVendorEvent: guardedEmitVendorEvent, abortSignal: sessionAbortSignal });
              // Web Discovery drives a Chromium page, so it must take a real
              // browser slot even though it runs in the burst instead of the
              // queue. Without this it competed with the queue and failed 6/6.
              burstTasks.push(runBurst('web-discovery', 'Web Discovery', async () => {
                const release = await browserBudget.acquireBrowserSlot({
                  signal: sessionAbortSignal,
                  timeoutMs: 45000
                });
                try {
                  return await scrapeWebDiscovery(
                    category,
                    cleanBaseCity,
                    sessionId,
                    { countryCode, limit: 8 }
                  );
                } finally {
                  release();
                }
              }));
            }
            if (hasEngine('wikidata')) {
              const { scrapeWikidata, setDeps: setWkDeps } = require('../../scrapers/engine-wikidata-businesses');
              if (typeof setWkDeps === 'function') setWkDeps({ logger: addLog, emitVendorEvent: guardedEmitVendorEvent, abortSignal: sessionAbortSignal });
              burstTasks.push(runBurst('wikidata', 'Wikidata', () => scrapeWikidata(category, cleanBaseCity, sessionId, countryCode)));
            }
            if (hasEngine('social') || hasEngine('social-dork') || hasEngine('social-dork-intl')) {
              const { scrapeSocialDorkIntl, setDeps: setSdIntlDeps } = require('../../scrapers/engine-social-dork-intl');
              if (typeof setSdIntlDeps === 'function') {
                setSdIntlDeps({ logger: addLog, emitVendorEvent: guardedEmitVendorEvent, abortSignal: sessionAbortSignal });
              }
              burstTasks.push(runBurst('social', 'Social & 3D Profile Hunter', () => scrapeSocialDorkIntl(category, cleanBaseCity, sessionId, countryCode)));
            }
            if (hasEngine('trustpilot')) {
              const { scrapeTrustpilot, setDeps: setTpDeps } = require('../../scrapers/engine-trustpilot');
              if (typeof setTpDeps === 'function') setTpDeps({ logger: addLog, emitVendorEvent: guardedEmitVendorEvent, abortSignal: sessionAbortSignal });
              burstTasks.push(runBurst('trustpilot', 'Trustpilot', () => scrapeTrustpilot(category, cleanBaseCity, sessionId, { countryCode })));
            }
            await Promise.allSettled(burstTasks);
            addLog(`[Turbo-Burst] ðŸš€ Tier-0 direct HTTP burst complete: first leads delivered to Command Center.`);
          } catch (err) {
            addLog(`[Turbo-Burst] Notice: ${err.message}`);
          }
        })()
      );
    }

    // Pre-warm the zone context pool while the directory engines are queued.
    // Five contexts created at once on a cold browser cost ~5 s; created one
    // at a time in the background they cost a fraction of that, and the first
    // wave then starts against a warm pool.
    const zonePoolWarm = hasEngine('maps')
      ? (async () => {
          try {
            const { getBrowser } = require('../../scrapers/browserFactory');
            const browser = await getBrowser();
            await warmZoneContextPool(browser);
          } catch (e) {
            addLog(`[Orchestrator] Zone pool warm skipped: ${e.message}`);
          }
        })()
      : Promise.resolve();

    // 2b. Directory & marketplace engines, planned by territory.
    //     City/mandal: one query at the settlement.
    //     District/state (Master): JustDial also queried from the largest towns.
    //     The plan lives in services/scopeEngines so client and Master runs use
    //     explicit, testable rules instead of inline conditionals.
    const enginePlan = planScopeEngines({
      engines: activeEngines,
      category,
      searchPhrase,
      baseLocation,
      sessionId,
      zones,
      plan,
      isMaster,
      countryCode
    });
    for (const note of enginePlan.notes) addLog(note);
    const budget = isMaster ? enginePlan.limits.zoneBudget.master : enginePlan.limits.zoneBudget.client;
    const budgetText = Number.isFinite(budget) ? `${budget} zone budget` : 'no zone cap';
    addLog(`[Scope Engines] ${enginePlan.scope} plan for this ${isMaster ? 'Master' : 'client'} run: `
      + `${enginePlan.jobs.length} directory job(s), ${budgetText}`
      + `${enginePlan.swarmTowns.length ? `, ${enginePlan.swarmTowns.length} JustDial swarm centre(s)` : ''}.`);

    for (const job of enginePlan.jobs) {
      const taskName = job.task;
      const args = job.args;
      if (
        tier0JustDialBase
        && taskName === 'scrapeJustDial'
        && String(args?.[1] || '').toLowerCase().trim() === String(baseLocation || '').toLowerCase().trim()
      ) {
        continue;
      }
      try {
        const jobPriority = taskName === 'scrapeDuckDuckGoDork' ? 2 : 12;
        await addScrapeJob(taskName, args, jobPriority, {
          lat: baseGeo?.lat || null,
          lng: baseGeo?.lng || null,
          zoneName: baseLocation,
          locationName: baseLocation,
          district: baseLocation,
          state: regionLabel,
          country: countryCode,
          sessionId,
          userId,
          isMaster,
          active: true,
          cityScope: true
        });
        addLog(`[Orchestrator] Queued simultaneous directory engine: ${taskName}`);
      } catch (e) {
        addLog(`[Orchestrator] Could not queue ${taskName}: ${e.message}`);
      }
    }

    // 2b. Queue all active zones immediately into the high-speed worker pool!
    // Zone pool warming continues in parallel in the background so Zone 1 starts at t=0ms.
    zonePoolWarm.catch(() => {});
    for (const deferred of deferredZones) {
      activeSessions[sessionId].completedTargetsMap[zoneKey(deferred)] = 'deferred';
    }

    const queuedQueryKeys = new Set();
    for (let zi = 0; zi < activeZones.length; zi++) {
      if (isAborted()) break;

      const z = activeZones[zi];
      const zoneLabel = z.zoneName || z.name || '';
      const zoneQueryBase = String(z.queryText || `${searchPhrase} in ${zoneLabel}`);
      const zoneQuery = (z.isVectorQuery || zoneQueryBase.toLowerCase().includes(searchPhrase.toLowerCase())) ? zoneQueryBase : `${searchPhrase} in ${zoneQueryBase}`;

      const queryKey = String(zoneQuery).toLowerCase().replace(/\s+/g, ' ').trim();
      if (queuedQueryKeys.has(queryKey)) {
        activeSessions[sessionId].completedTargetsMap[String(zoneLabel).toLowerCase().trim()] = 'completed';
        continue;
      }
      queuedQueryKeys.add(queryKey);

      const zoneCacheKey = `${zoneLabel}, ${baseLocation}`.toLowerCase().trim();
      const zoneGeo = (z.lat && z.lng) ? { lat: z.lat, lng: z.lng } : (geocodeCache[zoneCacheKey] || baseGeo);

      const targetDistrict = z.district || baseLocation;
      const targetState = z.state || (countryCode === 'IN' ? 'India' : regionLabel);

      const coverageKind = z.coverageKind || (z.kind === 'grid' ? 'grid' : 'vector');
      const zoneRadius = coverageKind === 'grid'
        ? (Number(z.radiusKm) > 0 ? Number(z.radiusKm) : 2.2) + 1.5
        : (Number(z.radiusKm) >= 20 ? Number(z.radiusKm) : vectorBoundaryKm);
      const cellViewportKm = (Number(z.radiusKm) > 0 && Number(z.radiusKm) <= 8)
        ? Number(z.radiusKm)
        : (coverageKind === 'grid' ? 2.2 : 2.5);

      const meta = {
        lat: zoneGeo?.lat || null,
        lng: zoneGeo?.lng || null,
        zoneName: z.zoneName,
        locationName: z.zoneName,
        district: targetDistrict,
        state: targetState,
        country: countryCode,
        sessionId,
        userId,
        isMaster,
        active: true,
        coverageKind,
        boundaryKm: zoneRadius
      };

      activeSessions[sessionId].completedTargetsMap[String(zoneLabel).toLowerCase().trim()] = 'queued';

      const zoneEngines = Array.isArray(z.engines) ? z.engines : null;
      const allowMaps = hasEngine('maps') && (!zoneEngines || zoneEngines.includes('maps'));
      const allowLocalFinder = hasEngine('local_finder')
        && (!zoneEngines || zoneEngines.includes('local_finder'))
        && (!allowMaps || (!isGridZone(z) && !serpBreaker.isBlocked()));

      const zoneScope = z.scope || plan?.resolvedScope || (isMaster ? 'district' : null);
      const zoneAlreadyCovered = repeatCoveredZones.has(zoneKey(z));

      // High-velocity wave priority: The first 5 zones share top priority tier (30) so
      // the worker pool launches all safe parallel browser lanes concurrently at full speed,
      // streaming prime downtown commercial leads first. Subsequent waves follow.
      const basePriority = isGridZone(z)
        ? Math.max(3, 10 - Math.floor(zi / 4))
        : Math.max(10, 30 - Math.floor(zi / 5));
      // Keep repeat-covered Maps zones above slow background social dork jobs (priority 2)
      // so zones 29..N are never starved mid-city.
      const zonePriority = zoneAlreadyCovered ? 6 : basePriority;

      if (allowMaps) {
        await addScrapeJob(
          'scrapeGooglePlaces',
          [zoneQuery, category, z.zoneName, sessionId, zoneGeo?.lat || null, zoneGeo?.lng || null, cellViewportKm, 'broad', targetDistrict, targetState, zoneGeo?.boundingbox || null, baseLocation, isMaster, zoneScope, z.mandal || (zoneScope === 'mandal' ? z.zoneName : null), countryCode],
          zonePriority,
          meta
        );
      }
      if (allowLocalFinder) {
        await addScrapeJob(
          'scrapeGoogleLocalFinder',
          [zoneQuery, category, z.zoneName, sessionId, 6, targetDistrict, targetState, zoneGeo, baseLocation, Boolean(allowMaps), isMaster, zoneScope, countryCode],
          Math.max(4, zonePriority - 1),
          meta
        );
      }
    }

    addLog(`[Orchestrator] Queued all ${activeZones.length} active zone jobs into high-speed swarm. Monitoring execution...`);

    // 3. Monitor swarm progress & emit dynamic sliding-window ETA
    let waitTicks = 0;
    let allZonesCompleteAt = null;
    let lastLiveSavedCount = -1;
    // The safety window is a wedge detector, not a schedule. A fixed wall-clock
    // cap used to finalise healthy sweeps early: an 86-zone Vijayawada run was
    // closed at 71 zones, which flipped the console's Stop button back to
    // "Find Leads" while 15 zones were still queued. The loop now watches for a
    // stall. As long as zones keep completing it keeps going; only a run that
    // makes no progress for STALL_MS (or blows a very high ceiling) stops.
    const maxScrapeWindowMs = Math.max(45 * 60_000, etaModel.safetyWindowMs(totalZones, etaSlots, etaPerZone) * 10);
    const stallLimitMs = Math.max(8 * 60_000, Number(etaPerZone || 0) * 6000);
    let lastZoneAdvanceAt = Date.now();
    let lastSeenCompletedZones = -1;
    // Timestamps of the last few completed zones. The overall average lags a
    // run that slows down (Google cooldown, fewer live slots), which is how a
    // 86-zone sweep promised 10 minutes and took 18.8. A recent window makes
    // the ETA react within a handful of zones.
    const completionTimes = [];
    let lastTallyLeadCount = -1;
    let lastTallyDoneZones = -1;
    while (true) {
      if (isAborted()) break;

      const currentQueue = getPersistentQueue();
      const running = getActiveJobs();

      const belongsToSession = (job) => Array.isArray(job.args) && job.args.includes(sessionId);
      const pendingForSession = currentQueue.filter(belongsToSession);
      const runningForSession = running.filter(belongsToSession);
      const isAuxSocialTask = (job) => ['scrapeDuckDuckGoDork', 'scrapeSocialDorkIntl'].includes(job?.taskName);
      const primaryPendingForSession = pendingForSession.filter(j => !isAuxSocialTask(j));
      const primaryRunningForSession = runningForSession.filter(j => !isAuxSocialTask(j));

      const sessionState = activeSessions[sessionId] || {};
      const targetMap = sessionState.completedTargetsMap || {};
      const targetKeys = Object.keys(targetMap);
      const baseFinished = plan?.resumed ? (plan.initialCompletedCount || 0) : 0;
      const finishedZones = baseFinished + targetKeys.filter(key => ['completed', 'deferred', 'error', 'failed'].includes(targetMap[key])).length;
      completedZones = Math.min(totalZones, finishedZones);

      // Stall detector: progress, not the clock, decides whether a sweep lives.
      if (completedZones > lastSeenCompletedZones) {
        const now = Date.now();
        const advanced = completedZones - Math.max(0, lastSeenCompletedZones);
        for (let i = 0; i < advanced; i++) completionTimes.push(now);
        while (completionTimes.length > 12) completionTimes.shift();
        lastSeenCompletedZones = completedZones;
        lastZoneAdvanceAt = now;
      }
      if (Date.now() - lastZoneAdvanceAt > stallLimitMs) {
        addLog(`[Orchestrator] No zone completed for ${Math.round(stallLimitMs / 60000)} min (${finishedZones}/${totalZones}). Treating the pool as wedged and finalizing.`);
        break;
      }

      let etaStr = 'Calculating...';
      let etaMs = 0;
      const elapsed = Date.now() - startTime;
      const remainingZones = Math.max(0, totalZones - completedZones);

      // Tail Zone Boost: When 2 or fewer zones remain, boost their queue priority to 35
      // so all available worker slots immediately swarm and finish the final zones.
      if (remainingZones <= 2 && pendingForSession.length > 0) {
        for (const pj of pendingForSession) {
          if (pj.priority < 35) pj.priority = 35;
        }
      }

      // Zones that are running right now are partly done, so count them as half
      // done. Without this the ETA stayed frozen at the static model until the
      // first wave of zones finished.
      const effectiveDone = Math.min(totalZones, completedZones + 0.5 * runningForSession.length);
      const effectiveRemaining = Math.max(0, totalZones - effectiveDone);
      const modelPerZoneWallMs = (Number(etaPerZone) * 1000) / Math.max(1, etaSlots);
      if (completedZones >= 3) {
        // After a few real completions the run's own wall-clock average beats
        // any model. It already includes the live concurrency.
        const avgTimePerZone = elapsed / completedZones;
        // Blend a recent window with the overall average and never promise a
        // shorter finish than the overall average implies, so a slowing sweep
        // raises its ETA instead of holding a stale, optimistic number.
        let perZone = avgTimePerZone;
        if (completionTimes.length >= 4) {
          const span = completionTimes[completionTimes.length - 1] - completionTimes[0];
          const gaps = completionTimes.length - 1;
          if (span > 0 && gaps > 0) {
            const recentPerZone = span / gaps;
            perZone = Math.max(avgTimePerZone, recentPerZone * 0.6 + avgTimePerZone * 0.4);
          }
        }
        etaMs = effectiveRemaining * perZone;
      } else if (completedZones >= 1) {
        // One or two completions: average the measured pace with the model.
        const perZone = ((elapsed / completedZones) + modelPerZoneWallMs) / 2;
        etaMs = effectiveRemaining * perZone;
      } else {
        // Nothing finished yet: count the static model down from the start,
        // but never claim fewer than 15% of it remains.
        const modelTotalMs = etaModel.modelEtaMs(totalZones, etaSlots, etaPerZone);
        etaMs = Math.max(modelTotalMs * 0.15, modelTotalMs - elapsed);
      }
      if (effectiveRemaining === 0 && (pendingForSession.length > 0 || runningForSession.length > 0)) {
        // Stage 2: Auxiliary Social & Contact Discovery queue drain
        const pendingCount = pendingForSession.length + runningForSession.length;
        const avgTaskSec = 3.5;
        const slots = Math.max(1, etaSlots);
        etaMs = Math.round((pendingCount * avgTaskSec / slots) * 1000);
      }
      etaMs = Math.max(0, Math.round(etaMs));
      etaStr = formatEta(etaMs);
      const activeRunningJob = runningForSession[0];
      const nextZone = activeZones.find(zone => targetMap[zoneKey(zone)] !== 'completed');
      const activeZoneName = activeRunningJob?.meta?.locationName || nextZone?.zoneName || 'Finalizing';

      // Tally live per-zone lead yields & trigger adaptive micro-splits only when lead count or zone completions advance
      try {
        const sessionLeadsNow = dbAdapter.getVendorsBySession(sessionId) || [];
        if (sessionLeadsNow.length !== lastTallyLeadCount || completedZones !== lastTallyDoneZones) {
          lastTallyLeadCount = sessionLeadsNow.length;
          lastTallyDoneZones = completedZones;
          const zoneTallies = new Map();
          for (const lead of sessionLeadsNow) {
            if (!lead) continue;
            const rawZ = String(lead.mandal || lead.zone || lead.locality || lead.locationName || '').toLowerCase().trim();
            let matchedKey = rawZ && targetMap[rawZ] !== undefined ? rawZ : '';
            if (!matchedKey && Number.isFinite(Number(lead.latitude)) && Number.isFinite(Number(lead.longitude))) {
              let bestDist = 3.5;
              for (const az of activeZones) {
                const aLat = Number(az.lat ?? az.latitude);
                const aLng = Number(az.lng ?? az.longitude);
                if (!Number.isFinite(aLat) || !Number.isFinite(aLng)) continue;
                const dk = getDistanceKm(aLat, aLng, Number(lead.latitude), Number(lead.longitude));
                if (dk < bestDist) { bestDist = dk; matchedKey = zoneKey(az); }
              }
            }
            if (!matchedKey) continue;
            const t = zoneTallies.get(matchedKey) || { total: 0, mobiles: 0 };
            t.total += 1;
            if (hasValidMobile(lead.phone, countryCode)) t.mobiles += 1;
            zoneTallies.set(matchedKey, t);
          }

          const runningNames = new Set(runningForSession.map(j => String(j?.meta?.zoneName || j?.meta?.locationName || '').toLowerCase().trim()));
          for (let zi = 0; zi < activeZones.length; zi++) {
            const az = activeZones[zi];
            const zK = zoneKey(az);
            const tState = targetMap[zK];
            const tally = zoneTallies.get(zK) || { total: 0, mobiles: 0 };
            let statusLabel = 'queued';
            if (runningNames.has(zK) || (zK && zK === String(activeZoneName).toLowerCase().trim() && !tState)) {
              statusLabel = 'scanning';
            } else if (tState === 'completed') {
              statusLabel = tally.total >= 18 ? 'saturated' : tally.total === 0 ? 'dry' : 'done';
            } else if (tState === 'failed' || tState === 'error') {
              statusLabel = 'resting';
            }
            cellStates[az.zoneName || az.name || `Zone ${zi + 1}`] = {
              state: statusLabel,
              leads: tally.total,
              mobiles: tally.mobiles,
              splitDepth: az._splitDepth || 0
            };

            // Adaptive quad-split: when a cell hits >=18 leads (or >=12 for high-density categories like dentists/hospitals/wedding), subdivide into 4 tighter 1.2km micro-cells
            const azLat = Number(az.lat ?? az.latitude);
            const azLng = Number(az.lng ?? az.longitude);
            const isHighDensityCategory = /\b(dentist|dental|doctor|clinic|hospital|wedding|venue|hall|photograph)\b/i.test(category);
            const splitThreshold = isHighDensityCategory ? 12 : 18;
            if (
              tState === 'completed'
              && tally.total >= splitThreshold
              && !az._splitDepth
              && !adaptiveSplitDone.has(zK)
              && adaptiveSplitsUsed < MAX_ADAPTIVE_SPLITS
              && Number.isFinite(azLat) && Number.isFinite(azLng)
              && hasEngine('maps')
              && !isAborted()
            ) {
              adaptiveSplitDone.add(zK);
              const offsets = [
                { tag: 'NE', dLat: 0.0075, dLng: 0.0075 },
                { tag: 'NW', dLat: 0.0075, dLng: -0.0075 },
                { tag: 'SE', dLat: -0.0075, dLng: 0.0075 },
                { tag: 'SW', dLat: -0.0075, dLng: -0.0075 }
              ];
              for (const off of offsets) {
                if (adaptiveSplitsUsed >= MAX_ADAPTIVE_SPLITS) break;
                const subLat = Number((azLat + off.dLat).toFixed(5));
                const subLng = Number((azLng + off.dLng).toFixed(5));
                const subName = `${az.zoneName || az.name} · ${off.tag}`;
                const subKey = String(subName).toLowerCase().trim();
                const subQuery = `${searchPhrase} near ${subLat},${subLng}`;
                const subZone = {
                  zoneName: subName,
                  queryText: subQuery,
                  district: az.district || baseLocation,
                  state: az.state || regionLabel,
                  lat: subLat,
                  lng: subLng,
                  radiusKm: 1.2,
                  coverageKind: 'split',
                  _splitDepth: 1,
                  index: activeZones.length + 1
                };
                activeZones.push(subZone);
                zones.push(subZone);
                targetMap[subKey] = 'queued';
                cellStates[subName] = { state: 'queued', leads: 0, mobiles: 0, splitDepth: 1 };
                totalZones += 1;
                adaptiveSplitsUsed += 1;
                await addScrapeJob(
                  'scrapeGooglePlaces',
                  [subQuery, category, subName, sessionId, subLat, subLng, 1.2, 'broad', az.district || baseLocation, az.state || regionLabel, null, baseLocation, isMaster, az.scope || null, az.mandal || null, countryCode],
                  18,
                  { lat: subLat, lng: subLng, zoneName: subName, locationName: subName, district: az.district || baseLocation, state: az.state || regionLabel, country: countryCode, sessionId, userId, isMaster, active: true, coverageKind: 'split', boundaryKm: 3 }
                );
              }
              if (activeSessions[sessionId]) {
                activeSessions[sessionId].totalMandals = totalZones;
                activeSessions[sessionId].totalMandalsAcrossAll = totalZones;
                activeSessions[sessionId].overallTotalMandals = totalZones;
              }
              addLog(`[Adaptive Radar] ⚡ Hotspot "${az.zoneName}" (${tally.total} leads) split into 4 micro-cells for max extraction.`);
            }
          }
        }
      } catch (adaptiveErr) { /* best-effort adaptive split */ }

      // Keep the session snapshot as truthful as the SSE event. Before this,
      // `overallCompletedMandals` was written once at start and never updated,
      // so /api/scrape/active (and anything that reconnects) saw 0/28 for the
      // whole run even though the stream was correct.
      const liveSession = activeSessions[sessionId];
      if (liveSession) {
        liveSession.completedMandals = completedZones;
        liveSession.overallCompletedMandals = completedZones;
        liveSession.completedZones = completedZones;
        liveSession.activeMandal = activeZoneName;
        liveSession.eta = etaStr;
        liveSession.etaText = etaStr;
        liveSession.etaMs = etaMs;
        liveSession.pendingJobs = pendingForSession.length;
        liveSession.runningJobs = runningForSession.length;
      }

      try {
        const currentActiveZone = activeZones.find(z => (z.zoneName || z.name) === activeZoneName) || nextZone;
        let actLat = Number(currentActiveZone?.lat ?? currentActiveZone?.latitude);
        let actLng = Number(currentActiveZone?.lng ?? currentActiveZone?.longitude);
        if ((!Number.isFinite(actLat) || !Number.isFinite(actLng)) && currentActiveZone) {
          const { ZONE_COORDINATES } = require('../../utils/universalGeoCluster');
          const cKey = String(currentActiveZone.zoneName || currentActiveZone.name || '').toLowerCase().trim();
          const fallbackC = ZONE_COORDINATES[cKey] || anchorCoord;
          if (fallbackC) {
            actLat = Number(fallbackC.lat);
            actLng = Number(fallbackC.lng);
          }
        }

        const activeZonePayload = currentActiveZone ? {
          name: currentActiveZone.zoneName || currentActiveZone.name || activeZoneName,
          lat: actLat,
          lng: actLng,
          radiusKm: currentActiveZone.radiusKm || 3.5,
          index: currentActiveZone.index || (completedZones + 1),
          total: totalZones
        } : null;

        if (liveSession && activeZonePayload) {
          liveSession.activeZone = activeZonePayload;
        }

        emitProgressEvent({
          sessionId,
          totalDistricts: 1,
          completedDistricts: completedZones >= totalZones ? 1 : 0,
          activeDistrict: baseLocation,
          totalMandals: totalZones,
          completedMandals: completedZones,
          activeMandal: activeZoneName,
          activeZone: activeZonePayload,
          totalMandalsAcrossAll: totalZones,
          overallCompletedMandals: completedZones,
          cellStates: { ...cellStates },
          splitZonesCount: adaptiveSplitsUsed,
          stage: completedZones < totalZones ? 'Stage 1: Geo Grid Scanning' : 'Stage 2: Social & Contact Discovery',
          stageIndex: completedZones < totalZones ? 1 : 2,
          eta: etaStr,
          etaText: etaStr,
          etaMs,
          pendingJobs: pendingForSession.length,
          runningJobs: runningForSession.length,
          queuedZones: Math.max(0, totalZones - completedZones - runningForSession.length),
          doneZones: completedZones,
          runningZones: runningForSession.length,
          sessionActive: completedZones < totalZones,
          finished: completedZones >= totalZones
        });

        // Broadcast active scanning zone so the Command Center map highlights and tracks the live swarm
        if (activeZonePayload && Number.isFinite(activeZonePayload.lat) && Number.isFinite(activeZonePayload.lng)) {
          emitActivePointEvent({
            zoneName: activeZonePayload.name,
            locationName: activeZonePayload.name,
            lat: activeZonePayload.lat,
            lng: activeZonePayload.lng,
            index: activeZonePayload.index,
            total: totalZones,
            sessionId,
            active: true
          });
        }
      } catch (e) {}

      if (finishedZones >= totalZones && primaryPendingForSession.length === 0 && primaryRunningForSession.length === 0) {
        if (!allZonesCompleteAt) allZonesCompleteAt = Date.now();
        if (Date.now() - allZonesCompleteAt > 1500) {
          addLog(`[Orchestrator] All ${totalZones} planned zones completed and queue fully drained. Proceeding to final contact scouts.`);
          break;
        }
      } else {
        allZonesCompleteAt = null;
      }

      if (primaryPendingForSession.length === 0 && primaryRunningForSession.length === 0) {
        const remainingUnfinished = activeZones.filter(z => {
          const state = targetMap[zoneKey(z)] || targetMap[String(z.zoneName || z.name || '').toLowerCase().trim()];
          return !['completed', 'deferred', 'error', 'failed'].includes(state);
        });
        if (remainingUnfinished.length > 0) {
          addLog(`[Orchestrator] Worker pool momentarily idle with ${remainingUnfinished.length}/${totalZones} zone(s) remaining. Re-enqueuing remaining zones...`);
          for (const rz of remainingUnfinished) {
            const rzLabel = rz.zoneName || rz.name || '';
            const rzQuery = rz.queryText || `${searchPhrase} in ${rzLabel}`;
            const rzGeo = (rz.lat && rz.lng) ? { lat: rz.lat, lng: rz.lng } : baseGeo;
            await addScrapeJob('scrapeGooglePlaces', [
              rzQuery, category, rzLabel, sessionId, rzGeo?.lat || null, rzGeo?.lng || null, 3.5, 'broad',
              targetDistrict, targetState, rzGeo?.boundingbox || null, baseLocation, isMaster, zoneScope, rz.mandal || null, countryCode
            ], 14, {
              lat: rzGeo?.lat || null,
              lng: rzGeo?.lng || null,
              zoneName: rzLabel,
              locationName: rzLabel,
              country: countryCode,
              sessionId,
              userId,
              isMaster,
              active: true
            });
          }
          await new Promise(r => setTimeout(r, 1000));
          continue;
        } else {
          addLog(`[Orchestrator] All ${finishedZones}/${totalZones} active zones completed and queue drained.`);
          break;
        }
      }

      if (Date.now() - startTime > maxScrapeWindowMs) {
        addLog(`[Orchestrator] Run ceiling reached with ${finishedZones}/${totalZones} zones complete. Finalizing.`);
        break;
      }

      waitTicks++;
      if (waitTicks % 5 === 0) {
        if (completedZones < totalZones) {
          addLog(`[Orchestrator] [Stage 1/2 Geo Grid] Progress: ${completedZones}/${totalZones} zones complete (${Math.round((completedZones/totalZones)*100)}%). ${pendingForSession.length} pending, ${runningForSession.length} running. ETA: ${etaStr}`);
        } else {
          addLog(`[Orchestrator] [Stage 2/2 Social & Deep Contact Intel] Geo Grid 100% complete. Squeezing social & contact intel: ${pendingForSession.length} pending, ${runningForSession.length} running. ETA: ${etaStr}`);
        }
      }

      // Real-time incremental vault sync: Persist leads live while running
      if (waitTicks % 6 === 0 || (completedZones > lastLiveSavedCount && completedZones > 0)) {
        lastLiveSavedCount = completedZones;
        try {
          const liveLeads = dbAdapter.getVendorsBySession(sessionId);
          if (liveLeads && liveLeads.length > 0) {
            persistSessionVault({
              sessionId,
              userId,
              category,
              location: baseLocation,
              leads: liveLeads,
              allowLead: allowSweepLead,
              metadata: {
                status: 'running',
                coverageMode,
                scope: plan?.resolvedScope || (isMaster ? 'district' : 'city'),
                district: plan?.district || null,
                state: plan?.state || null,
                title: plan?.title || baseLocation,
                boundary: plan?.boundary || null,
                totalZones,
                completedZones,
                deferredZones: deferredZones.map(z => z.zoneName),
                activeZones: activeZones.map(z => z.zoneName),
                completedZoneIndices: activeSessions[sessionId]?.completedZoneIndices || [],
                completedZoneNames: activeSessions[sessionId]?.completedZoneNames || [],
                zones: zones.map(z => ({
                  name: z.zoneName || z.name,
                  ...z,
                  pass: isGridZone(z) ? 'grid' : 'named',
                  deferred: deferredKeys.has(zoneKey(z))
                })),
                elapsedTimeSec: Math.round((Date.now() - startTime) / 1000)
              }
            });
          }
        } catch (liveSaveErr) {}
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    const wasAborted = isAborted();
    if (wasAborted) {
      try {
        await streamingEnricher.stop().catch(() => {});
      } catch (e) {}
      flushOob();
      const abortedLeads = dbAdapter.getVendorsBySession(sessionId);
      try {
        persistSessionVault({
          sessionId,
          userId,
          category,
          location: baseLocation,
          leads: abortedLeads,
          final: true,
          allowLead: allowSweepLead,
          metadata: {
            status: 'aborted',
            abortedAt: new Date().toISOString(),
            coverageMode,
            scope: plan?.resolvedScope || (isMaster ? 'district' : 'city'),
            district: plan?.district || null,
            state: plan?.state || null,
            title: plan?.title || baseLocation,
            boundary: plan?.boundary || null,
            totalZones,
            completedZones,
            deferredZones: deferredZones.map(z => z.zoneName),
            activeZones: activeZones.map(z => z.zoneName),
            completedZoneIndices: activeSessions[sessionId]?.completedZoneIndices || [],
            completedZoneNames: activeSessions[sessionId]?.completedZoneNames || [],
            zones: zones.map(z => ({
              name: z.zoneName || z.name,
              ...z,
              pass: isGridZone(z) ? 'grid' : 'named',
              deferred: deferredKeys.has(zoneKey(z))
            })),
            elapsedTimeSec: Math.round((Date.now() - startTime) / 1000)
          }
        });
      } catch (e) {}
      if (activeSessions[sessionId]) {
        activeSessions[sessionId].finished = true;
        activeSessions[sessionId].status = 'aborted';
        activeSessions[sessionId].sessionActive = false;
        activeSessions[sessionId].finishedAt = Date.now();
      }
      try {
        emitProgressEvent({
          sessionId,
          sessionActive: false,
          aborted: true,
          status: 'aborted',
          totalLeads: abortedLeads.length
        });
      } catch (e) {}
      addLog(`[Orchestrator] Run aborted by user. Preserved ${abortedLeads.length} leads in the session folder.`);
      return;
    }

    addLog(`[Orchestrator] Scrape phase closed for session ${sessionId}.`);

    // Engines can flush their final batch a moment after the last zone resolves.
    // Aggregating immediately used to miss those rows (a Guntur district sweep
    // ended with 0 leads while 153 valid rows were still landing). Wait until
    // the session's store count is stable for two consecutive checks.
    try {
      let lastCount = -1;
      let stableTicks = 0;
      for (let i = 0; i < 16 && stableTicks < 2; i += 1) {
        await new Promise(r => setTimeout(r, 400));
        const count = dbAdapter.getVendorsBySession(sessionId).length;
        if (count === lastCount) stableTicks += 1;
        else { stableTicks = 0; lastCount = count; }
      }
    } catch (settleErr) {}

    // 4. Scrape Completed: Aggregate Session Leads & Automatically Save to Individual Search Vault
    const allVendors = dbAdapter.getVendors();
    let harvestedLeads = allVendors.filter(v =>
      v.sessionId === sessionId ||
      v.lastSessionId === sessionId ||
      (Array.isArray(v.sessionIds) && v.sessionIds.includes(sessionId))
    );

    // Master Strict Zone Containment: every row must sit inside the zone query
    // that found it. This runs before filters so an out-of-area business can
    // never enter a Master folder, and is archived as evidence when rejected.
    if (isMaster && Array.isArray(zones) && zones.length) {
      try {
        const containment = enforceMasterZoneContainment(harvestedLeads, zones, {
          center: planCenter,
          scope: plan?.resolvedScope || 'district',
          boundary: plan?.boundary || null,
          reachKm: plan?.reachKm
        });
        if (containment.rejected.length) {
          for (const item of containment.rejected) {
            const zoneLat = item.zone && item.zone.lat != null ? Number(item.zone.lat) : null;
            const zoneLng = item.zone && item.zone.lng != null ? Number(item.zone.lng) : null;
            const km = (Number.isFinite(Number(item.lead.latitude)) && Number.isFinite(Number(item.lead.longitude))
              && zoneLat != null && zoneLng != null)
              ? getDistanceKm(zoneLat, zoneLng, Number(item.lead.latitude), Number(item.lead.longitude))
              : null;
            quarantineLead(
              item.lead,
              km == null
                ? `outside ${plan?.boundary?.district || ''} district boundary (nearest ${item.zone?.zoneName || 'zone'})`.trim()
                : `${km.toFixed(1)}km from ${item.zone?.zoneName || 'district boundary'}`,
              'Master Zone Containment (Out of Bounds)'
            );
          }
          addLog(`[Master Containment] ${containment.rejected.length} lead(s) were outside the ${plan?.boundary?.district || plan?.district || ''} district boundary and moved to Out of Bounds.`);
        }
        flushOob();
        harvestedLeads = containment.kept;
      } catch (containmentError) {
        addLog(`[Master Containment] Warning: ${containmentError.message}`);
      }
    }

    // Client Strict Geo Containment: If Client search (not Master), reject out-of-city/out-of-mandal bleed
    if (!isMaster && baseLocation) {
      try {
        harvestedLeads = harvestedLeads.filter(lead => {
          const check = isListingRelevantToQuery(
            lead.name,
            lead.address,
            lead.district,
            lead.state,
            baseLocation,
            baseLocation,
            (lead.latitude && lead.longitude ? { lat: Number(lead.latitude), lng: Number(lead.longitude) } : null),
            null,
            baseLocation,
            false,
            'city'
          );
          if (!check.relevant) {
            addLog(`[Client Containment] Excluded out-of-city lead "${lead.name}" (${check.reason}) - Client restricted to "${baseLocation}"`);
            quarantineLead(lead, check.reason, 'Client Containment (Out of Bounds)');
            return false;
          }
          return true;
        });
      } catch (e) {
        addLog(`[Client Containment] Warning: ${e.message}`);
      }
    }
    const hasFilters = filters && Object.keys(filters).length > 0;
    let sessionLeads = hasFilters ? harvestedLeads.filter(lead => matchesMasterFilters(lead, filters)) : harvestedLeads;
    addLog(`[Orchestrator] Swarm finished. Harvested ${sessionLeads.length} leads for session "${sessionId}"${hasFilters ? ` (${harvestedLeads.length - sessionLeads.length} removed by master filters)` : ''}.`);

    // Final coordinate containment
    let finalAnchor = null;
    let finalMaxKm = 0;
    try {
      const anchor = planCenter
        || (baseGeo && Number.isFinite(Number(baseGeo.lat)) ? { lat: Number(baseGeo.lat), lng: Number(baseGeo.lng) } : null);
      if (anchor) {
        const scopeType = plan?.resolvedScope || (isMaster ? 'district' : 'city');
        const boundary = scopeType === 'district' ? plan?.boundary : null;
        const maxKm = Number(plan?.reachKm) > 0 ? Number(plan.reachKm) : sweepReachKm(scopeType);
        finalAnchor = anchor;
        finalMaxKm = maxKm;
        const before = sessionLeads.length;
        sessionLeads = sessionLeads.filter(lead => {
          if (!lead.latitude || !lead.longitude) return true;
          if (boundary) {
            if (isInsideDistrictBoundary(lead, boundary)) return true;
            addLog(`[Containment] Dropped "${lead.name}" Â· outside ${boundary.district} district boundary`);
            quarantineLead(lead, `outside ${boundary.district} district boundary`);
            return false;
          }
          const km = getDistanceKm(anchor.lat, anchor.lng, Number(lead.latitude), Number(lead.longitude));
          if (km <= maxKm) return true;

          // Hard rejection ceiling: nothing beyond 45km or 1.5x maxKm can EVER be considered local
          const hardCeilingKm = Math.max(45, maxKm * 1.5);
          if (km > hardCeilingKm) {
            addLog(`[Containment] Dropped "${lead.name}" Â· ${km.toFixed(1)}km from ${baseLocation} (hard ceiling ${hardCeilingKm.toFixed(1)}km)`);
            quarantineLead(lead, `${km.toFixed(1)}km from ${baseLocation} (hard ceiling ${hardCeilingKm.toFixed(1)}km)`);
            return false;
          }

          // Service-Area Businesses (SABs) & City-Named Matches within reasonable proximity buffer:
          // Mobile pros (e.g. wedding photographers) often have statewide default coords on Maps/directories
          const targetToken = String(baseLocation || '').split(',')[0].trim().toLowerCase();
          const leadAddr = String(lead.address || lead.locality || lead.city || '').toLowerCase();
          const leadName = String(lead.name || '').toLowerCase();
          if (targetToken && targetToken.length > 2 && (leadAddr.includes(targetToken) || leadName.includes(targetToken))) {
            return true; // Preserves verified SABs explicitly tied to the target city within proximity buffer
          }

          addLog(`[Containment] Dropped "${lead.name}" Â· ${km.toFixed(1)}km from ${baseLocation} (max ${maxKm.toFixed(1)}km)`);
          quarantineLead(lead, `${km.toFixed(1)}km from ${baseLocation} (max ${maxKm.toFixed(1)}km)`);
          return false;
        });
        const dropped = before - sessionLeads.length;
        if (dropped > 0) addLog(`[Containment] ${dropped} lead(s) outside the searched area moved to Out of Bounds.`);
        flushOob();
      }
    } catch (e) {
      addLog(`[Containment] Warning: ${e.message}`);
    }

    try {
      addLog(`[Contact Scout] Finalizing real-time contact backfill across all extracted leads...`);
      try {
        emitProgressEvent({
          sessionId,
          totalDistricts: 1,
          completedDistricts: 1,
          activeDistrict: baseLocation,
          totalMandals: totalZones,
          completedMandals: totalZones,
          activeMandal: 'Contact Enrichment',
          totalMandalsAcrossAll: totalZones,
          overallCompletedMandals: totalZones,
          eta: 'Finishing contacts...',
          etaText: 'Finishing contacts...',
          etaMs: 0,
          sessionActive: true
        });
      } catch (pe) {}
      await streamingEnricher.drain(30000).catch(() => {});
    } catch (e) {
      addLog(`[Contact Scout] Notice: ${e.message}`);
    }

    // Cooperative Cross-Engine Entity Resolution & Contact Intelligence Mesh
    try {
      const { dorkPhoneFromSearch } = require('../aggressivePhoneEnricher');
      const { normalizePhone } = require('../../utils/phoneUtils');
      const { detectCountry } = require('../localBrain/countries');

      // 1. Cross-Engine In-Memory / Database Resolution
      const allStoredVendors = dbAdapter.getVendors();
      let crossResolvedCount = 0;
      let dorkedCount = 0;

      for (const lead of sessionLeads) {
        if (!lead) continue;
        const countryCode = (lead.country && lead.country.length === 2) ? lead.country.toUpperCase() : (detectCountry(lead.city || lead.address || baseLocation)?.code || 'IN');
        const hasMobile = Boolean(lead.phone && (lead.phoneType === 'mobile' || (lead.phone.replace(/\D/g, '').length >= 10 && !lead.phone.toLowerCase().includes('require'))));

        if (!hasMobile) {
          // Check if any other vendor in store matches this business name & locality
          const leadNormName = (lead.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (leadNormName.length >= 3) {
            const peerMatch = allStoredVendors.find(v => {
              if (!v || v.id === lead.id || !v.phone) return false;
              const vNorm = (v.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              if (vNorm !== leadNormName && !vNorm.includes(leadNormName) && !leadNormName.includes(vNorm)) return false;
              const vLoc = (v.city || v.locality || v.address || '').toLowerCase();
              const lLoc = (lead.city || lead.locality || lead.address || '').toLowerCase();
              return (vLoc && lLoc && (vLoc.includes(lLoc) || lLoc.includes(vLoc))) || (v.pincode && lead.pincode && v.pincode === lead.pincode);
            });

            if (peerMatch && peerMatch.phone) {
              lead.phone = peerMatch.phone;
              lead.phones = [...new Set([...(lead.phones || []), ...(peerMatch.phones || [peerMatch.phone])])];
              lead.phoneType = peerMatch.phoneType || 'mobile';
              lead.whatsappAvailable = peerMatch.whatsappAvailable || lead.phoneType === 'mobile';
              lead.whatsappLink = peerMatch.whatsappLink || (lead.whatsappAvailable ? `https://wa.me/${lead.phone.replace(/\D/g, '')}` : '');
              lead.verified = true;
              lead.phoneSource = `cooperative-${peerMatch.source || 'peer-directory'}`;
              crossResolvedCount++;
              if (onProgress) onProgress(lead, 'updated');
              try { dbAdapter.saveVendor(lead.userId || 'admin_1', lead); } catch (e) {}
            }
          }
        }
      }

      if (crossResolvedCount > 0) {
        addLog(`[Cooperative Engine] ðŸ¤ Cross-engine entity matching recovered ${crossResolvedCount} missing contact(s).`);
      }

      // 2. High-Yield Stealth Fallback SERP Dorking for remaining high-priority leads with missing mobile
      const stillNeedingPhone = sessionLeads.filter(l => l && (!l.phone || l.phone.length < 8)).slice(0, 15);
      if (stillNeedingPhone.length > 0) {
        addLog(`[SERP Intelligence] ðŸ” Dorking verified contacts for ${stillNeedingPhone.length} directory leads...`);
        const dorkPromises = stillNeedingPhone.map(async (targetLead) => {
          try {
            const cCode = (targetLead.country && targetLead.country.length === 2) ? targetLead.country.toUpperCase() : 'IN';
            const serpResult = await dorkPhoneFromSearch(targetLead.name, targetLead.city || targetLead.locality || baseLocation, cCode);
            if (serpResult && serpResult.phones && serpResult.phones.length > 0) {
              const parsed = normalizePhone(serpResult.phones[0], { defaultCountry: cCode, allowInternational: cCode !== 'IN' });
              if (parsed) {
                targetLead.phone = parsed.e164 || parsed.national;
                targetLead.phoneType = parsed.isMobile ? 'mobile' : 'landline';
                targetLead.phones = [...new Set([...(targetLead.phones || []), ...serpResult.phones])];
                if (parsed.isMobile) {
                  targetLead.whatsappAvailable = true;
                  targetLead.whatsappLink = `https://wa.me/${parsed.digits}`;
                }
                targetLead.verified = true;
                targetLead.phoneSource = 'serp-intelligence';
                dorkedCount++;
                if (onProgress) onProgress(targetLead, 'updated');
                try { dbAdapter.saveVendor(targetLead.userId || 'admin_1', targetLead); } catch (e) {}
              }
            }
          } catch (e) {}
        });
        await Promise.allSettled(dorkPromises);
        if (dorkedCount > 0) {
          addLog(`[SERP Intelligence] ðŸ“ž Extracted ${dorkedCount} verified contact(s) via stealth search dorking.`);
        }
      }
    } catch (coopErr) {
      addLog(`[Cooperative Engine] Notice: ${coopErr.message}`);
    }

    // In-memory cross-matching: Match leads lacking phone with any phone-bearing lead in session (e.g. from JustDial, OSM)
    try {
      const phoneBearers = sessionLeads.filter(l => l && hasValidMobile(l.phone, countryForLead(l)));
      if (phoneBearers.length > 0) {
        let crossMatched = 0;
        const { __internals } = require('../phoneBackfillService');
        const matchFn = __internals?.namesLikelyMatch;
        for (const lead of sessionLeads) {
          if (!lead || hasValidMobile(lead.phone, countryForLead(lead))) continue;
          const match = phoneBearers.find(pb => {
            if (!pb || pb.id === lead.id) return false;
            if (typeof matchFn === 'function' && matchFn(lead.name, pb.name)) return true;
            return false;
          });
          if (match && match.phone) {
            lead.phone = match.phone;
            lead.phones = [...new Set([...(lead.phones || []), ...(match.phones || [match.phone])])];
            lead.phoneType = match.phoneType || 'mobile';
            lead.isMobile = Boolean(match.isMobile);
            lead.isLandline = Boolean(match.isLandline);
            lead.whatsappAvailable = match.whatsappAvailable;
            lead.whatsappLink = match.whatsappLink;
            crossMatched++;
          }
        }
        if (crossMatched > 0) {
          addLog(`[Contact Scout] âš¡ Instant in-memory cross-match linked ${crossMatched} verified phone(s) across engines.`);
        }
      }
    } catch (crossErr) {}

    // Explicit Targeted Place Detail Scout Pass for any leads still missing a verified mobile phone
    let webContact = null;
    let phoneBackfill = null;
    try {
      const stillNeedingMobile = sessionLeads.filter(l => l && !hasValidMobile(l.phone, countryForLead(l)));
      if (stillNeedingMobile.length > 0) {
        addLog(`[Contact Scout] ðŸŽ¯ Launching targeted place detail pass for ${stillNeedingMobile.length} lead(s) lacking mobile numbers...`);
        const scoutSlots = Math.min(8, Math.max(4, require('../../utils/browserBudget').getStatus().totalSlots || 6));
        phoneBackfill = await backfillPhones(stillNeedingMobile, {
          sessionId,
          onProgress,
          addLog,
          concurrency: scoutSlots,
          budgetMs: 15000
        });
        if (phoneBackfill && phoneBackfill.mobilesFound > 0) {
          addLog(`[Contact Scout] ðŸ“± Discovered ${phoneBackfill.mobilesFound} mobile(s) and ${phoneBackfill.landlinesFound || 0} direct line(s) from place detail scouts.`);
        }
      }
    } catch (bfErr) {
      addLog(`[Contact Scout] Targeted backfill notice: ${bfErr.message}`);
    }

    addLog(`[Orchestrator] Multi-engine zone crawl and live contact scouts completed. Finalizing session.`);

    // Per-zone yield ledger
    const zoneYield = {};
    for (const lead of sessionLeads) {
      const key = lead.zoneName || 'unknown';
      if (!zoneYield[key]) zoneYield[key] = { leads: 0, phones: 0 };
      zoneYield[key].leads += 1;
      if (lead.phone) zoneYield[key].phones += 1;
    }
    try {
      const topZones = Object.entries(zoneYield)
        .sort((a, b) => b[1].leads - a[1].leads)
        .slice(0, 5)
        .map(([name, stats]) => `${name} (${stats.leads})`)
        .join(' Â· ');
      if (topZones) addLog(`[Zone Yield] Top zones: ${topZones}`);
    } catch (e) {}

    // Reconcile with live store before saving
    try {
      const fresh = dbAdapter.getVendorsBySession(sessionId);
      if (fresh.length) {
        const liveById = new Map(fresh.filter(lead => lead && lead.id).map(lead => [lead.id, lead]));
        const seen = new Set();
        const merged = sessionLeads.map(lead => {
          if (!lead || !lead.id) return lead;
          const live = liveById.get(lead.id);
          if (!live) return lead;
          seen.add(lead.id);
          return live;
        });
        let added = 0;
        for (const lead of fresh) {
          if (!lead || !lead.id || seen.has(lead.id)) continue;
          if (hasFilters && !matchesMasterFilters(lead, filters)) continue;
          if (!allowSweepLead(lead)) continue;
          if (finalAnchor && lead.latitude && lead.longitude) {
            const km = getDistanceKm(finalAnchor.lat, finalAnchor.lng, Number(lead.latitude), Number(lead.longitude));
            const hardCeilingKm = Math.max(45, finalMaxKm * 1.5);
            if (km > hardCeilingKm) continue;
            if (km > finalMaxKm) {
              const targetToken = String(baseLocation || '').split(',')[0].trim().toLowerCase();
              const leadAddr = String(lead.address || lead.locality || lead.city || '').toLowerCase();
              const leadName = String(lead.name || '').toLowerCase();
              const isSab = targetToken && targetToken.length > 2 && (leadAddr.includes(targetToken) || leadName.includes(targetToken));
              if (!isSab) continue;
            }
          }
          merged.push(lead);
          added++;
        }
        sessionLeads = merged;
        addLog(`[Orchestrator] Reconciled ${added} late lead(s) and refreshed ${seen.size} row(s) into the search folder.`);
      }
    } catch (reconcileError) {
      addLog(`[Orchestrator] Folder reconcile notice: ${reconcileError.message}`);
    }

    // Pure Session Vault: Guarantee 100% isolation so only leads harvested for this session are saved.
    sessionLeads = sessionLeads.filter(lead =>
      lead && lead.id && (
        lead.sessionId === sessionId ||
        lead.lastSessionId === sessionId ||
        (Array.isArray(lead.sessionIds) && lead.sessionIds.includes(sessionId))
      )
    );
    let carriedForward = null;
    addLog(`[Session Purity] Preserved pure search vault: ${sessionLeads.length} leads harvested strictly for session ${sessionId}.`);

    // 1. Strict Category Fidelity Re-Check: filter out non-vendors (e.g. Xerox, MeeSeva, frame shops)
    const fidelityBefore = sessionLeads.length;
    sessionLeads = sessionLeads.filter(lead => {
      const ok = isVendorRelevant(lead, category);
      if (!ok) {
        addLog(`[Category Fidelity] Rejection: "${lead.name}" is not relevant to category "${category}".`);
        try {
          const { archiveDivergentLead } = require('../divergentLeadService');
          archiveDivergentLead(lead, category);
        } catch (e) {}
      }
      return ok;
    });
    if (sessionLeads.length < fidelityBefore) {
      addLog(`[Category Fidelity] Filtered out ${fidelityBefore - sessionLeads.length} non-vendor lead(s).`);
    }

    // 2. Smart Multi-Vendor Brand Deduplication & Multi-Phone Merging
    const dedupedLeads = [];
    for (const lead of sessionLeads) {
      let matchedIndex = -1;
      for (let i = 0; i < dedupedLeads.length; i++) {
        if (areNearDuplicates(dedupedLeads[i], lead)) {
          matchedIndex = i;
          break;
        }
      }
      if (matchedIndex >= 0) {
        const merged = mergeVendorLeads(dedupedLeads[matchedIndex], lead);
        dedupedLeads[matchedIndex] = merged;
        addLog(`[Smart Dedup] Merged duplicate: "${lead.name}" into "${dedupedLeads[matchedIndex].name}". Verified phones: ${(merged.phones || []).join(', ')}`);
      } else {
        dedupedLeads.push(lead);
      }
    }
    const dedupCount = sessionLeads.length - dedupedLeads.length;
    sessionLeads = dedupedLeads;
    if (dedupCount > 0) {
      addLog(`[Smart Dedup] Consolidated ${dedupCount} duplicate listing(s) into single rich profiles.`);
    }

    // Verified Contact & Telecom Filter (Mobile + Landline)
    try {
      function getVerifiedContacts(lead) {
        let mobile = null;
        let landline = null;
        const allFormatted = [];
        for (const raw of [lead.mobilePhone, lead.landlinePhone, lead.phone, lead.primaryPhone, ...(Array.isArray(lead.phones) ? lead.phones : [])]) {
          const val = typeof raw === 'object' && raw ? (raw.displayPhone || raw.e164 || raw.national || raw.number || '') : (raw || '');
          if (!val) continue;
          const parsed = parsePhone(val, {
            defaultCountry: countryCode || 'IN',
            allowInternational: countryCode !== 'IN',
            allowedCountry: countryCode !== 'IN' ? countryCode : undefined
          });
          if (parsed && (parsed.isMobile || parsed.isLandline)) {
            const disp = parsed.displayPhone || parsed.e164;
            if (disp && !allFormatted.includes(disp)) allFormatted.push(disp);
            if (parsed.isMobile && !mobile) mobile = parsed;
            if (parsed.isLandline && !landline) landline = parsed;
          }
        }
        return { mobile, landline, allFormatted };
      }

      const noContact = [];
      const duplicates = [];
      const seenPhoneNumbers = new Set();
      const seenNameCities = new Set();
      let mobileCount = 0;
      let landlineCount = 0;

      sessionLeads = sessionLeads.filter(lead => {
        const nameClean = String(lead.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const cityClean = String(lead.city || baseLocation || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const nameCityKey = (nameClean.length >= 4 && cityClean) ? `${nameClean}__${cityClean}` : '';

        const { mobile, landline, allFormatted } = getVerifiedContacts(lead);
        const primaryContact = mobile || landline;
        if (primaryContact) {
          const phoneKey = primaryContact.digits;
          if (phoneKey && seenPhoneNumbers.has(phoneKey) && nameCityKey && seenNameCities.has(nameCityKey)) {
            duplicates.push(lead);
            return false;
          }
          if (phoneKey) seenPhoneNumbers.add(phoneKey);
          if (nameCityKey) seenNameCities.add(nameCityKey);

          if (mobile) {
            lead.mobilePhone = mobile.displayPhone || mobile.e164;
            mobileCount++;
          }
          if (landline) {
            lead.landlinePhone = landline.displayPhone || landline.e164;
            landlineCount++;
          }
          if (allFormatted.length) {
            lead.phones = [...new Set([...allFormatted, ...(Array.isArray(lead.phones) ? lead.phones.filter(p => typeof p === 'string') : [])])];
          }

          if (mobile) {
            lead.phone = lead.mobilePhone;
            lead.phoneType = 'mobile';
            lead.isMobile = true;
            lead.isLandline = Boolean(landline);
            lead.whatsappAvailable = true;
            lead.whatsappLink = `https://wa.me/${mobile.digits}`;
            lead.callUrl = mobile.callUrl;
          } else if (landline) {
            lead.phone = lead.landlinePhone;
            lead.phoneType = 'landline';
            lead.isMobile = false;
            lead.isLandline = true;
            lead.whatsappAvailable = false;
            lead.whatsappLink = '';
            lead.callUrl = landline.callUrl;
          }
          return true;
        }

        // Retain leads without direct phone number as general business listings
        if (nameCityKey && seenNameCities.has(nameCityKey)) {
          duplicates.push(lead);
          return false;
        }
        if (nameCityKey) seenNameCities.add(nameCityKey);
        lead.phoneType = 'unknown';
        lead.isMobile = false;
        lead.isLandline = false;
        lead.whatsappAvailable = false;
        lead.whatsappLink = '';
        noContact.push(lead);
        return true;
      });

      // Priority sort: Mobiles first (3), Landlines second (2), others third (0)
      sessionLeads.sort((a, b) => {
        const scoreA = a.phoneType === 'mobile' ? 3 : (a.phoneType === 'landline' ? 2 : (a.phone ? 1 : 0));
        const scoreB = b.phoneType === 'mobile' ? 3 : (b.phoneType === 'landline' ? 2 : (b.phone ? 1 : 0));
        return scoreB - scoreA;
      });

      if (duplicates.length > 0) {
        addLog(`[Deduplicator] Removed ${duplicates.length} duplicate/cloned lead(s).`);
      }
      addLog(`[Vault Storage] Preserved all ${sessionLeads.length} leads in session vault (${mobileCount} mobiles, ${landlineCount} landlines, ${noContact.length} pending enrichment).`);
    } catch (contactFilterError) {
      addLog(`[Contact Filter] Notice: ${contactFilterError.message}`);
    }

    // Phase 6 â€” repeat-search carry-forward. Rows the machine already found for
    // this exact category and city are cloned into the folder with provenance.
    // They are never upserted into the live store, so no credit is charged and
    // their original session IDs stay untouched.
    if (!isMaster) {
      try {
        const carried = collectCarryForward({
          category,
          location: baseLocation,
          existingLeads: sessionLeads,
          sessionId,
          finalAnchor,
          finalMaxKm,
          isMaster,
          aborted: isAborted()
        });
        if (carried.leads.length) {
          sessionLeads = sessionLeads.concat(carried.leads);
          carriedForward = {
            count: carried.leads.length,
            fromSessions: carried.fromSessions
          };
          addLog(`[Carry Forward] Reused ${carried.leads.length} previously discovered lead(s) from ${carried.fromSessions.length} earlier search(es) for "${category}" in "${baseLocation}". No new credits charged.`);
          if (carried.skippedQuality) {
            addLog(`[Carry Forward] Quality guard skipped ${carried.skippedQuality} stale row(s) with no usable contact or a low profile score.`);
          }
        }
      } catch (carryError) {
        addLog(`[Carry Forward] Skipped: ${carryError.message}`);
      }
    }

    // Deterministic Lead Quality Scoring (0 - 100%) and Tier Assignment
    let totalScore = 0;
    for (const lead of sessionLeads) {
      const q = calculateLeadQuality(lead);
      lead.qualityScore = q.score;
      lead.tier = q.tier;
      lead.profileQuality = q;
      totalScore += q.score;
    }
    const avgScore = sessionLeads.length ? Math.round(totalScore / sessionLeads.length) : 0;
    addLog(`[Quality Engine] Evaluated ${sessionLeads.length} leads: Portfolio Average Quality Score ${avgScore}%.`);

    // Dual-save session vault to disk
    const finalStatus = isAborted() ? 'aborted' : 'completed';
    try {
      const saved = persistSessionVault({
        sessionId,
        userId,
        category,
        location: baseLocation,
        leads: sessionLeads,
        final: true,
        allowLead: allowSweepLead,
        metadata: {
          status: finalStatus,
          completedAt: new Date().toISOString(),
          abortedAt: finalStatus === 'aborted' ? new Date().toISOString() : undefined,
          coverageMode,
          scope: plan?.resolvedScope || (isMaster ? 'district' : 'city'),
          district: plan?.district || null,
          state: plan?.state || null,
          title: plan?.title || baseLocation,
          boundary: plan?.boundary || null,
          totalZones,
          completedZones: Math.min(totalZones, completedZones || 0),
          deferredZones: deferredZones.map(z => z.zoneName),
          activeZones: activeZones.map(z => z.zoneName),
          completedZoneIndices: finalStatus === 'completed' && completedZones >= totalZones ? activeZones.map((_, i) => i) : (activeSessions[sessionId]?.completedZoneIndices || []),
          completedZoneNames: finalStatus === 'completed' && completedZones >= totalZones ? activeZones.map(z => z.zoneName || z.name) : (activeSessions[sessionId]?.completedZoneNames || []),
          zones: zones.map(z => ({
            name: z.zoneName || z.name,
            ...z,
            pass: isGridZone(z) ? 'grid' : 'named',
            deferred: deferredKeys.has(zoneKey(z))
          })),
          coverage: {
            mode: coverageMode,
            named: namedZones.length,
            grid: gridZones.length,
            active: activeZones.length,
            deferred: deferredZones.length
          },
          zoneYield,
          elapsedTimeSec: Math.round((Date.now() - startTime) / 1000),
          filters: hasFilters ? filters : undefined,
          harvestedBeforeFilters: hasFilters ? harvestedLeads.length : undefined,
          carriedForward: carriedForward || undefined,
          phoneBackfill: phoneBackfill ? {
            candidates: phoneBackfill.candidates,
            filled: phoneBackfill.filled,
            mobilesFound: phoneBackfill.mobilesFound,
            elapsedMs: phoneBackfill.elapsedMs
          } : undefined
        }
      });
      addLog(`[Orchestrator] ðŸ“ Search folder saved: ${saved.file || `${sessionId}.json`} (${saved.leadCount} leads, ${saved.phoneCount} phones)`);
    } catch (saveErr) {
      addLog(`[Orchestrator] Note: Could not auto-persist vault to disk: ${saveErr.message}`);
    }

    // Auto-learning
    try {
      const learnedLeads = sessionLeads.filter(v => !v.carriedForward);
      taxonomyLearner.recordRun({
        query: plan?.query || `${category} in ${baseLocation}`,
        location: baseLocation,
        leadCount: learnedLeads.length,
        phoneCount: learnedLeads.filter(v => v.phone).length,
        vendors: learnedLeads
      });
      addLog(`[Orchestrator] ðŸ§  Autonomous Intelligence learned: "${category}" (${learnedLeads.length} fresh leads, ${learnedLeads.filter(v => v.phone).length} verified +91 mobiles).`);
    } catch (learnErr) {
      addLog(`[Orchestrator] Taxonomy learning skipped: ${learnErr.message}`);
    }

    // Emit 100% complete event. The counts are the ones the run actually
    // reached, and `finished` is the server's authoritative "this session is
    // over" flag: the console uses it to release the Stop button instead of
    // guessing from a zone ratio that a skipped zone can never satisfy.
    try {
      emitProgressEvent({
        sessionId,
        totalDistricts: 1,
        completedDistricts: 1,
        activeDistrict: baseLocation,
        totalMandals: totalZones,
        completedMandals: completedZones,
        activeMandal: 'Complete',
        totalMandalsAcrossAll: totalZones,
        overallCompletedMandals: completedZones,
        eta: '0s',
        etaText: '0s',
        etaMs: 0,
        totalLeads: sessionLeads.length,
        phoneCount: sessionLeads.filter(l => l.phone).length,
        sessionActive: false,
        finished: true,
        status: finalStatus
      });
    } catch (e) {}

    // Automatic deep enrichment in background
    try {
      const deepProfileService = require('../deepProfileService');
      const candidates = isAborted() ? [] : sessionLeads.filter(v => !v.carriedForward && !v.deepExtractedAt && (!v.website || !v.email));
      if (candidates.length) {
        const deepJob = deepProfileService.startJob({
          vendorIds: candidates.map(v => v.id),
          force: true,
          includeWebsite: true,
          includeGoogle: false,
          concurrency: 3,
          limit: Math.min(candidates.length, 300)
        });
        addLog(`[Orchestrator] Deep enrichment queued for ${deepJob.total} vendors (job ${deepJob.id}). Phones, websites and profiles will stream in as each vendor completes.`);
      }
    } catch (deepErr) {
      addLog(`[Orchestrator] Deep enrichment could not be queued: ${deepErr.message}`);
    }

    if (activeSessions[sessionId]) {
      activeSessions[sessionId].finished = true;
      activeSessions[sessionId].status = finalStatus;
      activeSessions[sessionId].sessionActive = false;
      activeSessions[sessionId].finishedAt = Date.now();
    }
    addLog(`[Orchestrator] Universal Omni Search Session ${sessionId} ${finalStatus} in ${Math.round((Date.now() - startTime) / 1000)}s!`);
  } catch (err) {
    addLog(`[Orchestrator Error] ${err.message}`);
    try {
      const failedSession = activeSessions[sessionId] || {};
      persistSessionVault({
        sessionId,
        userId,
        category,
        location: baseLocation,
        leads: dbAdapter.getVendorsBySession(sessionId),
        final: true,
        allowLead: allowSweepLead,
        metadata: {
          status: isAborted() ? 'aborted' : 'failed',
          error: err.message,
          completedAt: new Date().toISOString(),
          // A crash must not erase which zones already finished, otherwise
          // Resume re-scrapes the whole sweep and burns time for nothing.
          coverageMode: failedSession.coverageMode,
          totalZones: failedSession.totalMandals || failedSession.zones?.length,
          completedZones: failedSession.completedMandals || (failedSession.completedZoneIndices || []).length,
          completedZoneIndices: failedSession.completedZoneIndices || [],
          completedZoneNames: failedSession.completedZoneNames || [],
          zones: failedSession.zones || []
        }
      });
    } catch (saveErr) { /* ignore */ }
    try {
      emitProgressEvent({
        sessionId,
        sessionActive: false,
        error: err.message
      });
    } catch (e) {}
    if (activeSessions[sessionId]) {
      activeSessions[sessionId].finished = true;
      activeSessions[sessionId].status = isAborted() ? 'aborted' : 'failed';
      activeSessions[sessionId].sessionActive = false;
      activeSessions[sessionId].finishedAt = Date.now();
    }
  }
}

module.exports = {
  runOmniSearchOrchestrator
};
