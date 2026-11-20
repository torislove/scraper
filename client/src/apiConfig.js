// Automatic environment resolution across Vite dev, desktop shell, preview, and Nginx/Docker.
const isBrowser = typeof window !== 'undefined';
const host = isBrowser && window.location.hostname ? window.location.hostname : '127.0.0.1';
const port = isBrowser ? String(window.location.port || '') : '';
const protocol = isBrowser && window.location.protocol === 'https:' ? 'https:' : 'http:';
const isFile = isBrowser && window.location.protocol === 'file:';
const isViteDev = Boolean(import.meta.env?.DEV);
const envBackend = import.meta.env?.VITE_BACKEND_URL || '';
const envApi = import.meta.env?.VITE_API_URL || '';

const isLocalOrPrivateHost = (
  host === 'localhost' ||
  host === '127.0.0.1' ||
  /^127\./.test(host) ||
  /^192\.168\./.test(host) ||
  /^10\./.test(host) ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host) ||
  host.endsWith('.local') ||
  /^[a-z0-9-]+$/i.test(host)
);

const isDesktopShell = isBrowser && (Boolean(window.scraperDesktop) || import.meta.env?.VITE_DESKTOP === '1');

// Same-origin backend applies when served directly by Express (:5002 or desktop shell),
// via production Nginx (:80 / :443 / :8081 / :8082), or on a public domain.
const sameOriginBackend =
  isBrowser &&
  !isFile &&
  !isViteDev &&
  !envBackend &&
  (
    isDesktopShell ||
    port === '5002' ||
    !isLocalOrPrivateHost ||
    ['', '80', '443', '8081', '8082'].includes(port)
  );

export const DIRECT_BACKEND_URL = envBackend || (
  sameOriginBackend
    ? (isBrowser ? window.location.origin : 'http://127.0.0.1:5002')
    : (isBrowser && isLocalOrPrivateHost ? `${protocol}//${host}:5002` : 'http://127.0.0.1:5002')
);

export const BACKEND_URL = envBackend || (
  sameOriginBackend ? window.location.origin : DIRECT_BACKEND_URL
);

// Use relative '/api' when Vite proxy (dev) or same-origin Nginx/Express serves it;
// otherwise talk directly to BACKEND_URL/api (e.g. file:// or Vite preview).
export const API_URL = envApi || (
  isFile
    ? `${BACKEND_URL}/api`
    : (isViteDev || sameOriginBackend)
      ? '/api'
      : `${BACKEND_URL}/api`
);

// SSE EventSource connects directly to BACKEND_URL in Vite dev to prevent proxy buffering/drops.
export const SSE_STREAM_BASE = (
  isBrowser &&
  !sameOriginBackend &&
  ['5173', '5174', '5175', '3000', '4173', '4174'].includes(port)
)
  ? `${BACKEND_URL}/api`
  : API_URL;
