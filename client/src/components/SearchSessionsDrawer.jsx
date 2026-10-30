import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderOpen, X, Download, Trash2, Calendar, MapPin, 
  Layers, HardDrive, RefreshCw, Check, ArrowRight, Database, 
  FileSpreadsheet, Phone, Search, Eye, Sparkles, Filter, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  fetchAllUserSessions, fetchSessionDetails, deleteUserSession, 
  exportSessionToCSV, exportSessionToJSON 
} from '../utils/sessionManager';
import FolderLeadsModal from './FolderLeadsModal';

export default function SearchSessionsDrawer({ 
  isOpen, 
  onClose, 
  onLoadSession,
  initialFilter = 'all'
}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState(initialFilter);
  const [inspectedFolder, setInspectedFolder] = useState(null);

  const loadSessionsList = async () => {
    setLoading(true);
    try {
      const list = await fetchAllUserSessions();
      setSessions(list || []);
    } catch (e) {
      toast.error('Failed to load past sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSessionsList();
      setActiveTab(initialFilter);
    }
  }, [isOpen, initialFilter]);

  const totalLeadsHarvested = useMemo(() => {
    return sessions.reduce((acc, s) => acc + (s.leadCount || 0), 0);
  }, [sessions]);

  const totalWhatsAppVerified = useMemo(() => {
    return sessions.reduce((acc, s) => {
      const count = s.phoneCount || s.metadata?.verifiedPhones || s.metadata?.phoneCount || 0;
      return acc + count;
    }, 0);
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    let list = [...sessions];
    if (activeTab === 'whatsapp') {
      list = list.filter(s => {
        const count = s.phoneCount || s.metadata?.verifiedPhones || s.metadata?.phoneCount || 0;
        return count > 0;
      });
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter(s => 
        (s.category && s.category.toLowerCase().includes(q)) ||
        (s.location && s.location.toLowerCase().includes(q)) ||
        (s.id && s.id.toLowerCase().includes(q))
      );
    }
    return list;
  }, [sessions, activeTab, searchFilter]);

  const handleSelect = async (sessionId) => {
    setActiveSessionId(sessionId);
    try {
      const full = await fetchSessionDetails(sessionId);
      if (full) {
        onLoadSession(full);
        toast.success(`Loaded ${full.leads?.length || full.leadCount || 0} leads into Cockpit!`, { icon: '🚀' });
        onClose();
      }
    } catch (e) {
      toast.error('Error loading session details');
    }
  };

  const handleInspect = async (session, e) => {
    if (e) e.stopPropagation();
    try {
      const full = await fetchSessionDetails(session.id);
      setInspectedFolder(full || session);
    } catch (err) {
      setInspectedFolder(session);
    }
  };

  const handleDelete = async (sessionId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this saved search session?')) return;
    await deleteUserSession(sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.success('Session deleted');
  };

  const handleExportCSV = async (session, e) => {
    e.stopPropagation();
    const full = await fetchSessionDetails(session.id);
    exportSessionToCSV(full || session);
    toast.success('Downloaded CSV!');
  };

  const handleExportJSON = async (session, e) => {
    e.stopPropagation();
    const full = await fetchSessionDetails(session.id);
    exportSessionToJSON(full || session);
    toast.success('Downloaded JSON!');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-lg bg-[#0d0d18] border-l border-white/[0.08] text-white flex flex-col h-full shadow-2xl"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#111122]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-violet-900/30">
                <FolderOpen size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <span>All Scrapes Made</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono border border-violet-500/30">
                    {sessions.length} Saved
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Search Vaults & Verified WhatsApp History</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadSessionsList}
                disabled={loading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                title="Refresh All Scrapes"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Aggregated KPI Telemetry Banner */}
          <div className="p-3.5 bg-gradient-to-r from-violet-950/40 via-[#0e0e1a] to-emerald-950/30 border-b border-white/[0.06] grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-violet-900/20 border border-violet-500/20 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                <Database size={15} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-violet-300 uppercase tracking-wider">Total Scraped Leads</p>
                <p className="text-base font-black text-white leading-tight">{totalLeadsHarvested.toLocaleString()}</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-900/20 border border-emerald-500/20 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Phone size={15} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">WhatsApp Verified</p>
                <p className="text-base font-black text-white leading-tight">{totalWhatsAppVerified.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Filter Tabs & Instant Search */}
          <div className="p-3 bg-[#0a0a14] border-b border-white/[0.06] space-y-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Layers size={12} />
                <span>All Scrapes ({sessions.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Phone size={12} />
                <span>WhatsApp Reachable ({sessions.filter(s => (s.phoneCount || s.metadata?.verifiedPhones || 0) > 0).length})</span>
              </button>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search scrapes by category, city, mandal..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {loading && sessions.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-violet-400" />
                <p className="font-semibold text-slate-300">Retrieving All Scrapes...</p>
                <p className="text-[11px] text-slate-500 mt-1">Aggregating local storage & server search vault files</p>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                <Layers size={32} className="mx-auto mb-3 text-slate-600" />
                <p className="font-semibold text-slate-300 text-sm">No Scrapes Found</p>
                <p className="mt-1 max-w-[280px] mx-auto text-[11px] text-slate-400">
                  {searchFilter 
                    ? `No past scrapes match "${searchFilter}". Try another term or clear the filter.`
                    : 'Every search you run in the Cockpit is automatically saved here into distinct isolated folders.'}
                </p>
              </div>
            ) : (
              filteredSessions.map((s) => {
                const phoneCount = s.phoneCount || s.metadata?.verifiedPhones || s.metadata?.phoneCount || 0;
                const leadCount = s.leadCount || (s.leads ? s.leads.length : 0);

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelect(s.id)}
                    className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-violet-500/40 transition-all cursor-pointer group relative shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                            {s.category || 'Business Search'}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                          <MapPin size={10} className="text-cyan-400 shrink-0" />
                          <span className="truncate">{s.location || 'India'}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                          {leadCount} Leads
                        </span>
                        {phoneCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Phone size={9} />
                            {phoneCount}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(s.timestamp).toLocaleDateString()} {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                        {/* Inspect full card modal */}
                        <button
                          onClick={(e) => handleInspect(s, e)}
                          title="Inspect Lead Cards & Deep Extract"
                          className="px-2 py-1 rounded bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/20 flex items-center gap-1 transition-colors text-[10px] font-semibold"
                        >
                          <Eye size={11} />
                          <span>Inspect</span>
                        </button>

                        {/* Load into cockpit */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelect(s.id); }}
                          title="Load into Live Cockpit"
                          className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 flex items-center gap-1 transition-colors text-[10px] font-semibold"
                        >
                          <ArrowRight size={11} />
                          <span>Load</span>
                        </button>

                        <button
                          onClick={(e) => handleExportCSV(s, e)}
                          title="Export CSV"
                          className="p-1 rounded bg-white/[0.04] hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-400 transition-colors"
                        >
                          <FileSpreadsheet size={12} />
                        </button>

                        <button
                          onClick={(e) => handleExportJSON(s, e)}
                          title="Export JSON"
                          className="p-1 rounded bg-white/[0.04] hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-400 transition-colors"
                        >
                          <Download size={12} />
                        </button>

                        <button
                          onClick={(e) => handleDelete(s.id, e)}
                          title="Delete Session"
                          className="p-1 rounded bg-white/[0.04] hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/[0.08] bg-[#0c0c16] text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Database size={12} className="text-violet-400" />
              <span>{sessions.length} Distinct Scrapes Stored</span>
            </span>
            <span className="text-emerald-400 font-mono flex items-center gap-1">
              <CheckCircle2 size={11} />
              <span>100% Isolated Vaults</span>
            </span>
          </div>
        </motion.div>
      </div>

      {/* Embedded Folder Leads Inspection Modal */}
      {inspectedFolder && (
        <FolderLeadsModal
          isOpen={Boolean(inspectedFolder)}
          onClose={() => setInspectedFolder(null)}
          folder={inspectedFolder}
          onLoadToCockpit={(folder) => {
            onLoadSession(folder);
            setInspectedFolder(null);
            onClose();
          }}
        />
      )}
    </>
  );
}
