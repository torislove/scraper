import React from 'react';
import {
  LayoutDashboard, FolderArchive, Wifi, WifiOff, Cpu, Settings, ChevronDown,
  MapPin, Sparkles, FileSpreadsheet, Download, RefreshCw, Search, Server
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Logo, StatusPill, cx, formatNumber } from '../ui';
import { IS_DESKTOP, HOME_ROUTE } from '../../desktop';
import DesktopBadge from '../DesktopBadge';
import AccountMenu from './AccountMenu';
import NotificationBell from '../NotificationBell';
import SystemCheckPill from './SystemCheckPill';
import { openMasterWorkspace } from '../utils/editionSwitch';
import { useAuthSession } from '../auth';

export default function CommandCenterHeader({
  navigate,
  activeTab,
  setActiveTab,
  effectiveRuns,
  isEngineReady,
  sseStatus,
  extReady,
  openTelemetry,
  openSetup,
  searchCountry,
  skippedExtension,
  hardware,
  toolsRef,
  toolsOpen,
  setToolsOpen,
  run,
  sessions,
  exportFolder,
  refresh
}) {
  const session = useAuthSession();
  const showFreeLaunchPill = session?.user?.role !== 'master' && !session?.user?.trial?.paymentRequired;
  const freeDaysLeft = session?.user?.trial?.daysRemaining ?? 7;

  return (
    <header className="v2-cmd-top">
      <div className="v2-cmd-brand">
        <button type="button" className="v2-cmd-home" onClick={() => navigate(HOME_ROUTE)} title={IS_DESKTOP ? 'Workspace' : 'Back to home'}>
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
            <FolderArchive size={13} /> Saved Lists <b>{formatNumber(effectiveRuns.length)}</b>
          </button>
        </div>
      </div>

      <div className="v2-cmd-top-status">
        {showFreeLaunchPill && (
          <StatusPill tone="lime">
            <Sparkles size={11} />
            FREE ACCESS · {freeDaysLeft}D LEFT
          </StatusPill>
        )}
        <StatusPill tone={isEngineReady ? 'lime' : sseStatus === 'connecting' ? 'amber' : 'red'} pulse={isEngineReady}>
          {isEngineReady ? <Wifi size={11} /> : <WifiOff size={11} />}
          {isEngineReady ? 'LIVE' : sseStatus === 'connecting' ? 'CONNECTING' : 'RECONNECTING'}
        </StatusPill>

        <button
          type="button"
          className={cx('v2-gbc-cartridge-pill', extReady && 'is-on')}
          onClick={() => (extReady ? openTelemetry() : openSetup({ country: searchCountry }))}
          title={skippedExtension ? 'Running on Local Node.js Server Engine' : 'RAM Turbo status and your hardware lanes'}
        >
          <Cpu size={12} />
          <span>
            {skippedExtension
              ? `LOCAL SERVER · ${hardware.ramGb}GB · ${hardware.parallelZones} LANES`
              : extReady
                ? `RAM TURBO · ${hardware.ramGb}GB · ${hardware.parallelZones} LANES`
                : 'CONNECT RAM TURBO'}
          </span>
        </button>

        <SystemCheckPill variant="client" />
        <button
          type="button"
          className="v2-btn v2-btn-ghost v2-btn-sm"
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          style={{ borderColor: 'rgba(217, 119, 6, 0.34)', color: '#92400e', gap: 5 }}
          title="Quick Command Palette (Ctrl+K)"
        >
          <Search size={12} /> <kbd style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}>⌘K</kbd>
        </button>
        <button
          type="button"
          className="v2-btn v2-btn-ghost v2-btn-sm"
          onClick={() => openMasterWorkspace(navigate, `/command?country=${searchCountry || 'IN'}`)}
          style={{ borderColor: 'rgba(217, 119, 6, 0.42)', background: 'linear-gradient(135deg, #0b1120, #1e293b)', color: '#fde68a', gap: 5 }}
          title="Switch to Master Fleet Command"
        >
          <Server size={12} color="#fbbf24" /> Master Fleet
        </button>
        <NotificationBell />
        <DesktopBadge />
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
                <span><b>Full Screen Map</b><small>Explore every discovered business on the map</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('deep'); }}>
                <Sparkles size={14} />
                <span><b>Find Missing Contacts</b><small>Look up missing phones, emails &amp; websites</small></span>
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
                <span><b>Refresh Leads</b><small>Sync latest businesses and lists</small></span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
