import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Play, X, Plus, FileText, Link, Search, AlertCircle, Database, ArrowRight
} from 'lucide-react';
import { useScraper } from '../../context/ScraperContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../../apiConfig';

const AUTOMATIONS = [
  {
    id: 'bulk-csv',
    icon: <FileText size={22} />,
    color: 'teal',
    name: 'Bulk CSV Injector',
    category: 'Queue',
    desc: 'Upload a CSV with Category and City columns to instantly queue hundreds of deep searches overnight.',
    input: 'CSV file (Category, City)',
    output: 'Queued background jobs',
    credits: 1,
    tags: ['Bulk', 'CSV'],
    popular: true,
  },
  {
    id: 'extract-urls',
    icon: <Link size={22} />,
    color: 'green',
    name: 'Deep Contact Extractor',
    category: 'Scraping',
    desc: 'Paste a list of business URLs. We will deep crawl their websites to find hidden email addresses and phone numbers.',
    input: 'List of URLs',
    output: 'Contact Details',
    credits: 2,
    tags: ['Emails', 'Phones'],
    popular: true,
  },
  {
    id: 'find-social',
    icon: <Search size={22} />,
    color: 'pink',
    name: 'Social Media Finder',
    category: 'Discovery',
    desc: 'Paste a list of business names. We will use advanced dork searches to find their official Instagram profiles.',
    input: 'List of Business Names',
    output: 'Instagram Handles',
    credits: 3,
    tags: ['Social', 'Instagram'],
    popular: false,
  },
  {
    id: 'scheduled-rescrape',
    icon: <RefreshCw size={22} />,
    color: 'indigo',
    name: 'Scheduled Auto-Scraper',
    category: 'Automation',
    desc: 'Set up a recurring background job to automatically re-scrape a category and city every 24 hours to keep leads fresh.',
    input: 'Category + City',
    output: 'Recurring Map Scrapes',
    credits: 5,
    tags: ['Schedule', 'Cron'],
    popular: false,
  }
];

