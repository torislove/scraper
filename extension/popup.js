(function initPopup() {
  const ramGb = Number(navigator.deviceMemory) > 0 ? Number(navigator.deviceMemory) : 8;
  const cores = Number(navigator.hardwareConcurrency) > 0 ? Number(navigator.hardwareConcurrency) : 6;
  const hwEl = document.getElementById('hw-spec');
  const countEl = document.getElementById('relay-count');
  const btn = document.getElementById('open-cmd');

  if (hwEl) hwEl.textContent = `${ramGb} GB · ${cores} Cores`;

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['relayedCount'], (data) => {
      if (countEl) countEl.textContent = String(Number(data?.relayedCount) || 0);
    });
  }

  if (btn) {
    btn.addEventListener('click', () => {
      const targetUrl = 'https://scraper.co.in/command';
      if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        chrome.tabs.create({ url: targetUrl });
      } else {
        window.open(targetUrl, '_blank', 'noopener');
      }
    });
  }
})();
