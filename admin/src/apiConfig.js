const PRODUCTION_API_URL = 'https://gomandap-api.onrender.com/api/scraper-app';

// In dev mode, use the Vite dev server proxy (relative /api) so CORS is bypassed.
// In production, use the full absolute URL.
const isDev = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

export const BACKEND_URL = isDev ? 'http://localhost:5002' : 'https://gomandap-api.onrender.com';
export const API_URL = import.meta.env.VITE_API_URL || (isDev ? '/api' : PRODUCTION_API_URL);
