import React from 'react';

/**
 * Unified Scraper.co.in Brand Icon Mark
 * High-velocity geometric S monogram with royal violet-to-cyan mesh gradient,
 * forward velocity chevron spark, and emerald live verification jewel.
 */
export function BrandIcon({ size = 34, className = '', idPrefix = 'sc' }) {
  const s = typeof size === 'number' ? size : size === 'sm' ? 24 : size === 'lg' ? 42 : 34;
  const gradId = `${idPrefix}-bg-${s}`;
  const sparkId = `${idPrefix}-spk-${s}`;

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
          <stop offset="50%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        <linearGradient id={sparkId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#00F0FF" />
        </linearGradient>
      </defs>

      {/* Squircle Base with Highlight Rim */}
      <rect x="2" y="2" width="60" height="60" rx="15" fill={`url(#${gradId})`} />
      <rect x="3" y="3" width="58" height="58" rx="14" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1.5" />

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
        stroke={`url(#${sparkId})`}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Emerald Live Verification Jewel */}
      <circle cx="46" cy="17" r="4.2" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.8" />
    </svg>
  );
}

/**
 * Unified Scraper.co.in Brand Logo Component
 * Works seamlessly across Light surfaces (Landing page) and Dark surfaces (Cockpit/Master).
 */
export default function BrandLogo({
  size = 34,
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
  const iconSize = typeof size === 'number' ? size : size === 'sm' ? 24 : size === 'lg' ? 42 : 34;
  const isDark = theme === 'dark';

  return (
    <div
      className={`brand-logo-unified ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isCompact ? 9 : 11,
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
              fontWeight: 850,
              fontSize: isCompact ? '16px' : '18px',
              letterSpacing: '-0.025em',
              color: isDark ? '#FFFFFF' : '#0F172A',
              display: 'inline-flex',
              alignItems: 'baseline'
            }}
          >
            <span>Scraper</span>
            <span
              style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #0284C7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 850,
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
                fontSize: '9px',
                fontWeight: 750,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: isDark ? '#94A3B8' : '#64748B',
                marginTop: '2px'
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
