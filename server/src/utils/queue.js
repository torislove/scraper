// Persistent Queue with In-Memory Buffering (Removes I/O Blocking and ECONNREFUSED 127.0.0.1:6379 errors)
const fs = require('fs');
const path = require('path');

const JOBS_FILE = path.join(__dirname, '../../data/jobs.json');

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

function loadQueue() {
  if (fs.existsSync(JOBS_FILE)) {
    try {
      inMemoryQueue = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf-8')) || [];
      globalDeps.logger(`[Queue] Resumed ${inMemoryQueue.length} jobs from persistent disk store.`);
    } catch (e) {
      inMemoryQueue = [];
    }
  } else {
    inMemoryQueue = [];
  }
}

function _flushQueueToDisk() {
  try {
    fs.writeFile(JOBS_FILE, JSON.stringify(inMemoryQueue), (err) => {
      if (err) console.error('[Queue] Failed to write persistent jobs file:', err.message);
    });
  } catch (err) {
    console.error('[Queue] Sync write error:', err.message);
  }
}

function savePersistentQueue() {
  clearTimeout(queueWriteTimeout);
  queueWriteTimeout = setTimeout(_flushQueueToDisk, 500);
}

function initQueue(deps) {
  globalDeps = { ...globalDeps, ...deps };
  loadQueue();
  // Resume any jobs that were pending/running when the server restarted
  setTimeout(processQueue, 2000); 
}

// Map of task types to actual execution functions
const taskRegistry = {};

function registerTask(name, fn) {
  taskRegistry[name] = fn;
}

function getPersistentQueue() {
  return inMemoryQueue;
}

let isProcessing = false;
let activeCount = 0;
let playwrightActiveCount = 0;
// Max total active HTTP/Cheerio jobs for blazing speed
const MAX_CONCURRENCY = 5; 
// Max heavy Playwright Chromium jobs
const PLAYWRIGHT_CONCURRENCY = 5;

const activeJobs = new Map();

async function processQueue() {
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

      // Find the first job that we have a slot available for
      let jobIndex = -1;
      let isPlaywrightJob = false;

      for (let i = 0; i < inMemoryQueue.length; i++) {
        if (!inMemoryQueue[i]) continue;
        const isPlaywright = inMemoryQueue[i].taskName === 'scrapeGooglePlaces';
        if (isPlaywright && playwrightActiveCount < PLAYWRIGHT_CONCURRENCY) {
          jobIndex = i;
          isPlaywrightJob = true;
          break;
        }
        if (!isPlaywright && (activeCount - playwrightActiveCount) < MAX_CONCURRENCY) {
          jobIndex = i;
          isPlaywrightJob = false;
          break;
        }
      }

      if (jobIndex === -1) {
        // No slots available for any job in the queue currently
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
  }
}

// Rest of worker code remains identical for stability
function startJobExecution(job, isPlaywright) {
    activeCount++;
    if (isPlaywright) playwrightActiveCount++;
    
    const instanceId = Math.random().toString(36).substr(2, 5).toUpperCase();
    activeJobs.set(instanceId, job);
    
    // Staged boot logic for Playwright
    const delay = Promise.resolve(); // No staged delay - launch all workers instantly
    
    delay.then(() => processJob(job, instanceId)).finally(() => {
      activeCount--;
      if (isPlaywright) playwrightActiveCount--;
      activeJobs.delete(instanceId);
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

  // Register job userId to map log output correctly
  let jobUserId = null;
  if (args && Array.isArray(args)) {
    if (taskName === 'scrapeGooglePlaces') {
      jobUserId = args[12];
    } else if (taskName === 'scrapeGoogleSerp') {
      jobUserId = args[5];
    } else if (taskName === 'scrapeOmniOrchestrator') {
      jobUserId = args[8];
    }
  }

  if (jobUserId && global.registerJobUser) {
    global.registerJobUser(instanceId, jobUserId);
  }

  globalDeps.logger(`\n[Instance-${instanceId}] Starting ${taskName}...`);
  if (meta && globalDeps.emitActivePointEvent) {
    globalDeps.emitActivePointEvent({ ...meta, instanceId });
  }

  try {
    const timeoutMs = 600000; // 10 minutes hard limit (Places extraction can take time)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Job timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    await Promise.race([
      fn(...args),
      timeoutPromise
    ]);
    globalDeps.logger(`[Instance-${instanceId}] Job ${taskName} completed successfully.`);
  } catch (err) {
    globalDeps.logger(`[Instance-${instanceId} Error] ${taskName} failed: ${err.message}`);
  } finally {
    if (global.unregisterJobUser) {
      global.unregisterJobUser(instanceId);
    }
  }
}

async function addScrapeJob(taskName, args, priority = 10, meta = null) {
  inMemoryQueue.push({ taskName, args, priority, meta });
  inMemoryQueue.sort((a, b) => b.priority - a.priority);
  savePersistentQueue();
  
  processQueue(); // Kick off processing if not already running
}

async function clearQueue() {
  inMemoryQueue = [];
  savePersistentQueue();
  globalDeps.logger(`[Queue] Persistent queue obliterated.`);
}

module.exports = {
  initQueue,
  registerTask,
  addScrapeJob,
  clearQueue,
  getPersistentQueue,
  getActiveJobs
};
