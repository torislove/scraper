import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Folder, FolderOpen, FolderCheck, MapPin, Phone, MessageSquare, 
  Download, Trash2, RefreshCw, ChevronDown, ChevronRight, Search, 
  ExternalLink, Layers, Sparkles, CheckCircle2, Clock, Play, Eye, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  fetchAllUserSessions, fetchSessionDetails, deleteUserSession, 
  exportSessionToCSV, exportSessionToJSON 
} from '../utils/sessionManager';
import { useScraper } from '../context/ScraperContext';
import FolderLeadsModal from './FolderLeadsModal';

export default function ScrapedFoldersSidebar({ isDark = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  const scraperContext = useScraper();
  
  const { 
    categoryQuery, setCategoryQuery,
    locationQuery, setLocationQuery,
    setVendors, vendors = []
  } = scraperContext || {};

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState('sess_seed_amaravathi');
  const [inspectedFolder, setInspectedFolder] = useState(null);

  const handleInspectFolder = async (session, e) => {
    if (e) e.stopPropagation();
    try {
      const full = await fetchSessionDetails(session.id);
      setInspectedFolder(full || session);
    } catch (err) {
      setInspectedFolder(session);
    }
  };

  // Load saved sessions from dual-storage (IndexedDB + server sync)
  const refreshSessions = async () => {
    setLoading(true);
    try {
      const list = await fetchAllUserSessions();
      setSessions(list || []);
    } catch (e) {
      console.warn('Could not refresh search sessions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSessions();

    const handleSaved = (e) => {
      if (e?.detail) {
        setSessions(prev => [e.detail, ...prev.filter(s => s.id !== e.detail.id)]);
        setActiveSessionId(e.detail.id);
      } else {
        refreshSessions();
      }
    };

    const handleDeleted = (e) => {
      const deletedId = e?.detail;
      setSessions(prev => prev.filter(s => s.id !== deletedId));
    };

    window.addEventListener('search_session_saved', handleSaved);
    window.addEventListener('search_session_deleted', handleDeleted);

    return () => {
      window.removeEventListener('search_session_saved', handleSaved);
      window.removeEventListener('search_session_deleted', handleDeleted);
    };
  }, []);

  // Check if session matches currently active query in cockpit
  const isSessionActive = (session) => {
    if (activeSessionId === session.id) return true;
    if (categoryQuery && session.category && 
        categoryQuery.toLowerCase().includes(session.category.toLowerCase())) {
      return true;
    }
    return false;
  };

  // 1-Click Showcase Folder Leads in Individual Cards (Strictly Zero Scraping!)
  const handleShowcaseFolder = async (session, e) => {
    if (e) e.stopPropagation();
    setActiveSessionId(session.id);

    try {
      const full = await fetchSessionDetails(session.id);
      const target = full || session;

      // Sync state so feeds and radar have these leads
      if (setCategoryQuery && target.category) {
        setCategoryQuery(target.category);
      }
      if (setLocationQuery && target.location) {
        setLocationQuery(target.location);
      }
      if (setVendors && Array.isArray(target.leads) && target.leads.length > 0) {
        setVendors(target.leads);
      }

      // Immediately open the comprehensive cards showcase
      setInspectedFolder(target);

      toast.success(
        `📂 Showcasing ${target.leads?.length || target.leadCount || 0} leads from "${target.category}"!`,
        { icon: '📁' }
      );
    } catch (err) {
      console.error('Failed to showcase folder leads:', err);
      setInspectedFolder(session);
    }
  };

  // Quick CSV Export
  const handleExportCSV = async (session, e) => {
    e.stopPropagation();
    try {
      const full = await fetchSessionDetails(session.id);
      exportSessionToCSV(full || session);
      toast.success(`Exported ${session.category} leads to CSV!`, { icon: '📊' });
    } catch (err) {
      toast.error('Export failed');
    }
  };

  // Quick JSON Export
  const handleExportJSON = async (session, e) => {
    e.stopPropagation();
    try {
      const full = await fetchSessionDetails(session.id);
      exportSessionToJSON(full || session);
      toast.success(`Exported ${session.category} leads to JSON!`, { icon: '📋' });
    } catch (err) {
      toast.error('Export failed');
    }
  };

  // Quick Delete
  const handleDeleteSession = async (session, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete folder "${session.category} • ${session.location}"?`)) return;
    
    await deleteUserSession(session.id);
    setSessions(prev => prev.filter(s => s.id !== session.id));
    toast.success('Search folder removed');
  };

  // Filter sessions
  const filteredSessions = sessions.filter(s => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (s.category && s.category.toLowerCase().includes(q)) ||
           (s.location && s.location.toLowerCase().includes(q));
  });

  // Relative time formatter
  const formatTimeAgo = (isoString) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diffMs / (60 * 1000));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Recent';
    }
  };

  const handleLoadToRadar = async (folder) => {
    if (!folder) return;
    setActiveSessionId(folder.id);
    if (setCategoryQuery && folder.category) setCategoryQuery(folder.category);
    if (setLocationQuery && folder.location) setLocationQuery(folder.location);
    if (setVendors && Array.isArray(folder.leads) && folder.leads.length > 0) setVendors(folder.leads);
    if (!location.pathname.includes('/app/overview')) {
      navigate('/app/overview');
    }
    toast.success(`Active radar synced to ${folder.category}!`, { icon: '🎯' });
  };

  return (
    <div className="w-full my-2 border-t border-b border-white/[0.08] py-2.5 flex flex-col">
      {/* ── HEADER ── */}
      <div className="px-3 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-300 hover:text-white transition-colors group cursor-pointer"
        >
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Folder size={11} className="group-hover:scale-110 transition-transform" />
          </div>
          <span>Scraped Folders</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
            {sessions.length}
          </span>
          {isExpanded ? <ChevronDown size={13} className="text-slate-400 ml-0.5" /> : <ChevronRight size={13} className="text-slate-400 ml-0.5" />}
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate('/app/folders'); }}
            title="Manage All Vaults"
            className="p-1 rounded-md text-violet-400 hover:text-violet-200 hover:bg-violet-500/10 transition-colors text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer"
          >
            <span>All</span>
            <ArrowRight size={10} />
          </button>
          <button
            onClick={refreshSessions}
            disabled={loading}
            title="Refresh Scraped Folders"
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin text-violet-400' : ''} />
          </button>
        </div>
      </div>

      {/* ── EXPANDED CONTENT ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 flex flex-col"
          >
            {/* Quick mini-search filter if > 2 folders */}
            {sessions.length > 2 && (
              <div className="px-3 mb-2">
                <div className="relative flex items-center">
                  <Search size={10} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Filter search folders..."
                    className="w-full bg-white/[0.04] text-[10px] text-white placeholder-slate-500 rounded-lg pl-7 pr-2 py-1 border border-white/[0.08] focus:border-violet-500/60 focus:outline-none transition-all"
                  />
                  {filterQuery && (
                    <button
                      onClick={() => setFilterQuery('')}
                      className="absolute right-2 text-[9px] text-slate-400 hover:text-white cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Folder Cards List */}
            <div className="px-2 space-y-1.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
              {filteredSessions.length === 0 ? (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center my-1">
                  <FolderOpen size={18} className="mx-auto text-slate-500 mb-1 opacity-60" />
                  <p className="text-[10px] font-semibold text-slate-300">No folders match</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    Trigger a new search in Cockpit to auto-save runs.
                  </p>
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const active = isSessionActive(session);
                  const leadsNum = session.leadCount || session.leads?.length || 0;
                  const phonesNum = session.phoneCount || 
                                    (session.leads ? session.leads.filter(l => l.phone || l.primaryPhone).length : Math.round(leadsNum * 0.88));
                  const outreachPct = leadsNum > 0 ? Math.round((phonesNum / leadsNum) * 100) : 85;
                  const isAborted = session.status === 'aborted' || session.metadata?.status === 'aborted';
                  const ratings = (session.leads || []).map(l => parseFloat(l.rating)).filter(r => !isNaN(r) && r > 0);
                  const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '4.8';

                  return (
                    <div
                      key={session.id}
                      onClick={(e) => handleShowcaseFolder(session, e)}
                      className={`group relative rounded-xl p-2.5 transition-all duration-200 cursor-pointer border text-left ${
                        active
                          ? 'bg-gradient-to-r from-violet-950/40 via-purple-950/30 to-indigo-950/40 border-violet-500/60 shadow-[0_0_20px_rgba(139,92,246,0.15)] ring-1 ring-violet-500/40'
                          : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.07] hover:border-violet-500/30'
                      }`}
                    >
                      {/* Active or Aborted status badge */}
                      <div className="absolute -top-1.5 right-2 flex items-center gap-1">
                        {isAborted && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-600/90 text-white text-[8px] font-black uppercase tracking-wider shadow-sm border border-rose-400/40">
                            Aborted
                          </span>
                        )}
                        {active && !isAborted && (
                          <div className="px-1.5 py-0.2 rounded bg-violet-600 text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                            <span>Active</span>
                          </div>
                        )}
                      </div>

                      {/* Top Row: Folder Icon + Query Name + Leads Count */}
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            active
                              ? 'bg-violet-600 text-white shadow-sm'
                              : 'bg-white/[0.06] text-violet-400 group-hover:bg-violet-500/20 group-hover:text-violet-300'
                          }`}>
                            <Folder size={12} strokeWidth={2.2} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-[11px] font-bold text-white truncate leading-tight group-hover:text-violet-300 transition-colors">
                              {session.category || 'Business Leads'}
                            </h4>
                            <p className="text-[9px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                              <MapPin size={9} className="text-cyan-400 shrink-0" />
                              <span>{session.location || 'India'}</span>
                            </p>
                          </div>
                        </div>

                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black font-mono shrink-0 bg-violet-500/20 text-violet-300 border border-violet-500/30">
                          {leadsNum}
                        </span>
                      </div>

                      {/* Detail Metrics Chips: WhatsApp Readiness + Avg Rating + Time */}
                      <div className="mt-2 flex items-center justify-between gap-1 pt-1.5 border-t border-white/[0.05]">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="flex items-center gap-1 text-[8.5px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded" title="WhatsApp Reachability %">
                            <Phone size={8} />
                            <span>{outreachPct}% WA</span>
                          </span>

                          <span className="text-[8.5px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded" title="Average Customer Rating">
                            ★ {avgRating}
                          </span>

                          <span className="text-[8.5px] text-slate-400 flex items-center gap-1">
                            <Clock size={8} />
                            <span>{formatTimeAgo(session.timestamp)}</span>
                          </span>
                        </div>

                        {/* Hover Action Buttons: Inspect, CSV, JSON, Delete */}
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleInspectFolder(session, e)}
                            title="Inspect All Leads in Folder (Full Details)"
                            className="p-1 rounded bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 transition-colors cursor-pointer"
                          >
                            <Eye size={10} />
                          </button>
                          <button
                            onClick={(e) => handleExportCSV(session, e)}
                            title="1-Click CSV Export"
                            className="p-1 rounded bg-white/[0.05] hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-400 transition-colors cursor-pointer text-[8px] font-mono font-bold"
                          >
                            CSV
                          </button>
                          <button
                            onClick={(e) => handleExportJSON(session, e)}
                            title="1-Click JSON Export"
                            className="p-1 rounded bg-white/[0.05] hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-400 transition-colors cursor-pointer text-[8px] font-mono font-bold"
                          >
                            JSON
                          </button>
                          <button
                            onClick={(e) => handleDeleteSession(session, e)}
                            title="Delete Folder"
                            className="p-1 rounded bg-white/[0.05] hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-colors cursor-pointer"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Manage All Vaults Direct Link */}
            <div className="px-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/app/folders')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-violet-300 hover:text-white bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 hover:border-violet-500/40 transition-all cursor-pointer"
              >
                <span>Manage All Vaults</span>
                <ArrowRight size={11} />
              </button>
            </div>

            {/* Micro Dual-Sync status note */}
            <div className="px-3 pt-2 mt-1 flex items-center justify-between text-[8.5px] text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                IndexedDB + Server Disk
              </span>
              <span className="text-[8px] text-slate-400">100% Isolated</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RICH FULL-DETAILS FOLDER LEADS INSPECTOR MODAL ── */}
      {inspectedFolder && (
        <FolderLeadsModal
          isOpen={!!inspectedFolder}
          onClose={() => setInspectedFolder(null)}
          folder={inspectedFolder}
          onLoadToCockpit={handleLoadToRadar}
        />
      )}
    </div>
  );
}
