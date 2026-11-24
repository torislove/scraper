/**
 * popupConfigService.js — Central configuration and persistence service for all
 * marketing banners, exit-intent modals, social proof slide-ins, welcome mats, and custom popups.
 *
 * Persists to <DATA_DIR>/popups-config.json with automatic memory caching and fallback.
 */

const fs = require('fs');
const path = require('path');
const { DATA_DIR, ensureDir } = require('../config/paths');

const CONFIG_FILE = path.join(DATA_DIR, 'popups-config.json');

const DEFAULT_CONFIG = {
  stickyPromoBar: {
    enabled: true,
    themePreset: 'emerald',
    bgColor: '#022c22',
    textColor: '#f1f5f9',
    buttonColor: '#10b981',
    badgeColor: '#064e3b',
    badgeText: 'Live Update',
    text: 'Direct WhatsApp & Mobile Extraction now live across 11 sovereign countries.',
    highlightText: 'WhatsApp & Mobile Extraction',
    actionText: 'Instant Demo',
    actionUrl: '/login',
    cooldownDays: 7
  },
  exitIntentModal: {
    enabled: true,
    themePreset: 'emerald',
    bgColor: '#ffffff',
    textColor: '#0f172a',
    buttonColor: '#059669',
    badgeColor: '#fef3c7',
    tag: 'Free Lead Sample',
    title: 'Wait! Take 25 Free Verified Leads Before You Go 🚀',
    subtitle: 'See the exact phone and WhatsApp data quality our machine extracts before running a full scan.',
    sampleLeads: [
      { name: 'Studio Sandhya Raagam', phone: '+91 99592 82819', type: 'Mobile · WhatsApp', city: 'Guntur' },
      { name: 'Apex Logistics & Freight', phone: '+91 98480 12345', type: 'Mobile · Direct', city: 'Vijayawada' },
      { name: 'Sri Balaji Turmeric Traders', phone: '+91 94401 56789', type: 'Mobile · WhatsApp', city: 'Tenali' }
    ],
    downloadButtonText: 'Download Sample CSV',
    scanCityButtonText: 'Scan My City',
    scanCityUrl: '/login'
  },
  socialProofSlideIn: {
    enabled: true,
    themePreset: 'ocean',
    bgColor: '#ffffff',
    textColor: '#0f172a',
    badgeColor: '#e0f2fe',
    initialDelayMs: 6000,
    displayDurationMs: 7000,
    cycleIntervalMs: 35000,
    activities: [
      { city: 'Tenali Mandals (AP)', count: 384, category: 'Turmeric Wholesalers', time: '12m ago' },
      { city: 'Guntur (AP)', count: 215, category: 'Wedding Photographers', time: '18m ago' },
      { city: 'Dallas (TX, US)', count: 180, category: 'HVAC Contractors', time: '24m ago' },
      { city: 'Birmingham (UK)', count: 142, category: 'Accounting Firms', time: '31m ago' },
      { city: 'Dubai (UAE)', count: 290, category: 'Commercial Brokers', time: '40m ago' },
      { city: 'Toronto (CA)', count: 210, category: 'Real Estate Brokers', time: '48m ago' },
      { city: 'Sydney (AU)', count: 165, category: 'Solar Contractors', time: '55m ago' },
      { city: 'Singapore (SG)', count: 195, category: 'Corporate Secretarial', time: '1h ago' }
    ]
  },
  customPopups: [
    {
      id: 'pop_whatsapp_widget',
      name: 'WhatsApp Direct Outreach Widget',
      format: 'widget', // 'sticky' | 'modal' | 'slidein' | 'welcomemat' | 'widget'
      enabled: true,
      title: 'Chat with Verified Business Specialist',
      message: 'Need custom territorial extraction for your agency?',
      badgeText: 'ONLINE NOW',
      ctaLabel: 'Message WhatsApp',
      ctaUrl: 'https://wa.me/919959282819?text=Hello%20Scraper.co.in%20Team',
      triggerType: 'entry',
      delaySeconds: 5
    },
    {
      id: 'pop_special_offer',
      name: '11-Nation Enterprise Access Promo',
      format: 'modal',
      enabled: false,
      title: 'Unlock Unlimited State-Wide Sweeps in 11 Nations',
      message: 'Access all 22 cloud engines without daily rate limits.',
      badgeText: 'EXCLUSIVE OPERATOR ACCESS',
      ctaLabel: 'Request Master Fleet Key',
      ctaUrl: '/login',
      triggerType: 'exit_intent',
      delaySeconds: 0
    }
  ],
  updatedAt: new Date().toISOString()
};