export default function AutomationsPage() {
  const { handleFileUpload, activeJobs, handleUpdateJob } = useScraper();
  const [selectedAutomation, setSelectedAutomation] = useState(null);
  const [inputData, setInputData] = useState('');
  const [scheduledCategory, setScheduledCategory] = useState('');
  const [scheduledLocation, setScheduledLocation] = useState('');
  const [running, setRunning] = useState(false);
  const [activeCronJobs, setActiveCronJobs] = useState([]);

  useEffect(() => {
    fetchCronJobs();
  }, []);

  const fetchCronJobs = async () => {
    try {
      const res = await axios.get(`${API_URL}/scrape/jobs`);
      setActiveCronJobs(res.data || []);
    } catch (e) {
      console.error('Failed to fetch cron jobs');
    }
  };

  const handleCronUpdate = async (category, action) => {
    try {
      await axios.post(`${API_URL}/scrape/jobs/update`, { category, action });
      toast.success(`Job ${action} successful!`);
      fetchCronJobs();
    } catch (e) {
      toast.error('Failed to update job');
    }
  };

  const handleRunAutomation = async (automation) => {
    setRunning(true);
    try {
      if (automation.id === 'bulk-csv') {
        // Typically handled by handleFileUpload directly via context, but if you want CSV parsing here:
        toast.error('Please use the file upload area directly.');
      } else if (automation.id === 'extract-urls') {
        const urls = inputData.split('\\n').map(l => l.trim()).filter(Boolean);
        if (!urls.length) { toast.error('Enter at least one URL'); setRunning(false); return; }
        
        await axios.post(`${API_URL}/automations/extract-urls`, { urls });
        toast.success(`Queued ${urls.length} URLs for deep scraping!`);
        setSelectedAutomation(null);
        setInputData('');
      } else if (automation.id === 'find-social') {
        const names = inputData.split('\\n').map(l => l.trim()).filter(Boolean);
        if (!names.length) { toast.error('Enter at least one business name'); setRunning(false); return; }

        await axios.post(`${API_URL}/automations/find-social`, { names });
        toast.success(`Queued ${names.length} businesses for social search!`);
        setSelectedAutomation(null);
        setInputData('');
      } else if (automation.id === 'scheduled-rescrape') {
        if (!scheduledCategory.trim() || !scheduledLocation.trim()) {
          toast.error('Category and City are required');
          setRunning(false);
          return;
        }

        await axios.post(`${API_URL}/scrape/jobs/update`, { 
          action: 'create', 
          category: scheduledCategory.trim(), 
          location: scheduledLocation.trim(),
          intervalMs: 24 * 60 * 60 * 1000 // 24 hours
        });
        toast.success(`Scheduled daily scraper for ${scheduledCategory} in ${scheduledLocation}!`);
        setSelectedAutomation(null);
        setScheduledCategory('');
        setScheduledLocation('');
        fetchCronJobs();
      }
    } catch (err) {
      toast.error('Automation failed. Please try again.');
    }
    setRunning(false);
  };

  const colorMap = {
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', badge: 'bg-emerald-100 text-emerald-700' },
    pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100', badge: 'bg-pink-100 text-pink-700' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', badge: 'bg-indigo-100 text-indigo-700' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100', badge: 'bg-teal-100 text-teal-700' },
  };

  return (
    <div className="min-h-full bg-[#f7f8fa]">
      {/* ── PAGE HEADER ── */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Automations & Workflows</h1>
            <p className="text-sm text-gray-500 mt-0.5">Built-in scripts to automate bulk data collection</p>
          </div>
          <div className="flex items-center gap-3">
            {activeJobs?.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl border border-green-100 text-sm font-bold">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {activeJobs.length} Background Jobs Running
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-10">

        {/* ── SCHEDULED CRON JOBS ── */}
        {activeCronJobs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-indigo-500" />
              Scheduled Recurring Scrapes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeCronJobs.map((job, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${job.status === 'running' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                    <RefreshCw size={16} className={job.status === 'running' ? 'animate-spin' : ''} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{job.category} in {job.location}</p>
                    <p className="text-xs text-gray-400">Every {Math.round(job.interval / 3600000)} hours · {job.status}</p>
                  </div>
                  <button onClick={() => handleCronUpdate(job.category, job.status === 'running' ? 'stop' : 'start')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${job.status === 'running' ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                    {job.status === 'running' ? <X size={14} /> : <Play size={14} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BUILT-IN AUTOMATIONS ── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-black text-gray-900">Task Library</h2>
              <p className="text-sm text-gray-400 mt-0.5">Click any task below to run it</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {AUTOMATIONS.map((automation, i) => {
              const c = colorMap[automation.color];
              return (
                <motion.div key={automation.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="group bg-white rounded-2xl border border-gray-100 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-50/60 transition-all p-5 cursor-pointer flex flex-col"
                  onClick={() => { setSelectedAutomation(automation); setInputData(''); setScheduledCategory(''); setScheduledLocation(''); }}>
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl ${c.bg} ${c.text} border ${c.border} flex items-center justify-center flex-shrink-0`}>
                      {automation.icon}
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

                  <button className="w-full py-2.5 rounded-xl text-xs font-bold bg-gray-900 text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 shadow-lg">
                    <Play size={12} /> Configure
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
              <Database size={22} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-lg mb-2">Automations enqueue background jobs</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                When you run an automation, it does not freeze the dashboard. Instead, it adds dozens or hundreds of tasks into the persistent queue. 
                You can monitor queue progress in the Live Log on the Overview page or watch leads stream in via the Leads page.
              </p>
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
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{selectedAutomation.category}</p>
                          <h3 className="font-black text-gray-900 text-lg">{selectedAutomation.name}</h3>
                        </div>
                      </div>
                      <button onClick={() => setSelectedAutomation(null)} className="p-2 text-gray-400 hover:text-gray-700 bg-white rounded-xl">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="p-6 space-y-5">
                      <p className="text-gray-600 text-sm leading-relaxed">{selectedAutomation.desc}</p>

                      {/* Input area */}
                      <div>
                        {selectedAutomation.id === 'bulk-csv' ? (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-all">
                            <FileText size={28} className="text-gray-300 mb-2" />
                            <span className="text-sm font-bold text-gray-600">Click to upload CSV</span>
                            <span className="text-xs font-semibold text-gray-400 mt-1">Columns required: Category, City</span>
                            <input type="file" accept=".csv" className="hidden" onChange={(e) => { handleFileUpload(e); setSelectedAutomation(null); toast.success('CSV uploaded to queue!'); }} />
                          </label>
                        ) : selectedAutomation.id === 'scheduled-rescrape' ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Category to Scrape</label>
                              <input type="text" placeholder="e.g. Wedding Photographers" value={scheduledCategory} onChange={e => setScheduledCategory(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">City Name</label>
                              <input type="text" placeholder="e.g. Mumbai" value={scheduledLocation} onChange={e => setScheduledLocation(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                            </div>
                          </div>
                        ) : (
                          <>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                              {selectedAutomation.id === 'extract-urls' ? 'Enter URLs (one per line)' : 'Enter Business Names (one per line)'}
                            </label>
                            <textarea
                              value={inputData}
                              onChange={e => setInputData(e.target.value)}
                              placeholder={selectedAutomation.id === 'extract-urls' ? "https://example.com\\nhttps://another.com" : "Gomandap Photos\\nWedding bells studios"}
                              rows={5}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-50 resize-none font-mono"
                            />
                          </>
                        )}
                      </div>

                      {selectedAutomation.id !== 'bulk-csv' && (
                        <button onClick={() => handleRunAutomation(selectedAutomation)} disabled={running}
                          className="w-full py-3.5 rounded-xl font-black text-white bg-gray-900 hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                          {running ? <><RefreshCw size={16} className="animate-spin" /> Queuing Jobs...</> : <><Play size={16} /> Run Automation</>}
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
