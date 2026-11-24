/**
 * browserDetect.js — Intelligent Cross-Browser User-Agent Detector & Store Link Resolver
 * ======================================================================================
 * Automatically detects the visitor's browser with strict order-of-precedence:
 *   1. Microsoft Edge (Edg/) MUST be checked before Chrome because Edge includes 'Chrome'.
 *   2. Mozilla Firefox (Firefox/)
 *   3. Opera (OPR/) & Brave
 *   4. Google Chrome / Chromium / Arc / Vivaldi
 *
 * Dynamically resolves to the matching official store URL or local 1-click fallback.
 * ======================================================================================
 */

export const OFFICIAL_EDGE_STORE_URL = 'https://microsoftedge.microsoft.com/addons/detail/gcmknikiliglejekhghkdplkjgkjjkdm';

export const EXTENSION_STORE_URLS = {
  chrome: String(import.meta.env.VITE_EXTENSION_STORE_URL_CHROME || import.meta.env.VITE_EXTENSION_STORE_URL || '').trim(),
  edge: String(import.meta.env.VITE_EXTENSION_STORE_URL_EDGE || OFFICIAL_EDGE_STORE_URL).trim(),
  firefox: String(import.meta.env.VITE_EXTENSION_STORE_URL_FIREFOX || '').trim(),
  downloadZip: '/api/scrape/extension-download'
};

export function detectUserBrowser() {
  if (typeof navigator === 'undefined') {
    return {
      name: 'Google Chrome',
      slug: 'chrome',
      storeName: 'Chrome Web Store',
      storeUrl: EXTENSION_STORE_URLS.chrome,
      hasDirectStore: Boolean(EXTENSION_STORE_URLS.chrome),
      isFreeStore: false,
      instructionsUrl: 'chrome://extensions',
      badge: 'Chrome'
    };
  }

  const ua = navigator.userAgent;

  // 1. Check Microsoft Edge FIRST (Edge UA contains 'Chrome')
  if (ua.includes('Edg/')) {
    const storeUrl = EXTENSION_STORE_URLS.edge || EXTENSION_STORE_URLS.chrome;
    return {
      name: 'Microsoft Edge',
      slug: 'edge',
      storeName: 'Microsoft Edge Add-ons',
      storeUrl,
      hasDirectStore: Boolean(storeUrl),
      isFreeStore: true,
      instructionsUrl: 'edge://extensions',
      badge: 'Edge'
    };
  }

  // 2. Check Mozilla Firefox
  if (ua.includes('Firefox/')) {
    const storeUrl = EXTENSION_STORE_URLS.firefox;
    return {
      name: 'Mozilla Firefox',
      slug: 'firefox',
      storeName: 'Firefox Add-ons (AMO)',
      storeUrl,
      hasDirectStore: Boolean(storeUrl),
      isFreeStore: true,
      instructionsUrl: 'about:addons',
      badge: 'Firefox'
    };
  }

  // 3. Check Opera
  if (ua.includes('OPR/') || ua.includes('Opera/')) {
    const storeUrl = EXTENSION_STORE_URLS.chrome;
    return {
      name: 'Opera',
      slug: 'opera',
      storeName: 'Chrome Web Store',
      storeUrl,
      hasDirectStore: Boolean(storeUrl),
      isFreeStore: true,
      instructionsUrl: 'opera://extensions',
      badge: 'Opera'
    };
  }

  // 4. Check Brave
  if (ua.includes('Brave') || (typeof navigator.brave !== 'undefined' && typeof navigator.brave.isBrave === 'function')) {
    const storeUrl = EXTENSION_STORE_URLS.chrome;
    return {
      name: 'Brave',
      slug: 'brave',
      storeName: 'Chrome Web Store',
      storeUrl,
      hasDirectStore: Boolean(storeUrl),
      isFreeStore: true,
      instructionsUrl: 'brave://extensions',
      badge: 'Brave'
    };
  }

  // 5. Google Chrome / Chromium / Arc / Vivaldi
  const storeUrl = EXTENSION_STORE_URLS.chrome;
  return {
    name: 'Google Chrome',
    slug: 'chrome',
    storeName: 'Chrome Web Store',
    storeUrl,
    hasDirectStore: Boolean(storeUrl),
    isFreeStore: false,
    instructionsUrl: 'chrome://extensions',
    badge: 'Chrome'
  };
}
