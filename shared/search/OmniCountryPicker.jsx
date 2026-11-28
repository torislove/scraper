import React, { useState, useEffect, useRef } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { COUNTRIES } from '../data/countries';
import { FlagSphere } from '../ui/FlagChip';

export default function OmniCountryPicker({
  country = 'IN',
  setCountry,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div style={{ position: 'relative', flexShrink: 0 }} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        disabled={disabled}
        title="Select Target Market"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 10px',
          borderRadius: 12,
          background: '#fffbeb',
          border: '1px solid rgba(217, 119, 6, 0.34)',
          color: '#78350f',
          fontSize: 12,
          fontWeight: 800,
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        <FlagSphere code={country} size={20} active />
        <span style={{ fontFamily: 'var(--lp-font-mono)' }}>{country}</span>
        <ChevronDown size={13} color="#92400e" />
      </button>

      {isOpen && (
        <div
          className="lp-glass"
          style={{
            position: 'absolute',
            left: 0,
            top: 'calc(100% + 8px)',
            width: 244,
            padding: 8,
            zIndex: 60,
            boxShadow: 'var(--lp-shadow-3)'
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--lp-ink-4)', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Globe size={12} color="#d97706" /> 5 Active Markets
          </div>
          <div className="no-scrollbar" style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
            {COUNTRIES.map((c) => {
              const selected = c.code === country;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { setCountry(c.code); setIsOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: 10,
                    fontSize: 12.5,
                    fontWeight: selected ? 800 : 600,
                    background: selected ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : 'transparent',
                    color: selected ? '#78350f' : 'var(--lp-ink-2)',
                    border: selected ? '1px solid rgba(217, 119, 6, 0.42)' : '1px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                    <FlagSphere code={c.code} size={18} active={selected} />
                    <span>{c.name}</span>
                  </span>
                  <span style={{ fontFamily: 'var(--lp-font-mono)', fontSize: 10.5, color: selected ? '#b45309' : '#94a3b8' }}>
                    {c.code}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
