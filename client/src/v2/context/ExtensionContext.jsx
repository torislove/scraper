import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState
} from 'react';
import { API_URL } from '../../apiConfig';
import { getUserId } from '../../utils/sessionManager';
import { getToken } from '../auth';
import { detectDeviceHardware } from '../utils/deviceRamEngine';
import { detectExtension, pairExtension, startRelayAgent } from '../utils/relayAgent';
import { detectUserBrowser } from '../utils/browserDetect';
import ExtensionGatewayModal from '../components/modals/ExtensionGatewayModal';

const VERIFIED_KEY = 'scraper_ext_verified_v1';
const SKIP_EXTENSION_KEY = 'scraper_skip_extension';
const EASY_SCRAPE_MODE = import.meta.env.VITE_EASY_SCRAPE !== '0';

const DEFAULT_EXTENSION_CONTEXT = {
  ext: { installed: false, version: null, ready: false, transport: 'none' },
  userBrowser: { name: 'Microsoft Edge', badge: 'Edge', storeUrl: 'https://microsoftedge.microsoft.com/addons/detail/gcmknikiliglejekhghkdplkjgkjjkdm' },
  ready: false,
  checking: false,
  hardware: { ramGb: 16, cores: 8, tier: 'T2 Standard' },
  gatewayOpen: false,
  gatewayMode: 'connect',
  targetMeta: null,
  skippedExtension: false,
  skipAndRunLocal: () => {},
  resetLocalMode: () => {},
  ensureConnected: (onReady) => { if (typeof onReady === 'function') onReady(); },
  openTelemetry: () => {},
  openSetup: () => {},
  closeGateway: () => {},
  completeProceed: () => {},
  fetchServerStatus: () => Promise.resolve({ ok: true })
};

const ExtensionContext = createContext(DEFAULT_EXTENSION_CONTEXT);

