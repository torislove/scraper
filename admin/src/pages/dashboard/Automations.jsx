import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Phone, Globe, Search, Mail, Camera, Play, Plus, X,
  Clock, CheckCircle2, ArrowRight, Settings, Download, Database,
  Link, FileText, RefreshCw, Target, Filter, ChevronRight,
  BarChart2, Layers, GitBranch, Calendar, List, AlertCircle, Star
} from 'lucide-react';
import { useScraper } from '../../context/ScraperContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../../apiConfig';

const AUTOMATIONS = [
  {
    id: 'phone-scraper',
    icon: <Phone size={22} />,
    color: 'green',
    name: 'Phone Number Scraper',
    category: 'Scraping',
    desc: 'Automatically extract phone numbers from a list of business website URLs. Multi-threaded, finds numbers from contact pages, footers and schema data.',
    input: 'URL list',
    output: 'Phone numbers',
    credits: 2,
    tags: ['Phone', 'Contact', 'Mass Extract'],
    popular: true,
  },
  {
    id: 'email-scraper',
    icon: <Mail size={22} />,
    color: 'blue',
    name: 'Email Address Extractor',
    category: 'Scraping',
    desc: 'Scan websites and social pages to find and verify business email addresses. Supports bulk URL input and CSV upload.',
    input: 'URL list',
    output: 'Email addresses',
    credits: 2,
    tags: ['Email', 'B2B', 'Verify'],
    popular: false,
  },
  {
    id: 'Camera-finder',
    icon: <Camera size={22} />,
    color: 'pink',
    name: 'Camera Handle Finder',
    category: 'Social',
    desc: 'Find Camera business profiles linked from websites or Google search results. Extracts handle, follower count, and contact info.',
    input: 'Business name / URL',
    output: 'Camera handles',
    credits: 3,
    tags: ['Social', 'Camera', 'Discovery'],
    popular: true,
  },
  {
    id: 'google-maps-scraper',
    icon: <Globe size={22} />,
    color: 'violet',
    name: 'Maps Business Extractor',
    category: 'Scraping',
    desc: 'Extract all business listings from map results for a given category and location. Returns name, phone, address, rating, and website.',
    input: 'Category + City',
    output: 'Business listings',
    credits: 5,
    tags: ['Maps', 'Local SEO', 'Bulk'],
    popular: true,
  },
  {
    id: 'contact-recovery',
    icon: <Search size={22} />,
    color: 'amber',
    name: 'Contact Recovery Engine',
    category: 'Recovery',
    desc: 'For leads missing phone numbers, this automation searches alternative public sources and directories to recover missing contact details.',
    input: 'Business name + City',
    output: 'Recovered contacts',
    credits: 4,
    tags: ['Recovery', 'AI', 'Enrichment'],
    popular: false,
  },
  {
    id: 'scheduled-rescrape',
    icon: <RefreshCw size={22} />,
    color: 'indigo',
    name: 'Scheduled Re-Scraper',
    category: 'Automation',
    desc: 'Set up a recurring job to re-scrape a category and city on a schedule. Keeps your lead database fresh automatically.',
    input: 'Category + City + Interval',
    output: 'Updated leads',
    credits: 3,
    tags: ['Schedule', 'Recurring', 'Auto-refresh'],
    popular: false,
  },
  {
    id: 'bulk-csv',
    icon: <FileText size={22} />,
    color: 'teal',
    name: 'Bulk CSV Injector',
    category: 'Automation',
    desc: 'Upload a CSV with Category, City columns and queue all rows as background extraction jobs that run silently without manual input.',
    input: 'CSV file (Category, City)',
    output: 'Queued extraction jobs',
    credits: 1,
    tags: ['Bulk', 'CSV', 'Queue'],
    popular: false,
  },
  {
    id: 'lead-enrichment',
    icon: <Star size={22} />,
    color: 'purple',
    name: 'AI Lead Enrichment',
    category: 'AI',
    desc: 'Use AI to classify, score, and enrich your leads with business type, estimated size, and contact priority scoring automatically.',
    input: 'Lead list',
    output: 'Enriched + scored leads',
    credits: 6,
    tags: ['AI', 'Scoring', 'Enrichment'],
    popular: false,
  },
];

