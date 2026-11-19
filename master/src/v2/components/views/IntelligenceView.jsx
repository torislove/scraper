import React, { useMemo, useState } from 'react';
import {
  Brain, CheckCircle2, Clock, Globe2, Loader2, MapPin, Play, RefreshCw,
  Search, Sparkles, Tag, Wand2, Zap
} from 'lucide-react';
import { suggestSearch } from '../../api';

const LOCKED_MARKETS = [
  { code: 'IN', flag: '🇮🇳', name: 'India' },
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: 'NZ', flag: '🇳🇿', name: 'New Zealand' },
  { code: 'IE', flag: '🇮🇪', name: 'Ireland' },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' }
];

const SIM_PRESETS = [
  { label: 'computer shops in guntur', country: 'IN' },
  { label: 'computr shps in guntur', country: 'IN' },
  { label: 'solar panel installers in chennai', country: 'IN' },
  { label: 'dentists in london', country: 'GB' },
  { label: 'hvac contractors in dallas', country: 'US' },
  { label: 'caterers in ontario', country: 'CA' },
  { label: 'gyms in dubai', country: 'AE' },
  { label: 'plumbers in berlin', country: 'DE' }
];

export default function IntelligenceView({
  seedUniversalIntelligence,
  seedingTaxonomy,
  fetchTaxonomy,
  loadingTaxonomy,
  taxonomyData
}) {
  const [simQuery, setSimQuery] = useState('computer shops in guntur');
  const [simCountry, setSimCountry] = useState('IN');
  const [simMode, setSimMode] = useState('master'); // 'client' | 'master'
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [simLatency, setSimLatency] = useState(null);
  const [bankFilter, setBankFilter] = useState('');

  const runSimulator = async (overrideQuery, overrideCountry) => {
    const q = (overrideQuery != null ? overrideQuery : simQuery).trim();
    const c = overrideCountry || simCountry;
    if (!q) return;
    setSimLoading(true);
    const t0 = performance.now();
    try {
      const data = await suggestSearch({
        q,
        country: c,
        isMaster: simMode === 'master',
        limit: 12
      });
      setSimLatency(Math.round(performance.now() - t0));
      setSimResult(data || null);
    } catch (err) {
      setSimResult({ error: err?.message || 'Simulator request failed' });
      setSimLatency(null);
    } finally {
      setSimLoading(false);
    }
  };

  const filteredServices = useMemo(() => {
    const list = taxonomyData?.services || [];
    if (!bankFilter.trim()) return list;
    const q = bankFilter.toLowerCase().trim();
    return list.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.expansions || []).some(e => String(e).toLowerCase().includes(q))
    );
  }, [taxonomyData?.services, bankFilter]);

  return (
    <section className="v2-runs-view">
      <div className="v2-runs-head">
        <div>
          <span className="v2-view-kicker">ALL-VENDOR SELF-LEARNING INTELLIGENCE ENGINE</span>
          <h2>AI Intelligence Hub &amp; Live Query Simulator</h2>
          <p>
            Universal 25+ industry brain with typo healing, synonym expansion, and live self-learning memory across all 11 locked markets.
          </p>
        </div>
        <div className="v2-runs-actions">
          <button type="button" className="v2-btn v2-btn-cyan" onClick={seedUniversalIntelligence} disabled={seedingTaxonomy}>
            <Zap size={13} /> {seedingTaxonomy ? 'Seeding…' : 'Pre-Train Universal Industries'}
          </button>
          <button type="button" className="v2-btn v2-btn-ghost" onClick={fetchTaxonomy} disabled={loadingTaxonomy}>
            <RefreshCw size={13} className={loadingTaxonomy ? 'v2-spin' : ''} /> Refresh Bank
          </button>
        </div>
      </div>

      {/* Interactive Live Query & Synonym Simulator */}
      <div className="mc-sim-card" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Wand2 size={16} />
            </span>
            <div>
              <b style={{ fontSize: 15, color: '#0f172a', display: 'block' }}>Live Search &amp; Synonym Simulator</b>
              <small style={{ fontSize: 12, color: '#64748b' }}>
                Test any business type, typo, or location across the 11 locked markets and inspect real-time brain resolution.
              </small>
            </div>
          </div>
          <div style={{ display: 'inline-flex', gap: 6, background: '#f1f5f9', padding: 3, borderRadius: 10 }}>
            <button
              type="button"
              onClick={() => setSimMode('master')}
              style={{
                border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                background: simMode === 'master' ? '#0b1120' : 'transparent',
                color: simMode === 'master' ? '#34d399' : '#64748b'
              }}
            >
              Master Mode (States &amp; Counties)
            </button>
            <button
              type="button"
              onClick={() => setSimMode('client')}
              style={{
                border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                background: simMode === 'client' ? '#059669' : 'transparent',
                color: simMode === 'client' ? '#ffffff' : '#64748b'
              }}
            >
              Client Mode (Cities)
            </button>
          </div>
        </div>

        <form
          className="mc-sim-row"
          onSubmit={e => { e.preventDefault(); runSimulator(); }}
        >
          <select
            value={simCountry}
            onChange={e => setSimCountry(e.target.value)}
            style={{
              padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1',
              background: '#fff', fontSize: 13, fontWeight: 700, color: '#0f172a'
            }}
          >
            {LOCKED_MARKETS.map(m => (
              <option key={m.code} value={m.code}>{m.flag} {m.name} ({m.code})</option>
            ))}
          </select>

          <input
            type="text"
            className="mc-sim-input"
            value={simQuery}
            onChange={e => setSimQuery(e.target.value)}
            placeholder="Try: computer shops in guntur, solar installers in chennai, dentists in london…"
          />

          <button
            type="submit"
            disabled={simLoading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10,
              border: 'none', background: 'linear-gradient(135deg, #0b1120, #1e293b)', color: '#34d399',
              fontSize: 13, fontWeight: 800, cursor: 'pointer'
            }}
          >
            {simLoading ? <Loader2 size={14} className="v2-spin" /> : <Play size={14} />}
            Test Query
          </button>
        </form>

        {/* 1-click sample tests */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {SIM_PRESETS.map(p => (
            <button
              key={`${p.country}-${p.label}`}
              type="button"
              onClick={() => {
                setSimQuery(p.label);
                setSimCountry(p.country);
                runSimulator(p.label, p.country);
              }}
              style={{
                padding: '4px 10px', borderRadius: 999, border: '1px solid #e2e8f0',
                background: '#f8fafc', color: '#334155', fontSize: 11.5, fontWeight: 600, cursor: 'pointer'
              }}
            >
              {p.country} · “{p.label}”
            </button>
          ))}
        </div>

        {/* Live Simulator Output */}
        {simResult && !simResult.error && (
          <div style={{ marginTop: 16 }}>
            <div className="mc-sim-results">
              <div className="mc-sim-box">
                <span>RESOLVED CATEGORY</span>
                <b>{simResult.category?.value || simResult.parsed?.category || '—'}</b>
                {simResult.category?.family && (
                  <small style={{ display: 'block', color: '#059669', fontWeight: 700, marginTop: 2 }}>
                    Family: {simResult.category.family}
                  </small>
                )}
              </div>
              <div className="mc-sim-box">
                <span>RESOLVED LOCATION</span>
                <b>{simResult.location?.value || simResult.parsed?.location || '—'}</b>
                {simResult.location?.display && (
                  <small style={{ display: 'block', color: '#475569', marginTop: 2 }}>
                    {simResult.location.display} ({simResult.location.level || 'city'})
                  </small>
                )}
              </div>
              <div className="mc-sim-box">
                <span>RESPONSE SPEED &amp; STATUS</span>
                <b style={{ color: '#059669' }}>
                  <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {simLatency != null ? `${simLatency} ms` : '—'}
                </b>
                <small style={{ display: 'block', color: '#475569', marginTop: 2 }}>
                  {simResult.ready ? 'Ready to launch immediately' : 'Needs category or city'}
                </small>
              </div>
            </div>

            {simResult.didYouMean && (
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 10,
                background: '#fefce8', border: '1px solid #fde68a', fontSize: 12.5, color: '#92400e', fontWeight: 600
              }}>
                <Sparkles size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Typo healed automatically: <b>{simResult.didYouMean}</b>
              </div>
            )}

            {Array.isArray(simResult.suggestions) && simResult.suggestions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  GENERATED SUGGESTIONS &amp; SYNONYMS ({simResult.suggestions.length})
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {simResult.suggestions.slice(0, 10).map((s, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '5px 10px', borderRadius: 9, fontSize: 12, fontWeight: 600,
                        background: s.type === 'location' ? '#eff6ff' : '#ecfdf5',
                        border: `1px solid ${s.type === 'location' ? '#bfdbfe' : '#a7f3d0'}`,
                        color: s.type === 'location' ? '#1e40af' : '#065f46'
                      }}
                    >
                      {s.type === 'location' ? <MapPin size={11} /> : <Tag size={11} />}
                      {s.label || s.value}
                      {s.detail ? <small style={{ opacity: 0.72 }}>({s.detail})</small> : null}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {simResult?.error && (
          <div style={{ marginTop: 12, color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
            {simResult.error}
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="v2-cmd-stats" style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="v2-stat-card">
          <span>LEARNED QUERIES</span>
          <b>{taxonomyData?.totals?.queries || 0}</b>
          <small>Real-world operator searches</small>
        </div>
        <div className="v2-stat-card">
          <span>SERVICES &amp; TRADES</span>
          <b>{taxonomyData?.totals?.services || 0}</b>
          <small>Universal multi-industry roles</small>
        </div>
        <div className="v2-stat-card">
          <span>PRODUCTS &amp; SUPPLIES</span>
          <b>{taxonomyData?.totals?.products || 0}</b>
          <small>B2B &amp; retail product signals</small>
        </div>
        <div className="v2-stat-card">
          <span>BRAND INDEX</span>
          <b>{taxonomyData?.totals?.brands || 0}</b>
          <small>Manufacturers &amp; dealer labels</small>
        </div>
      </div>

      {/* Filter & Learned Memory Table */}
      <div className="v2-runs-list" style={{ marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '7px 12px', minWidth: 280 }}>
            <Search size={14} color="#64748b" />
            <input
              type="search"
              value={bankFilter}
              onChange={e => setBankFilter(e.target.value)}
              placeholder="Filter learned services or synonyms…"
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, width: '100%' }}
            />
          </div>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
            <Globe2 size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
            Active across all 11 locked markets · Self-learning feedback loop live
          </span>
        </div>

        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>Learned Category / Service</th>
                <th>Expansions &amp; Learned Synonyms</th>
                <th>Search Hits</th>
                <th>Harvest Yield</th>
                <th>Cache Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((srv, idx) => (
                <tr key={idx}>
                  <td><b>{srv.name}</b></td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(srv.expansions || []).map((exp, i) => (
                        <span key={i} className="v2-engine-badge" style={{ fontSize: '10.5px' }}>{exp}</span>
                      ))}
                    </div>
                  </td>
                  <td><span className="v2-badge">{srv.runs || 1} runs</span></td>
                  <td><span className="v2-badge v2-badge-green">{srv.leadCount || 'Active'} leads</span></td>
                  <td><span className="v2-badge v2-badge-cyan"><CheckCircle2 size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} /> Instant RAM</span></td>
                </tr>
              ))}
              {filteredServices.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    {bankFilter
                      ? `No learned services matching "${bankFilter}".`
                      : <>No learned services yet. Click <b>“Pre-Train Universal Industries”</b> above to seed all industries instantly.</>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
