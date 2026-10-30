import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ArrowLeft, Folder, MapPin, Phone, MessageSquare, Globe, Star, 
  Download, ExternalLink, CheckCircle2, ShieldCheck, Copy, 
  Search, Compass, Check, Mail, LayoutGrid, Table, List, Sparkles,
  Layers, Building2, ChevronRight, UserPlus, Flame, Zap, Award, 
  Send, CheckSquare, Square, ChevronDown, Clock, Edit3, Trash2, 
  Shield, Info, RefreshCw, Bookmark, Filter, FileSpreadsheet
} from 'lucide-react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../apiConfig';

// ── CRM PIPELINE LIFECYCLE STAGES ──
const CRM_STAGES = [
  { id: 'all', label: 'All Stages', icon: '📁', badge: 'bg-white/10 text-white' },
  { id: 'new', label: 'New Lead', icon: '🌱', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { id: 'pitch_sent', label: 'Pitch Sent', icon: '📤', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { id: 'in_discussion', label: 'In Discussion', icon: '💬', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { id: 'qualified', label: 'Qualified', icon: '⭐', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  { id: 'won', label: 'Closed Won', icon: '🏆', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { id: 'archived', label: 'Archived', icon: '📦', badge: 'bg-slate-500/20 text-slate-400 border-slate-500/40' },
];

export default function FolderLeadsModal({ 
  isOpen, 
  onClose, 
  folder, 
  onLoadToCockpit 
}) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table' | 'list'
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'whatsapp' | 'topRated' | 'verified' | 'website' | 'hot'
  const [selectedLocality, setSelectedLocality] = useState('all');
  const [selectedCrmStage, setSelectedCrmStage] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  
  // Selection for bulk actions
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  // CRM State Management: stage & notes per lead persisted in localStorage
  const crmStorageKey = useMemo(() => {
    return `vault_crm_state_${folder?.id || folder?.category || 'default'}_${folder?.timestamp || 'session'}`;
  }, [folder?.id, folder?.category, folder?.timestamp]);

  const [crmData, setCrmData] = useState(() => {
    try {
      const saved = localStorage.getItem(crmStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save CRM changes
  useEffect(() => {
    try {
      localStorage.setItem(crmStorageKey, JSON.stringify(crmData));
    } catch {
      // ignore
    }
  }, [crmData, crmStorageKey]);

  // Custom generated / manually added leads inside this folder
  const customLeadsStorageKey = useMemo(() => {
    return `vault_custom_leads_${folder?.id || folder?.category || 'default'}`;
  }, [folder?.id, folder?.category]);

  const [customLeads, setCustomLeads] = useState(() => {
    try {
      const saved = localStorage.getItem(customLeadsStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(customLeadsStorageKey, JSON.stringify(customLeads));
    } catch {
      // ignore
    }
  }, [customLeads, customLeadsStorageKey]);

  // Modal / Drawer states
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [activePitchLead, setActivePitchLead] = useState(null);
  const [selectedPitchTemplate, setSelectedPitchTemplate] = useState('b2b');
  const [activeNotesLead, setActiveNotesLead] = useState(null);
  const [currentLeadNote, setCurrentLeadNote] = useState('');

  // New Lead Form State
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    category: folder?.category || 'Cafe',
    phone: '',
    address: '',
    mandal: '',
    city: folder?.location || 'Bangalore',
    website: '',
    email: '',
    rating: '4.5',
    crmStage: 'new',
    notes: ''
  });

  // Close page with Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (activePitchLead) setActivePitchLead(null);
        else if (activeNotesLead) setActiveNotesLead(null);
        else if (isAddLeadModalOpen) setIsAddLeadModalOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, activePitchLead, activeNotesLead, isAddLeadModalOpen]);

  if (!isOpen || !folder) return null;

  // Combine scraped leads with custom-generated leads
  const allLeads = useMemo(() => {
    const scraped = folder.leads || [];
    return [...scraped, ...customLeads];
  }, [folder.leads, customLeads]);

  // Helper to get lead unique key
  const getLeadKey = (lead, idx) => lead.id || lead.placeId || `${lead.name}_${lead.phone || idx}`;

  // Helper to get current lead CRM stage
  const getLeadStage = (lead, idx) => {
    const key = getLeadKey(lead, idx);
    return crmData[key]?.stage || lead.crmStage || 'new';
  };

  // Helper to get lead notes
  const getLeadNotes = (lead, idx) => {
    const key = getLeadKey(lead, idx);
    return crmData[key]?.notes || '';
  };

  // Update CRM stage
  const updateLeadStage = (lead, idx, stage) => {
    const key = getLeadKey(lead, idx);
    setCrmData(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        stage,
        updatedAt: Date.now()
      }
    }));
    toast.success(`Moved to ${CRM_STAGES.find(s => s.id === stage)?.label || stage}`, { icon: '🎯' });
  };

  // Save lead notes
  const saveLeadNotes = (lead, idx, notes) => {
    const key = getLeadKey(lead, idx);
    setCrmData(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        notes,
        updatedAt: Date.now()
      }
    }));
    toast.success('Notes saved to CRM!', { icon: '📝' });
    setActiveNotesLead(null);
  };

  // Calculate Lead Intelligence Score (0 - 100)
  const calculateLeadScore = (lead) => {
    let score = 20; // baseline
    if (lead.phone && !lead.phone.includes('Obfuscated') && !lead.phone.includes('Requires')) score += 35;
    if (lead.website && lead.website.startsWith('http')) score += 20;
    if (parseFloat(lead.rating) >= 4.0) score += 15;
    if (lead.verified) score += 10;
    return Math.min(score, 100);
  };

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard!', { icon: '📋' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Derive unique scraped localities / places
  const scrapedLocalities = useMemo(() => {
    const counts = {};
    allLeads.forEach(lead => {
      const place = lead.mandal || lead.city || 'Central Area';
      counts[place] = (counts[place] || 0) + 1;
    });

    const list = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return [{ name: 'all', label: 'All Localities', count: allLeads.length }, ...list];
  }, [allLeads]);

  // CRM Stage counts for funnel
  const stageCounts = useMemo(() => {
    const counts = { all: allLeads.length, new: 0, pitch_sent: 0, in_discussion: 0, qualified: 0, won: 0, archived: 0 };
    allLeads.forEach((lead, idx) => {
      const stage = getLeadStage(lead, idx);
      if (counts[stage] !== undefined) counts[stage]++;
      else counts.new++;
    });
    return counts;
  }, [allLeads, crmData]);

  // Unified multi-filter
  const filteredLeads = useMemo(() => {
    let list = allLeads;

    // Filter by locality
    if (selectedLocality !== 'all') {
      list = list.filter(l => (l.mandal || l.city || 'Central Area') === selectedLocality);
    }

    // Filter by CRM stage
    if (selectedCrmStage !== 'all') {
      list = list.filter((l, idx) => getLeadStage(l, idx) === selectedCrmStage);
    }

    // Filter by search query
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      list = list.filter(l => 
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.phone && l.phone.toLowerCase().includes(q)) ||
        (l.address && l.address.toLowerCase().includes(q)) ||
        (l.mandal && l.mandal.toLowerCase().includes(q)) ||
        (l.city && l.city.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q))
      );
    }

    // Filter by active category tab
    if (activeTab === 'whatsapp') {
      list = list.filter(l => l.phone && !l.phone.includes('Obfuscated') && !l.phone.includes('Requires'));
    } else if (activeTab === 'topRated') {
      list = list.filter(l => parseFloat(l.rating) >= 4.0);
    } else if (activeTab === 'verified') {
      list = list.filter(l => l.verified);
    } else if (activeTab === 'website') {
      list = list.filter(l => l.website && l.website.startsWith('http'));
    } else if (activeTab === 'hot') {
      list = list.filter(l => calculateLeadScore(l) >= 80);
    }

    return list;
  }, [allLeads, selectedLocality, selectedCrmStage, searchFilter, activeTab, crmData]);

  const stats = useMemo(() => {
    const total = allLeads.length;
    const withPhone = allLeads.filter(l => l.phone && !l.phone.includes('Obfuscated') && !l.phone.includes('Requires')).length;
    const verified = allLeads.filter(l => l.verified).length;
    const rated = allLeads.filter(l => parseFloat(l.rating) > 0);
    const avgRating = rated.length > 0 
      ? (rated.reduce((acc, l) => acc + parseFloat(l.rating), 0) / rated.length).toFixed(1) 
      : 'N/A';
    const withWeb = allLeads.filter(l => l.website && l.website.startsWith('http')).length;
    const hotLeads = allLeads.filter(l => calculateLeadScore(l) >= 80).length;
    return { total, withPhone, verified, avgRating, withWeb, hotLeads };
  }, [allLeads]);

  // Formatted Timestamp representation (e.g. 19 Oct 2026, 22:40)
  const formattedTimestamp = useMemo(() => {
    if (folder.timestamp) {
      try {
        const d = new Date(folder.timestamp);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
               d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      } catch {
        return '19 Oct 2026, 22:40';
      }
    }
    return '19 Oct 2026, 22:40';
  }, [folder.timestamp]);

  // Handle manual lead creation
  const handleCreateLead = (e) => {
    e.preventDefault();
    if (!newLeadForm.name.trim()) return toast.error('Business Name is required');

    const createdLead = {
      id: `custom_${Date.now()}`,
      name: newLeadForm.name.trim(),
      category: newLeadForm.category.trim() || folder.category || 'Business',
      phone: newLeadForm.phone.trim(),
      address: newLeadForm.address.trim(),
      mandal: newLeadForm.mandal.trim() || 'Central',
      city: newLeadForm.city.trim() || folder.location || 'India',
      website: newLeadForm.website.trim(),
      email: newLeadForm.email.trim(),
      rating: newLeadForm.rating || '4.5',
      verified: true,
      source: 'manual_lead_gen',
      createdAt: Date.now()
    };

    setCustomLeads(prev => [createdLead, ...prev]);

    if (newLeadForm.notes) {
      setCrmData(prev => ({
        ...prev,
        [createdLead.id]: {
          stage: newLeadForm.crmStage,
          notes: newLeadForm.notes,
          updatedAt: Date.now()
        }
      }));
    }

    toast.success(`Generated lead for "${createdLead.name}"!`, { icon: '🚀' });
    setIsAddLeadModalOpen(false);
    setNewLeadForm({
      name: '',
      category: folder?.category || 'Cafe',
      phone: '',
      address: '',
      mandal: '',
      city: folder?.location || 'Bangalore',
      website: '',
      email: '',
      rating: '4.5',
      crmStage: 'new',
      notes: ''
    });
  };

  // Bulk operations
  const handleToggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l, i) => getLeadKey(l, i)));
    }
  };

  const handleToggleSelectLead = (key) => {
    setSelectedLeadIds(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleBulkSetStage = (stage) => {
    if (!selectedLeadIds.length) return;
    setCrmData(prev => {
      const updated = { ...prev };
      selectedLeadIds.forEach(key => {
        updated[key] = {
          ...(updated[key] || {}),
          stage,
          updatedAt: Date.now()
        };
      });
      return updated;
    });
    toast.success(`Updated ${selectedLeadIds.length} leads to ${CRM_STAGES.find(s => s.id === stage)?.label}!`, { icon: '✅' });
    setSelectedLeadIds([]);
  };

  const handleBulkCopyPhones = () => {
    const phones = filteredLeads
      .filter((l, i) => selectedLeadIds.includes(getLeadKey(l, i)))
      .map(l => l.phone)
      .filter(p => p && !p.includes('Obfuscated'));

    if (!phones.length) return toast.error('No valid phone numbers in selection');
    navigator.clipboard.writeText(phones.join('\n'));
    toast.success(`Copied ${phones.length} phone numbers!`, { icon: '📋' });
  };

  // Export handlers
  const handleExportCSV = () => {
    if (!filteredLeads.length) return toast.error('No leads to export');
    const enriched = filteredLeads.map((l, idx) => ({
      ...l,
      crm_stage: getLeadStage(l, idx),
      crm_score: calculateLeadScore(l),
      crm_notes: getLeadNotes(l, idx)
    }));
    const csv = Papa.unparse(enriched);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const filename = `${(folder.category || 'leads').toLowerCase().replace(/\s+/g, '_')}_${(folder.location || 'all').toLowerCase().replace(/\s+/g, '_')}_crm_${Date.now()}.csv`;
    saveAs(blob, filename);
    toast.success(`Exported ${enriched.length} leads with CRM stages to CSV!`, { icon: '📊' });
  };

  const handleExportJSON = () => {
    if (!filteredLeads.length) return toast.error('No leads to export');
    const enriched = filteredLeads.map((l, idx) => ({
      ...l,
      crm_stage: getLeadStage(l, idx),
      crm_score: calculateLeadScore(l),
      crm_notes: getLeadNotes(l, idx)
    }));
    const jsonStr = JSON.stringify(enriched, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const filename = `${(folder.category || 'leads').toLowerCase().replace(/\s+/g, '_')}_crm_${Date.now()}.json`;
    saveAs(blob, filename);
    toast.success(`Exported ${enriched.length} leads to JSON!`, { icon: '📄' });
  };

  // Deep Enrichment Handlers
  const handleDeepEnrichAll = async () => {
    try {
      toast.loading('⚡ Initiating Deep Contact Extraction...', { id: 'deep-enrich' });
      const res = await axios.post(`${API_URL}/scrape/deep-enrich`, {
        sessionId: folder?.id
      });
      if (res.data?.success) {
        toast.success(res.data.message || '⚡ Deep enrichment launched in background! Websites being scraped for emails & socials.', { id: 'deep-enrich', icon: '⚡' });
      } else {
        toast.error(res.data?.error || 'Could not start deep enrichment', { id: 'deep-enrich' });
      }
    } catch (err) {
      toast.error(`Deep enrichment failed: ${err.message}`, { id: 'deep-enrich' });
    }
  };

  const handleBulkDeepEnrich = async () => {
    if (!selectedLeadIds.length) return;
    const selectedLeads = filteredLeads
      .filter((l, i) => selectedLeadIds.includes(getLeadKey(l, i)));
    const selectedIds = selectedLeads.map(l => l.id).filter(Boolean);

    try {
      toast.loading(`⚡ Deep extracting ${selectedIds.length} selected leads...`, { id: 'deep-enrich-bulk' });
      const res = await axios.post(`${API_URL}/scrape/deep-enrich`, {
        leadIds: selectedIds,
        sessionId: folder?.id
      });
      if (res.data?.success) {
        toast.success(`⚡ Enrichment launched for ${selectedIds.length} leads!`, { id: 'deep-enrich-bulk', icon: '⚡' });
      } else {
        toast.error(res.data?.error || 'Could not start deep enrichment', { id: 'deep-enrich-bulk' });
      }
    } catch (err) {
      toast.error(`Enrichment request failed: ${err.message}`, { id: 'deep-enrich-bulk' });
    }
  };

  // AI WhatsApp Pitch Templates
  const getPitchMessage = (vendor, templateKey) => {
    const name = vendor?.name || 'there';
    const city = vendor?.city || folder.location || 'Bangalore';
    const place = vendor?.mandal || city;
    const cat = vendor?.category || folder.category || 'business';

    if (templateKey === 'wedding_party') {
      return `Hi ${name}, we are actively onboarding premier verified businesses, ${cat}s, and commercial partners in ${place} for upcoming bookings and client inquiries. Would you be open to receiving direct customer inquiries with zero commission?`;
    }
    if (templateKey === 'exclusive_b2b') {
      return `Hi ${name}, I noticed your ${cat} in ${place}. We are currently indexing verified businesses in ${city} for high-intent customer leads. Can we connect with your management team regarding an exclusive listing?`;
    }
    // Default Direct Value Pitch
    return `Hi ${name}, I found your ${cat} in ${place} and was impressed by your profile. Are you currently accepting corporate reservations and new client inquiries for this season?`;
  };

  return (
    <AnimatePresence>
      {/* ── FULL DEDICATED PAGE OVERLAY (ENTERPRISE CRM LEADS SHOWCASE) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[10000] w-screen h-screen flex flex-col bg-[#070712] text-white overflow-hidden select-text"
      >
        {/* ── TOP CLOSING PAGE HEADER WITH BREADCRUMB & TOOLBAR ── */}
        <header className="px-5 py-3 border-b border-white/[0.08] bg-[#0c0d1b]/95 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 z-20">
          {/* Left: Back / Close Button + Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              title="Close Folder Page and Return to Cockpit (Esc)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/[0.1] text-xs font-bold transition-all cursor-pointer shadow-sm group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Cockpit</span>
              <kbd className="hidden sm:inline-block ml-1 text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-400 border border-white/10">Esc</kbd>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                window.location.href = `/app/folders/${folder.id}`;
              }}
              title="Open as Dedicated URL Page"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <ExternalLink size={12} />
              <span>Open Page</span>
            </button>

            <div className="h-4 w-px bg-white/10 hidden sm:block" />

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs truncate">
              <span className="flex items-center gap-1 text-slate-400">
                <Folder size={12} className="text-violet-400" />
                <span className="hidden sm:inline">Search Vault</span>
              </span>
              <ChevronRight size={12} className="text-slate-600" />
              <span className="font-bold text-white truncate capitalize">
                {folder.category || 'Business Leads'}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-300 font-semibold truncate flex items-center gap-1">
                <MapPin size={11} className="text-cyan-400" />
                <span>{folder.location || 'India'}</span>
              </span>
              <span className="hidden lg:inline-flex px-2 py-0.2 rounded-full text-[9px] font-mono font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                CRM Active
              </span>
            </div>
          </div>

          {/* Right: View Mode Switcher + Actions + Close Button */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid Cards View"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid' 
                    ? 'bg-violet-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid size={13} />
                <span className="hidden sm:inline">Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table Spreadsheet View"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table' 
                    ? 'bg-violet-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Table size={13} />
                <span className="hidden sm:inline">Table</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="Compact CRM List View"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'list' 
                    ? 'bg-violet-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <List size={13} />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>

            {/* Generate / Add Lead Trigger */}
            <button
              type="button"
              onClick={() => setIsAddLeadModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 border border-emerald-400/30 transition-all cursor-pointer"
              title="Generate a new custom lead in this folder"
            >
              <UserPlus size={13} />
              <span>+ Generate Lead</span>
            </button>

            {/* Deep Extract Contact Enrichment Trigger */}
            <button
              type="button"
              onClick={handleDeepEnrichAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 shadow-sm transition-all cursor-pointer"
              title="Extract verified owner emails, social links & logos for all websites in this vault"
            >
              <Zap size={13} className="text-amber-400" />
              <span>⚡ Deep Extract</span>
            </button>

            {/* Quick Export Actions */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300 border border-white/[0.08] hover:border-emerald-500/30 transition-all cursor-pointer shadow-sm"
              title="Export CRM Spreadsheet (CSV)"
            >
              <FileSpreadsheet size={13} />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-violet-500/20 text-slate-200 hover:text-violet-300 border border-white/[0.08] hover:border-violet-500/30 transition-all cursor-pointer shadow-sm"
              title="Export JSON"
            >
              <Download size={13} />
              <span className="hidden sm:inline">JSON</span>
            </button>

            {onLoadToCockpit && (
              <button
                type="button"
                onClick={() => {
                  onLoadToCockpit(folder);
                  onClose();
                }}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-600/30 border border-white/10 transition-all cursor-pointer"
                title="Sync these leads to Cockpit Radar"
              >
                <Compass size={13} />
                <span>Radar Map</span>
              </button>
            )}

            {/* Open as Dedicated Full Page */}
            <button
              type="button"
              onClick={() => {
                const targetId = folder?.id || folder?.sessionId;
                if (targetId) {
                  navigate(`/app/folders/${targetId}`);
                  onClose();
                } else {
                  navigate('/app/folders');
                  onClose();
                }
              }}
              title="Open Dedicated Full Page (/app/folders/:id)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 transition-all cursor-pointer"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">Open Page</span>
            </button>

            {/* Close Page Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close Page"
              className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/[0.08] hover:border-rose-500/30 transition-all cursor-pointer ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* ── HIGHLIGHTED ISOLATED SEARCH VAULT BANNER (EXECUTIVE SHOWCASE) ── */}
        <section className="px-5 py-4 border-b border-violet-500/30 bg-gradient-to-r from-violet-950/80 via-[#0e1025] to-cyan-950/70 relative overflow-hidden shrink-0 shadow-lg shadow-violet-950/40">
          {/* Cyber Ambient Glow background */}
          <div className="absolute -top-12 -left-12 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Prominently Highlighted Search Vault Identity */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Isolated Vault Badge */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30 border border-violet-400/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Isolated Search Vault</span>
                </span>
                <span className="text-slate-600 font-bold">•</span>
                <span className="text-xs font-mono font-bold text-slate-300 bg-black/40 px-2.5 py-0.5 rounded-lg border border-white/10 flex items-center gap-1">
                  <Clock size={11} className="text-violet-400" />
                  <span>({formattedTimestamp})</span>
                </span>
                {customLeads.length > 0 && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    +{customLeads.length} Generated Leads
                  </span>
                )}
              </div>

              {/* Main Title: cafes • bangalore (19 Oct 2026, 22:40) */}
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span className="capitalize text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-violet-200">
                  {folder.category || 'Cafes'}
                </span>
                <span className="text-violet-400">•</span>
                <span className="capitalize text-cyan-300 font-black flex items-center gap-1">
                  <MapPin size={18} className="text-cyan-400 shrink-0" />
                  <span>{folder.location || 'Bangalore'}</span>
                </span>
              </h1>

              {/* Highlighted Subtitle */}
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs sm:text-sm font-semibold text-slate-300">
                  Isolated Search Vault • Showing{' '}
                  <span className="text-emerald-400 font-black text-sm bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    {filteredLeads.length}
                  </span>{' '}
                  of{' '}
                  <span className="text-violet-300 font-black text-sm bg-violet-500/10 px-2 py-0.5 rounded-md border border-violet-500/20">
                    {allLeads.length}
                  </span>{' '}
                  leads in one unified professional view.
                </p>
              </div>
            </div>

            {/* Right: CRM Funnel Quick Metric Chips */}
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0">
              <div className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2.5 shadow-sm">
                <span className="text-sm font-mono font-black text-white">{stats.total}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vault Total</span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 shadow-sm">
                <Phone size={13} className="text-emerald-400" />
                <span className="text-sm font-mono font-black text-emerald-300">{stats.withPhone}</span>
                <span className="text-[10px] text-emerald-300/80 font-bold uppercase tracking-wider">Direct WhatsApp</span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 shadow-sm">
                <Flame size={13} className="text-rose-400" />
                <span className="text-sm font-mono font-black text-rose-300">{stats.hotLeads}</span>
                <span className="text-[10px] text-rose-300/80 font-bold uppercase tracking-wider">Hot Prospects</span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2 shadow-sm">
                <Star size={13} className="text-amber-400 fill-amber-400" />
                <span className="text-sm font-mono font-black text-amber-300">{stats.avgRating}</span>
                <span className="text-[10px] text-amber-300/80 font-bold uppercase tracking-wider">Avg Rating</span>
              </div>
            </div>
          </div>

          {/* ── CRM LIFECYCLE STAGE SELECTOR (LEAD FUNNEL BAR) ── */}
          <div className="mt-3.5 pt-3 border-t border-white/[0.08] flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            <span className="text-[10.5px] font-mono text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Zap size={11} className="text-cyan-400" />
              <span>CRM Stage:</span>
            </span>

            {CRM_STAGES.map(stage => {
              const count = stageCounts[stage.id] || 0;
              const isSelected = selectedCrmStage === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setSelectedCrmStage(stage.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-violet-600 text-white border-violet-400 shadow-md shadow-violet-600/30'
                      : 'bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.07] border-white/[0.06]'
                  }`}
                >
                  <span>{stage.icon}</span>
                  <span>{stage.label}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono ${
                    isSelected ? 'bg-black/30 text-white font-black' : 'bg-white/[0.08] text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── SCRAPED LOCALITY BREAKDOWN PILLS ── */}
          {scrapedLocalities.length > 2 && (
            <div className="mt-2.5 pt-2 border-t border-white/[0.05] flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Layers size={11} className="text-violet-400" />
                <span>Localities:</span>
              </span>

              {scrapedLocalities.map((loc) => {
                const isSelected = selectedLocality === loc.name;
                return (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => setSelectedLocality(loc.name)}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm shadow-cyan-600/30'
                        : 'bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.07] border-white/[0.06]'
                    }`}
                  >
                    <span>{loc.label || loc.name}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${
                      isSelected ? 'bg-black/30 text-white' : 'bg-white/[0.06] text-slate-400'
                    }`}>
                      {loc.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── SEARCH & CRITERIA FILTER BAR ── */}
        <div className="px-5 py-2.5 border-b border-white/[0.06] bg-[#090a16] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Instant Search in Folder */}
          <div className="relative flex-1 max-w-md">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search leads by name, phone, address, locality, email..."
              className="w-full bg-white/[0.04] text-xs text-white placeholder-slate-500 rounded-xl pl-8 pr-3 py-1.5 border border-white/[0.08] focus:border-violet-500/60 focus:outline-none transition-all"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
            {[
              { id: 'all', label: `All (${allLeads.length})` },
              { id: 'whatsapp', label: `WhatsApp (${stats.withPhone})` },
              { id: 'hot', label: `🔥 Hot Prospects (${stats.hotLeads})` },
              { id: 'topRated', label: `★ 4.0+ Top` },
              { id: 'verified', label: `Verified (${stats.verified})` },
              { id: 'website', label: `Websites (${stats.withWeb})` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/30'
                    : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── BULK ACTION FLOATING TOOLBAR (WHEN LEADS ARE CHECKED) ── */}
        {selectedLeadIds.length > 0 && (
          <div className="px-5 py-2 bg-gradient-to-r from-violet-900/90 to-indigo-900/90 border-b border-violet-500/30 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2 shrink-0 z-10 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>{selectedLeadIds.length} leads selected</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedLeadIds([])}
                className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-300 text-[11px] font-mono hidden md:inline">Bulk Move:</span>
              <button
                type="button"
                onClick={() => handleBulkSetStage('pitch_sent')}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold cursor-pointer"
              >
                📤 Pitch Sent
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetStage('qualified')}
                className="px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/40 text-[11px] font-bold cursor-pointer"
              >
                ⭐ Qualified
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetStage('won')}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold cursor-pointer"
              >
                🏆 Closed Won
              </button>
              <button
                type="button"
                onClick={handleBulkCopyPhones}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1"
              >
                <Copy size={11} />
                <span>Copy Phones</span>
              </button>
              <button
                type="button"
                onClick={handleBulkDeepEnrich}
                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold cursor-pointer flex items-center gap-1 shadow-sm"
                title="Deep extract verified owner emails and social channels for selected leads"
              >
                <Zap size={11} className="text-amber-400" />
                <span>⚡ Deep Extract ({selectedLeadIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* ── MAIN CONTENT AREA (GRID / TABLE / LIST) ── */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-[#06060f]">
          {filteredLeads.length === 0 ? (
            <div className="py-24 text-center text-slate-500">
              <Folder size={48} className="mx-auto mb-3 opacity-20 text-violet-400" />
              <p className="font-bold text-sm text-slate-300">No leads match your filter</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting the CRM stage, locality filter, or search query</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => { setSearchFilter(''); setSelectedLocality('all'); setSelectedCrmStage('all'); setActiveTab('all'); }}
                  className="px-3 py-1.5 rounded-xl bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 text-xs font-bold transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <UserPlus size={13} />
                  <span>+ Generate New Lead</span>
                </button>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            /* ═══════════════════════════════════════════════════════════════════ */
            /* 1. PROFESSIONAL GRID CARDS VIEW WITH CRM CONTROLS                  */
            /* ═══════════════════════════════════════════════════════════════════ */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredLeads.map((vendor, idx) => {
                const leadKey = getLeadKey(vendor, idx);
                const currentStage = getLeadStage(vendor, idx);
                const leadScore = calculateLeadScore(vendor);
                const hasPhone = !!(vendor.phone && !vendor.phone.includes('Obfuscated') && !vendor.phone.includes('Requires'));
                const cleanPhone = hasPhone ? vendor.phone.replace(/\D/g) : '';
                const isSelected = selectedLeadIds.includes(leadKey);
                const hasNotes = !!getLeadNotes(vendor, idx);

                return (
                  <motion.div
                    key={leadKey}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(idx * 0.015, 0.25) }}
                    className={`rounded-2xl border ${
                      isSelected ? 'border-violet-500 bg-[#12112a]' : 'border-white/[0.08] bg-[#0e0f1e]/90'
                    } hover:border-violet-500/50 p-4 transition-all flex flex-col justify-between group shadow-sm hover:shadow-xl hover:shadow-violet-950/20 relative`}
                  >
                    <div>
                      {/* Top Checkbox & CRM Status Row */}
                      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/[0.05]">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectLead(leadKey)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare size={15} className="text-violet-400" />
                          ) : (
                            <Square size={15} className="text-slate-600 group-hover:text-slate-400" />
                          )}
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* Lead Score Chip */}
                          <span className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-mono font-bold border ${
                            leadScore >= 80 
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
                              : leadScore >= 55 
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                              : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                          }`}>
                            {leadScore >= 80 ? '🔥' : leadScore >= 55 ? '⚡' : '❄️'} {leadScore}
                          </span>

                          {/* Interactive CRM Stage Pill Selector */}
                          <select
                            value={currentStage}
                            onChange={(e) => updateLeadStage(vendor, idx, e.target.value)}
                            className="text-[10px] font-bold bg-[#17182e] text-slate-200 border border-white/10 rounded-lg px-2 py-0.5 focus:outline-none focus:border-violet-400 cursor-pointer"
                          >
                            <option value="new">🌱 New</option>
                            <option value="pitch_sent">📤 Pitch Sent</option>
                            <option value="in_discussion">💬 In Discussion</option>
                            <option value="qualified">⭐ Qualified</option>
                            <option value="won">🏆 Closed Won</option>
                            <option value="archived">📦 Archived</option>
                          </select>
                        </div>
                      </div>

                      {/* Business Identity Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Logo Thumbnail / Monogram */}
                          {(vendor.logo || vendor.photo || vendor.images?.[0]) ? (
                            <img
                              src={vendor.logo || vendor.photo || vendor.images?.[0]}
                              alt={vendor.name}
                              className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0 shadow-md"
                              onError={(e) => { 
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.name || 'Vendor')}&background=6366f1&color=fff&bold=true&size=128`;
                              }}
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border border-violet-500/30 flex items-center justify-center text-sm font-black text-violet-300 shrink-0 shadow-md">
                              {vendor.name?.[0]?.toUpperCase() || 'B'}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-black text-white group-hover:text-violet-300 transition-colors leading-snug truncate">
                                {vendor.name}
                              </h4>
                              {vendor.verified && (
                                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1 py-0.2 rounded-full">
                                  <ShieldCheck size={9} />
                                  <span>Verified</span>
                                </span>
                              )}
                            </div>
                            
                            <p className="text-[10.5px] text-violet-400 font-semibold mt-0.5 truncate capitalize">
                              {vendor.category || folder.category || 'Business'}
                            </p>
                          </div>
                        </div>

                        {vendor.rating && (
                          <span className="flex items-center gap-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-lg text-[9.5px] font-black shrink-0">
                            <Star size={10} className="fill-amber-300 text-amber-300" />
                            <span>{vendor.rating}</span>
                            {vendor.reviewsCount && (
                              <span className="text-[8px] text-amber-400/70 font-normal">({vendor.reviewsCount})</span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Full Address & Scraped Locality Badge */}
                      <div className="mt-2.5 text-[10.5px] text-slate-300 space-y-1">
                        <p className="flex items-start gap-1.5 text-slate-300">
                          <MapPin size={11} className="text-cyan-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-relaxed">
                            {vendor.address || `${vendor.mandal ? vendor.mandal + ', ' : ''}${vendor.city || folder.location || 'India'}`}
                          </span>
                        </p>

                        {/* Locality & Contact pills */}
                        <div className="flex items-center gap-1 flex-wrap pt-1">
                          {vendor.mandal && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                              📍 {vendor.mandal}
                            </span>
                          )}
                          {vendor.city && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                              🏙️ {vendor.city}
                            </span>
                          )}
                          {vendor.email && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              ✉️ {vendor.email}
                            </span>
                          )}
                          {vendor.website && (
                            <a
                              href={vendor.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-violet-500/15 text-violet-300 border border-violet-500/30 hover:underline flex items-center gap-1"
                            >
                              🌐 Web
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Notes Preview if available */}
                      {hasNotes && (
                        <div className="mt-2 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200/90 flex items-start gap-1">
                          <Bookmark size={11} className="text-amber-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1 italic">{getLeadNotes(vendor, idx)}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Contact & Action Bar */}
                    <div className="mt-3 pt-2.5 border-t border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Phone size={11} className={hasPhone ? 'text-emerald-400' : 'text-slate-600'} />
                          {hasPhone ? (
                            <span className="text-xs font-mono font-bold text-emerald-400 truncate">
                              {vendor.phone}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-500 italic">
                              Phone not indexed
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Notes trigger */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveNotesLead({ vendor, idx });
                              setCurrentLeadNote(getLeadNotes(vendor, idx));
                            }}
                            title="Add / Edit CRM Notes"
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              hasNotes ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                            }`}
                          >
                            <Bookmark size={11} />
                          </button>

                          {hasPhone && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(vendor.phone, leadKey)}
                              title="Copy Phone"
                              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                            >
                              {copiedId === leadKey ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 1-Click WhatsApp Pitch Generator & Call Actions */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {hasPhone ? (
                          <button
                            type="button"
                            onClick={() => setActivePitchLead({ vendor, idx })}
                            className="py-1 px-2 rounded-xl text-[10.5px] font-black bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                            title="Launch 1-Click AI WhatsApp Pitch Engine"
                          >
                            <MessageSquare size={11} />
                            <span>AI Pitch</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="py-1 px-2 rounded-xl text-[10.5px] font-medium bg-white/[0.02] text-slate-600 border border-white/[0.04] flex items-center justify-center gap-1 cursor-not-allowed"
                          >
                            <MessageSquare size={11} />
                            <span>No Phone</span>
                          </button>
                        )}

                        {hasPhone ? (
                          <a
                            href={`tel:${vendor.phone}`}
                            className="py-1 px-2 rounded-xl text-[10.5px] font-black bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Phone size={11} />
                            <span>Call</span>
                          </a>
                        ) : vendor.website ? (
                          <a
                            href={vendor.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1 px-2 rounded-xl text-[10.5px] font-bold bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 flex items-center justify-center gap-1.5 transition-all truncate"
                          >
                            <Globe size={11} />
                            <span>Website</span>
                          </a>
                        ) : (
                          <span className="py-1 px-2 rounded-xl text-[10.5px] text-slate-600 border border-white/[0.04] text-center">
                            N/A
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : viewMode === 'table' ? (
            /* ═══════════════════════════════════════════════════════════════════ */
            /* 2. ENTERPRISE SPREADSHEET TABLE VIEW WITH CRM STAGES               */
            /* ═══════════════════════════════════════════════════════════════════ */
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d1b] overflow-hidden shadow-xl">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 font-mono text-[10.5px] uppercase tracking-wider">
                      <th className="py-3 px-3 w-8">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="cursor-pointer"
                        >
                          {selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0 ? (
                            <CheckSquare size={14} className="text-violet-400" />
                          ) : (
                            <Square size={14} className="text-slate-600" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3 w-10">#</th>
                      <th className="py-3 px-4">Business & Logo</th>
                      <th className="py-3 px-4">Locality</th>
                      <th className="py-3 px-4">Phone / WhatsApp</th>
                      <th className="py-3 px-4">CRM Stage</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Rating</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredLeads.map((vendor, idx) => {
                      const leadKey = getLeadKey(vendor, idx);
                      const currentStage = getLeadStage(vendor, idx);
                      const leadScore = calculateLeadScore(vendor);
                      const hasPhone = !!(vendor.phone && !vendor.phone.includes('Obfuscated') && !vendor.phone.includes('Requires'));
                      const isSelected = selectedLeadIds.includes(leadKey);

                      return (
                        <tr 
                          key={leadKey} 
                          className={`hover:bg-white/[0.02] transition-colors group ${
                            isSelected ? 'bg-violet-950/20' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectLead(leadKey)}
                              className="cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare size={14} className="text-violet-400" />
                              ) : (
                                <Square size={14} className="text-slate-600" />
                              )}
                            </button>
                          </td>

                          {/* Index */}
                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Business Name & Logo */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {(vendor.logo || vendor.photo || vendor.images?.[0]) ? (
                                <img
                                  src={vendor.logo || vendor.photo || vendor.images?.[0]}
                                  alt={vendor.name}
                                  className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0"
                                  onError={(e) => { 
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.name || 'Vendor')}&background=6366f1&color=fff&bold=true&size=128`;
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-300 font-black flex items-center justify-center text-xs shrink-0 border border-violet-500/30">
                                  {vendor.name?.[0]?.toUpperCase() || 'B'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-white group-hover:text-violet-300 transition-colors truncate max-w-[200px]">
                                  {vendor.name}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                  {vendor.address || vendor.city || 'India'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Scraped Locality */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-slate-300 border border-white/[0.06]">
                              📍 {vendor.mandal || vendor.city || 'Central Area'}
                            </span>
                          </td>

                          {/* Phone & WhatsApp */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {hasPhone ? (
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="text-emerald-400 font-bold">{vendor.phone}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(vendor.phone, leadKey)}
                                  className="text-slate-500 hover:text-white p-0.5 cursor-pointer"
                                  title="Copy Phone"
                                >
                                  {copiedId === leadKey ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[10px]">No direct phone</span>
                            )}
                          </td>

                          {/* CRM Stage Dropdown Selector */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <select
                              value={currentStage}
                              onChange={(e) => updateLeadStage(vendor, idx, e.target.value)}
                              className="text-[10px] font-bold bg-[#14152a] text-slate-200 border border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-400 cursor-pointer"
                            >
                              <option value="new">🌱 New</option>
                              <option value="pitch_sent">📤 Pitch Sent</option>
                              <option value="in_discussion">💬 In Discussion</option>
                              <option value="qualified">⭐ Qualified</option>
                              <option value="won">🏆 Closed Won</option>
                              <option value="archived">📦 Archived</option>
                            </select>
                          </td>

                          {/* CRM Score */}
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                            <span className={`px-2 py-0.5 rounded-md font-bold border ${
                              leadScore >= 80 
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
                                : leadScore >= 55 
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                                : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                            }`}>
                              {leadScore}/100
                            </span>
                          </td>

                          {/* Rating */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {vendor.rating ? (
                              <span className="flex items-center gap-1 text-amber-300 font-bold">
                                <Star size={11} className="fill-amber-300 text-amber-300" />
                                <span>{vendor.rating}</span>
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveNotesLead({ vendor, idx });
                                  setCurrentLeadNote(getLeadNotes(vendor, idx));
                                }}
                                title="CRM Notes"
                                className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-300"
                              >
                                <Bookmark size={11} />
                              </button>

                              {hasPhone && (
                                <button
                                  type="button"
                                  onClick={() => setActivePitchLead({ vendor, idx })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
                                >
                                  <MessageSquare size={10} />
                                  <span>Pitch</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ═══════════════════════════════════════════════════════════════════ */
            /* 3. COMPACT HIGH-DENSITY CRM LIST VIEW                               */
            /* ═══════════════════════════════════════════════════════════════════ */
            <div className="space-y-2 max-w-5xl mx-auto">
              {filteredLeads.map((vendor, idx) => {
                const leadKey = getLeadKey(vendor, idx);
                const currentStage = getLeadStage(vendor, idx);
                const leadScore = calculateLeadScore(vendor);
                const hasPhone = !!(vendor.phone && !vendor.phone.includes('Obfuscated') && !vendor.phone.includes('Requires'));
                const isSelected = selectedLeadIds.includes(leadKey);

                return (
                  <div
                    key={leadKey}
                    className={`p-3 rounded-xl border ${
                      isSelected ? 'border-violet-500 bg-[#12112a]' : 'border-white/[0.07] bg-[#0c0d1b]'
                    } hover:border-violet-500/40 flex items-center justify-between gap-3 transition-all group`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectLead(leadKey)}
                        className="cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare size={14} className="text-violet-400" />
                        ) : (
                          <Square size={14} className="text-slate-600" />
                        )}
                      </button>

                      {(vendor.logo || vendor.photo || vendor.images?.[0]) ? (
                        <img
                          src={vendor.logo || vendor.photo || vendor.images?.[0]}
                          alt={vendor.name}
                          className="w-9 h-9 rounded-lg object-cover border border-white/10 shrink-0"
                          onError={(e) => { 
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.name || 'Vendor')}&background=6366f1&color=fff&bold=true&size=128`;
                          }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-violet-600/20 text-violet-300 font-black flex items-center justify-center text-xs shrink-0 border border-violet-500/30">
                          {vendor.name?.[0]?.toUpperCase() || 'B'}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-white group-hover:text-violet-300 transition-colors truncate">
                            {vendor.name}
                          </h4>
                          {vendor.verified && (
                            <ShieldCheck size={11} className="text-violet-400 shrink-0" />
                          )}
                          <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold ${
                            leadScore >= 80 ? 'text-rose-400' : 'text-slate-400'
                          }`}>
                            Score: {leadScore}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          <span className="text-violet-400 capitalize">{vendor.category || folder.category}</span>
                          <span className="text-slate-600"> • </span>
                          <span className="text-cyan-300 font-mono">📍 {vendor.mandal || vendor.city || 'Central Area'}</span>
                          <span className="text-slate-600"> • </span>
                          <span>{vendor.address || ''}</span>
                        </p>
                      </div>
                    </div>

                    {/* Right side CRM stage + action */}
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={currentStage}
                        onChange={(e) => updateLeadStage(vendor, idx, e.target.value)}
                        className="text-[10px] font-bold bg-[#14152a] text-slate-200 border border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-400 cursor-pointer"
                      >
                        <option value="new">🌱 New</option>
                        <option value="pitch_sent">📤 Pitch Sent</option>
                        <option value="in_discussion">💬 In Discussion</option>
                        <option value="qualified">⭐ Qualified</option>
                        <option value="won">🏆 Closed Won</option>
                        <option value="archived">📦 Archived</option>
                      </select>

                      {hasPhone && (
                        <button
                          type="button"
                          onClick={() => setActivePitchLead({ vendor, idx })}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <MessageSquare size={12} />
                          <span className="hidden sm:inline">Pitch</span>
                        </button>
                      )}

                      {hasPhone && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(vendor.phone, leadKey)}
                          className="p-1.5 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white cursor-pointer"
                          title="Copy phone"
                        >
                          {copiedId === leadKey ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ── 1-CLICK AI WHATSAPP PITCH GENERATOR MODAL ── */}
        <AnimatePresence>
          {activePitchLead && (
            <div className="fixed inset-0 z-[10010] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-lg bg-[#0e1022] border border-violet-500/40 rounded-2xl p-5 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-white">
                        AI WhatsApp Pitch Generator
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Pitching to <span className="text-emerald-300 font-bold">{activePitchLead.vendor.name}</span> ({activePitchLead.vendor.phone})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePitchLead(null)}
                    className="p-1.5 rounded-lg bg-white/[0.05] text-slate-400 hover:text-white"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Template Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase">
                    Select Pitch Script Preset:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'b2b', label: '⚡ Direct Pitch' },
                      { id: 'wedding_party', label: '💍 Event Onboarding' },
                      { id: 'exclusive_b2b', label: '🤝 Partnership' },
                    ].map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setSelectedPitchTemplate(tpl.id)}
                        className={`p-2 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                          selectedPitchTemplate === tpl.id
                            ? 'bg-violet-600 text-white border-violet-400 shadow-md'
                            : 'bg-white/[0.04] text-slate-400 border-white/[0.06] hover:text-white'
                        }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pitch Message Preview */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Personalized Message Preview:</label>
                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-200 leading-relaxed font-sans">
                    {getPitchMessage(activePitchLead.vendor, selectedPitchTemplate)}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const msg = getPitchMessage(activePitchLead.vendor, selectedPitchTemplate);
                      navigator.clipboard.writeText(msg);
                      toast.success('Pitch script copied to clipboard!');
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border border-white/10 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy size={13} />
                    <span>Copy Text</span>
                  </button>

                  <a
                    href={`https://wa.me/${activePitchLead.vendor.phone.replace(/\D/g)}?text=${encodeURIComponent(
                      getPitchMessage(activePitchLead.vendor, selectedPitchTemplate)
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      // Automatically advance status to pitch_sent
                      updateLeadStage(activePitchLead.vendor, activePitchLead.idx, 'pitch_sent');
                      setActivePitchLead(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Launch WhatsApp & Mark Sent</span>
                  </a>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── NOTES & DOSSIER MODAL ── */}
        <AnimatePresence>
          {activeNotesLead && (
            <div className="fixed inset-0 z-[10010] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-[#0e1022] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <Bookmark size={15} className="text-amber-400" />
                      <span>CRM Notes & Activity</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{activeNotesLead.vendor.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveNotesLead(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X size={15} />
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={currentLeadNote}
                  onChange={(e) => setCurrentLeadNote(e.target.value)}
                  placeholder="E.g., Called manager on Tuesday. They are interested in private venue reservations. Follow up next Friday..."
                  className="w-full bg-black/40 text-xs text-white rounded-xl p-3 border border-white/10 focus:border-amber-400 focus:outline-none"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveNotesLead(null)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => saveLeadNotes(activeNotesLead.vendor, activeNotesLead.idx, currentLeadNote)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30"
                  >
                    Save Notes
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── GENERATE / ADD NEW LEAD MODAL (CRM LEAD ENGINE) ── */}
        <AnimatePresence>
          {isAddLeadModalOpen && (
            <div className="fixed inset-0 z-[10010] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-lg bg-[#0e1022] border border-emerald-500/30 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <UserPlus size={16} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-white">Generate Custom Lead</h3>
                      <p className="text-[11px] text-slate-400">
                        Add a prospective lead directly into the <span className="text-violet-300 font-bold capitalize">{folder.category}</span> vault
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddLeadModalOpen(false)}
                    className="p-1.5 rounded-lg bg-white/[0.05] text-slate-400 hover:text-white"
                  >
                    <X size={15} />
                  </button>
                </div>

                <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Business Name *</label>
                    <input
                      type="text"
                      required
                      value={newLeadForm.name}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                      placeholder="E.g., Third Wave Coffee Roasters"
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">Phone / WhatsApp</label>
                      <input
                        type="text"
                        value={newLeadForm.phone}
                        onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">Category</label>
                      <input
                        type="text"
                        value={newLeadForm.category}
                        onChange={(e) => setNewLeadForm({ ...newLeadForm, category: e.target.value })}
                        placeholder="Cafe, Bakery, etc."
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">Locality / Mandal</label>
                      <input
                        type="text"
                        value={newLeadForm.mandal}
                        onChange={(e) => setNewLeadForm({ ...newLeadForm, mandal: e.target.value })}
                        placeholder="E.g., Indiranagar"
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">City</label>
                      <input
                        type="text"
                        value={newLeadForm.city}
                        onChange={(e) => setNewLeadForm({ ...newLeadForm, city: e.target.value })}
                        placeholder="Bangalore"
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Full Street Address</label>
                    <input
                      type="text"
                      value={newLeadForm.address}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, address: e.target.value })}
                      placeholder="100ft Road, HAL 2nd Stage, Indiranagar"
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">Website URL</label>
                      <input
                        type="text"
                        value={newLeadForm.website}
                        onChange={(e) => setNewLeadForm({ ...newLeadForm, website: e.target.value })}
                        placeholder="https://..."
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">Initial CRM Stage</label>
                      <select
                        value={newLeadForm.crmStage}
                        onChange={(e) => setNewLeadForm({ ...newLeadForm, crmStage: e.target.value })}
                        className="w-full bg-[#14152a] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
                      >
                        <option value="new">🌱 New Lead</option>
                        <option value="pitch_sent">📤 Pitch Sent</option>
                        <option value="in_discussion">💬 In Discussion</option>
                        <option value="qualified">⭐ Qualified</option>
                        <option value="won">🏆 Closed Won</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Initial Notes</label>
                    <textarea
                      rows={2}
                      value={newLeadForm.notes}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                      placeholder="Notes regarding this prospective lead..."
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsAddLeadModalOpen(false)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus size={13} />
                      <span>Generate Lead</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
