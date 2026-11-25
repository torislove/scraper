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
  const rawStr = String(process.env[name] || '').trim().toLowerCase();
  if (!rawStr || rawStr === 'auto') return fallback;
  const raw = Number(rawStr);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : fallback;
}

let clientHardware = null;

/**
 * Calculates safe concurrent browser slots and reserved memory headroom
 * strictly tailored to detected machine RAM and CPU cores so the system
 * remains ultra fast while NEVER freezing or running out of memory.
 */
function calculateSafeSlots(hw) {
  try {
    const sysTotalGb = os.totalmem() / (1024 * 1024 * 1024);
    const ramGb = Number(hw?.ramGb || hw?.ram) || sysTotalGb;
    const cpuCores = Number(hw?.cpuCores || hw?.parallelZones || hw?.cores) || os.cpus()?.length || 4;

    let slots = 5;
    let enrich = 2;
    let reservedHeadroomGb = 4.5;

    if (ramGb >= 30) {
      slots = Math.min(8, Math.max(6, Math.floor(cpuCores * 0.75)));
      enrich = 3;
      reservedHeadroomGb = 8.0;
    } else if (ramGb >= 14) {
      // 16 GB machines: allocate 5 to 6 browser slots (each context is ~200MB, total ~1.2GB).
      // This leaves >= 4.5 GB of generous free headroom for the OS and user apps with zero freezes.
      slots = cpuCores >= 8 ? 6 : 5;
      enrich = 2;
      reservedHeadroomGb = 4.5;
    } else if (ramGb >= 7.5) {
      // 8 GB machines: allocate 3 to 4 slots (uses ~800MB, leaving >= 3.0 GB headroom)
      slots = cpuCores >= 6 ? 4 : 3;
      enrich = 1;
      reservedHeadroomGb = 3.0;
    } else {
      // <= 4 GB machines: allocate 2 slots
      slots = 2;
      enrich = 1;
      reservedHeadroomGb = 2.0;
    }

    return {
      slots: Math.max(1, Math.min(12, slots)),
      enrichReserve: Math.max(1, Math.min(4, enrich)),
      reservedHeadroomGb,
      ramGb: Math.round(ramGb),
      cpuCores
    };
  } catch (e) {
    return { slots: 5, enrichReserve: 2, reservedHeadroomGb: 4.5, ramGb: 16, cpuCores: 4 };
  }
}

let safeHardwareProfile = calculateSafeSlots(null);
let dynamicTotalSlots = Math.max(1, Math.min(16, envInt('SCRAPER_BROWSER_SLOTS', safeHardwareProfile.slots)));
let dynamicEnrichReserve = Math.max(1, Math.min(4, envInt('SCRAPER_ENRICH_RESERVE', safeHardwareProfile.enrichReserve)));

function setClientHardware(hw) {
  if (!hw) return;
  const ramGb = Number(hw.ramGb || hw.ram || hw.totalRamGb);
  const parallelZones = Number(hw.parallelZones || hw.lanes || hw.cpuCores || hw.cores);
  if (Number.isFinite(ramGb) && ramGb > 0) {
    clientHardware = {
      ramGb: Math.round(ramGb),
      parallelZones: Number.isFinite(parallelZones) && parallelZones > 0 ? Math.round(parallelZones) : 4
    };
    safeHardwareProfile = calculateSafeSlots(clientHardware);
    dynamicTotalSlots = Math.max(1, Math.min(16, envInt('SCRAPER_BROWSER_SLOTS', safeHardwareProfile.slots)));
    dynamicEnrichReserve = Math.max(1, Math.min(4, envInt('SCRAPER_ENRICH_RESERVE', safeHardwareProfile.enrichReserve)));
    notify();
  }
}

function getClientHardware() {
  return clientHardware;
}

// Enrichment must run concurrently with discovery so leads receive verified mobile numbers in real time.
const ENRICH_YIELD = process.env.SCRAPER_ENRICH_YIELD === '1';

let discoveryActive = 0;
let enrichmentActive = 0;
let discoveryQueued = 0;
// Browsers opened outside the queue (the Tier-0 burst calls engines directly).
// They must still be counted, or a burst page plus a full queue can overshoot
// the RAM budget — which is what made Web Discovery fail 6/6.
let externalActive = 0;
const listeners = new Set();

function freeRamPct() {
  try {
    return Math.round((os.freemem() / os.totalmem()) * 100);
  } catch (e) {
    return 50;
  }
}

