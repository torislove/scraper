import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, Laptop, Server, Search, LogIn } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { useExtension } from '../context/ExtensionContext';
import LiquidButton3D from '../components/LiquidButton3D';
import {
  isMasterRuntime,
  openClientWorkspace,
  openMasterWorkspace
} from '../utils/editionSwitch';

const NAV_LINKS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/architecture', label: 'How It Works' },
  { to: '/global-coverage', label: '11 Markets' },
  { to: '/story', label: 'About & Trust' }
];

export default function LandingNavbar() {
  const navigate = useNavigate();
  const { ensureConnected, ready, userBrowser, openTelemetry } = useExtension() || {};
  const masterActive = isMasterRuntime();

  const handleLaunchClient = () => {
    openClientWorkspace(navigate, '/command?country=IN', ensureConnected);
  };

  const handleLaunchMaster = () => {
    openMasterWorkspace(navigate, '/command?country=IN');
  };

  const handlePrimaryLaunch = () => {
    if (masterActive) handleLaunchMaster();
    else handleLaunchClient();
  };

  return (
    <header className="lx-single-nav">
      <div className="lx-single-nav-inner">
        <NavLink
          to="/"
          className="lx-brand-btn"
          aria-label="Scraper.co.in Home"
          style={{ textDecoration: 'none', flexShrink: 0 }}
        >
          <BrandLogo size={32} theme="light" use3d={true} />
        </NavLink>

        {/* Clean 4-Destination Golden Capsule */}
        <nav aria-label="Main Navigation" className="lx-nav-capsule">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                position: 'relative',
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: isActive ? 850 : 650,
                color: isActive ? '#92400e' : '#475569',
                padding: '5px 13px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
                transition: 'color 0.16s ease'
              })}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="navGoldActivePill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 999,
                        background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
                        border: '1.5px solid rgba(217, 119, 6, 0.48)',
                        boxShadow: '0 2px 10px rgba(217, 119, 6, 0.18), inset 0 1px 0 #ffffff',
                        zIndex: 0
                      }}
                    />
                  )}
                  <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right Zone: Client · Master Switcher + Quick Palette + Sign In + Launch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <div className="lx-dual-panel-toggle lx-portal-pill-group">
            <button
              type="button"
              onClick={handleLaunchClient}
              className={`lx-portal-pill-btn ${!masterActive ? 'is-client-active' : ''}`}
              title="Run Client Workspace (scraper.co.in)"
            >
              <Laptop size={12} color={!masterActive ? '#059669' : '#64748b'} />
              <span>Client</span>
            </button>

            <button
              type="button"
              onClick={handleLaunchMaster}
              className={`lx-portal-pill-btn ${masterActive ? 'is-master-active' : ''}`}
              title="Run Master Fleet Command (master.scraper.co.in)"
            >
              <Server size={12} color={masterActive ? '#fbbf24' : '#64748b'} />
              <span>Master</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            className="lx-nav-cmd-btn"
            title="Quick Command Palette (Ctrl+K)"
          >
            <Search size={12} />
            <kbd style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, opacity: 0.85 }}>⌘K</kbd>
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="lx-nav-signin-btn"
            title="Sign in or start your free trial"
          >
            <LogIn size={12} color="#d97706" />
            <span>Sign In</span>
          </button>

          <LiquidButton3D
            variant="gold"
            size="sm"
            icon={Rocket}
            pulse
            onClick={handlePrimaryLaunch}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {ready && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    openTelemetry?.();
                  }}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#34d399',
                    boxShadow: '0 0 8px #34d399',
                    display: 'inline-block'
                  }}
                  title={`Live Engine Active on ${userBrowser?.badge || 'Browser'}`}
                />
              )}
              <span>{masterActive ? 'Launch Master' : 'Launch Client'}</span>
            </span>
          </LiquidButton3D>
        </div>
      </div>
    </header>
  );
}
