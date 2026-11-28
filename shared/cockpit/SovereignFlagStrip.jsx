/**
 * shared/cockpit/SovereignFlagStrip.jsx
 * Stacked, Center-Aligned 5-Market & Target Cities Grid under the Search Pod.
 * All 5 active markets are visible simultaneously without horizontal clipping or scrollbars.
 */

import React from 'react';
import { MapPin, Globe } from 'lucide-react';
import { COUNTRIES, getCountryByCode } from '../data/countries';
import FlagChip from '../ui/FlagChip';

export default function SovereignFlagStrip({
  selectedCountry = 'IN',
  onSelectCountry,
  selectedCity = '',
  onSelectCity,
  disabled = false,
  countriesOverview = {}
}) {
  const activeCountry = getCountryByCode(selectedCountry);
  const overviewList = countriesOverview?.[selectedCountry] || [];
  const countMap = new Map(overviewList.map((item) => [item.city.toLowerCase(), item]));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 12,
        paddingTop: 8,
        userSelect: 'none',
        width: '100%'
      }}
    >
      {/* 1. 5 Active Markets — Stacked & Center-Aligned (100% visible at once) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          maxWidth: 840,
          width: '100%'
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 10px',
            borderRadius: 12,
            background: '#fffbeb',
            border: '1px solid rgba(217, 119, 6, 0.28)',
            color: '#92400e',
            fontSize: 10.5,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          <Globe size={12} color="#d97706" /> 5 Markets
        </span>

        {COUNTRIES.map((c) => (
          <FlagChip
            key={c.code}
            code={c.code}
            name={c.code === 'AE' ? 'UAE' : c.name}
            size={20}
            active={c.code === selectedCountry}
            disabled={disabled}
            onClick={() => onSelectCountry?.(c.code)}
          />
        ))}
      </div>

      {/* 2. Target Cities & Wards for Active Country — Center-Aligned */}
      {activeCountry.cities?.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            maxWidth: 800,
            width: '100%'
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 10,
              background: '#f0f9ff',
              border: '1px solid rgba(2, 132, 199, 0.22)',
              color: '#0369a1',
              fontSize: 10.5,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            <MapPin size={11} color="#0284c7" /> {activeCountry.name} Cities
          </span>

          {activeCountry.cities.map((ct) => {
            const active = Boolean(selectedCity && selectedCity.toLowerCase().includes(ct.toLowerCase()));
            const stats = countMap.get(ct.toLowerCase());
            const zoneLabel = stats
              ? stats.allCount > stats.smartCount
                ? `${stats.smartCount}/${stats.allCount}`
                : `${stats.smartCount}`
              : '';
            return (
              <button
                key={ct}
                type="button"
                disabled={disabled}
                onClick={() => onSelectCity?.(ct)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 11px',
                  borderRadius: 10,
                  fontSize: 11.5,
                  fontWeight: active ? 800 : 600,
                  background: active ? '#0284c7' : 'rgba(255, 255, 255, 0.9)',
                  color: active ? '#ffffff' : 'var(--lp-ink-2)',
                  border: `1px solid ${active ? '#0284c7' : 'rgba(15, 23, 42, 0.1)'}`,
                  boxShadow: 'var(--lp-shadow-1)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 120ms cubic-bezier(0.22, 1, 0.36, 1)'
                }}
              >
                <span>{ct}</span>
                {zoneLabel && (
                  <span
                    className="lp-tabular"
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: 6,
                      background: active ? 'rgba(255,255,255,0.22)' : '#f0f9ff',
                      color: active ? '#ffffff' : '#0369a1'
                    }}
                  >
                    {zoneLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
