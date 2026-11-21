import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState
} from 'react';
import { API_URL } from '../../apiConfig';
import { authHeaders, getSession } from '../auth';
import { detectDeviceHardware } from '../utils/deviceRamEngine';
import { detectExtension, pairExtension, startRelayAgent } from '../utils/relayAgent';
import ExtensionGatewayModal from '../components/modals/ExtensionGatewayModal';

const VERIFIED_KEY = 'scraper_master_ext_verified_v1';

const ExtensionContext = createContext(null);

function resolveMasterUserId() {
  try {
    const session = getSession();
    return session?.userId || session?.user?.id || 'master';
  } catch (e) {
    return 'master';
  }
}

export function ExtensionProvider({ children }) {
  const hardware = useMemo(() => detectDeviceHardware(), []);
  const initialDomInstalled = typeof document !== 'undefined' && Boolean(document.documentElement?.dataset?.scraperExtension);

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
  const ready = Boolean(ext.installed || ext.connected);
  const readyRef = useRef(ready);
  readyRef.current = ready;

  const fetchServerStatus = useCallback(async () => {
    try {
      const userId = resolveMasterUserId();
      const headers = { ...authHeaders() };
      if (userId) headers['x-user-id'] = userId;
      const res = await fetch(`${API_URL}/scrape/extension-status`, { headers });
      if (!res.ok) return null;
      const data = await res.json();
      setExt(prev => ({
        ...prev,
        connected: Boolean(data?.connected || prev.connected),
        extensionOnly: Boolean(data?.extensionOnly),
        storeUrl: data?.storeUrl || prev.storeUrl,
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
    const userId = resolveMasterUserId();
    const headers = authHeaders();

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

    const stopTimer = setTimeout(() => setChecking(false), 1200);

    return () => {
      clearTimeout(stopTimer);
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
          userId: resolveMasterUserId()
        }).catch(() => {});
      }
      relayRef.current?.poke?.();
      if (typeof onReady === 'function') await onReady();
      return true;
    }

    openSetup(meta, onReady);
    return false;
  }, [fetchServerStatus, openSetup]);

  const value = useMemo(() => ({
    ...ext,
    ready,
    checking,
    hardware,
    isMaster: true,
    gatewayOpen,
    gatewayMode,
    targetMeta,
    ensureConnected,
    openTelemetry,
    openSetup,
    closeGateway,
    completeProceed,
    refreshStatus: fetchServerStatus
  }), [
    ext, ready, checking, hardware, gatewayOpen, gatewayMode, targetMeta,
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
  return useContext(ExtensionContext);
}
