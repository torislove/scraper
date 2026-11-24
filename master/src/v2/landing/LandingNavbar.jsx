import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, Laptop, Server, Search, LogIn } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { useExtension } from '../context/ExtensionContext';
import LiquidButton3D from '../components/LiquidButton3D';
import {
  isMasterRuntime, openClientWorkspace, openMasterWorkspace
} from '../utils/editionSwitch';

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
    if (masterActive) {
      handleLaunchMaster();
    } else {
      handleLaunchClient();
    }
  };

  const openPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  const navLinks = [
    { to: '/', label: 'Overview', end: true },
    { to: '/architecture', label: '22 Engines' },
    { to: '/global-coverage', label: '11 Nations' },
    { to: '/hardware', label: 'Hardware RAM' },
    { to: '/story', label: 'Founder & 20% Equity ★', isSpecial: true }
  ];

  return (
    <header className="lx-single-nav">
      <div className="lx-single-nav-inner">
        {/* Zone 1 (Left): Real-Time 3D Golden Pin Logo & Wordmark */}
        <NavLink
          to="/"
          className="lx-brand-btn"
          aria-label="Scraper.co.in Home"
          style={{ textDecoration: 'none', flexShrink: 0 }}
        >
          <BrandLogo size={32} theme="light" use3d={true} />
        </NavLink>

        {/* Zone 2 (Center): Liquid 3D Gold Frosted Navigation Capsule */}
        <nav
          aria-label="Main Navigation"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '4px',
            borderRadius: 999,
            background: 'rgba(255, 251, 235, 0.72)',
            border: '1px solid rgba(217, 119, 6, 0.25)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.95)'
          }}
        >
          {navLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                position: 'relative',
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: isActive ? 850 : 650,
                color: isActive ? '#92400e' : item.isSpecial ? '#b45309' : '#475569',
                padding: '5px 12px',
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
                        border: '1.5px solid rgba(217, 119, 6, 0.45)',
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

        {/* Zone 3 (Right): Edition Switcher + Quick Palette + Primary Gold CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Compact Dual-Edition Panel Switcher */}
          <div
            className="lx-dual-panel-toggle"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(255, 251, 235, 0.8)',
              border: '1.5px solid rgba(217, 119, 6, 0.28)',
              borderRadius: 999,
              padding: 3,
              gap: 2,
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.95)'
            }}
          >
            <button
              type="button"
              onClick={handleLaunchClient}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                border: !masterActive ? '1px solid rgba(217, 119, 6, 0.35)' : '1px solid transparent',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                background: !masterActive ? '#ffffff' : 'transparent',
                color: !masterActive ? '#92400e' : '#64748b',
                boxShadow: !masterActive ? '0 2px 6px rgba(217, 119, 6, 0.14)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.16s ease'
              }}
              title="Open Client Cockpit (Private Local RAM Engine)"
            >
              <Laptop size={12} color={!masterActive ? '#d97706' : '#64748b'} />
              <span>Client</span>
            </button>

            <button
              type="button"
              onClick={handleLaunchMaster}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                border: masterActive ? '1px solid rgba(217, 119, 6, 0.45)' : '1px solid transparent',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                background: masterActive ? '#0b1120' : 'transparent',
                color: masterActive ? '#fde68a' : '#64748b',
                boxShadow: masterActive ? '0 2px 8px rgba(11, 17, 32, 0.22)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.16s ease'
              }}
              title="Open Master Fleet Command (Multi-Worker Swarm Telemetry)"
            >
              <Server size={12} color={masterActive ? '#fbbf24' : '#64748b'} />
              <span>Master</span>
            </button>
          </div>

          {/* Command Palette Trigger (Ctrl+K) */}
          <button
            type="button"
            onClick={openPalette}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 9px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.92)',
              border: '1px solid rgba(217, 119, 6, 0.28)',
              color: '#92400e',
              fontSize: 11,
              fontWeight: 750,
              cursor: 'pointer',
              boxShadow: 'inset 0 1px 0 #ffffff, 0 2px 6px rgba(120, 53, 15, 0.06)'
            }}
            title="Open Quick Command Palette (Ctrl+K)"
          >
            <Search size={12} />
            <kbd style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, opacity: 0.85 }}>⌘K</kbd>
          </button>

          {/* Direct Account Creation & Google Sign-In Button */}
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 11px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1.5px solid rgba(217, 119, 6, 0.35)',
              color: '#92400e',
              fontSize: 11.5,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: 'inset 0 1px 0 #ffffff, 0 2px 6px rgba(120, 53, 15, 0.08)',
              whiteSpace: 'nowrap'
            }}
            title="Sign in, create your workspace account, or continue with Google"
          >
            <LogIn size={12} color="#d97706" />
            <span>Sign In</span>
          </button>

          {/* Primary Liquid 3D Gold CTA with Integrated Live Extension Indicator */}
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
                  title={`RAM Turbo Active on ${userBrowser?.badge || 'Browser'}`}
                />
              )}
              <span>Launch Workspace</span>
            </span>
          </LiquidButton3D>
        </div>
      </div>
    </header>
  );
}