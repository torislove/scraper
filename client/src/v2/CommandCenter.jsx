import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, BarChart3, Check, CheckCircle2, CheckSquare, ChevronDown, Clock, Compass,
  ChevronLeft, ChevronRight, CircleDot, Copy, Crosshair, Database, Download,
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
import InstrumentPanel from './components/InstrumentPanel';
import CountryFlagStrip from './components/CountryFlagStrip';
import TrashModal from './components/TrashModal';
import { findCountry } from './data/countries';
import { CRM_STAGES, crmStageOf, formatInr } from './utils/leadStages';
import {
  deepExtractVendor, getDeepJob, getDeepJobs, getEstimate, getHealth,
  getScrapeJobs, getSessions, getSessionVault, getVendors, sessionExportUrl,
  startAuto, startDeepBatch, startOmni, stopAllScrapes, stopDeepJob, resumeDeepJob, updateVendorCrm, streamUrl,
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
import { extractLeadArea, CarriedBadge, qualityOf, calculateHaversineKm } from './utils/leadHelpers';

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
    try { return localStorage.getItem('scraper-country') || 'IN'; } catch (e) { return 'IN'; }
  });
  // Filled by CountryFlagStrip after it reads /api/sources?country=XX. It carries
  // the country's own admin vocabulary (Province → Census division → City, …).
  const [countryMeta, setCountryMeta] = useState(null);

  const handleCountrySelect = useCallback((code, country) => {
    setSearchCountry(code);
    try { localStorage.setItem('scraper-country', code); } catch (e) { }
    toast.success(`${country.name} selected. Type a city or town there to search.`, { icon: '🌍' });
    setForm(prev => {
      if (prev.location && prev.location.trim()) return prev;
      return { ...prev, location: code === 'IN' ? '' : country.name };
    });
  }, []);

  // The default flow is one free-text query. Category, engines, zones and
  // post-run deep extraction are resolved server-side by the category router.
  const [runMode, setRunMode] = useState('auto');
  const [autoQuery, setAutoQuery] = useState(
    routerLocation.state?.query || ''
  );
  const [activeZone, setActiveZone] = useState(null);
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
  const [sessionFilter, setSessionFilter] = useState('');

  const [launching, setLaunching] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [batchStarting, setBatchStarting] = useState(false);
  const [batchConfig, setBatchConfig] = useState({ limit: 100, website: true, google: true });

  const mountedRef = useRef(true);
  const runRef = useRef(null);
  const runVendorIdsRef = useRef(new Set());
  const activeSessionIdRef = useRef('');
  const lastEventRef = useRef(Date.now());
  const finishingRef = useRef(false);
  const deepJobRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
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

  const loadVendors = useCallback(async () => {
    try {
      const data = await getVendors();
      if (mountedRef.current) setVendors(data);
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
              const isIncomingMob = incomingPhone && /^[6-9]\d{9}$/.test(incomingPhone.replace(/\D/g, '').slice(-10));
              const isExistingMob = existingPhone && /^[6-9]\d{9}$/.test(existingPhone.replace(/\D/g, '').slice(-10));

              let mergedPhone = existing.phone;
              if (isIncomingMob) mergedPhone = incomingPhone;
              else if (isExistingMob) mergedPhone = existingPhone;
              else if (incomingPhone) mergedPhone = incomingPhone;

              const mergedPhones = Array.from(new Set([
                ...(Array.isArray(existing.phones) ? existing.phones : (existing.phone ? [existing.phone] : [])),
                ...(Array.isArray(v.phones) ? v.phones : (v.phone ? [v.phone] : []))
              ])).filter(Boolean);

              const mergedSessionIds = Array.from(new Set([
                ...(Array.isArray(existing.sessionIds) ? existing.sessionIds : (existing.sessionId ? [existing.sessionId] : [])),
                ...(Array.isArray(v.sessionIds) ? v.sessionIds : (v.sessionId ? [v.sessionId] : []))
              ])).filter(Boolean);

              map.set(v.id, {
                ...existing,
                ...v,
                phone: mergedPhone,
                phones: mergedPhones.length ? mergedPhones : (mergedPhone ? [mergedPhone] : []),
                sessionId: v.sessionId || existing.sessionId,
                lastSessionId: v.lastSessionId || v.sessionId || existing.lastSessionId,
                sessionIds: mergedSessionIds,
                website: v.website || existing.website,
                email: v.email || existing.email,
                emails: (Array.isArray(v.emails) && v.emails.length) ? v.emails : existing.emails,
                address: v.address || existing.address,
                crmStage: existing.crmStage || v.crmStage || 'new',
                crmStatus: existing.crmStatus || v.crmStatus || 'new',
                crmNotes: existing.crmNotes || v.crmNotes,
                crmTasks: existing.crmTasks || v.crmTasks
              });
              hasChanges = true;
            } else {
              map.set(v.id, v);
              freshIds.push(v.id);
              hasChanges = true;
            }
          });
          if (!hasChanges) return prev;
          // A vendor can arrive twice in one flush (the same business surfaced
          // by two zone jobs). Pushing its id twice duplicated the row and made
          // React complain about duplicate keys, so the order is a Set.
          const fullOrder = Array.from(new Set([...freshIds, ...existingIds]));
          return fullOrder.map(id => map.get(id)).filter(Boolean);
        });
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
      }, 50);
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

          const activeSid = activeSessionIdRef.current || sessionFilter || runRef.current?.sessionId || runRef.current?.id;
          if (activeSid) {
            vendor.sessionId = activeSid;
            vendor.lastSessionId = activeSid;
            vendor.sessionIds = Array.isArray(vendor.sessionIds)
              ? Array.from(new Set([...vendor.sessionIds, activeSid]))
              : [activeSid];
          }

          if (runRef.current?.status === 'running' || activeSessionIdRef.current) {
            runVendorIdsRef.current.add(vendor.id);
            setRunLeadCount(runVendorIdsRef.current.size);
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
            setActiveZone(prev => ({
              ...(prev || {}),
              ...data.activeZone,
              name: data.activeZone.name || data.activeZone.zoneName || prev?.name,
              lat: Number.isFinite(Number(data.activeZone.lat)) ? Number(data.activeZone.lat) : prev?.lat,
              lng: Number.isFinite(Number(data.activeZone.lng)) ? Number(data.activeZone.lng) : prev?.lng,
              radiusKm: Number(data.activeZone.radiusKm) || 3.5,
              index: data.activeZone.index || prev?.index || 1
            }));
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
      onSource: bindSource,
      onStatus: status => setSseStatus(status === 'open' ? 'open' : status === 'connecting' ? 'connecting' : 'error'),
      onAttempt: count => setReconnectAttempts(count)
    });
    reconnectStreamRef.current = () => stream.reconnect();
    stream.start();

    return () => {
      if (flushTimer) clearInterval(flushTimer);
      if (microFlushTimer) clearTimeout(microFlushTimer);
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
      refresh();
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
    const sessionId = `cmd_${Date.now().toString(36)}`;
    activeSessionIdRef.current = sessionId;
    if (overrides.query) setAutoQuery(overrides.query);
    runVendorIdsRef.current = new Set();
    finishingRef.current = false;
    setRunLeadCount(0);
    setProgress(null);
    setSessionFilter(sessionId);
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
          engines,
          country: searchCountry,
          sessionId
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
      setRun(null);
      activeSessionIdRef.current = '';
      toast.error(error?.response?.data?.error || 'Search could not be started.');
      setMascotAlert({ id: Date.now(), text: 'That search did not start. Check the engine board, then try again.' });
      setLogs(prev => [...prev, `[ERROR] ${error?.response?.data?.error || error.message}`]);
    } finally {
      setLaunching(false);
    }
  };

  const stopRun = async () => {
    setStopping(true);
    try {
      const sid = run?.sessionId || run?.id || activeSessionIdRef.current;
      activeSessionIdRef.current = '';
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
      refresh();
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

  return (
    <div className="v2-root v2-command">
      <div className="v2-page-grid" aria-hidden="true" />

      {(sseStatus === 'error' && reconnectAttempts >= 2) && (
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
          <span className="v2-cmd-context">
            {formatNumber(vendors.length)} leads · {(() => {
              const markets = new Set(vendors.map(v => String(v.country || 'IN').toUpperCase()));
              if (markets.size > 1) return `${markets.size} markets`;
              const only = [...markets][0] || searchCountry;
              return (findCountry(only) || { name: 'India' }).name;
            })()}
            {countryMeta?.adminPath ? <em className="v2-cmd-hierarchy">Next search: {countryMeta.adminPath}</em> : null}
          </span>

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

      <CountryFlagStrip selected={searchCountry} onSelect={handleCountrySelect} onMeta={setCountryMeta} />

      <nav className="v2-cmd-tabs">
        <button
          type="button"
          className={cx('v2-tab-pill-btn', activeTab === 'cockpit' && 'is-active')}
          onClick={() => setActiveTab('cockpit')}
        >
          {activeTab === 'cockpit' && (
            <motion.div
              layoutId="activeTabPill"
              className="v2-tab-indicator"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <LayoutDashboard size={14} /> Workspace
        </button>
        <button
          type="button"
          className={cx('v2-tab-pill-btn', activeTab === 'leads' && 'is-active')}
          onClick={() => setActiveTab('leads')}
        >
          {activeTab === 'leads' && (
            <motion.div
              layoutId="activeTabPill"
              className="v2-tab-indicator"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <Table2 size={14} /> Leads <b>{formatNumber(filteredVendors.length)}</b>
        </button>
        <button
          type="button"
          className={cx('v2-tab-pill-btn', activeTab === 'map' && 'is-active')}
          onClick={() => setActiveTab('map')}
        >
          {activeTab === 'map' && (
            <motion.div
              layoutId="activeTabPill"
              className="v2-tab-indicator"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <MapPin size={14} /> Map <b>{formatNumber(filteredVendors.filter(v => Number.isFinite(Number(v.latitude))).length)}</b>
        </button>
        <button
          type="button"
          className={cx('v2-tab-pill-btn', activeTab === 'runs' && 'is-active')}
          onClick={() => setActiveTab('runs')}
        >
          {activeTab === 'runs' && (
            <motion.div
              layoutId="activeTabPill"
              className="v2-tab-indicator"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <FolderArchive size={14} /> Saved Folders <b>{formatNumber(effectiveRuns.length)}</b>
        </button>
        <span className="v2-cmd-tabs-spacer" />
        <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={refresh}>
          <RefreshCw size={13} /> Refresh
        </button>
      </nav>

      <div className={cx('v2-cmd-body', activeTab === 'cockpit' && 'is-cockpit')}>
        <main className={cx('v2-cmd-main', activeTab === 'cockpit' && 'is-cockpit')}>
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
              // Zones still outstanding means the sweep is alive, even if the
              // last progress frame reported sessionActive:false between phases.
              // Without this the Stop button flipped back to "Find Leads" while
              // two thirds of the zones were still being crawled.
              return Boolean(
                (activeSessionIdRef.current && (scanning || progress?.sessionActive)) ||
                (total > 0 && done < total)
              );
            })()}
            compact={activeTab === 'cockpit'}
            onResolve={setScanPlan}
            progress={progress}
            eta={progress?.eta || progress?.etaText || (estimate?.timing?.totalLabel ? `~${estimate.timing.totalLabel}` : '')}
            runLeadCount={runLeadCount}
            runStartedAt={run?.startedAt || 0}
          />

          <section className="v2-cmd-stats">
            <MetricCard label="LEADS FOUND" value={formatNumber(vendors.length)} sub={`${formatNumber(runLeadCount)} this search`} icon={Users} tone="lime" pulse={Boolean((run?.status === 'running' || scanning) && !finishingRef.current)} />
            <MetricCard label="MOBILE NUMBERS" value={formatNumber(stats.phones)} sub={`${vendors.length ? Math.round((stats.phones / vendors.length) * 100) : 0}% have a phone`} icon={Phone} tone="cyan" />
            <MetricCard label="COMPLETE PROFILES" value={formatNumber(stats.deep)} sub={`${stats.avg}% avg profile quality`} icon={Zap} tone="violet" />
            <MetricCard label="SAVED FOLDERS" value={formatNumber(effectiveRuns.length)} sub={`${formatNumber(estimate?.zones?.count || 0)} areas in this search`} icon={FolderArchive} tone="amber" />
          </section>

          {run?.status === 'running' && (
            <div className="v2-live-run-strip">
              <div className="v2-live-run-pulse" />
              <div className="v2-live-run-info">
                <span className="v2-live-run-badge">SWARM HARVESTING ACTIVE</span>
                <b>{run.category || form.category || autoQuery} in {run.location || form.location || 'Selected Area'}</b>
                {(effectiveActiveZone?.name || progress?.activeMandal) && (
                  <span className="v2-live-zone-chip">
                    📍 {effectiveActiveZone?.name || progress?.activeMandal}
                    {Number.isFinite(Number(effectiveActiveZone?.lat)) && ` [${Number(effectiveActiveZone.lat).toFixed(3)}, ${Number(effectiveActiveZone.lng).toFixed(3)}]`}
                  </span>
                )}
              </div>
              <div className="v2-live-run-metrics">
                <div className="v2-live-metric-item">
                  <Users size={13} className="v2-text-lime" />
                  <span>LEADS:</span>
                  <b>{formatNumber(runLeadCount)}</b>
                </div>
                <div className="v2-live-metric-item">
                  <Clock size={13} className="v2-text-amber" />
                  <span>EST. TIME:</span>
                  <b>{progress?.eta || progress?.etaText || (estimate?.timing?.totalLabel ? `~${estimate.timing.totalLabel}` : 'Calculating…')}</b>
                </div>
                <button type="button" className="v2-btn v2-btn-danger v2-btn-sm" onClick={stopRun} title="Safely stop swarm and save collected leads">
                  <Square size={11} /> Stop
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
                stats={stats}
                onOpenTrash={() => setTrashOpen(true)}
              />
            )}

            {activeTab === 'leads' && (
              <section className="v2-leads-view">
                {sessionFilter && (
                  <div className="v2-session-banner">
                    <Filter size={13} />
                    <span>Showing run <b>{sessionFilter}</b></span>
                    <button type="button" onClick={() => setSessionFilter('')}><X size={12} /> Clear</button>
                  </div>
                )}

                <FilterBar
                  filters={filters}
                  onChange={updateFilter}
                  total={vendors.length}
                  shown={filteredVendors.length}
                />

                <div className="v2-table-shell">
                  <div className="v2-table-scroll">
                    <table className="v2-lead-table">
                      <thead>
                        <tr>
                          <th>BUSINESS</th>
                          <th>LOCATION</th>
                          <th>CONTACT</th>
                          <th>RATING</th>
                          <th>CRM STAGE</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((vendor, index) => {
                          const quality = qualityOf(vendor);
                          const stage = crmStageOf(vendor);
                          const originLat = Array.isArray(mapCenter) ? mapCenter[0] : (mapCenter?.lat || null);
                          const originLng = Array.isArray(mapCenter) ? mapCenter[1] : (mapCenter?.lng || null);
                          const vLat = vendor.latitude ?? vendor.lat;
                          const vLng = vendor.longitude ?? vendor.lng;
                          const distKm = calculateHaversineKm(originLat, originLng, vLat, vLng);
                          const leadAddress = dedupeAddress(vendor.address || vendor.formattedAddress || vendor.street || [vendor.locality, vendor.city || vendor.village || vendor.mandal, vendor.district, vendor.state].filter(Boolean).join(', ') || (vendor.city || vendor.village || 'Locality'));
                          return (
                            <tr
                              key={vendor.id}
                              className="v2-lead-animated-row"
                              style={{ animationDelay: `${Math.min(index * 35, 600)}ms` }}
                              onClick={() => setSelectedVendor(vendor)}
                            >
                              <td>
                                <div className="v2-vendor-cell">
                                  <VendorAvatar vendor={vendor} />
                                  <span>
                                    <b>{vendor.name || 'Unknown vendor'}</b>
                                    <small>{vendor.category || 'Vendor'}{vendor.subcategory ? ` · ${vendor.subcategory}` : ''}{quality != null ? ` · ${quality}% profile` : ''}</small>
                                  </span>
                                  {vendor.verified && <CheckCircle2 size={13} className="v2-verified-icon" />}
                                </div>
                              </td>
                              <td>
                                <div className="v2-location-cell">
                                  <div className="v2-lead-address-line" title={leadAddress}>
                                    <MapPin size={11} className="v2-text-lime" style={{ flexShrink: 0 }} />
                                    <span className="v2-lead-address">{leadAddress}</span>
                                  </div>
                                  <div className="v2-location-sub" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                    <span>{vendor.city || vendor.village || vendor.mandal || 'Unknown'}</span>
                                    <small>{dedupeAddress([vendor.district, vendor.state].filter(Boolean).join(', ')) || vendor.pincode || '—'}</small>
                                    {distKm != null && distKm <= 500 && (
                                      <span className="v2-distance-badge" title="Distance from search origin">
                                        📍 {distKm} km
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="v2-contact-cell">
                                          {(() => {
                                            const activePhone = getDisplayPhone(vendor);
                                            const isMob = isMobilePhone(activePhone, vendor.country);
                                            const waNum = whatsappNumber(activePhone, vendor.country);
                                            return activePhone && !String(activePhone).includes('Requires') ? (
                                              <div className="v2-phone-cluster">
                                                <a href={`tel:${activePhone}`} className="v2-phone-badge" onClick={event => event.stopPropagation()}>
                                                  <Phone size={11} /> {activePhone}
                                                </a>
                                        {isMob && (
                                            <a
                                              href={vendor.whatsappLink || `https://wa.me/${waNum}?text=Hi%20${encodeURIComponent(vendor.name || '')}%2C%20I%20found%20your%20business%20listing%20and%20wanted%20to%20connect.`}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="v2-wa-quick-btn"
                                              title="Chat on WhatsApp"
                                              onClick={event => event.stopPropagation()}
                                            >
                                              💬 WhatsApp
                                            </a>
                                          )}
                                        </div>
                                      ) : (
                                      <span className="v2-muted">No mobile yet</span>
                                      );
                                  })()}
                                      <span className="v2-contact-sub">
                                        {vendor.website
                                          ? <a href={vendor.website} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}><Globe2 size={11} /> website</a>
                                          : <em>no website</em>}
                                        {vendor.email && <a href={`mailto:${vendor.email}`} onClick={event => event.stopPropagation()}>email</a>}
                                      </span>
                                    </div>
                              </td>
                              <td>
                                {vendor.rating != null ? <span className="v2-table-rating">{Number(vendor.rating).toFixed(1)} <small>({formatNumber(vendor.reviewsCount || 0)})</small></span> : <span className="v2-muted">—</span>}
                              </td>
                              <td>
                                <select
                                  className={cx('v2-stage-select', `stage-${stage}`)}
                                  value={stage}
                                  onClick={event => event.stopPropagation()}
                                  onChange={event => updateCrmStage(vendor, event.target.value)}
                                  disabled={crmSavingId === vendor.id}
                                >
                                  {CRM_STAGES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                                </select>
                              </td>
                              <td>
                                <div className="v2-row-actions" onClick={event => event.stopPropagation()}>
                                  <button type="button" onClick={() => setSelectedVendor(vendor)} title="Open full profile"><ArrowRight size={13} /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {pageRows.length === 0 && (
                      <EmptyState
                        icon={Search}
                        title="No vendors match this filter."
                        body="Clear the filters or start a search to populate the command center. Nothing is seeded or faked."
                        action={() => setFilters({ query: '', phoneOnly: false, websiteOnly: false, deepOnly: false, conflictsOnly: false, minRating: 0, sort: 'newest' })}
                        actionLabel="Reset filters"
                      />
                    )}
                  </div>

                  <footer className="v2-table-foot">
                    <span>
                      Showing <b>{filteredVendors.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredVendors.length)}</b> of <b>{formatNumber(filteredVendors.length)}</b>
                    </span>
                    <div className="v2-pagination">
                      <select value={pageSize} onChange={event => setPageSize(Number(event.target.value))}>
                        {[25, 50, 100, 250, 500, 10000].map(size => (
                          <option value={size} key={size}>{size === 10000 ? 'All Leads' : `${size} / page`}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={currentPage <= 1}><ChevronLeft size={13} /></button>
                      <span>{currentPage} / {pageCount}</span>
                      <button type="button" onClick={() => setPage(prev => Math.min(pageCount, prev + 1))} disabled={currentPage >= pageCount}><ChevronRight size={13} /></button>
                    </div>
                  </footer>
                </div>
              </section>
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
                    onSelect={vendor => setSelectedVendor(vendor)}
                    onSelectZone={name => updateFilter('query', name)}
                  />
                  <aside className="v2-map-side">
                    <div className="v2-map-side-head">
                      <span><Layers size={13} /> COVERAGE ZONES</span>
                      <b>{estimate?.zones?.count || mapZones.length}</b>
                    </div>
                    <div className="v2-zone-list">
                      {mapZones.map(zone => {
                        const name = zone.zoneName || zone.name || 'Zone';
                        const isActive = scanning && activeZone?.name === name;
                        return (
                          <div key={`${zone.index}-${name}`} className={cx(isActive && 'is-active')}>
                            <span>{String(zone.index || 0).padStart(2, '0')}</span>
                            <b>{name}</b>
                            <small>{isActive ? 'SCANNING' : zone.lat ? 'ANCHORED' : 'GEOCODE'}</small>
                          </div>
                        );
                      })}
                      {!mapZones.length && <p>No zone preview. Run an estimate first.</p>}
                    </div>
                    <div className="v2-map-side-foot">
                      <div><span>PLOTTED</span><b>{formatNumber(filteredVendors.filter(vendor => Number.isFinite(Number(vendor.latitude))).length)}</b></div>
                      <div><span>NO COORDS</span><b>{formatNumber(filteredVendors.filter(vendor => !Number.isFinite(Number(vendor.latitude))).length)}</b></div>
                    </div>
                  </aside>
                </div>
              </section>
            )}

            {activeTab === 'runs' && (
              <section className="v2-runs-view">
                <div className="v2-runs-top">
                  <div>
                    <span className="v2-view-kicker">SAVED SEARCH VAULTS · LOCAL LEAD ARCHIVES</span>
                    <h2>Every search is saved in its own permanent folder.</h2>
                    <p>Open any folder to explore leads, copy verified mobiles, export CSV/JSON, switch to Map view, or load it into your live Cockpit workspace.</p>
                  </div>
                  <div className="v2-folder-stats-pill">
                    <FolderArchive size={16} />
                    <span><b>{formatNumber(effectiveRuns.length)}</b> Folders</span>
                    <span>•</span>
                    <span><b>{formatNumber(effectiveRuns.reduce((acc, r) => acc + (r.leadCount || 0), 0))}</b> Leads</span>
                    <span>•</span>
                    <span><b>{formatNumber(effectiveRuns.reduce((acc, r) => acc + (r.phoneCount || 0), 0))}</b> Mobiles</span>
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

                <div className="v2-run-folder-tree">
                  <div className="v2-folder-head">
                    <FolderArchive size={15} />
                    <span>RECENT SEARCH FOLDERS DISK INDEX</span>
                    <b>{effectiveRuns.length} TOTAL VAULTS</b>
                  </div>
                  {filteredRuns.slice(0, 8).map((runCard, index) => (
                    <div className="v2-tree-row" key={runCard.id} style={{ paddingLeft: `${14 + (index % 4) * 16}px` }}>
                      <span>▸</span>
                      <b>{runCard.id}</b>
                      <span>{runCard.name || `${runCard.category} in ${runCard.location}`}</span>
                      <small>{formatNumber(runCard.leadCount)} leads · {formatNumber(runCard.phoneCount)} mobiles · {relativeTime(runCard.timestamp)}</small>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'deep' && (
              <section className="v2-deep-view">
                <div className="v2-deep-top">
                  <div>
                    <span className="v2-view-kicker">DEEP PROFILE ENGINE</span>
                    <h2>Fill the field contract. Keep the unknowns.</h2>
                    <p>Each vendor is saved independently under <code>server/data/deep_profiles/</code>. Stop and resume without losing completed profiles.</p>
                  </div>
                  <ScoreRing value={stats.avg} size={94} label="avg quality" />
                </div>

                <div className="v2-deep-grid">
                  <div className="v2-panel v2-deep-config">
                    <div className="v2-rail-head">
                      <span><Zap size={14} /> QUEUE A DEEP PASS</span>
                      <b>{formatNumber(deepEstimate?.count || 0)} UNEXTRACTED</b>
                    </div>
                    <div className="v2-deep-config-row">
                      <label htmlFor="deep-limit">Vendor limit</label>
                      <input
                        id="deep-limit"
                        type="number"
                        min="1"
                        max="750"
                        value={batchConfig.limit}
                        onChange={event => setBatchConfig(prev => ({ ...prev, limit: Math.max(1, Math.min(750, Number(event.target.value) || 1)) }))}
                      />
                      <span>~{deepEstimate?.label || '—'} · 2 browsers</span>
                    </div>
                    <div className="v2-toggle-stack">
                      <ToggleTile active={batchConfig.website} onClick={() => setBatchConfig(prev => ({ ...prev, website: !prev.website }))} label="Website" detail="Multi-page crawl" icon={Globe2} />
                      <ToggleTile active={batchConfig.google} onClick={() => setBatchConfig(prev => ({ ...prev, google: !prev.google }))} label="Google Maps" detail="Place detail DOM" icon={MapPin} />
                    </div>
                    <button type="button" className="v2-btn v2-btn-lime v2-btn-block" onClick={queueDeepManual} disabled={batchStarting || (deepEstimate?.count || 0) === 0}>
                      {batchStarting ? <Loader2 size={15} className="v2-spin" /> : <Zap size={15} />}
                      {batchStarting ? 'QUEUEING…' : 'START DEEP BATCH'}
                    </button>
                    <small className="v2-deep-config-note">Existing deep profiles are skipped unless you force a single-vendor pass from the drawer.</small>
                  </div>

                  <div className="v2-panel v2-deep-health">
                    <div className="v2-rail-head">
                      <span><Activity size={14} /> ENGINE HEALTH</span>
                      <StatusPill tone={health?.status === 'ok' ? 'lime' : 'amber'} pulse>{health?.status || 'unknown'}</StatusPill>
                    </div>
                    <div className="v2-deep-health-grid">
                      <div><span>TRACKED FIELDS</span><b>{health?.trackedFields || 52}</b><small>{health?.fieldGroups || 10} groups</small></div>
                      <div><span>DEEP EXTRACTED</span><b>{formatNumber(health?.deepExtracted || 0)}</b><small>{formatNumber(health?.vendors || vendors.length)} vendors</small></div>
                      <div><span>PROFILE FILES</span><b>{formatNumber(health?.profileFiles || 0)}</b><small>file-backed</small></div>
                      <div><span>ACTIVE JOBS</span><b>{formatNumber(health?.activeJobs || activeDeepJobs.length)}</b><small>resumable</small></div>
                    </div>
                    <div className="v2-deep-health-foot">
                      <span><Globe2 size={12} /> website {health?.engines?.website ? 'online' : 'offline'}</span>
                      <span><MapPin size={12} /> maps {health?.engines?.playwright ? 'online' : 'offline'}</span>
                      <span><Database size={12} /> village index {health?.geo?.villageIndexReady ? 'ready' : 'lazy'}</span>
                    </div>
                  </div>
                </div>

                <div className="v2-deep-jobs-head">
                  <span className="v2-view-kicker">JOB LEDGER</span>
                  <h3>Recent deep jobs</h3>
                </div>
                <div className="v2-deep-jobs-list">
                  {(deepJob ? [deepJob, ...deepJobs.filter(job => job.id !== deepJob.id)] : deepJobs).slice(0, 8).map(job => (
                    <DeepJobRow key={job.id} job={job} onStop={stopDeep} onResume={resumeDeep} active={job.id === deepJob?.id} />
                  ))}
                  {deepJobs.length === 0 && !deepJob && (
                    <EmptyState
                      icon={Zap}
                      title="No deep jobs yet."
                      body="Queue a batch or open any vendor and run a single deep extraction."
                      action={queueDeepManual}
                      actionLabel="Queue deep pass"
                    />
                  )}
                </div>

                <div className="v2-deep-jobs-head">
                  <span className="v2-view-kicker">LATEST PROFILES</span>
                  <h3>Recently completed</h3>
                </div>
                <div className="v2-profile-grid">
                  {recentProfiles.map(vendor => (
                    <button type="button" className="v2-profile-card" key={vendor.id} onClick={() => setSelectedVendor(vendor)}>
                      <VendorAvatar vendor={vendor} size={38} />
                      <span>
                        <b>{vendor.name}</b>
                        <small>{vendor.category || 'Uncategorised'} · {relativeTime(vendor.deepExtractedAt)}</small>
                      </span>
                      <ScoreRing value={qualityOf(vendor) || 0} size={52} label="" />
                    </button>
                  ))}
                  {recentProfiles.length === 0 && <p className="v2-muted">No deep profiles yet. Run the engine to populate this ledger.</p>}
                </div>
              </section>
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
    </div>
  );
}
