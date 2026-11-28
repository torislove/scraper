'use strict';

/**
 * engines/tlsSidecar/index.js
 * Node.js client for Python TLS Impersonation Sidecar (curl_cffi + primp).
 * Bypasses Cloudflare on Justdial, YellowPages, PagesJaunes, and Yell with ~15MB RAM.
 */

const TLS_URL = process.env.TLS_SIDECAR_URL || 'http://127.0.0.1:5003';

async function isTlsSidecarHealthy() {
  try {
    const res = await fetch(`${TLS_URL}/health`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      const data = await res.json();
      return data.status === 'ok';
    }
  } catch (_) {}
  return false;
}

async function scrapeJustdialTls({ category, city, onLead, log = console.log }) {
  try {
    const res = await fetch(`${TLS_URL}/scrape/justdial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, city }),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) return { success: false, leads: [] };
    const data = await res.json();
    const leads = data.leads || [];

    if (typeof onLead === 'function') {
      for (const lead of leads) {
        onLead(lead);
      }
    }
    return { success: true, count: leads.length, leads };
  } catch (err) {
    log(`[TLS Sidecar Justdial] Notice: ${err.message}`);
    return { success: false, error: err.message, leads: [] };
  }
}

async function scrapeYellowpagesTls({ category, city, state, country = 'US', onLead, log = console.log }) {
  try {
    const res = await fetch(`${TLS_URL}/scrape/yellowpages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, city, state, country }),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) return { success: false, leads: [] };
    const data = await res.json();
    const leads = data.leads || [];

    if (typeof onLead === 'function') {
      for (const lead of leads) {
        onLead(lead);
      }
    }
    return { success: true, count: leads.length, leads };
  } catch (err) {
    log(`[TLS Sidecar YellowPages] Notice: ${err.message}`);
    return { success: false, error: err.message, leads: [] };
  }
}

async function crawlWebsiteContactsTls(url, timeoutSec = 8) {
  try {
    const res = await fetch(`${TLS_URL}/crawl/website`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, timeout: timeoutSec }),
      signal: AbortSignal.timeout((timeoutSec + 2) * 1000)
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.contacts || null;
  } catch (_) {
    return null;
  }
}

async function scrapeDirectoryTls({ category, city, country = 'GB', maxPages = 2, onLead, log = () => {} }) {
  try {
    const res = await fetch(`${TLS_URL}/scrape/directory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, city, country, maxPages }),
      signal: AbortSignal.timeout(14000)
    });
    if (!res.ok) return { success: false, leads: [] };
    const data = await res.json();
    const leads = data.leads || [];
    if (typeof onLead === 'function') {
      for (const lead of leads) onLead(lead);
    }
    return { success: true, count: leads.length, leads };
  } catch (err) {
    log(`[TLS Directory ${country}] Notice: ${err.message}`);
    return { success: false, error: err.message, leads: [] };
  }
}

module.exports = {
  isTlsSidecarHealthy,
  scrapeJustdialTls,
  scrapeYellowpagesTls,
  scrapeDirectoryTls,
  crawlWebsiteContactsTls
};
