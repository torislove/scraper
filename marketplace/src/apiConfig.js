const PRODUCTION_API_URL = 'https://gomandap-api.onrender.com/api/scraper-app';

const isLocalEnv =
  typeof window !== 'undefined' &&
  (
    ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname) ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.')
  );

// Dynamically use the same hostname the user is accessing from, but on the backend port 5002
const LOCAL_API_URL = typeof window !== 'undefined' 
  ? `http://${window.location.hostname}:5002/api`
  : 'http://localhost:5002/api';

export const API_URL = import.meta.env.VITE_API_URL || (isLocalEnv ? LOCAL_API_URL : PRODUCTION_API_URL);
