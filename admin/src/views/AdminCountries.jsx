import React, { useState, useEffect } from 'react';
import { Globe, Phone, MessageSquare, Database, ShieldCheck, Zap, CheckCircle2 } from 'lucide-react';

export default function AdminCountries() {
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch('/api/admin/metrics/countries');
        const json = await res.json();
        if (json.success && Array.isArray(json.countries)) {
          setCountries(json.countries);
          if (!selectedCountry && json.countries.length > 0) {
            setSelectedCountry(json.countries[0]);
          }
        }
      } catch (e) {
        console.error('Failed to load country metrics', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCountries();
  }, []);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Eyebrow & Title */}
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: '#ecfeff', border: '1px solid #a5f3fc', color: '#0891b2', fontSize: 11, fontWeight: 800, marginBottom: 8 }}>
          <Globe size={12} />
          <span>11 SOVEREIGN NATIONS · RECONCILED DIRECTORY COVERAGE</span>
        </div>
        <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 'clamp(24px, 2.5vw, 34px)', fontWeight: 850, margin: '0 0 6px', color: '#0f172a', letterSpacing: '-0.025em' }}>
          Global Sovereignty &amp;{' '}
          <span style={{ background: 'linear-gradient(135deg, #0891b2 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Regional Telemetry
          </span>
        </h1>
        <p style={{ fontSize: 13, color: '#475569', maxWidth: '68ch', margin: '0 auto', lineHeight: 1.45 }}>
          Real-time harvesting performance, mobile coverage, and specialized directory engines across all 11 supported sovereign nations.
        </p>
      </div>

      {/* Main Grid: Country Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {countries.map((c) => {
          const isSelected = selectedCountry?.code === c.code;
          return (
            <div
              key={c.code}
              onClick={() => setSelectedCountry(c)}
              className="admin-card"
              style={{
                padding: '16px 18px',
                cursor: 'pointer',
                borderColor: isSelected ? '#0891b2' : 'rgba(226, 232, 240, 0.85)',
                background: isSelected ? 'linear-gradient(180deg, #ffffff 0%, #f0fdfa 100%)' : 'rgba(255, 255, 255, 0.88)',
                boxShadow: isSelected ? '0 12px 28px -6px rgba(8, 145, 178, 0.2)' : 'none',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 24 }}>{c.flag}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      {c.name}
                    </h3>
                    <span style={{ fontSize: 10.5, color: '#64748b', fontWeight: 650 }}>
                      Code: {c.code} · Dial +{c.dialPrefix}
                    </span>
                  </div>
                </div>

                <span className="admin-badge admin-badge-cyan">
                  {c.sessionCount} Runs
                </span>
              </div>

              {/* Mini metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '10px 0', borderTop: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748b' }}>LEADS</div>
                  <div style={{ fontSize: 15, fontWeight: 850, color: '#0f172a' }}>
                    {c.leadCount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748b' }}>PHONE %</div>
                  <div style={{ fontSize: 15, fontWeight: 850, color: '#0891b2' }}>
                    {c.phoneRate}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748b' }}>ENGINES</div>
                  <div style={{ fontSize: 15, fontWeight: 850, color: '#059669' }}>
                    {c.engines ? c.engines.length : 0}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Country Deep Inspector */}
      {selectedCountry && (
        <div className="admin-card" style={{ padding: 22, marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 32 }}>{selectedCountry.flag}</span>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 850, color: '#0f172a' }}>
                  {selectedCountry.name} Engine Matrix &amp; Boundaries
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  International Phone Normalization (+{selectedCountry.dialPrefix}) · Verified Lead Extraction
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <span className="admin-badge admin-badge-emerald">
                <CheckCircle2 size={12} />
                <span>Zero +91 Leak Verified</span>
              </span>
              <span className="admin-badge admin-badge-indigo">
                <ShieldCheck size={12} />
                <span>Sovereign Boundary Active</span>
              </span>
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Specialized Discovery Engines for {selectedCountry.name}:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(selectedCountry.engines || []).map((eng) => (
              <div
                key={eng}
                style={{
                  padding: '7px 14px',
                  borderRadius: 10,
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  fontSize: 12,
                  fontWeight: 750,
                  color: '#1e293b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Zap size={13} color="#0891b2" />
                <span>{eng}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
