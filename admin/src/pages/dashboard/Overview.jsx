import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Play, Square, RefreshCw, ArrowRight, MapPin, Camera,
  MessageCircle, Globe, Database, Briefcase, Image, Clock,
  Trash2, X, Activity, ChevronDown, Check, XCircle, Download,
  FolderOpen, Filter, Send, Settings, TrendingUp, Zap, Target, Map, Users,
  BrainCircuit, ShieldAlert, Cpu, CheckCircle2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, Circle, Rectangle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useScraper } from '../../context/ScraperContext';
import OmniSearch from '../../components/OmniSearch';
import MarkerClusterGroup from 'react-leaflet-cluster';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';

// Fix for default leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom colored markers for clear visual distinction
const validIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const oobIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const getWorkerIcon = (instanceId) => {
  return L.divIcon({
    className: 'custom-worker-icon',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute inline-flex w-full h-full rounded-full bg-yellow-400 opacity-75 animate-[ping_1.5s_ease-in-out_infinite]"></div>
        <div class="relative flex items-center justify-center w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(234,179,8,0.6)]">
          <span class="text-[9px] font-black text-white">${instanceId || 'W'}</span>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const PIPELINE_STEPS = [
  {
    id: 0,
    name: 'Spelling & Query Parse',
    description: 'Fuse.js Fuzzy Matching',
    icon: Search,
    tech: 'Fuse.js Levenshtein',
    metric: '10ms Execution',
    limit: 'Threshold 0.4',
    detail: 'Auto-corrects search queries and aligns location input against known states, districts, and municipalities.'
  },
  {
    id: 1,
    name: 'Hierarchy Resolution',
    description: 'Llama-3.3-70B AI Parser',
    icon: BrainCircuit,
    tech: 'Llama 3.3 70B Instruct',
    metric: '< 2.5s Latency',
    limit: 'Lazy-loaded',
    detail: 'Intelligently extracts new administrative districts and mandals of India for granular place-by-place coverage.'
  },
  {
    id: 2,
    name: 'Concurrency Dispatcher',
    description: 'BullMQ Priority Queue',
    icon: RefreshCw,
    tech: 'Redis & BullMQ',
    metric: 'Stateful Dispatch',
    limit: '4 / district cap',
    detail: 'Distributes regional targets into queue slots with strict throttling to prevent IP rate-limiting.'
  },
  {
    id: 3,
    name: 'Dual-Engine Crawler',
    description: 'Playwright & Cheerio Workers',
    icon: Cpu,
    tech: 'Playwright Clustered',
    metric: 'Parallel Browsers',
    limit: '4 Max Workers',
    detail: 'Launches concurrent browser instances to extract Google Maps listings, websites, and social handles.'
  },
  {
    id: 4,
    name: 'Quality & Boundary Filter',
    description: 'Ola Maps Boundary Check',
    icon: ShieldAlert,
    tech: 'Ola Boundaries API',
    metric: 'Geofencing Pass',
    limit: 'Strict Bounds',
    detail: 'Performs polygon boundary checks to filter out irrelevant leads and validates phone structure.'
  },
  {
    id: 5,
    name: 'Live Production Sync',
    description: 'MongoDB Dual-Persistence',
    icon: Database,
    tech: 'Mongoose ODM',
    metric: 'Real-time SSE Push',
    limit: 'Dual Sync Enforced',
    detail: 'Persists verified records in MongoDB and pushes them immediately to the live production server and dashboard feed.'
  }
];

const MapBounds = ({ vendors, gridPoints, activePoints, userLocation, autoCenter, setAutoCenter }) => {
  const map = useMap();

  useEffect(() => {
    const handleUserInteraction = () => {
      setAutoCenter(false);
    };

    map.on('dragstart', handleUserInteraction);
    map.on('zoomstart', handleUserInteraction);

    return () => {
      map.off('dragstart', handleUserInteraction);
      map.off('zoomstart', handleUserInteraction);
    };
  }, [map, setAutoCenter]);

  useEffect(() => {
    if (!autoCenter) return; // Allow manual override if user interacts

    let pts = [];
    if (gridPoints && gridPoints.length > 0) {
      pts.push(...gridPoints.filter(p => p && p.lat != null).map(p => [p.lat, p.lng]));
    }
    if (activePoints && activePoints.length > 0) {
      pts.push(...activePoints.filter(p => p && p.lat != null).map(p => [p.lat, p.lng]));
    }
    if (vendors && vendors.length > 0) {
      pts.push(...vendors.slice(0, 50).filter(v => v && v.safeLat != null).map(v => [v.safeLat, v.safeLng]));
    }
    
    if (pts.length === 0 && userLocation && userLocation.length === 2) {
      pts.push(userLocation);
    }

    if (pts.length > 0) {
      const bounds = L.latLngBounds(pts);
      map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 14, duration: 1.5 });
    }
  }, [vendors, gridPoints, activePoints, userLocation, autoCenter, map]);
  return null;
};

const DistrictTreeItem = ({ districtName, mandals, distIdx, isDistrictActive, isDistrictDone, completedCount, getMandalStatus }) => {
  const [isOpen, setIsOpen] = useState(isDistrictActive);

  // Auto-expand if district becomes active
  useEffect(() => {
    if (isDistrictActive) {
      setIsOpen(true);
    }
  }, [isDistrictActive]);

  return (
    <div className={`border rounded-xl transition-all duration-200 ${
      isDistrictActive 
        ? 'border-violet-500/35 bg-violet-950/10' 
        : isDistrictDone 
          ? 'border-emerald-500/20 bg-emerald-950/5' 
          : 'border-white/5 bg-white/[0.01]'
    }`}>
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-left font-bold text-xs"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-1.5 h-1.5 rounded-full ${
            isDistrictActive 
              ? 'bg-violet-400 animate-pulse' 
              : isDistrictDone 
                ? 'bg-emerald-400' 
                : 'bg-slate-700'
          }`} />
          <span className={`truncate ${
            isDistrictActive 
              ? 'text-violet-300' 
              : isDistrictDone 
                ? 'text-emerald-300' 
                : 'text-gray-300'
          }`}>
            {districtName}
          </span>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
            isDistrictActive 
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
              : isDistrictDone 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'bg-slate-800 text-gray-400 border border-slate-700'
          }`}>
            {completedCount} / {mandals.length}
          </span>
          <ChevronDown 
            size={12} 
            className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 pt-0 border-t border-white/5 space-y-1 mt-1 max-h-[150px] overflow-y-auto custom-scrollbar">
          {mandals.map((mandal, mIdx) => {
            const status = getMandalStatus(mandal, districtName, distIdx, mIdx);
            
            return (
              <div 
                key={mandal}
                className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/[0.01] hover:bg-white/[0.03] transition-all text-[11px]"
              >
                <span className={`font-medium truncate ${
                  status === 'running' 
                    ? 'text-cyan-400 font-bold' 
                    : status === 'completed' 
                      ? 'text-gray-400' 
                      : 'text-gray-500'
                }`}>
                  {mandal}
                </span>
                
                <div className="flex items-center gap-1 shrink-0">
                  {status === 'running' ? (
                    <>
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
                      </span>
                      <span className="text-[8px] uppercase tracking-wider text-cyan-400 font-bold">Active</span>
                    </>
                  ) : status === 'completed' ? (
                    <>
                      <Check size={10} className="text-emerald-400 font-bold" />
                      <span className="text-[8px] uppercase tracking-wider text-emerald-400 font-bold">Done</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-700" />
                      <span className="text-[8px] uppercase tracking-wider text-gray-600">Pending</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function OverviewPage() {
  const {
    loading, logs, sseStatus, logLevel, setLogLevel,
    searchRadius, setSearchRadius,
    enabledEngines, setEnabledEngines,
    startScrape, handleMasterStop,
    stagingVendorsWithPhones, stagingVendorsNoPhones, liveVendors, outOfBoundsVendors, verifiedCount,
    modelLoadingStatus, suggestions, showSuggestions, setShowSuggestions,
    suggestionIndex, searchHistory, setSearchHistory,
    showDirectory, setShowDirectory, knowledge,
    handleSearchChange, handleKeyDown,
    categoryQuery, setCategoryQuery,
    locationQuery, setLocationQuery,
    activeInput, setActiveInput,
    searchScope, setSearchScope,
    searchSessionStart,
    handleCategoryChange, handleLocationChange,
    triggerPython, triggerCheerio, triggerMaps,
    vendors, activeJobs, grouped, pushToProd,
    searchContainerRef, terminalRef, gridPoints, gridDensity, setGridDensity,
    activePoints,
    searchProgress
  } = useScraper();

  const [showLog, setShowLog] = useState(false);
  const [userLocation, setUserLocation] = useState([17.3850, 78.4867]); // Default to Hyderabad
  const [autoCenter, setAutoCenter] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [hoveredStep, setHoveredStep] = useState(null);

  useEffect(() => {
    if (loading) {
      setAutoCenter(true);
    }
  }, [loading]);

  useEffect(() => {
    let interval;
    if (activeJobs.length > 0 && searchSessionStart) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - searchSessionStart) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [activeJobs, searchSessionStart]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log("Geolocation error or denied:", error);
        }
      );
    }
  }, []);

  // Dashboard Filtering: show only now extracted (current session) and new/unpushed leads
  const dashboardVendors = (vendors || []).filter(v => {
    if (searchSessionStart && searchSessionStart > 0) {
      return new Date(v.scrapedAt).getTime() >= searchSessionStart;
    }
    return !v.pushed;
  });

  const dashboardStaging = dashboardVendors.filter(v => !v.pushed);
  const dashboardStagingWithPhones = dashboardStaging.filter(v => v.phone && v.phone.length > 5 && !v.phone.includes('Requires'));
  const dashboardStagingNoPhones = dashboardStaging.filter(v => !v.phone || v.phone.length <= 5 || v.phone.includes('Requires'));
  const dashboardLive = dashboardVendors.filter(v => v.pushed);
  const dashboardOutOfBounds = (outOfBoundsVendors || []).filter(v => {
    if (searchSessionStart && searchSessionStart > 0) {
      return new Date(v.scrapedAt).getTime() >= searchSessionStart;
    }
    return true;
  });

  const totalLeads = dashboardVendors.length;
  const withPhone = dashboardStagingWithPhones.length;
  const noPhone = dashboardStagingNoPhones.length;
  const live = dashboardLive.length;

  const rawMapVendors = (!searchSessionStart || searchSessionStart === 0)
    ? []
    : [...dashboardStagingWithPhones, ...dashboardStagingNoPhones, ...dashboardOutOfBounds]
        .filter(v => (v.lat && v.lng) || (v.latitude && v.longitude))
        .map(v => ({...v, safeLat: v.lat || v.latitude, safeLng: v.lng || v.longitude}));

  // Defer map rendering arrays so Leaflet doesn't crash the browser
  const mapVendors = React.useDeferredValue(rawMapVendors);
  const deferredActivePoints = React.useDeferredValue(activePoints || []);

  const isSessionActive = loading || (searchProgress && searchProgress.sessionActive);
  let activeStep = -1;

  if (isSessionActive) {
    if (!searchProgress) {
      activeStep = 0;
    } else if (
      searchProgress.activeDistrict === 'Resolving...' ||
      (searchProgress.activeDistrict && searchProgress.activeDistrict.includes('Resolving')) ||
      searchProgress.activeMandal === 'Calculating...' ||
      (searchProgress.activeMandal && searchProgress.activeMandal.includes('Resolving'))
    ) {
      activeStep = 1;
    } else if (activeJobs.length === 0 && searchProgress.completedMandals === 0) {
      activeStep = 2;
    } else if (activeJobs.length > 0 && dashboardVendors.length === 0) {
      activeStep = 3;
    } else if (activeJobs.length > 0 && dashboardVendors.length > 0) {
      activeStep = 4;
    } else if (searchProgress.activeMandal === 'Complete' || !searchProgress.sessionActive) {
      activeStep = 5;
    } else {
      activeStep = 3;
    }
  }

  // Determine spec to show in HUD
  const activeStepObj = PIPELINE_STEPS[activeStep >= 0 ? activeStep : 0];
  const hoveredStepObj = hoveredStep !== null ? PIPELINE_STEPS[hoveredStep] : null;
  const currentHudSpec = hoveredStepObj || activeStepObj;

  const getMandalStatus = (mandalName, districtName, districtIdx, mandalIdx) => {
    if (!searchProgress) return 'pending';
    
    const activeDist = searchProgress.activeDistrict;
    const compDists = searchProgress.completedDistricts || 0;
    
    if (districtIdx < compDists) {
      return 'completed';
    }
    
    if (activeDist === districtName) {
      const compMandals = searchProgress.completedMandals || 0;
      if (mandalIdx < compMandals) {
        return 'completed';
      }
      if (mandalIdx === compMandals) {
        return 'running';
      }
    }
    
    const key = mandalName.toLowerCase().trim();
    if (searchProgress.targetsMap && searchProgress.targetsMap[key]) {
      return searchProgress.targetsMap[key];
    }
    
    return 'pending';
  };

  const exportMasterCSV = () => {
    if (!vendors || vendors.length === 0) return toast.error('No data to export');
    const csvData = Papa.unparse(vendors.map(v => ({
      ID: v.id || '', Name: v.name || '', Category: v.category || '', City: v.city || '',
      Address: v.address || '', Phone: v.phone && v.phone.startsWith('+91') ? `'${v.phone}` : v.phone,
      Rating: v.rating || '', Email: v.email || '', Instagram: v.instagram || '',
      GoogleMapsLink: v.mapsLink || '', OutOfBounds: v.outOfBounds ? 'Yes' : 'No', CRMStatus: v.crmStatus || 'New'
    })));
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `gomandap_master_leads_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Master CSV downloaded!`);
  };

  return (
    <div className="min-h-full" style={{ background: 'var(--bg-void)' }}>

      {/* Ambient background orbs */}
      <div className="ambient-orb" style={{ width: 400, height: 400, background: 'rgba(124,58,237,0.08)', top: -100, right: '10%', animationDuration: '25s' }} />
      <div className="ambient-orb" style={{ width: 300, height: 300, background: 'rgba(6,182,212,0.06)', bottom: '20%', left: '-5%', animationDuration: '30s', animationDelay: '5s' }} />

      {/* ── PAGE HEADER ── */}
      <div className="relative px-6 md:px-8 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(2,3,10,0.6)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(109,40,217,0.2))', border: '1px solid rgba(124,58,237,0.3)' }}>
                <Search size={15} style={{ color: '#a78bfa' }} />
              </div>
              <h1 className="font-display text-xl font-black text-white">Global Omni Search</h1>
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Search and extract verified business contacts from around the world</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={exportMasterCSV} className="btn-3d btn-emerald btn-sm">
              <Download size={13} /> Export CSV
            </button>
            <button onClick={handleMasterStop} className="btn-3d btn-rose btn-sm">
              <XCircle size={13} /> Stop All
            </button>
            <button onClick={pushToProd} disabled={verifiedCount === 0}
              className={`btn-3d btn-sm ${verifiedCount > 0 ? 'btn-primary' : 'btn-ghost opacity-40 cursor-not-allowed'}`}>
              <CheckCircle2 size={13} /> Push to DB {verifiedCount > 0 && <span className="badge badge-emerald ml-1" style={{ fontSize: 9, padding: '1px 6px' }}>{verifiedCount}</span>}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 space-y-6 relative z-10">

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Leads', value: totalLeads, icon: <Database size={16} />, accentColor: '#a78bfa', glowColor: 'rgba(124,58,237,0.3)', borderColor: 'rgba(124,58,237,0.2)', change: activeJobs.length > 0 ? 'Collecting...' : 'This session', tag: 'TOTAL' },
            { label: 'With Phone', value: withPhone, icon: <TrendingUp size={16} />, accentColor: '#6ee7b7', glowColor: 'rgba(16,185,129,0.3)', borderColor: 'rgba(16,185,129,0.2)', change: Math.round(totalLeads > 0 ? withPhone / totalLeads * 100 : 0) + '% hit rate', tag: 'CONTACT' },
            { label: 'No Contact', value: noPhone, icon: <Target size={16} />, accentColor: '#fcd34d', glowColor: 'rgba(245,158,11,0.3)', borderColor: 'rgba(245,158,11,0.2)', change: 'Recovery pending', tag: 'EMPTY' },
            { label: 'Live in DB', value: live, icon: <Zap size={16} />, accentColor: '#67e8f9', glowColor: 'rgba(6,182,212,0.3)', borderColor: 'rgba(6,182,212,0.2)', change: verifiedCount + ' pending push', tag: 'LIVE' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.34,1.56,0.64,1] }}
              className="glass-card stat-card"
              style={{ borderColor: stat.borderColor, boxShadow: `0 0 0 1px ${stat.borderColor}, 0 32px 64px -12px rgba(0,0,0,0.6), 0 0 40px -15px ${stat.glowColor}` }}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{stat.label}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${stat.glowColor}`, border: `1px solid ${stat.borderColor}`, color: stat.accentColor }}>
                  {stat.icon}
                </div>
              </div>
              <div className="stat-card-number" style={{ background: `linear-gradient(180deg, #fff 0%, ${stat.accentColor} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {stat.value.toLocaleString()}
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{stat.change}</p>
                <span className="badge" style={{ background: `${stat.glowColor}`, color: stat.accentColor, border: `1px solid ${stat.borderColor}`, fontSize: 9 }}>{stat.tag}</span>
              </div>
              {/* Ambient accent glow at bottom */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-px" style={{ background: `linear-gradient(90deg, transparent, ${stat.accentColor}40, transparent)` }} />
            </motion.div>
          ))}
        </div>

        {/* ── SEARCH BOX ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="glass-card overflow-hidden"
        >
          <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <h2 className="font-bold text-white flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
                  <Search size={12} style={{ color: '#a78bfa' }} />
                </div>
                Intelligent Search Engine
              </h2>
              <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Natural language search with AI semantic matching — status:{' '}
                {modelLoadingStatus?.status === 'ready'
                  ? <span className="text-emerald-400 font-semibold">● AI Active</span>
                  : modelLoadingStatus?.status === 'loading'
                    ? <span className="text-amber-400 font-semibold">⟳ Loading ({Math.round(modelLoadingStatus.progress || 0)}%)</span>
                    : <span style={{ color: 'rgba(255,255,255,0.3)' }}>● Standby</span>
                }
              </p>
            </div>
            
            {/* Live Indicator */}
            {searchProgress && searchProgress.sessionActive && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fda4af' }}>
                <span className="status-dot status-error" style={{ animation: 'badge-pulse-anim 1s ease-in-out infinite' }} />
                SCRAPING ACTIVE
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Search Inputs & Controls (7 cols) */}
              <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
                
                <div className="space-y-6">
                  {/* Search Scope Toggle */}
                  <div className="flex justify-center">
                    <div className="inline-flex p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {[
                        { id: 'exact', label: 'City Only' },
                        { id: 'mandal', label: 'Mandals Level' },
                        { id: 'full', label: 'Full Data (Villages)' }
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSearchScope(s.id)}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={searchScope === s.id ? {
                            background: 'rgba(124,58,237,0.25)',
                            color: '#c4b5fd',
                            border: '1px solid rgba(124,58,237,0.4)',
                            boxShadow: '0 0 12px rgba(124,58,237,0.2)',
                          } : {
                            color: 'rgba(255,255,255,0.35)',
                            border: '1px solid transparent',
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input Search Field */}
                  <div className="relative">
                    <OmniSearch 
                      onSearch={(cat, loc) => {
                        setTimeout(() => startScrape(null, cat, loc), 100);
                      }}
                      knowledge={knowledge}
                      history={searchHistory}
                    />
                    
                    {/* Dual-Section Animated Progress Tracker */}
                    <AnimatePresence>
                      {isSessionActive && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0, margin: 0 }} 
                          animate={{ opacity: 1, height: 'auto', marginTop: 16, marginBottom: 16 }} 
                          exit={{ opacity: 0, height: 0, margin: 0 }}
                          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl overflow-hidden relative text-left"
                        >
                          {/* Inner glowing effect */}
                          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />
                          <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Section: Active Target */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                                </span>
                                <span className="text-[10px] uppercase font-black tracking-widest text-violet-400">Target Resolution</span>
                              </div>
                              
                              <div className="grid grid-cols-1 gap-2.5">
                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block mb-0.5">District Scope</span>
                                    <AnimatePresence mode="popLayout">
                                      <motion.p 
                                        key={searchProgress?.activeDistrict}
                                        initial={{ opacity: 0, y: 5 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        exit={{ opacity: 0, y: -5 }}
                                        transition={{ duration: 0.2 }}
                                        className="text-xs font-black text-white truncate"
                                      >
                                        {searchProgress?.activeDistrict || 'Resolving...'}
                                      </motion.p>
                                    </AnimatePresence>
                                  </div>
                                  <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-300">Active</span>
                                </div>

                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block mb-0.5">Mandal / Local</span>
                                    <AnimatePresence mode="popLayout">
                                      <motion.p 
                                        key={searchProgress?.activeMandal}
                                        initial={{ opacity: 0, y: 5 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        exit={{ opacity: 0, y: -5 }}
                                        transition={{ duration: 0.2 }}
                                        className="text-xs font-black text-cyan-400 truncate"
                                      >
                                        {searchProgress?.activeMandal || 'Resolving...'}
                                      </motion.p>
                                    </AnimatePresence>
                                  </div>
                                  <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">Active</span>
                                </div>
                              </div>
                            </div>

                            {/* Right Section: Progress Indicators & ETA */}
                            <div className="space-y-3 flex flex-col justify-between">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 flex items-center gap-1.5">
                                  <Activity size={10} className="animate-pulse" /> Dispatch HUD
                                </span>
                                <div className="flex items-center gap-1 text-[10px] text-yellow-400 font-bold bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-lg">
                                  <Clock size={10} className="animate-spin-slow" />
                                  <span>ETA: {searchProgress?.eta || 'Calculating...'}</span>
                                </div>
                              </div>

                              <div className="space-y-3.5">
                                {/* District Progress */}
                                <div>
                                  <div className="flex items-center justify-between text-[10px] mb-1">
                                    <span className="text-gray-400 font-bold">Districts Completed</span>
                                    <span className="font-mono font-black text-white">
                                      {searchProgress?.completedDistricts || 0} / {searchProgress?.totalDistricts || 1}
                                    </span>
                                  </div>
                                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                                    <motion.div 
                                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${Math.min(100, Math.round(((searchProgress?.completedDistricts || 0) / (searchProgress?.totalDistricts || 1)) * 100))}%` }}
                                      transition={{ duration: 0.5, ease: 'easeOut' }}
                                    />
                                  </div>
                                </div>

                                {/* Mandal Progress */}
                                <div>
                                  <div className="flex items-center justify-between text-[10px] mb-1">
                                    <span className="text-gray-400 font-bold">Overall Mandals Checked</span>
                                    <span className="font-mono font-bold text-cyan-400">
                                      {searchProgress?.overallCompletedMandals || 0} / {searchProgress?.totalMandalsAcrossAll || 1}
                                    </span>
                                  </div>
                                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                                    <motion.div 
                                      className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${Math.min(100, Math.round(((searchProgress?.overallCompletedMandals || 0) / (searchProgress?.totalMandalsAcrossAll || 1)) * 100))}%` }}
                                      transition={{ duration: 0.5, ease: 'easeOut' }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Velocity stats footer inside progress container */}
                          {activeJobs.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-[10px] text-gray-400 font-medium">
                              <div>
                                <span className="text-gray-500 uppercase tracking-wider block">Scraping Velocity</span>
                                <span className="text-white font-bold">{activeJobs.length} / 20 Instances</span>
                              </div>
                              <div>
                                <span className="text-gray-500 uppercase tracking-wider block">Time Elapsed</span>
                                <span className="text-yellow-400 font-bold font-mono">{Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s</span>
                              </div>
                              <div>
                                <span className="text-gray-500 uppercase tracking-wider block">Extraction Rate</span>
                                <span className="text-blue-400 font-bold">~{elapsedTime > 0 ? (vendors.length / elapsedTime).toFixed(1) : 0} leads/sec</span>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>


                  </div>



                  {/* Collapsible State Hierarchy Tree Panel */}
                  <AnimatePresence mode="wait">
                    {isSessionActive && searchProgress && searchProgress.fullHierarchy ? (
                      <motion.div 
                        key="active-map"
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl relative text-left"
                      >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                          <span className="text-[10px] uppercase font-black tracking-widest text-violet-400 flex items-center gap-1.5 font-bold">
                            <Map size={11} /> Geographic Dispatch Map
                          </span>
                          <span className="text-[9px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded font-bold">
                            {searchProgress.fullHierarchy.length} Districts Resolved
                          </span>
                        </div>
                        
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {searchProgress.fullHierarchy.map((distObj, distIdx) => {
                            const districtName = distObj.districtName;
                            const mandalsList = distObj.mandals || [];
                            const isDistrictActive = searchProgress.activeDistrict === districtName;
                            
                            // Count completed mandals for this district
                            const completedCount = mandalsList.reduce((acc, m, mIdx) => {
                              const status = getMandalStatus(m, districtName, distIdx, mIdx);
                              return status === 'completed' ? acc + 1 : acc;
                            }, 0);
                            
                            const isDistrictDone = completedCount === mandalsList.length;
                            
                            return (
                              <DistrictTreeItem 
                                key={districtName}
                                districtName={districtName}
                                mandals={mandalsList}
                                distIdx={distIdx}
                                isDistrictActive={isDistrictActive}
                                isDistrictDone={isDistrictDone}
                                completedCount={completedCount}
                                getMandalStatus={getMandalStatus}
                              />
                            );
                          })}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="standby-map"
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="glass-card p-5 text-center transition-all duration-300"
                        style={{ borderStyle: 'dashed' }}
                      >
                        <Map className="mx-auto mb-2 animate-float-orb" style={{ color: 'rgba(124,58,237,0.5)' }} size={22} />
                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Geographic Dispatch Map Standby</p>
                        <p className="text-[10px] mt-1 max-w-xs mx-auto" style={{ color: 'rgba(255,255,255,0.2)' }}>Select search scope, define location, and trigger omni-search to activate the real-time worker pipeline.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* MASTER CONTROL */}
                <div className="pt-5 mt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[9px] font-black uppercase tracking-widest mb-3 text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>Master Engine Controls</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Python Engine Search */}
                    <button type="button"
                      onClick={() => { triggerPython(categoryQuery, locationQuery); }}
                      className="btn-3d btn-secondary btn-sm flex-col h-auto py-3 gap-1">
                      <span className="text-base">🐍</span>
                      <span>Python Engine</span>
                    </button>
                    
                    {/* Google Maps Scraper Search */}
                    <button type="button"
                      onClick={() => { triggerMaps(`${categoryQuery} in ${locationQuery}`, categoryQuery, locationQuery, searchRadius); }}
                      className="btn-3d btn-cyan btn-sm flex-col h-auto py-3 gap-1">
                      <MapPin size={13} /> 
                      <span>Google Maps</span>
                    </button>

                    {/* Launch Master Omni-Search */}
                    <button type="button"
                      onClick={() => { startScrape(null, categoryQuery, locationQuery); }}
                      className="btn-3d btn-primary btn-sm flex-col h-auto py-3 gap-1">
                      <span className="text-base">✨</span>
                      <span>Launch Omni-Search</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column: Scraper Pipeline Control Center (5 cols) */}
              <div className="lg:col-span-5 flex flex-col">
                <div className="flex-1 flex flex-col justify-between glass-card p-5 relative overflow-hidden h-full min-h-[640px] animate-fade-in">
                  {/* Decorative background glows */}
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(124,58,237,0.08)' }} />
                  <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(6,182,212,0.06)' }} />

                  <div>
                    {/* HUD Header */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Scraper Control</span>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider mt-0.5">Pipeline Control Center</h3>
                      </div>
                      
                      {isSessionActive ? (
                        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full text-[10px] font-bold text-rose-400 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          ACTIVE
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-slate-800/60 border border-white/5 px-3 py-1 rounded-full text-[10px] font-bold text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                          STANDBY
                        </div>
                      )}
                    </div>

                    {/* Live Extraction target (Shown when session is active) */}
                    {isSessionActive && (
                      <div className="mt-3 bg-white/[0.02] border border-white/5 rounded-xl p-3 grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                        <div className="border-l-2 border-indigo-500/40 pl-2.5 min-w-0">
                          <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-0.5">District Scope</span>
                          <p className="text-xs font-bold text-white truncate" title={searchProgress?.activeDistrict}>
                            {searchProgress?.activeDistrict || 'Resolving...'}
                          </p>
                        </div>
                        <div className="border-l-2 border-cyan-500/40 pl-2.5 min-w-0">
                          <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-0.5">Mandal / Local</span>
                          <p className="text-xs font-bold text-cyan-400 truncate" title={searchProgress?.activeMandal}>
                            {searchProgress?.activeMandal || 'Resolving...'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* The 6-Stage Pipeline List */}
                    <div className="mt-4 space-y-2">
                      {PIPELINE_STEPS.map((step, idx) => {
                        const IconComponent = step.icon;
                        const isStepActive = activeStep === idx;
                        const isStepCompleted = activeStep > idx;
                        
                        return (
                          <div
                            key={idx}
                            onMouseEnter={() => setHoveredStep(idx)}
                            onMouseLeave={() => setHoveredStep(null)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-help ${
                              isStepActive
                                ? 'bg-violet-950/35 border-violet-500/60 shadow-lg shadow-violet-500/10'
                                : isStepCompleted
                                  ? 'bg-emerald-950/15 border-emerald-500/30 opacity-90'
                                  : isSessionActive
                                    ? 'bg-white/[0.01] border-white/5 opacity-40'
                                    : 'bg-white/[0.02] border-white/5 opacity-70 hover:opacity-100 hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                                isStepActive
                                  ? 'bg-violet-500/20 border-violet-400 text-violet-300 shadow shadow-violet-500/35 animate-pulse'
                                  : isStepCompleted
                                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                    : 'bg-white/5 border-white/5 text-gray-400'
                              }`}>
                                <IconComponent size={14} className={isStepActive ? 'animate-bounce' : ''} />
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-bold truncate transition-colors ${
                                  isStepActive
                                    ? 'text-violet-300'
                                    : isStepCompleted
                                      ? 'text-emerald-300 font-semibold'
                                      : 'text-gray-300'
                                }`}>
                                  {step.name}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate mt-0.5">{step.description}</p>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5">
                              {isStepActive ? (
                                <span className="flex h-2 w-2 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                                </span>
                              ) : isStepCompleted ? (
                                <Check size={12} className="text-emerald-400 font-bold" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                              )}
                              <span className={`text-[9px] uppercase tracking-wider font-black ${
                                isStepActive
                                  ? 'text-violet-400'
                                  : isStepCompleted
                                    ? 'text-emerald-400'
                                    : 'text-gray-500'
                              }`}>
                                {isStepActive ? 'Active' : isStepCompleted ? 'Done' : 'Standby'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer Section: Live Counters & Spec HUD */}
                  <div className="mt-4 pt-3 border-t border-white/5 space-y-4">
                    {/* Live Progress Indicators (Shown when session is active) */}
                    {isSessionActive && searchProgress && (
                      <div className="space-y-3 bg-white/[0.01] border border-white/5 rounded-xl p-3 animate-in fade-in duration-300">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-gray-300">Districts Completed</span>
                            <span className="text-[11px] font-mono font-black text-white">
                              {searchProgress.completedDistricts} / {searchProgress.totalDistricts || 1}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.round((searchProgress.completedDistricts / (searchProgress.totalDistricts || 1)) * 100))}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-gray-300">Mandals in Current District</span>
                            <span className="text-[11px] font-mono font-black text-cyan-400">
                              {searchProgress.completedMandals} / {searchProgress.totalMandals || 1}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.round((searchProgress.completedMandals / (searchProgress.totalMandals || 1)) * 100))}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-indigo-200 bg-indigo-950/20 border border-indigo-500/10 p-2 rounded-lg mt-1">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Clock size={12} className="text-yellow-400 animate-pulse" /> Scraping Time (Approx):
                          </span>
                          <span className="font-mono font-black text-yellow-400 tracking-wider">
                            {searchProgress.eta || 'Calculating...'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Spec Intel HUD */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-xl p-3 text-xs relative overflow-hidden transition-all duration-200">
                      <div className="flex items-center justify-between mb-1 text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                        <span>Spec Intel HUD</span>
                        <span className="text-indigo-400 font-mono">{currentHudSpec.tech}</span>
                      </div>
                      <p className="text-white font-bold text-xs">{currentHudSpec.name}</p>
                      <p className="text-gray-400 mt-1 leading-relaxed text-[11px] min-h-[32px]">{currentHudSpec.detail}</p>
                      <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-1.5 text-[10px] text-gray-400 font-mono">
                        <span>Metric: <strong className="text-indigo-300 font-semibold">{currentHudSpec.metric}</strong></span>
                        <span>Limit: <strong className="text-yellow-400 font-semibold">{currentHudSpec.limit}</strong></span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </motion.div>

        {/* ── ACTIVITY LOG (Admin Only) ── */}
        <div className="glass-card overflow-hidden">
          <button onClick={() => setShowLog(!showLog)}
            className="w-full px-6 py-4 flex items-center justify-between transition-colors hover:bg-white/5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  sseStatus === 'open' ? 'status-online' : sseStatus === 'connecting' ? 'status-warning' : 'status-error'
                }`} />
                <Activity size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
                <span className="font-bold text-sm text-white">Service Activity Log</span>
              </div>
              <span className="badge badge-gray">Admin Only</span>
              <span className={`badge ${
                sseStatus === 'open' ? 'badge-emerald' : 'badge-rose'
              }`}>{sseStatus?.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-3">
              <select value={logLevel} onChange={e => setLogLevel(e.target.value)}
                onClick={e => e.stopPropagation()}
                className="glow-input text-xs w-28 py-1">
                <option value="ALL">All Levels</option>
                <option value="INFO">Info</option>
                <option value="WARN">Warn</option>
                <option value="ERROR">Error</option>
                <option value="DEBUG">Debug</option>
              </select>
              <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)', transform: showLog ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
            </div>
          </button>

          {showLog && (
            <div className="overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div ref={terminalRef} className="h-80 overflow-y-auto p-5 font-mono text-[11px] leading-loose custom-scrollbar"
                style={{ background: 'rgba(0,0,0,0.4)' }}>
                {logs?.length === 0
                  ? <span style={{ color: 'rgba(255,255,255,0.2)' }}>No logs yet. Start a scrape to see activity.</span>
                  : [...(logs || [])].filter(l => !logLevel || logLevel === 'ALL' || l.includes(`[${logLevel}]`)).slice(-50).reverse().map((log, i) => {
                      const isError = log.includes('[ERROR]');
                      const isWarn = log.includes('[WARN]');
                      const isInfo = log.includes('[INFO]');
                      return (
                        <div key={i} className={`break-words py-0.5 ${
                          isError ? 'text-rose-400' : isWarn ? 'text-amber-400' : isInfo ? 'text-emerald-400' : 'text-white/40'
                        }`} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <span className="mr-2" style={{ color: 'rgba(255,255,255,0.2)' }}>{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
                          {log}
                        </div>
                      );
                    })
                }
              </div>
            </div>
          )}
        </div>

        {/* ── LIVE VENDORS FEED ── */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-white flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
                <Zap size={12} style={{ color: '#a78bfa' }} />
              </div>
              Live Vendor Feed
            </h2>
            <div className="flex items-center gap-2">
              <span className="status-dot status-online" />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Live Updates</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {dashboardStagingWithPhones.length === 0 && dashboardStagingNoPhones.length === 0 ? (
              <p className="text-sm text-gray-500">No leads extracted yet. Start a scrape!</p>
            ) : (
              [...dashboardStagingWithPhones, ...dashboardStagingNoPhones]
                .sort((a, b) => new Date(b.scrapedAt || 0) - new Date(a.scrapedAt || 0))
                .slice(0, 5) // Show top 5 recent
                .map((v, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-50 bg-gray-50 hover:bg-white hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center font-bold">
                        {v.name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{v.name}</p>
                        <p className="text-[10px] text-gray-500">{v.category} · {v.city}</p>
                      </div>
                    </div>
                    {v.phone && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-md">
                        {v.phone}
                      </span>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>

        {/* ── LIVE SCANNERS HUD ── */}
        <AnimatePresence>
          {activePoints?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden lg:col-span-2">
              <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-6 py-4 flex items-center justify-between">
                <span className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Zap size={18} className="animate-pulse" /> Live Scanners ({activePoints.length} Instances)
                </span>
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
              </div>
              <div className="p-6 bg-amber-50/30">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {deferredActivePoints.map((pt, i) => (
                    <div key={i} className="bg-white border border-amber-100 rounded-xl shadow-sm px-4 py-3 hover:border-amber-300 transition-colors">
                      <p className="text-sm font-bold text-gray-800 truncate mb-2">{pt.locationName}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-amber-700 font-bold bg-amber-100 px-2 py-1 rounded-md">Worker {pt.instanceId}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{Number(pt.lat || 0).toFixed(4)}, {Number(pt.lng || 0).toFixed(4)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── QUICK STATS BY CATEGORY ── */}
        {dashboardVendors?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">Category Breakdown</h2>
              <a href="/app/leads" className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1">
                View All Leads <ArrowRight size={12} />
              </a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(
                dashboardVendors.reduce((acc, v) => {
                  const cat = v.category || 'Uncategorized';
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(v);
                  return acc;
                }, {})
              )
              .sort((a, b) => b[1].length - a[1].length)
              .slice(0, 8)
              .map(([cat, items], i) => (
                <motion.a 
                  key={cat} 
                  href={`/app/leads`} // Basic routing, context state would be better, but href resets state.
                  onClick={() => {
                    // Pre-fill activeCategory via localStorage before navigating so leads page picks it up
                    localStorage.setItem('gomandap_active_category', cat);
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="block p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-violet-300 hover:bg-violet-50/50 hover:-translate-y-1 transition-all cursor-pointer shadow-sm hover:shadow"
                >
                  <p className="text-xs font-semibold text-gray-600 truncate" title={cat}>{cat}</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{items.length}</p>
                  <p className="text-[10px] text-gray-400">{items.filter(v => v.verified).length} verified</p>
                </motion.a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

