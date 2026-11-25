/**
 * contextPool.js
 * Reusable Chromium browser context + hot-tab pooling with adaptive hardware RAM containment.
 */

const { applyAdvancedStealth, optimizePageForSpeed } = require('../browserFactory');
const browserBudget = require('../../utils/browserBudget');

const ZONE_CONTEXT_MAX_USES = Math.max(1, Number(process.env.SCRAPER_CONTEXT_USES) || 20);
const zoneContextPool = [];

function getDynamicPoolSize() {
  const envCap = Number(process.env.SCRAPER_CONTEXT_POOL);
  const hwCap = Math.max(1, Math.min(8, Number(browserBudget.TOTAL_SLOTS) || 4));
  if (Number.isFinite(envCap) && envCap > 0) return Math.min(8, Math.max(1, envCap), hwCap);
  return hwCap;
}

async function prepareHotPage(slot) {
  if (slot.page && !slot.page.isClosed()) {
    return slot.page;
  }
  const page = await slot.context.newPage();
  page.setDefaultTimeout(8000);
  await applyAdvancedStealth(page);
  await optimizePageForSpeed(page);
  slot.page = page;
  return page;
}

function makeZoneContext(browser) {
  return browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  }).then(async (context) => {
    const slot = { context, page: null, browser, uses: 0, dead: false, consented: false };
    try {
      context.on('close', () => { slot.dead = true; });
      await prepareHotPage(slot);
    } catch (e) { }
    return slot;
  });
}

async function warmZoneContextPool(browser, count = getDynamicPoolSize()) {
  if (!browser || browserBudget.isMemoryUnderPressure()) return 0;
  const maxPool = getDynamicPoolSize();
  const target = Math.min(count, maxPool) - zoneContextPool.length;
  if (target <= 0) return 0;
  let made = 0;
  const batchSize = Math.min(3, target);
  for (let i = 0; i < target; i += batchSize) {
    if (browserBudget.isMemoryUnderPressure()) break;
    const n = Math.min(batchSize, target - i);
    const settled = await Promise.allSettled(
      Array.from({ length: n }, () => makeZoneContext(browser))
    );
    for (const res of settled) {
      if (res.status === 'fulfilled' && res.value && zoneContextPool.length < maxPool) {
        zoneContextPool.push(res.value);
        made++;
      } else if (res.status === 'fulfilled' && res.value?.context) {
        try { await res.value.context.close(); } catch (e) { }
      }
    }
  }
  return made;
}

async function acquireZoneContext(browser) {
  while (zoneContextPool.length) {
    const slot = zoneContextPool.pop();
    const reusable = slot
      && slot.browser === browser
      && !slot.dead
      && slot.uses < ZONE_CONTEXT_MAX_USES
      && !browserBudget.isMemoryUnderPressure();
    if (reusable) {
      slot.uses++;
      try {
        await prepareHotPage(slot);
        return slot;
      } catch (e) {
        try { await slot.context.close(); } catch (cErr) { }
      }
    } else if (slot?.context) {
      try { await slot.context.close(); } catch (e) { }
    }
  }

  const slot = await makeZoneContext(browser);
  await prepareHotPage(slot);
  slot.uses = 1;
  return slot;
}

async function releaseZoneContext(slot, { recycle = false } = {}) {
  if (!slot || !slot.context) return;
  const maxPool = getDynamicPoolSize();
  const keep = !recycle
    && !slot.dead
    && slot.uses < ZONE_CONTEXT_MAX_USES
    && zoneContextPool.length < maxPool
    && !browserBudget.isMemoryUnderPressure();
  if (keep) {
    try {
      if (slot.page && !slot.page.isClosed()) {
        await slot.page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 1500 }).catch(() => { });
      }
    } catch (e) { }
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
  get ZONE_CONTEXT_POOL_SIZE() { return getDynamicPoolSize(); },
  ZONE_CONTEXT_MAX_USES,
  zoneContextPool,
  makeZoneContext,
  warmZoneContextPool,
  acquireZoneContext,
  releaseZoneContext,
  closeZoneContextPool
};
