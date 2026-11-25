import React from 'react';
import {
  LayoutDashboard, FolderArchive, Wifi, WifiOff, Settings, ChevronDown,
  MapPin, FileSpreadsheet, Download, RefreshCw, Server
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Logo, StatusPill, cx, formatNumber } from '../ui';
import { HOME_ROUTE } from '../../desktop';
import AccountMenu from './AccountMenu';
import { openMasterWorkspace } from '../utils/editionSwitch';

export default function CommandCenterHeader({
  navigate,
  activeTab,
  setActiveTab,
  effectiveRuns,
  isEngineReady,
  sseStatus,
  searchCountry,
  toolsRef,
  toolsOpen,
  setToolsOpen,
  run,
  sessions,
  exportFolder,
  refresh
}) {
  return (
    <header className="v2-cmd-top">
      <div className="v2-cmd-brand">
        <button type="button" className="v2-cmd-home" onClick={() => navigate(HOME_ROUTE)} title="Back to home">
          <Logo compact />
        </button>
        <div className="lx-top-nav">
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
            <FolderArchive size={13} /> Folders <b>{formatNumber(effectiveRuns.length)}</b>
          </button>
        </div>
      </div>

      <div className="v2-cmd-top-status">
        <StatusPill tone={isEngineReady ? 'lime' : sseStatus === 'connecting' ? 'amber' : 'red'} pulse={isEngineReady}>
          {isEngineReady ? <Wifi size={11} /> : <WifiOff size={11} />}
          {isEngineReady ? 'LIVE' : sseStatus === 'connecting' ? 'CONNECTING' : 'RECONNECTING'}
        </StatusPill>

        <AccountMenu variant="client" />
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
                <span><b>Full Screen Satellite Map</b><small>Explore pinned businesses across the territory</small></span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setToolsOpen(false);
                  const target = run || sessions[0];
                  if (target?.id) exportFolder(target, 'xlsx');
                  else toast.error('Run a search first to download Excel.');
                }}
              >
                <FileSpreadsheet size={14} />
                <span><b>Download Excel (.xlsx)</b><small>Export current lead list as a spreadsheet</small></span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setToolsOpen(false);
                  const target = run || sessions[0];
                  if (target?.id) exportFolder(target, 'csv');
                  else toast.error('Run a search first to export CSV.');
                }}
              >
                <Download size={14} />
                <span><b>Download CSV</b><small>Export clean CSV table of leads</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); refresh(); toast.success('Workspace updated.'); }}>
                <RefreshCw size={14} />
                <span><b>Refresh Leads</b><small>Sync latest businesses and folders</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); openMasterWorkspace(navigate, `/command?country=${searchCountry || 'IN'}`); }}>
                <Server size={14} />
                <span><b>Switch to Master Fleet</b><small>Open district &amp; state-level sweep console</small></span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
