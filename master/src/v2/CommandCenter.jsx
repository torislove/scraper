import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, BarChart3, Brain, Check, CheckCircle2, CheckSquare, ChevronDown, Clock, Compass,
  ChevronLeft, ChevronRight, CircleDot, Copy, Crosshair, Database, Download,
  ExternalLink, FileSpreadsheet, FileText, Filter, Folder, FolderArchive, Globe2, Layers, LayoutDashboard,
  Loader2, MapPin, MessageSquare, Phone, PhoneCall, Play, Radar as RadarIcon,
  RefreshCw, Search, SlidersHorizontal, Smartphone, Sparkles, Square, Star, Settings,
  Table2, Tag, Terminal, Trash2, Users, Wifi, WifiOff, X, Zap, Cpu, Edit3, GitMerge, RotateCcw, Plus,
  Volume2, VolumeX, Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import CommandMap from './CommandMap';
import VendorDrawer from './VendorDrawer';
import SearchConsole from './SearchConsole';
import EngineStatusBoard from './EngineStatusBoard';
import MasterTerminalView from './MasterTerminalView';
import { CRM_STAGES, crmStageOf, formatInr } from './utils/leadStages';
import {
  deepExtractVendor, getDeepJob, getDeepJobs, getEstimate, getHealth,
  getScrapeJobs, getSessions, getSessionVault, getVendors, sessionExportUrl,
  startAuto, startMasterSweep, previewMasterSweep, startDeepBatch, startOmni, stopAllScrapes, resumeScrape, stopDeepJob, resumeDeepJob, updateVendorCrm, streamUrl, fallbackStreamUrl,
  deleteSession, renameSession, mergeSessions, batchDeleteSessions,
  getLiveClientSessions, sessionStreamUrl
} from './api';
import {
  Logo, ScoreRing, StatusPill, cx, formatDuration, formatNumber,
  relativeTime
} from './ui';
import {
  parseAdaptivePhone, parseIndianPhone, isIndianMobile, isIndianLandline,
  getDisplayPhone, isMobilePhone, whatsappNumber, classifyPhone
} from '../utils/phoneClassify';
import { createLiveStream } from './liveStream';
import { API_URL } from '../apiConfig';
import { authHeaders, getSession } from './auth';
import { useExtension } from './context/ExtensionContext';
import { IS_DESKTOP, HOME_ROUTE } from '../desktop';
import DesktopBadge from './DesktopBadge';
import { detectDeviceHardware } from './utils/deviceRamEngine';

const STRATEGIES = ['broad', 'smart', 'strict'];


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
  deep: 'deep',
  intelligence: 'intelligence',
  ai: 'intelligence',
  engines: 'engines',
  engine: 'engines',
  terminal: 'terminal',
  logs: 'terminal'
};

function tabFromUrl(value) {
  return TAB_ALIASES[String(value || '').toLowerCase()] || 'cockpit';
}

function urlFromTab(tab) {
  return tab === 'runs' ? 'folders' : tab;
}

// Modular components
import RunCard from './components/cards/RunCard';
import { MetricCard, ToggleTile, VendorAvatar, EmptyState, MapLegend, DeepJobRow } from './components/cards/MetricCard';
import FilterBar, { SORTS } from './components/cards/FilterBar';
import RenameModal from './components/modals/RenameModal';
import MergeModal from './components/modals/MergeModal';
import CockpitFolderRow from './components/CockpitView/CockpitFolderRow';
import CockpitView from './components/CockpitView/CockpitView';
import FolderView from './components/FolderView/FolderView';
import SystemCheckPill from './components/SystemCheckPill';
import LeadsTableView from './components/views/LeadsTableView';
import MapViewTab from './components/views/MapViewTab';
import FoldersGridView from './components/views/FoldersGridView';
import IntelligenceView from './components/views/IntelligenceView';
import DeepJobsView from './components/views/DeepJobsView';
import { extractLeadArea, CarriedBadge, qualityOf, mergeSingleVendor, mergeVendorLists } from './utils/leadHelpers';
import { leadSourceMeta } from './utils/leadSource';
import InstrumentPanel from './components/InstrumentPanel';
import CountryFlagStrip from './components/CountryFlagStrip';
import AccountMenu from './components/AccountMenu';
import TrashModal from './components/TrashModal';
import RetroDigitalTimer from './components/RetroDigitalTimer';
import { findCountry } from './data/countries';

const LAST_LIVE_SESSION_KEY = 'scraper_master_last_live_session';

function readLastLiveSession() {
  try { return localStorage.getItem(LAST_LIVE_SESSION_KEY) || ''; } catch (e) { return ''; }
}

function persistLastLiveSession(sid) {
  try {
    if (sid) localStorage.setItem(LAST_LIVE_SESSION_KEY, sid);
    else localStorage.removeItem(LAST_LIVE_SESSION_KEY);
  } catch (e) {}
}

import {
  tokenizeQuery, normalizePhoneDigits, matchesLead, matchesFolder,
  scoreLead, highlightMatches
} from '../utils/universalSearchEngine';



