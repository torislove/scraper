import React from 'react';

function Base3DIcon({ id, g1, g2, g3, glow, size = 40, children }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        filter: `drop-shadow(0 6px 12px ${glow})`
      }}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={g1} />
            <stop offset="55%" stopColor={g2} />
            <stop offset="100%" stopColor={g3} />
          </linearGradient>
          <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.72)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <rect x="3" y="4.5" width="34" height="33" rx="11" fill="rgba(15,23,42,0.18)" />
        <rect x="3" y="2" width="34" height="33" rx="11" fill={`url(#${id})`} />
        <rect x="4.5" y="3.2" width="31" height="14" rx="9" fill={`url(#${id}-shine)`} />
        {children}
      </svg>
    </span>
  );
}

export function Pin3DIcon({ size = 40 }) {
  return (
    <Base3DIcon id="s3d-pin" g1="#fbbf24" g2="#d97706" g3="#92400e" glow="rgba(217,119,6,0.34)" size={size}>
      <path d="M20 9.5a6.8 6.8 0 0 0-6.8 6.8c0 4.8 6.8 12.2 6.8 12.2s6.8-7.4 6.8-12.2A6.8 6.8 0 0 0 20 9.5Zm0 9.3a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" fill="#fff" />
    </Base3DIcon>
  );
}

export function PhoneShield3DIcon({ size = 40 }) {
  return (
    <Base3DIcon id="s3d-phone" g1="#34d399" g2="#059669" g3="#065f46" glow="rgba(5,150,105,0.34)" size={size}>
      <path d="M20 8.5 12 11.8v6c0 5.1 3.4 9.6 8 11 4.6-1.4 8-5.9 8-11v-6L20 8.5Zm-1.2 14.2-3.4-3.4 1.5-1.5 1.9 1.9 4.3-4.3 1.5 1.5-5.8 5.8Z" fill="#fff" />
    </Base3DIcon>
  );
}

export function Layers3DIcon({ size = 40 }) {
  return (
    <Base3DIcon id="s3d-layers" g1="#38bdf8" g2="#0284c7" g3="#075985" glow="rgba(2,132,199,0.34)" size={size}>
      <path d="m20 10-9 4.5 9 4.5 9-4.5L20 10Zm-9 8.2 9 4.5 9-4.5M11 22l9 4.5 9-4.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Base3DIcon>
  );
}

export function RocketVault3DIcon({ size = 40 }) {
  return (
    <Base3DIcon id="s3d-vault" g1="#fb7185" g2="#e11d48" g3="#9f1239" glow="rgba(225,29,72,0.32)" size={size}>
      <path d="M12.5 12.5a2 2 0 0 1 2-2h4.2l1.8 2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-12Zm4.5 7.5 3 3 3-3m-3-3.5v6.2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Base3DIcon>
  );
}

export function TerritoryGlobe3DIcon({ size = 40 }) {
  return (
    <Base3DIcon id="s3d-globe" g1="#f59e0b" g2="#b45309" g3="#1e293b" glow="rgba(180,83,9,0.34)" size={size}>
      <circle cx="20" cy="18.5" r="8.2" stroke="#fff" strokeWidth="1.9" fill="none" />
      <ellipse cx="20" cy="18.5" rx="3.8" ry="8.2" stroke="#fff" strokeWidth="1.6" fill="none" />
      <path d="M12 18.5h16M13.5 14.5h13M13.5 22.5h13" stroke="#fff" strokeWidth="1.4" fill="none" />
    </Base3DIcon>
  );
}

export function ExtensionBolt3DIcon({ size = 40 }) {
  return (
    <Base3DIcon id="s3d-bolt" g1="#2dd4bf" g2="#0d9488" g3="#115e59" glow="rgba(13,148,136,0.32)" size={size}>
      <path d="M21.5 9.5 13 20.5h6.2l-1.2 7 9-11h-6.2l.7-7Z" fill="#fff" />
    </Base3DIcon>
  );
}
