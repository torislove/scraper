import React, { useId } from 'react';
import ThreeGoldenPinLogo from './three/ThreeGoldenPinLogo';

/**
 * Scraper.co.in brand mark: a map pin with a bold "S".
 *
 * Two shapes only — the pin says "location", the S says the brand — so it stays
 * legible at 16 px in a browser tab, which a busier mark cannot do.
 *
 * `public/favicon.svg` is the same artwork. Change both together.
 */
export function BrandIcon({ size = 34, className = '', idPrefix = 'sc' }) {
  const reactId = useId().replace(/:/g, '');
  const s = typeof size === 'number' ? size : size === 'sm' ? 24 : size === 'lg' ? 42 : 34;

  const bodyId = `${idPrefix}-pinbody-${reactId}`;
  const sheenId = `${idPrefix}-pinsheen-${reactId}`;
  const vignetteId = `${idPrefix}-pinvig-${reactId}`;
  const shadowId = `${idPrefix}-pinshadow-${reactId}`;
  const clipId = `${idPrefix}-pinclip-${reactId}`;

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
        {/* Pin body: 24k polished gold gradient lit from upper left */}
        <linearGradient id={bodyId} x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="25%" stopColor="#F59E0B" />
          <stop offset="65%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>

        {/* Specular sheen */}
        <linearGradient id={sheenId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Depth under the letter */}
        <radialGradient id={vignetteId} cx="62%" cy="40%" r="70%">
          <stop offset="58%" stopColor="#78350F" stopOpacity="0" />
          <stop offset="100%" stopColor="#78350F" stopOpacity="0.32" />
        </radialGradient>

        <filter id={shadowId} x="-28%" y="-22%" width="156%" height="156%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2.8" stdDeviation="3.2" floodColor="#78350F" floodOpacity="0.45" />
          <feDropShadow dx="0" dy="1" stdDeviation="1.1" floodColor="#451A03" floodOpacity="0.35" />
        </filter>

        <clipPath id={clipId}>
          <path d="M32 4.4C19.5 4.4 9.3 14.6 9.3 27.1C9.3 39 20.3 49.4 32 60.6C43.7 49.4 54.7 39 54.7 27.1C54.7 14.6 44.5 4.4 32 4.4Z" />
        </clipPath>
      </defs>

      {/* Map pin */}
      <path
        d="M32 4.4C19.5 4.4 9.3 14.6 9.3 27.1C9.3 39 20.3 49.4 32 60.6C43.7 49.4 54.7 39 54.7 27.1C54.7 14.6 44.5 4.4 32 4.4Z"
        fill={`url(#${bodyId})`}
        stroke="#78350F"
        strokeWidth="1.3"
        filter={`url(#${shadowId})`}
      />

      <g clipPath={`url(#${clipId})`}>
        {/* Curved sheen across the top-left shoulder */}
        <ellipse cx="22.5" cy="12.5" rx="14" ry="8" fill={`url(#${sheenId})`} opacity="0.75" />
        {/* Golden rim light on the upper edge */}
        <path
          d="M12.4 27.5C12.6 19.4 17.6 12.8 25.4 10.2"
          fill="none"
          stroke="#FEF3C7"
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity="0.65"
        />
        {/* Depth toward the lower right */}
        <rect x="0" y="0" width="64" height="64" fill={`url(#${vignetteId})`} />
      </g>

      {/* Bold S */}
      <path
        d="M39.8 19.4C38.4 16.8 35.6 15.6 32 15.6C27.1 15.6 23.8 18 23.8 21.4C23.8 25 27 26.4 32 27.4C37 28.4 40.4 29.9 40.4 33.4C40.4 37 36.9 39.4 32 39.4C28.1 39.4 25.1 38 23.6 35.4"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Brand logo: mark + wordmark.
 *
 * The wordmark is set tight and heavy, with ".co.in" carrying the emerald →
 * teal accent. It is the only place the product name is typeset, so both
 * command centers and the landing inherit the same lockup.
 */
export default function BrandLogo({
  size = 34,
  variant = 'full', // 'full' | 'icon' | 'compact'
  theme = 'light',  // 'light' (default) | 'dark'
  showTagline = false,
  tagline = 'Autonomous Lead Radar',
  use3d = true,
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
      {use3d ? (
        <ThreeGoldenPinLogo size={iconSize + 2} />
      ) : (
        <BrandIcon size={iconSize} />
      )}

      {!isIconOnly && (
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, textAlign: 'left' }}>
          <span
            style={{
              fontFamily: '"Inter Tight", "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
              fontWeight: 800,
              fontSize: isCompact ? '16.5px' : '19px',
              letterSpacing: '-0.038em',
              color: isDark ? '#FFFFFF' : '#0B1220',
              display: 'inline-flex',
              alignItems: 'baseline',
              whiteSpace: 'nowrap'
            }}
          >
            <span>Scraper</span>
            <span
              style={{
                background: 'linear-gradient(125deg, #92400E 0%, #D97706 42%, #F59E0B 76%, #FBBF24 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800,
                letterSpacing: '-0.02em',
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
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: isDark ? '#94A3B8' : '#6B7A8F',
                marginTop: '3px'
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
