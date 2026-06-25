// ─────────────────────────────────────────────────────────────────────────────
// Proxy Fetch Utility (Frontend)
// All scraper engines use this to bypass CORS.
// The server's /api/proxy endpoint fetches the raw HTML with real browser headers.
// ─────────────────────────────────────────────────────────────────────────────

import { API_URL } from '../apiConfig';

const PROXY_BASE = `${API_URL}/proxy`;
const CACHE = new Map(); // in-memory cache, 60s TTL

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
];

/**
 * Fetches a URL through the server proxy to bypass CORS.
 * Has retry logic with exponential backoff.
 * Results cached for 60 seconds to prevent duplicate requests.
 */
export async function proxyFetch(url, retries = 3) {
  const cached = CACHE.get(url);
  if (cached && Date.now() - cached.ts < 60000) return cached.html;

  const proxyUrl = `${PROXY_BASE}?url=${encodeURIComponent(url)}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} from proxy for ${url}`);
      const html = await res.text();
      CACHE.set(url, { html, ts: Date.now() });
      return html;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, attempt * 1500)); // Exponential backoff
    }
  }
}

/**
 * Parses HTML string into a DOM document using native browser DOMParser.
 * This is free, instant, and doesn't require Cheerio.
 */
export function parseHTML(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

/**
 * Extracts phones and emails from any raw HTML/text string.
 * Ported from contactExtractor / intelligentExtractor.js.
 */
export function extractContactInfo(text) {
  const emails = [];
  const phones = [];
  if (!text) return { emails, phones };

  const emailMatches = text.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g) || [];
  emailMatches.forEach(e => {
    const lower = e.toLowerCase();
    if (!emails.includes(lower) && !lower.endsWith('.png') && !lower.endsWith('.jpg')) {
      emails.push(lower);
    }
  });

  // Strict Indian phone number regex: catches +91, 0, and bare 10-digit numbers starting with 6-9
  const phoneMatches = text.match(/(?:\+91|0)?[\s-]?[6-9]\d{9}/g) || [];
  phoneMatches.forEach(p => {
    const clean = p.replace(/\D/g, '');
    const normalized = clean.length === 12 ? clean.slice(2) : clean.length === 11 ? clean.slice(1) : clean;
    if (normalized.length === 10 && !phones.includes(normalized)) {
      phones.push(normalized);
    }
  });

  return { emails, phones };
}

/**
 * Calculates a quality score for a vendor lead.
 * Ported from calculateLeadScore in engine-google-places.js.
 */
export function calculateLeadScore(vendor) {
  let score = 0;
  if (vendor.phone) score += 30;
  if (vendor.address) score += 10;
  if (vendor.website) score += 20;
  if (vendor.rating && parseFloat(vendor.rating) > 4.2) score += 15;
  if (vendor.reviewsCount && parseInt(vendor.reviewsCount) > 50) score += 5;
  if (vendor.email) score += 10;
  return Math.min(score, 100);
}

export function determineTier(score) {
  if (score >= 80) return 'Premium';
  if (score >= 50) return 'Standard';
  return 'Basic';
}
