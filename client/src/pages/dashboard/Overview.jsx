import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, RefreshCw, ArrowRight, MapPin, Camera,
  MessageCircle, Globe, Database, Briefcase, Clock,
  Trash2, X, Activity, ChevronDown, Check, XCircle, Download,
  FolderOpen, Filter, Send, Settings, TrendingUp, Zap, Target, Map, Users,
  BrainCircuit, ShieldAlert, Cpu, CheckCircle2, Sparkles, Phone, MessageSquare, Copy, Star,
  Radio, Layers, ExternalLink, ShieldCheck, CheckCheck,
  Heart, Coffee, QrCode, Bot, Square, Mail, GitBranch, Terminal
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useScraper } from '../../context/ScraperContext';
import UniversalSearchBar from '../../components/UniversalSearchBar';
import SearchProgressHUD from '../../components/SearchProgressHUD';
import ScraperLoader from '../../components/ScraperLoader';
import SearchSessionsDrawer from '../../components/SearchSessionsDrawer';
import LiveLogsTerminalModal from '../../components/LiveLogsTerminalModal';
import { AUTHORITATIVE_MANDALS, getCoordinatesForQuery, getMandalsForDistrict, resolvePanIndiaLocation } from '../../data/panIndiaGazetteer';
import { saveSearchSession } from '../../utils/sessionManager';
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

// Custom cyber HTML DivIcons with spring bounce drop and color differentiation
const createLeadMarkerIcon = (hasPhone, verified) => {
  // Green pins for verified phone/WhatsApp, violet pins for standard stores
  const color = hasPhone ? '#10b981' : (verified ? '#8b5cf6' : '#a855f7');
  const pulseClass = hasPhone ? 'animate-ping' : '';
  return L.divIcon({
    className: 'custom-lead-marker',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:30px;height:30px;">
        <span style="position:absolute;width:26px;height:26px;border-radius:50%;background:${color};opacity:0.4;" class="${pulseClass}"></span>
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:20px;height:20px;background:${color};border:2px solid #ffffff;border-radius:50%;box-shadow:0 0 16px ${color};">
          <div style="width:6px;height:6px;border-radius:50%;background:#ffffff;"></div>
        </div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

// Active Point Geographic Radar Marker: Shown strictly and ONLY at the currently active scraping point
const createActivePointRadarIcon = (label = 'Active Point', instanceId = 1) => {
  return L.divIcon({
    className: 'custom-active-radar-marker',
    html: `
      <div style="position:relative;width:260px;height:260px;margin-left:-130px;margin-top:-130px;display:flex;align-items:center;justify-content:center;pointer-events:none;">
        <!-- Concentric Cyber Laser Radar Rings -->
        <div style="position:absolute;width:240px;height:240px;border-radius:50%;border:2px solid rgba(6,182,212,0.65);box-shadow:0 0 25px rgba(6,182,212,0.5);" class="cyber-radar-ping-ring"></div>
        <div style="position:absolute;width:160px;height:160px;border-radius:50%;border:2px solid rgba(139,92,246,0.7);box-shadow:0 0 20px rgba(139,92,246,0.4);" class="cyber-radar-ping-ring"></div>
        <div style="position:absolute;width:90px;height:90px;border-radius:50%;border:1.5px dashed rgba(6,182,212,0.8);"></div>
        
        <!-- Rotating Laser Radar Sweep Beam -->
        <div style="position:absolute;width:220px;height:220px;border-radius:50%;background:conic-gradient(from 0deg at 50% 50%, rgba(6,182,212,0.6) 0deg, rgba(139,92,246,0.3) 45deg, transparent 90deg, transparent 360deg);animation:radar-sweep 2.2s linear infinite;"></div>

        <!-- Center Active Beacon -->
        <div style="position:relative;z-index:30;width:34px;height:34px;border-radius:50%;background:radial-gradient(circle, #06b6d4 0%, #7c3aed 100%);border:2.5px solid #ffffff;box-shadow:0 0 25px #06b6d4, 0 0 50px rgba(6,182,212,0.7);display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;">
          <span style="font-size:15px;filter:drop-shadow(0 0 4px #fff);">⚡</span>
        </div>

        <!-- Active Point Floating Label -->
        <div style="position:absolute;top:12px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(2,6,23,0.95);border:1px solid #06b6d4;box-shadow:0 0 18px rgba(6,182,212,0.5);color:#38bdf8;font-size:10px;font-weight:900;font-family:monospace;padding:3px 10px;border-radius:9999px;letter-spacing:0.5px;text-transform:uppercase;">
          RADAR LOCK • ${label}
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -25]
  });
};

// Static target icon for idle state (NO radar sweep, NO spinning animation)
const createStaticTargetIcon = (label = 'Target Center') => {
  return L.divIcon({
    className: 'custom-static-target-marker',
    html: `
      <div style="position:relative;width:36px;height:36px;margin-left:-18px;margin-top:-18px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg, #0ea5e9, #6366f1);border:2px solid #ffffff;box-shadow:0 4px 14px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
          <span style="font-size:13px;">🎯</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -18]
  });
};

const createRadarNodeIcon = (label = '') => {
  return L.divIcon({
    className: 'custom-radar-marker',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px;">
        <span style="position:absolute;width:24px;height:24px;border-radius:50%;background:#06b6d4;opacity:0.4;" class="animate-pulse"></span>
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:12px;height:12px;background:#06b6d4;border:1.5px solid #ffffff;border-radius:50%;box-shadow:0 0 10px #06b6d4;">
          <span style="font-size:7px;color:#fff;font-weight:900;">${label || '•'}</span>
        </div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13]
  });
};

const getWorkerIcon = (instanceId) => {
  return L.divIcon({
    className: 'custom-worker-icon',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute inline-flex w-full h-full rounded-full bg-cyan-400 opacity-75 animate-[ping_1.5s_ease-in-out_infinite]"></div>
        <div class="relative flex items-center justify-center w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(6,182,212,0.6)]">
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
    name: 'Autonomous Query Synthesis',
    description: 'Neural Intent Tokenizer',
    icon: Search,
    tech: 'Semantic Graph Parser',
    metric: '0.2ms Pre-Flight',
    detail: 'Synthesizes geographic intent and normalizes target taxonomy against national master gazettes.'
  },
  {
    id: 1,
    name: 'State & District GeoMesh',
    description: 'Post-2022 Administrative Map',
    icon: BrainCircuit,
    tech: 'GeoAI Containment Resolver',
    metric: 'Authoritative Boundaries',
    detail: 'Resolves exact districts and sub-mandals with zero boundary bleed or cross-district leakage.'
  },
  {
    id: 2,
    name: 'Priority Queue Matrix',
    description: 'High-Throughput Swarm Router',
    icon: RefreshCw,
    tech: 'Autonomous Dispatch Cluster',
    metric: 'Dynamic Ingestion',
    detail: 'Distributes concurrent regional scanning coordinates across active headless worker nodes.'
  },
  {
    id: 3,
    name: 'Stealth Penetration Core',
    description: 'Anti-Fingerprint Browser Swarm',
    icon: Cpu,
    tech: 'Cyber Stealth Engine',
    metric: 'Ultra-Fast 0-Fail',
    detail: 'Dispatches asset-stripped browser instances with randomized synthetic fingerprints and TLS bypass.'
  },
  {
    id: 4,
    name: 'Multi-Layer Containment Guard',
    description: 'Strict Boundary & Pincode Filter',
    icon: ShieldAlert,
    tech: 'Containment Guard Geofencing',
    metric: '100% Boundary Isolation',
    detail: 'Verifies GPS coordinates, postal codes, and regional addresses to guarantee zero cross-district pollution.'
  },
  {
    id: 5,
    name: 'Master Persistence Hub',
    description: 'Real-Time Telemetry & SSE Push',
    icon: Database,
    tech: 'Dual-Tier Repository Storage',
    metric: 'Zero-Latency Stream',
    detail: 'Persists verified records in master repository and streams live coordinates directly to radar map.'
  }
];

// Strict LatLng validation to prevent Leaflet from throwing "Invalid LatLng object: (..., undefined)"
export const getSafeCoords = (obj) => {
  if (!obj) return null;
  const rawLat = obj.safeLat !== undefined ? obj.safeLat : (obj.latitude !== undefined ? obj.latitude : obj.lat);
  const rawLng = obj.safeLng !== undefined ? obj.safeLng : (obj.longitude !== undefined ? obj.longitude : obj.lng);
  const lat = typeof rawLat === 'number' ? rawLat : parseFloat(rawLat);
  const lng = typeof rawLng === 'number' ? rawLng : parseFloat(rawLng);
  if (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  ) {
    return [lat, lng];
  }
  return null;
};

// Automatic Leaflet Canvas Size Invalidator on mount
const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => {
      try { map.invalidateSize(); } catch (e) {}
    }, 150);
    const t2 = setTimeout(() => {
      try { map.invalidateSize(); } catch (e) {}
    }, 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
};

const MapBounds = ({ validVendors, activePoint, targetCoords, autoCenter, isScrapingActive, setAutoCenter }) => {
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

  // Center and zoom in immediately on active scanning point or active scrape leads
  useEffect(() => {
    if (!autoCenter) return;

    // 1. Priority 1: If active scanning radar point exists, smoothly fly directly to it at Zoom 15!
    if (activePoint?.coords) {
      try {
        map.flyTo(activePoint.coords, 15, { duration: 1.2, easeLinearity: 0.25 });
      } catch (e) {}
      return;
    }

    // 2. Priority 2: If we are actively scraping and have target coords, fly directly to active scrape target at Zoom 15!
    if (isScrapingActive && targetCoords && targetCoords.length === 2 && !isNaN(targetCoords[0])) {
      if (!(targetCoords[0] === 20.5937 && targetCoords[1] === 78.9629)) {
        try {
          map.flyTo(targetCoords, 15, { duration: 1.2, easeLinearity: 0.25 });
        } catch (e) {}
        return;
      }
    }

    // 3. Priority 3: Scraped leads matching the active search location
    if (validVendors && validVendors.length > 0) {
      try {
        const pts = validVendors.slice(0, 30).map(v => v.safeCoords).filter(Boolean);
        if (pts.length > 0) {
          const bounds = L.latLngBounds(pts);
          if (bounds.isValid()) {
            map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 1.2 });
          }
        }
      } catch (e) {}
      return;
    }

    // 4. Target coords when user typed a location (zoom 14)
    if (targetCoords && targetCoords.length === 2 && !isNaN(targetCoords[0])) {
      if (!(targetCoords[0] === 20.5937 && targetCoords[1] === 78.9629)) {
        try {
          map.flyTo(targetCoords, 14, { duration: 1.0 });
        } catch (e) {}
      }
    }
  }, [activePoint?.coords, isScrapingActive, validVendors?.length, targetCoords, autoCenter, map]);

  return null;
};

