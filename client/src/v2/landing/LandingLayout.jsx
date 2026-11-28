import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import LandingNavbar from './LandingNavbar';
import CommandPalette from '../components/CommandPalette';

export default function LandingLayout({ children }) {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [location.pathname, location.hash]);

  return (
    <div className="lp-canvas-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <LandingNavbar />
      <main id="main-content" style={{ flex: 1, width: '100%' }}>
        {children || <Outlet />}
      </main>
      <CommandPalette />
    </div>
  );
}
