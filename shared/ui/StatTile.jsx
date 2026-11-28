import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const TONES = {
  gold: {
    bg: 'linear-gradient(145deg, #ffffff 0%, #fffbeb 100%)',
    border: 'rgba(217, 119, 6, 0.28)',
    iconBg: '#fef3c7',
    iconColor: '#b45309'
  },
  emerald: {
    bg: 'linear-gradient(145deg, #ffffff 0%, #ecfdf5 100%)',
    border: 'rgba(5, 150, 105, 0.24)',
    iconBg: '#d1fae5',
    iconColor: '#047857'
  },
  sapphire: {
    bg: 'linear-gradient(145deg, #ffffff 0%, #f0f9ff 100%)',
    border: 'rgba(2, 132, 199, 0.24)',
    iconBg: '#e0f2fe',
    iconColor: '#0369a1'
  },
  rose: {
    bg: 'linear-gradient(145deg, #ffffff 0%, #fff1f2 100%)',
    border: 'rgba(225, 29, 72, 0.24)',
    iconBg: '#ffe4e6',
    iconColor: '#be123c'
  }
};

function useAnimatedNumber(target) {
  const isNumeric = typeof target === 'number' && Number.isFinite(target);
  const [display, setDisplay] = useState(isNumeric ? target : 0);
  const prevRef = useRef(isNumeric ? target : 0);

  useEffect(() => {
    if (!isNumeric) return undefined;
    const start = prevRef.current;
    const end = target;
    if (start === end) {
      setDisplay(end);
      return undefined;
    }
    const startTime = performance.now();
    const duration = 260;
    let rafId;
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (t < 1) rafId = requestAnimationFrame(step);
      else prevRef.current = end;
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, isNumeric]);

  return isNumeric ? display.toLocaleString() : String(target ?? '');
}

export default function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'gold',
  pulse = false
}) {
  const t = TONES[tone] || TONES.gold;
  const formatted = useAnimatedNumber(value);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 'var(--lp-r-md)',
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: 'var(--lp-shadow-1)'
      }}
    >
      {Icon && (
        <span
          style={{
            position: 'relative',
            width: 38,
            height: 38,
            borderRadius: 10,
            background: t.iconBg,
            color: t.iconColor,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0
          }}
        >
          <Icon size={18} />
          {pulse && (
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.24)'
              }}
            />
          )}
        </span>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lp-ink-4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </div>
        <div className="lp-tabular" style={{ fontSize: 20, fontWeight: 800, color: 'var(--lp-ink)', lineHeight: 1.2 }}>
          {formatted}
        </div>
        {sub && (
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--lp-ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sub}
          </div>
        )}
      </div>
    </motion.div>
  );
}
