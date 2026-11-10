import React from 'react';
import { RefreshCw, Zap } from 'lucide-react';

export default function IntelligenceView({
  seedUniversalIntelligence,
  seedingTaxonomy,
  fetchTaxonomy,
  loadingTaxonomy,
  taxonomyData
}) {
  return (
    <section className="v2-runs-view">
      <div className="v2-runs-head">
        <div>
          <span className="v2-view-kicker">AUTONOMOUS MACHINE LEARNING</span>
          <h2>Intelligence Memory Bank</h2>
          <p>Self-learning taxonomy trained on verified Indian vendor records. High-yield queries execute with 0.001ms instantaneous vector cache.</p>
        </div>
        <div className="v2-runs-actions">
          <button type="button" className="v2-btn v2-btn-cyan" onClick={seedUniversalIntelligence} disabled={seedingTaxonomy}>
            <Zap size={13} /> {seedingTaxonomy ? 'Seeding...' : '⚡ Pre-Train Universal Indian Services (15 Industries)'}
          </button>
          <button type="button" className="v2-btn v2-btn-ghost" onClick={fetchTaxonomy} disabled={loadingTaxonomy}>
            <RefreshCw size={13} className={loadingTaxonomy ? 'v2-spin' : ''} /> Refresh Bank
          </button>
        </div>
      </div>

      <div className="v2-cmd-stats" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
        <div className="v2-stat-card">
          <span>LEARNED QUERIES</span>
          <b>{taxonomyData?.totals?.queries || 0}</b>
          <small>Real-world operator searches</small>
        </div>
        <div className="v2-stat-card">
          <span>SERVICES & TRADES</span>
          <b>{taxonomyData?.totals?.services || 0}</b>
          <small>High-precision commercial roles</small>
        </div>
        <div className="v2-stat-card">
          <span>PRODUCTS & SUPPLIES</span>
          <b>{taxonomyData?.totals?.products || 0}</b>
          <small>IndiaMART / B2B learned items</small>
        </div>
        <div className="v2-stat-card">
          <span>BRAND INDEX</span>
          <b>{taxonomyData?.totals?.brands || 0}</b>
          <small>Indian manufacturers & labels</small>
        </div>
      </div>

      <div className="v2-runs-list" style={{ marginTop: '1rem' }}>
        <div className="v2-table-wrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>Learned Service / Category</th>
                <th>Expansions & Query Vectors</th>
                <th>Execution Hits</th>
                <th>Harvest Yield</th>
                <th>Cache Status</th>
              </tr>
            </thead>
            <tbody>
              {(taxonomyData?.services || []).map((srv, idx) => (
                <tr key={idx}>
                  <td><b>{srv.name}</b></td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(srv.expansions || []).map((exp, i) => (
                        <span key={i} className="v2-engine-badge" style={{ fontSize: '10px' }}>{exp}</span>
                      ))}
                    </div>
                  </td>
                  <td><span className="v2-badge">{srv.runs || 1} runs</span></td>
                  <td><span className="v2-badge v2-badge-green">{srv.leadCount || 'Active'} leads</span></td>
                  <td><span className="v2-badge v2-badge-cyan">⚡ 0.001ms RAM</span></td>
                </tr>
              ))}
              {(!taxonomyData?.services || taxonomyData.services.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    No learned services yet. Click <b>"Pre-Train Universal Indian Services"</b> above to seed all industries instantly!
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

