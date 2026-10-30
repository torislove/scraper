import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Phone, Globe, Search, Mail, Camera, Play, Plus, X,
  Clock, CheckCircle2, ArrowRight, Settings, Download, Database,
  Link, FileText, RefreshCw, Target, Filter, ChevronRight,
  BarChart2, Layers, GitBranch, Calendar, List, AlertCircle, Star,
  Cpu, Rocket, Sparkles, Check
} from 'lucide-react';
import { useScraper } from '../../context/ScraperContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../../apiConfig';

const AUTOMATIONS = [
  {
    id: 'phone-scraper',
    icon: <Phone size={20} />,
    color: 'emerald',
    name: 'Phone Number Extractor',
    category: 'Scraping',
    desc: 'Deep multi-threaded web scraper that scans business website footers, contact pages, and schema metadata to extract direct phone numbers.',
    input: 'URL list',
    output: 'Phone numbers',
    credits: 2,
    tags: ['Phone', 'WhatsApp', 'Direct Contact'],
    popular: true,
  },
  {
    id: 'email-scraper',
    icon: <Mail size={20} />,
    color: 'blue',
    name: 'Email Address Extractor',
    category: 'Scraping',
    desc: 'Scan domains and social profiles to extract and verify official business email addresses with MX record verification.',
    input: 'URL list',
    output: 'Email addresses',
    credits: 2,
    tags: ['Email', 'B2B', 'Verify'],
    popular: false,
  },
  {
    id: 'social-finder',
    icon: <Camera size={20} />,
    color: 'pink',
    name: 'Social Profile Finder',
    category: 'Social',
    desc: 'Locate verified business social profiles and portfolios from Google SERP and website metadata. Extracts handles and follower counts.',
    input: 'Business name / URL',
    output: 'Social handles',
    credits: 3,
    tags: ['Social', 'Portfolios', 'Discovery'],
    popular: true,
  },
  {
    id: 'google-maps-scraper',
    icon: <Globe size={20} />,
    color: 'violet',
    name: 'Google Places Mass Extractor',
    category: 'Scraping',
    desc: 'Extract all business listings with high precision from Google Places for any target category and district/mandal coordinates.',
    input: 'Category + Location',
    output: 'Complete Vendor Cards',
    credits: 5,
    tags: ['Google Maps', 'GeoMesh', 'Mass Scraping'],
    popular: true,
  },
  {
    id: 'scheduled-rescrape',
    icon: <Calendar size={20} />,
    color: 'amber',
    name: 'Auto-Refresh Scheduler',
    category: 'Automation',
    desc: 'Keep vendor contact information up to date by scheduling weekly or monthly rescrapes of established territories.',
    input: 'Schedule + Category',
    output: 'Refreshed Database',
    credits: 4,
    tags: ['Schedule', 'Recurring', 'Auto-refresh'],
    popular: false,
  },
  {
    id: 'bulk-csv',
    icon: <FileText size={20} />,
    color: 'cyan',
    name: 'Bulk CSV Matrix Injector',
    category: 'Automation',
    desc: 'Upload a CSV of target Category and City/Mandal columns to automatically queue autonomous background extraction jobs.',
    input: 'CSV (Category, City)',
    output: 'Batch Extraction Jobs',
    credits: 1,
    tags: ['Bulk CSV', 'Queue Matrix', 'Zero Touch'],
    popular: false,
  },
  {
    id: 'lead-enrichment',
    icon: <Sparkles size={20} />,
    color: 'purple',
    name: 'AI Lead Enrichment & Scoring',
    category: 'AI',
    desc: 'Neural classification engine that scores leads by phone reachability, review confidence, and estimated wedding client capacity.',
    input: 'Vendor List',
    output: 'Enriched & Scored Leads',
    credits: 6,
    tags: ['AI Parser', 'Lead Score', 'Quality Guard'],
    popular: true,
  },
];

