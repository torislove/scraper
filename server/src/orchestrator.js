'use strict';

/**
 * server/src/orchestrator.js
 * Parallel Zone-Worker & Multi-Engine Batch Coordinator.
 * Launches Wave-0 city bursts at t=0 and runs calibrated parallel zone workers where
 * each zone executes single-process batched Gosom (-input + -c), Directory/JustDial/YP,
 * QLever OSM POI, SERP, and Social Dorks simultaneously.
 */

const { resolveZonesAsync, isWithinCityBounds } = require('./geo');
const { getSubvectorsForQuery } = require('./taxonomy');
const { classifyQuery, passesUniversalPurityGate } = require('./taxonomy/classifier');
const { expandCompoundSearchPhrases, normalizeScrapeIntent } = require('./services/queryNormalizer');
const { runGosomZoneBatch } = require('./engines/gosom');
const { scrapeDirectGoogleMapsBatch } = require('./engines/gmapDirect');
const { scrapeSovereignDirectory, scrapeSovereignSingleZone } = require('./engines/directories');
const { prewarmNcatIds } = require('./engines/justdial');
const { scrapeSocialDorks } = require('./engines/socialDork');
const { scrapeDeepWebSerp } = require('./engines/serp');
const { queueLeadEnrichment, drainPhoneRescue, abortSessionEnrichment, getEnricherStats } = require('./services/leadEnricher');
const { normalizeLead } = require('./engines/contract');
const HardwareSafetyEngine = require('./services/hardwareSafety');
const folderStore = require('./folderStore');
const store = require('./store');
const sse = require('./sse');

class PolyglotOrchestrator {
  constructor() {
    this.activeSessions = new Map();
    sse.registerTelemetryProvider(() => {
      const running = Array.from(this.activeSessions.values()).filter((s) => s.status === 'running');
      const activeZoneWorkers = running.reduce((sum, s) => sum + (Number(s.zoneConcurrency) || 0), 0);
      return HardwareSafetyEngine.getLiveTelemetry({
        activeSessions: running.length,
        activeZoneWorkers,
        ...getEnricherStats()
      });
    });
  }

  getActiveSession(sessionId) {
    if (!sessionId) {
      const entries = Array.from(this.activeSessions.values());
      return entries[entries.length - 1] || null;
    }
    return this.activeSessions.get(sessionId) || null;
  }

  stopSweep(sessionId) {
    const session = this.getActiveSession(sessionId);
    if (!session) return { ok: false, error: 'No active session found' };

    session.abortController.abort();
    session.status = 'stopped';
    abortSessionEnrichment(session.id);
    folderStore.updateFolderProgress(session.id, {
      completedZones: session.completedSteps,
      status: 'stopped',
      totalZones: session.totalSteps
    });
    sse.broadcastProgress({
      sessionId: session.id,
      status: 'stopped',
      message: 'Sweep paused by user',
      stoppedAtZoneIndex: session.completedSteps,
      overallCompletedMandals: session.completedSteps,
      totalMandalsAcrossAll: session.totalSteps,
      vendorsFound: session.leadsHarvested
    }, session.id);

    return { ok: true, status: 'stopped', sessionId: session.id, stoppedAtZoneIndex: session.completedSteps };
  }

