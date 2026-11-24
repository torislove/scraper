import React from 'react';
import {
  LayoutDashboard, FolderArchive, Brain, Wifi, WifiOff, Cpu, Settings, ChevronDown,
  MapPin, Activity, Terminal, Zap, Trash2, RefreshCw, Search, Laptop
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Logo, StatusPill, cx, formatNumber } from '../ui';
import { IS_DESKTOP, HOME_ROUTE } from '../../desktop';
import DesktopBadge from '../DesktopBadge';
import AccountMenu from './AccountMenu';
import SystemCheckPill from './SystemCheckPill';
import { openClientWorkspace } from '../utils/editionSwitch';

export default function CommandCenterHeader({
  navigate,
  activeTab,
  setActiveTab,
  masterRuns,
  isEngineReady,
  sseStatus,
  extReady,
  extRelayed,
  openTelemetry,
  openSetup,
  searchCountry,
  skippedExtension,
  hardware,
  toolsRef,
  toolsOpen,
  setToolsOpen,
  fetchTaxonomy,
  setTrashOpen,
  refresh
}) {
  return (
    <header className="v2-cmd-top">
      <div className="v2-cmd-brand">
        <button type="button" className="v2-cmd-home" onClick={() => navigate(HOME_ROUTE)} title={IS_DESKTOP ? 'Dashboard' : 'Back to home'}>
          <Logo compact />
        </button>
        <span className="mc-sovereign-badge">
          <span className="mc-dot" />
          MASTER
        </span>
        <div className="lx-top-nav is-master">
          <button
            type="button"
            className={cx('lx-nav-chip', activeTab === 'cockpit' && 'is-active')}
            onClick={() => setActiveTab('cockpit')}
          >
            <LayoutDashboard size={13} /> Workspace
          </button>
          <button
            type="button"
            className={cx('lx-nav-chip', activeTab === 'runs' && 'is-active')}
            onClick={() => setActiveTab('runs')}
          >
            <FolderArchive size={13} /> Master Folders <b>{formatNumber(masterRuns.length)}</b>
          </button>
          <button
            type="button"
            className={cx('lx-nav-chip', activeTab === 'intelligence' && 'is-active')}
            onClick={() => { setActiveTab('intelligence'); fetchTaxonomy(); }}
          >
            <Brain size={13} /> AI Simulator
          </button>
        </div>
      </div>

      <div className="v2-cmd-top-status">
        <StatusPill tone={isEngineReady ? 'lime' : sseStatus === 'connecting' ? 'amber' : 'red'} pulse={isEngineReady}>
          {isEngineReady ? <Wifi size={11} /> : <WifiOff size={11} />}
          {isEngineReady ? 'LIVE' : sseStatus === 'connecting' ? 'CONNECTING' : 'RECONNECTING'}
        </StatusPill>

        <button
          type="button"
          className={cx('cb-relay-pill', extReady && 'is-live')}
          onClick={() => (extReady ? openTelemetry() : openSetup({ country: searchCountry }))}
          title={skippedExtension ? 'Running on Local Node.js Server Engine' : extReady
            ? `RAM Turbo connected · ${extRelayed || 0} pages relayed · ${hardware.ramGb} GB · ${hardware.parallelZones} lanes`
            : 'Add the RAM Turbo extension in Chrome to use your own hardware'}
        >
          <span className={cx('cb-led', extReady ? 'is-live' : 'is-warn')} />
          {skippedExtension
            ? `LOCAL SERVER · ${hardware.ramGb}GB · ${hardware.parallelZones} LANES`
            : extReady
              ? `RAM TURBO · ${extRelayed || 0}`
              : 'CONNECT RAM TURBO'}
        </button>

        <SystemCheckPill variant="master" />
        <button
          type="button"
          className="v2-btn v2-btn-ghost v2-btn-sm"
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          style={{ borderColor: 'rgba(251, 191, 36, 0.45)', color: '#92400e', gap: 5 }}
          title="Quick Command Palette (Ctrl+K)"
        >
          <Search size={12} /> <kbd style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}>⌘K</kbd>
        </button>
        <button
          type="button"
          className="v2-btn v2-btn-ghost v2-btn-sm"
          onClick={() => openClientWorkspace(navigate, `/command?country=${searchCountry || 'IN'}`)}
          style={{ borderColor: 'rgba(251, 191, 36, 0.5)', color: '#92400e', gap: 5 }}
          title="Switch to Client Cockpit"
        >
          <Laptop size={12} color="#d97706" /> Client Cockpit
        </button>

        <DesktopBadge />
        <AccountMenu variant="master" />
        <div className="v2-tools" ref={toolsRef}>
          <button
            type="button"
            className={cx('v2-btn v2-btn-ghost v2-btn-sm v2-tools-trigger', toolsOpen && 'is-open')}
            onClick={() => setToolsOpen(open => !open)}
            aria-expanded={toolsOpen}
            aria-haspopup="menu"
          >
            <Settings size={13} /> Tools <ChevronDown size={12} className="v2-tools-caret" />
          </button>
          {toolsOpen && (
            <div className="v2-tools-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('map'); }}>
                <MapPin size={14} />
                <span><b>Full Screen Map</b><small>Explore all pins &amp; territory zones</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('intelligence'); fetchTaxonomy(); }}>
                <Brain size={14} />
                <span><b>AI Intelligence &amp; Simulator</b><small>Test queries across 11 markets</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('engines'); }}>
                <Activity size={14} />
                <span><b>Parallel Engines</b><small>Inspect active scrapers &amp; 4GB budget</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('terminal'); }}>
                <Terminal size={14} />
                <span><b>System Terminal</b><small>Raw engine telemetry stream</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('deep'); }}>
                <Zap size={14} />
                <span><b>Profile Engine</b><small>52-field vendor enrichment</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setTrashOpen(true); }}>
                <Trash2 size={14} />
                <span><b>Deleted Folders Trash</b><small>Restore archived folders</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); refresh(); toast.success('Data refreshed.'); }}>
                <RefreshCw size={14} />
                <span><b>Refresh Data</b><small>Sync leads and folders</small></span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