let cachedConfig = null;

function loadConfig() {
  if (cachedConfig) return cachedConfig;
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      cachedConfig = {
        stickyPromoBar: { ...DEFAULT_CONFIG.stickyPromoBar, ...(parsed?.stickyPromoBar || {}) },
        exitIntentModal: { ...DEFAULT_CONFIG.exitIntentModal, ...(parsed?.exitIntentModal || {}) },
        socialProofSlideIn: { ...DEFAULT_CONFIG.socialProofSlideIn, ...(parsed?.socialProofSlideIn || {}) },
        customPopups: Array.isArray(parsed?.customPopups) ? parsed.customPopups : DEFAULT_CONFIG.customPopups,
        updatedAt: parsed?.updatedAt || new Date().toISOString()
      };
      return cachedConfig;
    }
  } catch (err) {
    console.error('[PopupConfig] Failed to load config from disk, falling back to defaults:', err.message);
  }

  cachedConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  return cachedConfig;
}

function saveConfig(config) {
  try {
    ensureDir(path.dirname(CONFIG_FILE));
    const toSave = {
      ...config,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(toSave, null, 2), 'utf-8');
    cachedConfig = toSave;
    return toSave;
  } catch (err) {
    console.error('[PopupConfig] Failed to persist config to disk:', err.message);
    throw err;
  }
}

function getPopups() {
  return loadConfig();
}

function updatePopups(partial) {
  const current = loadConfig();
  const next = {
    stickyPromoBar: {
      ...current.stickyPromoBar,
      ...(partial.stickyPromoBar || {})
    },
    exitIntentModal: {
      ...current.exitIntentModal,
      ...(partial.exitIntentModal || {})
    },
    socialProofSlideIn: {
      ...current.socialProofSlideIn,
      ...(partial.socialProofSlideIn || {})
    },
    customPopups: Array.isArray(partial.customPopups) ? partial.customPopups : current.customPopups
  };
  return saveConfig(next);
}

function addCustomPopup(popup) {
  const current = loadConfig();
  const id = popup.id || `pop_${Date.now().toString(36)}`;
  const item = {
    id,
    name: popup.name || 'Untitled Popup',
    format: popup.format || 'modal',
    enabled: popup.enabled !== false,
    themePreset: popup.themePreset || 'emerald',
    bgColor: popup.bgColor || '#ffffff',
    textColor: popup.textColor || '#0f172a',
    buttonColor: popup.buttonColor || '#059669',
    badgeColor: popup.badgeColor || '#ecfdf5',
    title: popup.title || '',
    message: popup.message || '',
    badgeText: popup.badgeText || 'SPECIAL',
    ctaLabel: popup.ctaLabel || 'Learn More',
    ctaUrl: popup.ctaUrl || '/login',
    triggerType: popup.triggerType || 'entry',
    delaySeconds: Number(popup.delaySeconds) || 3,
    createdAt: new Date().toISOString()
  };
  const customPopups = [...(current.customPopups || []), item];
  return saveConfig({ ...current, customPopups });
}

function deleteCustomPopup(id) {
  const current = loadConfig();
  const customPopups = (current.customPopups || []).filter(p => p.id !== id);
  return saveConfig({ ...current, customPopups });
}

function resetToDefaults() {
  return saveConfig(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
}

module.exports = {
  DEFAULT_CONFIG,
  getPopups,
  updatePopups,
  addCustomPopup,
  deleteCustomPopup,
  resetToDefaults
};
