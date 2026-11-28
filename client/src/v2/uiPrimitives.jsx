import React from 'react';

function cxLocal(...parts) {
  return parts.flat().filter(Boolean).join(' ');
}

export function SignalOrb({ size = 34, tone = '#7dd3fc', live = false, title, className, style }) {
  return (
    <span
      className={cxLocal('k3-orb', live && 'is-live', className)}
      style={{ '--k3-orb-size': `${size}px`, '--k3-orb-tone': tone, ...style }}
      role={title ? 'img' : undefined}
      aria-label={title}
      title={title}
    />
  );
}

export function Hint({ children, tone = 'cyan', icon = null, className }) {
  return (
    <span className={cxLocal('k3-hint', tone === 'brass' && 'k3-hint--brass', className)}>
      {icon || (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 10.5v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="7.4" r="1.1" fill="currentColor" />
        </svg>
      )}
      <span>{children}</span>
    </span>
  );
}

export function Tip({ children, className }) {
  return <Hint tone="brass" className={className}>{children}</Hint>;
}

export function OrbitalRadar({ size = 180, active = true, speed = 4, className }) {
  return (
    <div
      className={cxLocal('k3-orbital-radar', active && 'is-active', className)}
      style={{ width: size, height: size, '--k3-radar-speed': `${speed}s` }}
    >
      <div className="k3-radar-sweep" />
      <div className="k3-radar-ring r1" />
      <div className="k3-radar-ring r2" />
      <div className="k3-radar-ring r3" />
    </div>
  );
}
