/**
 * waSession.js — the customer's own WhatsApp Web session.
 *
 * No API key, no Meta app, no third-party relay. The app opens WhatsApp Web in
 * a private browser profile, shows the QR inside our UI, and (once scanned)
 * can type/send messages and read the visible chat list.
 *
 * Honest limits:
 *  - The desktop app must be running for auto-send and scheduling.
 *  - Delivery ticks are read from the page when visible; otherwise a message
 *    stays `queued`/`sent` until WhatsApp shows more.
 *  - Assisted mode (default) never sends by itself: it prepares the exact
 *    message and hands the customer a wa.me link.
 */

const fs = require('fs');
const path = require('path');
const { DATA_DIR, ensureDir } = require('../../config/paths');
const store = require('./waStore');

const PROFILE_DIR = path.join(DATA_DIR, 'wa-profile');
const CONNECT_TIMEOUT_MS = 90_000;

let context = null;
let page = null;
let syncing = false;
let connectPromise = null;
let syncTimer = null;

const state = {
  status: 'disconnected',
  qr: null,
  phone: '',
  error: '',
  startedAt: null,
  connectedAt: null,
  lastSeenAt: null
};

function getState() {
  return {
    ...state,
    profileDir: PROFILE_DIR,
    hasProfile: fs.existsSync(PROFILE_DIR),
    mode: store.getSession().mode || 'assisted'
  };
}

function setState(patch) {
  Object.assign(state, patch);
  if (patch.status === 'connected') {
    state.qr = null;
  }
  return getState();
}

function findBrowserExecutable() {
  const candidates = [
    process.env.WA_BROWSER_PATH,
    process.env.SCRAPER_CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);
  return candidates.find(p => {
    try { return fs.existsSync(p); } catch (e) { return false; }
  }) || null;
}

async function captureQr() {
  if (!page) return null;
  const selectors = [
    'div[data-ref] canvas',
    'canvas[aria-label*="Scan"]',
    'canvas[aria-label*="QR"]',
    'div[data-testid="qrcode"] canvas',
    'img[alt*="QR"]'
  ];
  for (const selector of selectors) {
    const el = page.locator(selector).first();
    try {
      if (await el.count()) {
        const box = await el.boundingBox();
        if (!box || box.width < 80) continue;
        const buffer = await el.screenshot({ type: 'png' });
        return `data:image/png;base64,${buffer.toString('base64')}`;
      }
    } catch (e) {}
  }
  return null;
}

async function isConnected() {
  if (!page) return false;
  return page.evaluate(() => Boolean(
    document.querySelector('#pane-side')
    || document.querySelector('[data-testid="chat-list"]')
    || document.querySelector('[aria-label="Chat list"]')
    || document.querySelector('header [data-testid="menu"]')
    || document.querySelector('div[aria-label="Chat list"]')
  )).catch(() => false);
}

async function detectProfileName() {
  if (!page) return '';
  return page.evaluate(() => {
    const selectors = [
      '[data-testid="menu-bar"] span[title]',
      'header span[title]',
      'div[aria-label="Profile"] span[title]',
      'div[role="button"] span[title]'
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      const title = el && el.getAttribute('title');
      if (title && title.length < 60) return title;
    }
    return '';
  }).catch(() => '');
}

async function waitForLogin() {
  const started = Date.now();
  let lastQr = null;
  while (Date.now() - started < CONNECT_TIMEOUT_MS) {
    if (!page || page.isClosed()) throw new Error('WhatsApp page closed during connection.');

    if (await isConnected()) {
      const displayPhone = await detectProfileName();
      const connectedAt = new Date().toISOString();
      store.saveSession({ status: 'connected', displayPhone: displayPhone || store.getSession().displayPhone, connectedAt, lastSeenAt: connectedAt });
      setState({ status: 'connected', phone: displayPhone || '', connectedAt, lastSeenAt: connectedAt, error: '' });
      startInboxSync();
      return getState();
    }

    const qr = await captureQr();
    if (qr && qr !== lastQr) {
      lastQr = qr;
      setState({ status: 'qr', qr, error: '' });
    } else if (!qr && state.status === 'disconnected') {
      setState({ status: 'connecting' });
    }

    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  throw new Error('QR was not scanned in time. Click Connect again to refresh the code.');
}

async function connect() {
  if (state.status === 'connected') return getState();
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    ensureDir(PROFILE_DIR);
    setState({ status: 'connecting', qr: null, error: '', startedAt: new Date().toISOString() });

    const { chromium } = require('playwright');
    const executablePath = findBrowserExecutable();
    const options = {
      headless: String(process.env.WA_HEADLESS || 'true') !== 'false',
      viewport: { width: 1280, height: 900 },
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage'
      ]
    };
    if (executablePath) options.executablePath = executablePath;

    context = await chromium.launchPersistentContext(PROFILE_DIR, options);
    page = context.pages()[0] || await context.newPage();
    page.setDefaultTimeout(20_000);
    await page.goto('https://web.whatsapp.com/?lang=en', { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});
    return waitForLogin();
  })();

  try {
    return await connectPromise;
  } catch (error) {
    setState({ status: 'error', qr: null, error: error.message });
    throw error;
  } finally {
    connectPromise = null;
  }
}

