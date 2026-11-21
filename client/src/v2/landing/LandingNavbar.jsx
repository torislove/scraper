import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Rocket, LogIn } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { useExtension } from '../context/ExtensionContext';
import LiquidButton3D from '../components/LiquidButton3D';

export default function LandingNavbar() {
  const navigate = useNavigate();
  const { ensureConnected } = useExtension();

  const handleLaunch = () => {
    ensureConnected(() => navigate('/command?country=IN'), { country: 'IN' });
  };

  const navLinks = [
    { to: '/', label: 'Overview', end: true },
    { to: '/architecture', label: '22 Swarm Engines' },
    { to: '/global-coverage', label: '11 Sovereign Markets' },
    { to: '/hardware', label: 'Hardware RAM' },
    { to: '/pricing', label: 'Pricing' }
  ];

  return (
    <header className="lx-single-nav">
      <div className="lx-single-nav-inner">
        {/* Left: Brand Logo */}
        <NavLink to="/" className="lx-brand-btn" aria-label="Scraper.co.in Home">
          <BrandLogo size={30} theme="light" />
        </NavLink>

        {/* Center: Clean Nav Links with Active State */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }} aria-label="Main Navigation">
          {navLinks.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                textDecoration: 'none',
                fontSize: 12.5,
                fontWeight: isActive ? 850 : 650,
                color: isActive ? '#059669' : '#475569',
                padding: '6px 14px',
                borderRadius: 999,
                background: isActive ? '#ecfdf5' : 'transparent',
                border: isActive ? '1px solid #a7f3d0' : '1px solid transparent',
                transition: 'all 0.16s ease'
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: Tactile 3D Action Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#475569',
              fontSize: 12.5,
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: 10,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>

          <LiquidButton3D
            variant="emerald"
            size="sm"
            icon={Rocket}
            pulse
            onClick={handleLaunch}
          >
            Launch Command Center
          </LiquidButton3D>
        </div>
      </div>
    </header>
  );
}