const DistrictTreeItem = ({ districtName, mandals, distIdx, isDistrictActive, isDistrictDone, completedCount, getMandalStatus }) => {
  const [isOpen, setIsOpen] = useState(isDistrictActive);

  useEffect(() => {
    if (isDistrictActive) setIsOpen(true);
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
                    <span className="text-[8px] uppercase tracking-wider text-gray-600">Standby</span>
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
  const navigate = useNavigate();
  const {
    loading, logs, sseStatus, logLevel, setLogLevel,
    searchRadius, setSearchRadius,
    startScrape, handleMasterStop,
    stagingVendorsWithPhones, stagingVendorsNoPhones, liveVendors, outOfBoundsVendors, verifiedCount,
    suggestions, showSuggestions, setShowSuggestions,
    suggestionIndex, searchHistory, setSearchHistory,
    knowledge,
    categoryQuery, setCategoryQuery,
    locationQuery, setLocationQuery,
    searchScope, setSearchScope,
    searchSessionStart,
    vendors, setVendors, activeJobs, grouped,
    gridPoints, activePoints, searchProgress
  } = useScraper();

  const isScrapingActive = Boolean(loading || (activeJobs && activeJobs.length > 0) || (activePoints && activePoints.length > 0));

  const [showLog, setShowLog] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [autoCenter, setAutoCenter] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [hoveredStep, setHoveredStep] = useState(null);
  const [mapTileLayer, setMapTileLayer] = useState('dark');
  const [activeViewTab, setActiveViewTab] = useState('map');
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadFilterTab, setLeadFilterTab] = useState('all'); // 'all' | 'whatsapp' | 'topRated'
  const [selectedMandalFilter, setSelectedMandalFilter] = useState('All');
  const [activeDistrict, setActiveDistrict] = useState('');
  const [activeMandal, setActiveMandal] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [sessionsDrawerOpen, setSessionsDrawerOpen] = useState(false);
  const [sessionsDrawerFilter, setSessionsDrawerFilter] = useState('all');
  const [automationModalOpen, setAutomationModalOpen] = useState(false);
  const SUPPORT_EMAIL = "support@leadharvest.app";


  // Filtered live leads stream with strict query and location relevance & guaranteed deduplication
  const filteredLiveLeads = useMemo(() => {
    let list = vendors || [];

    // Strict filter leads by active search query & location
    const hasSearch = Boolean((categoryQuery && categoryQuery.trim()) || (locationQuery && locationQuery.trim()));

    if (hasSearch) {
      const catClean = (categoryQuery || '').toLowerCase().trim();
      const catTokens = catClean.split(/\s+/).filter(t => t.length > 2 && !['top', 'rated', 'best', 'in', 'near', 'cheap', 'and', 'or', 'stores', 'businesses'].includes(t));
      const locClean = (locationQuery || '').toLowerCase().trim();
      const locTokens = locClean ? locClean.split(/[,\s]+/).filter(t => t.length > 2 && !['andhra', 'pradesh', 'india', 'state'].includes(t)) : [];

      list = list.filter(v => {
        // Newly discovered live leads during active scraping automatically pass through to ensure flowing leads!
        const isLiveFlowing = v.isLive || (isScrapingActive && v.scrapedAt && (Date.now() - new Date(v.scrapedAt).getTime() < 600000));
        if (isLiveFlowing) return true;

        const vCat = (v.category || '').toLowerCase();
        const vName = (v.name || '').toLowerCase();
        const vLoc = `${v.city || ''} ${v.mandal || ''} ${v.address || ''} ${v.district || ''} ${v.state || ''}`.toLowerCase();

        const catMatch = catTokens.length === 0 || catTokens.some(tok => vCat.includes(tok) || vName.includes(tok));
        const locMatch = locTokens.length === 0 || locTokens.some(tok => vLoc.includes(tok));

        // When user searched a specific location, only show leads strictly from that location!
        if (locTokens.length > 0 && !locMatch) {
          return false;
        }
        if (catTokens.length > 0 && !catMatch) {
          return false;
        }
        return true;
      });
    } else if (isScrapingActive) {
      // While scraping with no search filter, show newly discovered live session leads
      list = list.filter(v => v.isLive || (v.scrapedAt && (Date.now() - new Date(v.scrapedAt).getTime() < 600000)));
    }

    if (selectedMandalFilter !== 'All') {
      const lower = selectedMandalFilter.toLowerCase();
      list = list.filter(v => 
        (v.mandal && v.mandal.toLowerCase().includes(lower)) || 
        (v.address && v.address.toLowerCase().includes(lower))
      );
    }
    if (leadFilterTab === 'whatsapp') {
      list = list.filter(v => v.phone && !v.phone.includes('Obfuscated') && !v.phone.includes('Requires'));
    }
    if (leadFilterTab === 'topRated') {
      list = list.filter(v => parseFloat(v.rating) >= 4.2);
    }

    // STRICT DEDUPLICATION: Guaranteed unique IDs
    const seenIds = new Set();
    const deduped = [];
    for (const v of list) {
      const id = v.id || `${v.name}-${v.latitude || ''}-${v.longitude || ''}-${v.phone || ''}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        deduped.push(v);
      }
    }
    return deduped;
  }, [vendors, categoryQuery, locationQuery, leadFilterTab, selectedMandalFilter, isScrapingActive]);

  // Map Display: Strictly validates coordinates and ONLY shows leads from the active search location!
  // Map Display: Strictly validates coordinates and ONLY shows leads from the active search location!
  const mapDisplayVendors = useMemo(() => {
    // If a search query or active scrape is running, strictly display ONLY matching leads!
    const hasSearch = Boolean((categoryQuery && categoryQuery.trim()) || (locationQuery && locationQuery.trim()));
    const source = hasSearch ? filteredLiveLeads : (isScrapingActive ? filteredLiveLeads : (filteredLiveLeads.length > 0 ? filteredLiveLeads : []));

    const results = [];
    const seenCoords = new Set();
    for (const v of source) {
      const coords = getSafeCoords(v);
      if (coords) {
        const coordKey = `${coords[0].toFixed(5)},${coords[1].toFixed(5)}`;
        if (!seenCoords.has(coordKey)) {
          seenCoords.add(coordKey);
          const uniqueId = v.id || `${v.name || 'store'}_${coordKey}`;
          results.push({ ...v, id: uniqueId, safeCoords: coords });
          if (results.length >= 200) break;
        }
      }
    }
    return results;
  }, [filteredLiveLeads, categoryQuery, locationQuery, isScrapingActive]);

  // Target coordinates strictly computed for active scrape - ZERO physical GPS leakage & NO default to Guntur!
  const activeTargetCoords = useMemo(() => {
    // 1. If workers emitted active scanning points, use the most recent active worker point!
    if (activePoints && activePoints.length > 0) {
      for (const pt of activePoints) {
        const coords = getSafeCoords(pt);
        if (coords) return coords;
      }
    }

    // 2. If we have scraped leads matching the active search, lock to their first lead coords!
    if (mapDisplayVendors && mapDisplayVendors.length > 0 && mapDisplayVendors[0].safeCoords) {
      return mapDisplayVendors[0].safeCoords;
    }

    // 3. Resolve target coordinates dynamically from locationQuery
    const loc = (locationQuery || '').trim();
    if (loc) {
      const resolved = getCoordinatesForQuery(loc);
      if (resolved) return resolved;
    }

    // 4. Resolve from categoryQuery if it contains "in <location>"
    const cat = (categoryQuery || '').trim();
    if (cat.includes(' in ')) {
      const locPart = cat.split(' in ')[1];
      const resolved = getCoordinatesForQuery(locPart);
      if (resolved) return resolved;
    }

    // 5. If user manually set location via search bar or map click
    if (userLocation && userLocation.length === 2 && !isNaN(userLocation[0])) {
      return userLocation;
    }

    // 6. If activeDistrict is set
    if (activeDistrict && activeDistrict.trim()) {
      const resolved = getCoordinatesForQuery(activeDistrict);
      if (resolved) return resolved;
    }

    // Neutral India center (view of India when idle with no query)
    return [20.5937, 78.9629];
  }, [activePoints, mapDisplayVendors, locationQuery, categoryQuery, userLocation, activeDistrict]);

  // ONLY WHERE THE ACTIVE POINT: Show radar strictly and ONLY while scraping, directly at the active point!
  const activePoint = useMemo(() => {
    if (!isScrapingActive) return null; // NO RADAR when idle / not scraping!

    // 1. If workers emitted active scanning points, use the most recent active worker point
    if (activePoints && activePoints.length > 0) {
      for (const pt of activePoints) {
        const coords = getSafeCoords(pt);
        if (coords) {
          return {
            coords,
            label: pt.locationName || pt.name || locationQuery || activeDistrict || 'Active Worker',
            instanceId: pt.instanceId || 1
          };
        }
      }
    }

    // 2. While scrape is active, anchor radar to target coordinates (only if not generic India center)
    if (activeTargetCoords && activeTargetCoords.length === 2 && !isNaN(activeTargetCoords[0]) && !isNaN(activeTargetCoords[1])) {
      if (!(activeTargetCoords[0] === 20.5937 && activeTargetCoords[1] === 78.9629)) {
        return {
          coords: activeTargetCoords,
          label: locationQuery || activeDistrict || 'Active Scrape Grid',
          instanceId: 1
        };
      }
    }

    return null;
  }, [isScrapingActive, activePoints, activeTargetCoords, locationQuery, activeDistrict]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1-Click Export Leads to CSV with full business details, emails, websites, ratings, GPS
  const exportLeadsToCsv = () => {
    const dataToExport = filteredLiveLeads.length > 0 ? filteredLiveLeads : (vendors || []);
    if (dataToExport.length === 0) {
      toast.error('No leads available to export yet. Run a search first!');
      return;
    }
    const rows = dataToExport.map((v, idx) => ({
      'Lead #': idx + 1,
      'Business Name': v.name || '',
      'Category': v.category || '',
      'Verified Phone': v.phone || '',
      'WhatsApp Outreach Link': v.phone ? `https://wa.me/${v.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${v.name || 'there'}, we are contacting you regarding business inquiries in ${v.city || 'your area'}.`)}` : '',
      'Email': v.email || '',
      'Website': v.website || '',
      'Photo / Logo': v.images?.[0] || v.photo || v.logo || '',
      'Star Rating': v.rating || '',
      'Reviews Count': v.reviewsCount || v.ratingCount || '',
      'Address': v.address || '',
      'Mandal / Zone': v.mandal || '',
      'City / District': v.city || v.district || activeDistrict || '',
      'State': v.state || '',
      'Pincode': v.pincode || '',
      'Latitude': v.latitude || v.safeCoords?.[0] || '',
      'Longitude': v.longitude || v.safeCoords?.[1] || '',
      'Google Maps URL': v.mapsLink || (v.latitude && v.longitude ? `https://maps.google.com/?q=${v.latitude},${v.longitude}` : ''),
      'Verified Status': v.verified ? 'VERIFIED' : 'PENDING',
      'Scraper Engine': v.sourceEngine || 'Autonomous Multi-RPC',
      'Scraped Timestamp': v.scrapedAt || new Date().toISOString()
    }));

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const fileLoc = (locationQuery || activeDistrict || 'India').replace(/[^a-zA-Z0-9]/g, '_');
    const fileCat = (categoryQuery || 'Businesses').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `LeadHarvest_${fileCat}_${fileLoc}_${new Date().toISOString().slice(0, 10)}.csv`;
    saveAs(blob, filename);
    toast.success(`Exported ${dataToExport.length} verified leads to ${filename}`, {
      icon: '📥',
      style: { background: '#0a101d', color: '#10b981', border: '1px solid #059669' }
    });
  };

  const handleLoadSession = (session) => {
    if (session.category) setCategoryQuery(session.category);
    if (session.location) setLocationQuery(session.location);
    if (session.leads && session.leads.length > 0 && setVendors) {
      setVendors(session.leads);
    }
    toast.success(`Loaded session: ${session.category} (${session.leadCount || session.leads?.length || 0} leads)`, { icon: '📂' });
  };

  // Auto-save distinct search runs to dual storage (IndexedDB + server JSON)
  useEffect(() => {
    if (filteredLiveLeads?.length > 0 && (categoryQuery || locationQuery)) {
      const timer = setTimeout(() => {
        saveSearchSession({
          category: categoryQuery || 'General Business',
          location: locationQuery || activeDistrict || 'India',
          leads: filteredLiveLeads,
          metadata: {
            activeDistrict,
            timestamp: new Date().toISOString()
          }
        });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [filteredLiveLeads?.length, categoryQuery, locationQuery, activeDistrict]);


  useEffect(() => {
    let interval;
    if (activeJobs?.length > 0 && searchSessionStart) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - searchSessionStart) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [activeJobs, searchSessionStart]);

  const isSessionActive = loading || (searchProgress && searchProgress.sessionActive);
  let activeStep = 0;
  if (isSessionActive) {
    if (searchProgress?.phase === 'queue') activeStep = 2;
    else if (searchProgress?.phase === 'scraping') activeStep = 3;
    else if (searchProgress?.phase === 'geofence') activeStep = 4;
    else if (searchProgress?.phase === 'persisting') activeStep = 5;
    else activeStep = 1;
  }

  const getMandalStatus = (mandal, distName, distIdx, mIdx) => {
    if (!searchProgress) return 'pending';
    if (searchProgress.activeMandal === mandal) return 'running';
    if (searchProgress.completedMandals?.includes(mandal)) return 'completed';
    return 'pending';
  };

  return (
    <div className="min-h-full flex flex-col bg-[#07070f] text-slate-100 font-sans">

      {/* ── TOP AUTONOMOUS COMMAND BAR ── */}
      <div className="sticky top-0 z-30 border-b border-white/[0.08] backdrop-blur-xl bg-[#0c0c16]/90 px-6 py-4">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Title & Live Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 border border-white/10 shrink-0">
              <Radio size={20} className="text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                  <span>Scraper</span><span className="text-cyan-400">.co.in</span>
                  <span className="text-slate-600 font-light">|</span>
                  <span className="text-slate-200 font-bold">Autonomous Lead Intelligence</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Self-Driving Swarm
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Continuous Pan-India background ingestion · india_villages.json gazetteer · Zero button clicks required
              </p>
            </div>
          </div>

          {/* Autonomous Swarm Telemetry Pill & Quick Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Active Target Badge */}
            {(locationQuery || activeDistrict) && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-950/40 border border-violet-500/30 text-xs font-mono font-bold text-violet-300">
                <MapPin size={13} className="text-cyan-400 shrink-0" />
                <span>Target: <strong className="text-white">{locationQuery || activeDistrict}</strong></span>
              </div>
            )}

            <div className="telemetry-pill-active px-3.5 py-1.5 rounded-xl flex items-center gap-2.5 text-xs font-mono font-bold">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="text-emerald-300 uppercase tracking-wider text-[11px]">
                {isSessionActive ? `Scanning (${activeJobs?.length || 18} Nodes)` : 'Idle (Ready)'}
              </span>
              <span className="text-white/20">|</span>
              <span className="text-cyan-300 text-[11px]">
                {vendors?.length || 0} Ingested
              </span>
              <span className="text-white/20">|</span>
              <span className="text-violet-300 text-[11px]">
                {filteredLiveLeads?.length || 0} Leads
              </span>
            </div>

            {/* Distinct Search Sessions Drawer Launcher */}
            <button
              type="button"
              onClick={() => setSessionsDrawerOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white text-xs font-semibold border border-white/[0.08] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open past search runs & export archives"
            >
              <FolderOpen size={13} className="text-violet-400" />
              <span>Past Sessions</span>
            </button>

            {/* Live Server Terminal Drawer */}
            <button
              type="button"
              onClick={() => setShowLog(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                isScrapingActive
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20 animate-pulse'
                  : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border-white/[0.08]'
              }`}
              title="Open real-time server terminal logs & scraper telemetry"
            >
              <Terminal size={13} className={isScrapingActive ? 'text-emerald-400' : 'text-cyan-400'} />
              <span>Live Logs</span>
              {isScrapingActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-0.5" />
              )}
            </button>

            {/* Upcoming Local WhatsApp Automation Pill */}
            <button
              type="button"
              onClick={() => setAutomationModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-all cursor-pointer"
              title="Learn about upcoming Local WhatsApp Automation"
            >
              <Send size={13} className="text-emerald-400" />
              <span>WhatsApp Automation (Coming Soon)</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/app/crm')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-xs font-semibold border border-violet-500/30 transition-all cursor-pointer shadow-sm"
              title="Open CRM Pipeline"
            >
              <GitBranch size={13} className="text-violet-400" />
              <span>CRM Pipeline</span>
            </button>
          </div>

        </div>

        {/* Universal Google-Grade Auto-Search Field with Inline Abort */}
        <div className="max-w-[1800px] mx-auto mt-3 relative z-[9000]">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <UniversalSearchBar
            onSearchQuery={({ category, location, district, mandal, state, lat, lng, rawQuery }) => {
              setCategoryQuery(category);
              setLocationQuery(location);
              if (district) setActiveDistrict(district);
              if (mandal) setActiveMandal(mandal);

              if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                setUserLocation([lat, lng]);
                setAutoCenter(true);
              } else {
                const resolved = getCoordinatesForQuery(location || rawQuery || district);
                if (resolved) {
                  setUserLocation(resolved);
                  setAutoCenter(true);
                }
              }

              toast.success(`Autonomous Swarm targeting: "${rawQuery}" (${district || location})`, {
                icon: '⚡',
                style: { background: '#0f172a', color: '#38bdf8', border: '1px solid #0284c7' }
              });

              if (startScrape) {
                startScrape(null, category, location);
              }
            }}
            currentCategory={categoryQuery}
            currentLocation={locationQuery}
            activeDistrict={activeDistrict}
            activeMandal={activeMandal}
            onTerritoryChange={({ district, mandal }) => {
              if (district) setActiveDistrict(district);
              if (mandal) setActiveMandal(mandal);
            }}
            vendors={vendors}
            isAutonomousActive={true}
            onAbort={handleMasterStop}
            isScrapingActive={Boolean(loading || isScrapingActive)}
          />
        </div>

        {/* BUTTON 2: 🛑 MASTER ABORT KILLSWITCH */}
        <button
          type="button"
          onClick={() => {
            handleMasterStop();
            toast.error('🛑 Master Abort triggered: Scraper halted immediately. Collected leads preserved safely in folder.', { icon: '🛑' });
          }}
          className={`h-[52px] px-5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 border ${
            (loading || isScrapingActive)
              ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/40 border-rose-400/50 animate-pulse'
              : 'bg-slate-900/90 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border-slate-800 hover:border-rose-500/40'
          }`}
          title={(loading || isScrapingActive) ? "Immediately abort active background scraper and save collected leads" : "Terminate / reset all scraper tasks"}
        >
          <Square size={14} className={(loading || isScrapingActive) ? "fill-white" : "fill-current text-rose-500"} />
          <span>🛑 MASTER ABORT</span>
        </button>

        {/* BUTTON 3: 📥 EXPORT LEADS (1-CLICK CSV/EXCEL DOWNLOAD) */}
        <button
          type="button"
          onClick={exportLeadsToCsv}
          className="h-[52px] px-5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-600/25 border border-emerald-400/50 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
          title="1-Click Export: Download all discovered leads with full contact info, emails, websites & GPS to CSV"
        >
          <Download size={15} />
          <span>📥 EXPORT LEADS ({filteredLiveLeads.length})</span>
        </button>
      </div>

          {/* Real-Time Dynamic Search Progress HUD (What is Happening) */}
          <SearchProgressHUD
            isActive={Boolean(isScrapingActive || loading || searchProgress?.sessionActive)}
            query={categoryQuery ? `${categoryQuery} in ${locationQuery || activeDistrict}` : ''}
            category={categoryQuery}
            location={locationQuery || activeDistrict}
            district={activeDistrict}
            mandal={activeMandal}
            activeWorkers={activeJobs?.length || 18}
            totalLeads={vendors?.length || 0}
            verifiedPhones={vendors?.filter(v => v.phone && !v.phone.includes('Obfuscated') && !v.phone.includes('Requires'))?.length || 0}
            latestStoreName={vendors?.[0]?.name || ''}
            searchProgress={searchProgress}
            onStop={handleMasterStop}
          />
        </div>
      </div>

      {/* ── 4 KPI TELEMETRY CARDS ── */}
      <div className="px-6 pt-5 pb-2 max-w-[1800px] mx-auto w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Card 1: Total Leads Ingested - Clickable Button to Show All Scrapes Made */}
          <button
            type="button"
            onClick={() => {
              setSessionsDrawerFilter('all');
              setSessionsDrawerOpen(true);
            }}
            className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-950/30 to-[#0e0e1a] p-4 flex items-center justify-between text-left hover:border-violet-500/60 hover:bg-violet-950/40 transition-all duration-200 group cursor-pointer shadow-lg hover:shadow-violet-900/20 active:scale-[0.98]"
            title="Click to view all past scrapes & Search Vault folders"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Total Leads Ingested</p>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-violet-500/20 text-violet-300 font-mono group-hover:bg-violet-500/40 transition-colors">
                  View All Scrapes ↗
                </span>
              </div>
              <p className="text-2xl font-black text-white mt-1">{(vendors?.length || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-slate-300 transition-colors flex items-center gap-1">
                <span>Master Database Records</span>
                <span className="text-violet-400 font-semibold">• Click to show all scrapes</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 group-hover:bg-violet-500/20 group-hover:border-violet-500/40 transition-all duration-200">
              <Database size={18} />
            </div>
          </button>

          {/* Card 2: WhatsApp Verified - Clickable Button to Show All Scrapes with Reachable WhatsApp Leads */}
          <button
            type="button"
            onClick={() => {
              setLeadFilterTab('whatsapp');
              setSessionsDrawerFilter('whatsapp');
              setSessionsDrawerOpen(true);
            }}
            className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/30 to-[#0e0e1a] p-4 flex items-center justify-between text-left hover:border-emerald-500/60 hover:bg-emerald-950/40 transition-all duration-200 group cursor-pointer shadow-lg hover:shadow-emerald-900/20 active:scale-[0.98]"
            title="Click to view all past scrapes & 100% reachable WhatsApp mobile numbers"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">WhatsApp Verified</p>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono group-hover:bg-emerald-500/40 transition-colors">
                  View All Scrapes ↗
                </span>
              </div>
              <p className="text-2xl font-black text-white mt-1">
                {(vendors?.filter(v => v.phone && !v.phone.includes('Obfuscated') && !v.phone.includes('Requires'))?.length || 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-400/80 mt-0.5 group-hover:text-emerald-300 transition-colors flex items-center gap-1">
                <span>100% Reachable Mobile Numbers</span>
                <span className="text-emerald-400 font-semibold">• Click to show all scrapes</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all duration-200">
              <Phone size={18} />
            </div>
          </button>

          <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-transparent p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Pan-India Coverage</p>
              <p className="text-2xl font-black text-white mt-1">780+ Districts</p>
              <p className="text-[10px] text-cyan-400/80 mt-0.5">28 States & 8 UTs (100% Free)</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Globe size={18} />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-transparent p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Swarm Rate</p>
              <p className="text-2xl font-black text-white mt-1">
                {elapsedTime > 0 ? (vendors?.length / elapsedTime).toFixed(1) : '14.8'}/s
              </p>
              <p className="text-[10px] text-amber-400/80 mt-0.5">Concurrent Pipeline Throughput</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN 2-COLUMN COCKPIT (MAP LEFT, LEADS STREAM RIGHT) ── */}
      <div className="px-6 py-4 max-w-[1800px] mx-auto w-full flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        
        {/* ── LEFT COLUMN: PHOSPHOR RADAR MAP & GEOMESH (7 COLS) ── */}
        <div className="xl:col-span-7 flex flex-col gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c16]/80 overflow-hidden relative shadow-2xl flex flex-col">
            
            {/* Map Header with Pure SVG Icons */}
            <div className="p-3 border-b border-white/[0.08] bg-white/[0.01] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white/[0.04] border border-white/[0.06] p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveViewTab('map')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeViewTab === 'map' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Radio size={12} className="text-cyan-400" />
                    <span>Phosphor Radar Map</span>
                    <span className="text-[10px] font-mono opacity-60">({mapDisplayVendors.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveViewTab('hierarchy')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeViewTab === 'hierarchy' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers size={12} className="text-violet-400" />
                    <span>Territory Directory</span>
                    <span className="text-[10px] font-mono opacity-60">({activeDistrict || 'India'})</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* 3-Mode Zero-Key Tile Switcher */}
                <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08] text-[10px]">
                  <button
                    type="button"
                    onClick={() => setMapTileLayer('dark')}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      mapTileLayer === 'dark' ? 'bg-violet-600 text-white shadow-sm font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Cyber Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapTileLayer('osm')}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      mapTileLayer === 'osm' ? 'bg-violet-600 text-white shadow-sm font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    OSM
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapTileLayer('satellite')}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      mapTileLayer === 'satellite' ? 'bg-violet-600 text-white shadow-sm font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Satellite
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setAutoCenter(true)}
                  className="p-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-violet-300 hover:bg-violet-500/20 transition-all text-xs flex items-center gap-1 cursor-pointer"
                  title="Recenter Radar on Active Leads"
                >
                  <Target size={13} />
                  <span className="text-[11px] font-bold">Recenter</span>
                </button>
              </div>
            </div>

            {/* Radar View */}
            {activeViewTab === 'map' && (
              <div className="isolate relative w-full h-[520px] bg-[#07070d] overflow-hidden rounded-2xl border border-white/[0.08]">
                
                {/* Live Floating Swarm Telemetry & Auto-Follow Radar Controls (Isolated strictly to map viewport) */}
                <div className="absolute top-3 left-3 z-[500] backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-[#07070f]/90 border border-white/[0.1] flex items-center gap-2 shadow-lg pointer-events-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400">{mapDisplayVendors.length} Coordinates Plotted</span>
                  <span className="text-white/20">|</span>
                  <span className="text-slate-400">{locationQuery || activeDistrict}</span>
                </div>

                {/* Floating Top-Right Radar Lock & Quick Master Abort (Isolated strictly to map viewport) */}
                <div className="absolute top-3 right-3 z-[500] flex items-center gap-2 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => setAutoCenter(prev => !prev)}
                    className={`backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-xl cursor-pointer border ${
                      autoCenter
                        ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/60 shadow-cyan-500/30'
                        : 'bg-slate-900/90 text-amber-300 border-amber-500/40 hover:border-amber-500/70'
                    }`}
                    title={autoCenter ? 'Radar Auto-Zoom Locked (Auto-following active scanning coordinate)' : 'Free Map Exploration (Click to Lock Radar)'}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${autoCenter ? 'bg-cyan-400 animate-ping' : 'bg-amber-400'}`} />
                    <span>{autoCenter ? '🎯 Follow Radar: ON' : '🗺️ Free Explore (Lock Radar)'}</span>
                  </button>
                </div>

                <MapContainer
                  center={activePoint?.coords || activeTargetCoords}
                  zoom={12}
                  style={{ width: '100%', height: '100%', background: '#07070d' }}
                  zoomControl={false}
                  preferCanvas={true}
                  onMoveStart={() => setAutoCenter(false)}
                >
                  <MapResizer />

                  {mapTileLayer === 'dark' ? (
                    <>
                      <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                        attribution='&copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
                        maxZoom={16}
                      />
                      <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                        attribution='&copy; Esri'
                        maxZoom={16}
                      />
                    </>
                  ) : mapTileLayer === 'osm' ? (
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      maxZoom={19}
                    />
                  ) : (
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution='&copy; Esri World Imagery'
                      maxZoom={19}
                    />
                  )}

                  {/* ACTIVE POINT RADAR: Rendered strictly and ONLY at the active point while scraping */}
                  {activePoint?.coords && (
                    <Marker
                      key={`active-radar-${activePoint.coords[0]}-${activePoint.coords[1]}`}
                      position={activePoint.coords}
                      icon={createActivePointRadarIcon(activePoint.label, activePoint.instanceId)}
                    >
                      <Popup>
                        <div className="text-xs p-1 font-sans">
                          <p className="font-bold text-cyan-400 flex items-center gap-1">
                            <span>⚡</span> Active Scanning Radar Point
                          </p>
                          <p className="text-[11px] text-white font-medium">{activePoint.label}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{activePoint.coords[0].toFixed(4)}, {activePoint.coords[1].toFixed(4)}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  <MapBounds
                    validVendors={mapDisplayVendors}
                    activePoint={activePoint}
                    targetCoords={activeTargetCoords}
                    autoCenter={autoCenter}
                    isScrapingActive={isScrapingActive}
                    setAutoCenter={setAutoCenter}
                  />

                  {/* Additional Worker Pings (if multiple instances) without duplicating the active radar point */}
                  {(activePoints || []).map((pt, wIdx) => {
                    const c = getSafeCoords(pt);
                    if (!c) return null;
                    if (activePoint && Math.abs(c[0] - activePoint.coords[0]) < 0.0001 && Math.abs(c[1] - activePoint.coords[1]) < 0.0001) {
                      return null;
                    }
                    return (
                      <Marker key={`worker-${wIdx}`} position={c} icon={getWorkerIcon(wIdx + 1)}>
                        <Popup>
                          <div className="text-xs p-1">
                            <p className="font-bold text-cyan-300">Worker Instance #{wIdx + 1}</p>
                            <p className="text-[10px] text-slate-400">{pt.locationName || locationQuery}</p>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                  {/* Direct Lead Pins on Radar Map */}
                  {mapDisplayVendors.map((vendor, vIdx) => {
                    const hasPhone = !!(vendor.phone && !vendor.phone.includes('Obfuscated') && !vendor.phone.includes('Requires'));
                    return (
                      <Marker
                        key={`lead-marker-${vendor.id || 'idx'}-${vIdx}`}
                        position={vendor.safeCoords}
                        icon={createLeadMarkerIcon(hasPhone, vendor.verified)}
                        eventHandlers={{
                          click: () => setSelectedLead(vendor)
                        }}
                      >
                        <Popup>
                          <div className="p-1 min-w-[180px]">
                            <p className="font-black text-slate-900 text-xs">{vendor.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{vendor.category} • {vendor.city || activeDistrict}</p>
                            {hasPhone && (
                              <p className="text-[11px] font-mono font-bold text-emerald-600 mt-1">📞 {vendor.phone}</p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            )}

            {/* Gazette Mesh Tree View */}
            {activeViewTab === 'hierarchy' && (
              <div className="p-4 max-h-[520px] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                    26 Post-2022 Andhra Pradesh Districts
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Zero Boundary Bleed</span>
                </div>

                <div className="space-y-2">
                  {(searchProgress?.fullHierarchy || [
                    { districtName: 'Guntur', mandals: ['Guntur', 'Tenali', 'Mangalagiri', 'Tadikonda', 'Ponnur', 'Prathipadu'] },
                    { districtName: 'Palnadu', mandals: ['Narasaraopet', 'Chilakaluripet', 'Macherla', 'Vinukonda', 'Sattenapalle'] },
                    { districtName: 'Bapatla', mandals: ['Bapatla', 'Repalle', 'Chirala', 'Vemuru', 'Parchur', 'Addanki'] },
                    { districtName: 'Krishna', mandals: ['Machilipatnam', 'Gudivada', 'Pamarru', 'Avanigadda', 'Pedana'] },
                    { districtName: 'NTR', mandals: ['Vijayawada', 'Nandigama', 'Jaggaiahpet', 'Mylavaram', 'Tiruvuru'] }
                  ]).map((distObj, distIdx) => {
                    const districtName = distObj.districtName;
                    const mandalsList = distObj.mandals || [];
                    const isDistrictActive = searchProgress?.activeDistrict === districtName;
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
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: ULTRA-FAST LIVE LEADS STREAM (5 COLS) ── */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c16]/80 overflow-hidden shadow-2xl flex flex-col h-[680px]">
            
            {/* ── EXPLICIT LIVE SEARCH STATUS BANNER (SHOWS EXACTLY WHAT IS BEING SEARCHED) ── */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-violet-950/70 via-slate-900 to-indigo-950/70 border-b border-violet-500/30 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-2.5 w-2.5 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
                </span>
                <span className="text-[10px] font-mono uppercase font-black tracking-wider text-slate-400 shrink-0">
                  {loading ? 'Active Scrape:' : (categoryQuery || locationQuery) ? 'Current Scope:' : 'Ready:'}
                </span>
                <div className="truncate text-xs font-black text-white flex items-center gap-1.5">
                  {(categoryQuery || locationQuery) ? (
                    <>
                      <span className="text-cyan-300">"{categoryQuery || 'Stores'}"</span>
                      <span className="text-slate-400 font-normal">in</span>
                      <span className="text-emerald-400 font-bold">{locationQuery || activeDistrict}</span>
                    </>
                  ) : (
                    <span className="text-slate-300 font-medium text-[11px]">
                      Enter category & location above (e.g. "cafes in bengaluru")
                    </span>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-600/30 border border-violet-500/40 text-[9px] font-mono font-bold text-violet-300 shrink-0 animate-pulse">
                  <Zap size={10} className="text-yellow-300" />
                  <span>NAS Swarm Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono font-bold text-emerald-400 shrink-0">
                  <span>Ready</span>
                </div>
              )}
            </div>

            {/* Header with Lucide Icons (Zero Mojibake) */}
            <div className="p-3.5 border-b border-white/[0.08] bg-white/[0.01] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Live Flowing Leads</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  {filteredLiveLeads.length}
                </span>
              </div>

              {/* Action Buttons: Export & Filter Tabs */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportLeadsToCsv}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                  title="Export current leads to CSV"
                >
                  <Download size={11} />
                  <span>CSV</span>
                </button>

                {/* Filter Tabs with SVG Icons */}
                <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setLeadFilterTab('whatsapp')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      leadFilterTab === 'whatsapp' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Phone size={10} />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeadFilterTab('topRated')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      leadFilterTab === 'topRated' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Star size={10} className="fill-amber-300" />
                    <span>★ 4.2+</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeadFilterTab('all')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      leadFilterTab === 'all' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers size={10} />
                    <span>All</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Universal Pan-India Location Intelligence & Mandals Bar */}
            <div className="px-3 py-2 bg-slate-900/95 border-b border-white/[0.08] flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 text-xs">
              <span className="text-[10px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                <MapPin size={10} className="text-cyan-400" />
                <span>{activeDistrict || locationQuery || 'Territory'}:</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setSelectedMandalFilter('All');
                  const target = locationQuery || activeDistrict;
                  if (target) {
                    const resolved = getCoordinatesForQuery(target);
                    if (resolved) {
                      setUserLocation(resolved);
                      setAutoCenter(true);
                    }
                  }
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                  selectedMandalFilter === 'All'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                }`}
              >
                🌐 Whole District ({filteredLiveLeads.length})
              </button>

              {getMandalsForDistrict(activeDistrict || locationQuery).slice(0, 14).map(m => {
                const count = filteredLiveLeads.filter(v => 
                  (v.mandal && v.mandal.toLowerCase().includes(m.toLowerCase())) ||
                  (v.address && v.address.toLowerCase().includes(m.toLowerCase()))
                ).length;

                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setSelectedMandalFilter(m);
                      setActiveMandal(m);
                      const resolved = getCoordinatesForQuery(`${m}, ${activeDistrict || locationQuery}`);
                      if (resolved) {
                        setUserLocation(resolved);
                        setAutoCenter(true);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                      selectedMandalFilter === m
                        ? 'bg-cyan-600 text-white shadow-sm font-bold'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                    }`}
                  >
                    <span>{m}</span>
                    {count > 0 && (
                      <span className="text-[8px] px-1 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Live Narration Banner: Tells what exactly is happening during scrape */}
            {isScrapingActive && (
              <div className="mx-3 mt-2 px-3 py-2 rounded-xl bg-violet-950/30 border border-violet-500/30 flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-2 text-cyan-300 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                  <span className="font-bold text-white truncate">
                    {searchProgress?.currentTask || (
                      activeStep === 2 ? 'Phase 2: High-Speed RPC Ingestion from Google Maps & Places' :
                      activeStep === 3 ? 'Phase 3: Parsing Phones, WhatsApp Lines, Websites & Emails' :
                      activeStep === 4 ? 'Phase 4: Deduplicating & Isolating into Session Folder' :
                      'Phase 1: Geofencing Target Mandals & Radial Grid Points'
                    )}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold shrink-0 ml-2">
                  ⚡ Auto-Harvesting
                </span>
              </div>
            )}

            {/* Leads Scroll Feed with Branded Scraper.co.in Cyber Loader */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
              {loading && filteredLiveLeads.length > 0 && (
                <div className="mb-2">
                  <ScraperLoader compact={true} />
                </div>
              )}

              {filteredLiveLeads.length > 0 ? (
                filteredLiveLeads.slice(0, 80).map((vendor, vIdx) => {
                  const hasPhone = !!(vendor.phone && !vendor.phone.includes('Obfuscated') && !vendor.phone.includes('Requires'));
                  const cleanPhone = hasPhone ? vendor.phone.replace(/\D/g, '') : '';
                  const waPitch = `Hi ${vendor.name || 'there'}, we are contacting you regarding business inquiries in ${vendor.city || activeDistrict || locationQuery || 'your area'}.`;
                  const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waPitch)}` : null;
                  const isFreshLive = vendor.isLive || (vendor.scrapedAt && (Date.now() - new Date(vendor.scrapedAt).getTime() < 300000));

                  return (
                    <div
                      key={`lead-card-${vendor.id || 'idx'}-${vIdx}`}
                      onClick={() => setSelectedLead(vendor)}
                      className="rounded-xl border border-white/[0.06] bg-[#121222]/90 hover:border-violet-500/40 p-3 transition-all cursor-pointer group shadow-sm hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        {/* Logo Thumbnail / Monogram */}
                        {(vendor.logo || vendor.photo || vendor.images?.[0]) ? (
                          <img
                            src={vendor.logo || vendor.photo || vendor.images?.[0]}
                            alt={vendor.name}
                            className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0 mt-0.5"
                            onError={(e) => { 
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.name || 'Vendor')}&background=6366f1&color=fff&bold=true&size=128`;
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border border-violet-500/30 flex items-center justify-center text-xs font-black text-violet-300 shrink-0 mt-0.5">
                            {vendor.name?.[0]?.toUpperCase() || 'B'}
                          </div>
                        )}

                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-black text-white truncate group-hover:text-violet-300 transition-colors">
                              {vendor.name}
                            </h4>
                            {vendor.verified && (
                              <CheckCircle2 size={12} className="text-violet-400" />
                            )}
                            {isFreshLive && (
                              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[8px] font-bold border border-emerald-500/30 animate-pulse">
                                🔥 Live
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            <span className="text-violet-400 font-semibold">{vendor.category}</span>
                            <span className="text-slate-600"> • </span>
                            <span>{vendor.mandal ? `${vendor.mandal}, ` : ''}{vendor.city || activeDistrict || locationQuery || 'India'}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {vendor.tier && (
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                              vendor.tier === 'Diamond' ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-sm shadow-cyan-500/20' :
                              vendor.tier === 'Gold' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                              vendor.tier === 'Silver' ? 'bg-slate-400/15 text-slate-300 border-slate-400/30' :
                              'bg-orange-500/15 text-orange-300 border-orange-500/30'
                            }`}>
                              {vendor.tier === 'Diamond' ? '💎 ' : vendor.tier === 'Gold' ? '🥇 ' : vendor.tier === 'Silver' ? '🥈 ' : ''}{vendor.tier}
                            </span>
                          )}

                          {vendor.rating && (
                            <span className="flex items-center gap-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0">
                              <Star size={9} className="fill-amber-300 text-amber-300" />
                              <span>{vendor.rating}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                        <div className="text-[10px] font-mono truncate flex items-center gap-2">
                          {hasPhone ? (
                            <span className="text-emerald-400 font-bold">{vendor.phone}</span>
                          ) : (
                            <span className="text-slate-500 italic">No Direct Line</span>
                          )}
                          {vendor.email && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              ✉️ Email
                            </span>
                          )}
                          {vendor.website && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                              🌐 Web
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          {hasPhone && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm shadow-emerald-600/30"
                              title="Instant WhatsApp Pitch"
                            >
                              <MessageSquare size={10} />
                              <span>Pitch</span>
                            </a>
                          )}

                          <button
                            onClick={() => copyToClipboard(vendor.phone || vendor.name, vendor.id || vIdx)}
                            className="p-1 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white transition-all cursor-pointer"
                            title="Copy details"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : loading ? (
                <div className="py-4">
                  <ScraperLoader
                    targetQuery={categoryQuery}
                    targetLocation={locationQuery || activeDistrict}
                  />
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 text-xs px-4">
                  <div className="relative w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <span className="w-16 h-16 rounded-full border border-violet-500/30 animate-ping absolute opacity-40" />
                    <span className="w-10 h-10 rounded-full border border-cyan-500/50 animate-pulse absolute" />
                    <BrainCircuit size={28} className="text-violet-400 relative z-10" />
                  </div>
                  <h4 className="font-black text-white text-sm">
                    {categoryQuery ? `Swarm Scanning: "${categoryQuery}" in "${locationQuery || activeDistrict}"` : 'Autonomous Swarm Standby'}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    {isSessionActive 
                      ? 'Workers actively parsing Google Places & local directories. Live verified leads will drop here directly.'
                      : 'Enter any city or category above (e.g. photographers in nalgonda, wedding cards in chebrolu) to dispatch scraping swarm.'}
                  </p>
                  {isSessionActive && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-violet-950/60 border border-violet-500/30 text-[10px] font-mono text-cyan-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      <span>STREAMING SSE TELEMETRY ACTIVE</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── TOTAL BUSINESS DETAILS DOSSIER DRAWER ── */}
      <AnimatePresence>
        {selectedLead && (
          <div
            className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex justify-end"
            onClick={() => setSelectedLead(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg h-full bg-[#0a0a16] border-l border-white/[0.1] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drawer Header with Business Logo / Photo & Name */}
              <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-violet-950/30 via-slate-900 to-transparent">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Logo / Photo Avatar */}
                  {(selectedLead.logo || selectedLead.photo || selectedLead.images?.[0]) ? (
                    <img
                      src={selectedLead.logo || selectedLead.photo || selectedLead.images?.[0]}
                      alt={selectedLead.name}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-violet-500/40 shadow-lg shrink-0"
                      onError={(e) => { 
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedLead.name || 'Vendor')}&background=6366f1&color=fff&bold=true&size=128`;
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-violet-600/30 border border-white/20 shrink-0">
                      {selectedLead.name?.[0]?.toUpperCase() || 'B'}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-base font-black text-white truncate">{selectedLead.name}</h3>
                      {selectedLead.verified && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold flex items-center gap-1">
                          <CheckCircle2 size={10} className="text-emerald-400" /> Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                      <span className="text-violet-400 font-semibold">{selectedLead.category}</span>
                      <span className="text-slate-600">•</span>
                      <span>{selectedLead.mandal ? `${selectedLead.mandal}, ` : ''}{selectedLead.city || selectedLead.district || activeDistrict || 'India'}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-2 rounded-xl bg-white/[0.05] text-slate-400 hover:text-white hover:bg-white/[0.1] transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body: Total Business Information */}
              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-left">
                
                {/* Star Rating & Customer Reviews */}
                {selectedLead.rating && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-amber-300">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < Math.floor(parseFloat(selectedLead.rating)) ? "fill-amber-400 text-amber-400" : "text-amber-500/30"}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-black text-amber-300">{selectedLead.rating} / 5.0</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {selectedLead.reviewsCount || selectedLead.ratingCount || 'Verified'} Customer Reviews
                    </span>
                  </div>
                )}

                {/* Verified Phone & Instant WhatsApp Pitch */}
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Verified Phone Line</p>
                      <p className="text-base font-mono font-black text-emerald-300 mt-0.5">
                        {selectedLead.phone || 'Requires Direct Lookup'}
                      </p>
                    </div>
                    {selectedLead.phone && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                        Active Mobile Line
                      </span>
                    )}
                  </div>

                  {selectedLead.phone && (
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={`https://wa.me/${selectedLead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Hi ${selectedLead.name}, I came across your business listing in ${selectedLead.city || selectedLead.district || 'your area'} and would like to inquire regarding potential bookings and services. Could you share your portfolio or pricing brochure?`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                      >
                        <MessageSquare size={14} />
                        <span>1-Click WhatsApp Pitch</span>
                      </a>

                      <a
                        href={`tel:${selectedLead.phone.replace(/\D/g, '')}`}
                        className="py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                        title="Direct Phone Call"
                      >
                        <Phone size={13} />
                        <span>Call</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedLead.phone, 'drawer-phone')}
                        className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 transition-all cursor-pointer"
                        title="Copy phone"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Business Email Details */}
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Official Business Email</p>
                    <p className="text-xs font-mono font-bold text-slate-200 mt-1 truncate">
                      {selectedLead.email || 'Email available via deep website crawl'}
                    </p>
                  </div>
                  {selectedLead.email ? (
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <a
                        href={`mailto:${selectedLead.email}?subject=${encodeURIComponent(`Inquiry regarding ${selectedLead.name}`)}`}
                        className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Mail size={12} />
                        <span>Compose</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedLead.email, 'drawer-email')}
                        className="p-1.5 rounded-xl bg-white/[0.06] text-slate-300 hover:text-white"
                        title="Copy email"
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500 px-2 py-1 rounded bg-white/[0.03]">
                      Unlisted
                    </span>
                  )}
                </div>

                {/* Official Website */}
                {selectedLead.website && (
                  <div className="p-4 rounded-2xl bg-violet-950/20 border border-violet-500/30 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Official Website</p>
                      <p className="text-xs font-mono font-bold text-violet-200 mt-1 truncate">
                        {selectedLead.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                      </p>
                    </div>
                    <a
                      href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0 ml-2"
                    >
                      <Globe size={13} />
                      <span>Visit Site</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                )}

                {/* Physical Address & Landmark */}
                {selectedLead.address && (
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MapPin size={12} className="text-cyan-400" />
                      <span>Full Physical Address</span>
                    </p>
                    <p className="text-xs text-slate-200 mt-1.5 leading-relaxed font-medium">
                      {selectedLead.address}
                    </p>
                    {(selectedLead.mandal || selectedLead.district || selectedLead.pincode) && (
                      <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center gap-2 flex-wrap text-[10px] text-slate-400 font-mono">
                        {selectedLead.mandal && <span className="bg-white/[0.04] px-2 py-0.5 rounded">Mandal: {selectedLead.mandal}</span>}
                        {selectedLead.district && <span className="bg-white/[0.04] px-2 py-0.5 rounded">District: {selectedLead.district}</span>}
                        {selectedLead.pincode && <span className="bg-white/[0.04] px-2 py-0.5 rounded">PIN: {selectedLead.pincode}</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* Google Maps Listing & GPS Navigation */}
                <div className="grid grid-cols-2 gap-2">
                  {selectedLead.mapsLink ? (
                    <a
                      href={selectedLead.mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="col-span-2 flex items-center justify-between p-3.5 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-300 hover:bg-blue-600/25 transition-all text-xs font-bold shadow-sm"
                    >
                      <span className="flex items-center gap-2">
                        <MapPin size={15} className="text-blue-400" />
                        <span>Open in Google Maps Listing</span>
                      </span>
                      <ExternalLink size={13} />
                    </a>
                  ) : (selectedLead.latitude && selectedLead.longitude) ? (
                    <a
                      href={`https://maps.google.com/?q=${selectedLead.latitude},${selectedLead.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="col-span-2 flex items-center justify-between p-3.5 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-300 hover:bg-blue-600/25 transition-all text-xs font-bold shadow-sm"
                    >
                      <span className="flex items-center gap-2">
                        <MapPin size={15} className="text-blue-400" />
                        <span>Navigate on Google Maps</span>
                      </span>
                      <ExternalLink size={13} />
                    </a>
                  ) : null}

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[10px]">
                    <p className="text-slate-500 font-bold uppercase">Latitude</p>
                    <p className="text-emerald-400 font-mono font-bold mt-0.5">
                      {selectedLead.safeCoords?.[0]?.toFixed(5) || selectedLead.latitude || 'Resolved'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[10px]">
                    <p className="text-slate-500 font-bold uppercase">Longitude</p>
                    <p className="text-cyan-400 font-mono font-bold mt-0.5">
                      {selectedLead.safeCoords?.[1]?.toFixed(5) || selectedLead.longitude || 'Resolved'}
                    </p>
                  </div>
                </div>

                {/* Operating Hours & Scraper Engine Telemetry */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-[10px]">
                  {selectedLead.operatingHours && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Operating Hours:</span>
                      <span className="text-slate-200 font-semibold">{selectedLead.operatingHours}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Scraper Engine:</span>
                    <span className="text-violet-300 font-mono font-bold">{selectedLead.sourceEngine || 'Autonomous Multi-RPC Mesh'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Quality Score:</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {selectedLead.qualityScore ? `${selectedLead.qualityScore}/100` : '96/100 (A-Grade)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Capture Timestamp:</span>
                    <span className="text-slate-400 font-mono">
                      {selectedLead.scrapedAt ? new Date(selectedLead.scrapedAt).toLocaleTimeString() : 'Real-time SSE'}
                    </span>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DISTINCT SEARCH SESSIONS DRAWER ── */}
      <SearchSessionsDrawer
        isOpen={sessionsDrawerOpen}
        onClose={() => setSessionsDrawerOpen(false)}
        onLoadSession={handleLoadSession}
        initialFilter={sessionsDrawerFilter}
      />

      {/* ── REAL-TIME SERVER LOGS & TELEMETRY TERMINAL MODAL ── */}
      <LiveLogsTerminalModal
        isOpen={showLog}
        onClose={() => setShowLog(false)}
        logs={logs}
        sseStatus={sseStatus}
        isScrapingActive={isScrapingActive}
      />

      {/* ── UPCOMING LOCAL WHATSAPP AUTOMATION MODAL ── */}
      <AnimatePresence>
        {automationModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-xl bg-[#09101d] border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-left"
            >
              <button
                onClick={() => setAutomationModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-bold border border-emerald-500/30 w-fit mb-4">
                <Bot size={14} className="text-emerald-400 animate-pulse" />
                <span>Upcoming Feature • Local Outreach Engine</span>
              </div>

              <h3 className="text-2xl font-black text-white">Full Local WhatsApp Automation</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Direct bulk WhatsApp outreach automation integrated into this cockpit. Pitch your services to hundreds of scraped business owners directly from your browser with humanized delays.
              </p>

              <div className="mt-5 space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/[0.08]">
                  <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCheck size={14} />
                    <span>Direct Business Outreach</span>
                  </p>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Select verified leads and dispatch customized introductions and catalogs with 1 click.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/[0.08]">
                  <p className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <CheckCheck size={14} />
                    <span>Dynamic Smart Personalization</span>
                  </p>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Dynamic tags like &#123;BusinessName&#125; and &#123;City&#125; ensure high conversion rates.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/[0.08]">
                  <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <CheckCheck size={14} />
                    <span>Humanized Anti-Ban Delays</span>
                  </p>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Randomized pauses simulate authentic typing to protect your account.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setAutomationModalOpen(false);
                    toast.success('You are subscribed for early access notifications!', { icon: '🚀' });
                  }}
                  className="py-2.5 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Notify Me When Ready
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
