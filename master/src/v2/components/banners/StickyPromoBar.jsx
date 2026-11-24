import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, X } from 'lucide-react';

const STORAGE_KEY = 'scraper_promo_banner_dismissed';
const DEFAULT_COOLDOWN_DAYS = 7;

export default function StickyPromoBar({ onActionClick }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({
    enabled: true,
    badgeText: 'Live Update',
    text: 'Direct WhatsApp & Mobile Extraction now live across 11 sovereign countries.',
    highlightText: 'WhatsApp & Mobile Extraction',
    actionText: 'Instant Demo',
    actionUrl: '/login',
    cooldownDays: 7
  });

  useEffect(() => {
    let alive = true;

    // Fetch dynamic config from backend
    fetch('/api/popups')
      .then(res => res.json())
      .then(data => {
        if (!alive || !data?.stickyPromoBar) return;
        setConfig(prev => ({ ...prev, ...data.stickyPromoBar }));
      })
      .catch(() => {});

    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!config.enabled) {
      setVisible(false);
      return;
    }

    try {
      const dismissedAt = localStorage.getItem(STORAGE_KEY);
      if (dismissedAt) {
        const diffMs = Date.now() - Number(dismissedAt);
        const cooldownMs = (config.cooldownDays || DEFAULT_COOLDOWN_DAYS) * 24 * 60 * 60 * 1000;
        if (diffMs < cooldownMs) return;
      }
    } catch (e) {}

    const timer = setTimeout(() => {
      setVisible(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [config.enabled, config.cooldownDays]);

  const handleDismiss = (e) => {
    e.stopPropagation();
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch (err) {}
  };

  if (!config.enabled) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{
            background: config.bgColor || undefined,
            color: config.textColor || undefined,
            borderColor: config.buttonColor ? `${config.buttonColor}40` : undefined
          }}
          className="fixed top-0 left-0 right-0 z-50 h-11 bg-gradient-to-r from-emerald-950/90 via-slate-900/95 to-emerald-950/90 backdrop-blur-md border-b border-emerald-500/30 text-white text-xs sm:text-sm font-medium flex items-center justify-between px-3 sm:px-6 shadow-lg shadow-emerald-950/20"
        >
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <span className="flex h-2 w-2 relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span
                style={{ background: config.buttonColor || undefined }}
                className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"
              />
            </span>
            <span
              style={{
                background: config.badgeColor || undefined,
                color: config.buttonColor || undefined,
                borderColor: config.buttonColor ? `${config.buttonColor}40` : undefined
              }}
              className="hidden sm:inline-flex items-center gap-1 font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded text-[11px] tracking-wide uppercase"
            >
              <Sparkles size={11} /> {config.badgeText || 'Live Update'}
            </span>
            <span style={{ color: config.textColor || undefined }} className="truncate text-slate-200">
              {config.text || 'Direct WhatsApp & Mobile Extraction now live across 11 sovereign countries.'}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
            <button
              type="button"
              onClick={onActionClick}
              style={{
                background: config.buttonColor || undefined,
                color: config.buttonColor ? '#020617' : undefined
              }}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm cursor-pointer"
            >
              <span>{config.actionText || 'Instant Demo'}</span>
              <ArrowRight size={12} />
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss announcement"
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
