import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Search, Play, Square, Download, RefreshCw, ChevronDown, ChevronUp, Star, Phone, 
  MapPin, Link2, Mail, CheckCircle2, XCircle, Filter, Activity, 
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

                  {vendor.images && vendor.images.length > 0 && (
                    <div className="flex overflow-x-auto gap-2 pb-2 mt-2" style={{ scrollbarWidth: 'thin' }}>
                      {vendor.images.map((img, idx) => (
                        <img key={idx} src={img} alt="Scraped thumbnail" className="h-20 w-auto rounded-lg object-cover border border-white/10" />
                      ))}
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
      {/* ── MANUAL INTERVENTION MODAL ── */}
      {manualIntervention && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Globe className="text-white" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">{manualIntervention.platform} Verification</h3>
                <p className="text-slate-300 text-sm opacity-90">Manual input required in browser</p>
              </div>
            </div>
            <div className="p-6">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                  <Activity className="text-amber-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Browser Paused</p>
                    <p className="text-xs text-amber-700 mt-1">Please check your Chrome browser window. Solve any captchas, log in, or complete the required steps for {manualIntervention.platform}.</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-6 font-medium text-center">Are you ready to continue scraping?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleResolveIntervention('no')}
                  className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-xl font-bold transition-all"
                >
                  No, Abort
                </button>
                <button 
                  onClick={() => handleResolveIntervention('yes')}
                  className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold shadow-lg shadow-violet-200 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={18} /> Yes, Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ScraperDashboard({ user, onLogout }) {
  const [clientId] = useState(() => {
    if (user && user.id) {
      localStorage.setItem('indiascraper_client_id', user.id);
      return user.id;
    }
    let id = localStorage.getItem('indiascraper_client_id');
    if (!id) {
      id = 'client_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('indiascraper_client_id', id);
    }
    return id;
  });
  const [vendors, setVendors] = useState([]);

  // Ad Management States
  const [adsEnabled, setAdsEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('gomandap_ads_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch { return true; }
  });
  const [adNetwork, setAdNetwork] = useState(() => {
    return localStorage.getItem('gomandap_ad_network') || 'adsense';
  });
  const [adImpressions, setAdImpressions] = useState(() => {
    try { return parseInt(localStorage.getItem('gomandap_ad_impressions') || '1420'); } catch { return 1420; }
  });
  const [adClicks, setAdClicks] = useState(() => {
    try { return parseInt(localStorage.getItem('gomandap_ad_clicks') || '84'); } catch { return 84; }
  });

  const incrementImpressions = () => {
    setAdImpressions(prev => {
      const next = prev + 1;
      localStorage.setItem('gomandap_ad_impressions', next.toString());
      return next;
    });
  };

  const registerAdClick = () => {
    setAdClicks(prev => {
      const next = prev + 1;
      localStorage.setItem('gomandap_ad_clicks', next.toString());
      return next;
    });
  };

  const updateAdSettings = (enabled, network) => {
    setAdsEnabled(enabled);
    setAdNetwork(network);
    localStorage.setItem('gomandap_ads_enabled', JSON.stringify(enabled));
    localStorage.setItem('gomandap_ad_network', network);
  };
  const [outOfBoundsVendors, setOutOfBoundsVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  
  const [manualIntervention, setManualIntervention] = useState(null); // { platform: string, active: boolean }
  const [activeInput, setActiveInput] = useState(null);
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
  const [showSsePrompt, setShowSsePrompt] = useState(false);
  const [initialConnectionDone, setInitialConnectionDone] = useState(false);
  
  const [logs, setLogs] = useState([
    `[INFO] Scraper service initialized.`,
    `[INFO] Awaiting tasks...`
  ]);
  const [sseStatus, setSseStatus] = useState('disconnected'); // disconnected | connecting | open | error
  const [logLevel, setLogLevel] = useState('ALL'); // ALL | INFO | WARN | ERROR | DEBUG
  const eventSourceRef = useRef(null);
  const [searchRadius, setSearchRadius] = useState(15);
  const [strategy, setStrategy] = useState('broad');
  const [enabledEngines, setEnabledEngines] = useState(['maps', 'google-web']);
  
  const [activeJobs, setActiveJobs] = useState([]);
  const [selectedJobCategory, setSelectedJobCategory] = useState(null);
  const [backendConnected, setBackendConnected] = useState(true);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [showDirectory, setShowDirectory] = useState(false);
  const [modelLoadingStatus, setModelLoadingStatus] = useState({ status: 'idle', progress: 0 });
  const [fuseInstances, setFuseInstances] = useState({ categories: null, locations: null });
  const prevVendorsCount = useRef(0);
  const terminalRef = useRef(null);
  const workerRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Live Backend Logs via Server-Sent Events (SSE)
  const connectSse = () => {
    if (eventSourceRef.current) {
      try { eventSourceRef.current.close(); } catch(e) {}
    }
    setSseStatus('connecting');
    setShowSsePrompt(false);
    setBackendConnected(true);

    let es;
    let vendorBuffer = [];
    let bufferInterval = null;

    try {
      es = new EventSource(`${API_URL}/logs/stream?userId=${clientId}`);
      eventSourceRef.current = es;
      
      es.addEventListener('open', () => {
        setSseStatus('open');
        setBackendConnected(true);
        setInitialConnectionDone(true);
      });
      
      es.addEventListener('error', () => {
        setSseStatus('error');
        setBackendConnected(false);
        es.close(); // Close EventSource to stop auto-reconnect loops
        eventSourceRef.current = null;
        setShowSsePrompt(true); // Open manual prompt modal!
        if (bufferInterval) clearInterval(bufferInterval);
      });
      
      es.addEventListener('init', (e) => {
        try { const arr = JSON.parse(e.data); if (Array.isArray(arr)) setLogs(arr); } catch {}
      });
      
      // Batch incoming vendors to avoid React re-render freezing on Ultra-Fast mode
      bufferInterval = setInterval(() => {
        if (vendorBuffer.length > 0) {
          const normalPayloads = [];
          const oobPayloads = [];
          
          vendorBuffer.forEach(payload => {
            if (payload.action === 'out-of-bounds') {
              oobPayloads.push(payload.vendor);
            } else {
              normalPayloads.push(payload);
            }
          });

          if (normalPayloads.length > 0) {
            setVendors(prev => {
              const next = [...prev];
              normalPayloads.forEach(payload => {
                const idx = next.findIndex(v => v.id === payload.vendor.id);
                if (payload.action === 'deleted') {
                  if (idx !== -1) next.splice(idx, 1);
                } else {
                  if (idx !== -1) next[idx] = payload.vendor;
                  else next.push(payload.vendor);
                }
              });
              return next;
            });
          }

          if (oobPayloads.length > 0) {
            setOutOfBoundsVendors(prev => {
              const next = [...prev];
              oobPayloads.forEach(vendor => {
                const idx = next.findIndex(v => v.id === vendor.id);
                if (idx !== -1) next[idx] = vendor;
                else next.push(vendor);
              });
              return next;
            });
          }

          vendorBuffer = []; // clear buffer
        }
      }, 500);

      es.addEventListener('vendor', (e) => {
        try {
          const payload = JSON.parse(e.data);
          const currentUserId = user?.id || clientId;
          if (!currentUserId || currentUserId.startsWith('admin') || !payload.vendor?.userId || payload.vendor.userId === currentUserId) {
            vendorBuffer.push(payload);
          }
        } catch (err) { /* ignore */ }
      });
      
      es.addEventListener('out-of-bounds', (e) => {
        try { fetchVendors(); } catch (err) {}
      });
      
      es.addEventListener('intervention', (e) => {
        try { 
          const payload = JSON.parse(e.data);
          setManualIntervention(payload.active ? payload : null);
        } catch (err) {}
      });
      
      es.onmessage = (e) => {
        try {
          setLogs(prev => {
            const next = [...prev, e.data];
            return next.slice(-200);
          });
          setTimeout(() => {
            if (terminalRef.current) {
              terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
            }
          }, 50);
        } catch (err) {}
      };
    } catch (err) {
      setSseStatus('error');
      setBackendConnected(false);
      setShowSsePrompt(true);
      if (bufferInterval) clearInterval(bufferInterval);
    }
  };

  useEffect(() => {
    connectSse();
    return () => {
      if (eventSourceRef.current) {
        try { eventSourceRef.current.close(); } catch(e) {}
        eventSourceRef.current = null;
      }
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
             if (topMatches[0].score > 0.6) setOmniQuery(assembledQuery);
          }
        } else {
          topSuggestions = topMatches.map(r => (msg.prefix || '') + r.text);
          if (!msg.prefix && topMatches.length > 0 && topMatches[0].type === 'category') {
            topSuggestions.unshift(`${topMatches[0].text} in `);
          }
        }

        const currentQueryLower = ((msg.prefix || '') + (msg.text || '')).toLowerCase();
        let historyData = [];
        try {
          historyData = JSON.parse(localStorage.getItem('gomandap_search_history') || '[]');
        } catch(e) {
          // Search history suggestions are optional.
        }
        
        const matchingHistory = historyData.filter(h => h.toLowerCase().includes(currentQueryLower) && currentQueryLower.length > 0);

        setSuggestions(prev => {
          // Merge history, exact fuzzy matches (prev), and semantic AI matches
          return [...new Set([...matchingHistory, ...prev, ...topSuggestions])].slice(0, 10);
        });
        setShowSuggestions(true);
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

  // Safer 600ms Debounce to protect API rate limits
  const debouncedGoogleSearch = useRef(debounce(async (val) => {
    try {
      const res = await axios.get(`${API_URL}/suggest`, { params: { q: val } });
      if (res.data && res.data.length > 0) {
        setSuggestions(prev => [...new Set([...prev, ...res.data])].slice(0, 10));
        setShowSuggestions(true);
      }
    } catch (e) {}
  }, 600)).current;

  // Safer 600ms Debounce to protect API rate limits
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
    } catch (e) {}
  }, 600)).current;

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

  async function fetchVendors() {
    try {
      const [vRes, oobRes] = await Promise.all([
        axios.get(`${API_URL}/vendors`, { params: { userId: clientId } }),
        axios.get(`${API_URL}/vendors/out-of-bounds`, { params: { userId: clientId } })
      ]);
      setVendors(vRes.data);
      setOutOfBoundsVendors(oobRes.data);
      setBackendConnected(true);
    } catch (error) { 
      console.error('Failed to fetch vendors', error);
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
      setLogs(prev => [...prev, `[INFO] Master stop executed.`]);
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

  const handleResolveIntervention = async (action) => {
    if (!manualIntervention) return;
    try {
      await axios.post(`${API_URL}/scrape/resolve-intervention`, {
        platform: manualIntervention.platform,
        action
      });
      setManualIntervention(null);
    } catch (err) {
      toast.error('Failed to resolve intervention');
    }
  };

  const startScrape = async (e) => {
    if (e) e.preventDefault();
    
    if (!categoryQuery.trim() || !locationQuery.trim()) {
      return toast.error("Please enter both what you are looking for, and where.");
    }

    const finalQuery = `${categoryQuery.trim()} in ${locationQuery.trim()}`;
    const parsedCat = categoryQuery.trim();
    const parsedLoc = locationQuery.trim();

    if (!searchHistory.includes(parsedCat)) {
      setSearchHistory(prev => {
        const newHist = [parsedCat, ...prev].slice(0, 5);
        localStorage.setItem('gomandap_search_history', JSON.stringify(newHist));
        return newHist;
      });
    }

    // Wipe everything clean for a fresh start (inspired by the admin panel)
    setLogs([`[PROCESS] Starting task: ${finalQuery}`]);
    setVendors([]);
    
    try {
      setLoading(true);
      await axios.post(`${API_URL}/scrape/omni`, {
        query: finalQuery,
        category: parsedCat,
        location: parsedLoc,
        enabledEngines: enabledEngines,
        radius: searchRadius,
        strategy: strategy,
        userId: clientId
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
      setLoading(false);
      setLogs(prev => [...prev, `[ERROR] Failed to start task`]);
      if (error.response?.data?.error) {
        toast.error(error.response.data.error, { duration: 5000 });
      } else {
        toast.error('Scraper failed to start');
      }
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

  // MANUAL TRIGGERS
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
      await axios.post(`${API_URL}/scrape/maps`, { query, category, location, radius, userId: clientId });
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

  const displayedVendors = activeTab === 'staging-phones' ? stagingVendorsWithPhones
    : activeTab === 'staging-nophones' ? stagingVendorsNoPhones : liveVendors;

  // Auto-switch to no-phones tab if there are results there but none in the phones tab
  useEffect(() => {
    if (activeTab === 'staging-phones' && stagingVendorsWithPhones.length === 0 && stagingVendorsNoPhones.length > 0) {
      const timer = setTimeout(() => setActiveTab('staging-nophones'), 0);
      return () => clearTimeout(timer);
    }
  }, [stagingVendorsWithPhones.length, stagingVendorsNoPhones.length, activeTab]);

  const cities = ['All', ...new Set(displayedVendors.map(v => v.city).filter(Boolean))];
  const filteredVendors = displayedVendors.filter(v =>
    (selectedCity === 'All' || v.city === selectedCity) &&
    (!selectedFolder || v.sessionId === selectedFolder) &&
    (v.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
     v.category?.toLowerCase().includes(searchFilter.toLowerCase()) ||
     v.city?.toLowerCase().includes(searchFilter.toLowerCase()) ||
     v.phone?.includes(searchFilter))
  );

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
  const contextValue = {
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
    handleCategoryChange, handleLocationChange,
    searchRadius, setSearchRadius,
    strategy, setStrategy,
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
    outOfBoundsVendors,
    liveVendors,
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
    // Ads
    adsEnabled, setAdsEnabled,
    adNetwork, setAdNetwork,
    adImpressions, adClicks,
    incrementImpressions, registerAdClick,
    updateAdSettings,
    // Auth
    onLogout,
    user,
  };

  if (!backendConnected && !initialConnectionDone) {
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
        <button onClick={() => connectSse()} className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 flex items-center gap-2">
          <RefreshCw size={16} /> Try Reconnecting
        </button>
      </div>
    );
  }

  return (
    <ScraperContext.Provider value={{ ...contextValue, connectSse }}>
      <DashboardLayout user={user} onLogout={onLogout} />

      {/* SSE Reconnection Dialog Modal */}
      <AnimatePresence>
        {showSsePrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white border-4 border-black rounded-3xl p-6 max-w-sm w-full text-center shadow-[6px_6px_0px_#000]"
            >
              <span className="text-4xl animate-bounce inline-block mb-3">📡</span>
              <h3 className="text-lg font-black text-black uppercase tracking-wide">Scraper Connection Lost</h3>
              <p className="text-xs text-gray-500 font-semibold mt-2 mb-6">
                The connection to the minion command server has timed out or disconnected. Would you like to reconnect now?
              </p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => {
                    connectSse();
                  }}
                  className="cartoon-btn cartoon-btn-yellow w-full py-3 text-xs uppercase"
                >
                  Reconnect Now 🚀
                </button>
                <button 
                  onClick={() => setShowSsePrompt(false)}
                  className="cartoon-btn cartoon-btn-red w-full py-3 text-xs uppercase"
                >
                  Stay Offline 💤
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
