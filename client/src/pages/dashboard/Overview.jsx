import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Play, Square, RefreshCw, ArrowRight, MapPin, Camera,
  MessageCircle, Globe, Database, Briefcase, Image, Clock,
  Trash2, X, Activity, ChevronDown, Check, XCircle, Download,
  FolderOpen, Filter, Send, Settings, TrendingUp, Zap, Target, Map,
  Users, Phone, Star, Wifi, WifiOff, BarChart3, UserCheck, Mail, CheckCircle2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useScraper } from '../../context/ScraperContext';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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
    handleVerify, handleDelete,
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
  const [selectedVendor, setSelectedVendor] = useState(null);

  const PLATFORMS = [
    { id: 'maps', label: 'Google Maps & Places', icon: <MapPin size={14} />, desc: 'Google Maps business scraper' },
    { id: 'google-web', label: 'Google Search Leads', icon: <Globe size={14} />, desc: 'Google search organic leads scraper' },
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
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        


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
            type what category you are looking for and in which city anywhere in the world! e.g. "dentists" in "paris" or "gyms" in "mumbai". the system will automatically spin up multiple virtual worker minions.
          </p>

          <motion.form 
            animate={{ scale: activeInput ? 1.02 : 1, boxShadow: activeInput ? '8px 8px 0px #000' : 'none' }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onSubmit={(e) => { e.preventDefault(); startScrape(e); }}
            className="flex flex-col md:flex-row items-stretch gap-4 mb-6 relative z-20 bg-white p-2 rounded-xl border-2 border-transparent focus-within:border-red-500 transition-colors"
          >
            
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

            <div className="flex gap-2 w-full md:w-auto">
              {loading ? (
                <button 
                  type="button" 
                  onClick={handleMasterStop}
                  className="cartoon-btn px-6 py-3 flex-1 md:flex-none flex items-center justify-center gap-2 text-sm uppercase bg-red-600 text-white hover:bg-red-700 transition-all shadow-[4px_4px_0px_#7f1d1d] active:shadow-[0px_0px_0px_#7f1d1d] active:translate-y-1 animate-pulse"
                >
                  <Square size={16} fill="currentColor" />
                  <span className="font-black tracking-widest">ABORT MISSION</span>
                </button>
              ) : (
                <button 
                  type="submit" 
                  disabled={!categoryQuery || !locationQuery}
                  className={`cartoon-btn flex-1 md:flex-none px-8 py-3 flex items-center justify-center gap-2 text-sm uppercase ${
                    (!categoryQuery || !locationQuery) ? 'opacity-40 cursor-not-allowed bg-gray-200 text-gray-500 shadow-none' : 'cartoon-btn-red text-white'
                  }`}
                >
                  <Play size={16} fill="currentColor" />
                  <span className="font-black">Deploy Minions</span>
                </button>
              )}

              {!loading && (
                <button 
                  type="button"
                  onClick={() => {
                    setCategoryQuery('');
                    setLocationQuery('');
                  }}
                  className="cartoon-btn px-4 py-3 flex items-center justify-center gap-2 text-sm uppercase bg-white text-gray-700 border-2 border-black hover:bg-gray-100 transition-all shadow-[4px_4px_0px_#000]"
                  title="Clear & Next Search"
                >
                  <RefreshCw size={16} />
                  <span className="font-black hidden md:inline">Next Search</span>
                </button>
              )}
            </div>
          </motion.form>
        </div>

        {/* ── LIVE MINION FEED (LOGS) ── */}
        <AnimatePresence>
          {logs && logs.length > 0 && showLog && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="cartoon-card bg-black p-4 overflow-hidden shadow-[4px_4px_0px_#f87171]">
              <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
                <h3 className="font-display font-black text-green-400 text-sm flex items-center gap-2">
                  <Activity size={14} className="animate-pulse" /> Live Minion Feed 
                </h3>
                <button onClick={() => setShowLog(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>
              <div className="h-32 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-1.5 pr-2 flex flex-col-reverse">
                {logs.slice().reverse().map((log, i) => (
                  <div key={i} className={`flex items-start gap-2 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-gray-300'}`}>
                    <span className="text-gray-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
            <div className="flex items-center gap-3">
              <span className="bg-red-500 text-white font-black text-xs border-2 border-black px-3 py-1 rounded-full shadow-[2px_2px_0px_#000]">
                Showing {Math.min(totalLeads, displayedCount)} / {totalLeads} Leads
              </span>
              <AnimatedExcelExport vendors={vendors || []} />
            </div>
          </div>

          {vendors.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-3xl">🏜️</span>
              <p className="text-xs text-gray-500 font-semibold mt-2">No lead items extracted in this session. Start a scan!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="max-h-[400px] overflow-x-auto overflow-y-auto border-2 border-black rounded-xl custom-scrollbar shadow-[3px_3px_0px_#000] bg-white">
                <table className="w-full min-w-[900px] text-left border-collapse whitespace-nowrap">
                  <thead className="bg-amber-100 sticky top-0 z-10 border-b-2 border-black">
                    <tr>
                      <th className="px-4 py-2.5 text-[10px] font-black uppercase text-black border-r-2 border-black tracking-wider">Business Name</th>
                      <th className="px-4 py-2.5 text-[10px] font-black uppercase text-black border-r-2 border-black tracking-wider">Category</th>
                      <th className="px-4 py-2.5 text-[10px] font-black uppercase text-black border-r-2 border-black tracking-wider">Phone</th>
                      <th className="px-4 py-2.5 text-[10px] font-black uppercase text-black border-r-2 border-black tracking-wider">Email</th>
                      <th className="px-4 py-2.5 text-[10px] font-black uppercase text-black border-r-2 border-black tracking-wider">City/Loc</th>
                      <th className="px-4 py-2.5 text-[10px] font-black uppercase text-black tracking-wider">Socials</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black">
                    {vendors.slice(0, displayedCount).map((lead, idx) => (
                      <tr key={idx} 
                        onClick={() => setSelectedVendor(lead)}
                        className="hover:bg-amber-50 cursor-pointer transition-colors bg-white group"
                      >
                        <td className="px-4 py-3 border-r-2 border-black text-xs font-black text-black flex items-center gap-3">
                          <img src={lead.avatar || lead.images?.[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(lead.name || 'V')}&background=ede9fe&color=7c3aed`} 
                               alt={lead.name} 
                               className="w-8 h-8 rounded-lg border-2 border-black object-cover flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate group-hover:text-amber-600 transition-colors">{lead.name}</p>
                            {lead.rating && (
                              <span className="text-[9px] font-bold text-amber-600 flex items-center gap-0.5 mt-0.5">
                                <Star size={8} fill="currentColor" /> {lead.rating}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r-2 border-black text-xs font-semibold text-gray-700">
                          <span className="bg-gray-100 border-2 border-black px-1.5 py-0.5 rounded text-[9px] uppercase font-black text-black">{lead.category}</span>
                        </td>
                        <td className="px-4 py-3 border-r-2 border-black text-xs font-black text-green-700">
                          {lead.phone ? lead.phone : <span className="text-gray-300 font-normal">N/A</span>}
                        </td>
                        <td className="px-4 py-3 border-r-2 border-black text-xs font-black text-blue-700">
                          {lead.email ? lead.email : <span className="text-gray-300 font-normal">N/A</span>}
                        </td>
                        <td className="px-4 py-3 border-r-2 border-black text-xs font-bold text-gray-700">
                          {lead.city || lead.location || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-xs flex items-center gap-2">
                          {lead.website && <Globe size={13} className="text-gray-500 hover:text-amber-600" />}
                          {lead.instagram && <span className="text-pink-600 font-black text-[9px] border-2 border-black px-1.5 py-0.5 rounded bg-pink-100 shadow-[1px_1px_0px_#000]">IG</span>}
                          {lead.facebook && <span className="text-blue-600 font-black text-[9px] border-2 border-black px-1.5 py-0.5 rounded bg-blue-100 shadow-[1px_1px_0px_#000]">FB</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

      {/* ── VENDOR DETAIL PANEL ── */}
      <AnimatePresence>
        {selectedVendor && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedVendor(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-card max-w-lg w-full shadow-2xl overflow-hidden rounded-3xl" style={{ background: 'rgba(6,8,18,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}>
              
              <div className="p-6 flex items-start justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(109,40,217,0.2))', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>
                    {selectedVendor.name?.[0] || '?'}
                  </div>
                  <div>
                    <h3 className="font-black text-white text-lg leading-tight">{selectedVendor.name}</h3>
                    <p className="text-sm font-semibold mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{selectedVendor.category} · {selectedVendor.city || selectedVendor.location || 'India'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedVendor(null)} className="p-2 rounded-xl transition-all hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {/* Images Carousel */}
                {selectedVendor.images && selectedVendor.images.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Extracted Photos</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x">
                      {selectedVendor.images.map((img, idx) => (
                        <img key={idx} src={img} alt={`Business ${idx}`} className="w-28 h-20 rounded-xl object-cover flex-shrink-0 snap-start border border-white/10 shadow-md" />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <ContactRow icon={<TrendingUp size={15} />} label="Lead Score" value={`${selectedVendor.qualityScore || 50}%`} color="green" />
                    <ContactRow icon={<Database size={15} />} label="Quality Tier" value={selectedVendor.tier || 'Standard'} color="violet" />
                  </div>

                  {selectedVendor.phone && <ContactRow icon={<Phone size={15} />} label="Direct Phone" value={selectedVendor.phone} color="green" />}
                  {selectedVendor.email && <ContactRow icon={<Mail size={15} />} label="Email Address" value={selectedVendor.email} color="blue" />}
                  {selectedVendor.website && <ContactRow icon={<Globe size={15} />} label="Website" value={selectedVendor.website} color="indigo" />}
                  
                  {(selectedVendor.instagramFollowers || selectedVendor.facebookFollowers) && (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedVendor.instagram && <ContactRow icon={<Camera size={15} />} label="IG Followers" value={selectedVendor.instagramFollowers || 'Connected'} color="pink" />}
                      {selectedVendor.facebook && <ContactRow icon={<Users size={15} />} label="FB Followers" value={selectedVendor.facebookFollowers || 'Connected'} color="blue" />}
                    </div>
                  )}

                  {selectedVendor.googleMapsLink && (
                    <a href={selectedVendor.googleMapsLink} target="_blank" rel="noreferrer" className="block hover:scale-[1.01] transition-transform">
                      <ContactRow icon={<Map size={15} />} label="Google Maps Link" value="Click to view on Map" color="amber" />
                    </a>
                  )}

                  {selectedVendor.address && <ContactRow icon={<MapPin size={15} />} label="Exact Address" value={selectedVendor.address} color="gray" />}

                  <div className="grid grid-cols-2 gap-3">
                    <ContactRow icon={<Database size={15} />} label="Source" value={selectedVendor.source || 'Google Maps Engine'} color="gray" />
                    <ContactRow icon={<RefreshCw size={15} />} label="Scraped Date" value={selectedVendor.scrapedAt ? new Date(selectedVendor.scrapedAt).toLocaleDateString() : 'N/A'} color="gray" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {selectedVendor.pincode && <ContactRow icon={<MapPin size={15} />} label="Postal Pincode" value={selectedVendor.pincode} color="gray" />}
                    {(selectedVendor.latitude && selectedVendor.longitude) && (
                      <ContactRow icon={<MapPin size={15} />} label="Coordinates" value={`${Number(selectedVendor.latitude).toFixed(4)}, ${Number(selectedVendor.longitude).toFixed(4)}`} color="gray" />
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                <button onClick={() => { handleVerify(selectedVendor.id, !selectedVendor.verified); setSelectedVendor(null); }}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
                  <CheckCircle2 size={15} /> {selectedVendor.verified ? 'Unverify Lead' : 'Verify Lead'}
                </button>
                <button onClick={() => { handleDelete(selectedVendor.id); setSelectedVendor(null); }}
                  className="px-4 py-3 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20">
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ContactRow({ icon, label, value, color }) {
  const colorMap = {
    green: { bg: 'rgba(16,185,129,0.1)', text: '#34d399', border: 'rgba(16,185,129,0.2)' },
    blue: { bg: 'rgba(59,130,246,0.1)', text: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
    pink: { bg: 'rgba(236,72,153,0.1)', text: '#f472b6', border: 'rgba(236,72,153,0.2)' },
    indigo: { bg: 'rgba(99,102,241,0.1)', text: '#818cf8', border: 'rgba(99,102,241,0.2)' },
    amber: { bg: 'rgba(245,158,11,0.1)', text: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
    violet: { bg: 'rgba(139,92,246,0.1)', text: '#a78bfa', border: 'rgba(139,92,246,0.2)' },
    gray: { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.7)', border: 'rgba(255,255,255,0.1)' },
  };
  const theme = colorMap[color] || colorMap.gray;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:bg-white/[0.08]" style={{ background: theme.bg, color: theme.text, borderColor: theme.border }}>
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-wider opacity-60">{label}</p>
        <p className="text-sm font-semibold truncate text-white">{value}</p>
      </div>
    </div>
  );
}

function AnimatedExcelExport({ vendors }) {
  const [exportState, setExportState] = useState('idle');

  const handleExport = async () => {
    if (vendors.length === 0) return;
    setExportState('processing');

    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Leads CRM', { views: [{ state: 'frozen', ySplit: 1 }] });

      sheet.columns = [
        { header: 'Business Name', key: 'name', width: 35 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'City', key: 'city', width: 20 },
        { header: 'Phone', key: 'phone', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Address', key: 'address', width: 45 },
        { header: 'Rating', key: 'rating', width: 10 },
        { header: 'Website', key: 'website', width: 35 },
        { header: 'Instagram', key: 'instagram', width: 35 },
        { header: 'Facebook', key: 'facebook', width: 35 },
        { header: 'Maps Link', key: 'maps', width: 40 },
        { header: 'Quality Score', key: 'score', width: 15 },
        { header: 'Lead Status', key: 'status', width: 15 }
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 30;

      vendors.forEach((v, index) => {
        const row = sheet.addRow({
          name: v.name,
          category: v.category,
          city: v.city,
          phone: v.phone && !v.phone.includes('Requires') ? v.phone : '',
          email: v.email || '',
          address: v.address || '',
          rating: v.rating || '',
          website: v.website || '',
          instagram: v.instagram || '',
          facebook: v.facebook || '',
          maps: v.mapsLink || '',
          score: v.qualityScore || '',
          status: v.crmStatus || 'New'
        });

        if (index % 2 !== 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        }
        row.alignment = { vertical: 'middle', wrapText: true };
      });

      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Premium_Leads_CRM_${new Date().toISOString().slice(0,10)}.xlsx`);

      setExportState('success');
      setTimeout(() => setExportState('idle'), 3000);
    } catch (e) {
      console.error(e);
      setExportState('idle');
    }
  };

  return (
    <button onClick={handleExport} disabled={exportState === 'processing'}
      className="relative flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold text-white overflow-hidden transition-all shadow-[2px_2px_0px_#000] border-2 border-black"
      style={{ background: exportState === 'success' ? '#10b981' : '#7c3aed' }}>
      <AnimatePresence mode="wait">
        {exportState === 'idle' && (
          <motion.div key="idle" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="flex items-center gap-2">
            <Download size={13} /> Export Excel
          </motion.div>
        )}
        {exportState === 'processing' && (
          <motion.div key="processing" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="flex items-center gap-2">
            <RefreshCw size={13} className="animate-spin" /> Formatting...
          </motion.div>
        )}
        {exportState === 'success' && (
          <motion.div key="success" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="flex items-center gap-2">
            <CheckCircle2 size={13} /> Downloaded!
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
