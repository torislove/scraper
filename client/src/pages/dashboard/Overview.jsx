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
    strategy, setStrategy,
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

  const [displayedCount, setDisplayedCount] = useState(50);
  const [minionProgress, setMinionProgress] = useState(0);

  // Simulate progress bar increments when loading is active
  useEffect(() => {
    let interval;
    if (loading) {
      setMinionProgress(0);
      interval = setInterval(() => {
        setMinionProgress(prev => {
          if (prev >= 100) return 0;
          return prev + Math.floor(Math.random() * 15) + 5;
        });
      }, 800);
    } else {
      setMinionProgress(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  return (
    <div className="min-h-full p-6 md:p-8" style={{ background: '#fffbeb' }}>
      
      {/* ── PAGE HEADER ── */}
      <div className="cartoon-card p-6 mb-6 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#fbbf24] border-2 border-black rounded-2xl flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <Search size={22} className="text-black" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black text-black">Minion Search Cockpit</h1>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">Deploy little scraping bots globally to extract verified business contacts!</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <button onClick={handleMasterStop} className="cartoon-btn cartoon-btn-red px-5 py-2.5 text-xs">
              <XCircle size={14} className="inline mr-1" /> Stop All Minions
            </button>
          )}
          <button onClick={pushToProd} disabled={verifiedCount === 0}
            className={`cartoon-btn px-5 py-2.5 text-xs ${verifiedCount > 0 ? 'cartoon-btn-yellow text-black' : 'opacity-40 cursor-not-allowed bg-gray-200'}`}>
            <Send size={14} className="inline mr-1" /> Push to Live Loot {verifiedCount > 0 && <span className="bg-red-500 text-white font-black text-[9px] border-2 border-black rounded-full px-2 py-0.5 ml-1">{verifiedCount}</span>}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ── ACTIVITY LOG (Admin Board) ── */}
        <div className="cartoon-card overflow-hidden bg-white">
          <button onClick={() => setShowLog(!showLog)}
            className="w-full px-6 py-4 flex items-center justify-between transition-colors hover:bg-gray-50 border-b-4 border-black">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full border-2 border-black ${
                  sseStatus === 'open' ? 'bg-green-500 animate-pulse' : sseStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <Activity size={16} className="text-black" />
                <span className="font-black text-sm text-black">Minion Activity Logboard</span>
              </div>
              <span className="bg-black text-white text-[9px] font-black uppercase border border-black rounded-lg px-2 py-0.5">Admin Only</span>
            </div>
            <div className="flex items-center gap-3">
              <select value={logLevel} onChange={e => setLogLevel(e.target.value)}
                onClick={e => e.stopPropagation()}
                className="cartoon-input text-xs w-28 py-1.5 px-2 bg-white">
                <option value="ALL">All Levels</option>
                <option value="INFO">Info</option>
                <option value="WARN">Warn</option>
                <option value="ERROR">Error</option>
                <option value="DEBUG">Debug</option>
              </select>
              <ChevronDown size={16} className={`text-black transition-transform ${showLog ? 'rotate-180' : ''}`} />
            </div>
          </button>

          <AnimatePresence>
            {showLog && (
              <motion.div initial={{ height: 0 }} animate={{ height: 200 }} exit={{ height: 0 }}
                className="overflow-hidden">
                <div ref={terminalRef} className="h-48 overflow-y-auto p-4 font-mono text-xs leading-loose bg-black text-green-400">
                  {logs?.length === 0
                    ? <span className="text-gray-500">No signals from minions yet. Launch a search to deploy them!</span>
                    : [...(logs || [])].filter(l => !logLevel || logLevel === 'ALL' || l.includes(`[${logLevel}]`)).slice(-100).reverse().map((log, i) => {
                        const isError = log.includes('[ERROR]');
                        const isWarn = log.includes('[WARN]');
                        const isInfo = log.includes('[INFO]');
                        return (
                          <div key={i} className={`break-words py-0.5 ${
                            isError ? 'text-red-400' : isWarn ? 'text-yellow-300' : isInfo ? 'text-green-300' : 'text-gray-400'
                          }`}>
                            <span className="mr-2 text-gray-600">[{new Date().toLocaleTimeString('en-US', { hour12: false })}]</span>
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
            { label: 'Total Leads Found', value: totalLeads, icon: <Database size={16} />, color: '#fca5a5', tag: 'Loot' },
            { label: 'With Phone', value: withPhone, icon: <TrendingUp size={16} />, color: '#fef08a', tag: 'Contact' },
            { label: 'No Phone Details', value: noPhone, icon: <Target size={16} />, color: '#fed7aa', tag: 'Empty' },
            { label: 'Pushed to Live DB', value: live, icon: <Zap size={16} />, color: '#cffafe', tag: 'Live' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="cartoon-card p-4 flex flex-col justify-between"
              style={{ backgroundColor: stat.color }}
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-black/60">{stat.label}</span>
                <div className="w-8 h-8 rounded-lg border-2 border-black bg-white flex items-center justify-center shadow-[1px_1px_0px_#000]">
                  {stat.icon}
                </div>
              </div>
              <div className="text-3xl font-black text-black mt-3">
                {stat.value.toLocaleString()}
              </div>
              <div className="mt-2 text-right">
                <span className="bg-white border-2 border-black text-black font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {stat.tag}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── SEARCH BOX ── */}
        <div className="cartoon-card p-6 bg-white">
          <h2 className="font-display text-lg font-black text-black flex items-center gap-2 mb-3">
            <Search size={20} className="text-red-500" /> Choose Scraping Target & Target City
          </h2>
          <p className="text-xs text-gray-500 font-semibold mb-6">
            Type what category you are looking for and in which city anywhere in the world! E.g. "Dentists" in "Paris" or "Gyms" in "Mumbai". The system will automatically spin up multiple virtual worker minions.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); startScrape(e); }}
            className="flex flex-col md:flex-row items-stretch gap-4 mb-6">
            
            <div className="relative flex-grow flex-1 flex items-center cartoon-input px-4 py-3 bg-white">
              <Search size={18} className="text-gray-500" />
              <input
                type="text"
                value={categoryQuery || ''}
                onChange={e => handleCategoryChange(e.target.value)}
                onFocus={() => {
                  setActiveInput('category');
                  if (categoryQuery && categoryQuery.trim().length >= 1) setShowSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => setActiveInput(null), 250);
                }}
                onKeyDown={handleKeyDown}
                placeholder="What? (e.g. Restaurants)"
                className="flex-1 ml-3 bg-transparent outline-none text-black placeholder-gray-400 font-bold"
              />
              {showSuggestions && activeInput === 'category' && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_#000] overflow-hidden max-h-60 overflow-y-auto">
                  {suggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      onMouseDown={() => {
                        setCategoryQuery(sug);
                        setShowSuggestions(false);
                      }}
                      className={`px-4 py-2.5 font-bold text-xs uppercase cursor-pointer border-b-2 border-black hover:bg-amber-100 ${
                        suggestionIndex === idx ? 'bg-amber-100' : 'bg-white'
                      }`}
                    >
                      {sug}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative flex-grow flex-1 flex items-center cartoon-input px-4 py-3 bg-white">
              <MapPin size={18} className="text-gray-500" />
              <input
                type="text"
                value={locationQuery || ''}
                onChange={e => handleLocationChange(e.target.value)}
                onFocus={() => {
                  setActiveInput('location');
                  if (locationQuery && locationQuery.trim().length >= 1) setShowSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => setActiveInput(null), 250);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Where City? (e.g. Hyderabad)"
                className="flex-1 ml-3 bg-transparent outline-none text-black placeholder-gray-400 font-bold"
              />
              {showSuggestions && activeInput === 'location' && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_#000] overflow-hidden max-h-60 overflow-y-auto">
                  {suggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      onMouseDown={() => {
                        setLocationQuery(sug);
                        setShowSuggestions(false);
                      }}
                      className={`px-4 py-2.5 font-bold text-xs uppercase cursor-pointer border-b-2 border-black hover:bg-amber-100 ${
                        suggestionIndex === idx ? 'bg-amber-100' : 'bg-white'
                      }`}
                    >
                      {sug}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading || !categoryQuery || !locationQuery}
              className={`cartoon-btn px-8 py-3 flex items-center justify-center gap-2 text-sm uppercase ${
                (loading || !categoryQuery || !locationQuery) ? 'opacity-40 cursor-not-allowed bg-gray-200 text-gray-500 shadow-none' : 'cartoon-btn-red text-white'
              }`}
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
              <span>{loading ? 'Deploying...' : 'Deploy Minions'}</span>
            </button>
          </form>

          {/* Scraping Scope & Advanced Radius Settings */}
          <div className="border-4 border-black rounded-2xl p-4 bg-[#f8fafc] grid grid-cols-1 md:grid-cols-2 gap-6 shadow-[3px_3px_0px_#000] mb-6">
            {/* Strategy Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                🗺️ Scraping Scope / Strategy
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setStrategy('broad')}
                  className={`px-3 py-2.5 text-xs font-black uppercase rounded-xl border-2 border-black transition-all ${
                    strategy === 'broad' 
                      ? 'bg-[#fbbf24] text-black shadow-[2px_2px_0px_#000] translate-x-[-2px] translate-y-[-2px]' 
                      : 'bg-white text-gray-700 hover:bg-slate-50'
                  }`}
                >
                  🎯 Target City Only (Ultra-Fast)
                </button>
                <button
                  type="button"
                  onClick={() => setStrategy('mandal')}
                  className={`px-3 py-2.5 text-xs font-black uppercase rounded-xl border-2 border-black transition-all ${
                    strategy === 'mandal' 
                      ? 'bg-[#fbbf24] text-black shadow-[2px_2px_0px_#000] translate-x-[-2px] translate-y-[-2px]' 
                      : 'bg-white text-gray-700 hover:bg-slate-50'
                  }`}
                >
                  🗺️ Full District Sweep
                </button>
              </div>
              <span className="text-[10px] text-gray-400 font-bold mt-1">
                {strategy === 'broad' 
                  ? '🎯 Highly targeted city coordinates grid. Scrapes up to 10-12 listings in seconds.' 
                  : '🗺️ Sweeps all mandals/municipalities within the entire district (exhaustive, slower).'}
              </span>
            </div>

            {/* Radius Selector */}
            <div className="flex flex-col justify-center gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-black">
                  📏 Search Radius: <span className="text-red-500 font-extrabold">{searchRadius || 10} km</span>
                </label>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                disabled={strategy !== 'broad'}
                value={searchRadius || 10}
                onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                className="w-full accent-red-500 h-2 bg-slate-200 border-2 border-black rounded-lg appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              />
              <span className="text-[10px] text-gray-400 font-bold mt-1">
                {strategy !== 'broad' 
                  ? '⚠️ Only applicable to Target City strategy' 
                  : 'Controls how wide the coordinate grid spreads around the city'}
              </span>
            </div>
          </div>

          {/* Platforms Checkboxes */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Minion Tools & Platforms</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PLATFORMS.map(platform => {
                const isEnabled = enabledEngines?.includes(platform.id);
                return (
                  <div key={platform.id} 
                    onClick={() => setEnabledEngines(prev => prev?.includes(platform.id) ? prev.filter(e => e !== platform.id) : [...(prev || []), platform.id])}
                    className={`cartoon-card p-3 flex items-center justify-between cursor-pointer transition-all ${
                      isEnabled ? 'bg-amber-100 border-red-500 shadow-[2px_2px_0px_#000]' : 'bg-white hover:bg-amber-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-black shrink-0">{platform.icon}</div>
                      <span className="text-[11px] font-black text-black">{platform.label}</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={isEnabled} 
                      onChange={() => {}}
                      className="w-3.5 h-3.5 accent-red-500 cursor-pointer pointer-events-none" 
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── WORKER DEPLOYMENT VISUALIZER OR MAPS ── */}
        <div className="cartoon-card overflow-hidden bg-white">
          <div className="px-6 py-4 flex items-center justify-between border-b-4 border-black bg-[#fef08a]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border-2 border-black rounded-xl flex items-center justify-center shadow-[1px_1px_0px_#000]">
                <Users size={18} className="text-black animate-pulse" />
              </div>
              <div>
                <h2 className="text-black font-black text-base">Minions Deployment Zone</h2>
                <p className="text-xs text-gray-500 font-semibold">Deploy and watch virtual minions scrape in the city!</p>
              </div>
            </div>
            {loading && (
              <div className="bg-red-500 text-white font-black text-xs border-2 border-black px-3 py-1 rounded-full animate-bounce shadow-[2px_2px_0px_#000]">
                🤖 SCRAPERS WORKING
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row">
            
            {/* Left: Deployed Minions / Loading animation or Map */}
            <div className="flex-1 min-h-[400px] border-b-4 lg:border-b-0 lg:border-r-4 border-black relative">
              {loading ? (
                /* Cartoon Worker Deployment Screen */
                <div className="absolute inset-0 bg-[#fffbeb] p-6 flex flex-col items-center justify-center text-center overflow-y-auto z-10">
                  <div className="w-16 h-16 bg-white border-4 border-black rounded-full flex items-center justify-center mb-4 shadow-[3px_3px_0px_#000] animate-bounce">
                    <span className="text-3xl">🤖</span>
                  </div>
                  <h3 className="text-lg font-black text-black mb-1 uppercase tracking-wide">
                    Deploying Scraping Minions in {locationQuery}!
                  </h3>
                  <p className="text-[11px] text-gray-600 font-semibold mb-4 max-w-sm">
                    Spinning up 50 virtual worker instances to harvest business leads and extract phone numbers in {locationQuery}.
                  </p>

                  {/* Progress Bar */}
                  <div className="w-full max-w-md bg-white border-4 border-black rounded-full overflow-hidden h-7 shadow-[3px_3px_0px_#000] mb-4 relative flex items-center justify-center">
                    <div className="h-full bg-red-500 transition-all duration-300 absolute left-0 top-0 bottom-0 border-r-4 border-black" style={{ width: `${minionProgress}%` }} />
                    <span className="relative z-10 font-black text-[10px] text-black mix-blend-difference">{minionProgress}% DEPLOYED</span>
                  </div>

                  {/* ── Running Minions Harvest Field ── */}
                  <div className="w-full max-w-md h-20 bg-[#fed7aa] border-4 border-black rounded-2xl relative overflow-hidden flex items-center justify-around mb-4 shadow-[3px_3px_0px_#000]">
                    <div className="absolute left-2 top-1.5 bg-black text-white text-[7px] font-black px-1.5 py-0.5 rounded border border-black uppercase tracking-wider">
                      Minion Harvest Field
                    </div>
                    {[
                      { icon: '🏃‍♂️🤖', delay: 0, y: 5, name: 'Scraper-A' },
                      { icon: '🏃‍♀️🤖', delay: 1.5, y: -5, name: 'Scraper-B' },
                      { icon: '🏎️🤖', delay: 0.8, y: 2, name: 'Turbo-Map' },
                      { icon: '🛸🤖', delay: 2.2, y: -10, name: 'Stealth-Fly' }
                    ].map((minion, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          x: ['-120%', '120%'],
                          y: [minion.y, minion.y + 6, minion.y],
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          delay: minion.delay,
                          ease: 'linear'
                        }}
                        className="absolute flex flex-col items-center select-none"
                      >
                        <span className="text-2xl">{minion.icon}</span>
                        <span className="bg-white border border-black text-[6px] font-black px-1 rounded uppercase tracking-wider text-black shadow-[1px_1px_0px_#000] mt-0.5 whitespace-nowrap">
                          {minion.name}
                        </span>
                      </motion.div>
                    ))}
                    
                    <div className="absolute right-4 text-2xl animate-pulse">📡</div>
                    <div className="absolute left-4 text-2xl animate-pulse">🏢</div>
                  </div>

                  {/* Cartoon Bots Loading Status Grid */}
                  <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                    {[
                      { name: 'Minion Bot 1 (Maps)', status: 'Scanning business cards...', icon: '🚗💨' },
                      { name: 'Minion Bot 2 (Web)', status: 'Resolving emails/socials...', icon: '🚁' },
                      { name: 'Minion Bot 3 (Stealth)', status: 'Rotating proxy engines...', icon: '🏃‍♂️💨' },
                      { name: 'Minion Bot 4 (Parser)', status: 'Extracting clean phone list...', icon: '🛸' },
                    ].map((bot, idx) => (
                      <div key={idx} className="cartoon-card p-2 bg-white text-left flex items-center gap-2">
                        <span className="text-lg animate-bounce shrink-0">{bot.icon}</span>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black text-red-500 uppercase truncate">{bot.name}</p>
                          <p className="text-[8px] font-semibold text-gray-500 mt-0.5 animate-pulse truncate">{bot.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : allMapPoints.length > 0 ? (
                /* Map view */
                <MapContainer center={workersOnMap[0]?.coords || [17.385, 78.4867]} zoom={11} style={{ height: '100%', width: '100%', minHeight: '400px' }} className="z-0">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {allMapPoints.map((point, idx) => {
                    if (point.type === 'worker') {
                      return (
                        <Marker key={idx} position={[point.lat, point.lng]} icon={makeWorkerIcon('#ef4444', 'Minion')} />
                      );
                    } else {
                      return (
                        <Marker key={idx} position={[point.lat, point.lng]} icon={makeVendorDot(true)} />
                      );
                    }
                  })}
                </MapContainer>
              ) : (
                /* Empty state */
                <div className="absolute inset-0 bg-[#fffbeb] flex flex-col items-center justify-center text-center p-8 z-10 overflow-hidden">
                  <div className="w-full max-w-md h-32 bg-[#cffafe] border-4 border-black rounded-2xl relative overflow-hidden flex flex-wrap items-center justify-around mb-4 shadow-[3px_3px_0px_#000]">
                    <div className="absolute left-2 top-2 bg-black text-white text-[9px] font-black px-2 py-1 rounded border border-black uppercase tracking-wider">
                      IndiaScraper Standby Theater 🇮🇳
                    </div>
                    {[
                      { icon: '😴🤖', delay: 0, y: 10, name: 'Snoozing' },
                      { icon: '🛠️🤖', delay: 1, y: 5, name: 'Oiling Gears' },
                      { icon: '☕🤖', delay: 2, y: 15, name: 'Chai Break' },
                      { icon: '🇮🇳🤖', delay: 1.5, y: -5, name: 'Waiting...' }
                    ].map((minion, i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [minion.y, minion.y - 10, minion.y] }}
                        transition={{ duration: 3, repeat: Infinity, delay: minion.delay, ease: 'easeInOut' }}
                        className="relative flex flex-col items-center mt-6"
                      >
                        <span className="text-4xl">{minion.icon}</span>
                        <span className="bg-white border border-black text-[8px] font-black px-1.5 rounded uppercase tracking-wider text-black shadow-[1px_1px_0px_#000] mt-2 whitespace-nowrap">
                          {minion.name}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                  <h3 className="text-lg font-black text-black uppercase tracking-wide">Minions are on standby! 🇮🇳</h3>
                  <p className="text-[12px] text-gray-600 font-bold mt-2 max-w-xs">
                    Give us a category and an Indian city. We will extract verified leads for your business.
                  </p>
                </div>
              )}
            </div>

            {/* Right: Minions List */}
            <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 p-4 space-y-3 max-h-[400px] overflow-y-auto bg-amber-50/50">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Deployed Minion Bots</p>
              {(employees || []).length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-400 text-xs font-semibold">No minion profiles yet</p>
                </div>
              ) : (
                workersWithCoords.map((worker, idx) => {
                  return (
                    <div key={worker.id} className="cartoon-card p-3 bg-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg border-2 border-black bg-red-500 flex items-center justify-center text-white font-black text-xs shadow-[1px_1px_0px_#000]">
                        {(worker.name || 'M')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-black truncate">{worker.name}</p>
                        <p className="text-[9px] font-semibold text-gray-400 truncate">{worker.location || 'Global'}</p>
                      </div>
                      <span className={`text-[8px] font-black border-2 border-black px-1.5 py-0.5 rounded-full ${
                        worker.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {worker.isActive ? 'ACTIVE' : 'IDLE'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

        {/* ── SCRAPED LEADS LIST (PAGINATED IN BATCHES OF 50) ── */}
        <div className="cartoon-card p-6 bg-white">
          <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
            <h2 className="font-display font-black text-lg text-black">Scraped Minion Loot</h2>
            <span className="bg-red-500 text-white font-black text-xs border-2 border-black px-3 py-1 rounded-full shadow-[2px_2px_0px_#000]">
              Showing {Math.min(totalLeads, displayedCount)} / {totalLeads} Leads
            </span>
          </div>

          {vendors.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-3xl">🏜️</span>
              <p className="text-xs text-gray-500 font-semibold mt-2">No lead items extracted in this session. Start a scan!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {vendors.slice(0, displayedCount).map((lead, idx) => (
                  <div key={idx} className="cartoon-card p-3.5 bg-white hover:bg-amber-50 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-black text-black truncate">{lead.name}</h4>
                      <p className="text-[10px] font-semibold text-gray-500 mt-0.5 truncate">{lead.category} · {lead.location}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lead.phone ? (
                        <span className="text-[9px] font-black border-2 border-black bg-green-100 text-green-800 px-2 py-0.5 rounded-full uppercase">Phone ✓</span>
                      ) : (
                        <span className="text-[9px] font-black border-2 border-black bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full uppercase">No Phone</span>
                      )}
                      <span className="text-[9px] font-black border-2 border-black bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full uppercase">Minion Loot</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load Next 50 Minions button */}
              {vendors.length > displayedCount && (
                <div className="text-center pt-4">
                  <button 
                    onClick={() => {
                      setDisplayedCount(prev => prev + 50);
                    }} 
                    className="cartoon-btn cartoon-btn-yellow px-6 py-2.5 text-xs font-black text-black uppercase"
                  >
                    Deploy Next 50 Minions! 🤖🚀
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

