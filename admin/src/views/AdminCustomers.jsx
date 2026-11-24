import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  MapPin,
  Clock,
  Sparkles,
  Server,
  Laptop,
  CheckCircle2,
  RefreshCw,
  Globe,
  Database,
  ArrowUpRight,
  TrendingUp,
  Tag
} from 'lucide-react';

export default function AdminCustomers() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCustomerActivity = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customers/activity');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error('Failed to fetch customer activity', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerActivity();
  }, []);

  const customers = data?.customers || [];
  const recentQueries = data?.recentQueries || [];

  const filteredQueries = recentQueries.filter(q => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (q.query && q.query.toLowerCase().includes(term)) ||
      (q.location && q.location.toLowerCase().includes(term)) ||
      (q.userName && q.userName.toLowerCase().includes(term)) ||
      (q.country && q.country.toLowerCase().includes(term))
    );
  });

  const totalLeadsHarvested = customers.reduce((sum, c) => sum + (c.totalLeads || 0), 0);
  const totalSearches = customers.reduce((sum, c) => sum + (c.totalSessions || 0), 0);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Eyebrow & Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca', fontSize: 11, fontWeight: 800, marginBottom: 6 }}>
            <Users size={12} />
            <span>CUSTOMER OBSERVABILITY · WHAT USERS ARE SCRAPING</span>
          </div>
          <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 26, fontWeight: 850, margin: 0, color: '#0f172a' }}>
            Customer Activity &amp; Live Searches
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>
            Understand your customers: see their accounts, what queries they are searching, which cities they targeted, and lead volume.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchCustomerActivity}
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
            gap: 6,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Activity</span>
        </button>
      </div>

      {/* Top 3 Customer Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div className="admin-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 750, color: '#64748b', textTransform: 'uppercase' }}>
              Active Customer Accounts
            </div>
            <div style={{ fontSize: 24, fontWeight: 850, color: '#0f172a', fontFamily: '"Space Grotesk", sans-serif' }}>
              {customers.length}
            </div>
            <div style={{ fontSize: 11, color: '#4f46e5', fontWeight: 700 }}>
              Enterprise &amp; Demo Desks
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Database size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 750, color: '#64748b', textTransform: 'uppercase' }}>
              Customer Harvested Leads
            </div>
            <div style={{ fontSize: 24, fontWeight: 850, color: '#0f172a', fontFamily: '"Space Grotesk", sans-serif' }}>
              {totalLeadsHarvested.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>
              Across all customer searches
            </div>
          </div>
        </div>

        <div className="admin-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 750, color: '#64748b', textTransform: 'uppercase' }}>
              Total Scraping Runs
            </div>
            <div style={{ fontSize: 24, fontWeight: 850, color: '#0f172a', fontFamily: '"Space Grotesk", sans-serif' }}>
              {totalSearches}
            </div>
            <div style={{ fontSize: 11, color: '#d97706', fontWeight: 700 }}>
              Completed search jobs
            </div>
          </div>
        </div>
      </div>

      {/* Customer Accounts Breakdown */}
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Customer Accounts &amp; Their Top Searches</span>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
          {customers.map((c) => (
            <div
              key={c.id}
              className="admin-card"
              style={{
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                borderTop: '3px solid #4f46e5'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    {c.name}
                  </h3>
                  <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                    ID: {c.id}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: c.plan === 'enterprise' || c.plan === 'unlimited' ? '#ecfdf5' : '#f1f5f9',
                    color: c.plan === 'enterprise' || c.plan === 'unlimited' ? '#047857' : '#475569',
                    border: '1px solid currentColor',
                    textTransform: 'uppercase'
                  }}
                >
                  {c.plan} Plan
                </span>
              </div>

              {/* Stats Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '10px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>TOTAL LEADS</div>
                  <div style={{ fontSize: 16, fontWeight: 850, color: '#059669' }}>
                    {c.totalLeads.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>RUNS</div>
                  <div style={{ fontSize: 16, fontWeight: 850, color: '#0f172a' }}>
                    {c.totalSessions}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>COUNTRIES</div>
                  <div style={{ fontSize: 14, fontWeight: 850, color: '#0284c7' }}>
                    {c.countries.join(', ') || 'IN'}
                  </div>
                </div>
              </div>

              {/* What they searched */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 750, color: '#475569', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Tag size={12} />
                  <span>Top Topics Searched:</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {c.topQueries && c.topQueries.length > 0 ? (
                    c.topQueries.map((t, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          color: '#334155',
                          fontWeight: 650
                        }}
                      >
                        {t.query} <b style={{ color: '#059669' }}>({t.count})</b>
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>No explicit search terms recorded</span>
                  )}
                </div>
              </div>

              {/* Last active */}
              {c.lastActive && (
                <div style={{ fontSize: 10.5, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
                  <Clock size={11} />
                  <span>Last active: {new Date(c.lastActive).toLocaleString()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Customer Search Log */}
      <div className="admin-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 850, color: '#0f172a', margin: '0 0 3px' }}>
              Live Customer Search Activity
            </h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
              Chronological log of every scrape executed by customers on your server.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '6px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}>
            <Search size={14} color="#64748b" />
            <input
              type="text"
              placeholder="Search query, city, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, width: 220, color: '#0f172a' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 800, color: '#64748b' }}>CUSTOMER</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 800, color: '#64748b' }}>WHAT THEY SCRAPED (QUERY)</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 800, color: '#64748b' }}>TARGET REGION / CITY</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 800, color: '#64748b' }}>COUNTRY</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 800, color: '#64748b' }}>LEADS FOUND</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 800, color: '#64748b' }}>FLEET TIER</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 800, color: '#64748b' }}>TIME</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueries.length > 0 ? (
                filteredQueries.map((q) => (
                  <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 750, color: '#0f172a', fontSize: 12 }}>
                        {q.userName}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
                        {q.userId.slice(0, 10)}
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 750, color: '#0f172a', fontSize: 12.5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                        <span>{q.query}</span>
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569' }}>
                        <MapPin size={12} color="#059669" />
                        <span>{q.location}</span>
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px', fontSize: 12 }}>
                      <span className="admin-badge admin-badge-cyan">
                        {q.country}
                      </span>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontWeight: 850, fontSize: 13, color: '#059669' }}>
                        {q.leads.toLocaleString()} leads
                      </span>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      {q.isMaster ? (
                        <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc' }}>
                          👑 Master Sweep
                        </span>
                      ) : (
                        <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#f8fafc', color: '#64748b', border: '1px solid #cbd5e1' }}>
                          👤 Client Search
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px', fontSize: 11, color: '#64748b' }}>
                      {q.timestamp ? new Date(q.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : 'Recently'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 13 }}>
                    No customer scraping activity matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
