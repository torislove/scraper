process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '64';
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const fs = require('fs');

// Environment setup
const backendEnvPath = path.join(__dirname, '../../backend/.env');
if (fs.existsSync(backendEnvPath)) {
  require('dotenv').config({ path: backendEnvPath });
} else {
  require('dotenv').config();
}

// Global Exception Handlers to prevent Playwright crashes from taking the UI
// down with them. Every fatal is written to a bounded crash log so a support
// report can name the real cause instead of "it closed".
function recordFatal(kind, err) {
  const detail = err && (err.stack || err.message) ? (err.stack || err.message) : String(err);
  const line = `[${new Date().toISOString()}] ${kind}: ${detail}\n`;
  console.error(line.trim());
  try {
    const file = path.join(__dirname, 'error_crash.log');
    fs.appendFileSync(file, line);
    if (fs.statSync(file).size > 1_000_000) {
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').slice(-400_000));
    }
  } catch (e) {
    /* the crash logger must never throw */
  }
}

process.on('uncaughtException', (err) => {
  recordFatal('Uncaught Exception', err);
});
process.on('unhandledRejection', (reason) => {
  recordFatal('Unhandled Rejection', reason);
});

// Configs
const localDb = require('./src/config/localDb');
const paths = require('./src/config/paths');
const credits = require('./src/services/credits');
const vendorStore = require('./src/config/vendorStore');