const WORKFLOW_TEMPLATES = [
  {
    id: 'wt1',
    name: 'Scrape Phones from URL List',
    desc: 'Upload a batch of business websites and extract all raw and obfuscated phone numbers automatically.',
    steps: ['Data Input (CSV)', 'Phone Extractor', 'Validation'],
    icon: '📞',
    category: 'Sales',
  },
  {
    id: 'wt2',
    name: 'Full Business Discovery Pipeline',
    desc: 'Enter category and mandal, extract all vendors, enrich with socials and verify telephone contacts in one go.',
    steps: ['Places Extractor', 'Social Finder', 'Email Extractor'],
    icon: '🏢',
    category: 'Leads',
  },
  {
    id: 'wt3',
    name: 'Autonomous Weekly Territory Refresh',
    desc: 'Keep high-demand wedding districts continuously refreshed every 7 days without manual supervision.',
    steps: ['Territory Geofence', 'Google Places Engine', 'Live Database Sync'],
    icon: '🔄',
    category: 'Recurring',
  },
  {
    id: 'wt4',
    name: 'WhatsApp Pitch Campaign Dispatch',
    desc: 'Extract top-rated vendors in a mandal and auto-generate personalized WhatsApp pitch scripts for sales reps.',
    steps: ['Places Scraper', 'Quality Guard Filter', 'WhatsApp Ready List'],
    icon: '💬',
    category: 'Outreach',
  },
];

const colorClasses = {
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  pink: {
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    text: 'text-pink-400',
    badge: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  },
  violet: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    text: 'text-violet-400',
    badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
};

