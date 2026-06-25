import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Play, Square, RefreshCw, ArrowRight, MapPin, Camera,
  MessageCircle, Globe, Database, Briefcase, Image, Clock,
  Trash2, X, Activity, ChevronDown, Check, XCircle, Download,
  FolderOpen, Filter, Send, Settings, TrendingUp, Zap, Target, Map,
  Users, Phone, Star, Wifi, WifiOff, BarChart3, UserCheck
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useScraper } from '../../context/ScraperContext';

// ── City coords lookup for Indian cities (for worker map pins) ──
const CITY_COORDS = {
  'guntur': [16.3067, 80.4365], 'hyderabad': [17.385, 78.4867],
  'vijayawada': [16.5062, 80.648], 'vizag': [17.686, 83.2185],
  'visakhapatnam': [17.686, 83.2185], 'tirupati': [13.6288, 79.4192],
  'nellore': [14.4426, 79.9865], 'kurnool': [15.828, 78.037],
  'rajahmundry': [17.0005, 81.804], 'kakinada': [16.9891, 82.2475],
  'eluru': [16.7107, 81.0952], 'ongole': [15.5057, 80.0499],
  'anantapur': [14.6819, 77.5997], 'bangalore': [12.9716, 77.5946],
  'bengaluru': [12.9716, 77.5946], 'chennai': [13.0827, 80.2707],
  'mumbai': [19.076, 72.8777], 'delhi': [28.7041, 77.1025],
  'kolkata': [22.5726, 88.3639], 'pune': [18.5204, 73.8567],
  'ahmedabad': [23.0225, 72.5714], 'surat': [21.1702, 72.8311],
  'jaipur': [26.9124, 75.7873], 'lucknow': [26.8467, 80.9462],
};

function getCityCoords(city) {
  if (!city) return null;
  const key = city.toLowerCase().trim();
  return CITY_COORDS[key] || null;
}

// Fix for default leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ── Worker Avatar Colors ──
const WORKER_COLORS = ['#7c3aed', '#2563eb', '#16a34a', '#ea580c', '#db2777', '#0891b2', '#d97706'];