// Take the store lock at boot. A second engine must never believe it owns the
// same dataset just because the first one has not loaded it yet.
const storeOwnership = vendorStore.claimOwnership();
if (storeOwnership.readOnly) {
  console.warn(`[Server] Store is owned by live pid ${storeOwnership.ownerPid}; this instance is READ-ONLY. Stop the other engine first.`);
}
process.on('exit', () => {
  try { vendorStore.flushNow(); } catch (e) {}
  vendorStore.releaseOwnership();
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  try {
    process.on(signal, () => {
      try { vendorStore.flushNow(); } catch (e) {}
      vendorStore.releaseOwnership();
      process.exit(0);
    });
  } catch (e) {}
}
const { createLicenseGate } = require('./src/middleware/licenseGate');
const clientGate = require('./src/middleware/clientGate');
const resolveIdentity = require('./src/middleware/resolveIdentity');
const masterRoutes = require('./src/routes/master');
const notificationRoutes = require('./src/routes/notifications');

paths.ensureAll();
credits.init();

// Routes
const authRoutes = require('./src/routes/auth');
const { apiRouter, setLogGetter } = require('./src/routes/api');
const { scrapeRouter, setDeps } = require('./src/routes/scrape');
const vendorsRoutes = require('./src/routes/vendors');
const uploadRoutes = require('./src/routes/upload');
const locationsRoutes = require('./src/routes/locations');
const automationsRoutes = require('./src/routes/automations');
const sessionRoutes = require('./src/routes/sessionRoutes');
const deepProfileRoutes = require('./src/routes/deepProfile');
const searchRoutes = require('./src/routes/search');
const openApiV2Routes = require('./src/routes/openApiV2');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', false);

/* ------------------------------------------------------------------ */
/* Local-first security                                                */
/*                                                                     */
/* The engine is a local service. These guards keep random websites,   */
/* DNS-rebinding pages and runaway tabs away from the customer's data. */
/* ------------------------------------------------------------------ */
const security = require('./src/middleware/security');
const mutationLimiter = security.createRateLimiter({ windowMs: 60_000, max: 240, name: 'Write' });
const scrapeStartLimiter = security.createRateLimiter({ windowMs: 60_000, max: 30, name: 'Search start' });

app.use(security.securityHeaders);
app.use(security.createHostGuard());
app.use(cors(security.corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// Broad ceiling for every API call, then a stricter one for writes and an even
// stricter one for endpoints that start real work.
//
// Liveness and stream endpoints are exempt by design. They are the two things a
// dashboard uses to decide whether the engine is alive; throttling them turns a
// routine burst into a false "engine offline" state, which is exactly what used
// to produce an endless reconnect banner. The stream hub already bounds the
// number of open sockets, so this is not an unbounded hole.
const apiLimiter = security.createRateLimiter({ windowMs: 60_000, max: 2400, name: 'API' });
const LIMIT_EXEMPT = /^\/(health|app\/info|logs\/stream|events|scrape\/stream\/|v2\/leads\/stream)/;
app.use('/api', (req, res, next) => {
  if (LIMIT_EXEMPT.test(req.path)) return next();
  return apiLimiter(req, res, next);
});
app.use('/api', security.sanitizeRequest);
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  return mutationLimiter(req, res, next);
});
app.use('/api/scrape', (req, res, next) => {
  if (req.method !== 'POST') return next();
  if (!/^\/(omni|auto|master-sweep|batch|deep-enrich|resume)(\/|$)/.test(req.path)) return next();
  return scrapeStartLimiter(req, res, next);
});

// System Logging State & SSE
const liveStreams = require('./src/services/liveStreams');
let systemLogs = [];

/* ------------------------------------------------------------------ */
/* Vendor SSE batching                                                 */
/*                                                                     */
/* Every inserted lead used to be one JSON.stringify plus one socket    */
/* write per connected client. Five zones × twenty cards produced a     */
/* burst of hundreds of synchronous writes in the same tick, which is   */
/* exactly the kind of stall that makes the whole UI feel late. Events  */
/* now coalesce for 100 ms and are written once per client. The wire    */
/* format is unchanged (`event: vendor`), so no client needs to change. */
/* ------------------------------------------------------------------ */
const VENDOR_SSE_FLUSH_MS = 40;
const VENDOR_OUTBOX_MAX = 400;
let vendorOutbox = [];
let vendorFlushTimer = null;

function vendorBelongsToSession(vendor, sessionId) {
  if (!vendor || !sessionId) return false;
  if (vendor.sessionId === sessionId || vendor.lastSessionId === sessionId) return true;
  return Array.isArray(vendor.sessionIds) && vendor.sessionIds.includes(sessionId);
}

function flushVendorOutbox() {
  if (vendorFlushTimer) {
    clearTimeout(vendorFlushTimer);
    vendorFlushTimer = null;
  }
  if (!vendorOutbox.length) return;
  const batch = vendorOutbox;
  vendorOutbox = [];
  liveStreams.broadcastVendorBatch(batch, vendorBelongsToSession);
}

/* Console lines are coalesced the same way vendor rows are. A live sweep can
   print several lines per lead; one socket write per line was pure overhead and
   made a slow dashboard buffer thousands of tiny frames. */
const LOG_SSE_FLUSH_MS = 60;
const LOG_OUTBOX_MAX = 60;
let logOutbox = [];
let logFlushTimer = null;

function flushLogOutbox() {
  if (logFlushTimer) {
    clearTimeout(logFlushTimer);
    logFlushTimer = null;
  }
  if (!logOutbox.length) return;
  const batch = logOutbox;
  logOutbox = [];
  // The contract is unchanged: unnamed `data:` frames that the console renders
  // as plain lines. Batch them into one write per client.
  liveStreams.broadcastRaw(batch.map(line => `data: ${String(line).replace(/\n/g, '\\n')}\n\n`).join(''));
}

function sendSse(msg) {
  if (!msg) return;
  logOutbox.push(msg);
  if (logOutbox.length >= LOG_OUTBOX_MAX) {
    flushLogOutbox();
    return;
  }
  if (!logFlushTimer) {
    logFlushTimer = setTimeout(() => {
      logFlushTimer = null;
      flushLogOutbox();
    }, LOG_SSE_FLUSH_MS);
    if (typeof logFlushTimer.unref === 'function') logFlushTimer.unref();
  }
}

function addLog(msg) {
  console.log(msg);
  systemLogs.push(msg);
  if (systemLogs.length > 50) systemLogs.shift();
  sendSse(msg);
}

/* Surface politeness decisions in the live log so the customer sees why a
   source is resting instead of wondering why a zone was quieter than usual. */
const requestGuard = require('./src/utils/requestGuard');
requestGuard.onGuardEvent((event) => {
  try {
    if (event.type === 'cooldown') {
      addLog(
        `[Guard] ${event.engineKey} asked us to slow down (${event.reason}). Resting ${Math.round(event.cooldownMs / 1000)}s; every other engine keeps working.`
      );
    } else if (event.type === 'skip') {
      addLog(
        `[Guard] ${event.engineKey} is still resting for ${Math.round((event.remainingMs || 0) / 1000)}s; this zone will use the remaining engines.`
      );
    }
  } catch (e) {
    /* logging must never break a sweep */
  }
});

function emitVendorEvent(vendorObj, action = 'inserted') {
  try {
    const payload = { action, vendor: vendorObj };
    const data = JSON.stringify(payload).replace(/\n/g, '\\n');
    vendorOutbox.push({ data, vendor: vendorObj });
    if (vendorOutbox.length >= VENDOR_OUTBOX_MAX) {
      flushVendorOutbox();
      return;
    }
    if (!vendorFlushTimer) {
      vendorFlushTimer = setTimeout(() => {
        vendorFlushTimer = null;
        flushVendorOutbox();
      }, VENDOR_SSE_FLUSH_MS);
      if (typeof vendorFlushTimer.unref === 'function') vendorFlushTimer.unref();
    }

    // Website enrichment belongs to the post-scrape deep phase, not to the
    // discovery hot path. Queueing a Playwright crawl for every inserted
    // business saturated the browser pool, delayed Google/JustDial results and
    // once created a self-reinforcing crawl loop. The orchestrator now starts a
    // resumable deep job after the scrape, and its profile events stream live.
  } catch (e) { console.error('Failed to emit vendor SSE', e.message); }
}

function emitGridEvent(gridCoords) {
  try {
    liveStreams.broadcastEvent('grid_points', gridCoords);
  } catch (e) { console.error('Failed to emit grid SSE', e.message); }
}

function emitInterventionEvent(platformName, isActive) {
  try {
    liveStreams.broadcastEvent('intervention', { platform: platformName, active: isActive });
  } catch (e) { console.error('Failed to emit intervention SSE', e.message); }
}

function emitDispatchEvent(targets) {
  try {
    liveStreams.broadcastEvent('dispatch_targets', targets);
  } catch (e) { console.error('Failed to emit dispatch_targets SSE', e.message); }
}

function emitActivePointEvent(pointInfo) {
  try {
    liveStreams.broadcastEvent('active_point', pointInfo);
  } catch (e) { console.error('Failed to emit active_point SSE', e.message); }
}

function emitProgressEvent(progressInfo) {
  try {
    liveStreams.broadcastEvent('progress', progressInfo);
  } catch (e) { console.error('Failed to emit progress SSE', e.message); }
}

// Database is now completely local and loads synchronously.

// Initialize the job queue
const { initQueue } = require('./src/utils/queue');
initQueue({ logger: addLog, emitVendorEvent, emitActivePointEvent });

// Global Abort Signal
let globalAbortSignal = { aborted: false };

// Inject dependencies into routers
setLogGetter(() => systemLogs);
setDeps({ logger: addLog, abortSignal: globalAbortSignal, emitVendorEvent, emitGridEvent, emitActivePointEvent, emitInterventionEvent, emitDispatchEvent, emitProgressEvent });
const { setInterventionEmitter } = require('./src/utils/manualIntervention');
setInterventionEmitter(emitInterventionEvent);

// Apply Routes
app.use('/api/auth', authRoutes);
app.use('/api', resolveIdentity);
app.use('/api', apiRouter);
app.use('/api/scrape', createLicenseGate(), clientGate(), scrapeRouter);
app.use('/api/master', masterRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/upload', uploadRoutes);
// The upload route historically returned `/api/uploads/<file>` while being
// mounted at `/api/upload`. Serve both so old avatars keep resolving.
app.use('/api/uploads', uploadRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/location', locationsRoutes);
app.use('/api/automations', automationsRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/deep-profile', deepProfileRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/v2', openApiV2Routes);

// Territory & Sample Excel Endpoints (All 633 Districts & 600,000 Villages)
const { getTerritorySummary, searchTerritory } = require('./src/utils/territoryHelper');
app.get(['/api/territory/summary', '/api/sessions/territory/summary', '/api/api/territory/summary'], (req, res) => {
  try {
    const summary = getTerritorySummary();
    res.json({
      success: true,
      totalStates: summary.length,
      totalDistricts: summary.reduce((acc, s) => acc + s.districtCount, 0),
      totalMandals: 5920,
      totalVillages: 619290,
      states: summary
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve territory summary' });
  }
});

app.get(['/api/territory/search', '/api/sessions/territory/search', '/api/api/territory/search'], (req, res) => {
  try {
    const q = req.query.q || '';
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const results = searchTerritory(q, limit);
    res.json({
      success: true,
      query: q,
      count: results.length,
      results
    });
  } catch (err) {
    res.status(500).json({ error: 'Territory search failed' });
  }
});

app.get(['/api/export/sample-excel', '/api/sessions/export/sample-excel', '/api/api/export/sample-excel'], async (req, res) => {
  try {
    const category = req.query.category || 'Dental Clinics';
    const city = req.query.city || 'Guntur';
    const { buildGodLevelExcelBuffer } = require('./src/utils/godLevelExcelGenerator');

    const sampleLeads = [
      {
        name: 'Kalyani Multispeciality Dental Clinic',
        owner: 'Dr. K. Srinivas Rao, MDS (Managing Director)',
        phone: '+91 76750 71081',
        secondaryPhone: '+91 98480 23145',
        email: 'contact@kalyanidental.com',
        address: '4th Line, Brodipet, Guntur - 522002',
        rating: 4.9,
        reviewsCount: 420,
        socialProfile: 'https://instagram.com/kalyanidental',
        waMessage: 'Hello Dr. Srinivas Rao, reaching out from Scraper.co.in regarding premium dental implants distribution in Guntur.'
      },
      {
        name: 'Happy Dental Hospital & Implant Centre',
        owner: 'Dr. P. Venkat Reddy (Chief Implantologist)',
        phone: '+91 80084 91391',
        secondaryPhone: '',
        email: 'info@happydental.in',
        address: 'Main Road, Arundelpet, Guntur - 522002',
        rating: 4.8,
        reviewsCount: 315,
        socialProfile: '',
        waMessage: 'Hi Dr. Venkat Reddy, connecting regarding dental digital imaging solutions and patient appointment CRM.'
      },
      {
        name: 'Siri Super Speciality Dental Hospital',
        owner: 'Dr. M. Chaitanya Kumar (Oral Surgeon)',
        phone: '+91 70363 51100',
        secondaryPhone: '+91 94401 55678',
        email: 'support@siridental.com',
        address: 'Opp. Hindu College, Guntur - 522003',
        rating: 4.8,
        reviewsCount: 260,
        socialProfile: 'https://facebook.com/siridental',
        waMessage: 'Hello Dr. Chaitanya, contacting you regarding specialized surgical tools and autoclave sterilization supplies.'
      },
      {
        name: 'Guntur Dental Care & Laser Centre',
        owner: 'Dr. Anusha Reddy (Owner & Cosmetologist)',
        phone: '+91 99890 12344',
        secondaryPhone: '',
        email: 'care@gunturdental.com',
        address: 'Lakshmipuram Main Road, Guntur - 522007',
        rating: 4.7,
        reviewsCount: 185,
        socialProfile: '',
        waMessage: 'Hello Dr. Anusha, reaching out regarding painless laser dentistry consumables and patient outreach.'
      },
      {
        name: 'Venkateswara Dental Orthodontic Clinic',
        owner: 'Dr. B. Prasad Rao (Consultant Orthodontist)',
        phone: '+91 98495 67890',
        secondaryPhone: '',
        email: '',
        address: 'Old Club Road, Kothapet, Guntur - 522001',
        rating: 4.8,
        reviewsCount: 220,
        socialProfile: '',
        waMessage: 'Namaste Dr. Prasad Rao, connecting regarding invisible aligners and orthodontic bracket wholesale pricing.'
      }
    ];

    const buffer = await buildGodLevelExcelBuffer(sampleLeads, { city, category });
    const cleanFilename = `God_Level_${category.replace(/[^a-zA-Z0-9]/g, '_')}_${city.replace(/[^a-zA-Z0-9]/g, '_')}_Leads.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Sample excel generation error:', err);
    res.status(500).json({ error: 'Failed to generate sample Excel' });
  }
});

// Robustness Fallback Aliases (in case frontend calls ${API_URL}/api/*)
// The scrape alias must carry the exact same gates as the canonical mount;
// otherwise /api/api/scrape would bypass the licence and client checks.
app.use('/api/api/locations', locationsRoutes);
app.use('/api/api/deep-profile', deepProfileRoutes);
app.use('/api/api/location', locationsRoutes);
app.use('/api/api/vendors', vendorsRoutes);
app.use('/api/api/scrape', createLicenseGate(), clientGate(), scrapeRouter);
app.use('/api/api/sessions', sessionRoutes);

// Static PDF Downloads
app.use('/downloads', express.static(paths.DOWNLOADS_DIR, { index: false, dotfiles: 'deny', fallthrough: true }));

// Ultra-fast lightweight health heartbeat consumed by Client & Master frontends (<1ms)
app.get('/api/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.json({
    ok: true,
    status: 'live',
    timestamp: Date.now(),
    uptime: Math.round(process.uptime()),
    pid: process.pid,
    store: vendorStore.ownership(),
    streams: liveStreams.health()
  });
});

// Runtime descriptor consumed by the desktop shell and the SPA.
app.get('/api/app/info', (req, res) => {
  res.json({
    engine: 'leadharvest',
    version: process.env.APP_VERSION || require('./package.json').version,
    desktop: paths.isDesktop,
    dataDir: paths.DATA_DIR,
    node: process.version,
    platform: process.platform,
    uptime: Math.round(process.uptime()),
    credits: credits.status()
  });
});

// Credit balance for the cockpit badge and the upgrade screen.
app.get('/api/credits', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(credits.status());
});

app.get('/api/license/status', (req, res) => {
  const file = process.env.LICENSE_FILE;
  if (!file) return res.json({ enforced: false, status: 'unmanaged', credits: credits.status() });
  const { verifyToken } = require('./src/middleware/licenseGate');
  let token = '';
  try {
    const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    token = parsed.token || parsed.license || '';
  } catch (e) {
    return res.json({ enforced: true, status: 'missing', credits: credits.status() });
  }
  const key = process.env.LICENSE_PUBLIC_KEY;
  if (!key) return res.json({ enforced: false, status: 'unmanaged', credits: credits.status() });
  const pem = String(key).includes('BEGIN PUBLIC KEY')
    ? String(key).replace(/\\n/g, '\n')
    : `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
  const result = verifyToken(token, pem);

  // Keep the plan allowance in sync with the signed token on every poll.
  credits.applyPlan(
    result.valid
      ? {
          plan: result.payload?.plan,
          allowance: Number(result.payload?.credits) || 0,
          endsAt: Number(result.payload?.periodEndsAt) || 0
        }
      : null
  );

  res.json({
    enforced: true,
    status: result.valid ? result.reason : result.reason,
    plan: result.payload?.plan || null,
    expiresAt: result.payload?.expiresAt ? new Date(result.payload.expiresAt).toISOString() : null,
    credits: credits.status()
  });
});

// Log Streaming Route (supports both /logs/stream and /api/logs/stream).
// Lifecycle, heartbeats and the connection cap are owned by liveStreams so a
// stale socket can never permanently lock a dashboard out of the feed.
const handleLogStream = (req, res) => {
  try {
    liveStreams.attachLog(req, res, systemLogs);
  } catch (err) {
    console.error('[SSE] log stream attach failed:', err.message);
    try { res.end(); } catch (e) { /* already closed */ }
  }
};

app.get('/api/logs/stream', handleLogStream);
app.get('/logs/stream', handleLogStream);
app.get('/api/events', handleLogStream);
app.get('/events', handleLogStream);

// Dedicated per-session vendor stream. The global log stream broadcasts every
// lead to every workspace; this one sends only the leads that belong to the
// requested session, which is what a run screen actually needs.
app.get('/api/scrape/stream/:sessionId', (req, res) => {
  const sessionId = String(req.params.sessionId || '').trim();
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  try {
    liveStreams.attachSession(req, res, sessionId);
  } catch (err) {
    console.error('[SSE] session stream attach failed:', err.message);
    try { res.end(); } catch (e) { /* already closed */ }
  }
});

// ---------------------------------------------------------------------------
// Single-origin SPA hosting.
//
// In the packaged desktop build the React bundle is served by this same
// Express process. That keeps /api, /logs/stream and client-side routes on one
// origin, so there is no CORS layer, no file:// restrictions and no need to
// duplicate the API base URL.
// ---------------------------------------------------------------------------
const clientIndex = path.join(paths.CLIENT_DIST, 'index.html');
if (fs.existsSync(clientIndex)) {
  app.use(express.static(paths.CLIENT_DIST, {
    index: false,
    maxAge: '7d',
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store');
      }
    }
  }));

  app.get(/^\/(?!api\/|api$|logs\/|downloads\/).*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(clientIndex);
  });
}

// Fallback error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    console.warn('[BodyParser] Payload too large (413):', err.message);
    return res.status(413).json({ error: 'Payload too large', message: err.message });
  }
  if (err.type === 'entity.parse.failed' || (err.status && err.status < 500)) {
    return res.status(err.status || 400).json({ error: 'invalid_request', message: err.message });
  }
  console.error('[Server Error]', err.stack || err.message);
  try {
    const crashFile = path.join(paths.DATA_DIR, 'error_crash.log');
    fs.appendFileSync(crashFile, `${new Date().toISOString()} ${err.stack || err.message}\n`);
    // Keep the crash log small enough to stay readable after months of use.
    try {
      if (fs.statSync(crashFile).size > 1_000_000) {
        const tail = fs.readFileSync(crashFile, 'utf8').slice(-400_000);
        fs.writeFileSync(crashFile, tail);
      }
    } catch (e) { /* ignore */ }
  } catch (e) {}
  if (!res.headersSent) {
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  }
});

