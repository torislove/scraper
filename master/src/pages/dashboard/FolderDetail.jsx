import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, Filter, Phone, MessageSquare, Globe, Star, 
  MapPin, Download, ExternalLink, CheckCircle2, ShieldCheck, Copy, 
  Check, Mail, Building2, UserPlus, Flame, Sparkles, Send, 
  Clock, Edit3, Trash2, Calendar, Share2, Layers, Award,
  ChevronRight, ArrowRight, CheckSquare, Square, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../../apiConfig';
import { 
  fetchSessionDetails, exportSessionToCSV, exportSessionToJSON 
} from '../../utils/sessionManager';
import { useDeviceCapability } from '../../hooks/useDeviceCapability';

const CRM_STAGES = [
  { id: 'new', label: 'New Lead', icon: '🌱', color: 'indigo' },
  { id: 'pitch_sent', label: 'Pitch Sent', icon: '📤', color: 'amber' },
  { id: 'in_discussion', label: 'In Discussion', icon: '💬', color: 'cyan' },
  { id: 'qualified', label: 'Qualified', icon: '⭐', color: 'violet' },
  { id: 'won', label: 'Closed Won', icon: '🏆', color: 'emerald' },
  { id: 'archived', label: 'Archived', icon: '📦', color: 'slate' },
];