export default function OverviewPage() {
  const {
    vendors,
    loading, logs, sseStatus, logLevel, setLogLevel,
    omniQuery, setOmniQuery, searchRadius, setSearchRadius,
    enabledEngines, setEnabledEngines,
    startScrape, handleMasterStop, pushToProd,
    stagingVendorsWithPhones, stagingVendorsNoPhones,
    outOfBoundsVendors,
    liveVendors, verifiedCount,
    activeJobs, grouped,
    employees, fetchEmployees,
    modelLoadingStatus, suggestions, showSuggestions, setShowSuggestions,
    suggestionIndex, searchHistory, setSearchHistory,
    showDirectory, setShowDirectory, knowledge,
    handleKeyDown,
    categoryQuery, setCategoryQuery,
    locationQuery, setLocationQuery,
    activeInput, setActiveInput,
    handleCategoryChange, handleLocationChange,
    triggerPython, triggerCheerio, triggerMaps,
    searchContainerRef, terminalRef,
  } = useScraper();

  const [showLog, setShowLog] = useState(true);

  const PLATFORMS = [
    { id: 'maps', label: 'Maps & Location', icon: <MapPin size={14} />, desc: 'Google Maps & local directories' },
    { id: 'instagram', label: 'Instagram', icon: <Camera size={14} />, desc: 'Business profiles & contacts' },
    { id: 'google-web', label: 'Universal Web Search', icon: <Globe size={14} />, desc: 'Global organic web scraper' },
    { id: 'justdial', label: 'Justdial', icon: <Globe size={14} />, desc: 'India\'s top business directory' },
    { id: 'facebook', label: 'Facebook', icon: <Briefcase size={14} />, desc: 'Manual Login FB Scraper' },
    { id: 'indiamart', label: 'IndiaMart', icon: <Globe size={14} />, desc: 'Manual Login B2B Directory' },
    { id: 'linkedin', label: 'LinkedIn', icon: <Briefcase size={14} />, desc: 'Professional & B2B leads' },
    { id: 'firebase', label: 'Cloud Sync', icon: <Database size={14} />, desc: 'Sync with live database' },
  ];

  const totalLeads = vendors?.length || 0;
  const withPhone = stagingVendorsWithPhones?.length || 0;
  const noPhone = stagingVendorsNoPhones?.length || 0;
  const live = liveVendors?.length || 0;

  const mapVendors = [...(stagingVendorsWithPhones || []), ...(stagingVendorsNoPhones || [])]
    .filter(v => (v.lat && v.lng) || (v.latitude && v.longitude))
    .map(v => ({...v, safeLat: v.lat || v.latitude, safeLng: v.lng || v.longitude}))
    .slice(0, 50);

  // Workers with geocoded coords
  const workersWithCoords = (employees || []).map((emp, idx) => ({
    ...emp,
    coords: getCityCoords(emp.location),
    color: WORKER_COLORS[idx % WORKER_COLORS.length],
    leadsCount: (vendors || []).filter(v => v.assignedTo === emp.id).length,
    isActive: activeJobs?.some(j => j.assignedTo === emp.id) || false,
  }));

  const workersOnMap = workersWithCoords.filter(w => w.coords);

  // All map points combined
  const allMapPoints = [
    ...mapVendors.map(v => ({ lat: v.safeLat, lng: v.safeLng, type: 'vendor' })),
    ...workersOnMap.map(w => ({ lat: w.coords[0], lng: w.coords[1], type: 'worker' })),
  ];

  const MapBounds = ({ points }) => {
    const map = useMap();
    useEffect(() => {
      if (points.length > 0) {
        const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
      }
    }, [points.length]);
    return null;
  };

  const makeWorkerIcon = (color, name) => L.divIcon({
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    html: `<div style="
      width:40px;height:40px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 0 0 3px ${color}55, 0 4px 12px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
      color:white;font-weight:900;font-size:14px;font-family:Inter,sans-serif;
      animation:workerPulse 2s ease-in-out infinite;
    ">${name[0].toUpperCase()}</div>`,
  });

  const makeVendorDot = (hasPhone) => L.divIcon({
    className: '',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    html: `<div style="
      width:10px;height:10px;border-radius:50%;
      background:${hasPhone ? '#10b981' : '#f59e0b'};
      border:2px solid rgba(255,255,255,0.7);
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
  });

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
              <h1 className="font-display text-xl font-black text-white">Lead Scraper</h1>
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Search and extract verified business contacts from multiple sources</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {loading && (
              <button onClick={handleMasterStop} className="btn-3d btn-rose btn-sm">
                <XCircle size={13} /> Stop All
              </button>
            )}
            <button onClick={pushToProd} disabled={verifiedCount === 0}
              className={`btn-3d btn-sm ${verifiedCount > 0 ? 'btn-primary' : 'btn-ghost opacity-40 cursor-not-allowed'}`}>
              <Send size={13} /> Push to Live {verifiedCount > 0 && <span className="badge badge-emerald ml-1" style={{ fontSize: 9, padding: '1px 6px' }}>{verifiedCount}</span>}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 space-y-6 relative z-10">
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

          <AnimatePresence>
            {showLog && (
              <motion.div initial={{ height: 0 }} animate={{ height: 320 }} exit={{ height: 0 }}
                className="overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div ref={terminalRef} className="h-80 overflow-y-auto p-5 font-mono text-[11px] leading-loose custom-scrollbar"
                  style={{ background: 'rgba(0,0,0,0.4)' }}>
                  {logs?.length === 0
                    ? <span style={{ color: 'rgba(255,255,255,0.2)' }}>No logs yet. Start a scrape to see activity.</span>
                    : [...(logs || [])].filter(l => !logLevel || logLevel === 'ALL' || l.includes(`[${logLevel}]`)).slice(-200).reverse().map((log, i) => {
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Search size={18} className="text-violet-500" /> Intelligent Search
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              ✨ Type a business type and city, or use natural language (e.g., <i>"I want a complete list of photographers in Guntur"</i>). AI semantic search is{' '}
              {modelLoadingStatus?.status === 'ready'
                ? <span className="text-green-500 font-semibold">active ✓</span>
                : modelLoadingStatus?.status === 'loading'
                  ? <span className="text-amber-500 font-semibold">loading ({Math.round(modelLoadingStatus.progress || 0)}%)...</span>
                  : <span className="text-gray-400">standby</span>
              }
            </p>
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
                Natural language search with AI semantic matching
              </p>
            </div>
            
            {/* Live Indicator */}
            {loading && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fda4af' }}>
                <span className="status-dot status-error" style={{ animation: 'badge-pulse-anim 1s ease-in-out infinite' }} />
                SCRAPING ACTIVE
              </div>
            )}
          </div>

          <div className="p-6">
            <form onSubmit={(e) => { e.preventDefault(); startScrape(null, categoryQuery, locationQuery); }}
              className="relative flex flex-col md:flex-row items-center bg-gray-900 border border-gray-700 rounded-2xl shadow-sm mb-8 transition-shadow focus-within:ring-2 focus-within:ring-violet-500/50"
              style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.1)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
              
              <div className="flex w-full items-center">
                {/* Category Input */}
                <div className="flex-1 flex items-center w-full px-5 py-4">
                  <Search size={20} className={`flex-shrink-0 ${loading ? 'text-violet-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    value={categoryQuery || ''}
                    onChange={e => handleCategoryChange(e.target.value)}
                    onFocus={() => {
                      setActiveInput('category');
                      if (!categoryQuery && searchHistory?.length > 0) setShowSuggestions(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="What? (e.g. Photographers)"
                    className="flex-1 ml-3 bg-transparent outline-none text-white placeholder-gray-500 text-base font-medium w-full"
                  />
                  {categoryQuery && !loading && (
                    <button type="button" onClick={() => setCategoryQuery('')} className="text-gray-500 hover:text-gray-300 transition-colors ml-2">
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="hidden md:block w-px h-10" style={{ background: 'rgba(255,255,255,0.1)' }}></div>
                <div className="md:hidden h-px w-full" style={{ background: 'rgba(255,255,255,0.1)' }}></div>

                {/* Location Input */}
                <div className="flex-1 flex items-center w-full px-5 py-4">
                  <MapPin size={20} className={`flex-shrink-0 ${loading ? 'text-violet-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    value={locationQuery || ''}
                    onChange={e => handleLocationChange(e.target.value)}
                    onFocus={() => {
                      setActiveInput('location');
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Where? (e.g. Hyderabad)"
                    className="flex-1 ml-3 bg-transparent outline-none text-white placeholder-gray-500 text-base font-medium w-full"
                  />
                  {locationQuery && !loading && (
                    <button type="button" onClick={() => setLocationQuery('')} className="text-gray-500 hover:text-gray-300 transition-colors ml-2">
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Radius Select */}
                <div className="flex items-center gap-2 px-4 py-4 md:py-0" style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                  <select value={searchRadius} onChange={e => setSearchRadius(Number(e.target.value))}
                    className="bg-transparent text-xs text-white font-semibold outline-none cursor-pointer pr-1">
                    <option value={10} className="text-gray-900">10km</option>
                    <option value={20} className="text-gray-900">20km</option>
                    <option value={50} className="text-gray-900">50km</option>
                    <option value={100} className="text-gray-900">100km</option>
                  </select>
                </div>

                {/* Extract Button */}
                <div className="p-2 w-full md:w-auto">
                  <button type="submit" disabled={loading || !categoryQuery || !locationQuery}
                    className={`btn-3d w-full md:w-auto flex items-center justify-center gap-2 flex-shrink-0 ${
                      loading ? 'btn-ghost opacity-50 cursor-not-allowed'
                      : (categoryQuery && locationQuery) ? 'btn-primary'
                      : 'btn-ghost opacity-50 cursor-not-allowed'
                    }`}>
                    {loading ? <RefreshCw size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                    {loading ? 'Extracting...' : 'Extract'}
                  </button>
                </div>
              </div>

              {/* Loading progress bar */}
              {loading && (
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-violet-100 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                    animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ width: '50%' }} />
                </div>
              )}

              {/* Suggestions dropdown */}
              <AnimatePresence>
                {showSuggestions && suggestions?.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className={`absolute top-full mt-2 ${activeInput === 'location' ? 'left-1/2 right-0' : 'left-0 right-1/2'} bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-100 overflow-hidden z-50`}
                    style={typeof window !== 'undefined' && window.innerWidth < 768 ? { left: 0, right: 0 } : {}}
                  >
                    {suggestions.map((s, idx) => {
                      const isHistory = activeInput === 'category' && searchHistory?.includes(s) && !categoryQuery;
                      return (
                        <div key={idx}
                          className={`px-5 py-3 flex items-center gap-3 cursor-pointer text-sm border-b border-gray-50 last:border-0 transition-colors ${suggestionIndex === idx ? 'bg-violet-50 text-violet-700' : 'hover:bg-gray-50 text-gray-700'}`}
                          onClick={() => {
                            if (activeInput === 'category') {
                              setCategoryQuery(s);
                              document.querySelector('input[placeholder="Where? (e.g. Hyderabad)"]')?.focus();
                            } else {
                              setLocationQuery(s);
                            }
                            setShowSuggestions(false);
                          }}>
                          {activeInput === 'location' ? <MapPin size={14} className="text-gray-300" /> : isHistory ? <Clock size={14} className="text-gray-300" /> : <Search size={14} className="text-gray-300" />}
                          <span className="font-medium">{s}</span>
                        </div>
                      );
                    })}
                    {activeInput === 'category' && !categoryQuery && searchHistory?.length > 0 && (
                      <div className="px-5 py-2.5 text-xs text-red-400 hover:text-red-600 cursor-pointer flex items-center gap-2 border-t border-gray-50 bg-gray-50/50"
                        onClick={() => { setSearchHistory([]); localStorage.removeItem('gomandap_search_history'); setShowSuggestions(false); }}>
                        <Trash2 size={12} /> Clear Search History
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Platform selectors */}
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Search Sources</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PLATFORMS.map(platform => {
                  const isEnabled = enabledEngines?.includes(platform.id);
                  return (
                    <div key={platform.id} 
                      className="glass-card flex items-center justify-between gap-3 px-4 py-3 cursor-pointer"
                      onClick={() => setEnabledEngines(prev => prev?.includes(platform.id) ? prev.filter(e => e !== platform.id) : [...(prev || []), platform.id])}
                      style={{ 
                        background: isEnabled ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                        borderColor: isEnabled ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.05)'
                      }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: isEnabled ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)' }}>
                          <span style={{ color: isEnabled ? '#a78bfa' : 'rgba(255,255,255,0.3)' }}>{platform.icon}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs truncate" style={{ color: isEnabled ? '#fff' : 'rgba(255,255,255,0.5)' }}>{platform.label}</p>
                          <p className="text-[9px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{platform.desc}</p>
                        </div>
                      </div>
                      
                      {/* 3D Switch Toggle */}
                      <label className="switch-3d flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isEnabled} onChange={() => setEnabledEngines(prev => prev?.includes(platform.id) ? prev.filter(e => e !== platform.id) : [...(prev || []), platform.id])} />
                        <span className="slider-3d"></span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Browse directory */}
            {knowledge && (
              <div>
                <button type="button" onClick={() => setShowDirectory(!showDirectory)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors">
                  <FolderOpen size={13} />
                  {showDirectory ? 'Hide' : 'Browse'} Categories & Locations
                  <ChevronDown size={13} className={`transition-transform ${showDirectory ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showDirectory && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="mt-4 grid grid-cols-2 gap-6 overflow-hidden">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Categories</p>
                        <div className="h-40 overflow-y-auto flex flex-wrap gap-1.5 content-start pr-2">
                          {knowledge.categories?.map((c, i) => (
                            <button key={i} type="button"
                              onClick={() => { setOmniQuery(c + ' in '); setShowDirectory(false); searchContainerRef.current?.querySelector('input')?.focus(); }}
                              className="text-xs px-2.5 py-1.5 bg-gray-50 hover:bg-violet-50 hover:text-violet-700 border border-gray-100 hover:border-violet-200 rounded-lg text-gray-600 transition-all font-medium">
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Top Cities</p>
                        <div className="h-40 overflow-y-auto flex flex-wrap gap-1.5 content-start pr-2">
                          {knowledge.locations?.filter(l => l.type === 'district').map((l, i) => (
                            <button key={i} type="button"
                              onClick={() => { setOmniQuery(omniQuery.includes('in') ? omniQuery.split('in')[0] + 'in ' + l.name : `Businesses in ${l.name}`); setShowDirectory(false); }}
                              className="text-xs px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-lg transition-all font-medium">
                              {l.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* MASTER CONTROL */}
            <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Master Control</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button type="button"
                  onClick={() => {
                    triggerPython(categoryQuery, locationQuery);
                  }}
                  className="btn-3d btn-secondary">
                  <span className="text-lg">🐍</span> Python Engine
                </button>
                
                <button type="button"
                  onClick={() => {
                    startScrape(null, categoryQuery, locationQuery);
                  }}
                  className="btn-3d btn-primary w-full col-span-1 md:col-span-2">
                  <span className="text-xl">✨</span> Launch Master Omni-Search
                </button>
              </div>
            </div>
          </div>
        </motion.div>



        {/* ── WORKERS COMMAND CENTER ── */}
        <style>{`
          @keyframes workerPulse {
            0%, 100% { box-shadow: 0 0 0 3px rgba(124,58,237,0.4), 0 4px 12px rgba(0,0,0,0.4); }
            50% { box-shadow: 0 0 0 8px rgba(124,58,237,0.1), 0 4px 20px rgba(0,0,0,0.5); }
          }
          .leaflet-control-attribution { display: none !important; }
          .leaflet-control-zoom { display: none !important; }
        `}</style>
        <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-xl" style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)' }}>
          
          {/* Header */}
          <div className="px-7 pt-7 pb-5 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>
                <Users size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-white font-black text-lg tracking-tight">Workers Command Center</h2>
                <p className="text-white/40 text-xs font-medium mt-0.5">Real-time field agent activity & coverage map</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs font-bold">{workersOnMap.length} Online</span>
              </div>
              <div className="px-3 py-1.5 rounded-full text-white/50 text-xs font-bold" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {mapVendors.length} Lead Pins
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row">

            {/* Left: Worker Cards */}
            <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 p-5 space-y-3 lg:border-r border-white/5 max-h-[460px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Field Agents</p>
              {(employees || []).length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <Users size={24} className="text-white/20" />
                  </div>
                  <p className="text-white/30 text-sm font-semibold">No agents yet</p>
                  <p className="text-white/20 text-xs mt-1">Add workers in Settings</p>
                </div>
              ) : (
                workersWithCoords.map((worker, idx) => {
                  const assignedVendors = (vendors || []).filter(v => v.assignedTo === worker.id);
                  const verifiedCount = assignedVendors.filter(v => v.verified).length;
                  return (
                    <motion.div
                      key={worker.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className="relative rounded-2xl p-4 cursor-pointer group transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.06)` }}
                      whileHover={{ scale: 1.01, background: 'rgba(255,255,255,0.07)' }}
                    >
                      {/* Colored left bar */}
                      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full" style={{ background: worker.color }} />
                      
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg" style={{ background: worker.color }}>
                            {worker.name[0].toUpperCase()}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center`}
                            style={{ borderColor: '#1a1a2e', background: worker.isActive ? '#10b981' : '#6b7280' }}>
                            {worker.isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping absolute" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm truncate">{worker.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <MapPin size={10} className="text-white/30 flex-shrink-0" />
                            <p className="text-white/50 text-xs truncate">{worker.location || 'No location'}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          worker.isActive
                            ? 'text-emerald-400 bg-emerald-400/10'
                            : 'text-white/30 bg-white/5'
                        }`}>
                          {worker.isActive ? 'ACTIVE' : 'IDLE'}
                        </span>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <p className="text-white font-black text-base leading-none">{assignedVendors.length}</p>
                          <p className="text-white/30 text-[9px] font-semibold uppercase tracking-wide mt-0.5">Leads</p>
                        </div>
                        <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <p className="font-black text-base leading-none" style={{ color: verifiedCount > 0 ? '#10b981' : 'rgba(255,255,255,0.3)' }}>{verifiedCount}</p>
                          <p className="text-white/30 text-[9px] font-semibold uppercase tracking-wide mt-0.5">Verified</p>
                        </div>
                        <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <p className="font-black text-base leading-none" style={{ color: worker.coords ? '#3b82f6' : 'rgba(255,255,255,0.3)' }}>
                            {worker.coords ? '📍' : '—'}
                          </p>
                          <p className="text-white/30 text-[9px] font-semibold uppercase tracking-wide mt-0.5">On Map</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {assignedVendors.length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-white/30 font-semibold">Completion</span>
                            <span className="text-[10px] font-bold" style={{ color: worker.color }}>
                              {Math.round(verifiedCount / assignedVendors.length * 100)}%
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: worker.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.round(verifiedCount / assignedVendors.length * 100)}%` }}
                              transition={{ duration: 1, ease: 'easeOut', delay: idx * 0.1 }}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}

              {/* Live Vendor Feed below workers */}
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 pt-4 pb-2">Recent Leads</p>
              {[...stagingVendorsWithPhones, ...stagingVendorsNoPhones]
                .sort((a, b) => new Date(b.scrapedAt || 0) - new Date(a.scrapedAt || 0))
                .slice(0, 6)
                .map((v, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                      style={{ background: v.phone ? 'rgba(16,185,129,0.2)', color: v.phone ? '#10b981' : '#f59e0b' }}>
                      {v.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-xs font-semibold truncate">{v.name}</p>
                      <p className="text-white/30 text-[10px] truncate">{v.category} · {v.city}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${v.phone ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  </motion.div>
                ))}
              {stagingVendorsWithPhones.length === 0 && stagingVendorsNoPhones.length === 0 && (
                <p className="text-white/20 text-xs text-center py-4">No leads yet. Start a scrape!</p>
              )}
            </div>

            {/* Right: Map */}
            <div className="flex-1 relative" style={{ minHeight: '460px' }}>
              {allMapPoints.length > 0 || workersOnMap.length > 0 ? (
                <MapContainer
                  center={workersOnMap.length > 0 ? workersOnMap[0].coords : (mapVendors.length > 0 ? [mapVendors[0].safeLat, mapVendors[0].safeLng] : [17.385, 78.4867])}
                  zoom={7}
                  style={{ width: '100%', height: '100%', minHeight: '460px' }}
                  zoomControl={false}
                  attributionControl={false}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution=""
                  />
                  <MapBounds points={allMapPoints.length > 0 ? allMapPoints : workersOnMap.map(w => ({ lat: w.coords[0], lng: w.coords[1] }))} />
                  
                  {/* Vendor dots */}
                  {mapVendors.map((vendor, i) => (
                    <Marker key={`v-${i}`} position={[vendor.safeLat, vendor.safeLng]} icon={makeVendorDot(!!vendor.phone)}>
                      <Popup className="dark-popup">
                        <div style={{ background: '#1a1a2e', color: 'white', padding: '8px', borderRadius: '8px', minWidth: '140px', fontSize: '11px' }}>
                          <p style={{ fontWeight: 900, marginBottom: 4 }}>{vendor.name}</p>
                          <p style={{ color: '#94a3b8', marginBottom: 2 }}>{vendor.category}</p>
                          {vendor.phone && <p style={{ color: '#10b981', fontWeight: 700 }}>{vendor.phone}</p>}
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Worker pins */}
                  {workersOnMap.map((worker, i) => (
                    <React.Fragment key={`w-${worker.id}`}>
                      <Circle
                        center={worker.coords}
                        radius={15000}
                        pathOptions={{ color: worker.color, fillColor: worker.color, fillOpacity: 0.08, weight: 1, dashArray: '4 4' }}
                      />
                      <Marker position={worker.coords} icon={makeWorkerIcon(worker.color, worker.name)}>
                        <Popup className="dark-popup">
                          <div style={{ background: '#1a1a2e', color: 'white', padding: '10px', borderRadius: '10px', minWidth: '160px', fontSize: '11px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: worker.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white' }}>
                                {worker.name[0]}
                              </div>
                              <div>
                                <p style={{ fontWeight: 900, margin: 0 }}>{worker.name}</p>
                                <p style={{ color: '#94a3b8', margin: 0 }}>{worker.location}</p>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                              <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 6, padding: '4px 8px', textAlign: 'center' }}>
                                <p style={{ fontWeight: 900, margin: 0 }}>{(vendors || []).filter(v => v.assignedTo === worker.id).length}</p>
                                <p style={{ color: '#94a3b8', fontSize: 9, margin: 0 }}>LEADS</p>
                              </div>
                              <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 6, padding: '4px 8px', textAlign: 'center' }}>
                                <p style={{ fontWeight: 900, margin: 0, color: worker.isActive ? '#10b981' : '#6b7280' }}>{worker.isActive ? '● ACTIVE' : '○ IDLE'}</p>
                                <p style={{ color: '#94a3b8', fontSize: 9, margin: 0 }}>STATUS</p>
                              </div>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  ))}
                </MapContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center flex-col gap-4" style={{ minHeight: '460px' }}>
                  <motion.div
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}
                  >
                    <Map size={28} style={{ color: '#7c3aed' }} />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-white/50 font-bold text-sm">Map activates when scraping starts</p>
                    <p className="text-white/25 text-xs mt-1">Worker pins appear based on their assigned city</p>
                  </div>
                </div>
              )}

              {/* Map legend overlay */}
              <div className="absolute top-4 right-4 rounded-xl p-3 z-[500]" style={{ background: 'rgba(15,15,26,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[9px] text-white/40 font-black uppercase tracking-widest mb-2">Legend</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black text-white" style={{ background: '#7c3aed' }}>W</div>
                    <span className="text-white/60 text-[10px] font-medium">Worker</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#10b981', border: '1.5px solid rgba(255,255,255,0.5)' }} />
                    <span className="text-white/60 text-[10px] font-medium">Lead w/ Phone</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#f59e0b', border: '1.5px solid rgba(255,255,255,0.5)' }} />
                    <span className="text-white/60 text-[10px] font-medium">Lead no Phone</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── QUICK STATS BY CATEGORY ── */}
        {Object.keys(grouped || {}).length > 0 && (
          <div className="glass-card p-6" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white text-sm">Category Breakdown</h2>
              <a href="/app/leads" className="text-xs font-semibold flex items-center gap-1 transition-colors" style={{ color: '#a78bfa' }}>
                View All Leads <ArrowRight size={12} />
              </a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(grouped).slice(0, 8).map(([cat, items]) => (
                <div key={cat} className="p-4 rounded-xl transition-all" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.6)' }} title={cat}>{cat}</p>
                  <p className="text-2xl font-black text-white mt-1">{items.length}</p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{items.filter(v => v.verified).length} verified</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

