import React from 'react';

const TONE_MAP = {
  gold: { bg: '#fffbeb', color: '#92400e', border: 'rgba(217, 119, 6, 0.34)' },
  sapphire: { bg: '#f0f9ff', color: '#0369a1', border: 'rgba(2, 132, 199, 0.28)' },
  emerald: { bg: '#ecfdf5', color: '#047857', border: 'rgba(5, 150, 105, 0.28)' },
  rose: { bg: '#fff1f2', color: '#be123c', border: 'rgba(225, 29, 72, 0.28)' },
  neutral: { bg: '#f8fafc', color: '#334155', border: 'rgba(15, 23, 42, 0.12)' }
};

export function IntentPill({ icon: Icon, children, tone = 'gold', onClick, active = true }) {
  const t = TONE_MAP[tone] || TONE_MAP.gold;
  const Comp = onClick ? 'button' : 'span';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 700,
        background: active ? t.bg : '#ffffff',
        color: active ? t.color : '#64748b',
        border: `1px solid ${active ? t.border : 'rgba(15, 23, 42, 0.1)'}`,
        cursor: onClick ? 'pointer' : 'default',
        opacity: active ? 1 : 0.72,
        whiteSpace: 'nowrap',
        transition: 'all 120ms cubic-bezier(0.22, 1, 0.36, 1)'
      }}
    >
      {Icon && <Icon size={11} />}
      <span>{children}</span>
    </Comp>
  );
}

export function LiveBadge({ status = 'live', label }) {
  const isLive = status === 'live' || status === 'open';
  const isConnecting = status === 'connecting';
  const dot = isLive ? '#10b981' : isConnecting ? '#f59e0b' : '#e11d48';
  const bg = isLive ? '#ecfdf5' : isConnecting ? '#fffbeb' : '#fff1f2';
  const fg = isLive ? '#047857' : isConnecting ? '#92400e' : '#be123c';
  const text = label || (isLive ? 'LIVE' : isConnecting ? 'CONNECTING' : 'OFFLINE');

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.04em',
        background: bg,
        color: fg,
        border: `1px solid ${dot}40`
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: dot,
          boxShadow: isLive ? '0 0 0 3px rgba(16, 185, 129, 0.22)' : 'none'
        }}
      />
      <span>{text}</span>
    </span>
  );
}

export function Skeleton({ width = '100%', height = 18, radius = 8, className = '' }) {
  return (
    <span
      className={`lp-shimmer ${className}`}
      aria-hidden="true"
      style={{ display: 'inline-block', width, height, borderRadius: radius }}
    />
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{ padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {Icon && (
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: '#fffbeb',
            border: '1px solid rgba(217, 119, 6, 0.28)',
            color: '#b45309',
            display: 'grid',
            placeItems: 'center'
          }}
        >
          <Icon size={20} />
        </div>
      )}
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--lp-ink)' }}>{title}</div>
      {description && (
        <div style={{ fontSize: 12.5, color: 'var(--lp-ink-3)', maxWidth: 380, lineHeight: 1.5 }}>{description}</div>
      )}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}