export default function FolderDetail() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useDeviceCapability();

  const [folder, setFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'whatsapp' | 'topRated' | 'verified'
  const [stageFilter, setStageFilter] = useState('all');
  const [copiedField, setCopiedField] = useState(null);

  // Mobile active pane tab: 'leads' | 'detail' | 'crm'
  const [mobileTab, setMobileTab] = useState('leads');

  // CRM State (stage, notes, tasks) keyed by lead id
  const [crmState, setCrmState] = useState({});
  const [newNote, setNewNote] = useState('');
  const [newTask, setNewTask] = useState('');

  // Load Folder data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const details = await fetchSessionDetails(folderId);
        if (details) {
          setFolder(details);
          const firstLead = details.leads?.[0];
          if (firstLead) {
            setSelectedLeadId(firstLead.id || firstLead._id || '0');
          }
        } else {
          toast.error('Vault not found');
        }
      } catch (err) {
        console.error('Error fetching vault:', err);
        toast.error('Failed to load vault');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [folderId]);

  // Load persisted CRM state from localStorage
  const crmStorageKey = useMemo(() => {
    return `vault_crm_state_${folder?.id || folderId}`;
  }, [folder?.id, folderId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(crmStorageKey);
      if (saved) {
        setCrmState(JSON.parse(saved));
      }
    } catch (e) {}
  }, [crmStorageKey]);

  // Save CRM state updates
  const updateLeadCrm = (leadId, patch) => {
    setCrmState(prev => {
      const current = prev[leadId] || { stage: 'new', notes: [], tasks: [], timeline: [] };
      const updated = {
        ...prev,
        [leadId]: {
          ...current,
          ...patch,
          lastUpdated: Date.now()
        }
      };
      try {
        localStorage.setItem(crmStorageKey, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Also attempt background sync to API
    if (patch.stage) {
      axios.patch(`${API_URL}/crm/leads/${leadId}/stage`, { stage: patch.stage })
        .catch(() => {/* LocalStorage is our rock-solid primary */});
    }
  };

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const leads = folder?.leads || [];

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead, index) => {
      const id = lead.id || lead._id || String(index);
      const leadCrm = crmState[id] || {};
      const currentStage = leadCrm.stage || 'new';

      // Text search
      const q = searchFilter.toLowerCase();
      const matchesSearch = 
        !q ||
        (lead.name || '').toLowerCase().includes(q) ||
        (lead.phone || '').includes(q) ||
        (lead.category || '').toLowerCase().includes(q) ||
        (lead.city || lead.mandal || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Stage filter
      if (stageFilter !== 'all' && currentStage !== stageFilter) return false;

      // Tab filter
      if (activeTab === 'whatsapp') return Boolean(lead.phone || lead.whatsappLink);
      if (activeTab === 'topRated') return parseFloat(lead.rating || 0) >= 4.0;
      if (activeTab === 'verified') return Boolean(lead.verified);

      return true;
    });
  }, [leads, searchFilter, stageFilter, activeTab, crmState]);

  // Currently selected lead object
  const activeLead = useMemo(() => {
    if (!selectedLeadId) return filteredLeads[0] || null;
    return leads.find((l, idx) => (l.id || l._id || String(idx)) === selectedLeadId) || filteredLeads[0] || null;
  }, [leads, filteredLeads, selectedLeadId]);

  const activeLeadId = activeLead ? (activeLead.id || activeLead._id || '0') : null;
  const currentLeadCrm = (activeLeadId && crmState[activeLeadId]) || { stage: 'new', notes: [], tasks: [] };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNote.trim() || !activeLeadId) return;
    const noteObj = {
      id: Date.now().toString(),
      text: newNote.trim(),
      date: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }),
      timestamp: Date.now()
    };
    const updatedNotes = [noteObj, ...(currentLeadCrm.notes || [])];
    updateLeadCrm(activeLeadId, { notes: updatedNotes });
    setNewNote('');
    toast.success('Note added');
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.trim() || !activeLeadId) return;
    const taskObj = {
      id: Date.now().toString(),
      text: newTask.trim(),
      completed: false,
      date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    };
    const updatedTasks = [...(currentLeadCrm.tasks || []), taskObj];
    updateLeadCrm(activeLeadId, { tasks: updatedTasks });
    setNewTask('');
    toast.success('Task scheduled');
  };

  const toggleTask = (taskId) => {
    if (!activeLeadId) return;
    const updatedTasks = (currentLeadCrm.tasks || []).map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    updateLeadCrm(activeLeadId, { tasks: updatedTasks });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-violet-500/20 border-t-violet-400 rounded-full animate-spin" />
          <p className="text-xs text-white/40 uppercase font-mono tracking-wider">Loading Lead Vault</p>
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="card p-10 text-center space-y-4">
        <h2 className="text-lg font-bold text-white">Vault Not Found</h2>
        <p className="text-xs text-white/50">The requested lead vault could not be loaded or has been deleted.</p>
        <button onClick={() => navigate('/app/folders')} className="btn btn-primary btn-sm">
          Return to Vaults
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/folders')}
            className="p-2 rounded-xl bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Back to Vaults"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">
                {folder.name || 'Lead Vault'}
              </h1>
              <span className="badge badge-violet text-xs font-mono">
                {leads.length} Leads
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5">
              <span className="text-violet-400 font-medium">{folder.category || 'General'}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {folder.location || 'India'}
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportSessionToCSV(folder)}
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => exportSessionToJSON(folder)}
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
          >
            <span className="hidden sm:inline">Export JSON</span>
          </button>
          <button
            onClick={() => navigate('/app/crm')}
            className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-lg shadow-violet-600/20"
          >
            <span>View in Pipeline</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Mobile Tab Navigation (< 768px) */}
      <div className="flex md:hidden items-center border border-white/10 rounded-xl p-1 bg-white/[0.02] gap-1">
        <button
          onClick={() => setMobileTab('leads')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            mobileTab === 'leads' ? 'bg-violet-600 text-white' : 'text-white/60 hover:text-white'
          }`}
        >
          Leads ({filteredLeads.length})
        </button>
        <button
          onClick={() => setMobileTab('detail')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            mobileTab === 'detail' ? 'bg-violet-600 text-white' : 'text-white/60 hover:text-white'
          }`}
        >
          Lead Detail
        </button>
        <button
          onClick={() => setMobileTab('crm')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            mobileTab === 'crm' ? 'bg-violet-600 text-white' : 'text-white/60 hover:text-white'
          }`}
        >
          CRM & Tasks
        </button>
      </div>

      {/* 3-PANE LAYOUT (DESKTOP) / TABBED (MOBILE) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-210px)] min-h-[580px]">
        {/* ── LEFT PANE: LEADS LIST (COL 1 to 4) ── */}
        <div className={`md:col-span-4 flex flex-col card overflow-hidden ${
          isMobile && mobileTab !== 'leads' ? 'hidden' : 'flex'
        }`}>
          {/* Search & Filters */}
          <div className="p-3 border-b border-white/[0.06] space-y-2 bg-white/[0.01]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search leads in vault..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50"
              />
            </div>

            {/* Stage filter dropdown & pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-md transition-colors shrink-0 ${
                  activeTab === 'all' ? 'bg-violet-500/20 text-violet-300 font-semibold' : 'text-white/50 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`px-2.5 py-1 rounded-md transition-colors shrink-0 flex items-center gap-1 ${
                  activeTab === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-white/50 hover:text-white'
                }`}
              >
                Phone
              </button>
              <button
                onClick={() => setActiveTab('topRated')}
                className={`px-2.5 py-1 rounded-md transition-colors shrink-0 flex items-center gap-1 ${
                  activeTab === 'topRated' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-white/50 hover:text-white'
                }`}
              >
                ⭐ 4.0+
              </button>
              <button
                onClick={() => setActiveTab('verified')}
                className={`px-2.5 py-1 rounded-md transition-colors shrink-0 flex items-center gap-1 ${
                  activeTab === 'verified' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-white/50 hover:text-white'
                }`}
              >
                Verified
              </button>
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
            {filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/40">
                No matching leads found
              </div>
            ) : (
              filteredLeads.map((lead, idx) => {
                const id = lead.id || lead._id || String(idx);
                const isSelected = id === activeLeadId;
                const leadStage = crmState[id]?.stage || 'new';
                const stageObj = CRM_STAGES.find(s => s.id === leadStage) || CRM_STAGES[0];

                return (
                  <div
                    key={id}
                    onClick={() => {
                      setSelectedLeadId(id);
                      if (isMobile) setMobileTab('detail');
                    }}
                    className={`p-3 cursor-pointer transition-colors flex items-start justify-between gap-2 ${
                      isSelected ? 'bg-violet-600/15 border-l-2 border-violet-500' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white truncate">
                          {lead.name}
                        </span>
                        {lead.verified && (
                          <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-white/50">
                        {lead.phone ? (
                          <span className="font-mono text-emerald-400/90 flex items-center gap-0.5">
                            <Phone size={10} />
                            {lead.phone}
                          </span>
                        ) : (
                          <span className="text-white/30 italic">No phone</span>
                        )}
                        <span>•</span>
                        <span className="truncate">{lead.mandal || lead.city || 'India'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/70 font-mono">
                        {stageObj.icon} {stageObj.label}
                      </span>
                      {lead.rating && (
                        <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5">
                          ⭐ {lead.rating}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── CENTER PANE: LEAD DETAIL (COL 5 to 8) ── */}
        <div className={`md:col-span-5 flex flex-col card overflow-y-auto ${
          isMobile && mobileTab !== 'detail' ? 'hidden' : 'flex'
        }`}>
          {activeLead ? (
            <div className="p-5 space-y-6">
              {/* Header card with name & quick actions */}
              <div className="space-y-3 pb-4 border-b border-white/[0.06]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      {activeLead.name}
                      {activeLead.verified && (
                        <span className="badge badge-emerald text-[10px] py-0.5">Verified</span>
                      )}
                    </h2>
                    <p className="text-xs text-violet-400 font-medium mt-0.5">
                      {activeLead.category || folder.category}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold font-mono text-amber-400 flex items-center justify-end gap-1">
                      ⭐ {activeLead.rating || '4.5'}
                    </div>
                    <div className="text-[10px] text-white/40">
                      {activeLead.reviewCount || '15'} Reviews
                    </div>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  {activeLead.phone ? (
                    <a
                      href={`tel:${activeLead.phone}`}
                      className="btn btn-secondary btn-sm py-2 flex items-center justify-center gap-1.5 text-emerald-400"
                    >
                      <Phone size={14} />
                      <span>Call</span>
                    </a>
                  ) : null}

                  {activeLead.phone ? (
                    <a
                      href={`https://wa.me/91${activeLead.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(activeLead.name)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-emerald btn-sm py-2 flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare size={14} />
                      <span>WhatsApp</span>
                    </a>
                  ) : null}

                  {activeLead.website ? (
                    <a
                      href={activeLead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm py-2 flex items-center justify-center gap-1.5 text-cyan-400"
                    >
                      <Globe size={14} />
                      <span>Website</span>
                    </a>
                  ) : null}

                  <button
                    onClick={() => copyToClipboard(activeLead.phone, 'Phone')}
                    className="btn btn-secondary btn-sm py-2 flex items-center justify-center gap-1.5"
                  >
                    {copiedField === 'Phone' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              {/* Contact & Location Attributes */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 font-mono">
                  Lead Information
                </h3>
                <div className="grid grid-cols-1 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-start gap-3">
                    <MapPin size={16} className="text-violet-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-white/40 text-[10px] uppercase font-semibold">Address</div>
                      <div className="text-white mt-0.5">
                        {activeLead.address || `${activeLead.mandal || ''}, ${activeLead.district || ''}, ${activeLead.city || activeLead.state || 'India'}`}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-start gap-3">
                    <Phone size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-white/40 text-[10px] uppercase font-semibold">Phone Numbers</div>
                      <div className="text-white font-mono mt-0.5 flex items-center justify-between">
                        <span>{activeLead.phone || 'None recorded'}</span>
                        {activeLead.secondaryPhone && (
                          <span className="text-white/50 text-[11px]">(Alt: {activeLead.secondaryPhone})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {activeLead.email && (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-start gap-3">
                      <Mail size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-white/40 text-[10px] uppercase font-semibold">Email</div>
                        <div className="text-white mt-0.5 font-mono">{activeLead.email}</div>
                      </div>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-start gap-3">
                    <Award size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-white/40 text-[10px] uppercase font-semibold">Quality & Source</div>
                      <div className="text-white mt-0.5 flex items-center gap-2">
                        <span>Score: {activeLead.qualityScore || 85}/100</span>
                        <span>•</span>
                        <span className="text-white/50 text-[11px]">
                          {activeLead.source || 'Neural Entity Recognizer'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-white/40 text-xs">
              Select a lead from the list to view comprehensive details
            </div>
          )}
        </div>

        {/* ── RIGHT PANE: CRM STAGE, NOTES, TASKS (COL 9 to 12) ── */}
        <div className={`md:col-span-3 flex flex-col card overflow-y-auto ${
          isMobile && mobileTab !== 'crm' ? 'hidden' : 'flex'
        }`}>
          {activeLead ? (
            <div className="p-4 space-y-5">
              {/* Pipeline Stage Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 font-mono">
                  Pipeline Stage
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CRM_STAGES.map(stage => {
                    const isCurrent = (currentLeadCrm.stage || 'new') === stage.id;
                    return (
                      <button
                        key={stage.id}
                        onClick={() => updateLeadCrm(activeLeadId, { stage: stage.id })}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all text-left ${
                          isCurrent
                            ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 font-bold'
                            : 'bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.06]'
                        }`}
                      >
                        <span>{stage.icon}</span>
                        <span className="truncate">{stage.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tasks Checklist */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 font-mono">
                    Follow-up Tasks
                  </label>
                  <span className="text-[10px] text-white/40 font-mono">
                    {(currentLeadCrm.tasks || []).filter(t => t.completed).length}/{(currentLeadCrm.tasks || []).length}
                  </span>
                </div>

                <form onSubmit={handleAddTask} className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Add task (e.g., Call tomorrow)..."
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500"
                  />
                  <button type="submit" className="btn btn-primary btn-sm px-2 text-xs">
                    Add
                  </button>
                </form>

                <div className="space-y-1 max-h-36 overflow-y-auto pt-1">
                  {(currentLeadCrm.tasks || []).map(task => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/[0.03] cursor-pointer text-xs group"
                    >
                      {task.completed ? (
                        <CheckSquare size={14} className="text-emerald-400 shrink-0" />
                      ) : (
                        <Square size={14} className="text-white/40 shrink-0" />
                      )}
                      <span className={`flex-1 truncate ${task.completed ? 'line-through text-white/40' : 'text-white'}`}>
                        {task.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes Feed */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 font-mono">
                  Activity Notes
                </label>

                <form onSubmit={handleAddNote} className="space-y-1.5">
                  <textarea
                    rows={2}
                    placeholder="Log client discussion or call notes..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg p-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500 resize-none"
                  />
                  <div className="flex justify-end">
                    <button type="submit" className="btn btn-secondary btn-sm py-1 px-3 text-xs">
                      Save Note
                    </button>
                  </div>
                </form>

                <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                  {(currentLeadCrm.notes || []).map(note => (
                    <div key={note.id} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs space-y-1">
                      <div className="text-white/80 whitespace-pre-wrap">{note.text}</div>
                      <div className="text-[10px] text-white/30 font-mono">{note.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-white/40 text-xs">
              No lead selected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
