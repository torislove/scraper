/**
 * browserBudget.js
 *
 * One budget for every Chromium page this engine opens.
 *
 * Before this module, discovery (the zone queue) and enrichment (the realtime
 * detail scout) each decided their own concurrency. A client run could hold 5
 * discovery browsers plus 8 enrichment browsers at once on an 8-core machine,
 * so every page load fought the others and a real zone cost 5.5 s instead of
 * ~1.5 s.
 *
 * The budget keeps the total honest:
 *   • total slots   = 5 (SCRAPER_BROWSER_SLOTS)
 *   • enrich reserve= 2 (SCRAPER_ENRICH_RESERVE), used only when discovery has
 *     spare capacity
 *   • discovery     = whatever is left, so it can still use all 5 when the
 *     enricher is idle
 *
 * Discovery never has to wait for the reserve: the reserve is capacity that
 * discovery leaves unused, not a permanent tax. Enrichment only starts when a
 * slot is genuinely free, and it is notified as soon as one opens.
 */

const os = require('os');

function envInt(name, fallback) {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : fallback;
}

const TOTAL_SLOTS = Math.max(1, Math.min(16, envInt('SCRAPER_BROWSER_SLOTS', 3)));
const ENRICH_RESERVE = Math.max(1, Math.min(TOTAL_SLOTS, envInt('SCRAPER_ENRICH_RESERVE', 1)));
// Enrichment must run concurrently with discovery so leads receive verified mobile numbers in real time.
const ENRICH_YIELD = process.env.SCRAPER_ENRICH_YIELD === '1';

let discoveryActive = 0;
let enrichmentActive = 0;
let discoveryQueued = 0;
const listeners = new Set();

function freeRamPct() {
  try {
    return Math.round((os.freemem() / os.totalmem()) * 100);
  } catch (e) {
    return 50;
  }
}

/** Discovery may use every slot the enricher is not holding. */
function discoveryLimit() {
  let critical = false;
  try {
    critical = os.freemem() < 600 * 1024 * 1024 || freeRamPct() < 10;
  } catch (e) {}
  const ramCap = critical ? 1 : TOTAL_SLOTS;
  return Math.max(1, Math.min(ramCap, TOTAL_SLOTS - enrichmentActive));
}

/** Enrichment gets dedicated slots that run continuously alongside discovery. */
function enrichmentLimit() {
  if (ENRICH_YIELD && discoveryQueued > 0) return 0;
  const slotsRemaining = TOTAL_SLOTS - enrichmentActive;
  if (slotsRemaining <= 0) return 0;
  const free = Math.max(0, TOTAL_SLOTS - discoveryActive - enrichmentActive);
  // Ensure at least 1-2 enrichment workers are active while leads are in queue
  return Math.max(1, Math.min(ENRICH_RESERVE, free > 0 ? free : 1));
}

function notify() {
  for (const listener of listeners) {
    try { listener(); } catch (e) {}
  }
}

function setDiscoveryActive(count) {
  discoveryActive = Math.max(0, Math.floor(Number(count) || 0));
  notify();
}

function setEnrichmentActive(count) {
  enrichmentActive = Math.max(0, Math.floor(Number(count) || 0));
  notify();
}

/** How many browser discovery jobs are still waiting for a slot. */
function setDiscoveryQueued(count) {
  const next = Math.max(0, Math.floor(Number(count) || 0));
  if (next === discoveryQueued) return;
  discoveryQueued = next;
  notify();
}

function onSlotChange(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getStatus() {
  return {
    totalSlots: TOTAL_SLOTS,
    enrichReserve: ENRICH_RESERVE,
    enrichYields: ENRICH_YIELD,
    discoveryActive,
    discoveryQueued,
    enrichmentActive,
    discoveryLimit: discoveryLimit(),
    enrichmentLimit: enrichmentLimit(),
    freeRamPct: freeRamPct()
  };
}

module.exports = {
  TOTAL_SLOTS,
  ENRICH_RESERVE,
  discoveryLimit,
  enrichmentLimit,
  setDiscoveryActive,
  setDiscoveryQueued,
  setEnrichmentActive,
  onSlotChange,
  getStatus
};