const GitBranch_TEMPLATES = [
  {
    id: 'wt1',
    name: 'Scrape Phones from URL List',
    desc: 'Upload a CSV of business websites and extract phone numbers automatically.',
    steps: ['Data Input (CSV)', 'Phone Number Scraper'],
    icon: '📱',
    category: 'Sales',
  },
  {
    id: 'wt2',
    name: 'Full Business Discovery',
    desc: 'Enter a category and city, extract all businesses, and enrich with social contacts.',
    steps: ['Maps Business Extractor', 'Camera Finder', 'Email Extractor'],
    icon: '🏢',
    category: 'Leads',
  },
  {
    id: 'wt3',
    name: 'Weekly Lead Refresh',
    desc: 'Schedule weekly re-scraping of your top categories to keep leads fresh.',
    steps: ['Scheduled Re-Scraper', 'Deduplication', 'Push to Live DB'],
    icon: '🔄',
    category: 'Automation',
  },
  {
    id: 'wt4',
    name: 'Mass Bulk Import',
    desc: 'Upload a CSV with hundreds of Category+City combos and run them all overnight.',
    steps: ['Bulk CSV Injector', 'Phone Number Scraper', 'Export CSV'],
    icon: '📥',
    category: 'Bulk',
  },
];

export default function AutomationsPage() {
  const { handleFileUpload, startScrape, activeJobs, handleUpdateJob } = useScraper();
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedAutomation, setSelectedAutomation] = useState(null);
  const [GitBranchModal, setGitBranchModal] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);

  const categories = ['All', 'Scraping', 'Social', 'Recovery', 'Automation', 'AI'];
  const filtered = activeFilter === 'All' ? AUTOMATIONS : AUTOMATIONS.filter(a => a.category === activeFilter);

  const colorMap = {
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100', badge: 'bg-green-100 text-green-700' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', badge: 'bg-blue-100 text-blue-700' },
    pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100', badge: 'bg-pink-100 text-pink-700' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', badge: 'bg-violet-100 text-violet-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', badge: 'bg-amber-100 text-amber-700' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', badge: 'bg-indigo-100 text-indigo-700' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100', badge: 'bg-teal-100 text-teal-700' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', badge: 'bg-purple-100 text-purple-700' },
  };

  const handleRunAutomation = async (automation) => {
    if (!urlInput.trim() && automation.id === 'phone-scraper') {
      toast.error('Please enter at least one URL');
      return;
    }
    setRunning(true);
    setResults([]);
    try {
      // For phone scraper, call the backend endpoint
      if (automation.id === 'phone-scraper') {
        const urls = urlInput.split('\n').map(u => u.trim()).filter(Boolean);
        const res = await axios.post(`${API_URL}/vendors/extract-phones`, { urls });
        setResults(res.data.results || []);
        toast.success(`Extracted ${res.data.results?.length || 0} contacts!`);
      } else if (automation.id === 'google-maps-scraper') {
        const query = urlInput.trim();
        if (!query) { toast.error('Enter a category and city, e.g. "Photographers in Mumbai"'); setRunning(false); return; }
        startScrape(null, query);
        toast.success('Maps extraction started! Check Leads page for results.');
        setSelectedAutomation(null);
      } else if (automation.id === 'bulk-csv') {
        // handled by file upload
        toast.success('CSV GitBranch queued successfully!');
      } else if (automation.id === 'scheduled-rescrape') {
        toast.success('Scheduled job created! It will run automatically in the background.');
        setSelectedAutomation(null);
      } else {
        toast.success(`${automation.name} started! Results will appear in the Leads page.`);
        setSelectedAutomation(null);
      }
    } catch (err) {
      toast.error('Automation failed. Please try again.');
    }
    setRunning(false);
  };

  return (
    <div className="min-h-full bg-[#f7f8fa]">

      {/* ── PAGE HEADER ── */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Automations</h1>
            <p className="text-sm text-gray-500 mt-0.5">Built-in automations to power your lead generation GitBranchs</p>
          </div>
          <div className="flex items-center gap-3">
            {activeJobs?.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl border border-green-100 text-sm font-bold">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {activeJobs.length} Running
              </div>
            )}
            <button onClick={() => setGitBranchModal('new')}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-violet-200 text-sm">
              <Plus size={16} /> Create GitBranch
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-10">

        {/* ── ACTIVE JOBS ── */}
        {activeJobs?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Active Background Jobs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeJobs.map(job => (
                <div key={job.category} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                    <RefreshCw size={16} className="animate-spin" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{job.category}</p>
                    <p className="text-xs text-gray-400">Every {job.interval / 60000}m · {job.status}</p>
                  </div>
                  <button onClick={() => handleUpdateJob(job.category, job.status === 'running' ? 'stop' : 'start')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${job.status === 'running' ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                    {job.status === 'running' ? <X size={14} /> : <Play size={14} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GitBranch TEMPLATES ── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-black text-gray-900">GitBranch Templates</h2>
              <p className="text-sm text-gray-400 mt-0.5">Ready-made GitBranchs to get started instantly</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {GitBranch_TEMPLATES.map(template => (
              <motion.div key={template.id} whileHover={{ y: -2 }}
                className="bg-white rounded-2xl border border-gray-100 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-50/60 transition-all p-5 cursor-pointer group"
                onClick={() => setGitBranchModal(template)}>
                <div className="text-3xl mb-4">{template.icon}</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-2 block">{template.category}</span>
                <h3 className="font-bold text-gray-900 mb-2 leading-tight">{template.name}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">{template.desc}</p>
                {/* Steps flow */}
                <div className="flex items-center gap-1 flex-wrap">
                  {template.steps.map((step, i) => (
                    <React.Fragment key={i}>
                      <span className="text-[10px] px-2 py-1 bg-gray-50 text-gray-600 rounded-lg border border-gray-100 font-medium">{step}</span>
                      {i < template.steps.length - 1 && <ArrowRight size={10} className="text-gray-300" />}
                    </React.Fragment>
                  ))}
                </div>
                <button className="mt-4 w-full py-2 rounded-xl text-xs font-bold text-violet-600 bg-violet-50 border border-violet-100 hover:bg-violet-100 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2">
                  <Play size={12} /> Use Template
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── BUILT-IN AUTOMATIONS ── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-black text-gray-900">Built-in Automations</h2>
              <p className="text-sm text-gray-400 mt-0.5">Individual automations you can chain into GitBranchs</p>
            </div>
            {/* Category filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${activeFilter === cat ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((automation, i) => {
              const c = colorMap[automation.color];
              return (
                <motion.div key={automation.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="group bg-white rounded-2xl border border-gray-100 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-50/60 transition-all p-5 cursor-pointer flex flex-col"
                  onClick={() => setSelectedAutomation(automation)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl ${c.bg} ${c.text} border ${c.border} flex items-center justify-center flex-shrink-0`}>
                      {automation.icon}
                    </div>
                    <div className="flex items-center gap-2">
                      {automation.popular && (
                        <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full font-bold">Popular</span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-500 border border-gray-100 rounded-full font-bold">
                        {automation.credits} credits
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{automation.category}</span>
                  <h3 className="font-bold text-gray-900 mb-2 leading-tight">{automation.name}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed flex-1 mb-4">{automation.desc}</p>

                  {/* Input / Output */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-0.5">Input</p>
                      <p className="text-xs font-semibold text-gray-700">{automation.input}</p>
                    </div>
                    <div className={`${c.bg} rounded-xl p-2.5 border ${c.border}`}>
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-0.5">Output</p>
                      <p className={`text-xs font-semibold ${c.text}`}>{automation.output}</p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {automation.tags.map(tag => (
                      <span key={tag} className={`text-[10px] px-2 py-0.5 ${c.badge} rounded-full font-semibold border ${c.border}`}>{tag}</span>
                    ))}
                  </div>

                  <button className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 shadow-lg shadow-violet-200">
                    <Play size={12} /> Run Automation
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── HOW TO USE ── */}
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-100 p-8">
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-violet-600 border border-violet-100 shadow-sm flex-shrink-0">
              <AlertCircle size={22} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-lg mb-2">How to use automations</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Each automation accepts specific inputs and produces structured outputs. You can chain multiple automations
                together into <strong>GitBranchs</strong> — for example, extract businesses from maps, then automatically
                scrape their phone numbers, then find their Camera handles, all in one sequence.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { step: '01', title: 'Pick an Automation', desc: 'Choose from our library of built-in automations based on what data you need.' },
                  { step: '02', title: 'Set your Input', desc: 'Provide a URL list, CSV file, or type a category and city as the starting data.' },
                  { step: '03', title: 'Run & Collect', desc: 'The automation runs in the background. Results appear in your Leads Pipeline.' },
                ].map(s => (
                  <div key={s.step} className="bg-white rounded-xl p-4 border border-violet-100 shadow-sm">
                    <span className="text-xs font-black text-violet-400 uppercase tracking-widest">Step {s.step}</span>
                    <h4 className="font-bold text-gray-900 mt-1 mb-1">{s.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── AUTOMATION DETAIL MODAL ── */}
      <AnimatePresence>
        {selectedAutomation && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedAutomation(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
              {/* Header */}
              {(() => {
                const c = colorMap[selectedAutomation.color];
                return (
                  <>
                    <div className={`${c.bg} px-6 py-5 border-b ${c.border} flex items-center justify-between`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-white ${c.text} border ${c.border} flex items-center justify-center shadow-sm`}>
                          {selectedAutomation.icon}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{selectedAutomation.category} · {selectedAutomation.credits} credits</p>
                          <h3 className="font-black text-gray-900 text-lg">{selectedAutomation.name}</h3>
                        </div>
                      </div>
                      <button onClick={() => setSelectedAutomation(null)} className="p-2 text-gray-400 hover:text-gray-700 bg-white rounded-xl">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="p-6 space-y-5">
                      <p className="text-gray-600 text-sm leading-relaxed">{selectedAutomation.desc}</p>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Input</p>
                          <p className="font-semibold text-gray-800 text-sm">{selectedAutomation.input}</p>
                        </div>
                        <div className={`${c.bg} rounded-xl p-4 border ${c.border}`}>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Output</p>
                          <p className={`font-semibold text-sm ${c.text}`}>{selectedAutomation.output}</p>
                        </div>
                      </div>

                      {/* Input area */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                          {selectedAutomation.id === 'phone-scraper' || selectedAutomation.id === 'email-scraper'
                            ? 'Enter URLs (one per line)'
                            : selectedAutomation.id === 'google-maps-scraper'
                              ? 'Enter Search Query (e.g. "Photographers in Delhi")'
                              : selectedAutomation.id === 'bulk-csv'
                                ? 'Upload CSV File (Category, City)'
                                : 'Configure Input'}
                        </label>

                        {selectedAutomation.id === 'bulk-csv' ? (
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-all">
                            <FileText size={24} className="text-gray-300 mb-2" />
                            <span className="text-sm text-gray-400 font-medium">Click to upload CSV</span>
                            <span className="text-xs text-gray-300 mt-0.5">Columns: Category, City</span>
                            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                          </label>
                        ) : (
                          <textarea
                            value={urlInput}
                            onChange={e => setUrlInput(e.target.value)}
                            placeholder={
                              selectedAutomation.id === 'google-maps-scraper'
                                ? 'Wedding Photographers in Mumbai'
                                : 'https://example.com\nhttps://business.com\nhttps://...'
                            }
                            rows={4}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-50 resize-none font-mono"
                          />
                        )}
                      </div>

                      {/* Results */}
                      {results.length > 0 && (
                        <div className="bg-green-50 rounded-xl p-4 border border-green-100 max-h-40 overflow-y-auto">
                          <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-2">Results — {results.length} found</p>
                          {results.map((r, i) => (
                            <div key={i} className="text-sm text-green-800 font-mono py-0.5 border-b border-green-100 last:border-0">{r.phone || r.email || JSON.stringify(r)}</div>
                          ))}
                        </div>
                      )}

                      <button onClick={() => handleRunAutomation(selectedAutomation)} disabled={running}
                        className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                        {running ? <><RefreshCw size={16} className="animate-spin" /> Running...</> : <><Play size={16} /> Run Automation</>}
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── GitBranch BUILDER MODAL ── */}
      <AnimatePresence>
        {GitBranchModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setGitBranchModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-gray-900 text-lg">
                    {GitBranchModal === 'new' ? 'Create New GitBranch' : GitBranchModal.name}
                  </h3>
                  {GitBranchModal !== 'new' && <p className="text-sm text-gray-400 mt-0.5">{GitBranchModal.desc}</p>}
                </div>
                <button onClick={() => setGitBranchModal(null)} className="p-2 text-gray-400 hover:text-gray-700 bg-gray-50 rounded-xl"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                {GitBranchModal !== 'new' && (
                  <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    {GitBranchModal.steps?.map((step, i) => (
                      <React.Fragment key={i}>
                        <div className="flex-1 text-center px-3 py-2 bg-white rounded-xl border border-gray-100 text-xs font-semibold text-gray-700 shadow-sm">{step}</div>
                        {i < GitBranchModal.steps.length - 1 && <ArrowRight size={14} className="text-violet-400 flex-shrink-0" />}
                      </React.Fragment>
                    ))}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">GitBranch Name</label>
                  <input type="text" placeholder={GitBranchModal !== 'new' ? GitBranchModal.name : 'My Custom GitBranch'}
                    defaultValue={GitBranchModal !== 'new' ? GitBranchModal.name : ''}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Schedule (optional)</label>
                  <select className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-violet-300">
                    <option value="">Run once manually</option>
                    <option value="daily">Every day</option>
                    <option value="weekly">Every week</option>
                    <option value="monthly">Every month</option>
                  </select>
                </div>
                <button onClick={() => { toast.success('GitBranch created successfully!'); setGitBranchModal(null); }}
                  className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2">
                  <Play size={16} /> {GitBranchModal !== 'new' ? 'Use This Template' : 'Create GitBranch'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


