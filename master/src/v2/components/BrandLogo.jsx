import React from 'react';

/**
 * Unified Scraper.co.in Brand Icon Mark
 * High-velocity geometric S monogram with royal violet-to-cyan mesh gradient,
 * forward velocity chevron, and emerald live verification jewel.
 */
export function BrandIcon({ size = 32, className = '', idPrefix = 'sc' }) {
  const s = typeof size === 'number' ? size : size === 'sm' ? 24 : size === 'lg' ? 42 : 32;
  const gradId = `${idPrefix}-bg-${s}`;
  const glowId = `${idPrefix}-glow-${s}`;
  const chevId = `${idPrefix}-chev-${s}`;
  const shadId = `${idPrefix}-shad-${s}`;

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
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="48%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        <linearGradient id={glowId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.06" />
        </linearGradient>

        <linearGradient id={chevId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#00F0FF" />
        </linearGradient>

        <filter id={shadId} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#4F46E5" floodOpacity="0.35"/>
        </filter>
      </defs>

      {/* Squircle Base with 3D Border Glow */}
      <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#${gradId})`} filter={`url(#${shadId})`}/>
      <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="15.25" fill="none" stroke={`url(#${glowId})`} strokeWidth="1.5" />

      {/* High-Velocity "S" Monogram Vector */}
      <path
        d="M44 20 C44 15 39 13 32 13 C22 13 17 18 17 24 C17 32 35 30 35 37 C35 42 30 44 23 44 C17 44 13 40.5 13 37"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Forward Velocity Chevron Spark */}
      <path
        d="M37 36 L44 43.5 L37 51"
        fill="none"
        stroke={`url(#${chevId})`}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Live Verification Jewel */}
      <circle cx="46" cy="17" r="4" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Unified Scraper.co.in Brand Logo Component
 * Works seamlessly across Light surfaces (Landing page) and Dark surfaces (Cockpit/Master).
 */
export default function BrandLogo({
  size = 32,
  variant = 'full', // 'full' | 'icon' | 'compact'
  theme = 'auto',   // 'auto' | 'light' | 'dark'
  showTagline = false,
  tagline = 'Direct Decision-Maker Intelligence',
  className = '',
  style = {},
  onClick
}) {
  const isIconOnly = variant === 'icon';
  const isCompact = variant === 'compact';

  const iconSize = typeof size === 'number' ? size : size === 'sm' ? 24 : size === 'lg' ? 40 : 32;
  const fontSize = isCompact ? Math.max(14, iconSize * 0.55) : Math.max(16, iconSize * 0.62);

  const isDark = theme === 'dark';

  return (
    <div
      className={`brand-logo-unified ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isCompact ? 9 : 12,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        textDecoration: 'none',
        ...style
      }}
      aria-label="Scraper.co.in"
    >
      <BrandIcon size={iconSize} />

      {!isIconOnly && (
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: 800,
              fontSize: `${fontSize}px`,
              letterSpacing: '-0.03em',
              color: isDark ? '#FFFFFF' : '#0F172A',
              display: 'inline-flex',
              alignItems: 'baseline'
            }}
          >
            <span>Scraper</span>
            <span
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #0284C7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800,
                letterSpacing: '-0.01em',
                marginLeft: '1px'
              }}
            >
              .co.in
            </span>
          </span>

          {showTagline && (
            <span
              style={{
                fontSize: Math.max(8, fontSize * 0.45),
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: isDark ? '#94A3B8' : '#64748B',
                marginTop: 2
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

