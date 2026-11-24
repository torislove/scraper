import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';

export default function CustomPopupsRenderer() {
  const [popups, setPopups] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try {
      const stored = sessionStorage.getItem('dismissed_custom_popups');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    let alive = true;
    fetch('/api/popups')
      .then(res => res.json())
      .then(data => {
        if (!alive || !Array.isArray(data?.customPopups)) return;
        setPopups(data.customPopups.filter(p => p.enabled !== false));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const handleDismiss = (id) => {
    setDismissed(prev => {
      const next = [...prev, id];
      try {
        sessionStorage.setItem('dismissed_custom_popups', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const activePopups = popups.filter(p => !dismissed.includes(p.id));
  if (activePopups.length === 0) return null;

  return (
    <>
      {activePopups.map((popup) => {
        const { id, format, title, message, badgeText, ctaLabel, ctaUrl, bgColor, textColor, buttonColor, badgeColor } = popup;

        // 1. Floating Action Widget (Bottom-Right Bubble)
        if (format === 'widget') {
          return (
            <AnimatePresence key={id}>
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 30 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'fixed',
                  bottom: 74,
                  right: 22,
                  zIndex: 9999,
                  maxWidth: 320,
                  width: 'calc(100vw - 44px)',
                  background: bgColor || 'rgba(255, 255, 255, 0.94)',
                  color: textColor || '#0f172a',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 18,
                  border: '1.5px solid rgba(226, 232, 240, 0.95)',
                  boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.22)',
                  padding: '14px 16px',
                  fontFamily: 'Inter, -apple-system, sans-serif'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 10, background: badgeColor || '#ecfdf5', color: buttonColor || '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={16} />
                    </div>
                    {badgeText && (
                      <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: badgeColor || '#dcfce7', color: buttonColor || '#15803d', letterSpacing: '0.04em' }}>
                        {badgeText}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDismiss(id)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                    aria-label="Dismiss widget"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div style={{ fontSize: 13, fontWeight: 800, color: textColor || '#0f172a', marginBottom: 4, lineHeight: 1.3 }}>
                  {title}
                </div>
                {message && (
                  <div style={{ fontSize: 11.5, color: textColor || '#475569', opacity: 0.85, marginBottom: 10, lineHeight: 1.4 }}>
                    {message}
                  </div>
                )}

                {ctaLabel && (
                  <a
                    href={ctaUrl || '#'}
                    target={ctaUrl?.startsWith('http') ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      width: '100%',
                      padding: '8px 14px',
                      borderRadius: 10,
                      background: buttonColor || 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      color: '#ffffff',
                      textDecoration: 'none',
                      fontSize: 12,
                      fontWeight: 800,
                      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                    }}
                  >
                    <span>{ctaLabel}</span>
                    <ArrowRight size={13} />
                  </a>
                )}
              </motion.div>
            </AnimatePresence>
          );
        }

        // 2. Fullscreen Welcome Mat Overlay
        if (format === 'welcomemat') {
          return (
            <AnimatePresence key={id}>
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 99999,
                  background: 'rgba(15, 23, 42, 0.72)',
                  backdropFilter: 'blur(12px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 20
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{
                    maxWidth: 500,
                    width: '100%',
                    background: '#ffffff',
                    borderRadius: 24,
                    padding: 30,
                    textAlign: 'center',
                    boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
                    position: 'relative'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleDismiss(id)}
                    style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    aria-label="Close welcome mat"
                  >
                    <X size={18} />
                  </button>

                  {badgeText && (
                    <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, background: '#fef3c7', color: '#b45309', fontSize: 11, fontWeight: 800, marginBottom: 12 }}>
                      {badgeText}
                    </div>
                  )}

                  <h2 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 22, fontWeight: 850, color: '#0f172a', margin: '0 0 10px', lineHeight: 1.3 }}>
                    {title}
                  </h2>
                  {message && (
                    <p style={{ fontSize: 13.5, color: '#475569', margin: '0 0 20px', lineHeight: 1.5 }}>
                      {message}
                    </p>
                  )}

                  {ctaLabel && (
                    <a
                      href={ctaUrl || '#'}
                      onClick={() => handleDismiss(id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '12px 28px',
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                        color: '#ffffff',
                        fontSize: 14,
                        fontWeight: 800,
                        textDecoration: 'none',
                        boxShadow: '0 8px 20px rgba(5, 150, 105, 0.3)'
                      }}
                    >
                      <span>{ctaLabel}</span>
                      <ArrowRight size={15} />
                    </a>
                  )}
                </motion.div>
              </div>
            </AnimatePresence>
          );
        }

        // 3. Center Modal Lightbox
        if (format === 'modal') {
          return (
            <AnimatePresence key={id}>
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 99998,
                  background: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 20
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  style={{
                    maxWidth: 460,
                    width: '100%',
                    background: '#ffffff',
                    borderRadius: 20,
                    padding: '24px 26px',
                    boxShadow: '0 20px 50px -10px rgba(15, 23, 42, 0.25)',
                    position: 'relative'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleDismiss(id)}
                    style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                  {badgeText && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: '#e0f2fe', color: '#0369a1', textTransform: 'uppercase' }}>
                      {badgeText}
                    </span>
                  )}
                  <h3 style={{ fontSize: 18, fontWeight: 850, color: '#0f172a', margin: '10px 0 6px' }}>
                    {title}
                  </h3>
                  {message && (
                    <p style={{ fontSize: 13, color: '#475569', margin: '0 0 18px', lineHeight: 1.45 }}>
                      {message}
                    </p>
                  )}
                  {ctaLabel && (
                    <a
                      href={ctaUrl || '#'}
                      onClick={() => handleDismiss(id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        width: '100%',
                        padding: '10px 18px',
                        borderRadius: 10,
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: 13,
                        fontWeight: 800,
                        textDecoration: 'none'
                      }}
                    >
                      <span>{ctaLabel}</span>
                      <ArrowRight size={14} />
                    </a>
                  )}
                </motion.div>
              </div>
            </AnimatePresence>
          );
        }

        return null;
      })}
    </>
  );
}