  async startSweep({
    query,
    location,
    country = 'IN',
    subcategories,
    zoneMode = 'smart',
    selectedZones,
    resumeSessionId,
    maxLeads = 0,
    depth = 6,
    extractEmails = true,
    startZoneIndex = 0,
    geoOverride = null
  }) {
    const rawQuery = String(query || '').trim();
    const rawLocation = String(location || '').trim();
    if (!rawQuery || !rawLocation) {
      throw new Error('Both query and location are required to start a sweep.');
    }
    const normalizedIntent = normalizeScrapeIntent({ query: rawQuery, location: rawLocation, country });
    const cleanQuery = normalizedIntent.query || rawQuery;
    const cleanLocation = normalizedIntent.location || rawLocation;

    for (const [, sess] of this.activeSessions.entries()) {
      if (sess.status === 'running') {
        sess.abortController.abort();
        sess.status = 'stopped';
        abortSessionEnrichment(sess.id);
        folderStore.updateFolderProgress(sess.id, {
          completedZones: sess.completedSteps,
          status: 'stopped',
          totalZones: sess.totalSteps
        });
      }
    }

    const sessionId = resumeSessionId || `sweep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const abortController = new AbortController();
    const { signal } = abortController;
    const ccRequested = String(country || 'IN').toUpperCase();

    const geoData = geoOverride || (await resolveZonesAsync(cleanLocation, ccRequested, { zoneMode }));
    const cc = String(geoData?.country || ccRequested).toUpperCase();
    let zones =
      geoData.zones?.length > 0
        ? geoData.zones
        : [{ name: cleanLocation, lat: geoData.center.lat, lng: geoData.center.lng, radiusKm: 3.0 }];

    if (Array.isArray(selectedZones) && selectedZones.length > 0) {
      const picked = selectedZones
        .map((z) => (typeof z === 'string' ? zones.find((w) => w.name.toLowerCase() === z.toLowerCase()) : z))
        .filter((z) => z && z.name && Number.isFinite(Number(z.lat)) && Number.isFinite(Number(z.lng)));
      if (picked.length > 0) zones = picked;
    }

    const specificity = classifyQuery(cleanQuery, cc);
    const defaultSubvectors = getSubvectorsForQuery(cleanQuery, cc);
    const activeSubvectors =
      Array.isArray(subcategories) && subcategories.length > 0
        ? subcategories.map((s) => String(s || '').trim()).filter(Boolean)
        : defaultSubvectors;

    const expandedPhrases = expandCompoundSearchPhrases(cleanQuery);
    const queriesToRun = Array.from(new Set(
      [
        ...expandedPhrases,
        ...activeSubvectors
      ].map((s) => String(s || '').trim()).filter(Boolean)
    ));
    const safetyProfile = HardwareSafetyEngine.getProfile();
    // Scale parallel zone workers dynamically to live RAM & CPU tier (1..12 zones)
    const zoneConcurrency = Math.min(zones.length || 1, Math.max(1, safetyProfile.zoneConcurrency || 4));
    const gosomSubConcurrency = Math.max(4, Math.min(12, safetyProfile.gosomConcurrency || 8));
    const gmapDirectConcurrency = Math.max(2, Math.min(6, safetyProfile.gmapDirectConcurrency || 3));
    const initialZIdx = Math.max(0, parseInt(startZoneIndex, 10) || 0);
    const resolvedCity = geoData.cityName || cleanLocation;

    const session = {
      id: sessionId,
      query: cleanQuery,
      location: resolvedCity,
      country: cc,
      status: 'running',
      startTime: Date.now(),
      totalSteps: zones.length,
      completedSteps: initialZIdx,
      leadsHarvested: resumeSessionId ? store.getVendorsBySession(sessionId).length : 0,
      verifiedLeadsHarvested: 0,
      subcategoriesCount: queriesToRun.length,
      zoneMode: geoData.mode || zoneMode,
      hardwareTier: safetyProfile.tier,
      zoneConcurrency,
      engineCounts: {},
      activeWorkers: {},
      abortController
    };
    this.activeSessions.set(sessionId, session);

    const isMasterSweep = Boolean(geoData?.isMaster);
    const sseAudience = { isMaster: isMasterSweep };

    folderStore.startFolder({
      sessionId, query: cleanQuery, city: resolvedCity, country: cc,
      totalZones: zones.length, completedZones: initialZIdx, subcategoriesPlanned: queriesToRun,
      isMaster: isMasterSweep, scope: geoData?.scope || (isMasterSweep ? 'district' : 'city')
    });

    const startPayload = {
      sessionId, status: 'running', query: cleanQuery, location: resolvedCity, country: cc,
      totalMandalsAcrossAll: zones.length, overallCompletedMandals: initialZIdx,
      vendorsFound: session.leadsHarvested, subcatTotal: queriesToRun.length, zoneConcurrency,
      hardwareTier: safetyProfile.tier, zones,
      message: `Parallel sweep (${zoneConcurrency} zones live): ${queriesToRun.length} sub-categories across ${zones.length} zones in ${resolvedCity}`
    };
    sse.broadcastStatus(startPayload, sessionId, sseAudience);
    sse.broadcastProgress(startPayload, sessionId, sseAudience);

    const NON_HEALTHCARE_CAT_RE = /\b(furniture|manufacturer|hardware|restaurant|bakery|cafe|salon|beauty\s*parlo?ur|jewel|boutique|clothing|grocery|supermarket|real\s*estate|property|school|college|temple|church|mosque|petrol|fuel|car\s*wash|auto\s*repair|tire|tyre|atm|bank)\b/i;
    const HEALTHCARE_FAMILIES = new Set(['hospital', 'hospital_specific', 'clinics', 'dental', 'eye', 'ortho', 'maternity', 'pediatric', 'cardiac', 'oncology', 'ent']);

    const processAndStoreLead = async (rawLead, zoneName = '', matchedSubcat = '', zoneMeta = null) => {
      if (!rawLead || !rawLead.name || signal.aborted || (maxLeads > 0 && session.verifiedLeadsHarvested >= maxLeads)) {
        return false;
      }
      if (String(rawLead.businessStatus || rawLead.business_status || '').toUpperCase() === 'CLOSED_PERMANENTLY') {
        return false;
      }
      const lead = normalizeLead({ ...rawLead, searchZone: rawLead.searchZone || zoneName }, rawLead.source || 'polyglot');
      if (geoData?.isMaster && geoData.bounds) {
        const lat = Number(lead.latitude || lead.lat);
        const lng = Number(lead.longitude || lead.lng);
        if (!Number.isNaN(lat) && !Number.isNaN(lng) && (lat !== 0 || lng !== 0)) {
          const { minLat, maxLat, minLng, maxLng } = geoData.bounds;
          if (lat < minLat - 0.1 || lat > maxLat + 0.1 || lng < minLng - 0.1 || lng > maxLng + 0.1) return false;
        }
      } else if (!isWithinCityBounds(lead, cleanLocation, geoData)) {
        return false;
      }
      if (!passesUniversalPurityGate(lead, specificity)) return false;

      if (HEALTHCARE_FAMILIES.has(specificity.categoryFamily) && lead.category && NON_HEALTHCARE_CAT_RE.test(lead.category)) {
        return false;
      }

      lead.query = cleanQuery;
      lead.businessModel = specificity.businessModelLabel || lead.businessModel || 'Service';
      lead.intentType = specificity.intentType || 'service';
      // Keep searched taxonomy subcategory clean; never overwrite Subcategory with raw Google/OSM category tags
      lead.matchedSubcategory = matchedSubcat || lead.subcategory || cleanQuery;
      if (matchedSubcat && !lead.subcategory) lead.subcategory = matchedSubcat;
      lead.searchZone = zoneName || lead.searchZone || '';
      lead.zone = lead.searchZone || lead.locality || resolvedCity;
      if (!lead.city || /\bcolony\b/i.test(lead.city)) {
        lead.city = zoneMeta?.searchLocation || resolvedCity;
      }
      if (!lead.state && cc === 'GB') {
        lead.state = /london/i.test(`${lead.city} ${lead.address || ''}`) ? 'Greater London' : 'England';
      }
      if (zoneMeta?.districtName) lead.district = zoneMeta.districtName;
      if (zoneMeta?.stage) lead.adminStage = zoneMeta.stage;
      if (geoData?.isMaster) lead.isMaster = true;
      lead.country = cc;

      const saveResult = store.saveVendor(lead, sessionId);
      if (saveResult && saveResult.isNewForSession) {
        session.leadsHarvested++;
        const targetLead = saveResult.lead || lead;
        const srcKey = lead.source || targetLead.source || 'polyglot';
        session.engineCounts[srcKey] = (session.engineCounts[srcKey] || 0) + 1;
        if (targetLead.phone || targetLead.mobilePhone || targetLead.source.includes('maps') || targetLead.source.includes('gmap') || targetLead.source.includes('justdial') || targetLead.source.includes('yellowpages')) {
          session.verifiedLeadsHarvested++;
        }
        const sessLeads = store.getVendorsBySession(sessionId);
        let phonesFound = 0, mobilesFound = 0, landlinesFound = 0, emailsFound = 0;
        for (const l of sessLeads) {
          if (l.mobilePhone || l.isMobile) { mobilesFound++; phonesFound++; }
          else if (l.phone || l.landlinePhone) { landlinesFound++; phonesFound++; }
          if (l.email || (Array.isArray(l.emails) && l.emails.length > 0)) emailsFound++;
        }
        sse.broadcastVendor(targetLead, sessionId, sseAudience);
        sse.broadcastProgress({
          sessionId, status: 'running', currentZone: targetLead.zone,
          overallCompletedMandals: session.completedSteps, totalMandalsAcrossAll: zones.length,
          vendorsFound: session.leadsHarvested, phonesFound, mobilesFound, landlinesFound, emailsFound,
          engineCounts: session.engineCounts
        }, sessionId, sseAudience);
        queueLeadEnrichment(targetLead, sessionId, cc);
        return true;
      }
      if (saveResult && !saveResult.isNewForSession && saveResult.enriched && passesUniversalPurityGate(saveResult.lead, specificity)) {
        sse.broadcastVendor(saveResult.lead, sessionId, sseAudience);
      }
      return false;
    };

    (async () => {
      try {
        // Prewarm Indian JustDial ncatid cache in parallel (non-blocking)
        if (cc === 'IN') {
          prewarmNcatIds(queriesToRun.slice(0, 12), resolvedCity).catch(() => { });
        }

        const primarySplit = expandCompoundSearchPhrases(cleanQuery)[0] || cleanQuery;
        const wave0City = geoData?.isMaster && geoData?.hqCity ? geoData.hqCity : resolvedCity;
        const cityCenterZone = { name: wave0City, lat: geoData.center?.lat || zones[0]?.lat || 0, lng: geoData.center?.lng || zones[0]?.lng || 0, radiusKm: 12 };
        // Wave-0 Instant City Burst: City-Wide Gosom + Direct Maps + OSM Commercial POIs + Directories + Web SERP + Social Dorks at t=0
        const wave0Promise = Promise.allSettled([
          runGosomZoneBatch({
            queries: queriesToRun.slice(0, 6),
            zone: cityCenterZone,
            baseCity: wave0City,
            countryCode: cc,
            radius: 18000,
            depth: 16,
            concurrency: Math.max(gosomSubConcurrency, 8),
            extractEmail: false,
            signal
          }).then(async (cityLeads) => {
            for (const l of cityLeads) {
              if (signal.aborted) break;
              await processAndStoreLead(l, l.locality || wave0City, l.matchedSubcategory || primarySplit);
            }
          }),
          scrapeDirectGoogleMapsBatch({
            queries: queriesToRun.slice(0, 16),
            zone: cityCenterZone,
            baseCity: wave0City,
            countryCode: cc,
            radius: 18000,
            maxPages: 6,
            concurrency: Math.max(gmapDirectConcurrency, 6),
            signal,
            onLead: (raw) => processAndStoreLead(raw, raw.locality || wave0City, raw.matchedSubcategory || primarySplit)
          }),
          scrapeSovereignDirectory({
            country: cc,
            category: primarySplit,
            subcategories: queriesToRun,
            city: wave0City,
            zones,
            bounds: geoData.bounds || null,
            intentType: specificity.intentType || 'service',
            signal,
            onLead: (raw) => processAndStoreLead(raw, raw.locality || wave0City, raw.matchedSubcategory || primarySplit)
          }),
          scrapeSocialDorks({
            category: primarySplit,
            location: wave0City,
            countryCode: cc,
            signal,
            onLead: (raw) => processAndStoreLead(raw, wave0City, primarySplit)
          }),
          scrapeDeepWebSerp({
            category: primarySplit,
            city: wave0City,
            country: cc,
            maxPages: 3,
            signal,
            onLead: (raw) => processAndStoreLead(raw, wave0City, primarySplit)
          })
        ]);

        // Parallel Zone Worker Pool: 3-4 concurrent zones running all engines simultaneously
        let nextZoneCursor = initialZIdx;
        let completedZonesCount = initialZIdx;
        let durationSumSec = 0;
        let finishedThisRun = 0;

        const runSingleZoneWorker = async (workerId) => {
          while (!signal.aborted && !(maxLeads > 0 && session.verifiedLeadsHarvested >= maxLeads)) {
            const zIdx = nextZoneCursor;
            if (zIdx >= zones.length) break;
            nextZoneCursor += 1;

            const zone = zones[zIdx];
            const zoneBaseLoc = zone.searchLocation || resolvedCity;
            const zoneStart = Date.now();
            await HardwareSafetyEngine.enforceSafetyPause();

            const avgSec = finishedThisRun > 0 ? Math.max(1, Math.round(durationSumSec / finishedThisRun)) : 5;
            const remainingBatches = Math.max(0, Math.ceil((zones.length - completedZonesCount) / zoneConcurrency));
            const cityEtaSec = remainingBatches * avgSec;

            const emitPoint = (ptData) => {
              session.activeWorkers[workerId] = { workerId, name: zone.name, zoneIndex: zIdx + 1, activeSubcategory: ptData.activeSubcategory };
              sse.broadcastActivePoint({ ...ptData, activeWorkers: Object.values(session.activeWorkers), completedZones: completedZonesCount }, sessionId, sseAudience);
            };

            emitPoint({
              workerId, name: zone.name, lat: zone.lat, lng: zone.lng, city: resolvedCity,
              zoneIndex: zIdx + 1, totalZones: zones.length, subcatIndex: 1, subcatTotal: queriesToRun.length,
              activeSubcategory: queriesToRun[0],
              stage: `Zone ${zIdx + 1}/${zones.length}: ${zone.name} (${queriesToRun.length} sub-cats · Worker ${workerId + 1})`,
              zoneEtaSec: avgSec, cityEtaSec, activeSubvectors: queriesToRun
            });

            // Fast Gosom Wave on top 6 commercial zones so deep workers advance without Go binary stall
            const zoneRadiusM = Math.max(2500, Math.round((zone.radiusKm || 2.2) * 1400));
            const gosomQueries = zIdx < 6 ? queriesToRun.slice(0, 2) : [];

            const runFastGosomWave = async () => {
              if (signal.aborted || gosomQueries.length === 0) return;
              const leads = await runGosomZoneBatch({
                queries: gosomQueries,
                zone,
                baseCity: zoneBaseLoc,
                countryCode: cc,
                radius: zoneRadiusM,
                depth: 6,
                concurrency: Math.min(6, Math.max(4, gosomSubConcurrency)),
                extractEmail: false,
                signal
              });
              for (const lead of leads) {
                if (signal.aborted) break;
                await processAndStoreLead(lead, zone.name, lead.matchedSubcategory || gosomQueries[0] || cleanQuery, zone);
              }
            };

            const primarySplit = expandCompoundSearchPhrases(cleanQuery)[0] || cleanQuery;
            const zoneTasks = [
              runFastGosomWave(),
              scrapeDirectGoogleMapsBatch({
                queries: queriesToRun,
                zone,
                baseCity: zoneBaseLoc,
                countryCode: cc,
                radius: Math.max(4000, zoneRadiusM),
                maxPages: zIdx < 60 ? 6 : 4,
                secondaryMaxPages: zIdx < 60 ? 3 : 2,
                concurrency: Math.max(gmapDirectConcurrency, 5),
                signal,
                onLead: (raw) => processAndStoreLead(raw, zone.name, raw.matchedSubcategory || primarySplit, zone)
              }),
              scrapeSovereignSingleZone({
                country: cc,
                category: primarySplit,
                city: zoneBaseLoc,
                zoneName: zone.name,
                zone,
                zoneIndex: zIdx,
                intentType: specificity.intentType || 'service',
                subcategories: queriesToRun,
                signal,
                onLead: (raw) => processAndStoreLead(raw, zone.name, raw.matchedSubcategory || primarySplit, zone)
              })
            ];

            if (zIdx < 12 || cc !== 'IN') {
              zoneTasks.push(
                scrapeSocialDorks({
                  category: primarySplit,
                  location: `${zone.name}, ${zoneBaseLoc}`,
                  countryCode: cc,
                  signal,
                  onLead: (raw) => processAndStoreLead(raw, zone.name, primarySplit, zone)
                })
              );
            }

            await Promise.allSettled(zoneTasks);
            delete session.activeWorkers[workerId];
            if (signal.aborted) break;

            const zoneDurSec = Math.max(1, Math.round((Date.now() - zoneStart) / 1000));
            durationSumSec += zoneDurSec;
            finishedThisRun += 1;
            completedZonesCount += 1;
            session.completedSteps = completedZonesCount;

            const updatedAvg = Math.max(1, Math.round(durationSumSec / finishedThisRun));
            const remBatches = Math.max(0, Math.ceil((zones.length - completedZonesCount) / zoneConcurrency));

            folderStore.updateFolderProgress(sessionId, { completedZones: completedZonesCount, status: signal.aborted ? 'stopped' : 'running', totalZones: zones.length });
            if (!signal.aborted) {
              sse.broadcastProgress({
                sessionId, status: 'running', currentZone: zone.name,
                overallCompletedMandals: completedZonesCount, totalMandalsAcrossAll: zones.length,
                vendorsFound: session.leadsHarvested, zoneEtaSec: updatedAvg,
                cityEtaSec: remBatches * updatedAvg, lastZoneDurationSec: zoneDurSec
              }, sessionId, sseAudience);
            }
          }
        };

        const workers = Array.from({ length: zoneConcurrency }, (_, idx) => runSingleZoneWorker(idx));
        await Promise.allSettled(workers);
        // Let any in-flight Wave-0 burst & priority phone rescue drain cleanly before completing
        if (!signal.aborted) {
          await Promise.race([wave0Promise, new Promise((r) => setTimeout(r, 10000))]);
          await drainPhoneRescue(sessionId, 12000);
        }

        session.status = signal.aborted ? 'stopped' : 'complete';
        store.compactJournal();
        folderStore.updateFolderProgress(sessionId, { completedZones: session.completedSteps, status: session.status, totalZones: zones.length });
        sse.broadcastProgress({
          sessionId, status: session.status, serverConfirmed: true,
          overallCompletedMandals: session.completedSteps, totalMandalsAcrossAll: zones.length,
          vendorsFound: session.leadsHarvested, engineCounts: session.engineCounts,
          message: `Sweep ${session.status === 'stopped' ? 'paused' : 'completed'}: ${session.leadsHarvested} leads across ${session.completedSteps}/${zones.length} zones.`
        }, sessionId, sseAudience);
      } catch (fatalErr) {
        session.status = 'error';
        folderStore.updateFolderProgress(sessionId, { status: 'error', totalZones: zones.length });
        sse.broadcastProgress({ sessionId, status: 'error', error: fatalErr.message }, sessionId, sseAudience);
      }
    })();

    return {
      ok: true, sessionId, status: 'running', cityName: resolvedCity,
      totalZones: zones.length, totalAllPlaces: geoData.totalAllPlaces || zones.length,
      zones, subcategories: queriesToRun, hardwareTier: safetyProfile.tier, concurrency: zoneConcurrency
    };
  }
}

module.exports = new PolyglotOrchestrator();
