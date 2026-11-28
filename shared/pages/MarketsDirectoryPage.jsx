import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Phone } from 'lucide-react';
import { COUNTRIES } from '../data/countries';
import { FlagSphere } from '../ui/FlagChip';
import LiquidButton from '../ui/LiquidButton';
import LandingNavbar from '../../client/src/v2/landing/LandingNavbar';

export default function MarketsDirectoryPage() {
  const navigate = useNavigate();

  return (
    <div className="lp-canvas-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <LandingNavbar />

      <main style={{ flex: 1, maxWidth: 1120, width: '100%', margin: '0 auto', padding: '32px 16px 64px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b45309' }}>
            5-Market Directory
          </span>
          <h1 style={{ margin: '6px 0 8px', fontSize: 'var(--lp-text-2xl)', fontWeight: 800, color: 'var(--lp-ink)' }}>
            Localized Markets, Cities &amp; Commercial Sectors
          </h1>
          <p style={{ margin: '0 auto', maxWidth: 620, fontSize: 13.5, color: 'var(--lp-ink-3)' }}>
            Select a market below to inspect localized commercial terminology, regional compliance notes, and live public business previews.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {COUNTRIES.map((c) => (
            <article key={c.code} className="lp-glass" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FlagSphere code={c.code} size={28} active />
                    <div>
                      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--lp-ink)' }}>{c.name}</h2>
                      <span style={{ fontSize: 11.5, color: 'var(--lp-ink-4)' }}>{c.phone} · {c.currency}</span>
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--lp-font-mono)', fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: '#fffbeb', color: '#92400e' }}>
                    {c.code}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {c.vocabulary.map((v) => (
                    <span key={v.term} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 8, background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', color: 'var(--lp-ink-2)' }}>
                      {v.term}
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: 11.5, color: 'var(--lp-ink-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={11} color="#0284c7" />
                  <span>{c.cities.slice(0, 5).join(', ')}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 10, borderTop: '1px solid rgba(15,23,42,0.07)' }}>
                <Link
                  to={`/leads/${c.code.toLowerCase()}`}
                  style={{ fontSize: 12.5, fontWeight: 800, color: '#0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <span>{c.name} Hub</span>
                  <ArrowRight size={12} />
                </Link>
                <LiquidButton variant="gold" size="sm" onClick={() => navigate(`/command?country=${c.code}`)}>
                  Open Workspace
                </LiquidButton>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