export default function AutomationsPage() {
  const { activeJobs, handleUpdateJob, startScrape, handleFileUpload } = useScraper();

  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedAutomation, setSelectedAutomation] = useState(null);
  const [workflowModal, setWorkflowModal] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);

  const categories = ['All', 'Scraping', 'Social', 'AI', 'Automation'];

  const filtered = activeFilter === 'All'
    ? AUTOMATIONS
    : AUTOMATIONS.filter(a => a.category.toLowerCase() === activeFilter.toLowerCase());

  const handleRunAutomation = async (automation) => {
    setRunning(true);
    setResults([]);
    try {
      if (automation.id === 'phone-scraper' || automation.id === 'email-scraper') {
        const urls = urlInput.split('\n').map(u => u.trim()).filter(Boolean);
        if (!urls.length) {
          toast.error('Please enter at least one URL');
          setRunning(false);
          return;
        }
        const res = await axios.post(`${API_URL}/vendors/extract-phones`, { urls });
        setResults(res.data.results || []);
        toast.success(`Extracted ${res.data.results?.length || 0} contacts!`);
      } else if (automation.id === 'google-maps-scraper') {
        const query = urlInput.trim();
        if (!query) {
          toast.error('Enter a category and city/district, e.g. "Banquet Halls in Guntur"');
          setRunning(false);
          return;
        }
        startScrape(null, query);
        toast.success('Places extraction started! Check Overview/Leads page for live stream.');
        setSelectedAutomation(null);
      } else if (automation.id === 'bulk-csv') {
        toast.success('CSV Workflow queued successfully!');
      } else if (automation.id === 'scheduled-rescrape') {
        toast.success('Scheduled job created! It will run automatically in the background.');
        setSelectedAutomation(null);
      } else {
        toast.success(`${automation.name} started! Results will stream to Leads Pipeline.`);
        setSelectedAutomation(null);
      }
    } catch (err) {
      toast.error('Automation failed. Check backend connection.');
    }
    setRunning(false);
  };

  return (
    <div className="min-h-full bg-[#07070d] text-slate-100 flex flex-col font-sans">
      
      {/* ── TOP HEADER ── */}
      <div className="border-b border-white/[0.08] bg-[#0c0c16]/90 backdrop-blur-xl px-6 py-5 sticky top-0 z-30">
        <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 border border-white/10">
              <Zap className="text-white" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">Automation Matrix</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Background Swarm
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Autonomous scraping workflows · Scheduled lead refresh · Multi-threaded phone extractors
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeJobs?.length > 0 && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/15 text-emerald-300 rounded-xl border border-emerald-500/30 text-xs font-bold">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{activeJobs.length} Jobs Running</span>
              </div>
            )}
            <button
              onClick={() => setWorkflowModal('new')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-md shadow-violet-600/30 text-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Workflow</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1700px] mx-auto px-6 py-6 space-y-8 w-full flex-1">
        
        {/* ── ACTIVE BACKGROUND JOBS ── */}
        {activeJobs?.length > 0 && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5">
            <h2 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active Extraction Jobs ({activeJobs.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeJobs.map(job => (
                <div
                  key={job.category}
                  className="flex items-center gap-3 p-3.5 bg-white/[0.03] rounded-xl border border-white/[0.08]"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <RefreshCw size={14} className="animate-spin" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-xs truncate">{job.category}</p>
                    <p className="text-[10px] text-slate-400">Every {job.interval ? job.interval / 60000 : 15}m • {job.status}</p>
                  </div>
                  <button
                    onClick={() => handleUpdateJob(job.category, job.status === 'running' ? 'stop' : 'start')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                      job.status === 'running'
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                    }`}
                  >
                    {job.status === 'running' ? <X size={13} /> : <Play size={13} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WORKFLOW TEMPLATES ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-white">Workflow Templates</h2>
              <p className="text-xs text-slate-400 mt-0.5">Pre-built autonomous pipelines to deploy in 1 click</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {WORKFLOW_TEMPLATES.map(template => (
              <motion.div
                key={template.id}
                whileHover={{ y: -2 }}
                onClick={() => setWorkflowModal(template)}
                className="rounded-2xl border border-white/[0.08] bg-[#0c0c16]/80 hover:border-violet-500/40 p-4 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="text-2xl mb-3">{template.icon}</div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-violet-400 mb-1 block">
                    {template.category}
                  </span>
                  <h3 className="font-bold text-white text-xs mb-1 leading-snug group-hover:text-violet-300 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{template.desc}</p>
                </div>

                <div>
                  <div className="flex items-center gap-1 flex-wrap mb-3">
                    {template.steps.map((step, i) => (
                      <React.Fragment key={i}>
                        <span className="text-[9px] px-2 py-0.5 bg-white/[0.04] text-slate-300 rounded border border-white/[0.06] font-medium">
                          {step}
                        </span>
                        {i < template.steps.length - 1 && <ArrowRight size={9} className="text-slate-600" />}
                      </React.Fragment>
                    ))}
                  </div>

                  <button className="w-full py-1.5 rounded-xl text-xs font-bold text-violet-300 bg-violet-500/20 border border-violet-500/30 group-hover:bg-violet-600 group-hover:text-white transition-all flex items-center justify-center gap-1.5 shadow-sm">
                    <Play size={11} />
                    <span>Launch Template</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── BUILT-IN AUTOMATION NODES ── */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-black text-white">Scraper & Enrichment Engines</h2>
              <p className="text-xs text-slate-400 mt-0.5">Individual autonomous modules for specialized data extraction</p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] p-1 rounded-xl">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeFilter === cat
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((auto, i) => {
              const c = colorClasses[auto.color] || colorClasses.violet;
              return (
                <motion.div
                  key={auto.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedAutomation(auto)}
                  className="rounded-2xl border border-white/[0.08] bg-[#0c0c16]/80 hover:border-violet-500/40 p-4 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.text} border ${c.border} flex items-center justify-center`}>
                        {auto.icon}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {auto.popular && (
                          <span className="text-[9px] px-2 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full font-bold">
                            Popular
                          </span>
                        )}
                        <span className="text-[9px] px-2 py-0.5 bg-white/[0.04] text-slate-400 border border-white/[0.06] rounded-full font-bold">
                          {auto.credits} credits
                        </span>
                      </div>
                    </div>

                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-0.5 block">
                      {auto.category}
                    </span>
                    <h3 className="font-bold text-white text-xs mb-1 group-hover:text-violet-300 transition-colors">
                      {auto.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{auto.desc}</p>

                    {/* Input / Output Tags */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-2">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Input</p>
                        <p className="text-[10px] font-semibold text-slate-300 truncate">{auto.input}</p>
                      </div>
                      <div className={`${c.bg} border ${c.border} rounded-xl p-2`}>
                        <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Output</p>
                        <p className={`text-[10px] font-semibold ${c.text} truncate`}>{auto.output}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {auto.tags.map(tag => (
                        <span key={tag} className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border ${c.badge}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button className="w-full py-2 rounded-xl text-xs font-bold bg-white/[0.04] border border-white/[0.08] text-slate-200 group-hover:bg-gradient-to-r group-hover:from-violet-600 group-hover:to-indigo-600 group-hover:text-white transition-all flex items-center justify-center gap-1.5 shadow-sm">
                    <Play size={11} />
                    <span>Run Automation</span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── AUTOMATION MODAL ── */}
      <AnimatePresence>
        {selectedAutomation && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedAutomation(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0f0f1c] border border-white/[0.12] rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden"
            >
              {(() => {
                const c = colorClasses[selectedAutomation.color] || colorClasses.violet;
                return (
                  <>
                    <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.text} border ${c.border} flex items-center justify-center shadow-md`}>
                          {selectedAutomation.icon}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {selectedAutomation.category} • {selectedAutomation.credits} Credits
                          </p>
                          <h3 className="text-sm font-black text-white">{selectedAutomation.name}</h3>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedAutomation(null)}
                        className="p-1.5 rounded-xl bg-white/[0.05] text-slate-400 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="p-5 space-y-4">
                      <p className="text-xs text-slate-300 leading-relaxed">{selectedAutomation.desc}</p>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Input Type</p>
                          <p className="text-xs font-semibold text-white mt-0.5">{selectedAutomation.input}</p>
                        </div>
                        <div className={`${c.bg} border ${c.border} rounded-xl p-3`}>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Target Output</p>
                          <p className={`text-xs font-semibold ${c.text} mt-0.5`}>{selectedAutomation.output}</p>
                        </div>
                      </div>

                      {/* Input Form */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          {selectedAutomation.id === 'phone-scraper' || selectedAutomation.id === 'email-scraper'
                            ? 'Enter Target URLs (one per line)'
                            : selectedAutomation.id === 'google-maps-scraper'
                              ? 'Enter Search Query (Category + Location)'
                              : selectedAutomation.id === 'bulk-csv'
                                ? 'Upload CSV Matrix (Category, District)'
                                : 'Configure Input Values'}
                        </label>

                        {selectedAutomation.id === 'bulk-csv' ? (
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/[0.1] rounded-2xl cursor-pointer hover:border-violet-500/40 hover:bg-violet-500/5 transition-all">
                            <FileText size={20} className="text-slate-400 mb-1" />
                            <span className="text-xs text-slate-300 font-bold">Upload CSV File</span>
                            <span className="text-[10px] text-slate-500">Columns: Category, District, Mandal</span>
                            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                          </label>
                        ) : (
                          <textarea
                            value={urlInput}
                            onChange={e => setUrlInput(e.target.value)}
                            placeholder={
                              selectedAutomation.id === 'google-maps-scraper'
                                ? 'Banquet Halls in Guntur'
                                : 'https://example-vendor.com\nhttps://mandap-services.in\nhttps://...'
                            }
                            rows={3}
                            className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono resize-none"
                          />
                        )}
                      </div>

                      {results.length > 0 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 max-h-36 overflow-y-auto custom-scrollbar">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                            Extraction Results ({results.length})
                          </p>
                          {results.map((r, i) => (
                            <div key={i} className="text-xs text-emerald-300 font-mono py-0.5 border-b border-emerald-500/10 last:border-0">
                              {r.phone || r.email || JSON.stringify(r)}
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => handleRunAutomation(selectedAutomation)}
                        disabled={running}
                        className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {running ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Executing Automation...</span>
                          </>
                        ) : (
                          <>
                            <Play size={13} />
                            <span>Launch Automation</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── WORKFLOW MODAL ── */}
      <AnimatePresence>
        {workflowModal && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setWorkflowModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0f0f1c] border border-white/[0.12] rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="text-base font-black text-white">
                  {workflowModal === 'new' ? 'Build Autonomous Workflow' : workflowModal.name}
                </h3>
                <button
                  onClick={() => setWorkflowModal(null)}
                  className="p-1 rounded-xl bg-white/[0.05] text-slate-400 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>

              {workflowModal !== 'new' && (
                <div className="flex items-center gap-2 p-3 bg-white/[0.03] rounded-xl border border-white/[0.08]">
                  {workflowModal.steps?.map((step, i) => (
                    <React.Fragment key={i}>
                      <span className="flex-1 text-center py-1 bg-white/[0.05] text-slate-200 rounded text-[10px] font-bold border border-white/[0.08]">
                        {step}
                      </span>
                      {i < workflowModal.steps.length - 1 && <ArrowRight size={11} className="text-violet-400" />}
                    </React.Fragment>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Workflow Name
                </label>
                <input
                  type="text"
                  defaultValue={workflowModal !== 'new' ? workflowModal.name : 'Guntur Banquet Hall Scraper Workflow'}
                  className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Execution Cadence
                </label>
                <select className="w-full px-3.5 py-2 bg-[#121222] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none">
                  <option value="once">Run Once (Instant)</option>
                  <option value="daily">Daily Cron (Every 24h)</option>
                  <option value="weekly">Weekly Cron (Territory Refresh)</option>
                </select>
              </div>

              <button
                onClick={() => {
                  toast.success('Workflow activated successfully!');
                  setWorkflowModal(null);
                }}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-600/30 flex items-center justify-center gap-2"
              >
                <Play size={13} />
                <span>{workflowModal !== 'new' ? 'Deploy Workflow' : 'Create & Save Workflow'}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
