import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Sparkles,
  Layers,
  MapPin,
  RefreshCw,
  BarChart3,
  Award,
  Flame,
  ChevronRight,
  Database
} from 'lucide-react';

export default function AdminTrending() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFamily, setSelectedFamily] = useState(null);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/trends/categories');
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.taxonomy && json.taxonomy.length > 0 && !selectedFamily) {
          setSelectedFamily(json.taxonomy[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load trending categories', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  const totalLeads = data?.totalLeadsScraped || 0;
  const rankedCategories = data?.rankedCategories || [];
  const hotCities = data?.hotCities || [];
  const taxonomy = data?.taxonomy || [];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 11, fontWeight: 800, marginBottom: 6 }}>
            <Flame size={12} />
            <span>MARKET DEMAND · WHAT CATEGORIES ARE POPULAR</span>
          </div>
          <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 26, fontWeight: 850, margin: 0, color: '#0f172a' }}>
            Trending Categories &amp; Taxonomy
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>
            See what business types and cities are in highest demand across customer and fleet scrapes.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTrends}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Trends</span>
        </button>
      </div>

      {/* Top 3 Podium Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {rankedCategories.slice(0, 3).map((item, index) => {
          const medal = index === 0 ? '🥇 #1 TRENDING' : (index === 1 ? '🥈 #2 TRENDING' : '🥉 #3 TRENDING');
          const borderColor = index === 0 ? '#10b981' : (index === 1 ? '#0284c7' : '#f59e0b');
          const bgGlow = index === 0 ? 'linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%)' : (index === 1 ? 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)' : 'linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)');

          return (
            <div
              key={item.name}
              className="admin-card"
              style={{
                padding: '20px',
                borderTop: `4px solid ${borderColor}`,
                background: bgGlow,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 850, color: borderColor, letterSpacing: '0.04em' }}>
                  {medal}
                </span>
                <span style={{ fontSize: 22 }}>{item.icon}</span>
              </div>

              <h3 style={{ margin: '4px 0 2px', fontSize: 18, fontWeight: 850, color: '#0f172a' }}>
                {item.name}
              </h3>
              <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 650 }}>
                {item.categoryFamily}
              </div>

              <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid rgba(226, 232, 240, 0.8)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 850, color: '#0f172a' }}>
                    {item.leads.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>leads</span>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: borderColor }}>
                    {item.percentage}%
                  </span>
                </div>
                <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${item.percentage}%`, height: '100%', background: borderColor, borderRadius: 999 }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Ranked Leaderboard + Hot Cities */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        {/* Full Ranked Categories Leaderboard */}
        <div className="admin-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 850, color: '#0f172a', margin: '0 0 2px' }}>
                Category Popularity Leaderboard
              </h2>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Ranked by real volume extracted from directories
              </span>
            </div>
            <BarChart3 size={16} color="#64748b" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rankedCategories.map((cat) => (
              <div
                key={cat.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: cat.rank <= 3 ? '#0f172a' : '#e2e8f0',
                      color: cat.rank <= 3 ? '#ffffff' : '#475569',
                      fontSize: 11,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {cat.rank}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                      {cat.icon} {cat.name}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#64748b' }}>
                      {cat.categoryFamily}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 850, color: '#059669' }}>
                    {cat.leads.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
                    {cat.percentage}% of total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hot Cities Leaderboard */}
        <div className="admin-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 850, color: '#0f172a', margin: '0 0 2px' }}>
                Hottest Geographic Regions
              </h2>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Top cities where customers are mining leads
              </span>
            </div>
            <MapPin size={16} color="#059669" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {hotCities.map((city, idx) => (
              <div
                key={city.city}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>
                    {city.country === 'US' ? '🇺🇸' : (city.country === 'GB' ? '🇬🇧' : '🇮🇳')}
                  </span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                      {city.city}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Top query: <b style={{ color: '#0284c7' }}>{city.topCategory}</b>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 850, color: '#0f172a' }}>
                    {city.leads.toLocaleString()} leads
                  </div>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>
                    {city.searches} search sweeps
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Taxonomy Explorer */}
      <div className="admin-card" style={{ padding: '22px' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#047857', marginBottom: 4 }}>
            <Layers size={12} />
            <span>STRUCTURED DIRECTORY TAXONOMY</span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 850, color: '#0f172a', margin: 0 }}>
            Macro Category Families &amp; Sub-Vectors
          </h2>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '3px 0 0' }}>
            Click on any family below to inspect its sub-categories and real lead volumes.
          </p>
        </div>

        {/* Family Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {taxonomy.map((fam) => {
            const isSelected = selectedFamily?.family === fam.family;
            return (
              <button
                key={fam.family}
                type="button"
                onClick={() => setSelectedFamily(fam)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 999,
                  border: isSelected ? '1.5px solid #059669' : '1px solid #cbd5e1',
                  background: isSelected ? '#ecfdf5' : '#ffffff',
                  color: isSelected ? '#047857' : '#334155',
                  fontSize: 12.5,
                  fontWeight: isSelected ? 800 : 650,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: isSelected ? '0 2px 8px rgba(5,150,105,0.15)' : 'none'
                }}
              >
                <span>{fam.icon}</span>
                <span>{fam.family}</span>
                <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 999, background: isSelected ? '#059669' : '#f1f5f9', color: isSelected ? '#ffffff' : '#64748b', fontWeight: 800 }}>
                  {fam.totalLeads}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Family Details */}
        {selectedFamily && (
          <div style={{ background: '#f8fafc', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24 }}>{selectedFamily.icon}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 850, color: '#0f172a' }}>
                    {selectedFamily.family}
                  </h3>
                  <span style={{ fontSize: 11.5, color: '#64748b' }}>
                    {selectedFamily.totalLeads.toLocaleString()} Total Leads across {selectedFamily.subCategories?.length || 0} Sub-categories
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {selectedFamily.subCategories?.map((sub) => (
                <div
                  key={sub.name}
                  style={{
                    background: '#ffffff',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 750, color: '#0f172a' }}>
                    {sub.name}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 850, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 6 }}>
                    {sub.count} leads
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
