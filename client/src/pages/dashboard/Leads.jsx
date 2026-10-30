import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Download, RefreshCw, Phone, Mail, Camera,
  MapPin, Star, CheckCircle2, XCircle, Trash2, X, ChevronDown,
  Users, Database, TrendingUp, Map, List, FolderOpen,
  ExternalLink, Globe, Send, ArrowRight, Eye, Sparkles,
  Share2, Copy, Check, MessageSquare, ChevronRight, Layers,
  ShieldCheck, UploadCloud, Rocket, SlidersHorizontal, AlertCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { FixedSizeList as ListWindow } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useScraper } from '../../context/ScraperContext';
import FolderLeadsModal from '../../components/FolderLeadsModal';
import toast from 'react-hot-toast';

// Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom cyber lead marker
const createCyberMarker = (hasPhone, verified) => {
  const color = verified ? '#8b5cf6' : hasPhone ? '#10b981' : '#f59e0b';
  return L.divIcon({
    className: 'custom-lead-pin',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:28px;height:28px;">
        <span style="position:absolute;width:24px;height:24px;border-radius:50%;background:${color};opacity:0.35;" class="${hasPhone ? 'animate-ping' : ''}"></span>
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:18px;height:18px;background:${color};border:2px solid #ffffff;border-radius:50%;box-shadow:0 0 12px ${color};">
          <span style="font-size:9px;color:#fff;font-weight:900;">${verified ? '★' : hasPhone ? '📞' : '•'}</span>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

const MapBounds = ({ vendors, autoCenter }) => {
  const map = useMap();
  useEffect(() => {
    if (!autoCenter || !vendors || vendors.length === 0) return;
    const pts = vendors
      .filter(v => (v.lat != null && v.lng != null) || (v.safeLat != null && v.safeLng != null))
      .map(v => [v.safeLat || v.lat, v.safeLng || v.lng]);
    if (pts.length > 0) {
      const bounds = L.latLngBounds(pts);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [vendors, map, autoCenter]);
  return null;
};

export default function LeadsPage() {
  const {
    grouped, filteredVendors, displayedVendors,
    stagingVendorsWithPhones, stagingVendorsNoPhones, liveVendors,
    vendors, activeTab, setActiveTab,
    searchFilter, setSearchFilter,
    selectedCity, setSelectedCity, cities,
    fetchVendors, handleVerify, handleDelete, handleAssign,
    exportToCSV, exportCategoryCSV, clearQueue, pushToProd,
    employees, activeJobs, loading,
    selectedFolder, setSelectedFolder,
    outOfBoundsVendors, searchSessionStart
  } = useScraper();

  const [view, setView] = useState('pipeline'); // 'pipeline' | 'list' | 'folders' | 'map'
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [autoCenter, setAutoCenter] = useState(true);
  const [minRatingFilter, setMinRatingFilter] = useState('all'); // 'all' | '4.0' | '4.5'
  const [phoneOnlyFilter, setPhoneOnlyFilter] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [copiedId, setCopiedId] = useState(null);

  // Auto-set category filter if navigated from Category Breakdown in Overview
  useEffect(() => {
    const preCategory = localStorage.getItem('gomandap_active_category');
    if (preCategory) {
      setSearchFilter(preCategory);
      setView('list');
      localStorage.removeItem('gomandap_active_category');
    }
  }, [setSearchFilter]);

  // Compute stats
  const allLeadsList = useMemo(() => vendors || [], [vendors]);
  const totalLeads = allLeadsList.length;
  const withPhoneCount = useMemo(() => {
    return allLeadsList.filter(v => v.phone && !v.phone.includes('Obfuscated') && !v.phone.includes('Requires')).length;
  }, [allLeadsList]);
  const verifiedCount = useMemo(() => {
    return allLeadsList.filter(v => v.verified).length;
  }, [allLeadsList]);
  const liveCount = liveVendors?.length || 0;
  const oobCount = outOfBoundsVendors?.length || 0;

  // Available unique categories
  const categoryOptions = useMemo(() => {
    const set = new Set();
    allLeadsList.forEach(v => { if (v.category) set.add(v.category); });
    return ['All', ...Array.from(set).sort()];
  }, [allLeadsList]);

  // Master filtered list
  const masterFilteredLeads = useMemo(() => {
    let list = allLeadsList;

    // Search query filter (Fuzzy multi-field)
    if (searchFilter && searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      list = list.filter(v =>
        (v.name && v.name.toLowerCase().includes(q)) ||
        (v.category && v.category.toLowerCase().includes(q)) ||
        (v.city && v.city.toLowerCase().includes(q)) ||
        (v.mandal && v.mandal.toLowerCase().includes(q)) ||
        (v.address && v.address.toLowerCase().includes(q)) ||
        (v.phone && v.phone.includes(q))
      );
    }

    // City filter
    if (selectedCity && selectedCity !== 'All') {
      const c = selectedCity.toLowerCase();
      list = list.filter(v => v.city && v.city.toLowerCase() === c);
    }

    // Category filter
    if (selectedCategoryFilter !== 'All') {
      list = list.filter(v => v.category === selectedCategoryFilter);
    }

    // Phone only filter
    if (phoneOnlyFilter) {
      list = list.filter(v => v.phone && !v.phone.includes('Obfuscated') && !v.phone.includes('Requires'));
    }

    // Min rating filter
    if (minRatingFilter !== 'all') {
      const min = parseFloat(minRatingFilter);
      list = list.filter(v => parseFloat(v.rating) >= min);
    }

    return list;
  }, [allLeadsList, searchFilter, selectedCity, selectedCategoryFilter, phoneOnlyFilter, minRatingFilter]);

  // Pipeline columns
  const pipelineColumns = useMemo(() => {
    const rawStaging = masterFilteredLeads.filter(v => !v.pushedToProd && !v.verified);
    const withPhone = masterFilteredLeads.filter(v => v.phone && !v.phone.includes('Obfuscated') && !v.phone.includes('Requires') && !v.pushedToProd);
    const verified = masterFilteredLeads.filter(v => v.verified && !v.pushedToProd);
    const pushed = masterFilteredLeads.filter(v => v.pushedToProd || (liveVendors && liveVendors.some(lv => lv.id === v.id || lv.name === v.name)));

    return [
      { id: 'staging', title: 'Extracted Leads', icon: Database, color: 'cyan', count: rawStaging.length, items: rawStaging },
      { id: 'whatsapp', title: 'WhatsApp Ready', icon: Phone, color: 'emerald', count: withPhone.length, items: withPhone },
      { id: 'verified', title: 'Verified Quality', icon: ShieldCheck, color: 'violet', count: verified.length, items: verified },
      { id: 'live', title: 'Live in Production', icon: Rocket, color: 'amber', count: pushed.length, items: pushed },
    ];
  }, [masterFilteredLeads, liveVendors]);

  // Map vendors
  const mapVendors = useMemo(() => {
    return masterFilteredLeads
      .filter(v => (v.lat && v.lng) || (v.latitude && v.longitude))
      .map(v => ({ ...v, safeLat: v.lat || v.latitude, safeLng: v.lng || v.longitude }));
  }, [masterFilteredLeads]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePushAll = async () => {
    if (window.confirm(`Push ${masterFilteredLeads.length} leads directly to live client database?`)) {
      await pushToProd();
      toast.success('Pushed all verified leads to live marketplace!');
    }
  };

  return (
    <div className="min-h-full bg-[#07070d] text-slate-100 flex flex-col font-sans">
      
      {/* ── TOP COMMAND HEADER ── */}
      <div className="border-b border-white/[0.08] bg-[#0c0c16]/90 backdrop-blur-xl px-6 py-5 sticky top-0 z-30">
        <div className="max-w-[1700px] mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 border border-white/10">
                <Layers className="text-white" size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-white tracking-tight">Leads Command Center</h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    Live Pipeline
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Universal multi-engine leads pipeline · WhatsApp 1-click dispatch · Geo geofenced
                </p>
              </div>
            </div>
          </div>

          {/* Top Actions & View Switcher */}
          <div className="flex items-center gap-3 flex-wrap">
            
            {/* View Switcher Tabs */}
            <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
              {[
                { id: 'pipeline', label: 'Pipeline', icon: SlidersHorizontal },
                { id: 'list', label: 'Fast List', icon: List },
                { id: 'folders', label: 'Categories', icon: FolderOpen },
                { id: 'map', label: 'Radar Map', icon: Map },
              ].map(t => {
                const Icon = t.icon;
                const active = view === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setView(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      active
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick action buttons */}
            <button
              onClick={handlePushAll}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all shadow-sm shadow-emerald-500/10 cursor-pointer"
              title="Push verified leads to live marketplace database"
            >
              <Rocket size={14} />
              <span>Push to Prod</span>
            </button>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/[0.09] text-slate-200 border border-white/[0.1] transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              onClick={fetchVendors}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-slate-300 border border-white/[0.1] transition-all cursor-pointer"
              title="Refresh leads"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={clearQueue}
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer"
              title="Clear staging queue"
            >
              <Trash2 size={14} />
            </button>
          </div>

        </div>
      </div>

      {/* ── KPI HUD STATS ── */}
      <div className="px-6 pt-5 pb-2 max-w-[1700px] mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/20 to-transparent p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-violet-400">Total Leads</p>
              <p className="text-2xl font-black text-white mt-1">{totalLeads.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Across all scanned regions</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Database size={18} />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-transparent p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">WhatsApp Ready</p>
              <p className="text-2xl font-black text-white mt-1">{withPhoneCount.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-400/80 mt-0.5">
                {totalLeads > 0 ? `${Math.round((withPhoneCount / totalLeads) * 100)}% contact rate` : '0%'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Phone size={18} />
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-transparent p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Verified Quality</p>
              <p className="text-2xl font-black text-white mt-1">{verifiedCount.toLocaleString()}</p>
              <p className="text-[10px] text-cyan-400/80 mt-0.5">Geocoded & phone validated</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ShieldCheck size={18} />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-transparent p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Live Database</p>
              <p className="text-2xl font-black text-white mt-1">{liveCount.toLocaleString()}</p>
              <p className="text-[10px] text-amber-400/80 mt-0.5">Active in client marketplace</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Rocket size={18} />
            </div>
          </div>

        </div>
      </div>

      {/* ── FILTER & SEARCH CONTROL BAR ── */}
      <div className="px-6 py-3 max-w-[1700px] mx-auto w-full">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c16]/80 p-3 flex flex-wrap items-center gap-3">
          
          {/* Universal Search Input */}
          <div className="relative flex-1 min-w-[260px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Search leads by name, phone, category, mandal, district..."
              className="w-full pl-9 pr-8 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* City / District Dropdown */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] rounded-xl px-2.5 py-1.5">
            <MapPin size={13} className="text-violet-400" />
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
            >
              {(cities || ['All']).map(c => (
                <option key={c} value={c} className="bg-[#0f0f1c] text-white">{c}</option>
              ))}
            </select>
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] rounded-xl px-2.5 py-1.5">
            <Layers size={13} className="text-cyan-400" />
            <select
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              {categoryOptions.map(cat => (
                <option key={cat} value={cat} className="bg-[#0f0f1c] text-white">{cat}</option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] rounded-xl px-2.5 py-1.5">
            <Star size={13} className="text-amber-400 fill-amber-400" />
            <select
              value={minRatingFilter}
              onChange={e => setMinRatingFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0f0f1c] text-white">All Ratings</option>
              <option value="4.0" className="bg-[#0f0f1c] text-white">★ 4.0 & above</option>
              <option value="4.5" className="bg-[#0f0f1c] text-white">★ 4.5 & above</option>
            </select>
          </div>

          {/* Phone Only Toggle */}
          <button
            onClick={() => setPhoneOnlyFilter(!phoneOnlyFilter)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              phoneOnlyFilter
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-white/[0.03] text-slate-400 border-white/[0.08] hover:text-white'
            }`}
          >
            <Phone size={13} className={phoneOnlyFilter ? 'text-emerald-400' : 'text-slate-400'} />
            <span>WhatsApp Ready</span>
          </button>

          {/* Match counter */}
          <div className="text-xs font-mono font-bold text-slate-400 ml-auto flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{masterFilteredLeads.length.toLocaleString()} matching</span>
          </div>

        </div>
      </div>

      {/* ── MAIN CONTENT AREA BY VIEW ── */}
      <div className="px-6 py-4 max-w-[1700px] mx-auto w-full flex-1 flex flex-col">
        
        {/* 1. PIPELINE KANBAN BOARD */}
        {view === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 flex-1 items-start">
            {pipelineColumns.map(col => {
              const Icon = col.icon;
              return (
                <div
                  key={col.id}
                  className="rounded-2xl border border-white/[0.08] bg-[#0c0c16]/70 flex flex-col max-h-[78vh] overflow-hidden"
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg bg-${col.color}-500/10 border border-${col.color}-500/20 text-${col.color}-400`}>
                        <Icon size={14} />
                      </div>
                      <h3 className="text-xs font-black text-white">{col.title}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                      {col.count}
                    </span>
                  </div>

                  {/* Cards Scrollable Container */}
                  <div className="p-3 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar">
                    {col.items.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 text-xs">
                        No leads in this stage
                      </div>
                    ) : (
                      col.items.slice(0, 50).map((vendor, idx) => (
                        <LeadKanbanCard
                          key={`kanban-${vendor.id || 'id'}-${idx}`}
                          vendor={vendor}
                          onSelect={() => setSelectedVendor(vendor)}
                          onVerify={handleVerify}
                          onDelete={handleDelete}
                          onPush={pushToProd}
                          copiedId={copiedId}
                          onCopy={copyToClipboard}
                        />
                      ))
                    )}
                    {col.items.length > 50 && (
                      <div className="p-2 text-center text-xs font-bold text-violet-400 bg-violet-500/5 rounded-xl border border-violet-500/10">
                        +{(col.items.length - 50).toLocaleString()} more leads in fast list view
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. FAST VIRTUALIZED LIST */}
        {view === 'list' && (
          <div className="h-[75vh] rounded-2xl border border-white/[0.08] bg-[#0c0c16]/70 p-3 overflow-hidden flex flex-col">
            {masterFilteredLeads.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Database size={40} className="mb-3 opacity-20" />
                <p className="font-bold text-sm">No leads match your filter</p>
                <button
                  onClick={() => { setSearchFilter(''); setSelectedCategoryFilter('All'); setMinRatingFilter('all'); setPhoneOnlyFilter(false); }}
                  className="mt-3 text-xs text-violet-400 hover:text-violet-300 font-bold"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <AutoSizer>
                {({ height, width }) => (
                  <ListWindow
                    height={height}
                    itemCount={masterFilteredLeads.length}
                    itemSize={118}
                    width={width}
                    itemData={masterFilteredLeads}
                    className="custom-scrollbar"
                  >
                    {({ index, style, data }) => {
                      const vendor = data[index];
                      return (
                        <div style={style} className="pr-2 pb-2">
                          <LeadRowCard
                            vendor={vendor}
                            onSelect={() => setSelectedVendor(vendor)}
                            onVerify={handleVerify}
                            onDelete={handleDelete}
                            copiedId={copiedId}
                            onCopy={copyToClipboard}
                          />
                        </div>
                      );
                    }}
                  </ListWindow>
                )}
              </AutoSizer>
            )}
          </div>
        )}

        {/* 3. CATEGORY FOLDERS VIEW */}
        {view === 'folders' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(grouped || {}).length === 0 ? (
              <div className="col-span-4 py-20 text-center text-slate-500">
                <FolderOpen size={48} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold text-sm">No categories created yet</p>
                <p className="text-xs text-slate-400 mt-1">Start a scrape session from Overview to populate categories</p>
              </div>
            ) : (
              Object.entries(grouped).sort((a, b) => b[1].length - a[1].length).map(([cat, items]) => {
                const verified = items.filter(v => v.verified).length;
                const withPhone = items.filter(v => v.phone && !v.phone.includes('Obfuscated') && !v.phone.includes('Requires')).length;
                const isRunning = activeJobs?.some(j => j.category === cat && j.status === 'running');
                return (
                  <motion.div
                    key={cat}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      setSelectedFolder(cat);
                    }}
                    className="rounded-2xl border border-white/[0.08] bg-[#0c0c16]/80 hover:border-violet-500/40 p-4 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border border-violet-500/30 flex items-center justify-center text-violet-300 font-black text-sm">
                            {cat[0] || 'V'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black text-white truncate group-hover:text-violet-300 transition-colors" title={cat}>
                              {cat}
                            </h4>
                            <p className="text-[10px] text-slate-400">Category Folder</p>
                          </div>
                        </div>

                        {isRunning && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            Live
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-2 text-center">
                          <p className="text-base font-black text-white">{items.length}</p>
                          <p className="text-[9px] text-slate-400">Total</p>
                        </div>
                        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
                          <p className="text-base font-black text-emerald-400">{withPhone}</p>
                          <p className="text-[9px] text-emerald-300/70">Phone</p>
                        </div>
                        <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-2 text-center">
                          <p className="text-base font-black text-violet-400">{verified}</p>
                          <p className="text-[9px] text-violet-300/70">Verified</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          exportCategoryCSV(cat, items);
                        }}
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Download size={12} />
                        <span>Export CSV</span>
                      </button>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSearchFilter(cat);
                          setView('list');
                        }}
                        className="p-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 transition-all"
                        title="View in Fast List"
                      >
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* 4. RADAR GEOSPATIAL MAP VIEW */}
        {view === 'map' && (
          <div className="h-[75vh] rounded-2xl border border-white/[0.08] bg-[#0c0c16]/80 overflow-hidden relative flex flex-col">
            <div className="p-3 border-b border-white/[0.08] bg-[#0c0c16]/90 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Map size={15} className="text-violet-400" />
                <span className="text-xs font-black text-white">Geospatial Distribution</span>
                <span className="text-[10px] text-slate-400 font-mono">({mapVendors.length} geocoded pins)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoCenter(true)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.1]"
                >
                  Recenter Map
                </button>
              </div>
            </div>

            <div className="flex-1 relative">
              {mapVendors.length > 0 ? (
                <MapContainer
                  center={[mapVendors[0].safeLat, mapVendors[0].safeLng]}
                  zoom={12}
                  style={{ width: '100%', height: '100%', background: '#0a0a14' }}
                  zoomControl={false}
                  preferCanvas={true}
                  onMoveStart={() => setAutoCenter(false)}
                >
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                    attribution='&copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
                    maxZoom={16}
                  />
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                    attribution='&copy; Esri'
                    maxZoom={16}
                  />
                  <MapBounds vendors={mapVendors} autoCenter={autoCenter} />
                  <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
                    {mapVendors.map((vendor, i) => {
                      const hasPhone = !!(vendor.phone && !vendor.phone.includes('Obfuscated') && !vendor.phone.includes('Requires'));
                      return (
                        <Marker
                          key={`marker-lead-${vendor.id || 'id'}-${i}`}
                          position={[vendor.safeLat, vendor.safeLng]}
                          icon={createCyberMarker(hasPhone, vendor.verified)}
                          eventHandlers={{
                            click: () => setSelectedVendor(vendor),
                          }}
                        >
                          <Popup className="custom-cyber-popup">
                            <div className="text-xs p-1 min-w-[180px]">
                              <p className="font-black text-slate-900">{vendor.name}</p>
                              <p className="text-[10px] text-slate-500">{vendor.category} • {vendor.city}</p>
                              {vendor.phone && (
                                <p className="text-[11px] font-bold text-emerald-600 mt-1">📞 {vendor.phone}</p>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MarkerClusterGroup>
                </MapContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  No GPS coordinates available for filtered leads
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── RICH FULL-DETAILS FOLDER LEADS INSPECTOR MODAL ── */}
      {selectedFolder && (
        <FolderLeadsModal
          isOpen={!!selectedFolder}
          onClose={() => setSelectedFolder(null)}
          folder={{
            category: selectedFolder,
            location: 'Pan-India Database',
            leads: (grouped && grouped[selectedFolder]) || (vendors || []).filter(v => v.category === selectedFolder) || []
          }}
        />
      )}

      {/* ── VENDOR INSPECTION MODAL ── */}
      <AnimatePresence>
        {selectedVendor && (
          <div
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedVendor(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0f0f1c] border border-white/[0.12] rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/[0.08] flex items-start justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3.5">
                  {(selectedVendor.avatar || (selectedVendor.images && selectedVendor.images.length > 0)) ? (
                    <img
                      src={selectedVendor.avatar || selectedVendor.images[0]}
                      alt={selectedVendor.name}
                      className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-md flex-shrink-0"
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedVendor.name || 'Vendor')}&background=1e1b4b&color=a78bfa`;
                      }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-md">
                      {selectedVendor.name?.[0] || 'V'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-white">{selectedVendor.name}</h3>
                      {selectedVendor.verified && (
                        <CheckCircle2 size={15} className="text-violet-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedVendor.category} • {selectedVendor.city || 'AP'}
                    </p>
                    {selectedVendor.rating && (
                      <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        ★ {selectedVendor.rating} {selectedVendor.reviewsCount ? `(${selectedVendor.reviewsCount} reviews)` : ''}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedVendor(null)}
                  className="p-1.5 rounded-xl bg-white/[0.05] text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                
                {/* Photo Gallery if present */}
                {selectedVendor.images && selectedVendor.images.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Vendor Gallery</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {selectedVendor.images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt=""
                          className="h-20 w-20 object-cover rounded-xl border border-white/10 flex-shrink-0"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Details Breakdown */}
                <div className="space-y-2.5">
                  {selectedVendor.phone && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-2.5">
                        <Phone size={15} className="text-emerald-400" />
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/80">Primary Contact</p>
                          <p className="text-sm font-mono font-bold text-emerald-300">{selectedVendor.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => copyToClipboard(selectedVendor.phone, 'modal_phone')}
                          className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs"
                          title="Copy phone"
                        >
                          <Copy size={13} />
                        </button>
                        <a
                          href={`https://wa.me/${selectedVendor.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${selectedVendor.name}, we are contacting you regarding verified business opportunities and client inquiries.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <MessageSquare size={13} /> WhatsApp
                        </a>
                      </div>
                    </div>
                  )}

                  {selectedVendor.address && (
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-start gap-2.5">
                      <MapPin size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Address / Location</p>
                        <p className="text-xs text-slate-200 mt-0.5">{selectedVendor.address}</p>
                        {selectedVendor.mandal && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            Mandal: {selectedVendor.mandal}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedVendor.mapsLink && (
                    <a
                      href={selectedVendor.mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-all text-xs font-bold"
                    >
                      <span className="flex items-center gap-2">
                        <Globe size={15} /> Open Google Maps Listing
                      </span>
                      <ExternalLink size={13} />
                    </a>
                  )}

                  {/* Telemetry info */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-500">Source Engine: </span>
                      <span className="text-slate-300 font-mono font-bold">{selectedVendor.sourceEngine || 'Google Places'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">GPS Status: </span>
                      <span className="text-emerald-400 font-mono font-bold">
                        {selectedVendor.lat ? `${parseFloat(selectedVendor.lat).toFixed(4)}, ${parseFloat(selectedVendor.lng).toFixed(4)}` : 'Not Geocoded'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer Actions */}
              <div className="p-5 border-t border-white/[0.08] bg-white/[0.02] flex items-center gap-3">
                <button
                  onClick={() => {
                    handleVerify(selectedVendor.id, !selectedVendor.verified);
                    setSelectedVendor(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                    selectedVendor.verified
                      ? 'bg-white/[0.05] text-slate-300 border-white/[0.1] hover:bg-white/[0.08]'
                      : 'bg-violet-600 hover:bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-600/30'
                  }`}
                >
                  <ShieldCheck size={14} />
                  <span>{selectedVendor.verified ? 'Revoke Verification' : 'Verify & Authenticate'}</span>
                </button>

                <button
                  onClick={() => {
                    handleDelete(selectedVendor.id);
                    setSelectedVendor(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ── KANBAN CARD SUBCOMPONENT ──
const LeadKanbanCard = React.memo(({ vendor, onSelect, onVerify, onDelete, onPush, copiedId, onCopy }) => {
  const hasPhone = !!(vendor.phone && !vendor.phone.includes('Obfuscated') && !vendor.phone.includes('Requires'));
  const cleanPhone = hasPhone ? vendor.phone.replace(/\D/g, '') : '';
  const waPitch = `Hi ${vendor.name || 'there'}, I found your listing for ${vendor.category || 'wedding services'} in ${vendor.city || 'your area'}. Are you currently accepting bookings for upcoming wedding dates?`;
  const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waPitch)}` : null;

  return (
    <div
      onClick={onSelect}
      className="rounded-xl border border-white/[0.06] bg-[#121222]/90 hover:border-violet-500/40 p-3 transition-all cursor-pointer group shadow-sm hover:shadow-lg relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-xs font-black text-white truncate group-hover:text-violet-300 transition-colors" title={vendor.name}>
              {vendor.name}
            </h4>
            {vendor.verified && (
              <span className="text-[10px] text-violet-400" title="Verified Quality">★</span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">
            <span className="text-violet-400 font-semibold">{vendor.category}</span>
            <span className="text-slate-600"> • </span>
            <span>{vendor.mandal ? `${vendor.mandal}, ` : ''}{vendor.city || 'Guntur'}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {vendor.tier && (
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
              vendor.tier === 'Diamond' ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' :
              vendor.tier === 'Gold' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
              vendor.tier === 'Silver' ? 'bg-slate-400/15 text-slate-300 border-slate-400/30' :
              'bg-orange-500/15 text-orange-300 border-orange-500/30'
            }`}>
              {vendor.tier === 'Diamond' ? '💎 ' : vendor.tier === 'Gold' ? '🥇 ' : vendor.tier === 'Silver' ? '🥈 ' : ''}{vendor.tier}
            </span>
          )}
          {vendor.rating && (
            <span className="flex items-center gap-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0">
              ★ {vendor.rating}
            </span>
          )}
        </div>
      </div>

      {/* Phone & WhatsApp Pitch Strip */}
      <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
        <div className="text-[10px] font-mono truncate">
          {hasPhone ? (
            <span className="text-emerald-400 font-bold">{vendor.phone}</span>
          ) : (
            <span className="text-slate-500 italic">No direct phone</span>
          )}
        </div>

        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {hasPhone && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm shadow-emerald-600/30"
              title="Instant WhatsApp Pitch"
            >
              <MessageSquare size={10} />
              <span>Pitch</span>
            </a>
          )}

          <button
            onClick={() => onVerify(vendor.id, !vendor.verified)}
            className={`p-1 rounded-lg transition-all ${
              vendor.verified ? 'text-violet-400 bg-violet-500/20' : 'text-slate-500 hover:text-violet-400 bg-white/[0.02]'
            }`}
            title="Toggle verification"
          >
            <CheckCircle2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
});

// ── FAST LIST ROW SUBCOMPONENT ──
const LeadRowCard = React.memo(({ vendor, onSelect, onVerify, onDelete, copiedId, onCopy }) => {
  const hasPhone = !!(vendor.phone && !vendor.phone.includes('Obfuscated') && !vendor.phone.includes('Requires'));
  const cleanPhone = hasPhone ? vendor.phone.replace(/\D/g, '') : '';
  const waPitch = `Hi ${vendor.name || 'there'}, are you accepting bookings for wedding dates in ${vendor.city || 'your area'}?`;
  const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waPitch)}` : null;

  return (
    <div
      onClick={onSelect}
      className="rounded-xl border border-white/[0.06] bg-[#121222]/80 hover:border-violet-500/40 p-3 transition-all cursor-pointer group flex items-center justify-between gap-4 h-[110px]"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center text-violet-300 font-black text-sm flex-shrink-0">
          {vendor.name?.[0] || 'V'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black text-white truncate group-hover:text-violet-300 transition-colors">
              {vendor.name}
            </h4>
            {vendor.verified && (
              <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Verified
              </span>
            )}
            {vendor.rating && (
              <span className="text-[10px] font-bold text-amber-400">★ {vendor.rating}</span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">
            <span className="text-violet-400 font-semibold">{vendor.category}</span>
            <span> • </span>
            <span>{vendor.mandal ? `${vendor.mandal}, ` : ''}{vendor.city}</span>
            {vendor.address && <span className="text-slate-500"> ({vendor.address.slice(0, 40)}...)</span>}
          </p>
        </div>
      </div>

      {/* Right Contact & Actions */}
      <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <div className="text-right">
          {hasPhone ? (
            <p className="text-xs font-mono font-bold text-emerald-400">{vendor.phone}</p>
          ) : (
            <p className="text-[10px] text-slate-500 italic">No Direct Phone</p>
          )}
          <span className="text-[9px] text-slate-500">{vendor.sourceEngine || 'Places'}</span>
        </div>

        {hasPhone && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-sm"
          >
            <MessageSquare size={12} /> WhatsApp
          </a>
        )}

        <button
          onClick={() => onVerify(vendor.id, !vendor.verified)}
          className={`p-2 rounded-lg transition-all ${
            vendor.verified ? 'text-violet-400 bg-violet-500/20' : 'text-slate-500 hover:text-violet-400 bg-white/[0.04]'
          }`}
          title="Verify"
        >
          <CheckCircle2 size={14} />
        </button>

        <button
          onClick={() => onDelete(vendor.id)}
          className="p-2 rounded-lg text-slate-500 hover:text-red-400 bg-white/[0.04] transition-all"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
});
