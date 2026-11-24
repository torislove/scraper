import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ShieldCheck, X, Play, Pause } from 'lucide-react';

const SCREENS = [
  { path: '/', label: '01 Overview', short: 'Overview' },
  { path: '/solutions', label: "02 Who It's For", short: 'Solutions' },
  { path: '/architecture', label: '03 22 Engines', short: '22 Engines' },
  { path: '/global-coverage', label: '04 11 Nations & Cities', short: '11 Nations' },
  { path: '/hardware', label: '05 Hardware RAM', short: 'Hardware RAM' },
  { path: '/story', label: '06 Founder & 20% Equity', short: 'Founder' }
];

export default function LandingDockControls() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const currentIndex = SCREENS.findIndex(s => s.path === location.pathname);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  // Autoplay Presentation Loop: cycles through screens every 7.5 seconds
  useEffect(() => {
    if (!isPlaying) {
      setProgress(0);
      return undefined;
    }

    const intervalMs = 100;
    const durationMs = 7500;
    const step = (intervalMs / durationMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          const nextIndex = (safeIndex + 1) % SCREENS.length;
          navigate(SCREENS[nextIndex].path);
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, safeIndex, navigate]);

  // Listen to keyboard left/right arrow keys, number keys 1-6 & Spacebar for autoplay toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setIsPlaying(false);
        if (safeIndex < SCREENS.length - 1) {
          navigate(SCREENS[safeIndex + 1].path);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setIsPlaying(false);
        if (safeIndex > 0) {
          navigate(SCREENS[safeIndex - 1].path);
        }
      } else if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        setIsPlaying(false);
        const idx = parseInt(e.key, 10) - 1;
        if (SCREENS[idx]) navigate(SCREENS[idx].path);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeIndex, navigate]);

  const goPrev = () => {
    setIsPlaying(false);
    if (safeIndex > 0) navigate(SCREENS[safeIndex - 1].path);
  };

  const goNext = () => {
    setIsPlaying(false);
    if (safeIndex < SCREENS.length - 1) navigate(SCREENS[safeIndex + 1].path);
  };

  return (
    <>
      <footer className="lx-bottom-dock" aria-label="Screen presentation controls">
        <div className="lx-dock-inner">
          {/* Left: Previous / Next arrow buttons with Autoplay Tour toggle */}
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

            {/* Presentation Autoplay Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 11px',
                borderRadius: 999,
                background: isPlaying ? '#fffbeb' : '#ffffff',
                border: isPlaying ? '1.5px solid #d97706' : '1px solid rgba(217, 119, 6, 0.28)',
                color: isPlaying ? '#92400e' : '#334155',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: isPlaying ? '0 0 12px rgba(245, 158, 11, 0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.16s ease'
              }}
              title="Toggle Auto-Play Presentation (or press Spacebar)"
            >
              {isPlaying ? <Pause size={12} color="#b45309" /> : <Play size={12} color="#92400e" />}
              <span>{isPlaying ? 'Pause Tour' : 'Auto Tour'}</span>
              {isPlaying && (
                <div style={{ width: 14, height: 14, position: 'relative', display: 'grid', placeItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#fde68a"
                      strokeWidth="4"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="4"
                      strokeDasharray={`${progress}, 100`}
                    />
                  </svg>
                </div>
              )}
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
              <kbd style={{ padding: '2px 5px', borderRadius: 4, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: 10 }}>Space</kbd>
              <span style={{ marginLeft: 2 }}>Auto-Tour</span>
            </span>
          </div>

          {/* Center: 6 Screen Indicator Pills */}
          <nav className="lx-dock-pills" aria-label="Showcase screens">
            {SCREENS.map((sc, idx) => {
              const isActive = idx === safeIndex;
              return (
                <button
                  key={sc.path}
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    navigate(sc.path);
                  }}
                  className={`lx-dock-pill-btn ${isActive ? 'is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <motion.span
                      layoutId="dockPillActiveBg"
                      className="lx-dock-pill-active-bg"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span style={{ position: 'relative', zIndex: 1 }}>{sc.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Security & Compliance Transparency */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setShowLegalModal(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 8px',
                borderRadius: 8
              }}
              title="Click to view legal compliance"
            >
              <ShieldCheck size={13} color="#059669" />
              <span>100% Legal &amp; Compliant</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Compliance Information Modal */}
      <AnimatePresence>
        {showLegalModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(8px)',
              padding: 20
            }}
            onClick={() => setShowLegalModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2 }}
              style={{
                width: '100%',
                maxWidth: 540,
                background: '#ffffff',
                borderRadius: 20,
                padding: 26,
                boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.25)',
                border: '1.5px solid rgba(255, 255, 255, 0.95)',
                textAlign: 'left'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={22} color="#059669" />
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 850, color: '#0f172a' }}>
                    100% Legal Public Web Indexing
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLegalModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.55, margin: '0 0 14px' }}>
                Scraper.co.in operates strictly under international open-web access laws (including hiQ Labs v. LinkedIn precedent)
                and index only publicly accessible business directories, maps, and corporate registries.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, color: '#334155' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                  <span><strong>Zero Bot Violations:</strong> Crawls natively via local extension without forged credentials.</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                  <span><strong>Zero Personal Data Storage:</strong> No private consumer databases or personal PII stored.</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                  <span><strong>Carrier Verified:</strong> Numbers validated for WhatsApp Business and corporate commercial dialing.</span>
                </div>
              </div>

              <div style={{ marginTop: 20, textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => setShowLegalModal(false)}
                  style={{
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 18px',
                    fontWeight: 800,
                    fontSize: 12.5,
                    cursor: 'pointer'
                  }}
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
