import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ShieldCheck, X } from 'lucide-react';

const SCREENS = [
  { path: '/', label: '01 Overview', short: 'Overview' },
  { path: '/architecture', label: '02 22 Engines', short: '22 Engines' },
  { path: '/global-coverage', label: '03 11 Nations', short: '11 Nations' },
  { path: '/hardware', label: '04 Hardware RAM', short: 'Hardware RAM' }
];

export default function LandingDockControls() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLegalModal, setShowLegalModal] = useState(false);

  const currentIndex = SCREENS.findIndex(s => s.path === location.pathname);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  // Listen to keyboard left/right arrow keys & number keys 1-4 for fluid screen switching
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (safeIndex < SCREENS.length - 1) {
          navigate(SCREENS[safeIndex + 1].path);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (safeIndex > 0) {
          navigate(SCREENS[safeIndex - 1].path);
        }
      } else if (['1', '2', '3', '4'].includes(e.key)) {
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
    <>
      <footer className="lx-bottom-dock" aria-label="Screen presentation controls">
        <div className="lx-dock-inner">
          {/* Left: Previous / Next arrow buttons with keyboard hint */}
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

            <span
              style={{
                fontSize: 11,
                color: '#94a3b8',
                fontWeight: 650,
                letterSpacing: '0.02em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
              className="hidden-mobile"
            >
              <kbd style={{ padding: '2px 5px', borderRadius: 4, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: 10 }}>←</kbd>
              <kbd style={{ padding: '2px 5px', borderRadius: 4, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: 10 }}>→</kbd>
              <span>to switch</span>
            </span>
          </div>

          {/* Center: 4 Screen Indicator Pills */}
          <nav className="lx-dock-pills" aria-label="Showcase screens">
            {SCREENS.map((sc, idx) => {
              const isActive = idx === safeIndex;
              return (
                <button
                  key={sc.path}
                  type="button"
                  onClick={() => navigate(sc.path)}
                  className={`lx-dock-pill-btn ${isActive ? 'is-active' : ''}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeDockPill"
                      className="lx-dock-pill-active-bg"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span style={{ position: 'relative', zIndex: 1 }}>{sc.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Compact Legal & Status Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              onClick={() => setShowLegalModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: 11.5,
                fontWeight: 650,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <ShieldCheck size={13} color="#10b981" />
              <span>Compliance &amp; Legal</span>
            </button>

            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
              Screen {safeIndex + 1} of 4
            </span>
          </div>
        </div>
      </footer>

      {/* Compliance & Legal Modal */}
      <AnimatePresence>
        {showLegalModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(8px)',
              padding: 20
            }}
            onClick={() => setShowLegalModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 580,
                background: '#ffffff',
                borderRadius: 20,
                border: '1.5px solid rgba(255, 255, 255, 0.95)',
                boxShadow: '0 24px 60px rgba(15, 23, 42, 0.22)',
                padding: '24px 28px',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  Legal &amp; Trademark Compliance Notice
                </h3>
                <button
                  type="button"
                  onClick={() => setShowLegalModal(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: 12.5, lineHeight: 1.6, color: '#475569', margin: 0 }}>
                Scraper.co.in is an independent commercial intelligence software platform and search index designed
                for discovering publicly accessible commercial business records, open mapping points of interest (POI),
                and public corporate contact registries. All brand names, trade names, service marks, and logos referenced
                across public documentation are the intellectual property of their respective owners and are used purely
                for nominative and identification purposes. Scraper.co.in is not affiliated with, endorsed by, or sponsored
                by any third-party directory, search engine, or mapping provider. All operations are executed solely against
                publicly available data in compliance with automated rate-limiting protocols and local fair-use standards.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setShowLegalModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: '7px 18px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#334155'
                  }}
                >
                  Close Notice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
