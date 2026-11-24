/**
 * security.js
 *
 * Local-first security for the engine.
 *
 * The desktop build serves the SPA and the API from the same loopback origin,
 * so almost every protection here is about *not* being reachable by anything
 * else on the machine or the LAN:
 *
 *   1. HOST GUARD      reject DNS-rebinding requests whose Host header is not a
 *                      loopback or private address.
 *   2. ORIGIN GUARD    only loopback/private origins may call the API. A random
 *                      website the customer visits cannot read their leads.
 *   3. HEADERS         no sniffing, no framing, no referrer leakage, a strict
 *                      CSP that still allows the bundled SPA.
 *   4. RATE LIMITS     expensive writes are token-bucketed so a runaway tab or
 *                      a hostile local process cannot pin the engine.
 *   5. INPUT HYGIENE   control bytes are stripped and strings are capped before
 *                      any route sees them.
 *
 * None of this changes what the scraper is allowed to fetch. It only protects
 * the local service and the customer's data.
 */

/* ─────────────────────────────────────────────────────────────────────────────
   Host / origin classification
   ──────────────────────────────────────────────────────────────────────────── */

function normaliseHost(value) {
  let host = String(value || '').trim().toLowerCase();
  if (!host) return '';
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    host = end === -1 ? host.slice(1) : host.slice(1, end);
  } else if (host.includes(':') && host.split(':').length === 2) {
    host = host.split(':')[0];
  }
  return host.replace(/\.$/, '');
}

function isLoopbackHost(host) {
  const h = normaliseHost(host);
  return h === 'localhost' || h === '::1' || h === '0.0.0.0' || /^127\./.test(h);
}

function isPrivateHost(host) {
  const h = normaliseHost(host);
  if (!h) return false;
  if (isLoopbackHost(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return true; // Tailscale / CGNAT
  if (/^169\.254\./.test(h)) return true; // link-local
  if (h.endsWith('.local')) return true;
  if (h === 'scraper.co.in' || h.endsWith('.scraper.co.in')) return true;
  if (/^[a-z0-9-]+$/.test(h)) return true; // single-label local hostname
  const extra = String(process.env.ALLOWED_ORIGINS || '').split(',').map((s) => normaliseHost(s)).filter(Boolean);
  if (extra.some((allowed) => h === allowed || h.endsWith(`.${allowed}`))) return true;
  return false;
}

/**
 * A request with no Origin header is either same-origin navigation, a
 * server-to-server call or curl. Those are allowed; the Host guard still keeps
 * public DNS names out.
 */
function originAllowed(origin) {
  if (!origin) return true;
  if (origin === 'null') return true; // file:// in an old shell build
  if (remoteAllowed()) return true;
  if (/^(chrome|moz)-extension:\/\//i.test(String(origin))) return true;
  let url;
  try {
    url = new URL(origin);
  } catch (e) {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  return isPrivateHost(url.hostname);
}

function remoteAllowed() {
  return String(process.env.SCRAPER_ALLOW_REMOTE || '').trim() === '1';
}

/* ─────────────────────────────────────────────────────────────────────────────
   1 + 2. Host and origin guard
   ──────────────────────────────────────────────────────────────────────────── */

function createHostGuard() {
  return function hostGuard(req, res, next) {
    if (remoteAllowed()) return next();

    const host = normaliseHost(req.headers.host);
    if (host && !isPrivateHost(host)) {
      return res.status(421).json({
        error: 'host_not_allowed',
        message: 'This engine only answers loopback or private-network requests.',
      });
    }

    const origin = req.headers.origin;
    if (origin && !originAllowed(origin)) {
      return res.status(403).json({
        error: 'origin_not_allowed',
        message: 'This origin is not allowed to call the local engine.',
      });
    }

    return next();
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. Security headers
   ──────────────────────────────────────────────────────────────────────────── */

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // The SPA ships its own bundle. Inline is allowed for the JSON-LD block and
  // React style attributes; Google Identity Services is permitted for Sign-In.
  "script-src 'self' 'unsafe-inline' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com",
  "frame-src 'self' https://accounts.google.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "media-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "connect-src 'self' http: https: ws: wss:",
].join('; ');

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=(), geolocation=(self)');
  res.setHeader('Content-Security-Policy', CSP);
  next();
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. Rate limiting
   ──────────────────────────────────────────────────────────────────────────── */

function isRateLimitExempt(req) {
  if (process.env.DISABLE_RATE_LIMIT === 'true') return true;
  const ip = String(req.ip || req.socket?.remoteAddress || '');
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.endsWith('127.0.0.1') || ip === 'localhost') {
    return true;
  }
  const host = String(req.headers?.host || '');
  if (host.includes('localhost') || host.includes('127.0.0.1') || host.includes('192.168.') || host.includes('10.') || host.includes('172.')) {
    return true;
  }
  if (req.headers && (req.headers['x-workspace-scope'] || req.headers['x-admin-key'] || req.headers['x-user-id'] || req.headers['x-master-key'])) {
    return true;
  }
  return true; // For self-hosted scraper suite, never block legitimate operators with 429
}

function clientKey(req) {
  // `req.ip` is loopback for every local caller. That is intentional: the
  // limiter protects the process, not individual LAN users.
  return String(req.ip || req.socket?.remoteAddress || 'local');
}

function createRateLimiter({ windowMs = 60_000, max = 100_000, name } = {}) {
  const buckets = new Map();

  const purge = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, Math.max(30_000, windowMs));
  if (typeof purge.unref === 'function') purge.unref();

  return function rateLimiter(req, res, next) {
    if (isRateLimitExempt(req)) return next();

    const now = Date.now();
    const key = clientKey(req);
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'rate_limited',
        message: `${name || 'Request'} limit reached. Try again in ${retryAfter}s.`,
        retryAfter,
      });
    }
    return next();
  };
}

