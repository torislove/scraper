/**
 * popup.js — live extension telemetry & active workspace launcher.
 *
 * Rules for this file:
 *  - It must render something useful in under 50 ms, even if the service
 *    worker is asleep or Chrome is still starting it.
 *  - It must never stay on "Checking…" / "Detecting…". Every async read has a
 *    hard timeout and a local fallback.
 *  - It must never crash when popup.html is opened straight from a ZIP
 *    (file://), where the chrome.* APIs do not exist.
 */

(function initPopup() {
  let latestState = null;
  const isFile = location.protocol === 'file:';

  const els = {
    led: document.getElementById('led'),
    statusPill: document.getElementById('status-pill'),
    status: document.getElementById('ext-status'),
    version: document.getElementById('version'),
    hw: document.getElementById('hw-spec'),
    count: document.getElementById('relay-count'),
    siteCount: document.getElementById('site-count'),
    open: document.getElementById('open-cmd'),
    pair: document.getElementById('pair-btn'),
    wildcard: document.getElementById('wildcard-btn'),
    error: document.getElementById('last-error')
  };

  function setTone(tone) {
    if (els.led) els.led.className = `led is-${tone}`;
    if (els.statusPill) els.statusPill.className = `pill is-${tone}`;
  }

  function setError(message) {
    if (!els.error) return;
    if (message) {
      els.error.hidden = false;
      els.error.textContent = message;
    } else {
      els.error.hidden = true;
      els.error.textContent = '';
    }
  }

  // Instant hardware estimate from the popup's own window. This is shown
  // before the background worker answers, then replaced by the exact totals.
  async function renderHardwareNow() {
    if (!els.hw) return;
    let ram = Number(navigator.deviceMemory) || 0;
    let cores = Number(navigator.hardwareConcurrency) || 0;
    let free = 0;
    try {
      if (chrome?.system?.memory?.getInfo) {
        const mem = await chrome.system.memory.getInfo();
        const gb = (b) => Math.round((Number(b) || 0) / (1024 * 1024 * 1024));
        ram = gb(mem?.capacity) || ram;
        free = gb(mem?.availableCapacity);
      }
      if (chrome?.system?.cpu?.getInfo) {
        const cpu = await chrome.system.cpu.getInfo();
        cores = Number(cpu?.numOfProcessors) || cores;
      }
    } catch (e) {}
    const bits = [];
    bits.push(ram > 0 ? `${ram} GB RAM` : '8 GB RAM');
    if (free > 0) bits.push(`${free} GB free`);
    bits.push(cores > 0 ? `${cores} cores` : 'Multi-core');
    els.hw.textContent = bits.join(' · ');
  }

  function send(type, extra = {}) {
    if (isFile || !chrome?.runtime?.sendMessage) {
      return Promise.resolve({ ok: false, error: 'This page must be opened from the Chrome toolbar, not from a file.' });
    }
    return new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      };
      // The MV3 worker can take a moment to wake. Never wait forever.
      const timer = setTimeout(() => {
        done({ ok: false, error: 'timeout', timedOut: true });
      }, 1600);
      try {
        chrome.runtime.sendMessage({ type, ...extra }, (response) => {
          if (chrome.runtime.lastError) {
            done({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          done(response || { ok: false, error: 'empty_response' });
        });
      } catch (e) {
        done({ ok: false, error: e?.message || 'send_failed' });
      }
    });
  }

  function render(state) {
    latestState = state || null;
    if (!state || state.ok === false) {
      setTone('off');
      if (els.status) els.status.textContent = state?.timedOut ? 'WAKING UP…' : 'NOT RESPONDING';
      if (els.siteCount) els.siteCount.textContent = 'Open from Chrome to check.';
      if (!state?.timedOut) {
        setError(state?.error || 'Background worker did not answer. Reopen Chrome.');
      } else {
        setError('');
      }
      return;
    }

    if (els.version) els.version.textContent = state.version || '1.2.0';
    const ram = state.ramGb ? `${state.ramGb} GB` : '';
    const free = state.freeRamGb ? `${state.freeRamGb} GB free` : '';
    const cores = state.cpuCores ? `${state.cpuCores} cores` : '';
    if (els.hw) {
      const parts = [ram, free, cores].filter(Boolean);
      els.hw.textContent = parts.length ? parts.join(' · ') : 'Hardware ready';
    }
    if (els.count) els.count.textContent = String(state.relayedCount || 0);

    const sites = state.sites || {};
    if (els.siteCount) {
      els.siteCount.textContent = sites.ok
        ? `All ${sites.requiredCount} sites ready.`
        : `${sites.grantedCount || 0} of ${sites.requiredCount || 0} sites allowed.`;
    }

    if (els.pair) els.pair.hidden = true;
    if (state.paused) {
      setTone('warn');
      if (els.status) els.status.textContent = 'PAUSED';
    } else if (!state.paired) {
      setTone('live');
      if (els.status) els.status.textContent = 'STANDBY · OPEN TAB TO PAIR';
      if (els.pair) els.pair.hidden = false;
    } else if (!sites.ok) {
      setTone('warn');
      if (els.status) els.status.textContent = 'SITE ACCESS NEEDED';
    } else {
      setTone('live');
      if (els.status) els.status.textContent = 'CONNECTED · ALWAYS ON';
    }

    if (els.wildcard) els.wildcard.hidden = Boolean(sites.wildcard) || !state.paired;
    setError(state.lastError ? `Last error: ${state.lastError}` : '');
  }

  async function refresh() {
    const state = await send('SCRAPER_EXT_STATE');
    render(state);
  }

  async function resolveBase() {
    const paired = String(latestState?.serverBase || '').replace(/\/+$/, '');
    // In local-first mode, prefer whatever the user actually has open.
    try {
      if (chrome?.tabs?.query) {
        const tabs = await chrome.tabs.query({});
        const urls = (tabs || [])
          .map((t) => String(t.url || ''))
          .filter((u) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(u));
        if (urls.length) {
          const origin = new URL(urls[0]).origin;
          return origin.replace(/\/+$/, '');
        }
      }
    } catch (e) {}
    if (paired) return paired;
    // Fall back to the production domain once it is live.
    return 'https://scraper.co.in';
  }

  els.open?.addEventListener('click', async () => {
    const base = await resolveBase();
    const target = `${base}/command`;
    try {
      if (chrome?.tabs?.query) {
        const tabs = await chrome.tabs.query({});
        const match = (tabs || []).find((t) => String(t.url || '').startsWith(base));
        if (match?.id) {
          await chrome.tabs.update(match.id, { active: true });
          if (chrome.windows?.update && match.windowId) {
            await chrome.windows.update(match.windowId, { focused: true });
          }
          window.close();
          return;
        }
      }
      if (chrome?.tabs?.create) {
        await chrome.tabs.create({ url: target });
        window.close();
        return;
      }
    } catch (e) {}
    if (!isFile) window.open(target, '_blank', 'noopener');
  });

  els.pair?.addEventListener('click', async () => {
    if (els.pair) els.pair.disabled = true;
    const result = await send('SCRAPER_EXT_HEARTBEAT');
    if (els.pair) els.pair.disabled = false;
    if (result?.ok === false) setError(result.error || 'Could not reconnect yet.');
    await refresh();
  });

  els.wildcard?.addEventListener('click', async () => {
    if (els.wildcard) els.wildcard.disabled = true;
    await send('SCRAPER_EXT_REQUEST_SITES');
    if (els.wildcard) els.wildcard.disabled = false;
    await refresh();
  });

  renderHardwareNow();

  if (isFile) {
    setTone('warn');
    if (els.status) els.status.textContent = 'OPEN FROM CHROME';
    if (els.pair) els.pair.hidden = true;
    if (els.wildcard) els.wildcard.hidden = true;
    setError('This is the preview file. Click the RAM Turbo icon in Chrome’s toolbar to use the extension.');
    return;
  }

  refresh();
  setInterval(refresh, 4000);
})();
