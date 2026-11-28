import React from 'react';
import { Compass } from 'lucide-react';
import LazyBrandPin from '../three/LazyBrandPin';
import { FlagSphere } from '../ui/FlagChip';
import { getCountryByCode } from '../data/countries';

export default function GoogleDoodleHero({ country = 'IN', isMaster = false, onPickInspiration }) {
  const activeCountry = getCountryByCode(country);
  const examples = activeCountry.vocabulary.map((v) => ({
    label: `${v.term} · ${v.sampleCity}`,
    category: v.category,
    city: v.sampleCity,
    flag: activeCountry.code
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '14px 0 12px', userSelect: 'none' }}>
      <LazyBrandPin size={82} speed={1.0} interactive className="mb-1" />

      <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2, marginTop: 2 }}>
        <h1 style={{ margin: 0, fontSize: 'var(--lp-text-2xl)', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--lp-ink)', display: 'inline-flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ background: 'linear-gradient(135deg, #92400e 0%, #d97706 45%, #f59e0b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Scraper
          </span>
          <span style={{ fontSize: '0.78em', fontWeight: 700, color: 'var(--lp-ink-2)' }}>.co.in</span>
        </h1>
      </div>

      {/* Top Sovereign UI Strip directly below Scraper.co.in */}
      <div
        className="lp-glass-subtle"
        style={{
          margin: '8px 0 10px',
          padding: '5px 14px',
          borderRadius: 999,
          display: 'inline-flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 8,
          border: '1px solid rgba(217, 119, 6, 0.28)',
          background: 'rgba(255, 255, 255, 0.92)'
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: '#92400e', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {isMaster ? 'Master Fleet · District & State Radar' : 'Client Radar · City Urban Wards'}
        </span>
        <span style={{ color: '#cbd5e1' }}>·</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--lp-ink-2)' }}>
          <FlagSphere code={country} size={13} /> {activeCountry.name}
        </span>
        <span style={{ color: '#cbd5e1' }}>·</span>
        <span style={{ fontSize: 11, fontWeight: 650, color: 'var(--lp-ink-3)' }}>
          Direct Mobiles, Landlines &amp; Socials
        </span>
      </div>

      <p style={{ margin: '0 0 12px', fontSize: 'var(--lp-text-sm)', color: 'var(--lp-ink-3)', maxWidth: 560, lineHeight: 1.5, fontWeight: 500 }}>
        {isMaster
          ? 'District & State scale coverage across 5 markets: HQ Urban Wards first, then Towns and Mandals / Sub-Divisions.'
          : 'Search publicly listed commercial and trade directories across 5 markets — separating direct mobiles, STD landlines, official websites, and social profiles.'}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, maxWidth: 680 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--lp-ink-4)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Compass size={12} color="#d97706" /> Examples in {activeCountry.name}:
        </span>
        {examples.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onPickInspiration?.(item)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 11px',
              borderRadius: 10,
              fontSize: 11.5,
              fontWeight: 650,
              background: 'rgba(255, 255, 255, 0.92)',
              border: '1px solid rgba(217, 119, 6, 0.24)',
              color: 'var(--lp-ink-2)',
              boxShadow: 'var(--lp-shadow-1)',
              cursor: 'pointer'
            }}
          >
            <FlagSphere code={item.flag} size={14} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
