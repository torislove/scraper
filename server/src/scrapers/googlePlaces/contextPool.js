/**
 * contextPool.js
 * Reusable Chromium browser context pooling with memory containment and lifecycle management.
 */

const { applyAdvancedStealth, optimizePageForSpeed } = require('../browserFactory');

/**
 * Zone context pool.
 *
 * A fresh Chromium context per zone costs ~0.4–0.6 s warm and ~5.5 s when five
 * are created at once on a cold browser. Reusing a small pool also keeps the
 * Maps JS bundle in the HTTP cache, so the next zone's navigation is cheaper.
 * Contexts are recycled after a fixed number of zones so cookies, memory and
 * any accumulated state cannot grow without bound.
 */
const ZONE_CONTEXT_POOL_SIZE = Math.max(1, Math.min(8, Number(process.env.SCRAPER_CONTEXT_POOL) || 6));
const ZONE_CONTEXT_MAX_USES = Math.max(1, Number(process.env.SCRAPER_CONTEXT_USES) || 25);
const zoneContextPool = [];

function makeZoneContext(browser) {
  return browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  }).then(context => {
    const slot = { context, browser, uses: 0, dead: false };
    try {
      context.on('close', () => { slot.dead = true; });
    } catch (e) { }
    return slot;
  });
}

/**
 * Build the pool before the first wave.
 *
 * Creating five contexts at once on a cold browser costs ~5 s of wall time
 * (they contend for the same CPU). Creating them one after another costs a
 * fraction of that, and the first wave then starts with a warm pool. Called
 * by the orchestrator before it dispatches zones.
 */
async function warmZoneContextPool(browser, count = ZONE_CONTEXT_POOL_SIZE) {
  if (!browser) return 0;
  const started = Date.now();
  let made = 0;
  const target = Math.min(count, ZONE_CONTEXT_POOL_SIZE) - zoneContextPool.length;
  if (target <= 0) return 0;
  // Warm in small parallel batches of 3 to overlap cold Chromium context setup without CPU thrashing
  const batchSize = 3;
  for (let i = 0; i < target; i += batchSize) {
    const n = Math.min(batchSize, target - i);
    const settled = await Promise.allSettled(
      Array.from({ length: n }, () => makeZoneContext(browser))
    );
    for (const res of settled) {
      if (res.status === 'fulfilled' && res.value && zoneContextPool.length < ZONE_CONTEXT_POOL_SIZE) {
        zoneContextPool.push(res.value);
        made++;
      }
    }
  }
  if (process.env.SCRAPER_TRACE_ZONE === '1') {
    addLog(`[Zone Timing] pool warm · ${made} context(s) in ${Date.now() - started}ms`);
  }
  return made;
}

async function acquireZoneContext(browser) {
  while (zoneContextPool.length) {
    const slot = zoneContextPool.pop();
    const reusable = slot
      && slot.browser === browser
      && !slot.dead
      && slot.uses < ZONE_CONTEXT_MAX_USES;
    if (reusable) {
      slot.uses++;
      return slot;
    }
    try { await slot.context.close(); } catch (e) { }
  }

  const slot = await makeZoneContext(browser);
  slot.uses = 1;
  return slot;
}

async function releaseZoneContext(slot, { recycle = false } = {}) {
  if (!slot || !slot.context) return;
  const keep = !recycle
    && !slot.dead
    && slot.uses < ZONE_CONTEXT_MAX_USES
    && zoneContextPool.length < ZONE_CONTEXT_POOL_SIZE;
  if (keep) {
    zoneContextPool.push(slot);
    return;
  }
  try { await slot.context.close(); } catch (e) { }
}

async function closeZoneContextPool() {
  const slots = zoneContextPool.splice(0, zoneContextPool.length);
  for (const slot of slots) {
    try { await slot.context.close(); } catch (e) { }
  }
}

module.exports = {
  ZONE_CONTEXT_POOL_SIZE,
  ZONE_CONTEXT_MAX_USES,
  zoneContextPool,
  makeZoneContext,
  warmZoneContextPool,
  acquireZoneContext,
  releaseZoneContext,
  closeZoneContextPool
};
