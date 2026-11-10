import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, BarChart3, Brain, Check, CheckCircle2, CheckSquare, ChevronDown, Clock, Compass,
  ChevronLeft, ChevronRight, CircleDot, Copy, Crosshair, Database, Download,
  ExternalLink, FileSpreadsheet, FileText, Filter, Folder, FolderArchive, Globe2, Layers, LayoutDashboard,
  Loader2, MapPin, MessageSquare, Phone, PhoneCall, Play, Radar as RadarIcon,
  RefreshCw, Search, SlidersHorizontal, Smartphone, Sparkles, Square, Star, Settings,
  Table2, Tag, Trash2, Users, Wifi, WifiOff, X, Zap, Edit3, GitMerge, RotateCcw, Plus
} from 'lucide-react';
import CommandMap from './CommandMap';
import VendorDrawer from './VendorDrawer';
import SearchConsole from './SearchConsole';
import CrmBoard, { CRM_STAGES, crmStageOf, formatInr } from './CrmBoard';
import {
  deepExtractVendor, getDeepJob, getDeepJobs, getEstimate, getHealth,
  getScrapeJobs, getSessions, getSessionVault, getVendors, sessionExportUrl,
  startAuto, startMasterSweep, startDeepBatch, startOmni, stopAllScrapes, resumeScrape, stopDeepJob, updateVendorCrm, streamUrl,
  deleteSession, renameSession, mergeSessions, batchDeleteSessions
} from './api';
import {
  Logo, ScoreRing, StatusPill, cx, formatDuration, formatNumber,
  relativeTime
} from './ui';
import { parseIndianPhone, isIndianMobile, isIndianLandline } from '../utils/phoneClassify';
import { IS_DESKTOP, HOME_ROUTE } from '../desktop';
import DesktopBadge from './DesktopBadge';
import {
  DEFAULT_PRODUCTS,
  CATALOG_TEMPLATES,
  formatProductMessage,
  copyImageToClipboard,
  exportLeadsToVcf
} from '../utils/whatsappCatalog';

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
  deep: 'deep'
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
import WhatsAppCampaignModal from './components/modals/WhatsAppCampaignModal';
import CockpitFolderRow from './components/CockpitView/CockpitFolderRow';
import CockpitView from './components/CockpitView/CockpitView';
import FolderView from './components/FolderView/FolderView';
import LeadsTableView from './components/views/LeadsTableView';
import MapViewTab from './components/views/MapViewTab';
import FoldersGridView from './components/views/FoldersGridView';
import IntelligenceView from './components/views/IntelligenceView';
import DeepJobsView from './components/views/DeepJobsView';
import { extractLeadArea, CarriedBadge, qualityOf } from './utils/leadHelpers';
import InstrumentPanel from './components/InstrumentPanel';
import { getDisplayPhone, isMobilePhone, whatsappNumber, classifyPhone } from '../utils/phoneClassify';
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
        return;
      }
      const t0 = performance.now();
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch('/api/deep-profile/health', { signal: ctrl.signal });
        clearTimeout(timeout);
        const latency = Math.round(performance.now() - t0);
        setConnectionLatency(latency);
        if (res.ok) setIsOnline(true);
      } catch (e) {
        if (!navigator.onLine) setIsOnline(false);
        else setConnectionLatency(4000);
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
  const [masterSweepForm, setMasterSweepForm] = useState({ category: '', name: '', scope: 'district' });
  const [masterLaunching, setMasterLaunching] = useState(false);

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
      const res = await fetch('/api/search/learned?limit=100');
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
      const res = await fetch('/api/search/taxonomy/seed', { method: 'POST' });
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

  // The default flow is one free-text query. Category, engines, zones and
  // post-run deep extraction are resolved server-side by the category router.
  const [runMode, setRunMode] = useState('auto');
  const [autoQuery, setAutoQuery] = useState(
    routerLocation.state?.query || ''
  );
  const [activeZone, setActiveZone] = useState(null);
  const [gridZones, setGridZones] = useState([]);
  const [scanning, setScanning] = useState(false);

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
    sort: 'newest'
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sessionFilter, setSessionFilter] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('all');

  const [launching, setLaunching] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [batchStarting, setBatchStarting] = useState(false);
  const [batchConfig, setBatchConfig] = useState({ limit: 100, website: true, google: true });

  const mountedRef = useRef(true);
  const runRef = useRef(null);
  const runVendorIdsRef = useRef(new Set());
  const lastEventRef = useRef(Date.now());
  const finishingRef = useRef(false);
  const deepJobRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => { runRef.current = run; }, [run]);
  useEffect(() => { deepJobRef.current = deepJob; }, [deepJob]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadVendors = useCallback(async () => {
    try {
      const data = await getVendors();
      if (mountedRef.current) {
        setVendors(prev => {
          if (!runVendorIdsRef.current.size) return data;
          const liveLeads = prev.filter(v => runVendorIdsRef.current.has(v.id));
          const liveIds = new Set(liveLeads.map(v => v.id));
          return [...liveLeads, ...data.filter(v => !liveIds.has(v.id))];
        });
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
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.allSettled([loadVendors(), loadHealth()]);
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
    const id = setInterval(() => {
      getDeepJobs().then(deepData => {
        if (!mountedRef.current) return;
        setDeepJobs(deepData || []);
      }).catch(() => { });
    }, 9000);
    return () => clearInterval(id);
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
    let es = null;
    let reconnectTimer = null;
    let flushTimer = null;
    let microFlushTimer = null;
    let bufferTimer = null;
    let mounted = true;
    const vendorBuffer = [];
    const logBuffer = [];

    const flushBuffers = () => {
      if (vendorBuffer.length) {
        const incoming = vendorBuffer.splice(0, vendorBuffer.length);
        setVendors(prev => {
          const map = new Map(prev.map(vendor => [vendor.id, vendor]));
          const existingIds = prev.map(vendor => vendor.id);
          const freshIds = [];
          let hasChanges = false;

          incoming.forEach(v => {
            if (!v || !v.id) return;
            const existing = map.get(v.id);
            if (existing) {
              const existingPhone = getDisplayPhone(existing);
              const incomingPhone = getDisplayPhone(v);
              const isIncomingMob = isMobilePhone(incomingPhone);
              const isExistingMob = isMobilePhone(existingPhone);

              let mergedPhone = existing.phone;
              if (isIncomingMob) mergedPhone = incomingPhone;
              else if (isExistingMob) mergedPhone = existingPhone;
              else if (incomingPhone) mergedPhone = incomingPhone;

              const mergedPhones = Array.from(new Set([
                ...(Array.isArray(existing.phones) ? existing.phones : (existing.phone ? [existing.phone] : [])),
                ...(Array.isArray(v.phones) ? v.phones : (v.phone ? [v.phone] : []))
              ])).filter(Boolean);

              map.set(v.id, {
                ...existing,
                ...v,
                phone: mergedPhone,
                phones: mergedPhones.length ? mergedPhones : (mergedPhone ? [mergedPhone] : []),
                website: v.website || existing.website,
                email: v.email || existing.email,
                emails: (Array.isArray(v.emails) && v.emails.length) ? v.emails : existing.emails,
                address: v.address || existing.address,
                crmStage: existing.crmStage || v.crmStage || 'new',
                crmStatus: existing.crmStatus || v.crmStatus || 'new',
                crmNotes: existing.crmNotes || v.crmNotes,
                crmTasks: existing.crmTasks || v.crmTasks
              });
              if (runRef.current?.status === 'running') {
                freshIds.push(v.id);
              }
              hasChanges = true;
            } else {
              map.set(v.id, v);
              freshIds.push(v.id);
              hasChanges = true;
            }
          });
          if (!hasChanges) return prev;
          const fullOrder = [...freshIds, ...existingIds.filter(id => !freshIds.includes(id))];
          return fullOrder.map(id => map.get(id)).filter(Boolean);
        });
      }
      if (logBuffer.length) {
        const incoming = logBuffer.splice(0, logBuffer.length);
        setLogs(prev => [...prev, ...incoming].slice(-400));
      }
    };

    const scheduleMicroFlush = () => {
      flushBuffers();
    };

    const pushLog = line => {
      if (!line) return;
      logBuffer.push(typeof line === 'string' ? line : JSON.stringify(line));
      lastEventRef.current = Date.now();
    };

    let retryAttempt = 0;

    const scheduleReconnect = (immediate = false) => {
      if (!mounted) return;
      updateSseStatus('error');
      if (es) {
        try { es.close(); } catch (e) { }
        es = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (immediate) {
        connectStream();
        return;
      }
      retryAttempt++;
      setReconnectAttemptCount(retryAttempt);
      const delay = Math.min(8000, 1000 * Math.pow(1.5, Math.min(retryAttempt, 5))) + Math.floor(Math.random() * 400);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (mounted) connectStream();
      }, delay);
    };
    reconnectStreamRef.current = scheduleReconnect;

    const connectStream = () => {
      if (!mounted) return;
      if (es) {
        try { es.close(); } catch (e) { }
      }
      try {
        updateSseStatus('connecting');
        es = new EventSource(streamUrl());

        es.addEventListener('open', () => {
          if (!mounted) return;
          updateSseStatus('open');
          retryAttempt = 0;
          setReconnectAttemptCount(0);
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
        });

        es.addEventListener('error', () => {
          if (!mounted) return;
          scheduleReconnect(false);
        });

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

            if (runRef.current?.status === 'running') {
              const currentSid = runRef.current.sessionId || runRef.current.id;
              if (currentSid) {
                vendor.sessionId = currentSid;
                vendor.lastSessionId = currentSid;
                vendor.sessionIds = Array.isArray(vendor.sessionIds)
                  ? Array.from(new Set([...vendor.sessionIds, currentSid]))
                  : [currentSid];
              }
              runVendorIdsRef.current.add(vendor.id);
              setRunLeadCount(runVendorIdsRef.current.size);
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
            const currentId = currentRun?.sessionId || currentRun?.id;
            // SSE is broadcast to every workspace. Ignore events from another
            // session so one run can never pause or complete the one on screen.
            if (currentId && data?.sessionId && data.sessionId !== currentId) return;

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
            if (zoneEntry) {
              setGridZones(zoneEntry.zones);
              pushLog(`[GRID] ${zoneEntry.zones.length} coverage zones anchored.`);
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
            const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
            if (point.zoneName) {
              setActiveZone(prev => ({
                name: point.zoneName,
                lat: hasCoords ? lat : prev?.lat,
                lng: hasCoords ? lng : prev?.lng
              }));
              pushLog(`[ZONE] searching ${point.zoneName}`);
            }
            setScanning(true);
            lastEventRef.current = Date.now();
          } catch (error) { /* ignore */ }
        });

        es.onmessage = event => pushLog(event.data);
      } catch (error) {
        scheduleReconnect(false);
      }
    };

    const onWakeup = () => {
      if (!mounted) return;
      if (sseStatusRef.current !== 'open') {
        scheduleReconnect(true);
      }
    };

    window.addEventListener('online', onWakeup);
    window.addEventListener('focus', onWakeup);
    window.addEventListener('leadharvest:server_online', onWakeup);

    connectStream();

    flushTimer = setInterval(flushBuffers, 250);

    bufferTimer = setInterval(() => {
      lastEventRef.current = Date.now();
    }, 15000);

    return () => {
      mounted = false;
      window.removeEventListener('online', onWakeup);
      window.removeEventListener('focus', onWakeup);
      window.removeEventListener('leadharvest:server_online', onWakeup);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (flushTimer) clearInterval(flushTimer);
      if (microFlushTimer) clearTimeout(microFlushTimer);
      if (bufferTimer) clearInterval(bufferTimer);
      if (es) {
        try { es.close(); } catch (e) { }
      }
    };
  }, []);

  const finishRun = useCallback(async status => {
    const current = runRef.current;
    if (!current || current.status !== 'running' || finishingRef.current) return;
    finishingRef.current = true;

    const finishedAt = Date.now();
    setRun(prev => prev ? { ...prev, status, finishedAt } : prev);
    setScanning(false);
    const targetSessionId = current.sessionId || current.id;
    if (targetSessionId) {
      setSessionFilter(targetSessionId);
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
      refresh();
      finishingRef.current = false;
    }, 800);
  }, [refresh]);

  // Progress completion and watchdog: never leave a run stuck in "running".
  useEffect(() => {
    if (run?.status === 'running' && progress && progress.sessionActive === false) {
      finishRun(progress.error ? 'error' : 'complete');
    }
  }, [progress, run?.status, finishRun]);

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
          finishRun('complete');
        } else if (!matching && Date.now() - lastEventRef.current > 32000) {
          finishRun('complete');
        }
      } catch (error) { /* ignore */ }
    }, 5000);
    return () => clearInterval(id);
  }, [run?.status, run?.id, finishRun]);

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

  const handleStartMasterSweep = async (sweepParams = {}) => {
    const sweepCat = String(sweepParams.category || masterSweepForm.category || form.category || autoQuery).trim();
    const sweepName = String(sweepParams.name || masterSweepForm.name || form.location || '').trim();
    const scope = sweepParams.scope || masterSweepForm.scope || 'district';

    if (!sweepCat || !sweepName) {
      toast.error('Please specify both a category and a target location name for the Master Sweep.');
      return;
    }

    setMasterLaunching(true);
    setLaunching(true);
    try {
      const res = await startMasterSweep({
        category: sweepCat,
        scope,
        name: sweepName,
        engines: sweepParams.engines || ['geospatial_mesh', 'direct_telecom']
      });

      if (res?.sessionId) {
        toast.success('🗺️ Master ' + scope + ' sweep initiated! Swarming ' + res.totalZones + ' zones across ' + res.targetName);
        setActiveTab('cockpit');
        refresh();
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
    if (overrides.query) setAutoQuery(overrides.query);
    runVendorIdsRef.current = new Set();
    finishingRef.current = false;
    setRunLeadCount(0);
    setProgress(null);
    setSessionFilter(sessionId);
    setActiveTab('cockpit');
    setActiveZone(null);
    setGridZones([]);
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
          sessionId
        });
        const plan = response?.plan || {};
        setForm(prev => ({
          ...prev,
          category: plan.category || prev.category,
          location: plan.location || prev.location
        }));
        setRun({
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
          startedAt: Date.now(),
          finishedAt: null,
          status: 'running'
        });
        setLogs(prev => [
          ...prev,
          `[PLAN] ${plan.familyLabel || 'General vendors'} · ${(plan.engines || []).join(' + ') || 'auto'}`,
          response?.purge?.removed ? `[PURGE] ${response.purge.removed} stale leads removed · fresh run` : '[PURGE] no stale leads',
          response?.deepStopped ? `[DEEP] ${response.deepStopped} superseded deep job(s) cancelled before purge` : null
        ].filter(Boolean));

        // The purge just deleted the previous dataset. Drop those rows from the
        // client too, otherwise the map and counters keep showing stale leads
        // until the next manual refresh.
        if (response?.purge?.removed || response?.deepStopped) {
          await loadVendors();
        }
      } else {
        const response = await startOmni({
          query: `${runCategory} in ${runLocation}`,
          category: runCategory,
          location: runLocation,
          strategy: form.strategy,
          gridDensity: coverageMode,
          engines,
          sessionId
        });
        const plan = response?.plan || {};
        setRun({
          id: sessionId,
          sessionId,
          category: plan.category || runCategory,
          location: plan.location || runLocation,
          strategy: form.strategy,
          engines: plan.engines || engines,
          postWebsite: true,
          postDeep: true,
          targetLeads: form.targetLeads,
          startedAt: Date.now(),
          finishedAt: null,
          status: 'running'
        });
        setLogs(prev => [
          ...prev,
          `[PLAN] ${plan.familyLabel || 'General vendors'} · sources chosen automatically`,
          response?.purge?.removed ? `[PURGE] ${response.purge.removed} stale leads removed · fresh run` : '[PURGE] no stale leads',
          response?.deepStopped ? `[DEEP] ${response.deepStopped} superseded deep job(s) cancelled` : null
        ].filter(Boolean));

        if (response?.purge?.removed || response?.deepStopped) {
          await loadVendors();
        }
      }

      lastEventRef.current = Date.now();
      setScanning(true);
      toast.success(auto ? 'Search started. Live leads will appear in seconds.' : 'Search started. We chose the sources automatically.');
      setActiveTab('cockpit');
    } catch (error) {
      setScanning(false);
      toast.error(error?.response?.data?.error || 'Search could not be started.');
      setLogs(prev => [...prev, `[ERROR] ${error?.response?.data?.error || error.message}`]);
    } finally {
      setLaunching(false);
    }
  };

  const stopRun = async () => {
    setStopping(true);
    try {
      await stopAllScrapes(run?.sessionId || run?.id);
      setRun(prev => prev ? { ...prev, status: 'aborted', finishedAt: Date.now() } : prev);
      setScanning(false);
      toast('Swarm paused safely. Completed leads preserved.', { icon: '⏹' });
      refresh();
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

  const handleBatchDelete = async () => {
    if (!selectedFolderIds.size) return;
    const ids = Array.from(selectedFolderIds);
    if (!window.confirm(`Permanently delete ${ids.length} selected search folders? This cannot be undone.`)) return;
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
        const bits = [`Deleted ${deleted.length} folders`];
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
      setVendors(session.leads);
      setSessionFilter(runCard.id);
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
    if (!window.confirm(`Permanently delete folder "${runCard.name || runCard.id}"? This cannot be undone.`)) return;
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

      const bits = [`Deleted folder "${runCard.name || runCard.id}"`];
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

  const filteredVendors = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    const activeScrapeId = (run?.status === 'running' || run?.status === 'aborted' || run?.status === 'complete' || run?.status === 'completed') ? (run.sessionId || run.id) : null;
    const effectiveSessionFilter = sessionFilter || activeScrapeId;

    let list = vendors.filter(vendor => {
      if (effectiveSessionFilter) {
        // Instant Live Admission Guard:
        // Any lead discovered or observed during the active run must NEVER be blocked by session mismatch
        const isLiveIncoming = Boolean(
          (run?.status === 'running' || runRef.current?.status === 'running') &&
          runVendorIdsRef.current &&
          runVendorIdsRef.current.has(vendor.id)
        );

        const matchesSession = isLiveIncoming ||
          (vendor.sessionId === effectiveSessionFilter) ||
          (vendor.lastSessionId === effectiveSessionFilter) ||
          (Array.isArray(vendor.sessionIds) && vendor.sessionIds.includes(effectiveSessionFilter));
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
      if (filters.deepOnly && !vendor.deepExtractedAt) return false;
      if (filters.conflictsOnly && !(Array.isArray(vendor.conflicts) && vendor.conflicts.length)) return false;
      if (filters.minRating && !(Number(vendor.rating) >= Number(filters.minRating))) return false;
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
      // Prioritize active live incoming leads right at the very top during a run
      if (run?.status === 'running') {
        const aLive = runVendorIdsRef.current?.has(a.id) ? 1 : 0;
        const bLive = runVendorIdsRef.current?.has(b.id) ? 1 : 0;
        if (aLive !== bLive) return bLive - aLive;
        if (aLive && bLive) {
          return new Date(b.scrapedAt || 0) - new Date(a.scrapedAt || 0);
        }
      }

      // 1. Mobile Priority First: Verified 10-digit mobiles (score 3), Landlines with 0 (score 2), Other phone (score 1), No phone (0)
      const pA = getDisplayPhone(a);
      const pB = getDisplayPhone(b);
      const scoreA = isMobilePhone(pA) ? 3 : (isIndianLandline(pA) ? 2 : (pA ? 1 : 0));
      const scoreB = isMobilePhone(pB) ? 3 : (isIndianLandline(pB) ? 2 : (pB ? 1 : 0));
      if (scoreB !== scoreA) return scoreB - scoreA;

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
  }, [vendors, filters, sessionFilter, selectedAreaFilter, run?.status, run?.sessionId, run?.id, runLeadCount, autoQuery, form.category]);

  useEffect(() => { setPage(1); }, [filters, sessionFilter, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredVendors.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredVendors.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const effectiveRuns = useMemo(() => {
    const map = new Map();
    for (const vendor of vendors) {
      const id = vendor.sessionId || 'unassigned';
      const existing = map.get(id) || {
        id,
        category: vendor.category || 'Business search',
        location: [vendor.city || vendor.village, vendor.district, vendor.state].filter(Boolean).join(', ') || 'India',
        timestamp: vendor.scrapedAt || null,
        leadCount: 0,
        phoneCount: 0,
        deepCount: 0,
        dealValueTotal: 0,
        status: 'saved',
        vendorIds: []
      };
      existing.leadCount += 1;
      if (getDisplayPhone(vendor)) existing.phoneCount += 1;
      if (vendor.deepExtractedAt) existing.deepCount += 1;
      if (vendor.dealValue) existing.dealValueTotal = (existing.dealValueTotal || 0) + (Number(vendor.dealValue) || 0);
      if (vendor.scrapedAt && (!existing.timestamp || new Date(vendor.scrapedAt) > new Date(existing.timestamp))) existing.timestamp = vendor.scrapedAt;
      existing.vendorIds.push(vendor.id);
      map.set(id, existing);
    }
    for (const session of sessions) {
      const existing = map.get(session.id) || {
        id: session.id,
        category: session.category || 'Business search',
        location: session.location || 'India',
        timestamp: session.timestamp,
        leadCount: session.leadCount || 0,
        phoneCount: session.phoneCount || 0,
        deepCount: 0,
        dealValueTotal: 0,
        status: session.metadata?.status || 'saved',
        vendorIds: []
      };
      existing.customName = session.customName || existing.customName || '';
      existing.name = session.customName || session.name || existing.name || (session.category ? `${session.category} in ${session.location || 'India'}` : 'Lead Folder');
      existing.category = session.category || existing.category;
      existing.location = session.location || existing.location;
      existing.timestamp = session.timestamp || existing.timestamp;
      existing.leadCount = Math.max(existing.leadCount, session.leadCount || 0);
      existing.phoneCount = Math.max(existing.phoneCount, session.phoneCount || 0);
      existing.tags = Array.isArray(session.tags) ? session.tags : existing.tags || [];
      existing.color = session.color || existing.color || '';
      existing.notes = session.notes || existing.notes || '';
      if (session.dealValueTotal != null && Number(session.dealValueTotal) > 0) {
        existing.dealValueTotal = Number(session.dealValueTotal);
      }
      existing.isMasterSweep = Boolean(session.isMasterSweep || session.metadata?.isMasterSweep || /master_/i.test(session.id) || /sweep/i.test(session.location || ''));
      existing.masterScope = session.masterScope || (existing.isMasterSweep ? (/state/i.test(existing.location || '') ? 'state' : 'district') : null);
      existing.status = session.metadata?.status || existing.status;
      map.set(session.id, existing);
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [vendors, sessions]);

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

  const targetSessionId = run?.sessionId || run?.id || folderView?.run?.id || sessionFilter;
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
      return isMobilePhone(p);
    }).length;
  }, [sessionVendors]);

  const stats = useMemo(() => {
    const target = (targetSessionId || run?.status === 'running') ? sessionVendors : vendors;
    const phones = target.filter(vendor => {
      const p = getDisplayPhone(vendor);
      return isMobilePhone(p);
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

  const runElapsed = run ? Math.max(0, Math.floor(((run.finishedAt || now) - run.startedAt) / 1000)) : 0;
  const runTotal = progress?.totalMandalsAcrossAll || progress?.totalMandals || estimate?.zones?.count || 0;
  const runDone = progress?.overallCompletedMandals ?? progress?.completedMandals ?? 0;
  const bannerDone = run?.completedZones != null ? Number(run.completedZones) || 0 : runDone;
  const bannerTotal = run?.totalZones != null ? Number(run.totalZones) || 0 : runTotal;
  const runPercent = run?.status === 'complete' || run?.status === 'stopped'
    ? 100
    : runTotal ? Math.round((runDone / runTotal) * 100) : 0;

  const mapCenter = useMemo(() => {
    const lat = Number(estimate?.location?.lat);
    const lng = Number(estimate?.location?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat && lng) return [lat, lng];
    const coords = filteredVendors
      .map(vendor => [Number(vendor.latitude), Number(vendor.longitude)])
      .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && a >= 6 && a <= 38 && b >= 68 && b <= 98);
    if (!coords.length) return [22.5937, 79.9629];
    return [
      coords.reduce((sum, pair) => sum + pair[0], 0) / coords.length,
      coords.reduce((sum, pair) => sum + pair[1], 0) / coords.length
    ];
  }, [estimate, filteredVendors]);

  const mapZoom = estimate?.location?.lat ? 10 : 5;
  const mapZones = useMemo(() => {
    if (gridZones.length) return gridZones;
    return (estimate?.zones?.preview || []).map(zone => ({ ...zone, zoneName: zone.zoneName || zone.name }));
  }, [gridZones, estimate]);
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

  return (
    <div className="v2-root v2-command v2-executive-canvas">
      <div className="v2-page-grid" aria-hidden="true" />

      {/* Real-time Network Offline & Reconnecting Supervisor Banner */}
      {(!isOnline || sseStatus === 'error' || sseStatus === 'connecting') && (
        <div
          className={cx(
            'v2-network-alert-banner',
            !isOnline ? 'is-offline' : (sseStatus === 'error' ? 'is-error' : 'is-connecting')
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
            ) : sseStatus === 'error' ? (
              <>
                <RefreshCw size={14} className="v2-spin" />
                <span><b>Reconnecting to Swarm Server:</b> Backend data stream disconnected (Attempt #{reconnectAttemptCount || 1}). Re-establishing real-time connection...</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} className="v2-spin" />
                <span><b>Connecting to Swarm Server:</b> Establishing live event telemetry stream...</span>
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
          <button type="button" className="v2-cmd-home" onClick={() => navigate(HOME_ROUTE)} title={IS_DESKTOP ? 'Dashboard' : 'Back to landing'}>
            <Logo compact />
          </button>
          <span className="v2-cmd-breadcrumb">
            <span>COMMAND CENTER</span>
            <b>/</b>
            <code>{run ? run.id : 'STANDBY'}</code>
          </span>
        </div>

        <div className="v2-cmd-top-status">
          <StatusPill tone={sseStatus === 'open' ? 'lime' : sseStatus === 'connecting' ? 'amber' : 'red'} pulse={sseStatus === 'open'}>
            {sseStatus === 'open' ? <Wifi size={11} /> : <WifiOff size={11} />}
            {sseStatus === 'open' ? 'LIVE' : sseStatus === 'connecting' ? 'CONNECTING' : 'RECONNECTING'}
          </StatusPill>
          <span className="v2-cmd-context">{formatNumber(vendors.length)} leads · India</span>

          <button
            type="button"
            className="v2-btn v2-btn-sm"
            onClick={() => navigate('/master')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              color: '#fff',
              fontWeight: 700,
              border: 'none',
              boxShadow: '0 2px 10px rgba(245, 158, 11, 0.4)'
            }}
            title="Open Master Command Center for District, State, City-Mesh & Mandal sweeps"
          >
            <Compass size={13} /> 🗺️ Master Command Center
          </button>
          <DesktopBadge />
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
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('deep'); }}>
                  <Zap size={14} />
                  <span><b>Profile engine</b><small>Fill the 52-field vendor profiles</small></span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('map'); }}>
                  <MapPin size={14} />
                  <span><b>Coverage map</b><small>See every lead and search zone</small></span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setToolsOpen(false);
                    const target = run || sessions[0];
                    if (target?.id) exportFolder(target, 'csv');
                    else toast.error('Run a search first, then export its folder.');
                  }}
                >
                  <Download size={14} />
                  <span><b>Export CSV</b><small>Download the current search folder</small></span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); refresh(); toast.success('Data refreshed.'); }}>
                  <RefreshCw size={14} />
                  <span><b>Refresh data</b><small>Pull the latest leads and folders</small></span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={cx('v2-cmd-body', activeTab === 'cockpit' && 'is-cockpit')}>
        <aside className="v2-cmd-rail">
          <section className="v2-rail-panel">
            <div className="v2-rail-head">
              <span><Crosshair size={14} /> YOUR SEARCH</span>
              <b>{estimate?.zones?.count || '—'} AREAS</b>
            </div>

            <div className="v2-plan-card">
              <div className="v2-plan-what">
                <span>LOOKING FOR</span>
                <b>{scanPlan?.category?.value || form.category || 'Waiting for a query'}</b>
              </div>
              <div className="v2-plan-where">
                <MapPin size={12} />
                <span>{scanPlan?.location?.display || scanPlan?.location?.value || form.location || 'Add a city or village'}</span>
              </div>
              <div className="v2-plan-tags">
                {estimate?.family?.label && <span className="is-family">{estimate.family.label}</span>}
                <span>Automatic sources</span>
                <span>Fresh results</span>
              </div>
              <div className="v2-plan-note">
                <RadarIcon size={12} />
                <span>Autonomous Multi-Vector Swarm. Type any query into the unified Omnibox. Service category, constituent 5km zones, and proprietary vector routing are resolved automatically.</span>
              </div>
            </div>

            {estimateError && <div className="v2-inline-error">{estimateError}</div>}

            <div className="v2-rail-estimate">
              <div className="v2-form-head">
                <span>WHAT TO EXPECT</span>
                <b>{estimating ? 'CALCULATING' : estimate?.calibration || 'READY'}</b>
              </div>
              {estimate ? (
                <>
                  <div className="v2-rail-estimate-grid">
                    <div><span>LEADS</span><b>{formatNumber(estimate.expectedLeads?.expected || 0)}</b><small>estimated</small></div>
                    <div><span>FIRST LEAD</span><b>{estimate.timing?.firstLeadLabel}</b><small>stream</small></div>
                    <div><span>TOTAL TIME</span><b>{estimate.timing?.totalLabel}</b><small>full scan</small></div>
                    <div><span>SPEED</span><b>{estimate.throughput?.leadsPerMinute || 0}</b><small>leads/min</small></div>
                  </div>
                  <div className="v2-rail-phases">
                    {(estimate.phases || []).map(phase => (
                      <div key={phase.name}>
                        <span>{phase.name === 'Search' ? 'Find businesses' : phase.name === 'Deep' ? 'Complete profiles' : phase.name}</span>
                        <b>{phase.label}</b>
                      </div>
                    ))}
                  </div>
                  {estimate.warnings?.length > 0 && (
                    <div className="v2-rail-warning"><AlertTriangle size={12} /> {estimate.warnings[0]}</div>
                  )}
                </>
              ) : (
                <div className="v2-rail-empty">{estimating ? 'Reading zone index…' : 'Add a location to estimate.'}</div>
              )}
            </div>
          </section>

          <section className="v2-rail-panel v2-run-panel">
            <div className="v2-rail-head">
              <span><RadarIcon size={14} /> CURRENT RUN</span>
              <StatusPill tone={run?.status === 'running' ? 'cyan' : run?.status === 'complete' ? 'lime' : run ? 'amber' : 'neutral'} pulse={run?.status === 'running'}>
                {run?.status || 'idle'}
              </StatusPill>
            </div>

            {run ? (
              <>
                <div className="v2-run-big">
                  <b>{formatNumber(runLeadCount || 0)}</b>
                  <span>LEADS THIS RUN</span>
                  <small>{formatClock(runElapsed)} elapsed</small>
                </div>
                <span className="v2-run-progress"><i style={{ width: `${runPercent}%` }} /></span>
                <div className="v2-run-detail">
                  <span><b>{runPercent}%</b> zones</span>
                  <span><b>{runDone}/{runTotal || '—'}</b> complete</span>
                  <span><b>{progress?.eta || '—'}</b> ETA</span>
                </div>
                <div className="v2-run-zone">
                  <CircleDot size={12} />
                  <span>{progress?.activeMandal || (run.status === 'running' ? 'Opening signal…' : 'Run finished')}</span>
                </div>
                <div className="v2-run-tags">
                  {(Array.isArray(run?.engines) ? run.engines : []).map(engine => <span key={engine}>{engine}</span>)}
                  {run?.postWebsite && <span>website</span>}
                  {run?.postDeep && <span>deep</span>}
                </div>
              </>
            ) : (
              <div className="v2-rail-empty">No active run. Configure a category and a location, then dispatch.</div>
            )}
          </section>

          <section className="v2-rail-panel v2-rail-help">
            <div className="v2-rail-head">
              <span><Sparkles size={14} /> HOW IT WORKS</span>
            </div>
            <ol className="v2-help-steps">
              <li><b>1</b><span>Type what you need and where.</span></li>
              <li><b>2</b><span>Watch verified businesses appear live.</span></li>
              <li><b>3</b><span>Call, add notes and move them through CRM.</span></li>
            </ol>
            <div className="v2-exact-note">
              <b>Exact-match guard is on</b>
              <span>Only businesses that match the category you type are kept. Other vendor types and generic labels are rejected.</span>
            </div>
          </section>
        </aside>

        <main className={cx('v2-cmd-main', activeTab === 'cockpit' && 'is-cockpit')}>
          <SearchConsole
            mode={runMode}
            onModeChange={setRunMode}
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
            running={run?.status === 'running'}
            compact={activeTab === 'cockpit'}
            onResolve={setScanPlan}
            onMasterSweep={handleStartMasterSweep}
            progress={progress}
            eta={progress?.eta || progress?.etaText || (estimate?.timing?.totalLabel ? `~${estimate.timing.totalLabel}` : '')}
            progress={progress}
            eta={progress?.eta || progress?.etaText || (estimate?.timing?.totalLabel ? `~${estimate.timing.totalLabel}` : '')}
            runs={effectiveRuns}
            onOpenFolder={openFolder}
          />

          <section className="v2-cmd-stats">
            <MetricCard
              label={targetSessionId ? "SESSION LEADS" : "LEADS FOUND"}
              value={formatNumber(targetSessionId ? sessionVendors.length : vendors.length)}
              sub={run?.status === 'running' ? `${formatNumber(runLeadCount)} live this search` : `${formatNumber(vendors.length)} total database`}
              icon={Users}
              tone="lime"
              pulse={run?.status === 'running'}
            />
            <MetricCard
              label="MOBILE NUMBERS"
              value={formatNumber(targetSessionId ? runMobilesCount : stats.phones)}
              sub={`${(targetSessionId ? sessionVendors.length : vendors.length) ? Math.round(((targetSessionId ? runMobilesCount : stats.phones) / (targetSessionId ? sessionVendors.length : vendors.length)) * 100) : 0}% have a phone`}
              icon={Phone}
              tone="cyan"
            />
            <MetricCard
              label="COMPLETE PROFILES"
              value={formatNumber(targetSessionId ? sessionVendors.filter(v => v.deepExtractedAt).length : stats.deep)}
              sub={`${stats.avg}% avg profile quality`}
              icon={Zap}
              tone="violet"
            />
            <MetricCard
              label="SAVED FOLDERS"
              value={formatNumber(effectiveRuns.length)}
              sub={`${formatNumber(estimate?.zones?.count || 0)} areas in this search`}
              icon={FolderArchive}
              tone="amber"
            />
          </section>

          {run?.status === 'running' && (
            <div className="v2-live-run-strip">
              <div className="v2-live-run-pulse" />
              <div className="v2-live-run-info">
                <span className="v2-live-run-badge">⚡ SWARM ACTIVE</span>
                <b>{run.category || form.category || autoQuery} in {run.location || form.location || 'Selected Area'}</b>
                {progress?.activeMandal && <span className="v2-live-zone-chip">📍 {progress.activeMandal}</span>}
                <span style={{ fontSize: 11, color: '#64748B', marginLeft: 8 }}>
                  {progress?.phase || 'Scanning Municipal Zones & JustDial / SERP Indices...'}
                </span>
              </div>
              <div className="v2-live-run-metrics">
                <div className="v2-live-metric-item">
                  <Users size={13} style={{ color: '#059669' }} />
                  <span>LEADS:</span>
                  <b>{formatNumber(runLeadCount)}</b>
                </div>
                <div className="v2-live-metric-item">
                  <Zap size={13} style={{ color: '#7C3AED' }} />
                  <span>SPEED:</span>
                  <b>{runElapsed > 5 ? `${Math.round((runLeadCount / runElapsed) * 60)}/min` : 'Calibrating...'}</b>
                </div>
                <div className="v2-live-metric-item">
                  <MapPin size={13} style={{ color: '#2563EB' }} />
                  <span>ZONES:</span>
                  <b>{runDone}/{runTotal || '—'}</b>
                </div>
                <div className="v2-live-metric-item">
                  <Phone size={13} style={{ color: '#0284C7' }} />
                  <span>MOBILES:</span>
                  <b>{formatNumber(runMobilesCount)}</b>
                </div>
                <div className="v2-live-metric-item">
                  <Clock size={13} style={{ color: '#D97706' }} />
                  <span>EST. TIME:</span>
                  <b>{progress?.eta || progress?.etaText || (estimate?.timing?.totalLabel ? `~${estimate.timing.totalLabel}` : 'Calculating…')}</b>
                </div>
                <button type="button" className="v2-btn-3d-stop" onClick={stopRun} title="Safely stop swarm and save collected leads">
                  <Square size={11} fill="#FFFFFF" /> Stop Swarm
                </button>
              </div>
            </div>
          )}

          <InstrumentPanel
            running={run?.status === 'running'}
            leadCount={runLeadCount}
            progress={progress}
            compact={activeTab === 'cockpit'}
          />

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

          <nav className="v2-cmd-tabs">
            <button type="button" className={cx(activeTab === 'cockpit' && 'is-active')} onClick={() => setActiveTab('cockpit')}>
              <LayoutDashboard size={14} /> Workspace
            </button>
            <button type="button" className={cx(activeTab === 'leads' && 'is-active')} onClick={() => setActiveTab('leads')}>
              <Table2 size={14} /> Leads <b>{formatNumber(filteredVendors.length)}</b>
            </button>
            <button type="button" className={cx(activeTab === 'map' && 'is-active')} onClick={() => setActiveTab('map')}>
              <MapPin size={14} /> Map <b>{formatNumber(filteredVendors.filter(v => Number.isFinite(Number(v.latitude))).length)}</b>
            </button>
            <button type="button" className={cx(activeTab === 'crm' && 'is-active')} onClick={() => setActiveTab('crm')}>
              <Users size={14} /> CRM <b>{formatNumber(vendors.filter(v => crmStageOf(v) !== 'new').length)}</b>
            </button>
            <button type="button" className={cx(activeTab === 'runs' && runsSubTab === 'client' && 'is-active')} onClick={() => { setActiveTab('runs'); setRunsSubTab('client'); }}>
              <FolderArchive size={14} /> Client Folders <b>{formatNumber(clientRuns.length)}</b>
            </button>
            <button type="button" className={cx((activeTab === 'runs' && runsSubTab === 'master') || activeTab === 'master' ? 'is-active' : '')} onClick={() => { setActiveTab('runs'); setRunsSubTab('master'); }}>
              <Compass size={14} /> 🗺️ Master Folders <b>{formatNumber(masterRuns.length)}</b>
            </button>
            <button type="button" className={cx(activeTab === 'intelligence' && 'is-active')} onClick={() => { setActiveTab('intelligence'); fetchTaxonomy(); }}>
              <Brain size={14} /> Intelligence Bank
            </button>
            <span className="v2-cmd-tabs-spacer" />
            <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={refresh}>
              <RefreshCw size={13} /> Refresh
            </button>
          </nav>

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
                activeZone={activeZone}
                scanning={scanning}
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                page={currentPage}
                pageCount={pageCount}
                pageSize={pageSize}
                onPage={setPage}
                onPageSize={setPageSize}
                run={run}
                stats={stats}
                selectedAreaFilter={selectedAreaFilter}
                onSelectArea={setSelectedAreaFilter}
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
                activeZone={activeZone}
                scanning={scanning}
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                estimate={estimate}
                setSelectedVendor={setSelectedVendor}
              />
            )}

            {activeTab === 'crm' && (
              <CrmBoard
                vendors={vendors}
                onOpen={setSelectedVendor}
                onStageChange={updateCrmStage}
                onValueChange={updateDealValue}
                savingId={crmSavingId}
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
                            <h3>Swarm an Entire District, Mandal Cluster, or State</h3>
                            <p>Automatically enumerates all constituent mandals/districts, eliminates duplicate leads cross-regionally, and creates a consolidated Master Folder.</p>
                          </div>
                        </div>
                        <div className="v2-master-launcher-fields">
                          <div className="v2-master-field">
                            <label>Business Category</label>
                            <input
                              type="text"
                              placeholder="e.g. Photography Studios, Plumbers, Banquet Halls"
                              value={masterSweepForm.category}
                              onChange={e => setMasterSweepForm(prev => ({ ...prev, category: e.target.value }))}
                            />
                          </div>
                          <div className="v2-master-field">
                            <label>District, Mandal or State</label>
                            <input
                              type="text"
                              placeholder="e.g. Guntur District, Tenali Mandal, Andhra Pradesh"
                              value={masterSweepForm.name}
                              onChange={e => setMasterSweepForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                          <div className="v2-master-field">
                            <label>Coverage Scope</label>
                            <select
                              value={masterSweepForm.scope}
                              onChange={e => setMasterSweepForm(prev => ({ ...prev, scope: e.target.value }))}
                            >
                              <option value="district">🗺️ District Sweep (all 14–35 mandals)</option>
                              <option value="mandal">📍 Mandal Cluster (all villages)</option>
                              <option value="state">🏛️ State Sweep (all districts)</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            className="v2-btn-master-sweep"
                            onClick={() => handleStartMasterSweep()}
                            disabled={masterLaunching || !masterSweepForm.category || !masterSweepForm.name}
                          >
                            <Compass size={15} /> {masterLaunching ? 'SWARMING...' : '🚀 START MASTER SWEEP'}
                          </button>
                        </div>
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
          onOpenWhatsApp={(v) => {
            const phone = getDisplayPhone(v);
            const digits = phone ? String(phone).replace(/\D/g, '').slice(-10) : '';
            if (digits.length === 10) {
              const text = `Hi ${v.name || 'there'}, I found your business on Scraper.co.in and wanted to connect.`;
              window.open(`https://wa.me/91${digits}?text=${encodeURIComponent(text)}`, '_blank');
            } else if (v.whatsappLink) {
              window.open(v.whatsappLink, '_blank');
            }
          }}
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
    </div>
  );
}
