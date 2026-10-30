const api = window.scraperLicense;

const el = id => document.getElementById(id);
const statusCard = el('status');
const titleEl = el('title');
const ledeEl = el('lede');
const formEl = el('form');
const keyEl = el('key');
const emailEl = el('email');
const activateEl = el('activate');
const importEl = el('import');
const messageEl = el('message');
const plansEl = el('plans');

let plans = [];
let busy = false;

function setMessage(text, tone = 'error') {
  if (!text) {
    messageEl.hidden = true;
    messageEl.textContent = '';
    return;
  }
  messageEl.hidden = false;
  messageEl.textContent = text;
  messageEl.classList.toggle('is-ok', tone === 'ok');
}

function renderStatus(status) {
  if (!status) return;

  const { state, daysLeft, plan, expiresAt, reason } = status;
  const label = statusCard.querySelector('.trial-text b');
  const detail = statusCard.querySelector('.trial-text span');

  statusCard.className = 'trial-card';

  if (state === 'active' || state === 'grace') {
    statusCard.classList.add(state === 'grace' ? 'is-warning' : 'is-active');
    label.textContent = `Licensed${plan ? ` · ${String(plan).toUpperCase()}` : ''}`;
    detail.textContent = expiresAt
      ? `${state === 'grace' ? 'Grace period ends' : 'Renews'} ${new Date(expiresAt).toLocaleDateString()}`
      : 'This device is activated';
    titleEl.textContent = "You're all set";
    ledeEl.textContent = 'Your subscription is active. Close this window and start searching.';
    activateEl.textContent = 'Re-activate';
  } else if (state === 'trial') {
    statusCard.classList.add(daysLeft <= 3 ? 'is-warning' : 'is-active');
    label.textContent = `Free trial · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
    detail.textContent = 'Full access until the trial ends. No card required.';
    titleEl.textContent = 'Activate your workspace';
    ledeEl.textContent = 'Keep using Scraper after the trial by activating a licence.';
    activateEl.textContent = 'Activate licence';
  } else if (state === 'expired') {
    statusCard.classList.add('is-expired');
    label.textContent = reason === 'device_mismatch' ? 'Licence bound to another PC' : 'Subscription expired';
    detail.textContent =
      reason === 'device_mismatch'
        ? 'Contact support to move this licence to this computer.'
        : 'Renew to keep searching. Saved folders and CRM data are untouched.';
    titleEl.textContent = 'Renew your access';
    ledeEl.textContent = 'Enter a new licence key, or subscribe below.';
    activateEl.textContent = 'Activate licence';
  } else {
    label.textContent = 'Activation required';
    detail.textContent = 'Enter a licence key to continue.';
  }

  if (status.email) emailEl.value = status.email;
}

function renderPlans() {
  plansEl.innerHTML = '';
  plans.forEach(plan => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'plan';
    button.innerHTML = `
      <b>${plan.name}</b>
      <div class="price">${plan.price}<small>${plan.period}</small></div>
      <div class="blurb">${plan.blurb}</div>
    `;
    button.addEventListener('click', () => api.openPortal());
    plansEl.appendChild(button);
  });
}

async function refresh() {
  const status = await api.status();
  renderStatus(status);
  if (status && status.canUse && status.state !== 'trial') {
    setTimeout(() => window.close(), 1400);
  }
}

formEl.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;

  const key = keyEl.value.trim();
  if (!key) {
    setMessage('Enter your licence key.');
    keyEl.focus();
    return;
  }

  busy = true;
  activateEl.disabled = true;
  activateEl.innerHTML = '<span class="spinner"></span>Activating…';
  setMessage('');

  try {
    const result = await api.activate({ key, email: emailEl.value.trim() });
    if (result.ok) {
      setMessage('Licence activated. Starting your workspace…', 'ok');
      renderStatus(result.status);
      setTimeout(() => window.close(), 1100);
    } else {
      setMessage(result.error || 'That licence could not be activated.');
    }
  } catch (e) {
    setMessage('Activation failed. Check your connection and try again.');
  } finally {
    busy = false;
    activateEl.disabled = false;
    activateEl.textContent = 'Activate licence';
  }
});

importEl.addEventListener('click', async () => {
  if (busy) return;
  busy = true;
  setMessage('');
  try {
    const result = await api.importFile();
    if (result.canceled) return;
    if (result.ok) {
      setMessage('Licence imported. Starting your workspace…', 'ok');
      renderStatus(result.status);
      setTimeout(() => window.close(), 1100);
    } else {
      setMessage(result.error || 'That file is not a valid licence.');
    }
  } finally {
    busy = false;
  }
});

el('pricing').addEventListener('click', event => {
  event.preventDefault();
  api.openPortal();
});

keyEl.addEventListener('input', () => {
  const digits = keyEl.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (digits.length > 4 && !keyEl.value.includes('.') && digits.length <= 20) {
    keyEl.value = digits.match(/.{1,4}/g).join('-');
  }
});

(async function init() {
  plans = (await api.plans()) || [];
  renderPlans();
  await refresh();
  keyEl.focus();
})();
