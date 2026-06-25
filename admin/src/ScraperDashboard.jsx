import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Search, Play, Square, Download, RefreshCw, ChevronDown, ChevronUp, Star, Phone, 
  MapPin, Link2, Mail, CheckCircle2, XCircle, Filter, Activity, Clock,
  Trash2, Database, Upload, Users, ShieldAlert, FileOutput, ArrowRight, BrainCircuit,
  Building2, Camera, Music, Utensils, Flower2, Zap, FolderOpen, X, Settings, 
  Share, Menu, ServerCrash, Check, Send, LogOut, Image, MessageCircle, Briefcase,
  Smartphone, Cloud, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';
import debounce from 'lodash.debounce';

import { ScraperContext } from './context/ScraperContext';
import DashboardLayout from './layouts/DashboardLayout';

import SemanticWorker from './semanticWorker?worker';
import { API_URL } from './apiConfig';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-red-500 bg-[#0a0a0a] min-h-screen">
          <h2 className="text-xl font-medium mb-4">Dashboard encountered an error.</h2>
          <details className="whitespace-pre-wrap text-sm text-red-400/80 bg-red-500/10 p-6 rounded-lg border border-red-500/20">
            {this.state.error && this.state.error.toString()}
            <br /><br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children; 
  }
}

const CATEGORY_META = {
  'Banquet Hall': { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', icon: Building2 },
  'Photographer': { color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)', icon: Camera },
  'DJ': { color: '#ec4899', bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.2)', icon: Music },
  'Caterer': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: Utensils },
  'Florist': { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', icon: Flower2 },
  'Decorator': { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)', icon: Zap },
};

function getCategoryMeta(cat) {
  const key = Object.keys(CATEGORY_META).find(k => cat?.toLowerCase().includes(k.toLowerCase()));
  return CATEGORY_META[key] || { color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', icon: MapPin };
}

// Clean Vendor Card
function VendorCard({ vendor, index, employees, onVerify, onDelete, onAssign }) {
  const [expanded, setExpanded] = useState(false);
  const meta = getCategoryMeta(vendor.category);
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
      className="rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer overflow-hidden group"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex">
        {/* Verification Status Indicator */}
        <div className="w-1 shrink-0" style={{ background: vendor.verified ? meta.color : 'transparent' }} />
        
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border" style={{ background: meta.bg, borderColor: meta.border }}>
                <Icon size={18} style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white text-sm leading-tight truncate">{vendor.name}</h3>
                  {vendor.tier === 'Premium' && (
                    <span className="text-[10px] uppercase font-bold bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20">
                      PREMIUM
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-white/50">{vendor.category}</span>
                  <span className="text-xs text-white/20">•</span>
                  <span className="text-xs text-white/50 truncate">{vendor.city}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {vendor.qualityScore > 0 && (
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Score</span>
                  <span className={`text-xs font-medium leading-none ${vendor.qualityScore >= 80 ? 'text-yellow-500' : vendor.qualityScore >= 50 ? 'text-blue-500' : 'text-gray-400'}`}>
                    {vendor.qualityScore}
                  </span>
                </div>
              )}
              {vendor.rating && (
                <span className="text-xs text-white/50 flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                  <Star size={12} className="text-yellow-500" fill="currentColor" /> {vendor.rating}
                </span>
              )}
              {vendor.aiVerified && (
                <span className="text-xs text-purple-400 flex items-center gap-1 bg-purple-500/10 px-2 py-1 rounded-md border border-purple-500/20" title={`AI Semantic Verification Passed. Matched: ${vendor.matchedKeywords?.join(', ')}`}>
                  <BrainCircuit size={12} /> AI Verified
                </span>
              )}
              {vendor.verified && !vendor.pushed && <CheckCircle2 size={16} className="text-blue-500" />}
              {vendor.pushed && <Database size={16} className="text-green-500" />}
              <ChevronDown size={16} className={`text-white/30 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {/* Quick Info Tags */}
          <div className="mt-3 flex flex-wrap gap-2">
            {vendor.phone && !vendor.phone.includes('Requires') && (
              <span className="flex items-center gap-1.5 text-xs text-white/70 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                <Phone size={12} className="text-white/40" /> {vendor.phone}
              </span>
            )}
            {vendor.website && (
              <a href={vendor.website} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded-md border border-blue-500/20 transition-colors">
                <Link2 size={12} /> Website
              </a>
            )}
            {vendor.email && (
              <span className="flex items-center gap-1.5 text-xs text-white/70 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                <Mail size={12} className="text-white/40" /> {vendor.email}
              </span>
            )}
            {vendor.instagram && (
              <a href={vendor.instagram} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 text-xs text-pink-400 bg-pink-500/10 hover:bg-pink-500/20 px-2 py-1 rounded-md border border-pink-500/20 transition-colors">
                <Link2 size={12} /> {vendor.instagramFollowers ? `${vendor.instagramFollowers}` : 'Instagram'}
              </a>
            )}
            {vendor.facebook && (
              <a href={vendor.facebook} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded-md border border-blue-500/20 transition-colors">
                <Link2 size={12} /> {vendor.facebookFollowers ? `${vendor.facebookFollowers} (FB)` : 'Facebook'}
              </a>
            )}
          </div>

          {/* Expanded Details */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                  {vendor.address && (
                    <div className="flex items-start gap-2 text-sm text-white/60">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-white/40" />
                      <span>{vendor.address}</span>
                    </div>
                  )}
                  {vendor.operatingHours && (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Clock size={14} className="text-white/40" />
                      <span>{vendor.operatingHours}</span>
                    </div>
                  )}
                  
                  {/* Actions */}
                  {!vendor.pushed && (
                    <div className="flex gap-2 pt-2" onClick={e => e.stopPropagation()}>
                      <select
                        onChange={(e) => onAssign(vendor.id, e.target.value)}
                        value={vendor.assignedTo || ''}
                        className="flex-1 px-3 py-2 bg-black border border-white/10 rounded-lg text-sm text-white/80 focus:outline-none focus:border-white/20 transition-colors"
                      >
                        <option value="">Assign to team member...</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => onVerify(vendor.id, vendor)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all border ${vendor.verified ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-white text-black border-white hover:bg-white/90'}`}
                      >
                        {vendor.verified ? 'Verified ✓' : 'Mark Verified'}
                      </button>
                      <button
                        onClick={() => onDelete(vendor.id)}
                        className="px-3 py-2 rounded-lg text-sm bg-red-500/5 text-red-400 border border-red-500/10 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// Clean Minimal Folder
function FolderCard({ category, vendors, onClick, onExport, isActive, onSettingsClick }) {
  const meta = getCategoryMeta(category);
  const count = vendors.length;

  return (
    <div
      className="relative cursor-pointer group bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all hover:border-white/10 overflow-hidden"
      onClick={() => onClick(category)}
    >
      <div 
        onClick={(e) => { e.stopPropagation(); onSettingsClick(category); }}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 text-white/30 hover:text-white hover:bg-white/10 z-20 transition-all opacity-0 group-hover:opacity-100 border border-white/10"
      >
        <Settings size={14} />
      </div>

      {isActive && (
        <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500 animate-pulse" />
      )}
      
      <div className="p-5 h-32 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="p-2.5 rounded-xl border" style={{ background: meta.bg, borderColor: meta.border }}>
            <FolderOpen size={20} style={{ color: meta.color }} />
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onExport(category, vendors); }}
            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
            title={`Download ${category} CSV`}
          >
            <Download size={16} />
          </button>
        </div>
        
        <div>
          <h3 className="font-medium text-white text-sm truncate">{category}</h3>
          <p className="text-xs mt-1 text-white/40 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
            {count} Leads
          </p>
        </div>
      </div>
    </div>
  );
}

function ScraperDashboard({ user, onLogout }) {
  const [vendors, setVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [activeInput, setActiveInput] = useState(null);
  const activeInputRef = useRef(activeInput);
  useEffect(() => { activeInputRef.current = activeInput; }, [activeInput]);
  const [searchScope, setSearchScope] = useState('full');
  const [searchSessionStart, setSearchSessionStart] = useState(0);
  const [searchHistory, setSearchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gomandap_search_history') || '[]'); } catch { return []; }
  });
  const [activeTab, setActiveTab] = useState('staging-phones');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [knowledge, setKnowledge] = useState({ categories: [], locations: [] });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [logs, setLogs] = useState([
    `[INFO] Scraper service initialized.`,
    `[INFO] Awaiting tasks...`
  ]);
  const [sseStatus, setSseStatus] = useState('disconnected'); // disconnected | connecting | open | error
  const [logLevel, setLogLevel] = useState('ALL'); // ALL | INFO | WARN | ERROR | DEBUG
  const eventSourceRef = useRef(null);
  const [enabledEngines, setEnabledEngines] = useState(['maps', 'instagram', 'facebook', 'youtube', 'pinterest', 'linkedin']);
  const [searchProgress, setSearchProgress] = useState(null);
  
  const [activeJobs, setActiveJobs] = useState([]);
  const [selectedJobCategory, setSelectedJobCategory] = useState(null);
  const [backendConnected, setBackendConnected] = useState(true);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [showDirectory, setShowDirectory] = useState(false);
  const [modelLoadingStatus, setModelLoadingStatus] = useState({ status: 'idle', progress: 0 });
  const [fuseInstances, setFuseInstances] = useState({ categories: null, locations: null });
  const [gridPoints, setGridPoints] = useState([]);
  const [activePoints, setActivePoints] = useState([]); // Track currently searching points
  const [publicUsers, setPublicUsers] = useState([]);
  const [outOfBoundsVendors, setOutOfBoundsVendors] = useState([]);
  const prevVendorsCount = useRef(0);
  const terminalRef = useRef(null);
  const workerRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Live Backend Logs via Server-Sent Events (SSE)
  useEffect(() => {
    setSseStatus('connecting');
    let es;
    try {
      es = new EventSource(`${API_URL}/logs/stream`);
      eventSourceRef.current = es;
      es.addEventListener('open', () => setSseStatus('open'));
      es.addEventListener('error', () => setSseStatus('error'));
      es.addEventListener('init', (e) => {
        try { const arr = JSON.parse(e.data); if (Array.isArray(arr)) setLogs(arr); } catch(err) { /* ignore parse error */ }
      });
      es.addEventListener('vendor', (e) => {
        try {
          const { action, vendor } = JSON.parse(e.data);
          if (!vendor) return;
          if (action === 'out-of-bounds') {
            setOutOfBoundsVendors(prev => {
              if (prev.some(v => v.id === vendor.id)) return prev;
              return [vendor, ...prev];
            });
          } else {
            setVendors(prev => {
              if (prev.some(v => v.id === vendor.id || (vendor.phone && v.phone === vendor.phone))) return prev;
              return [vendor, ...prev];
            });
          }
        } catch (err) { /* ignore */ }
      });
      es.addEventListener('grid_points', (e) => {
        try {
          const coords = JSON.parse(e.data);
          if (Array.isArray(coords)) setGridPoints(coords);
        } catch (err) { /* ignore */ }
      });
      es.addEventListener('dispatch_targets', (e) => {
        try {
          const targets = JSON.parse(e.data);
          if (Array.isArray(targets) && targets.length > 0) {
            toast.success(`Dispatching jobs to ${targets.length} targets:\n${targets.slice(0, 5).join(', ')}${targets.length > 5 ? '...' : ''}`, {
              duration: 6000,
              icon: '🗺️',
              style: { minWidth: '300px' }
            });
          }
        } catch (err) { /* ignore */ }
      });
      es.addEventListener('active_point', (e) => {
        try {
          const pt = JSON.parse(e.data);
          setActivePoints(prev => {
            // Keep the last 5 active points (or matching concurrency limit)
            const filtered = prev.filter(p => p.instanceId !== pt.instanceId);
            return [pt, ...filtered].slice(0, 20);
          });
        } catch (err) { /* ignore */ }
      });
      es.addEventListener('progress', (e) => {
        try {
          const progressData = JSON.parse(e.data);
          setSearchProgress(progressData);
        } catch (err) { /* ignore */ }
      });
      // Buffer logs to prevent React from freezing due to massive re-renders
      const logBuffer = [];
      const logInterval = setInterval(() => {
        if (logBuffer.length > 0) {
          setLogs(prev => {
            const next = [...prev, ...logBuffer];
            return next.slice(-200);
          });
          logBuffer.length = 0; // clear buffer
          
          // auto-scroll
          setTimeout(() => {
            if (terminalRef.current) {
              terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
            }
          }, 50);
        }
      }, 500);

      es.onmessage = (e) => {
        try {
          logBuffer.push(e.data);
        } catch (err) { /* ignore */ }
      };
      es.onerror = () => {
        setSseStatus('error');
        // EventSource will attempt automatic reconnects; keep the instance
      };
    } catch (err) {
      setSseStatus('error');
      // If EventSource isn't available, fallback to polling
      let interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_URL}/logs`);
          if (res.data && Array.isArray(res.data)) setLogs(res.data);
        } catch (e) { console.warn('Log polling failed', e.message); }
      }, 2000);
      return () => { clearInterval(interval); if (typeof logInterval !== 'undefined') clearInterval(logInterval); };
    }
    return () => { 
      try { 
        if (typeof logInterval !== 'undefined') clearInterval(logInterval);
        es && es.close(); 
        eventSourceRef.current = null; 
      } catch (e) { /* ignore close error */ } 
    };
  }, []);

  // Proactive AI Guidance Toast (Idle for 60s)
  useEffect(() => {
    let timeout;
    const resetIdle = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (knowledge.categories && knowledge.categories.length > 0 && knowledge.locations && knowledge.locations.length > 0) {
           const randCat = knowledge.categories[Math.floor(Math.random() * knowledge.categories.length)];
           const locs = knowledge.locations.filter(l => l.type === 'district');
           if (locs.length > 0) {
             const randLoc = locs[Math.floor(Math.random() * locs.length)].name;
             toast(`AI Suggestion: Try searching for "${randCat} in ${randLoc}"`, { 
               icon: '💡', 
               duration: 6000,
               style: { background: '#1e1e1e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
             });
           }
        }
      }, 60000);
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    resetIdle();
    
    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      clearTimeout(timeout);
    };
  }, [knowledge]);

  useEffect(() => {
    // Initialize Web Worker for Semantic Search
    workerRef.current = new SemanticWorker();
    
    workerRef.current.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.status === 'progress') {
        setModelLoadingStatus({ status: 'loading', progress: msg.progress });
      } else if (msg.status === 'ready') {
        setModelLoadingStatus({ status: 'ready', progress: 100 });
      } else if (msg.status === 'index_ready') {
        console.log('Semantic Index Ready with', msg.count, 'items');
      } else if (msg.status === 'search_results') {
        const topMatches = msg.results.filter(r => r.score > 0.35);
        
        let topSuggestions = [];
        
        if (msg.locationPart) {
          topSuggestions = topMatches.map(r => r.text + ' ' + msg.separator + ' ' + msg.locationPart);
          // Auto-correct the input box if confidence is extremely high on a long sentence
          if (topMatches.length > 0 && topMatches[0].score > 0.4 && msg.text !== topMatches[0].text) {
             const assembledQuery = topMatches[0].text + ' ' + msg.separator + ' ' + msg.locationPart;
             // removed setOmniQuery
          }
        } else {
          topSuggestions = topMatches.map(r => (msg.prefix || '') + r.text);
          if (!msg.prefix && topMatches.length > 0 && topMatches[0].type === 'category') {
            topSuggestions.unshift(`${topMatches[0].text} in `);
          }
        }

        const currentQueryLower = (activeInputRef.current === 'category' ? categoryQuery : locationQuery).toLowerCase();
        let historyData = [];
        try {
          historyData = JSON.parse(localStorage.getItem('gomandap_search_history') || '[]');
        } catch(e) {
          // Search history suggestions are optional.
        }
        
        const matchingHistory = historyData.filter(h => h.toLowerCase().includes(currentQueryLower) && currentQueryLower.length > 0);

        if (activeInputRef.current === 'category') {
          setSuggestions(prev => {
            // Merge history, exact fuzzy matches (prev), and semantic AI matches
            return [...new Set([...matchingHistory, ...prev, ...topSuggestions])].slice(0, 10);
          });
          setShowSuggestions(true);
        }
      }
    });

    fetchVendors();
    fetchEmployees();
    fetchKnowledge();
    const poll = setInterval(() => {
      fetchVendors().catch(() => setBackendConnected(false));
    }, 3000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchKnowledge() {
    try {
      const res = await axios.get(`${API_URL}/knowledge`);
      setKnowledge(res.data);
      
      const docs = [];
      res.data.categories.forEach(c => docs.push({ text: c, type: 'category' }));
      res.data.locations.forEach(l => docs.push({ text: l.name, type: 'location' }));
      
      const catFuse = new Fuse(res.data.categories, { includeScore: true, threshold: 0.4 });
      const locFuse = new Fuse(res.data.locations.map(l => l.name), { includeScore: true, threshold: 0.4 });
      setFuseInstances({ categories: catFuse, locations: locFuse });
      
      if (workerRef.current) {
        workerRef.current.postMessage({ action: 'build_index', knowledgeBase: docs });
      }
    } catch (e) { console.error('Failed to fetch knowledge base', e); }
  }

  const handleCategoryChange = (val) => {
    setCategoryQuery(val);
    if (!val.trim()) {
      if (searchHistory.length > 0) {
        setSuggestions(searchHistory);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      return;
    }

    if (val.trim().length < 2 || !workerRef.current) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    let immediateSuggestions = [];
    if (fuseInstances.categories) {
      const results = fuseInstances.categories.search(val);
      immediateSuggestions = results.map(r => r.item).slice(0, 5);
    }

    setSuggestions(immediateSuggestions);
    if (immediateSuggestions.length > 0) setShowSuggestions(true);
    setSuggestionIndex(-1);

    if (workerRef.current && modelLoadingStatus.status === 'ready') {
      workerRef.current.postMessage({
        action: 'search',
        text: val,
        prefix: '',
        locationPart: null,
        separator: null,
        id: Date.now()
      });
    }

    if (val.trim().length >= 3) {
      debouncedGoogleSearch(val);
    }
  };

  const handleLocationChange = (val) => {
    setLocationQuery(val);
    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    let immediateSuggestions = [];
    if (fuseInstances.locations) {
      const results = fuseInstances.locations.search(val);
      immediateSuggestions = results.map(r => r.item).slice(0, 5);
    }

    setSuggestions(immediateSuggestions);
    if (immediateSuggestions.length > 0) setShowSuggestions(true);
    setSuggestionIndex(-1);

    debouncedOSMSearch(val, '');
  };

  // Blazing Fast 50ms Debounce
  const debouncedGoogleSearch = useRef(debounce(async (val) => {
    try {
      const res = await axios.get(`${API_URL}/suggest`, { params: { q: val } });
      if (res.data && res.data.length > 0) {
        setSuggestions(prev => [...new Set([...prev, ...res.data])].slice(0, 10));
        setShowSuggestions(true);
      }
    } catch (e) { console.warn('Google suggest failed', e.message); }
  }, 50)).current;

  // Blazing Fast 50ms Debounce
  const debouncedOSMSearch = useRef(debounce(async (searchVal, prefix) => {
    try {
      const res = await axios.get(`${API_URL}/location/search`, { params: { q: searchVal } });
      if (res.data && res.data.length > 0) {
        setSuggestions(prev => {
          const newSugs = res.data.map(loc => prefix + loc.name);
          return [...new Set([...prev, ...newSugs])].slice(0, 10);
        });
        setShowSuggestions(true);
      }
    } catch (e) { console.warn('OSM search failed', e.message); }
  }, 50)).current;

  const handleKeyDown = (e) => {
    // Tab / Right Arrow autocomplete
    const query = activeInput === 'category' ? categoryQuery : locationQuery;
    if ((e.key === 'Tab' || e.key === 'ArrowRight') && query && query.length > 0 && suggestions.length > 0) {
      const best = suggestions[0];
      if (best.toLowerCase().startsWith(query.toLowerCase())) {
        e.preventDefault();
        if (activeInput === 'category') setCategoryQuery(best);
        else setLocationQuery(best);
        
        if (best.endsWith(' in ')) {
          setShowSuggestions(false);
        }
        return;
      }
    }

    if (!showSuggestions) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestionIndex >= 0 && suggestionIndex < suggestions.length) {
        if (activeInput === 'category') setCategoryQuery(suggestions[suggestionIndex]);
        else setLocationQuery(suggestions[suggestionIndex]);
        setShowSuggestions(false);
      } else {
        setShowSuggestions(false);
        startScrape(e);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  async function fetchEmployees() {
    try {
      const res = await axios.get(`${API_URL}/employees`);
      setEmployees(res.data);
    } catch (error) { console.error('Failed to fetch employees', error); }
  }

  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${API_URL}/scrape/jobs`);
      setActiveJobs(res.data);
    } catch (error) { console.error('Failed to fetch jobs', error); }
  };

  const [researchData, setResearchData] = useState([]);
  const lastSyncRef = useRef(0);

  async function fetchVendors() {
    try {
      const since = lastSyncRef.current;
      const [vRes, pRes, oRes] = await Promise.all([
        axios.get(`${API_URL}/vendors`, { params: { since } }),
        axios.get(`${API_URL}/public/admin/list`),
        axios.get(`${API_URL}/vendors/out-of-bounds`, { params: { since } })
      ]);
      const newTime = Date.now();
      
      if (since === 0) {
        setVendors(vRes.data);
        setOutOfBoundsVendors(oRes.data);
      } else {
        if (vRes.data.length > 0) {
          setVendors(prev => {
            const merged = [...vRes.data, ...prev];
            const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
            return unique.sort((a,b) => new Date(b.scrapedAt) - new Date(a.scrapedAt));
          });
        }
        if (oRes.data.length > 0) {
          setOutOfBoundsVendors(prev => {
            const merged = [...oRes.data, ...prev];
            const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
            return unique.sort((a,b) => new Date(b.scrapedAt) - new Date(a.scrapedAt));
          });
        }
      }
      
      setPublicUsers(pRes.data);
      setBackendConnected(true);
      lastSyncRef.current = newTime;
    } catch (error) { 
      console.error('Failed to fetch vendors. Network Error details:', error);
      alert('Dashboard Failed to Connect. Check browser console (F12) for exact details. Error: ' + error.message);
      setBackendConnected(false);
    }
  }

  useEffect(() => {
    const intv = setInterval(fetchJobs, 5000);
    return () => clearInterval(intv);
  }, []);

  const handleMasterStop = async () => {
    try {
      await axios.post(`${API_URL}/scrape/stop`);
      toast.success('All tasks terminated.');
      fetchJobs();
      setLoading(false);
      
      // Wipe everything clean for a fresh start
      setLogs([`[INFO] Master stop executed. System wiped clean.`]);
      setVendors([]);
      setActivePoints([]);
      setGridPoints([]);
      setSearchProgress(null);
    } catch (error) {
      toast.error('Failed to stop all tasks');
    }
  };

  const handleUpdateJob = async (category, action, intervalMs) => {
    try {
      await axios.post(`${API_URL}/scrape/jobs/update`, { category, action, intervalMs });
      toast.success(`Job updated successfully.`);
      fetchJobs();
      setSelectedJobCategory(null);
      setLogs(prev => [...prev, `[INFO] Job ${category} -> ${action}`]);
    } catch (error) { toast.error('Failed to update job'); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target.result;
      const rows = csv.split('\n').map(r => r.split(','));
      const tasks = [];
      for (let i = 1; i < rows.length; i++) {
        const cat = rows[i][0]?.trim();
        const loc = rows[i][1]?.trim();
        if (cat && loc) tasks.push({ category: cat, location: loc });
      }
      if (tasks.length > 0) {
        try {
          await axios.post(`${API_URL}/scrape/upload`, { tasks });
          toast.success(`Uploaded ${tasks.length} bulk tasks.`);
          setLogs(prev => [...prev, `[INFO] Bulk queued ${tasks.length} tasks.`]);
        } catch (e) { toast.error('Upload failed'); }
      }
    };
    reader.readAsText(file);
  };

  const startScrape = async (e, overrideCat, overrideLoc) => {
    if (e) e.preventDefault();
    
    const cat = overrideCat !== undefined ? overrideCat : categoryQuery;
    const loc = overrideLoc !== undefined ? overrideLoc : locationQuery;

    if (!cat.trim() || !loc.trim()) {
      return toast.error("Please enter both what you are looking for, and where.");
    }

    if (overrideCat !== undefined) setCategoryQuery(cat);
    if (overrideLoc !== undefined) setLocationQuery(loc);

    const finalQuery = `${cat.trim()} in ${loc.trim()}`;
    const parsedCat = cat.trim();
    const parsedLoc = loc.trim();

    if (!searchHistory.includes(parsedCat)) {
      setSearchHistory(prev => {
        const newHist = [parsedCat, ...prev].slice(0, 5);
        localStorage.setItem('gomandap_search_history', JSON.stringify(newHist));
        return newHist;
      });
    }

    // Wipe everything clean for a fresh start
    setLogs([`[PROCESS] Starting task: ${finalQuery}`]);
    setVendors([]);
    setActivePoints([]);
    setGridPoints([]);
    setSearchProgress(null);
    setSearchSessionStart(Date.now());
    
    try {
      setLoading(true);
      await axios.post(`${API_URL}/scrape/omni`, {
        query: finalQuery,
        category: parsedCat,
        location: parsedLoc,
        strategy: searchScope,
        enabledEngines: enabledEngines
      });
      toast.success('Omni-scrape started! Stream processing engaged.', { icon: '🚀' });
      
      // Trigger Firebase scrape if enabled
      if (enabledEngines.includes('firebase')) {
        axios.post(`${API_URL}/scrape/firebase`, {
          query: finalQuery,
          category: parsedCat,
          location: parsedLoc
        }).catch(err => console.error('[Firebase]', err.message));
      }
      
      setShowSuggestions(false);
      // Removed setOmniQuery(''); so you can search again easily!
    } catch (error) {
      toast.error('Scraper failed to start');
      setLogs(prev => [...prev, `[ERROR] Failed to start task`]);
      setLoading(false);
      if (error.response?.data?.error) toast.error(error.response.data.error);
    }
  };

  const handleVerify = async (id, currentData) => {
    try {
      await axios.put(`${API_URL}/vendors/${id}`, currentData);
      fetchVendors();
      toast.success('Vendor verified!');
    } catch (error) { toast.error('Verification failed'); }
  };

  const handleAssign = async (id, employeeId) => {
    if (!employeeId) return;
    try {
      await axios.post(`${API_URL}/vendors/assign`, { vendorIds: [id], employeeId });
      fetchVendors();
      toast.success('Assigned!');
    } catch (error) { toast.error('Assignment failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/vendors/${id}`);
      fetchVendors();
      toast.success('Deleted');
    } catch (error) { toast.error('Delete failed'); }
  };

  const pushToProd = async () => {
    try {
      const res = await axios.post(`${API_URL}/vendors/push`);
      toast.success(`Pushed ${res.data.pushed} vendors to Production!`);
      fetchVendors();
    } catch (_) { toast.error('Error pushing to production.'); }
  };

  const clearQueue = async () => {
    if (window.confirm('Clear all unverified vendors?')) {
      try {
        await axios.post(`${API_URL}/vendors/clear-unverified`);
        fetchVendors();
        toast.success('Queue cleared');
      } catch (_) { toast.error('Failed to clear queue'); }
    }
  };

  const triggerPython = async (query, location) => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/scrape/python`, { query, location });
      toast.success('Python script executing in background!', { icon: '🐍' });
    } catch (err) {
      toast.error('Python script failed to start');
    } finally {
      setLoading(false);
    }
  };

  const triggerCheerio = async (engine, category, location) => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/scrape/cheerio`, { engine, category, location });
      toast.success(`${engine} Cheerio scraper started!`, { icon: '🌐' });
    } catch (err) {
      toast.error('Cheerio scraper failed to start');
    } finally {
      setLoading(false);
    }
  };

  const triggerMaps = async (query, category, location, radius) => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/scrape/maps`, { query, category, location, radius });
      toast.success('Google Maps scraper started!', { icon: '📍' });
    } catch (err) {
      toast.error('Maps scraper failed to start');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    const dataToExport = activeTab === 'staging-phones' ? stagingVendorsWithPhones : (activeTab === 'staging-nophones' ? stagingVendorsNoPhones : liveVendors);
    if (dataToExport.length === 0) return toast.error('No data to export');
    const groups = {};
    dataToExport.forEach(v => {
      const key = `${v.category.replace(/[^a-zA-Z0-9]/g, '_')}_${v.city.replace(/[^a-zA-Z0-9]/g, '_')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(v);
    });
    const zip = new JSZip();
    Object.keys(groups).forEach(key => {
      const csvData = Papa.unparse(groups[key].map(v => ({
        ID: v.id, Name: v.name, Category: v.category, City: v.city,
        Address: v.address, Phone: v.phone && v.phone.startsWith('+91') ? `'${v.phone}` : v.phone,
        Rating: v.rating, Email: v.email || '', Instagram: v.instagram || '',
        GoogleMapsLink: v.mapsLink || '', AssignedTo: v.assignedTo || 'Unassigned', CRMStatus: v.crmStatus || 'New'
      })));
      zip.file(`Export/${key}_leads.csv`, csvData);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `gomandap_${activeTab}_leads.zip`);
    toast.success('Export downloaded!');
  };

  const exportCategoryCSV = (categoryName, catVendors) => {
    if (!catVendors || catVendors.length === 0) return toast.error('No data in this folder');
    const csvData = Papa.unparse(catVendors.map(v => ({
      ID: v.id, Name: v.name, Category: v.category, City: v.city,
      Address: v.address, Phone: v.phone && v.phone.startsWith('+91') ? `'${v.phone}` : v.phone,
      Rating: v.rating, Email: v.email || '', Instagram: v.instagram || '',
      GoogleMapsLink: v.mapsLink || '', AssignedTo: v.assignedTo || 'Unassigned', CRMStatus: v.crmStatus || 'New'
    })));
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `gomandap_${categoryName.replace(/[^a-zA-Z0-9]/g, '_')}_leads.csv`);
    toast.success(`${categoryName} CSV downloaded!`);
  };

  const stagingVendors = vendors.filter(v => !v.pushed).reverse();
  const stagingVendorsWithPhones = stagingVendors.filter(v => v.phone && v.phone.length > 5 && !v.phone.includes('Requires'));
  const stagingVendorsNoPhones = stagingVendors.filter(v => !v.phone || v.phone.length <= 5 || v.phone.includes('Requires'));
  const liveVendors = vendors.filter(v => v.pushed).reverse();
  const verifiedCount = stagingVendors.filter(v => v.verified).length;

  const displayedVendors = activeTab === 'staging' ? stagingVendors
    : activeTab === 'out-of-bounds' ? outOfBoundsVendors
    : activeTab === 'pushed' ? liveVendors
    : stagingVendors; // default fallback

  // Unified staging tab handles everything now.

  const deferredSearchFilter = React.useDeferredValue(searchFilter);

  const cities = ['All', ...new Set(displayedVendors.map(v => v.city).filter(Boolean))];
  const filteredVendors = displayedVendors.filter(v => {
    if (selectedCity !== 'All' && v.city !== selectedCity) return false;
    if (!deferredSearchFilter) return true;
    
    const term = deferredSearchFilter.toLowerCase();
    return (
      v.name?.toLowerCase().includes(term) ||
      v.category?.toLowerCase().includes(term) ||
      v.city?.toLowerCase().includes(term) ||
      v.phone?.includes(term)
    );
  });

  const grouped = filteredVendors.reduce((acc, v) => {
    const key = (v.city && v.city !== 'Global') ? `${v.category || 'Uncategorized'} in ${v.city}` : (v.category || 'Uncategorized');
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  if (activeCategory && !grouped[activeCategory]) {
    grouped[activeCategory] = [];
  }

  // Provide all scraping state/actions to sub-pages via context
  const contextValue = React.useMemo(() => ({
    // Data
    vendors, setVendors,
    loading, setLoading,
    logs, setLogs,
    sseStatus,
    logLevel, setLogLevel,
    // Search
    categoryQuery, setCategoryQuery,
    locationQuery, setLocationQuery,
    activeInput, setActiveInput,
    searchScope, setSearchScope,
    searchSessionStart,
    handleCategoryChange, handleLocationChange,
    enabledEngines, setEnabledEngines,
    suggestions, setSuggestions,
    showSuggestions, setShowSuggestions,
    suggestionIndex, setSuggestionIndex,
    searchHistory, setSearchHistory,
    showDirectory, setShowDirectory,
    knowledge,
    // Category & Tab
    activeCategory, setActiveCategory,
    activeTab, setActiveTab,
    // People
    employees, fetchEmployees,
    // Vendor lists (computed)
    stagingVendorsWithPhones,
    stagingVendorsNoPhones,
    liveVendors,
    outOfBoundsVendors,
    verifiedCount,
    grouped,
    filteredVendors,
    displayedVendors: displayedVendors ?? [],
    cities,
    selectedCity, setSelectedCity,
    searchFilter, setSearchFilter,
    // Jobs
    activeJobs,
    selectedJobCategory, setSelectedJobCategory,
    selectedFolder, setSelectedFolder,
    // Model
    modelLoadingStatus,
    activePoints,
    searchProgress, setSearchProgress,
    // Actions
    fetchVendors,
    startScrape,
    handleMasterStop,
    pushToProd,
    clearQueue,
    exportToCSV,
    exportCategoryCSV,
    handleVerify,
    handleDelete,
    handleAssign,
    handleFileUpload,
    handleUpdateJob,
    handleKeyDown,
    triggerPython,
    triggerCheerio,
    triggerMaps,
    // Refs
    searchContainerRef,
    terminalRef,
    gridPoints,
    // Auth
    onLogout,
    user,
  }), [
    vendors, loading, logs, sseStatus, logLevel,
    categoryQuery, locationQuery, activeInput, searchScope, searchSessionStart, enabledEngines,
    suggestions, showSuggestions, suggestionIndex, searchHistory, showDirectory, knowledge,
    activeCategory, activeTab, employees, stagingVendorsWithPhones, stagingVendorsNoPhones,
    liveVendors, outOfBoundsVendors, verifiedCount, grouped, filteredVendors, displayedVendors,
    cities, selectedCity, searchFilter, activeJobs, selectedJobCategory, selectedFolder,
    modelLoadingStatus, activePoints, gridPoints, user, searchProgress
  ]);

  if (!backendConnected) {
    return (
      <div className="min-h-screen text-white font-sans bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6">
          <ServerCrash size={32} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-medium mb-3">Backend Not Connected</h2>
        <p className="text-white/50 max-w-md mb-8">
          The Gomandap Scraper API could not be reached at <code className="bg-white/10 px-1.5 py-0.5 rounded mx-1">{API_URL}</code>.<br/><br/>
          Please make sure you have started the dedicated scraper server by running <code className="bg-white/10 px-1.5 py-0.5 rounded text-blue-400">npm start</code> inside the <code className="bg-white/10 px-1.5 py-0.5 rounded">gomandap-scraper/server</code> directory.
        </p>
        <button onClick={() => fetchVendors()} className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 flex items-center gap-2">
          <RefreshCw size={16} /> Try Reconnecting
        </button>
      </div>
    );
  }

  return (
    <ScraperContext.Provider value={contextValue}>
      <DashboardLayout user={user} onLogout={onLogout} />
    </ScraperContext.Provider>
  );
}

export default function ScraperDashboardWrapper(props) {
  return (
    <ErrorBoundary>
      <ScraperDashboard {...props} />
    </ErrorBoundary>
  );
}
