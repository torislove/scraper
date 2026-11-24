import React from 'react';

/**
 * EngineBrandLogo.jsx
 * ==============================================================================
 * Authentic, colourful, high-contrast vector brand logos for all 22 engines.
 * Specifically crafted for high-prestige investor fundraising showcases.
 * ==============================================================================
 */

export default function EngineBrandLogo({ engineId, size = 28 }) {
  const s = size;

  switch (engineId) {
    case 'gmaps':
      // Google Maps Pin (Official 4-Color Google Palette)
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <path d="M24 4C14.06 4 6 12.06 6 22c0 13.25 15.68 21.36 17.06 21.98.61.27 1.27.27 1.88 0C26.32 43.36 42 35.25 42 22 42 12.06 33.94 4 24 4z" fill="#4285F4"/>
          <path d="M24 4C14.06 4 6 12.06 6 22c0 4.3 1.54 8.24 4.12 11.31l13.88-16.14V4z" fill="#EA4335"/>
          <path d="M10.12 33.31C13.29 37.1 18.25 40.89 24 43.98v-9.52l-9.88-6.15-4 5z" fill="#FBBC04"/>
          <path d="M24 43.98c5.75-3.09 10.71-6.88 13.88-10.67l-4-5-9.88 6.15v9.52z" fill="#34A853"/>
          <circle cx="24" cy="20" r="7" fill="#ffffff"/>
        </svg>
      );

    case 'osm':
      // OpenStreetMap Magnifying Glass & Terrain Green
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#7EBC6F"/>
          <circle cx="21" cy="21" r="11" stroke="#ffffff" strokeWidth="4" fill="none"/>
          <path d="M29 29l10 10" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round"/>
          <path d="M15 22c2-4 7-4 11 0" stroke="#2F5233" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        </svg>
      );

    case 'dorking':
      // Google 4-Color 'G' Search Engine
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5"/>
          <path d="M43.6 24.3c0-1.6-.1-3.1-.4-4.5H24v8.5h11c-.5 2.6-2 4.8-4.1 6.3v5.2h6.7c3.9-3.6 6-8.9 6-15.5z" fill="#4285F4"/>
          <path d="M24 44c5.5 0 10.1-1.8 13.5-5l-6.7-5.2c-1.8 1.2-4.2 2-6.8 2-5.3 0-9.8-3.6-11.4-8.4H5.6v5.4C9 39.5 16 44 24 44z" fill="#34A853"/>
          <path d="M12.6 27.4c-.4-1.2-.6-2.6-.6-4s.2-2.8.6-4V14H5.6C4.1 17 3.3 20.4 3.3 24s.8 7 2.3 10l7-6.6z" fill="#FBBC05"/>
          <path d="M24 11.6c3 0 5.7 1 7.8 3l5.8-5.8C34.1 5.6 29.5 4 24 4 16 4 9 8.5 5.6 15.3l7 5.4c1.6-4.8 6.1-9.1 11.4-9.1z" fill="#EA4335"/>
        </svg>
      );

    case 'bing':
      // Microsoft Bing Teal / Cyan
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="linear-gradient(135deg, #008373, #00A4EF)"/>
          <path d="M14 8v32l6 3.5 12-7-1.5-4-8.5 3.5V14l9 4.5 3-5.5L14 8z" fill="#ffffff"/>
        </svg>
      );

    case 'justdial':
      // Justdial Orange & Royal Cobalt
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#F37023"/>
          <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="22" letterSpacing="-1">
            JD
          </text>
          <circle cx="37" cy="13" r="4" fill="#0076CE"/>
        </svg>
      );

    case 'indiamart':
      // IndiaMART Red, Green & Deep Navy
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#1E2D4A"/>
          <path d="M11 34V14l7 10 7-10v20" stroke="#00A651" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <circle cx="37" cy="18" r="5" fill="#D8232A"/>
          <path d="M37 24v10" stroke="#ffffff" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      );

    case 'tradeindia':
      // TradeIndia Scarlet Red & Royal Sapphire
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#E31E24"/>
          <path d="M12 16h24M24 16v18" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round"/>
          <circle cx="36" cy="34" r="4" fill="#0054A6"/>
        </svg>
      );

    case 'yellowpages':
      // YellowPages Gold & Charcoal Walking Fingers
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#FFCC00"/>
          <path d="M14 36c2-10 6-18 10-22m-4 22c3-8 9-14 14-16" stroke="#1A1A1A" strokeWidth="4" strokeLinecap="round"/>
          <circle cx="24" cy="13" r="3" fill="#1A1A1A"/>
        </svg>
      );

    case 'yelp':
      // Yelp Burst Red
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#D32323"/>
          <g fill="#ffffff">
            <path d="M22 10c0-2 4-2 4 0l-1 12h-2l-1-12z"/>
            <path d="M12 20c-2-1 0-4 2-3l11 6-1 2-12-5z"/>
            <path d="M14 32c-2 2-4-1-2-3l10-7 2 1-10 9z"/>
            <path d="M26 36c1 2-2 4-3 2l-6-11 2-1 7 10z"/>
            <path d="M34 26c2 1 1 4-1 3l-11-4 1-2 11 3z"/>
          </g>
        </svg>
      );

    case 'instagram':
      // Instagram Sunset Gradient (Magenta, Red, Orange, Gold)
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <defs>
            <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FCAF45"/>
              <stop offset="50%" stopColor="#FD1D1D"/>
              <stop offset="100%" stopColor="#833AB4"/>
            </linearGradient>
          </defs>
          <rect width="48" height="48" rx="12" fill="url(#igGrad)"/>
          <rect x="11" y="11" width="26" height="26" rx="7" stroke="#ffffff" strokeWidth="3" fill="none"/>
          <circle cx="24" cy="24" r="6" stroke="#ffffff" strokeWidth="3" fill="none"/>
          <circle cx="31.5" cy="16.5" r="1.8" fill="#ffffff"/>
        </svg>
      );

    case 'facebook':
      // Meta Facebook Royal Blue
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#0866FF"/>
          <path d="M29 25h-5v14h-6V25h-3v-5h3v-3.5C18 12.8 20.3 10 25.5 10c2.1 0 3.8.2 3.8.2v4.8h-2.1c-2.1 0-2.2 1-2.2 2.3V20h5.5l-.5 5z" fill="#ffffff"/>
        </svg>
      );

    case 'tiktok':
      // TikTok Obsidian with Cyan & Neon Red music note
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#000000"/>
          {/* Cyan layer */}
          <path d="M30 16c2.5 2.2 5.5 3.5 9 3.7V13c-3 0-5.5-1.5-7-3.8h-4.5v19.5c0 3-2.5 5.5-5.5 5.5s-5.5-2.5-5.5-5.5 2.5-5.5 5.5-5.5c.8 0 1.5.2 2.2.5V17c-.7-.2-1.4-.3-2.2-.3-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10V16h-2z" fill="#00F2FE" transform="translate(-1, -1)"/>
          {/* Red layer */}
          <path d="M30 16c2.5 2.2 5.5 3.5 9 3.7V13c-3 0-5.5-1.5-7-3.8h-4.5v19.5c0 3-2.5 5.5-5.5 5.5s-5.5-2.5-5.5-5.5 2.5-5.5 5.5-5.5c.8 0 1.5.2 2.2.5V17c-.7-.2-1.4-.3-2.2-.3-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10V16h-2z" fill="#FE2C55" transform="translate(1, 1)"/>
          {/* White layer */}
          <path d="M30 16c2.5 2.2 5.5 3.5 9 3.7V13c-3 0-5.5-1.5-7-3.8h-4.5v19.5c0 3-2.5 5.5-5.5 5.5s-5.5-2.5-5.5-5.5 2.5-5.5 5.5-5.5c.8 0 1.5.2 2.2.5V17c-.7-.2-1.4-.3-2.2-.3-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10V16h-2z" fill="#ffffff"/>
        </svg>
      );

    case 'x':
      // X (Twitter) Obsidian
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#000000"/>
          <path d="M12 12l10 14.5L12 36h3l8.5-10 7.5 10H36L25 20.5 34.5 12h-3l-7.5 8.5L17 12h-5z" fill="#ffffff"/>
        </svg>
      );

    case 'linkedin':
      // LinkedIn Professional Royal Blue
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#0A66C2"/>
          <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="22" letterSpacing="-0.5">
            in
          </text>
        </svg>
      );

    case 'trustpilot':
      // Trustpilot Emerald Star
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#1C1C1C"/>
          <path d="M24 8l5 10.5 11.5 1.7-8.3 8.1 2 11.5L24 34.4 13.8 39.8l2-11.5-8.3-8.1 11.5-1.7L24 8z" fill="#00B67A"/>
          <path d="M24 25l-4.2 9.4 4.2-2.3v-7.1z" fill="#005138"/>
        </svg>
      );

    case 'chamber':
      // Chamber of Commerce Gold & Navy
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#0F2C59"/>
          <path d="M10 18h28M14 18v16m7-16v16m7-16v16m7-16v16M8 34h32M24 10l16 8H8l16-8z" stroke="#C5A059" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      );

    case 'panchayat':
      // Panchayat & Rural Bharat Emblem Saffron & Green
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5"/>
          <circle cx="24" cy="24" r="14" fill="#138808" opacity="0.15"/>
          <circle cx="24" cy="24" r="9" stroke="#000080" strokeWidth="2" fill="none"/>
          <path d="M12 14c4 4 8 0 12 0s8 4 12 0" stroke="#FF9933" strokeWidth="3" strokeLinecap="round"/>
          <path d="M12 34c4-4 8 0 12 0s8-4 12 0" stroke="#138808" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      );

    case 'whois':
      // WHOIS Domain Security Azure
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#0284C7"/>
          <circle cx="24" cy="24" r="12" stroke="#ffffff" strokeWidth="2.5" fill="none"/>
          <path d="M12 24h24M24 12c4 4 4 20 0 24M24 12c-4 4-4 20 0 24" stroke="#ffffff" strokeWidth="2.5" fill="none"/>
          <circle cx="34" cy="34" r="5" fill="#38BDF8"/>
          <path d="M34 32v2m0 2h.01" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );

    case 'whatsapp':
      // WhatsApp Official Neon Green
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#25D366"/>
          <path d="M37 23.5c0 7.5-6 13.5-13.5 13.5-2.4 0-4.6-.6-6.6-1.7L9 38l2.8-7.5C10.6 28.5 10 26 10 23.5 10 16 16 10 23.5 10S37 16 37 23.5z" fill="#ffffff"/>
          <path d="M29.5 27.2c-.4-.2-2.3-1.1-2.7-1.3-.4-.1-.6-.2-.9.2s-1 1.3-1.3 1.5-.5.3-.9.1c-.4-.2-1.8-.7-3.4-2.1-1.3-1.1-2.1-2.5-2.4-3-.2-.4 0-.7.2-.9.2-.2.4-.5.6-.7.2-.2.3-.4.4-.7.1-.2 0-.5 0-.7s-.9-2.2-1.3-3c-.3-.8-.7-.7-.9-.7h-.8c-.3 0-.7.1-1.1.5-.4.4-1.5 1.5-1.5 3.6s1.5 4.2 1.7 4.5c.2.3 3 4.6 7.3 6.4 1 .4 1.8.7 2.5.9 1.1.3 2 .3 2.8.2.9-.1 2.3-1 2.7-1.9.3-1 .3-1.8.2-1.9-.2-.3-.5-.4-.9-.6z" fill="#128C7E"/>
        </svg>
      );

    case 'deepweb':
      // Deep Web Sapphire Radar
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#1E3A8A"/>
          <circle cx="24" cy="24" r="14" stroke="#3B82F6" strokeWidth="2.5" strokeDasharray="3 3" fill="none"/>
          <circle cx="24" cy="24" r="8" stroke="#60A5FA" strokeWidth="2.5" fill="none"/>
          <circle cx="24" cy="24" r="3" fill="#93C5FD"/>
          <path d="M24 24l10-10" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      );

    case 'seo':
      // SEO Authority & Search Console Amber & Blue
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#1E293B"/>
          <path d="M12 34l8-10 6 5 10-13" stroke="#4285F4" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <circle cx="36" cy="16" r="4" fill="#F59E0B"/>
          <path d="M12 38h24" stroke="#64748B" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );

    case 'scheduler':
      // 24/7 Autonomous Sweeper Laser Emerald & Gold
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="linear-gradient(135deg, #059669, #047857)"/>
          <circle cx="24" cy="24" r="13" stroke="#A7F3D0" strokeWidth="2.5" strokeDasharray="4 2" fill="none"/>
          <path d="M24 16v8l6 3" stroke="#ffffff" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="36" cy="14" r="4" fill="#FBBF24"/>
        </svg>
      );

    default:
      return (
        <div style={{ width: s, height: s, borderRadius: 8, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'grid', placeItems: 'center', fontSize: 12 }}>
          ⚡
        </div>
      );
  }
}
