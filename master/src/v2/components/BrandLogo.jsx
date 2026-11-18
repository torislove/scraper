import React, { useId } from 'react';

/**
 * Unified Scraper.co.in Brand Icon Mark (Fortune-500 Grade 3D Emerald Enamel Emblem)
 * High-velocity geometric 'S' monogram in optic white, forward cyan velocity spark,
 * and live amber/emerald verification jewel set on a beveled 3D emerald porcelain squircle.
 */
export function BrandIcon({ size = 34, className = '', idPrefix = 'sc' }) {
  const reactId = useId().replace(/:/g, '');
  const s = typeof size === 'number' ? size : size === 'sm' ? 24 : size === 'lg' ? 42 : 34;
  const emGradId = `${idPrefix}-emgrad-${reactId}-${s}`;
  const emHlId = `${idPrefix}-emhl-${reactId}-${s}`;
  const emShadowId = `${idPrefix}-emsh-${reactId}-${s}`;

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      aria-hidden="true"
    >
      <defs>
        {/* Luxury 3D Emerald Gradient */}
        <linearGradient id={emGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="60%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        {/* 3D Glass Surface Highlight */}
        <linearGradient id={emHlId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Soft Tactile Elevation Shadow */}
        <filter id={emShadowId} x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#059669" floodOpacity="0.32" />
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#047857" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* 3D Beveled Emerald Squircle Base */}
      <rect x="3" y="3" width="58" height="58" rx="16" fill={`url(#${emGradId})`} filter={`url(#${emShadowId})`} />
      <rect x="3" y="3" width="58" height="58" rx="16" fill="none" stroke="#047857" strokeWidth="1.5" />
      <rect x="4.5" y="4.5" width="55" height="55" rx="14.5" fill="none" stroke={`url(#${emHlId})`} strokeWidth="1.5" />

      {/* High-Velocity "S" Monogram in Optic White */}
      <path
        d="M43 20 C43 14.8 38.5 13 32 13 C21.5 13 16.5 18 16.5 24.5 C16.5 33 35.5 30.5 35.5 37.5 C35.5 43.5 30 46.5 23 46.5 C16.5 46.5 12.5 42.5 12.5 37.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Forward Velocity Cyan Vector Spark */}
      <path
        d="M37 36 L44 43.5 L37 51"
        fill="none"
        stroke="#67E8F9"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Live Radar Beacon Jewel with Concentric Optical Highlight */}
      <circle cx="45" cy="18" r="4.8" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="45" cy="18" r="2.2" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * Unified Scraper.co.in Brand Logo Component (White Luxury Executive Aesthetic)
 */
export default function BrandLogo({
  size = 34,
  variant = 'full', // 'full' | 'icon' | 'compact'
  theme = 'light',  // 'light' (default) | 'dark'
  showTagline = false,
  tagline = 'Autonomous Lead Radar',
  className = '',
  style = {},
  onClick
}) {
  const isIconOnly = variant === 'icon';
  const isCompact = variant === 'compact';
  const iconSize = typeof size === 'number' ? size : size === 'sm' ? 24 : size === 'lg' ? 42 : 34;
  const isDark = theme === 'dark';

  return (
    <div
      className={`brand-logo-unified ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isCompact ? 10 : 12,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        textDecoration: 'none',
        ...style
      }}
      aria-label="Scraper.co.in"
    >
      <BrandIcon size={iconSize} />

      {!isIconOnly && (
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, textAlign: 'left' }}>
          <span
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", Roboto, sans-serif',
              fontWeight: 850,
              fontSize: isCompact ? '16px' : '18.5px',
              letterSpacing: '-0.03em',
              color: isDark ? '#FFFFFF' : '#0F172A',
              display: 'inline-flex',
              alignItems: 'baseline'
            }}
          >
            <span>Scraper</span>
            <span
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #2563EB 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 850,
                letterSpacing: '-0.015em',
                marginLeft: '1.5px'
              }}
            >
              .co.in
            </span>
          </span>

          {showTagline && (
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 750,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: isDark ? '#94A3B8' : '#64748B',
                marginTop: '2.5px'
              }}
            >
              {tagline}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
