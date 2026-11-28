/**
 * popup.js — Scraper.co.in RAM Turbo Live Hardware & Speed Telemetry
 * ============================================================================
 * Instant-render cockpit:
 *  - Displays native client PC hardware (Cores, Total RAM, Free RAM bar, Dynamic Lanes)
 *  - Real-time speedometer (req/s), latency gauge, verified lead counts
 *  - One-click launch to local/remote Command Center and diagnostic export
 * ============================================================================
 */

(function initPopup() {
  let latestState = null;
  const isFile = location.protocol === 'file:';

  const els = {
    led: document.getElementById('led'),
    statusPill: document.getElementById('status-pill'),
    status: document.getElementById('ext-status'),
    version: document.getElementById('version'),
    hwCpu: document.getElementById('hw-cpu'),
    hwLanes: document.getElementById('hw-lanes'),
    ramUsageText: document.getElementById('ram-usage-text'),
    ramPct: document.getElementById('ram-pct'),
    ramBar: document.getElementById('ram-bar'),
    metricSpeed: document.getElementById('metric-speed'),
    metricLatency: document.getElementById('metric-latency'),
    count: document.getElementById('relay-count'),
    bytesRelayed: document.getElementById('bytes-relayed'),
    siteCount: document.getElementById('site-count'),
    open: document.getElementById('open-cmd'),
    openMaster: document.getElementById('open-master'),
    extractTab: document.getElementById('extract-tab-btn'),
    syncBtn: document.getElementById('sync-btn'),
    offlineCount: document.getElementById('offline-count'),
    pair: document.getElementById('pair-btn'),
    diag: document.getElementById('diag-btn'),
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

  // Quick initial hardware detection directly inside popup context
  async function renderHardwareNow() {
    let ram = Number(navigator.deviceMemory) || 8;
    let cores = Number(navigator.hardwareConcurrency) || 8;
    let free = Math.round(ram * 0.5);

    try {
      if (chrome?.system?.memory?.getInfo) {
        const mem = await chrome.system.memory.getInfo();
        const gb = (b) => Math.round((Number(b) || 0) / (1024 * 1024 * 1024));
        ram = gb(mem?.capacity) || ram;
        free = gb(mem?.availableCapacity) || free;
      }
      if (chrome?.system?.cpu?.getInfo) {
        const cpu = await chrome.system.cpu.getInfo();
        cores = Number(cpu?.numOfProcessors) || cores;
        if (cpu?.modelName && els.hwCpu) {
          els.hwCpu.textContent = `${cpu.modelName.slice(0, 22)} (${cores}C)`;
        }
      }
    } catch (e) {}

    if (els.hwCpu && !els.hwCpu.textContent.includes('(')) {
      els.hwCpu.textContent = `${cores} CPU Cores`;
    }

    const freePct = ram > 0 ? Math.min(100, Math.max(10, Math.round((free / ram) * 100))) : 50;
    if (els.ramUsageText) {
      els.ramUsageText.textContent = `RAM: ${ram} GB Total · ${free} GB Free`;
    }
    if (els.ramPct) {
      els.ramPct.textContent = `${freePct}% Available`;
    }
    if (els.ramBar) {
      els.ramBar.style.width = `${freePct}%`;
    }

    let lanes = 4;
    if (ram >= 32) lanes = 16;
    else if (ram >= 16) lanes = 12;
    else if (ram >= 8) lanes = 8;
    if (els.hwLanes) els.hwLanes.textContent = `${lanes} Turbo Lanes`;
  }

  function send(type, extra = {}) {
    if (isFile || !chrome?.runtime?.sendMessage) {
      return Promise.resolve({ ok: false, error: 'Must be opened in Chrome toolbar.' });
    }
    return new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      };
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
      if (els.status) els.status.textContent = state?.timedOut ? 'WAKING UP…' : 'STANDBY';
      if (!state?.timedOut && state?.error) {
        setError(state.error);
      } else {
        setError('');
      }
      return;
    }

    if (els.version) els.version.textContent = `v${state.version || '2.0.0'}`;

    const ram = Number(state.ramGb) || 8;
    const free = Number(state.freeRamGb) || Math.round(ram * 0.5);
    const cores = Number(state.cpuCores) || 8;
    const model = state.cpuModel ? state.cpuModel.slice(0, 22) : '';

    if (els.hwCpu) {
      els.hwCpu.textContent = model ? `${model} (${cores}C)` : `${cores} Cores`;
    }

    const freePct = ram > 0 ? Math.min(100, Math.max(10, Math.round((free / ram) * 100))) : 50;
    if (els.ramUsageText) els.ramUsageText.textContent = `RAM: ${ram} GB Total · ${free} GB Free`;
    if (els.ramPct) els.ramPct.textContent = `${freePct}% Free`;
    if (els.ramBar) els.ramBar.style.width = `${freePct}%`;

    const lanes = state.lanes || (ram >= 16 ? 12 : ram >= 8 ? 8 : 4);
    if (els.hwLanes) els.hwLanes.textContent = `${lanes} Turbo Lanes`;

    // Metrics
    const metrics = state.metrics || {};
    if (els.metricSpeed) els.metricSpeed.textContent = (metrics.reqPerSec || 0).toFixed(1);
    if (els.metricLatency) els.metricLatency.textContent = `~${metrics.avgLatencyMs || 240}ms avg latency`;
    if (els.count) els.count.textContent = String(state.relayedCount || 0);

    const kb = Math.round((metrics.totalBytesRelayed || 0) / 1024);
    if (els.bytesRelayed) {
      els.bytesRelayed.textContent = kb > 1024
        ? `${(kb / 1024).toFixed(1)} MB total routed`
        : `${kb} KB total routed`;
    }

    const sites = state.sites || {};
    if (els.siteCount) {
      els.siteCount.textContent = sites.ok
        ? `All 5 sovereign markets & ${sites.requiredCount || 36} sources active (Client + Master).`
        : `${sites.grantedCount || 0} of ${sites.requiredCount || 36} sources granted.`;
    }

    const offCount = Number(state.offlineQueuedCount || 0);
    if (els.offlineCount) els.offlineCount.textContent = String(offCount);

    if (state.paused) {
      setTone('warn');
      if (els.status) els.status.textContent = 'PAUSED';
    } else if (state.offlineMode || state.lastError === 'standby_offline') {
      setTone('warn');
      if (els.status) els.status.textContent = offCount > 0 ? `OFFLINE VAULT · ${offCount} CACHED` : 'OFFLINE EDGE READY';
    } else if (!state.paired) {
      setTone('live');
      if (els.status) els.status.textContent = offCount > 0 ? `STANDBY · ${offCount} CACHED` : 'READY · OFFLINE & ONLINE';
    } else if (!sites.ok) {
      setTone('warn');
      if (els.status) els.status.textContent = 'PERMISSIONS NEEDED';
    } else {
      setTone('live');
      if (els.status) els.status.textContent = 'CONNECTED · ALWAYS ON';
    }

    if (els.wildcard) els.wildcard.hidden = Boolean(sites.wildcard) || !state.paired;
    setError(state.lastError && state.lastError !== 'standby_offline' ? `Notice: ${state.lastError}` : '');
  }

  async function refresh() {
    const state = await send('SCRAPER_EXT_STATE');
    render(state);
  }

  async function resolveBase() {
    const paired = String(latestState?.serverBase || '').replace(/\/+$/, '');
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
    return 'https://scraper.co.in';
  }

  async function openWorkspace(edition = 'client') {
    const base = await resolveBase();
    let target = `${base}/command`;
    if (edition === 'master') {
      target = /localhost|127\.0\.0\.1/.test(base)
        ? base.replace(/:\d+$/, ':5174') + '/command'
        : 'https://master.scraper.co.in/command';
    } else if (/:\d+$/.test(base)) {
      target = base.replace(/:\d+$/, ':5173') + '/command';
    }
    const targetOrigin = new URL(target).origin;
    try {
      if (chrome?.tabs?.query) {
        const tabs = await chrome.tabs.query({});
        const match = (tabs || []).find((t) => String(t.url || '').startsWith(targetOrigin));
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
  }

  els.open?.addEventListener('click', () => openWorkspace('client'));
  els.openMaster?.addEventListener('click', () => openWorkspace('master'));

  els.extractTab?.addEventListener('click', async () => {
    if (els.extractTab) els.extractTab.disabled = true;
    const res = await send('SCRAPER_EXT_EXTRACT_TAB');
    if (els.extractTab) els.extractTab.disabled = false;
    if (res?.ok && res.item) {
      setError(`Saved offline: ${res.item.phones?.length || 0} phone(s), ${res.item.emails?.length || 0} email(s).`);
    } else {
      setError(res?.error === 'open_webpage_first' ? 'Open any http/https business page tab first.' : (res?.error || 'Could not extract tab.'));
    }
    await refresh();
  });

  els.syncBtn?.addEventListener('click', async () => {
    if (els.syncBtn) els.syncBtn.disabled = true;
    await send('SCRAPER_EXT_HEARTBEAT');
    if (els.syncBtn) els.syncBtn.disabled = false;
    await refresh();
  });

  els.pair?.addEventListener('click', async () => {
    if (els.pair) els.pair.disabled = true;
    const result = await send('SCRAPER_EXT_HEARTBEAT');
    try {
      const h = await fetch('http://127.0.0.1:5002/api/health');
      if (h.ok) setError('');
      else if (result?.ok === false) setError(result.reason || 'Backend health check returned ' + h.status);
    } catch (_) {
      if (result?.ok === false) setError(result.reason || 'Backend :5002 offline — start dev server.');
    }
    if (els.pair) els.pair.disabled = false;
    await refresh();
  });

  els.diag?.addEventListener('click', async () => {
    const info = {
      timestamp: new Date().toISOString(),
      extensionVersion: '2.0.0',
      hardware: {
        ram: els.ramUsageText?.textContent || '',
        cpu: els.hwCpu?.textContent || '',
        lanes: els.hwLanes?.textContent || ''
      },
      state: latestState
    };
    const jsonStr = JSON.stringify(info, null, 2);
    try {
      await navigator.clipboard.writeText(jsonStr);
      alert('Diagnostic telemetry copied to clipboard!\n\n' + jsonStr.slice(0, 300) + '...');
    } catch (e) {
      alert('Extension Status:\n' + jsonStr.slice(0, 400));
    }
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
    if (els.status) els.status.textContent = 'TOOLBAR PREVIEW';
    setError('Click the RAM Turbo extension icon in your browser toolbar.');
    return;
  }

  refresh();
  setInterval(refresh, 2500);
})();