function buildHeaders() {
  const headers = {};
  try {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch (e) {}
  return headers;
}

export function ExtensionProvider({ children }) {
  const hardware = useMemo(() => detectDeviceHardware(), []);
  const userBrowser = useMemo(() => detectUserBrowser(), []);
  const initialDomInstalled = typeof document !== 'undefined' && Boolean(
    document.documentElement?.getAttribute('data-scraper-ext-installed') === 'true' ||
    document.documentElement?.dataset?.scraperExtension
  );

  const [ext, setExt] = useState({
    installed: initialDomInstalled,
    connected: false,
    paired: initialDomInstalled && document.documentElement?.dataset?.scraperExtensionPaired === '1',
    version: initialDomInstalled ? String(document.documentElement.dataset.scraperExtension) : '',
    capabilities: [],
    relayed: 0,
    extensionOnly: false,
    storeUrl: '',
    lastError: ''
  });
  const [checking, setChecking] = useState(!initialDomInstalled);
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const [gatewayMode, setGatewayMode] = useState('setup'); // 'setup' | 'telemetry'
  const [targetMeta, setTargetMeta] = useState({});

  const relayRef = useRef(null);
  const pendingActionRef = useRef(null);
  const [skippedExtension, setSkippedExtension] = useState(() => {
    try { return localStorage.getItem(SKIP_EXTENSION_KEY) === '1'; } catch (e) { return false; }
  });
  const ready = Boolean(ext.installed || ext.connected || skippedExtension);
  const readyRef = useRef(ready);
  readyRef.current = ready;

  const fetchServerStatus = useCallback(async () => {
    try {
      const userId = getUserId();
      const headers = buildHeaders();
      if (userId) headers['x-user-id'] = userId;
      const res = await fetch(`${API_URL}/scrape/extension-status`, { headers });
      if (!res.ok) return null;
      const data = await res.json();
      setExt(prev => ({
        ...prev,
        connected: Boolean(data?.connected || prev.connected),
        extensionOnly: Boolean(data?.extensionOnly),
        storeUrl: data?.storeUrls?.[userBrowser?.slug] || data?.storeUrl || prev.storeUrl,
        capabilities: data?.capabilities?.length ? data.capabilities : prev.capabilities,
        relayed: data?.relayedTotal ?? prev.relayed,
        version: data?.version || prev.version
      }));
      return data;
    } catch (e) {
      return null;
    }
  }, []);

  useEffect(() => {
    const userId = getUserId();
    const headers = buildHeaders();

    relayRef.current = startRelayAgent({
      apiBase: API_URL,
      userId,
      headers,
      onStatus: (status) => {
        setChecking(false);
        setExt(prev => ({
          ...prev,
          installed: Boolean(status.installed || prev.installed),
          version: status.version || prev.version,
          connected: Boolean(status.connected),
          paired: Boolean(status.paired),
          relayed: status.relayed ?? prev.relayed,
          capabilities: status.capabilities?.length ? status.capabilities : prev.capabilities,
          lastError: status.lastError || ''
        }));
      }
    });

    fetchServerStatus();

    const onWindowMsg = (ev) => {
      if (ev.source !== window || !ev.data) return;
      if (ev.data.source === 'SCRAPER_RAM_EXTENSION' && (ev.data.type === 'SCRAPER_EXT_PONG' || ev.data.type === 'SCRAPER_EXT_STATE')) {
        const s = ev.data.state || ev.data;
        setChecking(false);
        setExt(prev => ({
          ...prev,
          installed: true,
          version: String(s?.version || prev.version || '1.1.0'),
          paired: Boolean(s?.paired ?? prev.paired),
          capabilities: Array.isArray(s?.capabilities) && s.capabilities.length ? s.capabilities : prev.capabilities
        }));
        relayRef.current?.poke?.();
      }
    };

    const onFocus = () => {
      fetchServerStatus();
      relayRef.current?.poke?.();
    };

    window.addEventListener('message', onWindowMsg);
    window.addEventListener('focus', onFocus);

    const onCustomReady = (e) => {
      const ver = e?.detail?.version || '1.2.0';
      setChecking(false);
      setExt(prev => ({ ...prev, installed: true, version: ver, connected: true }));
    };
    window.addEventListener('scraper-extension-ready', onCustomReady);

    const stopTimer = setTimeout(() => setChecking(false), 1200);

    return () => {
      clearTimeout(stopTimer);
      window.removeEventListener('scraper-extension-ready', onCustomReady);
      window.removeEventListener('message', onWindowMsg);
      window.removeEventListener('focus', onFocus);
      relayRef.current?.stop?.();
      relayRef.current = null;
    };
  }, [fetchServerStatus]);

  useEffect(() => {
    if (ready) {
      try { localStorage.setItem(VERIFIED_KEY, '1'); } catch (e) {}
    }
  }, [ready]);

  // Auto-proceed immediately when the user loads the extension while Setup Modal is open.
  useEffect(() => {
    if (!gatewayOpen || gatewayMode !== 'setup' || !ready) return undefined;
    const t = setTimeout(() => {
      const fn = pendingActionRef.current;
      pendingActionRef.current = null;
      setGatewayOpen(false);
      if (typeof fn === 'function') fn();
    }, 650);
    return () => clearTimeout(t);
  }, [gatewayOpen, gatewayMode, ready]);

  const completeProceed = useCallback(() => {
    const fn = pendingActionRef.current;
    pendingActionRef.current = null;
    setGatewayOpen(false);
    if (typeof fn === 'function') fn();
  }, []);

  const openTelemetry = useCallback(() => {
    setGatewayMode('telemetry');
    setGatewayOpen(true);
  }, []);

  const openSetup = useCallback((meta = {}, pendingFn = null) => {
    pendingActionRef.current = typeof pendingFn === 'function' ? pendingFn : null;
    setTargetMeta(meta || {});
    setGatewayMode('setup');
    setGatewayOpen(true);
  }, []);

  const closeGateway = useCallback(() => {
    pendingActionRef.current = null;
    setGatewayOpen(false);
  }, []);

  const skipAndRunLocal = useCallback(() => {
    try { localStorage.setItem(SKIP_EXTENSION_KEY, '1'); } catch (e) {}
    readyRef.current = true;
    setSkippedExtension(true);
    setGatewayOpen(false);
    const fn = pendingActionRef.current;
    pendingActionRef.current = null;
    if (typeof fn === 'function') fn();
  }, []);

  const resetLocalMode = useCallback(() => {
    try { localStorage.removeItem(SKIP_EXTENSION_KEY); } catch (e) {}
    setSkippedExtension(false);
  }, []);

  /**
   * Ensures the extension is installed & active before continuing.
   * CRITICAL INVARIANT: If the extension is already installed OR connected,
   * executes `onReady()` immediately with ZERO modal prompt.
   */
  const ensureConnected = useCallback(async (onReady, meta = {}) => {
    if (readyRef.current || Boolean(document.documentElement?.dataset?.scraperExtension)) {
      try { localStorage.setItem(VERIFIED_KEY, '1'); } catch (e) {}
      relayRef.current?.poke?.();
      if (typeof onReady === 'function') await onReady();
      return true;
    }

    let hadPrevious = false;
    try { hadPrevious = localStorage.getItem(VERIFIED_KEY) === '1'; } catch (e) {}

    const [detected, srv] = await Promise.all([
      detectExtension(hadPrevious ? 900 : 450),
      fetchServerStatus()
    ]);

    if (detected?.installed || srv?.connected || Boolean(document.documentElement?.dataset?.scraperExtension)) {
      try { localStorage.setItem(VERIFIED_KEY, '1'); } catch (e) {}
      readyRef.current = true;
      setExt(prev => ({
        ...prev,
        installed: Boolean(detected?.installed || prev.installed),
        connected: Boolean(srv?.connected || prev.connected),
        version: detected?.version || srv?.version || prev.version
      }));
      if (detected?.installed && !detected?.paired) {
        pairExtension({
          serverBase: window.location.origin,
          apiBase: API_URL,
          userId: getUserId()
        }).catch(() => {});
      }
      relayRef.current?.poke?.();
      if (typeof onReady === 'function') await onReady();
      return true;
    }

    // 1-click easy scraping mode: run immediately on server engine when extension isn't installed yet
    if (EASY_SCRAPE_MODE && !srv?.extensionOnly) {
      readyRef.current = true;
      setSkippedExtension(true);
      if (typeof onReady === 'function') await onReady();
      return true;
    }

    openSetup(meta, onReady);
    return false;
  }, [fetchServerStatus, openSetup]);

  const value = useMemo(() => ({
    ...ext,
    userBrowser,
    ready,
    checking,
    hardware,
    isMaster: false,
    gatewayOpen,
    gatewayMode,
    targetMeta,
    skippedExtension,
    skipAndRunLocal,
    resetLocalMode,
    ensureConnected,
    openTelemetry,
    openSetup,
    closeGateway,
    completeProceed,
    refreshStatus: fetchServerStatus
  }), [
    ext, userBrowser, ready, checking, hardware, gatewayOpen, gatewayMode, targetMeta,
    skippedExtension, skipAndRunLocal, resetLocalMode,
    ensureConnected, openTelemetry, openSetup, closeGateway, completeProceed, fetchServerStatus
  ]);

  return (
    <ExtensionContext.Provider value={value}>
      {children}
      <ExtensionGatewayModal />
    </ExtensionContext.Provider>
  );
}

export function useExtension() {
  const ctx = useContext(ExtensionContext);
  return ctx || DEFAULT_EXTENSION_CONTEXT;
}
