// Persistent Queue with In-Memory Buffering (Removes I/O Blocking and ECONNREFUSED 127.0.0.1:6379 errors)
const fs = require('fs');
const path = require('path');
const browserBudget = require('./browserBudget');
const requestGuard = require('./requestGuard');

const JOBS_FILE = path.join(require('../config/paths').DATA_DIR, 'jobs.json');

// Ensure jobs folder exists
if (!fs.existsSync(path.dirname(JOBS_FILE))) {
  fs.mkdirSync(path.dirname(JOBS_FILE), { recursive: true });
}

let globalDeps = {
  logger: console.log,
  abortSignal: { aborted: false }
};

let inMemoryQueue = [];
let queueWriteTimeout = null;
let queueLoaded = false;
const abortedSessions = new Set();

function markSessionAborted(sessionId) {
  if (!sessionId) return 0;
  const sid = String(sessionId);
  abortedSessions.add(sid);
  const t = setTimeout(() => abortedSessions.delete(sid), 10 * 60_000);
  if (typeof t.unref === 'function') t.unref();

  const before = inMemoryQueue.length;
  inMemoryQueue = inMemoryQueue.filter(job => job?.meta?.sessionId !== sid);
  const removed = before - inMemoryQueue.length;
  if (removed) {
    savePersistentQueue();
    publishDiscoveryQueued();
  }
  return removed;
}

function clearSessionAborted(sessionId) {
  if (!sessionId) return;
  abortedSessions.delete(String(sessionId));
}

function isSessionAborted(sessionId) {
  if (globalDeps.abortSignal && globalDeps.abortSignal.aborted) return true;
  if (sessionId && abortedSessions.has(String(sessionId))) return true;
  return false;
}

function loadQueue() {
  if (fs.existsSync(JOBS_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf-8'));
      inMemoryQueue = Array.isArray(parsed) ? parsed : [];
      if (inMemoryQueue.length) {
        globalDeps.logger(`[Queue] Resumed ${inMemoryQueue.length} job(s) from disk.`);
      }
    } catch (e) {
      // A truncated jobs file must never stop the engine from booting; the
      // queue is a resume hint, not the source of truth for any lead.
      inMemoryQueue = [];
      try {
        fs.renameSync(JOBS_FILE, `${JOBS_FILE}.corrupt-${Date.now()}`);
      } catch (renameError) { /* ignore */ }
      console.error('[Queue] jobs.json was unreadable; started with an empty queue.');
    }
  } else {
    inMemoryQueue = [];
  }
}

