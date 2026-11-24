/**
 * jobControlRoutes.js
 * Job control, settings, intervention, active state, pause/resume, and engine management routes.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const shared = require('./scrapeShared');
const {
  activeSessions,
  batchProgress,
  sessionAbortSignals,
  isSessionAborted,
  isSessionActive,
  updateSessionTargetState,
  safeExecute,
  requestedCountry,
  getDistanceKm,
  formatEta,
  addLog,
  emitVendorEvent,
  emitGridEvent,
  emitDispatchEvent,
  emitProgressEvent,
  emitActivePointEvent,
  globalAbortSignal
} = shared;


const { getSettings, updateSettings } = require('../../config/settingsManager');
const { resolveIntervention } = require('../../utils/manualIntervention');
const { clearQueue, clearQueueForSession, markSessionAborted, clearSessionAborted, getActiveJobs, getConcurrencyMetrics, addScrapeJob } = require('../../utils/queue');
const dbAdapter = require('../../config/dbAdapter');
const engineHealth = require('../../services/engineHealth');
const leadArchive = require('../../services/leadArchive');


router.post('/resolve-intervention', (req, res) => {
  const { platform, action } = req.body;
  if (!platform || !action) return res.status(400).json({ error: 'Missing platform or action' });

  const shouldContinue = action === 'yes';
  const resolved = resolveIntervention(platform, shouldContinue);

  if (resolved) {
    res.json({ success: true, message: `Intervention for ${platform} resolved as ${action}` });
  } else {
    res.status(404).json({ error: `No pending intervention for ${platform}` });
  }
});

router.get('/settings', (req, res) => {
  const settings = getSettings();
  res.json({
    ...settings,
    aiProvider: 'Local brain (offline, no key required)',
    mapsProvider: 'OpenStreetMap (free, no key)',
    geocodingProvider: 'OpenStreetMap Nominatim (free, no key)',
    searchProvider: 'Public web results (free, no key)'
  });
});

router.post('/settings', (req, res) => {
  // This product has no API keys. Anything secret-looking is ignored so an old
  // client cannot write a key back into settings.json.
  const newSettings = updateSettings({});
  res.json({ success: true, message: 'No keys are needed. Nothing to save.', settings: newSettings });
});

const activeCronJobs = {};

router.get('/jobs', (req, res) => {
  const isAdmin = req.headers['x-workspace-scope'] === 'admin' || req.query.scope === 'admin' || req.headers['x-admin-key'];
  const isMaster = !isAdmin && (req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master');
  const requestingUserId = req.headers['x-user-id'];

  const cronJobs = (isMaster || isAdmin) ? Object.keys(activeCronJobs).map(cat => ({
    category: cat,
    interval: activeCronJobs[cat].interval,
    status: activeCronJobs[cat].status,
    location: activeCronJobs[cat].location
  })) : [];

  // Include recent sessions, finished or running, filtered by user identity
  const now = Date.now();
  const recentSessions = Object.values(activeSessions).filter(s => {
    const started = Number(s.startTime) || 0;
    const isRecent = !started || now - started < 2 * 60 * 60 * 1000;
    if (!isRecent) return false;
    // Admin sees ALL sessions across both Master and Clients
    if (isAdmin) return true;
    // Master ONLY sees Master's territorial sweeps. Master CANNOT see client sessions!
    if (isMaster) return s.isMaster === true || s.userId === 'master';
    if (!requestingUserId || requestingUserId === 'anonymous') {
      return !s.isMaster && (!s.userId || s.userId === 'anonymous');
    }
    return !s.isMaster && (s.userId === requestingUserId || s.clientId === requestingUserId);
  });

  const activeQueue = (typeof getActiveJobs === 'function') ? getActiveJobs() : [];

  const omniJobs = recentSessions.map(s => ({
    id: s.sessionId || `session_${s.category}`,
    category: s.category,
    location: s.location,
    status: s.finished ? (s.status === 'failed' ? 'failed' : 'completed') : 'running',
    sessionActive: !s.finished,
    finishedAt: s.finishedAt || null,
    startTime: s.startTime || null,
    activeDistrict: s.activeDistrict,
    activeMandal: s.activeMandal,
    completedCount: s.overallCompletedMandals,
    totalCount: s.overallTotalMandals || s.totalMandals || Object.keys(s.completedTargetsMap || {}).length,
    eta: s.eta || s.etaText || '',
    etaText: s.etaText || s.eta || '',
    etaMs: s.etaMs || null,
    pendingJobs: s.pendingJobs ?? null,
    runningJobs: s.runningJobs ?? null,
    userId: s.userId || 'anonymous',
    isMaster: s.isMaster === true,
    clientLabel: s.clientLabel || s.userId || 'anonymous',
    type: 'omni'
  }));

  // If queue has jobs running, also expose them
  if (omniJobs.length === 0 && activeQueue.length > 0 && isMaster) {
    activeQueue.forEach((qJob, idx) => {
      omniJobs.push({
        id: `queue_${idx}`,
        category: qJob.args?.[1] || 'Business',
        location: qJob.args?.[2] || 'India',
        status: 'running',
        taskName: qJob.taskName,
        type: 'queue'
      });
    });
  }

  res.json([...omniJobs, ...cronJobs]);
});

router.get('/active', (req, res) => {
  const isAdmin = req.headers['x-workspace-scope'] === 'admin' || req.query.scope === 'admin' || req.headers['x-admin-key'];
  const isMaster = !isAdmin && (req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master');
  const requestingUserId = req.headers['x-user-id'];

  let sessions = Object.values(activeSessions);
  if (isAdmin) {
    // Admin sees all active sessions
  } else if (isMaster) {
    // Master ONLY sees master sessions. Master CANNOT see client sessions!
    sessions = sessions.filter(s => s.isMaster === true || s.userId === 'master');
  } else {
    // Client sees only own sessions
    if (requestingUserId && requestingUserId !== 'anonymous') {
      sessions = sessions.filter(s => !s.isMaster && (s.userId === requestingUserId || s.clientId === requestingUserId));
    } else {
      sessions = sessions.filter(s => !s.isMaster && (!s.userId || s.userId === 'anonymous'));
    }
  }

  // Prefer the genuinely live session, newest first.
  const newestFirst = (a, b) => (b.startTime || 0) - (a.startTime || 0);
  const liveSession = sessions
    .filter(s => s.sessionActive && !s.finished && s.status !== 'aborted' && s.status !== 'completed' && !globalAbortSignal.aborted)
    .sort(newestFirst)[0];
  const runningSession = liveSession
    || sessions.slice().sort(newestFirst)[0]
    || null;

  const activeQueue = (typeof getActiveJobs === 'function') ? getActiveJobs() : [];
  const sessionIsLive = Boolean(
    runningSession
    && !runningSession.finished
    && runningSession.status !== 'aborted'
    && runningSession.status !== 'completed'
    && runningSession.overallCompletedMandals < (runningSession.overallTotalMandals || 1)
  );
  const isScraping = (isMaster && activeQueue.length > 0) || sessionIsLive;

  res.json({
    isScraping: Boolean(isScraping),
    session: runningSession,
    queueCount: activeQueue.length,
    category: runningSession?.category || activeQueue[0]?.args?.[1] || null,
    location: runningSession?.location || activeQueue[0]?.args?.[2] || null,
    activeMandal: runningSession?.activeMandal || null,
    activeDistrict: runningSession?.activeDistrict || null,
    eta: runningSession?.eta || null,
    etaText: runningSession?.etaText || runningSession?.eta || null,
    etaMs: runningSession?.etaMs || null,
    liveSessions: (isMaster && req.query.all === '1')
      ? Object.values(activeSessions)
          .filter(s => s.sessionActive && !s.finished && s.status !== 'aborted' && s.status !== 'completed')
          .map(s => ({
            sessionId: s.sessionId,
            category: s.category,
            location: s.location,
            userId: s.userId || 'anonymous',
            isMaster: s.isMaster === true,
            completedMandals: s.overallCompletedMandals || 0,
            totalMandals: s.overallTotalMandals || s.totalMandals || 0,
            eta: s.eta || '',
            etaMs: s.etaMs || null,
            startTime: s.startTime || null
          }))
      : undefined
  });
});


router.post('/jobs/update', (req, res) => {
  const { category, action, intervalMs, location } = req.body;

  if (action === 'create') {
    if (!category || !location) return res.status(400).json({ error: 'Category and location required' });
    const ms = intervalMs || 24 * 60 * 60 * 1000; // default 24h
    if (activeCronJobs[category]) {
      clearInterval(activeCronJobs[category].timer);
    }

    // Create new scheduled job
    activeCronJobs[category] = {
      category,
      location,
      interval: ms,
      status: 'running',
      timer: setInterval(() => {
        addLog(`[Scheduler] Triggering scheduled scrape for ${category} in ${location}`);
        const searchString = `${category} in ${location}`;
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}`;
        addScrapeJob('scrapeGooglePlaces', [searchUrl, category, location, 'scheduled', null, null, 10, 'mandal']);
      }, ms)
    };

    // Also trigger it immediately the first time
    addLog(`[Scheduler] Triggering initial scrape for ${category} in ${location}`);
    const searchString = `${category} in ${location}`;
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}`;
    addScrapeJob('scrapeGooglePlaces', [searchUrl, category, location, 'scheduled', null, null, 10, 'mandal']);

    return res.json({ success: true, message: `Scheduled job created for ${category}` });
  }

  const job = activeCronJobs[category];
  if (!job) return res.status(404).json({ error: 'Job not found' });

  if (action === 'stop') {
    clearInterval(job.timer);
    job.status = 'stopped';
  } else if (action === 'start') {
    if (job.status === 'stopped') {
      const ms = intervalMs || job.interval;
      job.interval = ms;
      job.status = 'running';
      job.timer = setInterval(() => {
        addLog(`[Scheduler] Triggering scheduled scrape for ${job.category} in ${job.location}`);
        const searchString = `${job.category} in ${job.location}`;
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}`;
        addScrapeJob('scrapeGooglePlaces', [searchUrl, job.category, job.location, 'scheduled', null, null, 10, 'mandal']);
      }, ms);
    }
  } else if (action === 'update_interval') {
    clearInterval(job.timer);
    job.interval = intervalMs;
    job.status = 'running';
    job.timer = setInterval(() => {
      addLog(`[Scheduler] Triggering scheduled scrape for ${job.category} in ${job.location}`);
      const searchString = `${job.category} in ${job.location}`;
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}`;
      addScrapeJob('scrapeGooglePlaces', [searchUrl, job.category, job.location, 'scheduled', null, null, 10, 'mandal']);
    }, intervalMs);
  }

  res.json({ success: true, message: `Job for ${category} updated.` });
});

// MANUAL SCRAPER TRIGGERS

router.get('/engines/status', (req, res) => {
  try {
    const status = engineHealth.getStatus();
    const metrics = typeof getConcurrencyMetrics === 'function' ? getConcurrencyMetrics() : null;
    let httpCache = null;
    try {
      httpCache = require('../../utils/fastGoogleHttp').getHttpCacheStats();
    } catch (e) { }
    res.json({ ok: true, ...status, queue: metrics, httpCache, breakers: { localFinder: require('../../services/serpBreaker').snapshot() }, resilience: requestGuard.snapshot() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/engines/reset', (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.identity?.role === 'master' || req.identity?.role === 'admin';
    if (!isMaster && process.env.AUTH_REQUIRED === '1') {
      return res.status(403).json({ ok: false, error: 'Forbidden: Master privileges required to reset engine status.' });
    }
    engineHealth.resetEngine(String(req.body?.engine || '').trim() || null);
    res.json({ ok: true, ...engineHealth.getStatus() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});


const handleMasterStopAll = async (req, res) => {
  const bodySessionId = req.body?.sessionId || req.query?.sessionId || req.headers['x-session-id'] || null;
  const workspaceScope = req.headers['x-workspace-scope'] || (req.body?.isMaster ? 'master' : null);
  addLog(bodySessionId
    ? `🛑 [SYSTEM] STOP INITIATED for session ${bodySessionId}.`
    : `🛑 [SYSTEM] STOP INITIATED (scope: ${workspaceScope || 'global'}). Aborting active scrapes & clearing queue.`);

  // 1. Determine targets: targeted stop must never abort unrelated runs
  const runningSessions = Object.values(activeSessions).filter(session =>
    session && (session.status === 'running' || session.sessionActive === true)
  );

  let targets = [];
  const requestingUserId = req.headers['x-user-id'];
  if (bodySessionId) {
    targets = runningSessions.filter(session => session.sessionId === bodySessionId);
    if (targets.length === 0 && activeSessions[bodySessionId]) {
      targets = [activeSessions[bodySessionId]];
    }
    // Prevent client users from stopping another client's session
    if (workspaceScope !== 'master' && requestingUserId && requestingUserId !== 'anonymous') {
      targets = targets.filter(session => session.userId === requestingUserId || session.clientId === requestingUserId);
      if (targets.length === 0) {
        return res.status(403).json({ error: 'Forbidden: Cannot abort another user\'s scrape session' });
      }
    }
  } else if (workspaceScope === 'master') {
    targets = runningSessions.filter(session => session.isMaster || session.sessionId.startsWith('master_'));
  } else if (workspaceScope === 'client') {
    targets = runningSessions.filter(session => !session.isMaster && !session.sessionId.startsWith('master_') && 
      (!requestingUserId || requestingUserId === 'anonymous' || session.userId === requestingUserId));
  } else {
    targets = runningSessions;
  }

  const otherRunning = runningSessions.filter(session => !targets.includes(session));

  // 2. Mark targets as aborted immediately and clear queue BEFORE closing browsers
  // so processJob().finally() never pops another queued zone during shutdown.
  if (bodySessionId) {
    markSessionAborted(bodySessionId);
  }
  for (const session of targets) {
    session.aborted = true;
    session.status = 'aborted';
    session.sessionActive = false;
    markSessionAborted(session.sessionId);
    const sig = sessionAbortSignals.get(session.sessionId);
    if (sig) sig.aborted = true;
  }

  if (!bodySessionId || otherRunning.length === 0) {
    globalAbortSignal.aborted = true;
  }

  // 3. Immediately purge pending queue items
  if (bodySessionId) {
    await clearQueueForSession(bodySessionId).catch(() => { });
  } else if (targets.length > 0 && targets.length < runningSessions.length) {
    for (const s of targets) {
      await clearQueueForSession(s.sessionId).catch(() => { });
    }
  } else {
    await clearQueue().catch(() => { });
    batchProgress.isActive = false;
    batchProgress.currentTask = 'Aborted';
  }

  // 4. Stop streaming enricher, deep jobs, and close active browsers in parallel
  if (!bodySessionId || otherRunning.length === 0) {
    await Promise.allSettled([
      (async () => {
        try {
          const { streamingEnricher } = require('../../services/phoneBackfillService');
          await streamingEnricher.stop();
        } catch (e) { }
      })(),
      Promise.resolve().then(() => {
        try { require('../../services/deepProfileService').stopAll('user pressed stop'); } catch (e) { }
      }),
      (async () => {
        try {
          const { closeAllBrowsers } = require('../../scrapers/browserFactory');
          await closeAllBrowsers();
        } catch (e) { }
      })()
    ]);
  }

  // 5. Flush the atomic store before persisting
  try { dbAdapter.flushSync(); } catch (e) { }

  // 6. Persist each running session as aborted with preserved leads and zone metadata
  let totalPreserved = 0;
  for (const session of targets) {
    const sessionLeads = dbAdapter.getVendorsBySession(session.sessionId);
    totalPreserved += sessionLeads.length;
    try {
      persistSessionVault({
        sessionId: session.sessionId,
        userId: session.userId,
        category: session.category,
        location: session.location,
        leads: sessionLeads,
        final: true,
        metadata: {
          status: 'aborted',
          abortedAt: new Date().toISOString(),
          preservedLeads: sessionLeads.length,
          totalZones: session.totalMandalsAcrossAll || session.totalMandals || (session.zones ? session.zones.length : 0),
          completedZones: session.overallCompletedMandals || 0,
          completedZoneIndices: session.completedZoneIndices || [],
          completedZoneNames: session.completedZoneNames || [],
          zones: session.zones || []
        }
      });
    } catch (e) { }
    session.finished = true;
    session.finishedAt = Date.now();
    try {
      emitProgressEvent({
        sessionId: session.sessionId,
        sessionActive: false,
        aborted: true,
        status: 'aborted',
        totalLeads: sessionLeads.length,
        currentTask: `Scrape safely terminated. Collected ${sessionLeads.length} stores saved to folder.`
      });
    } catch (e) { }
  }

  addLog(`ðŸ›‘ [SYSTEM] STOP EXECUTED. Safely committed ${totalPreserved} collected stores into session folder with 'Aborted' badge.`);

  return res.json({
    success: true,
    status: 'aborted',
    preservedCount: totalPreserved,
    sessions: targets.map(session => session.sessionId),
    message: `Scrape safely terminated. Collected ${totalPreserved} stores saved to folder.`
  });
};

router.post('/jobs/stop-all', handleMasterStopAll);
router.post('/stop-all', handleMasterStopAll);
router.post('/stop', handleMasterStopAll);

router.post('/resume', async (req, res) => {
  try {
    const { sessionId, userId: bodyUserId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required to resume a scrape.' });
    }
    const userId = req.headers['x-user-id'] || bodyUserId || 'anonymous';
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.body.isMaster === true;

    // 1. Look in activeSessions first, then read from disk vault
    let session = activeSessions[sessionId];
    let vaultData = null;
    const SESSIONS_DIR = require('../../config/paths').SESSIONS_DIR;
    const userVaultPath = path.join(SESSIONS_DIR, String(userId).replace(/[^a-zA-Z0-9_-]/g, '_'), `${sessionId}.json`);
    const anonVaultPath = path.join(SESSIONS_DIR, 'anonymous', `${sessionId}.json`);
    const targetFile = fs.existsSync(userVaultPath) ? userVaultPath : (fs.existsSync(anonVaultPath) ? anonVaultPath : null);

    if (targetFile) {
      try {
        vaultData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
      } catch (e) {
        addLog(`[Resume] Could not parse vault ${targetFile}: ${e.message}`);
      }
    }

    const category = session?.category || vaultData?.category;
    const location = session?.location || vaultData?.location;

    if (!category || !location) {
      return res.status(404).json({ error: `Cannot resume session "${sessionId}": session metadata not found.` });
    }

    // 2. Identify all zones and completed zones
    const rawCoverageMode = session?.coverageMode || vaultData?.metadata?.coverageMode || 'deep';
    const coverageMode = String(rawCoverageMode).toLowerCase() === 'fast' ? 'fast' : 'deep';
    let allZones = session?.zones || vaultData?.metadata?.zones || [];
    if (!allZones || allZones.length === 0) {
      const { resolveUniversalZones } = require('../../utils/universalGeoCluster');
      const sessionCountry = session?.country || vaultData?.metadata?.country || 'IN';
      const resolved = resolveUniversalZones(location, category, isMaster, sessionCountry);
      allZones = resolved.map(z => ({ name: z.zoneName, ...z }));
    }

    // Fast folders deliberately deferred their grid pass. Resume continues the
    // named pass only; the grid cells stay recorded for a later deep pass.
    if (coverageMode === 'fast') {
      allZones = allZones.filter(z => !(z.coverageKind === 'grid' || z.kind === 'grid'));
    }

    const completedZoneIndices = new Set(
      session?.completedZoneIndices || vaultData?.metadata?.completedZoneIndices || []
    );
    const completedZoneNames = new Set(
      (session?.completedZoneNames || vaultData?.metadata?.completedZoneNames || []).map(s => String(s).toLowerCase().trim())
    );

    // Filter to remaining uncompleted zones. Names are the durable identity:
    // a fast folder's stored indices point at the full footprint, so after the
    // grid cells are filtered out only the names can be trusted.
    const remainingZones = allZones.filter((z, idx) => {
      const zName = String(z.name || z.zoneName || '').toLowerCase().trim();
      if (completedZoneNames.has(zName)) return false;
      if (coverageMode === 'fast') return true;
      return !completedZoneIndices.has(idx);
    });

    const remainingSet = new Set(remainingZones);
    const activeCompletedIndices = new Set();
    allZones.forEach((zone, idx) => {
      if (!remainingSet.has(zone)) activeCompletedIndices.add(idx);
    });

    if (remainingZones.length === 0) {
      return res.json({
        ok: true,
        alreadyComplete: true,
        message: 'All zones for this search have already been completed!',
        totalZones: allZones.length,
        completedZones: allZones.length,
        sessionId
      });
    }

    addLog(`[Resume] ðŸ”„ Resuming session "${sessionId}" ("${category}" in "${location}"): ${remainingZones.length}/${allZones.length} zones remaining.`);

    // 3. Reset abort flags for this session
    sessionAbortSignals.set(sessionId, { aborted: false });
    activeSessions[sessionId] = {
      ...(session || {}),
      sessionId,
      userId,
      category,
      location,
      status: 'running',
      sessionActive: true,
      aborted: false,
      finished: false,
      zones: allZones,
      coverageMode,
      completedZoneIndices: Array.from(activeCompletedIndices),
      completedZoneNames: Array.from(completedZoneNames),
      startTime: Date.now()
    };

    // 4. Construct a resumed plan. Scope and parent names are inferred from the
    // stored zone rows so a resumed Tenali Mandal sweep stays a mandal sweep
    // (the old plan carried no scope, so it fell back to district behaviour).
    const sampleZone = remainingZones[0] || allZones[0] || {};
    const resumeScope = session?.scope || vaultData?.metadata?.scope || sampleZone.scope || (isMaster ? 'district' : 'city');
    const resumeDistrict = session?.district || vaultData?.metadata?.district || sampleZone.district || null;
    let resumeBoundary = session?.boundary || vaultData?.metadata?.boundary || null;
    // Older folders predate the stored boundary. Rebuild it from the gazetteer
    // so a resumed district sweep keeps the same territorial guard.
    if (!resumeBoundary && resumeScope === 'district' && resumeDistrict) {
      try {
        const rebuilt = buildScopeZones('district', resumeDistrict);
        resumeBoundary = rebuilt?.boundary || null;
      } catch (e) { }
    }

    const resumePlan = {
      category,
      location,
      resolvedScope: resumeScope,
      district: resumeDistrict,
      state: session?.state || vaultData?.metadata?.state || sampleZone.state || null,
      title: session?.title || vaultData?.metadata?.title || location,
      center: session?.center || vaultData?.metadata?.center || null,
      boundary: resumeBoundary,
      zones: remainingZones,
      originalTotalZones: allZones.length,
      resumed: true,
      coverageMode,
      initialCompletedCount: activeCompletedIndices.size,
      completedZoneIndices: Array.from(activeCompletedIndices),
      completedZoneNames: Array.from(completedZoneNames)
    };

    // 5. Respond immediately to UI
    res.json({
      ok: true,
      resumed: true,
      sessionId,
      category,
      location,
      coverageMode,
      remainingZonesCount: remainingZones.length,
      totalZonesCount: allZones.length,
      completedZonesCount: activeCompletedIndices.size,
      message: `Resuming scrape: ${remainingZones.length} zones remaining.`
    });

    // 6. Enqueue the orchestrator for remaining zones. Resuming keeps the
    // folder's original coverage mode instead of forcing a full grid sweep.
    globalAbortSignal.aborted = false;
    clearSessionAborted(sessionId);
    sessionAbortSignals.set(sessionId, { aborted: false });
    dbAdapter.registerSessionOwner(sessionId, userId);
    dbAdapter.registerSessionScope(sessionId, { userId, isMaster });
    addScrapeJob('scrapeOmniOrchestrator', [
      category,
      location,
      'broad',
      5,
      coverageMode,
      session?.engines || vaultData?.metadata?.engines || ['auto'],
      sessionId,
      userId,
      {},
      resumePlan,
      isMaster,
      requestedCountry(req)
    ], 10, { sessionId, userId, isMaster, unmetered: true });

  } catch (err) {
    console.error('[Resume Error]', err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