function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (!Number.isFinite(nLat1) || !Number.isFinite(nLon1) || !Number.isFinite(nLat2) || !Number.isFinite(nLon2)) return null;
  if (nLat1 === 0 && nLon1 === 0) return null;
  if (nLat2 === 0 && nLon2 === 0) return null;

  const R = 6371; // Earth's radius in km
  const dLat = (nLat2 - nLat1) * (Math.PI / 180);
  const dLon = (nLon2 - nLon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(nLat1 * (Math.PI / 180)) * Math.cos(nLat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
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
  const sseStatusRef = useRef('connecting');
  const updateSseStatus = useCallback((status) => {
    sseStatusRef.current = status;
    setSseStatus(status);
  }, []);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [connectionLatency, setConnectionLatency] = useState(null);
  const [reconnectAttemptCount, setReconnectAttemptCount] = useState(0);
  const reconnectStreamRef = useRef(null);

  // RAM Turbo: the master uses the same zero-knowledge root extension context as the client.
  const {
    ready: extReady,
    relayed: extRelayed,
    hardware,
    skippedExtension,
    skipAndRunLocal,
    ensureConnected,
    openTelemetry,
    openSetup
  } = useExtension();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Network restored. Reconnecting to data stream...', { id: 'net-status' });
      if (reconnectStreamRef.current) reconnectStreamRef.current(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Network offline. Please check your internet connection.', { id: 'net-status', duration: 8000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const pingId = setInterval(async () => {
      if (!navigator.onLine) {
        setIsOnline(false);
        setConnectionLatency(null);
        setHealth(null);
        return;
      }
      const t0 = performance.now();
      try {
        const data = await getHealth();
        const latency = Math.round(performance.now() - t0);
        if (data && data.ok !== false) {
          setConnectionLatency(latency);
          setHealth(data);
          setIsOnline(true);
        } else {
          setConnectionLatency(null);
          setHealth(null);
        }
      } catch (e) {
        setConnectionLatency(null);
        setHealth(null);
        if (!navigator.onLine) setIsOnline(false);
      }
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pingId);
    };
  }, []);
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
  const [runsSubTab, setRunsSubTab] = useState('client'); // 'client' | 'master'
  const [masterSweepForm, setMasterSweepForm] = useState({
    category: '', name: '', scope: 'district',
    deep: false, engines: 'auto',
    minRating: 0, mobileOnly: false, hasWebsite: false, verifiedOnly: false
  });
  const [masterLaunching, setMasterLaunching] = useState(false);
  const [masterPreview, setMasterPreview] = useState(null);
  const [masterPreviewLoading, setMasterPreviewLoading] = useState(false);
  const [masterPreviewError, setMasterPreviewError] = useState('');
  const [masterConfirm, setMasterConfirm] = useState(false);

  const [selectedFolderIds, setSelectedFolderIds] = useState(new Set());
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // Autonomous Intelligence Memory Bank State
  const [taxonomyData, setTaxonomyData] = useState(null);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(false);
  const [seedingTaxonomy, setSeedingTaxonomy] = useState(false);

  const fetchTaxonomy = useCallback(async () => {
    setLoadingTaxonomy(true);
    try {
      const res = await fetch(`${API_URL}/search/learned?limit=100`, {
        credentials: 'include',
        headers: { ...authHeaders(), 'x-workspace-scope': 'master' }
      });
      const data = await res.json();
      if (data.ok) setTaxonomyData(data);
    } catch (e) {
      toast.error('Could not load learned intelligence');
    } finally {
      setLoadingTaxonomy(false);
    }
  }, []);

  const seedUniversalIntelligence = useCallback(async () => {
    setSeedingTaxonomy(true);
    try {
      const res = await fetch(`${API_URL}/search/taxonomy/seed`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...authHeaders(), 'x-workspace-scope': 'master' }
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || 'Universal Intelligence Seeded!');
        fetchTaxonomy();
      }
    } catch (e) {
      toast.error('Could not seed universal intelligence');
    } finally {
      setSeedingTaxonomy(false);
    }
  }, [fetchTaxonomy]);

  const [form, setForm] = useState({
    category: '',
    location: '',
    strategy: 'broad',
    targetLeads: 100,
    coverageMode: 'fast',
    serp: true,
    maps: true,
    ai: false,
    justdial: true,
    indiamart: false,
    weddings: false,
    social: false,
    postWebsite: true,
    postDeep: true,
    deepLimit: 100
  });

  // Country context for the flag bar. India is home; every other country runs
  // the keyless global engines. The choice only pre-fills an empty location box,
  // so a user can still type any city and let the engine detect the country.
  const [searchCountry, setSearchCountry] = useState(() => {
    const fromUrl = searchParams.get('country');
    if (fromUrl) return String(fromUrl).toUpperCase();
    try { return localStorage.getItem('scraper-country') || 'IN'; } catch (e) { return 'IN'; }
  });
  // Filled by CountryFlagStrip from /api/sources?country=XX. The Master uses it
  // to label scope buttons in the country's own words.
  const [countryMeta, setCountryMeta] = useState(null);

  const handleCountrySelect = useCallback((code, country) => {
    setSearchCountry(code);
    try { localStorage.setItem('scraper-country', code); } catch (e) {}
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
  const [liveClientSessions, setLiveClientSessions] = useState([]);
  const [monitorSession, setMonitorSession] = useState(null);
  const monitorSessionRef = useRef(null);
  useEffect(() => { monitorSessionRef.current = monitorSession; }, [monitorSession]);

  // Periodic polling for active client sessions to populate Master's "Watch Client Live" monitor
  useEffect(() => {
    let alive = true;
    const pollClients = async () => {
      try {
        const list = await getLiveClientSessions();
        if (alive && Array.isArray(list)) {
          setLiveClientSessions(list);
          if (monitorSessionRef.current && !list.some(s => s.id === monitorSessionRef.current.id)) {
            // Client session ended
            setMonitorSession(null);
            toast('Client session completed.', { icon: '🏁' });
          }
        }
      } catch (e) {}
    };
    pollClients();
    const interval = setInterval(pollClients, 3500);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  const [gridZones, setGridZones] = useState([]);
  const [scanning, setScanning] = useState(false);

  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(true);
  const [estimateError, setEstimateError] = useState('');
  const [deepEstimate, setDeepEstimate] = useState(null);
  const [scanPlan, setScanPlan] = useState(null);

  const initialPreset = (searchParams.get('preset') || '').toLowerCase();
  const [filters, setFilters] = useState({
    query: '',
    phoneOnly: initialPreset === 'startup' || initialPreset === 'sales',
    primeOnly: false,
    websiteOnly: false,
    noWebsiteOnly: initialPreset === 'agency',
    deepOnly: false,
    conflictsOnly: false,
    minRating: initialPreset === 'agency' ? 4 : 0,
    sort: initialPreset === 'sales' ? 'area' : initialPreset === 'startup' ? 'quality' : 'newest',
    source: 'all'
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sessionFilter, setSessionFilter] = useState(() => readLastLiveSession());
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('all');
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
                  leadCount: vault.leadCount || (Array.isArray(vault.leads) ? vault.leads.length : 0),
                  completedZones: vault.metadata?.completedZones ?? 0,
                  totalZones: vault.metadata?.totalZones ?? 0,
                  status: vault.metadata?.status === 'aborted' ? 'aborted' : 'complete',
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

      // Detect an interrupted session on page load, but never guess while the
      // engine still reports that session as live. A folder that is mid-run
      // must not become a pause banner just because its snapshot is partial.
      if (!runRef.current && Array.isArray(sessionData) && sessionData.length > 0) {
        const latest = sessionData[0];
        const totalZ = Number(latest.metadata?.totalZones) || 0;
        const compZ = Number(latest.metadata?.completedZones) || 0;
        const explicitStatus = String(latest.status || latest.metadata?.status || '').toLowerCase();
        const explicitlyStopped = ['aborted', 'failed', 'interrupted'].includes(explicitStatus);

        let live = false;
        try {
          const jobs = await getScrapeJobs();
          const list = Array.isArray(jobs)
            ? jobs
            : (Array.isArray(jobs?.omniJobs) ? jobs.omniJobs : []);
          live = list.some(job =>
            (job.id === latest.id || job.sessionId === latest.id) &&
            ['queued', 'running', 'stopping'].includes(String(job.status || '').toLowerCase())
          );
        } catch (e) { /* fall through to the folder evidence */ }

        const isInterrupted = !live && (explicitlyStopped || (totalZ > 0 && compZ < totalZ));
        if (isInterrupted) {
          setRun({
            ...latest,
            id: latest.id,
            sessionId: latest.id,
            status: explicitlyStopped ? explicitStatus : 'interrupted',
            leadCount: latest.leadCount || 0,
            completedZones: compZ,
            totalZones: totalZ
          });
        }
      }

      // Once a run is finished, hydrate it from the folder so counts and
      // status match disk instead of a stale live counter.
      const currentRun = runRef.current;
      if (currentRun && currentRun.status !== 'running') {
        const match = (sessionData || []).find(
          session => session.id === (currentRun.sessionId || currentRun.id)
        );
        if (match) {
          setRun(prev => prev ? {
            ...prev,
            status: match.status && match.status !== 'running' ? match.status : prev.status,
            leadCount: Number.isFinite(Number(match.leadCount)) ? Number(match.leadCount) : prev.leadCount,
            completedZones: match.metadata?.completedZones ?? prev.completedZones,
            totalZones: match.metadata?.totalZones ?? prev.totalZones
          } : prev);
        }
      }
    } catch (error) {
      // Keep the last good state.
    }
  }, [loadVendors, loadHealth]);

  useEffect(() => {
    refresh();
    // A cold start can race the backend: the first list call happens while the
    // API is still booting, leaving the folder counters at zero until a manual
    // refresh. Retry once shortly after mount.
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

  // SSE: logs, vendor events, progress with Auto-Reconnect supervisor
  useEffect(() => {
    let flushTimer = null;
    let microFlushTimer = null;
    let mounted = true;
    let stream = null;
    const vendorBuffer = [];
    const logBuffer = [];

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

    const pushLog = line => {
      if (!line) return;
      logBuffer.push(typeof line === 'string' ? line : JSON.stringify(line));
      lastEventRef.current = Date.now();
    };

    // Every reconnect creates a fresh EventSource, so listeners are bound here
    // instead of once at mount. `open` / `error` / heartbeat scheduling lives
    // in createLiveStream; this function only owns the data handlers.
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

          const activeSid = monitorSessionRef.current?.id || activeSessionIdRef.current || runRef.current?.sessionId || runRef.current?.id || sessionFilterRef.current;
          const incomingSid = vendor.sessionId || vendor.lastSessionId;
          const belongsToActive = Boolean(
            activeSid && (
              !incomingSid
              || incomingSid === activeSid
              || (Array.isArray(vendor.sessionIds) && vendor.sessionIds.includes(activeSid))
            )
          );

          // STRICT TENANT ISOLATION: Drop foreign vendors if Master has no active run and is not monitoring this session
          if (!activeSid || (!belongsToActive && incomingSid)) {
            return;
          }

          // STRICT CROSS-INDUSTRY PURITY GUARD:
          // Defend client stream and Leaflet map pins against off-category bleed
          const activeCat = String(category || runRef.current?.category || '').toLowerCase();
          const vName = String(vendor.name || '').toLowerCase();
          const vSub = String(vendor.subcategory || vendor.category || '').toLowerCase();
          const vComb = `${vName} ${vSub}`;

          if (activeCat.includes('turmeric') || activeCat.includes('chilli') || activeCat.includes('spice') || activeCat.includes('agro') || activeCat.includes('haldi')) {
            const isAgroConflict = /\b(electrical|electricals|electric|electronics|electronic|switchgear|switch|switches|wire|wires|cable|cables|lighting|fixtures|fans|appliances|spares|power\s*tools|hardware|steel|tmt|cement|tiles|sanitary|saree|textile|clothing|garment|hospital|clinic|dentist|hotel|lodge)\b/i.test(vComb);
            if (isAgroConflict) return;
          } else if (activeCat.includes('steel') || activeCat.includes('tmt')) {
            if (/\b(turmeric|spices|chilli|grain|paddy|saree|handloom|cloth|textile|hotel|lodge|hospital|clinic|dentist|pharmacy)\b/i.test(vComb)) return;
          } else if (activeCat.includes('saree') || activeCat.includes('textile') || activeCat.includes('handloom')) {
            if (/\b(turmeric|spices|chilli|steel|iron|tmt|cement|tiles|sanitaryware|hardware|hospital|clinic|pharmacy|hotel|electrical)\b/i.test(vComb)) return;
          }

          if (belongsToActive) {
            vendor.sessionId = activeSid;
            vendor.lastSessionId = activeSid;
            vendor.sessionIds = Array.isArray(vendor.sessionIds)
              ? Array.from(new Set([...vendor.sessionIds, activeSid]))
              : [activeSid];
            if (runRef.current?.status === 'running' || activeSessionIdRef.current === activeSid || monitorSessionRef.current) {
              runVendorIdsRef.current.add(vendor.id);
              setRunLeadCount(runVendorIdsRef.current.size);
            }
          }

          vendorBuffer.push(vendor);
          const locLabel = vendor.zoneName || vendor.locality || vendor.mandal || vendor.city || vendor.village || 'location unknown';
          pushLog(`[LEAD] ${vendor.name || vendor.id} · ${vendor.phone || 'no phone'} · 📍 ${locLabel}`);
          scheduleMicroFlush();
        } catch (error) { /* ignore */ }
      });

      es.addEventListener('progress', event => {
        try {
          const data = JSON.parse(event.data);
          const currentRun = runRef.current;
          const currentId = monitorSessionRef.current?.id || currentRun?.sessionId || currentRun?.id;
          // STRICT PROGRESS ISOLATION: Ignore all progress events if Master is idle and not monitoring!
          if (!currentId) return;
          if (data?.sessionId && data.sessionId !== currentId) return;

          lastEventRef.current = Date.now();
          setProgress(data);
          if (typeof data?.sessionActive === 'boolean') {
            if (!data.sessionActive) {
              setScanning(false);
              const explicitStop = data.aborted === true
                || ['aborted', 'failed', 'interrupted'].includes(String(data.status || '').toLowerCase());
              const totalZ = Number(data.totalMandals || data.totalMandalsAcrossAll) || 0;
              const doneZ = Number(data.completedMandals ?? data.overallCompletedMandals) || 0;
              const incomplete = totalZ > 0 && doneZ < totalZ;
              if (currentRun?.status === 'running' && (explicitStop || incomplete)) {
                setRun(prev => ({
                  ...(prev || {}),
                  id: data.sessionId || prev?.id,
                  sessionId: data.sessionId || prev?.sessionId,
                  status: explicitStop ? (String(data.status || '').toLowerCase() || 'aborted') : 'interrupted',
                  completedZones: doneZ,
                  totalZones: totalZ,
                  leadCount: prev?.leadCount
                }));
                toast.error(`⚠️ Scrape stopped (${doneZ}/${totalZ || '?'} zones done). Choose "Continue Scrape" to resume.`, { id: 'scrape-stop-alert', duration: 8000 });
              }
            } else {
              setScanning(true);
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
          if (runRef.current?.status === 'stopped' || runRef.current?.status === 'complete') return;
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

    stream = createLiveStream({
      url: streamUrl(),
      fallbackUrl: fallbackStreamUrl(),
      onSource: bindSource,
      onStatus: status => {
        if (!mounted) return;
        const mapped = status === 'open' ? 'open' : status === 'connecting' ? 'connecting' : 'error';
        updateSseStatus(mapped);
        if (mapped === 'open') {
          // Folder counts were fetched while the server was unreachable, so
          // pull them once more now that the feed is live again.
          refresh();
        } else if (mapped === 'error') {
          setHealth(null);
          setConnectionLatency(null);
        }
      },
      onAttempt: count => {
        if (mounted) setReconnectAttemptCount(count);
      }
    });
    reconnectStreamRef.current = () => {
      if (stream) stream.reconnect();
    };

    // The stream owner handles online/focus/visibility. This custom event is
    // raised by the API layer only when the engine genuinely comes back after
    // being unreachable (edge-triggered), or by the desktop shell after a local
    // engine restart. A healthy socket is never torn down here: reconnect()
    // would otherwise cost a stream on every recovery notification.
    const onServerOnline = () => {
      if (!mounted) return;
      if (stream && stream.status !== 1) stream.reconnect();
      refresh();
    };
    const onServerOffline = () => {
      if (!mounted) return;
      setHealth(null);
      setConnectionLatency(null);
    };
    window.addEventListener('leadharvest:server_online', onServerOnline);
    window.addEventListener('leadharvest:server_offline', onServerOffline);

    stream.start();

    flushTimer = setInterval(flushBuffers, 250);

    return () => {
      mounted = false;
      window.removeEventListener('leadharvest:server_online', onServerOnline);
      window.removeEventListener('leadharvest:server_offline', onServerOffline);
      if (flushTimer) clearInterval(flushTimer);
      if (microFlushTimer) clearTimeout(microFlushTimer);
      if (stream) stream.stop();
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

    const finishedAt = Date.now();
    setRun(prev => prev ? { ...prev, status, finishedAt } : prev);
    setScanning(false);
    const targetSessionId = current.sessionId || current.id || activeSessionIdRef.current;
    if (targetSessionId) {
      activeSessionIdRef.current = targetSessionId;
      setSessionFilter(targetSessionId);
      persistLastLiveSession(targetSessionId);
    }
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
      refresh(targetSessionId);
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
        // A "sessionActive: false" frame also arrives between phases. Only treat
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
  const updateFilter = (keyOrPatch, value) => {
    setFilters(prev => {
      const patch = (keyOrPatch && typeof keyOrPatch === 'object') ? keyOrPatch : { [keyOrPatch]: value };
      const next = { ...prev, ...patch };
      if (patch.noWebsiteOnly) next.websiteOnly = false;
      if (patch.websiteOnly) next.noWebsiteOnly = false;
      return next;
    });
  };
  const updateMasterSweep = (key, value) => {
    setMasterConfirm(false);
    setMasterSweepForm(prev => ({ ...prev, [key]: value }));
  };

  // Debounced dry-run: the operator sees the exact zone count, local unit
  // names, coverage and ETA before a single credit is spent.
  useEffect(() => {
    const name = String(masterSweepForm.name || '').trim();
    if (name.length < 3) {
      setMasterPreview(null);
      setMasterPreviewError('');
      setMasterPreviewLoading(false);
      return undefined;
    }
    let cancelled = false;
    setMasterPreviewLoading(true);
    setMasterPreviewError('');
    const timer = setTimeout(async () => {
      try {
        const data = await previewMasterSweep({
          scope: masterSweepForm.scope,
          name,
          deep: masterSweepForm.deep
        });
        if (!cancelled) setMasterPreview(data);
      } catch (e) {
        if (!cancelled) {
          setMasterPreview(null);
          setMasterPreviewError(e?.response?.data?.error || e.message || 'Preview failed');
        }
      } finally {
        if (!cancelled) setMasterPreviewLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [masterSweepForm.name, masterSweepForm.scope, masterSweepForm.deep]);

  const handleStartMasterSweep = async (sweepParams = {}) => {
    const sweepCat = String(sweepParams.category || masterSweepForm.category || form.category || autoQuery).trim();
    const sweepName = String(sweepParams.name || masterSweepForm.name || form.location || '').trim();
    const scope = sweepParams.scope || masterSweepForm.scope || 'district';
    const expectedZones = Number(sweepParams.totalZones || masterPreview?.totalZones || 0);

    if (!sweepCat || !sweepName) {
      toast.error('Please specify both a category and a target location name for the Master Sweep.');
      return;
    }

    // A large sweep is never launched by a single accidental click. The first
    // press turns the button into an explicit confirmation.
    if (expectedZones > 250 && !sweepParams.confirmed && !masterConfirm) {
      setMasterConfirm(true);
      toast(`This sweep plans ${expectedZones} zones. Press "Confirm & Start" to launch it.`, {
        icon: '⚠️', duration: 7000
      });
      return;
    }

    setMasterLaunching(true);
    setLaunching(true);
    setMasterConfirm(false);
    try {
      const engines = sweepParams.engines
        || (masterSweepForm.engines === 'multi' ? ['geospatial_mesh', 'direct_telecom'] : ['auto']);
      const res = await startMasterSweep({
        category: sweepCat,
        scope,
        name: sweepName,
        deep: masterSweepForm.deep === true,
        engines,
        minRating: Number(masterSweepForm.minRating) || 0,
        mobileOnly: masterSweepForm.mobileOnly === true,
        hasWebsite: masterSweepForm.hasWebsite === true,
        verifiedOnly: masterSweepForm.verifiedOnly === true,
        country: searchCountry,
        hardware: detectDeviceHardware()
      });

      if (res?.sessionId) {
        activeSessionIdRef.current = res.sessionId;
        runVendorIdsRef.current = new Set();
        finishingRef.current = false;
        clearAnimationHighlights();
        setRunLeadCount(0);
        setProgress(null);
        setSessionFilter(res.sessionId);
        persistLastLiveSession(res.sessionId);
        setPage(1);
        setActiveZone(null);
        setGridZones([]);
        setScanning(true);
        lastEventRef.current = Date.now();
        setRun({
          id: res.sessionId,
          sessionId: res.sessionId,
          category: sweepCat,
          location: res.targetName || sweepName,
          familyLabel: 'Master Sweep',
          strategy: 'broad',
          engines,
          postWebsite: true,
          postDeep: true,
          startedAt: Date.now(),
          finishedAt: null,
          status: 'running',
          isMasterSweep: true,
          totalMandalsAcrossAll: Number(res.totalZones) || 1,
          completedMandals: 0
        });
        toast.success(
          `🗺️ ${res.targetName} sweep started · ${res.totalZones} zones · about ${Math.max(1, Math.round(Number(res.estimatedSeconds || 0) / 60))} min`
        );
        setMasterPreview(null);
        setActiveTab('cockpit');
        getSessions().then(list => { if (mountedRef.current) setSessions(list || []); }).catch(() => {});
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || 'Failed to start Master Sweep');
    } finally {
      setMasterLaunching(false);
      setLaunching(false);
    }
  };

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

    // Fast is the default: named localities first. Deep adds the full grid.
    const coverageMode = String(overrides.coverageMode || form.coverageMode || 'fast') === 'deep'
      ? 'deep'
      : 'fast';

    setLaunching(true);
    const sessionId = `cmd_${Date.now().toString(36)}`;
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
          gridDensity: coverageMode,
          engines,
          country: searchCountry,
          sessionId,
          hardware: detectDeviceHardware()
        });
        const plan = response?.plan || {};
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
          gridDensity: coverageMode,
          engines,
          country: searchCountry,
          sessionId,
          hardware: detectDeviceHardware()
        });
        const plan = response?.plan || {};
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
      toast.success(auto ? 'Search started. Live leads will appear in seconds.' : 'Search started. We chose the sources automatically.');
      setActiveTab('cockpit');
    } catch (error) {
      setScanning(false);
      setRun(null);
      activeSessionIdRef.current = '';
      toast.error(error?.response?.data?.error || 'Search could not be started.');
      setLogs(prev => [...prev, `[ERROR] ${error?.response?.data?.error || error.message}`]);
    } finally {
      setLaunching(false);
    }
  };

  const stopRun = async () => {
    setStopping(true);
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
        status: 'aborted',
        finishedAt: Date.now()
      }));
      setProgress(prev => prev ? { ...prev, sessionActive: false } : null);
      setScanning(false);
      await stopAllScrapes(sid);
      toast('Swarm paused safely. Completed leads preserved.', { icon: '⏹' });
      refresh(sid);
    } catch (error) {
      toast.error('Stop request failed.');
    } finally {
      setStopping(false);
    }
  };

  const resumeRun = async (sessionIdToResume) => {
    const sid = sessionIdToResume || run?.sessionId || run?.id;
    if (!sid) return;
    setLaunching(true);
    try {
      const res = await resumeScrape(sid);
      if (res?.alreadyComplete) {
        toast.success(res.message || 'All zones already completed!');
        setLaunching(false);
        return;
      }
      toast.success(`Resumed swarm! ${res.remainingZonesCount || 'Remaining'} zones in flight.`);
      setRun(prev => ({
        ...(prev || {}),
        id: sid,
        sessionId: sid,
        status: 'running'
      }));
      setScanning(true);
      refresh();
    } catch (err) {
      toast.error(`Resume error: ${err?.message || 'Could not resume'}`);
    } finally {
      setLaunching(false);
    }
  };

  const restartRun = () => {
    startRun();
  };

  const clearActiveRun = () => {
    activeSessionIdRef.current = '';
    runVendorIdsRef.current = new Set();
    clearAnimationHighlights();
    persistLastLiveSession('');
    setRun(null);
    setSessionFilter('');
    toast('Ready for new search.', { icon: '✨' });
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

  const backupFolder = runCard => {
    if (!runCard?.id) return;
    const link = document.createElement('a');
    link.href = `${API_URL}/sessions/${runCard.id}/backup`;
    link.rel = 'noreferrer';
    link.download = `vault_backup_${runCard.id}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success(`Downloading backup for "${runCard.name || runCard.id}"...`);
  };

  const backupAllFolders = () => {
    const link = document.createElement('a');
    link.href = `${API_URL}/sessions/backup/all`;
    link.rel = 'noreferrer';
    link.download = `master_vault_complete_backup_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Downloading complete Master vault backup archive...');
  };

  const handleRestoreBackup = async file => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      toast.loading('Restoring vault backup...', { id: 'restore-toast' });
      const res = await fetch(`${API_URL}/sessions/restore-backup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-workspace-scope': 'master', ...authHeaders() },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Backup restored successfully!', { id: 'restore-toast' });
        await refresh();
      } else {
        toast.error(data.error || 'Failed to restore backup.', { id: 'restore-toast' });
      }
    } catch (err) {
      toast.error(`Invalid backup file: ${err.message}`, { id: 'restore-toast' });
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedFolderIds.size) return;
    const ids = Array.from(selectedFolderIds);
    if (!window.confirm(`Permanently delete ${ids.length} selected search folders? An offline backup archive will download automatically before deletion.`)) return;
    backupAllFolders();
    try {
      const res = await batchDeleteSessions(ids);
      const deleted = Array.isArray(res?.deleted) ? res.deleted : [];
      if (deleted.length) {
        const deletedSet = new Set(deleted);
        setSessions(prev => prev.filter(s => !deletedSet.has(s.id)));
        setSelectedFolderIds(new Set());
        if (folderView && deletedSet.has(folderView.run?.id)) {
          setFolderView(null);
        }
        if (run && deletedSet.has(run.sessionId || run.id)) {
          setRun(null);
        }
        const bits = [`Backed up and deleted ${deleted.length} folders`];
        if (res?.leadsRemoved) bits.push(`${res.leadsRemoved} leads removed`);
        if (res?.engagedKept) bits.push(`${res.engagedKept} engaged leads kept`);
        if (res?.missing?.length) bits.push(`${res.missing.length} already gone`);
        toast.success(bits.join(' · '));
      } else {
        toast('Those folders were already removed.', { icon: 'ℹ️' });
      }
      await refresh();
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error;
      if (status === 409) {
        toast.error(message || 'Stop the swarm before deleting these folders.');
      } else {
        toast.error(message || 'Failed to delete selected folders.');
      }
    }
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
      const session = await getSessionVault(runCard.id);
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

  const exportFolder = (runCard, format = 'csv', options = {}) => {
    if (!runCard?.id) return;
    const link = document.createElement('a');
    link.href = sessionExportUrl(runCard.id, format, options);
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

  const deleteFolder = async runCard => {
    if (!runCard?.id) return;
    if (!window.confirm(`Permanently delete folder "${runCard.name || runCard.id}"? An offline backup will download automatically before deletion.`)) return;
    backupFolder(runCard);
    try {
      const res = await deleteSession(runCard.id);
      const deleted = Array.isArray(res?.deleted) ? res.deleted : [];
      if (!deleted.length) {
        toast('That folder was already removed.', { icon: 'ℹ️' });
        await refresh();
        return;
      }
      setSessions(prev => prev.filter(s => s.id !== runCard.id));
      if (sessionFilter === runCard.id) setSessionFilter('');
      if (folderView?.run?.id === runCard.id) setFolderView(null);
      if (run?.sessionId === runCard.id || run?.id === runCard.id) setRun(null);

      const bits = [`Backed up and deleted folder "${runCard.name || runCard.id}"`];
      if (res?.leadsRemoved) bits.push(`${res.leadsRemoved} leads removed`);
      if (res?.engagedKept) bits.push(`${res.engagedKept} engaged leads kept`);
      toast.success(bits.join(' · '));
      await refresh();
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error;
      if (status === 409) {
        toast.error(message || 'Stop the swarm before deleting this folder.');
      } else if (status === 404) {
        toast('That folder was already removed.', { icon: 'ℹ️' });
        await refresh();
      } else {
        toast.error(message || 'Failed to delete folder.');
      }
    }
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
    toast.success(`Configured search for ${cat} in ${loc}. Click "FIND ALL LEADS" to swarm!`);
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
      const isMasterSweep = Boolean(session.isMasterSweep || session.metadata?.isMasterSweep || /master_/i.test(session.id) || /sweep/i.test(session.location || ''));
      // Out-of-Bound folders are rejected rows kept for review. They are never
      // a client folder and must not be labelled as a district sweep.
      const isOutOfBound = Boolean(session.isOutOfBound || session.metadata?.isOutOfBound);
      const hierarchy = session.hierarchy || null;
      const mandals = Array.isArray(hierarchy?.mandals) ? hierarchy.mandals : null;
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
        isMasterSweep,
        isOutOfBound,
        oobDistrict: session.oobDistrict || session.metadata?.oobDistrict || null,
        hierarchy,
        mandalCount: mandals ? mandals.length : undefined,
        villageCount: mandals ? mandals.reduce((sum, m) => sum + (Array.isArray(m.villages) ? m.villages.length : 0), 0) : undefined,
        masterScope: isOutOfBound
          ? null
          : (session.masterScope || (isMasterSweep ? (/state/i.test(session.location || '') ? 'state' : 'district') : null))
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
          isOutOfBound: false,
          oobDistrict: null,
          hierarchy: null,
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
        // Instant Live Admission Guard:
        // Any lead discovered or observed during the active run must NEVER be blocked by session mismatch
        const isLiveIncoming = Boolean(
          (runVendorIdsRef.current && runVendorIdsRef.current.has(vendor.id)) ||
          (activeSessionIdRef.current && (vendor.sessionId === activeSessionIdRef.current || vendor.lastSessionId === activeSessionIdRef.current))
        );

        const matchesSession = isLiveIncoming ||
          (vendor.sessionId === effectiveSessionFilter) ||
          (vendor.lastSessionId === effectiveSessionFilter) ||
          (Array.isArray(vendor.sessionIds) && vendor.sessionIds.includes(effectiveSessionFilter)) ||
          (vendor.sessionId && String(vendor.sessionId).startsWith(effectiveSessionFilter));
        if (!matchesSession) return false;
      }

      // Category Fidelity Guard (Frontend): e.g. prevent pharmacies from appearing when filtering doctors
      const activeCategory = (run?.status === 'running' ? (run?.category || autoQuery || form.category) : (effectiveSessionFilter ? '' : (autoQuery || form.category))).toLowerCase();
      if (activeCategory.includes('doctor') || activeCategory.includes('physician') || activeCategory.includes('clinic')) {
        const vCombined = `${vendor.name || ''} ${vendor.subcategory || ''}`.toLowerCase();
        if (/\b(pharmacy|chemist|druggist|medical store|medicals|medical shop|drug store|surgicals?)\b/i.test(vCombined)) {
          return false;
        }
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
      if (filters.noWebsiteOnly && String(vendor.website || '').trim()) return false;
      if (filters.deepOnly && !vendor.deepExtractedAt) return false;
      if (filters.conflictsOnly && !(Array.isArray(vendor.conflicts) && vendor.conflicts.length)) return false;
      if (filters.minRating && !(Number(vendor.rating) >= Number(filters.minRating))) return false;
      if (filters.source && filters.source !== 'all' && leadSourceMeta(vendor).key !== filters.source) return false;
      if (selectedAreaFilter && selectedAreaFilter !== 'all') {
        const area = extractLeadArea(vendor);
        if (area !== selectedAreaFilter) return false;
      }
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
      if (filters.sort === 'quality') {
        const pA = getDisplayPhone(a);
        const pB = getDisplayPhone(b);
        const scoreA = isMobilePhone(pA, searchCountry) ? 3 : (isIndianLandline(pA) ? 2 : (pA ? 1 : 0));
        const scoreB = isMobilePhone(pB, searchCountry) ? 3 : (isIndianLandline(pB) ? 2 : (pB ? 1 : 0));
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (qualityOf(b) || 0) - (qualityOf(a) || 0);
      }
      if (filters.sort === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
      if (filters.sort === 'area') {
        const pinA = String(a.pincode || '999999').trim();
        const pinB = String(b.pincode || '999999').trim();
        if (pinA !== pinB) return pinA.localeCompare(pinB);
        const areaA = String(a.mandal || a.locality || a.village || a.city || 'zzz').toLowerCase();
        const areaB = String(b.mandal || b.locality || b.village || b.city || 'zzz').toLowerCase();
        if (areaA !== areaB) return areaA.localeCompare(areaB);
        return String(a.name || '').localeCompare(String(b.name || ''));
      }
      // Default 'newest': deterministic arrival/scrapedAt order during and after completion (no post-run jump)
      return new Date(b.scrapedAt || 0) - new Date(a.scrapedAt || 0);
    });

    return list;
  }, [vendors, filters, sessionFilter, effectiveSessionFilter, selectedAreaFilter, run?.status, run?.sessionId, run?.id, runLeadCount, autoQuery, form.category, searchCountry]);

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

  const clientRuns = useMemo(() => effectiveRuns.filter(r => !r.isMasterSweep), [effectiveRuns]);
  const masterRuns = useMemo(() => effectiveRuns.filter(r => r.isMasterSweep), [effectiveRuns]);

  const filteredRuns = useMemo(() => {
    const sourcePool = runsSubTab === 'master' ? masterRuns : clientRuns;
    let list = sourcePool;
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

  const targetSessionId = run?.sessionId || run?.id || folderView?.run?.id || sessionFilter || effectiveSessionFilter;
  const sessionVendors = useMemo(() => {
    if (!targetSessionId && run?.status !== 'running') return vendors;
    return vendors.filter(v =>
      (run?.status === 'running' && runVendorIdsRef.current?.has(v.id)) ||
      (targetSessionId && (
        v.sessionId === targetSessionId ||
        v.lastSessionId === targetSessionId ||
        (Array.isArray(v.sessionIds) && v.sessionIds.includes(targetSessionId))
      ))
    );
  }, [vendors, run, folderView?.run?.id, sessionFilter, targetSessionId, runLeadCount]);

  const runMobilesCount = useMemo(() => {
    return sessionVendors.filter(v => {
      const p = getDisplayPhone(v);
      return isMobilePhone(p, searchCountry);
    }).length;
  }, [sessionVendors, searchCountry]);

  const stats = useMemo(() => {
    const target = sessionVendors || [];
    const phones = target.filter(vendor => {
      const p = getDisplayPhone(vendor);
      return isMobilePhone(p, searchCountry);
    }).length;
    const websites = target.filter(vendor => vendor.website).length;
    const deep = target.filter(vendor => vendor.deepExtractedAt).length;
    const conflicts = target.reduce((sum, vendor) => sum + (Array.isArray(vendor.conflicts) ? vendor.conflicts.length : 0), 0);
    const scores = target
      .map(vendor => qualityOf(vendor))
      .filter(score => score != null && Number.isFinite(score));
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { phones, websites, deep, conflicts, avg };
  }, [vendors, targetSessionId, sessionVendors, run?.status]);

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

  // Launchpad copy adapts to the country's own administrative vocabulary.
  // Scope ids stay stable (state / district / mandal / city) so saved runs and
  // the sweep planner keep working; only the display words change.
  const countryName = (findCountry(searchCountry) || { name: 'India' }).name;
  const admin = countryMeta?.admin || (searchCountry === 'IN'
    ? { top: 'State', second: 'District', local: 'Mandal / Taluka / Tehsil', subdivision: 'Mandals / Talukas / Tehsils' }
    : { top: 'Region', second: 'District', local: 'City', subdivision: 'Districts' });
  const plural = term => {
    if (!term) return '';
    if (/[^aeiou]y$/i.test(term)) return `${term.slice(0, -1)}ies`;
    if (/(s|x|z|ch|sh)$/i.test(term)) return `${term}es`;
    return `${term}s`;
  };
  const masterScopeOptions = [
    { id: 'state', label: admin.top, hint: `Every ${admin.second.toLowerCase()} + ${admin.local.toLowerCase()}` },
    { id: 'district', label: admin.second, hint: `Every ${admin.local.toLowerCase()}` },
    { id: 'mandal', label: admin.local, hint: 'Every village, ward and locality' },
    { id: 'city', label: 'City or locality', hint: 'Localities + street grid + ring' }
  ];
  const COUNTRY_PLACE_EXAMPLES = {
    IN: {
      state: 'Andhra Pradesh, Telangana, Tamil Nadu',
      district: 'Guntur District, Coimbatore, NTR',
      mandal: 'Tenali Mandal, Pollachi Taluk',
      city: 'Tenali, Coimbatore, Srirangapatna'
    },
    US: {
      state: 'Texas, California, New York',
      district: 'Travis County, Los Angeles County',
      mandal: 'Austin, Los Angeles, New York City',
      city: 'Downtown Austin, Brooklyn'
    },
    GB: {
      state: 'England, Scotland, Wales',
      district: 'Greater London, Kent, Essex',
      mandal: 'London, Manchester, Leeds',
      city: 'Camden, Soho, Shoreditch'
    },
    CA: {
      state: 'Ontario, Quebec, British Columbia',
      district: 'Toronto Division, Peel Region',
      mandal: 'Toronto, Mississauga, Ottawa',
      city: 'Downtown Toronto, Scarborough'
    },
    AU: {
      state: 'New South Wales, Victoria, Queensland',
      district: 'City of Sydney, Brisbane City',
      mandal: 'Sydney, Melbourne, Brisbane',
      city: 'Surry Hills, Fitzroy'
    },
    AE: {
      state: 'Dubai, Abu Dhabi, Sharjah',
      district: 'Dubai Municipality, Abu Dhabi Municipality',
      mandal: 'Deira, Bur Dubai, Al Barsha',
      city: 'Downtown Dubai, JLT'
    },
    SG: {
      state: 'Central Region, East Region, West Region',
      district: 'Central Region, Jurong, Tampines',
      mandal: 'Orchard, Marina Bay, Jurong East',
      city: 'Singapore, Woodlands, Tampines'
    },
    NZ: {
      state: 'Auckland, Canterbury, Wellington',
      district: 'Auckland Region, Waikato, Otago',
      mandal: 'Auckland, Wellington, Christchurch',
      city: 'Auckland CBD, Hamilton, Dunedin'
    },
    IE: {
      state: 'Leinster, Munster, Connacht',
      district: 'County Dublin, County Cork, County Galway',
      mandal: 'Dublin, Cork, Galway, Limerick',
      city: 'Dublin City Centre, Cork, Galway'
    },
    ZA: {
      state: 'Gauteng, Western Cape, KwaZulu-Natal',
      district: 'City of Johannesburg, City of Cape Town',
      mandal: 'Johannesburg, Cape Town, Durban, Pretoria',
      city: 'Sandton, Cape Town CBD, Umhlanga'
    },
    DE: {
      state: 'Bavaria, Berlin, Hesse, North Rhine-Westphalia',
      district: 'Upper Bavaria, Cologne Region, Stuttgart Region',
      mandal: 'Berlin, Munich, Hamburg, Frankfurt',
      city: 'Mitte Berlin, Munich, Cologne, Stuttgart'
    }
  };
  const examples = COUNTRY_PLACE_EXAMPLES[searchCountry] || {};
  const masterPlaceLabel = masterScopeOptions.find(option => option.id === masterSweepForm.scope)?.label || admin.second;
  const masterPlacePlaceholder = examples[masterSweepForm.scope]
    || `e.g. ${masterPlaceLabel} in ${countryName}`;
  const masterCoverageText = (() => {
    const coverage = masterPreview?.coverage;
    if (!coverage) return '—';
    const secondPlural = plural(admin.second).toLowerCase();
    const localPlural = plural(admin.local).toLowerCase();
    if (masterPreview.scope === 'state' || coverage.districts > 1) {
      return `${formatNumber(coverage.districtsCovered ?? 0)}/${formatNumber(coverage.districts ?? 0)} ${secondPlural} · ${formatNumber(coverage.subDistrictsCovered ?? 0)}/${formatNumber(coverage.subDistricts ?? 0)} ${localPlural}`;
    }
    if (coverage.localities != null) {
      return `${formatNumber(coverage.localitiesCovered ?? 0)}/${formatNumber(coverage.localities ?? 0)} localities`;
    }
    if (masterPreview.scope === 'district') {
      return `${formatNumber(coverage.subDistrictsCovered ?? 0)}/${formatNumber(coverage.subDistricts ?? 0)} ${localPlural} · ${formatNumber(coverage.villagesCovered ?? 0)}/${formatNumber(coverage.villages ?? 0)} villages`;
    }
    if (coverage.subDistricts != null) {
      return `${formatNumber(coverage.subDistrictsCovered ?? 0)}/${formatNumber(coverage.subDistricts ?? 0)} ${localPlural}`;
    }
    if (coverage.districts != null) {
      return `${formatNumber(coverage.districtsCovered ?? 0)}/${formatNumber(coverage.districts ?? 0)} ${secondPlural}`;
    }
    return '—';
  })();
  const bannerDone = run?.completedZones != null ? Number(run.completedZones) || 0 : runDone;
  const bannerTotal = run?.totalZones != null ? Number(run.totalZones) || 0 : runTotal;
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
    const lat = Number(estimate?.location?.lat);
    const lng = Number(estimate?.location?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat && lng) return [lat, lng];
    if (estimate?.zones?.preview?.[0]?.lat && estimate?.zones?.preview?.[0]?.lng) {
      return [Number(estimate.zones.preview[0].lat), Number(estimate.zones.preview[0].lng)];
    }
    const coords = filteredVendors
      .map(vendor => [Number(vendor.latitude), Number(vendor.longitude)])
      .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180 && (a !== 0 || b !== 0));
    if (!coords.length) {
      if (searchCountry === 'CA') return [43.5890, -79.6441];
      if (searchCountry === 'US') return [37.0902, -95.7129];
      if (searchCountry === 'GB') return [51.5074, -0.1278];
      if (searchCountry === 'AU') return [-33.8688, 151.2093];
      if (searchCountry === 'AE') return [25.2048, 55.2708];
      if (searchCountry === 'SG') return [1.3521, 103.8198];
      if (searchCountry === 'NZ') return [-36.8485, 174.7633];
      if (searchCountry === 'IE') return [53.3498, -6.2603];
      if (searchCountry === 'ZA') return [-26.2041, 28.0473];
      if (searchCountry === 'DE') return [52.5200, 13.4050];
      return [22.5937, 79.9629];
    }
    return [
      coords.reduce((sum, pair) => sum + pair[0], 0) / coords.length,
      coords.reduce((sum, pair) => sum + pair[1], 0) / coords.length
    ];
  }, [effectiveActiveZone, gridZones, estimate, filteredVendors, searchCountry]);

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

  const isEngineReady = sseStatus === 'open' || Boolean(health) || (isOnline && connectionLatency !== null && connectionLatency < 3500);

  return (
    <div className="v2-root v2-command">
      <div className="v2-page-grid" aria-hidden="true" />

      {/* Observer Mode Banner when monitoring a Client session */}
      {monitorSession && (
        <div
          className="lx-observer-banner"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
            color: '#e0e7ff',
            borderBottom: '2px solid #818cf8',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
            fontSize: '13px',
            fontWeight: 650
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399' }} />
            <span>
              <b style={{ color: '#38bdf8' }}>OBSERVER MONITOR MODE:</b> Watching live Client session{' '}
              <span style={{ color: '#fef08a', fontFamily: 'monospace' }}>{monitorSession.id}</span>
              {monitorSession.category ? ` · ${monitorSession.category} in ${monitorSession.location || 'Selected Area'}` : ''}{' '}
              — Read Only Live Stream (Zero Master State Pollution)
            </span>
          </div>
          <button
            type="button"
            className="v2-btn v2-btn-secondary v2-btn-sm"
            style={{ background: 'rgba(255,255,255,0.18)', color: '#ffffff', border: '1.5px solid rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px 12px' }}
            onClick={() => setMonitorSession(null)}
          >
            <X size={12} /> Exit Observer Mode
          </button>
        </div>
      )}

      {/* Real-time Network Offline & Reconnecting Supervisor Banner */}
      {(!isOnline || (!isEngineReady && sseStatus === 'error' && reconnectAttemptCount >= 3)) && (
        <div
          className={cx(
            'v2-network-alert-banner',
            !isOnline ? 'is-offline' : 'is-error'
          )}
          style={{
            background: !isOnline
              ? 'linear-gradient(90deg, #991b1b 0%, #dc2626 100%)'
              : 'linear-gradient(90deg, #d97706 0%, #b45309 100%)',
            color: '#FFFFFF',
            padding: '7px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            borderBottom: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!isOnline ? (
              <>
                <WifiOff size={15} style={{ animation: 'v2PulseDot 1.5s infinite' }} />
                <span><b>Network Offline:</b> Internet connection appears disconnected. Leads and search stream are paused. Auto-reconnecting...</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} className="v2-spin" />
                <span><b>Reconnecting to Swarm Server:</b> Backend data stream disconnected (Attempt #{reconnectAttemptCount || 1}). Re-establishing real-time connection...</span>
              </>
            )}
            {connectionLatency && connectionLatency > 2500 && (
              <span style={{ background: 'rgba(0,0,0,0.25)', padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px' }}>
                High latency: {connectionLatency}ms
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (reconnectStreamRef.current) {
                toast.loading('Reconnecting data stream...', { id: 'net-retry' });
                reconnectStreamRef.current(true);
                setTimeout(() => toast.dismiss('net-retry'), 1500);
              }
            }}
            style={{
              background: '#FFFFFF',
              color: !isOnline ? '#991B1B' : '#B45309',
              border: 'none',
              borderRadius: '5px',
              padding: '3px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <RefreshCw size={11} /> Reconnect Now
          </button>
        </div>
      )}

      <header className="v2-cmd-top">
        <div className="v2-cmd-brand">
          <button type="button" className="v2-cmd-home" onClick={() => navigate(HOME_ROUTE)} title={IS_DESKTOP ? 'Dashboard' : 'Back to home'}>
            <Logo compact />
          </button>
          <span className="mc-sovereign-badge">
            <span className="mc-dot" />
            MASTER
          </span>
          <div className="lx-top-nav is-master">
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
              <FolderArchive size={13} /> Folders <b>{formatNumber(clientRuns.length + masterRuns.length)}</b>
            </button>
            <button
              type="button"
              className={cx('lx-nav-chip', activeTab === 'intelligence' && 'is-active')}
              onClick={() => { setActiveTab('intelligence'); fetchTaxonomy(); }}
            >
              <Brain size={13} /> AI Simulator
            </button>
            <button
              type="button"
              className="lx-nav-chip"
              onClick={() => navigate('/clients')}
            >
              <Users size={13} /> Clients
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
            className={cx('cb-relay-pill', extReady && 'is-live')}
            onClick={() => (extReady ? openTelemetry() : openSetup({ country: searchCountry }))}
            title={skippedExtension ? 'Running on Local Node.js Server Engine' : extReady
              ? `RAM Turbo connected · ${extRelayed || 0} pages relayed · ${hardware.ramGb} GB · ${hardware.parallelZones} lanes`
              : 'Add the RAM Turbo extension in Chrome to use your own hardware'}
          >
            <span className={cx('cb-led', extReady ? 'is-live' : 'is-warn')} />
            {skippedExtension
              ? `LOCAL SERVER · ${hardware.ramGb}GB · ${hardware.parallelZones} LANES`
              : extReady
                ? `RAM TURBO · ${extRelayed || 0}`
                : 'CONNECT RAM TURBO'}
          </button>

          <SystemCheckPill variant="master" />

          {liveClientSessions.length > 0 && !monitorSession && (
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-sm lx-watch-client-btn"
              style={{
                background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1px solid #f59e0b',
                color: '#92400e',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 0 #d97706, 0 6px 14px -4px rgba(217, 119, 6, 0.24)',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                borderRadius: 999,
                padding: '4px 11px'
              }}
              onClick={() => {
                const target = liveClientSessions[0];
                setMonitorSession(target);
                toast.success(`Observing Client live scrape: ${target.id}`, { icon: '👁️' });
              }}
              title="Watch active Client scrape live without modifying Master state"
            >
              <Eye size={12} />
              <span>WATCH CLIENT ({liveClientSessions.length})</span>
            </button>
          )}

          <DesktopBadge />
          <AccountMenu variant="master" />
          <div className="v2-tools" ref={toolsRef}>
            <button
              type="button"
              className={cx('v2-btn v2-btn-ghost v2-btn-sm v2-tools-trigger', toolsOpen && 'is-open')}
              onClick={() => setToolsOpen(open => !open)}
              aria-expanded={toolsOpen}
              aria-haspopup="menu"
            >
              <Settings size={13} /> Tools <ChevronDown size={12} className="v2-tools-caret" />
            </button>
            {toolsOpen && (
              <div className="v2-tools-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('map'); }}>
                  <MapPin size={14} />
                  <span><b>Full Screen Map</b><small>Explore all pins &amp; territory zones</small></span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('intelligence'); fetchTaxonomy(); }}>
                  <Brain size={14} />
                  <span><b>AI Intelligence &amp; Simulator</b><small>Test queries across 11 markets</small></span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('engines'); }}>
                  <Activity size={14} />
                  <span><b>Parallel Engines</b><small>Inspect active scrapers &amp; 4GB budget</small></span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('terminal'); }}>
                  <Terminal size={14} />
                  <span><b>System Terminal</b><small>Raw engine telemetry stream</small></span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); navigate('/clients'); }}>
                  <Users size={14} />
                  <span><b>Client Accounts</b><small>Quotas, vaults &amp; broadcasts</small></span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('deep'); }}>
                  <Zap size={14} />
                  <span><b>Profile Engine</b><small>52-field vendor enrichment</small></span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setTrashOpen(true); }}>
                  <Trash2 size={14} />
                  <span><b>Deleted Folders Trash</b><small>Restore archived folders</small></span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); refresh(); toast.success('Data refreshed.'); }}>
                  <RefreshCw size={14} />
                  <span><b>Refresh Data</b><small>Sync leads and folders</small></span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {!extReady && !bannerDismissed && (
        <div className="v2-ext-top-banner">
          <div className="v2-ext-top-banner-main">
            <span className="v2-ext-top-pulse" />
            <div className="v2-ext-top-icon">
              <Cpu size={16} color="#059669" />
            </div>
            <div className="v2-ext-top-copy">
              <b>Connect RAM Turbo Extension (1.2.0)</b>
              <span>Run searches via your own machine’s RAM &amp; IP for 8x speed with zero server queues.</span>
            </div>
          </div>
          <div className="v2-ext-top-actions">
            <button
              type="button"
              className="v2-btn v2-btn-emerald v2-btn-sm"
              onClick={() => openSetup({ country: searchCountry })}
            >
              <Zap size={13} /> Setup Extension (30s)
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-sm"
              style={{ color: '#047857', border: '1px solid rgba(5, 150, 105, 0.4)', background: '#ecfdf5', fontWeight: 700 }}
              onClick={skipAndRunLocal}
              title="Run searches directly on the local server without requiring the Chrome extension"
            >
              <Zap size={13} color="#059669" /> ⚡ Skip &amp; Run Local
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-sm"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss setup banner"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

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
              onMasterSweep={handleStartMasterSweep}
              progress={progress}
              zonesDone={runDone}
              zonesTotal={Math.max(1, runTotal || mapZones.length || 1)}
              eta={progress?.eta || progress?.etaText || (estimate?.timing?.totalLabel ? `~${estimate.timing.totalLabel}` : '')}
              runs={effectiveRuns}
              onOpenFolder={openFolder}
              runLeadCount={runLeadCount}
              runStartedAt={run?.startedAt || 0}
            />
          </div>

          {run?.status === 'running' && (
            <div className="lx-live-progress-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexWrap: 'wrap' }}>
                <span className="lx-live-dot" />
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                  Sweeping <b>{run.category || form.category || autoQuery}</b> in <b>{run.location || form.location || 'Selected Area'}</b>
                  {(effectiveActiveZone?.name || progress?.activeMandal) ? (
                    <span style={{ fontWeight: 500, color: '#475569' }}> · {hopTransition || effectiveActiveZone?.name || progress?.activeMandal}</span>
                  ) : null}
                </div>
                <span className="lx-zone-pill is-live">
                  Zone {Math.min(Math.max(1, runTotal || mapZones.length || 1), runDone + 1)} / {Math.max(1, runTotal || mapZones.length || 1)}
                </span>
              </div>

              {/* Master Retro Digital Watch Chrono & Orchestrator ETA */}
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
                engineCount={searchCountry === 'IN' ? 11 : 10}
                scanning={scanning}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <b style={{ fontSize: 14, fontWeight: 800, color: '#4f46e5', fontVariantNumeric: 'tabular-nums' }}>
                  {formatNumber(runLeadCount)} leads · {formatNumber(runMobilesCount)} mobiles
                </b>
                <button type="button" className="v2-btn v2-btn-danger v2-btn-sm" onClick={stopRun}>
                  <span className="lx-gbc-keycap is-b">B</span>
                  <Square size={11} /> Stop ({runDone}/{Math.max(1, runTotal || mapZones.length || 1)} Zones)
                </button>
              </div>
            </div>
          )}

          {!scanning && run && ['aborted', 'failed', 'interrupted'].includes(run.status) && (bannerTotal === 0 || bannerDone < bannerTotal) && (
            <div className="v2-recovery-banner">
              <div className="v2-recovery-content">
                <div className="v2-recovery-badge">
                  <AlertTriangle size={15} style={{ color: '#D97706' }} />
                  <span>SWARM PAUSED / STOPPED</span>
                </div>
                <div className="v2-recovery-desc">
                  <b>{run.category || form.category || 'Vendor Search'} in {run.location || form.location || 'Target Area'}</b>
                  <span>
                    Safely preserved <b>{formatNumber(run.leadCount || runLeadCount || vendors.length)} leads</b> across <b>{bannerDone}/{bannerTotal || '—'} zones</b>. Would you like to resume from the next zone, restart from zone 1, or start a new search?
                  </span>
                </div>
              </div>
              <div className="v2-recovery-actions">
                <button
                  type="button"
                  className="v2-btn-recovery-continue"
                  onClick={() => resumeRun(run.sessionId || run.id)}
                  disabled={launching}
                  title="Continue from next uncompleted zone without repeating work"
                >
                  <Play size={13} fill="currentColor" /> Continue Scrape
                </button>
                <button
                  type="button"
                  className="v2-btn-recovery-restart"
                  onClick={() => restartRun()}
                  disabled={launching}
                  title="Restart search from zone 1"
                >
                  <RotateCcw size={13} /> Restart Scrape
                </button>
                <button
                  type="button"
                  className="v2-btn-recovery-new"
                  onClick={() => clearActiveRun()}
                  title="Clear run and start a new search"
                >
                  <Plus size={13} /> New Search
                </button>
              </div>
            </div>
          )}

          {currentDeep && ['queued', 'running', 'stopping'].includes(currentDeep.status) && (
            <div className="v2-deep-banner">
              <span className="v2-deep-banner-pulse" />
              <Zap size={13} />
              <b>Completing business profiles</b>
              <span>{currentDeep.completed || 0}/{currentDeep.total || 0} done · phones, emails and websites are still streaming in</span>
              <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => setActiveTab('deep')}>
                View engine
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
                selectedAreaFilter={selectedAreaFilter}
                onSelectArea={setSelectedAreaFilter}
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
                updateCrmStage={updateCrmStage}
                crmSavingId={crmSavingId}
                currentPage={currentPage}
                pageSize={pageSize}
                pageCount={pageCount}
                setPage={setPage}
                setPageSize={setPageSize}
                country={searchCountry}
              />
            )}

            {activeTab === 'map' && (
              <MapViewTab
                filters={filters}
                updateFilter={updateFilter}
                vendors={vendors}
                filteredVendors={filteredVendors}
                run={run}
                sessionFilter={sessionFilter}
                mapZones={mapZones}
                activeZone={effectiveActiveZone}
                scanning={scanning}
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                estimate={estimate}
                cellStates={progress?.cellStates || {}}
                jumpTrail={jumpTrail}
                setSelectedVendor={setSelectedVendor}
              />
            )}

            {activeTab === 'runs' && (
              <FoldersGridView
                headerExtra={(
                  <>
                    <div className="v2-runs-subtabs-bar">
                      <button
                        type="button"
                        className={cx('v2-runs-subtab-btn', runsSubTab === 'client' && 'is-active')}
                        onClick={() => setRunsSubTab('client')}
                      >
                        <FolderArchive size={14} /> 📁 Client Search Folders ({clientRuns.length})
                      </button>
                      <button
                        type="button"
                        className={cx('v2-runs-subtab-btn', runsSubTab === 'master' && 'is-active')}
                        onClick={() => setRunsSubTab('master')}
                      >
                        <Compass size={14} /> 🗺️ Master Geo Folders · District & State Sweeps ({masterRuns.length})
                      </button>
                    </div>

                    {runsSubTab === 'master' && (
                      <div className="v2-master-sweep-launcher-card">
                        <div className="v2-master-launcher-head">
                          <div>
                            <span className="v2-badge-gold">🗺️ MASTER GEO-COVERAGE SWEEP LAUNCHPAD</span>
                            <h3>{admin.top} · {admin.second} · {admin.local} · Locality — every unit, no gaps</h3>
                            <p>Pick a scope, type a place, and see the exact zones, coverage and ETA before you launch. {countryName} runs its own hierarchy; auto mode routes each category to the best free engines.</p>
                          </div>
                        </div>

                        <div className="v2-master-scope-row">
                          {masterScopeOptions.map(option => (
                            <button
                              key={option.id}
                              type="button"
                              className={cx('v2-master-scope-btn', masterSweepForm.scope === option.id && 'is-active')}
                              onClick={() => updateMasterSweep('scope', option.id)}
                            >
                              <b>{option.label}</b>
                              <span>{option.hint}</span>
                            </button>
                          ))}
                        </div>

                        <div className="v2-master-launcher-fields">
                          <div className="v2-master-field">
                            <label>Business Category</label>
                            <input
                              type="text"
                              placeholder="e.g. Photography Studios, Plumbers, Banquet Halls"
                              value={masterSweepForm.category}
                              onChange={e => updateMasterSweep('category', e.target.value)}
                            />
                          </div>
                          <div className="v2-master-field">
                            <label>{masterPlaceLabel}</label>
                            <input
                              type="text"
                              placeholder={masterPlacePlaceholder}
                              value={masterSweepForm.name}
                              onChange={e => updateMasterSweep('name', e.target.value)}
                            />
                          </div>
                          <div className="v2-master-field">
                            <label>Engine Mode</label>
                            <select
                              value={masterSweepForm.engines}
                              onChange={e => updateMasterSweep('engines', e.target.value)}
                            >
                              <option value="auto">⚡ Auto — best engines for this category</option>
                              <option value="multi">🧩 Multi-vector — Maps + directory sweep</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            className="v2-btn-master-sweep"
                            onClick={() => handleStartMasterSweep()}
                            disabled={masterLaunching || masterConfirm || !masterSweepForm.category || !masterSweepForm.name || masterPreviewLoading}
                          >
                            <Compass size={15} /> {masterLaunching ? 'SWARMING…' : '🚀 START MASTER SWEEP'}
                          </button>
                        </div>

                        <div className="v2-master-options-row">
                          <label className="v2-master-check">
                            <input
                              type="checkbox"
                              checked={masterSweepForm.scope === 'district' ? true : masterSweepForm.deep}
                              disabled={masterSweepForm.scope === 'district'}
                              onChange={e => updateMasterSweep('deep', e.target.checked)}
                            />
                            All villages {masterSweepForm.scope === 'district' ? '(always on)' : ''}
                          </label>
                          <label className="v2-master-check">
                            <input
                              type="checkbox"
                              checked={masterSweepForm.mobileOnly}
                              onChange={e => updateMasterSweep('mobileOnly', e.target.checked)}
                            />
                            Mobile numbers only
                          </label>
                          <label className="v2-master-check">
                            <input
                              type="checkbox"
                              checked={masterSweepForm.verifiedOnly}
                              onChange={e => updateMasterSweep('verifiedOnly', e.target.checked)}
                            />
                            Verified only
                          </label>
                          <label className="v2-master-check">
                            <input
                              type="checkbox"
                              checked={masterSweepForm.hasWebsite}
                              onChange={e => updateMasterSweep('hasWebsite', e.target.checked)}
                            />
                            Has website
                          </label>
                          <label className="v2-master-rating">
                            Min rating
                            <select
                              value={masterSweepForm.minRating}
                              onChange={e => updateMasterSweep('minRating', e.target.value)}
                            >
                              <option value={0}>Any</option>
                              <option value={3}>3★+</option>
                              <option value={4}>4★+</option>
                              <option value={4.5}>4.5★+</option>
                            </select>
                          </label>
                        </div>

                        {masterPreviewLoading && (
                          <div className="v2-master-preview is-loading">
                            <Loader2 size={14} className="v2-spin" /> Resolving every zone…
                          </div>
                        )}
                        {!masterPreviewLoading && masterPreviewError && (
                          <div className="v2-master-preview is-error">
                            <AlertTriangle size={14} /> {masterPreviewError}
                          </div>
                        )}
                        {!masterPreviewLoading && masterPreview && (
                          <div className="v2-master-preview">
                            <div className="v2-master-preview-grid">
                              <div><span>Target</span><b>{masterPreview.targetName}</b></div>
                              <div><span>Zones</span><b>{formatNumber(masterPreview.totalZones)}</b></div>
                              <div><span>Coverage</span><b>{masterCoverageText}</b></div>
                              <div><span>ETA</span><b>~{masterPreview.estimatedMinutes} min</b></div>
                            </div>
                            {masterPreview.terminology?.sentence && (
                              <p className="v2-master-preview-note">{masterPreview.terminology.sentence}</p>
                            )}
                            {masterPreview.boundary?.centers?.length > 0 && (
                              <p className="v2-master-preview-note">
                                Territory boundary: {formatNumber(masterPreview.boundary.centers.length)} {masterPreview.unitTerm || 'sub-district'} circles inside {masterPreview.boundary.district}. Only businesses inside this district are saved; neighbouring districts are rejected.
                              </p>
                            )}
                            {masterPreview.sampleZones?.length > 0 && (
                              <p className="v2-master-preview-zones">
                                {masterPreview.sampleZones.join(' · ')}
                                {masterPreview.totalZones > masterPreview.sampleZones.length ? ' …' : ''}
                              </p>
                            )}
                            {(masterPreview.warnings || []).map((warning, index) => (
                              <p key={index} className="v2-master-preview-warn">
                                <AlertTriangle size={12} /> {warning}
                              </p>
                            ))}
                          </div>
                        )}

                        {masterConfirm && (
                          <div className="v2-master-confirm">
                            <AlertTriangle size={16} />
                            <span>This sweep plans {formatNumber(masterPreview?.totalZones || 0)} zones. Launch it?</span>
                            <button
                              type="button"
                              className="v2-btn-master-sweep"
                              onClick={() => handleStartMasterSweep({ confirmed: true })}
                            >
                              Confirm &amp; Start
                            </button>
                            <button type="button" className="v2-btn-ghost" onClick={() => setMasterConfirm(false)}>
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                effectiveRuns={effectiveRuns}
                filteredRuns={filteredRuns}
                folderSearch={folderSearch}
                setFolderSearch={setFolderSearch}
                folderCity={folderCity}
                setFolderCity={setFolderCity}
                folderCities={folderCities}
                folderSort={folderSort}
                setFolderSort={setFolderSort}
                selectedFolderIds={selectedFolderIds}
                handleSelectAllFolders={handleSelectAllFolders}
                handleToggleSelectFolder={handleToggleSelectFolder}
                setShowMergeModal={setShowMergeModal}
                handleBatchDelete={handleBatchDelete}
                setSelectedFolderIds={setSelectedFolderIds}
                sessionFilter={sessionFilter}
                run={run}
                folderLoading={folderLoading}
                openFolder={openFolder}
                setRenamingFolder={setRenamingFolder}
                exportFolder={exportFolder}
                loadFolderToCockpit={loadFolderToCockpit}
                backupFolder={backupFolder}
                backupAllFolders={backupAllFolders}
                onRestoreBackup={handleRestoreBackup}
                deleteFolder={deleteFolder}
              />
            )}

            {activeTab === 'intelligence' && (
              <IntelligenceView
                seedUniversalIntelligence={seedUniversalIntelligence}
                seedingTaxonomy={seedingTaxonomy}
                fetchTaxonomy={fetchTaxonomy}
                loadingTaxonomy={loadingTaxonomy}
                taxonomyData={taxonomyData}
              />
            )}

            {activeTab === 'deep' && (
              <DeepJobsView
                stats={stats}
                deepEstimate={deepEstimate}
                batchConfig={batchConfig}
                setBatchConfig={setBatchConfig}
                queueDeepManual={queueDeepManual}
                batchStarting={batchStarting}
                health={health}
                vendors={vendors}
                activeDeepJobs={activeDeepJobs}
                deepJob={deepJob}
                deepJobs={deepJobs}
                stopDeep={stopDeep}
      resumeDeep={resumeDeep}
                recentProfiles={recentProfiles}
                setSelectedVendor={setSelectedVendor}
              />
            )}
            {activeTab === 'engines' && (
              <div className="v2-feature-tab">
                <EngineStatusBoard />
              </div>
            )}

            {activeTab === 'terminal' && (
              <div className="v2-feature-tab">
                <MasterTerminalView
                  logs={logs}
                  onClear={() => setLogs([])}
                  run={run}
                  progress={progress}
                />
              </div>
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
          onBackup={backupFolder}
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

      {/* Persistent Floating Stop Controller during active scraping */}
      {(scanning || (run && run.status === 'running')) && (
        <div
          className="v2-floating-stop-dock"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 28,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 16px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94))',
            border: '1.5px solid rgba(239, 68, 68, 0.75)',
            borderRadius: 999,
            boxShadow: '0 12px 32px rgba(239, 68, 68, 0.3), 0 4px 16px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(16px)',
            animation: 'v2FloatingPulse 2s ease-in-out infinite'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, paddingRight: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px #ef4444', animation: 'v2BadgeBlink 1s infinite' }} />
              MASTER SWARM · {effectiveActiveZone?.name || progress?.activeMandal || 'Zone 1'}
            </span>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
              {runDone}/{Math.max(1, runTotal || mapZones.length || 1)} Zones · {formatNumber(runLeadCount)} Leads Verified
            </span>
          </div>
          <button
            type="button"
            onClick={stopRun}
            disabled={stopping}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)',
              transition: 'all 0.15s ease'
            }}
            title="Immediately stop search and preserve all leads"
          >
            <Square size={13} fill="#ffffff" />
            <span>{stopping ? 'STOPPING…' : 'STOP RUN'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
