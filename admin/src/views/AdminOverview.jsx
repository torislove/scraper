import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Server,
  Laptop,
  Database,
  PhoneCall,
  MessageSquare,
  Globe,
  Zap,
  CheckCircle2,
  ExternalLink,
  Layers,
  Activity,
  ArrowRight
} from 'lucide-react';

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const masterUrl = import.meta.env.VITE_MASTER_URL || (isLocal ? 'http://localhost:5174/command' : 'https://master.scraper.co.in/command');
  const clientUrl = import.meta.env.VITE_CLIENT_URL || (isLocal ? 'http://localhost:5173/command' : 'https://scraper.co.in/command');

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/admin/overview');
      const json = await res.json();
      if (json.success || json.ok) setData(json);
    } catch (e) {
      console.error('Failed to fetch admin overview', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 8000);
    return () => clearInterval(interval);
  }, []);

  const fleet = data?.fleet || {};
  const metrics = data?.metrics || {};
  const master = fleet.masterScraper || {};
  const client = fleet.clientScrapers || {};

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Eyebrow & Title */}
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: '#fffbeb', border: '1px solid rgba(217, 119, 6, 0.38)', color: '#92400e', fontSize: 11, fontWeight: 800, marginBottom: 8 }}>
          <Layers size={12} />
          <span>CENTRAL FLEET OBSERVABILITY &amp; GOVERNANCE</span>
        </div>
        <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 'clamp(24px, 2.5vw, 34px)', fontWeight: 850, margin: '0 0 6px', color: '#0f172a', letterSpacing: '-0.025em' }}>
          Distributed Fleet Pulse &amp;{' '}
          <span style={{ background: 'linear-gradient(125deg, #92400e 0%, #d97706 42%, #f59e0b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Data Governance
          </span>
        </h1>
        <p style={{ fontSize: 13, color: '#475569', maxWidth: '68ch', margin: '0 auto', lineHeight: 1.45 }}>
          Unified supervisory console connecting our 11-nation Master Fleet Orchestrator with all distributed Client Cockpit edge instances.
        </p>
      </div>

      {/* Top 4 KPI Metric Pills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div className="admin-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fffbeb', border: '1px solid rgba(217, 119, 6, 0.28)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Database size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Indexed Commercial Records
            </div>
            <div style={{ fontSize: 24, fontWeight: 850, color: '#0f172a', fontFamily: '"Space Grotesk", sans-serif' }}>
              {loading ? '...' : (metrics.totalLeads || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 10.5, color: '#b45309', fontWeight: 700 }}>
              Across Master + Client vaults
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ecfeff', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PhoneCall size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Direct Mobiles Verified
            </div>
            <div style={{ fontSize: 24, fontWeight: 850, color: '#0f172a', fontFamily: '"Space Grotesk", sans-serif' }}>
              {loading ? '...' : (metrics.totalPhones || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 10.5, color: '#0891b2', fontWeight: 700 }}>
              {metrics.phoneRate || 0}% Mobile Coverage
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              WhatsApp Validated
            </div>
            <div style={{ fontSize: 24, fontWeight: 850, color: '#0f172a', fontFamily: '"Space Grotesk", sans-serif' }}>
              {loading ? '...' : (metrics.totalWhatsApp || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 10.5, color: '#16a34a', fontWeight: 700 }}>
              {metrics.whatsAppRate || 0}% WhatsApp conversion
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Sessions Run
            </div>
            <div style={{ fontSize: 24, fontWeight: 850, color: '#0f172a', fontFamily: '"Space Grotesk", sans-serif' }}>
              {loading ? '...' : (metrics.totalSessions || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 10.5, color: '#4f46e5', fontWeight: 700 }}>
              All 11 countries active
            </div>
          </div>
        </div>
      </div>

      {/* Main Dual Fleet Status Cards (Master Scraper vs Client Scrapers) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        {/* CARD 1: MASTER SCRAPER */}
        <div
          className="admin-card"
          style={{
            padding: 24,
            borderLeft: '4px solid #06b6d4',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ecfeff', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Server size={20} />
                </div>
                <div>
                  <span className="admin-badge admin-badge-cyan">FLAGSHIP FLEET</span>
                  <h3 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 850, color: '#0f172a' }}>
                    MASTER SCRAPER
                  </h3>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#0891b2', fontSize: 11, fontWeight: 800 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 6px #06b6d4' }} />
                <span>UNMETERED</span>
              </div>
            </div>

            <p style={{ fontSize: 12.5, color: '#334155', margin: '0 0 16px', lineHeight: 1.45 }}>
              Heavyweight unmetered engine running multi-zone territorial state and district sweeps across all 11 sovereign nations.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: '10px 14px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>COUNTRIES SUPPORTED</div>
                <div style={{ fontSize: 18, fontWeight: 850, color: '#0891b2' }}>11 Nations</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>IN, US, UK, CA, AU, AE...</div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>PARALLEL ENGINES</div>
                <div style={{ fontSize: 18, fontWeight: 850, color: '#0891b2' }}>22 Engines</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>Multi-engine backfill</div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>TOTAL SWEEPS</div>
                <div style={{ fontSize: 18, fontWeight: 850, color: '#0f172a' }}>{master.totalSweeps || 0}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>District &amp; State</div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>MASTER INDEXED</div>
                <div style={{ fontSize: 18, fontWeight: 850, color: '#0f172a' }}>{(master.leadsHarvested || 0).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>Records in Vault</div>
              </div>
            </div>
          </div>

          <a
            href={masterUrl}
            target="_blank"
            rel="noreferrer"
            className="admin-btn-gold"
            style={{
              textDecoration: 'none',
              padding: '10px 16px',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <span>Launch Master Fleet Command</span>
            <ExternalLink size={14} />
          </a>
        </div>

        {/* CARD 2: CLIENT COCKPITS */}
        <div
          className="admin-card"
          style={{
            padding: 24,
            borderLeft: '4px solid #d97706',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Laptop size={20} />
                </div>
                <div>
                  <span className="admin-badge admin-badge-amber">DISTRIBUTED EDGE</span>
                  <h3 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 850, color: '#0f172a' }}>
                    CLIENT COCKPITS
                  </h3>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#b45309', fontSize: 11, fontWeight: 800 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }} />
                <span>LOCAL RAM EDGE</span>
              </div>
            </div>

            <p style={{ fontSize: 12.5, color: '#334155', margin: '0 0 16px', lineHeight: 1.45 }}>
              Zero-knowledge client workspaces executing concurrent extractions natively within local browser memory lanes.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: '10px 14px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>ACTIVE WORKSPACES</div>
                <div style={{ fontSize: 18, fontWeight: 850, color: '#b45309' }}>{client.activeWorkspaces || 0}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>Isolated Tenants</div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>REGISTERED CLIENTS</div>
                <div style={{ fontSize: 18, fontWeight: 850, color: '#b45309' }}>{client.registeredClients || 0}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>Accounts on File</div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>CLIENT SEARCHES</div>
                <div style={{ fontSize: 18, fontWeight: 850, color: '#0f172a' }}>{client.totalSearches || 0}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>City &amp; Locality</div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>CLIENT INDEXED</div>
                <div style={{ fontSize: 18, fontWeight: 850, color: '#0f172a' }}>{(client.leadsHarvested || 0).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>Records Generated</div>
              </div>
            </div>
          </div>

          <a
            href={clientUrl}
            target="_blank"
            rel="noreferrer"
            className="admin-btn-gold"
            style={{
              textDecoration: 'none',
              padding: '10px 16px',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <span>Launch Client Cockpit</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
