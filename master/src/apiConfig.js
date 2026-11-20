// Automatic environment resolution
const isLocalEnv = typeof window !== 'undefined' && (
  Boolean(import.meta.env?.DEV) ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.startsWith('10.') ||
  window.location.hostname.startsWith('172.') ||
  window.location.port === '5173' ||
  window.location.port === '5174' ||
  window.location.port === '5175'
);

// In the packaged desktop app the SPA is served by the engine itself, on a
// random loopback port. Same origin means relative URLs always resolve.
const sameOriginBackend =
  typeof window !== 'undefined' &&
  /^https?:$/.test(window.location.protocol) &&
  !import.meta.env?.DEV;

export const BACKEND_URL = sameOriginBackend
  ? window.location.origin
  : (isLocalEnv
      ? `http://${typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'}:5002`
      : 'http://127.0.0.1:5002');

// In local development and in desktop mode alike, relative '/api' is correct:
// Vite proxies it in dev, Express serves it in production.
export const API_URL = import.meta.env.VITE_API_URL || '/api';

// SSE EventSource connects directly to BACKEND_URL in Vite dev to prevent proxy buffering/drops.
export const SSE_STREAM_BASE = (
  isLocalEnv &&
  typeof window !== 'undefined' &&
  ['5173', '5174', '5175', '3000'].includes(String(window.location.port || ''))
)
  ? `${BACKEND_URL}/api`
  : API_URL;
