import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, MapPin } from 'lucide-react';

const DEFAULT_ACTIVITIES = [
  { city: 'Tenali Mandals (AP)', count: 384, category: 'Turmeric Wholesalers', time: '12m ago' },
  { city: 'Guntur (AP)', count: 215, category: 'Wedding Photographers', time: '18m ago' },
  { city: 'Dallas (TX, US)', count: 180, category: 'HVAC Contractors', time: '24m ago' },
  { city: 'Birmingham (UK)', count: 142, category: 'Accounting Firms', time: '31m ago' },
  { city: 'Dubai (UAE)', count: 290, category: 'Commercial Brokers', time: '40m ago' }
];

export default function SocialProofSlideIn() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [config, setConfig] = useState({
    enabled: true,
    initialDelayMs: 6000,
    displayDurationMs: 7000,
    cycleIntervalMs: 35000,
    activities: DEFAULT_ACTIVITIES
  });

  useEffect(() => {
    let alive = true;
    fetch('/api/popups')
      .then(res => res.json())
      .then(data => {
        if (!alive || !data?.socialProofSlideIn) return;
        setConfig(prev => ({
          ...prev,
          ...data.socialProofSlideIn,
          activities: Array.isArray(data.socialProofSlideIn.activities) && data.socialProofSlideIn.activities.length > 0
            ? data.socialProofSlideIn.activities
            : DEFAULT_ACTIVITIES
        }));
      })
      .catch(() => { });
    return () => { alive = false; };
  }, []);

  const activities = config.activities || DEFAULT_ACTIVITIES;

  useEffect(() => {
    if (dismissed || !config.enabled || activities.length === 0) return;

    const initialTimer = setTimeout(() => {
      setVisible(true);
    }, config.initialDelayMs || 6000);

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % activities.length);
        setVisible(true);
      }, (config.cycleIntervalMs || 35000) - (config.displayDurationMs || 7000));
    }, config.cycleIntervalMs || 35000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [dismissed, config.enabled, config.cycleIntervalMs, config.displayDurationMs, activities.length]);

  useEffect(() => {
    if (!visible) return;
    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, config.displayDurationMs || 7000);
    return () => clearTimeout(hideTimer);
  }, [visible, index, config.displayDurationMs]);

  if (!config.enabled || dismissed || activities.length === 0) return null;

  const current = activities[index] || activities[0];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: 100, opacity: 0, scale: 0.95 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 100, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            background: config.bgColor || undefined,
            color: config.textColor || undefined,
            borderColor: config.buttonColor ? `${config.buttonColor}40` : undefined
          }}
          className="fixed bottom-6 right-6 z-40 max-w-sm bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 rounded-xl p-3 shadow-xl shadow-slate-950/60 text-white flex items-start gap-2.5"
        >
          <div
            style={{
              background: config.badgeColor || undefined,
              color: config.buttonColor || undefined,
              borderColor: config.buttonColor ? `${config.buttonColor}40` : undefined
            }}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mt-0.5"
          >
            <Zap size={16} />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div
              style={{ color: config.buttonColor || undefined }}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 uppercase tracking-wide"
            >
              <span>Live Extraction</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400 font-normal">{current.time}</span>
            </div>
            <div style={{ color: config.textColor || undefined }} className="text-xs text-slate-200 mt-0.5">
              Verified <strong className="text-white font-semibold">{current.count} leads</strong> for{' '}
              <span style={{ color: config.buttonColor || undefined }} className="text-emerald-300 font-medium">
                {current.category}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
              <MapPin size={10} style={{ color: config.buttonColor || undefined }} className="text-emerald-400" />
              <span>{current.city}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss activity"
            className="flex-shrink-0 text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={12} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
