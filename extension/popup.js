/**
 * popup.js — live extension telemetry & active workspace launcher.
 */

(function initPopup() {
  let latestState = null;

  const els = {
    led: document.getElementById('led'),
    statusPill: document.getElementById('status-pill'),
    status: document.getElementById('ext-status'),
    version: document.getElementById('version'),
    hw: document.getElementById('hw-spec'),
    count: document.getElementById('relay-count'),
    siteCount: document.getElementById('site-count'),
    siteNote: document.getElementById('site-note'),
    open: document.getElementById('open-cmd'),
    pair: document.getElementById('pair-btn'),
    wildcard: document.getElementById('wildcard-btn'),
    error: document.getElementById('last-error')
  };

  function setTone(tone) {
    els.led.className = `led is-${tone}`;
    els.statusPill.className = `pill is-${tone}`;
  }

  function send(type, extra = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, ...extra }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response || { ok: false, error: 'empty_response' });
      });
    });
  }

  function render(state) {
    latestState = state || null;
    if (!state || state.ok === false) {
      setTone('off');
      els.status.textContent = 'NOT RESPONDING';
      els.error.hidden = false;
      els.error.textContent = state?.error || 'Background worker did not answer. Reopen Chrome.';
      return;
    }

    els.version.textContent = state.version || '1.1.0';
    const ram = state.ramGb ? `${state.ramGb} GB` : 'Unknown';
    const cores = state.cpuCores ? `${state.cpuCores} cores` : '';
    els.hw.textContent = cores ? `${ram} · ${cores}` : ram;
    els.count.textContent = String(state.relayedCount || 0);

    const sites = state.sites || {};
    if (sites.ok) {
      els.siteCount.textContent = `All ${sites.requiredCount} sites ready.`;
    } else {
      els.siteCount.textContent = `${sites.grantedCount || 0} of ${sites.requiredCount || 0} sites allowed.`;
    }

    els.pair.hidden = true;
    if (state.paused) {
      setTone('warn');
      els.status.textContent = 'PAUSED';
    } else if (!state.paired) {
      setTone('live');
      els.status.textContent = 'STANDBY · OPEN TAB TO PAIR';
      els.pair.hidden = false;
    } else if (!sites.ok) {
      setTone('warn');
      els.status.textContent = 'SITE ACCESS NEEDED';
    } else {
      setTone('live');
      els.status.textContent = 'CONNECTED · ALWAYS ON';
    }

    // The wildcard upgrade is only offered once the basics work.
    els.wildcard.hidden = Boolean(sites.wildcard) || !state.paired;

    if (state.lastError) {
      els.error.hidden = false;
      els.error.textContent = `Last error: ${state.lastError}`;
    } else {
      els.error.hidden = true;
    }
  }

  async function refresh() {
    const state = await send('SCRAPER_EXT_STATE');
    render(state);
  }

  els.open?.addEventListener('click', async () => {
    const base = String(latestState?.serverBase || 'https://scraper.co.in').replace(/\/+$/, '');
    const target = `${base}/command`;
    try {
      if (chrome.tabs?.query) {
        const tabs = await chrome.tabs.query({ url: [`${base}/*`, 'http://localhost:*/*', 'http://127.0.0.1:*/*'] });
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
      if (chrome.tabs?.create) {
        await chrome.tabs.create({ url: target });
        window.close();
        return;
      }
    } catch (e) {}
    window.open(target, '_blank', 'noopener');
  });

  els.pair?.addEventListener('click', async () => {
    els.pair.disabled = true;
    await send('SCRAPER_EXT_HEARTBEAT');
    els.pair.disabled = false;
    await refresh();
  });

  els.wildcard?.addEventListener('click', async () => {
    els.wildcard.disabled = true;
    await send('SCRAPER_EXT_REQUEST_SITES');
    els.wildcard.disabled = false;
    await refresh();
  });

  refresh();
  setInterval(refresh, 4000);
})();
