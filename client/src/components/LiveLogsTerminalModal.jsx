import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal, X, Copy, Check, Trash2, Download,
  Maximize2, Minimize2, Search, Filter, Radio,
  Activity, ArrowDown, Shield, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function LiveLogsTerminalModal({
  isOpen,
  onClose,
  logs = [],
  sseStatus = 'open',
  isScrapingActive = false,
  onClearLogs
}) {
  const [filterText, setFilterText] = useState('');
  const [activeTag, setActiveTag] = useState('ALL'); // ALL | CONTACTS | ORCHESTRATOR | ERRORS
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll to bottom as new logs stream in
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = useMemo(() => {
    let list = logs || [];

    if (activeTag === 'CONTACTS') {
      list = list.filter(l => l.includes('📞') || l.includes('Contact') || l.includes('WhatsApp') || l.includes('Email'));
    } else if (activeTag === 'ORCHESTRATOR') {
      list = list.filter(l => l.includes('[Orchestrator]') || l.includes('[Queue]') || l.includes('Swarm') || l.includes('session'));
    } else if (activeTag === 'ERRORS') {
      list = list.filter(l => l.toLowerCase().includes('error') || l.toLowerCase().includes('fail') || l.toLowerCase().includes('warning'));
    }

    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      list = list.filter(l => l.toLowerCase().includes(q));
    }

    return list;
  }, [logs, activeTag, filterText]);

  const handleCopyAll = () => {
    if (!logs || logs.length === 0) return;
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    toast.success('All server logs copied to clipboard!', { icon: '📋' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLog = () => {
    if (!logs || logs.length === 0) return;
    const blob = new Blob([logs.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scraper_server_logs_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded server log file!');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full ${
            isExpanded ? 'max-w-7xl h-[92vh]' : 'max-w-4xl h-[78vh]'
          } bg-[#070913] border border-cyan-500/30 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-left relative transition-all`}
        >
          {/* Neon Top Laser Header */}
          <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 via-violet-500 to-emerald-400" />

          {/* Terminal Title Bar */}
          <div className="px-5 py-3.5 bg-[#0a0d1d] border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              {/* Traffic light dots */}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 cursor-pointer hover:opacity-100" onClick={onClose} />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 cursor-pointer hover:opacity-100" onClick={() => setIsExpanded(!isExpanded)} />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 cursor-pointer hover:opacity-100" onClick={() => setAutoScroll(!autoScroll)} />
              </div>

              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <Terminal size={16} className="text-cyan-400" />
                <h3 className="text-xs font-black text-white font-mono tracking-wider uppercase">
                  Scraper.co.in Live Telemetry Console
                </h3>
              </div>

              {/* SSE Connection State Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-mono font-bold text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{sseStatus === 'open' ? 'SSE LIVE • PORT 5002' : 'CONNECTING...'}</span>
              </div>

              {isScrapingActive && (
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 text-[10px] font-mono font-bold border border-violet-500/30 animate-pulse">
                  SWARM ACTIVE
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAutoScroll(!autoScroll)}
                className={`p-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-colors ${
                  autoScroll ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/[0.05] text-slate-400'
                }`}
                title={autoScroll ? 'Auto-scroll: ON' : 'Auto-scroll: OFF'}
              >
                <ArrowDown size={13} />
                <span className="text-[10px] hidden sm:inline">Auto-scroll</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAll}
                className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors"
                title="Copy all logs"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>

              <button
                type="button"
                onClick={handleDownloadLog}
                className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors"
                title="Download .log file"
              >
                <Download size={14} />
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors hidden sm:inline-flex"
                title={isExpanded ? 'Minimize' : 'Expand full-screen'}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-5 py-2.5 bg-[#080a18] border-b border-white/[0.06] flex items-center justify-between gap-3 flex-wrap shrink-0">
            {/* Quick Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: `All (${logs.length})` },
                { id: 'CONTACTS', label: '📞 Phone / Contacts' },
                { id: 'ORCHESTRATOR', label: '⚡ Orchestrator' },
                { id: 'ERRORS', label: '⚠️ Warnings / Errors' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTag(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    activeTag === tab.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter logs regex / text..."
                className="w-full pl-7 pr-3 py-1 rounded-lg bg-black/50 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
              />
              {filterText && (
                <button
                  onClick={() => setFilterText('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Terminal Console Viewport */}
          <div
            ref={scrollRef}
            className="flex-1 p-5 overflow-y-auto font-mono text-[11px] leading-relaxed select-text space-y-1 bg-black/60"
            style={{ fontFamily: 'Fira Code, Consolas, Monaco, monospace' }}
          >
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log, idx) => {
                const text = typeof log === 'string' ? log : JSON.stringify(log);
                
                // Color formatting
                let colorClass = 'text-slate-300';
                if (text.includes('📞') || text.includes('WhatsApp Verified')) {
                  colorClass = 'text-emerald-400 font-bold bg-emerald-950/20 px-1 py-0.5 rounded border border-emerald-500/20';
                } else if (text.includes('✉️') || text.includes('[Email Discovered]')) {
                  colorClass = 'text-cyan-300 font-bold';
                } else if (text.includes('[Orchestrator]') || text.includes('⚡')) {
                  colorClass = 'text-violet-300 font-semibold';
                } else if (text.includes('[Local Finder Core]') || text.includes('[High-Speed Core]')) {
                  colorClass = 'text-cyan-400 font-medium';
                } else if (text.includes('[Containment Guard]') || text.includes('[Boundary Filter]')) {
                  colorClass = 'text-amber-400/90';
                } else if (text.toLowerCase().includes('error') || text.toLowerCase().includes('fail') || text.includes('🛑')) {
                  colorClass = 'text-rose-400 font-bold bg-rose-950/20 px-1 rounded';
                } else if (text.includes('[Cyber Core]')) {
                  colorClass = 'text-sky-300';
                }

                return (
                  <div key={`log-line-${idx}`} className="flex items-start gap-2 hover:bg-white/[0.03] px-1.5 py-0.5 rounded transition-colors group">
                    <span className="text-[10px] text-slate-600 select-none shrink-0 w-8 text-right font-mono">
                      {idx + 1}
                    </span>
                    <span className="text-slate-600 select-none shrink-0">›</span>
                    <span className={`break-all ${colorClass} flex-1`}>
                      {text}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-24 text-center text-slate-600">
                <Terminal size={32} className="mx-auto mb-2 text-slate-700" />
                <p className="text-xs">No matching log statements.</p>
                <p className="text-[10px] text-slate-700 mt-1">
                  Trigger any search above to stream real-time worker logs.
                </p>
              </div>
            )}
          </div>

          {/* Terminal Status Footer */}
          <div className="px-5 py-2 bg-[#090b1a] border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0">
            <div className="flex items-center gap-3">
              <span>Lines: <strong className="text-white">{filteredLogs.length}</strong> / {logs.length}</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400">Stream Buffer: Active (SSE)</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Auto-scroll:</span>
              <span className={autoScroll ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                {autoScroll ? 'LOCKED TO BOTTOM' : 'PAUSED'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
