import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, LayoutDashboard, Globe, Database, Sliders, Users, TrendingUp, ShieldCheck
} from 'lucide-react';

const SCREENS = [
  { path: '/', label: '01 Overview', short: 'Overview', icon: LayoutDashboard },
  { path: '/customers', label: '02 Customers', short: 'Customers', icon: Users },
  { path: '/trending', label: '03 Trending', short: 'Trending', icon: TrendingUp },
  { path: '/data-vault', label: '04 Data Vault', short: 'Data Vault', icon: Database },
  { path: '/popups', label: '05 Popups', short: 'Popups', icon: Sliders },
  { path: '/countries', label: '06 11 Nations', short: '11 Nations', icon: Globe },
  { path: '/clients', label: '07 Clients', short: 'Clients', icon: ShieldCheck }
];

export default function AdminDockControls() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentIndex = SCREENS.findIndex((s) => s.path === location.pathname);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (safeIndex < SCREENS.length - 1) {
          navigate(SCREENS[safeIndex + 1].path);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (safeIndex > 0) {
          navigate(SCREENS[safeIndex - 1].path);
        }
      } else if (['1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (SCREENS[idx]) navigate(SCREENS[idx].path);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeIndex, navigate]);

  const goPrev = () => {
    if (safeIndex > 0) navigate(SCREENS[safeIndex - 1].path);
  };

  const goNext = () => {
    if (safeIndex < SCREENS.length - 1) navigate(SCREENS[safeIndex + 1].path);
  };

  return (
    <footer className="lx-bottom-dock" aria-label="Admin console navigation controls">
      <div className="lx-dock-inner" style={{ maxWidth: 1180 }}>
        {/* Left: Previous / Next buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="lx-dock-arrow-btn"
            onClick={goPrev}
            disabled={safeIndex === 0}
            aria-label="Previous screen (Left Arrow)"
            title="Previous screen (← key)"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            className="lx-dock-arrow-btn"
            onClick={goNext}
            disabled={safeIndex === SCREENS.length - 1}
            aria-label="Next screen (Right Arrow)"
            title="Next screen (→ key)"
          >
            <ChevronRight size={18} />
          </button>

          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ padding: '2px 5px', borderRadius: 4, background: '#fffbeb', border: '1px solid rgba(217, 119, 6, 0.3)', color: '#92400e', fontSize: 10 }}>←</kbd>
            <kbd style={{ padding: '2px 5px', borderRadius: 4, background: '#fffbeb', border: '1px solid rgba(217, 119, 6, 0.3)', color: '#92400e', fontSize: 10 }}>→</kbd>
            <span>(or keys 1–7)</span>
          </span>
        </div>

        {/* Center: Screen indicator pills (Liquid 3D Gold) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {SCREENS.map((screen, idx) => {
            const isActive = idx === safeIndex;
            const Icon = screen.icon;
            return (
              <button
                key={screen.path}
                type="button"
                onClick={() => navigate(screen.path)}
                style={{
                  padding: '5px 11px',
                  borderRadius: 999,
                  border: isActive ? '1.5px solid rgba(217, 119, 6, 0.55)' : '1px solid rgba(217, 119, 6, 0.2)',
                  background: isActive ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : 'rgba(255, 255, 255, 0.85)',
                  color: isActive ? '#92400e' : '#64748b',
                  fontSize: 11,
                  fontWeight: isActive ? 850 : 650,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: isActive ? '0 2px 10px rgba(217, 119, 6, 0.18)' : 'none',
                  transition: 'all 0.16s ease'
                }}
              >
                <Icon size={12} color={isActive ? '#d97706' : '#94a3b8'} />
                <span>{screen.short}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Edition Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: '#92400e',
              background: '#fffbeb',
              border: '1px solid rgba(217, 119, 6, 0.35)',
              padding: '4px 10px',
              borderRadius: 999
            }}
          >
            SOVEREIGN ADMIN v2.0
          </span>
        </div>
      </div>
    </footer>
  );
}