/**
 * shared/search/OmniSearchDropdown.jsx
 * Shared full-width, full-label suggestion & recent-search dropdown for Client & Master search bars.
 */

import React from 'react';
import { Search, MapPin, Clock, CornerDownLeft, Globe2 } from 'lucide-react';
import { FlagSphere } from '../ui/FlagChip';

export default function OmniSearchDropdown({
  items = [],
  selectedIdx = -1,
  isRecentMode = false,
  headerLabel = 'Suggestions',
  headerRight = '↑↓ select · Enter',
  country = 'IN',
  onSelect,
  onClearRecents
}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div
      className="lp-glass"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 'calc(100% + 8px)',
        overflow: 'hidden',
        zIndex: 60,
        boxShadow: 'var(--lp-shadow-3)',
        borderRadius: 16
      }}
    >
      <div
        style={{
          padding: '8px 14px',
          background: 'rgba(255, 251, 235, 0.85)',
          borderBottom: '1px solid rgba(217, 119, 6, 0.16)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          fontSize: 10.5,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#92400e'
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {isRecentMode ? <Clock size={12} /> : <Search size={12} />}
          {headerLabel}
        </span>
        {isRecentMode && onClearRecents ? (
          <button
            type="button"
            onClick={onClearRecents}
            style={{ border: 'none', background: 'transparent', fontSize: 10.5, fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
          >
            Clear
          </button>
        ) : (
          <span style={{ color: '#64748b', fontWeight: 600 }}>{headerRight}</span>
        )}
      </div>

      <div className="no-scrollbar" style={{ maxHeight: 340, overflowY: 'auto' }}>
        {items.map((s, idx) => {
          const active = idx === selectedIdx;
          const itemCountry = (s.country || country || 'IN').toUpperCase();
          const isLocation = s.type === 'location' || s.type === 'district' || s.type === 'state';
          const badgeLabel = s.badge || (s.type === 'recent' ? 'Recent' : s.type === 'location' ? 'City' : 'Category');

          return (
            <div
              key={`${s.text}-${s.subtitle || ''}-${idx}`}
              onClick={() => onSelect?.(s)}
              style={{
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                cursor: 'pointer',
                background: active ? '#fffbeb' : 'transparent',
                color: active ? '#78350f' : 'var(--lp-ink)',
                borderBottom: '1px solid rgba(15, 23, 42, 0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                {s.type === 'recent' ? (
                  <Clock size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                ) : isLocation ? (
                  <MapPin size={14} color="#0284c7" style={{ flexShrink: 0 }} />
                ) : (
                  <Search size={14} color="#d97706" style={{ flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: active ? 800 : 700, color: active ? '#78350f' : '#0f172a', wordBreak: 'break-word' }}>
                    {s.text || `${s.category} in ${s.city}`}
                  </div>
                  {s.subtitle && (
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', marginTop: 1 }}>
                      {s.subtitle}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {s.autoSwitchCountry && (
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: '#ecfdf5', color: '#047857', border: '1px solid rgba(5,150,105,0.25)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Globe2 size={10} /> Switch {itemCountry}
                  </span>
                )}
                <span style={{ fontSize: 10.5, fontWeight: 750, padding: '3px 8px', borderRadius: 8, background: isLocation ? '#f0f9ff' : '#fffbeb', color: isLocation ? '#0369a1' : '#92400e', border: `1px solid ${isLocation ? 'rgba(2,132,199,0.2)' : 'rgba(217,119,6,0.2)'}`, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <FlagSphere code={itemCountry} size={12} />
                  <span>{badgeLabel}</span>
                  <CornerDownLeft size={10} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
