import React from 'react';

/**
 * Custom-designed, multi-layered explanation icons with themed gradient
 * containers, glowing rim lights, and soft diffused shadows.
 */

export function RadarGeospatialIcon({ size = 48, className = '' }) {
  return (
    <div
      className={`lx-icon-capsule tone-cyan ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        border: '1.5px solid #93c5fd',
        boxShadow: '0 8px 20px -4px rgba(0, 122, 255, 0.22), inset 0 1px 0 #ffffff',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        position: 'relative'
      }}
    >
      <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" opacity="0.3" strokeDasharray="2 3" />
        <path d="M12 12m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0" opacity="0.5" />
        <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" fill="#007aff" />
        <path d="M12 12l5.5 -5.5" stroke="#0284c7" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

export function TradePurityIcon({ size = 48, className = '' }) {
  return (
    <div
      className={`lx-icon-capsule tone-emerald ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
        border: '1.5px solid #6ee7b7',
        boxShadow: '0 8px 20px -4px rgba(16, 185, 129, 0.25), inset 0 1px 0 #ffffff',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        position: 'relative'
      }}
    >
      <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" strokeWidth="2.5" stroke="#047857" />
      </svg>
    </div>
  );
}

export function TelecomWhatsAppIcon({ size = 48, className = '' }) {
  return (
    <div
      className={`lx-icon-capsule tone-green ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        border: '1.5px solid #86efac',
        boxShadow: '0 8px 20px -4px rgba(34, 197, 94, 0.25), inset 0 1px 0 #ffffff',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        position: 'relative'
      }}
    >
      <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="14" height="20" x="5" y="2" rx="3" ry="3" />
        <path d="M12 18h.01" strokeWidth="3" />
        <path d="M9 6h6" opacity="0.6" />
      </svg>
    </div>
  );
}

export function GlobalSovereignIcon({ size = 48, className = '' }) {
  return (
    <div
      className={`lx-icon-capsule tone-purple ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
        border: '1.5px solid #d8b4fe',
        boxShadow: '0 8px 20px -4px rgba(147, 51, 234, 0.22), inset 0 1px 0 #ffffff',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        position: 'relative'
      }}
    >
      <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 24 24" fill="none" stroke="#7e22ce" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    </div>
  );
}

export function HardwareConcurrencyIcon({ size = 48, className = '' }) {
  return (
    <div
      className={`lx-icon-capsule tone-blue ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        border: '1.5px solid #93c5fd',
        boxShadow: '0 8px 20px -4px rgba(0, 122, 255, 0.25), inset 0 1px 0 #ffffff',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        position: 'relative'
      }}
    >
      <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="16" height="16" x="4" y="4" rx="3" />
        <rect width="6" height="6" x="9" y="9" rx="1" fill="#2563eb" fillOpacity="0.15" />
        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
      </svg>
    </div>
  );
}

export function PrivacyZeroKnowledgeIcon({ size = 48, className = '' }) {
  return (
    <div
      className={`lx-icon-capsule tone-amber ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
        border: '1.5px solid #fcd34d',
        boxShadow: '0 8px 20px -4px rgba(217, 119, 6, 0.25), inset 0 1px 0 #ffffff',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        position: 'relative'
      }}
    >
      <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <circle cx="12" cy="16" r="1.5" fill="#d97706" />
      </svg>
    </div>
  );
}

export function StepPinpointIcon({ size = 44 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        background: '#eff6ff',
        border: '1.5px solid #bfdbfe',
        color: '#007aff',
        display: 'grid',
        placeItems: 'center',
        boxShadow: '0 4px 12px rgba(0, 122, 255, 0.15)'
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    </div>
  );
}

export function StepSwarmIcon({ size = 44 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        background: '#ecfdf5',
        border: '1.5px solid #a7f3d0',
        color: '#059669',
        display: 'grid',
        placeItems: 'center',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    </div>
  );
}

export function StepExportIcon({ size = 44 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        background: '#faf5ff',
        border: '1.5px solid #e9d5ff',
        color: '#7c3aed',
        display: 'grid',
        placeItems: 'center',
        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.15)'
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M9 15l2 2 4-4" strokeWidth="2.5" />
      </svg>
    </div>
  );
}
