import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, BarChart3, Check, CheckCircle2, CheckSquare, ChevronDown, Clock, Compass,
  ChevronLeft, ChevronRight, CircleDot, Copy, Cpu, Crosshair, Database, Download,
  ExternalLink, FileSpreadsheet, FileText, Filter, FolderArchive, Globe2, Layers, LayoutDashboard,
  Loader2, MapPin, MessageSquare, Phone, PhoneCall, Play, Radar as RadarIcon,
  RefreshCw, Search, SlidersHorizontal, Smartphone, Sparkles, Square, Star, Settings,
  Table2, Tag, Trash2, Users, Wifi, WifiOff, X, Zap, Edit3, GitMerge,
  Volume2, VolumeX, Lock, ShieldAlert, Maximize2, Minimize2
} from 'lucide-react';
import { motion } from 'framer-motion';
import CommandMap from './CommandMap';
import VendorDrawer from './VendorDrawer';
import SearchConsole from './SearchConsole';
import NotificationBell from './NotificationBell';
import CountryFlagStrip from './components/CountryFlagStrip';
import DeepJobsView from './components/views/DeepJobsView';
import TrashModal from './components/TrashModal';
import { findCountry } from './data/countries';
import { CRM_STAGES, crmStageOf, formatInr } from './utils/leadStages';
import {
  deepExtractVendor, getDeepJob, getDeepJobs, getEstimate, getHealth,
  getScrapeJobs, getSessions, getSessionVault, getVendors, sessionExportUrl,
  startAuto, startDeepBatch, startOmni, stopAllScrapes, stopDeepJob, resumeDeepJob, updateVendorCrm, streamUrl, fallbackStreamUrl,
  deleteSession, renameSession, mergeSessions, batchDeleteSessions
} from './api';
import {
  Logo, ScoreRing, StatusPill, cx, formatDuration, formatNumber,
  relativeTime
} from './ui';
import { getDisplayPhone, isMobilePhone, parseAdaptivePhone, whatsappNumber, classifyPhone } from '../utils/phoneClassify';
import { createLiveStream } from './liveStream';
import { IS_DESKTOP, HOME_ROUTE } from '../desktop';
import DesktopBadge from './DesktopBadge';
import { exportLeadsToVcf } from '../utils/whatsappCatalog';
import { leadSourceMeta, listLeadSources, downloadLeadCsv } from './utils/leadSource';

// Modular components
import RunCard from './components/cards/RunCard';
import { MetricCard, ToggleTile, VendorAvatar, EmptyState, MapLegend, DeepJobRow, vendorInitial, hasValidLogo } from './components/cards/MetricCard';
import FilterBar from './components/cards/FilterBar';
import RenameModal from './components/modals/RenameModal';
import MergeModal from './components/modals/MergeModal';
import CockpitFolderRow from './components/CockpitView/CockpitFolderRow';
import CockpitView from './components/CockpitView/CockpitView';
import FolderView from './components/FolderView/FolderView';
import LeadsTableView from './components/views/LeadsTableView';
import AccountMenu from './components/AccountMenu';
import RetroDigitalTimer from './components/RetroDigitalTimer';
import SystemCheckPill from './components/SystemCheckPill';
import { API_URL } from '../apiConfig';
import { getUserId } from '../utils/sessionManager';
import { getToken } from './auth';
import {
  startBrowserRamAssist, detectDeviceHardware, detectRamExtension,
  DEVICE_REQUIREMENTS, ALL_BUILTIN_ENGINES, EXTENSION_DOWNLOAD_URL
} from './utils/deviceRamEngine';
import { startRelayAgent } from './utils/relayAgent';
import { extractLeadArea, CarriedBadge, qualityOf, calculateHaversineKm, mergeSingleVendor, mergeVendorLists } from './utils/leadHelpers';

const LAST_LIVE_SESSION_KEY = 'scraper_client_last_live_session';

function readLastLiveSession() {
  try { return localStorage.getItem(LAST_LIVE_SESSION_KEY) || ''; } catch (e) { return ''; }
}

function persistLastLiveSession(sid) {
  try {
    if (sid) localStorage.setItem(LAST_LIVE_SESSION_KEY, sid);
    else localStorage.removeItem(LAST_LIVE_SESSION_KEY);
  } catch (e) {}
}

const STRATEGIES = ['broad', 'smart', 'strict'];
const SORTS = [
  ['newest', 'Newest first'],
  ['rating', 'Highest rating'],
  ['reviews', 'Most reviews'],
  ['quality', 'Best profile'],
  ['name', 'Name A–Z']
];

const TAB_ALIASES = {
  cockpit: 'cockpit',
  workspace: 'cockpit',
  home: 'cockpit',
  overview: 'cockpit',
  insights: 'cockpit',
  analytics: 'cockpit',
  leads: 'leads',
  map: 'map',
  crm: 'crm',
  folders: 'runs',
  runs: 'runs',
  deep: 'deep'
};

function tabFromUrl(value) {
  return TAB_ALIASES[String(value || '').toLowerCase()] || 'cockpit';
}

function urlFromTab(tab) {
  return tab === 'runs' ? 'folders' : tab;
}




