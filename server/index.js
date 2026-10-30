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

// Global Exception Handlers to prevent Playwright crashes
process.on('uncaughtException', (err) => {
  console.error('[Global] Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Global] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Configs
const localDb = require('./src/config/localDb');
const paths = require('./src/config/paths');
const credits = require('./src/services/credits');
const { createLicenseGate } = require('./src/middleware/licenseGate');
const clientGate = require('./src/middleware/clientGate');
const masterRoutes = require('./src/routes/master');
const notificationRoutes = require('./src/routes/notifications');

paths.ensureAll();
credits.init();

// Routes
const authRoutes = require('./src/routes/auth');
const { apiRouter, setLogGetter } = require('./src/routes/api');
const { scrapeRouter, setDeps } = require('./src/routes/scrape');
const vendorsRoutes = require('./src/routes/vendors');
const employeesRoutes = require('./src/routes/employees');
const uploadRoutes = require('./src/routes/upload');
const publicUsersRoutes = require('./src/routes/publicUsers');
const locationsRoutes = require('./src/routes/locations');
const automationsRoutes = require('./src/routes/automations');
const sessionRoutes = require('./src/routes/sessionRoutes');
const crmRoutes = require('./src/routes/crm');
const deepProfileRoutes = require('./src/routes/deepProfile');
const searchRoutes = require('./src/routes/search');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// System Logging State & SSE
let systemLogs = [];
let sseClients = [];

function sendSse(msg) {
  const safe = msg.replace(/\n/g, '\\n');
  sseClients.forEach(res => {
    try { res.write(`data: ${safe}\n\n`); } catch (e) {}
  });
}

function addLog(msg) {
  console.log(msg);
  systemLogs.push(msg);
  if (systemLogs.length > 50) systemLogs.shift();
  sendSse(msg);
}

function emitVendorEvent(vendorObj, action = 'inserted') {
  try {
    const payload = { action, vendor: vendorObj };
    const safe = JSON.stringify(payload).replace(/\n/g, '\\n');
    sseClients.forEach(res => {
      try { res.write('event: vendor\n'); res.write(`data: ${safe}\n\n`); } catch (e) {}
    });

    // Website enrichment belongs to the post-scrape deep phase, not to the
    // discovery hot path. Queueing a Playwright crawl for every inserted
    // business saturated the browser pool, delayed Google/JustDial results and
    // once created a self-reinforcing crawl loop. The orchestrator now starts a
    // resumable deep job after the scrape, and its profile events stream live.
  } catch (e) { console.error('Failed to emit vendor SSE', e.message); }
}

function emitGridEvent(gridCoords) {
  try {
    const safe = JSON.stringify(gridCoords).replace(/\n/g, '\\n');
    sseClients.forEach(res => {
      try { res.write('event: grid_points\n'); res.write(`data: ${safe}\n\n`); } catch (e) {}
    });
  } catch (e) { console.error('Failed to emit grid SSE', e.message); }
}

function emitInterventionEvent(platformName, isActive) {
  try {
    const payload = { platform: platformName, active: isActive };
    const safe = JSON.stringify(payload).replace(/\n/g, '\\n');
    sseClients.forEach(res => {
      try { res.write('event: intervention\n'); res.write(`data: ${safe}\n\n`); } catch (e) {}
    });
  } catch (e) { console.error('Failed to emit intervention SSE', e.message); }
}

function emitDispatchEvent(targets) {
  try {
    const safe = JSON.stringify(targets).replace(/\n/g, '\\n');
    sseClients.forEach(res => {
      try { res.write('event: dispatch_targets\n'); res.write(`data: ${safe}\n\n`); } catch (e) {}
    });
  } catch (e) { console.error('Failed to emit dispatch_targets SSE', e.message); }
}

function emitActivePointEvent(pointInfo) {
  try {
    const safe = JSON.stringify(pointInfo).replace(/\n/g, '\\n');
    sseClients.forEach(res => {
      try { res.write('event: active_point\n'); res.write(`data: ${safe}\n\n`); } catch (e) {}
    });
  } catch (e) { console.error('Failed to emit active_point SSE', e.message); }
}

function emitProgressEvent(progressInfo) {
  try {
    const safe = JSON.stringify(progressInfo).replace(/\n/g, '\\n');
    sseClients.forEach(res => {
      try { res.write('event: progress\n'); res.write(`data: ${safe}\n\n`); } catch (e) {}
    });
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
app.use('/api', apiRouter);
app.use('/api/scrape', createLicenseGate(), clientGate(), scrapeRouter);
app.use('/api/master', masterRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/public', publicUsersRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/location', locationsRoutes);
app.use('/api/automations', automationsRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/deep-profile', deepProfileRoutes);
app.use('/api/search', searchRoutes);

// Robustness Fallback Aliases (in case frontend calls ${API_URL}/api/*)
app.use('/api/api/locations', locationsRoutes);
app.use('/api/api/deep-profile', deepProfileRoutes);
app.use('/api/api/location', locationsRoutes);
app.use('/api/api/crm', crmRoutes);
app.use('/api/api/vendors', vendorsRoutes);
app.use('/api/api/scrape', scrapeRouter);
app.use('/api/api/sessions', sessionRoutes);

// Static PDF Downloads
app.use('/downloads', express.static(paths.DOWNLOADS_DIR));

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

// Log Streaming Route (supports both /logs/stream and /api/logs/stream)
const handleLogStream = (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  res.write('event: init\n');
  res.write(`data: ${JSON.stringify(systemLogs).replace(/\n/g, '\\n')}\n\n`);

  sseClients.push(res);

  // Periodic heartbeat every 15s to keep Vite proxy & browser EventSource active
  const heartbeat = setInterval(() => {
    try {
      res.write(':ping\n\n');
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter(r => r !== res);
  });
};

app.get('/api/logs/stream', handleLogStream);
app.get('/logs/stream', handleLogStream);

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
  console.error('[Server Error]', err.stack || err.message);
  try {
    fs.appendFileSync('error_crash.log', (err.stack || err.message) + '\n');
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
});

httpServer.on('error', (err) => {
  console.error('[Server] Failed to bind:', err.message);
  process.exit(1);
});
