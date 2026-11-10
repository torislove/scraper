/**
 * etaModel.js
 *
 * One honest ETA model for the whole engine.
 *
 * Every previous estimate was a constant invented per call site:
 *   • master-sweep preview  → zones × 3 seconds
 *   • orchestrator start    → zones × 6 seconds
 *   • scrape safety window  → zones × 12 seconds
 * Those numbers disagreed with each other and with reality. On the measured
 * Tenali fast run (28 named zones, 5 browser slots) the scrape phase took
 * ~35 s, i.e. ~1.3 s of wall clock per zone, or ~6.5 browser-seconds of work
 * per zone once concurrency is accounted for.
 *
 * The model is therefore the only defensible formula:
 *
 *     remaining_wall_ms = remaining_zones × seconds_per_zone ÷ live_slots
 *
 * `seconds_per_zone` is browser service time, not wall clock. `live_slots` is
 * read from the shared browser budget at call time, so a machine running with
 * 2 slots (kill switch / low RAM) gets an ETA that is ~2.5× longer instead of
 * a number that silently assumes 5.
 *
 * This is still an estimate: Google latency, category density and dedupe all
 * move the real number. It is never used to cut a run short — the safety
 * window is a multiple of it.
 */

// Measured browser-seconds of work per zone (Tenali fast, 28 zones, 5 slots,
// 41.7–47.0 s end to end). Kept as one constant so every surface agrees.
const MAPS_SECONDS_PER_ZONE = 6;
// The SERP local-finder path skips the Maps feed and finishes faster.
const LOCAL_FINDER_SECONDS_PER_ZONE = 5.2;

function normaliseEngineList(engines) {
  if (!engines) return [];
  if (Array.isArray(engines)) return engines.map(e => String(e).toLowerCase());
  return [String(engines).toLowerCase()];
}

/**
 * Pick the per-zone budget for the engines a run actually queued.
 * Maps is the dominant browser path; fall back to it when unknown.
 */
function secondsPerZoneFor(engines) {
  const list = normaliseEngineList(engines);
  if (!list.length) return MAPS_SECONDS_PER_ZONE;
  const hasMaps = list.some(e => e.includes('maps') || e.includes('places'));
  if (hasMaps) return MAPS_SECONDS_PER_ZONE;
  const hasLocalFinder = list.some(e => e.includes('local') || e.includes('serp'));
  if (hasLocalFinder) return LOCAL_FINDER_SECONDS_PER_ZONE;
  return MAPS_SECONDS_PER_ZONE;
}

/**
 * Wall-clock milliseconds for the remaining zones.
 *
 * @param {number} remainingZones  zones not yet completed
 * @param {number} liveSlots       browser discovery slots currently allowed
 * @param {number} secondsPerZone  browser service time per zone
 */
function modelEtaMs(remainingZones, liveSlots, secondsPerZone = MAPS_SECONDS_PER_ZONE) {
  const zones = Math.max(0, Number(remainingZones) || 0);
  const slots = Math.max(1, Number(liveSlots) || 1);
  const perZone = Math.max(1, Number(secondsPerZone) || MAPS_SECONDS_PER_ZONE);
  return Math.round((zones * perZone * 1000) / slots);
}

/**
 * How many browser slots the queue will actually give discovery right now.
 * Kept defensive so the estimator can be called before the queue boots.
 */
function liveBrowserSlots(queueMetrics) {
  try {
    const budget = queueMetrics?.browserBudget;
    const fromBudget = Number(budget?.discoveryLimit);
    if (Number.isFinite(fromBudget) && fromBudget > 0) return fromBudget;
    const total = Number(budget?.totalSlots);
    if (Number.isFinite(total) && total > 0) return total;
    const maxWorkers = Number(queueMetrics?.maxWorkers);
    if (Number.isFinite(maxWorkers) && maxWorkers > 0) return maxWorkers;
  } catch (e) {}
  return 5;
}

/**
 * A generous safety window for the scrape loop. It is deliberately a large
 * multiple of the model: it exists to stop a wedged run, never to trim a
 * healthy one. Still tighter than the old zones × 12 s.
 */
function safetyWindowMs(totalZones, liveSlots, secondsPerZone = MAPS_SECONDS_PER_ZONE) {
  const model = modelEtaMs(totalZones, liveSlots, secondsPerZone);
  return Math.max(120000, model * 4 + 60000);
}

module.exports = {
  MAPS_SECONDS_PER_ZONE,
  LOCAL_FINDER_SECONDS_PER_ZONE,
  secondsPerZoneFor,
  modelEtaMs,
  liveBrowserSlots,
  safetyWindowMs
};
