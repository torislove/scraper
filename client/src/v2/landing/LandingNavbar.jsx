import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, LogIn, Layers } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { isMasterRuntime } from '../utils/editionSwitch';
import { useAuthSession } from '../auth';
import AccountMenu from '../components/AccountMenu';
import LiquidButton from '@shared/ui/LiquidButton';
import CategoryAtlasDrawer from '@shared/cockpit/CategoryAtlasDrawer';
import EditionSwitchPill from '@shared/ui/EditionSwitchPill';
import EditionCompareModal, { shouldSkipEditionModal, buildEditionSwitchUrl } from '@shared/ui/EditionCompareModal';

const ANCHOR_LINKS = [
  { href: '/#overview', hash: '#overview', label: 'Search' },
  { href: '/#live-proof', hash: '#live-proof', label: 'Live Preview' },
  { href: '/#markets', hash: '#markets', label: '5 Markets' },
  { href: '/#how-it-works', hash: '#how-it-works', label: 'How It Works' },
  { href: '/#compliance', hash: '#compliance', label: 'Compliance' },
  { href: '/#editions', hash: '#editions', label: 'Editions' }
];

export default function LandingNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const masterActive = isMasterRuntime();
  const session = useAuthSession();
  const [atlasOpen, setAtlasOpen] = useState(false);
  const [switchModalTarget, setSwitchModalTarget] = useState(null);

  const handleRequestSwitch = (target) => {
    const current = masterActive ? 'master' : 'client';
    if (target !== current && shouldSkipEditionModal()) {
      window.location.href = buildEditionSwitchUrl(target, {});
      return;
    }
    setSwitchModalTarget(target);
  };

  const activeHash = location.hash || (location.pathname === '/' ? '#overview' : '');

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 60,
          minHeight: 62,
          padding: '8px 18px',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid rgba(217, 119, 6, 0.24)',
          boxShadow: 'var(--lp-shadow-1)',
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Link to="/#overview" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <BrandLogo size={30} variant="compact" />
          </Link>
          <EditionSwitchPill isMaster={masterActive} onRequestSwitch={handleRequestSwitch} />
        </div>

        <nav
          aria-label="Landing Sections"
          className="no-scrollbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            overflowX: 'auto',
            padding: '2px 6px 5px',
            minWidth: 0
          }}
        >
          {ANCHOR_LINKS.map((item) => {
            const isActive = activeHash === item.hash;
            return (
              <LiquidButton
                key={item.href}
                size="sm"
                variant={isActive ? 'gold' : 'glass-gold'}
                onClick={() => navigate(item.href)}
                style={{ height: 32, padding: '0 12px', fontSize: 11.5, borderRadius: 10, flexShrink: 0 }}
              >
                {item.label}
              </LiquidButton>
            );
          })}
          <LiquidButton
            size="sm"
            variant="sapphire"
            icon={Layers}
            onClick={() => setAtlasOpen(true)}
            title="Inspect Services vs. Product Stores & Malls animated tree across all 5 markets"
            style={{ height: 32, padding: '0 13px', fontSize: 11.5, borderRadius: 10, flexShrink: 0 }}
          >
            Services vs Stores
          </LiquidButton>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <LiquidButton
            size="sm"
            variant="glass-gold"
            icon={Search}
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            title="Command Palette (Ctrl+K)"
            style={{ height: 32, padding: '0 10px', fontSize: 11, borderRadius: 10 }}
          >
            ⌘K
          </LiquidButton>

          {session?.token ? (
            <AccountMenu variant={masterActive ? 'master' : 'client'} />
          ) : (
            <LiquidButton
              size="sm"
              variant="gold"
              icon={LogIn}
              onClick={() => navigate('/login')}
              style={{ height: 32, padding: '0 13px', fontSize: 11.5, borderRadius: 10 }}
            >
              Sign In
            </LiquidButton>
          )}
        </div>
      </header>
      <CategoryAtlasDrawer isOpen={atlasOpen} onClose={() => setAtlasOpen(false)} />
      <EditionCompareModal
        isOpen={Boolean(switchModalTarget)}
        currentEdition={masterActive ? 'master' : 'client'}
        targetEdition={switchModalTarget || (masterActive ? 'client' : 'master')}
        onClose={() => setSwitchModalTarget(null)}
      />
    </>
  );
}
