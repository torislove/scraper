import React, { useId } from 'react';

export default function BrandLogo({ size = 30 }) {
  const uid = useId().replace(/:/g, '');
  const bodyId = `admin-goldpin-${uid}`;
  const sheenId = `admin-pinsheen-${uid}`;
  const clipId = `admin-pinclip-${uid}`;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, userSelect: 'none' }}>
      <svg
        width={size + 4}
        height={size + 4}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, filter: 'drop-shadow(0 4px 10px rgba(217, 119, 6, 0.35))' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={bodyId} x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="28%" stopColor="#F59E0B" />
            <stop offset="68%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <linearGradient id={sheenId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          <clipPath id={clipId}>
            <path d="M32 4.4C19.5 4.4 9.3 14.6 9.3 27.1C9.3 39 20.3 49.4 32 60.6C43.7 49.4 54.7 39 54.7 27.1C54.7 14.6 44.5 4.4 32 4.4Z" />
          </clipPath>
        </defs>
        <path
          d="M32 4.4C19.5 4.4 9.3 14.6 9.3 27.1C9.3 39 20.3 49.4 32 60.6C43.7 49.4 54.7 39 54.7 27.1C54.7 14.6 44.5 4.4 32 4.4Z"
          fill={`url(#${bodyId})`}
          stroke="#78350F"
          strokeWidth="1.4"
        />
        <g clipPath={`url(#${clipId})`}>
          <ellipse cx="22.5" cy="12.5" rx="14" ry="8" fill={`url(#${sheenId})`} opacity="0.72" />
        </g>
        <path
          d="M39.8 19.4C38.4 16.8 35.6 15.6 32 15.6C27.1 15.6 23.8 18 23.8 21.4C23.8 25 27 26.4 32 27.4C37 28.4 40.4 29.9 40.4 33.4C40.4 37 36.9 39.4 32 39.4C28.1 39.4 25.1 38 23.6 35.4"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="5.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span
          style={{
            fontFamily: '"Space Grotesk", "Inter Tight", sans-serif',
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#0f172a'
          }}
        >
          Scraper
          <span
            style={{
              background: 'linear-gradient(125deg, #92400E 0%, #D97706 42%, #F59E0B 76%, #FBBF24 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginLeft: '1px'
            }}
          >
            .co.in
          </span>
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#92400e',
            marginTop: '2px'
          }}
        >
          Master Admin
        </span>
      </div>
    </div>
  );
}