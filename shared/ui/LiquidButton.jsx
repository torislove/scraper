import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

const VARIANTS = {
  gold: {
    bg: 'linear-gradient(135deg, #b45309 0%, #d97706 36%, #f59e0b 74%, #fbbf24 100%)',
    lip: '#78350f',
    glow: 'rgba(217, 119, 6, 0.36)',
    color: '#ffffff',
    border: '1.5px solid rgba(254, 243, 199, 0.82)'
  },
  'glass-gold': {
    bg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 251, 235, 0.92) 100%)',
    lip: '#d97706',
    glow: 'rgba(245, 158, 11, 0.2)',
    color: '#78350f',
    border: '1.5px solid rgba(217, 119, 6, 0.42)'
  },
  sapphire: {
    bg: 'linear-gradient(135deg, #0369a1 0%, #0284c7 60%, #0ea5e9 100%)',
    lip: '#075985',
    glow: 'rgba(2, 132, 199, 0.3)',
    color: '#ffffff',
    border: '1.5px solid rgba(224, 242, 254, 0.72)'
  },
  rose: {
    bg: 'linear-gradient(135deg, #be123c 0%, #e11d48 65%, #f43f5e 100%)',
    lip: '#881337',
    glow: 'rgba(225, 29, 72, 0.34)',
    color: '#ffffff',
    border: '1.5px solid rgba(255, 228, 230, 0.72)'
  },
  obsidian: {
    bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 70%, #334155 100%)',
    lip: '#020617',
    glow: 'rgba(15, 23, 42, 0.26)',
    color: '#fef3c7',
    border: '1.5px solid rgba(251, 191, 36, 0.48)'
  }
};

const SIZES = {
  sm: { height: 36, padding: '0 14px', fontSize: 12, lip: 3, radius: 10 },
  md: { height: 40, padding: '0 18px', fontSize: 13, lip: 3, radius: 12 },
  lg: { height: 48, padding: '0 24px', fontSize: 14, lip: 4, radius: 14 },
  xl: { height: 54, padding: '0 28px', fontSize: 15, lip: 5, radius: 16 }
};

export default function LiquidButton({
  children,
  onClick,
  type = 'button',
  variant = 'gold',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  pulse = false,
  disabled = false,
  badge = null,
  className = '',
  style = {},
  title
}) {
  const ref = useRef(null);
  const [gleam, setGleam] = useState(null);
  const v = VARIANTS[variant] || VARIANTS.gold;
  const s = SIZES[size] || SIZES.md;

  const onMove = (e) => {
    if (!ref.current || disabled) return;
    const r = ref.current.getBoundingClientRect();
    setGleam({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      title={title}
      onClick={disabled ? undefined : onClick}
      onMouseMove={onMove}
      onMouseLeave={() => setGleam(null)}
      disabled={disabled}
      whileHover={disabled ? {} : { y: -2 }}
      whileTap={disabled ? {} : { y: s.lip - 1, scale: 0.985 }}
      transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
      className={`lp-focus ${pulse ? 'has-pulse' : ''} ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: s.height,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 800,
        fontFamily: 'var(--lp-font-sans)',
        borderRadius: s.radius,
        background: v.bg,
        color: v.color,
        border: v.border,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        overflow: 'hidden',
        userSelect: 'none',
        boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.7), 0 ${s.lip}px 0 ${v.lip}, 0 ${s.lip + 6}px 18px ${v.glow}`,
        ...style
      }}
    >
      {gleam && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: gleam.x - 44,
            top: gleam.y - 44,
            width: 88,
            height: 88,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.42) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />
      )}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 1,
          left: '8%',
          right: '8%',
          height: '42%',
          borderRadius: `${s.radius}px ${s.radius}px 32px 32px`,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.38) 0%, transparent 100%)',
          pointerEvents: 'none'
        }}
      />
      {Icon && <Icon size={s.fontSize + 2} style={{ position: 'relative', zIndex: 1, flexShrink: 0 }} />}
      <span style={{ position: 'relative', zIndex: 1, whiteSpace: 'nowrap' }}>{children}</span>
      {badge != null && (
        <span
          className="lp-tabular"
          style={{
            position: 'relative',
            zIndex: 1,
            fontSize: 10,
            fontWeight: 800,
            padding: '1px 6px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.26)',
            border: '1px solid rgba(255,255,255,0.42)'
          }}
        >
          {badge}
        </span>
      )}
      {IconRight && <IconRight size={s.fontSize + 1} style={{ position: 'relative', zIndex: 1, flexShrink: 0 }} />}
    </motion.button>
  );
}
