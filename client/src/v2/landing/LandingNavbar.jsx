import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Rocket, LogIn } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { useExtension } from '../context/ExtensionContext';

export default function LandingNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ensureConnected } = useExtension();

  const handleLaunch = () => {
    ensureConnected(() => navigate('/command?country=IN'), { country: 'IN' });
  };

  const navLinks = [
    { to: '/', label: 'Overview', end: true },
    { to: '/architecture', label: 'Architecture & 22 Engines' },
    { to: '/global-coverage', label: 'Global Coverage' },
    { to: '/hardware', label: 'Hardware RAM' },
    { to: '/pricing', label: 'Pricing' }
  ];

  return (
    <header className="lx-minimal-nav-wrapper">
      <div className="lx-minimal-nav">
        {/* Left: Brand Logo */}
        <NavLink to="/" className="lx-minimal-brand" aria-label="Scraper.co.in Home">
          <BrandLogo size={32} theme="light" />
        </NavLink>

        {/* Center: Clean Focused Nav Links */}
        <nav className="lx-minimal-links" aria-label="Main Navigation">
          {navLinks.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `lx-minimal-link ${isActive ? 'is-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: Sleek Action Group */}
        <div className="lx-minimal-actions">
          <button
            type="button"
            className="lx-minimal-btn-ghost"
            onClick={() => navigate('/login')}
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            className="lx-minimal-btn-primary"
            onClick={handleLaunch}
          >
            <Rocket size={15} />
            <span>Launch Command Center</span>
          </button>
        </div>
      </div>
    </header>
  );
}