// Addresses often repeat the same part ("Troy, Troy, Ny, Ny"). Keep the first
// mention of each part so the column reads cleanly at any width.
function dedupeAddress(value) {
  const seen = new Set();
  return String(value || '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .filter(part => {
      const lower = part.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    })
    .join(', ');
}
export default function CommandCenter() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [health, setHealth] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [deepJobs, setDeepJobs] = useState([]);
  const [activeTab, setActiveTabState] = useState(() => tabFromUrl(searchParams.get('tab')));
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [trashOpen, setTrashOpen] = useState(false);

  // Enforce natural vertical scrolling on Dashboard canvas
  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowY = 'auto';
    document.body.style.overflowX = 'hidden';
    document.body.style.height = 'auto';
    return () => {
      document.documentElement.style.overflowY = '';
      document.documentElement.style.overflowX = '';
      document.body.style.overflowY = '';
      document.body.style.overflowX = '';
      document.body.style.height = '';
    };
  }, []);

  // Tab state is mirrored to the URL. This keeps deep links, refreshes and the
  // browser back button working across the merged workspace.
  const setActiveTab = useCallback(tab => {
    const next = tab || 'cockpit';
    setActiveTabState(next);
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('tab', urlFromTab(next));
      return params;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    const fromUrl = tabFromUrl(searchParams.get('tab'));
    setActiveTabState(prev => (prev === fromUrl ? prev : fromUrl));
  }, [searchParams]);

  useEffect(() => {
    const onDown = event => {
      if (toolsRef.current && !toolsRef.current.contains(event.target)) setToolsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  const [logs, setLogs] = useState(['[BOOT] command center initialised.', '[WAIT] connecting to backend signal…']);
  const [sseStatus, setSseStatus] = useState('connecting');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectStreamRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [runLeadCount, setRunLeadCount] = useState(0);
  const [run, setRun] = useState(null);
  const [deepJob, setDeepJob] = useState(null);
  const [vendorJobs, setVendorJobs] = useState({});
  const [now, setNow] = useState(Date.now());
  const [crmSavingId, setCrmSavingId] = useState('');
  const [folderView, setFolderView] = useState(null);
  const [folderLoading, setFolderLoading] = useState('');
  const [folderSearch, setFolderSearch] = useState('');
  const [folderCity, setFolderCity] = useState('all');
  const [folderSort, setFolderSort] = useState('newest');
  const [selectedFolderIds, setSelectedFolderIds] = useState(new Set());
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  const [form, setForm] = useState({
    category: '',
    location: '',
    strategy: 'broad',
    targetLeads: 100,
    serp: true,
    maps: true,
    ai: false,
    justdial: true,
    indiamart: true,
    weddings: true,
    social: true,
    postWebsite: true,
    postDeep: true,
    deepLimit: 100
  });

  const hardware = useMemo(() => detectDeviceHardware(), []);
  const [hwTurboEnabled, setHwTurboEnabled] = useState(true);
  const [hwPopupOpen, setHwPopupOpen] = useState(() => {
    try { return localStorage.getItem('scraper_hw_popup_seen_v2') !== 'true'; } catch (e) { return true; }
  });
  const [extState, setExtState] = useState({
    installed: false,
    version: '',
    connected: false,
    paired: false,
    relayed: 0,
    capabilities: [],
    extensionOnly: false,
    storeUrl: '',
    lastError: ''
  });
  const relayRef = useRef(null);

  useEffect(() => {
    const userId = getUserId();
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    relayRef.current = startRelayAgent({
      apiBase: API_URL,
      userId,
      headers,
      onStatus: (status) => {
        setExtState(prev => ({
          ...prev,
          installed: status.installed,
          version: status.version || prev.version,
          connected: status.connected,
          paired: status.paired,
          relayed: status.relayed ?? prev.relayed,
          capabilities: status.capabilities || prev.capabilities,
          lastError: status.lastError || ''
        }));
      }
    });

    let active = true;
    const readServer = async () => {
      try {
        const res = await fetch(`${API_URL}/scrape/extension-status`, { headers });
        if (!res.ok || !active) return;
        const data = await res.json();
        setExtState(prev => ({
          ...prev,
          extensionOnly: Boolean(data?.extensionOnly),
          storeUrl: data?.storeUrl || prev.storeUrl,
          capabilities: data?.capabilities?.length ? data.capabilities : prev.capabilities,
          relayed: data?.relayedTotal ?? prev.relayed
        }));
      } catch (e) { /* server offline; the agent keeps retrying */ }
    };
    readServer();

    return () => {
      active = false;
      relayRef.current?.stop?.();
      relayRef.current = null;
    };
  }, []);
  const enableLocalHardwareTurbo = useCallback(() => {
    setHwTurboEnabled(true);
    setHwPopupOpen(false);
    try {
      localStorage.setItem('scraper_hw_popup_seen_v2', 'true');
    } catch (e) {}
    if (extState.connected) {
      toast.success(`RAM Turbo connected · ${hardware.ramGb} GB · ${hardware.parallelZones} lanes`, { icon: '⚡' });
    } else {
      toast.error('Add RAM Turbo to Chrome, then reload. It connects itself.', { icon: '🔌' });
    }
  }, [hardware.ramGb, hardware.parallelZones, extState.connected]);

  // Country context for the flag bar. India is home; every other country runs
  // the keyless global engines. The choice only pre-fills an empty location box,
  // so a user can still type any city and let the engine detect the country.
  const [searchCountry, setSearchCountry] = useState(() => {
    const fromUrl = searchParams.get('country');
    if (fromUrl) return String(fromUrl).toUpperCase();
    try { return localStorage.getItem('scraper-country') || 'IN'; } catch (e) { return 'IN'; }
  });
  // Filled by CountryFlagStrip after it reads /api/sources?country=XX. It carries
  // the country's own admin vocabulary (Province → Census division → City, …).
  const [countryMeta, setCountryMeta] = useState(null);

  const handleCountrySelect = useCallback((code, country) => {
    setSearchCountry(code);
    try { localStorage.setItem('scraper-country', code); } catch (e) { }
    if (country?.name) toast.success(`${country.name} selected. Type a city or town there to search.`, { icon: '🌍' });
    setForm(prev => {
      if (prev.location && prev.location.trim()) return prev;
      return { ...prev, location: code === 'IN' ? '' : (country?.name || '') };
    });
  }, []);

  // The default flow is one free-text query. Category, engines, zones and
  // post-run deep extraction are resolved server-side by the category router.
  const [runMode, setRunMode] = useState('auto');
  const [autoQuery, setAutoQuery] = useState(
    routerLocation.state?.query || searchParams.get('q') || ''
  );
  const [activeZone, setActiveZone] = useState(null);
  const [hopTransition, setHopTransition] = useState('');
  const [jumpTrail, setJumpTrail] = useState(null);
  const [gridZones, setGridZones] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [mascotAlert, setMascotAlert] = useState(null);

  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(true);
  const [estimateError, setEstimateError] = useState('');
  const [deepEstimate, setDeepEstimate] = useState(null);
  const [scanPlan, setScanPlan] = useState(null);

  const [filters, setFilters] = useState({
    query: '',
    phoneOnly: false,
    primeOnly: false,
    websiteOnly: false,
    deepOnly: false,
    conflictsOnly: false,
    minRating: 0,
    sort: 'newest',
    source: 'all'
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sessionFilter, setSessionFilter] = useState(() => readLastLiveSession());
  const [freshLeadIds, setFreshLeadIds] = useState(() => new Set());
  const [phoneJustFoundIds, setPhoneJustFoundIds] = useState(() => new Set());

  const [launching, setLaunching] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [batchStarting, setBatchStarting] = useState(false);
  const [batchConfig, setBatchConfig] = useState({ limit: 100, website: true, google: true });

  const mountedRef = useRef(true);
  const runRef = useRef(null);
  const runVendorIdsRef = useRef(new Set());
  const activeSessionIdRef = useRef(readLastLiveSession());
  const sessionFilterRef = useRef(sessionFilter);
  const searchCountryRef = useRef(searchCountry);
  const freshTimersRef = useRef(new Map());
  const phoneTimersRef = useRef(new Map());
  const lastEventRef = useRef(Date.now());
  const finishingRef = useRef(false);
  const deepJobRef = useRef(null);
  const ramAssistStopRef = useRef(null);

  useEffect(() => { sessionFilterRef.current = sessionFilter; }, [sessionFilter]);
  useEffect(() => { searchCountryRef.current = searchCountry; }, [searchCountry]);

  const markFreshLeads = useCallback((ids = []) => {
    const valid = ids.filter(Boolean);
    if (!valid.length || !mountedRef.current) return;
    setFreshLeadIds(prev => {
      const next = new Set(prev);
      for (const id of valid) next.add(id);
      return next;
    });
    for (const id of valid) {
      const prevTimer = freshTimersRef.current.get(id);
      if (prevTimer) clearTimeout(prevTimer);
      const t = setTimeout(() => {
        freshTimersRef.current.delete(id);
        if (!mountedRef.current) return;
        setFreshLeadIds(prev => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 1700);
      freshTimersRef.current.set(id, t);
    }
  }, []);

  const markPhoneFound = useCallback((ids = []) => {
    const valid = ids.filter(Boolean);
    if (!valid.length || !mountedRef.current) return;
    setPhoneJustFoundIds(prev => {
      const next = new Set(prev);
      for (const id of valid) next.add(id);
      return next;
    });
    for (const id of valid) {
      const prevTimer = phoneTimersRef.current.get(id);
      if (prevTimer) clearTimeout(prevTimer);
      const t = setTimeout(() => {
        phoneTimersRef.current.delete(id);
        if (!mountedRef.current) return;
        setPhoneJustFoundIds(prev => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 2400);
      phoneTimersRef.current.set(id, t);
    }
  }, []);

  const clearAnimationHighlights = useCallback(() => {
    for (const t of freshTimersRef.current.values()) clearTimeout(t);
    for (const t of phoneTimersRef.current.values()) clearTimeout(t);
    freshTimersRef.current.clear();
    phoneTimersRef.current.clear();
    setFreshLeadIds(new Set());
    setPhoneJustFoundIds(new Set());
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const t of freshTimersRef.current.values()) clearTimeout(t);
      for (const t of phoneTimersRef.current.values()) clearTimeout(t);
      try { ramAssistStopRef.current?.(); } catch (e) {}
    };
  }, []);

  const progressRef = useRef(null);
  useEffect(() => { runRef.current = run; }, [run]);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { deepJobRef.current = deepJob; }, [deepJob]);

  // On mount: detect if an active scrape session is already running on the server
  // and rehydrate run state so the STOP button stays persistently armed even after page refresh.
  useEffect(() => {
    let active = true;
    async function rehydrateRunningSession() {
      try {
        const jobs = await getScrapeJobs();
        if (!active || !mountedRef.current) return;
        const list = Array.isArray(jobs)
          ? jobs
          : Array.isArray(jobs?.omniJobs) ? jobs.omniJobs : [];
        const runningJob = list.find(job => (job.status === 'running' || job.sessionActive === true) && !job.finishedAt);
        if (runningJob) {
          const sid = runningJob.id || runningJob.sessionId;
          activeSessionIdRef.current = sid;
          setSessionFilter(sid);
          persistLastLiveSession(sid);
          setScanning(true);
          setRun(prev => {
            if (prev && prev.status === 'running') return prev;
            return {
              id: sid,
              sessionId: sid,
              category: runningJob.category || 'Vendors',
              location: runningJob.location || '',
              familyLabel: runningJob.category || 'Auto',
              status: 'running',
              startedAt: runningJob.startTime || Date.now(),
              totalMandalsAcrossAll: runningJob.totalCount || 1,
              completedMandals: runningJob.completedCount || 0
            };
          });
          setProgress(prev => prev || {
            sessionId: sid,
            overallCompletedMandals: runningJob.completedCount || 0,
            totalMandalsAcrossAll: runningJob.totalCount || 1,
            activeMandal: runningJob.activeMandal || 'Scanning',
            etaText: runningJob.etaText || '',
            sessionActive: true
          });
          setActiveTab('cockpit');
        } else {
          // Restore last completed or stopped scrape session so its leads stay pinned across reload
          const lastSid = readLastLiveSession();
          if (lastSid) {
            activeSessionIdRef.current = lastSid;
            setSessionFilter(lastSid);
            try {
              const vault = await getSessionVault(lastSid);
              if (active && mountedRef.current && vault) {
                if (Array.isArray(vault.leads) && vault.leads.length > 0) {
                  setVendors(prev => mergeVendorLists(prev, vault.leads, { countryHint: searchCountryRef.current }));
                }
                setRun(prev => prev || {
                  id: lastSid,
                  sessionId: lastSid,
                  category: vault.category || 'Businesses',
                  location: vault.location || '',
                  status: vault.metadata?.status === 'aborted' ? 'stopped' : 'complete',
                  finishedAt: Date.now()
                });
              }
            } catch (e) {}
          }
        }
      } catch (e) { /* ignore */ }
    }
    rehydrateRunningSession();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadVendors = useCallback(async (explicitSid = null) => {
    const cleanSid = typeof explicitSid === 'string' ? explicitSid.trim() : '';
    const targetSid = cleanSid || activeSessionIdRef.current || sessionFilterRef.current || '';
    try {
      let data = await getVendors(targetSid ? { sessionId: targetSid } : {});
      if (targetSid && (!Array.isArray(data) || data.length === 0) && runRef.current?.status !== 'running') {
        try {
          const vault = await getSessionVault(targetSid);
          if (Array.isArray(vault?.leads) && vault.leads.length > 0) {
            data = vault.leads;
          }
        } catch (e) {}
      }
      if (mountedRef.current && Array.isArray(data)) {
        setVendors(prev => mergeVendorLists(prev, data, { countryHint: searchCountryRef.current }));
      }
      return data;
    } catch (error) {
      return [];
    }
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      const data = await getHealth();
      if (mountedRef.current) setHealth(data);
      return data;
    } catch (error) {
      if (mountedRef.current) setHealth(null);
      return null;
    }
  }, []);

  const refresh = useCallback(async (explicitSid = null) => {
    await Promise.allSettled([loadVendors(explicitSid), loadHealth()]);
    try {
      const [sessionData, deepData] = await Promise.all([
        getSessions(), getDeepJobs()
      ]);
      if (!mountedRef.current) return;
      setSessions(sessionData || []);
      setDeepJobs(deepData || []);
      const runningDeep = (deepData || []).find(job => ['queued', 'running', 'stopping'].includes(job.status));
      if (runningDeep && !deepJobRef.current) setDeepJob(runningDeep);
    } catch (error) {
      // Keep the last good state.
    }
  }, [loadVendors, loadHealth]);

  useEffect(() => {
    refresh();
    const folderRetry = setTimeout(() => { refresh(); }, 1800);
    const id = setInterval(() => {
      getDeepJobs().then(deepData => {
        if (!mountedRef.current) return;
        setDeepJobs(deepData || []);
      }).catch(() => { });
    }, 9000);
    return () => {
      clearTimeout(folderRetry);
      clearInterval(id);
    };
  }, [refresh]);

  // Live estimate. Auto mode parses the free-text query server-side, so the
  // same sentence that starts a run also drives the pre-flight numbers.
  useEffect(() => {
    const timer = setTimeout(async () => {
      const auto = runMode === 'auto';
      if (auto && !autoQuery.trim()) {
        setEstimating(false);
        return;
      }
      if (!auto && !form.location.trim()) {
        setEstimating(false);
        return;
      }

      const engines = ['auto'];

      setEstimating(true);
      setEstimateError('');
      try {
        const data = await getEstimate(auto
          ? {
            query: autoQuery,
            strategy: form.strategy,
            targetLeads: form.targetLeads,
            engines: ['auto']
          }
          : {
            category: form.category || 'Business',
            location: form.location,
            strategy: form.strategy,
            targetLeads: form.targetLeads,
            engines
          });
        if (mountedRef.current) setEstimate(data);
      } catch (error) {
        if (mountedRef.current) setEstimateError('Estimator offline. Check the backend on port 5002.');
      } finally {
        if (mountedRef.current) setEstimating(false);
      }
    }, 420);
    return () => clearTimeout(timer);
  }, [
    runMode, autoQuery, form.category, form.location, form.strategy,
    form.targetLeads, form.serp, form.maps, form.postWebsite, form.postDeep
  ]);

  // Ergonomic keyboard navigation shortcuts:
  // Press '/' anywhere to focus search. Press 'Escape' to dismiss modals / drawer.
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        const searchInput = document.getElementById('cmd-console-query');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } else if (e.key === 'Escape') {
        setSelectedVendor(null);
        setTrashOpen(false);
        setToolsOpen(false);
        setMergeOpen(false);
        setRenameTarget(null);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const unextracted = vendors.filter(vendor => !vendor.deepExtractedAt).length;
    setDeepEstimate({
      count: unextracted,
      seconds: Math.ceil(Math.max(1, unextracted) / 2) * 22,
      label: formatDuration(Math.ceil(Math.max(1, unextracted) / 2) * 22)
    });
  }, [vendors]);

  // SSE: logs, vendor events, progress.
  useEffect(() => {
    let flushTimer;
    const vendorBuffer = [];
    const logBuffer = [];

    const pushLog = line => {
      if (!line) return;
      logBuffer.push(typeof line === 'string' ? line : JSON.stringify(line));
      lastEventRef.current = Date.now();
    };

    let microFlushTimer = null;
    const flushBuffers = () => {
      if (vendorBuffer.length) {
        const incoming = vendorBuffer.splice(0, vendorBuffer.length);
        const newArrivalIds = [];
        const upgradedPhoneIds = [];

        setVendors(prev => {
          const map = new Map(prev.map(vendor => [vendor.id, vendor]));
          const existingIds = prev.map(vendor => vendor.id);
          const freshIds = [];
          let hasChanges = false;
          const countryHint = searchCountryRef.current || 'IN';

          incoming.forEach(v => {
            if (!v || !v.id) return;
            const existing = map.get(v.id);
            if (existing) {
              const prevPhone = getDisplayPhone(existing);
              const wasMob = isMobilePhone(prevPhone, existing.country || countryHint);
              const merged = mergeSingleVendor(existing, v, countryHint);
              const nextPhone = getDisplayPhone(merged);
              const nowMob = isMobilePhone(nextPhone, merged.country || countryHint);
              if ((!prevPhone && nextPhone) || (!wasMob && nowMob)) {
                upgradedPhoneIds.push(v.id);
              }
              map.set(v.id, merged);
              hasChanges = true;
            } else {
              map.set(v.id, v);
              freshIds.push(v.id);
              newArrivalIds.push(v.id);
              hasChanges = true;
            }
          });
          if (!hasChanges) return prev;
          const fullOrder = Array.from(new Set([...freshIds, ...existingIds]));
          return fullOrder.map(id => map.get(id)).filter(Boolean);
        });

        if (newArrivalIds.length) markFreshLeads(newArrivalIds);
        if (upgradedPhoneIds.length) markPhoneFound(upgradedPhoneIds);
      }
      if (logBuffer.length) {
        const incoming = logBuffer.splice(0, logBuffer.length);
        setLogs(prev => [...prev, ...incoming].slice(-400));
      }
    };

    const scheduleMicroFlush = () => {
      if (microFlushTimer) return;
      microFlushTimer = setTimeout(() => {
        microFlushTimer = null;
        flushBuffers();
      }, 24);
    };

    // A fresh EventSource is created on every reconnect, so the data handlers
    // are bound each time. Transport, backoff and liveness live in
    // createLiveStream — the old code never reconnected at all.
    const bindSource = es => {
      es.addEventListener('init', event => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) setLogs(data.slice(-400));
        } catch (error) { /* ignore */ }
      });

      es.addEventListener('vendor', event => {
        try {
          const payload = JSON.parse(event.data);
          const vendor = payload?.vendor;
          if (!vendor || !vendor.id) return;
          if (payload.action === 'out-of-bounds') return;
          lastEventRef.current = Date.now();
          if (!vendor.scrapedAt) vendor.scrapedAt = new Date().toISOString();

          const activeSid = activeSessionIdRef.current || runRef.current?.sessionId || runRef.current?.id || sessionFilterRef.current;
          const incomingSid = vendor.sessionId || vendor.lastSessionId;
          const belongsToActive = Boolean(
            activeSid && (
              !incomingSid
              || incomingSid === activeSid
              || (Array.isArray(vendor.sessionIds) && vendor.sessionIds.includes(activeSid))
            )
          );

          // STRICT SESSION GUARD: Drop foreign vendors belonging to another session
          if (!belongsToActive && incomingSid && activeSid) {
            return;
          }

          if (belongsToActive) {
            vendor.sessionId = activeSid;
            vendor.lastSessionId = activeSid;
            vendor.sessionIds = Array.isArray(vendor.sessionIds)
              ? Array.from(new Set([...vendor.sessionIds, activeSid]))
              : [activeSid];
            if (runRef.current?.status === 'running' || activeSessionIdRef.current === activeSid) {
              runVendorIdsRef.current.add(vendor.id);
              setRunLeadCount(runVendorIdsRef.current.size);
            }
          }
          vendorBuffer.push(vendor);
          pushLog(`[LEAD] ${vendor.name || vendor.id} · ${vendor.phone || 'no phone'} · ${vendor.city || vendor.village || 'location unknown'}`);
          scheduleMicroFlush();
        } catch (error) { /* ignore */ }
      });

      es.addEventListener('progress', event => {
        try {
          const data = JSON.parse(event.data);
          lastEventRef.current = Date.now();
          if (data?.sessionId && activeSessionIdRef.current && data.sessionId !== activeSessionIdRef.current) {
            return;
          }
          setProgress(data);
          if (typeof data?.sessionActive === 'boolean') {
            if (activeSessionIdRef.current) {
              setScanning(Boolean(data.sessionActive));
            }
          }
          if (data?.activeZone) {
            const nextZoneName = data.activeZone.name || data.activeZone.zoneName;
            setActiveZone(prev => {
              const prevName = prev?.name || prev?.zoneName;
              if (nextZoneName && prevName && prevName !== nextZoneName) {
                setHopTransition(`${prevName} → ${nextZoneName}`);
                if (Number.isFinite(Number(prev?.lat)) && Number.isFinite(Number(prev?.lng)) && Number.isFinite(Number(data.activeZone.lat)) && Number.isFinite(Number(data.activeZone.lng))) {
                  setJumpTrail({
                    from: [Number(prev.lat), Number(prev.lng)],
                    to: [Number(data.activeZone.lat), Number(data.activeZone.lng)],
                    fromName: prevName,
                    toName: nextZoneName
                  });
                }
              }
              return {
                ...(prev || {}),
                ...data.activeZone,
                name: nextZoneName || prev?.name,
                lat: Number.isFinite(Number(data.activeZone.lat)) ? Number(data.activeZone.lat) : prev?.lat,
                lng: Number.isFinite(Number(data.activeZone.lng)) ? Number(data.activeZone.lng) : prev?.lng,
                radiusKm: Number(data.activeZone.radiusKm) || 3.5,
                index: data.activeZone.index || prev?.index || 1
              };
            });
          } else if (data?.activeMandal) {
            const zName = data.activeMandal;
            const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanTarget = norm(zName);
            setGridZones(currentGrid => {
              const matched = currentGrid.find(z => norm(z.zoneName || z.name) === cleanTarget);
              if (matched && Number.isFinite(Number(matched.lat)) && Number.isFinite(Number(matched.lng))) {
                setActiveZone({
                  name: matched.zoneName || matched.name || zName,
                  lat: Number(matched.lat),
                  lng: Number(matched.lng),
                  radiusKm: Number(matched.radiusKm) || 3.5,
                  index: matched.index || 1
                });
              } else {
                setActiveZone(prev => ({
                  name: zName,
                  lat: prev?.name === zName ? prev?.lat : undefined,
                  lng: prev?.name === zName ? prev?.lng : undefined
                }));
              }
              return currentGrid;
            });
          }
        } catch (error) { /* ignore */ }
      });

      es.addEventListener('dispatch_targets', event => {
        try {
          const targets = JSON.parse(event.data);
          if (Array.isArray(targets) && targets.length) pushLog(`[DISPATCH] ${targets.length} zone targets armed: ${targets.slice(0, 5).join(', ')}${targets.length > 5 ? '…' : ''}`);
        } catch (error) { /* ignore */ }
      });

      es.addEventListener('grid_points', event => {
        try {
          const points = JSON.parse(event.data);
          const grid = Array.isArray(points) ? points : [];
          const zoneEntry = grid.find(item => Array.isArray(item.zones) && item.zones.length);
          if (zoneEntry && zoneEntry.zones.length) {
            setGridZones(zoneEntry.zones);
            pushLog(`[GRID] ${zoneEntry.zones.length} coverage zones anchored.`);
            setActiveZone(prev => {
              if (prev && Number.isFinite(Number(prev.lat)) && Number.isFinite(Number(prev.lng))) return prev;
              const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const matched = prev?.name ? zoneEntry.zones.find(z => norm(z.zoneName || z.name) === norm(prev.name)) : null;
              if (matched) {
                return {
                  name: matched.zoneName || matched.name,
                  lat: Number(matched.lat),
                  lng: Number(matched.lng),
                  radiusKm: Number(matched.radiusKm) || 3.5,
                  index: matched.index || 1
                };
              }
              const first = zoneEntry.zones[0];
              return prev || (first ? {
                name: first.zoneName || first.name,
                lat: Number(first.lat),
                lng: Number(first.lng),
                radiusKm: Number(first.radiusKm) || 3.5,
                index: 1
              } : null);
            });
          } else if (grid.length) {
            pushLog(`[GRID] ${grid.length} geocoded grid points received.`);
          }
        } catch (error) { /* ignore */ }
      });

      es.addEventListener('active_point', event => {
        try {
          const point = JSON.parse(event.data);
          if (!point || point.completed) return;
          const lat = Number(point.lat);
          const lng = Number(point.lng);
          const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0);
          const zLabel = point.zoneName || point.locationName;
          if (zLabel) {
            const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const clean = norm(zLabel);
            setGridZones(currentGrid => {
              const matched = currentGrid.find(z => norm(z.zoneName || z.name) === clean);
              const finalLat = hasCoords ? lat : (matched && Number.isFinite(Number(matched.lat)) ? Number(matched.lat) : undefined);
              const finalLng = hasCoords ? lng : (matched && Number.isFinite(Number(matched.lng)) ? Number(matched.lng) : undefined);
              setActiveZone(prev => ({
                name: zLabel,
                lat: finalLat !== undefined ? finalLat : prev?.lat,
                lng: finalLng !== undefined ? finalLng : prev?.lng,
                radiusKm: point.boundaryKm || matched?.radiusKm || 3.5,
                index: point.index || matched?.index || 1
              }));
              return currentGrid;
            });
            pushLog(`[ZONE] searching ${zLabel}`);
          }
          setScanning(true);
          lastEventRef.current = Date.now();
        } catch (error) { /* ignore */ }
      });

      es.onmessage = event => pushLog(event.data);
    };

    flushTimer = setInterval(flushBuffers, 300);

    const stream = createLiveStream({
      url: streamUrl(),
      fallbackUrl: fallbackStreamUrl(),
      onSource: bindSource,
      onStatus: status => {
        if (!mountedRef.current) return;
        if (status === 'open') {
          setSseStatus('open');
          refresh();
        } else if (status === 'connecting') {
          setSseStatus('connecting');
        } else {
          setSseStatus('error');
          setHealth(null);
        }
      },
      onAttempt: count => {
        if (mountedRef.current) setReconnectAttempts(count);
      }
    });
    reconnectStreamRef.current = () => stream.reconnect();

    const onServerOnline = () => {
      if (!mountedRef.current) return;
      if (stream && stream.status !== 1) stream.reconnect();
      refresh();
    };
    const onServerOffline = () => {
      if (!mountedRef.current) return;
      setHealth(null);
    };
    window.addEventListener('leadharvest:server_online', onServerOnline);
    window.addEventListener('leadharvest:server_offline', onServerOffline);

    stream.start();

    return () => {
      if (flushTimer) clearInterval(flushTimer);
      if (microFlushTimer) clearTimeout(microFlushTimer);
      window.removeEventListener('leadharvest:server_online', onServerOnline);
      window.removeEventListener('leadharvest:server_offline', onServerOffline);
      stream.stop();
    };
  }, []);

  const finishRun = useCallback(async (status, options = {}) => {
    const current = runRef.current;
    if (!current || current.status !== 'running' || finishingRef.current) return;

    // Safety guard: a natural "complete" is only allowed when the server has
    // either said the session is finished or told us the zone total AND every
    // zone is done. A bare `sessionActive: false` arrives between phases, and
    // finishing on it flipped the Stop button back to "Find Leads" mid-sweep.
    if (status === 'complete' && !options.serverConfirmed) {
      const comp = Number(progressRef.current?.overallCompletedMandals ?? progressRef.current?.completedMandals ?? 0);
      const tot = Number(progressRef.current?.totalMandalsAcrossAll ?? progressRef.current?.totalMandals ?? 0);
      if (!(tot > 0) || comp < tot) return;
    }

    finishingRef.current = true;

    const targetSid = current.sessionId || current.id || activeSessionIdRef.current;
    if (targetSid) {
      activeSessionIdRef.current = targetSid;
      setSessionFilter(targetSid);
      persistLastLiveSession(targetSid);
    }

    const finishedAt = Date.now();
    setRun(prev => prev ? { ...prev, status, finishedAt } : prev);
    setScanning(false);
    setLogs(prev => [...prev, `[RUN] ${current.id} ${status} · ${runVendorIdsRef.current.size} vendors observed`].slice(-400));

    // The omni orchestrator queues deep enrichment itself when the scrape
    // phase ends. Queueing another batch from the client duplicated every
    // Maps and website pass. Just surface the server-side phase.
    const vendorIds = Array.from(runVendorIdsRef.current);
    if (current.postDeep || current.postWebsite) {
      if (!vendorIds.length) {
        toast('Deep pass skipped: no new vendors were observed.', { icon: '!' });
      } else {
        setLogs(prev => [
          ...prev,
          `[DEEP] Server-side enrichment queued for ${vendorIds.length} vendors. Profiles stream into the Deep tab.`
        ].slice(-400));
      }
    }

    setTimeout(() => {
      refresh(targetSid);
      finishingRef.current = false;
    }, 800);
  }, [refresh]);

  // Progress completion: only finish when this run's session is strictly finished
  useEffect(() => {
    if (run?.status === 'running' && progress && progress.sessionActive === false) {
      // Guard: strictly ensure progress event belongs to current run
      if (progress.sessionId && (progress.sessionId === run.id || progress.sessionId === run.sessionId)) {
        const comp = Number(progress.overallCompletedMandals ?? progress.completedMandals ?? 0);
        const tot = Number(progress.totalMandalsAcrossAll ?? progress.totalMandals ?? 0);
        const isAllZonesDone = tot > 0 && comp >= tot;
        // The server's terminal flag is authoritative. Without it a run that
        // ends with skipped zones (a stalled engine, an empty village) could
        // never satisfy `comp >= tot`, and the Stop button would stay armed
        // forever after the sweep had actually finished.
        const serverSaysFinished = progress.finished === true || progress.status === 'completed';
        // A "sessionActive: false" event also arrives between phases. Only treat
        // it as the end of the run when the server says it is finished, every
        // zone is done, the run was aborted, the server reported an error, or
        // the stream has been silent so long that it cannot still be working.
        const lastEventAt = Number(lastEventRef.current) || 0;
        const streamIsStale = lastEventAt > 0 && (Date.now() - lastEventAt) > 90_000;
        if (isAllZonesDone || serverSaysFinished || progress.aborted || progress.error || streamIsStale) {
          finishRun(
            progress.error ? 'error' : progress.aborted ? 'stopped' : 'complete',
            { serverConfirmed: serverSaysFinished }
          );
        }
      }
    }
  }, [progress, run?.status, run?.id, run?.sessionId, run?.startedAt, finishRun]);

  useEffect(() => {
    if (run?.status !== 'running') return undefined;
    const id = setInterval(async () => {
      try {
        const jobs = await getScrapeJobs();
        if (!mountedRef.current) return;
        // The backend returns a flat array of omni + cron jobs. Accept the
        // wrapped shape too so this watchdog cannot silently stop working.
        const list = Array.isArray(jobs)
          ? jobs
          : Array.isArray(jobs?.omniJobs) ? jobs.omniJobs : [];
        const matching = list.find(job => job.id === run.id || job.sessionId === run.id);
        if (matching?.status === 'completed') {
          const comp = Number(matching.completedCount || 0);
          const tot = Number(matching.totalCount || 0);
          if (!tot || comp >= tot) {
            finishRun('complete');
          } else {
            // The job record is authoritative about termination. A run can end
            // with skipped zones, so the ratio may never reach 100%.
            finishRun('complete', { serverConfirmed: true });
          }
        } else if (matching?.status === 'failed') {
          setMascotAlert({ id: Date.now(), text: 'That run hit an engine error. Check the engine board and try again.' });
        } else if (!matching && (Date.now() - (run.startedAt || 0) > 120000) && (Date.now() - lastEventRef.current > 180000)) {
          finishRun('complete');
        }
      } catch (error) { /* ignore */ }
    }, 5000);
    return () => clearInterval(id);
  }, [run?.status, run?.id, run?.startedAt, finishRun]);

  // Deep job polling.
  useEffect(() => {
    if (!deepJob || ['completed', 'failed', 'stopped'].includes(deepJob.status)) return undefined;
    const id = setInterval(async () => {
      try {
        const job = await getDeepJob(deepJob.id);
        if (!mountedRef.current || !job) return;
        setDeepJob(job);
        setDeepJobs(prev => {
          const map = new Map(prev.map(item => [item.id, item]));
          map.set(job.id, job);
          return Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        });
        if (['completed', 'failed', 'stopped'].includes(job.status)) {
          toast[job.status === 'completed' ? 'success' : 'error'](`Deep job ${job.status} · ${job.succeeded || 0} profiles`);
          refresh();
        }
      } catch (error) { /* ignore */ }
    }, 2200);
    return () => clearInterval(id);
  }, [deepJob?.id, deepJob?.status, refresh]);

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const startRun = async (overrides = {}) => {
    const auto = runMode === 'auto';
    const runQuery = String(overrides.query ?? autoQuery).trim();
    const runCategory = String(overrides.category ?? form.category).trim();
    const runLocation = String(overrides.location ?? form.location).trim();

    if (auto && !runQuery) {
      toast.error('Type what you need and where. Example: plumbers in Vijayawada.');
      return;
    }
    if (!auto && (!runCategory || !runLocation)) {
      toast.error('Category and location are required.');
      return;
    }

    // Honor custom engine selection from overrides or default to auto
    const engines = (Array.isArray(overrides.engines) && overrides.engines.length)
      ? overrides.engines
      : ['auto'];

    setLaunching(true);
    try { ramAssistStopRef.current?.(); } catch (e) {}
    ramAssistStopRef.current = null;
    const sessionId = `cmd_${Date.now().toString(36)}`;
    let resolvedCategory = runCategory || runQuery;
    let resolvedLocation = runLocation || '';
    activeSessionIdRef.current = sessionId;
    if (overrides.query) setAutoQuery(overrides.query);
    runVendorIdsRef.current = new Set();
    finishingRef.current = false;
    clearAnimationHighlights();
    setRunLeadCount(0);
    setProgress(null);
    setSessionFilter(sessionId);
    persistLastLiveSession(sessionId);
    setPage(1);
    setActiveTab('cockpit');
    setActiveZone(null);
    setGridZones([]);
    setScanning(true);
    setRun({
      id: sessionId,
      sessionId,
      category: auto ? runQuery : runCategory,
      location: auto ? '' : runLocation,
      familyLabel: auto ? 'Auto' : runCategory,
      strategy: form.strategy,
      engines,
      postWebsite: true,
      postDeep: true,
      targetLeads: overrides.targetLeads || form.targetLeads,
      startedAt: Date.now(),
      finishedAt: null,
      status: 'running'
    });
    setLogs(prev => [
      ...prev,
      auto
        ? `[RUN] auto mode · "${runQuery}" · ${engines.join(' + ')}`
        : `[RUN] launching "${runCategory}" in "${runLocation}" · ${engines.join(' + ')}`,
      `[ESTIMATE] ${estimate ? `${estimate.zones?.count || 0} zones · first lead ${estimate.timing?.firstLeadLabel} · total ${estimate.timing?.totalLabel}` : 'not available'}`
    ]);

    try {
      if (auto) {
        const response = await startAuto({
          query: runQuery,
          strategy: form.strategy,
          radius: overrides.radius || form.radius || 5,
          engines,
          country: searchCountry,
          sessionId
        });
        const plan = response?.plan || {};
        if (plan.category) resolvedCategory = plan.category;
        if (plan.location) resolvedLocation = plan.location;
        if (Array.isArray(plan?.zones) && plan.zones.length > 0) {
          setGridZones(plan.zones);
          const first = plan.zones[0];
          if (first) {
            setActiveZone({
              name: first.zoneName || first.name || 'Zone 1',
              lat: Number(first.lat ?? first.latitude),
              lng: Number(first.lng ?? first.longitude),
              radiusKm: Number(first.radiusKm) || 3.5,
              index: 1,
              total: plan.zones.length
            });
          }
        }
        setForm(prev => ({
          ...prev,
          category: plan.category || prev.category,
          location: plan.location || prev.location
        }));
        setRun(prev => ({
          ...(prev || {}),
          id: sessionId,
          sessionId,
          category: plan.category || runQuery,
          location: plan.location || '',
          familyLabel: plan.familyLabel || 'Auto',
          strategy: form.strategy,
          engines: plan.engines || engines,
          postWebsite: true,
          postDeep: true,
          targetLeads: overrides.targetLeads || form.targetLeads,
          startedAt: prev?.startedAt || Date.now(),
          finishedAt: null,
          status: 'running'
        }));
        setLogs(prev => [
          ...prev,
          `[PLAN] ${plan.familyLabel || 'General vendors'} · ${(plan.engines || []).join(' + ') || 'auto'}`,
          response?.purge?.removed ? `[PURGE] ${response.purge.removed} stale leads removed · fresh run` : '[PURGE] no stale leads',
          response?.deepStopped ? `[DEEP] ${response.deepStopped} superseded deep job(s) cancelled` : null
        ].filter(Boolean));
      } else {
        const response = await startOmni({
          query: `${runCategory} in ${runLocation}`,
          category: runCategory,
          location: runLocation,
          strategy: form.strategy,
          engines,
          country: searchCountry,
          sessionId
        });
        const plan = response?.plan || {};
        if (plan.category) resolvedCategory = plan.category;
        if (plan.location) resolvedLocation = plan.location;
        if (Array.isArray(plan?.zones) && plan.zones.length > 0) {
          setGridZones(plan.zones);
          const first = plan.zones[0];
          if (first) {
            setActiveZone({
              name: first.zoneName || first.name || 'Zone 1',
              lat: Number(first.lat ?? first.latitude),
              lng: Number(first.lng ?? first.longitude),
              radiusKm: Number(first.radiusKm) || 3.5,
              index: 1,
              total: plan.zones.length
            });
          }
        }
        setRun(prev => ({
          ...(prev || {}),
          id: sessionId,
          sessionId,
          category: plan.category || runCategory,
          location: plan.location || runLocation,
          strategy: form.strategy,
          engines: plan.engines || engines,
          postWebsite: true,
          postDeep: true,
          targetLeads: form.targetLeads,
          startedAt: prev?.startedAt || Date.now(),
          finishedAt: null,
          status: 'running'
        }));
        setLogs(prev => [
          ...prev,
          `[PLAN] ${plan.familyLabel || 'General vendors'} · sources chosen automatically`,
          response?.purge?.removed ? `[PURGE] ${response.purge.removed} stale leads removed · fresh run` : '[PURGE] no stale leads',
          response?.deepStopped ? `[DEEP] ${response.deepStopped} superseded deep job(s) cancelled` : null
        ].filter(Boolean));
      }

      lastEventRef.current = Date.now();
      setScanning(true);

      // Start Client-RAM Browser Web Worker assist using the user's own RAM & cores
      if (hwTurboEnabled) {
      try {
        const hw = detectDeviceHardware();
        const uid = getUserId();
        const token = getToken();
        const headers = {
          ...(uid ? { 'x-user-id': uid } : {}),
          'x-workspace-scope': 'client',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
        setLogs(prev => [
          ...prev,
          `[RAM ENGINE] ${hw.ramGb} GB RAM · ${hw.cpuCores} Cores · ${hw.parallelZones}x parallel Web Worker active`
        ]);
        ramAssistStopRef.current = startBrowserRamAssist({
          sessionId,
          category: resolvedCategory,
          location: resolvedLocation,
          country: searchCountry,
          apiBase: API_URL,
          headers,
          onLeads: (freshBatch) => {
            if (!mountedRef.current || !Array.isArray(freshBatch) || !freshBatch.length) return;
            lastEventRef.current = Date.now();
            const tagged = freshBatch
              .filter(Boolean)
              .map(v => ({
                ...v,
                sessionId: v.sessionId || sessionId,
                lastSessionId: v.lastSessionId || sessionId,
                sessionIds: Array.isArray(v.sessionIds) ? Array.from(new Set([...v.sessionIds, sessionId])) : [sessionId]
              }));
            const newIds = [];
            for (const v of tagged) {
              if (v.id && !runVendorIdsRef.current.has(v.id)) {
                runVendorIdsRef.current.add(v.id);
                newIds.push(v.id);
              }
            }
            setRunLeadCount(runVendorIdsRef.current.size);
            setVendors(prev => mergeVendorLists(prev, tagged, { countryHint: searchCountryRef.current }));
            if (newIds.length) markFreshLeads(newIds);
          }
        });
      } catch (e) {}
      }

      toast.success(auto ? 'Search started. Live leads will appear in seconds.' : 'Search started. We chose the sources automatically.');
      setActiveTab('cockpit');
    } catch (error) {
      setScanning(false);
      setRun(null);
      activeSessionIdRef.current = '';
      if (error?.response?.status === 428 || error?.response?.data?.extensionRequired) {
        setHwPopupOpen(true);
        toast.error('Extension-Only Deployment: Install & connect the Scraper.co.in RAM Extension to run searches on your RAM.');
      } else {
        toast.error(error?.response?.data?.error || 'Search could not be started.');
      }
      setMascotAlert({ id: Date.now(), text: 'That search did not start. Check the engine board, then try again.' });
      setLogs(prev => [...prev, `[ERROR] ${error?.response?.data?.error || error.message}`]);
    } finally {
      setLaunching(false);
    }
  };

  const stopRun = async () => {
    setStopping(true);
    try { ramAssistStopRef.current?.(); } catch (e) {}
    ramAssistStopRef.current = null;
    try {
      const sid = run?.sessionId || run?.id || activeSessionIdRef.current || sessionFilterRef.current;
      if (sid) {
        activeSessionIdRef.current = sid;
        setSessionFilter(sid);
        persistLastLiveSession(sid);
      }
      setRun(prev => ({
        ...(prev || {}),
        id: sid,
        sessionId: sid,
        status: 'stopped',
        finishedAt: Date.now()
      }));
      setProgress(prev => prev ? { ...prev, sessionActive: false } : null);
      setScanning(false);
      await stopAllScrapes(sid);
      toast('Run stopped. Completed leads remain saved.', { icon: '■' });
      refresh(sid);
    } catch (error) {
      toast.error('Stop request failed.');
    } finally {
      setStopping(false);
    }
  };

  const launchDeep = async (vendorIds, options = {}) => {
    if (!vendorIds.length) {
      toast('No vendors need a deep pass.', { icon: '!' });
      return null;
    }
    setBatchStarting(true);
    try {
      const response = await startDeepBatch({
        vendorIds,
        force: false,
        includeWebsite: options.website !== false,
        includeGoogle: options.google !== false,
        limit: options.limit || vendorIds.length,
        concurrency: 2
      });
      if (response?.job) {
        setDeepJob(response.job);
        setDeepJobs(prev => [response.job, ...prev]);
        toast.success(`Deep pass queued · ${response.job.total} vendors`);
        setActiveTab('deep');
      }
      return response;
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Deep pass could not start.');
      return null;
    } finally {
      setBatchStarting(false);
    }
  };

  const queueDeepManual = () => {
    const candidates = vendors
      .filter(vendor => !vendor.deepExtractedAt)
      .slice(0, Number(batchConfig.limit) || 100)
      .map(vendor => vendor.id);
    return launchDeep(candidates, { website: batchConfig.website, google: batchConfig.google, limit: candidates.length });
  };

  const queueDeepForRun = async runCard => {
    const ids = vendors
      .filter(vendor => (vendor.sessionId || 'unassigned') === runCard.id && !vendor.deepExtractedAt)
      .map(vendor => vendor.id);
    return launchDeep(ids, { website: true, google: true, limit: ids.length });
  };

  const stopDeep = async jobId => {
    try {
      const job = await stopDeepJob(jobId);
      if (job) {
        setDeepJob(job);
        setDeepJobs(prev => prev.map(item => item.id === job.id ? job : item));
        toast('Deep job stopping after the current vendor.');
      }
    } catch (error) {
      toast.error('Could not stop deep job.');
    }
  };

  // Continue an interrupted job from the ledger. The engine returns a new job
  // record that starts at the last persisted vendor index, so a restart never
  // costs the work that was already queued.
  const resumeDeep = async jobId => {
    try {
      const job = await resumeDeepJob(jobId);
      if (job) {
        setDeepJob(job);
        setDeepJobs(prev => [job, ...prev.filter(item => item.id !== job.id)]);
        toast.success('Deep job resumed from the last saved vendor.');
      }
    } catch (error) {
      toast.error('Could not resume deep job.');
    }
  };

  const quickDeep = async vendor => {
    if (!vendor?.id || vendorJobs[vendor.id]) return;
    setVendorJobs(prev => ({ ...prev, [vendor.id]: { status: 'queued', progressPercent: 0 } }));
    try {
      const response = await deepExtractVendor(vendor.id, {
        force: true,
        includeWebsite: Boolean(vendor.website),
        includeGoogle: true
      });
      const jobId = response?.jobId;
      if (!jobId) {
        await loadVendors();
        setVendorJobs(prev => {
          const next = { ...prev };
          delete next[vendor.id];
          return next;
        });
        return;
      }

      const started = Date.now();
      let current = null;
      while (mountedRef.current && Date.now() - started < 150000) {
        await new Promise(resolve => setTimeout(resolve, 1800));
        current = await getDeepJob(jobId);
        if (!mountedRef.current) return;
        setVendorJobs(prev => ({ ...prev, [vendor.id]: current || { status: 'running', progressPercent: 0 } }));
        if (current && ['completed', 'failed', 'stopped'].includes(current.status)) break;
      }
      await loadVendors();
      if (mountedRef.current) {
        setVendorJobs(prev => {
          const next = { ...prev };
          delete next[vendor.id];
          return next;
        });
        toast.success(`Deep profile updated · ${vendor.name || vendor.id}`);
      }
    } catch (error) {
      if (mountedRef.current) {
        setVendorJobs(prev => {
          const next = { ...prev };
          delete next[vendor.id];
          return next;
        });
        toast.error('Quick deep extraction failed.');
      }
    }
  };

  const updateCrmStage = async (vendor, stage) => {
    if (!vendor?.id || crmSavingId) return;
    setCrmSavingId(vendor.id);
    try {
      const response = await updateVendorCrm(vendor.id, { crmStage: stage });
      const updated = response?.vendor;
      if (updated) {
        setVendors(prev => prev.map(item => item.id === updated.id ? { ...item, ...updated } : item));
        setSelectedVendor(prev => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
        setFolderView(prev => {
          if (!prev?.session?.leads) return prev;
          const nextLeads = prev.session.leads.map(l => l.id === updated.id ? { ...l, ...updated } : l);
          return { ...prev, session: { ...prev.session, leads: nextLeads } };
        });
      }
      toast.success(`Moved to ${stage.replace(/_/g, ' ')}`);
    } catch (error) {
      toast.error('Could not update the CRM stage.');
    } finally {
      setCrmSavingId('');
    }
  };

  const updateDealValue = async (vendor, dealValue) => {
    if (!vendor?.id || crmSavingId) return;
    setCrmSavingId(vendor.id);
    try {
      const response = await updateVendorCrm(vendor.id, { dealValue: Number(dealValue) || 0 });
      const updated = response?.vendor;
      if (updated) {
        setVendors(prev => prev.map(item => item.id === updated.id ? { ...item, ...updated } : item));
        setSelectedVendor(prev => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
        setFolderView(prev => {
          if (!prev?.session?.leads) return prev;
          const nextLeads = prev.session.leads.map(l => l.id === updated.id ? { ...l, ...updated } : l);
          return { ...prev, session: { ...prev.session, leads: nextLeads } };
        });
      }
      toast.success(`Deal value saved: ${formatInr(Number(dealValue) || 0)}`);
    } catch (error) {
      toast.error('Could not save deal value.');
    } finally {
      setCrmSavingId('');
    }
  };

  const handleToggleSelectFolder = id => {
    setSelectedFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFolders = () => {
    if (selectedFolderIds.size === filteredRuns.length && filteredRuns.length > 0) {
      setSelectedFolderIds(new Set());
    } else {
      setSelectedFolderIds(new Set(filteredRuns.map(r => r.id)));
    }
  };

  const handleRenameFolder = async (folderId, payload) => {
    try {
      const res = await renameSession(folderId, payload);
      if (res?.success) {
        setSessions(prev => prev.map(s => s.id === folderId ? { ...s, ...res.session } : s));
        if (folderView?.run?.id === folderId) {
          setFolderView(prev => ({
            ...prev,
            run: { ...prev.run, ...res.session },
            session: { ...prev.session, ...res.session }
          }));
        }
        setRenamingFolder(null);
        toast.success('Folder renamed successfully.');
      } else {
        toast.error(res?.error || 'Failed to rename folder.');
      }
    } catch (err) {
      toast.error('Error renaming folder.');
    }
  };

  const handleBatchDelete = () => {
    toast.error('Protected: Batch folder deletion is restricted to Master Admin.');
  };

  const handleMergeFolders = async targetTitle => {
    if (selectedFolderIds.size < 2) {
      toast.error('Select at least 2 folders to merge.');
      return;
    }
    const ids = Array.from(selectedFolderIds);
    setIsMerging(true);
    try {
      const res = await mergeSessions(ids, targetTitle);
      const merged = res?.session || res?.mergedSession;
      if (merged) {
        const updated = await getSessions();
        setSessions(updated || []);
        setSelectedFolderIds(new Set());
        setShowMergeModal(false);
        toast.success(`Merged ${ids.length} folders into "${merged.name}" (${merged.leadCount} unique leads, ${merged.phoneCount} mobiles)!`);
        openFolder({
          id: merged.id,
          name: merged.name,
          category: merged.category,
          location: merged.location,
          leadCount: merged.leadCount,
          phoneCount: merged.phoneCount
        });
      } else {
        toast.error(res?.error || 'Failed to merge folders.');
      }
    } catch (err) {
      toast.error('Error merging folders.');
    } finally {
      setIsMerging(false);
    }
  };

  const openFolder = async runCard => {
    if (!runCard?.id || folderLoading) return;
    setFolderLoading(runCard.id);
    try {
      let session = null;
      try {
        session = await getSessionVault(runCard.id);
      } catch (err) {
        console.warn('Backend getSessionVault error:', err);
      }

      // Client-side fallback: resolve leads from in-memory vendors if backend lookup failed
      if (!session && Array.isArray(vendors) && vendors.length > 0) {
        const matchingLeads = vendors.filter(v =>
          v.sessionId === runCard.id ||
          v.lastSessionId === runCard.id ||
          (Array.isArray(runCard.vendorIds) && runCard.vendorIds.includes(v.id))
        );
        if (matchingLeads.length > 0) {
          session = {
            id: runCard.id,
            name: runCard.name || runCard.category || 'Search Folder',
            category: runCard.category || matchingLeads[0]?.category || 'Business Search',
            location: runCard.location || matchingLeads[0]?.location || 'India',
            timestamp: runCard.timestamp || new Date().toISOString(),
            leads: matchingLeads,
            leadCount: matchingLeads.length,
            phoneCount: matchingLeads.filter(l => l.phone).length,
            verifiedCount: matchingLeads.filter(l => l.verified).length,
            metadata: { status: 'completed' }
          };
        }
      }

      if (!session) {
        toast.error('This folder is empty or was removed.');
        return;
      }
      setFolderView({ run: runCard, session });
    } catch (error) {
      toast.error('Could not open this search folder.');
    } finally {
      setFolderLoading('');
    }
  };

  const exportFolder = (runCard, format = 'csv') => {
    if (!runCard?.id) return;
    const link = document.createElement('a');
    link.href = sessionExportUrl(runCard.id, format);
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const loadFolderToCockpit = async (runCard, sessionData) => {
    try {
      let session = sessionData;
      if (!session) {
        setFolderLoading(runCard.id);
        session = await getSessionVault(runCard.id);
        setFolderLoading('');
      }
      if (!session || !Array.isArray(session.leads) || session.leads.length === 0) {
        toast.error('This folder contains no leads to load.');
        return;
      }
      activeSessionIdRef.current = runCard.id;
      setVendors(prev => mergeVendorLists(prev, session.leads, { countryHint: searchCountryRef.current }));
      setSessionFilter(runCard.id);
      persistLastLiveSession(runCard.id);
      if (session.category) updateForm('category', session.category);
      if (session.location) updateForm('location', session.location);
      if (session.category && session.location) setAutoQuery(`${session.category} in ${session.location}`);
      setActiveTab('cockpit');
      setFolderView(null);
      toast.success(`Loaded ${session.leads.length} leads from "${runCard.name || runCard.id}" into Cockpit!`);
    } catch (err) {
      setFolderLoading('');
      toast.error('Failed to load folder into Cockpit workspace.');
    }
  };

  const deleteFolder = () => {
    toast.error('Protected: Folder deletion is restricted to Master Admin. Clients cannot delete folders.');
  };

  const reScrapeFolder = runCard => {
    if (!runCard) return;
    const cat = runCard.category || 'Businesses';
    const loc = runCard.location || 'India';
    updateForm('category', cat);
    updateForm('location', loc);
    setAutoQuery(`${cat} in ${loc}`);
    setFolderView(null);
    setActiveTab('cockpit');
    toast.success(`Ready to search ${cat} in ${loc}. Click "Find Businesses" to start!`);
  };

  const effectiveRuns = useMemo(() => {
    const liveId = (run?.status === 'running' ? (run.sessionId || run.id) : '') || activeSessionIdRef.current || '';

    // Vendor groups exist only to keep the live run's card growing and to give
    // each folder its in-memory vendor ids. They are never allowed to invent a
    // folder or to override a saved folder's own count.
    const vendorGroups = new Map();
    for (const vendor of vendors) {
      const id = vendor.sessionId || 'unassigned';
      const group = vendorGroups.get(id) || {
        id,
        leadCount: 0,
        phoneCount: 0,
        deepCount: 0,
        dealValueTotal: 0,
        vendorIds: [],
        timestamp: null
      };
      group.leadCount += 1;
      if (getDisplayPhone(vendor)) group.phoneCount += 1;
      if (vendor.deepExtractedAt) group.deepCount += 1;
      if (vendor.dealValue) group.dealValueTotal += Number(vendor.dealValue) || 0;
      if (vendor.scrapedAt && (!group.timestamp || new Date(vendor.scrapedAt) > new Date(group.timestamp))) group.timestamp = vendor.scrapedAt;
      group.vendorIds.push(vendor.id);
      vendorGroups.set(id, group);
    }

    const map = new Map();

    // Saved folders are authoritative: the card must describe exactly the rows
    // its folder opens and exports.
    for (const session of sessions) {
      const group = vendorGroups.get(session.id);
      map.set(session.id, {
        id: session.id,
        category: session.category || 'Business search',
        location: session.location || 'India',
        timestamp: session.timestamp,
        leadCount: session.leadCount || 0,
        phoneCount: session.phoneCount || 0,
        deepCount: group ? group.deepCount : 0,
        dealValueTotal: Number(session.dealValueTotal) > 0
          ? Number(session.dealValueTotal)
          : (group ? group.dealValueTotal : 0),
        status: session.status || session.metadata?.status || 'saved',
        vendorIds: group ? group.vendorIds : [],
        customName: session.customName || '',
        name: session.customName || session.name || (session.category ? `${session.category} in ${session.location || 'India'}` : 'Lead Folder'),
        tags: Array.isArray(session.tags) ? session.tags : [],
        color: session.color || '',
        notes: session.notes || '',
        isMasterSweep: Boolean(session.isMasterSweep || session.metadata?.isMasterSweep || /master_/i.test(session.id) || /sweep/i.test(session.location || '')),
        masterScope: session.masterScope || (session.isMasterSweep ? (/state/i.test(session.location || '') ? 'state' : 'district') : null)
      });
    }

    // A run that is still writing may not have written its folder file yet.
    // That live run is the only card the store is allowed to create.
    if (liveId && liveId !== 'unassigned') {
      const group = vendorGroups.get(liveId);
      const existing = map.get(liveId);
      if (existing) {
        if (group && group.leadCount > existing.leadCount) {
          existing.leadCount = group.leadCount;
          existing.phoneCount = Math.max(existing.phoneCount, group.phoneCount);
        }
        existing.status = 'running';
        if (group?.timestamp) existing.timestamp = group.timestamp;
      } else if (group) {
        const sample = vendors.find(v => (v.sessionId || 'unassigned') === liveId) || {};
        map.set(liveId, {
          id: liveId,
          category: run?.category || sample.category || 'Business search',
          location: [sample.city || sample.village, sample.district, sample.state].filter(Boolean).join(', ') || run?.location || 'India',
          timestamp: group.timestamp,
          leadCount: group.leadCount,
          phoneCount: group.phoneCount,
          deepCount: group.deepCount,
          dealValueTotal: group.dealValueTotal,
          status: 'running',
          vendorIds: group.vendorIds,
          name: run?.category ? `${run.category} in ${run.location || 'India'}` : '',
          tags: [],
          color: '',
          notes: '',
          isMasterSweep: false,
          masterScope: null
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [vendors, sessions, run]);

  const activeScrapeId = (run?.status === 'running' || run?.status === 'aborted' || run?.status === 'complete' || run?.status === 'completed') ? (run.sessionId || run.id) : null;
  const effectiveSessionFilter = sessionFilter || activeScrapeId || activeSessionIdRef.current || (effectiveRuns[0]?.id && effectiveRuns[0]?.id !== 'unassigned' ? effectiveRuns[0]?.id : null);

  const filteredVendors = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    let list = vendors.filter(vendor => {
      if (effectiveSessionFilter) {
        const isLiveIncoming = Boolean(
          (runVendorIdsRef.current && runVendorIdsRef.current.has(vendor.id)) ||
          (activeSessionIdRef.current && (vendor.sessionId === activeSessionIdRef.current || vendor.lastSessionId === activeSessionIdRef.current))
        );
        const belongs = isLiveIncoming ||
          (vendor.sessionId === effectiveSessionFilter) ||
          (vendor.lastSessionId === effectiveSessionFilter) ||
          (Array.isArray(vendor.sessionIds) && vendor.sessionIds.includes(effectiveSessionFilter)) ||
          (vendor.sessionId && String(vendor.sessionId).startsWith(effectiveSessionFilter));
        if (!belongs) return false;
      }
      if (filters.phoneOnly && !getDisplayPhone(vendor)) return false;
      if (filters.primeOnly) {
        const p = getDisplayPhone(vendor);
        const isMob = isMobilePhone(p);
        const rating = Number(vendor.rating) || 0;
        const reviews = Number(vendor.reviewsCount) || 0;
        if (!isMob || rating < 4.0 || reviews === 0) return false;
      }
      if (filters.websiteOnly && !vendor.website) return false;
      if (filters.deepOnly && !vendor.deepExtractedAt) return false;
      if (filters.conflictsOnly && !(Array.isArray(vendor.conflicts) && vendor.conflicts.length)) return false;
      if (filters.minRating && !(Number(vendor.rating) >= Number(filters.minRating))) return false;
      if (filters.source && filters.source !== 'all' && leadSourceMeta(vendor).key !== filters.source) return false;
      if (query) {
        const haystack = [
          vendor.name, vendor.category, vendor.city, vendor.village, vendor.mandal,
          vendor.district, vendor.state, vendor.pincode, vendor.phone, vendor.email, vendor.address
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (filters.sort === 'rating') {
        const rA = Number(a.rating) || 0;
        const rB = Number(b.rating) || 0;
        if (rB !== rA) return rB - rA;
        return (Number(b.reviewsCount) || 0) - (Number(a.reviewsCount) || 0);
      }
      if (filters.sort === 'reviews') return (Number(b.reviewsCount) || 0) - (Number(a.reviewsCount) || 0);
      if (filters.sort === 'quality') return (qualityOf(b) || 0) - (qualityOf(a) || 0);
      if (filters.sort === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
      return new Date(b.scrapedAt || 0) - new Date(a.scrapedAt || 0);
    });

    return list;
  }, [vendors, filters, effectiveSessionFilter]);

  useEffect(() => { setPage(1); }, [filters, effectiveSessionFilter, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredVendors.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredVendors.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const folderCities = useMemo(() => {
    const set = new Set();
    effectiveRuns.forEach(r => {
      if (r.location) {
        const primary = r.location.split(',')[0].trim();
        if (primary && primary !== 'India') set.add(primary);
      }
    });
    return Array.from(set).slice(0, 8);
  }, [effectiveRuns]);

  const filteredRuns = useMemo(() => {
    let list = effectiveRuns;
    if (folderCity !== 'all') {
      list = list.filter(r => (r.location || '').toLowerCase().includes(folderCity.toLowerCase()));
    }
    if (folderSearch.trim()) {
      const q = folderSearch.toLowerCase().trim();
      list = list.filter(r =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q)) ||
        (r.location && r.location.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (folderSort === 'leads') return (b.leadCount || 0) - (a.leadCount || 0);
      if (folderSort === 'phones') return (b.phoneCount || 0) - (a.phoneCount || 0);
      if (folderSort === 'name') return String(a.name || a.category).localeCompare(String(b.name || b.category));
      return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    });
  }, [effectiveRuns, folderCity, folderSearch, folderSort]);

  const stats = useMemo(() => {
    const target = filteredVendors || [];
    const phones = target.filter(vendor => Boolean(getDisplayPhone(vendor))).length;
    const websites = target.filter(vendor => vendor.website).length;
    const deep = target.filter(vendor => vendor.deepExtractedAt).length;
    const conflicts = target.reduce((sum, vendor) => sum + (Array.isArray(vendor.conflicts) ? vendor.conflicts.length : 0), 0);
    const scores = target
      .map(vendor => qualityOf(vendor))
      .filter(score => score != null && Number.isFinite(score));
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { phones, websites, deep, conflicts, avg };
  }, [filteredVendors]);

  const toEpochMs = value => {
    if (value == null) return null;
    const n = typeof value === 'number' ? value : new Date(value).getTime();
    return Number.isFinite(n) ? n : null;
  };
  const runStartedMs = toEpochMs(run?.startedAt);
  const runEndedMs = toEpochMs(run?.finishedAt);
  const runElapsed = run && runStartedMs != null
    ? Math.max(0, Math.floor(((runEndedMs != null ? runEndedMs : now) - runStartedMs) / 1000))
    : 0;
  const runTotal = progress?.totalMandalsAcrossAll || progress?.totalMandals || estimate?.zones?.count || 0;
  const runDone = progress?.overallCompletedMandals ?? progress?.completedMandals ?? 0;
  const runPercent = run?.status === 'complete' || run?.status === 'stopped'
    ? 100
    : runTotal ? Math.round((runDone / runTotal) * 100) : 0;

  const mapZones = useMemo(() => {
    if (gridZones.length) return gridZones;
    return (estimate?.zones?.preview || []).map(zone => ({ ...zone, zoneName: zone.zoneName || zone.name }));
  }, [gridZones, estimate]);

  const effectiveActiveZone = useMemo(() => {
    const raw = activeZone || (progress?.activeZone ? progress.activeZone : null);
    const zName = raw?.name || raw?.zoneName || progress?.activeMandal || '';
    if (!zName && !raw?.lat) return null;

    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanName = norm(zName);

    let lat = Number(raw?.lat ?? raw?.latitude);
    let lng = Number(raw?.lng ?? raw?.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const matched = mapZones.find(z => norm(z.zoneName || z.name) === cleanName);
      if (matched && Number.isFinite(Number(matched.lat)) && Number.isFinite(Number(matched.lng))) {
        lat = Number(matched.lat);
        lng = Number(matched.lng);
      }
    }

    return {
      name: zName || 'Active Territory',
      zoneName: zName || 'Active Territory',
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
      radiusKm: Number(raw?.radiusKm) || 3.5,
      index: raw?.index || (progress?.completedMandals ? progress.completedMandals + 1 : 1)
    };
  }, [activeZone, progress?.activeZone, progress?.activeMandal, mapZones]);

  const mapCenter = useMemo(() => {
    // 1. If actively scanning an area, center map directly on active zone coordinate
    if (effectiveActiveZone?.lat && effectiveActiveZone?.lng && Number.isFinite(Number(effectiveActiveZone.lat))) {
      return [Number(effectiveActiveZone.lat), Number(effectiveActiveZone.lng)];
    }
    // 2. If radar grid zones are loaded for this search, focus on first/center zone
    if (gridZones.length > 0 && gridZones[0]?.lat && gridZones[0]?.lng) {
      return [Number(gridZones[0].lat), Number(gridZones[0].lng)];
    }
    // 3. If estimator resolved coordinates for this target city/mandal
    const estLat = Number(estimate?.location?.lat);
    const estLng = Number(estimate?.location?.lng);
    if (Number.isFinite(estLat) && Number.isFinite(estLng) && estLat && estLng) {
      return [estLat, estLng];
    }
    if (estimate?.zones?.preview?.[0]?.lat && estimate?.zones?.preview?.[0]?.lng) {
      return [Number(estimate.zones.preview[0].lat), Number(estimate.zones.preview[0].lng)];
    }
    // 4. If current run has vendor leads
    const runLeads = run?.id ? filteredVendors.filter(v => v.sessionId === run.id || v.lastSessionId === run.id) : [];
    const targetVendors = runLeads.length > 0 ? runLeads : filteredVendors;
    const coords = targetVendors
      .map(vendor => [Number(vendor.latitude), Number(vendor.longitude)])
      .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180 && (a !== 0 || b !== 0));
    if (!coords.length) {
      if (searchCountry === 'CA') return [43.5890, -79.6441];
      if (searchCountry === 'US') return [37.0902, -95.7129];
      if (searchCountry === 'GB') return [51.5074, -0.1278];
      if (searchCountry === 'AU') return [-33.8688, 151.2093];
      if (searchCountry === 'AE') return [25.2048, 55.2708];
      return [22.5937, 79.9629];
    }
    return [
      coords.reduce((sum, pair) => sum + pair[0], 0) / coords.length,
      coords.reduce((sum, pair) => sum + pair[1], 0) / coords.length
    ];
  }, [effectiveActiveZone, gridZones, estimate, run?.id, filteredVendors, searchCountry]);

  const mapZoom = (effectiveActiveZone?.lat || gridZones.length > 0 || estimate?.location?.lat) ? 12 : 5;
  const currentDeep = deepJob;
  const activeDeepJobs = deepJobs.filter(job => ['queued', 'running', 'stopping'].includes(job.status));
  const recentProfiles = vendors
    .filter(vendor => vendor.deepExtractedAt)
    .sort((a, b) => new Date(b.deepExtractedAt) - new Date(a.deepExtractedAt))
    .slice(0, 8);

  const formatClock = seconds => {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
  };

  const isEngineReady = sseStatus === 'open' || Boolean(health);

  return (
    <div className="v2-root v2-command">
      <div className="v2-page-grid" aria-hidden="true" />

      {(!isEngineReady && sseStatus === 'error' && reconnectAttempts >= 3) && (
        <div
          className="v2-network-alert-banner is-error"
          style={{
            background: 'linear-gradient(90deg, #d97706 0%, #b45309 100%)',
            color: '#FFFFFF',
            padding: '7px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontSize: '12px',
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            borderBottom: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RefreshCw size={14} className="v2-spin" />
            <span>
              <b>{sseStatus === 'connecting' ? 'Connecting to your engine:' : 'Engine stream reconnecting:'}</b>{' '}
              {sseStatus === 'connecting'
                ? 'opening the live lead feed…'
                : `attempt #${reconnectAttempts || 1}. Leads on screen stay visible; new leads appear as soon as the engine answers.`}
            </span>
          </span>
          <button
            type="button"
            onClick={() => { if (reconnectStreamRef.current) reconnectStreamRef.current(); }}
            style={{
              background: '#FFFFFF',
              color: '#B45309',
              border: 'none',
              borderRadius: 5,
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <RefreshCw size={11} /> Reconnect Now
          </button>
        </div>
      )}

      <header className="v2-cmd-top">
        <div className="v2-cmd-brand">
          <button type="button" className="v2-cmd-home" onClick={() => navigate(HOME_ROUTE)} title={IS_DESKTOP ? 'Workspace' : 'Back to home'}>
            <Logo compact />
          </button>
          <div className="lx-top-nav">
            <button
              type="button"
              className={cx('lx-nav-chip', activeTab === 'cockpit' && 'is-active')}
              onClick={() => setActiveTab('cockpit')}
            >
              <LayoutDashboard size={13} /> Workspace
            </button>
            <button
              type="button"
              className={cx('lx-nav-chip', activeTab === 'runs' && 'is-active')}
              onClick={() => setActiveTab('runs')}
            >
              <FolderArchive size={13} /> Saved Lists <b>{formatNumber(effectiveRuns.length)}</b>
            </button>
          </div>
        </div>

        <div className="v2-cmd-top-status">
          <StatusPill tone={isEngineReady ? 'lime' : sseStatus === 'connecting' ? 'amber' : 'red'} pulse={isEngineReady}>
            {isEngineReady ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isEngineReady ? 'LIVE' : sseStatus === 'connecting' ? 'CONNECTING' : 'RECONNECTING'}
          </StatusPill>

          <button
            type="button"
            className={cx('v2-gbc-cartridge-pill', extState.connected && 'is-on')}
            onClick={() => setHwPopupOpen(true)}
            title="RAM Turbo status and your hardware lanes"
          >
            <Cpu size={12} />
            <span>
              {extState.connected
                ? `RAM TURBO · ${hardware.ramGb}GB · ${hardware.parallelZones} LANES`
                : 'CONNECT RAM TURBO'}
            </span>
          </button>

          <SystemCheckPill variant="client" />
          <NotificationBell />
          <DesktopBadge />
          <AccountMenu variant="client" />
          <div className="v2-tools" ref={toolsRef}>
            <button
              type="button"
              className={cx('v2-btn v2-btn-ghost v2-btn-sm v2-tools-trigger', toolsOpen && 'is-open')}
              onClick={() => setToolsOpen(open => !open)}
              aria-expanded={toolsOpen}
              aria-haspopup="menu"
            >
              <Settings size={13} /> Menu <ChevronDown size={12} className="v2-tools-caret" />
            </button>
            {toolsOpen && (
              <div className="v2-tools-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('map'); }}>
                  <MapPin size={14} />
                  <span><b>Full Screen Map</b><small>Explore every discovered business on the map</small></span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('deep'); }}>
                  <Sparkles size={14} />
                  <span><b>Find Missing Contacts</b><small>Look up missing phones, emails &amp; websites</small></span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setToolsOpen(false);
                    const target = run || sessions[0];
                    if (target?.id) exportFolder(target, 'xlsx');
                    else toast.error('Run a search first to download Excel.');
                  }}
                >
                  <FileSpreadsheet size={14} />
                  <span><b>Download Excel (.xlsx)</b><small>Export current lead list as a spreadsheet</small></span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setToolsOpen(false);
                    const target = run || sessions[0];
                    if (target?.id) exportFolder(target, 'csv');
                    else toast.error('Run a search first to export CSV.');
                  }}
                >
                  <Download size={14} />
                  <span><b>Download CSV</b><small>Export clean CSV table of leads</small></span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); refresh(); toast.success('Workspace updated.'); }}>
                  <RefreshCw size={14} />
                  <span><b>Refresh Leads</b><small>Sync latest businesses and lists</small></span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={cx('v2-cmd-body', activeTab === 'cockpit' && 'is-cockpit')}>
        <main className={cx('v2-cmd-main', activeTab === 'cockpit' && 'is-cockpit')}>
          <div className="lx-top-controls">
            <CountryFlagStrip selected={searchCountry} onSelect={handleCountrySelect} onMeta={setCountryMeta} />
            <SearchConsole
              mode={runMode}
              onModeChange={setRunMode}
              country={searchCountry}
              value={autoQuery}
              onChange={setAutoQuery}
              category={form.category}
              location={form.location}
              onCategoryChange={value => updateForm('category', value)}
              onLocationChange={value => updateForm('location', value)}
              strategy={form.strategy}
              strategies={STRATEGIES}
              onStrategyChange={value => updateForm('strategy', value)}
              targetLeads={form.targetLeads}
              onTargetChange={value => updateForm('targetLeads', value)}
              form={form}
              onToggle={key => updateForm(key, !form[key])}
              onDeploy={startRun}
              onStop={stopRun}
              busy={launching}
              running={(() => {
                if (!run || finishingRef.current) return false;
                if (run.status === 'stopped' || run.status === 'complete' || run.status === 'aborted') return false;
                if (run.status === 'running') return true;
                const done = Number(progress?.overallCompletedMandals ?? progress?.completedMandals ?? 0);
                const total = Number(progress?.totalMandalsAcrossAll ?? progress?.totalMandals ?? 0);
                return Boolean(
                  (activeSessionIdRef.current && (scanning || progress?.sessionActive)) ||
                  (total > 0 && done < total)
                );
              })()}
              compact={activeTab === 'cockpit'}
              onResolve={setScanPlan}
              progress={progress}
              zonesDone={runDone}
              zonesTotal={Math.max(1, runTotal || mapZones.length || 1)}
              eta={progress?.eta || progress?.etaText || (estimate?.timing?.totalLabel ? `~${estimate.timing.totalLabel}` : '')}
              runs={effectiveRuns}
              onOpenFolder={openFolder}
            />
          </div>

          {run?.status === 'running' && (
            <div className="lx-live-progress-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexWrap: 'wrap' }}>
                <span className="lx-live-dot" />
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                  Searching <b>{run.category || form.category || autoQuery}</b> in <b>{run.location || form.location || 'Selected Area'}</b>
                  {(effectiveActiveZone?.name || progress?.activeMandal) ? (
                    <span style={{ fontWeight: 500, color: '#475569' }}> · {hopTransition || effectiveActiveZone?.name || progress?.activeMandal}</span>
                  ) : null}
                </div>
                <span className="lx-zone-pill is-live">
                  Zone {Math.min(Math.max(1, runTotal || mapZones.length || 1), runDone + 1)} / {Math.max(1, runTotal || mapZones.length || 1)}
                </span>
              </div>

              {/* Retro Digital Watch Chrono & Orchestrator ETA */}
              <RetroDigitalTimer
                etaMs={progress?.etaMs || 0}
                etaText={progress?.etaText || ''}
                elapsedSeconds={runElapsed}
                zoneIndex={Math.min(Math.max(1, runTotal || mapZones.length || 1), runDone + 1)}
                totalZones={Math.max(1, runTotal || mapZones.length || 1)}
                activeZoneName={effectiveActiveZone?.name || progress?.activeMandal || ''}
                hopTransition={hopTransition}
                leadsCount={runLeadCount}
                runningCount={progress?.runningZones || progress?.runningJobs || 1}
                doneCount={runDone}
                queuedCount={Math.max(0, (runTotal || mapZones.length || 1) - runDone - 1)}
                engineCount={searchCountry === 'IN' ? 11 : 6}
                scanning={scanning}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <b style={{ fontSize: 14, fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                  {formatNumber(runLeadCount)} leads found
                </b>
                <button type="button" className="v2-btn v2-btn-danger v2-btn-sm" onClick={stopRun}>
                  <span className="lx-gbc-keycap is-b">B</span>
                  <Square size={11} /> Stop ({runDone}/{Math.max(1, runTotal || mapZones.length || 1)} Zones)
                </button>
              </div>
            </div>
          )}

          {currentDeep && ['queued', 'running', 'stopping'].includes(currentDeep.status) && (
            <div className="v2-deep-banner">
              <span className="v2-deep-banner-pulse" />
              <Sparkles size={13} />
              <b>Finding missing contact details</b>
              <span>{currentDeep.completed || 0} of {currentDeep.total || 0} checked · phones, emails and websites updating live</span>
              <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => setActiveTab('deep')}>
                View progress
              </button>
            </div>
          )}

          <div className={cx('v2-cmd-content', activeTab === 'map' && 'is-map')}>
            {activeTab === 'cockpit' && (
              <CockpitView
                vendors={vendors}
                filteredVendors={filteredVendors}
                pageRows={pageRows}
                filters={filters}
                onFilterChange={updateFilter}
                runs={effectiveRuns}
                sessionFilter={sessionFilter}
                folderLoading={folderLoading}
                onOpenFolder={openFolder}
                onExportFolder={exportFolder}
                crmSavingId={crmSavingId}
                onStageChange={updateCrmStage}
                onSelectVendor={setSelectedVendor}
                onTab={setActiveTab}
                mapZones={mapZones}
                activeZone={effectiveActiveZone}
                progress={progress}
                scanning={scanning}
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                page={currentPage}
                pageCount={pageCount}
                pageSize={pageSize}
                onPage={setPage}
                onPageSize={setPageSize}
                run={run}
                runStatus={run?.status}
                freshLeadIds={freshLeadIds}
                phoneJustFoundIds={phoneJustFoundIds}
                searchCountry={searchCountry}
                stats={stats}
                jumpTrail={jumpTrail}
                hopTransition={hopTransition}
                onOpenTrash={() => setTrashOpen(true)}
              />
            )}

            {activeTab === 'leads' && (
              <LeadsTableView
                sessionFilter={sessionFilter}
                setSessionFilter={setSessionFilter}
                filters={filters}
                updateFilter={updateFilter}
                setFilters={setFilters}
                vendors={vendors}
                filteredVendors={filteredVendors}
                pageRows={pageRows}
                mapCenter={mapCenter}
                setSelectedVendor={setSelectedVendor}
                currentPage={currentPage}
                pageSize={pageSize}
                pageCount={pageCount}
                setPage={setPage}
                setPageSize={setPageSize}
                country={searchCountry}
              />
            )}

            {activeTab === 'map' && (
              <section className="v2-map-view">
                <div className="v2-map-view-head">
                  <FilterBar
                    filters={filters}
                    onChange={updateFilter}
                    total={vendors.length}
                    shown={filteredVendors.length}
                    compact
                  />
                  <MapLegend />
                </div>
                <div className="v2-map-view-body">
                  <CommandMap
                    vendors={filteredVendors}
                    zones={mapZones}
                    activeZone={effectiveActiveZone}
                    scanning={scanning}
                    center={mapCenter}
                    zoom={mapZoom}
                    height="100%"
                    fitKey={run?.id || 'live'}
                    cellStates={progress?.cellStates || {}}
                    jumpTrail={jumpTrail}
                    onSelect={vendor => setSelectedVendor(vendor)}
                    onSelectZone={name => updateFilter('query', name)}
                  />
                  <aside className="v2-map-side">
                    <div className="v2-map-side-head">
                      <span><MapPin size={13} /> BUSINESSES ON MAP</span>
                      <b>{formatNumber(filteredVendors.filter(vendor => Number.isFinite(Number(vendor.latitude))).length)}</b>
                    </div>
                    <div className="v2-zone-list">
                      {filteredVendors.filter(v => Number.isFinite(Number(v.latitude))).slice(0, 30).map((vendor, idx) => (
                        <div
                          key={vendor.id || idx}
                          onClick={() => setSelectedVendor(vendor)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span>{String(idx + 1).padStart(2, '0')}</span>
                          <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vendor.name || 'Local Business'}</b>
                          <small>{getDisplayPhone(vendor) ? 'Phone' : 'Pin'}</small>
                        </div>
                      ))}
                      {filteredVendors.filter(v => Number.isFinite(Number(v.latitude))).length === 0 && (
                        <p>Start a search to see businesses pinned across the map.</p>
                      )}
                    </div>
                    <div className="v2-map-side-foot">
                      <div><span>PINNED</span><b>{formatNumber(filteredVendors.filter(vendor => Number.isFinite(Number(vendor.latitude))).length)}</b></div>
                      <div><span>WITH PHONE</span><b>{formatNumber(filteredVendors.filter(vendor => Boolean(getDisplayPhone(vendor))).length)}</b></div>
                    </div>
                  </aside>
                </div>
              </section>
            )}

            {activeTab === 'runs' && (
              <section className="v2-runs-view">
                <div className="v2-runs-top">
                  <div>
                    <span className="v2-view-kicker">MY SAVED LISTS</span>
                    <h2>Every search is automatically saved in its own folder.</h2>
                    <p>Open any list to browse businesses, copy phone numbers, explore the map, or download clean Excel (.xlsx) and CSV sheets in one click.</p>
                  </div>
                  <div className="v2-folder-stats-pill">
                    <FolderArchive size={16} />
                    <span><b>{formatNumber(effectiveRuns.length)}</b> Lists</span>
                    <span>•</span>
                    <span><b>{formatNumber(effectiveRuns.reduce((acc, r) => acc + (r.leadCount || 0), 0))}</b> Leads</span>
                    <span>•</span>
                    <span><b>{formatNumber(effectiveRuns.reduce((acc, r) => acc + (r.phoneCount || 0), 0))}</b> Phones</span>
                  </div>
                </div>

                {/* Runs Toolbar: Search, City Filter Pills, Select All, and Sort Dropdown */}
                <div className="v2-runs-toolbar">
                  <div className="v2-runs-search">
                    <Search size={14} />
                    <input
                      type="search"
                      placeholder="Search folders (e.g. Plumbers, Vijayawada, Tenali, cmd_...)"
                      value={folderSearch}
                      onChange={e => setFolderSearch(e.target.value)}
                    />
                    {folderSearch && (
                      <button type="button" onClick={() => setFolderSearch('')}>
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div className="v2-runs-city-pills">
                    <button
                      type="button"
                      className={cx('v2-city-pill', folderCity === 'all' && 'is-active')}
                      onClick={() => setFolderCity('all')}
                    >
                      All ({effectiveRuns.length})
                    </button>
                    {folderCities.map(city => {
                      const count = effectiveRuns.filter(r => (r.location || '').toLowerCase().includes(city.toLowerCase())).length;
                      return (
                        <button
                          type="button"
                          key={city}
                          className={cx('v2-city-pill', folderCity.toLowerCase() === city.toLowerCase() && 'is-active')}
                          onClick={() => setFolderCity(city)}
                        >
                          <MapPin size={10} /> {city} ({count})
                        </button>
                      );
                    })}
                  </div>

                  <div className="v2-runs-toolbar-right">
                    <button
                      type="button"
                      className="v2-btn v2-btn-ghost v2-btn-xs"
                      onClick={handleSelectAllFolders}
                      title="Select or deselect all folders"
                    >
                      {selectedFolderIds.size === filteredRuns.length && filteredRuns.length > 0 ? (
                        <>
                          <CheckSquare size={12} className="v2-text-lime" /> Deselect All
                        </>
                      ) : (
                        <>
                          <Square size={12} /> Select All
                        </>
                      )}
                    </button>

                    <div className="v2-runs-sort">
                      <select value={folderSort} onChange={e => setFolderSort(e.target.value)}>
                        <option value="newest">Newest first</option>
                        <option value="leads">Most leads</option>
                        <option value="phones">Most mobile numbers</option>
                        <option value="name">Name A–Z</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Batch Actions Floating / Sticky Bar */}
                {selectedFolderIds.size > 0 && (
                  <div className="v2-runs-batch-bar">
                    <div className="v2-runs-batch-info">
                      <CheckSquare size={16} className="v2-text-lime" />
                      <span><b>{selectedFolderIds.size}</b> folders selected</span>
                      <span className="v2-runs-batch-leads">
                        ({formatNumber(effectiveRuns.filter(r => selectedFolderIds.has(r.id)).reduce((acc, r) => acc + (r.leadCount || 0), 0))} total leads)
                      </span>
                    </div>
                    <div className="v2-runs-batch-actions">
                      {selectedFolderIds.size >= 2 && (
                        <button
                          type="button"
                          className="v2-btn v2-btn-lime v2-btn-sm"
                          onClick={() => setShowMergeModal(true)}
                        >
                          <GitMerge size={13} /> Merge &amp; Deduplicate ({selectedFolderIds.size})
                        </button>
                      )}
                      <button
                        type="button"
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => setSelectedFolderIds(new Set())}
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                )}

                <div className="v2-run-grid">
                  {filteredRuns.map(runCard => (
                    <RunCard
                      key={runCard.id}
                      run={runCard}
                      active={sessionFilter === runCard.id || run?.id === runCard.id}
                      loading={folderLoading === runCard.id}
                      selected={selectedFolderIds.has(runCard.id)}
                      onToggleSelect={handleToggleSelectFolder}
                      onOpen={() => openFolder(runCard)}
                      onRename={() => setRenamingFolder(runCard)}
                      onExport={exportFolder}
                      onLoadToCockpit={loadFolderToCockpit}
                      onDelete={deleteFolder}
                    />
                  ))}
                  {filteredRuns.length === 0 && (
                    <EmptyState
                      icon={FolderArchive}
                      title={folderSearch || folderCity !== 'all' ? 'No folders match your filter.' : 'No folders saved yet.'}
                      body={folderSearch || folderCity !== 'all' ? 'Try changing your search term or clearing the city filter.' : 'Run your first search. When it finishes, the leads are written to a dated folder you can reopen any time.'}
                      action={() => { setFolderSearch(''); setFolderCity('all'); }}
                      actionLabel="Reset filters"
                    />
                  )}
                </div>
              </section>
            )}

            {activeTab === 'deep' && (
              <DeepJobsView
                stats={stats}
                deepEstimate={deepEstimate}
                batchConfig={batchConfig}
                setBatchConfig={setBatchConfig}
                queueDeepManual={queueDeepManual}
                batchStarting={batchStarting}
                vendors={vendors}
                deepJob={deepJob}
                deepJobs={deepJobs}
                stopDeep={stopDeep}
                resumeDeep={resumeDeep}
                recentProfiles={recentProfiles}
                setSelectedVendor={setSelectedVendor}
              />
            )}
          </div>
        </main>
      </div>

      {selectedVendor && (
        <VendorDrawer
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onUpdated={() => { loadVendors(); loadHealth(); }}
        />
      )}

      {folderView && (
        <FolderView
          view={folderView}
          onClose={() => setFolderView(null)}
          onExport={exportFolder}
          onLoadToCockpit={loadFolderToCockpit}
          onDelete={deleteFolder}
          onReScrape={reScrapeFolder}
          onSelectVendor={setSelectedVendor}
          onStageChange={updateCrmStage}
          onRename={folder => setRenamingFolder(folder || folderView.run || folderView.session)}
        />
      )}

      {renamingFolder && (
        <RenameModal
          folder={renamingFolder}
          onClose={() => setRenamingFolder(null)}
          onSave={handleRenameFolder}
        />
      )}

      {showMergeModal && (
        <MergeModal
          folders={effectiveRuns.filter(r => selectedFolderIds.has(r.id))}
          onClose={() => setShowMergeModal(false)}
          onMerge={handleMergeFolders}
          isMerging={isMerging}
        />
      )}

      {trashOpen && (
        <TrashModal
          onClose={() => setTrashOpen(false)}
          onRestored={() => { refresh(); }}
        />
      )}

      {hwPopupOpen && (
        <div className="v2-gbc-hw-modal-backdrop" role="dialog" aria-modal="true" aria-label="Local Hardware Acceleration Setup">
          <div className="v2-gbc-hw-modal">
            <div className="v2-gbc-hw-bezel">
              <div className="v2-gbc-hw-head">
                <div className="v2-gbc-hw-title">
                  <span className="v2-gbc-hw-led" />
                  <div>
                    <small>SCRAPER.CO.IN · GAME BOY COLOR TURBO ENGINE</small>
                    <h3>Use Your Computer Hardware for Zero-Queue Ultra-Fast Leads</h3>
                  </div>
                </div>
                <button
                  type="button"
                  className="v2-icon-btn"
                  onClick={() => {
                    setHwPopupOpen(false);
                    try { localStorage.setItem('scraper_hw_popup_seen_v2', 'true'); } catch (e) {}
                  }}
                  aria-label="Close hardware popup"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="v2-gbc-hw-specs">
                <div className="v2-gbc-spec-card is-best">
                  <span>DETECTED RAM</span>
                  <b>{hardware.ramGb} GB RAM</b>
                  <small>{hardware.tierLabel} · Web Worker Ready</small>
                </div>
                <div className="v2-gbc-spec-card">
                  <span>CPU THREADS</span>
                  <b>{hardware.cpuCores} Cores</b>
                  <small>{hardware.parallelZones}x Parallel Zones Simultaneous</small>
                </div>
                <div className="v2-gbc-spec-card">
                  <span>BACKGROUND ENGINES</span>
                  <b>All 6 Active</b>
                  <small>Maps · Directories · Websites · Auto-Dedup</small>
                </div>
              </div>

              <div className="v2-gbc-hw-engines">
                {ALL_BUILTIN_ENGINES.map(eng => (
                  <div key={eng.id} className="v2-gbc-hw-engine-pill">
                    <b>{eng.number} · {eng.name}</b>
                    <span>AUTO ON</span>
                  </div>
                ))}
              </div>

              <div className="v2-gbc-hw-tiers">
                {DEVICE_REQUIREMENTS.map(req => (
                  <div key={req.tier} className={cx('v2-gbc-tier-chip', req.tier === hardware.tier && 'is-current')}>
                    <b>{req.badge} ({req.ram})</b>
                    <span>{req.parallelZones} Parallel Zones · {req.speed}</span>
                  </div>
                ))}
              </div>

              <div className={cx('cb-glass-card', extState.connected ? 'is-live' : 'is-idle')}>
                <div className="cb-glass-head">
                  <span className={cx('cb-led', extState.connected ? 'is-live' : 'is-warn')} />
                  <div className="cb-glass-title">
                    <b>{extState.connected ? 'RAM TURBO CONNECTED' : 'ADD RAM TURBO'}</b>
                    <span>
                      {extState.connected
                        ? `v${extState.version || '1.1.0'} · ${hardware.ramGb} GB · ${hardware.parallelZones} lanes · ${extState.relayed || 0} pages relayed`
                        : 'One click in Chrome. After that it connects itself.'}
                    </span>
                  </div>
                  <span className={cx('cb-chip', extState.connected ? 'is-live' : 'is-idle')}>
                    {extState.connected ? 'READY' : 'NOT CONNECTED'}
                  </span>
                </div>

                <p className="cb-glass-copy">
                  All 6 engines stay on our servers. RAM Turbo only lets them read pages through your
                  connection, so your searches skip the queue and never share your browsing data.
                </p>

                {!extState.connected && (
                  <ol className="cb-steps">
                    <li><b>Add</b> RAM Turbo to Chrome.</li>
                    <li><b>Reload</b> this page.</li>
                    <li><b>Search</b> — it starts on its own.</li>
                  </ol>
                )}

                <div className="cb-glass-actions">
                  {extState.connected ? (
                    <span className="cb-badge-live">All engines on your hardware</span>
                  ) : extState.storeUrl ? (
                    <a
                      className="cb-btn-primary"
                      href={extState.storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download size={14} />
                      <span>Add to Chrome</span>
                    </a>
                  ) : (
                    <a className="cb-btn-primary" href={EXTENSION_DOWNLOAD_URL} download>
                      <Download size={14} />
                      <span>Install (developer build)</span>
                    </a>
                  )}
                </div>

                {!extState.connected && !extState.storeUrl && (
                  <p className="cb-glass-fine">
                    The Chrome Web Store listing is in review. Until it is live, use the developer
                    build: unzip it, open <code>chrome://extensions</code>, turn on Developer mode,
                    then choose Load unpacked.
                  </p>
                )}

                {extState.lastError && (
                  <p className="cb-glass-fine is-error">Last error: {extState.lastError}</p>
                )}
              </div>

              <div className="v2-gbc-hw-actions">
                <button
                  type="button"
                  className="v2-gbc-hw-primary"
                  onClick={enableLocalHardwareTurbo}
                >
                  <span className="lx-gbc-keycap is-a">A</span>
                  <Zap size={16} />
                  <span>
                    {extState.connected
                      ? `START SEARCHING · ${hardware.parallelZones}x ON YOUR HARDWARE`
                      : 'CONNECT RAM TURBO TO START'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
