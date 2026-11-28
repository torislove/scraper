import React, { useState } from 'react';
import { Search, LayoutDashboard, FolderArchive, Wifi, WifiOff, Layers } from 'lucide-react';
import { Logo, StatusPill, formatNumber } from '../ui';
import { HOME_ROUTE } from '../../desktop';
import AccountMenu from './AccountMenu';
import LiquidButton from '@shared/ui/LiquidButton';
import CategoryAtlasDrawer from '@shared/cockpit/CategoryAtlasDrawer';
import EditionSwitchPill from '@shared/ui/EditionSwitchPill';
import EditionCompareModal, { shouldSkipEditionModal, buildEditionSwitchUrl } from '@shared/ui/EditionCompareModal';

export default function CommandCenterHeader({
  navigate,
  activeTab,
  setActiveTab,
  effectiveRuns = [],
  isEngineReady = false,
  sseStatus = 'connecting',
  isMaster = false,
  searchCountry = 'IN',
  isHeroMode = false,
  onResetToHero,
  onOpenFolders,
  foldersCount = 0
}) {
  const [atlasOpen, setAtlasOpen] = useState(false);
  const [switchTarget, setSwitchTarget] = useState(null);

  const handleRequestSwitch = (target) => {
    const current = isMaster ? 'master' : 'client';
    if (target !== current && shouldSkipEditionModal()) {
      window.location.href = buildEditionSwitchUrl(target, { country: searchCountry });
      return;
    }
    setSwitchTarget(target);
  };

  const isCockpitActive = !isHeroMode && (activeTab === 'cockpit' || activeTab === 'leads');
  const isFoldersActive = activeTab === 'runs' || activeTab === 'sessions';

  return (
    <>
      <header
        className="v2-cmd-top"
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: 12
        }}
      >
        <div className="v2-cmd-brand">
          <button
            type="button"
            className="v2-cmd-home"
            onClick={() => {
              if (HOME_ROUTE === '/' && navigate) navigate('/');
              else if (onResetToHero) onResetToHero();
              else navigate?.(HOME_ROUTE);
            }}
            title="Back to Main Search"
          >
            <Logo compact theme={isMaster ? 'dark' : 'light'} />
          </button>
          <EditionSwitchPill isMaster={isMaster} onRequestSwitch={handleRequestSwitch} />
        </div>

        <nav
          aria-label="Workspace Navigation"
          className="no-scrollbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            overflowX: 'auto',
            padding: '2px 6px 5px',
            minWidth: 0
          }}
        >
          <LiquidButton
            size="sm"
            variant={isHeroMode ? 'gold' : 'glass-gold'}
            icon={Search}
            onClick={() => {
              if (HOME_ROUTE === '/' && navigate) navigate('/');
              else onResetToHero?.();
            }}
            style={{ height: 32, padding: '0 13px', fontSize: 11.5, borderRadius: 10, flexShrink: 0 }}
          >
            Search
          </LiquidButton>
          <LiquidButton
            size="sm"
            variant={isCockpitActive ? 'gold' : 'glass-gold'}
            icon={LayoutDashboard}
            onClick={() => setActiveTab?.('leads')}
            style={{ height: 32, padding: '0 13px', fontSize: 11.5, borderRadius: 10, flexShrink: 0 }}
          >
            Cockpit
          </LiquidButton>
          <LiquidButton
            size="sm"
            variant={isFoldersActive ? 'gold' : 'glass-gold'}
            icon={FolderArchive}
            badge={formatNumber(foldersCount || effectiveRuns?.length || 0)}
            onClick={() => {
              if (typeof onOpenFolders === 'function') onOpenFolders();
              else setActiveTab?.('sessions');
            }}
            style={{ height: 32, padding: '0 13px', fontSize: 11.5, borderRadius: 10, flexShrink: 0 }}
          >
            Folders
          </LiquidButton>
          <LiquidButton
            size="sm"
            variant={atlasOpen ? 'gold' : 'sapphire'}
            icon={Layers}
            onClick={() => setAtlasOpen(true)}
            title="Browse Services vs. Product Stores & Malls animated tree across all 5 markets"
            style={{ height: 32, padding: '0 13px', fontSize: 11.5, borderRadius: 10, flexShrink: 0 }}
          >
            Services vs Stores
          </LiquidButton>
        </nav>

        <div className="v2-cmd-top-status">
          <StatusPill tone={isEngineReady ? 'lime' : sseStatus === 'connecting' ? 'amber' : 'red'} pulse={isEngineReady}>
            {isEngineReady ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isEngineReady ? 'LIVE' : sseStatus === 'connecting' ? 'CONNECTING' : 'RECONNECTING'}
          </StatusPill>

          <AccountMenu variant={isMaster ? 'master' : 'client'} />
        </div>
      </header>
      <CategoryAtlasDrawer isOpen={atlasOpen} onClose={() => setAtlasOpen(false)} country={searchCountry} />
      <EditionCompareModal
        isOpen={Boolean(switchTarget)}
        currentEdition={isMaster ? 'master' : 'client'}
        targetEdition={switchTarget || (isMaster ? 'client' : 'master')}
        context={{ country: searchCountry }}
        onClose={() => setSwitchTarget(null)}
      />
    </>
  );
}
