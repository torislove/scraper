import React from 'react';
import {
  LayoutDashboard, FolderArchive, Brain, Wifi, WifiOff, Settings, ChevronDown,
  MapPin, Activity, Terminal, Trash2, RefreshCw, Laptop
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Logo, StatusPill, cx, formatNumber } from '../ui';
import { HOME_ROUTE } from '../../desktop';
import AccountMenu from './AccountMenu';
import { openClientWorkspace } from '../utils/editionSwitch';

export default function CommandCenterHeader({
  navigate,
  activeTab,
  setActiveTab,
  masterRuns,
  isEngineReady,
  sseStatus,
  searchCountry,
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
        <button type="button" className="v2-cmd-home" onClick={() => navigate(HOME_ROUTE)} title="Back to home">
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
            <FolderArchive size={13} /> Folders <b>{formatNumber(masterRuns.length)}</b>
          </button>
        </div>
      </div>

      <div className="v2-cmd-top-status">
        <StatusPill tone={isEngineReady ? 'lime' : sseStatus === 'connecting' ? 'amber' : 'red'} pulse={isEngineReady}>
          {isEngineReady ? <Wifi size={11} /> : <WifiOff size={11} />}
          {isEngineReady ? 'LIVE' : sseStatus === 'connecting' ? 'CONNECTING' : 'RECONNECTING'}
        </StatusPill>

        <AccountMenu variant="master" />
        <div className="v2-tools" ref={toolsRef}>
          <button
            type="button"
            className={cx('v2-btn v2-btn-ghost v2-btn-sm v2-tools-trigger', toolsOpen && 'is-open')}
            onClick={() => setToolsOpen(open => !open)}
            aria-expanded={toolsOpen}
            aria-haspopup="menu"
          >
            <Settings size={13} /> Menu <ChevronDown size={12} className="v2-tools-caret" />
          </button>
          {toolsOpen && (
            <div className="v2-tools-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('map'); }}>
                <MapPin size={14} />
                <span><b>Full Screen Satellite Map</b><small>Explore all pins across territory</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('intelligence'); fetchTaxonomy(); }}>
                <Brain size={14} />
                <span><b>AI Intelligence</b><small>Inspect category matching across markets</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('engines'); }}>
                <Activity size={14} />
                <span><b>Engine Telemetry</b><small>Inspect active scrapers &amp; memory health</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('terminal'); }}>
                <Terminal size={14} />
                <span><b>System Logs</b><small>Raw worker telemetry stream</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setTrashOpen(true); }}>
                <Trash2 size={14} />
                <span><b>Deleted Folders</b><small>Restore archived lead lists</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); refresh(); toast.success('Data refreshed.'); }}>
                <RefreshCw size={14} />
                <span><b>Refresh Data</b><small>Sync leads and folders</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); openClientWorkspace(navigate, `/command?country=${searchCountry || 'IN'}`); }}>
                <Laptop size={14} />
                <span><b>Switch to Client Cockpit</b><small>Open focused single-city workspace</small></span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