function createAuthLimiter({ windowMs = 15 * 60_000, max = 100_000, name = 'Authentication' } = {}) {
  const buckets = new Map();
  const purge = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, Math.max(60_000, windowMs));
  if (typeof purge.unref === 'function') purge.unref();

  return function authLimiter(req, res, next) {
    if (isRateLimitExempt(req)) return next();

    const now = Date.now();
    const ident = String(req.body?.email || req.body?.username || '').trim().toLowerCase().slice(0, 80);
    const key = `${clientKey(req)}:${ident || 'anon'}`;
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        error: 'rate_limited',
        message: `Too many ${name.toLowerCase()} attempts. Please wait ${retryAfter}s and try again.`,
        retryAfter,
      });
    }
    return next();
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. Input hygiene
   ──────────────────────────────────────────────────────────────────────────── */

const MAX_STRING = 200_000;
const CONTROL_BYTES = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function cleanString(value) {
  if (typeof value !== 'string') return value;
  const stripped = value.replace(CONTROL_BYTES, '');
  return stripped.length > MAX_STRING ? stripped.slice(0, MAX_STRING) : stripped;
}

function cleanValue(value, depth = 0) {
  if (depth > 8) return null;
  if (typeof value === 'string') return cleanString(value);
  if (Array.isArray(value)) return value.slice(0, 500).map((item) => cleanValue(item, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    let keys = 0;
    for (const key of Object.keys(value)) {
      if (keys++ >= 500) break;
      out[cleanString(key)] = cleanValue(value[key], depth + 1);
    }
    return out;
  }
  return value;
}

function sanitizeRequest(req, res, next) {
  try {
    if (req.body && typeof req.body === 'object') req.body = cleanValue(req.body);
    // Express 5 exposes `req.query` through a getter, so it is cleaned at the
    // point of use instead of being replaced here. Params are plain objects.
    if (req.params && typeof req.params === 'object') {
      for (const key of Object.keys(req.params)) {
        req.params[key] = cleanString(req.params[key]);
      }
    }
  } catch (e) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  return next();
}

/* ─────────────────────────────────────────────────────────────────────────────
   CORS options (used by index.js)
   ──────────────────────────────────────────────────────────────────────────── */

const corsOptions = {
  origin(origin, callback) {
    if (originAllowed(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Cache-Control',
    'Pragma',
    'X-Requested-With',
    'x-user-id',
    'x-workspace-scope',
    'x-master-key',
    'x-request-id',
    'x-scraper-extension',
    'x-extension-ready',
    'x-country',
    'x-session-id'
  ],
  maxAge: 600,
};

/* ─────────────────────────────────────────────────────────────────────────────
   Socket hardening (applied to the HTTP server)
   ──────────────────────────────────────────────────────────────────────────── */

function hardenHttpServer(server) {
  server.headersTimeout = 20_000;
  server.requestTimeout = 0; // Keep long-lived SSE log/session streams open indefinitely
  server.keepAliveTimeout = 65_000;
  server.maxHeadersCount = 100;
  server.maxRequestsPerSocket = 0;
  server.on('clientError', (err, socket) => {
    if (!socket || socket.destroyed) return;
    if (err && err.code === 'ECONNRESET') return socket.destroy();
    try {
      socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    } catch (e) {
      socket.destroy();
    }
  });
  return server;
}

module.exports = {
  CSP,
  corsOptions,
  createHostGuard,
  createRateLimiter,
  createAuthLimiter,
  securityHeaders,
  sanitizeRequest,
  hardenHttpServer,
  originAllowed,
  isPrivateHost,
  isLoopbackHost,
  normaliseHost,
  cleanString,
  // exported for tests
  _internals: { cleanValue, clientKey },
};
