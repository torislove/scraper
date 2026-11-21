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
    { to: '/solutions', label: "Who It's For" },
    { to: '/architecture', label: '22 Engines' },
    { to: '/global-coverage', label: '11 Nations & Cities' },
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
        <nav style={{ display: 'flex', alignItems: 'center', gap: 5 }} aria-label="Main Navigation">
          {navLinks.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: isActive ? 850 : 650,
                color: isActive ? '#059669' : '#475569',
                padding: '5px 12px',
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
              fontSize: 12,
              fontWeight: 700,
              padding: '5px 12px',
              borderRadius: 10,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <LogIn size={13} />
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