async function disconnect({ wipe = false } = {}) {
  stopInboxSync();
  try { if (context) await context.close(); } catch (e) {}
  context = null;
  page = null;
  state.status = 'disconnected';
  state.qr = null;
  state.phone = '';
  state.connectedAt = null;
  store.saveSession({ status: 'disconnected', connectedAt: null });
  if (wipe) {
    try { fs.rmSync(PROFILE_DIR, { recursive: true, force: true }); } catch (e) {}
  }
  return getState();
}

function toSendUrl(phone, text) {
  const digits = store.normalizeDigits(phone);
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${query}`;
}

async function openChat(phone) {
  if (!page) throw new Error('WhatsApp is not connected.');
  const digits = store.normalizeDigits(phone);
  await page.goto(`https://web.whatsapp.com/send?phone=${digits}&lang=en`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForSelector('div[contenteditable="true"][data-tab], footer div[contenteditable="true"]', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(900);
  const invalid = await page.evaluate(() => {
    const text = (document.body.innerText || '').toLowerCase();
    return text.includes('phone number shared via url is invalid') || text.includes('invalid phone number');
  }).catch(() => false);
  if (invalid) throw new Error('WhatsApp says this phone number is not on WhatsApp.');
}

async function sendNow({ phone, text }) {
  if (state.status !== 'connected' || !page) {
    return { ok: false, mode: 'assisted', url: toSendUrl(phone, text), error: 'WhatsApp is not connected. Use the wa.me link instead.' };
  }
  try {
    await openChat(phone);
    // Put the text into the composer and press send. Typing first (instead of
    // relying on ?text=) keeps WhatsApp from dropping long/multiline text.
    const composer = page.locator('footer div[contenteditable="true"], div[contenteditable="true"][data-tab="10"]').last();
    await composer.click({ timeout: 10_000 });
    await page.keyboard.press('Control+A').catch(() => {});
    await page.keyboard.press('Backspace').catch(() => {});
    await page.keyboard.insertText(String(text || ''));
    await page.waitForTimeout(350);
    const sendButton = page.locator('button[aria-label="Send"], span[data-icon="send"]').last();
    if (await sendButton.count()) {
      await sendButton.click({ timeout: 8_000 });
    } else {
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(800);
    return { ok: true, mode: 'auto', url: toSendUrl(phone, text) };
  } catch (error) {
    return { ok: false, mode: 'assisted', url: toSendUrl(phone, text), error: error.message };
  }
}

/**
 * Read the visible chat list into a plain array. The route matches names to
 * scraped leads; this module deliberately knows nothing about vendors.
 */
async function readChatList() {
  if (!page || state.status !== 'connected') return [];
  return page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#pane-side div[role="listitem"], div[data-testid="chat-list"] div[role="listitem"]'));
    return rows.slice(0, 80).map(row => {
      const titleEl = row.querySelector('span[title]');
      const name = (titleEl && titleEl.getAttribute('title')) || '';
      const lines = (row.innerText || '').split('\n').map(v => v.trim()).filter(Boolean);
      const unreadEl = row.querySelector('span[aria-label*="unread" i]');
      const unreadMatch = (unreadEl && unreadEl.getAttribute('aria-label') || '').match(/(\d+)/);
      return {
        name,
        preview: lines.slice(1, 3).join(' · ').slice(0, 220),
        unread: unreadMatch ? Number(unreadMatch[1]) : 0,
        raw: lines.slice(0, 6)
      };
    }).filter(chat => chat.name);
  }).catch(() => []);
}

function startInboxSync() {
  stopInboxSync();
  syncTimer = setInterval(() => {
    if (syncing) return;
    syncing = true;
    Promise.resolve()
      .then(() => readChatList())
      .then(chats => {
        if (typeof exports.onChats === 'function') exports.onChats(chats);
      })
      .catch(() => {})
      .finally(() => { syncing = false; });
  }, 20_000);
  if (syncTimer.unref) syncTimer.unref();
}

function stopInboxSync() {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = null;
}

module.exports = {
  getState,
  connect,
  disconnect,
  sendNow,
  readChatList,
  toSendUrl,
  onChats: null
};