// Atomic write: temp file + rename. A process killed mid-write used to leave a
// half-written jobs.json, which the next boot read as an empty queue.
function _flushQueueToDisk() {
  const tmp = `${JOBS_FILE}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(inMemoryQueue));
    fs.renameSync(tmp, JOBS_FILE);
  } catch (err) {
    console.error('[Queue] Failed to write persistent jobs file:', err.message);
    try { fs.unlinkSync(tmp); } catch (e) { /* ignore */ }
  }
}

function savePersistentQueue() {
  clearTimeout(queueWriteTimeout);
  queueWriteTimeout = setTimeout(_flushQueueToDisk, 500);
  if (typeof queueWriteTimeout.unref === 'function') queueWriteTimeout.unref();
}

function initQueue(deps) {
  // Called from both index.js and the scrape router on purpose (each wants its
  // own deps wired). Only the first call may load the queue and arm the resume
  // timer; a second load would overwrite jobs enqueued in between.
  globalDeps = { ...globalDeps, ...deps };
  if (queueLoaded) return;
  queueLoaded = true;
  loadQueue();
  // Resume any jobs that were pending/running when the server restarted.
  const resumeTimer = setTimeout(processQueue, 2000);
  if (typeof resumeTimer.unref === 'function') resumeTimer.unref();
}

// Map of task types to actual execution functions
const taskRegistry = {};

function registerTask(name, fn) {
  taskRegistry[name] = fn;
}

const os = require('os');

function getPersistentQueue() {
  return inMemoryQueue;
}

let isProcessing = false;
let activeCount = 0;
let playwrightActiveCount = 0;

// Browser-backed tasks must be throttled by the Playwright slot count. Without
// this, directory engines were counted as HTTP jobs and could launch a dozen
// Chromium contexts at once, which is what made runs slow and unstable.
const PLAYWRIGHT_TASKS = new Set([
  'scrapeGooglePlaces',
  'scrapeGoogleLocalFinder',
  'scrapeWeddingBazaar',
  'scrapeWeddingWire',
  'scrapeMandap',
  'scrapePuppeteerIndiaMart',
  'scrapeCrawleeDeep',
  'scrapeScrapySpider'
]);

// Dynamic Concurrency Calculator based on real-time System RAM availability
function getDynamicConcurrency() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const freeRamPct = Math.round((freeMem / totalMem) * 100);

    // HTTP concurrency stays deliberately modest. A dozen parallel directory
    // requests is how a single IP starts seeing 429s; eight is enough to keep
    // the run fast and polite at the same time.
    let maxHttp = 12;
    const maxPlaywright = browserBudget.discoveryLimit();

    if (freeRamPct < 20) {
      maxHttp = 5;
    }

    return {
      maxHttpConcurrency: maxHttp,
      maxPlaywrightConcurrency: maxPlaywright,
      freeRamPct,
      activeCount,
      playwrightActiveCount
    };
  } catch (e) {
    return { maxHttpConcurrency: 8, maxPlaywrightConcurrency: 6, freeRamPct: 50, activeCount, playwrightActiveCount };
  }
}

function getConcurrencyMetrics() {
  const dynamic = getDynamicConcurrency();
  const browserActive = Math.max(0, dynamic.playwrightActiveCount || 0);
  return {
    activeWorkers: activeCount,
    maxWorkers: dynamic.maxPlaywrightConcurrency,
    // Split the budget so the UI can show "3/5 browsers, 2/8 HTTP" instead of
    // one merged worker count that makes the panel look over-subscribed.
    browserSlots: dynamic.maxPlaywrightConcurrency,
    httpSlots: dynamic.maxHttpConcurrency,
    browserActive,
    httpActive: Math.max(0, activeCount - browserActive),
    freeRamPct: dynamic.freeRamPct,
    pendingJobs: inMemoryQueue.length,
    browserBudget: browserBudget.getStatus(),
    guard: requestGuard.snapshot()
  };
}

const activeJobs = new Map();

/**
 * How many worker slots each run currently holds.
 *
 * A run is one session (one folder). The scheduler uses this to round-robin
 * between runs, so a 108-zone client sweep and a 1,200-zone master sweep can
 * both progress at once instead of the larger one taking every slot until it
 * finishes. With a single run every load is equal, so the existing priority
 * ordering (the zone gradient) is unchanged.
 */
function activeSlotsBySession() {
  const counts = new Map();
  for (const job of activeJobs.values()) {
    const sid = job?.meta?.sessionId || null;
    if (!sid) continue;
    counts.set(sid, (counts.get(sid) || 0) + 1);
  }
  return counts;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Deferred-job timer
   Pacing and cooldowns mean a job may not be runnable for a few seconds. Instead
   of busy-looping, schedule one wake-up for the earliest `notBefore`.
   ──────────────────────────────────────────────────────────────────────────── */
let deferredTimer = null;

function scheduleDeferred(waitMs) {
  if (!Number.isFinite(waitMs) || waitMs <= 0) return;
  const delay = Math.max(40, Math.min(Math.ceil(waitMs) + 25, 60_000));
  clearTimeout(deferredTimer);
  deferredTimer = setTimeout(() => {
    deferredTimer = null;
    processQueue();
  }, delay);
  if (typeof deferredTimer.unref === 'function') deferredTimer.unref();
}

async function processQueue() {
  if (deferredTimer) {
    clearTimeout(deferredTimer);
    deferredTimer = null;
  }
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (true) {
      if (globalDeps.abortSignal.aborted) {
        inMemoryQueue = [];
        savePersistentQueue();
        globalDeps.logger(`[Queue] Queue cleared due to master abort.`);
        break;
      }

      if (inMemoryQueue.length === 0) break;

      const limits = getDynamicConcurrency();

      // Find the first job that has a worker slot *and* passes the politeness
      // guard. Checking the slot first matters: a job that cannot run yet must
      // not consume its engine's pacing window.
      let jobIndex = -1;
      let isPlaywrightJob = false;
      let deferredWait = Infinity;
      let skipped = 0;

      // Fair share across runs. Pick the runnable job whose session currently
      // holds the fewest slots; ties fall back to the declared priority, which
      // is what preserves the zone gradient inside a single run.
      const sessionLoad = activeSlotsBySession();
      let bestLoad = Infinity;

      for (let i = 0; i < inMemoryQueue.length; i++) {
        const candidate = inMemoryQueue[i];
        if (!candidate) continue;

        const candSession = candidate?.meta?.sessionId;
        if (candSession && abortedSessions.has(String(candSession))) {
          inMemoryQueue.splice(i, 1);
          i -= 1;
          skipped += 1;
          continue;
        }

        if (candidate.notBefore && candidate.notBefore > Date.now()) {
          deferredWait = Math.min(deferredWait, candidate.notBefore - Date.now());
          continue;
        }

        const isPlaywright = PLAYWRIGHT_TASKS.has(candidate.taskName);
        const hasSlot = isPlaywright
          ? playwrightActiveCount < limits.maxPlaywrightConcurrency
          : (activeCount - playwrightActiveCount) < limits.maxHttpConcurrency;
        if (!hasSlot) continue;

        const gate = requestGuard.beforeJob(candidate.taskName);
        if (!gate.allow) {
          if (gate.skip) {
            inMemoryQueue.splice(i, 1);
            i -= 1;
            skipped += 1;
            globalDeps.logger(
              `[Guard] Skipped ${candidate.taskName}: ${gate.reason} (${Math.round((gate.remainingMs || 0) / 1000)}s cooldown left). Other engines continue.`
            );
            continue;
          }
          candidate.notBefore = Date.now() + Math.max(40, gate.waitMs || 50);
          deferredWait = Math.min(deferredWait, candidate.notBefore - Date.now());
          continue;
        }

        const sessionId = candidate.meta?.sessionId || null;
        const load = sessionId ? (sessionLoad.get(sessionId) || 0) : 0;
        const better = load < bestLoad
          || (load === bestLoad
            && jobIndex !== -1
            && (candidate.priority || 0) > (inMemoryQueue[jobIndex].priority || 0));
        if (!better) continue;

        jobIndex = i;
        isPlaywrightJob = isPlaywright;
        bestLoad = load;
      }

      if (jobIndex === -1) {
        if (skipped) savePersistentQueue();
        scheduleDeferred(deferredWait);
        break;
      }

      // Extract the runnable job
      const job = inMemoryQueue.splice(jobIndex, 1)[0];
      savePersistentQueue(); // Debounced disk save

      if (job) {
        startJobExecution(job, isPlaywrightJob);
      }
    }
  } catch (err) {
    console.error('[Queue Error] Error in processQueue loop:', err.message);
  } finally {
    isProcessing = false;
    publishDiscoveryQueued();
  }
}

// Rest of worker code remains identical for stability
function startJobExecution(job, isPlaywright) {
  activeCount++;
  if (isPlaywright) {
    playwrightActiveCount++;
    browserBudget.setDiscoveryActive(playwrightActiveCount);
  }

  const instanceId = Math.random().toString(36).substr(2, 5).toUpperCase();
  activeJobs.set(instanceId, job);

  // Staged boot logic for Playwright
  const delay = Promise.resolve(); // No staged delay - launch all workers instantly

  delay.then(() => processJob(job, instanceId)).finally(() => {
    activeCount--;
    if (isPlaywright) {
      playwrightActiveCount--;
      browserBudget.setDiscoveryActive(playwrightActiveCount);
    }
    activeJobs.delete(instanceId);
    publishDiscoveryQueued();
    if (globalDeps.emitActivePointEvent) {
      globalDeps.emitActivePointEvent({ instanceId, completed: true });
    }
    // Trigger next process loop without blowing up stack
    setImmediate(processQueue);
  });
}

function getActiveJobs() {
  return Array.from(activeJobs.values());
}

async function processJob(job, instanceId) {
  const { taskName, args, meta } = job;
  const fn = taskRegistry[taskName];

  if (!fn) {
    globalDeps.logger(`[Instance-${instanceId} Error] Task ${taskName} not registered.`);
    return;
  }

  globalDeps.logger(`\n[Instance-${instanceId}] Starting ${taskName}...`);
  if (meta && globalDeps.emitActivePointEvent) {
    globalDeps.emitActivePointEvent({ ...meta, instanceId });
  }

  let timer = null;
  try {
    const timeoutMs = 600000; // 10 minutes hard limit (Places extraction can take time)
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Job timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    await Promise.race([
      fn(...args),
      timeoutPromise
    ]);
    globalDeps.logger(`[Instance-${instanceId}] Job ${taskName} completed successfully.`);
  } catch (err) {
    globalDeps.logger(`[Instance-${instanceId} Error] ${taskName} failed: ${err.message}`);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function addScrapeJob(taskName, args, priority = 10, meta = null) {
  const sid = meta?.sessionId ? String(meta.sessionId) : null;
  if (sid && abortedSessions.has(sid)) {
    return;
  }
  inMemoryQueue.push({ taskName, args, priority, meta });
  inMemoryQueue.sort((a, b) => b.priority - a.priority);
  savePersistentQueue();
  publishDiscoveryQueued();

  processQueue(); // Kick off processing if not already running
}

/**
 * Tell the browser budget how many browser discovery jobs are still waiting.
 * The enricher yields while this is above zero, so discovery always gets the
 * whole machine first (see browserBudget.js).
 */
function publishDiscoveryQueued() {
  let waiting = 0;
  for (const job of inMemoryQueue) {
    if (job && PLAYWRIGHT_TASKS.has(job.taskName)) waiting++;
  }
  browserBudget.setDiscoveryQueued(waiting);
}

async function clearQueue() {
  inMemoryQueue = [];
  savePersistentQueue();
  publishDiscoveryQueued();
  globalDeps.logger(`[Queue] Persistent queue obliterated.`);
}

/**
 * Drop only the queued jobs that belong to one run. A targeted Stop must not
 * cancel a master sweep that happens to share the engine.
 */
async function clearQueueForSession(sessionId) {
  if (!sessionId) return clearQueue();
  const before = inMemoryQueue.length;
  inMemoryQueue = inMemoryQueue.filter(job => {
    const jobSession = job?.meta?.sessionId;
    return jobSession && jobSession !== sessionId;
  });
  savePersistentQueue();
  publishDiscoveryQueued();
  const removed = before - inMemoryQueue.length;
  if (removed) globalDeps.logger(`[Queue] Removed ${removed} queued job(s) for session ${sessionId}.`);
  return removed;
}

/**
 * Drop jobs left behind by crashed or finished runs without touching jobs that
 * belong to a session that is still running. Used at the start of a new run.
 */
async function clearStaleQueue(isActiveSession) {
  const before = inMemoryQueue.length;
  inMemoryQueue = inMemoryQueue.filter(job => {
    const sid = job?.meta?.sessionId;
    if (!sid) return false;
    return typeof isActiveSession === 'function' ? Boolean(isActiveSession(sid)) : true;
  });
  savePersistentQueue();
  const removed = before - inMemoryQueue.length;
  if (removed) globalDeps.logger(`[Queue] Dropped ${removed} stale queued job(s).`);
  return removed;
}

module.exports = {
  initQueue,
  registerTask,
  addScrapeJob,
  clearQueue,
  clearQueueForSession,
  clearStaleQueue,
  markSessionAborted,
  clearSessionAborted,
  isSessionAborted,
  getPersistentQueue,
  getActiveJobs,
  getConcurrencyMetrics
};