// The desktop shell passes PORT=0 (ephemeral) or an explicit free port.
// Server deployments keep the historical 5002 default.
const rawPort = process.env.PORT;
const PORT = rawPort === undefined || rawPort === '' ? 5002 : Number(rawPort);
const HOST = process.env.SCRAPER_HOST || (paths.isDesktop ? '127.0.0.1' : '0.0.0.0');

const httpServer = app.listen(PORT, HOST, () => {
  const addr = httpServer.address();
  const actualPort = addr && typeof addr === 'object' ? addr.port : PORT;
  // The Electron launcher reads this exact line to learn the port.
  console.log(`[ready] ${JSON.stringify({ port: actualPort, host: HOST, desktop: paths.isDesktop })}`);
  console.log(`🚀 LeadHarvest Pro Intelligence Engine running on port ${actualPort}`);
  // Warm the suggestion + geo indexes just after boot so the first keystroke
  // never waits for a cold 619k-village scan.
  setTimeout(() => {
    try {
      const ms = require('./src/services/searchSuggest').warmSuggestions();
      console.log(`[warmup] suggestions ready in ${ms}ms`);
    } catch (error) {
      console.warn('[warmup] suggestion warmup skipped:', error.message);
    }
  }, 350);
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('[Server] Port temporarily in use.');
    setTimeout(() => {
      try {
        httpServer.close();
        httpServer.listen(PORT, HOST);
      } catch (e) {
        process.exit(1);
      }
    }, 1200);
    return;
  }
  console.error('[Server] Failed to bind:', err.message);
  process.exit(1);
});

// Timeouts and a bounded parser. This keeps a stuck client from holding a
// socket forever and prevents slowloris-style local exhaustion.
security.hardenHttpServer(httpServer);
