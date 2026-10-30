import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitBranch, Search, Filter, Phone, MessageSquare, Globe, Star, 
  MapPin, ChevronRight, ChevronLeft, ArrowRight, X, Plus, Calendar,
  CheckCircle2, Building2, User, Clock, Award, Shield, FileText,
  TrendingUp, CheckSquare, Square, Download, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../../apiConfig';
import { fetchAllUserSessions } from '../../utils/sessionManager';
import { useDeviceCapability } from '../../hooks/useDeviceCapability';

const STAGES = [
  { id: 'new', label: 'New Lead', icon: '🌱', color: 'indigo', border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', text: 'text-indigo-300' },
  { id: 'pitch_sent', label: 'Pitch Sent', icon: '📤', color: 'amber', border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-300' },
  { id: 'in_discussion', label: 'In Discussion', icon: '💬', color: 'cyan', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', text: 'text-cyan-300' },
  { id: 'qualified', label: 'Qualified', icon: '⭐', color: 'violet', border: 'border-violet-500/30', bg: 'bg-violet-500/10', text: 'text-violet-300' },
  { id: 'won', label: 'Closed Won', icon: '🏆', color: 'emerald', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-300' },
  { id: 'archived', label: 'Archived', icon: '📦', color: 'slate', border: 'border-slate-500/30', bg: 'bg-slate-500/10', text: 'text-slate-300' },
];

export default function CRMPipeline() {
  const navigate = useNavigate();
  const { isMobile } = useDeviceCapability();

  const [vaults, setVaults] = useState([]);
  const [selectedVaultId, setSelectedVaultId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Global CRM state map: { [leadId]: { stage, notes: [], tasks: [], vaultId } }
  const [crmState, setCrmState] = useState({});
  const [activeLead, setActiveLead] = useState(null); // For slide-out drawer
  const [activeMobileStage, setActiveMobileStage] = useState('new');

  // Load vaults and aggregate all leads
  const loadData = async () => {
    setLoading(true);
    try {
      const list = await fetchAllUserSessions();
      setVaults(list || []);

      // Aggregate CRM states from each vault's storage key
      const mergedCrm = {};
      (list || []).forEach(v => {
        try {
          const raw = localStorage.getItem(`vault_crm_state_${v.id}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            Object.assign(mergedCrm, parsed);
          }
        } catch (e) {}
      });
      setCrmState(mergedCrm);
    } catch (err) {
      console.error('Failed to load CRM data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Flatten all leads from selected vault(s)
  const allLeads = useMemo(() => {
    const list = [];
    vaults.forEach(v => {
      if (selectedVaultId !== 'ALL' && v.id !== selectedVaultId) return;
      (v.leads || []).forEach((lead, idx) => {
        const id = lead.id || lead._id || `${v.id}_lead_${idx}`;
        list.push({
          ...lead,
          _vaultId: v.id,
          _vaultName: v.name,
          _computedId: id
        });
      });
    });
    return list;
  }, [vaults, selectedVaultId]);

  // Group leads into stages
  const groupedLeads = useMemo(() => {
    const groups = {
      new: [],
      pitch_sent: [],
      in_discussion: [],
      qualified: [],
      won: [],
      archived: []
    };

    allLeads.forEach(lead => {
      const id = lead._computedId;
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        !q ||
        (lead.name || '').toLowerCase().includes(q) ||
        (lead.phone || '').includes(q) ||
        (lead.city || lead.mandal || '').toLowerCase().includes(q) ||
        (lead.category || '').toLowerCase().includes(q);

      if (!matchesSearch) return;

      const currentStage = crmState[id]?.stage || 'new';
      if (groups[currentStage]) {
        groups[currentStage].push(lead);
      } else {
        groups.new.push(lead);
      }
    });

    return groups;
  }, [allLeads, crmState, searchQuery]);

  // Move lead forward or backward along stage sequence
  const moveStage = (lead, direction, e) => {
    if (e) e.stopPropagation();
    const id = lead._computedId;
    const currentStage = crmState[id]?.stage || 'new';
    const currentIndex = STAGES.findIndex(s => s.id === currentStage);
    const nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex < 0 || nextIndex >= STAGES.length) return;
    const nextStage = STAGES[nextIndex].id;

    const vaultId = lead._vaultId;
    const updatedLeadCrm = {
      ...(crmState[id] || {}),
      stage: nextStage,
      lastUpdated: Date.now()
    };

    const newMerged = {
      ...crmState,
      [id]: updatedLeadCrm
    };
    setCrmState(newMerged);

    // Save to specific vault's localStorage
    try {
      const vKey = `vault_crm_state_${vaultId}`;
      const vCurrent = JSON.parse(localStorage.getItem(vKey) || '{}');
      vCurrent[id] = updatedLeadCrm;
      localStorage.setItem(vKey, JSON.stringify(vCurrent));
    } catch (e) {}

    // Background push to API
    axios.patch(`${API_URL}/crm/leads/${id}/stage`, { stage: nextStage }).catch(() => {});
    toast.success(`Moved "${lead.name}" to ${STAGES[nextIndex].label}`);
  };

  const setLeadStageDirect = (leadId, targetStage, vaultId) => {
    const updatedLeadCrm = {
      ...(crmState[leadId] || {}),
      stage: targetStage,
      lastUpdated: Date.now()
    };
    setCrmState(prev => ({ ...prev, [leadId]: updatedLeadCrm }));
    try {
      const vKey = `vault_crm_state_${vaultId}`;
      const vCurrent = JSON.parse(localStorage.getItem(vKey) || '{}');
      vCurrent[leadId] = updatedLeadCrm;
      localStorage.setItem(vKey, JSON.stringify(vCurrent));
    } catch (e) {}
    axios.patch(`${API_URL}/crm/leads/${leadId}/stage`, { stage: targetStage }).catch(() => {});
  };

  // Pipeline summary numbers
  const metrics = useMemo(() => {
    return {
      total: allLeads.length,
      pitching: (groupedLeads.pitch_sent?.length || 0) + (groupedLeads.in_discussion?.length || 0),
      qualified: groupedLeads.qualified?.length || 0,
      won: groupedLeads.won?.length || 0
    };
  }, [allLeads, groupedLeads]);

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <GitBranch size={20} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                CRM Pipeline
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {metrics.total} Deals
                </span>
              </h1>
              <p className="text-xs md:text-sm text-white/50">
                Visual deal stages, client progression, and conversion management
              </p>
            </div>
          </div>
        </div>

        {/* Filter and action tools */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Vault selector */}
          <select
            value={selectedVaultId}
            onChange={(e) => setSelectedVaultId(e.target.value)}
            className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL" className="bg-[#121226] text-white">All Vaults ({vaults.length})</option>
            {vaults.map(v => (
              <option key={v.id} value={v.id} className="bg-[#121226] text-white">
                {v.name} ({v.leadCount || v.leads?.length || 0})
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/[0.04] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500 w-40 sm:w-56"
            />
          </div>

          <button
            onClick={() => loadData()}
            className="btn btn-secondary btn-sm p-2 text-white/70 hover:text-white"
            title="Refresh Pipeline"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-white/40 uppercase font-semibold">Total in Pipeline</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{metrics.total}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/60">
            🌱
          </div>
        </div>

        <div className="card p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-amber-300/70 uppercase font-semibold">Pitching / Active</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{metrics.pitching}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            💬
          </div>
        </div>

        <div className="card p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-violet-300/70 uppercase font-semibold">Qualified Deals</div>
            <div className="text-xl font-bold font-mono text-violet-400 mt-0.5">{metrics.qualified}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
            ⭐
          </div>
        </div>

        <div className="card p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-emerald-300/70 uppercase font-semibold">Closed Won</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{metrics.won}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            🏆
          </div>
        </div>
      </div>

      {/* Mobile Stage Selector Tabs (< 768px) */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {STAGES.map(s => {
          const count = groupedLeads[s.id]?.length || 0;
          const isActive = activeMobileStage === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveMobileStage(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all ${
                isActive ? `${s.bg} ${s.text} border ${s.border}` : 'bg-white/[0.03] text-white/50'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
              <span className="font-mono text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* KANBAN BOARD CONTAINER */}
      <div className="kanban-board gap-3.5 pb-4 min-h-[520px]">
        {STAGES.map(stage => {
          const stageLeads = groupedLeads[stage.id] || [];
          const isMobileHidden = isMobile && activeMobileStage !== stage.id;

          if (isMobileHidden) return null;

          return (
            <div
              key={stage.id}
              className="kanban-column flex flex-col w-full md:w-80 shrink-0 card p-3 border-t-2"
              style={{ borderTopColor: stage.id === 'won' ? '#10b981' : (stage.id === 'qualified' ? '#8b5cf6' : '#6366f1') }}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="text-base">{stage.icon}</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    {stage.label}
                  </h3>
                </div>
                <span className="badge badge-slate text-[10px] font-mono px-2 py-0.5">
                  {stageLeads.length}
                </span>
              </div>

              {/* Column Cards List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
                {stageLeads.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center p-4 border border-dashed border-white/10 rounded-xl text-white/30 text-xs">
                    <span>No leads in this stage</span>
                  </div>
                ) : (
                  stageLeads.map(lead => {
                    const id = lead._computedId;
                    const stageIdx = STAGES.findIndex(s => s.id === stage.id);
                    const canMoveBack = stageIdx > 0;
                    const canMoveForward = stageIdx < STAGES.length - 1;

                    return (
                      <motion.div
                        key={id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setActiveLead(lead)}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-violet-500/40 hover:bg-white/[0.05] transition-all cursor-pointer group space-y-2.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors line-clamp-1">
                            {lead.name}
                          </h4>
                          {lead.rating && (
                            <span className="text-[10px] text-amber-400 font-mono shrink-0">
                              ⭐ {lead.rating}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-white/50">
                          <span className="text-violet-400 font-medium truncate">{lead.category}</span>
                          <span>•</span>
                          <span className="truncate">{lead.city || lead.mandal || 'India'}</span>
                        </div>

                        {/* Phone / Contact */}
                        {lead.phone && (
                          <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400/90 pt-1 border-t border-white/[0.04]">
                            <span className="flex items-center gap-1">
                              <Phone size={10} />
                              {lead.phone}
                            </span>
                            <span className="text-[10px] px-1 rounded bg-emerald-500/10 text-emerald-300">
                              Verified
                            </span>
                          </div>
                        )}

                        {/* Card Movement Quick-Buttons */}
                        <div className="pt-2 flex items-center justify-between border-t border-white/[0.04] text-[10px]">
                          {canMoveBack ? (
                            <button
                              onClick={(e) => moveStage(lead, 'back', e)}
                              className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/10 text-white/50 hover:text-white flex items-center gap-0.5"
                              title="Move to previous stage"
                            >
                              <ChevronLeft size={12} />
                              <span>Back</span>
                            </button>
                          ) : <div />}

                          {canMoveForward ? (
                            <button
                              onClick={(e) => moveStage(lead, 'forward', e)}
                              className="px-2 py-0.5 rounded bg-violet-600/30 hover:bg-violet-600/60 text-violet-200 flex items-center gap-0.5 font-semibold ml-auto"
                              title="Move to next stage"
                            >
                              <span>Next</span>
                              <ChevronRight size={12} />
                            </button>
                          ) : (
                            <span className="text-emerald-400 text-[10px] font-bold">Done</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* SLIDE-OUT LEAD DETAIL DRAWER */}
      <AnimatePresence>
        {activeLead && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-[#0e0e1c] border-l border-white/10 h-full overflow-y-auto p-6 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <User size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white line-clamp-1">{activeLead.name}</h3>
                    <p className="text-xs text-white/50">{activeLead._vaultName || 'Vault Lead'}</p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveLead(null)}
                  className="p-1.5 rounded-lg bg-white/[0.04] text-white/50 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Direct Communication Bar */}
              <div className="grid grid-cols-2 gap-2">
                {activeLead.phone && (
                  <a
                    href={`https://wa.me/91${activeLead.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(activeLead.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-emerald btn-sm py-2 flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={14} />
                    <span>Chat on WhatsApp</span>
                  </a>
                )}
                {activeLead.phone && (
                  <a
                    href={`tel:${activeLead.phone}`}
                    className="btn btn-secondary btn-sm py-2 flex items-center justify-center gap-2 text-emerald-400"
                  >
                    <Phone size={14} />
                    <span>Dial Number</span>
                  </a>
                )}
              </div>

              {/* Pipeline Stage Change */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white/50 font-mono">
                  Move Deal Stage
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {STAGES.map(s => {
                    const leadId = activeLead._computedId;
                    const isCurrent = (crmState[leadId]?.stage || 'new') === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setLeadStageDirect(leadId, s.id, activeLead._vaultId)}
                        className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                          isCurrent
                            ? 'bg-violet-600 text-white font-bold shadow-md shadow-violet-600/30'
                            : 'bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.06]'
                        }`}
                      >
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Attributes Details */}
              <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 font-mono">
                  Lead Information
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-start gap-2.5">
                    <MapPin size={16} className="text-violet-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-white/40 text-[10px] uppercase">Location</div>
                      <div className="text-white mt-0.5">
                        {activeLead.address || `${activeLead.mandal || ''}, ${activeLead.city || activeLead.state || 'India'}`}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-start gap-2.5">
                    <Award size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-white/40 text-[10px] uppercase">Rating & Category</div>
                      <div className="text-white mt-0.5">
                        {activeLead.category} • ⭐ {activeLead.rating || '4.5'} ({activeLead.reviewCount || 10} Reviews)
                      </div>
                    </div>
                  </div>

                  {activeLead.website && (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-start gap-2.5">
                      <Globe size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                      <div className="truncate">
                        <div className="text-white/40 text-[10px] uppercase">Website</div>
                        <a href={activeLead.website} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline mt-0.5 block truncate">
                          {activeLead.website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                <button
                  onClick={() => navigate(`/app/folders/${activeLead._vaultId}`)}
                  className="btn btn-secondary btn-sm flex items-center gap-1.5"
                >
                  <span>Open Full Vault</span>
                  <ArrowRight size={14} />
                </button>

                <button
                  onClick={() => setActiveLead(null)}
                  className="btn btn-primary btn-sm"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