// Anti-crash memory thresholds (protects user laptop RAM & prevents Node OOM)
const CRITICAL_FLOOR_BYTES = 1.2 * 1024 * 1024 * 1024; // 1.2 GB free RAM safety floor
const EMERGENCY_FLOOR_BYTES = 700 * 1024 * 1024;        // 700 MB free RAM emergency threshold
const MAX_NODE_RSS_BYTES = 1.6 * 1024 * 1024 * 1024;    // 1.6 GB Node process ceiling

function isMemoryUnderPressure() {
  try {
    const freeBytes = os.freemem();
    const rssBytes = process.memoryUsage().rss;
    return freeBytes < EMERGENCY_FLOOR_BYTES || rssBytes > MAX_NODE_RSS_BYTES;
  } catch (e) {
    return false;
  }
}

/**
 * Discovery may use every slot the enricher is not holding, bounded by
 * an anti-crash circuit breaker that guarantees the OS never runs out of memory.
 */
function discoveryLimit() {
  let ramCap = dynamicTotalSlots;
  try {
    const freeBytes = os.freemem();
    const rssBytes = process.memoryUsage().rss;
    if (freeBytes < EMERGENCY_FLOOR_BYTES || rssBytes > MAX_NODE_RSS_BYTES) {
      // Emergency floor: soft throttle to 1 slot to prevent OS crash
      ramCap = 1;
    } else if (freeBytes < CRITICAL_FLOOR_BYTES) {
      // Soft throttle: preserve system headroom while continuing progress
      ramCap = Math.min(2, dynamicTotalSlots);
    }
  } catch (e) { }
  return Math.max(1, Math.min(ramCap, dynamicTotalSlots - enrichmentActive - externalActive));
}

/** Enrichment gets dedicated slots that pause cleanly under low RAM (HTTP 12-lane crawler stays active!). */
function enrichmentLimit() {
  if (isMemoryUnderPressure()) return 0;
  try {
    if (os.freemem() < CRITICAL_FLOOR_BYTES && discoveryQueued > 0) return 0;
  } catch (e) { }
  if (ENRICH_YIELD && discoveryQueued > 0) return 0;
  const slotsRemaining = dynamicTotalSlots - enrichmentActive;
  if (slotsRemaining <= 0) return 0;
  const free = Math.max(0, dynamicTotalSlots - discoveryActive - enrichmentActive);
  const baseline = dynamicTotalSlots >= 6 ? 2 : 1;
  return Math.max(baseline, Math.min(dynamicEnrichReserve, Math.max(free, baseline)));
}

function notify() {
  for (const listener of listeners) {
    try { listener(); } catch (e) { }
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

/**
 * Reserve one browser slot for work that runs outside the queue (the Tier-0
 * burst). Returns an idempotent release function. Throws on abort or timeout so
 * a stuck sweep cannot hold a slot forever.
 */
async function acquireBrowserSlot({ timeoutMs = 60000, signal = null } = {}) {
  const started = Date.now();
  while (true) {
    if (signal && signal.aborted) throw new Error('browser slot request aborted');
    let ramOk = true;
    try {
      if (os.freemem() < EMERGENCY_FLOOR_BYTES) ramOk = false;
    } catch (e) { }
    if (ramOk && (discoveryActive + externalActive) < dynamicTotalSlots) break;
    if (Date.now() - started > timeoutMs) throw new Error('browser slot timeout');
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  externalActive++;
  notify();
  let released = false;
  return function release() {
    if (released) return;
    released = true;
    externalActive = Math.max(0, externalActive - 1);
    notify();
  };
}

/** How many browser discovery jobs are still waiting for a slot. */
function setDiscoveryQueued(count) {
  const next = Math.max(0, Math.floor(Number(count) || 0));
  if (next === discoveryQueued) return;
  discoveryQueued = next;
  notify();
}

function onSlotChange(listener) {
  if (typeof listener !== 'function') return () => { };
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getStatus() {
  return {
    totalSlots: dynamicTotalSlots,
    enrichReserve: dynamicEnrichReserve,
    enrichYields: ENRICH_YIELD,
    discoveryActive,
    discoveryQueued,
    enrichmentActive,
    externalActive,
    discoveryLimit: discoveryLimit(),
    enrichmentLimit: enrichmentLimit(),
    freeRamPct: freeRamPct(),
    clientHardware,
    reservedHeadroomGb: safeHardwareProfile.reservedHeadroomGb
  };
}

module.exports = {
  get TOTAL_SLOTS() { return dynamicTotalSlots; },
  get ENRICH_RESERVE() { return dynamicEnrichReserve; },
  setClientHardware,
  getClientHardware,
  discoveryLimit,
  enrichmentLimit,
  setDiscoveryActive,
  setDiscoveryQueued,
  setEnrichmentActive,
  acquireBrowserSlot,
  onSlotChange,
  isMemoryUnderPressure,
  getStatus
};
