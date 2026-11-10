import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal as TerminalIcon, Play, Square, RefreshCw, Copy, Download, Trash2,
  Filter, Search, CheckCircle2, AlertTriangle, ArrowDown, Shield, Zap, Radio
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MasterTerminalView({ logs = [], onClear, run, progress }) {
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef(null);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const text = typeof log === 'string' ? log : JSON.stringify(log);
      if (filter !== 'ALL' && !text.toUpperCase().includes(`[${filter}]`)) return false;
      if (searchTerm && !text.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [logs, filter, searchTerm]);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const handleCopyLogs = () => {
    const text = filteredLogs.map(l => typeof l === 'string' ? l : JSON.stringify(l)).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${filteredLogs.length} log lines to clipboard`);
  };

  const handleDownloadLogs = () => {
    const text = filteredLogs.map(l => typeof l === 'string' ? l : JSON.stringify(l)).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scraper_master_telemetry_${Date.now()}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded log file');
  };

  return (
    <div className="v2-master-terminal-container">
      {/* Top Telemetry Header */}
      <div className="v2-terminal-header">
        <div className="v2-terminal-brand">
          <TerminalIcon size={18} className="v2-terminal-icon" />
          <div>
            <span className="v2-terminal-title">MASTER OPERATOR LIVE ENGINE TELEMETRY</span>
            <span className="v2-terminal-sub">Real-Time Core Scraper Daemon Stream · SC_PORT: 5002</span>
          </div>
        </div>

        <div className="v2-terminal-stats">
          <div className="v2-stat-pill">
            <Radio size={12} className={run?.status === 'running' ? 'v2-pulse-green' : ''} />
            <span>STATUS: <b>{run?.status === 'running' ? 'SWARM SCANNING' : 'ONLINE / IDLE'}</b></span>
          </div>
          <div className="v2-stat-pill">
            <Zap size={12} color="#38bdf8" />
            <span>ACTIVE ZONE: <b>{progress?.activeMandal || 'Standby'}</b></span>
          </div>
          <div className="v2-stat-pill">
            <Shield size={12} color="#a78bfa" />
            <span>LOGS: <b>{logs.length}</b></span>
          </div>
        </div>
      </div>

      {/* Terminal Toolbar */}
      <div className="v2-terminal-toolbar">
        <div className="v2-terminal-filters">
          {['ALL', 'RUN', 'VENDOR', 'SWEEP', 'PLACES', 'WAIT'].map(tag => (
            <button
              type="button"
              key={tag}
              className={`v2-term-filter-btn ${filter === tag ? 'is-active' : ''}`}
              onClick={() => setFilter(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="v2-terminal-search">
          <Search size={14} color="#64748b" />
          <input
            type="text"
            placeholder="Search terminal logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="v2-term-search-input"
          />
        </div>

        <div className="v2-terminal-actions">
          <button
            type="button"
            className={`v2-term-action-btn ${autoScroll ? 'is-active' : ''}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title="Auto-scroll lock"
          >
            <ArrowDown size={14} /> Auto-Scroll
          </button>
          <button type="button" className="v2-term-action-btn" onClick={handleCopyLogs} title="Copy logs">
            <Copy size={14} /> Copy
          </button>
          <button type="button" className="v2-term-action-btn" onClick={handleDownloadLogs} title="Export logs">
            <Download size={14} /> Export
          </button>
          <button type="button" className="v2-term-action-btn is-danger" onClick={onClear} title="Clear terminal">
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      {/* Terminal Output Window */}
      <div className="v2-terminal-screen">
        <div className="v2-terminal-lines">
          {filteredLogs.length === 0 ? (
            <div className="v2-terminal-empty">
              [SYSTEM] No logs matching current filter. Waiting for scraper signals...
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              const text = typeof log === 'string' ? log : JSON.stringify(log);
              let toneClass = 'tone-default';
              if (text.includes('[RUN]') || text.includes('SWARM')) toneClass = 'tone-cyan';
              else if (text.includes('[VENDOR]') || text.includes('Extracted') || text.includes('verified')) toneClass = 'tone-green';
              else if (text.includes('[WARN]') || text.includes('drop') || text.includes('bypass')) toneClass = 'tone-yellow';
              else if (text.includes('[ERR]') || text.includes('fail') || text.includes('Error')) toneClass = 'tone-red';

              return (
                <div key={idx} className={`v2-term-row ${toneClass}`}>
                  <span className="v2-term-index">{(idx + 1).toString().padStart(4, '0')}</span>
                  <span className="v2-term-text">{text}</span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

